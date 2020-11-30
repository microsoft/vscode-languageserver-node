/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler } from 'vscode-jsonrpc';
import { WorkspaceEdit } from 'vscode-languageserver-types';
import { ProtocolRequestType } from './messages';
import { FileOperationRegistrationOptions } from './protocol';

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

export namespace WillCreateFilesRequest {
	export const method: 'window/willCreateFiles' = 'window/willCreateFiles';
	export const type = new ProtocolRequestType<CreateFilesParams, WorkspaceEdit | null, never, void, FileOperationRegistrationOptions>(method);
}
