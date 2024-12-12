/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="../../typings/vscode.proposed.codeActionAI.d.ts" preserve: true/>

import * as code from 'vscode';
import * as ls from 'vscode-languageserver-protocol';

import * as Is from './utils/is';
import * as async from './utils/async';

import ProtocolCompletionItem from './protocolCompletionItem';
import ProtocolCodeLens from './protocolCodeLens';
import ProtocolDocumentLink from './protocolDocumentLink';
import ProtocolCodeAction from './protocolCodeAction';
import { ProtocolDiagnostic, DiagnosticCode } from './protocolDiagnostic';
import ProtocolCallHierarchyItem from './protocolCallHierarchyItem';
import ProtocolTypeHierarchyItem from './protocolTypeHierarchyItem';
import WorkspaceSymbol from './protocolWorkspaceSymbol';
import ProtocolInlayHint from './protocolInlayHint';
import { NotebookCellTextDocumentFilter, TextDocumentFilter } from 'vscode-languageserver-protocol';

interface InsertReplaceRange {
	inserting: code.Range;
	replacing: code.Range;
}

export interface Converter {

	asUri(value: string): code.Uri;

	asDocumentSelector(value: ls.DocumentSelector): code.DocumentSelector;

	asPosition(value: undefined | null): undefined;
	asPosition(value: ls.Position): code.Position;
	asPosition(value: ls.Position | undefined | null): code.Position | undefined;

	asRange(value: undefined | null): undefined;
	asRange(value: ls.Range): code.Range;
	asRange(value: ls.Range | undefined | null): code.Range | undefined;

	asRanges(items: ReadonlyArray<ls.Range>, token?: code.CancellationToken): Promise<code.Range[]>;

	asDiagnostic(diagnostic: ls.Diagnostic): code.Diagnostic;

	asDiagnostics(diagnostics: ls.Diagnostic[], token?: code.CancellationToken): Promise<code.Diagnostic[]>;

	asDiagnosticSeverity(value: number | undefined | null): code.DiagnosticSeverity;
	asDiagnosticTag(tag: ls.DiagnosticTag): code.DiagnosticTag | undefined;

	asHover(hover: undefined | null): undefined;
	asHover(hover: ls.Hover): code.Hover;
	asHover(hover: ls.Hover | undefined | null): code.Hover | undefined;

	asCompletionResult(value: undefined | null, allCommitCharacters?: string[], token?: code.CancellationToken): Promise<undefined>;
	asCompletionResult(value: ls.CompletionList, allCommitCharacters?: string[], token?: code.CancellationToken): Promise<code.CompletionList>;
	asCompletionResult(value: ls.CompletionItem[], allCommitCharacters?: string[], token?: code.CancellationToken): Promise<code.CompletionItem[]>;
	asCompletionResult(value: ls.CompletionItem[] | ls.CompletionList | undefined | null, allCommitCharacters?: string[], token?: code.CancellationToken): Promise<code.CompletionItem[] | code.CompletionList | undefined>;

	asCompletionItem(item: ls.CompletionItem, defaultCommitCharacters?: string[]): ProtocolCompletionItem;

	asTextEdit(edit: undefined | null): undefined;
	asTextEdit(edit: ls.TextEdit): code.TextEdit;
	asTextEdit(edit: ls.TextEdit | undefined | null): code.TextEdit | undefined;

