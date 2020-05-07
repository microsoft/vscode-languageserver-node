/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Message } from './messages';

export interface EncoderOptions {
	charset: BufferEncoding;
}

export interface FunctionEncoder {
	name: string;
	encode(msg: Message, options: EncoderOptions): Promise<Buffer>;
}

export interface StreamEncoder {
	name: string;
	create(): NodeJS.WritableStream;
}

export type Encoder = FunctionEncoder | StreamEncoder | FunctionEncoder & StreamEncoder;

export namespace Encoder {
	export function isFunction(value: Encoder | undefined | null): value is FunctionEncoder {
		const candidate: FunctionEncoder = value as any;
		return candidate && typeof candidate.encode === 'function';
	}
}

export interface DecoderOptions {
	charset: BufferEncoding;
}

export interface FunctionDecoder {
	name: string;
	decode(buffer: Buffer, options: DecoderOptions): Promise<Message>;
}

export interface StreamDecoder {
	name: string;
	create(): NodeJS.WritableStream;
}

export type Decoder = FunctionDecoder | StreamDecoder | FunctionEncoder & StreamDecoder;

export namespace Decoder {
	export function isFunction(value: Decoder | undefined | null): value is FunctionDecoder {
		const candidate: FunctionDecoder = value as any;
		return candidate && typeof candidate.decode === 'function';
	}
}

