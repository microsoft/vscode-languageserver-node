/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import * as vs from 'vscode';
import {
		InitializeParams, InitializeResult, InitializeError,
		ShutdownParams, ExitParams, LogMessageParams, MessageType,
		ShowMessageParams, DidChangeConfigurationParams,
		DidOpenTextDocumentParams, DidChangeTextDocumentParams, DidCloseTextDocumentParams,
		DidChangeFilesParams, FileEvent, FileChangeType,
		PublishDiagnosticsParams, Diagnostic, Severity, Position, Range,
		TextDocumentPosition
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

export function asCloseTextDocumentParams(textDocument: vs.TextDocument): DidCloseTextDocumentParams {
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
	return diagnostics.map(diagnostic => new vs.Diagnostic(asRange(diagnostic), diagnostic.message, asDiagnosticSeverity(diagnostic.severity)));
}

export function asRange(value: Diagnostic | Range): vs.Range {
	if (is.undefined(value)) {
		return undefined;
	} else if (is.nil(value)) {
		return null;
	}
	if (value.end) {
		return new vs.Range(value.start.line, value.start.character, value.end.line, value.end.character);
	} else {
		return new vs.Range(value.start.line, value.start.character, value.start.line, value.start.character);
	}
}

export function asDiagnosticSeverity(value: number): vs.DiagnosticSeverity {
	switch (value) {
		case Severity.Error:
			return vs.DiagnosticSeverity.Error;
		case Severity.Warning:
			return vs.DiagnosticSeverity.Warning;
		case Severity.Information:
			return vs.DiagnosticSeverity.Information;
		case Severity.Hint:
			return vs.DiagnosticSeverity.Hint;
	}
}