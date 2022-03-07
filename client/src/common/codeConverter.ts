/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as code from 'vscode';
import * as proto from 'vscode-languageserver-protocol';

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


interface InsertReplaceRange {
	inserting: code.Range;
	replacing: code.Range;
}

namespace InsertReplaceRange {
	export function is(value: code.Range | InsertReplaceRange): value is InsertReplaceRange {
		const candidate = value as InsertReplaceRange;
		return candidate && !!candidate.inserting && !!candidate.replacing;
	}
}

export interface FileFormattingOptions {
	trimTrailingWhitespace?: boolean;
	trimFinalNewlines?: boolean;
	insertFinalNewline?: boolean;
}

export interface Converter {

	asUri(uri: code.Uri): string;

	asTextDocumentItem(textDocument: code.TextDocument): proto.TextDocumentItem;

	asTextDocumentIdentifier(textDocument: code.TextDocument): proto.TextDocumentIdentifier;

	asVersionedTextDocumentIdentifier(textDocument: code.TextDocument): proto.VersionedTextDocumentIdentifier;

	asOpenTextDocumentParams(textDocument: code.TextDocument): proto.DidOpenTextDocumentParams;

	asChangeTextDocumentParams(textDocument: code.TextDocument): proto.DidChangeTextDocumentParams;
	asChangeTextDocumentParams(event: code.TextDocumentChangeEvent): proto.DidChangeTextDocumentParams;

	asCloseTextDocumentParams(textDocument: code.TextDocument): proto.DidCloseTextDocumentParams;

	asSaveTextDocumentParams(textDocument: code.TextDocument, includeContent?: boolean): proto.DidSaveTextDocumentParams;
	asWillSaveTextDocumentParams(event: code.TextDocumentWillSaveEvent): proto.WillSaveTextDocumentParams;

	asDidCreateFilesParams(event: code.FileCreateEvent): proto.CreateFilesParams;
	asDidRenameFilesParams(event: code.FileRenameEvent): proto.RenameFilesParams;
	asDidDeleteFilesParams(event: code.FileDeleteEvent): proto.DeleteFilesParams;
	asWillCreateFilesParams(event: code.FileCreateEvent): proto.CreateFilesParams;
	asWillRenameFilesParams(event: code.FileRenameEvent): proto.RenameFilesParams;
	asWillDeleteFilesParams(event: code.FileDeleteEvent): proto.DeleteFilesParams;

	asTextDocumentPositionParams(textDocument: code.TextDocument, position: code.Position): proto.TextDocumentPositionParams;

	asCompletionParams(textDocument: code.TextDocument, position: code.Position, context: code.CompletionContext): proto.CompletionParams;

	asSignatureHelpParams(textDocument: code.TextDocument, position: code.Position, context: code.SignatureHelpContext): proto.SignatureHelpParams;

	asWorkerPosition(position: code.Position): proto.Position;

	asPosition(value: null): null;
	asPosition(value: undefined): undefined;
	asPosition(value: code.Position): proto.Position;
	asPosition(value: code.Position | undefined | null): proto.Position | undefined | null;

	asPositions(value: code.Position[], token?: code.CancellationToken): Promise<proto.Position[]>;

	asRange(value: null): null;
	asRange(value: undefined): undefined;
	asRange(value: code.Range): proto.Range;
	asRange(value: code.Range | undefined | null): proto.Range | undefined | null;

	asLocation(value: null): null;
	asLocation(value: undefined): undefined;
	asLocation(value: code.Location): proto.Location;
	asLocation(value: code.Location | undefined | null): proto.Location | undefined | null;

	asDiagnosticSeverity(value: code.DiagnosticSeverity): number;
	asDiagnosticTag(value: code.DiagnosticTag): number | undefined;

	asDiagnostic(item: code.Diagnostic): proto.Diagnostic;

	asDiagnostics(items: code.Diagnostic[], token?: code.CancellationToken): Promise<proto.Diagnostic[]>;

	asCompletionItem(item: code.CompletionItem, labelDetailsSupport?: boolean): proto.CompletionItem;

	asSymbolKind(item: code.SymbolKind): proto.SymbolKind;

	asSymbolTag(item: code.SymbolTag): proto.SymbolTag;
	asSymbolTags(items: ReadonlyArray<code.SymbolTag>): proto.SymbolTag[];

	asTextEdit(edit: code.TextEdit): proto.TextEdit;

