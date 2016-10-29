/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as code from 'vscode';
import * as ls from 'vscode-languageserver-types';
import * as proto from '../protocol';
import * as is from '../utils/is';
import ProtocolCompletionItem from '../protocolCompletionItem';
import ProtocolCodeLens from '../protocolCodeLens';
import { Converter, URIConverter } from './code-converter';

export class DefaultCodeConverter implements Converter {
	static NULL_CONVERTER: URIConverter = (value: code.Uri) => value.toString();

	private _uriConverter: URIConverter;
    constructor(uriConverter: URIConverter = DefaultCodeConverter.NULL_CONVERTER) {
        this._uriConverter = uriConverter;
    }

	asUri(value: code.Uri): string {
		return this._uriConverter(value);
	}

	asTextDocumentIdentifier(textDocument: code.TextDocument): ls.TextDocumentIdentifier {
		return {
			uri: this._uriConverter(textDocument.uri)
		};
	}

	asOpenTextDocumentParams(textDocument: code.TextDocument): proto.DidOpenTextDocumentParams {
		return {
			textDocument: {
				uri: this._uriConverter(textDocument.uri),
				languageId: textDocument.languageId,
				version: textDocument.version,
				text: textDocument.getText()
			}
		};
	}

	isTextDocumentChangeEvent(value: any): value is code.TextDocumentChangeEvent {
		let candidate = <code.TextDocumentChangeEvent>value;
		return is.defined(candidate.document) && is.defined(candidate.contentChanges);
	}

	isTextDocument(value: any): value is code.TextDocument {
		let candidate = <code.TextDocument>value;
		return is.defined(candidate.uri) && is.defined(candidate.version);
	}

