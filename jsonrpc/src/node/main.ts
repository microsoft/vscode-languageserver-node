/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ----------------------------------------------------------------------------------------- */
import RIL from './ril';

// Install the node runtime abstract.
RIL.install();

import * as path from 'path';
import * as os from 'os';
import { ChildProcess } from 'child_process';
import { randomBytes } from 'crypto';
import { Server, Socket, createServer, createConnection } from 'net';
import { MessagePort } from 'worker_threads';

import {
	RAL, AbstractMessageReader, DataCallback, AbstractMessageWriter, Message, ReadableStreamMessageReader, WriteableStreamMessageWriter,
	MessageWriterOptions, MessageReaderOptions, MessageReader, MessageWriter, NullLogger, ConnectionStrategy, ConnectionOptions,
	MessageConnection, Logger, createMessageConnection as _createMessageConnection, Disposable, Emitter
} from '../common/api';

export * from '../common/api';

export class IPCMessageReader extends AbstractMessageReader {

	private process: NodeJS.Process | ChildProcess;

	public constructor(process: NodeJS.Process | ChildProcess) {
		super();
		this.process = process;
		let eventEmitter: NodeJS.EventEmitter = this.process;
		eventEmitter.on('error', (error: any) => this.fireError(error));
		eventEmitter.on('close', () => this.fireClose());
	}

	public listen(callback: DataCallback): Disposable {
		(this.process as NodeJS.EventEmitter).on('message', callback);
		return Disposable.create(() => (this.process as NodeJS.EventEmitter).off('message', callback));
	}
}

export class IPCMessageWriter extends AbstractMessageWriter implements MessageWriter {

	private readonly process: NodeJS.Process | ChildProcess;
	private errorCount: number;

	public constructor(process: NodeJS.Process | ChildProcess) {
		super();
		this.process = process;
		this.errorCount = 0;
		const eventEmitter: NodeJS.EventEmitter = this.process;
		eventEmitter.on('error', (error: any) => this.fireError(error));
		eventEmitter.on('close', () => this.fireClose);
	}

	public write(msg: Message): Promise<void> {
		try {
			if (typeof this.process.send === 'function') {
				(this.process.send as Function)(msg, undefined, undefined, (error: any) => {
					if (error) {
						this.errorCount++;
						this.handleError(error, msg);
					} else {
						this.errorCount = 0;
					}
				});
			}
			return Promise.resolve();
		} catch (error) {
			this.handleError(error, msg);
			return Promise.reject(error);
		}
	}

	private handleError(error: any, msg: Message): void {
		this.errorCount++;
		this.fireError(error, msg, this.errorCount);
	}

	public end(): void {
	}
}

export class PortMessageReader extends AbstractMessageReader implements MessageReader {

	private onData: Emitter<Message>;

	public constructor(port: MessagePort) {
		super();
		this.onData = new Emitter<Message>;
		port.on('close', () => this.fireClose);
		port.on('error', (error) => this.fireError(error));
		port.on('message', (message: Message) => {
			this.onData.fire(message);
		});
	}

	public listen(callback: DataCallback): Disposable {
		return this.onData.event(callback);
	}
}

export class PortMessageWriter extends AbstractMessageWriter implements MessageWriter {

	private readonly port: MessagePort;
	private errorCount: number;

	public constructor(port: MessagePort) {
		super();
		this.port = port;
		this.errorCount = 0;
		port.on('close', () => this.fireClose());
		port.on('error', (error) => this.fireError(error));
	}

	public write(msg: Message): Promise<void> {
		try {
			this.port.postMessage(msg);
			return Promise.resolve();
		} catch (error) {
			this.handleError(error, msg);
			return Promise.reject(error);
		}
	}

	private handleError(error: any, msg: Message): void {
		this.errorCount++;
		this.fireError(error, msg, this.errorCount);
	}

	public end(): void {
	}
}

export class SocketMessageReader extends ReadableStreamMessageReader {
	public constructor(socket: Socket, encoding: RAL.MessageBufferEncoding = 'utf-8') {
		super(RIL().stream.asReadableStream(socket), encoding);
	}
}

export class SocketMessageWriter extends WriteableStreamMessageWriter {

	private socket: Socket;

	public constructor(socket: Socket, options?: RAL.MessageBufferEncoding | MessageWriterOptions) {
		super(RIL().stream.asWritableStream(socket), options);
		this.socket = socket;
	}

	public dispose(): void {
		super.dispose();
		this.socket.destroy();
	}
}

