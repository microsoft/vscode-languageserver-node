/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler } from 'vscode-jsonrpc';
import { uinteger, type DocumentUri } from 'vscode-languageserver-types';
import { CM, MessageDirection, ProtocolRequestType } from './messages';

/**
 * Client capabilities specific to file system requests.
 *
 * @since 3.19.0
 */
export interface FileSystemClientCapabilities {

	/**
	 * Whether the client supports the `workspace/stat` request.
	 */
	stat?: boolean;

	/**
	 * Whether the client supports the `workspace/readDirectory` request.
	 */
	readDirectory?: boolean;

	/**
	 * Whether the client supports the `workspace/readFile` request.
	 */
	readFile?: boolean;
}

/**
 * Represents metadata about a file.
 *
 * @since 3.19.0
 */
export interface FileStat {
	/**
	 * The type of the file, e.g. is a regular file or a directory.
	 */
	type: FileType;
	/**
	 * Additional flags about the file.
	 */
	flags: FileFlags;
	/**
	 * The creation timestamp in milliseconds elapsed since January 1, 1970 00:00:00 UTC.
	 */
	ctime: number;
	/**
	 * The modification timestamp in milliseconds elapsed since January 1, 1970 00:00:00 UTC.
	 */
	mtime: number;
	/**
	 * The size in bytes.
	 */
	size: number;
}

/**
 * The parameters sent in a request to get metadata about a file.
 *
 * @since 3.19.0
 */
export interface StatParams {
	/**
	 * A URI for the location of the file/folder.
	 */
	uri: DocumentUri;
}

/**
 * The file type of a file system entry.
 *
 * @since 3.19.0
 */
export namespace FileType {
	/**
	 * The file type is unknown.
	 */
	export const unknown = 'unknown';
	/**
	 * A regular file.
	 */
	export const file = 'file';
	/**
	 * A directory.
	 */
	export const directory = 'directory';
}
export type FileType = 'unknown' | 'file' | 'directory';

/**
 * Additional flags about a file system entry.
 * Implemented as a bitmask so that multiple flags can be combined.
 */
export namespace FileFlags {
	/**
	 * The file is a symbolic link.
	 */
	export const symbolicLink = 1;
}
export type FileFlags = uinteger;

/**
 * The parameters sent in a request to read the contents of a directory.
 *
 * @since 3.19.0
 */
export interface ReadDirectoryParams {
	/**
	 * A URI for the location of the folder.
	 */
	uri: DocumentUri;
}

/**
 * A directory entry represents a file or a folder in a directory.
 *
 * @since 3.19.0
 */
export interface DirectoryEntry {
	/**
	 * The name of the entry.
	 */
	name: string;
	/**
	 * The type of the entry.
	 */
	type: FileType;
	/**
	 * Additional flags about the entry.
	 */
	flags: FileFlags;
}

/**
 * The parameters sent in a request to read the text contents of a file.
 * File will be read using the encoding specified in the request.
 *
 * @since 3.19.0
 */
export interface TextReadFileParams {
	/**
	 * Indicator that the file content should be read as a text file.
	 */
	kind: 'text';
	/**
	 * A URI for the location of the file.
	 */
	uri: DocumentUri;
	/**
	 * The encoding of the file content. If not specified, the content is assumed to be UTF-8.
	 */
	encoding?: string;
}

/**
 * The parameters sent in a request to read the binary contents of a file.
 * File content will be returned as a base64 encoded string.
 *
 * @since 3.19.0
 */
export interface BinaryReadFileParams {
	/**
	 * Indicator that the file content should be read as a binary file.
	 */
	kind: 'binary';
	/**
	 * A URI for the location of the file.
	 */
	uri: DocumentUri;
}

/**
 * The parameters sent in a request to read the contents of a file.
 *
 * @since 3.19.0
 */
export type ReadFileParams = TextReadFileParams | BinaryReadFileParams;
export type ReadFileParamKind = ReadFileParams['kind'];


/**
 * The result of a read file request.
 *
 * @since 3.19.0
 */
export interface ReadFileResult {
	/**
	 * The content of the file as a unicode string.
	 *
	 * If the content is requested as text, it will be read using the encoding specified in the request.
	 * Any invalid byte sequences will be replaced with the unicode replacement character `U+FFFD`.
	 *
	 * If the content is requested as binary, it will be returned as a base64 encoded string.
	 */
	content: string;
}

/**
 * The stat request is sent from the server to the client to get metadata about a file.
 *
 * The request can return a `FileStat` which will be used to determine the type of the file,
 * its size, and the creation and modification time. Returns `null` if the file does not exist.
 *
 * @since 3.19.0
 */
export namespace StatRequest {
	export const method: 'workspace/stat' = 'workspace/stat';
	export const messageDirection: MessageDirection = MessageDirection.serverToClient;
	export const type = new ProtocolRequestType<StatParams, FileStat | null, never, void, void>(method);
	export type HandlerSignature = RequestHandler<StatParams, FileStat | null, void>;
	export const capabilities = CM.create('workspace.fileOperations.fileStat', undefined);
}

/**
 * The read directory request is sent from the server to the client to get the entries of a directory.
 *
 * The request can return a `DirectoryEntry[]` which contains the directory entries.
 * Returns `null` if the directory does not exist or the client cannot read it.
 *
 * @since 3.19.0
 */
export namespace ReadDirectoryRequest {
	export const method: 'workspace/readDirectory' = 'workspace/readDirectory';
	export const messageDirection: MessageDirection = MessageDirection.serverToClient;
	export const type = new ProtocolRequestType<ReadDirectoryParams, DirectoryEntry[] | null, never, void, void>(method);
	export type HandlerSignature = RequestHandler<ReadDirectoryParams, DirectoryEntry[] | null, void>;
	export const capabilities = CM.create('workspace.fileOperations.readDirectory', undefined);
}

/**
 * The read file request is sent from the server to the client to get the content of a file.
 *
 * The request can return a `ReadFileResult` which contains the content of the file.
 * Returns `null` if the file does not exist or the client cannot read it.
 *
 * @since 3.19.0
 */
export namespace ReadFileRequest {
	export const method: 'workspace/readFile' = 'workspace/readFile';
	export const messageDirection: MessageDirection = MessageDirection.serverToClient;
	export const type = new ProtocolRequestType<ReadFileParams, ReadFileResult | null, never, void, void>(method);
	export type HandlerSignature = RequestHandler<ReadFileParams, ReadFileResult | null, void>;
	export const capabilities = CM.create('workspace.fileOperations.readFile', undefined);
}
