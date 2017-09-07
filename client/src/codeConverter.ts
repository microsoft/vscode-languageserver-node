/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as code from 'vscode';
import * as proto from 'vscode-languageserver-protocol';
import * as is from './utils/is';
import ProtocolCompletionItem from './protocolCompletionItem';
import ProtocolCodeLens from './protocolCodeLens';

export interface Converter {

	asUri(uri: code.Uri): string;

	asTextDocumentIdentifier(textDocument: code.TextDocument): proto.TextDocumentIdentifier;

	asOpenTextDocumentParams(textDocument: code.TextDocument): proto.DidOpenTextDocumentParams;

	asChangeTextDocumentParams(textDocument: code.TextDocument): proto.DidChangeTextDocumentParams;
	asChangeTextDocumentParams(event: code.TextDocumentChangeEvent): proto.DidChangeTextDocumentParams;

	asCloseTextDocumentParams(textDocument: code.TextDocument): proto.DidCloseTextDocumentParams;

	asSaveTextDocumentParams(textDocument: code.TextDocument, includeContent?: boolean): proto.DidSaveTextDocumentParams;
	asWillSaveTextDocumentParams(event: code.TextDocumentWillSaveEvent): proto.WillSaveTextDocumentParams;

	asTextDocumentPositionParams(textDocument: code.TextDocument, position: code.Position): proto.TextDocumentPositionParams;

	asWorkerPosition(position: code.Position): proto.Position;

	asPosition(value: code.Position): proto.Position;
	asPosition(value: undefined): undefined;
	asPosition(value: null): null;
	asPosition(value: code.Position | undefined | null): proto.Position | undefined | null;

	asRange(value: code.Range): proto.Range;
	asRange(value: undefined): undefined;
	asRange(value: null): null;
	asRange(value: code.Range | undefined | null): proto.Range | undefined | null;

	asDiagnosticSeverity(value: code.DiagnosticSeverity): number;

	asDiagnostic(item: code.Diagnostic): proto.Diagnostic;
	asDiagnostics(items: code.Diagnostic[]): proto.Diagnostic[];

	asCompletionItem(item: code.CompletionItem): proto.CompletionItem;

	asTextEdit(edit: code.TextEdit): proto.TextEdit;

	asReferenceParams(textDocument: code.TextDocument, position: code.Position, options: { includeDeclaration: boolean; }): proto.ReferenceParams;

	asCodeActionContext(context: code.CodeActionContext): proto.CodeActionContext;

	asCommand(item: code.Command): proto.Command;

	asCodeLens(item: code.CodeLens): proto.CodeLens;

	asFormattingOptions(item: code.FormattingOptions): proto.FormattingOptions;

	asDocumentSymbolParams(textDocument: code.TextDocument): proto.DocumentSymbolParams;

	asCodeLensParams(textDocument: code.TextDocument): proto.CodeLensParams;

	asDocumentLink(item: code.DocumentLink): proto.DocumentLink;

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

	function asTextDocumentIdentifier(textDocument: code.TextDocument): proto.TextDocumentIdentifier {
		return {
			uri: _uriConverter(textDocument.uri)
		};
	}

	function asVersionedTextDocumentIdentifier(textDocument: code.TextDocument): proto.VersionedTextDocumentIdentifier {
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
		return !!candidate.document && !!candidate.contentChanges;
	}

