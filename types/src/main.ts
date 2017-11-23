
/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

/**
 * Position in a text document expressed as zero-based line and character offset.
 * The offsets are based on a UTF-16 string representation. So a string of the form
 * `a𐐀b` the character offset of the character `a` is 0, the character offset of `𐐀`
 * is 1 and the character offset of b is 3 since `𐐀` is represented using two code
 * units in UTF-16.
 *
 * Positions are line end character agnostic. So you can not specifiy a position that
 * denotes `\r|\n` or `\n|` where `|` represents the character offset.
 */
export interface Position {
	/**
	 * Line position in a document (zero-based).
	 */
	line: number;

	/**
	 * Character offset on a line in a document (zero-based). Assuming that the line is
	 * represented as a string, the `character` value represents the gap between the
	 * `character` and `character + 1`.
	 *
	 * If the character value is greater than the line length it defaults back to the
	 * line length.
	 */
	character: number;
}

/**
 * The Position namespace provides helper functions to work with
 * [Position](#Position) literals.
 */
export namespace Position {
	/**
	 * Creates a new Position literal from the given line and character.
	 * @param line The position's line.
	 * @param character The position's character.
	 */
	export function create(line: number, character: number): Position {
		return { line, character };
	}
	/**
	 * Checks whether the given liternal conforms to the [Position](#Position) interface.
	 */
	export function is(value: any): value is Position {
		let candidate = value as Position;
		return Is.defined(candidate) && Is.number(candidate.line) && Is.number(candidate.character);
	}
}

/**
 * A range in a text document expressed as (zero-based) start and end positions.
 *
 * If you want to specify a range that contains a line including the line ending
 * caharacter(s) then use an end poosition denoting the start of the next line.
 * For example:
 * ```ts
 * {
 *     start: { line: 5, character: 23 }
 *     end : { line 6, character : 0 }
 * }
 * ```
 */
export interface Range {
	/**
	 * The range's start position
	 */
	start: Position;

	/**
	 * The range's end position
	 */
	end: Position;
}

/**
 * The Range namespace provides helper functions to work with
 * [Range](#Range) literals.
 */
export namespace Range {
	/**
	 * Create a new Range liternal.
	 * @param start The range's start position.
	 * @param end The range's end position.
	 */
	export function create(start: Position, end: Position): Range;
	/**
	 * Create a new Range liternal.
	 * @param startLine The start line number.
	 * @param startCharacter The start character.
	 * @param endLine The end line number.
	 * @param endCharacter The end character.
	 */
	export function create(startLine: number, startCharacter: number, endLine: number, endCharacter: number): Range;
	export function create(one: Position | number, two: Position | number, three?: number, four?: number): Range {
		if (Is.number(one) && Is.number(two) && Is.number(three) && Is.number(four)) {
			return { start: Position.create(one, two), end: Position.create(three, four) };
		} else if (Position.is(one) && Position.is(two)) {
			return { start: one, end: two };
		} else {
			throw new Error(`Range#create called with invalid arguments[${one}, ${two}, ${three}, ${four}]`);
		}
	}
	/**
	 * Checks whether the given literal conforms to the [Range](#Range) interface.
	 */
	export function is(value: any): value is Range {
		let candidate = value as Range;
		return Is.defined(candidate) && Position.is(candidate.start) && Position.is(candidate.end);
	}
}

/**
 * Represents a location inside a resource, such as a line
 * inside a text file.
 */
export interface Location {
	uri: string;
	range: Range;
}

/**
 * The Location namespace provides helper functions to work with
 * [Location](#Location) literals.
 */
export namespace Location {
	/**
	 * Creates a Location literal.
	 * @param uri The location's uri.
	 * @param range The location's range.
	 */
	export function create(uri: string, range: Range): Location {
		return { uri, range };
	}
	/**
	 * Checks whether the given literal conforms to the [Location](#Location) interface.
	 */
	export function is(value: any): value is Location {
		let candidate = value as Location;
		return Is.defined(candidate) && Range.is(candidate.range) && (Is.string(candidate.uri) || Is.undefined(candidate.uri));
	}
}

/**
 * The diagnostic's serverity.
 */
export namespace DiagnosticSeverity {
	/**
	 * Reports an error.
	 */
	export const Error: 1 = 1;
	/**
	 * Reports a warning.
	 */
	export const Warning: 2 = 2;
	/**
	 * Reports an information.
	 */
	export const Information: 3 = 3;
	/**
	 * Reports a hint.
	 */
	export const Hint: 4 = 4;
}

export type DiagnosticSeverity = 1 | 2 | 3 | 4;

/**
 * Represents a diagnostic, such as a compiler error or warning. Diagnostic objects
 * are only valid in the scope of a resource.
 */
export interface Diagnostic {
	/**
	 * The range at which the message applies
	 */
	range: Range;

	/**
	 * The diagnostic's severity. Can be omitted. If omitted it is up to the
	 * client to interpret diagnostics as error, warning, info or hint.
	 */
	severity?: DiagnosticSeverity;

	/**
	 * The diagnostic's code. Can be omitted.
	 */
	code?: number | string;

	/**
	 * A human-readable string describing the source of this
	 * diagnostic, e.g. 'typescript' or 'super lint'.
	 */
	source?: string;

	/**
	 * The diagnostic's message.
	 */
	message: string;
}

/**
 * The Diagnostic namespace provides helper functions to work with
 * [Diagnostic](#Diagnostic) literals.
 */
