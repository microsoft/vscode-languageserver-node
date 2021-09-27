/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { NotificationHandler, RequestHandler } from 'vscode-jsonrpc/src/common/connection';
import { uinteger } from 'vscode-languageserver-types';
import { DocumentUri } from 'vscode-languageserver-types';
import { ProtocolNotificationType, ProtocolRequestType } from './messages';
import {
	StaticRegistrationOptions, TextDocumentRegistrationOptions
} from './protocol';

// -------------  Basic Structures  -------------

/**
 * Enumeration of file types. The types `File` and `Directory` can also be
 * a symbolic links, in that case use `FileType.File | FileType.SymbolicLink` and
 * `FileType.Directory | FileType.SymbolicLink`.
 *
 * @since 3.17.0 - proposed state
 */
export enum FileType {
	/**
	 * The file type is unknown.
	 */
	Unknown = 0,

	/**
	 * A regular file.
	 */
	File = 1,

	/**
	 * A directory.
	 */
	Directory = 2,

	/**
	 * A symbolic link to a file or folder
	 */
	Symbolic = 64,
}


/**
 * Type of file system errors that can occur in file system based requests.
 *
 * @since 3.17.0 - proposed state
 */
export enum FileSystemErrorType {
	/**
	 * An error to signal that a file or folder wasn't found.
	 */
	FileNotFound = 0,

	/**
	 * An error to signal that a file or folder already exists, e.g. when creating but not overwriting a file.
	 */
	FileExists = 1,

	/**
	 * An error to signal that a file is not a folder.
	 */
	FileNotADirectory = 2,

	/**
	 * An error to signal that a file is a folder.
	 */
	FileIsADirectory = 3,

	/**
	 * An error to signal that an operation lacks required permissions.
	 */
	NoPermissions = 4,

	/**
	 * An error to signal that the file system is unavailable or too busy to complete a request.
	 */
	Unavailable = 5,

	/**
	 * A custom error.
	 */
	Other = 1000,
}

// -------------  Client & Server Capabilities  -------------

/**
 * Client capabilities specific to file system providers
 *
 * @since 3.17.0 - proposed state
 */
export interface FileSystemProviderClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration. If this is set to `true`
	 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
	 * return value for the corresponding server capability as well.
	 */
	dynamicRegistration?: boolean;
}

export interface $FileSystemProviderClientCapabilities {
	fileSystem?: FileSystemProviderClientCapabilities;
}

/**
 * Server capabilities specific to file system providers
 *
 * @since 3.17.0 - proposed state
 */
export interface FileSystemProviderOptions {
	/**
	 * The uri-scheme the provider registers for
	 */
	scheme: string;

	/**
	 * Whether or not the file system is case sensitive.
	 */
	isCaseSensitive?: boolean;

	/**
	 * Whether or not the file system is readonly.
	 */
	isReadonly?: boolean
}

/**
 * File system provider registration options.
 *
 * @since 3.17.0 - proposed state
 */
export interface FileSystemProviderRegistrationOptions extends TextDocumentRegistrationOptions, FileSystemProviderOptions, StaticRegistrationOptions {
}

export interface $FileSystemProviderServerCapabilities {
	fileSystem?: FileSystemProviderOptions;
}


// -------------  Requests & Notifications  -------------


// DidChangeFile Notification (server->client) fileSystem/didChangeFile

/**
 * The fileSystem did change file notification definition. Change file notifications are sent from the server to the client to
 * signal the change of the registered file system provider.
 *
 * @since 3.17.0 - proposed state
 */
export namespace DidChangeFileNotification {
	export const type = new ProtocolNotificationType<DidChangeFileParams, void>('fileSystem/didChangeFile');
	export type HandlerSignature = NotificationHandler<DidChangeFileParams>;
	export type MiddlewareSignature = (params: DidChangeFileParams, next: HandlerSignature) => void;
}

