/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';

import { Duplex } from 'stream';
import {
	InitializeParams, InitializeRequest, InitializeResult, createConnection, DidChangeConfigurationNotification,
	DidChangeConfigurationParams, Connection, DeclarationRequest, DeclarationParams, ProgressToken, WorkDoneProgress,
	LocationLink
} from '../main';

class TestStream extends Duplex {
	_write(chunk: string, _encoding: string, done: () => void) {
		this.emit('data', chunk);
		done();
	}

	_read(_size: number) {
	}
}

suite('Connection Tests', () => {
	let serverConnection: Connection;
	let clientConnection: Connection;

	setup(() => {
		const up = new TestStream();
		const down = new TestStream();
		serverConnection = createConnection(up, down);
		clientConnection = createConnection(down, up);
		serverConnection.listen();
		clientConnection.listen();
	});

	test('Ensure request parameter passing', async() => {
		let paramsCorrect: boolean = false;
		serverConnection.onRequest(InitializeRequest.type, (params) => {
			paramsCorrect = !Array.isArray(params) && params.workDoneToken === 'token';
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
			workDoneToken: 'token'
		};
		await clientConnection.sendRequest(InitializeRequest.type, init);
		assert.ok(paramsCorrect, 'Parameters are transferred correctly');
	});

	test('Ensure notification parameter passing', (done) => {
		serverConnection.onNotification(DidChangeConfigurationNotification.type, (params) => {
			assert.ok(!Array.isArray(params), 'Parameters are transferred correctly');
			done();
		});

		const param: DidChangeConfigurationParams = {
			settings: {}
		};
		clientConnection.sendNotification(DidChangeConfigurationNotification.type, param);
	});

	test('Ensure work done converted', (done) => {
		serverConnection.onDeclaration((_params, _cancel, workDone, result) => {
			assert.ok(workDone !== undefined, 'Work Done token converted.');
			assert.ok(result === undefined, 'Result token undefined.');
			done();
			return [];
		});
		const params: DeclarationParams = {
			position: { line: 0, character: 0 },
			textDocument: {
				uri: 'file:///home/dirkb/test.ts'
			},
			workDoneToken: 'xx'
		};
		clientConnection.sendRequest(DeclarationRequest.type, params);
	});

	test('Ensure result converted', (done) => {
		serverConnection.onDeclaration((_params, _cancel, workDone, result) => {
			assert.ok(workDone === undefined || workDone.constructor.name === 'NullProgressReporter', 'Work Done token undefined or null progress.');
			assert.ok(result !== undefined, 'Result token converted.');
			done();
			return [];
		});
		const params: DeclarationParams = {
			position: { line: 0, character: 0 },
			textDocument: {
				uri: 'file:///home/dirkb/test.ts'
			},
			partialResultToken: 'yy'
		};
		clientConnection.sendRequest(DeclarationRequest.type, params);
	});

	test('Report progress test', (done) => {
		serverConnection.onDeclaration((_params, _cancel, workDone, _result) => {
			workDone.begin('title', 0, 'message', false);
			workDone.report(100, 'report');
			workDone.done();
			return [];
		});
		const workDoneToken: ProgressToken = 'xx';
		const params: DeclarationParams = {
			position: { line: 0, character: 0 },
			textDocument: {
				uri: 'file:///home/dirkb/test.ts'
			},
			workDoneToken
		};
		let begin: boolean = false;
		let report: boolean = false;
		clientConnection.onProgress(WorkDoneProgress.type, workDoneToken, (param) => {
			switch (param.kind) {
				case 'begin':
					begin = true;
					break;
				case 'report':
					report = true;
					break;
				case 'end':
					assert.ok(begin && report, 'Recevied begin, report and done');
					done();
					break;
			}
		});
		clientConnection.sendRequest(DeclarationRequest.type, params);
	});

	test('Report result test', (done) => {
		serverConnection.onDeclaration((_params, _cancel, _workDone, result) => {
			const range = {
				start: {
					line: 0,
					character: 0
				},
				end: {
					line: 0,
					character: 10
				}
			};
			const location: LocationLink = {
				targetUri: 'file:///home/dirkb/test.ts',
				targetRange: range,
				targetSelectionRange: range
			};
			result!.report(new Array(10).fill(location));
			result!.report(new Array(20).fill(location));
			return [];
		});
		const resultToken: ProgressToken = 'rr';
		const params: DeclarationParams = {
			position: { line: 0, character: 0 },
			textDocument: {
				uri: 'file:///home/dirkb/test.ts'
			},
			partialResultToken: resultToken
		};
		const result: any[] = [];
		clientConnection.onProgress(DeclarationRequest.resultType, resultToken, (values) => {
			result.push(...values);
		});
		clientConnection.sendRequest(DeclarationRequest.type, params).then((values) => {
			assert.ok((result as LocationLink[]).length === 30, 'All partial results received');
			assert.ok((values as LocationLink[]).length === 0, 'No final values');
			done();
		});
	});
});