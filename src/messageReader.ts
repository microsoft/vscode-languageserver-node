/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { Message } from './messages';

let DefaultSize: number = 8192;
let CR:number = new Buffer('\r', 'ascii')[0];
let LF:number = new Buffer('\n', 'ascii')[0];
let CRLF: string = '\r\n';

class MessageBuffer {

	private encoding: string;
	private index: number;
	private buffer: Buffer;

	constructor(encoding: string = 'utf-8') {
		this.encoding = encoding;
		this.index = 0;
		this.buffer = new Buffer(DefaultSize);
	}

	public append(chunk: Buffer | String):void {
		var toAppend: Buffer = <Buffer> chunk;
		if (typeof(chunk) == 'string') {
			var str = <string> chunk;
			toAppend = new Buffer(str.length);
			toAppend.write(str, 0, str.length, this.encoding);
		}
		if (this.buffer.length - this.index >= toAppend.length) {
			toAppend.copy(this.buffer, this.index, 0, toAppend.length);
		} else {
			var newSize = (Math.ceil((this.index + toAppend.length) / DefaultSize) + 1) * DefaultSize;
			if (this.index === 0) {
				this.buffer = new Buffer(newSize);
				toAppend.copy(this.buffer, 0, 0, toAppend.length);
			} else {
				this.buffer = Buffer.concat([this.buffer.slice(0, this.index), toAppend], newSize);
			}
		}
		this.index+= toAppend.length;
	}

	public tryReadHeaders(): { [key: string]: string; } {
		let result: { [key: string]: string; } = undefined;
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
			result[key] = value;
		})

		let nextStart = current + 4;
		this.buffer = this.buffer.slice(nextStart);
		this.index = this.index - nextStart;
		return result;
	}

	public tryReadContent(length: number): string {
		if (this.index < length) {
			return null;
		}
		let result = this.buffer.toString(this.encoding, 0, length);
		let nextStart = length;
		this.buffer.copy(this.buffer, 0, nextStart);
		this.index = this.index - nextStart;
		return result;
	}

	public get numberOfBytes():number {
		return this.index;
	}
}

export interface ICallback {
	(data: Message): void;
}

export class MessageReader {

	private readable: NodeJS.ReadableStream;
	private callback: ICallback;
	private buffer: MessageBuffer;
	private nextMessageLength: number;

	public constructor(readable: NodeJS.ReadableStream, callback: ICallback, encoding: string = 'utf-8') {
		this.readable = readable;
		this.buffer = new MessageBuffer(encoding);
		this.callback = callback;
		this.nextMessageLength = -1;
		this.readable.on('readable', () => {
			var chunk = this.readable.read();
			while (chunk !== null) {
				this.onData(chunk);
				chunk = this.readable.read();
			}		
		});
	}

	private onData(data:Buffer|String): void {
		this.buffer.append(data);
		while(true) {
			if (this.nextMessageLength === -1) {
				let headers = this.buffer.tryReadHeaders();
				if (!headers) {
					return;
				}
				let contentLength = headers['Content-Length'];
				if (!contentLength) {
					throw new Error('Header must provide a Content-Length property.');
				}
				let length = parseInt(contentLength);
				if (isNaN(length)) {
					throw new Error('Content-Length value must be a number.');
				}
				this.nextMessageLength = length;
			}
			var msg = this.buffer.tryReadContent(this.nextMessageLength);
			if (msg === null) {
				return;
			}
			this.nextMessageLength = -1;
			var json = JSON.parse(msg);
			this.callback(json);
		}
	}
}