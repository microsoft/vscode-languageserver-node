/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Socket } from 'net';
import { ChildProcess } from 'child_process';

import { Message } from './common/messages';
import { AbstractMessageReader, MessageReader, DataCallback } from './common/messageReader';
import { ContentDecoder, ContentTypeDecoder, ContentTypeDecoderOptions } from './common/encoding';

const DefaultSize: number = 8192;
const CR: number = Buffer.from('\r', 'ascii')[0];
const LF: number = Buffer.from('\n', 'ascii')[0];
const CRLF: string = '\r\n';

export interface MessageReaderOptions {
	charset?: BufferEncoding;
	contentDecoder?: ContentDecoder;
	contentDecoders?: ContentDecoder[];
	contentTypeDecoder?: ContentTypeDecoder;
	contentTypeDecoders?: ContentTypeDecoder[];
}

interface ResolvedMessageReaderOptions {
	charset: BufferEncoding;
	contentDecoder?: ContentDecoder;
	contentDecoders: Map<string, ContentDecoder>;
	contentTypeDecoder: ContentTypeDecoder;
	contentTypeDecoders: Map<string, ContentTypeDecoder>;
}

const ApplicationJsonContentTypeDecoder: ContentTypeDecoder = {
	name: 'application/json',
	decode: (value: Buffer, options: ContentTypeDecoderOptions): Promise<Message> => {
		return Promise.resolve(JSON.parse(value.toString(options.charset)));
	}
};

namespace ResolvedMessageReaderOptions {

	export function fromOptions(options?: BufferEncoding | MessageReaderOptions): ResolvedMessageReaderOptions {
		let charset: BufferEncoding;
		let result: ResolvedMessageReaderOptions;
		let contentDecoder: ContentDecoder | undefined;
		const contentDecoders: typeof result.contentDecoders = new Map();
		let contentTypeDecoder: ContentTypeDecoder | undefined;
		const contentTypeDecoders: typeof result.contentTypeDecoders = new Map();
		if (options === undefined || typeof options === 'string') {
			charset = options ?? 'utf8';
		} else {
			charset = options.charset ?? 'utf8';
			if (options.contentDecoder !== undefined) {
				contentDecoder = options.contentDecoder;
				contentDecoders.set(contentDecoder.name, contentDecoder);
			}
			if (options.contentDecoders !== undefined) {
				for (const decoder of options.contentDecoders) {
					contentDecoders.set(decoder.name, decoder);
				}
			}
			if (options.contentTypeDecoder !== undefined) {
				contentTypeDecoder = options.contentTypeDecoder;
				contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
			}
			if (options.contentTypeDecoders !== undefined) {
				for (const decoder of options.contentTypeDecoders) {
					contentTypeDecoders.set(decoder.name, decoder);
				}
			}
		}
		if (contentTypeDecoder === undefined) {
			contentTypeDecoder = ApplicationJsonContentTypeDecoder;
			contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
		}
		return { charset, contentDecoder, contentDecoders, contentTypeDecoder, contentTypeDecoders };
	}
}

export class MessageBuffer {

	private options: ResolvedMessageReaderOptions;
	private index: number;
	private buffer: Buffer;

	constructor(options?: BufferEncoding | MessageReaderOptions) {
		this.options = ResolvedMessageReaderOptions.fromOptions(options);
		this.index = 0;
		this.buffer = Buffer.allocUnsafe(DefaultSize);
	}

	public append(chunk: Buffer | String): void {
		var toAppend: Buffer = <Buffer>chunk;
		if (typeof (chunk) === 'string') {
			var str = <string>chunk;
			var bufferLen = Buffer.byteLength(str, this.options.charset);
			toAppend = Buffer.allocUnsafe(bufferLen);
			toAppend.write(str, 0, bufferLen, this.options.charset);
		}
		if (this.buffer.length - this.index >= toAppend.length) {
			toAppend.copy(this.buffer, this.index, 0, toAppend.length);
		} else {
			var newSize = (Math.ceil((this.index + toAppend.length) / DefaultSize) + 1) * DefaultSize;
			if (this.index === 0) {
				this.buffer = Buffer.allocUnsafe(newSize);
				toAppend.copy(this.buffer, 0, 0, toAppend.length);
			} else {
				this.buffer = Buffer.concat([this.buffer.slice(0, this.index), toAppend], newSize);
			}
		}
		this.index += toAppend.length;
	}

