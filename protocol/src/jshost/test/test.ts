/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';

import { CompletionRequest, CompletionParams, CompletionItem } from '../../common/api';
import { JshostMessageReader, JshostMessageWriter, createProtocolConnection, MessageChannel } from '../main';
import { Server } from './server';

suite('Jshost Protocol Tests', () => {
	var messageChannel = new MessageChannel();
	new Server(messageChannel);
	const reader = new JshostMessageReader(messageChannel.port1);
	const writer = new JshostMessageWriter(messageChannel.port2);
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