export namespace Diagnostic {
	/**
	 * Creates a new Diagnostic literal.
	 */
	export function create(range: Range, message: string, severity?: DiagnosticSeverity, code?: number | string, source?: string): Diagnostic {
		let result: Diagnostic = { range, message };
		if (Is.defined(severity)) {
			result.severity = severity;
		}
		if (Is.defined(code)) {
			result.code = code;
		}
		if (Is.defined(source)) {
			result.source = source;
		}
		return result;
	}
	/**
	 * Checks whether the given literal conforms to the [Diagnostic](#Diagnostic) interface.
	 */
	export function is(value: any): value is Diagnostic {
		let candidate = value as Diagnostic;
		return Is.defined(candidate)
			&& Range.is(candidate.range)
			&& Is.string(candidate.message)
			&& (Is.number(candidate.severity) || Is.undefined(candidate.severity))
			&& (Is.number(candidate.code) || Is.string(candidate.code) || Is.undefined(candidate.code))
			&& (Is.string(candidate.source) || Is.undefined(candidate.source));
	}
}


/**
 * Represents a reference to a command. Provides a title which
 * will be used to represent a command in the UI and, optionally,
 * an array of arguments which will be passed to the command handler
 * function when invoked.
 */
export interface Command {
	/**
	 * Title of the command, like `save`.
	 */
	title: string;
	/**
	 * The identifier of the actual command handler.
	 */
	command: string;
	/**
	 * Arguments that the command handler should be
	 * invoked with.
	 */
	arguments?: any[];
}


/**
 * The Command namespace provides helper functions to work with
 * [Command](#Command) literals.
 */
export namespace Command {
	/**
	 * Creates a new Command literal.
	 */
	export function create(title: string, command: string, ...args: any[]): Command {
		let result: Command = { title, command };
		if (Is.defined(args) && args.length > 0) {
			result.arguments = args;
		}
		return result;
	}
	/**
	 * Checks whether the given literal conforms to the [Command](#Command) interface.
	 */
	export function is(value: any): value is Command {
		let candidate = value as Command;
		return Is.defined(candidate) && Is.string(candidate.title) && Is.string(candidate.title);
	}
}

/**
 * A text edit applicable to a text document.
 */
export interface TextEdit {
	/**
	 * The range of the text document to be manipulated. To insert
	 * text into a document create a range where start === end.
	 */
	range: Range;

	/**
	 * The string to be inserted. For delete operations use an
	 * empty string.
	 */
	newText: string;
}

/**
 * The TextEdit namespace provides helper function to create replace,
 * insert and delete edits more easily.
 */
export namespace TextEdit {
	/**
	 * Creates a replace text edit.
	 * @param range The range of text to be replaced.
	 * @param newText The new text.
	 */
	export function replace(range: Range, newText: string): TextEdit {
		return { range, newText };
	}
	/**
	 * Creates a insert text edit.
	 * @param psotion The position to insert the text at.
	 * @param newText The text to be inserted.
	 */
	export function insert(position: Position, newText: string): TextEdit {
		return { range: { start: position, end: position }, newText };
	}
	/**
	 * Creates a delete text edit.
	 * @param range The range of text to be deleted.
	 */
	export function del(range: Range): TextEdit {
		return { range, newText: '' };
	}
}


/**
 * Describes textual changes on a text document.
 */
export interface TextDocumentEdit {
	/**
	 * The text document to change.
	 */
	textDocument: VersionedTextDocumentIdentifier;

	/**
	 * The edits to be applied.
	 */
	edits: TextEdit[];
}

/**
 * The TextDocumentEdit namespace provides helper function to create
 * an edit that manipulates a text document.
 */
export namespace TextDocumentEdit {
	/**
	 * Creates a new `TextDocumentEdit`
	 */
	export function create(textDocument: VersionedTextDocumentIdentifier, edits: TextEdit[]): TextDocumentEdit {
		return { textDocument, edits };
	}

	export function is(value: any): value is TextDocumentEdit {
		let candidate = value as TextDocumentEdit;
		return Is.defined(candidate)
			&& VersionedTextDocumentIdentifier.is(candidate.textDocument)
			&& Array.isArray(candidate.edits);
	}
}

/**
 * A workspace edit represents changes to many resources managed in the workspace. The edit
 * should either provide `changes` or `documentChanges`. If documentChanges are present
 * they are preferred over `changes` if the client can handle versioned document edits.
 */
export interface WorkspaceEdit {
	/**
	 * Holds changes to existing resources.
	 */
	changes?: { [uri: string]: TextEdit[]; };

	/**
	 * An array of `TextDocumentEdit`s to express changes to n different text documents
	 * where each text document edit addresses a specific version of a text document.
	 * Whether a client supports versioned document edits is expressed via
	 * `WorkspaceClientCapabilites.workspaceEdit.documentChanges`.
	 */
	documentChanges?: TextDocumentEdit[];
}

/**
 * A change to capture text edits for existing resources.
 */
export interface TextEditChange {
	/**
	 * Gets all text edits for this change.
	 *
	 * @return An array of text edits.
	 */
	all(): TextEdit[];

	/**
	 * Clears the edits for this change.
	 */
	clear(): void;

	/**
	 * Adds a text edit.
	 * @param edit the text edit to add.
	 */
	add(edit: TextEdit): void;

	/**
	 * Insert the given text at the given position.
	 *
	 * @param position A position.
	 * @param newText A string.
	 */
	insert(position: Position, newText: string): void;

