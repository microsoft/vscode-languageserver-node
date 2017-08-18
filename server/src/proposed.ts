/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { Event, Emitter, Disposable } from 'vscode-jsonrpc';
import { ClientCapabilities } from './protocol';
import { _, Features, WorkspaceFeature, combineWorkspaceFeatures } from './main';
import {
	WorkspaceFolder, GetWorkspaceFolders, GetWorkspaceFolder, WorkspaceFoldersChangeEvent, DidChangeWorkspaceFolders,
	GetConfigurationRequest, GetConfigurationParams, ProposedWorkspaceClientCapabilities, ConfigurationItem
} from './protocol.proposed';

import * as Is from './utils/is';

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

export interface ConfigurationProposed {
	getConfiguration(): Thenable<any>;
	getConfiguration(section: string): Thenable<any>;
	getConfiguration(item: ConfigurationItem): Thenable<any>;
	getConfiguration(items: ConfigurationItem[]): Thenable<any[]>;
}

export const GetConfigurationFeature: WorkspaceFeature<ConfigurationProposed> = (Base) => {
	return class extends Base {

		getConfiguration(arg?: string | ConfigurationItem | ConfigurationItem[]): Thenable<any> {
			if (!arg) {
				return this._getConfiguration({});
			} else if (Is.string(arg)) {
				return this._getConfiguration({ section: arg })
			} else {
				return this._getConfiguration(arg);
			}
		}

		private _getConfiguration(arg: ConfigurationItem | ConfigurationItem[]): Thenable<any> {
			let params: GetConfigurationParams = {
				items: Array.isArray(arg) ? arg : [arg]
			};
			return this.connection.sendRequest(GetConfigurationRequest.type, params).then((result) => {
				return Array.isArray(arg) ? result : result[0];
			});
		}
	}
}

export const ProposedProtocol: Features<_, _, _, _, _, WorkspaceFoldersProposed & ConfigurationProposed> = {
	__brand: 'features',
	workspace: combineWorkspaceFeatures(WorkspaceFoldersFeature, GetConfigurationFeature)
}