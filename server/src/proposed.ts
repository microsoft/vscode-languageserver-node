/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { Event, Emitter, Disposable } from 'vscode-jsonrpc';
import { ClientCapabilities } from './protocol';
import { _, Features, WorkspaceFeature, combineWorkspaceFeatures } from './main';
import {
	WorkspaceFolder, GetWorkspaceFolders, GetWorkspaceFolder, WorkspaceFoldersChangeEvent, DidChangeWorkspaceFolders,
	GetConfigurationRequest, ProposedWorkspaceClientCapabilities
} from './protocol.proposed';

export interface WorkspaceFoldersProposed {
	getWorkspaceFolders(): Thenable<WorkspaceFolder[] | null>;
	getWorkspaceFolder(uri: string): Thenable<WorkspaceFolder | null>;
	onDidChangeWorkspaceFolders: Event<WorkspaceFoldersChangeEvent>;
}

export const WorkspaceFoldersFeature: WorkspaceFeature<WorkspaceFoldersProposed> = (Base) => {
	return class extends Base {
		private _onDidChangeWorkspaceFolders: Emitter<WorkspaceFoldersChangeEvent>;
		private _unregistration: Thenable<Disposable>;
		public initialize(capabilities: ClientCapabilities): void {
			let workspaceCapabilities = capabilities.workspace as ProposedWorkspaceClientCapabilities;
			if (workspaceCapabilities.workspaceFolders) {
				this._onDidChangeWorkspaceFolders = new Emitter<WorkspaceFoldersChangeEvent>();
				this.connection.onNotification(DidChangeWorkspaceFolders.type, (params) => {
					this._onDidChangeWorkspaceFolders.fire(params.event);
				});
			}
		}
		getWorkspaceFolders(): Thenable<WorkspaceFolder[] | null> {
			return this.connection.sendRequest(GetWorkspaceFolders.type);
		}
		getWorkspaceFolder(uri: string): Thenable<WorkspaceFolder | null> {
			return this.connection.sendRequest(GetWorkspaceFolder.type, uri);
		}
		get onDidChangeWorkspaceFolders(): Event<WorkspaceFoldersChangeEvent> {
			if (!this._onDidChangeWorkspaceFolders) {
				throw new Error('Client doesn\'t support sending workspace folder change events.');
			}
			if (!this._unregistration) {
				this._unregistration = this.connection.client.register(DidChangeWorkspaceFolders.type);
			}
			return this._onDidChangeWorkspaceFolders.event;
		}
	}
};

export interface GetConfigurationProposed {
	getConfiguration(section?: string, uri?: string): Thenable<any>;
}

export const GetConfigurationFeature: WorkspaceFeature<GetConfigurationProposed> = (Base) => {
	return class extends Base {
		getConfiguration(section?: string, uri?: string): Thenable<any> {
			return this.connection.sendRequest(GetConfigurationRequest.type, { section, uri });
		}
	}
}

export const ProposedProtocol: Features<_, _, _, _, _, WorkspaceFoldersProposed & GetConfigurationProposed> = {
	__brand: 'features',
	workspace: combineWorkspaceFeatures(WorkspaceFoldersFeature, GetConfigurationFeature)
}