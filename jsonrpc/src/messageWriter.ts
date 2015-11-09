/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Message } from './messages';

let ContentLength:string = 'Content-Length: ';
let CRLF = '\r\n';

export class MessageWriter {

	private writable: NodeJS.WritableStream;
	private encoding: string

	public constructor(writable: NodeJS.WritableStream, encoding: string = 'utf8') {
		this.writable = writable;
		this.encoding = encoding;
	}

	public write(msg: Message): void {
		let json = JSON.stringify(msg);
		let contentLength = Buffer.byteLength(json, this.encoding);

		let headers: string[] = [
			ContentLength, contentLength.toString(), CRLF,
			CRLF
		];
		// Header must be written in ASCII encoding
		this.writable.write(headers.join(''), 'ascii');

		// Now write the content. This can be written in any encoding
		this.writable.write(json, this.encoding);
	}
}