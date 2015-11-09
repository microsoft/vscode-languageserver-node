/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as vs from 'vscode';
import {
		InitializeParams, InitializeResult, InitializeError,
		LogMessageParams, MessageType,
		ShowMessageParams, DidChangeConfigurationParams,
		DidOpenTextDocumentParams, DidChangeTextDocumentParams, TextDocumentIdentifier,
		PublishDiagnosticsParams, Diagnostic, DiagnosticSeverity, Position, Range,
		TextDocumentPosition,
		Hover, MarkedString,
		CompletionItem, TextEdit,
		SignatureHelp, SignatureInformation, ParameterInformation
	} from './protocol';

import * as is from './utils/is';

export function asOpenTextDocumentParams(textDocument: vs.TextDocument): DidOpenTextDocumentParams {
	return {
		uri: textDocument.uri.toString(),
		text: textDocument.getText()
	};
}

function isTextDocumentChangeEvent(value: any): value is vs.TextDocumentChangeEvent {
	let candidate = <vs.TextDocumentChangeEvent>value;
	return is.defined(candidate.document) && is.defined(candidate.contentChanges);
}

function isTextDocument(value: any): value is vs.TextDocument {
	let candidate = <vs.TextDocument>value;
	return is.defined(candidate.uri) && is.defined(candidate.version);
}

export function asChangeTextDocumentParams(textDocument: vs.TextDocument): DidChangeTextDocumentParams;
export function asChangeTextDocumentParams(event: vs.TextDocumentChangeEvent): DidChangeTextDocumentParams[];
export function asChangeTextDocumentParams(arg: vs.TextDocumentChangeEvent | vs.TextDocument): any {
	if (isTextDocument(arg)) {
		return { uri: arg.uri.toString(), text: arg.getText() };
	} else if (isTextDocumentChangeEvent(arg)) {
		let result: DidChangeTextDocumentParams[] = [];
		let uri: string = arg.document.uri.toString();
		return arg.contentChanges.map((change): DidChangeTextDocumentParams => {
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

export function asCloseTextDocumentParams(textDocument: vs.TextDocument): TextDocumentIdentifier {
	return {
		uri: textDocument.uri.toString()
	};
}

export function asTextDocumentPosition(textDocument: vs.TextDocument, position: vs.Position): TextDocumentPosition {
	return { uri: textDocument.uri.toString(), position: asWorkerPosition(position) };
}

export function asWorkerPosition(position: vs.Position): Position {
	return { line: position.line, character: position.character };
}

export function asDiagnostics(diagnostics: Diagnostic[]): vs.Diagnostic[] {
	return diagnostics.map(diagnostic => new vs.Diagnostic(asRange(diagnostic.range), diagnostic.message, asDiagnosticSeverity(diagnostic.severity)));
}

export function asRange(value: Range): vs.Range {
	if (is.undefined(value)) {
		return undefined;
	} else if (is.nil(value)) {
		return null;
	}
	return new vs.Range(asPosition(value.start), asPosition(value.end));
}

export function asPosition(value: Position): vs.Position {
	if (is.undefined(value)) {
		return undefined;
	} else if (is.nil(value)) {
		return null;
	}
	return new vs.Position(value.line, value.character);
}

export function asDiagnosticSeverity(value: number): vs.DiagnosticSeverity {
	switch (value) {
		case DiagnosticSeverity.Error:
			return vs.DiagnosticSeverity.Error;
		case DiagnosticSeverity.Warning:
			return vs.DiagnosticSeverity.Warning;
		case DiagnosticSeverity.Information:
			return vs.DiagnosticSeverity.Information;
		case DiagnosticSeverity.Hint:
			return vs.DiagnosticSeverity.Hint;
	}
}

export function asHover(hover: Hover): vs.Hover {
	return new vs.Hover(hover.contents, is.defined(hover.range) ? asRange(hover.range) : undefined);
}

export function asCompletionItems(items: CompletionItem[]): vs.CompletionItem[] {
	return items.map(asCompletionItem);
}

function set(value, func: () => void): void {
	if (is.defined(value)) {
		func();
	}
}

export function asCompletionItem(item: CompletionItem): vs.CompletionItem {
	let result = new vs.CompletionItem(item.label);
	set(item.detail, () => result.detail = item.detail);
	set(item.documentation, () => result.documentation = item.documentation);
	set(item.filterText, () => result.filterText = item.filterText);
	set(item.insertText, () => result.insertText = item.insertText);
	set(item.kind, () => result.kind = item.kind);
	set(item.sortText, () => result.sortText = item.sortText);
	set(item.textEdit, () => result.textEdit = asTextEdit(item.textEdit));
	return result;
}

export function asTextEdit(edit: TextEdit): vs.TextEdit {
	return new vs.TextEdit(asRange(edit.range), edit.newText);
}

export function asSignatureHelp(item: SignatureHelp): vs.SignatureHelp {
	let result = new vs.SignatureHelp();
	set(item.activeParameter, () => result.activeParameter = item.activeParameter);
	set(item.activeSignature, () => result.activeSignature = item.activeSignature);
	set(item.signatures, () => result.signatures = asSignatureInformations(item.signatures));
	return result;
}

export function asSignatureInformations(items: SignatureInformation[]): vs.SignatureInformation[] {
	return items.map(asSignatureInformation);
}

export function asSignatureInformation(item: SignatureInformation): vs.SignatureInformation {
	let result = new vs.SignatureInformation(item.label);
	set(item.documentation, () => result.documentation = item.documentation);
	set(item.parameters, () => result.parameters = asParameterInformations(item.parameters));
	return result;
}

export function asParameterInformations(item: ParameterInformation[]): vs.ParameterInformation[] {
	return item.map(asParameterInformation);
}

export function asParameterInformation(item: ParameterInformation): vs.ParameterInformation {
	let result = new vs.ParameterInformation(item.label);
	set(item.documentation, () => result.documentation = item.documentation);
	return result;
}