/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import * as lsclient from 'vscode-languageclient';
import * as vscode from 'vscode';

suite('Cancellation integration', () => {

	let client!: lsclient.LanguageClient;
	let middleware: lsclient.Middleware;
	let uri!: vscode.Uri;

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

		const serverModule = path.join(__dirname, './servers/testServer.js');
		const serverOptions: lsclient.ServerOptions = {
			run: { module: serverModule, transport: lsclient.TransportKind.ipc },
			debug: {
				module: serverModule, transport: lsclient.TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6014'] }
			}
		};
		const documentSelector: lsclient.DocumentSelector = [{ scheme: 'lsptests', language: 'bat' }];

		middleware = {};
		const clientOptions: lsclient.LanguageClientOptions = {
			documentSelector, synchronize: {}, initializationOptions: {}, middleware, useFileBasedCancellation: true
		};

		client = new lsclient.LanguageClient('css', 'Test Language Server', serverOptions, clientOptions);
		client.start();
		await client.onReady();

		assert(fs.existsSync(getFolderForFileBasedCancellation()));
	});

	suiteTeardown(async () => {
		await client.stop();

		assert(!fs.existsSync(getFolderForFileBasedCancellation()));
	});

	test('Regular Cancellation', async () => {
		const sourceToken = new lsclient.CancellationTokenSource();
		const request = client.sendRequest(new lsclient.RequestType0<number, void>('regularCancellationTest'), sourceToken.token);
		await delay(100);
		sourceToken.cancel();

		try {
			await request;
		} catch (e) {
			assert(e instanceof lsclient.ResponseError);
			assert((<lsclient.ResponseError<any>>e).code === lsclient.ErrorCodes.RequestCancelled);
		}
	}).timeout(10000);

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

	function getFolderForFileBasedCancellation() {
		// client and server must use same logic to create actual folder name. but don't have a good way to share logic.
		const folder = path.join(os.tmpdir(), 'vscode-languageserver-cancellation', client.CancellationFolderName!);
		return folder;
	}

	function delay(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
});