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
	const position: vscode.Position = new vscode.Position(1, 1);
	const range: vscode.Range = new vscode.Range(1, 1, 1, 2);

	function rangeEqual(range: vscode.Range, sl: number, sc: number, el: number, ec: number): void {
		assert.strictEqual(range.start.line, sl);
		assert.strictEqual(range.start.character, sc);
		assert.strictEqual(range.end.line, el);
		assert.strictEqual(range.end.character, ec);
	}

	function colorEqual(color: vscode.Color, red: number, green: number, blue: number, alpha: number): void {
		assert.strictEqual(color.red, red);
		assert.strictEqual(color.green, green);
		assert.strictEqual(color.blue, blue);
		assert.strictEqual(color.alpha, alpha);
	}

	function uriEqual(actual: vscode.Uri, expected: vscode.Uri): void {
		assert.strictEqual(actual.toString(), expected.toString());
	}

	function isArray<T>(value: Array<T> | undefined | null, clazz: any, length: number = 1): asserts value is Array<T> {
		assert.ok(Array.isArray(value), `value is array`);
		assert.strictEqual(value!.length, length, 'value has given length');
		if (length > 0) {
			assert.ok(value![0] instanceof clazz);
		}
	}

	function isDefined<T>(value: T | undefined | null): asserts value is Exclude<T, undefined | null> {
		if (value === undefined || value === null) {
			throw new Error(`Value is null or undefined`);
		}
	}

	function isInstanceOf<T>(value: T, clazz: any): asserts value is Exclude<T, undefined | null> {
		assert.ok(value instanceof clazz);
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

		client = new lsclient.LanguageClient('test svr', 'Test Language Server', serverOptions, clientOptions);
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
				definitionProvider: true,
				hoverProvider: true,
				completionProvider: { resolveProvider: true, triggerCharacters: ['"', ':'] },
				signatureHelpProvider: {
					triggerCharacters: [':'],
					retriggerCharacters: [':']
				},
				referencesProvider: true,
				documentHighlightProvider: true,
				codeActionProvider: true,
				documentFormattingProvider: true,
				documentRangeFormattingProvider: true,
				documentOnTypeFormattingProvider: {
					firstTriggerCharacter: ':'
				},
				renameProvider: {
					prepareProvider: true
				},
				documentLinkProvider: {
					resolveProvider: true
				},
				colorProvider: true,
				declarationProvider: true,
				foldingRangeProvider: true,
				implementationProvider: true,
				selectionRangeProvider: true,
				typeDefinitionProvider: true
			},
			customResults: {
				'hello': 'world'
			}
		};
		assert.deepEqual(client.initializeResult, expected);
	});

	test('Goto Definition', async () => {
		const provider = client.getFeature(lsclient.DefinitionRequest.method).getProvider(document);
		const result = (await provider.provideDefinition(document, position, tokenSource.token)) as vscode.Location;

		isInstanceOf(result, vscode.Location);
		uriEqual(result.uri, uri);
		rangeEqual(result.range, 0, 0, 0, 1);

		let middlewareCalled: boolean = false;
		middleware.provideDefinition = (document, position, token, next) => {
			middlewareCalled = true;
			return next(document, position, token);
		};
		await provider.provideDefinition(document, position, tokenSource.token);
		middleware.provideDefinition = undefined;
		assert.strictEqual(middlewareCalled, true);
	});

	test('Hover', async () => {
		const provider = client.getFeature(lsclient.HoverRequest.method).getProvider(document);
		const result = await provider.provideHover(document, position, tokenSource.token);

		isInstanceOf(result, vscode.Hover);
		assert.strictEqual(result.contents.length, 1);
		assert.strictEqual((result.contents[0] as vscode.MarkdownString).value, 'foo');

		let middlewareCalled: boolean = false;
		middleware.provideHover = (document, position, token, next) => {
			middlewareCalled = true;
			return next(document, position, token);
		};
		await provider.provideHover(document, position, tokenSource.token);
		middleware.provideHover = undefined;
		assert.strictEqual(middlewareCalled, true);
	});

	test('Completion', async () => {
		const provider = client.getFeature(lsclient.CompletionRequest.method).getProvider(document);
		const result = (await provider.provideCompletionItems(document, position, tokenSource.token, { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: ':' })) as vscode.CompletionItem[];

		isArray(result, vscode.CompletionItem);
		const item = result[0];
		assert.strictEqual(item.label, 'item');
		assert.strictEqual(item.insertText, 'text');
		assert.strictEqual(item.detail, undefined);
		isDefined(provider.resolveCompletionItem);

		const resolved = await provider.resolveCompletionItem(item, tokenSource.token);
		isDefined(resolved);
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
		await provider.provideCompletionItems(document, position, tokenSource.token, { triggerKind: vscode.CompletionTriggerKind.Invoke, triggerCharacter: ':' });
		await provider.resolveCompletionItem(item, tokenSource.token);
		middleware.provideCompletionItem = undefined;
		middleware.resolveCompletionItem = undefined;
		assert.strictEqual(middlewareCalled, 2);
	});

	test('SignatureHelpRequest', async () => {
		const provider = client.getFeature(lsclient.SignatureHelpRequest.method).getProvider(document);
		const result = await provider.provideSignatureHelp(document, position, tokenSource.token,
			{
				isRetrigger: false,
				triggerKind: lsclient.SignatureHelpTriggerKind.Invoked,
				triggerCharacter: ':'
			}
		);

		isInstanceOf(result, vscode.SignatureHelp);
		assert.strictEqual(result.activeSignature, 1);
		assert.strictEqual(result.activeParameter, 1);
		isArray(result.signatures, vscode.SignatureInformation);

		const signature = result.signatures[0];
		assert.strictEqual(signature.label, 'label');
		assert.strictEqual(signature.documentation, 'doc');
		isArray(signature.parameters, vscode.ParameterInformation);

		const parameter = signature.parameters[0];
		assert.strictEqual(parameter.label, 'label');
		assert.strictEqual(parameter.documentation, 'doc');

		let middlewareCalled: boolean = false;
		middleware.provideSignatureHelp = (d, p, c, t, n) => {
			middlewareCalled = true;
			return n(d, p, c, t);
		};
		await provider.provideSignatureHelp(document, position, tokenSource.token,
			{
				isRetrigger: false,
				triggerKind: lsclient.SignatureHelpTriggerKind.Invoked,
				triggerCharacter: ':'
			}
		);
		middleware.provideSignatureHelp = undefined;
		assert.ok(middlewareCalled);
	});

	test('References', async () => {
		const provider = client.getFeature(lsclient.ReferencesRequest.method).getProvider(document);
		const result = await provider.provideReferences(document, position, {
			includeDeclaration: true
		}, tokenSource.token);

		isArray(result, vscode.Location, 2);
		for (let i = 0; i < result.length; i++) {
			const location = result[i];
			rangeEqual(location.range, i, i, i ,i);
			assert.strictEqual(location.uri.toString(), document.uri.toString());
		}

		let middlewareCalled: boolean = false;
		middleware.provideReferences = (d, p, c, t, n) => {
			middlewareCalled = true;
			return n(d, p, c, t);
		};
		await provider.provideReferences(document, position, {
			includeDeclaration: true
		}, tokenSource.token);
		middleware.provideReferences = undefined;
		assert.ok(middlewareCalled);
	});

	test('Document Highlight', async () => {
		const provider = client.getFeature(lsclient.DocumentHighlightRequest.method).getProvider(document);
		const result = await provider.provideDocumentHighlights(document, position, tokenSource.token);

		isArray(result, vscode.DocumentHighlight, 1);

		const highlight = result[0];
		assert.strictEqual(highlight.kind, vscode.DocumentHighlightKind.Read);
		rangeEqual(highlight.range, 2, 2, 2, 2);

		let middlewareCalled: boolean = false;
		middleware.provideDocumentHighlights = (d, p, t, n) => {
			middlewareCalled = true;
			return n(d, p, t);
		};
		await provider.provideDocumentHighlights(document, position, tokenSource.token);
		middleware.provideDocumentHighlights = undefined;
		assert.ok(middlewareCalled);
	});

	test('Code Actions', async () => {
		const provider = client.getFeature(lsclient.CodeActionRequest.method).getProvider(document);
		const result = (await provider.provideCodeActions(document, range, {
			diagnostics: []
		}, tokenSource.token)) as vscode.CodeAction[];

		isArray(result, vscode.CodeAction);
		const action = result[0];
		assert.strictEqual(action.title, 'title');
		assert.strictEqual(action.command?.title, 'title');
		assert.strictEqual(action.command?.command, 'id');

		let middlewareCalled: boolean = false;
		middleware.provideCodeActions = (d, r, c, t, n) => {
			middlewareCalled = true;
			return n(d, r, c, t);
		};

		await provider.provideCodeActions(document, range, { diagnostics: [] }, tokenSource.token);
		middleware.provideCodeActions = undefined;
		assert.ok(middlewareCalled);
	});

	test('Document Formatting', async () => {
		const provider = client.getFeature(lsclient.DocumentFormattingRequest.method).getProvider(document);
		const result = await provider.provideDocumentFormattingEdits(document, { tabSize: 4, insertSpaces: false }, tokenSource.token);

		isArray(result, vscode.TextEdit);
		const edit = result[0];
		assert.strictEqual(edit.newText, 'insert');
		rangeEqual(edit.range, 0, 0, 0, 0);

		let middlewareCalled: boolean = true;
		middleware.provideDocumentFormattingEdits = (d, c, t, n) => {
			middlewareCalled = true;
			return n(d, c, t);
		};
		await provider.provideDocumentFormattingEdits(document, { tabSize: 4, insertSpaces: false }, tokenSource.token);
		middleware.provideDocumentFormattingEdits = undefined;
		assert.ok(middlewareCalled);
	});

	test('Document Range Formatting', async () => {
		const provider = client.getFeature(lsclient.DocumentRangeFormattingRequest.method).getProvider(document);
		const result = await provider.provideDocumentRangeFormattingEdits(document, range, { tabSize: 4, insertSpaces: false }, tokenSource.token);

		isArray(result, vscode.TextEdit);
		const edit = result[0];
		assert.strictEqual(edit.newText, '');
		rangeEqual(edit.range, 1, 1, 1, 2);

		let middlewareCalled: boolean = true;
		middleware.provideDocumentRangeFormattingEdits = (d, r, c, t, n) => {
			middlewareCalled = true;
			return n(d, r, c, t);
		};
		await provider.provideDocumentRangeFormattingEdits(document, range, { tabSize: 4, insertSpaces: false }, tokenSource.token);
		middleware.provideDocumentFormattingEdits = undefined;
		assert.ok(middlewareCalled);
	});

	test('Document on Type Formatting', async () => {
		const provider = client.getFeature(lsclient.DocumentOnTypeFormattingRequest.method).getProvider(document);
		const result = await provider.provideOnTypeFormattingEdits(document, position, 'a', { tabSize: 4, insertSpaces: false }, tokenSource.token);

		isArray(result, vscode.TextEdit);
		const edit = result[0];
		assert.strictEqual(edit.newText, 'replace');
		rangeEqual(edit.range, 2, 2, 2, 3);

		let middlewareCalled: boolean = true;
		middleware.provideOnTypeFormattingEdits = (d, p, s, c, t, n) => {
			middlewareCalled = true;
			return n(d, p, s, c, t);
		};
		await provider.provideOnTypeFormattingEdits(document, position, 'a', { tabSize: 4, insertSpaces: false }, tokenSource.token);
		middleware.provideDocumentFormattingEdits = undefined;
		assert.ok(middlewareCalled);
	});

	test('Rename', async () => {
		const provider = client.getFeature(lsclient.RenameRequest.method).getProvider(document);
		isDefined(provider.prepareRename);
		const prepareResult = await provider.prepareRename(document, position, tokenSource.token) as vscode.Range;

		isInstanceOf(prepareResult, vscode.Range);
		rangeEqual(prepareResult, 1, 1, 1, 2);

		const renameResult = await provider.provideRenameEdits(document, position, 'newName', tokenSource.token);
		isInstanceOf(renameResult, vscode.WorkspaceEdit);

		let middlewareCalled: number = 0;
		middleware.prepareRename = (d, p, t, n) => {
			middlewareCalled++;
			return n(d, p, t);
		};
		await provider.prepareRename(document, position, tokenSource.token);
		middleware.prepareRename = undefined;
		middleware.provideRenameEdits = (d, p, w, t, n) => {
			middlewareCalled++;
			return n(d, p, w, t);
		};
		await provider.provideRenameEdits(document, position, 'newName', tokenSource.token);
		middleware.provideRenameEdits = undefined;
		assert.strictEqual(middlewareCalled, 2);
	});

	test('Document Link', async () => {
		const provider = client.getFeature(lsclient.DocumentLinkRequest.method).getProvider(document);
		const result = await provider.provideDocumentLinks(document, tokenSource.token);

		isArray(result, vscode.DocumentLink);
		const documentLink = result[0];
		rangeEqual(documentLink.range, 1, 1, 1, 2);

		let middlewareCalled: number = 0;
		middleware.provideDocumentLinks = (d, t, n) => {
			middlewareCalled++;
			return n(d, t);
		};
		await provider.provideDocumentLinks(document, tokenSource.token);
		middleware.provideDocumentLinks = undefined;

		isDefined(provider.resolveDocumentLink);
		const resolved = await provider.resolveDocumentLink(documentLink, tokenSource.token);
		isInstanceOf(resolved, vscode.DocumentLink);
		isDefined(resolved.target);
		assert.strictEqual(resolved.target.toString(), vscode.Uri.file('/target.txt').toString());

		middleware.resolveDocumentLink = (i, t, n) => {
			middlewareCalled++;
			return n(i, t);
		};
		await provider.resolveDocumentLink(documentLink, tokenSource.token);
		middleware.resolveDocumentLink = undefined;
		assert.strictEqual(middlewareCalled, 2);
	});

	test('Document Color', async () => {
		const provider = client.getFeature(lsclient.DocumentColorRequest.method).getProvider(document);
		const colors = await provider.provideDocumentColors(document, tokenSource.token);

		isArray(colors, vscode.ColorInformation);
		const color = colors[0];

		rangeEqual(color.range, 1, 1, 1, 2);
		colorEqual(color.color, 1, 2, 3, 4);

		let middlewareCalled: number = 0;
		middleware.provideDocumentColors = (d, t, n) => {
			middlewareCalled++;
			return n(d, t);
		};
		await provider.provideDocumentColors(document, tokenSource.token);
		middleware.provideDocumentColors = undefined;

		const presentations = await provider.provideColorPresentations(color.color, { document, range}, tokenSource.token);

		isArray(presentations, vscode.ColorPresentation);
		const presentation = presentations[0];
		assert.strictEqual(presentation.label, 'label');

		middleware.provideColorPresentations = (c, x, t, n) => {
			middlewareCalled++;
			return n(c, x, t);
		};
		await provider.provideColorPresentations(color.color, { document, range}, tokenSource.token);
		middleware.provideColorPresentations = undefined;
		assert.strictEqual(middlewareCalled, 2);
	});

	test('Goto Declaration', async () => {
		const provider = client.getFeature(lsclient.DeclarationRequest.method).getProvider(document);
		const result = (await provider.provideDeclaration(document, position, tokenSource.token)) as vscode.Location;

		isInstanceOf(result, vscode.Location);
		uriEqual(result.uri, uri);
		rangeEqual(result.range, 1, 1, 1, 2);

		let middlewareCalled: boolean = false;
		middleware.provideDeclaration = (document, position, token, next) => {
			middlewareCalled = true;
			return next(document, position, token);
		};
		await provider.provideDeclaration(document, position, tokenSource.token);
		middleware.provideDeclaration = undefined;
		assert.strictEqual(middlewareCalled, true);
	});

	test('Folding Ranges', async () => {
		const provider = client.getFeature(lsclient.FoldingRangeRequest.method).getProvider(document);
		const result = (await provider.provideFoldingRanges(document, {}, tokenSource.token));

		isArray(result, vscode.FoldingRange, 1);
		const range = result[0];
		assert.strictEqual(range.start, 1);
		assert.strictEqual(range.end, 2);

		let middlewareCalled: boolean = true;
		middleware.provideFoldingRanges = (d, c, t, n) => {
			middlewareCalled = true;
			return n(d, c, t);
		};
		await provider.provideFoldingRanges(document, {}, tokenSource.token);
		middleware.provideFoldingRanges = undefined;
		assert.ok(middlewareCalled);
	});

	test('Goto Implementation', async () => {
		const provider = client.getFeature(lsclient.ImplementationRequest.method).getProvider(document);
		const result = (await provider.provideImplementation(document, position, tokenSource.token)) as vscode.Location;

		isInstanceOf(result, vscode.Location);
		uriEqual(result.uri, uri);
		rangeEqual(result.range, 2, 2, 3, 3);

		let middlewareCalled: boolean = false;
		middleware.provideImplementation = (document, position, token, next) => {
			middlewareCalled = true;
			return next(document, position, token);
		};
		await provider.provideImplementation(document, position, tokenSource.token);
		middleware.provideImplementation = undefined;
		assert.strictEqual(middlewareCalled, true);
	});

	test('Selection Range', async () => {
		const provider = client.getFeature(lsclient.SelectionRangeRequest.method).getProvider(document);
		const result = (await provider.provideSelectionRanges(document, [position], tokenSource.token));

		isArray(result, vscode.SelectionRange, 1);
		const range = result[0];
		rangeEqual(range.range, 1, 2, 3, 4);
		let middlewareCalled: boolean = true;
		middleware.provideSelectionRanges = (d, p, t, n) => {
			middlewareCalled = true;
			return n(d, p, t);
		};
		await provider.provideSelectionRanges(document, [position], tokenSource.token);
		middleware.provideSelectionRanges = undefined;
		assert.strictEqual(middlewareCalled, true);
	});

	test('Type Definition', async() => {
		const provider = client.getFeature(lsclient.TypeDefinitionRequest.method).getProvider(document);
		const result = (await provider.provideTypeDefinition(document, position, tokenSource.token)) as vscode.Location;

		isInstanceOf(result, vscode.Location);
		uriEqual(result.uri, uri);
		rangeEqual(result.range, 2, 2, 3, 3);

		let middlewareCalled: boolean = false;
		middleware.provideTypeDefinition = (document, position, token, next) => {
			middlewareCalled = true;
			return next(document, position, token);
		};
		await provider.provideTypeDefinition(document, position, tokenSource.token);
		middleware.provideTypeDefinition = undefined;
		assert.strictEqual(middlewareCalled, true);
	});
});