	/**
	 * Replace the given range with given text for the given resource.
	 *
	 * @param range A range.
	 * @param newText A string.
	 */
	replace(range: Range, newText: string): void;

	/**
	 * Delete the text at the given range.
	 *
	 * @param range A range.
	 */
	delete(range: Range): void;
}

class TextEditChangeImpl implements TextEditChange {

	private edits: TextEdit[];

	public constructor(edits: TextEdit[]) {
		this.edits = edits;
	}

	public insert(position: Position, newText: string): void {
		this.edits.push(TextEdit.insert(position, newText));
	}

	public replace(range: Range, newText: string): void {
		this.edits.push(TextEdit.replace(range, newText));
	}

	public delete(range: Range): void {
		this.edits.push(TextEdit.del(range));
	}

	public add(edit: TextEdit): void {
		this.edits.push(edit);
	}

	public all(): TextEdit[] {
		return this.edits;
	}

	public clear(): void {
		this.edits.splice(0, this.edits.length);
	}
}

/**
 * A workspace change helps constructing changes to a workspace.
 */
export class WorkspaceChange {
	private _workspaceEdit: WorkspaceEdit;
	private _textEditChanges: { [uri: string]: TextEditChange };

	constructor(workspaceEdit?: WorkspaceEdit) {
		this._textEditChanges = Object.create(null);
		if (workspaceEdit) {
			this._workspaceEdit = workspaceEdit;
			if (workspaceEdit.documentChanges) {
				workspaceEdit.documentChanges.forEach((textDocumentEdit) => {
					let textEditChange = new TextEditChangeImpl(textDocumentEdit.edits);
					this._textEditChanges[textDocumentEdit.textDocument.uri] = textEditChange;
				});
			} else if (workspaceEdit.changes) {
				Object.keys(workspaceEdit.changes).forEach((key) => {
					let textEditChange = new TextEditChangeImpl(workspaceEdit.changes![key]);
					this._textEditChanges[key] = textEditChange;
				});
			}
		}
	}

	/**
	 * Returns the underlying [WorkspaceEdit](#WorkspaceEdit) literal
	 * use to be returned from a workspace edit operation like rename.
	 */
	public get edit(): WorkspaceEdit {
		return this._workspaceEdit;
	}

	/**
	 * Returns the [TextEditChange](#TextEditChange) to manage text edits
	 * for resources.
	 */
	public getTextEditChange(textDocument: VersionedTextDocumentIdentifier): TextEditChange;
	public getTextEditChange(uri: string): TextEditChange;
	public getTextEditChange(key: string | VersionedTextDocumentIdentifier): TextEditChange {
		if (VersionedTextDocumentIdentifier.is(key)) {
			if (!this._workspaceEdit) {
				this._workspaceEdit = {
					documentChanges: []
				};
			}
			if (!this._workspaceEdit.documentChanges) {
				throw new Error('Workspace edit is not configured for versioned document changes.');
			}
			let textDocument: VersionedTextDocumentIdentifier = key;
			let result: TextEditChange = this._textEditChanges[textDocument.uri];
			if (!result) {
				let edits: TextEdit[] = [];
				let textDocumentEdit: TextDocumentEdit = {
					textDocument,
					edits
				};
				this._workspaceEdit.documentChanges.push(textDocumentEdit);
				result = new TextEditChangeImpl(edits);
				this._textEditChanges[textDocument.uri] = result;
			}
			return result;
		} else {
			if (!this._workspaceEdit) {
				this._workspaceEdit = {
					changes: Object.create(null)
				}
			}
			if (!this._workspaceEdit.changes) {
				throw new Error('Workspace edit is not configured for normal text edit changes.');
			}
			let result: TextEditChange = this._textEditChanges[key];
			if (!result) {
				let edits: TextEdit[] = [];
				this._workspaceEdit.changes[key] = edits;
				result = new TextEditChangeImpl(edits);
				this._textEditChanges[key] = result;
			}
			return result;
		}
	}
}

/**
 * A literal to identify a text document in the client.
 */
export interface TextDocumentIdentifier {
	/**
	 * The text document's uri.
	 */
	uri: string;
}

/**
 * The TextDocumentIdentifier namespace provides helper functions to work with
 * [TextDocumentIdentifier](#TextDocumentIdentifier) literals.
 */
export namespace TextDocumentIdentifier {
	/**
	 * Creates a new TextDocumentIdentifier literal.
	 * @param uri The document's uri.
	 */
	export function create(uri: string): TextDocumentIdentifier {
		return { uri };
	}
	/**
	 * Checks whether the given literal conforms to the [TextDocumentIdentifier](#TextDocumentIdentifier) interface.
	 */
	export function is(value: any): value is TextDocumentIdentifier {
		let candidate = value as TextDocumentIdentifier;
		return Is.defined(candidate) && Is.string(candidate.uri);
	}
}

/**
 * An identifier to denote a specific version of a text document.
 */
export interface VersionedTextDocumentIdentifier extends TextDocumentIdentifier {
	/**
	 * The version number of this document.
	 */
	version: number;
}

/**
 * The VersionedTextDocumentIdentifier namespace provides helper functions to work with
 * [VersionedTextDocumentIdentifier](#VersionedTextDocumentIdentifier) literals.
 */
export namespace VersionedTextDocumentIdentifier {
	/**
	 * Creates a new VersionedTextDocumentIdentifier literal.
	 * @param uri The document's uri.
	 * @param uri The document's text.
	 */
	export function create(uri: string, version: number): VersionedTextDocumentIdentifier {
		return { uri, version };
	}

