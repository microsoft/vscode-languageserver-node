/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as code from 'vscode';
import * as ls from 'vscode-languageserver-types';
import * as is from './utils/is';
import ProtocolCompletionItem from './protocolCompletionItem';
import ProtocolCodeLens from './protocolCodeLens';

export interface Converter {

	asUri(value: string): code.Uri;

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

export interface URIConverter {
	(value: string): code.Uri;
}

export function createConverter(uriConverter?: URIConverter): Converter {

	const nullConverter = (value: string) => code.Uri.parse(value);

	const _uriConverter: URIConverter = uriConverter || nullConverter;

	function asUri(value: string): code.Uri {
		return _uriConverter(value);
	}

	function asDiagnostics(diagnostics: ls.Diagnostic[]): code.Diagnostic[] {
		return diagnostics.map(asDiagnostic);
	}

	function asDiagnostic(diagnostic: ls.Diagnostic): code.Diagnostic {
		let result = new code.Diagnostic(asRange(diagnostic.range), diagnostic.message, asDiagnosticSeverity(diagnostic.severity));
		if (is.defined(diagnostic.code)) {
			result.code = diagnostic.code;
		}
		if (is.defined(diagnostic.source)) {
			result.source = diagnostic.source;
		}
		return result;
	}

	function asRange(value: ls.Range): code.Range {
		if (is.undefined(value)) {
			return undefined;
		} else if (is.nil(value)) {
			return null;
		}
		return new code.Range(asPosition(value.start), asPosition(value.end));
	}

	function asPosition(value: ls.Position): code.Position {
		if (is.undefined(value)) {
			return undefined;
		} else if (is.nil(value)) {
			return null;
		}
		return new code.Position(value.line, value.character);
	}

	function asDiagnosticSeverity(value: number): code.DiagnosticSeverity {
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

	function asHover(hover: ls.Hover): code.Hover {
		if (is.undefined(hover)) {
			return undefined;
		}
		if (is.nil(hover)) {
			return null;
		}
		return new code.Hover(hover.contents, is.defined(hover.range) ? asRange(hover.range) : undefined);
	}

	function asCompletionResult(result: ls.CompletionItem[] | ls.CompletionList): code.CompletionItem[] | code.CompletionList {
		if (Array.isArray(result)) {
			let items = <ls.CompletionItem[]> result;
			return items.map(asCompletionItem);
		}
		let list = <code.CompletionList> result;
		return new code.CompletionList(list.items.map(asCompletionItem), list.isIncomplete);
	}

	function set<T>(value: T, func: () => void): void {
		if (is.defined(value)) {
			func();
		}
	}

	function asCompletionItem(item: ls.CompletionItem): ProtocolCompletionItem {
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

	function asTextEdit(edit: ls.TextEdit): code.TextEdit {
		return new code.TextEdit(asRange(edit.range), edit.newText);
	}

	function asTextEdits(items: ls.TextEdit[]): code.TextEdit[] {
		return items.map(asTextEdit);
	}

	function asSignatureHelp(item: ls.SignatureHelp): code.SignatureHelp {
		let result = new code.SignatureHelp();
		set(item.activeParameter, () => result.activeParameter = item.activeParameter);
		set(item.activeSignature, () => result.activeSignature = item.activeSignature);
		set(item.signatures, () => result.signatures = asSignatureInformations(item.signatures));
		return result;
	}

	function asSignatureInformations(items: ls.SignatureInformation[]): code.SignatureInformation[] {
		return items.map(asSignatureInformation);
	}

	function asSignatureInformation(item: ls.SignatureInformation): code.SignatureInformation {
		let result = new code.SignatureInformation(item.label);
		set(item.documentation, () => result.documentation = item.documentation);
		set(item.parameters, () => result.parameters = asParameterInformations(item.parameters));
		return result;
	}

	function asParameterInformations(item: ls.ParameterInformation[]): code.ParameterInformation[] {
		return item.map(asParameterInformation);
	}

	function asParameterInformation(item: ls.ParameterInformation): code.ParameterInformation {
		let result = new code.ParameterInformation(item.label);
		set(item.documentation, () => result.documentation = item.documentation);
		return result;
	}

	function asDefinitionResult(item: ls.Definition): code.Definition {
		if (is.array(item)) {
			return item.map(asLocation);
		} else {
			return asLocation(item);
		}
	}

	function asLocation(item: ls.Location): code.Location {
		if (is.undefined(item)) {
			return undefined;
		}
		if (is.nil(item)) {
			return null;
		}
		return new code.Location(_uriConverter(item.uri), asRange(item.range));
	}

	function asReferences(values: ls.Location[]): code.Location[] {
		return values.map(asLocation);
	}

	function asDocumentHighlights(values: ls.DocumentHighlight[]): code.DocumentHighlight[] {
		return values.map(asDocumentHighlight);
	}

	function asDocumentHighlight(item: ls.DocumentHighlight): code.DocumentHighlight {
		let result = new code.DocumentHighlight(asRange(item.range));
		set(item.kind, () => result.kind = asDocumentHighlightKind(item.kind));
		return result;
	}

	function asDocumentHighlightKind(item: ls.DocumentHighlightKind): code.DocumentHighlightKind {
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

	function asSymbolInformations(values: ls.SymbolInformation[], uri?: code.Uri): code.SymbolInformation[] {
		return values.map(information => asSymbolInformation(information, uri));
	}

	function asSymbolInformation(item: ls.SymbolInformation, uri?: code.Uri): code.SymbolInformation {
		// Symbol kind is one based in the protocol and zero based in code.
		let result = new code.SymbolInformation(
			item.name, item.kind - 1,
			asRange(item.location.range),
			item.location.uri ? _uriConverter(item.location.uri) : uri);
		set(item.containerName, () => result.containerName = item.containerName);
		return result;
	}

	function asCommand(item: ls.Command): code.Command {
		let result: code.Command = { title: item.title, command: item.command };
		set(item.arguments, () => result.arguments = item.arguments);
		return result;
	}

	function asCommands(items: ls.Command[]): code.Command[] {
		return items.map(asCommand);
	}

	function asCodeLens(item: ls.CodeLens): code.CodeLens {
		let result: ProtocolCodeLens = new ProtocolCodeLens(asRange(item.range));
		if (is.defined(item.command)) result.command = asCommand(item.command);
		if (is.defined(item.data)) result.data = item.data;
		return result;
	}

	function asCodeLenses(items: ls.CodeLens[]): code.CodeLens[] {
		return items.map(asCodeLens);
	}

	function asWorkspaceEdit(item: ls.WorkspaceEdit): code.WorkspaceEdit {
		let result = new code.WorkspaceEdit();
		let keys = Object.keys(item.changes);
		keys.forEach(key => result.set(_uriConverter(key), asTextEdits(item.changes[key])));
		return result;
	}

	function asDocumentLink(item: ls.DocumentLink): code.DocumentLink {
		let range = asRange(item.range);
		let target = is.defined(item.target) && asUri(item.target);
		return new code.DocumentLink(range, target);
	}

	function asDocumentLinks(items: ls.DocumentLink[]): code.DocumentLink[] {
		return items.map(asDocumentLink);
	}	

	return {
		asUri,
		asDiagnostics,
		asDiagnostic,
		asRange,
		asPosition,
		asDiagnosticSeverity,
		asHover,
		asCompletionResult,
		asCompletionItem,
		asTextEdit,
		asTextEdits,
		asSignatureHelp,
		asSignatureInformations,
		asSignatureInformation,
		asParameterInformations,
		asParameterInformation,
		asDefinitionResult,
		asLocation,
		asReferences,
		asDocumentHighlights,
		asDocumentHighlight,
		asDocumentHighlightKind,
		asSymbolInformations,
		asSymbolInformation,
		asCommand,
		asCommands,
		asCodeLens,
		asCodeLenses,
		asWorkspaceEdit,
		asDocumentLink,
		asDocumentLinks
	}
}

// This for backward compatibility since we exported the converter functions as API.
const defaultConverter = createConverter();

export const asDiagnostics: (diagnostics: ls.Diagnostic[]) => code.Diagnostic[] = defaultConverter.asDiagnostics;
export const asDiagnostic: (diagnostic: ls.Diagnostic) => code.Diagnostic = defaultConverter.asDiagnostic;
export const asRange: (value: ls.Range) => code.Range = defaultConverter.asRange;
export const asPosition: (value: ls.Position) => code.Position = defaultConverter.asPosition;
export const asDiagnosticSeverity: (value: number) => code.DiagnosticSeverity = defaultConverter.asDiagnosticSeverity;
export const asHover: (hover: ls.Hover) => code.Hover = defaultConverter.asHover;
export const asCompletionResult: (result: ls.CompletionItem[] | ls.CompletionList) => code.CompletionItem[] | code.CompletionList = defaultConverter.asCompletionResult;
export const asCompletionItem: (item: ls.CompletionItem) => ProtocolCompletionItem = defaultConverter.asCompletionItem;
export const asTextEdit: (edit: ls.TextEdit) => code.TextEdit = defaultConverter.asTextEdit;
export const asTextEdits: (items: ls.TextEdit[]) => code.TextEdit[] = defaultConverter.asTextEdits;
export const asSignatureHelp: (item: ls.SignatureHelp) => code.SignatureHelp = defaultConverter.asSignatureHelp;
export const asSignatureInformations: (items: ls.SignatureInformation[]) => code.SignatureInformation[] = defaultConverter.asSignatureInformations;
export const asSignatureInformation: (item: ls.SignatureInformation) => code.SignatureInformation = defaultConverter.asSignatureInformation;
export const asParameterInformations: (item: ls.ParameterInformation[]) => code.ParameterInformation[] = defaultConverter.asParameterInformations;
export const asParameterInformation: (item: ls.ParameterInformation) => code.ParameterInformation = defaultConverter.asParameterInformation;
export const asDefinitionResult: (item: ls.Definition) => code.Definition = defaultConverter.asDefinitionResult;
export const asLocation: (item: ls.Location) => code.Location = defaultConverter.asLocation;
export const asReferences: (values: ls.Location[]) => code.Location[] = defaultConverter.asReferences;
export const asDocumentHighlights: (values: ls.DocumentHighlight[]) => code.DocumentHighlight[] = defaultConverter.asDocumentHighlights;
export const asDocumentHighlight: (item: ls.DocumentHighlight) => code.DocumentHighlight = defaultConverter.asDocumentHighlight;
export const asDocumentHighlightKind: (item: ls.DocumentHighlightKind) => code.DocumentHighlightKind = defaultConverter.asDocumentHighlightKind;
export const asSymbolInformations: (values: ls.SymbolInformation[], uri?: code.Uri) => code.SymbolInformation[] = defaultConverter.asSymbolInformations;
export const asSymbolInformation: (item: ls.SymbolInformation, uri?: code.Uri) => code.SymbolInformation = defaultConverter.asSymbolInformation;
export const asCommand: (item: ls.Command) => code.Command = defaultConverter.asCommand;
export const asCommands: (items: ls.Command[]) => code.Command[] = defaultConverter.asCommands;
export const asCodeLens: (item: ls.CodeLens) => code.CodeLens = defaultConverter.asCodeLens;
export const asCodeLenses: (items: ls.CodeLens[]) => code.CodeLens[] = defaultConverter.asCodeLenses;
export const asWorkspaceEdit: (item: ls.WorkspaceEdit) => code.WorkspaceEdit = defaultConverter.asWorkspaceEdit;
export const asDocumentLink: (item: ls.DocumentLink) => code.DocumentLink = defaultConverter.asDocumentLink;
export const asDocumentLinks: (item: ls.DocumentLink[]) => code.DocumentLink[] = defaultConverter.asDocumentLinks;