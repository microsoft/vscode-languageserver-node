/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as code from 'vscode';
import * as proto from './protocol';
import * as is from './utils/is';
import ProtocolCompletionItem from './protocolCompletionItem';
import ProtocolCodeLens from './protocolCodeLens';

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
export function asChangeTextDocumentParams(event: code.TextDocumentChangeEvent): proto.DidChangeTextDocumentParams;
export function asChangeTextDocumentParams(arg: code.TextDocumentChangeEvent | code.TextDocument): proto.DidChangeTextDocumentParams {
	if (isTextDocument(arg)) {
		let result: proto.DidChangeTextDocumentParams = {
			uri: arg.uri.toString(),
			contentChanges: [ { text: arg.getText() } ]
		}
		return result;
	} else if (isTextDocumentChangeEvent(arg)) {
		let result: proto.DidChangeTextDocumentParams = {
			uri: arg.document.uri.toString(),
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

export function asDiagnosticSeverity(value: code.DiagnosticSeverity): proto.DiagnosticSeverity {
	switch (value) {
		case code.DiagnosticSeverity.Error:
			return proto.DiagnosticSeverity.Error;
		case code.DiagnosticSeverity.Warning:
			return proto.DiagnosticSeverity.Warning;
		case code.DiagnosticSeverity.Information:
			return proto.DiagnosticSeverity.Information;
		case code.DiagnosticSeverity.Hint:
			return proto.DiagnosticSeverity.Hint;
	}
}

export function asDiagnostic(item: code.Diagnostic): proto.Diagnostic {
	let result: proto.Diagnostic = proto.Diagnostic.create(asRange(item.range), item.message);
	set(item.severity, () => result.severity = asDiagnosticSeverity(item.severity));
	set(item.code, () => result.code = item.code);
	set(item.source, () => result.source = item.source);
	return result;
}

export function asDiagnostics(items: code.Diagnostic[]): proto.Diagnostic[] {
	if (is.undefined(items) || is.nil(items)) {
		return items;
	}
	return items.map(asDiagnostic);
}

export function asCompletionItem(item: code.CompletionItem): proto.CompletionItem {
	let result: proto.CompletionItem = { label: item.label };
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

export function asTextEdit(edit: code.TextEdit): proto.TextEdit {
	return { range: asRange(edit.range), newText: edit.newText };
}

export function asReferenceParams(textDocument: code.TextDocument, position: code.Position, options: { includeDeclaration: boolean; }): proto.ReferenceParams {
	return {
		uri: textDocument.uri.toString(),
		position: asWorkerPosition(position),
		context: { includeDeclaration: options.includeDeclaration }
	};
}

export function asCodeActionContext(context: code.CodeActionContext): proto.CodeActionContext {
	if (is.undefined(context) || is.nil(context)) {
		return context;
	}
	return proto.CodeActionContext.create(asDiagnostics(context.diagnostics));
}

export function asCommand(item: code.Command): proto.Command {
	let result = proto.Command.create(item.title, item.command);
	if (is.defined(item.arguments)) result.arguments = item.arguments;
	return result;
}

export function asCodeLens(item: code.CodeLens): proto.CodeLens {
	let result = proto.CodeLens.create(asRange(item.range));
	if (is.defined(item.command)) result.command = asCommand(item.command);
	if (item instanceof ProtocolCodeLens) {
		if (is.defined(item.data)) result.data = item.data;
	}
	return result;
}

export function asFormattingOptions(item: code.FormattingOptions): proto.FormattingOptions {
	return { tabSize: item.tabSize, insertSpaces: item.insertSpaces };
}