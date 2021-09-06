/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import * as lsclient from 'vscode-languageclient/node';

import { vsdiag, DiagnosticProviderMiddleware } from 'vscode-languageclient/lib/common/proposed.diagnostic';

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

	function isArray<T>(value: Array<T> | undefined | null, clazz: any = undefined, length: number = 1): asserts value is Array<T> {
		assert.ok(Array.isArray(value), `value is array`);
		assert.strictEqual(value!.length, length, 'value has given length');
		if (clazz !== undefined && length > 0) {
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

	function isFullDocumentDiagnosticReport(value: vsdiag.DocumentDiagnosticReport): asserts value is vsdiag.FullDocumentDiagnosticReport {
		assert.ok(value.kind === vsdiag.DocumentDiagnosticReportKind.full);
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
					'REM .txt extension from c:\source to c:\text',
					'REM %%f is a variable',
					'FOR %%f IN (*.jpg *.png *.bmp) DO XCOPY C:\source\"%%f" c:\images /m /y',
					'REM This moves any files with a .jpg, .png,',
					'REM or .bmp extension from c:\source to c:\images;;',
				].join('\n');
			}
		});

		uri = vscode.Uri.parse('lsptests://localhost/test.bat');
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
		client.registerProposedFeatures();
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
				codeActionProvider: {
					resolveProvider: true
				},
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
				inlineValuesProvider: {},
				typeDefinitionProvider: true,
				callHierarchyProvider: true,
				semanticTokensProvider: {
					legend: {
						tokenTypes: [],
						tokenModifiers: []
					},
					range: true,
					full: {
						delta: true
					}
				},
				workspace: {
					fileOperations: {
						didCreate: { filters: [{ scheme: 'file', pattern: { glob: '**/created-static/**{/,/*.txt}' } }] },
						didRename: {
							filters: [
								{ scheme: 'file', pattern: { glob: '**/renamed-static/**/', matches: 'folder' } },
								{ scheme: 'file', pattern: { glob: '**/renamed-static/**/*.txt', matches: 'file' } }
							]
						},
						didDelete: { filters: [{ scheme: 'file', pattern: { glob: '**/deleted-static/**{/,/*.txt}' } }] },
						willCreate: { filters: [{ scheme: 'file', pattern: { glob: '**/created-static/**{/,/*.txt}' } }] },
						willRename: {
							filters: [
								{ scheme: 'file', pattern: { glob: '**/renamed-static/**/', matches: 'folder' } },
								{ scheme: 'file', pattern: { glob: '**/renamed-static/**/*.txt', matches: 'file' } }
							]
						},
						willDelete: { filters: [ {scheme: 'file', pattern: { glob: '**/deleted-static/**{/,/*.txt}' } }] },
					},
				},
				linkedEditingRangeProvider: true,
				diagnosticProvider: {
					identifier: 'da348dc5-c30a-4515-9d98-31ff3be38d14',
					interFileDependencies: true,
					workspaceDiagnostics: true
				}
			},
			customResults: {
				'hello': 'world'
			}
		};
		assert.deepEqual(client.initializeResult, expected);
	});

	test('Goto Definition', async () => {
		const provider = client.getFeature(lsclient.DefinitionRequest.method).getProvider(document);
		isDefined(provider);
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
		isDefined(provider);
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
		isDefined(provider);
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
		isDefined(provider);
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
		isDefined(provider);
		const result = await provider.provideReferences(document, position, {
			includeDeclaration: true
		}, tokenSource.token);

		isArray(result, vscode.Location, 2);
		for (let i = 0; i < result.length; i++) {
			const location = result[i];
			rangeEqual(location.range, i, i, i, i);
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
		isDefined(provider);
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
		isDefined(provider);
		const result = (await provider.provideCodeActions(document, range, {
			diagnostics: [],
			triggerKind: vscode.CodeActionTriggerKind.Invoke
		}, tokenSource.token)) as vscode.CodeAction[];

		isArray(result, vscode.CodeAction);
		const action = result[0];
		assert.strictEqual(action.title, 'title');
		assert.strictEqual(action.command?.title, 'title');
		assert.strictEqual(action.command?.command, 'id');

		const resolved = (await provider.resolveCodeAction!(result[0], tokenSource.token));
		assert.strictEqual(resolved?.title, 'resolved');

		let middlewareCalled: boolean = false;
		middleware.provideCodeActions = (d, r, c, t, n) => {
			middlewareCalled = true;
			return n(d, r, c, t);
		};

		await provider.provideCodeActions(document, range, { diagnostics: [], triggerKind: vscode.CodeActionTriggerKind.Invoke }, tokenSource.token);
		middleware.provideCodeActions = undefined;
		assert.ok(middlewareCalled);

		middlewareCalled = false;
		middleware.resolveCodeAction = (c, t, n) => {
			middlewareCalled = true;
			return n(c, t);
		};
		await provider.resolveCodeAction!(result[0], tokenSource.token);
		middleware.resolveCodeAction = undefined;
		assert.ok(middlewareCalled);
	});

	test('Progress', async () => {
		const progressToken = 'TEST-PROGRESS-TOKEN';
		const middlewareEvents: Array<lsclient.WorkDoneProgressBegin | lsclient.WorkDoneProgressReport | lsclient.WorkDoneProgressEnd> = [];
		let currentProgressResolver: (value: unknown) => void | undefined;

		// Set up middleware that calls the current resolve function when it gets its 'end' progress event.
		middleware.handleWorkDoneProgress = (token: lsclient.ProgressToken, params, next) => {
			if (token === progressToken) {
				middlewareEvents.push(params);
				if (params.kind === 'end') {
					setImmediate(currentProgressResolver);
				}
			}
			return next(token, params);
		};

		// Trigger multiple sample progress events.
		for (let i = 0; i < 2; i++) {
			await new Promise<unknown>((resolve) => {
				currentProgressResolver = resolve;
				void client.sendRequest(
					new lsclient.ProtocolRequestType<any, null, never, any, any>('testing/sendSampleProgress'),
					{},
					tokenSource.token,
				);
			});
		}

		middleware.handleWorkDoneProgress = undefined;

		// Ensure all events were handled.
		assert.deepStrictEqual(
			middlewareEvents.map((p) => p.kind),
			['begin', 'report', 'end', 'begin', 'report', 'end'],
		);
	});

	test('Document Formatting', async () => {
		const provider = client.getFeature(lsclient.DocumentFormattingRequest.method).getProvider(document);
		isDefined(provider);
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
		isDefined(provider);
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
		isDefined(provider);
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
		isDefined(provider);
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
		isDefined(provider);
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
		isDefined(provider);
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

		const presentations = await provider.provideColorPresentations(color.color, { document, range }, tokenSource.token);

		isArray(presentations, vscode.ColorPresentation);
		const presentation = presentations[0];
		assert.strictEqual(presentation.label, 'label');

		middleware.provideColorPresentations = (c, x, t, n) => {
			middlewareCalled++;
			return n(c, x, t);
		};
		await provider.provideColorPresentations(color.color, { document, range }, tokenSource.token);
		middleware.provideColorPresentations = undefined;
		assert.strictEqual(middlewareCalled, 2);
	});

	test('Goto Declaration', async () => {
		const provider = client.getFeature(lsclient.DeclarationRequest.method).getProvider(document);
		isDefined(provider);
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
		isDefined(provider);
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
		isDefined(provider);
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
		isDefined(provider);
		const result = (await provider.provideSelectionRanges(document, [position], tokenSource.token));

		isArray(result, vscode.SelectionRange, 1);
		const range = result[0];
		rangeEqual(range.range, 1, 2, 3, 4);
		let middlewareCalled: boolean = false;
		middleware.provideSelectionRanges = (d, p, t, n) => {
			middlewareCalled = true;
			return n(d, p, t);
		};
		await provider.provideSelectionRanges(document, [position], tokenSource.token);
		middleware.provideSelectionRanges = undefined;
		assert.strictEqual(middlewareCalled, true);
	});

	test('Inline Values', async () => {
		const provider = client.getFeature(lsclient.InlineValuesRequest.method).getProvider(document);
		isDefined(provider);
		const results = (await provider.provideInlineValues(document, range, { frameId: 1, stoppedLocation: range }, tokenSource.token));

		isArray(results, undefined, 3);

		for (const r of results) {
			rangeEqual(r.range, 1, 2, 3, 4);
		}

		assert.ok(results[0] instanceof vscode.InlineValueText);
		assert.strictEqual((results[0] as vscode.InlineValueText).text, 'text');

		assert.ok(results[1] instanceof vscode.InlineValueVariableLookup);
		assert.strictEqual((results[1] as vscode.InlineValueVariableLookup).variableName, 'variableName');

		assert.ok(results[2] instanceof vscode.InlineValueEvaluatableExpression);
		assert.strictEqual((results[2] as vscode.InlineValueEvaluatableExpression).expression, 'expression');

		let middlewareCalled: boolean = false;
		middleware.provideInlineValues = (d, r, c, t, n) => {
			middlewareCalled = true;
			return n(d, r, c, t);
		};
		await provider.provideInlineValues(document, range, { frameId: 1, stoppedLocation: range }, tokenSource.token);
		middleware.provideInlineValues = undefined;
		assert.strictEqual(middlewareCalled, true);
	});

	test('Type Definition', async () => {
		const provider = client.getFeature(lsclient.TypeDefinitionRequest.method).getProvider(document);
		isDefined(provider);
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

	test('Call Hierarchy', async () => {
		const provider = client.getFeature(lsclient.CallHierarchyPrepareRequest.method).getProvider(document);
		isDefined(provider);
		const result = (await provider.prepareCallHierarchy(document, position, tokenSource.token)) as vscode.CallHierarchyItem[];

		isArray(result, vscode.CallHierarchyItem, 1);
		const item = result[0];

		let middlewareCalled: boolean = false;
		middleware.prepareCallHierarchy = (d, p, t, n) => {
			middlewareCalled = true;
			return n(d, p, t);
		};
		await provider.prepareCallHierarchy(document, position, tokenSource.token);
		middleware.prepareCallHierarchy = undefined;
		assert.strictEqual(middlewareCalled, true);

		const incoming = (await provider.provideCallHierarchyIncomingCalls(item, tokenSource.token)) as vscode.CallHierarchyIncomingCall[];
		isArray(incoming, vscode.CallHierarchyIncomingCall, 1);
		middlewareCalled = false;
		middleware.provideCallHierarchyIncomingCalls = (i, t, n) => {
			middlewareCalled = true;
			return n(i, t);
		};
		await provider.provideCallHierarchyIncomingCalls(item, tokenSource.token);
		middleware.provideCallHierarchyIncomingCalls = undefined;
		assert.strictEqual(middlewareCalled, true);

		const outgoing = (await provider.provideCallHierarchyOutgoingCalls(item, tokenSource.token)) as vscode.CallHierarchyOutgoingCall[];
		isArray(outgoing, vscode.CallHierarchyOutgoingCall, 1);
		middlewareCalled = false;
		middleware.provideCallHierarchyOutgoingCalls = (i, t, n) => {
			middlewareCalled = true;
			return n(i, t);
		};
		await provider.provideCallHierarchyOutgoingCalls(item, tokenSource.token);
		middleware.provideCallHierarchyOutgoingCalls = undefined;
		assert.strictEqual(middlewareCalled, true);
	});

	suite('File Operations', () => {
		const referenceFileUri = vscode.Uri.parse('/dummy-edit');
		function ensureReferenceEdit(edits: vscode.WorkspaceEdit, type: string, expectedLines: string[]) {
			// Ensure the edits are as expected.
			assert.strictEqual(edits.size, 1);
			assert.strictEqual(edits.has(referenceFileUri), true);
			const edit = edits.get(referenceFileUri);
			assert.strictEqual(edit.length, 1);
			assert.strictEqual(edit[0].newText.trim(), `${type}:\n${expectedLines.join('\n')}`.trim());
		}

		async function ensureNotificationReceived(type: string, params: any) {
			const result = await client.sendRequest(
				new lsclient.ProtocolRequestType<any, any, never, any, any>('testing/lastFileOperationRequest'),
				{},
				tokenSource.token,
			);
			assert.deepStrictEqual(result, {
				type,
				params
			});
		}

		const createFiles = [
			'/my/file.txt',
			'/my/file.js',
			'/my/folder/',
			// Static registration for tests is [operation]-static and *.txt
			'/my/created-static/file.txt',
			'/my/created-static/file.js',
			'/my/created-static/folder/',
			// Dynamic registration for tests is [operation]-dynamic and *.js
			'/my/created-dynamic/file.txt',
			'/my/created-dynamic/file.js',
			'/my/created-dynamic/folder/',
		].map((p) => vscode.Uri.file(p));

		const renameFiles = [
			['/my/file.txt', '/my-new/file.txt'],
			['/my/file.js', '/my-new/file.js'],
			['/my/folder/', '/my-new/folder/'],
			// Static registration for tests is [operation]-static and *.txt
			['/my/renamed-static/file.txt', '/my-new/renamed-static/file.txt'],
			['/my/renamed-static/file.js', '/my-new/renamed-static/file.js'],
			['/my/renamed-static/folder/', '/my-new/renamed-static/folder/'],
			// Dynamic registration for tests is [operation]-dynamic and *.js
			['/my/renamed-dynamic/file.txt', '/my-new/renamed-dynamic/file.txt'],
			['/my/renamed-dynamic/file.js', '/my-new/renamed-dynamic/file.js'],
			['/my/renamed-dynamic/folder/', '/my-new/renamed-dynamic/folder/'],
		].map(([o, n]) => ({ oldUri: vscode.Uri.file(o), newUri: vscode.Uri.file(n) }));

		const deleteFiles = [
			'/my/file.txt',
			'/my/file.js',
			'/my/folder/',
			// Static registration for tests is [operation]-static and *.txt
			'/my/deleted-static/file.txt',
			'/my/deleted-static/file.js',
			'/my/deleted-static/folder/',
			// Dynamic registration for tests is [operation]-dynamic and *.js
			'/my/deleted-dynamic/file.txt',
			'/my/deleted-dynamic/file.js',
			'/my/deleted-dynamic/folder/',
		].map((p) => vscode.Uri.file(p));

		test('Will Create Files', async () => {
			const feature = client.getFeature(lsclient.WillCreateFilesRequest.method);
			isDefined(feature);

			const sendCreateRequest = () => new Promise<vscode.WorkspaceEdit>(async (resolve, reject) => {
				await feature.send({ files: createFiles, waitUntil: resolve });
				// If feature.send didn't call waitUntil synchronously then something went wrong.
				reject(new Error('Feature unexpectedly did not call waitUntil synchronously'));
			});

			// Send the event and ensure the server responds with an edit referencing the
			// correct files.
			let edits = await sendCreateRequest();
			ensureReferenceEdit(
				edits,
				'WILL CREATE',
				[
					'file:///my/created-static/file.txt',
					'file:///my/created-static/folder/',
					'file:///my/created-dynamic/file.js',
					'file:///my/created-dynamic/folder/',
				],
			);

			// Add middleware that strips out any folders.
			middleware.workspace = middleware.workspace || {};
			middleware.workspace.willCreateFiles = (event, next) => next({
				...event,
				files: event.files.filter((f) => !f.path.endsWith('/')),
			});

			// Ensure we get the same results minus the folders that the middleware removed.
			edits = await sendCreateRequest();
			ensureReferenceEdit(
				edits,
				'WILL CREATE',
				[
					'file:///my/created-static/file.txt',
					'file:///my/created-dynamic/file.js',
				],
			);

			middleware.workspace.willCreateFiles = undefined;
		});

		test('Did Create Files', async () => {
			const feature = client.getFeature(lsclient.DidCreateFilesNotification.method);
			isDefined(feature);

			// Send the event and ensure the server reports the notification was sent.
			await feature.send({ files: createFiles });
			await ensureNotificationReceived(
				'create',
				{
					files: [
						{ uri: 'file:///my/created-static/file.txt' },
						{ uri: 'file:///my/created-static/folder/' },
						{ uri: 'file:///my/created-dynamic/file.js' },
						{ uri: 'file:///my/created-dynamic/folder/' },
					],
				},
			);

			// Add middleware that strips out any folders.
			middleware.workspace = middleware.workspace || {};
			middleware.workspace.didCreateFiles = (event, next) => next({
				files: event.files.filter((f) => !f.path.endsWith('/')),
			});

			// Ensure we get the same results minus the folders that the middleware removed.
			await feature.send({ files: createFiles });
			await ensureNotificationReceived(
				'create',
				{
					files: [
						{ uri: 'file:///my/created-static/file.txt' },
						{ uri: 'file:///my/created-dynamic/file.js' },
					],
				},
			);

			middleware.workspace.didCreateFiles = undefined;
		});

		test('Will Rename Files', async () => {
			const feature = client.getFeature(lsclient.WillRenameFilesRequest.method);
			isDefined(feature);

			const sendRenameRequest = () => new Promise<vscode.WorkspaceEdit>(async (resolve, reject) => {
				await feature.send({ files: renameFiles, waitUntil: resolve });
				// If feature.send didn't call waitUntil synchronously then something went wrong.
				reject(new Error('Feature unexpectedly did not call waitUntil synchronously'));
			});

			// Send the event and ensure the server responds with an edit referencing the
			// correct files.
			let edits = await sendRenameRequest();
			ensureReferenceEdit(
				edits,
				'WILL RENAME',
				[
					'file:///my/renamed-static/file.txt -> file:///my-new/renamed-static/file.txt',
					'file:///my/renamed-static/folder/ -> file:///my-new/renamed-static/folder/',
					'file:///my/renamed-dynamic/file.js -> file:///my-new/renamed-dynamic/file.js',
					'file:///my/renamed-dynamic/folder/ -> file:///my-new/renamed-dynamic/folder/',
				],
			);

			// Add middleware that strips out any folders.
			middleware.workspace = middleware.workspace || {};
			middleware.workspace.willRenameFiles = (event, next) => next({
				...event,
				files: event.files.filter((f) => !f.oldUri.path.endsWith('/')),
			});

			// Ensure we get the same results minus the folders that the middleware removed.
			edits = await sendRenameRequest();
			ensureReferenceEdit(
				edits,
				'WILL RENAME',
				[
					'file:///my/renamed-static/file.txt -> file:///my-new/renamed-static/file.txt',
					'file:///my/renamed-dynamic/file.js -> file:///my-new/renamed-dynamic/file.js',
				],
			);

			middleware.workspace.willRenameFiles = undefined;
		});

		test('Did Rename Files', async () => {
			const feature = client.getFeature(lsclient.DidRenameFilesNotification.method);
			isDefined(feature);

			// Send the event and ensure the server reports the notification was sent.
			await feature.send({ files: renameFiles });
			await ensureNotificationReceived(
				'rename',
				{
					files: [
						{ oldUri: 'file:///my/renamed-static/file.txt', newUri: 'file:///my-new/renamed-static/file.txt' },
						{ oldUri: 'file:///my/renamed-static/folder/', newUri: 'file:///my-new/renamed-static/folder/' },
						{ oldUri: 'file:///my/renamed-dynamic/file.js', newUri: 'file:///my-new/renamed-dynamic/file.js' },
						{ oldUri: 'file:///my/renamed-dynamic/folder/', newUri: 'file:///my-new/renamed-dynamic/folder/' },
					],
				},
			);

			// Add middleware that strips out any folders.
			middleware.workspace = middleware.workspace || {};
			middleware.workspace.didRenameFiles = (event, next) => next({
				files: event.files.filter((f) => !f.oldUri.path.endsWith('/')),
			});

			// Ensure we get the same results minus the folders that the middleware removed.
			await feature.send({ files: renameFiles });
			await ensureNotificationReceived(
				'rename',
				{
					files: [
						{ oldUri: 'file:///my/renamed-static/file.txt', newUri: 'file:///my-new/renamed-static/file.txt' },
						{ oldUri: 'file:///my/renamed-dynamic/file.js', newUri: 'file:///my-new/renamed-dynamic/file.js' },
					],
				},
			);

			middleware.workspace.didRenameFiles = undefined;
		});

		test('Will Delete Files', async () => {
			const feature = client.getFeature(lsclient.WillDeleteFilesRequest.method);
			isDefined(feature);

			const sendDeleteRequest = () => new Promise<vscode.WorkspaceEdit>(async (resolve, reject) => {
				await feature.send({ files: deleteFiles, waitUntil: resolve });
				// If feature.send didn't call waitUntil synchronously then something went wrong.
				reject(new Error('Feature unexpectedly did not call waitUntil synchronously'));
			});

			// Send the event and ensure the server responds with an edit referencing the
			// correct files.
			let edits = await sendDeleteRequest();
			ensureReferenceEdit(
				edits,
				'WILL DELETE',
				[
					'file:///my/deleted-static/file.txt',
					'file:///my/deleted-static/folder/',
					'file:///my/deleted-dynamic/file.js',
					'file:///my/deleted-dynamic/folder/',
				],
			);

			// Add middleware that strips out any folders.
			middleware.workspace = middleware.workspace || {};
			middleware.workspace.willDeleteFiles = (event, next) => next({
				...event,
				files: event.files.filter((f) => !f.path.endsWith('/')),
			});

			// Ensure we get the same results minus the folders that the middleware removed.
			edits = await sendDeleteRequest();
			ensureReferenceEdit(
				edits,
				'WILL DELETE',
				[
					'file:///my/deleted-static/file.txt',
					'file:///my/deleted-dynamic/file.js',
				],
			);

			middleware.workspace.willDeleteFiles = undefined;
		});

		test('Did Delete Files', async () => {
			const feature = client.getFeature(lsclient.DidDeleteFilesNotification.method);
			isDefined(feature);

			// Send the event and ensure the server reports the notification was sent.
			await feature.send({ files: deleteFiles });
			await ensureNotificationReceived(
				'delete',
				{
					files: [
						{ uri: 'file:///my/deleted-static/file.txt' },
						{ uri: 'file:///my/deleted-static/folder/' },
						{ uri: 'file:///my/deleted-dynamic/file.js' },
						{ uri: 'file:///my/deleted-dynamic/folder/' },
					],
				},
			);

			// Add middleware that strips out any folders.
			middleware.workspace = middleware.workspace || {};
			middleware.workspace.didDeleteFiles = (event, next) => next({
				files: event.files.filter((f) => !f.path.endsWith('/')),
			});

			// Ensure we get the same results minus the folders that the middleware removed.
			await feature.send({ files: deleteFiles });
			await ensureNotificationReceived(
				'delete',
				{
					files: [
						{ uri: 'file:///my/deleted-static/file.txt' },
						{ uri: 'file:///my/deleted-dynamic/file.js' },
					],
				},
			);

			middleware.workspace.didDeleteFiles = undefined;
		});
	});

	test('Semantic Tokens', async () => {
		const provider = client.getFeature(lsclient.SemanticTokensRegistrationType.method).getProvider(document);
		const rangeProvider = provider?.range;
		isDefined(rangeProvider);
		const rangeResult = (await rangeProvider.provideDocumentRangeSemanticTokens(document, range, tokenSource.token)) as vscode.SemanticTokens;
		assert.ok(rangeResult !== undefined);

		let middlewareCalled: boolean = false;
		middleware.provideDocumentRangeSemanticTokens = (d, r, t, n) => {
			middlewareCalled = true;
			return n(d, r, t);
		};
		await rangeProvider.provideDocumentRangeSemanticTokens(document, range, tokenSource.token);
		middleware.provideDocumentRangeSemanticTokens = undefined;
		assert.strictEqual(middlewareCalled, true);

		const fullProvider = provider?.full;
		isDefined(fullProvider);
		const fullResult = (await fullProvider.provideDocumentSemanticTokens(document, tokenSource.token)) as vscode.SemanticTokens;
		assert.ok(fullResult !== undefined);

		middlewareCalled = false;
		middleware.provideDocumentSemanticTokens = (d, t, n) => {
			middlewareCalled = true;
			return n(d, t);
		};
		await fullProvider.provideDocumentSemanticTokens(document, tokenSource.token);
		middleware.provideDocumentSemanticTokens = undefined;
		assert.strictEqual(middlewareCalled, true);

		middlewareCalled = false;
		middleware.provideDocumentSemanticTokensEdits = (d, i, t, n) => {
			middlewareCalled = true;
			return n(d, i, t);
		};
		await fullProvider.provideDocumentSemanticTokensEdits!(document, '2', tokenSource.token);
		middleware.provideDocumentSemanticTokensEdits = undefined;
		assert.strictEqual(middlewareCalled, true);
	});
	test('Linked Editing Ranges', async () => {
		const provider = client.getFeature(lsclient.LinkedEditingRangeRequest.method).getProvider(document);
		isDefined(provider);
		const result = (await provider.provideLinkedEditingRanges(document, position, tokenSource.token)) as vscode.LinkedEditingRanges;

		isInstanceOf(result, vscode.LinkedEditingRanges);
		isArray(result.ranges, vscode.Range, 1);
		rangeEqual(result.ranges[0], 1, 1, 1, 1);

		let middlewareCalled: boolean = false;
		middleware.provideLinkedEditingRange = (document, position, token, next) => {
			middlewareCalled = true;
			return next(document, position, token);
		};
		await provider.provideLinkedEditingRanges(document, position, tokenSource.token);
		middleware.provideTypeDefinition = undefined;
		assert.strictEqual(middlewareCalled, true);
	});

	test('Document diagnostic pull', async () => {
		const provider = client.getFeature(lsclient.Proposed.DocumentDiagnosticRequest.method).getProvider(document);
		isDefined(provider);
		const result: vsdiag.DocumentDiagnosticReport | undefined | null = (await provider.diagnostics.provideDiagnostics(document, undefined, tokenSource.token));
		isDefined(result);
		isFullDocumentDiagnosticReport(result);
		isArray(result.items, undefined, 1);
		const diag = result.items[0];
		rangeEqual(diag.range, 1, 1, 1, 1);
		assert.strictEqual(diag.message, 'diagnostic');

		let middlewareCalled: boolean = false;
		(middleware as DiagnosticProviderMiddleware).provideDiagnostics = (document, previousResultId, token, next) => {
			middlewareCalled = true;
			return next(document, previousResultId, token);
		};
		await provider.diagnostics.provideDiagnostics(document, undefined, tokenSource.token);
		(middleware as DiagnosticProviderMiddleware).provideDiagnostics = undefined;
		assert.strictEqual(middlewareCalled, true);
	});

	test('Workspace diagnostic pull', async () => {
		const provider = client.getFeature(lsclient.Proposed.DocumentDiagnosticRequest.method).getProvider(document);
		isDefined(provider);
		isDefined(provider.diagnostics.provideWorkspaceDiagnostics);
		await provider.diagnostics.provideWorkspaceDiagnostics([], tokenSource.token, (result) => {
			isDefined(result);
			isArray(result.items, undefined, 1);
		});

		let middlewareCalled: boolean = false;
		(middleware as DiagnosticProviderMiddleware).provideWorkspaceDiagnostics = (resultIds, token, reporter, next) => {
			middlewareCalled = true;
			return next(resultIds, token, reporter);
		};
		await provider.diagnostics.provideWorkspaceDiagnostics([], tokenSource.token, () => {});
		(middleware as DiagnosticProviderMiddleware).provideWorkspaceDiagnostics = undefined;
		assert.strictEqual(middlewareCalled, true);
	});

	test('Stop fails if server crashes after shutdown request', async () => {
		let serverOptions: lsclient.ServerOptions = {
			module: path.join(__dirname, './servers/crashOnShutdownServer.js'),
			transport: lsclient.TransportKind.ipc,
		};
		let clientOptions: lsclient.LanguageClientOptions = {};
		let client = new lsclient.LanguageClient('test svr', 'Test Language Server', serverOptions, clientOptions);
		client.start();
		await client.onReady();

		await assert.rejects(async () => {
			await client.stop();
		}, /Connection got disposed/);
		assert.strictEqual(client.needsStart(), true);
		assert.strictEqual(client.needsStop(), false);

		// Stopping again should be a no-op.
		await client.stop();
		assert.strictEqual(client.needsStart(), true);
		assert.strictEqual(client.needsStop(), false);
	});
});
