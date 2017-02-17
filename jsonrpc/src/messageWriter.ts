/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { ChildProcess } from 'child_process';
import { Socket } from 'net';

import { Message } from './messages';
import { Event, Emitter } from './events';
import * as is from './is';

let ContentLength: string = 'Content-Length: ';
let CRLF = '\r\n';

export interface MessageWriter {
	readonly onError: Event<[Error, Message | undefined, number | undefined]>;
	readonly onClose: Event<void>;
	write(msg: Message): void;
}

export abstract class AbstractMessageWriter {

	private errorEmitter: Emitter<[Error, Message | undefined, number | undefined]>;
	private closeEmitter: Emitter<void>;

	constructor() {
		this.errorEmitter = new Emitter<[Error, Message, number]>();
		this.closeEmitter = new Emitter<void>();
	}

	public get onError(): Event<[Error, Message, number]> {
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
			return new Error(`Writer recevied error. Reason: ${is.string(error.message) ? error.message : 'unknown'}`);
		}
	}
}

export class StreamMessageWriter extends AbstractMessageWriter implements MessageWriter {

	private writable: NodeJS.WritableStream;
	private encoding: string;
	private errorCount: number;

	public constructor(writable: NodeJS.WritableStream, encoding: string = 'utf8') {
		super();
		this.writable = writable;
		this.encoding = encoding;
		this.errorCount = 0;
		this.writable.on('error', (error: any) => this.fireError(error));
		this.writable.on('close', () => this.fireClose());
	}

	public write(msg: Message): void {
		let json = JSON.stringify(msg);
		let contentLength = Buffer.byteLength(json, this.encoding);

		let headers: string[] = [
			ContentLength, contentLength.toString(), CRLF,
			CRLF
		];
		try {
			// Header must be written in ASCII encoding
			this.writable.write(headers.join(''), 'ascii');
			// Now write the content. This can be written in any encoding
			this.writable.write(json, this.encoding);
			this.errorCount = 0;
		} catch (error) {
			this.errorCount++;
			this.fireError(error, msg, this.errorCount);
		}
	}
}

export class IPCMessageWriter extends AbstractMessageWriter implements MessageWriter {

	private process: NodeJS.Process | ChildProcess;
	private queue: Message[];
	private sending: boolean;
	private errorCount: number;

	public constructor(process: NodeJS.Process | ChildProcess) {
		super();
		this.process = process;
		this.errorCount = 0;
		this.queue = [];
		this.sending = false;
		let eventEmitter: NodeJS.EventEmitter = this.process;
		eventEmitter.on('error', (error: any) => this.fireError(error));
		eventEmitter.on('close', () => this.fireClose);
	}

	public write(msg: Message): void {
		if (!this.sending && this.queue.length === 0) {
			// See https://github.com/nodejs/node/issues/7657
			this.doWriteMessage(msg);
		} else {
			this.queue.push(msg);
		}
	}

	public doWriteMessage(msg: Message): void {
		try {
			if (this.process.send) {
				this.sending = true;
				(this.process.send as Function)(msg, undefined, undefined, (error: any) => {
					this.sending = false;
					if (error) {
						this.errorCount++;
						this.fireError(error, msg, this.errorCount);
					} else {
						this.errorCount = 0;
					}
					if (this.queue.length > 0) {
						this.doWriteMessage(this.queue.shift()!);
					}
				});
			}
		} catch (error) {
			this.errorCount++;
			this.fireError(error, msg, this.errorCount);
		}

	}
 }

 export class SocketMessageWriter extends AbstractMessageWriter implements MessageWriter {

	private socket: Socket;
	private queue: Message[];
	private sending: boolean;
	private encoding: string;
	private errorCount: number;

	public constructor(socket: Socket, encoding: string = 'utf8') {
		super();
		this.socket = socket;
		this.queue = [];
		this.sending = false;
		this.encoding = encoding;
		this.errorCount = 0;
		this.socket.on('error', (error: any) => this.fireError(error));
		this.socket.on('close', () => this.fireClose());
	}

	public write(msg: Message): void {
		if (!this.sending && this.queue.length === 0) {
			// See https://github.com/nodejs/node/issues/7657
			this.doWriteMessage(msg);
		} else {
			this.queue.push(msg);
		}
	}

	public doWriteMessage(msg: Message): void {
		let json = JSON.stringify(msg);
		let contentLength = Buffer.byteLength(json, this.encoding);

		let headers: string[] = [
			ContentLength, contentLength.toString(), CRLF,
			CRLF
		];
		try {
			// Header must be written in ASCII encoding
			this.sending = true;
			this.socket.write(headers.join(''), 'ascii', (error: any) => {
				if (error) {
					this.handleError(error, msg);
				}
				try {
					// Now write the content. This can be written in any encoding
					this.socket.write(json, this.encoding, (error: any) => {
						this.sending = false;
						if (error) {
							this.handleError(error, msg);
						} else {
							this.errorCount = 0;
						}
						if (this.queue.length > 0) {
							this.doWriteMessage(this.queue.shift()!);
						}
					});
				} catch (error) {
					this.handleError(error, msg);
				}
			});
		} catch (error) {
			this.handleError(error, msg);
		}
	}

	private handleError(error: any, msg: Message): void {
		this.errorCount++;
		this.fireError(error, msg, this.errorCount);
	}
}
