/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as code from 'vscode';
import * as proto from './protocol';
import * as is from './utils/is';

export function asDiagnostics(diagnostics: proto.Diagnostic[]): code.Diagnostic[] {
	return diagnostics.map(diagnostic => new code.Diagnostic(asRange(diagnostic.range), diagnostic.message, asDiagnosticSeverity(diagnostic.severity)));
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
}

export function asHover(hover: proto.Hover): code.Hover {
	return new code.Hover(hover.contents, is.defined(hover.range) ? asRange(hover.range) : undefined);
}

export function asCompletionItems(items: proto.CompletionItem[]): code.CompletionItem[] {
	return items.map(asCompletionItem);
}

function set(value, func: () => void): void {
	if (is.defined(value)) {
		func();
	}
}

export function asCompletionItem(item: proto.CompletionItem): code.CompletionItem {
	let result = new code.CompletionItem(item.label);
	set(item.detail, () => result.detail = item.detail);
	set(item.documentation, () => result.documentation = item.documentation);
	set(item.filterText, () => result.filterText = item.filterText);
	set(item.insertText, () => result.insertText = item.insertText);
	// Protocol item kind is 1 based, codes item kind is zero based.
	set(item.kind, () => result.kind = item.kind - 1);
	set(item.sortText, () => result.sortText = item.sortText);
	set(item.textEdit, () => result.textEdit = asTextEdit(item.textEdit));
	return result;
}

export function asTextEdit(edit: proto.TextEdit): code.TextEdit {
	return new code.TextEdit(asRange(edit.range), edit.newText);
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