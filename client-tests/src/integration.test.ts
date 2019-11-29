/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import * as path from 'path';
import * as lsclient from '../../client/lib/main';

suite('Client integration', () => {

	let client!: lsclient.LanguageClient;

	before(async (done) => {
		let serverModule = path.join(__dirname, './servers/testInitializeResult.js');
		let serverOptions: lsclient.ServerOptions = {
			run: { module: serverModule, transport: lsclient.TransportKind.ipc },
			debug: { module: serverModule, transport: lsclient.TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6014'] } }
		};
		let documentSelector: lsclient.DocumentSelector = ['plaintext'];

		let clientOptions: lsclient.LanguageClientOptions = {
			documentSelector, synchronize: {}, initializationOptions: {}
			// middleware: {
			// 	handleDiagnostics: (uri, diagnostics, next) => {
			// 		assert.equal(uri, 'uri:/test.ts');
			// 		assert.ok(Array.isArray(diagnostics));
			// 		assert.equal(diagnostics.length, 0);
			// 		next(uri, diagnostics);
			// 		disposable.dispose();
			// 		done();
			// 	}
			// }
		};

		client = new lsclient.LanguageClient('css', 'Test Language Server', serverOptions, clientOptions);
		client.start();
		await client.onReady();
		done();
	});

	after(async (done) => {
		await client.stop();
		done();
	});

	test('InitializeResult', () => {
		let expected = {
			capabilities: {
				textDocumentSync: 1,
				completionProvider: { resolveProvider: true, triggerCharacters: ['"', ':'] },
				hoverProvider: true,
				renameProvider: {
					prepareProvider: true
				}
			},
			customResults: {
				'hello': 'world'
			}
		};
		assert.deepEqual(client.initializeResult, expected);
	});
});