	/**
	 * Checks whether the given literal conforms to the [VersionedTextDocumentIdentifier](#VersionedTextDocumentIdentifier) interface.
	 */
	export function is(value: any): value is VersionedTextDocumentIdentifier {
		let candidate = value as VersionedTextDocumentIdentifier;
		return Is.defined(candidate) && Is.string(candidate.uri) && Is.number(candidate.version);
	}
}


/**
 * An item to transfer a text document from the client to the
 * server.
 */
export interface TextDocumentItem {
	/**
	 * The text document's uri.
	 */
	uri: string;

	/**
	 * The text document's language identifier
	 */
	languageId: string;

	/**
	 * The version number of this document (it will increase after each
	 * change, including undo/redo).
	 */
	version: number;

	/**
	 * The content of the opened text document.
	 */
	text: string;
}

/**
 * The TextDocumentItem namespace provides helper functions to work with
 * [TextDocumentItem](#TextDocumentItem) literals.
 */
export namespace TextDocumentItem {
	/**
	 * Creates a new TextDocumentItem literal.
	 * @param uri The document's uri.
	 * @param languageId The document's language identifier.
	 * @param version The document's version number.
	 * @param text The document's text.
	 */
	export function create(uri: string, languageId: string, version: number, text: string): TextDocumentItem {
		return { uri, languageId, version, text };
	}

	/**
	 * Checks whether the given literal conforms to the [TextDocumentItem](#TextDocumentItem) interface.
	 */
	export function is(value: any): value is TextDocumentItem {
		let candidate = value as TextDocumentItem;
		return Is.defined(candidate) && Is.string(candidate.uri) && Is.string(candidate.languageId) && Is.number(candidate.version) && Is.string(candidate.text);
	}
}

/**
 * A `MarkdownContent` literal represents a string value which content is interpreted as markdown. The string
 * can contain fenced code blocks like in GitHub issues. See https://help.github.com/articles/creating-and-highlighting-code-blocks/#syntax-highlighting
 *
 * Here is an example how such a string can be constructed using JavaScript / TypeScript:
 * ```ts
 * let markdown: MarkdownContent = {
 *	value: [
 *		'# Header',
 *		'Some text',
 *		'```typescript',
 *		'someCode();',
 *		'```'
 *	].join('\n')
 * };
 * ```
 */
export interface MarkdownContent {
	value: string;
}

/**
 * The kind of a completion entry.
 */
export namespace CompletionItemKind {
	export const Text: 1 = 1;
	export const Method: 2 = 2;
	export const Function: 3 = 3;
	export const Constructor: 4 = 4;
	export const Field: 5 = 5;
	export const Variable: 6 = 6;
	export const Class: 7 = 7;
	export const Interface: 8 = 8;
	export const Module: 9 = 9;
	export const Property: 10 = 10;
	export const Unit: 11 = 11;
	export const Value: 12 = 12;
	export const Enum: 13 = 13;
	export const Keyword: 14 = 14;
	export const Snippet: 15 = 15;
	export const Color: 16 = 16;
	export const File: 17 = 17;
	export const Reference: 18 = 18;
}

export type CompletionItemKind = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;


/**
 * Defines whether the insert text in a completion item should be interpreted as
 * plain text or a snippet.
 */
export namespace InsertTextFormat {
	/**
	 * The primary text to be inserted is treated as a plain string.
	 */
	export const PlainText: 1 = 1;

	/**
	 * The primary text to be inserted is treated as a snippet.
	 *
	 * A snippet can define tab stops and placeholders with `$1`, `$2`
	 * and `${3:foo}`. `$0` defines the final tab stop, it defaults to
	 * the end of the snippet. Placeholders with equal identifiers are linked,
	 * that is typing in one will update others too.
	 *
	 * See also: https://github.com/Microsoft/vscode/blob/master/src/vs/editor/contrib/snippet/common/snippet.md
	 */
	export const Snippet: 2 = 2;
}

export type InsertTextFormat = 1 | 2;

/**
 * A completion item represents a text snippet that is
 * proposed to complete text that is being typed.
 */
export interface CompletionItem {

	/**
	 * The label of this completion item. By default
	 * also the text that is inserted when selecting
	 * this completion.
	 */
	label: string;

	/**
	 * The kind of this completion item. Based of the kind
	 * an icon is chosen by the editor.
	 */
	kind?: CompletionItemKind;

	/**
	 * A human-readable string with additional information
	 * about this item, like type or symbol information.
	 */
	detail?: string;

	/**
	 * A human-readable string that represents a doc-comment.
	 */
	documentation?: string | MarkdownContent;

	/**
	 * A string that shoud be used when comparing this item
	 * with other items. When `falsy` the [label](#CompletionItem.label)
	 * is used.
	 */
	sortText?: string;

	/**
	 * A string that should be used when filtering a set of
	 * completion items. When `falsy` the [label](#CompletionItem.label)
	 * is used.
	 */
	filterText?: string;

	/**
	 * A string that should be inserted into a document when selecting
	 * this completion. When `falsy` the [label](#CompletionItem.label)
	 * is used.
	 *
	 * The `insertText` is subject to interpretation by the client side.
	 * Some tools might not take the string literally. For example
	 * VS Code when code complete is requested in this example `con<cursor position>`
	 * and a completion item with an `insertText` of `console` is provided it
	 * will only insert `sole`. Therefore it is recommended to use `textEdit` instead
	 * since it avoids additional client side interpretation.
	 *
	 * @deprecated Use textEdit instead.
	 */
	insertText?: string;

