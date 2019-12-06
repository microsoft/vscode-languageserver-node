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
	};
	return (<any>TestWritable) as TestWritableConstructor;
} ();

suite('Messages', () => {
	let data: string = 'Content-Length: 43\r\n\r\n{"jsonrpc":"2.0","id":1,"method":"example"}';
	test('Writing', () => {
		let writable = new TestWritable();
		let writer = new StreamMessageWriter(writable, 'ascii');

		let request: RequestMessage = {
			jsonrpc: '2.0',
			id: 1,
			method: 'example'
		};
		writer.write(request);
		writable.end();
		assert.equal(writable.data, data);
	});
	test('Reading', (done) => {
		let readable = new Readable();
		new StreamMessageReader(readable).listen((message: RequestMessage) => {
			assert.equal(message.id, 1);
			assert.equal(message.method, 'example');
			done();
		});
		readable.push(data);
		readable.push(null);
	});
	test('Read partial', (done) => {
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
			}, 200);
		});
		reader.onPartialMessage((_info) => {
			setTimeout(() => {
				readable.push(partTwo);
				readable.push(null);
			}, 20);
		});
		readable.push(partOne);
	});
});