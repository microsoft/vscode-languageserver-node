/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { RequestType, RequestType0, NotificationType } from 'vscode-jsonrpc';

export interface ProposedWorkspaceClientCapabilities {
	workspaceFolders?: boolean;
	getConfiguration?: boolean;
}

export interface ProposedInitializeParams {
	workspaceFolders: WorkspaceFolder[] | null;
}

//---- Get Configuration request ----

/**
 * The 'workspace/getConfiguration' request is sent from the server to the client to fetch a certain
 * configuration setting.
 */
export namespace GetConfigurationRequest {
	export const type = new RequestType<GetConfigurationParams, any[][], void, void>('workspace/getConfiguration');
}

/**
 * The parameters of a get configuration request.
 */
export interface GetConfigurationParams {

	/**
	 * The scopes to get the configuration sections for.
	 */
	scopeUris?: string[];

	/**
	 * When section-identifiers are provided only the sections of the configuration
	 * is returned. Dots in the section-identifier are interpreted as JSON child-access,
	 * like `{ myExt: { setting: { doIt: true }}}` then `getConfiguration('myExt.setting')`
	 * returns `{ doIt: true }`.
	 */
	sections?: string[];

}

//---- Workspace Folder ----

export interface WorkspaceFolder {
	/**
	 * The associated URI for this workspace folder.
	 */
	uri: string;

	/**
	 * The name of the workspace folder. Defaults to the
	 * uri's basename.
	 */
	name: string;
}

/**
 * The `workspace/getWorkspaceFolders` is sent from the server to the client to fetch the open workspace folders.
 */
export namespace GetWorkspaceFolders {
	export const type = new RequestType0<WorkspaceFolder[] | null, void, void>('workspace/getWorkspaceFolders');
}

/**
 * The `workspace/getWorkspaceFolder` is sent from the server to the client to fetch the workspace folder for a
 * specific resource.
 */
export namespace GetWorkspaceFolder {
	export const type = new RequestType<string, WorkspaceFolder | null, void, void>('workspace/getWorkspaceFolders');
}

export namespace DidChangeWorkspaceFolders {
	export const type = new NotificationType<DidChangeWorkspaceFoldersParams, void>('workspace/didChangeWorkspaceFolders');
}

export interface DidChangeWorkspaceFoldersParams {
	/**
	 * The actual workspace folder change event.
	 */
	event: WorkspaceFoldersChangeEvent;
}

export interface WorkspaceFoldersChangeEvent {
	/**
	 * The array of added workspace folders
	 */
	added?: WorkspaceFolder[];

	/**
	 * The array of the removed workspace folders
	 */
	removed?: WorkspaceFolder[];
}