	/**
	 * The format of the insert text. The format applies to both the `insertText` property
	 * and the `newText` property of a provided `textEdit`.
	 */
	insertTextFormat?: InsertTextFormat;

	/**
	 * An [edit](#TextEdit) which is applied to a document when selecting
	 * this completion. When an edit is provided the value of
	 * [insertText](#CompletionItem.insertText) is ignored.
	 *
	 * *Note:* The text edit's range must be a [single line] and it must contain the position
	 * at which completion has been requested.
	 */
	textEdit?: TextEdit;

	/**
	 * An optional array of additional [text edits](#TextEdit) that are applied when
	 * selecting this completion. Edits must not overlap with the main [edit](#CompletionItem.textEdit)
	 * nor with themselves.
	 */
	additionalTextEdits?: TextEdit[];

	/**
	 * An optional set of characters that when pressed while this completion is active will accept it first and
	 * then type that character. *Note* that all commit characters should have `length=1` and that superfluous
	 * characters will be ignored.
	 */
	commitCharacters?: string[];

	/**
	 * An optional [command](#Command) that is executed *after* inserting this completion. *Note* that
	 * additional modifications to the current document should be described with the
	 * [additionalTextEdits](#CompletionItem.additionalTextEdits)-property.
	 */
	command?: Command;

	/**
	 * An data entry field that is preserved on a completion item between
	 * a [CompletionRequest](#CompletionRequest) and a [CompletionResolveRequest]
	 * (#CompletionResolveRequest)
	 */
	data?: any
}

/**
 * The CompletionItem namespace provides functions to deal with
 * completion items.
 */
export namespace CompletionItem {
	/**
	 * Create a completion item and seed it with a label.
	 * @param label The completion item's label
	 */
	export function create(label: string): CompletionItem {
		return { label };
	}
}

/**
 * Represents a collection of [completion items](#CompletionItem) to be presented
 * in the editor.
 */
export interface CompletionList {
	/**
	 * This list it not complete. Further typing results in recomputing this list.
	 */
	isIncomplete: boolean;

	/**
	 * The completion items.
	 */
	items: CompletionItem[];
}

/**
 * The CompletionList namespace provides functions to deal with
 * completion lists.
 */
export namespace CompletionList {
	/**
	 * Creates a new completion list.
	 *
	 * @param items The completion items.
	 * @param isIncomplete The list is not complete.
	 */
	export function create(items?: CompletionItem[], isIncomplete?: boolean): CompletionList {
		return { items: items ? items : [], isIncomplete: !!isIncomplete };
	}
}

/**
 * MarkedString can be used to render human readable text. It is either a markdown string
 * or a code-block that provides a language and a code snippet. The language identifier
 * is sematically equal to the optional language identifier in fenced code blocks in GitHub
 * issues. See https://help.github.com/articles/creating-and-highlighting-code-blocks/#syntax-highlighting
 *
 * The pair of a language and a value is an equivalent to markdown:
 * ```${language}
 * ${value}
 * ```
 *
 * Note that markdown strings will be sanitized - that means html will be escaped.
 * @deprecated use MarkdownString instead.
 */
export type MarkedString = string | { language: string; value: string };

export namespace MarkedString {
	/**
	 * Creates a marked string from plain text.
	 *
	 * @param plainText The plain text.
	 */
	export function fromPlainText(plainText: string): string {
		return plainText.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&"); // escape markdown syntax tokens: http://daringfireball.net/projects/markdown/syntax#backslash
	}
}

/**
 * The result of a hover request.
 */
export interface Hover {
	/**
	 * The hover's content
	 */
	contents: MarkdownContent | MarkedString | MarkedString[];

	/**
	 * An optional range
	 */
	range?: Range;
}

/**
 * Represents a parameter of a callable-signature. A parameter can
 * have a label and a doc-comment.
 */
export interface ParameterInformation {
	/**
	 * The label of this signature. Will be shown in
	 * the UI.
	 */
	label: string;

	/**
	 * The human-readable doc-comment of this signature. Will be shown
	 * in the UI but can be omitted.
	 */
	documentation?: string | MarkdownContent;
}

/**
 * The ParameterInformation namespace provides helper functions to work with
 * [ParameterInformation](#ParameterInformation) literals.
 */
export namespace ParameterInformation {
	/**
	 * Creates a new parameter information literal.
	 *
	 * @param label A label string.
	 * @param documentation A doc string.
	 */
	export function create(label: string, documentation?: string): ParameterInformation {
		return documentation ? { label, documentation } : { label };
	};
}

/**
 * Represents the signature of something callable. A signature
 * can have a label, like a function-name, a doc-comment, and
 * a set of parameters.
 */
export interface SignatureInformation {
	/**
	 * The label of this signature. Will be shown in
	 * the UI.
	 */
	label: string;

	/**
	 * The human-readable doc-comment of this signature. Will be shown
	 * in the UI but can be omitted.
	 */
	documentation?: string | MarkdownContent;

	/**
	 * The parameters of this signature.
	 */
	parameters?: ParameterInformation[];
}

/**
 * The SignatureInformation namespace provides helper functions to work with
 * [SignatureInformation](#SignatureInformation) literals.
 */
export namespace SignatureInformation {
	export function create(label: string, documentation?: string, ...parameters: ParameterInformation[]): SignatureInformation {
		let result: SignatureInformation = { label };
		if (Is.defined(documentation)) {
			result.documentation = documentation;
		}
		if (Is.defined(parameters)) {
			result.parameters = parameters;
		} else {
			result.parameters = [];
		}
		return result;
	}
}

