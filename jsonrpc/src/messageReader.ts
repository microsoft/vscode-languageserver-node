/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Socket } from 'net';
import { ChildProcess } from 'child_process';

import { Message } from './messages';
import { Event, Emitter } from './events';
import * as Is from './is';

let DefaultSize: number = 8192;
let CR: number = new Buffer('\r', 'ascii')[0];
let LF: number = new Buffer('\n', 'ascii')[0];
let CRLF: string = '\r\n';

class MessageBuffer {
    private encoding: string;
    private index: number;
    private buffer: Buffer;

    constructor(encoding: string = 'utf8') {
        this.encoding = encoding;
        this.index = 0;
        this.buffer = new Buffer(DefaultSize);
    }

    public append(chunk: Buffer | String): void {
        var toAppend: Buffer = <Buffer>chunk;
        if (typeof chunk === 'string') {
            var str = <string>chunk;
            var bufferLen = Buffer.byteLength(str, this.encoding);
            toAppend = new Buffer(bufferLen);
            toAppend.write(str, 0, bufferLen, this.encoding);
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
        this.index += toAppend.length;
    }

    public tryReadHeaders(): { [key: string]: string } | undefined {
        let result: { [key: string]: string } | undefined = undefined;
        let current = 0;
        while (
            current + 3 < this.index &&
            (this.buffer[current] !== CR ||
                this.buffer[current + 1] !== LF ||
                this.buffer[current + 2] !== CR ||
                this.buffer[current + 3] !== LF)
        ) {
            current++;
        }
        // No header / body separator found (e.g CRLFCRLF)
        if (current + 3 >= this.index) {
            return result;
        }
        result = Object.create(null);
        let headers = this.buffer.toString('ascii', 0, current).split(CRLF);
        headers.forEach(header => {
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

    public tryReadContent(length: number): string | null {
        if (this.index < length) {
            return null;
        }
        let result = this.buffer.toString(this.encoding, 0, length);
        let nextStart = length;
        this.buffer.copy(this.buffer, 0, nextStart);
        this.index = this.index - nextStart;
        return result;
    }

    public get numberOfBytes(): number {
        return this.index;
    }
}

export interface DataCallback {
    (data: Message): void;
}

export interface PartialMessageInfo {
    readonly messageToken: number;
    readonly waitingTime: number;
}

export interface MessageReader {
    readonly onError: Event<Error>;
    readonly onClose: Event<void>;
    readonly onPartialMessage: Event<PartialMessageInfo>;
    listen(callback: DataCallback): void;
    dispose(): void;
}

export namespace MessageReader {
    export function is(value: any): value is MessageReader {
        let candidate: MessageReader = value;
        return (
            candidate &&
            Is.func(candidate.listen) &&
            Is.func(candidate.dispose) &&
            Is.func(candidate.onError) &&
            Is.func(candidate.onClose) &&
            Is.func(candidate.onPartialMessage)
        );
    }
}

export abstract class AbstractMessageReader {
    private errorEmitter: Emitter<Error>;
    private closeEmitter: Emitter<void>;

    private partialMessageEmitter: Emitter<PartialMessageInfo>;

    constructor() {
        this.errorEmitter = new Emitter<Error>();
        this.closeEmitter = new Emitter<void>();
        this.partialMessageEmitter = new Emitter<PartialMessageInfo>();
    }

    public dispose(): void {
        this.errorEmitter.dispose();
        this.closeEmitter.dispose();
    }

    public get onError(): Event<Error> {
        return this.errorEmitter.event;
    }

    protected fireError(error: any): void {
        this.errorEmitter.fire(this.asError(error));
    }

    public get onClose(): Event<void> {
        return this.closeEmitter.event;
    }

    protected fireClose(): void {
        this.closeEmitter.fire(undefined);
    }

    public get onPartialMessage(): Event<PartialMessageInfo> {
        return this.partialMessageEmitter.event;
    }

    protected firePartialMessage(info: PartialMessageInfo): void {
        this.partialMessageEmitter.fire(info);
    }

    private asError(error: any): Error {
        if (error instanceof Error) {
            return error;
        } else {
            return new Error(`Reader recevied error. Reason: ${Is.string(error.message) ? error.message : 'unknown'}`);
        }
    }
}

export class StreamMessageReader extends AbstractMessageReader implements MessageReader {
    private readable: NodeJS.ReadableStream;
    private callback: DataCallback;
    private buffer: MessageBuffer;
    private nextMessageLength: number;
    private messageToken: number;
    private partialMessageTimer: NodeJS.Timer | undefined;
    private _partialMessageTimeout: number;

    public constructor(readable: NodeJS.ReadableStream, encoding: string = 'utf8') {
        super();
        this.readable = readable;
        this.buffer = new MessageBuffer(encoding);
        this._partialMessageTimeout = 10000;
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
                // Take the encoding form the header. For compatibility
                // treat both utf-8 and utf8 as node utf8
            }
            var msg = this.buffer.tryReadContent(this.nextMessageLength);
            if (msg === null) {
                /** We haven't recevied the full message yet. */
                this.setPartialMessageTimer();
                return;
            }
            this.clearPartialMessageTimer();
            this.nextMessageLength = -1;
            this.messageToken++;
            var json = JSON.parse(msg);
            this.callback(json);
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
        this.partialMessageTimer = setTimeout(
            (token, timeout) => {
                this.partialMessageTimer = undefined;
                if (token === this.messageToken) {
                    this.firePartialMessage({
                        messageToken: token,
                        waitingTime: timeout,
                    });
                    this.setPartialMessageTimer();
                }
            },
            this._partialMessageTimeout,
            this.messageToken,
            this._partialMessageTimeout
        );
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
    public constructor(socket: Socket, encoding: string = 'utf-8') {
        super(socket as NodeJS.ReadableStream, encoding);
    }
}
