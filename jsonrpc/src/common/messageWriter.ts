/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import RAL from './ral';
import * as Is from './is';
import { Semaphore } from './semaphore';
import { Message } from './messages';
import { Event, Emitter } from './events';
import { ContentEncoder, ContentTypeEncoder } from './encoding';

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

export interface MessageWriterOptions {
	charset?: RAL.MessageBufferEncoding;
	contentEncoder?: ContentEncoder;
	contentTypeEncoder?: ContentTypeEncoder;
}

interface ResolvedMessageWriterOptions {
	charset: RAL.MessageBufferEncoding;
	contentEncoder?: ContentEncoder;
	contentTypeEncoder: ContentTypeEncoder;
}

namespace ResolvedMessageWriterOptions {
	export function fromOptions(options: RAL.MessageBufferEncoding | MessageWriterOptions | undefined): ResolvedMessageWriterOptions {
		if (options === undefined || typeof options === 'string') {
			return { charset: options ?? 'utf-8', contentTypeEncoder: RAL().applicationJson.encoder };
		} else {
			return { charset : options.charset ?? 'utf-8', contentEncoder : options.contentEncoder, contentTypeEncoder : options.contentTypeEncoder ?? RAL().applicationJson.encoder };
		}
	}
}

export class WriteableStreamMessageWriter extends AbstractMessageWriter implements MessageWriter {

	private writable: RAL.WritableStream;
	private options: ResolvedMessageWriterOptions;
	private errorCount: number;
	private writeSemaphore: Semaphore<void>;

	public constructor(writable: RAL.WritableStream, options?: RAL.MessageBufferEncoding | MessageWriterOptions) {
		super();
		this.writable = writable;
		this.options = ResolvedMessageWriterOptions.fromOptions(options);
		this.errorCount = 0;
		this.writeSemaphore = new Semaphore(1);
		this.writable.onError((error: any) => this.fireError(error));
		this.writable.onClose(() => this.fireClose());
	}

	public async write(msg: Message): Promise<void> {
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

	private doWrite(msg: Message, headers: string[], data: Uint8Array): Promise<void> {
		return this.writeSemaphore.lock(async () => {
			try {
				await this.writable.write(headers.join(''), 'ascii');
				return this.writable.write(data);
			} catch (error) {
				this.handleError(error, msg);
			}
		});
	}

	private handleError(error: any, msg: Message): void {
		this.errorCount++;
		this.fireError(error, msg, this.errorCount);
	}
}