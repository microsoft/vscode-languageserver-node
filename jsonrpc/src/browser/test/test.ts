/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';

import { CancellationTokenSource, RAL, RequestMessage, RequestType0, ResponseMessage } from '../../common/api';
import { SharedArrayReceiverStrategy, SharedArraySenderStrategy } from '../../common/sharedArrayCancellation';
import { BrowserMessageReader, BrowserMessageWriter, createMessageConnection } from '../main';
import RIL, { QueueMicrotaskImpl, PromiseImpl } from '../ril';

function assertDefined<T>(value: T | undefined | null): asserts value is T {
	assert.ok(value !== undefined && value !== null);
}

suite('Browser runtime crypto', () => {
	const descriptors = new Map<string, PropertyDescriptor | undefined>();

	setup(() => {
		for (const name of ['randomUUID', 'getRandomValues']) {
			descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis.crypto, name));
		}
	});

	teardown(() => {
		for (const [name, descriptor] of descriptors) {
			if (descriptor === undefined) {
				Reflect.deleteProperty(globalThis.crypto, name);
			} else {
				Object.defineProperty(globalThis.crypto, name, descriptor);
			}
		}
	});

	test('randomUUID delegates to the native method with its receiver', () => {
		const value = '01234567-89ab-4cde-8fab-0123456789ab';
		Object.defineProperty(globalThis.crypto, 'randomUUID', {
			configurable: true,
			value: function (this: Crypto): string {
				assert.strictEqual(this, globalThis.crypto);
				return value;
			}
		});
		assert.strictEqual(RAL().crypto.randomUUID(), value);
	});

	test('randomUUID fallback generates distinct canonical v4 UUIDs', () => {
		Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: undefined });
		const values = new Set<string>();
		for (let i = 0; i < 100; i++) {
			const value = RAL().crypto.randomUUID();
			assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
			values.add(value);
		}
		assert.strictEqual(values.size, 100);
	});

	test('randomUUID fallback preserves version and variant bits', () => {
		Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, value: undefined });
		for (const [byte, expected] of [
			[0, '10000000-1000-4000-8000-100000000000'],
			[255, 'efffffff-efff-4fff-bfff-efffffffffff']
		] as const) {
			Object.defineProperty(globalThis.crypto, 'getRandomValues', {
				configurable: true,
				value: (array: Uint8Array): Uint8Array => array.fill(byte)
			});
			assert.strictEqual(RAL().crypto.randomUUID(), expected);
		}
	});
});

suite('Browser IPC Reader / Writer', () => {
	test('Simple request message with response', (done) => {
		const worker = new Worker('/jsonrpc/dist/worker.js');
		const reader = new BrowserMessageReader(worker);
		const writer = new BrowserMessageWriter(worker);
		reader.listen((message) => {
			const response: ResponseMessage = message as ResponseMessage;
			assert.strictEqual(response.result, 42);
			done();
		});
		const request: RequestMessage = {
			jsonrpc: '2.0',
			id: 1,
			method: 'example'
		};
		void writer.write(request);
	});

	test('MessageBuffer Simple', () => {
		const buffer = RIL().messageBuffer.create('utf-8');
		// TextEncoder don't support ascii. But utf-8 creates the same for the header.
		const encoder: TextEncoder = new TextEncoder();
		buffer.append(encoder.encode('Content-Length: 43\r\n\r\n'));
		buffer.append(encoder.encode('{"jsonrpc":"2.0","id":1,"method":"example"}'));
		const headers = buffer.tryReadHeaders(true);
		assertDefined(headers);
		assert.strictEqual(headers.size, 1);
		assert.strictEqual(headers.get('content-length'), '43');
		const decoder = new TextDecoder('utf-8');
		const content = JSON.parse(decoder.decode(buffer.tryReadBody(43)));
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
		const encoder: TextEncoder = new TextEncoder();
		const content = encoder.encode(JSON.stringify(data));
		const header = encoder.encode(`Content-Length: ${content.byteLength}\r\n\r\n`);
		const payload = new Uint8Array(header.byteLength + content.byteLength);
		payload.set(header);
		payload.set(content, header.byteLength);
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
			const headers = buffer.tryReadHeaders(false);
			assertDefined(headers);
			assert.strictEqual(headers.size, 1);
			const length = parseInt(headers.get('Content-Length')!);
			assert.strictEqual(length, content.byteLength);
			const decoder = new TextDecoder('utf-8');
			const body: Item[] = JSON.parse(decoder.decode(buffer.tryReadBody(length)));
			assert.ok(Array.isArray(body));
			assert.strictEqual(body.length, 1000);
			for (let i = 0; i < body.length; i++) {
				const item = body[i];
				assert.strictEqual(item.index, i);
				assert.strictEqual(item.label, `label${i}`);
			}
		}
	});

	test('Cancellation via SharedArrayBuffer', async () => {
		const worker = new Worker('/jsonrpc/dist/cancelWorker.js');
		const reader = new BrowserMessageReader(worker);
		const writer = new BrowserMessageWriter(worker);

		const type = new RequestType0<boolean, void>('test/handleCancel');
		const connection = createMessageConnection(reader, writer, undefined, { cancellationStrategy: { sender: new SharedArraySenderStrategy(), receiver: new SharedArrayReceiverStrategy() } });
		connection.listen();
		const tokenSource = new CancellationTokenSource();
		const promise = connection.sendRequest(type, tokenSource.token);
		tokenSource.cancel();
		const result = await promise;
		assert.ok(result, 'Cancellation failed');
	});

	test('QueueMicrotaskImpl', async() => {
		let called = false;
		new QueueMicrotaskImpl(() => {
			called = true;
		});
		await new Promise((resolve) => setTimeout(resolve, 10));
		assert.strictEqual(called, true, 'QueueMicrotaskImpl callback not called');
	});

	test('QueueMicrotaskImpl dispose', async() => {
		let called = false;
		const queueMicrotask = new QueueMicrotaskImpl(() => {
			called = true;
		});
		queueMicrotask.dispose();
		await new Promise((resolve) => setTimeout(resolve, 10));
		assert.strictEqual(called, false, 'QueueMicrotaskImpl callback called after dispose');
	});

	test('PromiseImpl', async() => {
		let called = false;
		new PromiseImpl(() => {
			called = true;
		});
		await new Promise((resolve) => setTimeout(resolve, 10));
		assert.strictEqual(called, true, 'PromiseImpl callback not called');
	});

	test('PromiseImpl dispose', async() => {
		let called = false;
		const promiseImpl = new PromiseImpl(() => {
			called = true;
		});
		promiseImpl.dispose();
		await new Promise((resolve) => setTimeout(resolve, 10));
		assert.strictEqual(called, false, 'PromiseImpl callback called after dispose');
	});

	test('setImmediate', async() => {
		let called = false;
		RIL().timer.setImmediate(() => {
			called = true;
		});
		await new Promise((resolve) => setTimeout(resolve, 10));
		assert.strictEqual(called, true, 'setImmediate callback not called');
	});

	test('setImmediate dispose', async() => {
		let called = false;
		const disposable = RIL().timer.setImmediate(() => {
			called = true;
		});
		disposable.dispose();
		await new Promise((resolve) => setTimeout(resolve, 10));
		assert.strictEqual(called, false, 'setImmediate callback called after dispose');
	});
});