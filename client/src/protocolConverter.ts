/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as code from 'vscode';
import * as ls from 'vscode-languageserver-protocol';
import * as Is from './utils/is';
import ProtocolCompletionItem from './protocolCompletionItem';
import ProtocolCodeLens from './protocolCodeLens';
import ProtocolDocumentLink from './protocolDocumentLink';

export interface Converter {

	asUri(value: string): code.Uri;

	asDiagnostic(diagnostic: ls.Diagnostic): code.Diagnostic;

	asDiagnostics(diagnostics: ls.Diagnostic[]): code.Diagnostic[];

	asPosition(value: undefined | null): undefined;
	asPosition(value: ls.Position): code.Position;
	asPosition(value: ls.Position | undefined | null): code.Position | undefined;

	asRange(value: undefined | null): undefined;
	asRange(value: ls.Range): code.Range;
	asRange(value: ls.Range | undefined | null): code.Range | undefined;

	asDiagnosticSeverity(value: number | undefined | null): code.DiagnosticSeverity;

	asHover(hover: ls.Hover): code.Hover;
	asHover(hover: undefined | null): undefined;
	asHover(hover: ls.Hover | undefined | null): code.Hover | undefined;

	asCompletionResult(result: ls.CompletionList): code.CompletionList;
	asCompletionResult(result: ls.CompletionItem[]): code.CompletionItem[];
	asCompletionResult(result: undefined | null): undefined;
	asCompletionResult(result: ls.CompletionItem[] | ls.CompletionList | undefined | null): code.CompletionItem[] | code.CompletionList | undefined;

	asCompletionItem(item: ls.CompletionItem): ProtocolCompletionItem;

	asTextEdit(edit: undefined | null): undefined;
	asTextEdit(edit: ls.TextEdit): code.TextEdit;
	asTextEdit(edit: ls.TextEdit | undefined | null): code.TextEdit | undefined;

	asTextEdits(items: ls.TextEdit[]): code.TextEdit[];
	asTextEdits(items: undefined | null): undefined;
	asTextEdits(items: ls.TextEdit[] | undefined | null): code.TextEdit[] | undefined;

	asSignatureHelp(item: undefined | null): undefined;
	asSignatureHelp(item: ls.SignatureHelp): code.SignatureHelp;
	asSignatureHelp(item: ls.SignatureHelp | undefined | null): code.SignatureHelp | undefined;

	asSignatureInformation(item: ls.SignatureInformation): code.SignatureInformation;

	asSignatureInformations(items: ls.SignatureInformation[]): code.SignatureInformation[];

	asParameterInformation(item: ls.ParameterInformation): code.ParameterInformation;

	asParameterInformations(item: ls.ParameterInformation[]): code.ParameterInformation[];

	asDefinitionResult(item: ls.Definition): code.Definition;
	asDefinitionResult(item: undefined | null): undefined;
	asDefinitionResult(item: ls.Definition | undefined | null): code.Definition | undefined;

	asLocation(item: ls.Location): code.Location;
	asLocation(item: undefined | null): undefined;
	asLocation(item: ls.Location | undefined | null): code.Location | undefined;

	asReferences(values: ls.Location[]): code.Location[];
	asReferences(values: undefined | null): code.Location[] | undefined;
	asReferences(values: ls.Location[] | undefined | null): code.Location[] | undefined;

	asDocumentHighlightKind(item: number): code.DocumentHighlightKind;

	asDocumentHighlight(item: ls.DocumentHighlight): code.DocumentHighlight;

	asDocumentHighlights(values: ls.DocumentHighlight[]): code.DocumentHighlight[];
	asDocumentHighlights(values: undefined | null): undefined;
	asDocumentHighlights(values: ls.DocumentHighlight[] | undefined | null): code.DocumentHighlight[] | undefined;

	asSymbolInformation(item: ls.SymbolInformation, uri?: code.Uri): code.SymbolInformation;

	asSymbolInformations(values: ls.SymbolInformation[], uri?: code.Uri): code.SymbolInformation[];
	asSymbolInformations(values: undefined | null, uri?: code.Uri): undefined;
	asSymbolInformations(values: ls.SymbolInformation[] | undefined | null, uri?: code.Uri): code.SymbolInformation[] | undefined;

	asCommand(item: ls.Command): code.Command;