/**
 * An event to signal that a resource has been created, changed, or deleted. This
 * event should fire for resources that are being [watched](#FileSystemProvider.watch)
 * by clients of this provider.
 *
 * *Note:* It is important that the metadata of the file that changed provides an
 * updated `mtime` that advanced from the previous value in the [stat](#FileStat) and a
 * correct `size` value. Otherwise there may be optimizations in place that will not show
 * the change in an editor for example.
 *
 * @since 3.17.0 - proposed state
 */
export interface DidChangeFileParams {
	/**
	 * The change events.'
	 */
	changes: FileChangeEvent[];
}

/**
 * The event FileSystemProviders use to signal file changes.
 *
 * @since 3.17.0 - proposed state
 */
export interface FileChangeEvent {
	/**
	 * The type of change.
	 */
	uri: DocumentUri;

	/**
	 * The uri of the file that has changed.
	 */
	type: FileChangeType
}

/**
 * Enumeration of file change types.
 *
 * @since 3.17.0 - proposed state
 */
export enum FileChangeType {
	/**
	 * The contents or metadata of a file have changed.
	 */
	Changed = 1,

	/**
	 * A file has been created.
	 */
	Created = 2,

	/**
	 * A file has been deleted.
	 */
	Deleted = 3,
}

// Watch Notification (client->server) fileSystem/watch=

/**
 * The fileSystem watch notification definition. Watch notifications are sent from the client to the server to subscribe
 * to DidChangeFile events in the file or folder denoted by uri.
 *
 * @since 3.17.0 - proposed state
 */
export namespace WatchNotification {
	export const type = new ProtocolNotificationType<WatchParams, void>('fileSystem/watch');
	export type HandlerSignature = NotificationHandler<WatchParams>;
	export type MiddlewareSignature = (params: WatchParams, next: HandlerSignature) => void;
}

/**
 * Parameters of the watch notification.
 *
 * @since 3.17.0 - proposed state
 */
export interface WatchParams {
	/**
	 * The uri of the file or folder to be watched.
	 */
	uri: DocumentUri;

	/**
	 * The subscription ID to be used in order to stop watching the provided file or folder uri via the fileSystem/stopWatching notification.
	 */
	subscriptionId: string;

	/**
	 * Configures the watch
	 */
	options: WatchFileOptions
}

/**
 * Options for the watch notification.
 *
 * @since 3.17.0 - proposed state
 */
export interface WatchFileOptions {
	/**
	 * If a folder should be recursively subscribed to
	 */
	recursive: boolean;

	/**
	 * Folders or files to exclude from being watched.
	 */
	excludes: string[];
}

// StopWatching Notification (client->server) fileSystem/watch

/**
 * The fileSystem stop watching notification definition. Stop watching notifications are sent from client to server to
 * unsubscribe from a watched file or folder.
 *
 * @since 3.17.0 - proposed state
 */
export namespace StopWatchingNotification {
	export const type = new ProtocolNotificationType<StopWatchingParams, void>('fileSystem/stopWatching');
	export type HandlerSignature = NotificationHandler<StopWatchingParams>;
	export type MiddlewareSignature = (params: StopWatchingParams, next: HandlerSignature) => void;
}

/**
 * Parameters of the stop watching notification.
 *
 * @since 3.17.0 - proposed state
 */
export interface StopWatchingParams {
	/**
	 * The subscription id.
	 */
	subscriptionId: string;
}

// Stat Request (client->server) fileSystem/stat

/**
 * The fileSystem stat rquest definition. Stat requests are sent from the client to the server to request metadata about a URI.
 *
 * @since 3.17.0 - proposed state
 */
export namespace StatRequest {
	export const method: 'fileSystem/stat' = 'fileSystem/stat';
	export const type = new ProtocolRequestType<FileStatParams, FileStatResponse, void, FileSystemErrorType, FileSystemProviderRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<FileStatParams, FileStatResponse, FileSystemErrorType>;
}

/**
 * Parameters of the file stat request.
 *
 * @since 3.17.0 - proposed state
 */
