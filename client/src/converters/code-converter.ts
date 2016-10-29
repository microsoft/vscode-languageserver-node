import * as code from 'vscode';
import * as ls from 'vscode-languageserver-types';
import * as proto from '../protocol';

export interface URIConverter {
	(value: code.Uri): string;
}

export interface Converter {
	asUri: URIConverter;

	asTextDocumentIdentifier(textDocument: code.TextDocument): ls.TextDocumentIdentifier;

	asOpenTextDocumentParams(textDocument: code.TextDocument): proto.DidOpenTextDocumentParams;

	asChangeTextDocumentParams(textDocument: code.TextDocument): proto.DidChangeTextDocumentParams;
	asChangeTextDocumentParams(event: code.TextDocumentChangeEvent): proto.DidChangeTextDocumentParams;

	asCloseTextDocumentParams(textDocument: code.TextDocument): proto.DidCloseTextDocumentParams;

	asSaveTextDocumentParams(textDocument: code.TextDocument): proto.DidSaveTextDocumentParams;
	asWillSaveTextDocumentParams(event: code.TextDocumentWillSaveEvent): proto.WillSaveTextDocumentParams;

	asTextDocumentPositionParams(textDocument: code.TextDocument, position: code.Position): proto.TextDocumentPositionParams;

	asWorkerPosition(position: code.Position): ls.Position;

	asRange(value: code.Range): ls.Range;

	asPosition(value: code.Position): ls.Position;

	asDiagnosticSeverity(value: code.DiagnosticSeverity): ls.DiagnosticSeverity;

	asDiagnostic(item: code.Diagnostic): ls.Diagnostic;
	asDiagnostics(items: code.Diagnostic[]): ls.Diagnostic[];

	asCompletionItem(item: code.CompletionItem): ls.CompletionItem;

	asTextEdit(edit: code.TextEdit): ls.TextEdit;

	asReferenceParams(textDocument: code.TextDocument, position: code.Position, options: { includeDeclaration: boolean; }): proto.ReferenceParams;

	asCodeActionContext(context: code.CodeActionContext): ls.CodeActionContext;

	asCommand(item: code.Command): ls.Command;

	asCodeLens(item: code.CodeLens): ls.CodeLens;

	asFormattingOptions(item: code.FormattingOptions): ls.FormattingOptions;

	asDocumentSymbolParams(textDocument: code.TextDocument): proto.DocumentSymbolParams;

	asCodeLensParams(textDocument: code.TextDocument): proto.CodeLensParams;

	asDocumentLink(item: code.DocumentLink): ls.DocumentLink;

	asDocumentLinkParams(textDocument: code.TextDocument): proto.DocumentLinkParams;
}