	asReferenceParams(textDocument: code.TextDocument, position: code.Position, options: { includeDeclaration: boolean }): proto.ReferenceParams;

	asCodeAction(item: code.CodeAction, token?: code.CancellationToken): Promise<proto.CodeAction>;

	asCodeActionContext(context: code.CodeActionContext, token?: code.CancellationToken): Promise<proto.CodeActionContext>;

	asInlineValueContext(context: code.InlineValueContext): proto.InlineValueContext;

	asCommand(item: code.Command): proto.Command;

	asCodeLens(item: code.CodeLens): proto.CodeLens;

	asFormattingOptions(options: code.FormattingOptions, fileOptions: FileFormattingOptions): proto.FormattingOptions;

	asDocumentSymbolParams(textDocument: code.TextDocument): proto.DocumentSymbolParams;

	asCodeLensParams(textDocument: code.TextDocument): proto.CodeLensParams;

	asDocumentLink(item: code.DocumentLink): proto.DocumentLink;

	asDocumentLinkParams(textDocument: code.TextDocument): proto.DocumentLinkParams;

	asCallHierarchyItem(value: code.CallHierarchyItem): proto.CallHierarchyItem;

	asTypeHierarchyItem(value: code.TypeHierarchyItem): proto.TypeHierarchyItem;

	asWorkspaceSymbol(item: code.SymbolInformation): proto.WorkspaceSymbol;

	asInlayHint(value: code.InlayHint): proto.Proposed.InlayHint;
}

export interface URIConverter {
	(value: code.Uri): string;
}

