/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { workspace, Disposable, WorkspaceFolder as VWorkspaceFolder } from 'vscode';

import { MessageType as RPCMessageType } from 'vscode-jsonrpc';

import { DynamicFeature, StaticFeature, RegistrationData, BaseLanguageClient } from './client';
import { ClientCapabilities, DocumentSelector, ServerCapabilities } from './protocol';

import {
	WorkspaceFolder, GetWorkspaceFolders, GetWorkspaceFolder, ProposedWorkspaceClientCapabilities,
	DidChangeWorkspaceFolders, DidChangeWorkspaceFoldersParams, GetConfigurationRequest
} from './protocol.proposed';

export class WorkspaceFoldersFeature implements DynamicFeature<undefined> {

	private _listeners: Map<string, Disposable> = new Map<string, Disposable>();

	constructor(private _client: BaseLanguageClient) {
	}

	public get messages(): RPCMessageType {
		return DidChangeWorkspaceFolders.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		capabilities.workspace = capabilities.workspace || {};
		let workspace = capabilities.workspace as ProposedWorkspaceClientCapabilities;
		workspace.workspaceFolders = true;
	}

	public initialize(_documentSelector: DocumentSelector | undefined, _capabilities: ServerCapabilities): void {
		let client = this._client;
		client.onRequest(GetWorkspaceFolders.type, () => {
			let folders = workspace.workspaceFolders;
			if (folders === void 0) {
				return null;
			}
			let result: WorkspaceFolder[] = folders.map((folder) => {
				return this.asProtocol(folder);
			});
			return result;
		});

		client.onRequest(GetWorkspaceFolder.type, (uri: string) => {
			let folder = workspace.getWorkspaceFolder(client.protocol2CodeConverter.asUri(uri));
			if (folder === void 0) {
				return null;
			}
			return this.asProtocol(folder);
		});
	}

	public register(_message: RPCMessageType, data: RegistrationData<undefined>): void {
		let id = data.id;
		let disposable = workspace.onDidChangeWorkspaceFolders((event) => {
			let params: DidChangeWorkspaceFoldersParams = {
				event: {
					added: event.added.map(folder => this.asProtocol(folder)),
					removed: event.removed.map(folder => this.asProtocol(folder))
				}
			}
			this._client.sendNotification(DidChangeWorkspaceFolders.type, params);
		});
		this._listeners.set(id, disposable);
		let folders = workspace.workspaceFolders;
		if (folders) {
			this._client.sendNotification(DidChangeWorkspaceFolders.type, {
				event: {
					added: folders.map(folder => this.asProtocol(folder)),
					removed: []
				}
			});
		}
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
}

export class GetConfigurationFeature implements StaticFeature {
	constructor(private _client: BaseLanguageClient) {
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		capabilities.workspace = capabilities.workspace || {};
		let workspace = capabilities.workspace as ProposedWorkspaceClientCapabilities;
		workspace.getConfiguration = true;
	}

	public initialize(_documentSelector: DocumentSelector | undefined, _capabilities: ServerCapabilities): void {
		let client = this._client;
		client.onRequest(GetConfigurationRequest.type, (params) => {
			let section = params.section === null ? undefined : params.section;
			let resource = params.uri ? this._client.protocol2CodeConverter.asUri(params.uri) : undefined;
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
		});
	}
}

export function createAllProposedFeatures(client: BaseLanguageClient): (StaticFeature | DynamicFeature<any>)[] {
	let result: (StaticFeature | DynamicFeature<any>)[] = [];
	result.push(new WorkspaceFoldersFeature(client));
	result.push(new GetConfigurationFeature(client));
	return result;
}