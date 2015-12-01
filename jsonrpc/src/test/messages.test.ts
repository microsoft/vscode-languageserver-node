/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';

import { Duplex, Writable, Readable } from 'stream';
import { inherits } from 'util';

import { Message, RequestMessage } from '../messages';
import { StreamMessageWriter } from '../messageWriter';
import { StreamMessageReader } from '../messageReader';

function TestWritable() {
	Writable.call(this);
	this.data = '';
}
inherits(TestWritable, Writable);
TestWritable.prototype._write = function (chunk, encoding, done) {
	this.data += chunk.toString();
	done();
}

describe('Messages', () => {
	let data: string = 'Content-Length: 43\r\n\r\n{"jsonrpc":"2.0","id":1,"method":"example"}'
	it('Writing', () => {
		let writable = new TestWritable();
		let writer = new StreamMessageWriter(writable, 'ascii');

		let request: RequestMessage = {
			jsonrpc: '2.0',
			id: 1,
			method: 'example'
		};
		writer.write(request);
		writable.end();
		assert.equal(writable.data, data)
	});
	it('Reading', (done) => {
		let readable = new Readable();
		let reader = new StreamMessageReader(readable).listen((message: RequestMessage) => {
			assert.equal(message.id, 1);
			assert.equal(message.method, 'example');
			done();
		});
		readable.push(data);
		readable.push(null);
	});
});