/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';
import * as zlib from 'zlib';

import { Writable, Readable } from 'stream';
import { inherits } from 'util';

import { RequestMessage, isRequestMessage } from '../messages';
import { StreamMessageWriter } from '../messageWriter';
import { StreamMessageReader } from '../messageReader';
import { ContentEncoder, ContentDecoder, Encodings } from '../encoding';
import { Buffer } from 'buffer';
import { Message } from '../main';

function assertDefined<T>(value: T | undefined | null): asserts value is T {
	assert.ok(value !== undefined && value !== null);
}

interface TestWritable extends Writable {
	constructor: Function;
	readonly data: Buffer | undefined;
}

interface TestWritableConstructor {
	new (): TestWritable;
}

const TestWritable: TestWritableConstructor = function (): TestWritableConstructor {
	function TestWritable(this: any): void {
		Writable.call(this);
	}
	inherits(TestWritable, Writable);
	TestWritable.prototype._write = function (this: any, chunk: string | Buffer, encoding: BufferEncoding, done: Function) {
		const toAdd: Buffer = (typeof chunk === 'string')
			? Buffer.from(chunk, encoding)
			: chunk;
		if (this.data === undefined) {
			this.data = toAdd;
		} else {
			this.data = Buffer.concat([this.data as Buffer, toAdd]);
		}
		done();
	};
	return (<any>TestWritable) as TestWritableConstructor;
} ();

const gzipEncoder: ContentEncoder = {
	name: 'gzip',
	encode: async (input) => {
		return new Promise((resolve, reject) => {
			zlib.gzip(input, (error, buffer) => {
				if (error) {
					reject(error);
				} else {
					resolve(buffer);
				}
			});
		});
	}
};

const gzipDecoder: ContentDecoder = {
	name: 'gzip',
	decode: async (buffer) => {
		return new Promise((resolve, reject) => {
			zlib.gunzip(buffer, (error, value) => {
				if (error) {
					reject(error);
				} else {
					resolve(value);
				}
			});
		});
	}
};


suite('Messages', () => {
	test('Writing', async () => {
		const writable = new TestWritable();
		const writer = new StreamMessageWriter(writable, 'ascii');

		const request: RequestMessage = {
			jsonrpc: '2.0',
			id: 1,
			method: 'example'
		};
		await writer.write(request);
		writable.end();
		assertDefined(writable.data);
		assert.ok(writable.data.equals(Buffer.from('Content-Length: 43\r\n\r\n{"jsonrpc":"2.0","id":1,"method":"example"}', 'ascii')));
	});

	test('Reading', (done) => {
		const readable = new Readable();
		new StreamMessageReader(readable).listen((msg: Message) => {
			const message: RequestMessage = msg as RequestMessage;
			assert.equal(message.id, 1);
			assert.equal(message.method, 'example');
			done();
		});
		readable.push('Content-Length: 43\r\n\r\n{"jsonrpc":"2.0","id":1,"method":"example"}');
		readable.push(null);
	});

	test('Read partial', (done) => {
		const readable = new Readable();
		const reader = new StreamMessageReader(readable);
		reader.partialMessageTimeout = 100;
		const partOne = 'Content-Length: 43\r\n\r\n';
		const partTwo = '{"jsonrpc":"2.0","id":1,"method":"example"}';
		reader.listen((msg: Message) => {
			const message: RequestMessage = msg as RequestMessage;
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

	test('Basic Zip / Unzip', async () => {
		const msg: RequestMessage = { jsonrpc: '2.0', id: 1, method: 'example' };
		const zipped = await gzipEncoder.encode(Buffer.from(JSON.stringify(msg), 'utf8'));
		assert.strictEqual(zipped.toString('base64'), 'H4sIAAAAAAAAA6tWyirOzysqSFayUjLSM1DSUcpMUbIy1FHKTS3JyAcylVIrEnMLclKVagH7JiWtKwAAAA==');
		const unzipped: RequestMessage = JSON.parse((await gzipDecoder.decode(zipped)).toString('utf8')) as RequestMessage;
		assert.strictEqual(unzipped.id, 1);
		assert.strictEqual(unzipped.method, 'example');
	});

	test('Encode', (done) => {
		const writable = new TestWritable();
		const writer = new StreamMessageWriter(writable, {
			charset: 'utf8',
			contentEncoder: gzipEncoder,
		});

		const request: RequestMessage = {
			jsonrpc: '2.0',
			id: 1,
			method: 'example'
		};
		writer.write(request).then(() => {
			writable.end();
			assertDefined(writable.data);


			const readable = new Readable();
			const reader = new StreamMessageReader(readable, {
				charset: 'utf8',
				contentDecoder: gzipDecoder
			});

			reader.listen((message) => {
				if (!isRequestMessage(message)) {
					throw new Error(`No request message`);
				}
				assert.equal(message.id, 1);
				assert.equal(message.method, 'example');
				done();
			});
			readable.push(writable.data);
			readable.push(null);
		});
	});

	test('Decode', (done) => {
		const readable = new Readable();
		const reader = new StreamMessageReader(readable, {
			charset: 'utf8',
			contentDecoder: gzipDecoder
		});
		reader.listen((message: Message) => {
			if (!isRequestMessage(message)) {
				throw new Error(`No request message`);
			}
			assert.equal(message.id, 1);
			assert.equal(message.method, 'example');
			done();
		});
		const payload = Buffer.concat([
			Buffer.from('Content-Encoding: gzip\r\nContent-Length: 61\r\n\r\n', 'ascii'),
			zlib.gzipSync(Buffer.from('{"jsonrpc":"2.0","id":1,"method":"example"}', 'utf8'))
		]);
		readable.push(payload);
		readable.push(null);
	});

	test('Generate Accept Encoding', () => {
		assert.deepStrictEqual(
			Encodings.getEncodingHeaderValue([ { name: 'gzip'} ]),
			'gzip'
		);
		assert.deepStrictEqual(
			Encodings.getEncodingHeaderValue([ { name: 'gzip'}, {name: 'compress' } ]),
			'gzip;q=1, compress;q=0'
		);
		assert.deepStrictEqual(
			Encodings.getEncodingHeaderValue([ { name: 'gzip'}, {name: 'compress' }, { name: 'deflate'} ]),
			'gzip;q=1, compress;q=0.5, deflate;q=0'
		);
		assert.deepStrictEqual(
			Encodings.getEncodingHeaderValue([ { name: 'gzip'}, {name: 'compress' }, { name: 'deflate'}, { name: 'br'} ]),
			'gzip;q=1, compress;q=0.7, deflate;q=0.4, br;q=0.1'
		);
	});
});