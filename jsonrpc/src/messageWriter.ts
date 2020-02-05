/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { ChildProcess } from 'child_process';
import { Socket } from 'net';

import { Message } from './messages';
import { Event, Emitter } from './events';
import * as Is from './is';
import { TransferContext } from './transferContext';
import { resolve } from 'dns';
import { rejects } from 'assert';

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

export interface WritableStrategy {
	write(msg: Message): Promise<void>;
}

export type Encoder = {
	headers: string[];
	encode: (msg: Message) => Promise<Buffer>;
} | {
	headers: string[];
	stream: NodeJS.WritableStream;
} | {
	headers: string[];
	encode: (msg: Message) => Promise<Buffer>;
	stream: NodeJS.WritableStream;
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

interface Resolve {
	(): void;
}

interface Reject {
	(reason: any): void;
}

export class WriteableStreamMessageWriter extends AbstractMessageWriter implements MessageWriter {

	private writable: NodeJS.WritableStream;
	private options: ResolvedMessageWriterOptions;
	private errorCount: number;
	private queue: { msg: Message, resolve: Resolve, reject: Reject }[];
	private writing: boolean;

	public constructor(writable: NodeJS.WritableStream, options?: BufferEncoding | MessageWriterOptions) {
		super();
		this.writable = writable;
		this.options = MessageWriterOptions.asResolvedOptions(options);
		this.errorCount = 0;
		this.queue = [];
		this.writing = false;
		this.writable.on('error', (error: any) => this.fireError(error));
		this.writable.on('close', () => this.fireClose());
	}

	public write(msg: Message): Promise<void> {
		if (!this.writing && this.queue.length === 0) {
			return new Promise((resolve, reject) => {
				this.doWrite(msg, resolve, reject);
			});
		} else {
			return new Promise((resolve, reject) => {
				this.queue.push({ msg, resolve, reject });
			});
		}
	}

	private doWrite(msg: Message, resolve: Resolve, reject: Reject): void {
		const encoding: string | undefined = this.options.context?.getEncoding(msg, this.options.supportedEncodings);
		// No encoding specified
		if (encoding === undefined) {
			const json = JSON.stringify(msg);
			const contentLength = Buffer.byteLength(json, this.options.charset);
			const headers: string[] = [
				ContentLength, contentLength.toString(), CRLF,
				CRLF
			];
			try {
				this.writable.write(headers.join(''), 'ascii', (error) => {
					if (error) {
						this.handleError(error, msg);
						reject(error);
						return;
					}
					// Now write the content. This can be written in any encoding
					this.writable.write(json, this.options.charset, (error) => {
						if (error) {
							this.handleError(error, msg);
							reject(error);
							return;
						}
						this.errorCount = 0;
						resolve();
					});
				});
			} catch (error) {
				reject(error);
				return;
			}
		}
	}

	private handleError(error: any, msg: Message): void {
		this.errorCount++;
		this.fireError(error, msg, this.errorCount);
	}

}

export class StreamMessageWriter extends WriteableStreamMessageWriter {
	public constructor(writable: NodeJS.WritableStream, charset: BufferEncoding = 'utf8') {
		super(writable, charset);
	}
}

export class SocketMessageWriter extends WriteableStreamMessageWriter implements MessageWriter {

	private socket: Socket;

	public constructor(socket: Socket, encoding: BufferEncoding = 'utf8') {
		super(socket, encoding);
		this.socket = socket;
	}

	public dispose(): void {
		super.dispose();
		this.socket.destroy();
	}
}