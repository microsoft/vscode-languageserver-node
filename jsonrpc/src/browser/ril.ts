/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import RAL from '../common/ral';
import { Disposable } from '../common/disposable';
import { Message } from '../common/messages';
import { Emitter } from '../common/events';
import { ContentTypeEncoderOptions, ContentTypeDecoderOptions } from '../common/encoding';

const DefaultSize: number = 8192;
const CR: number = 13; // '\r'
const LF: number = 10; // '\n'
const CRLF: string = '\r\n';

class MessageBuffer implements RAL.MessageBuffer {

	private _encoding: RAL.MessageBufferEncoding;
	private index: number;
	private buffer: Uint8Array;
	private headerDecoder: TextDecoder;

	constructor(encoding: RAL.MessageBufferEncoding = 'utf-8') {
		this._encoding = encoding;
		if (this._encoding !== 'utf-8') {
			throw new Error(`In a Browser environments only utf-8 text encding is supported. But got encoding: ${encoding}`);
		}
		this.index = 0;
		this.buffer = new Uint8Array(DefaultSize);
		this.headerDecoder = new TextDecoder('ascii');
	}

	public get encoding(): RAL.MessageBufferEncoding {
		return this._encoding;
	}

	public append(chunk: Uint8Array | string): void {
		let toAppend: Uint8Array;
		if (typeof chunk === 'string') {
			toAppend = (new TextEncoder()).encode(chunk);
		} else {
			toAppend = chunk;
		}
		if (this.buffer.length - this.index >= toAppend.length) {
			this.buffer.set(toAppend, this.index);
		} else {
			var newSize = (Math.ceil((this.index + toAppend.length) / DefaultSize) + 1) * DefaultSize;
			if (this.index === 0) {
				this.buffer = new Uint8Array(newSize);
				this.buffer.set(toAppend);
			} else {
				const current = this.buffer;
				this.buffer = new Uint8Array(newSize);
				this.buffer.set(current);
				this.buffer.set(toAppend, this.index);
			}
		}
		this.index += toAppend.length;
	}

	public tryReadHeaders(): Map<string, string> | undefined {
		let current = 0;
		while (current + 3 < this.index && (this.buffer[current] !== CR || this.buffer[current + 1] !== LF || this.buffer[current + 2] !== CR || this.buffer[current + 3] !== LF)) {
			current++;
		}
		// No header / body separator found (e.g CRLFCRLF)
		if (current + 3 >= this.index) {
			return undefined;
		}
		const result: Map<string, string> = new Map();
		const headers = this.headerDecoder.decode(this.buffer.subarray(0, current)).split(CRLF);
		headers.forEach((header) => {
			let index: number = header.indexOf(':');
			if (index === -1) {
				throw new Error('Message header must separate key and value using :');
			}
			let key = header.substr(0, index);
			let value = header.substr(index + 1).trim();

			result.set(key, value);
		});

		let nextStart = current + 4;
		this.buffer = this.buffer.slice(nextStart);
		this.index = this.index - nextStart;
		return result;
	}

	public tryReadBody(length: number): Uint8Array | undefined {
		if (this.index < length) {
			return undefined;
		}
		const result = this.buffer.slice(0, length);
		this.index = this.index - length;

		return result;
	}

	public get numberOfBytes(): number {
		return this.index;
	}
}

class ReadableStreamWrapper implements RAL.ReadableStream {

	private _onData: Emitter<Uint8Array>;
	private _messageListener: (event: MessageEvent) => void;

	constructor(private socket: WebSocket) {
		this._onData = new Emitter<Uint8Array>();
		this._messageListener = (event) => {
			const blob = event.data as Blob;
			blob.arrayBuffer().then((buffer) => {
				this._onData.fire(new Uint8Array(buffer));
			});
		};
		this.socket.addEventListener('message', this._messageListener);
	}

	public onClose(listener: () => void): Disposable {
		this.socket.addEventListener('close', listener);
		return Disposable.create(() => this.socket.removeEventListener('close', listener));
	}

