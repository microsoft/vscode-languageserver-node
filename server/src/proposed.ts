/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { MessageConnection, Event, Emitter } from 'vscode-jsonrpc';
import { _, Features } from './main';
import {
	WorkspaceFolder, GetWorkspaceFolders, GetWorkspaceFolder, WorkspaceFoldersChangeEvent, DidChangeWorkspaceFolders,
	GetConfigurationRequest
} from './protocol.proposed';

export interface RemoteWorkspaceProposed {
	getWorkspaceFolders(): Thenable<WorkspaceFolder[]>;
	getWorkspaceFolder(uri: string): Thenable<WorkspaceFolder | undefined>;
	onDidChangeWorkspaceFolders: Event<WorkspaceFoldersChangeEvent>;
	getConfiguration(section?: string, uri?: string): Thenable<any>;
}

export const factories: Features<_, _, _, _, _, RemoteWorkspaceProposed> = {
	__brand: 'features',
	workspace: (Base) => {
		return class extends Base {
			private _onDidChangeWorkspaceFolders = new Emitter<WorkspaceFoldersChangeEvent>();
			constructor(connection: MessageConnection) {
				super(connection);
				connection.onNotification(DidChangeWorkspaceFolders.type, (params) => {
					this._onDidChangeWorkspaceFolders.fire(params.event);
				});
			}
			getWorkspaceFolders(): Thenable<WorkspaceFolder[]> {
				return this.connection.sendRequest(GetWorkspaceFolders.type);
			}
			getWorkspaceFolder(uri: string): Thenable<WorkspaceFolder | undefined> {
				return this.connection.sendRequest(GetWorkspaceFolder.type, uri);
			}
			get onDidChangeWorkspaceFolders(): Event<WorkspaceFoldersChangeEvent> {
				return this._onDidChangeWorkspaceFolders.event;
			}
			getConfiguration(section?: string, uri?: string): Thenable<any> {
				return this.connection.sendRequest(GetConfigurationRequest.type, { section, uri });
			}
		}
	}
}