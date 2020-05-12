/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { InputType } from 'zlib';
import { Message } from './messages';

export interface FunctionContentEncoder {
	name: string;
	encode(input: InputType): Promise<Buffer>;
}

export interface StreamContentEncoder {
	name: string;
	create(): NodeJS.WritableStream;
}

export type ContentEncoder = FunctionContentEncoder | (FunctionContentEncoder & StreamContentEncoder);

export interface FunctionContentDecoder {
	name: string;
	decode(buffer: Buffer): Promise<Buffer>;
}

export interface StreamContentDecoder {
	name: string;
	create(): NodeJS.WritableStream;
}

export type ContentDecoder = FunctionContentDecoder | (FunctionContentDecoder & StreamContentDecoder);

export interface ContentTypeEncoderOptions {
	charset: BufferEncoding;
}

export interface FunctionContentTypeEncoder {
	name: string;
	encode(msg: Message, options: ContentTypeEncoderOptions): Promise<Buffer>;
}

export interface StreamContentTypeEncoder {
	name: string;
	create(options: ContentTypeEncoderOptions): NodeJS.WritableStream;
}

export type ContentTypeEncoder = FunctionContentTypeEncoder | (FunctionContentTypeEncoder & StreamContentTypeEncoder);

export interface ContentTypeDecoderOptions {
	charset: BufferEncoding;
}

export interface FunctionContentTypeDecoder {
	name: string;
	decode(buffer: Buffer, options: ContentTypeDecoderOptions): Promise<Message>
}

export interface StreamContentTypeDecoder {
	name: string;
	create(options: ContentTypeDecoderOptions): NodeJS.WritableStream;
}

export type ContentTypeDecoder = FunctionContentTypeDecoder | (FunctionContentTypeDecoder & StreamContentTypeDecoder);