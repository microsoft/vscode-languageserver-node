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
		PublishDiagnosticsParams, Diagnostic, Severity, Position, Range
	} from './protocol';

export function asOpenTextDocumentParams(textDocument: vs.TextDocument): DidOpenTextDocumentParams {
	return {
		uri: textDocument.getUri().toString(),
		text: textDocument.getText()
	};
}

export function asChangeTextDocumentParams(textDocument: vs.TextDocument): DidChangeTextDocumentParams;
export function asChangeTextDocumentParams(event: vs.TextDocumentChangeEvent): DidChangeTextDocumentParams[];
export function asChangeTextDocumentParams(arg: vs.TextDocumentChangeEvent | vs.TextDocument): any {
	if (arg instanceof vs.TextDocument) {
		return { uri: arg.getUri().toString(), text: arg.getText() };
	} else {
		let event = arg as vs.TextDocumentChangeEvent;
		let result: DidChangeTextDocumentParams[] = [];
		let uri: string = event.document.getUri().toString();
		return event.contentChanges.map((change): DidChangeTextDocumentParams => {
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
	}
}

export function asCloseTextDocumentParams(textDocument: vs.TextDocument): DidCloseTextDocumentParams {
	return {
		uri: textDocument.getUri().toString()
	};
}

export function asDiagnostics(params: PublishDiagnosticsParams): vs.Diagnostic[] {
	let uri = vs.Uri.parse(params.uri);
	return params.diagnostics.map(diagnostic => new vs.Diagnostic(asDiagnosticSeverity(diagnostic.severity), asLocation(uri, diagnostic), diagnostic.message));
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

export function asLocation(uri: vs.Uri, value: Diagnostic): vs.Location {
	return new vs.Location(uri,
		value.end
			? new vs.Range(value.start.line, value.start.character, value.end.line, value.end.character)
			: new vs.Position(value.start.line, value.start.character));
}