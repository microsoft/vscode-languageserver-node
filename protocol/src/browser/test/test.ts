/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';

import { CompletionRequest, CompletionParams, CompletionItem } from '../../common/api';
import { BrowserMessageReader, BrowserMessageWriter, createProtocolConnection } from '../main';

suite('Browser Protocol Tests', () => {
	const worker = new Worker('/protocol/dist/worker.js');
	const reader = new BrowserMessageReader(worker);
	const writer = new BrowserMessageWriter(worker);
	const connection = createProtocolConnection(reader, writer);
	connection.listen();
	test('Test Code Completion Request', async () => {
		const params: CompletionParams = {
			textDocument: { uri: 'file:///folder/a.ts' },
			position: { line: 1, character: 1}
		};
		const result = (await connection.sendRequest(CompletionRequest.type, params)) as CompletionItem[];
		assert.strictEqual(result!.length, 0);
	});
});