	function isTextDocument(value: any): value is code.TextDocument {
		let candidate = <code.TextDocument>value;
		return !!candidate.uri && !!candidate.version;
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
				contentChanges: [{ text: arg.getText() }]
			}
			return result;
		} else if (isTextDocumentChangeEvent(arg)) {
			let document = arg.document;
			let result: proto.DidChangeTextDocumentParams = {
				textDocument: {
					uri: _uriConverter(document.uri),
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
			throw Error('Unsupported text document change parameter');
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
			result.text = textDocument.getText()
		}
		return result;
	}

	function asTextDocumentSaveReason(reason: code.TextDocumentSaveReason): 1 | 2 | 3 {
		switch (reason) {
			case code.TextDocumentSaveReason.Manual:
				return proto.TextDocumentSaveReason.Manual;
			case code.TextDocumentSaveReason.AfterDelay:
				return proto.TextDocumentSaveReason.AfterDelay;
			case code.TextDocumentSaveReason.FocusOut:
				return proto.TextDocumentSaveReason.FocusOut;
		}
		return proto.TextDocumentSaveReason.Manual;
	}

	function asWillSaveTextDocumentParams(event: code.TextDocumentWillSaveEvent): proto.WillSaveTextDocumentParams {
		return {
			textDocument: asTextDocumentIdentifier(event.document),
			reason: asTextDocumentSaveReason(event.reason)
		}
	}

	function asTextDocumentPositionParams(textDocument: code.TextDocument, position: code.Position): proto.TextDocumentPositionParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument),
			position: asWorkerPosition(position)
		};
	}

	function asWorkerPosition(position: code.Position): proto.Position {
		return { line: position.line, character: position.character };
	}

	function asPosition(value: code.Position): proto.Position;
	function asPosition(value: undefined): undefined;
	function asPosition(value: null): null;
	function asPosition(value: code.Position | undefined | null): proto.Position | undefined | null
	function asPosition(value: code.Position | undefined | null): proto.Position | undefined | null {
		if (value === void 0) {
			return undefined;
		} else if (value === null) {
			return null;
		}
		return { line: value.line, character: value.character };
	}

	function asRange(value: code.Range): proto.Range;
	function asRange(value: undefined): undefined;
	function asRange(value: null): null;
	function asRange(value: code.Range | undefined | null): proto.Range | undefined | null;
	function asRange(value: code.Range | undefined | null): proto.Range | undefined | null {
		if (value === void 0 || value === null) {
			return value;
		}
		return { start: asPosition(value.start), end: asPosition(value.end) };
	}

	function asDiagnosticSeverity(value: code.DiagnosticSeverity): proto.DiagnosticSeverity {
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

	function asDiagnostic(item: code.Diagnostic): proto.Diagnostic {
		let result: proto.Diagnostic = proto.Diagnostic.create(asRange(item.range), item.message);
		if (item.severity) { result.severity = asDiagnosticSeverity(item.severity); }
		if (is.number(item.code) || is.string(item.code)) { result.code = item.code; }
		if (item.source) { result.source = item.source; }
		return result;
	}

	function asDiagnostics(items: code.Diagnostic[]): proto.Diagnostic[] {
		if (items === void 0 || items === null) {
			return items;
		}
		return items.map(asDiagnostic);
	}

	function asCompletionItem(item: code.CompletionItem): proto.CompletionItem {
		let result: proto.CompletionItem = { label: item.label };
		if (item.detail) { result.detail = item.detail; }
		if (item.documentation) { result.documentation = item.documentation; }
		if (item.filterText) { result.filterText = item.filterText; }
		fillPrimaryInsertText(result, item as ProtocolCompletionItem);
		// Protocol item kind is 1 based, codes item kind is zero based.
		if (is.number(item.kind)) {
			if (code.CompletionItemKind.Text <= item.kind && item.kind <= code.CompletionItemKind.Reference) {
				result.kind = (item.kind + 1) as proto.CompletionItemKind;
			} else {
				result.kind = proto.CompletionItemKind.Text;
			}
		}
		if (item.sortText) { result.sortText = item.sortText; }
		if (item.additionalTextEdits) { result.additionalTextEdits = asTextEdits(item.additionalTextEdits); }
		if (item.command) { result.command = asCommand(item.command); }
		if (item instanceof ProtocolCompletionItem && item.data) {
			result.data = item.data;
		}
		return result;
	}

	function fillPrimaryInsertText(target: proto.CompletionItem, source: ProtocolCompletionItem): void {
		let format: proto.InsertTextFormat = proto.InsertTextFormat.PlainText;
		let text: string | undefined;
		let range: proto.Range | undefined = undefined;
		if (source.textEdit) {
			text = source.textEdit.newText;
			range = asRange(source.textEdit.range);
		} else if (source.insertText instanceof code.SnippetString) {
			format = proto.InsertTextFormat.Snippet;
			text = source.insertText.value;
		} else {
			text = source.insertText;
		}
		if (source.range) {
			range = asRange(source.range);
		}

		target.insertTextFormat = format;
		if (source.fromEdit && text && range) {
			target.textEdit = { newText: text, range: range };
		} else {
			target.insertText = text;
		}
	}

	function asTextEdit(edit: code.TextEdit): proto.TextEdit {
		return { range: asRange(edit.range), newText: edit.newText };
	}

	function asTextEdits(edits: code.TextEdit[]): proto.TextEdit[] {
		if (edits === void 0 || edits === null) {
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

	function asCodeActionContext(context: code.CodeActionContext): proto.CodeActionContext {
		if (context === void 0 || context === null) {
			return context;
		}
		return proto.CodeActionContext.create(asDiagnostics(context.diagnostics));
	}

	function asCommand(item: code.Command): proto.Command {
		let result = proto.Command.create(item.title, item.command);
		if (item.arguments) { result.arguments = item.arguments; }
		return result;
	}

	function asCodeLens(item: code.CodeLens): proto.CodeLens {
		let result = proto.CodeLens.create(asRange(item.range));
		if (item.command) { result.command = asCommand(item.command); }
		if (item instanceof ProtocolCodeLens) {
			if (item.data) { result.data = item.data };
		}
		return result;
	}

	function asFormattingOptions(item: code.FormattingOptions): proto.FormattingOptions {
		return { tabSize: item.tabSize, insertSpaces: item.insertSpaces };
	}

	function asDocumentSymbolParams(textDocument: code.TextDocument): proto.DocumentSymbolParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument)
		}
	}

	function asCodeLensParams(textDocument: code.TextDocument): proto.CodeLensParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument)
		};
	}

	function asDocumentLink(item: code.DocumentLink): proto.DocumentLink {
		let result = proto.DocumentLink.create(asRange(item.range));
		if (item.target) { result.target = asUri(item.target); }
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