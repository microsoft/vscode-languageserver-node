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
	LocationLink, WorkDoneProgressReporter
} from '../main';

class TestStream extends Duplex {
	_write(chunk: string, _encoding: string, done: () => void) {
		this.emit('data', chunk);
		done();
	}

	_read(_size: number) {
	}
}

class ForwardingStream extends Duplex {
	constructor(private readonly target: TestStream) {
		super();
	}

	_write(chunk: string, _encoding: string, done: () => void) {
		this.target.emit('data', chunk);
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

	test('Ensure request parameter passing', async () => {
		let paramsCorrect: boolean = false;
		serverConnection.onRequest(InitializeRequest.type, (params) => {
			paramsCorrect = !Array.isArray(params) && params.workDoneToken === 'token';
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
		void clientConnection.sendNotification(DidChangeConfigurationNotification.type, param);
	});

	test('Ensure work done converted', (done) => {
		serverConnection.onDeclaration((_params, _cancel, workDone, result) => {
			assert.ok(workDone !== undefined, 'Work Done token converted.');
			assert.ok(!WorkDoneProgressReporter.isNullInstance(workDone), 'Work Done token uses a progress reporter.');
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
		void clientConnection.sendRequest(DeclarationRequest.type, params);
	});

	test('Ensure result converted', (done) => {
		serverConnection.onDeclaration((_params, _cancel, workDone, result) => {
			assert.ok(WorkDoneProgressReporter.isNullInstance(workDone), 'Work Done token uses a null progress reporter.');
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
		void clientConnection.sendRequest(DeclarationRequest.type, params);
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
					assert.ok(begin && report, 'Received begin, report and done');
					done();
					break;
			}
		});
		void clientConnection.sendRequest(DeclarationRequest.type, params);
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
		clientConnection.onProgress(DeclarationRequest.type, resultToken, (values) => {
			result.push(...values);
		});
		void clientConnection.sendRequest(DeclarationRequest.type, params).then((values) => {
			assert.ok((result as LocationLink[]).length === 30, 'All partial results received');
			assert.ok((values as LocationLink[]).length === 0, 'No final values');
			done();
		});
	});

	const progressParams: DeclarationParams = {
		position: { line: 0, character: 0 },
		textDocument: {
			uri: 'file:///home/dirkb/test.ts'
		},
		workDoneToken: 'xx',
		partialResultToken: 'rr'
	};

	test('Reporting progress on a closed connection does not throw', (done) => {
		serverConnection.onDeclaration((_params, _cancel, workDone, result) => {
			serverConnection.dispose();
			try {
				assert.doesNotThrow(() => {
					workDone.begin('title', 0, 'message', false);
					workDone.report(50, 'report');
					result!.report([]);
					workDone.done();
				});
				done();
			} catch (error) {
				done(error);
			}
			return [];
		});
		void clientConnection.sendRequest(DeclarationRequest.type, progressParams);
	});

	test('Failed progress writes do not cause unhandled rejections', (done) => {
		// Give the server its own output stream so destroying it doesn't close the
		// client's input stream (which would exit the process).
		const up = new TestStream();
		const down = new TestStream();
		const serverOutput = new ForwardingStream(down);
		serverConnection = createConnection(up, serverOutput);
		clientConnection = createConnection(down, up);
		serverConnection.listen();
		clientConnection.listen();

		const unhandled: unknown[] = [];
		const onUnhandledRejection = (reason: unknown) => unhandled.push(reason);
		process.on('unhandledRejection', onUnhandledRejection);
		serverConnection.onDeclaration((_params, _cancel, workDone, result) => {
			// Simulate the client going away: the stream is destroyed but the
			// connection hasn't processed the close yet, so writes reject.
			serverOutput.destroy();
			workDone.begin('title', 0, 'message', false);
			workDone.report(50, 'report');
			result!.report([]);
			workDone.done();
			// Give the rejected writes time to settle and be reported as unhandled.
			setTimeout(() => {
				process.removeListener('unhandledRejection', onUnhandledRejection);
				try {
					assert.deepStrictEqual(unhandled, []);
					done();
				} catch (error) {
					done(error);
				}
			}, 50);
			return new Promise<never>(() => {});
		});
		void clientConnection.sendRequest(DeclarationRequest.type, progressParams);
	});
});
