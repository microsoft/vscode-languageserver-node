/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { ChildProcess } from 'child_process';
import { Socket } from 'net';

import { Semaphore } from './semaphore';
import { Message } from './messages';
import { Event, Emitter } from './events';
import * as Is from './is';
import { ContentEncoder, ContentTypeEncoder, ContentTypeEncoderOptions } from './encoding';

const ContentLength: string = 'Content-Length: ';
const CRLF = '\r\n';

export interface MessageWriter {
	readonly onError: Event<[Error, Message | undefined, number | undefined]>;
	readonly onClose: Event<void>;
	write(msg: Message): Promise<void>;
	dispose(): void;
}

export namespace MessageWriter {
	export function is(value: any): value is MessageWriter {
		let candidate: MessageWriter = value;
		return candidate && Is.func(candidate.dispose) && Is.func(candidate.onClose) &&
			Is.func(candidate.onError) && Is.func(candidate.write);
	}
}

export abstract class AbstractMessageWriter {

	private errorEmitter: Emitter<[Error, Message | undefined, number | undefined]>;
	private closeEmitter: Emitter<void>;

	constructor() {
		this.errorEmitter = new Emitter<[Error, Message, number]>();
		this.closeEmitter = new Emitter<void>();
	}

	public dispose(): void {
		this.errorEmitter.dispose();
		this.closeEmitter.dispose();
	}

	public get onError(): Event<[Error, Message | undefined, number | undefined]> {
		return this.errorEmitter.event;
	}

	protected fireError(error: any, message?: Message, count?: number): void {
		this.errorEmitter.fire([this.asError(error), message, count]);
	}

	public get onClose(): Event<void> {
		return this.closeEmitter.event;
	}

	protected fireClose(): void {
		this.closeEmitter.fire(undefined);
	}

	private asError(error: any): Error {
		if (error instanceof Error) {
			return error;
		} else {
			return new Error(`Writer received error. Reason: ${Is.string(error.message) ? error.message : 'unknown'}`);
		}
	}
}

export class IPCMessageWriter extends AbstractMessageWriter implements MessageWriter {

	private process: NodeJS.Process | ChildProcess;
	private errorCount: number;

	public constructor(process: NodeJS.Process | ChildProcess) {
		super();
		this.process = process;
		this.errorCount = 0;
		let eventEmitter: NodeJS.EventEmitter = this.process;
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
}

const ApplicationJsonContentTypeEncoder: ContentTypeEncoder = {
	name: 'application/json',
	encode: (msg: Message, options: ContentTypeEncoderOptions): Promise<Buffer> => {
		return Promise.resolve(Buffer.from(JSON.stringify(msg, undefined, 0), options.charset));
	}
};

export interface MessageWriterOptions {
	charset?: BufferEncoding;
	contentEncoder?: ContentEncoder;
	contentTypeEncoder?: ContentTypeEncoder;
}

interface ResolvedMessageWriterOptions {
	charset: BufferEncoding;
	contentEncoder?: ContentEncoder;
	contentTypeEncoder: ContentTypeEncoder;
}

namespace ResolvedMessageWriterOptions {
	export function fromOptions(options: BufferEncoding | MessageWriterOptions | undefined): ResolvedMessageWriterOptions {
		if (options === undefined || typeof options === 'string') {
			return { charset: options ?? 'utf8', contentTypeEncoder: ApplicationJsonContentTypeEncoder };
		} else {
			return { charset : options.charset ?? 'utf8', contentEncoder : options.contentEncoder, contentTypeEncoder : options.contentTypeEncoder ?? ApplicationJsonContentTypeEncoder };
		}
	}
}

export class WriteableStreamMessageWriter extends AbstractMessageWriter implements MessageWriter {

	private writable: NodeJS.WritableStream;
	private options: ResolvedMessageWriterOptions;
	private errorCount: number;
	private writeSemaphore: Semaphore<void>;

	public constructor(writable: NodeJS.WritableStream, options?: BufferEncoding | MessageWriterOptions) {
		super();
		this.writable = writable;
		this.options = ResolvedMessageWriterOptions.fromOptions(options);
		this.errorCount = 0;
		this.writeSemaphore = new Semaphore(1);
		this.writable.on('error', (error: any) => this.fireError(error));
		this.writable.on('close', () => this.fireClose());
	}

	public write(msg: Message): Promise<void> {
		const payload = this.options.contentTypeEncoder.encode(msg, this.options).then((buffer) => {
			if (this.options.contentEncoder !== undefined) {
				return this.options.contentEncoder.encode(buffer);
			} else {
				return buffer;
			}
		});
		return payload.then((buffer) => {
			const headers: string[] = [];
			headers.push(ContentLength, buffer.byteLength.toString(), CRLF);
			headers.push(CRLF);
			return this.doWrite(msg, headers, buffer);
		}, (error) => {
			this.fireError(error);
			throw error;
		});
	}

	private doWrite(msg: Message, headers: string[], data: Buffer): Promise<void>;
	private doWrite(msg: Message, headers: string[], data: string, charset: BufferEncoding): Promise<void>;
	private doWrite(msg: Message, headers: string[], data: Buffer | string, charset?: BufferEncoding): Promise<void> {
		return this.writeSemaphore.lock(() => {
			return new Promise((resolve, reject) => {
				this.writable.write(headers.join(''), 'ascii', (error) => {
					if (error) {
						reject(error);
						this.handleError(error, msg);
					} else {
						const callback = (error: any) => {
							if (error) {
								this.handleError(error, msg);
								reject(error);
							} else {
								this.errorCount = 0;
								resolve();
							}
						};
						if (typeof data === 'string') {
							this.writable.write(data, charset, callback);
						} else {
							this.writable.write(data, callback);
						}
					}
				});
			});
		});
	}

	private handleError(error: any, msg: Message): void {
		this.errorCount++;
		this.fireError(error, msg, this.errorCount);
	}
}

export class StreamMessageWriter extends WriteableStreamMessageWriter {
	public constructor(writable: NodeJS.WritableStream, options?: BufferEncoding | MessageWriterOptions) {
		super(writable, options);
	}
}

export class SocketMessageWriter extends WriteableStreamMessageWriter implements MessageWriter {

	private socket: Socket;

	public constructor(socket: Socket, options?: BufferEncoding | MessageWriterOptions) {
		super(socket, options);
		this.socket = socket;
	}

	public dispose(): void {
		super.dispose();
		this.socket.destroy();
	}
}