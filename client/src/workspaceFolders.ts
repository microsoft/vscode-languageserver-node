/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as UUID from './utils/uuid';

import {
    workspace,
    Disposable,
    WorkspaceFolder as VWorkspaceFolder,
    WorkspaceFoldersChangeEvent as VWorkspaceFoldersChangeEvent,
} from 'vscode';

import { DynamicFeature, RegistrationData, BaseLanguageClient, NextSignature } from './client';
import {
    ClientCapabilities,
    InitializeParams,
    RPCMessageType,
    CancellationToken,
    ServerCapabilities,
    WorkspaceFoldersRequest,
    WorkspaceFolder,
    DidChangeWorkspaceFoldersNotification,
    DidChangeWorkspaceFoldersParams,
} from 'vscode-languageserver-protocol';

function access<T, K extends keyof T>(target: T | undefined, key: K): T[K] | undefined {
    if (target === void 0) {
        return undefined;
    }
    return target[key];
}

export interface WorkspaceFolderWorkspaceMiddleware {
    workspaceFolders?: WorkspaceFoldersRequest.MiddlewareSignature;
    didChangeWorkspaceFolders?: NextSignature<VWorkspaceFoldersChangeEvent, void>;
}

export class WorkspaceFoldersFeature implements DynamicFeature<undefined> {
    private _listeners: Map<string, Disposable> = new Map<string, Disposable>();

    constructor(private _client: BaseLanguageClient) {}

    public get messages(): RPCMessageType {
        return DidChangeWorkspaceFoldersNotification.type;
    }

    public fillInitializeParams(params: InitializeParams): void {
        let folders = workspace.workspaceFolders;

        if (folders === void 0) {
            params.workspaceFolders = null;
        } else {
            params.workspaceFolders = folders.map(folder => this.asProtocol(folder));
        }
    }

    public fillClientCapabilities(capabilities: ClientCapabilities): void {
        capabilities.workspace = capabilities.workspace || {};
        capabilities.workspace.workspaceFolders = true;
    }

    public initialize(capabilities: ServerCapabilities): void {
        let client = this._client;
        client.onRequest(WorkspaceFoldersRequest.type, (token: CancellationToken) => {
            let workspaceFolders: WorkspaceFoldersRequest.HandlerSignature = () => {
                let folders = workspace.workspaceFolders;
                if (folders === void 0) {
                    return null;
                }
                let result: WorkspaceFolder[] = folders.map(folder => {
                    return this.asProtocol(folder);
                });
                return result;
            };
            let middleware = client.clientOptions.middleware!.workspace;
            return middleware && middleware.workspaceFolders
                ? middleware.workspaceFolders(token, workspaceFolders)
                : workspaceFolders(token);
        });
        let value = access(access(access(capabilities, 'workspace'), 'workspaceFolders'), 'changeNotifications');
        let id: string | undefined;
        if (typeof value === 'string') {
            id = value;
        } else if (value === true) {
            id = UUID.generateUuid();
        }
        if (id) {
            this.register(this.messages, {
                id: id,
                registerOptions: undefined,
            });
        }
    }

    public register(_message: RPCMessageType, data: RegistrationData<undefined>): void {
        let id = data.id;
        let client = this._client;
        let disposable = workspace.onDidChangeWorkspaceFolders(event => {
            let didChangeWorkspaceFolders = (event: VWorkspaceFoldersChangeEvent) => {
                let params: DidChangeWorkspaceFoldersParams = {
                    event: {
                        added: event.added.map(folder => this.asProtocol(folder)),
                        removed: event.removed.map(folder => this.asProtocol(folder)),
                    },
                };
                this._client.sendNotification(DidChangeWorkspaceFoldersNotification.type, params);
            };
            let middleware = client.clientOptions.middleware!.workspace;
            middleware && middleware.didChangeWorkspaceFolders
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
        return {
            uri: this._client.code2ProtocolConverter.asUri(workspaceFolder.uri),
            name: workspaceFolder.name,
        };
    }
}
