/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	RAL, Disposable, Message, Emitter, ContentTypeEncoderOptions, ContentTypeDecoderOptions, AbstractMessageBuffer
} from '../common/api';


class MessageBuffer extends AbstractMessageBuffer {

	private static readonly emptyBuffer: Uint8Array = new Uint8Array(0);

	private asciiDecoder: TextDecoder;

	constructor(encoding: RAL.MessageBufferEncoding = 'utf-8') {
		super(encoding);
		this.asciiDecoder = new TextDecoder('ascii');
	}

	protected emptyBuffer(): Uint8Array {
		return MessageBuffer.emptyBuffer;
	}

	protected fromString(value: string, _encoding: RAL.MessageBufferEncoding): Uint8Array {
		return (new TextEncoder()).encode(value);
	}

	protected toString(value: Uint8Array, encoding: RAL.MessageBufferEncoding): string {
		if (encoding === 'ascii') {
			return this.asciiDecoder.decode(value);
		} else {
			return (new TextDecoder(encoding)).decode(value);
		}
	}

	protected asNative(buffer: Uint8Array, length?: number): Uint8Array {
		if (length === undefined) {
			return buffer;
		} else {
			return buffer.slice(0, length);
		}
	}

	protected allocNative(length: number): Uint8Array {
		return new Uint8Array(length);
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
			}, () => {
				RAL().console.error(`Converting blob to array buffer failed.`);
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
				throw new Error(`In a Browser environments only utf-8 text encoding is supported. But got encoding: ${encoding}`);
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
	};
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
					throw new Error(`In a Browser environments only utf-8 text encoding is supported. But got encoding: ${options.charset}`);
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
		setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): Disposable {
			const handle = setTimeout(callback, ms, ...args);
			return { dispose: () => clearTimeout(handle) };
		},
		setImmediate(callback: (...args: any[]) => void, ...args: any[]): Disposable {
			const handle = setTimeout(callback, 0, ...args);
			return { dispose: () => clearTimeout(handle) };
		},
		setInterval(callback: (...args: any[]) => void, ms: number, ...args: any[]): Disposable {
			const handle =  setInterval(callback, ms, ...args);
			return { dispose: () => clearInterval(handle) };
		},
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