/**
 * Signature help represents the signature of something
 * callable. There can be multiple signature but only one
 * active and only one active parameter.
 */
export interface SignatureHelp {
	/**
	 * One or more signatures.
	 */
	signatures: SignatureInformation[];

	/**
	 * The active signature. Set to `null` if no
	 * signatures exist.
	 */
	activeSignature: number | null;

	/**
	 * The active parameter of the active signature. Set to `null`
	 * if the active signature has no parameters.
	 */
	activeParameter: number | null;
}

/**
 * The definition of a symbol represented as one or many [locations](#Location).
 * For most programming languages there is only one location at which a symbol is
 * defined. If no definition can be found `null` is returned.
 */
export type Definition = Location | Location[] | null;

/**
 * Value-object that contains additional information when
 * requesting references.
 */
export interface ReferenceContext {
	/**
	 * Include the declaration of the current symbol.
	 */
	includeDeclaration: boolean;
}

/**
 * A document highlight kind.
 */
export namespace DocumentHighlightKind {
	/**
	 * A textual occurrance.
	 */
	export const Text: 1 = 1;

	/**
	 * Read-access of a symbol, like reading a variable.
	 */
	export const Read: 2 = 2;

	/**
	 * Write-access of a symbol, like writing to a variable.
	 */
	export const Write: 3 = 3;
}

export type DocumentHighlightKind = 1 | 2 | 3;

/**
 * A document highlight is a range inside a text document which deserves
 * special attention. Usually a document highlight is visualized by changing
 * the background color of its range.
 */
export interface DocumentHighlight {
	/**
	 * The range this highlight applies to.
	 */
	range: Range;

	/**
	 * The highlight kind, default is [text](#DocumentHighlightKind.Text).
	 */
	kind?: DocumentHighlightKind;
}

/**
 * DocumentHighlight namespace to provide helper functions to work with
 * [DocumentHighlight](#DocumentHighlight) literals.
 */
export namespace DocumentHighlight {
	/**
	 * Create a DocumentHighlight object.
	 * @param range The range the highlight applies to.
	 */
	export function create(range: Range, kind?: DocumentHighlightKind): DocumentHighlight {
		let result: DocumentHighlight = { range };
		if (Is.number(kind)) {
			result.kind = kind;
		}
		return result;
	}
}

/**
 * A symbol kind.
 */
export namespace SymbolKind {
	export const File: 1 = 1;
	export const Module: 2 = 2;
	export const Namespace: 3 = 3;
	export const Package: 4 = 4;
	export const Class: 5 = 5;
	export const Method: 6 = 6;
	export const Property: 7 = 7;
	export const Field: 8 = 8;
	export const Constructor: 9 = 9;
	export const Enum: 10 = 10;
	export const Interface: 11 = 11;
	export const Function: 12 = 12;
	export const Variable: 13 = 13;
	export const Constant: 14 = 14;
	export const String: 15 = 15;
	export const Number: 16 = 16;
	export const Boolean: 17 = 17;
	export const Array: 18 = 18;
}

export type SymbolKind = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

/**
 * Represents information about programming constructs like variables, classes,
 * interfaces etc.
 */
export interface SymbolInformation {
	/**
	 * The name of this symbol.
	 */
	name: string;

	/**
	 * The kind of this symbol.
	 */
	kind: SymbolKind;

	/**
	 * The location of this symbol. The location's range is used by a tool
	 * to reveal the location in the editor. If the symbol is selected in the
	 * tool the range's start information is used to position the cursor. So
	 * the range usually spwans more then the actual symbol's name and does
	 * normally include thinks like visibility modifiers.
	 *
	 * The range doesn't have to denote a node range in the sense of a abstract
	 * syntax tree. It can therefore not be used to re-construct a hierarchy of
	 * the symbols.
	 */
	location: Location;

	/**
	 * The name of the symbol containing this symbol. This information is for
	 * user interface purposes (e.g. to render a qaulifier in the user interface
	 * if necessary). It can't be used to re-infer a hierarchy for the document
	 * symbols.
	 */
	containerName?: string;
}

export namespace SymbolInformation {
	/**
	 * Creates a new symbol information literal.
	 *
	 * @param name The name of the symbol.
	 * @param kind The kind of the symbol.
	 * @param range The range of the location of the symbol.
	 * @param uri The resource of the location of symbol, defaults to the current document.
	 * @param containerName The name of the symbol containg the symbol.
	 */
	export function create(name: string, kind: SymbolKind, range: Range, uri?: string, containerName?: string): SymbolInformation {
		let result: SymbolInformation = {
			name,
			kind,
			location: { uri: uri as any, range }
		}
		if (containerName) {
			result.containerName = containerName;
		}
		return result;
	}
}

/**
 * Parameters for a [DocumentSymbolRequest](#DocumentSymbolRequest).
 */
export interface DocumentSymbolParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;
}

/**
 * The parameters of a [WorkspaceSymbolRequest](#WorkspaceSymbolRequest).
 */
export interface WorkspaceSymbolParams {
	/**
	 * A non-empty query string
	 */
	query: string;
}

/**
 * Contains additional diagnostic information about the context in which
 * a [code action](#CodeActionProvider.provideCodeActions) is run.
 */
export interface CodeActionContext {
	/**
	 * An array of diagnostics.
	 */
	diagnostics: Diagnostic[];
}