	public tryReadHeaders(): { [key: string]: string; } | undefined {
		let result: { [key: string]: string; } | undefined = undefined;
		let current = 0;
		while (current + 3 < this.index && (this.buffer[current] !== CR || this.buffer[current + 1] !== LF || this.buffer[current + 2] !== CR || this.buffer[current + 3] !== LF)) {
			current++;
		}
		// No header / body separator found (e.g CRLFCRLF)
		if (current + 3 >= this.index) {
			return result;
		}
		result = Object.create(null);
		let headers = this.buffer.toString('ascii', 0, current).split(CRLF);
		headers.forEach((header) => {
			let index: number = header.indexOf(':');
			if (index === -1) {
				throw new Error('Message header must separate key and value using :');
			}
			let key = header.substr(0, index);
			let value = header.substr(index + 1).trim();
			result![key] = value;
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

export class StreamMessageReader extends AbstractMessageReader implements MessageReader {

	private readable: NodeJS.ReadableStream;
	private options: ResolvedMessageReaderOptions;
	private callback!: DataCallback;

	private nextMessageLength: number;
	private messageToken: number;
	private buffer: MessageBuffer;
	private partialMessageTimer: NodeJS.Timer | undefined;
	private _partialMessageTimeout: number;

	public constructor(readable: NodeJS.ReadableStream, options?: BufferEncoding | MessageReaderOptions) {
		super();
		this.readable = readable;
		this.buffer = new MessageBuffer();
		this.options = ResolvedMessageReaderOptions.fromOptions(options);
		this._partialMessageTimeout = 10000;
		this.nextMessageLength = -1;
		this.messageToken = 0;
	}

	public set partialMessageTimeout(timeout: number) {
		this._partialMessageTimeout = timeout;
	}

	public get partialMessageTimeout(): number {
		return this._partialMessageTimeout;
	}

	public listen(callback: DataCallback): void {
		this.nextMessageLength = -1;
		this.messageToken = 0;
		this.partialMessageTimer = undefined;
		this.callback = callback;
		this.readable.on('data', (data: Buffer) => {
			this.onData(data);
		});
		this.readable.on('error', (error: any) => this.fireError(error));
		this.readable.on('close', () => this.fireClose());
	}

	private onData(data: Buffer | String): void {
		this.buffer.append(data);
		while (true) {
			if (this.nextMessageLength === -1) {
				const headers = this.buffer.tryReadHeaders();
				if (!headers) {
					return;
				}
				const contentLength = headers['Content-Length'];
				if (!contentLength) {
					throw new Error('Header must provide a Content-Length property.');
				}
				const length = parseInt(contentLength);
				if (isNaN(length)) {
					throw new Error('Content-Length value must be a number.');
				}
				this.nextMessageLength = length;
			}
			const body = this.buffer.tryReadBody(this.nextMessageLength);
			if (body === undefined) {
				/** We haven't received the full message yet. */
				this.setPartialMessageTimer();
				return;
			}
			this.clearPartialMessageTimer();
			this.nextMessageLength = -1;
			let p: Promise<Uint8Array>;
			if (this.options.contentDecoder !== undefined) {
				p = this.options.contentDecoder.decode(body);
			} else {
				p = Promise.resolve(body);
			}
			p.then((value) => {
				this.options.contentTypeDecoder.decode(value, this.options).then((msg: Message) => {
					this.callback(msg);
				}, (error) => {
					this.fireError(error);
				});
			}, (error) => {
				this.fireError(error);
			});
		}
	}

	private clearPartialMessageTimer(): void {
		if (this.partialMessageTimer) {
			clearTimeout(this.partialMessageTimer);
			this.partialMessageTimer = undefined;
		}
	}

	private setPartialMessageTimer(): void {
		this.clearPartialMessageTimer();
		if (this._partialMessageTimeout <= 0) {
			return;
		}
		this.partialMessageTimer = setTimeout((token, timeout) => {
			this.partialMessageTimer = undefined;
			if (token === this.messageToken) {
				this.firePartialMessage({ messageToken: token, waitingTime: timeout });
				this.setPartialMessageTimer();
			}
		}, this._partialMessageTimeout, this.messageToken, this._partialMessageTimeout);
	}
}

export class IPCMessageReader extends AbstractMessageReader implements MessageReader {

	private process: NodeJS.Process | ChildProcess;

	public constructor(process: NodeJS.Process | ChildProcess) {
		super();
		this.process = process;
		let eventEmitter: NodeJS.EventEmitter = this.process;
		eventEmitter.on('error', (error: any) => this.fireError(error));
		eventEmitter.on('close', () => this.fireClose());
	}

	public listen(callback: DataCallback): void {
		(this.process as NodeJS.EventEmitter).on('message', callback);
	}
}

export class SocketMessageReader extends StreamMessageReader {
	public constructor(socket: Socket, encoding: BufferEncoding = 'utf-8') {
		super(socket as NodeJS.ReadableStream, encoding);
	}
}
