/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { ChildProcess } from 'child_process';

import { Message } from './messages';
import { Event, Emitter } from './events';
import * as is from './is';

let ContentLength:string = 'Content-Length: ';
let CRLF = '\r\n';

export interface MessageWriter {
	onError: Event<[Error, Message]>;
	onClose: Event<void>;
	write(msg: Message): void;
}

export abstract class AbstractMessageWriter {

	private errorEmitter: Emitter<[Error, Message]>;
	private closeEmitter: Emitter<void>;

	constructor() {
		this.errorEmitter = new Emitter<[Error, Message]>();
		this.closeEmitter = new Emitter<void>();
	}

	public get onError(): Event<[Error, Message]> {
		return this.errorEmitter.event;
	}

	protected fireError(error: any, message?: Message): void {
		this.errorEmitter.fire([this.asError(error), message]);
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

	public constructor(writable: NodeJS.WritableStream, encoding: string = 'utf8') {
		super();
		this.writable = writable;
		this.encoding = encoding;
		this.writable.on('error', (error) => this.fireError(error));
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
		} catch (error) {
			this.fireError(error, msg);
		}
	}
}

export class IPCMessageWriter extends AbstractMessageWriter implements MessageWriter {

	private process: NodeJS.Process | ChildProcess;

	public constructor(process: NodeJS.Process | ChildProcess) {
		super();
		this.process = process;
		this.process.on('error', (error) => this.fireError(error));
		this.process.on('close', () => this.fireClose);
	}

	public write(msg: Message): void {
		try {
			this.process.send(msg);
		} catch (error) {
			this.fireError(error, msg);
		}
	}
}