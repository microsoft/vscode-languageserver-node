/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';

import { RequestMessage, ResponseMessage } from '../../common/api';
import { BrowserMessageReader, BrowserMessageWriter } from '../main';
import RIL from '../ril';

function assertDefined<T>(value: T | undefined | null): asserts value is T {
	assert.ok(value !== undefined && value !== null);
}

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
		writer.write(request);
	});

	test('MessageBuffer Simple', () => {
		const buffer = RIL().messageBuffer.create('utf-8');
		// TextEncoder don't support ascii. But utf-8 creates the same for the header.
		const encoder: TextEncoder = new TextEncoder();
		buffer.append(encoder.encode('Content-Length: 43\r\n\r\n'));
		buffer.append(encoder.encode('{"jsonrpc":"2.0","id":1,"method":"example"}'));
		const headers = buffer.tryReadHeaders();
		assertDefined(headers);
		assert.strictEqual(headers.size, 1);
		assert.strictEqual(headers.get('Content-Length'), '43');
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
			const headers = buffer.tryReadHeaders();
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
});