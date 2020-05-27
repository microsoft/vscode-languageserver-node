/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';

import { RequestMessage, ResponseMessage } from '../../common/api';
import { BrowserMessageReader, BrowserMessageWriter } from '../main';

suite('Browser IPC Reader / Writer', () => {
	test('Simple request message with response', (done) => {
		const worker = new Worker('/dist/worker.js');
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
});