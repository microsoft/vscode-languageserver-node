/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { ChildProcess } from 'child_process';
import { Socket } from 'net';

import { Semaphore } from './semaphore';
import { Message, isRequestMessage } from './messages';
import { Event, Emitter } from './events';
import * as Is from './is';
import { TransferContext } from './transferContext';

let ContentLength: string = 'Content-Length: ';
let CRLF = '\r\n';

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

export interface EncoderOptions {
	charset: BufferEncoding;
}

export interface EncoderHeaders {
	requestHeaders: Map<string, string>;
	responseHeaders: Map<string, string>;
	notificationHeaders: Map<string, string>;
}

export interface FunctionEncoder extends EncoderHeaders {
	encode(msg: Message, options: EncoderOptions): Promise<Buffer>;
}

export interface StreamEncoder extends EncoderHeaders {
	create(): NodeJS.WritableStream;
}

export type Encoder = FunctionEncoder | StreamEncoder | FunctionEncoder & StreamEncoder;

namespace Encoder {
	export function isFunction(value: Encoder): value is EncoderHeaders & FunctionEncoder{
		const candidate: FunctionEncoder = value as any;
		return candidate && typeof candidate.encode === 'function';
	}
}

export interface MessageWriterOptions {
	charset?: BufferEncoding;
	context?: TransferContext;
	encoders?: Map<string, Encoder>;
}

interface ResolvedMessageWriterOptions extends MessageWriterOptions {
	charset: BufferEncoding;
	supportedEncodings: Set<string>;
}

namespace MessageWriterOptions {
	export function asResolvedOptions(options: BufferEncoding | MessageWriterOptions | undefined): ResolvedMessageWriterOptions {
		const encodings: Set<string> = new Set(['gzip', 'compress', 'deflate']);
		if (options === undefined) {
			return { charset: 'utf8', supportedEncodings: encodings };
		} else if (typeof options === 'string') {
			return { charset: options, supportedEncodings: encodings };
		} else {
			if (options.encoders !== undefined) {
				for (const key of options.encoders.keys()) {
					encodings.add(key);
				}
			}
			return Object.assign({ charset: 'utf8', supportedEncodings: encodings }, options);
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
		this.options = MessageWriterOptions.asResolvedOptions(options);
		this.errorCount = 0;
		this.writeSemaphore = new Semaphore(1);
		this.writable.on('error', (error: any) => this.fireError(error));
		this.writable.on('close', () => this.fireClose());
	}

	public write(msg: Message): Promise<void> {
		const encoding: string | undefined = this.options.context?.getEncoding(msg, this.options.supportedEncodings);
		const encoder: Encoder | undefined = encoding !== undefined ? this.options.encoders?.get(encoding) : undefined;
		if (encoder && Encoder.isFunction(encoder)) {
			const headers: string[] = [];
			const encoderHeaders = encoder.requestHeaders;
			for (const entry of encoderHeaders.entries()) {
				headers.push(entry[0], ':', entry[1], CRLF);
			}
			return encoder.encode(msg, { charset: this.options.charset }).then((buffer) => {
				headers.push(ContentLength, buffer.byteLength.toString(), CRLF, CRLF);
				return this.doWrite(msg, headers, buffer);
			});
		} else {
			const json = JSON.stringify(msg);
			const contentLength = Buffer.byteLength(json, this.options.charset);
			const headers: string[] = [
				ContentLength, contentLength.toString(), CRLF,
				CRLF
			];
			return this.doWrite(msg, headers, json, this.options.charset);
		}
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

	private getEncoder(msg: Message): { headers: string[], encoder: FunctionEncoder } | undefined {
		const encoding = this.options.context?.getEncoding(msg, this.options.supportedEncodings);
		if (encoding === undefined) {
			return undefined;
		}
		if (isRequestMessage(msg))
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