/**
 * The CodeActionContext namespace provides helper functions to work with
 * [CodeActionContext](#CodeActionContext) literals.
 */
export namespace CodeActionContext {
	/**
	 * Creates a new CodeActionContext literal.
	 */
	export function create(diagnostics: Diagnostic[]): CodeActionContext {
		return { diagnostics };
	}
	/**
	 * Checks whether the given literal conforms to the [CodeActionContext](#CodeActionContext) interface.
	 */
	export function is(value: any): value is CodeActionContext {
		let candidate = value as CodeActionContext;
		return Is.defined(candidate) && Is.typedArray<Diagnostic[]>(candidate.diagnostics, Diagnostic.is);
	}
}

/**
 * A code lens represents a [command](#Command) that should be shown along with
 * source text, like the number of references, a way to run tests, etc.
 *
 * A code lens is _unresolved_ when no command is associated to it. For performance
 * reasons the creation of a code lens and resolving should be done to two stages.
 */
export interface CodeLens {
	/**
	 * The range in which this code lens is valid. Should only span a single line.
	 */
	range: Range;

	/**
	 * The command this code lens represents.
	 */
	command?: Command;

	/**
	 * An data entry field that is preserved on a code lens item between
	 * a [CodeLensRequest](#CodeLensRequest) and a [CodeLensResolveRequest]
	 * (#CodeLensResolveRequest)
	 */
	data?: any
}

/**
 * The CodeLens namespace provides helper functions to work with
 * [CodeLens](#CodeLens) literals.
 */
export namespace CodeLens {
	/**
	 * Creates a new CodeLens literal.
	 */
	export function create(range: Range, data?: any): CodeLens {
		let result: CodeLens = { range };
		if (Is.defined(data)) result.data = data;
		return result;
	}
	/**
	 * Checks whether the given literal conforms to the [CodeLens](#CodeLens) interface.
	 */
	export function is(value: any): value is CodeLens {
		let candidate = value as CodeLens;
		return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.command) || Command.is(candidate.command));
	}
}

/**
 * Value-object describing what options formatting should use.
 */
export interface FormattingOptions {
	/**
	 * Size of a tab in spaces.
	 */
	tabSize: number;

	/**
	 * Prefer spaces over tabs.
	 */
	insertSpaces: boolean;

	/**
	 * Signature for further properties.
	 */
	[key: string]: boolean | number | string;
}

/**
 * The FormattingOptions namespace provides helper functions to work with
 * [FormattingOptions](#FormattingOptions) literals.
 */
export namespace FormattingOptions {
	/**
	 * Creates a new FormattingOptions literal.
	 */
	export function create(tabSize: number, insertSpaces: boolean): FormattingOptions {
		return { tabSize, insertSpaces };
	}
	/**
	 * Checks whether the given literal conforms to the [FormattingOptions](#FormattingOptions) interface.
	 */
	export function is(value: any): value is FormattingOptions {
		let candidate = value as FormattingOptions;
		return Is.defined(candidate) && Is.number(candidate.tabSize) && Is.boolean(candidate.insertSpaces);
	}
}

/**
 * A document link is a range in a text document that links to an internal or external resource, like another
 * text document or a web site.
 */
export class DocumentLink {

	/**
	 * The range this link applies to.
	 */
	range: Range;

	/**
	 * The uri this link points to.
	 */
	target?: string;
}

/**
 * The DocumentLink namespace provides helper functions to work with
 * [DocumentLink](#DocumentLink) literals.
 */
export namespace DocumentLink {
	/**
	 * Creates a new DocumentLink literal.
	 */
	export function create(range: Range, target?: string): DocumentLink {
		return { range, target };
	}

	/**
	 * Checks whether the given literal conforms to the [DocumentLink](#DocumentLink) interface.
	 */
	export function is(value: any): value is DocumentLink {
		let candidate = value as DocumentLink;
		return Is.defined(candidate) && Range.is(candidate.range) && (Is.undefined(candidate.target) || Is.string(candidate.target));
	}
}

export const EOL: string[] = ['\n', '\r\n', '\r'];

/**
 * A simple text document. Not to be implemenented.
 */
export interface TextDocument {

	/**
	 * The associated URI for this document. Most documents have the __file__-scheme, indicating that they
	 * represent files on disk. However, some documents may have other schemes indicating that they are not
	 * available on disk.
	 *
	 * @readonly
	 */
	readonly uri: string;

	/**
	 * The identifier of the language associated with this document.
	 *
	 * @readonly
	 */
	readonly languageId: string;

	/**
	 * The version number of this document (it will increase after each
	 * change, including undo/redo).
	 *
	 * @readonly
	 */
	readonly version: number;

	/**
	 * Get the text of this document.
	 *
	 * @return The text of this document.
	 */
	getText(): string;

	/**
	 * Converts a zero-based offset to a position.
	 *
	 * @param offset A zero-based offset.
	 * @return A valid [position](#Position).
	 */
	positionAt(offset: number): Position;

	/**
	 * Converts the position to a zero-based offset.
	 *
	 * The position will be [adjusted](#TextDocument.validatePosition).
	 *
	 * @param position A position.
	 * @return A valid zero-based offset.
	 */
	offsetAt(position: Position): number;

	/**
	 * The number of lines in this document.
	 *
	 * @readonly
	 */
	readonly lineCount: number;
}

