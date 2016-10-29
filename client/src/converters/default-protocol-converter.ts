/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as code from 'vscode';
import * as ls from 'vscode-languageserver-types';
import * as is from '../utils/is';
import ProtocolCompletionItem from '../protocolCompletionItem';
import ProtocolCodeLens from '../protocolCodeLens';
import { Converter, URIConverter } from './protocol-converter';

export class DefaultProtocolConverter implements Converter {
	static NULL_CONVERTER: URIConverter = (value: string) => code.Uri.parse(value);

	private _uriConverter: URIConverter;
    constructor(uriConverter: URIConverter = DefaultProtocolConverter.NULL_CONVERTER) {
        this._uriConverter = uriConverter;
    }

	asUri(value: string): code.Uri {
		return this._uriConverter(value);
	}

	asDiagnostics(diagnostics: ls.Diagnostic[]): code.Diagnostic[] {
		return diagnostics.map(this.asDiagnostic);
	}

	asDiagnostic(diagnostic: ls.Diagnostic): code.Diagnostic {
		let result = new code.Diagnostic(this.asRange(diagnostic.range), diagnostic.message, this.asDiagnosticSeverity(diagnostic.severity));
		if (is.defined(diagnostic.code)) {
			result.code = diagnostic.code;
		}
		if (is.defined(diagnostic.source)) {
			result.source = diagnostic.source;
		}
		return result;
	}

	asRange(value: ls.Range): code.Range {
		if (is.undefined(value)) {
			return undefined;
		} else if (is.nil(value)) {
			return null;
		}
		return new code.Range(this.asPosition(value.start), this.asPosition(value.end));
	}

	asPosition(value: ls.Position): code.Position {
		if (is.undefined(value)) {
			return undefined;
		} else if (is.nil(value)) {
			return null;
		}
		return new code.Position(value.line, value.character);
	}

	asDiagnosticSeverity(value: number): code.DiagnosticSeverity {
		if (is.undefined(value) || is.nil(value)) {
			return code.DiagnosticSeverity.Error;
		}
		switch (value) {
			case ls.DiagnosticSeverity.Error:
				return code.DiagnosticSeverity.Error;
			case ls.DiagnosticSeverity.Warning:
				return code.DiagnosticSeverity.Warning;
			case ls.DiagnosticSeverity.Information:
				return code.DiagnosticSeverity.Information;
			case ls.DiagnosticSeverity.Hint:
				return code.DiagnosticSeverity.Hint;
		}
		return code.DiagnosticSeverity.Error;
	}

	asHover(hover: ls.Hover): code.Hover {
		if (is.undefined(hover)) {
			return undefined;
		}
		if (is.nil(hover)) {
			return null;
		}
		return new code.Hover(hover.contents, is.defined(hover.range) ? this.asRange(hover.range) : undefined);
	}

	asCompletionResult(result: ls.CompletionItem[] | ls.CompletionList): code.CompletionItem[] | code.CompletionList {
		if (Array.isArray(result)) {
			let items = <ls.CompletionItem[]> result;
			return items.map(this.asCompletionItem);
		}
		let list = <code.CompletionList> result;
		return new code.CompletionList(list.items.map(this.asCompletionItem), list.isIncomplete);
	}

	set<T>(value: T, func: () => void): void {
		if (is.defined(value)) {
			func();
		}
	}

	asCompletionItem(item: ls.CompletionItem): ProtocolCompletionItem {
		let result = new ProtocolCompletionItem(item.label);
		this.set(item.detail, () => result.detail = item.detail);
		this.set(item.documentation, () => result.documentation = item.documentation);
		this.set(item.filterText, () => result.filterText = item.filterText);
		this.set(item.insertText, () => result.insertText = item.insertText);
		// Protocol item kind is 1 based, codes item kind is zero based.
		this.set(item.kind, () => result.kind = item.kind - 1);
		this.set(item.sortText, () => result.sortText = item.sortText);
		this.set(item.textEdit, () => result.textEdit = this.asTextEdit(item.textEdit));
		this.set(item.data, () => result.data = item.data);
		return result;
	}

	asTextEdit(edit: ls.TextEdit): code.TextEdit {
		return new code.TextEdit(this.asRange(edit.range), edit.newText);
	}

	asTextEdits(items: ls.TextEdit[]): code.TextEdit[] {
		return items.map(this.asTextEdit);
	}

