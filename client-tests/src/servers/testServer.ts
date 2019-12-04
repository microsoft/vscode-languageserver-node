/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
import * as assert from 'assert';
import {
	createConnection, IConnection, InitializeParams, ServerCapabilities, CompletionItemKind, ResourceOperationKind, FailureHandlingKind,
	DiagnosticTag, CompletionItemTag, TextDocumentSyncKind, MarkupKind, SignatureHelp, SignatureInformation, ParameterInformation
} from '../../../server/lib/main';

let connection: IConnection = createConnection();

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
	console.log(params.capabilities);

	let capabilities: ServerCapabilities = {
		textDocumentSync: TextDocumentSyncKind.Full,
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
	};
	return { capabilities, customResults: { hello: 'world' } };
});

connection.onInitialized(() => {
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

// Listen on the connection
connection.listen();