export namespace TextDocument {
	/**
	 * Creates a new ITextDocument literal from the given uri and content.
	 * @param uri The document's uri.
	 * @param languageId  The document's language Id.
	 * @param content The document's content.
	 */
	export function create(uri: string, languageId: string, version: number, content: string): TextDocument {
		return new FullTextDocument(uri, languageId, version, content);
	}
	/**
	 * Checks whether the given literal conforms to the [ITextDocument](#ITextDocument) interface.
	 */
	export function is(value: any): value is TextDocument {
		let candidate = value as TextDocument;
		return Is.defined(candidate) && Is.string(candidate.uri) && (Is.undefined(candidate.languageId) || Is.string(candidate.languageId)) && Is.number(candidate.lineCount)
			&& Is.func(candidate.getText) && Is.func(candidate.positionAt) && Is.func(candidate.offsetAt) ? true : false;
	}
}

/**
 * Event to signal changes to a simple text document.
 */
export interface TextDocumentChangeEvent {
	/**
	 * The document that has changed.
	 */
	document: TextDocument;
}

/**
 * Represents reasons why a text document is saved.
 */
export namespace TextDocumentSaveReason {

	/**
	 * Manually triggered, e.g. by the user pressing save, by starting debugging,
	 * or by an API call.
	 */
	export const Manual: 1 = 1;

	/**
	 * Automatic after a delay.
	 */
	export const AfterDelay: 2 = 2;

	/**
	 * When the editor lost focus.
	 */
	export const FocusOut: 3 = 3;
}

export type TextDocumentSaveReason = 1 | 2 | 3;

export interface TextDocumentWillSaveEvent {
	/**
	 * The document that will be saved
	 */
	document: TextDocument;

	/**
	 * The reason why save was triggered.
	 */
	reason: TextDocumentSaveReason;
}

/**
 * An event describing a change to a text document. If range and rangeLength are omitted
 * the new text is considered to be the full content of the document.
 */
export interface TextDocumentContentChangeEvent {
	/**
	 * The range of the document that changed.
	 */
	range?: Range;

	/**
	 * The length of the range that got replaced.
	 */
	rangeLength?: number;

	/**
	 * The new text of the document.
	 */
	text: string;
}

class FullTextDocument implements TextDocument {

	private _uri: string;
	private _languageId: string;
	private _version: number;
	private _content: string;
	private _lineOffsets: number[] | null;

	public constructor(uri: string, languageId: string, version: number, content: string) {
		this._uri = uri;
		this._languageId = languageId;
		this._version = version;
		this._content = content;
		this._lineOffsets = null;
	}

	public get uri(): string {
		return this._uri;
	}

	public get languageId(): string {
		return this._languageId;
	}

	public get version(): number {
		return this._version;
	}

	public getText(): string {
		return this._content;
	}

	public update(event: TextDocumentContentChangeEvent, version: number): void {
		this._content = event.text;
		this._version = version;
		this._lineOffsets = null;
	}

	private getLineOffsets(): number[] {
		if (this._lineOffsets === null) {
			let lineOffsets: number[] = [];
			let text = this._content;
			let isLineStart = true;
			for (let i = 0; i < text.length; i++) {
				if (isLineStart) {
					lineOffsets.push(i);
					isLineStart = false;
				}
				let ch = text.charAt(i);
				isLineStart = (ch === '\r' || ch === '\n');
				if (ch === '\r' && i + 1 < text.length && text.charAt(i + 1) === '\n') {
					i++;
				}
			}
			if (isLineStart && text.length > 0) {
				lineOffsets.push(text.length);
			}
			this._lineOffsets = lineOffsets;
		}
		return this._lineOffsets;
	}

	public positionAt(offset: number) {
		offset = Math.max(Math.min(offset, this._content.length), 0);

		let lineOffsets = this.getLineOffsets();
		let low = 0, high = lineOffsets.length;
		if (high === 0) {
			return Position.create(0, offset);
		}
		while (low < high) {
			let mid = Math.floor((low + high) / 2);
			if (lineOffsets[mid] > offset) {
				high = mid;
			} else {
				low = mid + 1;
			}
		}
		// low is the least x for which the line offset is larger than the current offset
		// or array.length if no line offset is larger than the current offset
		let line = low - 1;
		return Position.create(line, offset - lineOffsets[line]);
	}

	public offsetAt(position: Position) {
		let lineOffsets = this.getLineOffsets();
		if (position.line >= lineOffsets.length) {
			return this._content.length;
		} else if (position.line < 0) {
			return 0;
		}
		let lineOffset = lineOffsets[position.line];
		let nextLineOffset = (position.line + 1 < lineOffsets.length) ? lineOffsets[position.line + 1] : this._content.length;
		return Math.max(Math.min(lineOffset + position.character, nextLineOffset), lineOffset);
	}

	public get lineCount() {
		return this.getLineOffsets().length;
	}
}

namespace Is {

	const toString = Object.prototype.toString;

	export function defined(value: any): boolean {
		return typeof value !== 'undefined';
	}

	export function undefined(value: any): boolean {
		return typeof value === 'undefined';
	}

	export function boolean(value: any): value is boolean {
		return value === true || value === false;
	}

	export function string(value: any): value is string {
		return toString.call(value) === '[object String]';
	}

	export function number(value: any): value is number {
		return toString.call(value) === '[object Number]';
	}

	export function func(value: any): value is Function {
		return toString.call(value) === '[object Function]';
	}

	export function typedArray<T>(value: any, check: (value: any) => boolean): value is T[] {
		return Array.isArray(value) && (<any[]>value).every(check);
	}
}
