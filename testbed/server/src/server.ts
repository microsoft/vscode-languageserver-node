/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import * as _fs from 'fs';
const fs = _fs.promises;

import { URI } from 'vscode-uri';

import {
	CodeAction, CodeActionKind, Command, CompletionItem, createConnection, CreateFile, DeclarationLink,
	Definition, DefinitionLink, Diagnostic, DocumentHighlight, DocumentHighlightKind, Hover, InitializeError,
	InitializeResult, Location, MarkupKind, MessageActionItem, NotificationType, Position, Range, ResponseError,
	SignatureHelp, SymbolInformation, SymbolKind, TextDocumentEdit, TextDocuments, TextDocumentSyncKind,
	TextEdit, VersionedTextDocumentIdentifier, ProposedFeatures, DiagnosticTag, Proposed, InsertTextFormat,
	SelectionRangeRequest, SelectionRange, InsertReplaceEdit, SemanticTokensClientCapabilities, SemanticTokensLegend,
	SemanticTokensBuilder, SemanticTokensRegistrationType, SemanticTokensRegistrationOptions, ProtocolNotificationType, ChangeAnnotation, AnnotatedTextEdit,
	WorkspaceChange,
	CompletionItemKind, DiagnosticSeverity
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

let connection = createConnection(ProposedFeatures.all);
let documents = new TextDocuments(TextDocument);

documents.listen(connection);

documents.onWillSave((event) => {
	connection.console.log('On Will save received');
});

connection.telemetry.logEvent({
	name: 'my custom event',
	data: {
		foo: 10
	}
});

interface ActionItem extends MessageActionItem {
	id: string;
}

let folder: string;

enum TokenTypes {
	comment = 0,
	keyword = 1,
	string = 2,
	number = 3,
	regexp = 4,
	type = 5,
	class = 6,
	interface = 7,
	enum = 8,
	typeParameter = 9,
	function = 10,
	member = 11,
	property = 12,
	variable = 13,
	parameter = 14,
	lambdaFunction = 15,
	_ = 16
}

enum TokenModifiers {
	abstract = 0,
	deprecated = 1,
	_ = 2,
}

let semanticTokensLegend: SemanticTokensLegend | undefined;
function computeLegend(capability: SemanticTokensClientCapabilities): SemanticTokensLegend {

	const clientTokenTypes = new Set<string>(capability.tokenTypes);
	const clientTokenModifiers = new Set<string>(capability.tokenModifiers);

	const tokenTypes: string[] = [];
	for (let i = 0; i < TokenTypes._; i++) {
		const str = TokenTypes[i];
		if (clientTokenTypes.has(str)) {
			tokenTypes.push(str);
		} else {
			if (str === 'lambdaFunction') {
				tokenTypes.push('function');
			} else {
				tokenTypes.push('type');
			}
		}
	}

	const tokenModifiers: string[] = [];
	for (let i = 0; i < TokenModifiers._; i++) {
		const str = TokenModifiers[i];
		if (clientTokenModifiers.has(str)) {
			tokenModifiers.push(str);
		}
	}

	return { tokenTypes, tokenModifiers };
}


connection.onInitialize((params, cancel, progress): Thenable<InitializeResult> | ResponseError<InitializeError> | InitializeResult => {
	progress.begin('Initializing test server');

	for (let folder of params.workspaceFolders) {
		connection.console.log(`${folder.name} ${folder.uri}`);
	}
	if (params.workspaceFolders && params.workspaceFolders.length > 0) {
		folder = params.workspaceFolders[0].uri;
	}

	semanticTokensLegend = computeLegend(params.capabilities.textDocument!.semanticTokens!);
	return new Promise((resolve, reject) => {
		let result: InitializeResult & { capabilities : Proposed.$DiagnosticServerCapabilities }= {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Full,
				hoverProvider: true,
				completionProvider: {
					allCommitCharacters: ['.', ','],
					resolveProvider: false,
				},
				signatureHelpProvider: {
				},
				definitionProvider: true,
				referencesProvider: { workDoneProgress: true },
				documentHighlightProvider: true,
				documentSymbolProvider: true,
				workspaceSymbolProvider: true,
				codeActionProvider: {
					codeActionKinds: [CodeActionKind.Refactor, CodeActionKind.Source, CodeActionKind.SourceOrganizeImports],
					resolveProvider: true
				},
				codeLensProvider: {
					resolveProvider: true
				},
				documentFormattingProvider: true,
				documentRangeFormattingProvider: true,
				documentOnTypeFormattingProvider: {
					firstTriggerCharacter: ';',
					moreTriggerCharacter: ['}', '\n']
				},
				renameProvider: true,
				workspace: {
					workspaceFolders: {
						supported: true,
						changeNotifications: true
					}
				},
				implementationProvider: {
					id: 'AStaticImplementationID',
					documentSelector: ['bat']
				},
				typeDefinitionProvider: true,
				declarationProvider: { workDoneProgress: true },
				executeCommandProvider: {
					commands: ['testbed.helloWorld']
				},
				callHierarchyProvider: true,
				selectionRangeProvider: { workDoneProgress: true },
				diagnosticProvider: {
					identifier: 'testbed',
					interFileDependencies: true,
					workspaceDiagnostics: true
				}
			}
		};
		setTimeout(() => {
			resolve(result);
		}, 50);
	});
});

