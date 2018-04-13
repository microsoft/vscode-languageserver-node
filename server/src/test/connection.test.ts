/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';

import { Duplex } from 'stream';
import { InitializeParams, InitializeRequest, InitializeResult, createConnection, DidChangeConfigurationNotification, DidChangeConfigurationParams } from '../main';

class TestStream extends Duplex {
  _write(chunk: string, _encoding: string, done: () => void) {
	this.emit('data', chunk);
	done();
  }

  _read(_size: number) {
  }
}

describe('Connection Tests', () => {
	it('Ensure request parameter passing', async() => {
		const up = new TestStream();
		const down = new TestStream();
		const serverConnection = createConnection(up, down);
		const clientConnection = createConnection(down, up);
		serverConnection.listen();
		clientConnection.listen();

		let paramsCorrect: boolean = false;
		serverConnection.onRequest(InitializeRequest.type, (params) => {
			paramsCorrect = !Array.isArray(params);
			let result: InitializeResult = {
				capabilities: {
				}
			};
			return result;
		});

		const init: InitializeParams = {
			rootUri: 'file:///home/dirkb',
			processId: 1,
			capabilities: {},
			workspaceFolders: null,
		};
		await clientConnection.sendRequest(InitializeRequest.type, init);
		assert.ok(paramsCorrect, 'Parameters are transferred correctly');
	});

	it('Ensure notification parameter passing', (done) => {
		const up = new TestStream();
		const down = new TestStream();
		const serverConnection = createConnection(up, down);
		const clientConnection = createConnection(down, up);
		serverConnection.listen();
		clientConnection.listen();

		serverConnection.onNotification(DidChangeConfigurationNotification.type, (params) => {
			assert.ok(!Array.isArray(params), 'Parameters are transferred correctly');
			done();
		});

		const param: DidChangeConfigurationParams = {
			settings: {}
		};
		clientConnection.sendNotification(DidChangeConfigurationNotification.type, param);
	});
});