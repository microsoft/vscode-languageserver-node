/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { DirectoryEntry, FileStat, StatRequest, ReadDirectoryRequest, ReadFileRequest, ReadFileResult, type DocumentUri } from 'vscode-languageserver-protocol';

import type { Feature, _RemoteWorkspace } from './server';

/**
 * Shape of the file system feature
 *
 * @since 3.19.0
 */
export interface FileSystemFeatureShape {
	/**
	 * Provides access to the file system of the client.
	 *
	 * @since 3.19.0
	 */
	fs: {
		/**
		 * Returns metadata about a file system entry.
		 *
		 * @param uri The URI of the file to stat.
		 */
		stat(uri: DocumentUri): Promise<FileStat | null>;
		/**
		 * Reads the contents of a file.
		 *
		 * @param uri The URI of the file to read.
		 * @param encoding The encoding to use when reading the file. Uses UTF-8 if not specified.
		 */
		readFile(uri: DocumentUri, encoding?: string): Promise<ReadFileResult | null>;
		/**
		 * Reads the contents of a directory.
		 *
		 * @param uri The URI of the directory to read.
		 */
		readDirectory(uri: DocumentUri): Promise<DirectoryEntry[] | null>;
	};
}

export const FileSystemFeature: Feature<_RemoteWorkspace, FileSystemFeatureShape> = (Base) => {
	return class extends Base {
		public get fs() {
			return {
				stat: (uri: DocumentUri): Promise<FileStat | null> => {
					return this.connection.sendRequest(StatRequest.type, { uri });
				},
				readFile: (uri: DocumentUri, encoding?: string): Promise<ReadFileResult | null> => {
					return this.connection.sendRequest(ReadFileRequest.type, { uri, encoding });
				},
				readDirectory: (uri: DocumentUri): Promise<DirectoryEntry[] | null> => {
					return this.connection.sendRequest(ReadDirectoryRequest.type, { uri });
				}
			};
		}
	};
};