	asSignatureHelp(item: ls.SignatureHelp): code.SignatureHelp {
		let result = new code.SignatureHelp();
		this.set(item.activeParameter, () => result.activeParameter = item.activeParameter);
		this.set(item.activeSignature, () => result.activeSignature = item.activeSignature);
		this.set(item.signatures, () => result.signatures = this.asSignatureInformations(item.signatures));
		return result;
	}

	asSignatureInformations(items: ls.SignatureInformation[]): code.SignatureInformation[] {
		return items.map(this.asSignatureInformation);
	}

	asSignatureInformation(item: ls.SignatureInformation): code.SignatureInformation {
		let result = new code.SignatureInformation(item.label);
		this.set(item.documentation, () => result.documentation = item.documentation);
		this.set(item.parameters, () => result.parameters = this.asParameterInformations(item.parameters));
		return result;
	}

	asParameterInformations(item: ls.ParameterInformation[]): code.ParameterInformation[] {
		return item.map(this.asParameterInformation);
	}

	asParameterInformation(item: ls.ParameterInformation): code.ParameterInformation {
		let result = new code.ParameterInformation(item.label);
		this.set(item.documentation, () => result.documentation = item.documentation);
		return result;
	}

	asDefinitionResult(item: ls.Definition): code.Definition {
		if (is.array(item)) {
			return item.map(this.asLocation);
		} else {
			return this.asLocation(item);
		}
	}

	asLocation(item: ls.Location): code.Location {
		if (is.undefined(item)) {
			return undefined;
		}
		if (is.nil(item)) {
			return null;
		}
		return new code.Location(this._uriConverter(item.uri), this.asRange(item.range));
	}

	asReferences(values: ls.Location[]): code.Location[] {
		return values.map(this.asLocation);
	}

	asDocumentHighlights(values: ls.DocumentHighlight[]): code.DocumentHighlight[] {
		return values.map(this.asDocumentHighlight);
	}

	asDocumentHighlight(item: ls.DocumentHighlight): code.DocumentHighlight {
		let result = new code.DocumentHighlight(this.asRange(item.range));
		this.set(item.kind, () => result.kind = this.asDocumentHighlightKind(item.kind));
		return result;
	}

	asDocumentHighlightKind(item: ls.DocumentHighlightKind): code.DocumentHighlightKind {
		switch(item) {
			case ls.DocumentHighlightKind.Text:
				return code.DocumentHighlightKind.Text;
			case ls.DocumentHighlightKind.Read:
				return code.DocumentHighlightKind.Read;
			case ls.DocumentHighlightKind.Write:
				return code.DocumentHighlightKind.Write;
		}
		return code.DocumentHighlightKind.Text;
	}

	asSymbolInformations(values: ls.SymbolInformation[], uri?: code.Uri): code.SymbolInformation[] {
		return values.map(information => this.asSymbolInformation(information, uri));
	}

	asSymbolInformation(item: ls.SymbolInformation, uri?: code.Uri): code.SymbolInformation {
		// Symbol kind is one based in the protocol and zero based in code.
		let result = new code.SymbolInformation(
			item.name, item.kind - 1,
			this.asRange(item.location.range),
			item.location.uri ? this._uriConverter(item.location.uri) : uri);
		this.set(item.containerName, () => result.containerName = item.containerName);
		return result;
	}

	asCommand(item: ls.Command): code.Command {
		let result: code.Command = { title: item.title, command: item.command };
		this.set(item.arguments, () => result.arguments = item.arguments);
		return result;
	}

	asCommands(items: ls.Command[]): code.Command[] {
		return items.map(this.asCommand);
	}

	asCodeLens(item: ls.CodeLens): code.CodeLens {
		let result: ProtocolCodeLens = new ProtocolCodeLens(this.asRange(item.range));
		if (is.defined(item.command)) result.command = this.asCommand(item.command);
		if (is.defined(item.data)) result.data = item.data;
		return result;
	}

	asCodeLenses(items: ls.CodeLens[]): code.CodeLens[] {
		return items.map(this.asCodeLens);
	}

	asWorkspaceEdit(item: ls.WorkspaceEdit): code.WorkspaceEdit {
		let result = new code.WorkspaceEdit();
		let keys = Object.keys(item.changes);
		keys.forEach(key => result.set(this._uriConverter(key), this.asTextEdits(item.changes[key])));
		return result;
	}

	asDocumentLink(item: ls.DocumentLink): code.DocumentLink {
		let range = this.asRange(item.range);
		let target = is.defined(item.target) && this.asUri(item.target);
		return new code.DocumentLink(range, target);
	}

	asDocumentLinks(items: ls.DocumentLink[]): code.DocumentLink[] {
		return items.map(this.asDocumentLink);
	}
}