connection.onInitialized((params) => {
	connection.workspace.onDidChangeWorkspaceFolders((event) => {
		connection.console.log('Workspace folder changed received');
	});
	void connection.workspace.getWorkspaceFolders().then(folders => {
		for (let folder of folders) {
			connection.console.log(`Get workspace folders: ${folder.name} ${folder.uri}`);
		}
	});
	const registrationOptions: SemanticTokensRegistrationOptions = {
		documentSelector: ['bat'],
		legend: semanticTokensLegend,
		range: false,
		full: {
			delta: true
		}
	};
	void connection.client.register(SemanticTokensRegistrationType.type, registrationOptions);
});

connection.onShutdown((handler) => {
	connection.console.log('Shutdown received');
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve(undefined);
		}, 3000);
	});
});

documents.onDidChangeContent((event) => {
	let document = event.document;
	connection.sendDiagnostics({ uri: document.uri, diagnostics: validate(document) });
});

documents.onDidSave((event) => {
	connection.console.info(`Document got saved: ${event.document.uri} ${event.document.version}`);
});

connection.onDidChangeWatchedFiles((params) => {
	connection.console.log('File change event received');
	documents.all().forEach(document => {
		connection.sendDiagnostics({ uri: document.uri, diagnostics: validate(document) });
	});
});

connection.onDidChangeConfiguration((params) => {
	documents.all().forEach(document => {
		connection.sendDiagnostics({ uri: document.uri, diagnostics: validate(document) });
	});
	void connection.workspace.getConfiguration('testbed').then((value) => {
		connection.console.log('Configuration received');
	});
});

/**
 * Some doc
 * @param document
 */
function validate(document: TextDocument): Diagnostic[] {
	// connection.window.createWorkDoneProgress().then((progress) => {
	// 	progress.begin('Validating', 0, 'happy coding', true);
	// 	let counter = 1;
	// 	let interval = setInterval(() => {
	// 		if (counter === 11) {
	// 			clearInterval(interval);
	// 			progress.done();
	// 		} else {
	// 			progress.report(counter++ * 10);
	// 		}
	// 	}, 1000);
	// 	progress.token.onCancellationRequested(() => {
	// 		progress.done();
	// 		clearInterval(interval);
	// 	});
	// });
	connection.console.log('Validating document ' + document.uri);
	return [ {
		range: Range.create(0, 0, 0, 10),
		message: 'A error message',
		tags: [
			DiagnosticTag.Unnecessary
		],
		data: '11316630-392c-4227-a2c7-3b26cd68f241'
	}];
}

connection.onHover((textPosition): Hover => {
	// let doc : MarkedString[] = ["# Title","### description"]
	return {
		contents: {
			kind: MarkupKind.PlainText,
			value: 'foo\nbar'
		}
		// contents: {
		// 	kind: MarkupKind.Markdown,
		// 	value: [
		// 		'```typescript',
		// 		'function validate(document: TextDocument): Diagnostic[]',
		// 		'```',
		// 		'___',
		// 		'Some doc',
		// 		'',
		// 		'_@param_ `document` '
		// 	].join('\n')
		// }
		// contents: doc
	};
});


const patterns = [
	/\b[A-Z]{2,}\b/g,
	/\b[A-Z]{3,}\b/g,
	/\b[A-Z]{4,}\b/g,
	/\b[A-Z]{5,}\b/g
];

