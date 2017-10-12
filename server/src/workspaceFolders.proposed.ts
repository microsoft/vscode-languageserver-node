/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	Event, Emitter, Disposable, ClientCapabilities, Proposed
} from 'vscode-languageserver-protocol';

import { WorkspaceFeature } from './main';


export interface WorkspaceFolders {
	getWorkspaceFolders(): Thenable<Proposed.WorkspaceFolder[] | null>;
	onDidChangeWorkspaceFolders: Event<Proposed.WorkspaceFoldersChangeEvent>;
}

export const WorkspaceFoldersFeature: WorkspaceFeature<WorkspaceFolders> = (Base) => {
	return class extends Base {
		private _onDidChangeWorkspaceFolders: Emitter<Proposed.WorkspaceFoldersChangeEvent>;
		private _unregistration: Thenable<Disposable>;
		public initialize(capabilities: ClientCapabilities): void {
			let workspaceCapabilities = (capabilities as Proposed.WorkspaceFoldersClientCapabilities).workspace;
			if (workspaceCapabilities.workspaceFolders) {
				this._onDidChangeWorkspaceFolders = new Emitter<Proposed.WorkspaceFoldersChangeEvent>();
				this.connection.onNotification(Proposed.DidChangeWorkspaceFoldersNotification.type, (params) => {
					this._onDidChangeWorkspaceFolders.fire(params.event);
				});
			}
		}
		getWorkspaceFolders(): Thenable<Proposed.WorkspaceFolder[] | null> {
			return this.connection.sendRequest(Proposed.WorkspaceFoldersRequest.type);
		}
		get onDidChangeWorkspaceFolders(): Event<Proposed.WorkspaceFoldersChangeEvent> {
			if (!this._onDidChangeWorkspaceFolders) {
				throw new Error('Client doesn\'t support sending workspace folder change events.');
			}
			if (!this._unregistration) {
				this._unregistration = this.connection.client.register(Proposed.DidChangeWorkspaceFoldersNotification.type);
			}
			return this._onDidChangeWorkspaceFolders.event;
		}
	}
};