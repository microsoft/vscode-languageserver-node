/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as code from 'vscode';
import * as types from 'vscode-languageserver-types';
import * as proto from './protocol';
import * as is from './utils/is';
import ProtocolCompletionItem from './protocolCompletionItem';
import ProtocolCodeLens from './protocolCodeLens';

export interface Converter {

	asUri(uri: code.Uri): string;

	asTextDocumentIdentifier(textDocument: code.TextDocument): types.TextDocumentIdentifier;

	asOpenTextDocumentParams(textDocument: code.TextDocument): proto.DidOpenTextDocumentParams;

	asChangeTextDocumentParams(textDocument: code.TextDocument): proto.DidChangeTextDocumentParams;
	asChangeTextDocumentParams(event: code.TextDocumentChangeEvent): proto.DidChangeTextDocumentParams;

	asCloseTextDocumentParams(textDocument: code.TextDocument): proto.DidCloseTextDocumentParams;

	asSaveTextDocumentParams(textDocument: code.TextDocument, includeContent?: boolean): proto.DidSaveTextDocumentParams;
	asWillSaveTextDocumentParams(event: code.TextDocumentWillSaveEvent): proto.WillSaveTextDocumentParams;

	asTextDocumentPositionParams(textDocument: code.TextDocument, position: code.Position): proto.TextDocumentPositionParams;

	asWorkerPosition(position: code.Position): types.Position;

	asRange(value: code.Range): types.Range;

	asPosition(value: code.Position): types.Position;

	asDiagnosticSeverity(value: code.DiagnosticSeverity): types.DiagnosticSeverity;

	asDiagnostic(item: code.Diagnostic): types.Diagnostic;
	asDiagnostics(items: code.Diagnostic[]): types.Diagnostic[];

	asCompletionItem(item: code.CompletionItem): types.CompletionItem;

	asTextEdit(edit: code.TextEdit): types.TextEdit;

	asReferenceParams(textDocument: code.TextDocument, position: code.Position, options: { includeDeclaration: boolean; }): proto.ReferenceParams;

	asCodeActionContext(context: code.CodeActionContext): types.CodeActionContext;

	asCommand(item: code.Command): types.Command;

	asCodeLens(item: code.CodeLens): types.CodeLens;

	asFormattingOptions(item: code.FormattingOptions): types.FormattingOptions;

	asDocumentSymbolParams(textDocument: code.TextDocument): types.DocumentSymbolParams;

	asCodeLensParams(textDocument: code.TextDocument): proto.CodeLensParams;

	asDocumentLink(item: code.DocumentLink): types.DocumentLink;

	asDocumentLinkParams(textDocument: code.TextDocument): proto.DocumentLinkParams;
}

export interface URIConverter {
	(value: code.Uri): string;
}

