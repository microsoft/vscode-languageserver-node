import * as code from 'vscode';
import * as ls from 'vscode-languageserver-types';
import * as is from '../utils/is';
import ProtocolCompletionItem from '../protocolCompletionItem';
import ProtocolCodeLens from '../protocolCodeLens';

export interface URIConverter {
	(value: string): code.Uri;
}

export interface Converter {
	asUri: URIConverter;

	asDiagnostics(diagnostics: ls.Diagnostic[]): code.Diagnostic[];

	asDiagnostic(diagnostic: ls.Diagnostic): code.Diagnostic;

	asRange(value: ls.Range): code.Range;

	asPosition(value: ls.Position): code.Position;

	asDiagnosticSeverity(value: number): code.DiagnosticSeverity;

	asHover(hover: ls.Hover): code.Hover;

	asCompletionResult(result: ls.CompletionItem[] | ls.CompletionList): code.CompletionItem[] | code.CompletionList

	asCompletionItem(item: ls.CompletionItem): ProtocolCompletionItem;

	asTextEdit(edit: ls.TextEdit): code.TextEdit;

	asTextEdits(items: ls.TextEdit[]): code.TextEdit[];

	asSignatureHelp(item: ls.SignatureHelp): code.SignatureHelp;

	asSignatureInformations(items: ls.SignatureInformation[]): code.SignatureInformation[];

	asSignatureInformation(item: ls.SignatureInformation): code.SignatureInformation;

	asParameterInformations(item: ls.ParameterInformation[]): code.ParameterInformation[];

	asParameterInformation(item: ls.ParameterInformation): code.ParameterInformation;

	asDefinitionResult(item: ls.Definition): code.Definition;

	asLocation(item: ls.Location): code.Location;

	asReferences(values: ls.Location[]): code.Location[];

	asDocumentHighlights(values: ls.DocumentHighlight[]): code.DocumentHighlight[];

	asDocumentHighlight(item: ls.DocumentHighlight): code.DocumentHighlight;

	asDocumentHighlightKind(item: ls.DocumentHighlightKind): code.DocumentHighlightKind;

	asSymbolInformations(values: ls.SymbolInformation[], uri?: code.Uri): code.SymbolInformation[];

	asSymbolInformation(item: ls.SymbolInformation, uri?: code.Uri): code.SymbolInformation;

	asCommand(item: ls.Command): code.Command;

	asCommands(items: ls.Command[]): code.Command[];

	asCodeLens(item: ls.CodeLens): code.CodeLens;

	asCodeLenses(items: ls.CodeLens[]): code.CodeLens[];

	asWorkspaceEdit(item: ls.WorkspaceEdit): code.WorkspaceEdit;

	asDocumentLink(item: ls.DocumentLink): code.DocumentLink;

	asDocumentLinks(items: ls.DocumentLink[]): code.DocumentLink[];
}
