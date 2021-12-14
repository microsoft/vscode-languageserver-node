/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import * as zlib from 'zlib';
import * as msgpack from 'msgpack-lite';

import { Message, RequestMessage } from '../../common/messages';
import { ContentEncoder, ContentDecoder, Encodings, FunctionContentTypeEncoder, FunctionContentTypeDecoder  } from '../../common/encoding';
import { StreamMessageWriter, StreamMessageReader } from '../../node/main';
import RIL from '../ril';

import { Writable, Readable } from 'stream';
import { inherits } from 'util';
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

const msgpackEncoder: FunctionContentTypeEncoder = {
	name: 'messagepack',
	// A shipping-quality encoder would remove properties with undefined values like JSON.stringify does (https://github.com/kawanet/msgpack-lite/issues/71).
	encode: (msg) => Promise.resolve(msgpack.encode(msg)),
};

const msgpackDecoder: FunctionContentTypeDecoder = {
	name: 'messagepack',
	decode: (buffer) => Promise.resolve(msgpack.decode(buffer)),
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
			assert.strictEqual(message.id, 1);
			assert.strictEqual(message.method, 'example');
			done();
		});
		readable.push('Content-Length: 43\r\n\r\n{"jsonrpc":"2.0","id":1,"method":"example"}');
		readable.push(null);
	});

	test('Read partial', (done) => {
		const readable = new Readable();
		readable._read = function () {};
		const reader = new StreamMessageReader(readable);
		reader.partialMessageTimeout = 100;
		const partOne = 'Content-Length: 43\r\n\r\n';
		const partTwo = '{"jsonrpc":"2.0","id":1,"method":"example"}';
		reader.listen((msg: Message) => {
			const message: RequestMessage = msg as RequestMessage;
			assert.strictEqual(message.id, 1);
			assert.strictEqual(message.method, 'example');
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

	test('Read without Content-Length', (done) => {
		const readable = new Readable();
		const reader = new StreamMessageReader(readable);
		reader.listen((_msg: Message) => {
			assert.fail('Should not parse a message without a Content-Length');
		});
		reader.onError((err) => {
			assert.strictEqual(err.message, 'Header must provide a Content-Length property.');
			done();
		});
		readable.push('Not-Content-Length: 43\r\n\r\n{"jsonrpc":"2.0","id":1,"method":"example"}');
		readable.push(null);
	});

	test('Read with invalid Content-Length', (done) => {
		const readable = new Readable();
		const reader = new StreamMessageReader(readable);
		reader.listen((_msg: Message) => {
			assert.fail('Should not parse a message without a Content-Length');
		});
		reader.onError((err) => {
			assert.strictEqual(err.message, 'Content-Length value must be a number.');
			done();
		});
		readable.push('Content-Length: NaN\r\n\r\n{"jsonrpc":"2.0","id":1,"method":"example"}');
		readable.push(null);
	});

	test('Basic Zip / Unzip', async () => {
		// The zip / unzip value is different per platform. Only test under Linux.
		if (process.platform !== 'linux') {
			return;
		}
		const msg: RequestMessage = { jsonrpc: '2.0', id: 1, method: 'example' };
		const zipped = await gzipEncoder.encode(Buffer.from(JSON.stringify(msg), 'utf8'));
		assert.strictEqual(Buffer.from(zipped).toString('base64'), 'H4sIAAAAAAAAA6tWyirOzysqSFayUjLSM1DSUcpMUbIy1FHKTS3JyAcylVIrEnMLclKVagH7JiWtKwAAAA==');
		const unzipped: RequestMessage = JSON.parse(Buffer.from(await gzipDecoder.decode(zipped)).toString('utf-8')) as RequestMessage;
		assert.strictEqual(unzipped.id, 1);
		assert.strictEqual(unzipped.method, 'example');
	});

	test('Encode', (done) => {
		const writable = new TestWritable();
		const writer = new StreamMessageWriter(writable, {
			charset: 'utf-8',
			contentEncoder: gzipEncoder,
		});

		const request: RequestMessage = {
			jsonrpc: '2.0',
			id: 1,
			method: 'example'
		};
		void writer.write(request).then(() => {
			writable.end();
			assertDefined(writable.data);


			const readable = new Readable();
			const reader = new StreamMessageReader(readable, {
				charset: 'utf-8',
				contentDecoder: gzipDecoder
			});

			reader.listen((message) => {
				if (!Message.isRequest(message)) {
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
			charset: 'utf-8',
			contentDecoder: gzipDecoder
		});
		reader.listen((message: Message) => {
			if (!Message.isRequest(message)) {
				throw new Error(`No request message`);
			}
			assert.strictEqual(message.id, 1);
			assert.strictEqual(message.method, 'example');
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

	test('Messagepack encoding', async () => {
		const writable = new TestWritable();
		const writer = new StreamMessageWriter(writable, {
			contentTypeEncoder: msgpackEncoder,
		});

		const request: RequestMessage = {
			jsonrpc: '2.0',
			id: 1,
			method: 'example'
		};
		await writer.write(request);
		writable.end();
		assertDefined(writable.data);

		const readable = new Readable();
		const reader = new StreamMessageReader(readable, {
			contentTypeDecoder: msgpackDecoder,
		});

		await new Promise<void>((resolve, reject) => {
			try {
				reader.listen((message) => {
					if (!Message.isRequest(message)) {
						throw reject(new Error(`No request message`));
					}
					assert.strictEqual(message.id, 1);
					assert.strictEqual(message.method, 'example');
					resolve();
				});
				readable.push(writable.data);
				readable.push(null);
			} catch (err) {
				reject(err);
			}
		});
	});

	test('MessageBuffer Simple', () => {
		const buffer = RIL().messageBuffer.create('utf-8');
		buffer.append(Buffer.from('Content-Length: 43\r\n\r\n', 'ascii'));
		buffer.append(Buffer.from('{"jsonrpc":"2.0","id":1,"method":"example"}', 'utf8'));
		const headers = buffer.tryReadHeaders();
		assertDefined(headers);
		assert.strictEqual(headers.size, 1);
		assert.strictEqual(headers.get('Content-Length'), '43');
		const content = JSON.parse((buffer.tryReadBody(43) as Buffer).toString('utf8'));
		assert.strictEqual(content.id, 1);
		assert.strictEqual(content.method, 'example');
	});

	test('MessageBuffer Random', () => {
		interface Item {
			index: number;
			label: string;
		}
		const data: Item[] = [];
		for (let i = 0; i < 1000; i++) {
			data.push({ index: i, label: `label${i}`});
		}
		const content = Buffer.from(JSON.stringify(data), 'utf8');
		const header = Buffer.from(`Content-Length: ${content.byteLength}\r\n\r\n`, 'ascii');
		const payload = Buffer.concat([header, content]);
		const buffer = RIL().messageBuffer.create('utf-8');

		for (const upper of [10, 64, 512, 1024]) {
			let sent: number = 0;
			while (sent < payload.byteLength) {
				let piece = Math.floor((Math.random() * upper) + 1);
				if (piece > payload.byteLength - sent) {
					piece = payload.byteLength - sent;
				}
				buffer.append(payload.slice(sent, sent + piece));
				sent = sent + piece;
			}
			const headers = buffer.tryReadHeaders();
			assertDefined(headers);
			assert.strictEqual(headers.size, 1);
			const length = parseInt(headers.get('Content-Length')!);
			assert.strictEqual(length, content.byteLength);
			const body: Item[] = JSON.parse((buffer.tryReadBody(length) as Buffer).toString('utf8'));
			assert.ok(Array.isArray(body));
			assert.strictEqual(body.length, 1000);
			for (let i = 0; i < body.length; i++) {
				const item = body[i];
				assert.strictEqual(item.index, i);
				assert.strictEqual(item.label, `label${i}`);
			}
		}
	});
});
