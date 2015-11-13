/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as code from 'vscode';
import * as proto from './protocol';
import * as is from './utils/is';

export function asOpenTextDocumentParams(textDocument: code.TextDocument): proto.DidOpenTextDocumentParams {
	return {
		uri: textDocument.uri.toString(),
		text: textDocument.getText()
	};
}

function isTextDocumentChangeEvent(value: any): value is code.TextDocumentChangeEvent {
	let candidate = <code.TextDocumentChangeEvent>value;
	return is.defined(candidate.document) && is.defined(candidate.contentChanges);
}

function isTextDocument(value: any): value is code.TextDocument {
	let candidate = <code.TextDocument>value;
	return is.defined(candidate.uri) && is.defined(candidate.version);
}

export function asChangeTextDocumentParams(textDocument: code.TextDocument): proto.DidChangeTextDocumentParams;
export function asChangeTextDocumentParams(event: code.TextDocumentChangeEvent): proto.DidChangeTextDocumentParams[];
export function asChangeTextDocumentParams(arg: code.TextDocumentChangeEvent | code.TextDocument): any {
	if (isTextDocument(arg)) {
		return { uri: arg.uri.toString(), text: arg.getText() };
	} else if (isTextDocumentChangeEvent(arg)) {
		let result: proto.DidChangeTextDocumentParams[] = [];
		let uri: string = arg.document.uri.toString();
		return arg.contentChanges.map((change): proto.DidChangeTextDocumentParams => {
			let range = change.range;
			return {
				uri: uri,
				range: {
					start: { line: range.start.line, character: range.start.character },
					end: { line: range.end.line, character: range.end.line }
				},
				rangeLength: change.rangeLength,
				text: change.text
			};
		});
	} else {
		throw Error ('Unsupported text document change parameter');
	}
}

export function asCloseTextDocumentParams(textDocument: code.TextDocument): proto.TextDocumentIdentifier {
	return {
		uri: textDocument.uri.toString()
	};
}

export function asTextDocumentIdentifier(textDocument: code.TextDocument): proto.TextDocumentIdentifier {
	return { uri: textDocument.uri.toString() };
}

export function asTextDocumentPosition(textDocument: code.TextDocument, position: code.Position): proto.TextDocumentPosition {
	return { uri: textDocument.uri.toString(), position: asWorkerPosition(position) };
}

export function asWorkerPosition(position: code.Position): proto.Position {
	return { line: position.line, character: position.character };
}

export function asRange(value: code.Range): proto.Range {
	if (is.undefined(value)) {
		return undefined;
	} else if (is.nil(value)) {
		return null;
	}
	return { start: asPosition(value.start), end: asPosition(value.end) };
}

export function asPosition(value: code.Position): proto.Position {
	if (is.undefined(value)) {
		return undefined;
	} else if (is.nil(value)) {
		return null;
	}
	return { line: value.line, character: value.character };
}

function set(value, func: () => void): void {
	if (is.defined(value)) {
		func();
	}
}

export function asCompletionItem(item: code.CompletionItem): proto.CompletionItem {
	let result: proto.CompletionItem = { label: item.label };
	set(item.detail, () => result.detail = item.detail);
	set(item.documentation, () => result.documentation = item.documentation);
	set(item.filterText, () => result.filterText = item.filterText);
	set(item.insertText, () => result.insertText = item.insertText);
	set(item.kind, () => result.kind = item.kind);
	set(item.sortText, () => result.sortText = item.sortText);
	set(item.textEdit, () => result.textEdit = asTextEdit(item.textEdit));
	return result;
}

export function asTextEdit(edit: code.TextEdit): proto.TextEdit {
	return { range: asRange(edit.range), newText: edit.newText };
}

export function asReferenceParams(textDocument: code.TextDocument, position: code.Position, options: { includeDeclaration: boolean; }): proto.ReferenceParams {
	return {
		uri: textDocument.uri.toString(),
		position: asWorkerPosition(position),
		options: { includeDeclaration: options.includeDeclaration }
	};
}
