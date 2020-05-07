/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';
import * as zlib from 'zlib';

import { Writable, Readable } from 'stream';
import { inherits } from 'util';

import { RequestMessage } from '../messages';
import { StreamMessageWriter } from '../messageWriter';
import { StreamMessageReader, MessageBuffer } from '../messageReader';
import { TransferContext } from '../transferContext';
import { Encoder, Decoder } from '../encoding';
import { Buffer } from 'buffer';

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

const gzipEncoder: Encoder = {
	name: 'gzip',
	encode: async (msg, options) => {
		return new Promise((resolve, reject) => {
			zlib.gzip(Buffer.from(JSON.stringify(msg), options.charset), (error, buffer) => {
				if (error) {
					reject(error);
				} else {
					resolve(buffer);
				}
			});
		});
	}
};

const gzipDecoder: Decoder = {
	name: 'gzip',
	decode: async (buffer, options) => {
		return new Promise((resolve, reject) => {
			zlib.gunzip(buffer, (error, value) => {
				if (error) {
					reject(error);
				} else {
					resolve(JSON.parse(value.toString(options.charset)));
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
		new StreamMessageReader(readable).listen((message: RequestMessage) => {
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

	test('Basic Zip / Unzip', async () => {
		const msg: RequestMessage = { jsonrpc: '2.0', id: 1, method: 'example' };
		const zipped = await gzipEncoder.encode(msg, { charset: 'utf8'} );
		assert.strictEqual(zipped.toString('base64'), 'H4sIAAAAAAAACqtWyirOzysqSFayUjLSM1DSUcpMUbIy1FHKTS3JyAcylVIrEnMLclKVagH7JiWtKwAAAA==');
		const unzipped: RequestMessage = await gzipDecoder.decode(zipped, { charset: 'utf8'} ) as RequestMessage;
		assert.strictEqual(unzipped.id, 1);
		assert.strictEqual(unzipped.method, 'example');
	});

	test('Encode', async () => {
		const context = new TransferContext();
		context.setDefaultRequestEncodings('gzip');
		const writable = new TestWritable();
		const writer = new StreamMessageWriter(writable, {
			charset: 'utf8',
			context: context,
			encoders: [gzipEncoder],
			decoders: []
		});

		const request: RequestMessage = {
			jsonrpc: '2.0',
			id: 1,
			method: 'example'
		};
		await writer.write(request);
		writable.end();
		assertDefined(writable.data);

		const messageBuffer = new MessageBuffer({
			charset: 'utf8',
			decoders: [gzipDecoder]
		});

		messageBuffer.append(writable.data);
		const headers = messageBuffer.tryReadHeaders();
		assertDefined(headers);
		const encoding = headers['Content-Encoding'];
		assert.strictEqual(encoding, 'gzip');
		const length: number = parseInt(headers['Content-Length']);
		const msg: RequestMessage | undefined = await messageBuffer.tryReadContent(length, encoding) as RequestMessage;
		assertDefined(msg);
		assert.strictEqual(msg.id, 1);
		assert.strictEqual(msg.method, 'example');
	});

	test('Decode', (done) => {
		const readable = new Readable();
		const reader = new StreamMessageReader(readable, {
			charset: 'utf8',
			decoders: [gzipDecoder]
		});
		reader.listen((message: RequestMessage) => {
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
		const transferContext = new TransferContext();
		assert.deepStrictEqual(
			transferContext.getResponseAcceptEncodings([ { name: 'gzip'} ]),
			['gzip']
		);
		assert.deepStrictEqual(
			transferContext.getResponseAcceptEncodings([ { name: 'gzip'}, {name: 'compress' } ]),
			['gzip;q=1', 'compress;q=0']
		);
		assert.deepStrictEqual(
			transferContext.getResponseAcceptEncodings([ { name: 'gzip'}, {name: 'compress' }, { name: 'deflate'} ]),
			['gzip;q=1', 'compress;q=0.5', 'deflate;q=0']
		);
		assert.deepStrictEqual(
			transferContext.getResponseAcceptEncodings([ { name: 'gzip'}, {name: 'compress' }, { name: 'deflate'}, { name: 'br'} ]),
			['gzip;q=1', 'compress;q=0.7', 'deflate;q=0.4', 'br;q=0.1']
		);
	});
});