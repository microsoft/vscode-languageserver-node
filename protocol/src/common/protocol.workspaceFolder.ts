/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { WorkspaceFolder } from 'vscode-languageserver-types';
import { RequestHandler0, NotificationHandler, HandlerResult, CancellationToken } from 'vscode-jsonrpc';

import { ProtocolRequestType0, ProtocolNotificationType } from './messages';

export interface WorkspaceFoldersInitializeParams {
	/**
	 * The workspace folders configured in the client when the server starts.
	 *
	 * This property is only available if the client supports workspace folders.
	 * It can be `null` if the client supports workspace folders but none are
	 * configured.
	 *
	 * @since 3.6.0
	 */
	workspaceFolders: WorkspaceFolder[] | null;
}

export interface WorkspaceFoldersServerCapabilities {

	/**
	 * The server has support for workspace folders
	 */
	supported?: boolean;

	/**
	 * Whether the server wants to receive workspace folder
	 * change notifications.
	 *
	 * If a string is provided the string is treated as an ID
	 * under which the notification is registered on the client
	 * side. The ID can be used to unregister for these events
	 * using the `client/unregisterCapability` request.
	 */
	changeNotifications?: string | boolean;
}

/**
 * The `workspace/workspaceFolders` is sent from the server to the client to fetch the open workspace folders.
 */
export namespace WorkspaceFoldersRequest {
	export const type = new ProtocolRequestType0<WorkspaceFolder[] | null, never, void, void>('workspace/workspaceFolders');
	export type HandlerSignature = RequestHandler0<WorkspaceFolder[] | null, void>;
	export type MiddlewareSignature = (token: CancellationToken, next: HandlerSignature) => HandlerResult<WorkspaceFolder[] | null, void>;
}

/**
 * The `workspace/didChangeWorkspaceFolders` notification is sent from the client to the server when the workspace
 * folder configuration changes.
 */
export namespace DidChangeWorkspaceFoldersNotification {
	export const type = new ProtocolNotificationType<DidChangeWorkspaceFoldersParams, void>('workspace/didChangeWorkspaceFolders');
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
	added: WorkspaceFolder[];

	/**
	 * The array of the removed workspace folders
	 */
	removed: WorkspaceFolder[];
}