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

export function asDiagnostics(diagnostics: proto.Diagnostic[]): code.Diagnostic[] {
	return diagnostics.map(asDiagnostic);
}

export function asDiagnostic(diagnostic: proto.Diagnostic): code.Diagnostic {
	let result = new code.Diagnostic(asRange(diagnostic.range), diagnostic.message, asDiagnosticSeverity(diagnostic.severity));
	if (is.defined(diagnostic.code)) {
		result.code = diagnostic.code;
	}
	if (is.defined(diagnostic.source)) {
		result.source = diagnostic.source;
	}
	return result;
}

export function asRange(value: proto.Range): code.Range {
	if (is.undefined(value)) {
		return undefined;
	} else if (is.nil(value)) {
		return null;
	}
	return new code.Range(asPosition(value.start), asPosition(value.end));
}

export function asPosition(value: proto.Position): code.Position {
	if (is.undefined(value)) {
		return undefined;
	} else if (is.nil(value)) {
		return null;
	}
	return new code.Position(value.line, value.character);
}

export function asDiagnosticSeverity(value: number): code.DiagnosticSeverity {
	if (is.undefined(value) || is.nil(value)) {
		return code.DiagnosticSeverity.Error;
	}
	switch (value) {
		case proto.DiagnosticSeverity.Error:
			return code.DiagnosticSeverity.Error;
		case proto.DiagnosticSeverity.Warning:
			return code.DiagnosticSeverity.Warning;
		case proto.DiagnosticSeverity.Information:
			return code.DiagnosticSeverity.Information;
		case proto.DiagnosticSeverity.Hint:
			return code.DiagnosticSeverity.Hint;
	}
	return code.DiagnosticSeverity.Error;
}

export function asHover(hover: proto.Hover): code.Hover {
	return new code.Hover(hover.contents, is.defined(hover.range) ? asRange(hover.range) : undefined);
}

export function asCompletionItems(items: proto.CompletionItem[]): code.CompletionItem[] {
	return items.map(asCompletionItem);
}

function set<T>(value: T, func: () => void): void {
	if (is.defined(value)) {
		func();
	}
}

export function asCompletionItem(item: proto.CompletionItem): ProtocolCompletionItem {
	let result = new ProtocolCompletionItem(item.label);
	set(item.detail, () => result.detail = item.detail);
	set(item.documentation, () => result.documentation = item.documentation);
	set(item.filterText, () => result.filterText = item.filterText);
	set(item.insertText, () => result.insertText = item.insertText);
	// Protocol item kind is 1 based, codes item kind is zero based.
	set(item.kind, () => result.kind = item.kind - 1);
	set(item.sortText, () => result.sortText = item.sortText);
	set(item.textEdit, () => result.textEdit = asTextEdit(item.textEdit));
	set(item.data, () => result.data = item.data);
	return result;
}

export function asTextEdit(edit: proto.TextEdit): code.TextEdit {
	return new code.TextEdit(asRange(edit.range), edit.newText);
}

export function asTextEdits(items: proto.TextEdit[]): code.TextEdit[] {
	return items.map(asTextEdit);
}

export function asSignatureHelp(item: proto.SignatureHelp): code.SignatureHelp {
	let result = new code.SignatureHelp();
	set(item.activeParameter, () => result.activeParameter = item.activeParameter);
	set(item.activeSignature, () => result.activeSignature = item.activeSignature);
	set(item.signatures, () => result.signatures = asSignatureInformations(item.signatures));
	return result;
}

export function asSignatureInformations(items: proto.SignatureInformation[]): code.SignatureInformation[] {
	return items.map(asSignatureInformation);
}

export function asSignatureInformation(item: proto.SignatureInformation): code.SignatureInformation {
	let result = new code.SignatureInformation(item.label);
	set(item.documentation, () => result.documentation = item.documentation);
	set(item.parameters, () => result.parameters = asParameterInformations(item.parameters));
	return result;
}

export function asParameterInformations(item: proto.ParameterInformation[]): code.ParameterInformation[] {
	return item.map(asParameterInformation);
}

export function asParameterInformation(item: proto.ParameterInformation): code.ParameterInformation {
	let result = new code.ParameterInformation(item.label);
	set(item.documentation, () => result.documentation = item.documentation);
	return result;
}

export function asDefinitionResult(item: proto.Definition): code.Definition {
	if (is.array(item)) {
		return item.map(asLocation);
	} else {
		return asLocation(item);
	}
}

export function asLocation(item: proto.Location): code.Location {
	return new code.Location(code.Uri.parse(item.uri), asRange(item.range));
}

export function asReferences(values: proto.Location[]): code.Location[] {
	return values.map(asLocation);
}

export function asDocumentHighlights(values: proto.DocumentHighlight[]): code.DocumentHighlight[] {
	return values.map(asDocumentHighlight);
}

export function asDocumentHighlight(item: proto.DocumentHighlight): code.DocumentHighlight {
	let result = new code.DocumentHighlight(asRange(item.range));
	set(item.kind, () => result.kind = asDocumentHighlightKind(item.kind));
	return result;
}

export function asDocumentHighlightKind(item: proto.DocumentHighlightKind): code.DocumentHighlightKind {
	switch(item) {
		case proto.DocumentHighlightKind.Text:
			return code.DocumentHighlightKind.Text;
		case proto.DocumentHighlightKind.Read:
			return code.DocumentHighlightKind.Read;
		case proto.DocumentHighlightKind.Write:
			return code.DocumentHighlightKind.Write;
	}
	return code.DocumentHighlightKind.Text;
}

export function asSymbolInformations(values: proto.SymbolInformation[], uri?: code.Uri): code.SymbolInformation[] {
	return values.map(information => asSymbolInformation(information, uri));
}

export function asSymbolInformation(item: proto.SymbolInformation, uri?: code.Uri): code.SymbolInformation {
	// Symbol kind is one based in the protocol and zero based in code.
	let result = new code.SymbolInformation(
		item.name, item.kind - 1,
		asRange(item.location.range),
		item.location.uri ? code.Uri.parse(item.location.uri) : uri);
	set(item.containerName, () => result.containerName = item.containerName);
	return result;
}

export function asCommand(item: proto.Command): code.Command {
	let result: code.Command = { title: item.title, command: item.command };
	set(item.arguments, () => result.arguments = item.arguments);
	return result;
}

export function asCommands(items: proto.Command[]): code.Command[] {
	return items.map(asCommand);
}

export function asCodeLens(item: proto.CodeLens): code.CodeLens {
	let result: ProtocolCodeLens = new ProtocolCodeLens(asRange(item.range));
	if (is.defined(item.command)) result.command = asCommand(item.command);
	if (is.defined(item.data)) result.data = item.data;
	return result;
}

export function asCodeLenses(items: proto.CodeLens[]): code.CodeLens[] {
	return items.map(asCodeLens);
}

export function asWorkspaceEdit(item: proto.WorkspaceEdit): code.WorkspaceEdit {
	let result = new code.WorkspaceEdit();
	let keys = Object.keys(item.changes);
	keys.forEach(key => result.set(code.Uri.parse(key), asTextEdits(item.changes[key])));
	return result;
}