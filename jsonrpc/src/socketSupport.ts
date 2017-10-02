/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Server, Socket, createServer, createConnection } from 'net';

import { MessageReader, SocketMessageReader } from './messageReader';
import { MessageWriter, SocketMessageWriter } from './messageWriter';

export interface SocketTransport {
	onConnected(): Thenable<[MessageReader, MessageWriter]>;
}

export function createClientSocketTransport(port: number, encoding: string = 'utf-8'): Thenable<SocketTransport> {
	let connectResolve: any;
	let connected = new Promise<[MessageReader, MessageWriter]>((resolve, _reject) => {
		connectResolve = resolve;
	});
	return new Promise<SocketTransport>((resolve, reject) => {
		let server: Server = createServer((socket: Socket) => {
			server.close();
			connectResolve([
				new SocketMessageReader(socket, encoding),
				new SocketMessageWriter(socket, encoding)
			]);
		});
		server.on('error', reject);
		server.listen(port, '127.0.0.1', () => {
			server.removeListener('error', reject);
			resolve({
				onConnected: () => { return connected; }
			});
		});
	});
}

export function createServerSocketTransport(port: number, encoding: string = 'utf-8'): [MessageReader, MessageWriter] {
	const socket: Socket = createConnection(port, '127.0.0.1');
	return [
		new SocketMessageReader(socket, encoding),
		new SocketMessageWriter(socket, encoding)
	];
}