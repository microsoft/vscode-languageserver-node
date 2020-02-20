/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { ChildProcess } from 'child_process';
import { Socket } from 'net';

import { Semaphore } from './semaphore';
import { Message, isRequestMessage, isResponseMessage, isNotificationMessage } from './messages';
import { Event, Emitter } from './events';
import * as Is from './is';
import { TransferContext } from './transferContext';
import { Encoder, Decoder, FunctionEncoder } from './encoding';

const ContentLength: string = 'Content-Length: ';
const ContentEncoding: string = 'Content-Encoding: ';
const AccepttEncoding: string = 'Accept-Encoding: ';
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

export interface MessageWriterOptions {
	charset?: BufferEncoding;
	context: TransferContext;
	encoders: Encoder[];
	decoders: Decoder[];
}

interface CharsetOptions {
	charset: BufferEncoding;
}

namespace MessageWriterOptions {
	export function asResolvedOptions(options: BufferEncoding | MessageWriterOptions | undefined): ResolvedMessageWriterOptions {
		if (options === undefined || typeof options === 'string') {
			return { charset: options ?? 'utf8' };
		} else {
			const charset: BufferEncoding = options.charset ?? 'utf8';
			const encoderMap: Map<string, Encoder> = new Map();
			for (const encoder of options.encoders) {
				encoderMap.set(encoder.name, encoder);
			}
			const decoderMap: Map<string, Decoder> = new Map();
			for (const decoder of options.decoders) {
				decoderMap.set(decoder.name, decoder);
			}
			return { charset, context: options.context, encoders: options.encoders, encoderMap, decoders: options.decoders, decoderMap };
		}
	}
}

interface ContextOptions {
	charset: BufferEncoding;
	context: TransferContext;
	encoders: Encoder[];
	encoderMap: Map<string, Encoder>;
	decoders: Decoder[];
	decoderMap: Map<string, Decoder>;
}

type ResolvedMessageWriterOptions = CharsetOptions | ContextOptions;

namespace ResolvedMessageWriterOptions {
	export function isContext(value: ResolvedMessageWriterOptions): value is ContextOptions {
		const candidate: ContextOptions = value as ContextOptions;
		return candidate && candidate.context !== undefined;
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
		const encodingInfo = this.getEncoder(msg);
		if (encodingInfo !== undefined && encodingInfo.encoder) {
			const { headers, encoder } = encodingInfo;
			return encoder.encode(msg, { charset: this.options.charset }).then((buffer) => {
				headers.push(ContentLength, buffer.byteLength.toString(), CRLF);
				headers.push(CRLF);
				return this.doWrite(msg, headers, buffer);
			});
		} else {
			const json = JSON.stringify(msg);
			const contentLength = Buffer.byteLength(json, this.options.charset);
			const headers: string[] = encodingInfo !== undefined ? encodingInfo.headers : [];
			headers.push(
				ContentLength, contentLength.toString(), CRLF,
				CRLF
			);
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

	private getEncoder(msg: Message): { headers: string[], encoder?: FunctionEncoder } | undefined {
		const options = this.options;
		if (!ResolvedMessageWriterOptions.isContext(options)) {
			return undefined;
		}

		if (isNotificationMessage(msg)) {
			const encoding = options.context.getNotificationContentEncoding(options.encoderMap);
			if (encoding === undefined) {
				return undefined;
			}
			const encoder = options.encoderMap.get(encoding);
			if (encoder === undefined || !Encoder.isFunction(encoder)) {
				return undefined;
			}
			return {
				headers: [
					ContentEncoding, encoder.name, CRLF
				],
				encoder: encoder
			};
		} else if (isRequestMessage(msg)) {
			const encoding = options.context.getRequestContentEncoding(options.encoderMap);
			if (encoding === undefined) {
				return undefined;
			}
			const encoder = options.encoderMap.get(encoding);
			const responseEncodings = options.context.getResponseAcceptEncodings(options.decoderMap);
			const headers: string[] = [];
			if (responseEncodings !== undefined) {
				headers.push(AccepttEncoding, responseEncodings.join(', '), CRLF);
			}
			if (encoder !== undefined && Encoder.isFunction(encoder)) {
				headers.push(ContentEncoding, encoder.name, CRLF);
			}
			if (headers.length === 0) {
				return undefined;
			} else {
				return { headers, encoder: Encoder.isFunction(encoder) ? encoder : undefined };
			}
		} else if (isResponseMessage(msg)) {
			const encoding = options.context.getResponseContentEncoding(msg.id, options.encoderMap);
			if (encoding === undefined) {
				return undefined;
			}
			const encoder = options.encoderMap.get(encoding);
			if (encoder === undefined || !Encoder.isFunction(encoder)) {
				return undefined;
			}
			return {
				headers: [
					ContentEncoding, encoder.name, CRLF
				],
				encoder: encoder
			};
		} else {
			return undefined;
		}
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