/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { workspace, Uri, Disposable, ConfigurationChangeEvent, FileSystemWatcher as VFileSystemWatcher, WorkspaceFolder as VWorkspaceFolder } from 'vscode';

import {
	ClientCapabilities, ConfigurationRequest, DidChangeConfigurationNotification, DidChangeConfigurationRegistrationOptions, RegistrationType
} from 'vscode-languageserver-protocol';

import * as Is from './utils/is';
import * as UUID from './utils/uuid';

import { StaticFeature, FeatureClient, FeatureState, DynamicFeature, ensure, RegistrationData } from './features';

export interface ConfigurationMiddleware {
	configuration?: ConfigurationRequest.MiddlewareSignature;
}

interface ConfigurationWorkspaceMiddleware {
	workspace? : ConfigurationMiddleware;
}

/**
 * Configuration pull model. From server to client.
 */
export class ConfigurationFeature implements StaticFeature {

	private readonly _client: FeatureClient<ConfigurationWorkspaceMiddleware>;

	constructor(client: FeatureClient<ConfigurationWorkspaceMiddleware>) {
		this._client = client;
	}

	getState(): FeatureState {
		return { kind: 'static' };
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		capabilities.workspace = capabilities.workspace || {};
		capabilities.workspace!.configuration = true;
	}

	public initialize(): void {
		let client = this._client;
		client.onRequest(ConfigurationRequest.type, (params, token) => {
			let configuration: ConfigurationRequest.HandlerSignature = (params) => {
				let result: any[] = [];
				for (let item of params.items) {
					let resource = item.scopeUri !== void 0 && item.scopeUri !== null ? this._client.protocol2CodeConverter.asUri(item.scopeUri) : undefined;
					result.push(this.getConfiguration(resource, item.section !== null ? item.section : undefined));
				}
				return result;
			};
			let middleware = client.middleware.workspace;
			return middleware && middleware.configuration
				? middleware.configuration(params, token, configuration)
				: configuration(params, token);
		});
	}

	private getConfiguration(resource: Uri | undefined, section: string | undefined): any {
		let result: any = null;
		if (section) {
			let index = section.lastIndexOf('.');
			if (index === -1) {
				result = toJSONObject(workspace.getConfiguration(undefined, resource).get(section));
			} else {
				let config = workspace.getConfiguration(section.substr(0, index), resource);
				if (config) {
					result = toJSONObject(config.get(section.substr(index + 1)));
				}
			}
		} else {
			let config = workspace.getConfiguration(undefined, resource);
			result = {};
			for (let key of Object.keys(config)) {
				if (config.has(key)) {
					result[key] = toJSONObject(config.get(key));
				}
			}
		}
		if (result === undefined) {
			result = null;
		}
		return result;
	}

	public clear(): void {
	}
}

export function toJSONObject(obj: any): any {
	if (obj) {
		if (Array.isArray(obj)) {
			return obj.map(toJSONObject);
		} else if (typeof obj === 'object') {
			const res = Object.create(null);
			for (const key in obj) {
				if (Object.prototype.hasOwnProperty.call(obj, key)) {
					res[key] = toJSONObject(obj[key]);
				}
			}
			return res;
		}
	}
	return obj;

}

export interface DidChangeConfigurationSignature {
	(this: void, sections: string[] | undefined): Promise<void>;
}

export interface DidChangeConfigurationMiddleware {
	didChangeConfiguration?: (this: void, sections: string[] | undefined, next: DidChangeConfigurationSignature) => Promise<void>;
}

interface DidChangeConfigurationWorkspaceMiddleware {
	workspace?: DidChangeConfigurationMiddleware;
}

export type SynchronizeOptions = {
	/**
	 * The configuration sections to synchronize. Pushing settings from the
	 * client to the server is deprecated in favour of the new pull model
	 * that allows servers to query settings scoped on resources. In this
	 * model the client can only deliver an empty change event since the
	 * actually setting value can vary on the provided resource scope.
	 *
	 * @deprecated Use the new pull model (`workspace/configuration` request)
	 */
	configurationSection?: string | string[];

	/**
	 * Asks the client to send file change events to the server. Watchers
	 * operate on workspace folders. The LSP client doesn't support watching
	 * files outside a workspace folder.
	 */
	fileEvents?: VFileSystemWatcher | VFileSystemWatcher[];
};