function computeDiagnostics(content: string): Diagnostic[] {
	const result: Diagnostic[] = [];
	const lines: string[] = content.match(/^.*(\n|\r\n|\r|$)/gm);
	let lineNumber: number = 0;
	for (const line of lines) {
		const pattern = patterns[Math.floor(Math.random() * 3)];
		let match: RegExpExecArray | null;
		while (match = pattern.exec(line)) {
			result.push(
				Diagnostic.create(Range.create(lineNumber, match.index, lineNumber, match.index + match[0].length), `${match[0]} is all uppercase.`, DiagnosticSeverity.Error)
			);
		}
		lineNumber++;
	}
	return result;
}

let resultIdCounter: number = 1;
let versionCounter: number = 1;
connection.languages.diagnostics.on(async (param) => {
	const uri = URI.parse(param.textDocument.uri);
	const document = documents.get(param.textDocument.uri);
	const content = document !== undefined
		? document.getText()
		: uri.scheme === 'file'
			? await fs.readFile(uri.fsPath, { encoding: 'utf8'} )
			: undefined;
	if (content === undefined) {
		return { kind: Proposed.DocumentDiagnosticReportKind.full, items: [], resultId: `${resultIdCounter++}` };
	}
	return { kind: Proposed.DocumentDiagnosticReportKind.full, items: computeDiagnostics(content), resultId: `${resultIdCounter++}` };
});

connection.languages.diagnostics.onWorkspace(async (params, token, _, resultProgress): Promise<Proposed.WorkspaceDiagnosticReport> => {
	const fsPath = URI.parse(folder).fsPath;

	const toValidate: string[] = [];
	for (const child of await fs.readdir(fsPath)) {
		if (path.extname(child) === '.bat') {
			toValidate.push(path.join(fsPath, child));
		}
	}

	if (toValidate.length === 0) {
		return { items: [] };
	}

	const doValidate = async (index: number) => {
		if (index >= toValidate.length) {
			index = 0;
		}
		const diagnostics = computeDiagnostics(await fs.readFile(toValidate[index], { encoding: 'utf8'} ));
		resultProgress.report({ items: [
			{
				kind: Proposed.DocumentDiagnosticReportKind.full,
				uri: URI.file(toValidate[index]).toString(),
				version: versionCounter++,
				items: diagnostics,
				resultId: `${resultIdCounter++}`
			}
		]});
		setTimeout(() => { void doValidate(++index); }, 500);
	};
	void doValidate(0);
	return new Promise((resolve) => {
		setTimeout(resolve, 120000);
	});
});

connection.onCompletion((params, token): CompletionItem[] => {
	const result: CompletionItem[] = [];
	let item = CompletionItem.create('foo');
	result.push(item);

	item = CompletionItem.create('foo-text');
	item.insertText = 'foo-text';
	result.push(item);

	item = CompletionItem.create('foo-text-range-insert');
	item.textEdit = TextEdit.insert(params.position, 'foo-text-range-insert');
	result.push(item);

	item = CompletionItem.create('foo-text-range-replace');
	item.textEdit = TextEdit.replace(
		Range.create(Position.create(params.position.line, params.position.character - 1), params.position),
		'foo-text-range-replace'
	);
	item.filterText = 'b';
	result.push(item);

	item = CompletionItem.create('bar');
	item.commitCharacters = [':'];
	item.textEdit = InsertReplaceEdit.create('bar',
		Range.create(params.position, params.position),
		Range.create(params.position, Position.create(params.position.line, params.position.character +1))
	);
	result.push(item);

	item = CompletionItem.create('-record');
	item.insertText = '-record(${1:name}, {${2:field} = ${3:Value} :: ${4:Type}()}).';
	item.insertTextFormat = InsertTextFormat.Snippet;
	item.kind = CompletionItemKind.Field;
	result.push(item);

	return result;
});

connection.onCompletionResolve((item): CompletionItem => {
	item.detail = 'This is a special hello world function';
	item.documentation =  {
		kind: MarkupKind.Markdown,
		value: [
			'# Heading',
			'```typescript',
			'console.log("Hello World");',
			'```'
		].join('\n')};
	return item;
});

connection.onSignatureHelp((item): SignatureHelp => {
	return { signatures: [{ label: 'Hello World Signature' }], activeSignature: 0, activeParameter: 0 };
});

