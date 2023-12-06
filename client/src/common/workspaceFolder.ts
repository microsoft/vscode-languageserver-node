/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as UUID from './utils/uuid';

import { workspace, Disposable, WorkspaceFolder as VWorkspaceFolder, WorkspaceFoldersChangeEvent as VWorkspaceFoldersChangeEvent } from 'vscode';

import { DynamicFeature, RegistrationData, FeatureClient, NextSignature, FeatureState } from './features';
import {
	ClientCapabilities, InitializeParams, CancellationToken, ServerCapabilities, WorkspaceFoldersRequest, WorkspaceFolder,
	DidChangeWorkspaceFoldersNotification, DidChangeWorkspaceFoldersParams, RegistrationType
} from 'vscode-languageserver-protocol';

function access<T, K extends keyof T>(target: T | undefined, key: K): T[K] | undefined {
	if (target === undefined || target === null) {
		return undefined;
	}
	return target[key];
}

export function arrayDiff<T>(left: ReadonlyArray<T>, right: ReadonlyArray<T>): T[] {
	return left.filter(element => right.indexOf(element) < 0);
}

export type WorkspaceFolderMiddleware = {
	workspaceFolders?: WorkspaceFoldersRequest.MiddlewareSignature;
	didChangeWorkspaceFolders?: NextSignature<VWorkspaceFoldersChangeEvent, Promise<void>>;
};

type WorkspaceFolderWorkspaceMiddleware = {
	workspace?: WorkspaceFolderMiddleware;
};

export class WorkspaceFoldersFeature implements DynamicFeature<void> {

	private readonly _client: FeatureClient<WorkspaceFolderWorkspaceMiddleware>;
	private readonly _listeners: Map<string, Disposable>;
	private _initialFolders: ReadonlyArray<VWorkspaceFolder> | undefined;

	constructor(client: FeatureClient<WorkspaceFolderWorkspaceMiddleware>) {
		this._client = client;
		this._listeners = new Map();
	}

	getState(): FeatureState {
		return { kind: 'workspace', id: this.registrationType.method, registrations: this._listeners.size > 0 };
	}

	public get registrationType(): RegistrationType<void> {
		return DidChangeWorkspaceFoldersNotification.type;
	}

	public fillInitializeParams(params: InitializeParams): void {
		const folders = workspace.workspaceFolders;
		this.initializeWithFolders(folders);

		if (folders === void 0) {
			params.workspaceFolders = null;
		} else {
			params.workspaceFolders = folders.map(folder => this.asProtocol(folder));
		}
	}

	protected initializeWithFolders(currentWorkspaceFolders: ReadonlyArray<VWorkspaceFolder> | undefined) {
		this._initialFolders = currentWorkspaceFolders;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		capabilities.workspace = capabilities.workspace || {};
		capabilities.workspace.workspaceFolders = true;
	}

	public initialize(capabilities: ServerCapabilities): void {
		const client = this._client;
		client.onRequest(WorkspaceFoldersRequest.type, (token: CancellationToken) => {
			const workspaceFolders: WorkspaceFoldersRequest.HandlerSignature = () => {
				const folders = workspace.workspaceFolders;
				if (folders === undefined) {
					return null;
				}
				const result: WorkspaceFolder[] = folders.map((folder) => {
					return this.asProtocol(folder);
				});
				return result;
			};
			const middleware = client.middleware.workspace;
			return middleware && middleware.workspaceFolders
				? middleware.workspaceFolders(token, workspaceFolders)
				: workspaceFolders(token);
		});
		const value = access(access(access(capabilities, 'workspace'), 'workspaceFolders'), 'changeNotifications');
		let id: string | undefined;
		if (typeof value === 'string') {
			id = value;
		} else if (value === true) {
			id = UUID.generateUuid();
		}
		if (id) {
			this.register({ id: id, registerOptions: undefined });
		}
	}

	protected sendInitialEvent(currentWorkspaceFolders: ReadonlyArray<VWorkspaceFolder> | undefined) {
		let promise: Promise<void> | undefined;
		if (this._initialFolders && currentWorkspaceFolders) {
			const removed: VWorkspaceFolder[] = arrayDiff(this._initialFolders, currentWorkspaceFolders);
			const added: VWorkspaceFolder[] = arrayDiff(currentWorkspaceFolders, this._initialFolders);
			if (added.length > 0 || removed.length > 0) {
				promise = this.doSendEvent(added, removed);
			}
		} else if (this._initialFolders) {
			promise = this.doSendEvent([], this._initialFolders);
		} else if (currentWorkspaceFolders) {
			promise = this.doSendEvent(currentWorkspaceFolders, []);
		}
		if (promise !== undefined) {
			promise.catch((error) => {
				this._client.error(`Sending notification ${DidChangeWorkspaceFoldersNotification.type.method} failed`, error);
			});
		}
	}

	private doSendEvent(addedFolders: ReadonlyArray<VWorkspaceFolder>, removedFolders: ReadonlyArray<VWorkspaceFolder>): Promise<void> {
		const params: DidChangeWorkspaceFoldersParams = {
			event: {
				added: addedFolders.map(folder => this.asProtocol(folder)),
				removed: removedFolders.map(folder => this.asProtocol(folder))
			}
		};
		return this._client.sendNotification(DidChangeWorkspaceFoldersNotification.type, params);
	}

	public register(data: RegistrationData<undefined>): void {
		const id = data.id;
		const client = this._client;
		const disposable = workspace.onDidChangeWorkspaceFolders((event) => {
			const didChangeWorkspaceFolders = (event: VWorkspaceFoldersChangeEvent): Promise<void> => {
				return this.doSendEvent(event.added, event.removed);
			};
			const middleware = client.middleware.workspace;
			const promise = middleware && middleware.didChangeWorkspaceFolders
				? middleware.didChangeWorkspaceFolders(event, didChangeWorkspaceFolders)
				: didChangeWorkspaceFolders(event);
			promise.catch((error) => {
				this._client.error(`Sending notification ${DidChangeWorkspaceFoldersNotification.type.method} failed`, error);
			});
		});
		this._listeners.set(id, disposable);
		this.sendInitialEvent(workspace.workspaceFolders);
	}

	public unregister(id: string): void {
		const disposable = this._listeners.get(id);
		if (disposable === void 0) {
			return;
		}
		this._listeners.delete(id);
		disposable.dispose();
	}

	public clear(): void {
		for (const disposable of this._listeners.values()) {
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
