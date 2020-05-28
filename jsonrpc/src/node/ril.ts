/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import RAL from '../common/ral';
import { Disposable } from '../common/disposable';
import { Message } from '../common/messages';
import { ContentTypeEncoderOptions, ContentTypeDecoderOptions } from '../common/encoding';

import { TextDecoder } from 'util';

const DefaultSize: number = 8192;
const CR: number = Buffer.from('\r', 'ascii')[0];
const LF: number = Buffer.from('\n', 'ascii')[0];
const CRLF: string = '\r\n';

class MessageBuffer implements RAL.MessageBuffer {

	private _encoding: RAL.MessageBufferEncoding;
	private index: number;
	private buffer: Buffer;

	constructor(encoding: RAL.MessageBufferEncoding = 'utf-8') {
		this._encoding = encoding;
		this.index = 0;
		this.buffer = Buffer.allocUnsafe(DefaultSize);
	}

	public get encoding(): RAL.MessageBufferEncoding {
		return this._encoding;
	}

	public append(chunk: Uint8Array | Buffer | string): void {
		let toAppend: Uint8Array | Buffer;
		if (typeof chunk === 'string') {
			toAppend = Buffer.from(chunk, this._encoding);
		} else {
			toAppend = chunk;
		}
		if (this.buffer.length - this.index >= toAppend.length) {
			this.buffer.set(toAppend, this.index);
		} else {
			var newSize = (Math.ceil((this.index + toAppend.length) / DefaultSize) + 1) * DefaultSize;
			if (this.index === 0) {
				this.buffer = Buffer.allocUnsafe(newSize);
				this.buffer.set(toAppend);
			} else {
				this.buffer = Buffer.concat([this.buffer.slice(0, this.index), toAppend], newSize);
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
		const headers = this.buffer.toString('ascii', 0, current).split(CRLF);
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

	public tryReadBody(length: number): Buffer | undefined {
		if (this.index < length) {
			return undefined;
		}
		const result = Buffer.alloc(length);
		this.buffer.copy(result, 0, 0, length);

		const nextStart = length;
		this.buffer.copy(this.buffer, 0, nextStart);
		this.index = this.index - nextStart;

		return result;
	}

	public get numberOfBytes(): number {
		return this.index;
	}
}

class ReadableStreamWrapper implements RAL.ReadableStream {

	constructor(private stream: NodeJS.ReadableStream) {
	}

	public onClose(listener: () => void): Disposable {
		this.stream.on('close', listener);
		return Disposable.create(() => this.stream.off('close', listener));
	}

	public onError(listener: (error: any) => void): Disposable {
		this.stream.on('error', listener);
		return Disposable.create(() => this.stream.off('error', listener));
	}

	public onEnd(listener: () => void): Disposable {
		this.stream.on('end', listener);
		return Disposable.create(() => this.stream.off('end', listener));
	}

	public onData(listener: (data: Uint8Array) => void): Disposable {
		this.stream.on('data', listener);
		return Disposable.create(() => this.stream.off('data', listener));
	}
}

class WritableStreamWrapper implements RAL.WritableStream {

	constructor(private stream: NodeJS.WritableStream) {
	}

	public onClose(listener: () => void): Disposable {
		this.stream.on('close', listener);
		return Disposable.create(() => this.stream.off('close', listener));
	}

	public onError(listener: (error: any) => void): Disposable {
		this.stream.on('error', listener);
		return Disposable.create(() => this.stream.off('error', listener));
	}

	public onEnd(listener: () => void): Disposable {
		this.stream.on('end', listener);
		return Disposable.create(() => this.stream.off('end', listener));
	}

	public write(data: Uint8Array | string, encoding?: RAL.MessageBufferEncoding): Promise<void> {
		return new Promise((resolve, reject) => {
			const callback = (error: Error | undefined | null) => {
				if (error === undefined || error === null) {
					resolve();
				} else {
					reject(error);
				}
			};
			if (typeof data === 'string') {
				this.stream.write(data, encoding, callback);
			} else {
				this.stream.write(data, callback);
			}
		});
	}

	public end(): void {
		this.stream.end();
	}
}

interface RIL extends RAL {
	readonly stream: {
		readonly asReadableStream: (stream: NodeJS.ReadableStream) => RAL.ReadableStream;
		readonly asWritableStream: (stream: NodeJS.WritableStream) => RAL.WritableStream;
	}
}

const _ril: RIL = Object.freeze<RIL>({
	messageBuffer: Object.freeze({
		create: (encoding: RAL.MessageBufferEncoding) => new MessageBuffer(encoding)
	}),
	applicationJson: Object.freeze({
		encoder: Object.freeze({
			name: 'application/json',
			encode: (msg: Message, options: ContentTypeEncoderOptions): Promise<Buffer> => {
				return Promise.resolve(Buffer.from(JSON.stringify(msg, undefined, 0), options.charset));
			}
		}),
		decoder: Object.freeze({
			name: 'application/json',
			decode: (buffer: Uint8Array | Buffer, options: ContentTypeDecoderOptions): Promise<Message> => {
				if (buffer instanceof Buffer) {
					return Promise.resolve(JSON.parse(buffer.toString(options.charset)));
				} else {
					return Promise.resolve(JSON.parse(new TextDecoder(options.charset).decode(buffer)));
				}
			}
		})
	}),
	stream: Object.freeze({
		asReadableStream: (socket: NodeJS.ReadableStream) => new ReadableStreamWrapper(socket),
		asWritableStream: (socket: NodeJS.WritableStream) => new WritableStreamWrapper(socket)
	}),
	console: console,
	timer: Object.freeze({
		setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): RAL.TimeoutHandle {
			return setTimeout(callback, ms, ...args) as unknown as RAL.TimeoutHandle;
		},
		clearTimeout(handle: RAL.TimeoutHandle): void {
			clearTimeout(handle as unknown as NodeJS.Timeout);
		},
		setImmediate(callback: (...args: any[]) => void, ...args: any[]): RAL.ImmediateHandle {
			return setImmediate(callback, ...args) as unknown as RAL.ImmediateHandle;
		},
		clearImmediate(handle: RAL.ImmediateHandle): void {
			clearImmediate(handle as unknown as NodeJS.Immediate);
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