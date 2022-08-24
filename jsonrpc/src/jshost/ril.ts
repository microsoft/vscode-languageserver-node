/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import RAL from '../common/ral';
import { Disposable } from '../common/disposable';
import { Message } from '../common/messages';
import { ContentTypeEncoderOptions, ContentTypeDecoderOptions } from '../common/encoding';
import { AbstractMessageBuffer } from '../common/messageBuffer';
import { TextEncoder, TextDecoder } from 'text-decoding';

class MessageBuffer extends AbstractMessageBuffer {

	private static readonly emptyBuffer: Uint8Array = new Uint8Array(0);

	private asciiDecoder: typeof TextDecoder;

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

	constructor() {
	}

	public onClose(listener: () => void): Disposable {
		return Disposable.create(() => {} );
	}

	public onError(listener: (error: any) => void): Disposable {
		return Disposable.create(() => {} );
	}

	public onEnd(listener: () => void): Disposable {
		return Disposable.create(() => {} );
	}

	public onData(listener: (data: Uint8Array) => void): Disposable {
		return Disposable.create(() => {} );
	}
}

class WritableStreamWrapper implements RAL.WritableStream {

	constructor() {
	}

	public onClose(listener: () => void): Disposable {
		return Disposable.create(() => {} );
	}

	public onError(listener: (error: any) => void): Disposable {
		return Disposable.create(() => {} );
	}

	public onEnd(listener: () => void): Disposable {
		return Disposable.create(() => {} );
	}

	public write(data: Uint8Array | string, encoding?: RAL.MessageBufferEncoding): Promise<void> {
		return Promise.resolve();
	}

	public end(): void {
	}
}

interface RIL extends RAL {
	readonly stream: {
		readonly asReadableStream: (stream: any) => RAL.ReadableStream;
		readonly asWritableStream: (stream: any) => RAL.WritableStream;
	};
}

const _ril: RIL = Object.freeze<RIL>({
	messageBuffer: Object.freeze({
		create: (encoding: RAL.MessageBufferEncoding) => new MessageBuffer(encoding)
	}),
	applicationJson: Object.freeze({
		encoder: Object.freeze({
			name: 'application/json',
			encode: (msg: Message, options: ContentTypeEncoderOptions): Promise<Uint8Array> => {
				throw new Error(`In a jshost environments only utf-8 text encoding is supported. But got encoding: ${options.charset}`);
			}
		}),
		decoder: Object.freeze({
			name: 'application/json',
			decode: (buffer: Uint8Array, options: ContentTypeDecoderOptions): Promise<Message> => {
				throw new Error(`In a jshost environments only Uint8Arrays are supported.`);
			}
		})
	}),
	stream: Object.freeze({
		asReadableStream: () => new ReadableStreamWrapper(),
		asWritableStream: () => new WritableStreamWrapper()
	}),
	console: console,
	timer: Object.freeze({
		setTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): Disposable {
			return { dispose: () => {} };
		},
		setImmediate(callback: (...args: any[]) => void, ...args: any[]): Disposable {
			return { dispose: () => {} };
		},
		setInterval(callback: (...args: any[]) => void, ms: number, ...args: any[]): Disposable {
			return { dispose: () => {} };
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