/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';

import { Duplex } from 'stream';
import {
	InitializeParams, InitializeRequest, InitializeResult, createProtocolConnection, StreamMessageReader, StreamMessageWriter, Logger, ProtocolConnection,
	WorkDoneProgressBegin, WorkDoneProgressReport, WorkDoneProgressEnd
} from '../main';
import { DocumentSymbolRequest, DocumentSymbolParams } from '../../common/protocol';
import { ProgressType } from 'vscode-jsonrpc';
import { SymbolInformation, SymbolKind } from 'vscode-languageserver-types';

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

suite('Connection Tests', () => {
	test('Ensure proper param passing', async() => {
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
			const result: InitializeResult = {
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

suite('Partial result tests', () => {

	let serverConnection: ProtocolConnection;
	let clientConnection: ProtocolConnection;
	const progressType: ProgressType<any> = new ProgressType();

	setup(() => {
		const up = new TestStream();
		const down = new TestStream();
		const logger = new NullLogger();
		serverConnection = createProtocolConnection(new StreamMessageReader(up), new StreamMessageWriter(down), logger);
		clientConnection = createProtocolConnection(new StreamMessageReader(down), new StreamMessageWriter(up), logger);
		serverConnection.listen();
		clientConnection.listen();
	});

	test('Token provided', async () => {
		serverConnection.onRequest(DocumentSymbolRequest.type, (params) => {
			assert.ok(params.partialResultToken === '3b1db4c9-e011-489e-a9d1-0653e64707c2');
			return [];
		});

		const params: DocumentSymbolParams = {
			textDocument: { uri: 'file:///abc.txt' },
			partialResultToken: '3b1db4c9-e011-489e-a9d1-0653e64707c2'
		};
		await clientConnection.sendRequest(DocumentSymbolRequest.type, params);
	});

	test('Result reported', async () => {
		const result: SymbolInformation = {
			name: 'abc',
			kind: SymbolKind.Class,
			location: {
				uri: 'file:///abc.txt',
				range: { start: { line: 0, character: 1 }, end: { line: 2, character: 3} }
			}
		};
		serverConnection.onRequest(DocumentSymbolRequest.type, async (params) => {
			assert.ok(params.partialResultToken === '3b1db4c9-e011-489e-a9d1-0653e64707c2');
			await serverConnection.sendProgress(progressType, params.partialResultToken!, [ result ]);
			return [];
		});

		const params: DocumentSymbolParams = {
			textDocument: { uri: 'file:///abc.txt' },
			partialResultToken: '3b1db4c9-e011-489e-a9d1-0653e64707c2'
		};
		let progressOK: boolean = false;
		clientConnection.onProgress(progressType, '3b1db4c9-e011-489e-a9d1-0653e64707c2', (values) => {
			progressOK = (values !== undefined && values.length === 1);
		});
		await clientConnection.sendRequest(DocumentSymbolRequest.type, params);
		assert.ok(progressOK);
	});
});

suite('Work done tests', () => {

	let serverConnection: ProtocolConnection;
	let clientConnection: ProtocolConnection;
	const progressType: ProgressType<WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd> = new ProgressType();

	setup(() => {
		const up = new TestStream();
		const down = new TestStream();
		const logger = new NullLogger();
		serverConnection = createProtocolConnection(new StreamMessageReader(up), new StreamMessageWriter(down), logger);
		clientConnection = createProtocolConnection(new StreamMessageReader(down), new StreamMessageWriter(up), logger);
		serverConnection.listen();
		clientConnection.listen();
	});

	test('Token provided', async () => {
		serverConnection.onRequest(DocumentSymbolRequest.type, (params) => {
			assert.ok(params.workDoneToken === '3b1db4c9-e011-489e-a9d1-0653e64707c2');
			return [];
		});

		const params: DocumentSymbolParams = {
			textDocument: { uri: 'file:///abc.txt' },
			workDoneToken: '3b1db4c9-e011-489e-a9d1-0653e64707c2'
		};
		await clientConnection.sendRequest(DocumentSymbolRequest.type, params);
	});

	test('Result reported', async () => {
		serverConnection.onRequest(DocumentSymbolRequest.type, async (params) => {
			assert.ok(params.workDoneToken === '3b1db4c9-e011-489e-a9d1-0653e64707c2');
			await serverConnection.sendProgress(progressType, params.workDoneToken!, {
				kind: 'begin',
				title: 'progress'
			});
			await serverConnection.sendProgress(progressType, params.workDoneToken!, {
				kind: 'report',
				message: 'message'
			});
			await serverConnection.sendProgress(progressType, params.workDoneToken!, {
				kind: 'end',
				message: 'message'
			});
			return [];
		});

		const params: DocumentSymbolParams = {
			textDocument: { uri: 'file:///abc.txt' },
			workDoneToken: '3b1db4c9-e011-489e-a9d1-0653e64707c2'
		};
		let result: string = '';
		clientConnection.onProgress(progressType, '3b1db4c9-e011-489e-a9d1-0653e64707c2', (value) => {
			result += value.kind;
		});
		await clientConnection.sendRequest(DocumentSymbolRequest.type, params);
		assert.ok(result === 'beginreportend');
	});
});