	asChangeTextDocumentParams(textDocument: code.TextDocument): proto.DidChangeTextDocumentParams;
	asChangeTextDocumentParams(event: code.TextDocumentChangeEvent): proto.DidChangeTextDocumentParams;
	asChangeTextDocumentParams(arg: code.TextDocumentChangeEvent | code.TextDocument): proto.DidChangeTextDocumentParams {
		if (this.isTextDocument(arg)) {
			let result: proto.DidChangeTextDocumentParams = {
				textDocument: {
					uri: this._uriConverter(arg.uri),
					version: arg.version
				},
				contentChanges: [ { text: arg.getText() } ]
			}
			return result;
		} else if (this.isTextDocumentChangeEvent(arg)) {
			let document = arg.document;
			let result: proto.DidChangeTextDocumentParams = {
				textDocument: {
					uri: this._uriConverter(document.uri),
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

	asCloseTextDocumentParams(textDocument: code.TextDocument): proto.DidCloseTextDocumentParams {
		return {
			textDocument: this.asTextDocumentIdentifier(textDocument)
		};
	}

	asSaveTextDocumentParams(textDocument: code.TextDocument): proto.DidSaveTextDocumentParams {
		return {
			textDocument: this.asTextDocumentIdentifier(textDocument)
		}
	}

	asWillSaveTextDocumentParams(event: code.TextDocumentWillSaveEvent): proto.WillSaveTextDocumentParams {
		return {
			textDocument: this.asTextDocumentIdentifier(event.document),
			reason: event.reason
		}
	}

	asTextDocumentPositionParams(textDocument: code.TextDocument, position: code.Position): proto.TextDocumentPositionParams {
		return {
			textDocument: this.asTextDocumentIdentifier(textDocument),
			position: this.asWorkerPosition(position)
		};
	}

	asWorkerPosition(position: code.Position): ls.Position {
		return { line: position.line, character: position.character };
	}

	asRange(value: code.Range): ls.Range {
		if (is.undefined(value)) {
			return undefined;
		} else if (is.nil(value)) {
			return null;
		}
		return { start: this.asPosition(value.start), end: this.asPosition(value.end) };
	}

	asPosition(value: code.Position): ls.Position {
		if (is.undefined(value)) {
			return undefined;
		} else if (is.nil(value)) {
			return null;
		}
		return { line: value.line, character: value.character };
	}

	set(value, func: () => void): void {
		if (is.defined(value)) {
			func();
		}
	}

	asDiagnosticSeverity(value: code.DiagnosticSeverity): ls.DiagnosticSeverity {
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

	asDiagnostic(item: code.Diagnostic): ls.Diagnostic {
		let result: ls.Diagnostic = ls.Diagnostic.create(this.asRange(item.range), item.message);
		this.set(item.severity, () => result.severity = this.asDiagnosticSeverity(item.severity));
		this.set(item.code, () => result.code = item.code);
		this.set(item.source, () => result.source = item.source);
		return result;
	}

	asDiagnostics(items: code.Diagnostic[]): ls.Diagnostic[] {
		if (is.undefined(items) || is.nil(items)) {
			return items;
		}
		return items.map(this.asDiagnostic);
	}

	asCompletionItem(item: code.CompletionItem): ls.CompletionItem {
		let result: ls.CompletionItem = { label: item.label };
		this.set(item.detail, () => result.detail = item.detail);
		this.set(item.documentation, () => result.documentation = item.documentation);
		this.set(item.filterText, () => result.filterText = item.filterText);
		this.set(item.insertText, () => result.insertText = item.insertText);
		// Protocol item kind is 1 based, codes item kind is zero based.
		this.set(item.kind, () => result.kind = item.kind + 1);
		this.set(item.sortText, () => result.sortText = item.sortText);
		this.set(item.textEdit, () => result.textEdit = this.asTextEdit(item.textEdit));
		if (item instanceof ProtocolCompletionItem) {
			this.set(item.data, () => result.data = item.data);
		}
		return result;
	}

	asTextEdit(edit: code.TextEdit): ls.TextEdit {
		return { range: this.asRange(edit.range), newText: edit.newText };
	}

	asReferenceParams(textDocument: code.TextDocument, position: code.Position, options: { includeDeclaration: boolean; }): proto.ReferenceParams {
		return {
			textDocument: this.asTextDocumentIdentifier(textDocument),
			position: this.asWorkerPosition(position),
			context: { includeDeclaration: options.includeDeclaration }
		};
	}

	asCodeActionContext(context: code.CodeActionContext): ls.CodeActionContext {
		if (is.undefined(context) || is.nil(context)) {
			return context;
		}
		return ls.CodeActionContext.create(this.asDiagnostics(context.diagnostics));
	}

	asCommand(item: code.Command): ls.Command {
		let result = ls.Command.create(item.title, item.command);
		if (is.defined(item.arguments)) result.arguments = item.arguments;
		return result;
	}

	asCodeLens(item: code.CodeLens): ls.CodeLens {
		let result = ls.CodeLens.create(this.asRange(item.range));
		if (is.defined(item.command)) result.command = this.asCommand(item.command);
		if (item instanceof ProtocolCodeLens) {
			if (is.defined(item.data)) result.data = item.data;
		}
		return result;
	}

	asFormattingOptions(item: code.FormattingOptions): ls.FormattingOptions {
		return { tabSize: item.tabSize, insertSpaces: item.insertSpaces };
	}

	asDocumentSymbolParams(textDocument: code.TextDocument): proto.DocumentSymbolParams {
		return {
			textDocument: this.asTextDocumentIdentifier(textDocument)
		}
	}

	asCodeLensParams(textDocument: code.TextDocument): proto.CodeLensParams {
		return {
			textDocument: this.asTextDocumentIdentifier(textDocument)
		};
	}

	asDocumentLink(item: code.DocumentLink): ls.DocumentLink {
		let result = ls.DocumentLink.create(this.asRange(item.range));
		if (is.defined(item.target)) result.target = this.asUri(item.target);
		return result;
	}

	asDocumentLinkParams(textDocument: code.TextDocument): proto.DocumentLinkParams {
		return {
			textDocument: this.asTextDocumentIdentifier(textDocument)
		};
	}
}