/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import * as path from 'path';
import * as lsclient from 'vscode-languageclient';
import * as vscode from 'vscode';

suite('Client integration', () => {

	let client!: lsclient.LanguageClient;
	let middleware: lsclient.Middleware;
	let uri!: vscode.Uri;
	let document!: vscode.TextDocument;
	let tokenSource!: vscode.CancellationTokenSource;

	function rangeEqual(range: vscode.Range, sl: number, sc: number, el: number, ec: number): void {
		assert.strictEqual(range.start.line, sl);
		assert.strictEqual(range.start.character, sc);
		assert.strictEqual(range.end.line, el);
		assert.strictEqual(range.end.character, ec);
	}

	function uriEqual(actual: vscode.Uri, expected: vscode.Uri): void {
		assert.strictEqual(actual.toString(), expected.toString());
	}

	function defined<T>(value: T | undefined | null): asserts value is T {
		if (value === undefined || value === null) {
			throw new Error(`Value is null or undefined`);
		}
	}

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
		document = await vscode.workspace.openTextDocument(uri);

		tokenSource = new vscode.CancellationTokenSource();

		const serverModule = path.join(__dirname, './servers/testServer.js');
		const serverOptions: lsclient.ServerOptions = {
			run: { module: serverModule, transport: lsclient.TransportKind.ipc },
			debug: { module: serverModule, transport: lsclient.TransportKind.ipc, options: { execArgv: ['--nolazy', '--inspect=6014'] } }
		};
		const documentSelector: lsclient.DocumentSelector = [{ scheme: 'lsptests', language: 'bat' }];

		middleware = {};
		const clientOptions: lsclient.LanguageClientOptions = {
			documentSelector, synchronize: {}, initializationOptions: {}, middleware
		};

		client = new lsclient.LanguageClient('css', 'Test Language Server', serverOptions, clientOptions);
		client.start();
		await client.onReady();
	});

	suiteTeardown(async () => {
		await client.stop();
	});

	test('InitializeResult', () => {
		let expected = {
			capabilities: {
				textDocumentSync: 1,
				declarationProvider: true,
				definitionProvider: true,
				hoverProvider: true,
				completionProvider: { resolveProvider: true, triggerCharacters: ['"', ':'] },
				signatureHelpProvider: {
					triggerCharacters: [':'],
					retriggerCharacters: [':']
				},
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

	test('Goto Declaration', async () => {
		const provider = client.getFeature(lsclient.DeclarationRequest.method).getProvider(document);
		const result = (await provider.provideDeclaration(document, new vscode.Position(1, 1), tokenSource.token)) as vscode.Location;
		assert.ok(result instanceof vscode.Location);
		uriEqual(result.uri, uri);
		rangeEqual(result.range, 1, 1, 1, 2);

		let middlewareCalled: boolean = false;
		middleware.provideDeclaration = (document, position, token, next) => {
			middlewareCalled = true;
			return next(document, position, token);
		};
		await provider.provideDeclaration(document, new vscode.Position(1, 1), tokenSource.token);
		middleware.provideDeclaration = undefined;
		assert.strictEqual(middlewareCalled, true);
	});

	test('Goto Definition', async () => {
		const provider = client.getFeature(lsclient.DefinitionRequest.method).getProvider(document);
		const result = (await provider.provideDefinition(document, new vscode.Position(1, 1), tokenSource.token)) as vscode.Location;
		assert.ok(result instanceof vscode.Location);
		uriEqual(result.uri, uri);
		rangeEqual(result.range, 0, 0, 0, 1);

		let middlewareCalled: boolean = false;
		middleware.provideDefinition = (document, position, token, next) => {
			middlewareCalled = true;
			return next(document, position, token);
		};
		await provider.provideDefinition(document, new vscode.Position(1, 1), tokenSource.token);
		middleware.provideDefinition = undefined;
		assert.strictEqual(middlewareCalled, true);
	});

	test('Hover', async () => {
		const provider = client.getFeature(lsclient.HoverRequest.method).getProvider(document);
		const result = (await provider.provideHover(document, new vscode.Position(1, 1), tokenSource.token)) as vscode.Hover;
		assert.ok(result instanceof vscode.Hover);
		assert.strictEqual(result.contents.length, 1);
		assert.strictEqual((result.contents[0] as vscode.MarkdownString).value, 'foo');

		let middlewareCalled: boolean = false;
		middleware.provideHover = (document, position, token, next) => {
			middlewareCalled = true;
			return next(document, position, token);
		};
		await provider.provideHover(document, new vscode.Position(1, 1), tokenSource.token);
		middleware.provideHover = undefined;
		assert.strictEqual(middlewareCalled, true);
	});

	test('Completion', async () => {
		const provider = client.getFeature(lsclient.CompletionRequest.method).getProvider(document);
		const result = (await provider.provideCompletionItems(document, new vscode.Position(1, 1), tokenSource.token, { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: ':' })) as vscode.CompletionItem[];
		assert.ok(Array.isArray(result));
		assert.strictEqual(result.length, 1);
		const item = result[0];
		assert.ok(item instanceof vscode.CompletionItem);
		assert.strictEqual(item.label, 'item');
		assert.strictEqual(item.insertText, 'text');
		assert.strictEqual(item.detail, undefined);
		defined(provider.resolveCompletionItem);

		const resolved = await provider.resolveCompletionItem(item, tokenSource.token);
		defined(resolved);
		assert.strictEqual(resolved.detail, 'detail');

		let middlewareCalled: number = 0;
		middleware.provideCompletionItem = (document, position, context, token, next) => {
			middlewareCalled++;
			return next(document, position, context, token);
		};
		middleware.resolveCompletionItem = (item, token, next) => {
			middlewareCalled++;
			return next(item, token);
		};
		await provider.provideCompletionItems(document, new vscode.Position(1, 1), tokenSource.token, { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: ':' });
		await provider.resolveCompletionItem(item, tokenSource.token);
		middleware.provideCompletionItem = undefined;
		middleware.resolveCompletionItem = undefined;
		assert.strictEqual(middlewareCalled, 2);
	});

	test('SignatureHelpRequest', async () => {
		const provider = client.getFeature(lsclient.SignatureHelpRequest.method).getProvider(document);
		const result = (await provider.provideSignatureHelp(document, new vscode.Position(1, 1), tokenSource.token,
			{
				isRetrigger: false,
				triggerKind: lsclient.SignatureHelpTriggerKind.Invoked,
				triggerCharacter: ':'
			}
		)) as vscode.SignatureHelp;
		assert.ok(result instanceof vscode.SignatureHelp);
		assert.strictEqual(result.activeSignature, 1);
		assert.strictEqual(result.activeParameter, 1);
		assert.strictEqual(result.signatures.length, 1);

		const signature = result.signatures[0];
		assert.ok(signature instanceof vscode.SignatureInformation);
		assert.strictEqual(signature.label, 'label');
		assert.strictEqual(signature.documentation, 'doc');
		assert.strictEqual(signature.parameters.length, 1);

		const parameter = signature.parameters[0];
		assert.ok(parameter instanceof vscode.ParameterInformation);
		assert.strictEqual(parameter.label, 'label');
		assert.strictEqual(parameter.documentation, 'doc');

		let middlewareCalled: boolean = false;
		middleware.provideSignatureHelp = (d, p, c, t, n) => {
			middlewareCalled = true;
			return n(d, p, c, t);
		};
		await provider.provideSignatureHelp(document, new vscode.Position(1, 1), tokenSource.token,
			{
				isRetrigger: false,
				triggerKind: lsclient.SignatureHelpTriggerKind.Invoked,
				triggerCharacter: ':'
			}
		);
		assert.ok(middlewareCalled);
		middleware.provideSignatureHelp = undefined;
	});
});