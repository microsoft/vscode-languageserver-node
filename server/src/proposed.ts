/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { Event, Emitter, Disposable } from 'vscode-jsonrpc';
import { ClientCapabilities } from './protocol';
import { _, Features, WorkspaceFeature, combineWorkspaceFeatures } from './main';
import {
	WorkspaceFolder, GetWorkspaceFolders, GetWorkspaceFolder, WorkspaceFoldersChangeEvent, DidChangeWorkspaceFolders,
	GetConfigurationRequest, GetConfigurationParams, ProposedWorkspaceClientCapabilities
} from './protocol.proposed';

import * as Is from './utils/is';
import Uri from 'vscode-uri';

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
	getGlobalConfiguration(): Thenable<any>;
	getGlobalConfiguration(section: string): Thenable<any>;
	getGlobalConfiguration(sections: string[]): Thenable<any[]>;
	getScopedConfiguration(scopeUri: Uri | string): Thenable<any>;
	getScopedConfiguration(scopeUri: Uri | string, section: string): Thenable<any>;
	getScopedConfiguration(scopeUri: Uri | string, sections: string[]): Thenable<any[]>;
	getScopedConfiguration(scopeUris: (Uri| string)[]): Thenable<any[]>;
	getScopedConfiguration(scopeUris: (Uri| string)[], section: string): Thenable<any[]>;
	getScopedConfiguration(scopeUris: (Uri| string)[], sections: string[]): Thenable<any[][]>;
}

export const GetConfigurationFeature: WorkspaceFeature<GetConfigurationProposed> = (Base) => {
	return class extends Base {

		getGlobalConfiguration(sections?: string | string[]): Thenable<any> {
			return this._getConfiguration(undefined, sections);
		}

		getScopedConfiguration(scopeUris: Uri | string | (Uri | string)[], sections?: string | string[]): Thenable<any> {
			if (Is.string(scopeUris)) {
				return this._getConfiguration(scopeUris, sections);
			} else if (scopeUris instanceof Uri) {
				return this._getConfiguration(scopeUris.toString(), sections);
			} else if (Array.isArray(scopeUris)) {
				if (scopeUris.length === 0) {
					return this._getConfiguration([], sections);
				} else {
					return this._getConfiguration(scopeUris.map(element => Is.string(element) ? element : element.toString()), sections);
				}
			} else {
				return this._getConfiguration(undefined, undefined);
			}
		}

		private _getConfiguration(scopeUris: string | string[] | undefined, sections: string | string[] | undefined): Thenable<any> {
			let params: GetConfigurationParams = {};
			if (Is.string(scopeUris)) {
				params.scopeUris = [scopeUris];
			} else if (Is.stringArray(scopeUris)) {
				params.scopeUris = scopeUris;
			}
			if (Is.string(sections)) {
				params.sections = [sections];
			} else if (Is.stringArray(sections)) {
				params.sections = sections;
			}
			return this.connection.sendRequest(GetConfigurationRequest.type, params).then((result) => {
				let uriIsString = Is.string(scopeUris);
				let uriIsArray = Is.stringArray(scopeUris);
				let sectionIsString = Is.string(sections);
				let sectionIsArray = Is.stringArray(sections);
				if ((scopeUris === void 0 || scopeUris === null || uriIsString) && (sections === void 0 || sections === null || sectionIsString)) {
					return result[0][0];
				} else if (uriIsArray && sectionIsString) {
					return result.map(elements => elements[0]);
				} else if (uriIsString && sectionIsArray) {
					return result[0];
				} else if (uriIsArray && sectionIsArray) {
					return result;
				} else {
					return Promise.reject(new Error('Invalid arguments provided for get configuration request'));
				}
			});
		}
	}
}

export const ProposedProtocol: Features<_, _, _, _, _, WorkspaceFoldersProposed & GetConfigurationProposed> = {
	__brand: 'features',
	workspace: combineWorkspaceFeatures(WorkspaceFoldersFeature, GetConfigurationFeature)
}