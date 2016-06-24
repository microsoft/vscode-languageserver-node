/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as code from 'vscode';
import * as ls from 'vscode-languageserver-types';
import * as proto from './protocol';
import * as is from './utils/is';
import ProtocolCompletionItem from './protocolCompletionItem';
import ProtocolCodeLens from './protocolCodeLens';

export function asTextDocumentIdentifier(textDocument: code.TextDocument): ls.TextDocumentIdentifier {
	return {
		uri: textDocument.uri.toString()
	};
}

export function asOpenTextDocumentParams(textDocument: code.TextDocument): proto.DidOpenTextDocumentParams {
	return {
		textDocument: {
			uri: textDocument.uri.toString(),
			languageId: textDocument.languageId,
			version: textDocument.version,
			text: textDocument.getText()
		}
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
export function asChangeTextDocumentParams(event: code.TextDocumentChangeEvent): proto.DidChangeTextDocumentParams;
export function asChangeTextDocumentParams(arg: code.TextDocumentChangeEvent | code.TextDocument): proto.DidChangeTextDocumentParams {
	if (isTextDocument(arg)) {
		let result: proto.DidChangeTextDocumentParams = {
			textDocument: {
				uri: arg.uri.toString(),
				version: arg.version
			},
			contentChanges: [ { text: arg.getText() } ]
		}
		return result;
	} else if (isTextDocumentChangeEvent(arg)) {
		let document = arg.document;
		let result: proto.DidChangeTextDocumentParams = {
			textDocument: {
				uri: document.uri.toString(),
				version: document.version
			},
			contentChanges: arg.contentChanges.map((change): proto.TextDocumentContentChangeEvent => {
				let range = change.range;
				return {
					range: {
						start: { line: range.start.line, character: range.start.character },
						end: { line: range.end.line, character: range.end.character }
					},
					rangeLength: change.rangeLength,
					text: change.text
				}
			})
		}
		return result;
	} else {
		throw Error ('Unsupported text document change parameter');
	}
}

export function asCloseTextDocumentParams(textDocument: code.TextDocument): proto.DidCloseTextDocumentParams {
	return {
		textDocument: asTextDocumentIdentifier(textDocument)
	};
}

export function asSaveTextDocumentParams(textDocument: code.TextDocument): proto.DidSaveTextDocumentParams {
	return {
		textDocument: asTextDocumentIdentifier(textDocument)
	}
}

export function asTextDocumentPositionParams(textDocument: code.TextDocument, position: code.Position): proto.TextDocumentPositionParams {
	return {
		textDocument: asTextDocumentIdentifier(textDocument),
		position: asWorkerPosition(position)
	};
}

export function asWorkerPosition(position: code.Position): ls.Position {
	return { line: position.line, character: position.character };
}

export function asRange(value: code.Range): ls.Range {
	if (is.undefined(value)) {
		return undefined;
	} else if (is.nil(value)) {
		return null;
	}
	return { start: asPosition(value.start), end: asPosition(value.end) };
}

export function asPosition(value: code.Position): ls.Position {
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

export function asDiagnosticSeverity(value: code.DiagnosticSeverity): ls.DiagnosticSeverity {
	switch (value) {
		case code.DiagnosticSeverity.Error:
			return ls.DiagnosticSeverity.Error;
		case code.DiagnosticSeverity.Warning:
			return ls.DiagnosticSeverity.Warning;
		case code.DiagnosticSeverity.Information:
			return ls.DiagnosticSeverity.Information;
		case code.DiagnosticSeverity.Hint:
			return ls.DiagnosticSeverity.Hint;
	}
}

export function asDiagnostic(item: code.Diagnostic): ls.Diagnostic {
	let result: ls.Diagnostic = ls.Diagnostic.create(asRange(item.range), item.message);
	set(item.severity, () => result.severity = asDiagnosticSeverity(item.severity));
	set(item.code, () => result.code = item.code);
	set(item.source, () => result.source = item.source);
	return result;
}

export function asDiagnostics(items: code.Diagnostic[]): ls.Diagnostic[] {
	if (is.undefined(items) || is.nil(items)) {
		return items;
	}
	return items.map(asDiagnostic);
}

export function asCompletionItem(item: code.CompletionItem): ls.CompletionItem {
	let result: ls.CompletionItem = { label: item.label };
	set(item.detail, () => result.detail = item.detail);
	set(item.documentation, () => result.documentation = item.documentation);
	set(item.filterText, () => result.filterText = item.filterText);
	set(item.insertText, () => result.insertText = item.insertText);
	// Protocol item kind is 1 based, codes item kind is zero based.
	set(item.kind, () => result.kind = item.kind + 1);
	set(item.sortText, () => result.sortText = item.sortText);
	set(item.textEdit, () => result.textEdit = asTextEdit(item.textEdit));
	if (item instanceof ProtocolCompletionItem) {
		set(item.data, () => result.data = item.data);
	}
	return result;
}

export function asTextEdit(edit: code.TextEdit): ls.TextEdit {
	return { range: asRange(edit.range), newText: edit.newText };
}

export function asReferenceParams(textDocument: code.TextDocument, position: code.Position, options: { includeDeclaration: boolean; }): proto.ReferenceParams {
	return {
		textDocument: asTextDocumentIdentifier(textDocument),
		position: asWorkerPosition(position),
		context: { includeDeclaration: options.includeDeclaration }
	};
}

export function asCodeActionContext(context: code.CodeActionContext): ls.CodeActionContext {
	if (is.undefined(context) || is.nil(context)) {
		return context;
	}
	return ls.CodeActionContext.create(asDiagnostics(context.diagnostics));
}

export function asCommand(item: code.Command): ls.Command {
	let result = ls.Command.create(item.title, item.command);
	if (is.defined(item.arguments)) result.arguments = item.arguments;
	return result;
}

export function asCodeLens(item: code.CodeLens): ls.CodeLens {
	let result = ls.CodeLens.create(asRange(item.range));
	if (is.defined(item.command)) result.command = asCommand(item.command);
	if (item instanceof ProtocolCodeLens) {
		if (is.defined(item.data)) result.data = item.data;
	}
	return result;
}

export function asFormattingOptions(item: code.FormattingOptions): ls.FormattingOptions {
	return { tabSize: item.tabSize, insertSpaces: item.insertSpaces };
}

export function asDocumentSymbolParams(textDocument: code.TextDocument): proto.DocumentSymbolParams {
	return {
		textDocument: asTextDocumentIdentifier(textDocument)
	}
}

export function asCodeLensParams(textDocument: code.TextDocument): proto.CodeLensParams {
	return {
		textDocument: asTextDocumentIdentifier(textDocument)
	};
}