connection.onDefinition((params): DefinitionLink[] => {
	throw new Error('No definition found');
	return [{
		targetUri: params.textDocument.uri,
		targetRange: { start: { line: 0, character: 2}, end: {line: 5, character: 45 } },
		targetSelectionRange: { start: { line: 1, character: 5}, end: {line: 1, character: 10 } },
		originSelectionRange: {
			start: { line: params.position.line, character: Math.max(0, params.position.character - 4) },
			end: { line: params.position.line, character: params.position.character + 4 }
		}
	}];
});

connection.onDeclaration((params): DeclarationLink[] => {
	return [{
		targetUri: params.textDocument.uri,
		targetRange: { start: { line: 3, character: 0}, end: {line: 3, character: 10 } },
		targetSelectionRange: { start: { line: 3, character: 0}, end: {line: 3, character: 10 } },
		originSelectionRange: {
			start: { line: params.position.line, character: Math.max(0, params.position.line - 4) },
			end: { line: params.position.line, character: params.position.line + 4 }
		}
	}];
});

connection.onImplementation((params): Promise<Definition> => {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve({ uri: params.textDocument.uri, range: { start: { line: 1, character: 0}, end: {line: 1, character: 10 }}});
		}, 2000);
	});
});

connection.onTypeDefinition((params): Definition => {
	return { uri: params.textDocument.uri, range: { start: { line: 2, character: 0}, end: {line: 2, character: 10 }}};
});

connection.onReferences((params): Location[] => {
	return [
		{ uri: params.textDocument.uri, range: { start: { line: 0, character: 0}, end: {line: 0, character: 10 }}},
		{ uri: params.textDocument.uri, range: { start: { line: 2, character: 0}, end: {line: 2, character: 20 }}},
	];
});

connection.onDocumentHighlight((textPosition) => {
	let position = textPosition.position;
	return [
		DocumentHighlight.create({
			start: { line: position.line + 1, character: position.character },
			end: { line: position.line + 1, character: position.character + 5 }
		}, DocumentHighlightKind.Write)
	];
});

connection.onDocumentSymbol((identifier) => {
	return [
		SymbolInformation.create('Item 1', SymbolKind.Function, {
			start: { line: 0, character: 0 },
			end: { line: 0, character: 10 }
		}, identifier.textDocument.uri),
		SymbolInformation.create('Item 2', SymbolKind.Function, {
			start: { line: 1, character: 0 },
			end: { line: 1, character: 10 }
		}, identifier.textDocument.uri)
	];
});

connection.onWorkspaceSymbol((params) => {
	return [
		SymbolInformation.create('Workspace Item 1', SymbolKind.Function, {
			start: { line: 0, character: 0 },
			end: { line: 0, character: 10 }

		}, `${folder}/test.bat`),
		SymbolInformation.create('Workspace Item 2', SymbolKind.Function, {
			start: { line: 1, character: 0 },
			end: { line: 1, character: 10 }
		}, `${folder}/test.bat`)
	];
});

connection.onCodeAction((params) => {
	const document = documents.get(params.textDocument.uri);
	const change: WorkspaceChange = new WorkspaceChange();
	change.createFile(`${folder}/newFile.bat`, { overwrite: true });
	const a = change.getTextEditChange(document);
	a.insert({ line: 0, character: 0}, 'Code Action', ChangeAnnotation.create('Insert some text', true));
	const b = change.getTextEditChange({ uri: `${folder}/newFile.bat`, version: null });
	b.insert({ line: 0, character: 0 }, 'The initial content', ChangeAnnotation.create('Add additional content', true));

	const codeAction: CodeAction = {
		title: 'Custom Code Action',
		kind: CodeActionKind.QuickFix,
		data: params.textDocument.uri
	};
	codeAction.edit = change.edit;
	return [
		codeAction
	];
});

connection.onCodeActionResolve((codeAction) => {
	// const document = documents.get(codeAction.data as string);
	// const change: WorkspaceChange = new WorkspaceChange();
	// change.createFile(`${folder}/newFile.bat`, { overwrite: true });
	// const a = change.getTextEditChange(document);
	// a.insert({ line: 0, character: 0}, "Code Action", ChangeAnnotation.create('Insert some text', true));
	// const b = change.getTextEditChange({ uri: `${folder}/newFile.bat`, version: null });
	// b.insert({ line: 0, character: 0 }, 'The initial content', ChangeAnnotation.create('Add additional content', true));

	// codeAction.edit = change.edit;
	return codeAction;
});

