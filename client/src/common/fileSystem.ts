/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';

import {
	ClientCapabilities, StatRequest, ReadFileRequest, ReadDirectoryRequest
} from 'vscode-languageserver-protocol';

import { StaticFeature, FeatureClient, FeatureState } from './features';

export interface FileSystemReadFileSignature {
	(this: void, uri: vscode.Uri, encoding?: string): Promise<string | null>;
}

export interface FileSystemStatSignature {
	(this: void, uri: vscode.Uri): Promise<vscode.FileStat | null>;
}

export interface FileSystemReadDirectorySignature {
	(this: void, uri: vscode.Uri): Promise<[string, vscode.FileType][] | null>;
}

/**
 * File system middleware.
 *
 * @since 3.19.0
 */
export interface FileSystemMiddleware {
	fs?: {
		stat?: (this: void, uri: vscode.Uri, next: FileSystemStatSignature) => vscode.ProviderResult<vscode.FileStat | null>;
		readFile?: (this: void, uri: vscode.Uri, encoding: string | undefined, next: FileSystemReadFileSignature) => vscode.ProviderResult<string | null>;
		readDirectory?: (this: void, uri: vscode.Uri, next: FileSystemReadDirectorySignature) => vscode.ProviderResult<[string, vscode.FileType][] | null>;
	};
}

interface WorkspaceFileSystemMiddleware {
	workspace?: FileSystemMiddleware;
}

// TextDecoder is available in all supported environments, but we can't use it directly
// because that would require us to use the dom or webworker lib, which we don't want to do.
// So we declare it here to make TypeScript happy.
declare class TextDecoder {
	constructor(label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean });
	decode(input?: Uint8Array): string;
}

/**
 * file system feature. From server to client.
 */
export class FileSystemFeature implements StaticFeature {

	private readonly _client: FeatureClient<WorkspaceFileSystemMiddleware>;

	constructor(client: FeatureClient<WorkspaceFileSystemMiddleware>) {
		this._client = client;
	}

	getState(): FeatureState {
		return { kind: 'static' };
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		capabilities.workspace ??= {};
		capabilities.workspace.fileSystem ??= {};
		capabilities.workspace.fileSystem.stat = true;
		capabilities.workspace.fileSystem.readFile = true;
		capabilities.workspace.fileSystem.readDirectory = true;
	}

	public initialize(): void {
		const client = this._client;
		client.onRequest(StatRequest.type, async (params) => {
			const paramsUri = this._client.protocol2CodeConverter.asUri(params.uri);
			const fileStat: FileSystemStatSignature = async (uri) => {
				try {
					const vstat = await vscode.workspace.fs.stat(uri);
					return vstat;
				} catch {
					return null;
				}
			};
			const middleware = client.middleware.workspace;
			const result = await (middleware?.fs?.stat
				? middleware.fs.stat(paramsUri, fileStat)
				: fileStat(paramsUri));
			return result
				? this._client.code2ProtocolConverter.asFileStat(result)
				: null;
		});
		client.onRequest(ReadFileRequest.type, async (params) => {
			const paramsUri = this._client.protocol2CodeConverter.asUri(params.uri);
			const fileRead: FileSystemReadFileSignature = async (uri, encoding) => {
				try {
					const bytes = await vscode.workspace.fs.readFile(uri);
					const decoder = new TextDecoder(encoding || 'utf-8');
					return decoder.decode(bytes);
				} catch {
					return null;
				}
			};
			const middleware = client.middleware.workspace;
			const result = await (middleware?.fs?.readFile
				? middleware.fs.readFile(paramsUri, params.encoding, fileRead)
				: fileRead(paramsUri, params.encoding));
			if (result === undefined || result === null) {
				return null;
			}
			return { text: result };
		});
		client.onRequest(ReadDirectoryRequest.type, async (params) => {
			const paramsUri = this._client.protocol2CodeConverter.asUri(params.uri);
			const directoryRead: FileSystemReadDirectorySignature = async (uri) => {
				try {
					const entries = await vscode.workspace.fs.readDirectory(uri);
					return entries;
				} catch {
					return null;
				}
			};
			const middleware = client.middleware.workspace;
			const result = await (middleware?.fs?.readDirectory
				? middleware.fs.readDirectory(paramsUri, directoryRead)
				: directoryRead(paramsUri));
			if (result === undefined || result === null) {
				return null;
			}
			const entries = result.map(this._client.code2ProtocolConverter.asDirectoryEntry);
			return entries;
		});
	}

	public clear(): void {
	}
}
