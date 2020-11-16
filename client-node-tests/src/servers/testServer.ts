/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import {
	createConnection, Connection, InitializeParams, ServerCapabilities, CompletionItemKind, ResourceOperationKind, FailureHandlingKind,
	DiagnosticTag, CompletionItemTag, TextDocumentSyncKind, MarkupKind, SignatureHelp, SignatureInformation, ParameterInformation,
	Location, Range, DocumentHighlight, DocumentHighlightKind, CodeAction, Command, TextEdit, Position, DocumentLink,
	ColorInformation, Color, ColorPresentation, FoldingRange, SelectionRange, SymbolKind, WorkspaceEdit, WillCreateFilesRequest, FileOperationRegistrationOptions
} from '../../../server/node';

import { URI } from 'vscode-uri';

let connection: Connection = createConnection();

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

connection.onInitialize((params: InitializeParams): any => {
	assert.equal((params.capabilities.workspace as any).applyEdit, true);
	assert.equal(params.capabilities.workspace!.workspaceEdit!.documentChanges, true);
	assert.deepEqual(params.capabilities.workspace!.workspaceEdit!.resourceOperations, [ResourceOperationKind.Create, ResourceOperationKind.Rename, ResourceOperationKind.Delete]);
	assert.equal(params.capabilities.workspace!.workspaceEdit!.failureHandling, FailureHandlingKind.TextOnlyTransactional);
	assert.equal(params.capabilities.textDocument!.completion!.completionItem!.deprecatedSupport, true);
	assert.equal(params.capabilities.textDocument!.completion!.completionItem!.preselectSupport, true);
	assert.equal(params.capabilities.textDocument!.completion!.completionItem!.tagSupport!.valueSet.length, 1);
	assert.equal(params.capabilities.textDocument!.completion!.completionItem!.tagSupport!.valueSet[0], CompletionItemTag.Deprecated);
	assert.equal(params.capabilities.textDocument!.signatureHelp!.signatureInformation!.parameterInformation!.labelOffsetSupport, true);
	assert.equal(params.capabilities.textDocument!.definition!.linkSupport, true);
	assert.equal(params.capabilities.textDocument!.declaration!.linkSupport, true);
	assert.equal(params.capabilities.textDocument!.implementation!.linkSupport, true);
	assert.equal(params.capabilities.textDocument!.typeDefinition!.linkSupport, true);
	assert.equal(params.capabilities.textDocument!.rename!.prepareSupport, true);
	assert.equal(params.capabilities.textDocument!.publishDiagnostics!.relatedInformation, true);
	assert.equal(params.capabilities.textDocument!.publishDiagnostics!.tagSupport!.valueSet.length, 2);
	assert.equal(params.capabilities.textDocument!.publishDiagnostics!.tagSupport!.valueSet[0], DiagnosticTag.Unnecessary);
	assert.equal(params.capabilities.textDocument!.publishDiagnostics!.tagSupport!.valueSet[1], DiagnosticTag.Deprecated);
	assert.equal(params.capabilities.textDocument!.documentLink!.tooltipSupport, true);
	let valueSet = params.capabilities.textDocument!.completion!.completionItemKind!.valueSet!;
	assert.equal(valueSet[0], 1);
	assert.equal(valueSet[valueSet.length - 1], CompletionItemKind.TypeParameter);
	assert.equal(params.capabilities.files!.willCreate, true);
	console.log(params.capabilities);

	let capabilities: ServerCapabilities = {
		textDocumentSync: TextDocumentSyncKind.Full,
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
		files: {
			// Static reg is folders + .txt files with 'created-static' in the path
			willCreate: { globPattern: '**/created-static/**{/,*.txt}' },
		},
		onTypeRenameProvider: false
	};
	return { capabilities, customResults: { hello: 'world' } };
});

connection.onInitialized(() => {
	// Dynamic reg is folders + .js files with 'created-dynamic' in the path
	connection.client.register(WillCreateFilesRequest.type, {
		globPattern: '**/created-dynamic/**{/,*.js}'
	} as FileOperationRegistrationOptions);
});

connection.onDeclaration((params) => {
	assert.equal(params.position.line, 1);
	assert.equal(params.position.character, 1);
	return { uri: params.textDocument.uri, range: { start: { line: 1, character: 1}, end: {line: 1, character: 2 }}};
});

connection.onDefinition((params) => {
	assert.equal(params.position.line, 1);
	assert.equal(params.position.character, 1);
	return { uri: params.textDocument.uri, range: { start: { line: 0, character: 0}, end: {line: 0, character: 1 }}};
});