	asCommands(items: ls.Command[]): code.Command[];
	asCommands(items: undefined | null): undefined
	asCommands(items: ls.Command[] | undefined | null): code.Command[] | undefined;

	asCodeAction(item: ls.CodeAction): code.CodeAction;
	asCodeAction(item: undefined | null): undefined;
	asCodeAction(item: ls.CodeAction | undefined | null): code.CodeAction | undefined;

	asCodeLens(item: ls.CodeLens): code.CodeLens;
	asCodeLens(item: undefined | null): undefined;
	asCodeLens(item: ls.CodeLens | undefined | null): code.CodeLens | undefined;

	asCodeLenses(items: ls.CodeLens[]): code.CodeLens[];
	asCodeLenses(items: undefined | null): undefined;
	asCodeLenses(items: ls.CodeLens[] | undefined | null): code.CodeLens[] | undefined;

	asWorkspaceEdit(item: ls.WorkspaceEdit): code.WorkspaceEdit;
	asWorkspaceEdit(item: undefined | null): undefined;
	asWorkspaceEdit(item: ls.WorkspaceEdit | undefined | null): code.WorkspaceEdit | undefined;

	asDocumentLink(item: ls.DocumentLink): code.DocumentLink;

	asDocumentLinks(items: ls.DocumentLink[]): code.DocumentLink[];
	asDocumentLinks(items: undefined | null): undefined;
	asDocumentLinks(items: ls.DocumentLink[] | undefined | null): code.DocumentLink[] | undefined;
}

export interface URIConverter {
	(value: string): code.Uri;
}

interface CodeFenceBlock {
	language: string;
	value: string;
}

