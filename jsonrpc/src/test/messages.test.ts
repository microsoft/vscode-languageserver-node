/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';

import { Writable, Readable } from 'stream';
import { inherits } from 'util';

import { RequestMessage } from '../messages';
import { StreamMessageWriter } from '../messageWriter';
import { StreamMessageReader } from '../messageReader';

interface TestWritable extends Writable {
	constructor: Function;
	readonly data: string;
}

interface TestWritableConstructor {
	new (): TestWritable;
}

let TestWritable: TestWritableConstructor = function (): TestWritableConstructor {
	function TestWritable(this: any): void {
		Writable.call(this);
		this.data = '';
	}
	inherits(TestWritable, Writable);
	TestWritable.prototype._write = function (this: any, chunk: string | Buffer, _encoding: string, done: Function) {
		this.data += chunk.toString();
		done();
	}
	return (<any>TestWritable) as TestWritableConstructor;
} ();

describe('Messages', () => {
	let data: string = 'Content-Length: 43\r\n\r\n{"jsonrpc":"2.0","id":1,"method":"example"}';
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
		new StreamMessageReader(readable).listen((message: RequestMessage) => {
			assert.equal(message.id, 1);
			assert.equal(message.method, 'example');
			done();
		});
		readable.push(data);
		readable.push(null);
	});
	it('Read partial', (done) => {
		let readable = new Readable();
		let reader = new StreamMessageReader(readable);
		reader.partialMessageTimeout = 100;
		let partOne = 'Content-Length: 43\r\n\r\n';
		let partTwo = '{"jsonrpc":"2.0","id":1,"method":"example"}';
		reader.listen((message: RequestMessage) => {
			assert.equal(message.id, 1);
			assert.equal(message.method, 'example');
			setTimeout(() => {
				done();
			}, 200)
		});
		reader.onPartialMessage((_info) => {
			setTimeout(() => {
				readable.push(partTwo);
				readable.push(null);
			}, 20);
		});
		readable.push(partOne);
	});
	it('Emits errors for invalid headers', (done) => {
		let invalidHeader = 'Invalid-Header = 1\r\n\r\ntest';
		let readable = new Readable({
			read() {
				this.push(invalidHeader);
				this.push(null);
			},
		});
		let reader = new StreamMessageReader(readable);
		reader.listen(() => {
			done(Error('Should not receive any data on error.'));
		});
		reader.onError(err => {
			assert.equal(err.message, 'Message header must separate key and value using :');
			done();
		});
	});
	it('Emits errors for invalid Content-Length', (done) => {
		let invalidHeader = 'Content-Length: abc\r\n\r\n';
		let validHeader = 'Content-Length: 2\r\n\r\n{}'
		let readable = new Readable({
			read() {
				this.push(invalidHeader);
				this.push(validHeader);
				this.push(null);
			},
		});
		let reader = new StreamMessageReader(readable);
		reader.listen(() => {
			done(Error('Should have stopped reading data after error.'));
		});
		reader.onError(err => {
			assert.equal(err.message, 'Content-Length value must be a number.');
			done();
		});
	});
});