connection.onHover((_params) => {
	return {
		contents: {
			kind: MarkupKind.PlainText,
			value: 'foo'
		}
	};
});

connection.onCompletion((_params) => {
	return [
		{ label: 'item', insertText: 'text' }
	];
});

connection.onCompletionResolve((item) => {
	item.detail = 'detail';
	return item;
});

connection.onSignatureHelp((_params) => {
	const result: SignatureHelp = {
		signatures: [
			SignatureInformation.create('label', 'doc', ParameterInformation.create('label', 'doc'))
		],
		activeSignature: 1,
		activeParameter: 1
	};
	return result;
});

connection.onReferences((params) => {
	return [
		Location.create(params.textDocument.uri, Range.create(0,0,0,0)),
		Location.create(params.textDocument.uri, Range.create(1,1,1,1))
	];
});

connection.onDocumentHighlight((_params) => {
	return [
		DocumentHighlight.create(Range.create(2, 2, 2, 2), DocumentHighlightKind.Read)
	];
});

connection.onCodeAction((_params) => {
	return [
		CodeAction.create('title', Command.create('title', 'id'))
	];
});

connection.onDocumentFormatting((_params) => {
	return [
		TextEdit.insert(Position.create(0, 0), 'insert')
	];
});

connection.onDocumentRangeFormatting((_params) => {
	return [
		TextEdit.del(Range.create(1, 1, 1, 2))
	];
});

connection.onDocumentOnTypeFormatting((_params) => {
	return [
		TextEdit.replace(Range.create(2, 2, 2, 3), 'replace')
	];
});

connection.onPrepareRename((_params) => {
	return Range.create(1, 1, 1, 2);
});

connection.onRenameRequest((_params) => {
	return { documentChanges: [] };
});

connection.onDocumentLinks((_params) => {
	return [
		DocumentLink.create(Range.create(1, 1, 1, 2))
	];
});

connection.onDocumentLinkResolve((link) => {
	link.target = URI.file('/target.txt').toString();
	return link;
});

connection.onDocumentColor((_params) => {
	return [
		ColorInformation.create(Range.create(1, 1, 1, 2), Color.create(1, 2, 3, 4))
	];
});

connection.onColorPresentation((_params) => {
	return [
		ColorPresentation.create('label')
	];
});

connection.onFoldingRanges((_params) => {
	return [
		FoldingRange.create(1,2)
	];
});

connection.onImplementation((params) => {
	assert.equal(params.position.line, 1);
	assert.equal(params.position.character, 1);
	return { uri: params.textDocument.uri, range: { start: { line: 2, character: 2}, end: {line: 3, character: 3 }}};
});

connection.onSelectionRanges((_params) => {
	return [
		SelectionRange.create(Range.create(1,2,3,4))
	];
});

connection.onWillCreateFiles((params) => {
	const createdFilenames = params.files.map((f) => `${f.uri}`).join('\n');
	return {
		documentChanges: [{
			textDocument: { uri: '/dummy-edit', version: null },
			edits: [
				TextEdit.insert(Position.create(0, 0), `WILL CREATE:\n${createdFilenames}`),
			]
		}],
	} as WorkspaceEdit;
});

connection.onTypeDefinition((params) => {
	assert.equal(params.position.line, 1);
	assert.equal(params.position.character, 1);
	return { uri: params.textDocument.uri, range: { start: { line: 2, character: 2}, end: {line: 3, character: 3 }}};
});

connection.languages.callHierarchy.onPrepare((params) => {
	return [
		{
			kind: SymbolKind.Function,
			name: 'name',
			range: Range.create(1, 1, 1, 1),
			selectionRange: Range.create(2, 2, 2, 2),
			uri: params.textDocument.uri
		}
	];
});

connection.languages.callHierarchy.onIncomingCalls((params) => {
	return [
		{
			from: params.item,
			fromRanges: [ Range.create(1, 1, 1, 1)]
		}
	];
});

connection.languages.callHierarchy.onOutgoingCalls((params) => {
	return [
		{
			to: params.item,
			fromRanges: [ Range.create(1, 1, 1, 1)]
		}
	];
});

connection.languages.semanticTokens.onRange(() => {
	return {
		resultId: '1',
		data: []
	};
});

connection.languages.semanticTokens.on(() => {
	return {
		resultId: '2',
		data: []
	};
});

connection.languages.semanticTokens.onDelta(() => {
	return {
		resultId: '3',
		data: []
	};
});

connection.languages.onOnTypeRename(() => {
	return {
		ranges: [ Range.create(1,1,1,1)],
		wordPattern: '\\w'
	};
});

// Listen on the connection
connection.listen();