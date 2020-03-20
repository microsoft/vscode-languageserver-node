/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import * as path from 'path';

import * as lsclient from 'vscode-languageclient';
import * as vscode from 'vscode';
import { FileBasedCancellationStrategy } from 'vscode-languageserver-cancellation';
import { CancellationReceiverStrategy } from '../../jsonrpc/lib/main';

suite('Cancellation integration', () => {

	let client!: lsclient.LanguageClient;
	let middleware: lsclient.Middleware;
	let uri!: vscode.Uri;
	let strategy!: FileBasedCancellationStrategy;

	suiteSetup(async () => {
		vscode.workspace.registerTextDocumentContentProvider('lsptests', {
			provideTextDocumentContent: (_uri: vscode.Uri) => {
				return [
					'REM @ECHO OFF',
					'cd c:\source',
					'REM This is the location of the files that you want to sort',
					'FOR %%f IN (*.doc *.txt) DO XCOPY c:\source\"%%f" c:\text /m /y',
					'REM This moves any files with a .doc or',
					'REM .txt extension from c:\source to c:\textkkk',
					'REM %%f is a variable',
					'FOR %%f IN (*.jpg *.png *.bmp) DO XCOPY C:\source\"%%f" c:\images /m /y',
					'REM This moves any files with a .jpg, .png,',
					'REM or .bmp extension from c:\source to c:\images;;',
				].join('\n');
			}
		});

		uri = vscode.Uri.parse('lsptests://localhist/test.bat');
		await vscode.workspace.openTextDocument(uri);

		strategy = new FileBasedCancellationStrategy({ receiver: CancellationReceiverStrategy.Message });

		const serverModule = path.join(__dirname, './servers/testServer.js');
		const serverOptions: lsclient.ServerOptions = {
			run: { module: serverModule, transport: lsclient.TransportKind.ipc, args: strategy.getCommandLineArguments() },
			debug: {
				module: serverModule, transport: lsclient.TransportKind.ipc, args: strategy.getCommandLineArguments(),
				options: { execArgv: ['--nolazy', '--inspect=6014'] }
			}
		};
		const documentSelector: lsclient.DocumentSelector = [{ scheme: 'lsptests', language: 'bat' }];

		middleware = {};
		const clientOptions: lsclient.LanguageClientOptions = {
			documentSelector, synchronize: {}, initializationOptions: {}, middleware, connectionOptions: { cancellationStrategy: strategy }
		};

		client = new lsclient.LanguageClient('test svr', 'Test Language Server', serverOptions, clientOptions);
		client.start();
		await client.onReady();
	});

	suiteTeardown(async () => {
		await client.stop();

		strategy.dispose();
	});

	test('File Based Cancellation', async () => {
		const sourceToken = new lsclient.CancellationTokenSource();
		const request = client.sendRequest(new lsclient.RequestType0<number, void>('fileCancellationTest'), sourceToken.token);
		await delay(100);
		sourceToken.cancel();

		try {
			await request;
		} catch (e) {
			assert(e instanceof lsclient.ResponseError);
			assert((<lsclient.ResponseError<any>>e).code === lsclient.ErrorCodes.RequestCancelled);
		}
	}).timeout(10000);

	function delay(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
});