export class StreamMessageReader extends ReadableStreamMessageReader {
	public constructor(readable: NodeJS.ReadableStream, encoding?: RAL.MessageBufferEncoding | MessageReaderOptions) {
		super(RIL().stream.asReadableStream(readable), encoding);
	}
}

export class StreamMessageWriter extends WriteableStreamMessageWriter {
	public constructor(writable: NodeJS.WritableStream, options?: RAL.MessageBufferEncoding | MessageWriterOptions) {
		super(RIL().stream.asWritableStream(writable), options);
	}
}

const XDG_RUNTIME_DIR = process.env['XDG_RUNTIME_DIR'];
const safeIpcPathLengths: Map<NodeJS.Platform, number> = new Map([
	['linux', 107],
	['darwin', 103]
]);

export function generateRandomPipeName(): string {
	const randomSuffix = randomBytes(21).toString('hex');
	if (process.platform === 'win32') {
		return `\\\\.\\pipe\\vscode-jsonrpc-${randomSuffix}-sock`;
	}

	let result: string;
	if (XDG_RUNTIME_DIR) {
		result = path.join(XDG_RUNTIME_DIR, `vscode-ipc-${randomSuffix}.sock`);
	} else {
		result = path.join(os.tmpdir(), `vscode-${randomSuffix}.sock`);
	}

	const limit = safeIpcPathLengths.get(process.platform);
	if (limit !== undefined && result.length >= limit) {
		RIL().console.warn(`WARNING: IPC handle "${result}" is longer than ${limit} characters.`);
	}
	return result;
}

export interface PipeTransport {
	onConnected(): Promise<[MessageReader, MessageWriter]>;
}

export function createClientPipeTransport(pipeName: string, encoding: RAL.MessageBufferEncoding = 'utf-8'): Promise<PipeTransport> {
	let connectResolve: (value: [MessageReader, MessageWriter]) => void;
	const connected = new Promise<[MessageReader, MessageWriter]>((resolve, _reject) => {
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

export function createServerPipeTransport(pipeName: string, encoding: RAL.MessageBufferEncoding = 'utf-8'): [MessageReader, MessageWriter] {
	const socket: Socket = createConnection(pipeName);
	return [
		new SocketMessageReader(socket, encoding),
		new SocketMessageWriter(socket, encoding)
	];
}

export interface SocketTransport {
	onConnected(): Promise<[MessageReader, MessageWriter]>;
}

export function createClientSocketTransport(port: number, encoding: RAL.MessageBufferEncoding = 'utf-8'): Promise<SocketTransport> {
	let connectResolve: (value: [MessageReader, MessageWriter]) => void;
	const connected = new Promise<[MessageReader, MessageWriter]>((resolve, _reject) => {
		connectResolve = resolve;
	});
	return new Promise<SocketTransport>((resolve, reject) => {
		const server: Server = createServer((socket: Socket) => {
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

export function createServerSocketTransport(port: number, encoding: RAL.MessageBufferEncoding = 'utf-8'): [MessageReader, MessageWriter] {
	const socket: Socket = createConnection(port, '127.0.0.1');
	return [
		new SocketMessageReader(socket, encoding),
		new SocketMessageWriter(socket, encoding)
	];
}

function isReadableStream(value: any): value is NodeJS.ReadableStream {
	const candidate: NodeJS.ReadableStream = value;
	return candidate.read !== undefined && candidate.addListener !== undefined;
}

function isWritableStream(value: any): value is NodeJS.WritableStream {
	const candidate: NodeJS.WritableStream = value;
	return candidate.write !== undefined && candidate.addListener !== undefined;
}

export function createMessageConnection(reader: MessageReader, writer: MessageWriter, logger?: Logger, options?: ConnectionStrategy | ConnectionOptions): MessageConnection;
export function createMessageConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, logger?: Logger, options?: ConnectionStrategy | ConnectionOptions): MessageConnection;
export function createMessageConnection(input: MessageReader | NodeJS.ReadableStream, output: MessageWriter | NodeJS.WritableStream, logger?: Logger, options?: ConnectionStrategy | ConnectionOptions): MessageConnection {
	if (!logger) {
		logger = NullLogger;
	}
	const reader = isReadableStream(input) ? new StreamMessageReader(input) : input;
	const writer = isWritableStream(output) ? new StreamMessageWriter(output) : output;

	if (ConnectionStrategy.is(options)) {
		options = { connectionStrategy: options } as ConnectionOptions;
	}

	return _createMessageConnection(reader, writer, logger, options);
}