export interface FileStatParams {
	/**
	 * The uri to retrieve metadata about.
	 */
	uri: DocumentUri;
}

/**
 * Response for the file stat request.
 *
 * @since 3.17.0 - proposed state
 */
export interface FileStatResponse {
	/**
	 * The type of the file, e.g. is a regular file, a directory, or symbolic link
	 * to a file/directory.
	 *
	 * *Note:* This value might be a bitmask, e.g. `FileType.File | FileType.SymbolicLink`.
	 */
	type: FileType;

	/**
	 * The creation timestamp in milliseconds elapsed since January 1, 1970 00:00:00 UTC.
	 */
	ctime: number;

	/**
	 * The modification timestamp in milliseconds elapsed since January 1, 1970 00:00:00 UTC.
	 *
	 * *Note:* If the file changed, it is important to provide an updated `mtime` that advanced
	 * from the previous value. Otherwise there may be optimizations in place that will not show
	 * the updated file contents in an editor for example.
	 */
	mtime: number;

	/**
	 * The size in bytes.
	 *
	 * *Note:* If the file changed, it is important to provide an updated `size`. Otherwise there
	 * may be optimizations in place that will not show the updated file contents in an editor for
	 * example.
	 */
	size: uinteger;
}

// ReadDirectory Request (client->server) fileSystem/readDirectory

/**
 * The fileSystem read directory request definition. Read directory requests are sent from the client to the server
 * to retrieve all entries of a directory.
 *
 * @since 3.17.0 - proposed state
 */
export namespace ReadDirectoryRequest {
	export const method: 'fileSystem/readDirectory' = 'fileSystem/readDirectory';
	export const type = new ProtocolRequestType<ReadDirectoryParams, ReadDirectoryResponse, void, void, FileSystemProviderRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<ReadDirectoryParams, ReadDirectoryResponse, void>;
}

/**
 * Parameters of the read directory request.
 *
 * @since 3.17.0 - proposed state
 */
export interface ReadDirectoryParams {
	/**
	 * The uri of the folder.
	 */
	uri: DocumentUri;
}

/**
 * Response for the read directory request.
 *
 * @since 3.17.0 - proposed state
 */
export interface ReadDirectoryResponse {
	/**
	 * An array of nodes that represent the directories children.
	 */
	children: DirectoryChild[]
}

/**
 * A name/type item that represents a directory child node.
 *
 * @since 3.17.0 - proposed state
 */
export interface DirectoryChild {
	/**
	 * The name of the node, e.g. a filename or directory name.
	 */
	name: string;

	/**
	 * The type of the file, e.g. is a regular file, a directory, or symbolic link to a file/directory.
	 *
	 * *Note:* This value might be a bitmask, e.g. `FileType.File | FileType.SymbolicLink`.
	 */
	type: FileType;
}

// CreateDirectory Request (client->server) fileSystem/createDirectory

/**
 * The fileSystem create directory request definition. Create directory requests are sent from the client
 * to the server to create a new directory.
 *
 * @since 3.17.0 - proposed state
 */
export namespace CreateDirectoryRequest {
	export const method: 'fileSystem/createDirectory' = 'fileSystem/createDirectory';
	export const type = new ProtocolRequestType<CreateDirectoryParams , void, void, FileSystemErrorType, FileSystemProviderRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<CreateDirectoryParams, void, FileSystemErrorType>;
}

/**
 * Parameters of the create directory request.
 *
 * @since 3.17.0 - proposed state
 */
export interface CreateDirectoryParams {
	/**
	 * The uri of the folder
	 */
	uri: DocumentUri;
}

// readFile Request (client->server) fileSystem/readFile

/**
 * The fileSystem read file request definition. Read file requests are sent from the client
 * to the server to retrieve the content of a file.
 *
 * @since 3.17.0 - proposed state
 */
export namespace ReadFileRequest {
	export const method: 'fileSystem/readFile' = 'fileSystem/readFile';
	export const type = new ProtocolRequestType<ReadFileParams , ReadFileResponse, void, FileSystemErrorType, FileSystemProviderRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<ReadFileParams , ReadFileResponse, FileSystemErrorType>;
}

