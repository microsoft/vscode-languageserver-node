/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { workspace, Disposable, WorkspaceFolder as VWorkspaceFolder, WorkspaceFoldersChangeEvent as VWorkspaceFoldersChangeEvent } from 'vscode';

import { DynamicFeature, RegistrationData, BaseLanguageClient, NextSignature } from './client';
import {
	ClientCapabilities, InitializedParams, Proposed, RPCMessageType, CancellationToken
} from 'vscode-languageserver-protocol';

export interface WorkspaceFolderMiddleware {
	workspace?: {
		workspaceFolders?: Proposed.WorkspaceFoldersRequest.MiddlewareSignature;
		didChangeWorkspaceFolders?: NextSignature<VWorkspaceFoldersChangeEvent, void>
	}
}

interface _Middleware {
	workspaceFolders?: Proposed.WorkspaceFoldersRequest.MiddlewareSignature;
	didChangeWorkspaceFolders?: NextSignature<VWorkspaceFoldersChangeEvent, void>
}

export class WorkspaceFoldersFeature implements DynamicFeature<undefined> {

	private _listeners: Map<string, Disposable> = new Map<string, Disposable>();

	constructor(private _client: BaseLanguageClient) {
	}

	public get messages(): RPCMessageType {
		return Proposed.DidChangeWorkspaceFoldersNotification.type;
	}

	public fillInitializeParams(params: InitializedParams): void {
		let proposedParams = params as Proposed.WorkspaceFoldersInitializeParams;
		let folders = workspace.workspaceFolders;

		if (folders === void 0) {
			proposedParams.workspaceFolders = null;
		} else {
			proposedParams.workspaceFolders = folders.map(folder => this.asProtocol(folder));
		}
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		capabilities.workspace = capabilities.workspace || {};
		let workspaceCapabilities = capabilities as Proposed.WorkspaceFoldersClientCapabilities;
		workspaceCapabilities.workspace.workspaceFolders = true;
	}

	public initialize(): void {
		let client = this._client;
		client.onRequest(Proposed.WorkspaceFoldersRequest.type, (token: CancellationToken) => {
			let workspaceFolders: Proposed.WorkspaceFoldersRequest.HandlerSignature = () => {
				let folders = workspace.workspaceFolders;
				if (folders === void 0) {
					return null;
				}
				let result: Proposed.WorkspaceFolder[] = folders.map((folder) => {
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
				let params: Proposed.DidChangeWorkspaceFoldersParams = {
					event: {
						added: event.added.map(folder => this.asProtocol(folder)),
						removed: event.removed.map(folder => this.asProtocol(folder))
					}
				}
				this._client.sendNotification(Proposed.DidChangeWorkspaceFoldersNotification.type, params);
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

	private asProtocol(workspaceFolder: VWorkspaceFolder): Proposed.WorkspaceFolder;
	private asProtocol(workspaceFolder: undefined): null;
	private asProtocol(workspaceFolder: VWorkspaceFolder | undefined): Proposed.WorkspaceFolder | null {
		if (workspaceFolder === void 0) {
			return null;
		}
		return { uri: this._client.code2ProtocolConverter.asUri(workspaceFolder.uri), name: workspaceFolder.name };
	}

	private getWorkspaceFolderMiddleware(): _Middleware {
		let middleware = this._client.clientOptions.middleware;
		return middleware && middleware.workspace
			? middleware.workspace as _Middleware
			: {};
	}
}