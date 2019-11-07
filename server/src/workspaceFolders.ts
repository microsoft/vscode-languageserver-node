/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	Event, Emitter, Disposable, ClientCapabilities, WorkspaceFolder, WorkspaceFoldersChangeEvent, DidChangeWorkspaceFoldersNotification, WorkspaceFoldersRequest
} from 'vscode-languageserver-protocol';

import { Feature, _RemoteWorkspace } from './main';


export interface WorkspaceFolders {
	getWorkspaceFolders(): Promise<WorkspaceFolder[] | null>;
	onDidChangeWorkspaceFolders: Event<WorkspaceFoldersChangeEvent>;
}

export const WorkspaceFoldersFeature: Feature<_RemoteWorkspace, WorkspaceFolders> = (Base) => {
	return class extends Base {
		private _onDidChangeWorkspaceFolders: Emitter<WorkspaceFoldersChangeEvent>;
		private _unregistration: Promise<Disposable>;
		public initialize(capabilities: ClientCapabilities): void {
			let workspaceCapabilities = capabilities.workspace;
			if (workspaceCapabilities && workspaceCapabilities.workspaceFolders) {
				this._onDidChangeWorkspaceFolders = new Emitter<WorkspaceFoldersChangeEvent>();
				this.connection.onNotification(DidChangeWorkspaceFoldersNotification.type, (params) => {
					this._onDidChangeWorkspaceFolders.fire(params.event);
				});
			}
		}
		getWorkspaceFolders(): Promise<WorkspaceFolder[] | null> {
			return this.connection.sendRequest(WorkspaceFoldersRequest.type);
		}
		get onDidChangeWorkspaceFolders(): Event<WorkspaceFoldersChangeEvent> {
			if (!this._onDidChangeWorkspaceFolders) {
				throw new Error('Client doesn\'t support sending workspace folder change events.');
			}
			if (!this._unregistration) {
				this._unregistration = this.connection.client.register(DidChangeWorkspaceFoldersNotification.type);
			}
			return this._onDidChangeWorkspaceFolders.event;
		}
	};
};