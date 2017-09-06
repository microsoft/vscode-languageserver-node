/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { workspace, Disposable, WorkspaceFolder as VWorkspaceFolder, Uri, WorkspaceFoldersChangeEvent as VWorkspaceFoldersChangeEvent } from 'vscode';

import { MessageType as RPCMessageType, CancellationToken } from 'vscode-jsonrpc';

import { DynamicFeature, StaticFeature, RegistrationData, BaseLanguageClient, NextSignature } from './client';
import {
	ClientCapabilities, InitializedParams, WorkspaceFolder, WorkspaceFoldersRequest,
	ProposedWorkspaceFoldersClientCapabilities, DidChangeWorkspaceFoldersNotification, DidChangeWorkspaceFoldersParams,
	ProposedWorkspaceFoldersInitializeParams, ConfigurationRequest, ProposedConfigurationClientCapabilities
} from 'vscode-languageserver-protocol';

export interface WorkspaceFolderMiddleware {
	workspaceFolders?: WorkspaceFoldersRequest.MiddlewareSignature;
	workspaceFolder?: WorkspaceFoldersRequest.MiddlewareSignature;
	didChangeWorkspaceFolders?: NextSignature<VWorkspaceFoldersChangeEvent, void>
}

export class WorkspaceFoldersFeature implements DynamicFeature<undefined> {

	private _listeners: Map<string, Disposable> = new Map<string, Disposable>();

	constructor(private _client: BaseLanguageClient) {
	}

	public get messages(): RPCMessageType {
		return DidChangeWorkspaceFoldersNotification.type;
	}

	public fillInitializeParams(params: InitializedParams): void {
		let proposedParams = params as ProposedWorkspaceFoldersInitializeParams;
		let folders = workspace.workspaceFolders;

		if (folders === void 0) {
			proposedParams.workspaceFolders = null;
		} else {
			proposedParams.workspaceFolders = folders.map(folder => this.asProtocol(folder));
		}
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		capabilities.workspace = capabilities.workspace || {};
		let workspaceCapabilities = capabilities as ProposedWorkspaceFoldersClientCapabilities;
		workspaceCapabilities.workspace.workspaceFolders = true;
	}

	public initialize(): void {
		let client = this._client;
		client.onRequest(WorkspaceFoldersRequest.type, (token: CancellationToken) => {
			let workspaceFolders: WorkspaceFoldersRequest.HandlerSignature = () => {
				let folders = workspace.workspaceFolders;
				if (folders === void 0) {
					return null;
				}
				let result: WorkspaceFolder[] = folders.map((folder) => {
					return this.asProtocol(folder);
				});
				return result;
			};
			let middleware = this.getWorkspaceFolderMiddleware();
			return middleware.workspaceFolders
				? middleware.workspaceFolders(token, workspaceFolders)
				: workspaceFolders(token);
		});
	}

	public register(_message: RPCMessageType, data: RegistrationData<undefined>): void {
		let id = data.id;
		let disposable = workspace.onDidChangeWorkspaceFolders((event) => {
			let didChangeWorkspaceFolders = (event: VWorkspaceFoldersChangeEvent) => {
				let params: DidChangeWorkspaceFoldersParams = {
					event: {
						added: event.added.map(folder => this.asProtocol(folder)),
						removed: event.removed.map(folder => this.asProtocol(folder))
					}
				}
				this._client.sendNotification(DidChangeWorkspaceFoldersNotification.type, params);
			}
			let middleware = this.getWorkspaceFolderMiddleware();
			middleware.didChangeWorkspaceFolders
				? middleware.didChangeWorkspaceFolders(event, didChangeWorkspaceFolders)
				: didChangeWorkspaceFolders(event);
		});
		this._listeners.set(id, disposable);
	}

	public unregister(id: string): void {
		let disposable = this._listeners.get(id);
		if (disposable === void 0) {
			return;
		}
		this._listeners.delete(id);
		disposable.dispose();
	}

	public dispose(): void {
		for (let disposable of this._listeners.values()) {
			disposable.dispose();
		}
		this._listeners.clear();
	}

	private asProtocol(workspaceFolder: VWorkspaceFolder): WorkspaceFolder;
	private asProtocol(workspaceFolder: undefined): null;
	private asProtocol(workspaceFolder: VWorkspaceFolder | undefined): WorkspaceFolder | null {
		if (workspaceFolder === void 0) {
			return null;
		}
		return { uri: this._client.code2ProtocolConverter.asUri(workspaceFolder.uri), name: workspaceFolder.name };
	}

	private getWorkspaceFolderMiddleware(): WorkspaceFolderMiddleware {
		let middleware = this._client.clientOptions.middleware;
		return middleware && middleware.workspace
			? middleware.workspace as WorkspaceFolderMiddleware
			: {};
	}
}

export interface ConfigurationMiddleware {
	configuration?: ConfigurationRequest.MiddlewareSignature
}

export class ConfigurationFeature implements StaticFeature {

	constructor(private _client: BaseLanguageClient) {
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		capabilities.workspace = capabilities.workspace || {};
		let configCapabilities = capabilities as ProposedConfigurationClientCapabilities;
		configCapabilities.workspace.configuration = true;
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
			}
			let middleware = this.getConfigurationMiddleware();
			return middleware.configuration
				? middleware.configuration(params, token, configuration)
				: configuration(params, token);
		});
	}

	private getConfiguration(resource: Uri | undefined, section: string | undefined): any {
		let result: any = null;
		if (section) {
			let index = section.lastIndexOf('.');
			if (index === -1) {
				result = workspace.getConfiguration(undefined, resource).get(section);
			} else {
				let config = workspace.getConfiguration(section.substr(0, index));
				if (config) {
					result = config.get(section.substr(index + 1))
				}
			}
		} else {
			let config = workspace.getConfiguration(undefined, resource);
			result = {};
			for (let key of Object.keys(config)) {
				if (config.has(key)) {
					result[key] = config.get(key);
				}
			}
		}
		if (!result) {
			return null;
		}
		return result;
	}

	private getConfigurationMiddleware(): ConfigurationMiddleware {
		let middleware = this._client.clientOptions.middleware;
		return middleware && middleware.workspace
			? middleware.workspace as ConfigurationMiddleware
			: {};
	}
}

export function ProposedProtocol(client: BaseLanguageClient): (StaticFeature | DynamicFeature<any>)[] {
	let result: (StaticFeature | DynamicFeature<any>)[] = [];
	result.push(new WorkspaceFoldersFeature(client));
	result.push(new ConfigurationFeature(client));
	return result;
}