export function createConverter(uriConverter?: URIConverter): Converter {

	const nullConverter = (value: code.Uri) => value.toString();

	const _uriConverter: URIConverter = uriConverter || nullConverter;

	function asUri(value: code.Uri): string {
		return _uriConverter(value);
	}

	function asTextDocumentIdentifier(textDocument: code.TextDocument): proto.TextDocumentIdentifier {
		return {
			uri: _uriConverter(textDocument.uri)
		};
	}

	function asTextDocumentItem(textDocument: code.TextDocument): proto.TextDocumentItem {
		return {
			uri: _uriConverter(textDocument.uri),
			languageId: textDocument.languageId,
			version: textDocument.version,
			text: textDocument.getText()
		};
	}

	function asVersionedTextDocumentIdentifier(textDocument: code.TextDocument): proto.VersionedTextDocumentIdentifier {
		return {
			uri: _uriConverter(textDocument.uri),
			version: textDocument.version
		};
	}

	function asOpenTextDocumentParams(textDocument: code.TextDocument): proto.DidOpenTextDocumentParams {
		return {
			textDocument: asTextDocumentItem(textDocument)
		};
	}

	function isTextDocumentChangeEvent(value: any): value is code.TextDocumentChangeEvent {
		let candidate = <code.TextDocumentChangeEvent>value;
		return !!candidate.document && !!candidate.contentChanges;
	}

	function isTextDocument(value: any): value is code.TextDocument {
		let candidate = <code.TextDocument>value;
		return !!candidate.uri && !!candidate.version;
	}

	function asChangeTextDocumentParams(textDocument: code.TextDocument): proto.DidChangeTextDocumentParams;
	function asChangeTextDocumentParams(event: code.TextDocumentChangeEvent): proto.DidChangeTextDocumentParams;
	function asChangeTextDocumentParams(arg: code.TextDocumentChangeEvent | code.TextDocument): proto.DidChangeTextDocumentParams {
		if (isTextDocument(arg)) {
			let result: proto.DidChangeTextDocumentParams = {
				textDocument: {
					uri: _uriConverter(arg.uri),
					version: arg.version
				},
				contentChanges: [{ text: arg.getText() }]
			};
			return result;
		} else if (isTextDocumentChangeEvent(arg)) {
			let document = arg.document;
			let result: proto.DidChangeTextDocumentParams = {
				textDocument: {
					uri: _uriConverter(document.uri),
					version: document.version
				},
				contentChanges: arg.contentChanges.map((change): proto.TextDocumentContentChangeEvent => {
					let range = change.range;
					return {
						range: {
							start: { line: range.start.line, character: range.start.character },
							end: { line: range.end.line, character: range.end.character }
						},
						rangeLength: change.rangeLength,
						text: change.text
					};
				})
			};
			return result;
		} else {
			throw Error('Unsupported text document change parameter');
		}
	}

	function asCloseTextDocumentParams(textDocument: code.TextDocument): proto.DidCloseTextDocumentParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument)
		};
	}

	function asSaveTextDocumentParams(textDocument: code.TextDocument, includeContent: boolean = false): proto.DidSaveTextDocumentParams {
		let result: proto.DidSaveTextDocumentParams = {
			textDocument: asTextDocumentIdentifier(textDocument)
		};
		if (includeContent) {
			result.text = textDocument.getText();
		}
		return result;
	}

	function asTextDocumentSaveReason(reason: code.TextDocumentSaveReason): 1 | 2 | 3 {
		switch (reason) {
			case code.TextDocumentSaveReason.Manual:
				return proto.TextDocumentSaveReason.Manual;
			case code.TextDocumentSaveReason.AfterDelay:
				return proto.TextDocumentSaveReason.AfterDelay;
			case code.TextDocumentSaveReason.FocusOut:
				return proto.TextDocumentSaveReason.FocusOut;
		}
		return proto.TextDocumentSaveReason.Manual;
	}

	function asWillSaveTextDocumentParams(event: code.TextDocumentWillSaveEvent): proto.WillSaveTextDocumentParams {
		return {
			textDocument: asTextDocumentIdentifier(event.document),
			reason: asTextDocumentSaveReason(event.reason)
		};
	}

	function asDidCreateFilesParams(event: code.FileCreateEvent): proto.CreateFilesParams {
		return {
			files: event.files.map((fileUri) => ({
				uri: _uriConverter(fileUri),
			})),
		};
	}

	function asDidRenameFilesParams(event: code.FileRenameEvent): proto.RenameFilesParams {
		return {
			files: event.files.map((file) => ({
				oldUri: _uriConverter(file.oldUri),
				newUri: _uriConverter(file.newUri),
			})),
		};
	}

	function asDidDeleteFilesParams(event: code.FileDeleteEvent): proto.DeleteFilesParams {
		return {
			files: event.files.map((fileUri) => ({
				uri: _uriConverter(fileUri),
			})),
		};
	}

	function asWillCreateFilesParams(event: code.FileWillCreateEvent): proto.CreateFilesParams {
		return {
			files: event.files.map((fileUri) => ({
				uri: _uriConverter(fileUri),
			})),
		};
	}

	function asWillRenameFilesParams(event: code.FileWillRenameEvent): proto.RenameFilesParams {
		return {
			files: event.files.map((file) => ({
				oldUri: _uriConverter(file.oldUri),
				newUri: _uriConverter(file.newUri),
			})),
		};
	}

	function asWillDeleteFilesParams(event: code.FileWillDeleteEvent): proto.DeleteFilesParams {
		return {
			files: event.files.map((fileUri) => ({
				uri: _uriConverter(fileUri),
			})),
		};
	}

	function asTextDocumentPositionParams(textDocument: code.TextDocument, position: code.Position): proto.TextDocumentPositionParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument),
			position: asWorkerPosition(position)
		};
	}

	function asCompletionTriggerKind(triggerKind: code.CompletionTriggerKind): proto.CompletionTriggerKind {
		switch(triggerKind) {
			case code.CompletionTriggerKind.TriggerCharacter:
				return proto.CompletionTriggerKind.TriggerCharacter;
			case code.CompletionTriggerKind.TriggerForIncompleteCompletions:
				return proto.CompletionTriggerKind.TriggerForIncompleteCompletions;
			default:
				return proto.CompletionTriggerKind.Invoked;
		}
	}

	function asCompletionParams(textDocument: code.TextDocument, position: code.Position, context: code.CompletionContext): proto.CompletionParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument),
			position: asWorkerPosition(position),
			context: {
				triggerKind: asCompletionTriggerKind(context.triggerKind),
				triggerCharacter: context.triggerCharacter
			}
		};
	}

	function asSignatureHelpTriggerKind(triggerKind: code.SignatureHelpTriggerKind): proto.SignatureHelpTriggerKind {
		switch (triggerKind) {
			case code.SignatureHelpTriggerKind.Invoke:
				return proto.SignatureHelpTriggerKind.Invoked;
			case code.SignatureHelpTriggerKind.TriggerCharacter:
				return proto.SignatureHelpTriggerKind.TriggerCharacter;
			case code.SignatureHelpTriggerKind.ContentChange:
				return proto.SignatureHelpTriggerKind.ContentChange;
		}
	}

	function asParameterInformation(value: code.ParameterInformation): proto.ParameterInformation {
		// We leave the documentation out on purpose since it usually adds no
		// value for the server.
		return {
			label: value.label
		};
	}

	function asParameterInformations(values: code.ParameterInformation[]): proto.ParameterInformation[] {
		return values.map(asParameterInformation);
	}

	function asSignatureInformation(value: code.SignatureInformation): proto.SignatureInformation {
		// We leave the documentation out on purpose since it usually adds no
		// value for the server.
		return {
			label: value.label,
			parameters: asParameterInformations(value.parameters)
		};
	}

	function asSignatureInformations(values: code.SignatureInformation[]): proto.SignatureInformation[] {
		return values.map(asSignatureInformation);
	}

	function asSignatureHelp(value: code.SignatureHelp | undefined): proto.SignatureHelp | undefined {
		if (value === undefined) {
			return value;
		}
		return {
			signatures: asSignatureInformations(value.signatures),
			activeSignature: value.activeSignature,
			activeParameter: value.activeParameter
		};
	}

	function asSignatureHelpParams(textDocument: code.TextDocument, position: code.Position, context: code.SignatureHelpContext): proto.SignatureHelpParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument),
			position: asWorkerPosition(position),
			context: {
				isRetrigger: context.isRetrigger,
				triggerCharacter: context.triggerCharacter,
				triggerKind: asSignatureHelpTriggerKind(context.triggerKind),
				activeSignatureHelp: asSignatureHelp(context.activeSignatureHelp)
			}
		};
	}

	function asWorkerPosition(position: code.Position): proto.Position {
		return { line: position.line, character: position.character };
	}

	function asPosition(value: null): null;
	function asPosition(value: undefined): undefined;
	function asPosition(value: code.Position): proto.Position;
	function asPosition(value: code.Position | undefined | null): proto.Position | undefined | null;
	function asPosition(value: code.Position | undefined | null): proto.Position | undefined | null {
		if (value === undefined || value === null) {
			return value;
		}
		return { line: value.line > proto.uinteger.MAX_VALUE ? proto.uinteger.MAX_VALUE : value.line, character: value.character > proto.uinteger.MAX_VALUE ? proto.uinteger.MAX_VALUE : value.character };
	}

	function asPositions(value: code.Position[], token?: code.CancellationToken): Promise<proto.Position[]> {
		return async.map(value, (asPosition as (item: code.Position) => proto.Position), token);
	}

	function asRange(value: code.Range): proto.Range;
	function asRange(value: undefined): undefined;
	function asRange(value: null): null;
	function asRange(value: code.Range | undefined | null): proto.Range | undefined | null;
	function asRange(value: code.Range | undefined | null): proto.Range | undefined | null {
		if (value === undefined || value === null) {
			return value;
		}
		return { start: asPosition(value.start), end: asPosition(value.end) };
	}

	function asLocation(value: code.Location): proto.Location;
	function asLocation(value: undefined): undefined;
	function asLocation(value: null): null;
	function asLocation(value: code.Location | undefined | null): proto.Location | undefined | null {
		if (value === undefined || value === null) {
			return value;
		}
		return proto.Location.create(asUri(value.uri), asRange(value.range));
	}

	function asDiagnosticSeverity(value: code.DiagnosticSeverity): proto.DiagnosticSeverity {
		switch (value) {
			case code.DiagnosticSeverity.Error:
				return proto.DiagnosticSeverity.Error;
			case code.DiagnosticSeverity.Warning:
				return proto.DiagnosticSeverity.Warning;
			case code.DiagnosticSeverity.Information:
				return proto.DiagnosticSeverity.Information;
			case code.DiagnosticSeverity.Hint:
				return proto.DiagnosticSeverity.Hint;
		}
	}

	function asDiagnosticTags(tags: undefined | null): undefined;
	function asDiagnosticTags(tags: code.DiagnosticTag[]): proto.DiagnosticTag[];
	function asDiagnosticTags(tags: code.DiagnosticTag[] | undefined | null): proto.DiagnosticTag[] | undefined;
	function asDiagnosticTags(tags: code.DiagnosticTag[] | undefined | null): proto.DiagnosticTag[] | undefined {
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

	function asDiagnosticTag(tag: code.DiagnosticTag): proto.DiagnosticTag | undefined {
		switch (tag) {
			case code.DiagnosticTag.Unnecessary:
				return proto.DiagnosticTag.Unnecessary;
			case code.DiagnosticTag.Deprecated:
				return proto.DiagnosticTag.Deprecated;
			default:
				return undefined;
		}
	}

	function asRelatedInformation(item: code.DiagnosticRelatedInformation): proto.DiagnosticRelatedInformation {
		return {
			message: item.message,
			location: asLocation(item.location)
		};
	}

	function asRelatedInformations(items: code.DiagnosticRelatedInformation[]): proto.DiagnosticRelatedInformation[] {
		return items.map(asRelatedInformation);
	}

	function asDiagnosticCode(value: number | string | { value: string | number; target: code.Uri } | undefined | null): number | string | DiagnosticCode | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		if (Is.number(value) || Is.string(value)) {
			return value;
		}
		return { value: value.value, target: asUri(value.target) };
	}

	function asDiagnostic(item: code.Diagnostic): proto.Diagnostic {
		const result: proto.Diagnostic = proto.Diagnostic.create(asRange(item.range), item.message);
		const protocolDiagnostic: ProtocolDiagnostic | undefined = item instanceof ProtocolDiagnostic ? item : undefined;
		if (protocolDiagnostic !== undefined && protocolDiagnostic.data !== undefined) {
			result.data = protocolDiagnostic.data;
		}
		const code = asDiagnosticCode(item.code);
		if (DiagnosticCode.is(code)) {
			if (protocolDiagnostic !== undefined && protocolDiagnostic.hasDiagnosticCode) {
				(result.code as unknown as DiagnosticCode) = code;
			} else {
				result.code = code.value;
				result.codeDescription =  { href: code.target };
			}
		} else {
			result.code = code;
		}
		if (Is.number(item.severity)) { result.severity = asDiagnosticSeverity(item.severity); }
		if (Array.isArray(item.tags)) { result.tags = asDiagnosticTags(item.tags); }
		if (item.relatedInformation) { result.relatedInformation = asRelatedInformations(item.relatedInformation); }
		if (item.source) { result.source = item.source; }
		return result;
	}

	function asDiagnostics(items: ReadonlyArray<code.Diagnostic>, token?: code.CancellationToken): Promise<proto.Diagnostic[]> {
		if (items === undefined || items === null) {
			return items;
		}
		return async.map(items, asDiagnostic, token);
	}

	function asDocumentation(format: string, documentation: string | code.MarkdownString): string | proto.MarkupContent {
		switch (format) {
			case '$string':
				return documentation as string;
			case proto.MarkupKind.PlainText:
				return { kind: format, value: documentation as string };
			case proto.MarkupKind.Markdown:
				return { kind: format, value: (documentation as code.MarkdownString).value };
			default:
				return `Unsupported Markup content received. Kind is: ${format}`;
		}
	}

	function asCompletionItemTag(tag: code.CompletionItemTag): proto.CompletionItemTag | undefined {
		switch (tag) {
			case code.CompletionItemTag.Deprecated:
				return proto.CompletionItemTag.Deprecated;
		}
		return undefined;
	}

	function asCompletionItemTags(tags: ReadonlyArray<code.CompletionItemTag> | undefined): proto.CompletionItemTag[] | undefined {
		if (tags === undefined) {
			return tags;
		}
		const result: proto.CompletionItemTag[] = [];
		for (let tag of tags) {
			const converted = asCompletionItemTag(tag);
			if (converted !== undefined) {
				result.push(converted);
			}
		}
		return result;
	}

	function asCompletionItemKind(value: code.CompletionItemKind, original: proto.CompletionItemKind | undefined): proto.CompletionItemKind {
		if (original !== undefined) {
			return original;
		}
		return value + 1 as proto.CompletionItemKind;
	}

	function asCompletionItem(item: code.CompletionItem, labelDetailsSupport: boolean = false): proto.CompletionItem {
		let label: string;
		let labelDetails: proto.CompletionItemLabelDetails | undefined;
		if (Is.string(item.label)) {
			label = item.label;
		} else {
			label = item.label.label;
			if (labelDetailsSupport && (item.label.detail !== undefined || item.label.description !== undefined)) {
				labelDetails = { detail: item.label.detail, description: item.label.description };
			}
		}
		let result: proto.CompletionItem = { label: label };
		if (labelDetails !== undefined) {
			result.labelDetails = labelDetails;
		}
		let protocolItem = item instanceof ProtocolCompletionItem ? item as ProtocolCompletionItem : undefined;
		if (item.detail) { result.detail = item.detail; }
		// We only send items back we created. So this can't be something else than
		// a string right now.
		if (item.documentation) {
			if (!protocolItem || protocolItem.documentationFormat === '$string') {
				result.documentation = item.documentation as string;
			} else {
				result.documentation = asDocumentation(protocolItem.documentationFormat!, item.documentation);
			}
		}
		if (item.filterText) { result.filterText = item.filterText; }
		fillPrimaryInsertText(result, item as ProtocolCompletionItem);
		if (Is.number(item.kind)) {
			result.kind = asCompletionItemKind(item.kind, protocolItem && protocolItem.originalItemKind);
		}
		if (item.sortText) { result.sortText = item.sortText; }
		if (item.additionalTextEdits) { result.additionalTextEdits = asTextEdits(item.additionalTextEdits); }
		if (item.commitCharacters) { result.commitCharacters = item.commitCharacters.slice(); }
		if (item.command) { result.command = asCommand(item.command); }
		if (item.preselect === true || item.preselect === false) { result.preselect = item.preselect; }
		const tags = asCompletionItemTags(item.tags);
		if (protocolItem) {
			if (protocolItem.data !== undefined) {
				result.data = protocolItem.data;
			}
			if (protocolItem.deprecated === true || protocolItem.deprecated === false) {
				if (protocolItem.deprecated === true && tags !== undefined && tags.length > 0) {
					const index = tags.indexOf(code.CompletionItemTag.Deprecated);
					if (index !== -1) {
						tags.splice(index, 1);
					}
				}
				result.deprecated = protocolItem.deprecated;
			}
			if (protocolItem.insertTextMode !== undefined) {
				result.insertTextMode = protocolItem.insertTextMode;
			}
		}
		if (tags !== undefined && tags.length > 0) {
			result.tags = tags;
		}
		if (result.insertTextMode === undefined && item.keepWhitespace === true) {
			result.insertTextMode = proto.InsertTextMode.adjustIndentation;
		}
		return result;
	}

	function fillPrimaryInsertText(target: proto.CompletionItem, source: ProtocolCompletionItem): void {
		let format: proto.InsertTextFormat = proto.InsertTextFormat.PlainText;
		let text: string | undefined = undefined;
		let range: code.Range | InsertReplaceRange | undefined = undefined;
		if (source.textEdit) {
			text = source.textEdit.newText;
			range = source.textEdit.range;
		} else if (source.insertText instanceof code.SnippetString) {
			format = proto.InsertTextFormat.Snippet;
			text = source.insertText.value;
		} else {
			text = source.insertText;
		}
		if (source.range) {
			range = source.range;
		}

		target.insertTextFormat = format;
		if (source.fromEdit && text !== undefined && range !== undefined) {
			target.textEdit = asCompletionTextEdit(text, range);
		} else {
			target.insertText = text;
		}
	}

	function asCompletionTextEdit(newText: string, range: code.Range | InsertReplaceRange): proto.TextEdit | proto.InsertReplaceEdit {
		if (InsertReplaceRange.is(range)) {
			return proto.InsertReplaceEdit.create(newText, asRange(range.inserting), asRange(range.replacing));
		} else {
			return { newText, range: asRange(range) };
		}
	}

	function asTextEdit(edit: code.TextEdit): proto.TextEdit {
		return { range: asRange(edit.range), newText: edit.newText };
	}

	function asTextEdits(edits: code.TextEdit[]): proto.TextEdit[] {
		if (edits === undefined || edits === null) {
			return edits;
		}
		return edits.map(asTextEdit);
	}

	function asSymbolKind(item: code.SymbolKind): proto.SymbolKind {
		if (item <= code.SymbolKind.TypeParameter) {
			// Symbol kind is one based in the protocol and zero based in code.
			return (item + 1) as proto.SymbolKind;
		}
		return proto.SymbolKind.Property;
	}

	function asSymbolTag(item: code.SymbolTag): proto.SymbolTag {
		return item as proto.SymbolTag;
	}

	function asSymbolTags(items: ReadonlyArray<code.SymbolTag>): proto.SymbolTag[] {
		return items.map(asSymbolTag);
	}

	function asReferenceParams(textDocument: code.TextDocument, position: code.Position, options: { includeDeclaration: boolean }): proto.ReferenceParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument),
			position: asWorkerPosition(position),
			context: { includeDeclaration: options.includeDeclaration }
		};
	}

	async function asCodeAction(item: code.CodeAction, token?: code.CancellationToken): Promise<proto.CodeAction> {
		let result = proto.CodeAction.create(item.title);
		if (item instanceof ProtocolCodeAction && item.data !== undefined) {
			result.data = item.data;
		}
		if (item.kind !== undefined) { result.kind = asCodeActionKind(item.kind); }
		if (item.diagnostics !== undefined) { result.diagnostics = await asDiagnostics(item.diagnostics, token); }
		if (item.edit !== undefined) { throw new Error (`VS Code code actions can only be converted to a protocol code action without an edit.`); }
		if (item.command !== undefined) { result.command = asCommand(item.command); }
		if (item.isPreferred !== undefined) { result.isPreferred = item.isPreferred; }
		if (item.disabled !== undefined) { result.disabled = { reason: item.disabled.reason }; }
		return result;
	}

	async function asCodeActionContext(context: code.CodeActionContext, token?: code.CancellationToken): Promise<proto.CodeActionContext> {
		if (context === undefined || context === null) {
			return context;
		}
		let only: proto.CodeActionKind[] | undefined;
		if (context.only && Is.string(context.only.value)) {
			only = [context.only.value];
		}
		return proto.CodeActionContext.create(await asDiagnostics(context.diagnostics, token), only, asCodeActionTriggerKind(context.triggerKind));
	}

	function asCodeActionTriggerKind(kind: code.CodeActionTriggerKind): proto.CodeActionTriggerKind | undefined {
		switch (kind) {
			case code.CodeActionTriggerKind.Invoke:
				return proto.CodeActionTriggerKind.Invoked;
			case code.CodeActionTriggerKind.Automatic:
				return proto.CodeActionTriggerKind.Automatic;
			default:
				return undefined;
		}
	}

	function asCodeActionKind(item: code.CodeActionKind | null | undefined): proto.CodeActionKind | undefined {
		if (item === undefined || item === null) {
			return undefined;
		}
		return item.value;
	}

	function asInlineValueContext(context: code.InlineValueContext): proto.InlineValueContext {
		if (context === undefined || context === null) {
			return context;
		}
		return proto.InlineValueContext.create(context.stoppedLocation);
	}

	function asCommand(item: code.Command): proto.Command {
		let result = proto.Command.create(item.title, item.command);
		if (item.arguments) { result.arguments = item.arguments; }
		return result;
	}

	function asCodeLens(item: code.CodeLens): proto.CodeLens {
		let result = proto.CodeLens.create(asRange(item.range));
		if (item.command) { result.command = asCommand(item.command); }
		if (item instanceof ProtocolCodeLens) {
			if (item.data) { result.data = item.data; }
		}
		return result;
	}

	function asFormattingOptions(options: code.FormattingOptions, fileOptions: FileFormattingOptions): proto.FormattingOptions {
		const result: proto.FormattingOptions = { tabSize: options.tabSize, insertSpaces: options.insertSpaces };
		if (fileOptions.trimTrailingWhitespace) {
			result.trimTrailingWhitespace = true;
		}
		if (fileOptions.trimFinalNewlines) {
			result.trimFinalNewlines = true;
		}
		if (fileOptions.insertFinalNewline) {
			result.insertFinalNewline = true;
		}
		return result;
	}

	function asDocumentSymbolParams(textDocument: code.TextDocument): proto.DocumentSymbolParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument)
		};
	}

	function asCodeLensParams(textDocument: code.TextDocument): proto.CodeLensParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument)
		};
	}

	function asDocumentLink(item: code.DocumentLink): proto.DocumentLink {
		let result = proto.DocumentLink.create(asRange(item.range));
		if (item.target) { result.target = asUri(item.target); }
		if (item.tooltip !== undefined) { result.tooltip = item.tooltip; }
		let protocolItem = item instanceof ProtocolDocumentLink ? item as ProtocolDocumentLink : undefined;
		if (protocolItem && protocolItem.data) {
			result.data = protocolItem.data;
		}
		return result;
	}

	function asDocumentLinkParams(textDocument: code.TextDocument): proto.DocumentLinkParams {
		return {
			textDocument: asTextDocumentIdentifier(textDocument)
		};
	}

	function asCallHierarchyItem(value: code.CallHierarchyItem): proto.CallHierarchyItem {
		const result: proto.CallHierarchyItem = {
			name: value.name,
			kind: asSymbolKind(value.kind),
			uri: asUri(value.uri),
			range: asRange(value.range),
			selectionRange: asRange(value.selectionRange)
		};
		if (value.detail !== undefined && value.detail.length > 0) { result.detail = value.detail; }
		if (value.tags !== undefined) { result.tags = asSymbolTags(value.tags); }
		if (value instanceof ProtocolCallHierarchyItem && value.data !== undefined) {
			result.data = value.data;
		}
		return result;
	}

	function asTypeHierarchyItem(value: code.TypeHierarchyItem): proto.TypeHierarchyItem {
		const result: proto.TypeHierarchyItem = {
			name: value.name,
			kind: asSymbolKind(value.kind),
			uri: asUri(value.uri),
			range: asRange(value.range),
			selectionRange: asRange(value.selectionRange),
		};
		if (value.detail !== undefined && value.detail.length > 0) { result.detail = value.detail; }
		if (value.tags !== undefined) { result.tags = asSymbolTags(value.tags); }
		if (value instanceof ProtocolTypeHierarchyItem && value.data !== undefined) {
			result.data = value.data;
		}
		return result;
	}

	function asWorkspaceSymbol(item: code.SymbolInformation): proto.WorkspaceSymbol {
		const result: proto.WorkspaceSymbol = item instanceof WorkspaceSymbol
			? { name: item.name, kind: asSymbolKind(item.kind), location: item.hasRange ? asLocation(item.location) : { uri: _uriConverter(item.location.uri) }, data: item.data }
			: { name: item.name, kind: asSymbolKind(item.kind), location: asLocation(item.location) };
		if (item.tags !== undefined) { result.tags = asSymbolTags(item.tags); }
		if (item.containerName !== '') { result.containerName = item.containerName; }
		return result;
	}

	function asInlayHint(item: code.InlayHint): proto.Proposed.InlayHint {
		const label = typeof item.label === 'string'
			? item.label
			: item.label.map(asInlayHintLabelPart);
		const result = proto.Proposed.InlayHint.create(asPosition(item.position), label);
		if (item.kind !== undefined) { result.kind = item.kind; }
		if (item.textEdits !== undefined) { result.textEdits = asTextEdits(item.textEdits); }
		if (item.tooltip !== undefined) { result.tooltip = asTooltip(item.tooltip); }
		if (item.paddingLeft !== undefined) { result.paddingLeft = item.paddingLeft; }
		if (item.paddingRight !== undefined) { result.paddingRight = item.paddingRight; }
		return result;
	}

	function asInlayHintLabelPart(item: code.InlayHintLabelPart): proto.Proposed.InlayHintLabelPart {
		const result = proto.Proposed.InlayHintLabelPart.create(item.value);
		if (item.location !== undefined) { result.location = asLocation(item.location); }
		if (item.command !== undefined) { result.command = asCommand(item.command); }
		if (item.tooltip !== undefined) { result.tooltip = asTooltip(item.tooltip); }
		return result;
	}

	function asTooltip(value: string | code.MarkdownString): string | proto.MarkupContent {
		if (typeof value === 'string') {
			return value;
		}
		const result: proto.MarkupContent = {
			kind: proto.MarkupKind.Markdown,
			value: value.value
		};
		return result;
	}

	return {
		asUri,
		asTextDocumentIdentifier,
		asTextDocumentItem,
		asVersionedTextDocumentIdentifier,
		asOpenTextDocumentParams,
		asChangeTextDocumentParams,
		asCloseTextDocumentParams,
		asSaveTextDocumentParams,
		asWillSaveTextDocumentParams,
		asDidCreateFilesParams,
		asDidRenameFilesParams,
		asDidDeleteFilesParams,
		asWillCreateFilesParams,
		asWillRenameFilesParams,
		asWillDeleteFilesParams,
		asTextDocumentPositionParams,
		asCompletionParams,
		asSignatureHelpParams,
		asWorkerPosition,
		asRange,
		asPosition,
		asPositions,
		asLocation,
		asDiagnosticSeverity,
		asDiagnosticTag,
		asDiagnostic,
		asDiagnostics,
		asCompletionItem,
		asTextEdit,
		asSymbolKind,
		asSymbolTag,
		asSymbolTags,
		asReferenceParams,
		asCodeAction,
		asCodeActionContext,
		asInlineValueContext,
		asCommand,
		asCodeLens,
		asFormattingOptions,
		asDocumentSymbolParams,
		asCodeLensParams,
		asDocumentLink,
		asDocumentLinkParams,
		asCallHierarchyItem,
		asTypeHierarchyItem,
		asInlayHint,
		asWorkspaceSymbol
	};
}
