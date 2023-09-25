/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import {
	CompletionItem, createConnection, Diagnostic, Hover, InitializeError, InitializeResult, MarkupKind, Range, ResponseError,
	TextDocuments, TextDocumentSyncKind, ProposedFeatures, Proposed, DiagnosticSeverity
} from 'vscode-languageserver/node';

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

const connection: ProposedFeatures.Connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((params, cancel, progress): Thenable<InitializeResult> | ResponseError<InitializeError> | InitializeResult => {
	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			hoverProvider: true,
			declarationProvider: true,
			completionProvider: {}
		}
	};
	return result;
});

documents.onDidChangeContent((event) => {
	let document = event.document;
	void connection.sendDiagnostics({ uri: document.uri, diagnostics: computeDiagnostics(document.getText()) });
});

documents.onDidClose((event) => {
	void connection.sendDiagnostics({ uri: event.document.uri, diagnostics: []});
});

connection.onHover((textPosition): Hover => {
	return {
		contents: {
			kind: MarkupKind.PlainText,
			value: 'foo\nbar'
		}
	};
});

connection.onDeclaration((params, token) => {
	return { uri: params.textDocument.uri, range: Range.create(0,0,0,0) };
});

connection.onCompletion((params, token): CompletionItem[] => {
	const result: CompletionItem[] = [];
	let item = CompletionItem.create('foo');
	result.push(item);
	return result;
});

documents.listen(connection);
connection.listen();