/**
 * Parameters of the read file request.
 *
 * @since 3.17.0 - proposed state
 */
export interface ReadFileParams {
	/**
	 * The uri of the folder
	 */
	uri: DocumentUri;
}

/**
 * Response for the read file request.
 *
 * @since 3.17.0 - proposed state
 */
export interface ReadFileResponse {
	/**
	 * The entire contents of the file `base64` encoded.
	 */
	content: string;
}

// WriteFile Request (client->server) fileSystem/writeFile

/**
 * The fileSystem write file request definition. Write file requests are sent from the client
 * to the server to write data to a file, replacing its entire contents.
 *
 * @since 3.17.0 - proposed state
 */
export namespace WriteFileRequest {
	export const method: 'fileSystem/writeFile' = 'fileSystem/writeFile';
	export const type = new ProtocolRequestType<WriteFileParams , void, void, FileSystemErrorType, FileSystemProviderRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<WriteFileParams , void, FileSystemErrorType>;
}

/**
 * Parameters of the write file request.
 *
 * @since 3.17.0 - proposed state
 */
export interface WriteFileParams {
	/**
	 * The uri of the file to write
	 */
	uri: DocumentUri;

	/**
	 * The new content of the file `base64` encoded.
	 */
	content: string;

	/**
	 * Options to define if missing files should or must be created.
	 */
	options: WriteFileOptions
}

/**
 * Options for the write file request.
 *
 * @since 3.17.0 - proposed state
 */
export interface WriteFileOptions {
	/**
	 * If a new file should be created.
	 */
	create: boolean;

	/**
	 * If a pre-existing file should be overwritten.
	 */
	overwrite: boolean;
}

// Delete Request (client->server) fileSystem/delete

/**
 * The fileSystem delete file request definition. Delete requests are sent from the client
 * to the server to delete a file or folder.
 *
 * @since 3.17.0 - proposed state
 */
export namespace DeleteRequest {
	export const method: 'fileSystem/delete' = 'fileSystem/delete';
	export const type = new ProtocolRequestType<DeleteFileParams , void, void, FileSystemErrorType, FileSystemProviderRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<DeleteFileParams , void, FileSystemErrorType>;
}

/**
 * Parameters of the delete request.
 *
 * @since 3.17.0 - proposed state
 */
export interface DeleteFileParams {
	/**
	 * The uri of the file or folder to delete
	 */
	uri: DocumentUri;

	/**
	 * Defines if deletion of folders is recursive.
	 */
	options: DeleteFileOptions
}

/**
 * Options of the delete request.
 *
 * @since 3.17.0 - proposed state
 */
export interface DeleteFileOptions {
	/**
	 * If a folder should be recursively deleted.
	 */
	recursive: boolean;
}

// Rename Request (client->server) fileSystem/rename

/**
 * The fileSystem rename file request definition. Rename requests are sent from the client
 * to the server to rename a file or folder.
 *
 * @since 3.17.0 - proposed state
 */
export namespace RenameRequest {
	export const method: 'fileSystem/rename' = 'fileSystem/rename';
	export const type = new ProtocolRequestType<RenameFileParams , void, void, FileSystemErrorType, FileSystemProviderRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<RenameFileParams , void, FileSystemErrorType>;
}

/**
 * Parameters of the rename file request.
 *
 * @since 3.17.0 - proposed state
 */
export interface RenameFileParams {
	/**
	 * The existing file or folder.
	 */
	oldUri: DocumentUri;

	/**
	 * The new location.
	 */
	newUri: DocumentUri;

	/**
	 * Defines if existing files should be overwritten.
	 */
	options: RenameFileOptions
}

/**
 * Options of the rename file request.
 *
 * @since 3.17.0 - proposed state
 */
export interface RenameFileOptions {
	/**
	 * If existing files should be overwritten.
	 */
	overwrite: boolean;
}