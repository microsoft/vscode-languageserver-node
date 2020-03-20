/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';
import * as fs from 'fs';
import { FileBasedCancellationStrategy, extractCancellationFolderName, getCancellationFolderPath } from '../fileBasedCancellation';
import { createMessageConnection, NullLogger, CancellationReceiverStrategy, CancellationTokenSource, RequestType0 } from 'vscode-jsonrpc';
import { Duplex } from 'stream';

class TestStream extends Duplex {
	_write(chunk: string, _encoding: string, done: () => void) {
		this.emit('data', chunk);
		done();
	}

	_read(_size: number) {
	}
}

function delay(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

suite('Cancellation Tests', () => {
	test('Creation', () => {
		const strategy = new FileBasedCancellationStrategy();
		const commandLineArgs = strategy.getCommandLineArguments();
		assert.equal(commandLineArgs.length, 2);

		let folderName: string | undefined;
		for (const arg of commandLineArgs) {
			const args = arg.split('=');
			if (args[0] === '--cancellationSend' || args[0] === '--cancellationReceive') {
				const name = extractCancellationFolderName(args[1]);
				if (folderName) {
					assert.equal(folderName, name);
				}
				else {
					folderName = name;
				}
			}
		}

		const folder = getCancellationFolderPath(folderName!);
		assert(fs.existsSync(folder));

		strategy.dispose();
		assert(!fs.existsSync(folder));
	});

	test('Cancellation', () => {
		const strategy = new FileBasedCancellationStrategy();

		let duplexStream1 = new TestStream();
		let duplexStream2 = new TestStream();

		let notUsed = createMessageConnection(duplexStream1, duplexStream2, NullLogger);
		strategy.sender.sendCancellation(notUsed, 1);

		const source = strategy.receiver.createCancellationTokenSource(1);
		assert(source.token.isCancellationRequested);

		strategy.sender.cleanup(1);
		strategy.dispose();
	});

	test('CommandLine Arguements 1', (done) => {
		let type = new RequestType0<void, void>('cancelTest');
		const clientStrategy = new FileBasedCancellationStrategy({ receiver: CancellationReceiverStrategy.Message });
		const serverStrategy = FileBasedCancellationStrategy.fromArgv(clientStrategy.getCommandLineArguments())!;

		let duplexStream1 = new TestStream();
		let duplexStream2 = new TestStream();

		const source = new CancellationTokenSource();

		let server = createMessageConnection(duplexStream2, duplexStream1, NullLogger, { cancellationStrategy: serverStrategy });
		server.onRequest(type, async t => {
			source.cancel();

			while (!t.isCancellationRequested) {
			}

			clientStrategy.dispose();
			done();
		});
		server.listen();

		let client = createMessageConnection(duplexStream1, duplexStream2, NullLogger, { cancellationStrategy: clientStrategy });
		client.listen();
		client.sendRequest(type, source.token);
	});

	test('CommandLine Arguements 2', (done) => {
		let type = new RequestType0<void, void>('cancelTest');
		const clientStrategy = new FileBasedCancellationStrategy({ receiver: CancellationReceiverStrategy.Message });
		const serverStrategy = FileBasedCancellationStrategy.fromArgv(clientStrategy.getCommandLineArguments())!;

		let duplexStream1 = new TestStream();
		let duplexStream2 = new TestStream();

		const source = new CancellationTokenSource();

		let client = createMessageConnection(duplexStream1, duplexStream2, NullLogger, { cancellationStrategy: clientStrategy });
		client.onRequest(type, async t => {
			source.cancel();

			while (!t.isCancellationRequested) {
				await delay(0);
			}

			clientStrategy.dispose();
			done();
		});
		client.listen();

		let server = createMessageConnection(duplexStream2, duplexStream1, NullLogger, { cancellationStrategy: serverStrategy });
		server.listen();
		server.sendRequest(type, source.token);
	});
});