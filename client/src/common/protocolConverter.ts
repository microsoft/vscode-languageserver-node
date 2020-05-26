/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as code from 'vscode';
import * as ls from 'vscode-languageserver-protocol';

import * as Is from './utils/is';
import ProtocolCompletionItem from './protocolCompletionItem';
import ProtocolCodeLens from './protocolCodeLens';
import ProtocolDocumentLink from './protocolDocumentLink';

// Proposed API.
declare module 'vscode' {
	export interface SignatureInformation {
		activeParameter?: number;
	}
}

interface InsertReplaceRange {
	inserting: code.Range;
	replacing: code.Range;
}

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

	asRanges(values: ls.Range[]): code.Range[];

	asDiagnosticSeverity(value: number | undefined | null): code.DiagnosticSeverity;
	asDiagnosticTag(tag: ls.DiagnosticTag): code.DiagnosticTag | undefined

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

	asLocation(item: ls.Location): code.Location;
	asLocation(item: undefined | null): undefined;
	asLocation(item: ls.Location | undefined | null): code.Location | undefined;

	asDeclarationResult(item: ls.Declaration): code.Location | code.Location[];
	asDeclarationResult(item: ls.DeclarationLink[]): code.LocationLink[];
	asDeclarationResult(item: undefined | null): undefined;
	asDeclarationResult(item: ls.Declaration | ls.DeclarationLink[] | undefined | null): code.Declaration | undefined;

	asDefinitionResult(item: ls.Definition): code.Definition;
	asDefinitionResult(item: ls.DefinitionLink[]): code.DefinitionLink[];
	asDefinitionResult(item: undefined | null): undefined;
	asDefinitionResult(item: ls.Definition | ls.DefinitionLink[] | undefined | null): code.Definition | code.DefinitionLink[] | undefined;

	asReferences(values: ls.Location[]): code.Location[];
	asReferences(values: undefined | null): code.Location[] | undefined;
	asReferences(values: ls.Location[] | undefined | null): code.Location[] | undefined;

	asDocumentHighlightKind(item: number): code.DocumentHighlightKind;

	asDocumentHighlight(item: ls.DocumentHighlight): code.DocumentHighlight;

	asDocumentHighlights(values: ls.DocumentHighlight[]): code.DocumentHighlight[];
	asDocumentHighlights(values: undefined | null): undefined;
	asDocumentHighlights(values: ls.DocumentHighlight[] | undefined | null): code.DocumentHighlight[] | undefined;

	asSymbolKind(item: ls.SymbolKind): code.SymbolKind;

	asSymbolTag(item: ls.SymbolTag): code.SymbolTag | undefined;
	asSymbolTags(items: undefined | null): undefined;
	asSymbolTags(items: ReadonlyArray<ls.SymbolTag>): code.SymbolTag[];
	asSymbolTags(items: ReadonlyArray<ls.SymbolTag> | undefined | null): code.SymbolTag[] | undefined;

	asSymbolInformation(item: ls.SymbolInformation, uri?: code.Uri): code.SymbolInformation;

	asSymbolInformations(values: ls.SymbolInformation[], uri?: code.Uri): code.SymbolInformation[];
	asSymbolInformations(values: undefined | null, uri?: code.Uri): undefined;
	asSymbolInformations(values: ls.SymbolInformation[] | undefined | null, uri?: code.Uri): code.SymbolInformation[] | undefined;

	asDocumentSymbol(value: ls.DocumentSymbol): code.DocumentSymbol;

	asDocumentSymbols(value: undefined | null): undefined;
	asDocumentSymbols(value: ls.DocumentSymbol[]): code.DocumentSymbol[];
	asDocumentSymbols(value: ls.DocumentSymbol[] | undefined | null): code.DocumentSymbol[] | undefined;

	asCommand(item: ls.Command): code.Command;

	asCommands(items: ls.Command[]): code.Command[];
	asCommands(items: undefined | null): undefined
	asCommands(items: ls.Command[] | undefined | null): code.Command[] | undefined;

	asCodeAction(item: ls.CodeAction): code.CodeAction;
	asCodeAction(item: undefined | null): undefined;
	asCodeAction(item: ls.CodeAction | undefined | null): code.CodeAction | undefined;

	asCodeActionKind(item: null | undefined): undefined;
	asCodeActionKind(item: ls.CodeActionKind): code.CodeActionKind;
	asCodeActionKind(item: ls.CodeActionKind | null | undefined): code.CodeActionKind | undefined;

	asCodeActionKinds(item: null | undefined): undefined;
	asCodeActionKinds(items: ls.CodeActionKind[]): code.CodeActionKind[];
	asCodeActionKinds(item: ls.CodeActionKind[] | null | undefined): code.CodeActionKind[] | undefined;

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

	asColor(color: ls.Color): code.Color;

	asColorInformation(ci: ls.ColorInformation): code.ColorInformation;

	asColorInformations(colorPresentations: ls.ColorInformation[]): code.ColorInformation[];
	asColorInformations(colorPresentations: undefined | null): undefined;
	asColorInformations(colorInformation: ls.ColorInformation[] | undefined | null): code.ColorInformation[];

	asColorPresentation(cp: ls.ColorPresentation): code.ColorPresentation;

	asColorPresentations(colorPresentations: ls.ColorPresentation[]): code.ColorPresentation[];
	asColorPresentations(colorPresentations: undefined | null): undefined;
	asColorPresentations(colorPresentations: ls.ColorPresentation[] | undefined | null): undefined;

	asFoldingRangeKind(kind: string | undefined): code.FoldingRangeKind | undefined;

	asFoldingRange(r: ls.FoldingRange): code.FoldingRange;

	asFoldingRanges(foldingRanges: ls.FoldingRange[]): code.FoldingRange[];
	asFoldingRanges(foldingRanges: undefined | null): undefined;
	asFoldingRanges(foldingRanges: ls.FoldingRange[] | undefined | null): code.FoldingRange[] | undefined;
	asFoldingRanges(foldingRanges: ls.FoldingRange[] | undefined | null): code.FoldingRange[] | undefined;

	asSelectionRange(selectionRange: ls.SelectionRange): code.SelectionRange;

	asSelectionRanges(selectionRanges: ls.SelectionRange[]): code.SelectionRange[];
	asSelectionRanges(selectionRanges: undefined | null): undefined;
	asSelectionRanges(selectionRanges: ls.SelectionRange[] | undefined | null): code.SelectionRange[] | undefined;
	asSelectionRanges(selectionRanges: ls.SelectionRange[] | undefined | null): code.SelectionRange[] | undefined;
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
		if (ls.DiagnosticCode.is(diagnostic.code)) {
			result.code = { value: diagnostic.code.value, target: asUri(diagnostic.code.target) };
		}
		if (diagnostic.source) { result.source = diagnostic.source; }
		if (diagnostic.relatedInformation) { result.relatedInformation = asRelatedInformation(diagnostic.relatedInformation); }
		if (Array.isArray(diagnostic.tags)) { result.tags = asDiagnosticTags(diagnostic.tags); }
		return result;
	}

	function asRelatedInformation(relatedInformation: ls.DiagnosticRelatedInformation[]): code.DiagnosticRelatedInformation[] {
		return relatedInformation.map(asDiagnosticRelatedInformation);
	}

	function asDiagnosticRelatedInformation(information: ls.DiagnosticRelatedInformation): code.DiagnosticRelatedInformation {
		return new code.DiagnosticRelatedInformation(asLocation(information.location), information.message);
	}

	function asDiagnosticTags(tags: undefined | null): undefined;
	function asDiagnosticTags(tags: ls.DiagnosticTag[]): code.DiagnosticTag[];
	function asDiagnosticTags(tags: ls.DiagnosticTag[] | undefined | null): code.DiagnosticTag[] | undefined;
	function asDiagnosticTags(tags: ls.DiagnosticTag[] | undefined | null): code.DiagnosticTag[] | undefined {
		if (!tags) {
			return undefined;
		}
		let result: code.DiagnosticTag[] = [];
		for (let tag of tags) {
			let converted = asDiagnosticTag(tag);
			if (converted !== undefined) {
				result.push(converted);
			}
		}
		return result.length > 0 ? result : undefined;
	}

	function asDiagnosticTag(tag: ls.DiagnosticTag): code.DiagnosticTag | undefined {
		switch (tag) {
			case ls.DiagnosticTag.Unnecessary:
				return code.DiagnosticTag.Unnecessary;
			case ls.DiagnosticTag.Deprecated:
				return code.DiagnosticTag.Deprecated;
			default:
				return undefined;
		}
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

	function asRanges(value: ReadonlyArray<ls.Range>): code.Range[] {
		return value.map(value => asRange(value));
	}

	function asDiagnosticSeverity(value: number | undefined | null): code.DiagnosticSeverity {
		if (value === undefined || value === null) {
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
		}
		return [code.CompletionItemKind.Text, value];
	}

	function asCompletionItemTag(tag: ls.CompletionItemTag): code.CompletionItemTag | undefined {
		switch (tag) {
			case ls.CompletionItemTag.Deprecated:
				return code.CompletionItemTag.Deprecated;
		}
		return undefined;
	}

	function asCompletionItemTags(tags: ls.CompletionItemTag[] | undefined | null): code.CompletionItemTag[] {
		if (tags === undefined || tags === null) {
			return [];
		}
		const result: code.CompletionItemTag[] = [];
		for (let tag of tags) {
			const converted = asCompletionItemTag(tag);
			if (converted !== undefined) {
				result.push(converted);
			}
		}
		return result;
	}

	function asCompletionItem(item: ls.CompletionItem): ProtocolCompletionItem {
		let tags: code.CompletionItemTag[] = asCompletionItemTags(item.tags);
		let result = new ProtocolCompletionItem(item.label);
		if (item.detail) { result.detail = item.detail; }
		if (item.documentation) {
			result.documentation = asDocumentation(item.documentation);
			result.documentationFormat = Is.string(item.documentation) ? '$string' : item.documentation.kind;
		}
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
		if (item.additionalTextEdits) { result.additionalTextEdits = asTextEdits(item.additionalTextEdits); }
		if (Is.stringArray(item.commitCharacters)) { result.commitCharacters = item.commitCharacters.slice(); }
		if (item.command) { result.command = asCommand(item.command); }
		if (item.deprecated === true || item.deprecated === false) {
			result.deprecated = item.deprecated;
			if (item.deprecated === true) {
				tags.push(code.CompletionItemTag.Deprecated);
			}
		}
		if (item.preselect === true || item.preselect === false) { result.preselect = item.preselect; }
		if (item.data !== undefined) { result.data = item.data; }
		if (tags.length > 0) {
			result.tags = tags;
		}
		return result;
	}

	function asCompletionInsertText(item: ls.CompletionItem): { text: string | code.SnippetString, range?: code.Range | InsertReplaceRange, fromEdit: boolean } | undefined {
		if (item.textEdit) {
			if (item.insertTextFormat === ls.InsertTextFormat.Snippet) {
				return { text: new code.SnippetString(item.textEdit.newText), range: asCompletionRange(item.textEdit), fromEdit: true };
			} else {
				return { text: item.textEdit.newText, range: asCompletionRange(item.textEdit), fromEdit: true };
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

	function asCompletionRange(value: ls.TextEdit | ls.InsertReplaceEdit): code.Range | InsertReplaceRange {
		if (ls.InsertReplaceEdit.is(value)) {
			return { inserting: asRange(value.insert), replacing: asRange(value.replace) };
		} else {
			return asRange(value.range);
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
		if (item.documentation !== undefined) { result.documentation = asDocumentation(item.documentation); }
		if (item.parameters !== undefined) { result.parameters = asParameterInformations(item.parameters); }
		if (item.activeParameter !== undefined) { result.activeParameter = item.activeParameter; }
		{return result;}
	}

	function asParameterInformations(item: ls.ParameterInformation[]): code.ParameterInformation[] {
		return item.map(asParameterInformation);
	}

	function asParameterInformation(item: ls.ParameterInformation): code.ParameterInformation {
		let result = new code.ParameterInformation(item.label);
		if (item.documentation) { result.documentation = asDocumentation(item.documentation); }
		return result;
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

	function asDeclarationResult(item: ls.Declaration): code.Location | code.Location[];
	function asDeclarationResult(item: ls.DeclarationLink[]): code.LocationLink[];
	function asDeclarationResult(item: undefined | null): undefined;
	function asDeclarationResult(item: ls.Declaration | ls.DeclarationLink[] | undefined | null): code.Declaration | undefined {
		if (!item) {
			return undefined;
		}
		return asLocationResult(item);
	}

	function asDefinitionResult(item: ls.Definition): code.Definition;
	function asDefinitionResult(item: ls.DefinitionLink[]): code.DefinitionLink[];
	function asDefinitionResult(item: undefined | null): undefined;
	function asDefinitionResult(item: ls.Definition | ls.DefinitionLink[] | undefined | null): code.Definition | code.DefinitionLink[] | undefined {
		if (!item) {
			return undefined;
		}
		return asLocationResult(item);
	}

	function asLocationLink(item: undefined | null): undefined;
	function asLocationLink(item: ls.LocationLink): code.LocationLink;
	function asLocationLink(item: ls.LocationLink | undefined | null): code.LocationLink | undefined {
		if (!item) {
			return undefined;
		}
		let result = {
			targetUri: _uriConverter(item.targetUri),
			targetRange: asRange(item.targetSelectionRange), // See issue: https://github.com/Microsoft/vscode/issues/58649
			originSelectionRange: asRange(item.originSelectionRange),
			targetSelectionRange: asRange(item.targetSelectionRange)
		};
		if (!result.targetSelectionRange) {
			throw new Error(`targetSelectionRange must not be undefined or null`);
		}
		return result;
	}

	function asLocationResult(item: ls.Location | ls.Location[] | ls.LocationLink[] | undefined | null): code.Location | code.Location[] | code.LocationLink[] | undefined {
		if (!item) {
			return undefined;
		}
		if (Is.array(item)) {
			if (item.length === 0) {
				return [];
			} else if (ls.LocationLink.is(item[0])) {
				let links = item as ls.LocationLink[];
				return links.map((link) => asLocationLink(link));
			} else {
				let locations = item as ls.Location[];
				return locations.map((location) => asLocation(location));
			}
		} else if (ls.LocationLink.is(item)) {
			return [asLocationLink(item)];
		} else {
			return asLocation(item);
		}
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

	function asSymbolTag(value: ls.SymbolTag): code.SymbolTag | undefined {
		switch(value) {
			case ls.SymbolTag.Deprecated:
				return code.SymbolTag.Deprecated;
			default:
				return undefined;
		}
	}

	function asSymbolTags(items: undefined | null): undefined;
	function asSymbolTags(items: ReadonlyArray<ls.SymbolTag>): code.SymbolTag[];
	function asSymbolTags(items: ReadonlyArray<ls.SymbolTag> | undefined | null): code.SymbolTag[] | undefined;
	function asSymbolTags(items: ReadonlyArray<ls.SymbolTag> | undefined | null): code.SymbolTag[] | undefined {
		if (items === undefined || items === null) {
			return undefined;
		}
		const result: code.SymbolTag[] = [];
		for (const item of items) {
			const converted = asSymbolTag(item);
			if (converted !== undefined) {
				result.push(converted);
			}
		}
		return result.length === 0 ? undefined : result;
	}

	function asSymbolInformation(item: ls.SymbolInformation, uri?: code.Uri): code.SymbolInformation {
		// Symbol kind is one based in the protocol and zero based in code.
		let result = new code.SymbolInformation(
			item.name, asSymbolKind(item.kind),
			asRange(item.location.range),
			item.location.uri ? _uriConverter(item.location.uri) : uri);
		fillTags(result, item);
		if (item.containerName) { result.containerName = item.containerName; }
		return result;
	}

	function asDocumentSymbols(values: undefined | null): undefined;
	function asDocumentSymbols(values: ls.DocumentSymbol[]): code.DocumentSymbol[];
	function asDocumentSymbols(values: ls.DocumentSymbol[] | undefined | null): code.DocumentSymbol[] | undefined {
		if (values === undefined || values === null) {
			return undefined;
		}
		return values.map(asDocumentSymbol);
	}

	function asDocumentSymbol(value: ls.DocumentSymbol): code.DocumentSymbol {
		let result = new code.DocumentSymbol(
			value.name,
			value.detail || '',
			asSymbolKind(value.kind),
			asRange(value.range),
			asRange(value.selectionRange)
		);
		fillTags(result, value);
		if (value.children !== undefined && value.children.length > 0) {
			let children: code.DocumentSymbol[] = [];
			for (let child of value.children) {
				children.push(asDocumentSymbol(child));
			}
			result.children = children;
		}
		return result;
	}

	function fillTags(result: { tags?: ReadonlyArray<code.SymbolTag>; }, value: { tags?: ls.SymbolTag[]; deprecated?: boolean; }): void {
		result.tags = asSymbolTags(value.tags);
		if (value.deprecated) {
			if (!result.tags) {
				result.tags = [code.SymbolTag.Deprecated];
			} else {
				if (!result.tags.includes(code.SymbolTag.Deprecated)) {
					result.tags = result.tags.concat(code.SymbolTag.Deprecated);
				}
			}
		}
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
	kindMapping.set(ls.CodeActionKind.Empty, code.CodeActionKind.Empty);
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
		if (item === undefined || item === null) {
			return undefined;
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

	function asCodeActionKinds(item: null | undefined): undefined;
	function asCodeActionKinds(items: ls.CodeActionKind[]): code.CodeActionKind[];
	function asCodeActionKinds(items: ls.CodeActionKind[] | null | undefined): code.CodeActionKind[] | undefined;
	function asCodeActionKinds(items: ls.CodeActionKind[] | null | undefined): code.CodeActionKind[] | undefined {
		if (items === undefined || items === null) {
			return undefined;
		}
		return items.map(kind => asCodeActionKind(kind));
	}



	function asCodeAction(item: ls.CodeAction): code.CodeAction;
	function asCodeAction(item: undefined | null): undefined;
	function asCodeAction(item: ls.CodeAction | undefined | null): code.CodeAction | undefined;
	function asCodeAction(item: ls.CodeAction | undefined | null): code.CodeAction | undefined {
		if (item === undefined || item === null) {
			return undefined;
		}
		let result = new code.CodeAction(item.title);
		if (item.kind !== undefined) { result.kind = asCodeActionKind(item.kind); }
		if (item.diagnostics) { result.diagnostics = asDiagnostics(item.diagnostics); }
		if (item.edit) { result.edit = asWorkspaceEdit(item.edit); }
		if (item.command) { result.command = asCommand(item.command); }
		if (item.isPreferred !== undefined) { result.isPreferred = item.isPreferred; }
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
		if (item.data !== undefined && item.data !== null) { result.data = item.data; }
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
				if (ls.CreateFile.is(change)) {
					result.createFile(_uriConverter(change.uri), change.options);
				} else if (ls.RenameFile.is(change)) {
					result.renameFile(_uriConverter(change.oldUri), _uriConverter(change.newUri), change.options);
				} else if (ls.DeleteFile.is(change)) {
					result.deleteFile(_uriConverter(change.uri), change.options);
				} else if (ls.TextDocumentEdit.is(change)) {
					result.set(_uriConverter(change.textDocument.uri), asTextEdits(change.edits));
				} else {
					throw new Error(`Unknown workspace edit change received:\n${JSON.stringify(change, undefined, 4)}`);
				}
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
		if (item.tooltip !== undefined) { link.tooltip = item.tooltip; }
		if (item.data !== undefined && item.data !== null) { link.data = item.data; }
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

	function asColor(color: ls.Color): code.Color {
		return new code.Color(color.red, color.green, color.blue, color.alpha);
	}

	function asColorInformation(ci: ls.ColorInformation): code.ColorInformation {
		return new code.ColorInformation(asRange(ci.range), asColor(ci.color));
	}

	function asColorInformations(colorPresentations: ls.ColorInformation[]): code.ColorInformation[];
	function asColorInformations(colorPresentations: undefined | null): undefined;
	function asColorInformations(colorInformation: ls.ColorInformation[] | undefined | null): code.ColorInformation[] | undefined {
		if (Array.isArray(colorInformation)) {
			return colorInformation.map(asColorInformation);
		}
		return undefined;
	}

	function asColorPresentation(cp: ls.ColorPresentation): code.ColorPresentation {
		let presentation = new code.ColorPresentation(cp.label);
		presentation.additionalTextEdits = asTextEdits(cp.additionalTextEdits);
		if (cp.textEdit) {
			presentation.textEdit = asTextEdit(cp.textEdit);
		}
		return presentation;
	}

	function asColorPresentations(colorPresentations: ls.ColorPresentation[]): code.ColorPresentation[];
	function asColorPresentations(colorPresentations: undefined | null): undefined;
	function asColorPresentations(colorPresentations: ls.ColorPresentation[] | undefined | null): code.ColorPresentation[] | undefined {
		if (Array.isArray(colorPresentations)) {
			return colorPresentations.map(asColorPresentation);
		}
		return undefined;
	}


	function asFoldingRangeKind(kind: string | undefined): code.FoldingRangeKind | undefined {
		if (kind) {
			switch (kind) {
				case ls.FoldingRangeKind.Comment:
					return code.FoldingRangeKind.Comment;
				case ls.FoldingRangeKind.Imports:
					return code.FoldingRangeKind.Imports;
				case ls.FoldingRangeKind.Region:
					return code.FoldingRangeKind.Region;
			}
		}
		return undefined;
	}

	function asFoldingRange(r: ls.FoldingRange): code.FoldingRange {
		return new code.FoldingRange(r.startLine, r.endLine, asFoldingRangeKind(r.kind));
	}

	function asFoldingRanges(foldingRanges: ls.FoldingRange[]): code.FoldingRange[];
	function asFoldingRanges(foldingRanges: undefined | null): undefined;
	function asFoldingRanges(foldingRanges: ls.FoldingRange[] | undefined | null): code.FoldingRange[] | undefined;
	function asFoldingRanges(foldingRanges: ls.FoldingRange[] | undefined | null): code.FoldingRange[] | undefined {
		if (Array.isArray(foldingRanges)) {
			return foldingRanges.map(asFoldingRange);
		}
		return undefined;
	}

	function asSelectionRange(selectionRange: ls.SelectionRange): code.SelectionRange {
		return new code.SelectionRange(asRange(selectionRange.range),
			selectionRange.parent ? asSelectionRange(selectionRange.parent) : undefined
		);
	}
	function asSelectionRanges(selectionRanges: ls.SelectionRange[]): code.SelectionRange[];
	function asSelectionRanges(selectionRanges: undefined | null): undefined;
	function asSelectionRanges(selectionRanges: ls.SelectionRange[] | undefined | null): code.SelectionRange[] | undefined;
	function asSelectionRanges(selectionRanges: ls.SelectionRange[] | undefined | null): code.SelectionRange[] | undefined {
		if (!Array.isArray(selectionRanges)) {
			return [];
		}
		let result: code.SelectionRange[] = [];
		for (let range of selectionRanges) {
			result.push(asSelectionRange(range));
		}
		return result;
	}

	return {
		asUri,
		asDiagnostics,
		asDiagnostic,
		asRange,
		asRanges,
		asPosition,
		asDiagnosticSeverity,
		asDiagnosticTag,
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
		asDeclarationResult,
		asDefinitionResult,
		asLocation,
		asReferences,
		asDocumentHighlights,
		asDocumentHighlight,
		asDocumentHighlightKind,
		asSymbolKind,
		asSymbolTag,
		asSymbolTags,
		asSymbolInformations,
		asSymbolInformation,
		asDocumentSymbols,
		asDocumentSymbol,
		asCommand,
		asCommands,
		asCodeAction,
		asCodeActionKind,
		asCodeActionKinds,
		asCodeLens,
		asCodeLenses,
		asWorkspaceEdit,
		asDocumentLink,
		asDocumentLinks,
		asFoldingRangeKind,
		asFoldingRange,
		asFoldingRanges,
		asColor,
		asColorInformation,
		asColorInformations,
		asColorPresentation,
		asColorPresentations,
		asSelectionRange,
		asSelectionRanges
	};
}