export function createConverter(uriConverter?: URIConverter): Converter {

	const nullConverter = (value: code.Uri) => value.toString();

	const _uriConverter: URIConverter = uriConverter || nullConverter;

	function asUri(value: code.Uri): string {
		return _uriConverter(value);
	}

	function asTextDocumentIdentifier(textDocument: code.TextDocument): types.TextDocumentIdentifier {
		return {
			uri: _uriConverter(textDocument.uri)
		};
	}

	function asVersionedTextDocumentIdentifier(textDocument: code.TextDocument): types.VersionedTextDocumentIdentifier {
		return {
			uri: _uriConverter(textDocument.uri),
			version: textDocument.version
		};
	}

	function asOpenTextDocumentParams(textDocument: code.TextDocument): proto.DidOpenTextDocumentParams {
		return {
			textDocument: {
				uri: _uriConverter(textDocument.uri),
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

	function asChangeTextDocumentParams(textDocument: code.TextDocument): proto.DidChangeTextDocumentParams;
	function asChangeTextDocumentParams(event: code.TextDocumentChangeEvent): proto.DidChangeTextDocumentParams;
	function asChangeTextDocumentParams(arg: code.TextDocumentChangeEvent | code.TextDocument): proto.DidChangeTextDocumentParams {
		if (isTextDocument(arg)) {
			let result: proto.DidChangeTextDocumentParams = {
				textDocument: {
					uri: _uriConverter(arg.uri),
					version: arg.version
				},
				contentChanges: [ { text: arg.getText() } ]
			}
			return result;
		} else if (isTextDocumentChangeEvent(arg)) {
			let document = arg.document;
			let result: proto.DidChangeTextDocumentParams = {
				textDocument: {
					uri: _uriConverter(document.uri),
					version: document.version
				},
				contentChanges: arg.contentChanges.map((change): types.TextDocumentContentChangeEvent => {
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

	function asCloseTextDocumentParams(textDocument: code.TextDocument): proto.DidCloseTextDocumentParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument)
		};
	}

	function asSaveTextDocumentParams(textDocument: code.TextDocument, includeContent: boolean = false): proto.DidSaveTextDocumentParams {
		let result: proto.DidSaveTextDocumentParams = {
			textDocument: asVersionedTextDocumentIdentifier(textDocument)
		}
		if (includeContent) {
			result.content = textDocument.getText()
		}
		return result;
	}

	function asWillSaveTextDocumentParams(event: code.TextDocumentWillSaveEvent): proto.WillSaveTextDocumentParams {
		return {
			textDocument: asTextDocumentIdentifier(event.document),
			reason: event.reason
		}
	}

	function asTextDocumentPositionParams(textDocument: code.TextDocument, position: code.Position): proto.TextDocumentPositionParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument),
			position: asWorkerPosition(position)
		};
	}

	function asWorkerPosition(position: code.Position): types.Position {
		return { line: position.line, character: position.character };
	}

	function asRange(value: code.Range): types.Range {
		if (is.undefined(value)) {
			return undefined;
		} else if (is.nil(value)) {
			return null;
		}
		return { start: asPosition(value.start), end: asPosition(value.end) };
	}

	function asPosition(value: code.Position): types.Position {
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

	function asDiagnosticSeverity(value: code.DiagnosticSeverity): types.DiagnosticSeverity {
		switch (value) {
			case code.DiagnosticSeverity.Error:
				return types.DiagnosticSeverity.Error;
			case code.DiagnosticSeverity.Warning:
				return types.DiagnosticSeverity.Warning;
			case code.DiagnosticSeverity.Information:
				return types.DiagnosticSeverity.Information;
			case code.DiagnosticSeverity.Hint:
				return types.DiagnosticSeverity.Hint;
		}
	}

	function asDiagnostic(item: code.Diagnostic): types.Diagnostic {
		let result: types.Diagnostic = types.Diagnostic.create(asRange(item.range), item.message);
		set(item.severity, () => result.severity = asDiagnosticSeverity(item.severity));
		set(item.code, () => result.code = item.code);
		set(item.source, () => result.source = item.source);
		return result;
	}

	function asDiagnostics(items: code.Diagnostic[]): types.Diagnostic[] {
		if (is.undefined(items) || is.nil(items)) {
			return items;
		}
		return items.map(asDiagnostic);
	}

	function asCompletionItem(item: code.CompletionItem): types.CompletionItem {
		let result: types.CompletionItem = { label: item.label };
		set(item.detail, () => result.detail = item.detail);
		set(item.documentation, () => result.documentation = item.documentation);
		set(item.filterText, () => result.filterText = item.filterText);
		set(item.insertText, () => result.insertText = asCompletionInsertText(item.insertText));
		set(item.range, () => result.range = asRange(item.range));
		// Protocol item kind is 1 based, codes item kind is zero based.
		set(item.kind, () => result.kind = item.kind + 1);
		set(item.sortText, () => result.sortText = item.sortText);
		set(item.textEdit, () => result.textEdit = asTextEdit(item.textEdit));
		set(item.additionalTextEdits, () => result.additionalTextEdits = asTextEdits(item.additionalTextEdits));
		set(item.command, () => result.command = asCommand(item.command));
		if (item instanceof ProtocolCompletionItem) {
			set(item.data, () => result.data = item.data);
		}
		return result;
	}

	function asCompletionInsertText(text: string | code.SnippetString): string | types.SnippetString {
		if (is.string(text)) {
			return text;
		} else if (is.defined(text.value)) {
			return types.SnippetString.create(text.value);
		}
		return undefined;
	}

	function asTextEdit(edit: code.TextEdit): types.TextEdit {
		return { range: asRange(edit.range), newText: edit.newText };
	}

	function asTextEdits(edits: code.TextEdit[]): types.TextEdit[] {
		if (is.undefined(edits) || is.nil(edits)) {
			return edits;
		}
		return edits.map(asTextEdit);
	}

	function asReferenceParams(textDocument: code.TextDocument, position: code.Position, options: { includeDeclaration: boolean; }): proto.ReferenceParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument),
			position: asWorkerPosition(position),
			context: { includeDeclaration: options.includeDeclaration }
		};
	}

	function asCodeActionContext(context: code.CodeActionContext): types.CodeActionContext {
		if (is.undefined(context) || is.nil(context)) {
			return context;
		}
		return types.CodeActionContext.create(asDiagnostics(context.diagnostics));
	}

	function asCommand(item: code.Command): types.Command {
		let result = types.Command.create(item.title, item.command);
		if (is.defined(item.arguments)) result.arguments = item.arguments;
		return result;
	}

	function asCodeLens(item: code.CodeLens): types.CodeLens {
		let result = types.CodeLens.create(asRange(item.range));
		if (is.defined(item.command)) result.command = asCommand(item.command);
		if (item instanceof ProtocolCodeLens) {
			if (is.defined(item.data)) result.data = item.data;
		}
		return result;
	}

	function asFormattingOptions(item: code.FormattingOptions): types.FormattingOptions {
		return { tabSize: item.tabSize, insertSpaces: item.insertSpaces };
	}

	function asDocumentSymbolParams(textDocument: code.TextDocument): types.DocumentSymbolParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument)
		}
	}

	function asCodeLensParams(textDocument: code.TextDocument): proto.CodeLensParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument)
		};
	}

	function asDocumentLink(item: code.DocumentLink): types.DocumentLink {
		let result = types.DocumentLink.create(asRange(item.range));
		if (is.defined(item.target)) result.target = asUri(item.target);
		return result;
	}

	function asDocumentLinkParams(textDocument: code.TextDocument): proto.DocumentLinkParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument)
		};
	}

	return {
		asUri,
		asTextDocumentIdentifier,
		asOpenTextDocumentParams,
		asChangeTextDocumentParams,
		asCloseTextDocumentParams,
		asSaveTextDocumentParams,
		asWillSaveTextDocumentParams,
		asTextDocumentPositionParams,
		asWorkerPosition,
		asRange,
		asPosition,
		asDiagnosticSeverity,
		asDiagnostic,
		asDiagnostics,
		asCompletionItem,
		asTextEdit,
		asReferenceParams,
		asCodeActionContext,
		asCommand,
		asCodeLens,
		asFormattingOptions,
		asDocumentSymbolParams,
		asCodeLensParams,
		asDocumentLink,
		asDocumentLinkParams
	}
}