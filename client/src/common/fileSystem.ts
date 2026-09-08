/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';

import {
	ClientCapabilities, StatRequest, ReadFileRequest, ReadDirectoryRequest,
	ReadFileParamKind
} from 'vscode-languageserver-protocol';

import { StaticFeature, FeatureClient, FeatureState } from './features';

export interface FileSystemReadFileSignature {
	(this: void, kind: ReadFileParamKind, uri: vscode.Uri, encoding?: string): Promise<string | null>;
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
		readFile?: (this: void, kind: ReadFileParamKind, uri: vscode.Uri, encoding: string | undefined, next: FileSystemReadFileSignature) => vscode.ProviderResult<string | null>;
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
			const encoding = params.kind === 'text' ? params.encoding : undefined;
			const paramsUri = this._client.protocol2CodeConverter.asUri(params.uri);
			const fileRead: FileSystemReadFileSignature = async (kind, uri, encoding) => {
				try {
					const bytes = await vscode.workspace.fs.readFile(uri);
					if (kind === 'binary') {
						return toBase64(bytes);
					} else if (kind === 'text') {
						const decoder = new TextDecoder(encoding || 'utf-8');
						return decoder.decode(bytes);
					} else {
						return null;
					}
				} catch {
					return null;
				}
			};
			const middleware = client.middleware.workspace;
			const result = await (middleware?.fs?.readFile
				? middleware.fs.readFile(params.kind, paramsUri, encoding, fileRead)
				: fileRead(params.kind, paramsUri, encoding));
			if (result === undefined || result === null) {
				return null;
			}
			return { content: result };
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

declare const Buffer: undefined | {
	from(bytes: Uint8Array): { toString(encoding: 'base64'): string };
};

const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function toBase64(bytes: Uint8Array): string {
	// First, try to use the new toBase64() method on Uint8Array if available.
	if (typeof (bytes as any).toBase64 === 'function') {
		return (bytes as any).toBase64();
	}
	// Then, try to use the node.js buffer implementation if available.
	if (typeof Buffer !== 'undefined') {
		return Buffer.from(bytes).toString('base64');
	}
	// Fallback to a manual implementation, which is slower but works in all environments.
	// File might be quite large, use an array to avoid concat overhead
	const chars = new Array<string>(Math.ceil(bytes.length / 3) * 4);
	let j = 0;
	for (let i = 0; i < bytes.length; i += 3) {
		const b0 = bytes[i];
		const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
		const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
		chars[j++] = base64Chars[b0 >> 2];
		chars[j++] = base64Chars[((b0 & 0x03) << 4) | (b1 >> 4)];
		chars[j++] = i + 1 < bytes.length ? base64Chars[((b1 & 0x0f) << 2) | (b2 >> 6)] : '=';
		chars[j++] = i + 2 < bytes.length ? base64Chars[b2 & 0x3f] : '=';
	}
	return chars.join('');
}