export type $ConfigurationOptions = {
	synchronize?: SynchronizeOptions;
	workspaceFolder?: VWorkspaceFolder;
};

export class SyncConfigurationFeature implements DynamicFeature<DidChangeConfigurationRegistrationOptions> {

	private isCleared: boolean;
	private readonly _listeners: Map<string, Disposable>;

	constructor(private _client: FeatureClient<DidChangeConfigurationWorkspaceMiddleware, $ConfigurationOptions>) {
		this.isCleared = false;
		this._listeners = new Map();
	}

	public getState(): FeatureState {
		return { kind: 'workspace', id: this.registrationType.method, registrations: this._listeners.size > 0 };
	}

	public get registrationType(): RegistrationType<DidChangeConfigurationRegistrationOptions> {
		return DidChangeConfigurationNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'workspace')!, 'didChangeConfiguration')!.dynamicRegistration = true;
	}

	public initialize(): void {
		this.isCleared = false;
		let section = this._client.clientOptions.synchronize?.configurationSection;
		if (section !== undefined) {
			this.register({
				id: UUID.generateUuid(),
				registerOptions: {
					section: section
				}
			});
		}
	}

	public register(data: RegistrationData<DidChangeConfigurationRegistrationOptions>): void {
		let disposable = workspace.onDidChangeConfiguration((event) => {
			this.onDidChangeConfiguration(data.registerOptions.section, event);
		});
		this._listeners.set(data.id, disposable);
		if (data.registerOptions.section !== undefined) {
			this.onDidChangeConfiguration(data.registerOptions.section, undefined);
		}
	}

	public unregister(id: string): void {
		let disposable = this._listeners.get(id);
		if (disposable) {
			this._listeners.delete(id);
			disposable.dispose();
		}
	}

	public clear(): void {
		for (const disposable of this._listeners.values()) {
			disposable.dispose();
		}
		this._listeners.clear();
		this.isCleared = true;
	}

	private onDidChangeConfiguration(configurationSection: string | string[] | undefined, event: ConfigurationChangeEvent | undefined): void {
		if (this.isCleared) {
			return;
		}
		let sections: string[] | undefined;
		if (Is.string(configurationSection)) {
			sections = [configurationSection];
		} else {
			sections = configurationSection;
		}
		if (sections !== undefined && event !== undefined) {
			let affected = sections.some((section) => event.affectsConfiguration(section));
			if (!affected) {
				return;
			}
		}
		const didChangeConfiguration = async (sections: string[] | undefined): Promise<void> => {
			if (sections === undefined) {
				return this._client.sendNotification(DidChangeConfigurationNotification.type, { settings: null });
			} else {
				return this._client.sendNotification(DidChangeConfigurationNotification.type, { settings: this.extractSettingsInformation(sections) });
			}
		};
		let middleware = this._client.middleware.workspace?.didChangeConfiguration;
		(middleware ? middleware(sections, didChangeConfiguration) : didChangeConfiguration(sections)).catch((error) => {
			this._client.error(`Sending notification ${DidChangeConfigurationNotification.type.method} failed`, error);
		});
	}

	private extractSettingsInformation(keys: string[]): any {
		function ensurePath(config: any, path: string[]): any {
			let current = config;
			for (let i = 0; i < path.length - 1; i++) {
				let obj = current[path[i]];
				if (!obj) {
					obj = Object.create(null);
					current[path[i]] = obj;
				}
				current = obj;
			}
			return current;
		}
		let resource: Uri | undefined = this._client.clientOptions.workspaceFolder
			? this._client.clientOptions.workspaceFolder.uri
			: undefined;
		let result = Object.create(null);
		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];
			let index: number = key.indexOf('.');
			let config: any = null;
			if (index >= 0) {
				config = workspace.getConfiguration(key.substr(0, index), resource).get(key.substr(index + 1));
			} else {
				config = workspace.getConfiguration(undefined, resource).get(key);
			}
			if (config) {
				let path = keys[i].split('.');
				ensurePath(result, path)[path[path.length - 1]] = toJSONObject(config);
			}
		}
		return result;
	}
}