	asTextEdits(items: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asTextEdits(items: ls.TextEdit[], token?: code.CancellationToken): Promise<code.TextEdit[]>;
	asTextEdits(items: ls.TextEdit[] | undefined | null, token?: code.CancellationToken): Promise<code.TextEdit[] | undefined>;

	asSignatureHelp(item: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asSignatureHelp(item: ls.SignatureHelp, token?: code.CancellationToken): Promise<code.SignatureHelp>;
	asSignatureHelp(item: ls.SignatureHelp | undefined | null, token?: code.CancellationToken): Promise<code.SignatureHelp | undefined>;

	asSignatureInformation(item: ls.SignatureInformation, token?: code.CancellationToken): Promise<code.SignatureInformation>;

	asSignatureInformations(items: ls.SignatureInformation[], token?: code.CancellationToken): Promise<code.SignatureInformation[]>;

	asParameterInformation(item: ls.ParameterInformation): code.ParameterInformation;

	asParameterInformations(item: ls.ParameterInformation[], token?: code.CancellationToken): Promise<code.ParameterInformation[]>;

	asLocation(item: ls.Location): code.Location;
	asLocation(item: undefined | null): undefined;
	asLocation(item: ls.Location | undefined | null): code.Location | undefined;

	asDeclarationResult(item: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asDeclarationResult(item: ls.Declaration, token?: code.CancellationToken): Promise<code.Location | code.Location[]>;
	asDeclarationResult(item: ls.DeclarationLink[], token?: code.CancellationToken): Promise<code.LocationLink[]>;
	asDeclarationResult(item: ls.Declaration | ls.DeclarationLink[] | undefined | null, token?: code.CancellationToken): Promise<code.Declaration | undefined>;

	asDefinitionResult(item: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asDefinitionResult(item: ls.Definition, token?: code.CancellationToken): Promise<code.Definition>;
	asDefinitionResult(item: ls.DefinitionLink[], token?: code.CancellationToken): Promise<code.DefinitionLink[]>;
	asDefinitionResult(item: ls.Definition | ls.DefinitionLink[] | undefined | null, token?: code.CancellationToken): Promise<code.Definition | code.DefinitionLink[] | undefined>;

	asReferences(values: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asReferences(values: ls.Location[], token?: code.CancellationToken): Promise<code.Location[]>;
	asReferences(values: ls.Location[] | undefined | null, token?: code.CancellationToken): Promise<code.Location[] | undefined>;

	asDocumentHighlightKind(item: number): code.DocumentHighlightKind;

	asDocumentHighlight(item: ls.DocumentHighlight): code.DocumentHighlight;

	asDocumentHighlights(values: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asDocumentHighlights(values: ls.DocumentHighlight[], token?: code.CancellationToken): Promise<code.DocumentHighlight[]>;
	asDocumentHighlights(values: ls.DocumentHighlight[] | undefined | null, token?: code.CancellationToken): Promise<code.DocumentHighlight[] | undefined>;

	asSymbolKind(item: ls.SymbolKind): code.SymbolKind;

	asSymbolTag(item: ls.SymbolTag): code.SymbolTag | undefined;
	asSymbolTags(items: undefined | null): undefined;
	asSymbolTags(items: ReadonlyArray<ls.SymbolTag>): code.SymbolTag[];
	asSymbolTags(items: ReadonlyArray<ls.SymbolTag> | undefined | null): code.SymbolTag[] | undefined;

	asSymbolInformation(item: ls.SymbolInformation | ls.WorkspaceSymbol): code.SymbolInformation;

	asSymbolInformations(values: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asSymbolInformations(values: ls.SymbolInformation[] | ls.WorkspaceSymbol[], token?: code.CancellationToken): Promise<code.SymbolInformation[]>;
	asSymbolInformations(values: ls.SymbolInformation[] |  ls.WorkspaceSymbol[] | undefined | null, token?: code.CancellationToken): Promise<code.SymbolInformation[] | undefined>;

	asDocumentSymbol(value: ls.DocumentSymbol, token?: code.CancellationToken): code.DocumentSymbol;

	asDocumentSymbols(value: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asDocumentSymbols(value: ls.DocumentSymbol[], token?: code.CancellationToken): Promise<code.DocumentSymbol[]>;
	asDocumentSymbols(value: ls.DocumentSymbol[] | undefined | null, token?: code.CancellationToken): Promise<code.DocumentSymbol[] | undefined>;

	asCommand(item: ls.Command): code.Command;

	asCommands(items: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asCommands(items: ls.Command[], token?: code.CancellationToken): Promise<code.Command[]>;
	asCommands(items: ls.Command[] | undefined | null, token?: code.CancellationToken): Promise<code.Command[] | undefined>;

	asCodeAction(item: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asCodeAction(item: ls.CodeAction, token?: code.CancellationToken): Promise<code.CodeAction>;
	asCodeAction(item: ls.CodeAction | undefined | null, token?: code.CancellationToken): Promise<code.CodeAction | undefined>;

	asCodeActionKind(item: null | undefined): undefined;
	asCodeActionKind(item: ls.CodeActionKind): code.CodeActionKind;
	asCodeActionKind(item: ls.CodeActionKind | null | undefined): code.CodeActionKind | undefined;

	asCodeActionKinds(item: null | undefined): undefined;
	asCodeActionKinds(items: ls.CodeActionKind[]): code.CodeActionKind[];
	asCodeActionKinds(item: ls.CodeActionKind[] | null | undefined): code.CodeActionKind[] | undefined;

	asCodeActionDocumentations(items: null | undefined): undefined;
	asCodeActionDocumentations(items: ls.CodeActionKindDocumentation[]): code.CodeActionProviderMetadata['documentation'];
	asCodeActionDocumentations(items: ls.CodeActionKindDocumentation[] | null | undefined): code.CodeActionProviderMetadata['documentation'] | undefined;

	asCodeActionResult(items: (ls.Command | ls.CodeAction)[], token?: code.CancellationToken): Promise<(code.Command | code.CodeAction)[]>;

	asCodeLens(item: ls.CodeLens): code.CodeLens;
	asCodeLens(item: undefined | null): undefined;
	asCodeLens(item: ls.CodeLens | undefined | null): code.CodeLens | undefined;

	asCodeLenses(items: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asCodeLenses(items: ls.CodeLens[], token?: code.CancellationToken): Promise<code.CodeLens[]>;
	asCodeLenses(items: ls.CodeLens[] | undefined | null, token?: code.CancellationToken): Promise<code.CodeLens[] | undefined>;

	asWorkspaceEdit(item: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asWorkspaceEdit(item: ls.WorkspaceEdit, token?: code.CancellationToken): Promise<code.WorkspaceEdit>;
	asWorkspaceEdit(item: ls.WorkspaceEdit | undefined | null, token?: code.CancellationToken): Promise<code.WorkspaceEdit | undefined>;

	asDocumentLink(item: ls.DocumentLink): code.DocumentLink;

	asDocumentLinks(items: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asDocumentLinks(items: ls.DocumentLink[], token?: code.CancellationToken): Promise<code.DocumentLink[]>;
	asDocumentLinks(items: ls.DocumentLink[] | undefined | null, token?: code.CancellationToken): Promise<code.DocumentLink[] | undefined>;

	asColor(color: ls.Color): code.Color;

	asColorInformation(ci: ls.ColorInformation): code.ColorInformation;

	asColorInformations(colorPresentations: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asColorInformations(colorPresentations: ls.ColorInformation[], token?: code.CancellationToken): Promise<code.ColorInformation[]>;
	asColorInformations(colorInformation: ls.ColorInformation[] | undefined | null, token?: code.CancellationToken): Promise<code.ColorInformation[]>;

	asColorPresentation(cp: ls.ColorPresentation): code.ColorPresentation;

	asColorPresentations(colorPresentations: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asColorPresentations(colorPresentations: ls.ColorPresentation[], token?: code.CancellationToken): Promise<code.ColorPresentation[]>;
	asColorPresentations(colorPresentations: ls.ColorPresentation[] | undefined | null, token?: code.CancellationToken): Promise<code.ColorPresentation[] | undefined>;

	asFoldingRangeKind(kind: string | undefined): code.FoldingRangeKind | undefined;

	asFoldingRange(r: ls.FoldingRange): code.FoldingRange;

	asFoldingRanges(foldingRanges: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asFoldingRanges(foldingRanges: ls.FoldingRange[], token?: code.CancellationToken): Promise<code.FoldingRange[]>;
	asFoldingRanges(foldingRanges: ls.FoldingRange[] | undefined | null, token?: code.CancellationToken): Promise<code.FoldingRange[] | undefined>;

	asSelectionRange(selectionRange: ls.SelectionRange): code.SelectionRange;

	asSelectionRanges(selectionRanges: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asSelectionRanges(selectionRanges: ls.SelectionRange[], token?: code.CancellationToken): Promise<code.SelectionRange[]>;
	asSelectionRanges(selectionRanges: ls.SelectionRange[] | undefined | null, token?: code.CancellationToken): Promise<code.SelectionRange[] | undefined>;

	asInlineValue(value: ls.InlineValue): code.InlineValue;

	asInlineValues(values: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asInlineValues(values: ls.InlineValue[], token?: code.CancellationToken): Promise<code.InlineValue[]>;
	asInlineValues(values: ls.InlineValue[] | undefined | null, token?: code.CancellationToken): Promise<code.InlineValue[] | undefined>;

	asInlayHint(value: ls.InlayHint, token?: code.CancellationToken): Promise<code.InlayHint>;

	asInlayHints(values: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asInlayHints(values: ls.InlayHint[], token?: code.CancellationToken): Promise<code.InlayHint[]>;
	asInlayHints(values: ls.InlayHint[] | undefined | null, token?: code.CancellationToken): Promise<code.InlayHint[] | undefined>;

	asSemanticTokensLegend(value: ls.SemanticTokensLegend): code.SemanticTokensLegend;

	asSemanticTokens(value: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asSemanticTokens(value: ls.SemanticTokens, token?: code.CancellationToken): Promise<code.SemanticTokens>;
	asSemanticTokens(value: ls.SemanticTokens | undefined | null, token?: code.CancellationToken): Promise<code.SemanticTokens | undefined>;

	asSemanticTokensEdit(value: ls.SemanticTokensEdit): code.SemanticTokensEdit;

	asSemanticTokensEdits(value: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asSemanticTokensEdits(value: ls.SemanticTokensDelta, token?: code.CancellationToken): Promise<code.SemanticTokensEdits>;
	asSemanticTokensEdits(value: ls.SemanticTokensDelta | undefined | null, token?: code.CancellationToken): Promise<code.SemanticTokensEdits | undefined>;

	asCallHierarchyItem(item: null): undefined;
	asCallHierarchyItem(item: ls.CallHierarchyItem): code.CallHierarchyItem;
	asCallHierarchyItem(item: ls.CallHierarchyItem | null): code.CallHierarchyItem | undefined;

	asCallHierarchyItems(items: null, token?: code.CancellationToken): Promise<undefined>;
	asCallHierarchyItems(items: ls.CallHierarchyItem[], token?: code.CancellationToken): Promise<code.CallHierarchyItem[]>;
	asCallHierarchyItems(items: ls.CallHierarchyItem[] | null, token?: code.CancellationToken): Promise<code.CallHierarchyItem[] | undefined>;

	asCallHierarchyIncomingCall(item: ls.CallHierarchyIncomingCall, token?: code.CancellationToken): Promise<code.CallHierarchyIncomingCall>;

	asCallHierarchyIncomingCalls(items: null, token?: code.CancellationToken): Promise<undefined>;
	asCallHierarchyIncomingCalls(items: ReadonlyArray<ls.CallHierarchyIncomingCall>, token?: code.CancellationToken): Promise<code.CallHierarchyIncomingCall[]>;
	asCallHierarchyIncomingCalls(items: ReadonlyArray<ls.CallHierarchyIncomingCall> | null, token?: code.CancellationToken): Promise<code.CallHierarchyIncomingCall[] | undefined>;

	asCallHierarchyOutgoingCall(item: ls.CallHierarchyOutgoingCall, token?: code.CancellationToken): Promise<code.CallHierarchyOutgoingCall>;

	asCallHierarchyOutgoingCalls(items: null, token?: code.CancellationToken): Promise<undefined>;
	asCallHierarchyOutgoingCalls(items: ReadonlyArray<ls.CallHierarchyOutgoingCall>, token?: code.CancellationToken): Promise<code.CallHierarchyOutgoingCall[]>;
	asCallHierarchyOutgoingCalls(items: ReadonlyArray<ls.CallHierarchyOutgoingCall> | null, token?: code.CancellationToken): Promise<code.CallHierarchyOutgoingCall[] | undefined>;

	asLinkedEditingRanges(value: null | undefined, token?: code.CancellationToken): Promise<undefined>;
	asLinkedEditingRanges(value: ls.LinkedEditingRanges, token?: code.CancellationToken): Promise<code.LinkedEditingRanges>;
	asLinkedEditingRanges(value: ls.LinkedEditingRanges | null | undefined, token?: code.CancellationToken): Promise<code.LinkedEditingRanges | undefined>;

	asTypeHierarchyItem(item: null): undefined;
	asTypeHierarchyItem(item: ls.TypeHierarchyItem): code.TypeHierarchyItem;
	asTypeHierarchyItem(item: ls.TypeHierarchyItem | null): code.TypeHierarchyItem | undefined;

	asTypeHierarchyItems(items: null, token?: code.CancellationToken): Promise<undefined>;
	asTypeHierarchyItems(items: ls.TypeHierarchyItem[], token?: code.CancellationToken): Promise<code.TypeHierarchyItem[]>;
	asTypeHierarchyItems(items: ls.TypeHierarchyItem[] | null, token?: code.CancellationToken): Promise<code.TypeHierarchyItem[] | undefined>;

	asGlobPattern(pattern: undefined | null): undefined;
	asGlobPattern(pattern: ls.GlobPattern): code.GlobPattern | undefined;

	asInlineCompletionResult(value: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	asInlineCompletionResult(value: ls.InlineCompletionList, token?: code.CancellationToken): Promise<code.InlineCompletionList>;
	asInlineCompletionResult(value: ls.InlineCompletionItem[], token?: code.CancellationToken): Promise<code.InlineCompletionItem[]>;
	asInlineCompletionResult(value: ls.InlineCompletionItem[] | ls.InlineCompletionList | undefined | null, token?: code.CancellationToken): Promise<code.InlineCompletionItem[] | code.InlineCompletionList | undefined>;

	asInlineCompletionItem(item: ls.InlineCompletionItem): code.InlineCompletionItem;
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
		const candidate: CodeFenceBlock = value;
		return candidate && Is.string(candidate.language) && Is.string(candidate.value);
	}
}

export function createConverter(
	uriConverter: URIConverter | undefined,
	trustMarkdown: boolean | { readonly enabledCommands: readonly string[] },
	supportHtml: boolean,
	supportThemeIcons: boolean): Converter {

	const nullConverter = (value: string) => code.Uri.parse(value);

	const _uriConverter: URIConverter = uriConverter || nullConverter;

	function asUri(value: string): code.Uri {
		return _uriConverter(value);
	}

	function asDocumentSelector(selector: ls.DocumentSelector): code.DocumentSelector {
		const result: code.DocumentFilter | string | Array<code.DocumentFilter | string> = [];
		for (const filter of selector) {
			if (typeof filter === 'string') {
				result.push(filter);
			} else if (NotebookCellTextDocumentFilter.is(filter)) {
				// We first need to check for the notebook cell filter since a TextDocumentFilter would
				// match both (e.g. the notebook is optional).
				if (typeof filter.notebook === 'string') {
					result.push({notebookType: filter.notebook, language: filter.language});
				} else {
					const notebookType = filter.notebook.notebookType ?? '*';
					result.push({ notebookType: notebookType, scheme: filter.notebook.scheme, pattern: asGlobPattern(filter.notebook.pattern), language: filter.language });
				}
			} else if (TextDocumentFilter.is(filter)) {
				result.push({ language: filter.language, scheme: filter.scheme, pattern: asGlobPattern(filter.pattern) });
			}
		}
		return result;
	}

	async function asDiagnostics(diagnostics: ReadonlyArray<ls.Diagnostic>, token?: code.CancellationToken): Promise<code.Diagnostic[]> {
		return async.map(diagnostics, asDiagnostic, token);
	}

	function asDiagnosticsSync(diagnostics: ls.Diagnostic[]): code.Diagnostic[] {
		const result: code.Diagnostic[] = new Array(diagnostics.length);
		for (let i = 0; i < diagnostics.length; i++) {
			result[i] = asDiagnostic(diagnostics[i]);
		}
		return result;
	}

	function asDiagnostic(diagnostic: ls.Diagnostic): code.Diagnostic {
		const result = new ProtocolDiagnostic(asRange(diagnostic.range), diagnostic.message, asDiagnosticSeverity(diagnostic.severity), diagnostic.data);
		if (diagnostic.code !== undefined) {
			if (typeof diagnostic.code === 'string' || typeof diagnostic.code === 'number') {
				if (ls.CodeDescription.is(diagnostic.codeDescription)) {
					result.code = {
						value: diagnostic.code,
						target: asUri(diagnostic.codeDescription.href)
					};
				} else {
					result.code = diagnostic.code;
				}
			} else if (DiagnosticCode.is(diagnostic.code)) {
				// This is for backwards compatibility of a proposed API.
				// We should remove this at some point.
				result.hasDiagnosticCode = true;
				const diagnosticCode = diagnostic.code as DiagnosticCode;
				result.code = {
					value: diagnosticCode.value,
					target: asUri(diagnosticCode.target)
				};
			}
		}
		if (diagnostic.source) { result.source = diagnostic.source; }
		if (diagnostic.relatedInformation) { result.relatedInformation = asRelatedInformation(diagnostic.relatedInformation); }
		if (Array.isArray(diagnostic.tags)) { result.tags = asDiagnosticTags(diagnostic.tags); }
		return result;
	}

	function asRelatedInformation(relatedInformation: ls.DiagnosticRelatedInformation[]): code.DiagnosticRelatedInformation[] {
		const result: code.DiagnosticRelatedInformation[] = new Array(relatedInformation.length);
		for (let i = 0; i < relatedInformation.length; i++) {
			const info = relatedInformation[i];
			result[i] = new code.DiagnosticRelatedInformation(asLocation(info.location), info.message);
		}
		return result;
	}

	function asDiagnosticTags(tags: undefined | null): undefined;
	function asDiagnosticTags(tags: ls.DiagnosticTag[]): code.DiagnosticTag[];
	function asDiagnosticTags(tags: ls.DiagnosticTag[] | undefined | null): code.DiagnosticTag[] | undefined;
	function asDiagnosticTags(tags: ls.DiagnosticTag[] | undefined | null): code.DiagnosticTag[] | undefined {
		if (!tags) {
			return undefined;
		}
		const result: code.DiagnosticTag[] = [];
		for (const tag of tags) {
			const converted = asDiagnosticTag(tag);
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
		return value ? new code.Position(value.line, value.character) : undefined;
	}

	function asRange(value: undefined | null): undefined;
	function asRange(value: ls.Range): code.Range;
	function asRange(value: ls.Range | undefined | null): code.Range | undefined;
	function asRange(value: ls.Range | undefined | null): code.Range | undefined {
		return value ? new code.Range(value.start.line, value.start.character, value.end.line, value.end.character) : undefined;
	}

	async function asRanges(items: ReadonlyArray<ls.Range>, token?: code.CancellationToken): Promise<code.Range[]> {
		return async.map(items, (range: ls.Range) => {
			return new code.Range(range.start.line, range.start.character, range.end.line, range.end.character);
		}, token);
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
			return asMarkdownString(value);
		} else if (CodeBlock.is(value)) {
			const result = asMarkdownString();
			return result.appendCodeblock(value.value, value.language);
		} else if (Array.isArray(value)) {
			const result: code.MarkdownString[] = [];
			for (const element of value) {
				const item = asMarkdownString();
				if (CodeBlock.is(element)) {
					item.appendCodeblock(element.value, element.language);
				} else {
					item.appendMarkdown(element);
				}
				result.push(item);
			}
			return result;
		} else {
			return asMarkdownString(value);
		}
	}

	function asDocumentation(value: string | ls.MarkupContent): string | code.MarkdownString {
		if (Is.string(value)) {
			return value;
		} else {
			switch (value.kind) {
				case ls.MarkupKind.Markdown:
					return asMarkdownString(value.value);
				case ls.MarkupKind.PlainText:
					return value.value;
				default:
					return `Unsupported Markup content received. Kind is: ${value.kind}`;
			}
		}
	}

	function asMarkdownString(value?: string | ls.MarkupContent): code.MarkdownString {
		let result: code.MarkdownString;
		if (value === undefined || typeof value === 'string') {
			result = new code.MarkdownString(value);
		} else {
			switch (value.kind) {
				case ls.MarkupKind.Markdown:
					result = new code.MarkdownString(value.value);
					break;
				case ls.MarkupKind.PlainText:
					result = new code.MarkdownString();
					result.appendText(value.value);
					break;
				default:
					result = new code.MarkdownString();
					result.appendText(`Unsupported Markup content received. Kind is: ${value.kind}`);
					break;
			}
		}
		result.isTrusted = trustMarkdown;
		result.supportHtml = supportHtml;
		result.supportThemeIcons = supportThemeIcons;
		return result;
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

	function asCompletionResult(value: ls.CompletionList, allCommitCharacters: string[] | undefined, token?: code.CancellationToken): Promise<code.CompletionList>;
	function asCompletionResult(value: ls.CompletionItem[], allCommitCharacters: string[] | undefined, token?: code.CancellationToken): Promise<code.CompletionItem[]>;
	function asCompletionResult(value: undefined | null, allCommitCharacters: string[] | undefined, token?: code.CancellationToken): Promise<undefined>;
	function asCompletionResult(value: ls.CompletionItem[] | ls.CompletionList | undefined | null, allCommitCharacters: string[] | undefined, token?: code.CancellationToken): Promise<code.CompletionItem[] | code.CompletionList | undefined>;
	async function asCompletionResult(value: ls.CompletionItem[] | ls.CompletionList | undefined | null, allCommitCharacters: string[] | undefined, token?: code.CancellationToken): Promise<code.CompletionItem[]| code.CompletionList | undefined> {
		if (!value) {
			return undefined;
		}
		if (Array.isArray(value)) {
			return async.map(value, (item) => asCompletionItem(item, allCommitCharacters), token);
		}
		const list = <ls.CompletionList>value;
		const { defaultRange, commitCharacters } = getCompletionItemDefaults(list, allCommitCharacters);
		const converted = await async.map(list.items, (item) => {
			return asCompletionItem(item, commitCharacters, list.applyKind?.commitCharacters, defaultRange, list.itemDefaults?.insertTextMode, list.itemDefaults?.insertTextFormat, list.itemDefaults?.data, list.applyKind?.data);
		}, token);
		return new code.CompletionList(converted, list.isIncomplete);
	}

	function getCompletionItemDefaults(list: ls.CompletionList, allCommitCharacters?: string[]): { defaultRange: code.Range | InsertReplaceRange | undefined; commitCharacters: string[] | undefined } {
		const rangeDefaults = list.itemDefaults?.editRange;
		const commitCharacters = list.itemDefaults?.commitCharacters ?? allCommitCharacters;
		return ls.Range.is(rangeDefaults)
			? { defaultRange: asRange(rangeDefaults), commitCharacters }
			: rangeDefaults !== undefined
				? { defaultRange: { inserting: asRange(rangeDefaults.insert), replacing: asRange(rangeDefaults.replace) }, commitCharacters}
				: { defaultRange: undefined, commitCharacters };
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
		for (const tag of tags) {
			const converted = asCompletionItemTag(tag);
			if (converted !== undefined) {
				result.push(converted);
			}
		}
		return result;
	}

	function asCompletionItem(
		item: ls.CompletionItem,
		defaultCommitCharacters?: string[],
		commitCharactersApplyKind?: ls.ApplyKind,
		defaultRange?: code.Range | InsertReplaceRange,
		defaultInsertTextMode?: ls.InsertTextMode,
		defaultInsertTextFormat?: ls.InsertTextFormat,
		defaultData?: ls.LSPAny,
		dataApplyKind?: ls.ApplyKind,
	): ProtocolCompletionItem {
		const tags: code.CompletionItemTag[] = asCompletionItemTags(item.tags);
		const label = asCompletionItemLabel(item);
		const result = new ProtocolCompletionItem(label);

		if (item.detail) { result.detail = item.detail; }
		if (item.documentation) {
			result.documentation = asDocumentation(item.documentation);
			result.documentationFormat = Is.string(item.documentation) ? '$string' : item.documentation.kind;
		}
		if (item.filterText) { result.filterText = item.filterText; }
		const insertText = asCompletionInsertText(item, defaultRange, defaultInsertTextFormat);
		if (insertText) {
			result.insertText = insertText.text;
			result.range = insertText.range;
			result.fromEdit = insertText.fromEdit;
		}
		if (Is.number(item.kind)) {
			const [itemKind, original] = asCompletionItemKind(item.kind);
			result.kind = itemKind;
			if (original) {
				result.originalItemKind = original;
			}
		}
		if (item.sortText) { result.sortText = item.sortText; }
		if (item.additionalTextEdits) { result.additionalTextEdits = asTextEditsSync(item.additionalTextEdits); }
		const commitCharacters = applyCommitCharacters(item, defaultCommitCharacters, commitCharactersApplyKind);
		if (commitCharacters) { result.commitCharacters = commitCharacters.slice(); }
		if (item.command) { result.command = asCommand(item.command); }
		if (item.deprecated === true || item.deprecated === false) {
			result.deprecated = item.deprecated;
			if (item.deprecated === true) {
				tags.push(code.CompletionItemTag.Deprecated);
			}
		}
		if (item.preselect === true || item.preselect === false) { result.preselect = item.preselect; }
		const data = applyData(item, defaultData, dataApplyKind);
		if (data !== undefined) { result.data = data; }
		if (tags.length > 0) {
			result.tags = tags;
		}
		const insertTextMode = item.insertTextMode ?? defaultInsertTextMode;
		if (insertTextMode !== undefined) {
			result.insertTextMode = insertTextMode;
			if (insertTextMode === ls.InsertTextMode.asIs) {
				result.keepWhitespace = true;
			}
		}
		return result;
	}

	function applyCommitCharacters(item: ls.CompletionItem, defaultCommitCharacters: string[] | undefined, applyKind: ls.ApplyKind | undefined): string[] | undefined {
		if (applyKind === ls.ApplyKind.Merge) {
			if (!defaultCommitCharacters && !item.commitCharacters) {
				return undefined;
			}
			const set = new Set<string>();
			if (defaultCommitCharacters) {
				for (const char of defaultCommitCharacters) {
					set.add(char);
				}
			}
			if (Is.stringArray(item.commitCharacters)) {
				for (const char of item.commitCharacters) {
					set.add(char);
				}
			}
			return Array.from(set);
		}

		return item.commitCharacters !== undefined
			? Is.stringArray(item.commitCharacters) ? item.commitCharacters : undefined
			: defaultCommitCharacters;
	}

	function applyData(item: ls.CompletionItem, defaultData: any, applyKind: ls.ApplyKind | undefined): string[] | undefined {
		if (applyKind === ls.ApplyKind.Merge) {
			const data = {
				...defaultData,
			};

			if (item.data) {
				Object.entries(item.data).forEach(([key, value]) => {
					if (value !== undefined && value !== null) {
						data[key] = value;
					}
				});
			}

			return data;
		}

		return item.data ?? defaultData;
	}

	function asCompletionItemLabel(item: ls.CompletionItem): code.CompletionItemLabel | string {
		if (ls.CompletionItemLabelDetails.is(item.labelDetails)) {
			return {
				label: item.label,
				detail: item.labelDetails.detail,
				description: item.labelDetails.description
			};
		} else {
			return item.label;
		}
	}

	function asCompletionInsertText(item: ls.CompletionItem, defaultRange?: code.Range | InsertReplaceRange, defaultInsertTextFormat?: ls.InsertTextFormat): { text: string | code.SnippetString; range?: code.Range | InsertReplaceRange; fromEdit: boolean } | undefined {
		const insertTextFormat = item.insertTextFormat ?? defaultInsertTextFormat;
		if (item.textEdit !== undefined || defaultRange !== undefined) {
			const [range, newText] = item.textEdit !== undefined
				? getCompletionRangeAndText(item.textEdit)
				: [defaultRange, item.textEditText ?? item.label];
			if (insertTextFormat === ls.InsertTextFormat.Snippet) {
				return { text: new code.SnippetString(newText), range: range, fromEdit: true };
			} else {
				return { text: newText, range: range, fromEdit: true };
			}
		} else if (item.insertText) {
			if (insertTextFormat === ls.InsertTextFormat.Snippet) {
				return { text: new code.SnippetString(item.insertText), fromEdit: false };
			} else {
				return { text: item.insertText, fromEdit: false };
			}
		} else {
			return undefined;
		}
	}

	function getCompletionRangeAndText(value: ls.TextEdit | ls.InsertReplaceEdit): [code.Range | InsertReplaceRange, string] {
		if (ls.InsertReplaceEdit.is(value)) {
			return [{ inserting: asRange(value.insert), replacing: asRange(value.replace) }, value.newText];
		} else {
			return [asRange(value.range), value.newText];
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

	function asTextEdits(items: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asTextEdits(items: ls.TextEdit[], token?: code.CancellationToken): Promise<code.TextEdit[]>;
	function asTextEdits(items: ls.TextEdit[] | undefined | null, token?: code.CancellationToken): Promise<code.TextEdit[] | undefined>;
	async function asTextEdits(items: ls.TextEdit[] | undefined | null, token?: code.CancellationToken): Promise<code.TextEdit[] | undefined> {
		if (!items) {
			return undefined;
		}
		return async.map(items, asTextEdit, token);
	}

	function asTextEditsSync(items: undefined | null): undefined;
	function asTextEditsSync(items: ls.TextEdit[]): code.TextEdit[];
	function asTextEditsSync(items: ls.TextEdit[] | undefined | null): code.TextEdit[] | undefined;
	function asTextEditsSync(items: ls.TextEdit[] | undefined | null): code.TextEdit[] | undefined {
		if (!items) {
			return undefined;
		}
		const result: code.TextEdit[] = new Array(items.length);
		for (let i = 0; i < items.length; i++) {
			result[i] = asTextEdit(items[i]);
		}
		return result;
	}

	function asSignatureHelp(item: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asSignatureHelp(item: ls.SignatureHelp, token?: code.CancellationToken): Promise<code.SignatureHelp>;
	function asSignatureHelp(item: ls.SignatureHelp | undefined | null, token?: code.CancellationToken): Promise<code.SignatureHelp | undefined>;
	async function asSignatureHelp(item: ls.SignatureHelp | undefined | null, token?: code.CancellationToken): Promise<code.SignatureHelp | undefined> {
		if (!item) {
			return undefined;
		}
		const result = new code.SignatureHelp();
		if (Is.number(item.activeSignature)) {
			result.activeSignature = item.activeSignature;
		} else {
			// activeSignature was optional in the past
			result.activeSignature = 0;
		}
		if (Is.number(item.activeParameter)) {
			result.activeParameter = item.activeParameter;
		} else if (item.activeParameter === null) {
			result.activeParameter = -1;
		} else {
			// activeParameter was optional in the past
			result.activeParameter = 0;
		}
		if (item.signatures) { result.signatures = await asSignatureInformations(item.signatures, token); }
		return result;
	}

	async function asSignatureInformations(items: ls.SignatureInformation[], token?: code.CancellationToken): Promise<code.SignatureInformation[]> {
		return async.mapAsync(items, asSignatureInformation, token);
	}

	async function asSignatureInformation(item: ls.SignatureInformation, token?: code.CancellationToken): Promise<code.SignatureInformation> {
		const result = new code.SignatureInformation(item.label);
		if (item.documentation !== undefined) { result.documentation = asDocumentation(item.documentation); }
		if (item.parameters !== undefined) { result.parameters = await asParameterInformations(item.parameters, token); }
		if (item.activeParameter !== undefined) { result.activeParameter = item.activeParameter ?? -1; }
		{ return result; }
	}

	function asParameterInformations(items: ls.ParameterInformation[], token?: code.CancellationToken): Promise<code.ParameterInformation[]> {
		return async.map(items, asParameterInformation, token);
	}

	function asParameterInformation(item: ls.ParameterInformation): code.ParameterInformation {
		const result = new code.ParameterInformation(item.label);
		if (item.documentation) { result.documentation = asDocumentation(item.documentation); }
		return result;
	}


	function asLocation(item: undefined | null): undefined;
	function asLocation(item: ls.Location): code.Location;
	function asLocation(item: ls.Location | undefined | null): code.Location | undefined;
	function asLocation(item: ls.Location | undefined | null): code.Location | undefined {
		return item ? new code.Location(_uriConverter(item.uri), asRange(item.range)) : undefined;
	}

	function asDeclarationResult(item: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asDeclarationResult(item: ls.Declaration, token?: code.CancellationToken): Promise<code.Location | code.Location[]>;
	function asDeclarationResult(item: ls.DeclarationLink[], token?: code.CancellationToken): Promise<code.LocationLink[]>;
	async function asDeclarationResult(item: ls.Declaration | ls.DeclarationLink[] | undefined | null, token?: code.CancellationToken): Promise<code.Declaration | undefined> {
		if (!item) {
			return undefined;
		}
		return asLocationResult(item, token);
	}

	function asDefinitionResult(item: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asDefinitionResult(item: ls.Definition, token?: code.CancellationToken): Promise<code.Definition>;
	function asDefinitionResult(item: ls.DefinitionLink[], token?: code.CancellationToken): Promise<code.DefinitionLink[]>;
	async function asDefinitionResult(item: ls.Definition | ls.DefinitionLink[] | undefined | null, token?: code.CancellationToken): Promise<code.Definition | code.DefinitionLink[] | undefined> {
		if (!item) {
			return undefined;
		}
		return asLocationResult(item, token);
	}

	function asLocationLink(item: undefined | null): undefined;
	function asLocationLink(item: ls.LocationLink): code.LocationLink;
	function asLocationLink(item: ls.LocationLink | undefined | null): code.LocationLink | undefined {
		if (!item) {
			return undefined;
		}
		const result = {
			targetUri: _uriConverter(item.targetUri),
			targetRange: asRange(item.targetRange), // See issue: https://github.com/Microsoft/vscode/issues/58649
			originSelectionRange: asRange(item.originSelectionRange),
			targetSelectionRange: asRange(item.targetSelectionRange)
		};
		if (!result.targetSelectionRange) {
			throw new Error(`targetSelectionRange must not be undefined or null`);
		}
		return result;
	}

	async function asLocationResult(item: ls.Location | ls.Location[] | ls.LocationLink[] | undefined | null, token?: code.CancellationToken): Promise<code.Location | code.Location[] | code.LocationLink[] | undefined> {
		if (!item) {
			return undefined;
		}
		if (Is.array(item)) {
			if (item.length === 0) {
				return [];
			} else if (ls.LocationLink.is(item[0])) {
				const links = item as ls.LocationLink[];
				return async.map(links, asLocationLink, token);
			} else {
				const locations = item as ls.Location[];
				return async.map(locations, (asLocation as (item: ls.Location) => code.Location), token);
			}
		} else if (ls.LocationLink.is(item)) {
			return [asLocationLink(item)];
		} else {
			return asLocation(item);
		}
	}

	function asReferences(values: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asReferences(values: ls.Location[], token?: code.CancellationToken): Promise<code.Location[]>;
	function asReferences(values: ls.Location[] | undefined | null, token?: code.CancellationToken): Promise<code.Location[] | undefined>;
	async function asReferences(values: ls.Location[] | undefined | null, token?: code.CancellationToken): Promise<code.Location[] | undefined> {
		if (!values) {
			return undefined;
		}
		return async.map(values, (asLocation as (item: ls.Location) => code.Location), token);
	}

	function asDocumentHighlights(values: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asDocumentHighlights(values: ls.DocumentHighlight[], token?: code.CancellationToken): Promise<code.DocumentHighlight[]>;
	function asDocumentHighlights(values: ls.DocumentHighlight[] | undefined | null, token?: code.CancellationToken): Promise<code.DocumentHighlight[] | undefined>;
	async function asDocumentHighlights(values: ls.DocumentHighlight[] | undefined | null, token?: code.CancellationToken): Promise<code.DocumentHighlight[] | undefined> {
		if (!values) {
			return undefined;
		}
		return async.map(values, asDocumentHighlight, token);
	}

	function asDocumentHighlight(item: ls.DocumentHighlight): code.DocumentHighlight {
		const result = new code.DocumentHighlight(asRange(item.range));
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

	function asSymbolInformations(values: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asSymbolInformations(values: ls.SymbolInformation[], token?: code.CancellationToken): Promise<code.SymbolInformation[]>;
	function asSymbolInformations(values: ls.SymbolInformation[] | undefined | null, token?: code.CancellationToken): Promise<code.SymbolInformation[] | undefined>;
	async function asSymbolInformations(values: ls.SymbolInformation[] | undefined | null, token?: code.CancellationToken): Promise<code.SymbolInformation[] | undefined> {
		if (!values) {
			return undefined;
		}
		return async.map(values, asSymbolInformation, token);
	}

	function asSymbolKind(item: ls.SymbolKind): code.SymbolKind {
		if (item <= ls.SymbolKind.TypeParameter) {
			// Symbol kind is one based in the protocol and zero based in code.
			return item - 1;
		}
		return code.SymbolKind.Property;
	}

	function asSymbolTag(value: ls.SymbolTag): code.SymbolTag | undefined {
		switch (value) {
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

	function asSymbolInformation(item: ls.SymbolInformation | ls.WorkspaceSymbol): code.SymbolInformation {
		const data: ls.LSPAny | undefined = (item as ls.WorkspaceSymbol).data;
		const location: Omit<ls.Location, 'range'> & { range?: ls.Range } = item.location;
		const result: code.SymbolInformation = location.range === undefined || data !== undefined
			? new WorkspaceSymbol(
				item.name, asSymbolKind(item.kind), item.containerName ?? '',
				location.range === undefined ? _uriConverter(location.uri) : new code.Location(_uriConverter(item.location.uri), asRange(location.range)), data)
			: new code.SymbolInformation(
				item.name, asSymbolKind(item.kind), item.containerName ?? '',
				new code.Location(_uriConverter(item.location.uri), asRange(location.range)));
		fillTags(result, item);
		return result;
	}

	function asDocumentSymbols(values: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asDocumentSymbols(values: ls.DocumentSymbol[], token?: code.CancellationToken): Promise<code.DocumentSymbol[]>;
	async function asDocumentSymbols(values: ls.DocumentSymbol[] | undefined | null, token?: code.CancellationToken): Promise<code.DocumentSymbol[] | undefined> {
		if (values === undefined || values === null) {
			return undefined;
		}
		return async.map(values, asDocumentSymbol, token);
	}

	function asDocumentSymbol(value: ls.DocumentSymbol): code.DocumentSymbol {
		const result = new code.DocumentSymbol(
			value.name,
			value.detail || '',
			asSymbolKind(value.kind),
			asRange(value.range),
			asRange(value.selectionRange)
		);
		fillTags(result, value);
		if (value.children !== undefined && value.children.length > 0) {
			const children: code.DocumentSymbol[] = [];
			for (const child of value.children) {
				children.push(asDocumentSymbol(child));
			}
			result.children = children;
		}
		return result;
	}

	function fillTags(result: { tags?: ReadonlyArray<code.SymbolTag> }, value: { tags?: ls.SymbolTag[]; deprecated?: boolean }): void {
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
		const result: code.Command = { title: item.title, command: item.command };
		if (item.tooltip) { result.tooltip = item.tooltip; }
		if (item.arguments) { result.arguments = item.arguments; }
		return result;
	}

	function asCommands(items: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asCommands(items: ls.Command[], token?: code.CancellationToken): Promise<code.Command[]>;
	function asCommands(items: ls.Command[] | undefined | null, token?: code.CancellationToken): Promise<code.Command[] | undefined>;
	async function asCommands(items: ls.Command[] | undefined | null, token?: code.CancellationToken): Promise<code.Command[] | undefined> {
		if (!items) {
			return undefined;
		}
		return async.map(items, asCommand, token);
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
		const parts = item.split('.');
		result = code.CodeActionKind.Empty;
		for (const part of parts) {
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

	function asCodeActionDocumentations(items: null | undefined): undefined;
	function asCodeActionDocumentations(items: ls.CodeActionKindDocumentation[]): code.CodeActionProviderMetadata['documentation'];
	function asCodeActionDocumentations(items: ls.CodeActionKindDocumentation[] | null | undefined): code.CodeActionProviderMetadata['documentation'] | undefined;
	function asCodeActionDocumentations(items: ls.CodeActionKindDocumentation[] | null | undefined): code.CodeActionProviderMetadata['documentation'] | undefined {
		if (items === undefined || items === null) {
			return undefined;
		}
		return items.map(doc => ({ kind: asCodeActionKind(doc.kind), command: asCommand(doc.command) }));
	}

	function asCodeAction(item: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asCodeAction(item: ls.CodeAction, token?: code.CancellationToken): Promise<code.CodeAction>;
	function asCodeAction(item: ls.CodeAction | undefined | null, token?: code.CancellationToken): Promise<code.CodeAction | undefined>;
	async function asCodeAction(item: ls.CodeAction | undefined | null, token?: code.CancellationToken): Promise<code.CodeAction | undefined> {
		if (item === undefined || item === null) {
			return undefined;
		}
		const result = new ProtocolCodeAction(item.title, item.data);
		if (item.kind !== undefined) { result.kind = asCodeActionKind(item.kind); }
		if (item.diagnostics !== undefined) { result.diagnostics = asDiagnosticsSync(item.diagnostics); }
		if (item.edit !== undefined) { result.edit = await asWorkspaceEdit(item.edit, token); }
		if (item.command !== undefined) { result.command = asCommand(item.command); }
		if (item.isPreferred !== undefined) { result.isPreferred = item.isPreferred; }
		if (item.disabled !== undefined) { result.disabled = { reason: item.disabled.reason }; }
		if (item.tags?.includes(ls.CodeActionTag.LLMGenerated)) {
			result.isAI = true;
		}

		return result;
	}

	function asCodeActionResult(items: (ls.Command | ls.CodeAction)[], token?: code.CancellationToken): Promise<(code.Command | code.CodeAction)[]> {
		return async.mapAsync(items, async (item) => {
			if (ls.Command.is(item)) {
				return asCommand(item);
			} else {
				return asCodeAction(item, token);
			}
		}, token);
	}

	function asCodeLens(item: undefined | null): undefined;
	function asCodeLens(item: ls.CodeLens): code.CodeLens;
	function asCodeLens(item: ls.CodeLens | undefined | null): code.CodeLens | undefined;
	function asCodeLens(item: ls.CodeLens | undefined | null): code.CodeLens | undefined {
		if (!item) {
			return undefined;
		}
		const result: ProtocolCodeLens = new ProtocolCodeLens(asRange(item.range));
		if (item.command) { result.command = asCommand(item.command); }
		if (item.data !== undefined && item.data !== null) { result.data = item.data; }
		return result;
	}

	function asCodeLenses(items: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asCodeLenses(items: ls.CodeLens[], token?: code.CancellationToken): Promise<code.CodeLens[]>;
	function asCodeLenses(items: ls.CodeLens[] | undefined | null, token?: code.CancellationToken): Promise<code.CodeLens[] | undefined>;
	async function asCodeLenses(items: ls.CodeLens[] | undefined | null, token?: code.CancellationToken): Promise<code.CodeLens[] | undefined> {
		if (!items) {
			return undefined;
		}
		return async.map(items, (asCodeLens as (item: ls.CodeLens) => code.CodeLens), token);
	}

	function asWorkspaceEdit(item: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asWorkspaceEdit(item: ls.WorkspaceEdit, token?: code.CancellationToken): Promise<code.WorkspaceEdit>;
	function asWorkspaceEdit(item: ls.WorkspaceEdit | undefined | null, token?: code.CancellationToken): Promise<code.WorkspaceEdit | undefined>;
	async function asWorkspaceEdit(item: ls.WorkspaceEdit | undefined | null, token?: code.CancellationToken): Promise<code.WorkspaceEdit | undefined> {
		if (!item) {
			return undefined;
		}
		const sharedMetadata: Map<string, code.WorkspaceEditEntryMetadata> = new Map();
		if (item.changeAnnotations !== undefined) {
			const changeAnnotations = item.changeAnnotations;
			await async.forEach(Object.keys(changeAnnotations), (key) => {
				const metaData = asWorkspaceEditEntryMetadata(changeAnnotations[key]);
				sharedMetadata.set(key, metaData);

			}, token);
		}
		const asMetadata = (annotation: ls.ChangeAnnotationIdentifier | undefined): code.WorkspaceEditEntryMetadata | undefined => {
			if (annotation === undefined) {
				return undefined;
			} else {
				return sharedMetadata.get(annotation);
			}
		};
		const result = new code.WorkspaceEdit();
		if (item.documentChanges) {
			const documentChanges = item.documentChanges;
			await async.forEach(documentChanges, (change) => {
				if (ls.CreateFile.is(change)) {
					result.createFile(_uriConverter(change.uri), change.options, asMetadata(change.annotationId));
				} else if (ls.RenameFile.is(change)) {
					result.renameFile(_uriConverter(change.oldUri), _uriConverter(change.newUri), change.options, asMetadata(change.annotationId));
				} else if (ls.DeleteFile.is(change)) {
					result.deleteFile(_uriConverter(change.uri), change.options, asMetadata(change.annotationId));
				} else if (ls.TextDocumentEdit.is(change)) {
					const uri = _uriConverter(change.textDocument.uri);
					const edits: [code.TextEdit | code.SnippetTextEdit, code.WorkspaceEditEntryMetadata | undefined][] = [];
					for (const edit of change.edits) {
						if (ls.AnnotatedTextEdit.is(edit)) {
							edits.push([new code.TextEdit(asRange(edit.range), edit.newText), asMetadata(edit.annotationId)]);
						} else if (ls.SnippetTextEdit.is(edit)) {
							edits.push([new code.SnippetTextEdit(asRange(edit.range), new code.SnippetString(edit.snippet.value)), asMetadata(edit.annotationId)]);
						} else {
							edits.push([new code.TextEdit(asRange(edit.range), edit.newText), undefined]);
						}
					}
					result.set(uri, edits);
				} else {
					throw new Error(`Unknown workspace edit change received:\n${JSON.stringify(change, undefined, 4)}`);
				}
			}, token);
		} else if (item.changes) {
			const changes = item.changes;
			await async.forEach(Object.keys(changes), (key) => {
				result.set(_uriConverter(key), asTextEditsSync(changes[key]));
			}, token);
		}
		return result;
	}

	function asWorkspaceEditEntryMetadata(annotation: undefined): undefined;
	function asWorkspaceEditEntryMetadata(annotation: ls.ChangeAnnotation): code.WorkspaceEditEntryMetadata;
	function asWorkspaceEditEntryMetadata(annotation: ls.ChangeAnnotation | undefined): code.WorkspaceEditEntryMetadata | undefined;
	function asWorkspaceEditEntryMetadata(annotation: ls.ChangeAnnotation | undefined): code.WorkspaceEditEntryMetadata | undefined {
		if (annotation === undefined) {
			return undefined;
		}
		return { label: annotation.label, needsConfirmation: !!annotation.needsConfirmation, description: annotation.description };
	}

	function asDocumentLink(item: ls.DocumentLink): code.DocumentLink {
		const range = asRange(item.range);
		const target = item.target ? asUri(item.target) : undefined;
		// target must be optional in DocumentLink
		const link = new ProtocolDocumentLink(range, target);
		if (item.tooltip !== undefined) { link.tooltip = item.tooltip; }
		if (item.data !== undefined && item.data !== null) { link.data = item.data; }
		return link;
	}

	function asDocumentLinks(items: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asDocumentLinks(items: ls.DocumentLink[], token?: code.CancellationToken): Promise<code.DocumentLink[]>;
	function asDocumentLinks(items: ls.DocumentLink[] | undefined | null, token?: code.CancellationToken): Promise<code.DocumentLink[] | undefined>;
	async function asDocumentLinks(items: ls.DocumentLink[] | undefined | null, token?: code.CancellationToken): Promise<code.DocumentLink[] | undefined> {
		if (!items) {
			return undefined;
		}
		return async.map(items, asDocumentLink, token);
	}

	function asColor(color: ls.Color): code.Color {
		return new code.Color(color.red, color.green, color.blue, color.alpha);
	}

	function asColorInformation(ci: ls.ColorInformation): code.ColorInformation {
		return new code.ColorInformation(asRange(ci.range), asColor(ci.color));
	}

	function asColorInformations(colorInformation: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asColorInformations(colorInformation: ls.ColorInformation[], token?: code.CancellationToken): Promise<code.ColorInformation[]>;
	async function asColorInformations(colorInformation: ls.ColorInformation[] | undefined | null, token?: code.CancellationToken): Promise<code.ColorInformation[] | undefined> {
		if (!colorInformation) {
			return undefined;
		}
		return async.map(colorInformation, asColorInformation, token);
	}

	function asColorPresentation(cp: ls.ColorPresentation): code.ColorPresentation {
		const presentation = new code.ColorPresentation(cp.label);
		presentation.additionalTextEdits = asTextEditsSync(cp.additionalTextEdits);
		if (cp.textEdit) {
			presentation.textEdit = asTextEdit(cp.textEdit);
		}
		return presentation;
	}

	function asColorPresentations(colorPresentations: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asColorPresentations(colorPresentations: ls.ColorPresentation[], token?: code.CancellationToken): Promise<code.ColorPresentation[]>;
	async function asColorPresentations(colorPresentations: ls.ColorPresentation[] | undefined | null, token?: code.CancellationToken): Promise<code.ColorPresentation[] | undefined> {
		if (!colorPresentations) {
			return undefined;
		}
		return async.map(colorPresentations, asColorPresentation, token);
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

	function asFoldingRanges(foldingRanges: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asFoldingRanges(foldingRanges: ls.FoldingRange[], token?: code.CancellationToken): Promise<code.FoldingRange[]>;
	function asFoldingRanges(foldingRanges: ls.FoldingRange[] | undefined | null, token?: code.CancellationToken): Promise<code.FoldingRange[] | undefined>;
	async function asFoldingRanges(foldingRanges: ls.FoldingRange[] | undefined | null, token?: code.CancellationToken): Promise<code.FoldingRange[] | undefined> {
		if (!foldingRanges) {
			return undefined;
		}
		return async.map(foldingRanges, asFoldingRange, token);
	}

	function asSelectionRange(selectionRange: ls.SelectionRange): code.SelectionRange {
		return new code.SelectionRange(asRange(selectionRange.range),
			selectionRange.parent ? asSelectionRange(selectionRange.parent) : undefined
		);
	}

	function asSelectionRanges(selectionRanges: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asSelectionRanges(selectionRanges: ls.SelectionRange[], token?: code.CancellationToken): Promise<code.SelectionRange[]>;
	function asSelectionRanges(selectionRanges: ls.SelectionRange[] | undefined | null, token?: code.CancellationToken): Promise<code.SelectionRange[] | undefined>;
	async function asSelectionRanges(selectionRanges: ls.SelectionRange[] | undefined | null, token?: code.CancellationToken): Promise<code.SelectionRange[] | undefined> {
		if (!Array.isArray(selectionRanges)) {
			return [];
		}
		return async.map(selectionRanges, asSelectionRange, token);
	}

	function asInlineValue(inlineValue: ls.InlineValue): code.InlineValue {
		if (ls.InlineValueText.is(inlineValue)) {
			return new code.InlineValueText(
				asRange(inlineValue.range),
				inlineValue.text,
			);
		} else if (ls.InlineValueVariableLookup.is(inlineValue)) {
			return new code.InlineValueVariableLookup(
				asRange(inlineValue.range),
				inlineValue.variableName,
				inlineValue.caseSensitiveLookup,
			);
		} else {
			return new code.InlineValueEvaluatableExpression(
				asRange(inlineValue.range),
				inlineValue.expression,
			);
		}
	}

	function asInlineValues(inlineValues: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asInlineValues(inlineValues: ls.InlineValue[], token?: code.CancellationToken): Promise<code.SelectionRange[]>;
	function asInlineValues(inlineValues: ls.InlineValue[] | undefined | null, token?: code.CancellationToken): Promise<code.InlineValue[] | undefined>;
	async function asInlineValues(inlineValues: ls.InlineValue[] | undefined | null, token?: code.CancellationToken): Promise<code.InlineValue[] | undefined> {
		if (!Array.isArray(inlineValues)) {
			return [];
		}
		return async.map(inlineValues, asInlineValue, token);
	}

	async function asInlayHint(value: ls.InlayHint, token?: code.CancellationToken): Promise<code.InlayHint> {
		const label = typeof value.label === 'string'
			? value.label
			: await async.map(value.label, asInlayHintLabelPart, token);
		const result = new ProtocolInlayHint(asPosition(value.position), label);
		if (value.kind !== undefined) { result.kind = value.kind; }
		if (value.textEdits !== undefined) { result.textEdits = await asTextEdits(value.textEdits, token); }
		if (value.tooltip !== undefined) { result.tooltip = asTooltip(value.tooltip); }
		if (value.paddingLeft !== undefined) { result.paddingLeft = value.paddingLeft; }
		if (value.paddingRight !== undefined) { result.paddingRight = value.paddingRight; }
		if (value.data !== undefined) { result.data = value.data; }
		return result;
	}

	function asInlayHintLabelPart(part: ls.InlayHintLabelPart): code.InlayHintLabelPart {
		const result = new code.InlayHintLabelPart(part.value);
		if (part.location !== undefined) { result.location = asLocation(part.location); }
		if (part.tooltip !== undefined) { result.tooltip = asTooltip(part.tooltip); }
		if (part.command !== undefined) { result.command = asCommand(part.command); }
		return result;
	}

	function asTooltip(value: string | ls.MarkupContent): string | code.MarkdownString {
		if (typeof value === 'string') {
			return value;
		}
		return asMarkdownString(value);
	}

	function asInlayHints(values: undefined | null,  token?: code.CancellationToken): Promise<undefined>;
	function asInlayHints(values: ls.InlayHint[], token?: code.CancellationToken): Promise<code.InlayHint[]>;
	function asInlayHints(values: ls.InlayHint[] | undefined | null, token?: code.CancellationToken): Promise<code.InlayHint[] | undefined>;
	async function asInlayHints(values: ls.InlayHint[] | undefined | null, token?: code.CancellationToken): Promise<code.InlayHint[] | undefined> {
		if (!Array.isArray(values)) {
			return undefined;
		}
		return async.mapAsync(values, asInlayHint, token);
	}

	//----- call hierarchy

	function asCallHierarchyItem(item: null): undefined;
	function asCallHierarchyItem(item: ls.CallHierarchyItem): code.CallHierarchyItem;
	function asCallHierarchyItem(item: ls.CallHierarchyItem | null): code.CallHierarchyItem | undefined;
	function asCallHierarchyItem(item: ls.CallHierarchyItem | null): code.CallHierarchyItem | undefined {
		if (item === null) {
			return undefined;
		}
		const result = new ProtocolCallHierarchyItem(
			asSymbolKind(item.kind),
			item.name,
			item.detail || '',
			asUri(item.uri),
			asRange(item.range),
			asRange(item.selectionRange),
			item.data
		);
		if (item.tags !== undefined) { result.tags = asSymbolTags(item.tags); }
		return result;
	}

	function asCallHierarchyItems(items: null, token?: code.CancellationToken): Promise<undefined>;
	function asCallHierarchyItems(items: ls.CallHierarchyItem[], token?: code.CancellationToken): Promise<code.CallHierarchyItem[]>;
	function asCallHierarchyItems(items: ls.CallHierarchyItem[] | null, token?: code.CancellationToken): Promise<code.CallHierarchyItem[] | undefined>;
	async function asCallHierarchyItems(items: ls.CallHierarchyItem[] | null, token?: code.CancellationToken): Promise<code.CallHierarchyItem[] | undefined> {
		if (items === null) {
			return undefined;
		}
		return async.map(items, (asCallHierarchyItem as (item: ls.CallHierarchyItem) => code.CallHierarchyItem) , token);
	}

	async function asCallHierarchyIncomingCall(item: ls.CallHierarchyIncomingCall, token?: code.CancellationToken): Promise<code.CallHierarchyIncomingCall> {
		return new code.CallHierarchyIncomingCall(
			asCallHierarchyItem(item.from),
			await asRanges(item.fromRanges, token)
		);
	}
	function asCallHierarchyIncomingCalls(items: null, token?: code.CancellationToken): Promise<undefined>;
	function asCallHierarchyIncomingCalls(items: ReadonlyArray<ls.CallHierarchyIncomingCall>, token?: code.CancellationToken): Promise<code.CallHierarchyIncomingCall[]>;
	function asCallHierarchyIncomingCalls(items: ReadonlyArray<ls.CallHierarchyIncomingCall> | null, token?: code.CancellationToken): Promise<code.CallHierarchyIncomingCall[] | undefined>;
	async function asCallHierarchyIncomingCalls(items: ReadonlyArray<ls.CallHierarchyIncomingCall> | null, token?: code.CancellationToken): Promise<code.CallHierarchyIncomingCall[] | undefined> {
		if (items === null) {
			return undefined;
		}
		return async.mapAsync(items, asCallHierarchyIncomingCall, token);
	}

	async function asCallHierarchyOutgoingCall(item: ls.CallHierarchyOutgoingCall, token?: code.CancellationToken): Promise<code.CallHierarchyOutgoingCall> {
		return new code.CallHierarchyOutgoingCall(
			asCallHierarchyItem(item.to),
			await asRanges(item.fromRanges, token)
		);
	}

	function asCallHierarchyOutgoingCalls(items: null, token?: code.CancellationToken): Promise<undefined>;
	function asCallHierarchyOutgoingCalls(items: ReadonlyArray<ls.CallHierarchyOutgoingCall>, token?: code.CancellationToken): Promise<code.CallHierarchyOutgoingCall[]>;
	function asCallHierarchyOutgoingCalls(items: ReadonlyArray<ls.CallHierarchyOutgoingCall> | null, token?: code.CancellationToken): Promise<code.CallHierarchyOutgoingCall[] | undefined>;
	async function asCallHierarchyOutgoingCalls(items: ReadonlyArray<ls.CallHierarchyOutgoingCall> | null, token?: code.CancellationToken): Promise<code.CallHierarchyOutgoingCall[] | undefined> {
		if (items === null) {
			return undefined;
		}
		return async.mapAsync(items, asCallHierarchyOutgoingCall, token);
	}

	//----- semantic tokens

	function asSemanticTokens(value: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asSemanticTokens(value: ls.SemanticTokens, token?: code.CancellationToken): Promise<code.SemanticTokens>;
	function asSemanticTokens(value: ls.SemanticTokens | undefined | null, token?: code.CancellationToken): Promise<code.SemanticTokens | undefined>;
	async function asSemanticTokens(value: ls.SemanticTokens | undefined | null, _token?: code.CancellationToken): Promise<code.SemanticTokens | undefined> {
		if (value === undefined || value === null) {
			return undefined;
		}
		return new code.SemanticTokens(new Uint32Array(value.data), value.resultId);
	}

	function asSemanticTokensEdit(value: ls.SemanticTokensEdit): code.SemanticTokensEdit {
		return new code.SemanticTokensEdit(value.start, value.deleteCount, value.data !== undefined ? new Uint32Array(value.data) : undefined);
	}

	function asSemanticTokensEdits(value: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asSemanticTokensEdits(value: ls.SemanticTokensDelta, token?: code.CancellationToken): Promise<code.SemanticTokensEdits>;
	function asSemanticTokensEdits(value: ls.SemanticTokensDelta | undefined | null, token?: code.CancellationToken): Promise<code.SemanticTokensEdits | undefined>;
	async function asSemanticTokensEdits(value: ls.SemanticTokensDelta | undefined | null, _token?: code.CancellationToken): Promise<code.SemanticTokensEdits | undefined> {
		if (value === undefined || value === null) {
			return undefined;
		}
		return new code.SemanticTokensEdits(value.edits.map(asSemanticTokensEdit), value.resultId);
	}

	function asSemanticTokensLegend(value: ls.SemanticTokensLegend): code.SemanticTokensLegend {
		return value;
	}

	function asLinkedEditingRanges(value: null | undefined, token?: code.CancellationToken): Promise<undefined>;
	function asLinkedEditingRanges(value: ls.LinkedEditingRanges, token?: code.CancellationToken): Promise<code.LinkedEditingRanges>;
	function asLinkedEditingRanges(value: ls.LinkedEditingRanges | null | undefined, token?: code.CancellationToken): Promise<code.LinkedEditingRanges | undefined>;
	async function asLinkedEditingRanges(value: ls.LinkedEditingRanges | null | undefined, token?: code.CancellationToken): Promise<code.LinkedEditingRanges | undefined> {
		if (value === null || value === undefined) {
			return undefined;
		}
		return new code.LinkedEditingRanges(await asRanges(value.ranges, token), asRegularExpression(value.wordPattern));
	}

	function asRegularExpression(value: null | undefined): undefined;
	function asRegularExpression(value: string): RegExp;
	function asRegularExpression(value: string | null | undefined): RegExp | undefined;
	function asRegularExpression(value: string | null | undefined): RegExp | undefined {
		if (value === null || value === undefined) {
			return undefined;
		}
		return new RegExp(value);
	}

	//------ Type Hierarchy
	function asTypeHierarchyItem(item: null): undefined;
	function asTypeHierarchyItem(item: ls.TypeHierarchyItem): code.TypeHierarchyItem;
	function asTypeHierarchyItem(item: ls.TypeHierarchyItem | null): code.TypeHierarchyItem | undefined;
	function asTypeHierarchyItem(item: ls.TypeHierarchyItem | null): code.TypeHierarchyItem | undefined {
		if (item === null) {
			return undefined;
		}
		const result = new ProtocolTypeHierarchyItem(
			asSymbolKind(item.kind),
			item.name,
			item.detail || '',
			asUri(item.uri),
			asRange(item.range),
			asRange(item.selectionRange),
			item.data
		);
		if (item.tags !== undefined) { result.tags = asSymbolTags(item.tags); }
		return result;
	}

	function asTypeHierarchyItems(items: null, token?: code.CancellationToken): Promise<undefined>;
	function asTypeHierarchyItems(items: ls.TypeHierarchyItem[], token?: code.CancellationToken): Promise<code.TypeHierarchyItem[]>;
	function asTypeHierarchyItems(items: ls.TypeHierarchyItem[] | null, token?: code.CancellationToken): Promise<code.TypeHierarchyItem[] | undefined>;
	async function asTypeHierarchyItems(items: ls.TypeHierarchyItem[] | null, token?: code.CancellationToken): Promise<code.TypeHierarchyItem[] | undefined> {
		if (items === null) {
			return undefined;
		}
		return async.map(items, (asTypeHierarchyItem as (item: ls.TypeHierarchyItem) => code.TypeHierarchyItem), token);
	}

	function asGlobPattern(pattern: undefined | null): undefined;
	function asGlobPattern(pattern: ls.GlobPattern | null | undefined): code.GlobPattern | undefined;
	function asGlobPattern(pattern: ls.GlobPattern | null | undefined): code.GlobPattern | undefined {
		if (Is.string(pattern)) {
			return pattern;
		}
		if (ls.RelativePattern.is(pattern)) {
			if (ls.URI.is(pattern.baseUri)) {
				return new code.RelativePattern(asUri(pattern.baseUri), pattern.pattern);
			} else if (ls.WorkspaceFolder.is(pattern.baseUri)) {
				const workspaceFolder = code.workspace.getWorkspaceFolder(asUri(pattern.baseUri.uri));
				return workspaceFolder !== undefined ? new code.RelativePattern(workspaceFolder, pattern.pattern) : undefined;
			}
		}
		return undefined;
	}

	function asInlineCompletionResult(value: undefined | null, token?: code.CancellationToken): Promise<undefined>;
	function asInlineCompletionResult(value: ls.InlineCompletionList, token?: code.CancellationToken): Promise<code.InlineCompletionList>;
	function asInlineCompletionResult(value: ls.InlineCompletionItem[], token?: code.CancellationToken): Promise<code.InlineCompletionItem[]>;
	function asInlineCompletionResult(value: ls.InlineCompletionItem[] | ls.InlineCompletionList | undefined | null, token?: code.CancellationToken): Promise<code.InlineCompletionItem[] | code.InlineCompletionList | undefined>;
	async function asInlineCompletionResult(value: ls.InlineCompletionItem[] | ls.InlineCompletionList | undefined | null, token?: code.CancellationToken): Promise<code.InlineCompletionItem[]| code.InlineCompletionList | undefined> {
		if (!value) {
			return undefined;
		}
		if (Array.isArray(value)) {
			return async.map(value, (item) => asInlineCompletionItem(item), token);
		}
		const list = <ls.InlineCompletionList>value;
		const converted = await async.map(list.items, (item) => {
			return asInlineCompletionItem(item);
		}, token);
		return new code.InlineCompletionList(converted);
	}

	function asInlineCompletionItem(item: ls.InlineCompletionItem): code.InlineCompletionItem {
		let insertText: string | code.SnippetString;
		if (typeof item.insertText === 'string') {
			insertText = item.insertText;
		} else {
			insertText = new code.SnippetString(item.insertText.value);
		}

		let command: code.Command | undefined = undefined;
		if (item.command) {command = asCommand(item.command);}

		const inlineCompletionItem = new code.InlineCompletionItem(insertText, asRange(item.range), command);

		if (item.filterText) { inlineCompletionItem.filterText = item.filterText; }

		return inlineCompletionItem;
	}

	return {
		asUri,
		asDocumentSelector,
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
		asCodeActionDocumentations,
		asCodeActionResult,
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
		asSelectionRanges,
		asInlineValue,
		asInlineValues,
		asInlayHint,
		asInlayHints,
		asSemanticTokensLegend,
		asSemanticTokens,
		asSemanticTokensEdit,
		asSemanticTokensEdits,
		asCallHierarchyItem,
		asCallHierarchyItems,
		asCallHierarchyIncomingCall,
		asCallHierarchyIncomingCalls,
		asCallHierarchyOutgoingCall,
		asCallHierarchyOutgoingCalls,
		asLinkedEditingRanges: asLinkedEditingRanges,
		asTypeHierarchyItem,
		asTypeHierarchyItems,
		asGlobPattern,
		asInlineCompletionResult,
		asInlineCompletionItem
	};
}
