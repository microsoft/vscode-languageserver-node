/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';

import { Duplex } from 'stream';
import { InitializeParams, InitializeRequest, InitializeResult, createProtocolConnection, StreamMessageReader, StreamMessageWriter, Logger } from '../main';

class NullLogger implements Logger {
	error(_message: string): void {
	}
	warn(_message: string): void {
	}
	info(_message: string): void {
	}
	log(_message: string): void {
	}
}

class TestStream extends Duplex {
	_write(chunk: string, _encoding: string, done: () => void) {
		this.emit('data', chunk);
		done();
	}

	_read(_size: number) {
	}
}

describe('Connection Tests', () => {
	it('Ensure propert param passing', async() => {
		const up = new TestStream();
		const down = new TestStream();
		const logger = new NullLogger();
		const serverConnection = createProtocolConnection(new StreamMessageReader(up), new StreamMessageWriter(down), logger);
		const clientConnection = createProtocolConnection(new StreamMessageReader(down), new StreamMessageWriter(up), logger);
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
});