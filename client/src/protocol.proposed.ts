/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	RequestType, RequestType0, RequestHandler0, RequestHandler,
	NotificationType, NotificationHandler, HandlerResult,
	CancellationToken
} from 'vscode-jsonrpc';

//---- Get Configuration request ----

export interface ProposedConfigurationClientCapabilities {
	configuration?: boolean;
}

/**
 * The 'workspace/getConfiguration' request is sent from the server to the client to fetch a certain
 * configuration setting.
 */
export namespace GetConfigurationRequest {
	export const type = new RequestType<GetConfigurationParams, any[], void, void>('workspace/configuration');
	export type HandlerSignature = RequestHandler<GetConfigurationParams, any[], void>;
	export type MiddlewareSignature = (params: GetConfigurationParams, token: CancellationToken, next: HandlerSignature) => HandlerResult<any[], void>;
}


export interface ConfigurationItem {
	/**
	 * The scope to get the configuration section for.
	 */
	scopeUri: string;

	/**
	 * The configuration section asked for.
	 */
	section: string;
}

/**
 * The parameters of a get configuration request.
 */
export interface GetConfigurationParams {
	items: ConfigurationItem[];
}

//---- Workspace Folder ----

export interface ProposedWorkspaceInitializeParams {
	workspaceFolders: WorkspaceFolder[] | null;
}

export interface ProposedWorkspaceClientCapabilities {
	workspaceFolders?: boolean;
}

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
	export const type = new RequestType0<WorkspaceFolder[] | null, void, void>('workspace/workspaceFolders');
	export type HandlerSignature = RequestHandler0<WorkspaceFolder[] | null, void>;
	export type MiddlewareSignature = (token: CancellationToken, next: HandlerSignature) => HandlerResult<WorkspaceFolder[] | null, void>;
}

/**
 * The `workspace/getWorkspaceFolder` is sent from the server to the client to fetch the workspace folder for a
 * specific resource.
 */
export namespace GetWorkspaceFolder {
	export const type = new RequestType<string, WorkspaceFolder | null, void, void>('workspace/workspaceFolder');
	export type HandlerSignature = RequestHandler<string, WorkspaceFolder | null, void>;
	export type MiddlewareSignature = (uri: string, token: CancellationToken, next: HandlerSignature) => HandlerResult<WorkspaceFolder | null, void>;
}

/**
 * The `workspace/didChangeWorkspaceFolders` notification is sent from the client to the server when the workspace
 * folder configuration changes.
 */
export namespace DidChangeWorkspaceFolders {
	export const type = new NotificationType<DidChangeWorkspaceFoldersParams, void>('workspace/didChangeWorkspaceFolders');
	export type HandlerSignature = NotificationHandler<DidChangeWorkspaceFoldersParams>;
	export type MiddlewareSignature = (params: DidChangeWorkspaceFoldersParams, next: HandlerSignature) => void;
}

/**
 * The parameters of a `workspace/didChangeWorkspaceFolders` notification.
 */
export interface DidChangeWorkspaceFoldersParams {
	/**
	 * The actual workspace folder change event.
	 */
	event: WorkspaceFoldersChangeEvent;
}

/**
 * The workspace folder change event.
 */
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