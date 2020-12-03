/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { NotificationHandler, RequestHandler } from 'vscode-jsonrpc';
import { WorkspaceEdit } from 'vscode-languageserver-types';
import { ProtocolNotificationType, ProtocolRequestType } from './messages';

/**
 * Options for notifications/requests for user operations on files.
 */
export interface FileOperationOptions {
	/**
	* The server is interested in didCreateFiles notifications.
	*/
	didCreate?: FileOperationRegistrationOptions;
	/**
	* The server is interested in willCreateFiles requests.
	*/
	willCreate?: FileOperationRegistrationOptions;
	/**
	* The server is interested in didRenameFiles notifications.
	*/
	didRename?: FileOperationRegistrationOptions;
	/**
	* The server is interested in willRenameFiles requests.
	*/
	willRename?: FileOperationRegistrationOptions;
	/**
	* The server is interested in didDeleteFiles file notifications.
	*/
	didDelete?: FileOperationRegistrationOptions;
	/**
	* The server is interested in willDeleteFiles file requests.
	*/
	willDelete?: FileOperationRegistrationOptions;
}

export interface FileOperationRegistrationOptions {
	patterns: FileOperationPatten[];
}

interface FileOperationPatten {
	/**
	 * The glob patterns to match. Glob patterns can have the following syntax:
	 * - `*` to match one or more characters in a path segment
	 * - `?` to match on one character in a path segment
	 * - `**` to match any number of path segments, including none
	 * - `{}` to group conditions (e.g. `**​/*.{ts,js}` matches all TypeScript and JavaScript files)
	 * - `[]` to declare a range of characters to match in a path segment (e.g., `example.[0-9]` to match on `example.0`, `example.1`, …)
	 * - `[!...]` to negate a range of characters to match in a path segment (e.g., `example.[!0-9]` to match on `example.a`, `example.b`, but not `example.0`)
	 */
	glob: string;

	/**
	 * Whether to match files or folders with this pattern.
	 *
	 * Matches both if undefined.
	 */
	matches?: 'file' | 'folder';
}

/**
 * Capabilities relating to events from file operations by the user in the client.
 *
 * These events do not come from the file system, they come from user operations like renaming a file in the UI.
 */
export interface FileOperationClientCapabilities {
	/**
	 * Whether the client supports dynamic registration for file requests/notifications.
	 */
	dynamicRegistration?: boolean;
	/**
	 * The client has support for sending didCreateFiles notifications.
	 */
	didCreate?: boolean;
	/**
	 * The client has support for willCreateFiles requests.
	 */
	willCreate?: boolean;
	/**
	 * The client has support for sending didRenameFiles notifications.
	 */
	didRename?: boolean;
	/**
	 * The client has support for willRenameFiles requests.
	 */
	willRename?: boolean;
	/**
	 * The client has support for sending didDeleteFiles notifications.
	 */
	didDelete?: boolean;
	/**
	 * The client has support for willDeleteFiles requests.
	 */
	willDelete?: boolean;
}

/**
 * The parameters sent in file create requests/notifications.
 */
export interface CreateFilesParams {
	/**
	 * An array of all files/folders created in this operation.
	 */
	files: FileCreate[];
}

/**
 * Represents information on a file/folder create.
 */
export interface FileCreate {
	/**
	 * A file:// URI for the location of the file/folder being created.
	 */
	uri: string;
}

/**
 * The parameters sent in file rename requests/notifications.
 */
export interface RenameFilesParams {
	/**
	 * An array of all files/folders renamed in this operation. When a folder is renamed, only
	 * the folder will be included, and not its children.
	 */
	files: FileRename[];
}

/**
 * Represents information on a file/folder rename.
 */
export interface FileRename {
	/**
	 * A file:// URI for the original location of the file/folder being renamed.
	 */
	oldUri: string;
	/**
	 * A file:// URI for the new location of the file/folder being renamed.
	 */
	newUri: string;
}

/**
 * The parameters sent in file delete requests/notifications.
 */
export interface DeleteFilesParams {
	/**
	 * An array of all files/folders deleted in this operation.
	 */
	files: FileDelete[];
}

/**
 * Represents information on a file/folder delete.
 */
export interface FileDelete {
	/**
	 * A file:// URI for the location of the file/folder being deleted.
	 */
	uri: string;
}

export namespace DidCreateFilesNotification {
	export const method: 'workspace/didCreateFiles' = 'workspace/didCreateFiles';
	export const type = new ProtocolNotificationType<CreateFilesParams, FileOperationRegistrationOptions>(method);
	export type HandlerSignature = NotificationHandler<CreateFilesParams>;
}

export namespace DidRenameFilesNotification {
	export const method: 'workspace/didRenameFiles' = 'workspace/didRenameFiles';
	export const type = new ProtocolNotificationType<RenameFilesParams, FileOperationRegistrationOptions>(method);
	export type HandlerSignature = NotificationHandler<RenameFilesParams>;
}

export namespace DidDeleteFilesNotification {
	export const method: 'workspace/didDeleteFiles' = 'workspace/didDeleteFiles';
	export const type = new ProtocolNotificationType<DeleteFilesParams, FileOperationRegistrationOptions>(method);
	export type HandlerSignature = NotificationHandler<DeleteFilesParams>;
}

export namespace WillCreateFilesRequest {
	export const method: 'workspace/willCreateFiles' = 'workspace/willCreateFiles';
	export const type = new ProtocolRequestType<CreateFilesParams, WorkspaceEdit | null, never, void, FileOperationRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<CreateFilesParams, WorkspaceEdit | undefined | null, void>;
}

export namespace WillRenameFilesRequest {
	export const method: 'workspace/willRenameFiles' = 'workspace/willRenameFiles';
	export const type = new ProtocolRequestType<RenameFilesParams, WorkspaceEdit | null, never, void, FileOperationRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<RenameFilesParams, WorkspaceEdit | undefined | null, void>;
}

export namespace WillDeleteFilesRequest {
	export const method: 'workspace/willDeleteFiles' = 'workspace/willDeleteFiles';
	export const type = new ProtocolRequestType<DeleteFilesParams, WorkspaceEdit | null, never, void, FileOperationRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<DeleteFilesParams, WorkspaceEdit | undefined | null, void>;
}