	public onError(listener: (error: any) => void): Disposable {
		this.socket.addEventListener('error', listener);
		return Disposable.create(() => this.socket.removeEventListener('error', listener));
	}

	public onEnd(listener: () => void): Disposable {
		this.socket.addEventListener('end', listener);
		return Disposable.create(() => this.socket.removeEventListener('end', listener));
	}

	public onData(listener: (data: Uint8Array) => void): Disposable {
		return this._onData.event(listener);
	}
}

class WritableStreamWrapper implements RAL.WritableStream {

	constructor(private socket: WebSocket) {
	}

	public onClose(listener: () => void): Disposable {
		this.socket.addEventListener('close', listener);
		return Disposable.create(() => this.socket.removeEventListener('close', listener));
	}

	public onError(listener: (error: any) => void): Disposable {
		this.socket.addEventListener('error', listener);
		return Disposable.create(() => this.socket.removeEventListener('error', listener));
	}

	public onEnd(listener: () => void): Disposable {
		this.socket.addEventListener('end', listener);
		return Disposable.create(() => this.socket.removeEventListener('end', listener));
	}

	public write(data: Uint8Array | string, encoding?: RAL.MessageBufferEncoding): Promise<void> {
		if (typeof data === 'string') {
			if (encoding !== undefined && encoding !== 'utf-8') {
				throw new Error(`In a Browser environments only utf-8 text encding is supported. But got encoding: ${encoding}`);
			}
			this.socket.send(data);
		} else {
			this.socket.send(data);
		}
		return Promise.resolve();
	}

	public end(): void {
		this.socket.close();
	}
}

interface RIL extends RAL {
	readonly stream: {
		readonly asReadableStream: (stream: WebSocket) => RAL.ReadableStream;
		readonly asWritableStream: (stream: WebSocket) => RAL.WritableStream;
	}
}

const _textEncoder = new TextEncoder();
const _ril: RIL = Object.freeze<RIL>({
	messageBuffer: Object.freeze({
		create: (encoding: RAL.MessageBufferEncoding) => new MessageBuffer(encoding)
	}),
	applicationJson: Object.freeze({
		encoder: Object.freeze({
			name: 'application/json',
			encode: (msg: Message, options: ContentTypeEncoderOptions): Promise<Uint8Array> => {
				if (options.charset !== 'utf-8') {
					throw new Error(`In a Browser environments only utf-8 text encding is supported. But got encoding: ${options.charset}`);
				}
				return Promise.resolve(_textEncoder.encode(JSON.stringify(msg, undefined, 0)));
			}
		}),
		decoder: Object.freeze({
			name: 'application/json',
			decode: (buffer: Uint8Array, options: ContentTypeDecoderOptions): Promise<Message> => {
				if (!(buffer instanceof Uint8Array)) {
					throw new Error(`In a Browser environments only Uint8Arrays are supported.`);
				}
				return Promise.resolve(JSON.parse(new TextDecoder(options.charset).decode(buffer)));
			}
		})
	}),
	stream: Object.freeze({
		asReadableStream: (socket: WebSocket) => new ReadableStreamWrapper(socket),
		asWritableStream: (socket: WebSocket) => new WritableStreamWrapper(socket)
	}),
	console: console,
	timer: Object.freeze({
		setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): RAL.TimeoutHandle {
			return setTimeout(callback, ms, ...args) as unknown as RAL.TimeoutHandle;
		},
		clearTimeout(handle: RAL.TimeoutHandle): void {
			clearTimeout(handle as unknown as number);
		},
		setImmediate(callback: (...args: any[]) => void, ...args: any[]): RAL.ImmediateHandle {
			return setTimeout(callback, 0, ...args) as unknown as RAL.ImmediateHandle;
		},
		clearImmediate(handle: RAL.ImmediateHandle): void {
			clearTimeout(handle as unknown as number);
		}
	})
});


function RIL(): RIL {
	return _ril;
}

namespace RIL {
	export function install(): void {
		RAL.install(_ril);
	}
}

export default RIL;