namespace CodeBlock {
	export function is(value: any): value is CodeFenceBlock {
		let candidate: CodeFenceBlock = value;
		return candidate && Is.string(candidate.language) && Is.string(candidate.value);
	}
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
		if (Is.number(diagnostic.code) || Is.string(diagnostic.code)) { result.code = diagnostic.code; }
		if (diagnostic.source) { result.source = diagnostic.source; }
		if (diagnostic.relatedInformation) { result.relatedInformation = asRelatedInformation(diagnostic.relatedInformation); }
		return result;
	}

	function asRelatedInformation(relatedInformation: ls.DiagnosticRelatedInformation[]): code.DiagnosticRelatedInformation[] {
		return relatedInformation.map(asDiagnosticRelatedInformation);
	}

	function asDiagnosticRelatedInformation(information: ls.DiagnosticRelatedInformation): code.DiagnosticRelatedInformation {
		return new code.DiagnosticRelatedInformation(asLocation(information.location), information.message);
	}

	function asPosition(value: undefined | null): undefined;
	function asPosition(value: ls.Position): code.Position;
	function asPosition(value: ls.Position | undefined | null): code.Position | undefined;
	function asPosition(value: ls.Position | undefined | null): code.Position | undefined {
		if (!value) {
			return undefined;
		}
		return new code.Position(value.line, value.character);
	}

	function asRange(value: undefined | null): undefined;
	function asRange(value: ls.Range): code.Range;
	function asRange(value: ls.Range | undefined | null): code.Range | undefined;
	function asRange(value: ls.Range | undefined | null): code.Range | undefined {
		if (!value) {
			return undefined;
		}
		return new code.Range(asPosition(value.start), asPosition(value.end));
	}

	function asDiagnosticSeverity(value: number | undefined | null): code.DiagnosticSeverity {
		if (value === void 0 || value === null) {
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

	function asHoverContent(value: ls.MarkedString | ls.MarkedString[] | ls.MarkupContent): code.MarkdownString | code.MarkdownString[] {
		if (Is.string(value)) {
			return new code.MarkdownString(value);
		} else if (CodeBlock.is(value)) {
			let result = new code.MarkdownString();
			return result.appendCodeblock(value.value, value.language);
		} else if (Array.isArray(value)) {
			let result: code.MarkdownString[] = [];
			for (let element of value) {
				let item = new code.MarkdownString();
				if (CodeBlock.is(element)) {
					item.appendCodeblock(element.value, element.language);
				} else {
					item.appendMarkdown(element);
				}
				result.push(item);
			}
			return result;
		} else {
			let result: code.MarkdownString;
			switch (value.kind) {
				case ls.MarkupKind.Markdown:
					return new code.MarkdownString(value.value);
				case ls.MarkupKind.PlainText:
					result = new code.MarkdownString();
					result.appendText(value.value);
					return result;
				default:
					result = new code.MarkdownString();
					result.appendText(`Unsupported Markup content received. Kind is: ${value.kind}`);
					return result;
			}
		}
	}

	function asDocumentation(value: string | ls.MarkupContent): string | code.MarkdownString {
		if (Is.string(value)) {
			return value;
		} else {
			switch (value.kind) {
				case ls.MarkupKind.Markdown:
					return new code.MarkdownString(value.value);
				case ls.MarkupKind.PlainText:
					return value.value;
				default:
					return `Unsupported Markup content received. Kind is: ${value.kind}`;
			}
		}
	}

	function asHover(hover: ls.Hover): code.Hover;
	function asHover(hover: undefined | null): undefined;
	function asHover(hover: ls.Hover | undefined | null): code.Hover | undefined;
	function asHover(hover: ls.Hover | undefined | null): code.Hover | undefined {
		if (!hover) {
			return undefined;
		}
		return new code.Hover(asHoverContent(hover.contents), asRange(hover.range));
	}

	function asCompletionResult(result: ls.CompletionList): code.CompletionList;
	function asCompletionResult(result: ls.CompletionItem[]): code.CompletionItem[];
	function asCompletionResult(result: undefined | null): undefined;
	function asCompletionResult(result: ls.CompletionItem[] | ls.CompletionList | undefined | null): code.CompletionItem[] | code.CompletionList | undefined;
	function asCompletionResult(result: ls.CompletionItem[] | ls.CompletionList | undefined | null): code.CompletionItem[] | code.CompletionList | undefined {
		if (!result) {
			return undefined;
		}
		if (Array.isArray(result)) {
			let items = <ls.CompletionItem[]>result;
			return items.map(asCompletionItem);
		}
		let list = <ls.CompletionList>result;
		return new code.CompletionList(list.items.map(asCompletionItem), list.isIncomplete);
	}

	function asCompletionItemKind(value: ls.CompletionItemKind): [code.CompletionItemKind, ls.CompletionItemKind | undefined] {
		// Protocol item kind is 1 based, codes item kind is zero based.
		if (ls.CompletionItemKind.Text <= value && value <= ls.CompletionItemKind.TypeParameter) {
			return [value - 1, undefined];
		};
		return [code.CompletionItemKind.Text, value];
	}

	function asCompletionItem(item: ls.CompletionItem): ProtocolCompletionItem {
		let result = new ProtocolCompletionItem(item.label);
		if (item.detail) { result.detail = item.detail; }
		if (item.documentation) {
			result.documentation = asDocumentation(item.documentation);
			result.documentationFormat = Is.string(item.documentation) ? '$string' : item.documentation.kind;
		};
		if (item.filterText) { result.filterText = item.filterText; }
		let insertText = asCompletionInsertText(item);
		if (insertText) {
			result.insertText = insertText.text;
			result.range = insertText.range;
			result.fromEdit = insertText.fromEdit;
		}
		if (Is.number(item.kind)) {
			let [itemKind, original] = asCompletionItemKind(item.kind);
			result.kind = itemKind;
			if (original) {
				result.originalItemKind = original;
			}
		}
		if (item.sortText) { result.sortText = item.sortText; }
		if (item.preselect) { result.preselect = item.preselect; }
		if (item.additionalTextEdits) { result.additionalTextEdits = asTextEdits(item.additionalTextEdits); }
		if (Is.stringArray(item.commitCharacters)) { result.commitCharacters = item.commitCharacters.slice(); }
		if (item.command) { result.command = asCommand(item.command); }
		if (item.deprecated === true || item.deprecated === false) { result.deprecated = item.deprecated };
		if (item.data !== void 0) { result.data = item.data; }
		return result;
	}

	function asCompletionInsertText(item: ls.CompletionItem): { text: string | code.SnippetString, range?: code.Range, fromEdit: boolean } | undefined {
		if (item.textEdit) {
			if (item.insertTextFormat === ls.InsertTextFormat.Snippet) {
				return { text: new code.SnippetString(item.textEdit.newText), range: asRange(item.textEdit.range), fromEdit: true };
			} else {
				return { text: item.textEdit.newText, range: asRange(item.textEdit.range), fromEdit: true };
			}
		} else if (item.insertText) {
			if (item.insertTextFormat === ls.InsertTextFormat.Snippet) {
				return { text: new code.SnippetString(item.insertText), fromEdit: false };
			} else {
				return { text: item.insertText, fromEdit: false };
			}
		} else {
			return undefined;
		}
	}

	function asTextEdit(edit: undefined | null): undefined;
	function asTextEdit(edit: ls.TextEdit): code.TextEdit;
	function asTextEdit(edit: ls.TextEdit | undefined | null): code.TextEdit | undefined {
		if (!edit) {
			return undefined;
		}
		return new code.TextEdit(asRange(edit.range), edit.newText);
	}

	function asTextEdits(items: ls.TextEdit[]): code.TextEdit[];
	function asTextEdits(items: undefined | null): undefined;
	function asTextEdits(items: ls.TextEdit[] | undefined | null): code.TextEdit[] | undefined;
	function asTextEdits(items: ls.TextEdit[] | undefined | null): code.TextEdit[] | undefined {
		if (!items) {
			return undefined;
		}
		return items.map(asTextEdit);
	}

	function asSignatureHelp(item: undefined | null): undefined;
	function asSignatureHelp(item: ls.SignatureHelp): code.SignatureHelp;
	function asSignatureHelp(item: ls.SignatureHelp | undefined | null): code.SignatureHelp | undefined;
	function asSignatureHelp(item: ls.SignatureHelp | undefined | null): code.SignatureHelp | undefined {
		if (!item) {
			return undefined;
		}
		let result = new code.SignatureHelp();
		if (Is.number(item.activeSignature)) {
			result.activeSignature = item.activeSignature;
		} else {
			// activeSignature was optional in the past
			result.activeSignature = 0;
		}
		if (Is.number(item.activeParameter)) {
			result.activeParameter = item.activeParameter;
		} else {
			// activeParameter was optional in the past
			result.activeParameter = 0;
		}
		if (item.signatures) { result.signatures = asSignatureInformations(item.signatures); }
		return result;
	}

	function asSignatureInformations(items: ls.SignatureInformation[]): code.SignatureInformation[] {
		return items.map(asSignatureInformation);
	}

	function asSignatureInformation(item: ls.SignatureInformation): code.SignatureInformation {
		let result = new code.SignatureInformation(item.label);
		if (item.documentation) { result.documentation = asDocumentation(item.documentation); }
		if (item.parameters) { result.parameters = asParameterInformations(item.parameters); }
		return result;
	}

	function asParameterInformations(item: ls.ParameterInformation[]): code.ParameterInformation[] {
		return item.map(asParameterInformation);
	}

	function asParameterInformation(item: ls.ParameterInformation): code.ParameterInformation {
		let result = new code.ParameterInformation(item.label);
		if (item.documentation) { result.documentation = asDocumentation(item.documentation); };
		return result;
	}

	function asDefinitionResult(item: ls.Definition): code.Definition;
	function asDefinitionResult(item: undefined | null): undefined;
	function asDefinitionResult(item: ls.Definition | undefined | null): code.Definition | undefined;
	function asDefinitionResult(item: ls.Definition | undefined | null): code.Definition | undefined {
		if (!item) {
			return undefined;
		}
		if (Is.array(item)) {
			return item.map((location) => asLocation(location));
		} else {
			return asLocation(item);
		}
	}

	function asLocation(item: ls.Location): code.Location;
	function asLocation(item: undefined | null): undefined;
	function asLocation(item: ls.Location | undefined | null): code.Location | undefined;
	function asLocation(item: ls.Location | undefined | null): code.Location | undefined {
		if (!item) {
			return undefined;
		}
		return new code.Location(_uriConverter(item.uri), asRange(item.range));
	}

	function asReferences(values: ls.Location[]): code.Location[];
	function asReferences(values: undefined | null): code.Location[] | undefined;
	function asReferences(values: ls.Location[] | undefined | null): code.Location[] | undefined;
	function asReferences(values: ls.Location[] | undefined | null): code.Location[] | undefined {
		if (!values) {
			return undefined;
		}
		return values.map(location => asLocation(location));
	}

	function asDocumentHighlights(values: ls.DocumentHighlight[]): code.DocumentHighlight[];
	function asDocumentHighlights(values: undefined | null): undefined;
	function asDocumentHighlights(values: ls.DocumentHighlight[] | undefined | null): code.DocumentHighlight[] | undefined;
	function asDocumentHighlights(values: ls.DocumentHighlight[] | undefined | null): code.DocumentHighlight[] | undefined {
		if (!values) {
			return undefined;
		}
		return values.map(asDocumentHighlight);
	}

	function asDocumentHighlight(item: ls.DocumentHighlight): code.DocumentHighlight {
		let result = new code.DocumentHighlight(asRange(item.range));
		if (Is.number(item.kind)) { result.kind = asDocumentHighlightKind(item.kind); }
		return result;
	}

	function asDocumentHighlightKind(item: number): code.DocumentHighlightKind {
		switch (item) {
			case ls.DocumentHighlightKind.Text:
				return code.DocumentHighlightKind.Text;
			case ls.DocumentHighlightKind.Read:
				return code.DocumentHighlightKind.Read;
			case ls.DocumentHighlightKind.Write:
				return code.DocumentHighlightKind.Write;
		}
		return code.DocumentHighlightKind.Text;
	}

	function asSymbolInformations(values: ls.SymbolInformation[], uri?: code.Uri): code.SymbolInformation[];
	function asSymbolInformations(values: undefined | null, uri?: code.Uri): undefined;
	function asSymbolInformations(values: ls.SymbolInformation[] | undefined | null, uri?: code.Uri): code.SymbolInformation[] | undefined;
	function asSymbolInformations(values: ls.SymbolInformation[] | undefined | null, uri?: code.Uri): code.SymbolInformation[] | undefined {
		if (!values) {
			return undefined;
		}
		return values.map(information => asSymbolInformation(information, uri));
	}

	function asSymbolKind(item: ls.SymbolKind): code.SymbolKind {
		if (item <= ls.SymbolKind.TypeParameter) {
			// Symbol kind is one based in the protocol and zero based in code.
			return item - 1;
		}
		return code.SymbolKind.Property;
	}

	function asSymbolInformation(item: ls.SymbolInformation, uri?: code.Uri): code.SymbolInformation {
		// Symbol kind is one based in the protocol and zero based in code.
		let result = new code.SymbolInformation(
			item.name, asSymbolKind(item.kind),
			asRange(item.location.range),
			item.location.uri ? _uriConverter(item.location.uri) : uri);
		if (item.containerName) { result.containerName = item.containerName; }
		return result;
	}

	function asCommand(item: ls.Command): code.Command {
		let result: code.Command = { title: item.title, command: item.command };
		if (item.arguments) { result.arguments = item.arguments; }
		return result;
	}

	function asCommands(items: ls.Command[]): code.Command[];
	function asCommands(items: undefined | null): undefined
	function asCommands(items: ls.Command[] | undefined | null): code.Command[] | undefined;
	function asCommands(items: ls.Command[] | undefined | null): code.Command[] | undefined {
		if (!items) {
			return undefined;
		}
		return items.map(asCommand);
	}

	const kindMapping: Map<ls.CodeActionKind, code.CodeActionKind> = new Map();
	kindMapping.set('', code.CodeActionKind.Empty);
	kindMapping.set(ls.CodeActionKind.QuickFix, code.CodeActionKind.QuickFix);
	kindMapping.set(ls.CodeActionKind.Refactor, code.CodeActionKind.Refactor);
	kindMapping.set(ls.CodeActionKind.RefactorExtract, code.CodeActionKind.RefactorExtract);
	kindMapping.set(ls.CodeActionKind.RefactorInline, code.CodeActionKind.RefactorInline);
	kindMapping.set(ls.CodeActionKind.RefactorRewrite, code.CodeActionKind.RefactorRewrite);
	kindMapping.set(ls.CodeActionKind.Source, code.CodeActionKind.Source);
	kindMapping.set(ls.CodeActionKind.SourceOrganizeImports, code.CodeActionKind.SourceOrganizeImports);

	function asCodeActionKind(item: null | undefined): undefined;
	function asCodeActionKind(item: ls.CodeActionKind): code.CodeActionKind;
	function asCodeActionKind(item: ls.CodeActionKind | null | undefined): code.CodeActionKind | undefined;
	function asCodeActionKind(item: ls.CodeActionKind | null | undefined): code.CodeActionKind | undefined {
		if (item === void 0 || item === null) {
			return undefined
		}
		let result: code.CodeActionKind | undefined = kindMapping.get(item);
		if (result) {
			return result;
		}
		let parts = item.split('.');
		result = code.CodeActionKind.Empty;
		for (let part of parts) {
			result = result.append(part);
		}
		return result;
	}

	function asCodeAction(item: ls.CodeAction): code.CodeAction;
	function asCodeAction(item: undefined | null): undefined;
	function asCodeAction(item: ls.CodeAction | undefined | null): code.CodeAction | undefined;
	function asCodeAction(item: ls.CodeAction | undefined | null): code.CodeAction | undefined {
		if (item === void 0 || item === null) {
			return undefined;
		}
		let result = new code.CodeAction(item.title);
		if (item.kind !== void 0) { result.kind = asCodeActionKind(item.kind); }
		if (item.diagnostics) { result.diagnostics = asDiagnostics(item.diagnostics); }
		if (item.edit) { result.edit = asWorkspaceEdit(item.edit); }
		if (item.command) { result.command = asCommand(item.command); }
		return result;
	}

	function asCodeLens(item: ls.CodeLens): code.CodeLens;
	function asCodeLens(item: undefined | null): undefined;
	function asCodeLens(item: ls.CodeLens | undefined | null): code.CodeLens | undefined;
	function asCodeLens(item: ls.CodeLens | undefined | null): code.CodeLens | undefined {
		if (!item) {
			return undefined;
		}
		let result: ProtocolCodeLens = new ProtocolCodeLens(asRange(item.range));
		if (item.command) { result.command = asCommand(item.command); }
		if (item.data !== void 0 && item.data !== null) { result.data = item.data; }
		return result;
	}

	function asCodeLenses(items: ls.CodeLens[]): code.CodeLens[];
	function asCodeLenses(items: undefined | null): undefined;
	function asCodeLenses(items: ls.CodeLens[] | undefined | null): code.CodeLens[] | undefined;
	function asCodeLenses(items: ls.CodeLens[] | undefined | null): code.CodeLens[] | undefined {
		if (!items) {
			return undefined;
		}
		return items.map((codeLens) => asCodeLens(codeLens));
	}

	function asWorkspaceEdit(item: ls.WorkspaceEdit): code.WorkspaceEdit;
	function asWorkspaceEdit(item: undefined | null): undefined;
	function asWorkspaceEdit(item: ls.WorkspaceEdit | undefined | null): code.WorkspaceEdit | undefined;
	function asWorkspaceEdit(item: ls.WorkspaceEdit | undefined | null): code.WorkspaceEdit | undefined {
		if (!item) {
			return undefined;
		}
		let result = new code.WorkspaceEdit();
		if (item.documentChanges) {
			item.documentChanges.forEach(change => {
				result.set(_uriConverter(change.textDocument.uri), asTextEdits(change.edits));
			});
		} else if (item.changes) {
			Object.keys(item.changes).forEach(key => {
				result.set(_uriConverter(key), asTextEdits(item.changes![key]));
			});
		}
		return result;
	}

	function asDocumentLink(item: ls.DocumentLink): code.DocumentLink {
		let range = asRange(item.range);
		let target = item.target ? asUri(item.target) : undefined;
		// target must be optional in DocumentLink
		let link = new ProtocolDocumentLink(range, target);
		if (item.data !== void 0 && item.data !== null) { link.data = item.data; }
		return link;
	}

	function asDocumentLinks(items: ls.DocumentLink[]): code.DocumentLink[];
	function asDocumentLinks(items: undefined | null): undefined;
	function asDocumentLinks(items: ls.DocumentLink[] | undefined | null): code.DocumentLink[] | undefined;
	function asDocumentLinks(items: ls.DocumentLink[] | undefined | null): code.DocumentLink[] | undefined {
		if (!items) {
			return undefined;
		}
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
		asCodeAction,
		asCodeLens,
		asCodeLenses,
		asWorkspaceEdit,
		asDocumentLink,
		asDocumentLinks
	}
}