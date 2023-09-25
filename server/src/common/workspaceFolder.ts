/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	Event, Emitter, Disposable, ClientCapabilities, WorkspaceFolder, WorkspaceFoldersChangeEvent, DidChangeWorkspaceFoldersNotification,
	WorkspaceFoldersRequest, ServerCapabilities
} from 'vscode-languageserver-protocol';

import type { Feature, _RemoteWorkspace } from './server';


export interface WorkspaceFolders {
	getWorkspaceFolders(): Promise<WorkspaceFolder[] | null>;
	onDidChangeWorkspaceFolders: Event<WorkspaceFoldersChangeEvent>;
}

export const WorkspaceFoldersFeature: Feature<_RemoteWorkspace, WorkspaceFolders> = (Base) => {
	return class extends Base {
		private _onDidChangeWorkspaceFolders: Emitter<WorkspaceFoldersChangeEvent> | undefined;
		private _unregistration: Promise<Disposable> | undefined;
		private _notificationIsAutoRegistered: boolean;
		public constructor() {
			super();
			this._notificationIsAutoRegistered = false;
		}
		public initialize(capabilities: ClientCapabilities): void {
			super.initialize(capabilities);
			let workspaceCapabilities = capabilities.workspace;
			if (workspaceCapabilities && workspaceCapabilities.workspaceFolders) {
				this._onDidChangeWorkspaceFolders = new Emitter<WorkspaceFoldersChangeEvent>();
				this.connection.onNotification(DidChangeWorkspaceFoldersNotification.type, (params) => {
					this._onDidChangeWorkspaceFolders!.fire(params.event);
				});
			}
		}
		public fillServerCapabilities(capabilities: ServerCapabilities): void {
			super.fillServerCapabilities(capabilities);
			const changeNotifications = capabilities.workspace?.workspaceFolders?.changeNotifications;
			this._notificationIsAutoRegistered = changeNotifications === true || typeof changeNotifications === 'string';
		}
		getWorkspaceFolders(): Promise<WorkspaceFolder[] | null> {
			return this.connection.sendRequest(WorkspaceFoldersRequest.type);
		}
		get onDidChangeWorkspaceFolders(): Event<WorkspaceFoldersChangeEvent> {
			if (!this._onDidChangeWorkspaceFolders) {
				throw new Error('Client doesn\'t support sending workspace folder change events.');
			}
			if (!this._notificationIsAutoRegistered && !this._unregistration) {
				this._unregistration = this.connection.client.register(DidChangeWorkspaceFoldersNotification.type);
			}
			return this._onDidChangeWorkspaceFolders.event;
		}
	};
};