connection.onCodeLens((params) => {
	return [
		{
			range: Range.create(2,0,2,10),
			data: '1',
		}
	];
});

connection.onCodeLensResolve((codeLens) => {
	codeLens.command = Command.create('My Code Lens', 'commandId');
	return codeLens;
});

connection.onDocumentFormatting((params) => {
	return [
		TextEdit.insert(Position.create(1,0), 'A new line\n')
	];
});

connection.onDocumentRangeFormatting((params) => {
	connection.console.log(`Document Range Formatting: ${JSON.stringify(params.range)} ${JSON.stringify(params.options)}`);
	return [];
});

connection.onDocumentOnTypeFormatting((params) => {
	connection.console.log(`Document On Type Formatting: ${JSON.stringify(params.position)} ${params.ch} ${JSON.stringify(params.options)}`);
	return [];
});

connection.onRenameRequest((params) => {
	connection.console.log(`Rename: ${JSON.stringify(params.position)} ${params.newName}`);
	// return new ResponseError(20, 'Element can\'t be renamed');
	const change = new WorkspaceChange();
	change.getTextEditChange(params.textDocument.uri).insert(Position.create(0,0), 'Rename inserted\n', ChangeAnnotation.create('Rename symbol', true));
	return change.edit;
});

connection.onExecuteCommand((params) => {
	if (params.command === 'testbed.helloWorld') {
		throw new Error('Command execution failed');
	}
	return undefined;
});

connection.onRequest('addTwenty', (param) => {
	return { value: param.value + 20 };
});

let not: ProtocolNotificationType<string[], void> = new ProtocolNotificationType<string[], void>('testbed/notification');
connection.onNotification(not, (arr) => {
	connection.console.log('Is array: ' + Array.isArray(arr));
});

connection.onRequest(SelectionRangeRequest.type, (params) => {
	let result: SelectionRange = {
		range: {
			start: {
				line: params.positions[0].line,
				character: Math.max(0, params.positions[0].character - 10)
			},
			end: {
				line: params.positions[0].line,
				character: params.positions[0].character + 10
			}
		}
	};

	return [result];
});

connection.languages.callHierarchy.onPrepare((params) => {
	return [
		{
			name: 'name',
			uri: params.textDocument.uri,
			kind: SymbolKind.Function,
			range: Range.create(1,1,1,1),
			selectionRange: Range.create(2,2,2,2),
			data: '47e40ffe-2fbe-4dbf-958d-1dc6bd385be1'
		}
	];
});

connection.languages.callHierarchy.onIncomingCalls((params) => {
	return [];
});

connection.languages.callHierarchy.onOutgoingCalls((params) => {
	return [];
});

let tokenBuilders: Map<string, SemanticTokensBuilder> = new Map();
documents.onDidClose((event) => {
	tokenBuilders.delete(event.document.uri);
});
function getTokenBuilder(document: TextDocument): SemanticTokensBuilder {
	let result = tokenBuilders.get(document.uri);
	if (result !== undefined) {
		return result;
	}
	result = new SemanticTokensBuilder();
	tokenBuilders.set(document.uri, result);
	return result;
}
function buildTokens(builder: SemanticTokensBuilder, document: TextDocument) {
	const text = document.getText();
	const regexp = /\w+/g;
	let match: RegExpMatchArray;
	let tokenCounter: number = 0;
	let modifierCounter: number = 0;
	while ((match = regexp.exec(text)) !== null) {
		const word = match[0];
		const position = document.positionAt(match.index);
		const tokenType = tokenCounter % TokenTypes._;
		const tokenModifier = 1 << modifierCounter % TokenModifiers._;
		builder.push(position.line, position.character, word.length, tokenType, tokenModifier);
		tokenCounter++;
		modifierCounter++;
	}
}

connection.languages.semanticTokens.on((params) => {
	const document = documents.get(params.textDocument.uri);
	if (document === undefined) {
		return { data: [] };
	}
	const builder = getTokenBuilder(document);
	buildTokens(builder, document);
	return builder.build();
});

connection.languages.semanticTokens.onDelta((params) => {
	const document = documents.get(params.textDocument.uri);
	if (document === undefined) {
		return { edits: [] };
	}
	const builder = getTokenBuilder(document);
	builder.previousResult(params.previousResultId);
	buildTokens(builder, document);
	return builder.buildEdits();
});

connection.languages.semanticTokens.onRange((params) => {
	return { data: [] };
});

connection.listen();