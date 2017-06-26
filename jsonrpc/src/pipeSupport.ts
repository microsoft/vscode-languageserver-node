/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

import { Server, Socket, createServer, createConnection } from 'net';

import { MessageReader, SocketMessageReader } from './messageReader';
import { MessageWriter, SocketMessageWriter } from './messageWriter';

export function generateRandomPipeName(): string {
	const randomSuffix = randomBytes(21).toString('hex');
	if (process.platform === 'win32') {
		return `\\\\.\\pipe\\vscode-jsonrpc-${randomSuffix}-sock`;
	} else {
		// Mac/Unix: use socket file
		return join(tmpdir(), `vscode-${randomSuffix}.sock`);
	}
}

export interface PipeTransport {
	onConnected(): Thenable<[MessageReader, MessageWriter]>;
}

export function createClientPipeTransport(pipeName: string, encoding: string = 'utf-8'): Thenable<PipeTransport> {
	let connectResolve: any;
	let connected = new Promise<[MessageReader, MessageWriter]>((resolve, _reject) => {
		connectResolve = resolve;
	});
	return new Promise<PipeTransport>((resolve, reject) => {
		let server: Server = createServer((socket: Socket) => {
			server.close();
			connectResolve([
				new SocketMessageReader(socket, encoding),
				new SocketMessageWriter(socket, encoding)
			]);
		});
		server.on('error', reject);
		server.listen(pipeName, () => {
			server.removeListener('error', reject);
			resolve({
				onConnected: () => { return connected; }
			});
		});
	});
}

export function createServerPipeTransport(pipeName: string, encoding: string = 'utf-8'): [MessageReader, MessageWriter] {
	const socket: Socket = createConnection(pipeName);
	return [
		new SocketMessageReader(socket, encoding),
		new SocketMessageWriter(socket, encoding)
	];
}