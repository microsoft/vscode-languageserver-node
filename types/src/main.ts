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
 * Positions are line end character agnostic. So you can not specify a position that
 * denotes `\r|\n` or `\n|` where `|` represents the character offset.
 */
export interface Position {
	/**
	 * Line position in a document (zero-based).
	 * If a line number is greater than the number of lines in a document, it defaults back to the number of lines in the document.
	 * If a line number is negative, it defaults to 0.
	 */
	line: number;

	/**
	 * Character offset on a line in a document (zero-based). Assuming that the line is
	 * represented as a string, the `character` value represents the gap between the
	 * `character` and `character + 1`.
	 *
	 * If the character value is greater than the line length it defaults back to the
	 * line length.
	 * If a line number is negative, it defaults to 0.
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
		return Is.objectLiteral(candidate) && Is.number(candidate.line) && Is.number(candidate.character);
	}
}

/**
 * A range in a text document expressed as (zero-based) start and end positions.
 *
 * If you want to specify a range that contains a line including the line ending
 * character(s) then use an end position denoting the start of the next line.
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
	 * The range's end position.
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
		return Is.objectLiteral(candidate) && Position.is(candidate.start) && Position.is(candidate.end);
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
 * Represents a color in RGBA space.
 */
export interface Color {

	/**
	 * The red component of this color in the range [0-1].
	 */
	readonly red: number;

	/**
	 * The green component of this color in the range [0-1].
	 */
	readonly green: number;

	/**
	 * The blue component of this color in the range [0-1].
	 */
	readonly blue: number;

	/**
	 * The alpha component of this color in the range [0-1].
	 */
	readonly alpha: number;
}

/**
 * The Color namespace provides helper functions to work with
 * [Color](#Color) literals.
 */
export namespace Color {
	/**
	 * Creates a new Color literal.
	 */
	export function create(red: number, green: number, blue: number, alpha: number): Color {
		return {
			red,
			green,
			blue,
			alpha,
		};
	}

	/**
	 * Checks whether the given literal conforms to the [Color](#Color) interface.
	 */
	export function is(value: any): value is Color {
		const candidate = value as Color;
		return Is.number(candidate.red)
			&& Is.number(candidate.green)
			&& Is.number(candidate.blue)
			&& Is.number(candidate.alpha);
	}
}

/**
 * Represents a color range from a document.
 */
export interface ColorInformation {

	/**
	 * The range in the document where this color appers.
	 */
	range: Range;

	/**
	 * The actual color value for this color range.
	 */
	color: Color;
}

/**
 * The ColorInformation namespace provides helper functions to work with
 * [ColorInformation](#ColorInformation) literals.
 */
export namespace ColorInformation {
	/**
	 * Creates a new ColorInformation literal.
	 */
	export function create(range: Range, color: Color): ColorInformation {
		return {
			range,
			color,
		};
	}

	/**
	 * Checks whether the given literal conforms to the [ColorInformation](#ColorInformation) interface.
	 */
	export function is(value: any): value is ColorInformation {
		const candidate = value as ColorInformation;
		return Range.is(candidate.range) && Color.is(candidate.color);
	}
}

export interface ColorPresentation {
	/**
	 * The label of this color presentation. It will be shown on the color
	 * picker header. By default this is also the text that is inserted when selecting
	 * this color presentation.
	 */
	label: string;
	/**
	 * An [edit](#TextEdit) which is applied to a document when selecting
	 * this presentation for the color.  When `falsy` the [label](#ColorPresentation.label)
	 * is used.
	 */
	textEdit?: TextEdit;
	/**
	 * An optional array of additional [text edits](#TextEdit) that are applied when
	 * selecting this color presentation. Edits must not overlap with the main [edit](#ColorPresentation.textEdit) nor with themselves.
	 */
	additionalTextEdits?: TextEdit[];
}

/**
 * The Color namespace provides helper functions to work with
 * [ColorPresentation](#ColorPresentation) literals.
 */
export namespace ColorPresentation {
	/**
	 * Creates a new ColorInformation literal.
	 */
	export function create(label: string, textEdit?: TextEdit, additionalTextEdits?: TextEdit[]): ColorPresentation {
		return {
			label,
			textEdit,
			additionalTextEdits,
		};
	}

	/**
	 * Checks whether the given literal conforms to the [ColorInformation](#ColorInformation) interface.
	 */
	export function is(value: any): value is ColorPresentation {
		const candidate = value as ColorPresentation;
		return Is.string(candidate.label)
			&& (Is.undefined(candidate.textEdit) || TextEdit.is(candidate))
			&& (Is.undefined(candidate.additionalTextEdits) || Is.typedArray<DiagnosticRelatedInformation>(candidate.additionalTextEdits, TextEdit.is));
	}
}

/**
 * Enum of known range kinds
 */
export enum FoldingRangeKind {
	/**
	 * Folding range for a comment
	 */
	Comment = 'comment',
	/**
	 * Folding range for a imports or includes
	 */
	Imports = 'imports',
	/**
	 * Folding range for a region (e.g. `#region`)
	 */
	Region = 'region'
}

/**
 * Represents a folding range.
 */
export interface FoldingRange {

	/**
	 * The zero-based line number from where the folded range starts.
	 */
	startLine: number;

	/**
	 * The zero-based character offset from where the folded range starts. If not defined, defaults to the length of the start line.
	 */
	startCharacter?: number;

	/**
	 * The zero-based line number where the folded range ends.
	 */
	endLine: number;

	/**
	 * The zero-based character offset before the folded range ends. If not defined, defaults to the length of the end line.
	 */
	endCharacter?: number;

	/**
	 * Describes the kind of the folding range such as `comment' or 'region'. The kind
	 * is used to categorize folding ranges and used by commands like 'Fold all comments'. See
	 * [FoldingRangeKind](#FoldingRangeKind) for an enumeration of standardized kinds.
	 */
	kind?: string;
}

/**
 * The folding range namespace provides helper functions to work with
 * [FoldingRange](#FoldingRange) literals.
 */
export namespace FoldingRange {
	/**
	 * Creates a new FoldingRange literal.
	 */
	export function create(startLine: number, endLine: number, startCharacter?: number, endCharacter?: number, kind?: string): FoldingRange {
		const result: FoldingRange = {
			startLine,
			endLine
		};
		if (Is.defined(startCharacter)) {
			result.startCharacter = startCharacter;
		}
		if (Is.defined(endCharacter)) {
			result.endCharacter = endCharacter;
		}
		if (Is.defined(kind)) {
			result.kind = kind;
		}
		return result;
	}

	/**
	 * Checks whether the given literal conforms to the [FoldingRange](#FoldingRange) interface.
	 */
	export function is(value: any): value is FoldingRange {
		const candidate = value as FoldingRange;
		return Is.number(candidate.startLine) && Is.number(candidate.startLine)
			&& (Is.undefined(candidate.startCharacter) || Is.number(candidate.startCharacter))
			&& (Is.undefined(candidate.endCharacter) || Is.number(candidate.endCharacter))
			&& (Is.undefined(candidate.kind) || Is.string(candidate.kind))
	}
}

/**
 * Represents a related message and source code location for a diagnostic. This should be
 * used to point to code locations that cause or related to a diagnostics, e.g when duplicating
 * a symbol in a scope.
 */
export interface DiagnosticRelatedInformation {
	/**
	 * The location of this related diagnostic information.
	 */
	location: Location;

	/**
	 * The message of this related diagnostic information.
	 */
	message: string;
}

/**
 * The DiagnosticRelatedInformation namespace provides helper functions to work with
 * [DiagnosticRelatedInformation](#DiagnosticRelatedInformation) literals.
 */
export namespace DiagnosticRelatedInformation {

	/**
	 * Creates a new DiagnosticRelatedInformation literal.
	 */
	export function create(location: Location, message: string): DiagnosticRelatedInformation {
		return {
			location,
			message
		};
	}

	/**
	 * Checks whether the given literal conforms to the [DiagnosticRelatedInformation](#DiagnosticRelatedInformation) interface.
	 */
	export function is(value: any): value is DiagnosticRelatedInformation {
		let candidate: DiagnosticRelatedInformation = value as DiagnosticRelatedInformation;
		return Is.defined(candidate) && Location.is(candidate.location) && Is.string(candidate.message);
	}
}

/**
 * The diagnostic's severity.
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
	 * The diagnostic's code, which might appear in the user interface.
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

	/**
	 * An array of related diagnostic information, e.g. when symbol-names within
	 * a scope collide all definitions can be marked via this property.
	 */
	relatedInformation?: DiagnosticRelatedInformation[];
}

/**
 * The Diagnostic namespace provides helper functions to work with
 * [Diagnostic](#Diagnostic) literals.
 */
export namespace Diagnostic {
	/**
	 * Creates a new Diagnostic literal.
	 */
	export function create(range: Range, message: string, severity?: DiagnosticSeverity, code?: number | string, source?: string, relatedInformation?: DiagnosticRelatedInformation[]): Diagnostic {
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
		if (Is.defined(relatedInformation)) {
			result.relatedInformation = relatedInformation;
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
			&& (Is.string(candidate.source) || Is.undefined(candidate.source))
			&& (Is.undefined(candidate.relatedInformation) || Is.typedArray<DiagnosticRelatedInformation>(candidate.relatedInformation, DiagnosticRelatedInformation.is));
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
		return Is.defined(candidate) && Is.string(candidate.title) && Is.string(candidate.command);
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
	 * @param position The position to insert the text at.
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

	export function is(value: any): value is TextEdit {
		const candidate = value as TextEdit;
		return Is.objectLiteral(candidate)
			&& Is.string(candidate.newText)
			&& Range.is(candidate.range);
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

interface ResourceOperation {
	kind: string;
}

/**
 * Options to create a file.
 */
export interface CreateFileOptions {
	/**
	 * Overwrite existing file. Overwrite wins over `ignoreIfExists`
	 */
	overwrite?: boolean;
	/**
	 * Ignore if exists.
	 */
	ignoreIfExists?: boolean;
}

/**
 * Create file operation.
 */
export interface CreateFile extends ResourceOperation {
	/**
	 * A create
	 */
	kind: 'create';
	/**
	 * The resource to create.
	 */
	uri: string;
	/**
	 * Additional options
	 */
	options?: CreateFileOptions;
}

export namespace CreateFile {
	export function create(uri: string, options?: CreateFileOptions): CreateFile {
		let result: CreateFile = {
			kind: 'create',
			uri
		};
		if (options !== void 0 && (options.overwrite !== void 0 || options.ignoreIfExists !== void 0)) {
			result.options = options;
		}
		return result;
	}

	export function is(value: any): value is CreateFile {
		let candidate: CreateFile = value;
		return candidate && candidate.kind === 'create' && Is.string(candidate.uri) &&
			(
				candidate.options === void 0 ||
				((candidate.options.overwrite === void 0 || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === void 0 || Is.boolean(candidate.options.ignoreIfExists)))
			)
	}
}

/**
 * Rename file options
 */
export interface RenameFileOptions {
	/**
	 * Overwrite target if existing. Overwrite wins over `ignoreIfExists`
	 */
	overwrite?: boolean;
	/**
	 * Ignores if target exists.
	 */
	ignoreIfExists?: boolean;
}

/**
 * Rename file operation
 */
export interface RenameFile extends ResourceOperation {
	/**
	 * A rename
	 */
	kind: 'rename';
	/**
	 * The old (existing) location.
	 */
	oldUri: string;
	/**
	 * The new location.
	 */
	newUri: string;
	/**
	 * Rename options.
	 */
	options?: RenameFileOptions;
}

export namespace RenameFile {
	export function create(oldUri: string, newUri: string, options?: RenameFileOptions): RenameFile {
		let result: RenameFile = {
			kind: 'rename',
			oldUri,
			newUri
		};
		if (options !== void 0 && (options.overwrite !== void 0 || options.ignoreIfExists !== void 0)) {
			result.options = options;
		}
		return result;
	}

	export function is(value: any): value is RenameFile {
		let candidate: RenameFile = value;
		return candidate && candidate.kind === 'rename' && Is.string(candidate.oldUri) && Is.string(candidate.newUri) &&
			(
				candidate.options === void 0 ||
				((candidate.options.overwrite === void 0 || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === void 0 || Is.boolean(candidate.options.ignoreIfExists)))
			)
	}
}

/**
 * Delete file options
 */
export interface DeleteFileOptions {
	/**
	 * Delete the content recursively if a folder is denoted.
	 */
	recursive?: boolean;
	/**
	 * Ignore the operation if the file doesn't exist.
	 */
	ignoreIfNotExists?: boolean;
}

/**
 * Delete file operation
 */
export interface DeleteFile extends ResourceOperation {
	/**
	 * A delete
	 */
	kind: 'delete';
	/**
	 * The file to delete.
	 */
	uri: string;
	/**
	 * Delete options.
	 */
	options?: DeleteFileOptions;
}

export namespace DeleteFile {
	export function create(uri: string, options?: DeleteFileOptions): DeleteFile {
		let result: DeleteFile = {
			kind: 'delete',
			uri
		};
		if (options !== void 0 && (options.recursive !== void 0 || options.ignoreIfNotExists !== void 0)) {
			result.options = options;
		}
		return result;
	}

	export function is(value: any): value is DeleteFile {
		let candidate: DeleteFile = value;
		return candidate && candidate.kind === 'delete' && Is.string(candidate.uri) &&
			(
				candidate.options === void 0 ||
				((candidate.options.recursive === void 0 || Is.boolean(candidate.options.recursive)) && (candidate.options.ignoreIfNotExists === void 0 || Is.boolean(candidate.options.ignoreIfNotExists)))
			)
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
	 * Depending on the client capability `workspace.workspaceEdit.resourceOperations` document changes
	 * are either an array of `TextDocumentEdit`s to express changes to n different text documents
	 * where each text document edit addresses a specific version of a text document. Or it can contain
	 * above `TextDocumentEdit`s mixed with create, rename and delete file / folder operations.
	 *
	 * Whether a client supports versioned document edits is expressed via
	 * `workspace.workspaceEdit.documentChanges` client capability.
	 *
	 * If a client neither supports `documentChanges` nor `workspace.workspaceEdit.resourceOperations` then
	 * only plain `TextEdit`s using the `changes` property are supported.
	 */
	documentChanges?: (TextDocumentEdit | CreateFile | RenameFile | DeleteFile)[];
}

export namespace WorkspaceEdit {
	export function is(value: any): value is WorkspaceEdit {
		let candidate: WorkspaceEdit = value;
		return candidate &&
			(candidate.changes !== void 0 || candidate.documentChanges !== void 0) &&
			(candidate.documentChanges === void 0 || candidate.documentChanges.every((change) => {
				if (Is.string((change as ResourceOperation).kind)) {
					return CreateFile.is(change) || RenameFile.is(change) || DeleteFile.is(change);
				} else {
					return TextDocumentEdit.is(change);
				}
			}));
	}
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
				workspaceEdit.documentChanges.forEach((change) => {
					if (TextDocumentEdit.is(change)) {
						let textEditChange = new TextEditChangeImpl(change.edits);
						this._textEditChanges[change.textDocument.uri] = textEditChange;
					}
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
				throw new Error('Workspace edit is not configured for document changes.');
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

	public createFile(uri: string, options?: CreateFileOptions): void {
		this.checkDocumentChanges();
		this._workspaceEdit!.documentChanges!.push(CreateFile.create(uri, options));
	}

	public renameFile(oldUri: string, newUri: string, options?: RenameFileOptions): void {
		this.checkDocumentChanges();
		this._workspaceEdit!.documentChanges!.push(RenameFile.create(oldUri, newUri, options));
	}

	public deleteFile(uri: string, options?: DeleteFileOptions): void {
		this.checkDocumentChanges();
		this._workspaceEdit!.documentChanges!.push(DeleteFile.create(uri, options));
	}

	private checkDocumentChanges() {
		if (!this._workspaceEdit || !this._workspaceEdit.documentChanges) {
			throw new Error('Workspace edit is not configured for document changes.');
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
	 * The version number of this document. If a versioned text document identifier
	 * is sent from the server to the client and the file is not open in the editor
	 * (the server has not received an open notification before) the server can send
	 * `null` to indicate that the version is unknown and the content on disk is the
	 * truth (as speced with document content ownership).
	 */
	version: number | null;
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
	export function create(uri: string, version: number | null): VersionedTextDocumentIdentifier {
		return { uri, version };
	}

	/**
	 * Checks whether the given literal conforms to the [VersionedTextDocumentIdentifier](#VersionedTextDocumentIdentifier) interface.
	 */
	export function is(value: any): value is VersionedTextDocumentIdentifier {
		let candidate = value as VersionedTextDocumentIdentifier;
		return Is.defined(candidate) && Is.string(candidate.uri) && (candidate.version === null || Is.number(candidate.version));
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
 * Describes the content type that a client supports in various
 * result literals like `Hover`, `ParameterInfo` or `CompletionItem`.
 *
 * Please note that `MarkupKinds` must not start with a `$`. This kinds
 * are reserved for internal usage.
 */
export namespace MarkupKind {
	/**
	 * Plain text is supported as a content format
	 */
	export const PlainText: 'plaintext' = 'plaintext';

	/**
	 * Markdown is supported as a content format
	 */
	export const Markdown: 'markdown' = 'markdown';
}
export type MarkupKind = 'plaintext' | 'markdown';

export namespace MarkupKind {
	/**
	 * Checks whether the given value is a value of the [MarkupKind](#MarkupKind) type.
	 */
	export function is(value: any): value is MarkupKind {
		const candidate = value as MarkupKind;
		return candidate === MarkupKind.PlainText || candidate === MarkupKind.Markdown;
	}
}

/**
 * A `MarkupContent` literal represents a string value which content is interpreted base on its
 * kind flag. Currently the protocol supports `plaintext` and `markdown` as markup kinds.
 *
 * If the kind is `markdown` then the value can contain fenced code blocks like in GitHub issues.
 * See https://help.github.com/articles/creating-and-highlighting-code-blocks/#syntax-highlighting
 *
 * Here is an example how such a string can be constructed using JavaScript / TypeScript:
 * ```ts
 * let markdown: MarkdownContent = {
 *  kind: MarkupKind.Markdown,
 *	value: [
 *		'# Header',
 *		'Some text',
 *		'```typescript',
 *		'someCode();',
 *		'```'
 *	].join('\n')
 * };
 * ```
 *
 * *Please Note* that clients might sanitize the return markdown. A client could decide to
 * remove HTML from the markdown to avoid script execution.
 */
export interface MarkupContent {
	/**
	 * The type of the Markup
	 */
	kind: MarkupKind;

	/**
	 * The content itself
	 */
	value: string;
}

export namespace MarkupContent {
	/**
	 * Checks whether the given value conforms to the [MarkupContent](#MarkupContent) interface.
	 */
	export function is(value: any): value is MarkupContent {
		const candidate = value as MarkupContent;
		return Is.objectLiteral(value) && MarkupKind.is(candidate.kind) && Is.string(candidate.value);
	}
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
	export const Folder: 19 = 19;
	export const EnumMember: 20 = 20;
	export const Constant: 21 = 21;
	export const Struct: 22 = 22;
	export const Event: 23 = 23;
	export const Operator: 24 = 24;
	export const TypeParameter: 25 = 25;
}

export type CompletionItemKind = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25;


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
	documentation?: string | MarkupContent;

	/**
	 * Indicates if this item is deprecated.
	 */
	deprecated?: boolean;

	/**
	 * Select this item when showing.
	 *
	 * *Note* that only one completion item can be selected and that the
	 * tool / client decides which item that is. The rule is that the *first*
	 * item of those that match best is selected.
	 */
	preselect?: boolean;

	/**
	 * A string that should be used when comparing this item
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
	 * selecting this completion. Edits must not overlap (including the same insert position)
	 * with the main [edit](#CompletionItem.textEdit) nor with themselves.
	 *
	 * Additional text edits should be used to change text unrelated to the current cursor position
	 * (for example adding an import statement at the top of the file if the completion item will
	 * insert an unqualified type).
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
 * is semantically equal to the optional language identifier in fenced code blocks in GitHub
 * issues. See https://help.github.com/articles/creating-and-highlighting-code-blocks/#syntax-highlighting
 *
 * The pair of a language and a value is an equivalent to markdown:
 * ```${language}
 * ${value}
 * ```
 *
 * Note that markdown strings will be sanitized - that means html will be escaped.
 * @deprecated use MarkupContent instead.
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

	/**
	 * Checks whether the given value conforms to the [MarkedString](#MarkedString) type.
	 */
	export function is(value: any): value is MarkedString {
		const candidate = value as MarkedString;
		return Is.string(candidate) || (Is.objectLiteral(candidate) && Is.string(candidate.language) && Is.string(candidate.value));
	}
}

/**
 * The result of a hover request.
 */
export interface Hover {
	/**
	 * The hover's content
	 */
	contents: MarkupContent | MarkedString | MarkedString[];

	/**
	 * An optional range
	 */
	range?: Range;
}

export namespace Hover {
	/**
	 * Checks whether the given value conforms to the [Hover](#Hover) interface.
	 */
	export function is(value: any): value is Hover {
		let candidate = value as Hover;
		return Is.objectLiteral(candidate) && (
			MarkupContent.is(candidate.contents) ||
			MarkedString.is(candidate.contents) ||
			Is.typedArray(candidate.contents, MarkedString.is)
		) && (
				value.range === void 0 || Range.is(value.range)
			);
	}
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
	documentation?: string | MarkupContent;
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
	documentation?: string | MarkupContent;

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
	 * A textual occurrence.
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
	export const Object: 19 = 19;
	export const Key: 20 = 20;
	export const Null: 21 = 21;
	export const EnumMember: 22 = 22;
	export const Struct: 23 = 23;
	export const Event: 24 = 24;
	export const Operator: 25 = 25;
	export const TypeParameter: 26 = 26;
}

export type SymbolKind = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26;

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
	 * Indicates if this symbol is deprecated.
	 */
	deprecated?: boolean;

	/**
	 * The location of this symbol. The location's range is used by a tool
	 * to reveal the location in the editor. If the symbol is selected in the
	 * tool the range's start information is used to position the cursor. So
	 * the range usually spans more than the actual symbol's name and does
	 * normally include thinks like visibility modifiers.
	 *
	 * The range doesn't have to denote a node range in the sense of a abstract
	 * syntax tree. It can therefore not be used to re-construct a hierarchy of
	 * the symbols.
	 */
	location: Location;

	/**
	 * The name of the symbol containing this symbol. This information is for
	 * user interface purposes (e.g. to render a qualifier in the user interface
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
	 * @param containerName The name of the symbol containing the symbol.
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
 * Represents programming constructs like variables, classes, interfaces etc.
 * that appear in a document. Document symbols can be hierarchical and they
 * have two ranges: one that encloses its definition and one that points to
 * its most interesting range, e.g. the range of an identifier.
 */
export class DocumentSymbol {

	/**
	 * The name of this symbol.
	 */
	name: string;

	/**
	 * More detail for this symbol, e.g the signature of a function.
	 */
	detail?: string;

	/**
	 * The kind of this symbol.
	 */
	kind: SymbolKind;

	/**
	 * Indicates if this symbol is deprecated.
	 */
	deprecated?: boolean;

	/**
	 * The range enclosing this symbol not including leading/trailing whitespace but everything else
	 * like comments. This information is typically used to determine if the the clients cursor is
	 * inside the symbol to reveal in the symbol in the UI.
	 */
	range: Range;

	/**
	 * The range that should be selected and revealed when this symbol is being picked, e.g the name of a function.
	 * Must be contained by the the `range`.
	 */
	selectionRange: Range;

	/**
	 * Children of this symbol, e.g. properties of a class.
	 */
	children?: DocumentSymbol[];
}

export namespace DocumentSymbol {
	/**
	 * Creates a new symbol information literal.
	 *
	 * @param name The name of the symbol.
	 * @param detail The detail of the symbol.
	 * @param kind The kind of the symbol.
	 * @param range The range of the symbol.
	 * @param selectionRange The selectionRange of the symbol.
	 * @param children Children of the symbol.
	 */
	export function create(name: string, detail: string | undefined, kind: SymbolKind, range: Range, selectionRange: Range, children?: DocumentSymbol[]): DocumentSymbol {
		let result: DocumentSymbol = {
			name,
			detail,
			kind,
			range,
			selectionRange
		};
		if (children !== void 0) {
			result.children = children;
		}
		return result;
	}
	/**
	 * Checks whether the given literal conforms to the [DocumentSymbol](#DocumentSymbol) interface.
	 */
	export function is(value: any): value is DocumentSymbol {
		let candidate: DocumentSymbol = value;
		return candidate &&
			Is.string(candidate.name) && Is.number(candidate.kind) &&
			Range.is(candidate.range) && Range.is(candidate.selectionRange) &&
			(candidate.detail === void 0 || Is.string(candidate.detail)) &&
			(candidate.deprecated === void 0 || Is.boolean(candidate.deprecated)) &&
			(candidate.children === void 0 || Array.isArray(candidate.children));
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
 * The kind of a code action.
 *
 * Kinds are a hierarchical list of identifiers separated by `.`, e.g. `"refactor.extract.function"`.
 *
 * The set of kinds is open and client needs to announce the kinds it supports to the server during
 * initialization.
 */
export type CodeActionKind = string;

/**
 * A set of predefined code action kinds
 */
export namespace CodeActionKind {
	/**
	 * Base kind for quickfix actions: 'quickfix'
	 */
	export const QuickFix: CodeActionKind = 'quickfix';

	/**
	 * Base kind for refactoring actions: 'refactor'
	 */
	export const Refactor: CodeActionKind = 'refactor';

	/**
	 * Base kind for refactoring extraction actions: 'refactor.extract'
	 *
	 * Example extract actions:
	 *
	 * - Extract method
	 * - Extract function
	 * - Extract variable
	 * - Extract interface from class
	 * - ...
	 */
	export const RefactorExtract: CodeActionKind = 'refactor.extract';

	/**
	 * Base kind for refactoring inline actions: 'refactor.inline'
	 *
	 * Example inline actions:
	 *
	 * - Inline function
	 * - Inline variable
	 * - Inline constant
	 * - ...
	 */
	export const RefactorInline: CodeActionKind = 'refactor.inline';

	/**
	 * Base kind for refactoring rewrite actions: 'refactor.rewrite'
	 *
	 * Example rewrite actions:
	 *
	 * - Convert JavaScript function to class
	 * - Add or remove parameter
	 * - Encapsulate field
	 * - Make method static
	 * - Move method to base class
	 * - ...
	 */
	export const RefactorRewrite: CodeActionKind = 'refactor.rewrite';

	/**
	 * Base kind for source actions: `source`
	 *
	 * Source code actions apply to the entire file.
	 */
	export const Source: CodeActionKind = 'source';

	/**
	 * Base kind for an organize imports source action: `source.organizeImports`
	 */
	export const SourceOrganizeImports: CodeActionKind = 'source.organizeImports';
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

	/**
	 * Requested kind of actions to return.
	 *
	 * Actions not of this kind are filtered out by the client before being shown. So servers
	 * can omit computing them.
	 */
	only?: CodeActionKind[];
}

/**
 * The CodeActionContext namespace provides helper functions to work with
 * [CodeActionContext](#CodeActionContext) literals.
 */
export namespace CodeActionContext {
	/**
	 * Creates a new CodeActionContext literal.
	 */
	export function create(diagnostics: Diagnostic[], only?: CodeActionKind[]): CodeActionContext {
		let result: CodeActionContext = { diagnostics };
		if (only !== void 0 && only !== null) {
			result.only = only;
		}
		return result;
	}
	/**
	 * Checks whether the given literal conforms to the [CodeActionContext](#CodeActionContext) interface.
	 */
	export function is(value: any): value is CodeActionContext {
		let candidate = value as CodeActionContext;
		return Is.defined(candidate) && Is.typedArray<Diagnostic[]>(candidate.diagnostics, Diagnostic.is) && (candidate.only === void 0 || Is.typedArray(candidate.only, Is.string));
	}
}

/**
 * A code action represents a change that can be performed in code, e.g. to fix a problem or
 * to refactor code.
 *
 * A CodeAction must set either `edit` and/or a `command`. If both are supplied, the `edit` is applied first, then the `command` is executed.
 */
export interface CodeAction {

	/**
	 * A short, human-readable, title for this code action.
	 */
	title: string;

	/**
	 * The kind of the code action.
	 *
	 * Used to filter code actions.
	 */
	kind?: CodeActionKind;

	/**
	 * The diagnostics that this code action resolves.
	 */
	diagnostics?: Diagnostic[];

	/**
	 * The workspace edit this code action performs.
	 */
	edit?: WorkspaceEdit;

	/**
	 * A command this code action executes. If a code action
	 * provides a edit and a command, first the edit is
	 * executed and then the command.
	 */
	command?: Command;
}

export namespace CodeAction {
	/**
	 * Creates a new code action.
	 *
	 * @param title The title of the code action.
	 * @param command The command to execute.
	 * @param kind The kind of the code action.
	 */
	export function create(title: string, command: Command, kind?: CodeActionKind): CodeAction;
	/**
	 * Creates a new code action.
	 *
	 * @param title The title of the code action.
	 * @param command The command to execute.
	 * @param kind The kind of the code action.
	 */
	export function create(title: string, edit: WorkspaceEdit, kind?: CodeActionKind): CodeAction;
	export function create(title: string, commandOrEdit: Command | WorkspaceEdit, kind?: CodeActionKind): CodeAction {
		let result: CodeAction = { title };
		if (Command.is(commandOrEdit)) {
			result.command = commandOrEdit;
		} else {
			result.edit = commandOrEdit;
		}
		if (kind !== void null) {
			result.kind = kind;
		}
		return result;
	}
	export function is(value: any): value is CodeAction {
		let candidate: CodeAction = value;
		return candidate && Is.string(candidate.title) &&
			(candidate.diagnostics === void 0 || Is.typedArray(candidate.diagnostics, Diagnostic.is)) &&
			(candidate.kind === void 0 || Is.string(candidate.kind)) &&
			(candidate.edit !== void 0 || candidate.command !== void 0) &&
			(candidate.command === void 0 || Command.is(candidate.command)) &&
			(candidate.edit === void 0 || WorkspaceEdit.is(candidate.edit));
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

	/**
	 * A data entry field that is preserved on a document link between a
	 * DocumentLinkRequest and a DocumentLinkResolveRequest.
	 */
	data?: any
}

/**
 * The DocumentLink namespace provides helper functions to work with
 * [DocumentLink](#DocumentLink) literals.
 */
export namespace DocumentLink {
	/**
	 * Creates a new DocumentLink literal.
	 */
	export function create(range: Range, target?: string, data?: any): DocumentLink {
		return { range, target, data };
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
 * A simple text document. Not to be implemented.
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
	 * Get the text of this document. A substring can be retrieved by
	 * providing a range.
	 *
	 * @param range (optional) An range within the document to return.
	 * If no range is passed, the full content is returned.
	 * Invalid range positions are adjusted as described in [Position.line](#Position.line)
	 * and [Position.character](#Position.character).
	 * If the start range position is greater than the end range position,
	 * then the effect of getText is as if the two positions were swapped.

	 * @return The text of this document or a substring of the text if a
	 *         range is provided.
	 */
	getText(range?: Range): string;

	/**
	 * Converts a zero-based offset to a position.
	 *
	 * @param offset A zero-based offset.
	 * @return A valid [position](#Position).
	 */
	positionAt(offset: number): Position;

	/**
	 * Converts the position to a zero-based offset.
	 * Invalid positions are adjusted as described in [Position.line](#Position.line)
	 * and [Position.character](#Position.character).
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

	export function applyEdits(document: TextDocument, edits: TextEdit[]): string {
		let text = document.getText();
		let sortedEdits = mergeSort(edits, (a, b) => {
			let diff = a.range.start.line - b.range.start.line;
			if (diff === 0) {
				return a.range.start.character - b.range.start.character;
			}
			return diff;
		});
		let lastModifiedOffset = text.length;
		for (let i = sortedEdits.length - 1; i >= 0; i--) {
			let e = sortedEdits[i];
			let startOffset = document.offsetAt(e.range.start);
			let endOffset = document.offsetAt(e.range.end);
			if (endOffset <= lastModifiedOffset) {
				text = text.substring(0, startOffset) + e.newText + text.substring(endOffset, text.length);
			} else {
				throw new Error('Ovelapping edit');
			}
			lastModifiedOffset = startOffset;
		}
		return text;
	}

	function mergeSort<T>(data: T[], compare: (a: T, b: T) => number): T[] {
		if (data.length <= 1) {
			// sorted
			return data;
		}
		const p = (data.length / 2) | 0;
		const left = data.slice(0, p);
		const right = data.slice(p);

		mergeSort(left, compare);
		mergeSort(right, compare);

		let leftIdx = 0;
		let rightIdx = 0;
		let i = 0;
		while (leftIdx < left.length && rightIdx < right.length) {
			let ret = compare(left[leftIdx], right[rightIdx]);
			if (ret <= 0) {
				// smaller_equal -> take left to preserve order
				data[i++] = left[leftIdx++];
			} else {
				// greater -> take right
				data[i++] = right[rightIdx++];
			}
		}
		while (leftIdx < left.length) {
			data[i++] = left[leftIdx++];
		}
		while (rightIdx < right.length) {
			data[i++] = right[rightIdx++];
		}
		return data;
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

	public getText(range?: Range): string {
		if (range) {
			let start = this.offsetAt(range.start);
			let end = this.offsetAt(range.end);
			return this._content.substring(start, end);
		}
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

	export function objectLiteral(value: any): value is object {
		// Strictly speaking class instances pass this check as well. Since the LSP
		// doesn't use classes we ignore this for now. If we do we need to add something
		// like this: `Object.getPrototypeOf(Object.getPrototypeOf(x)) === null`
		return value !== null && typeof value === 'object';
	}

	export function typedArray<T>(value: any, check: (value: any) => boolean): value is T[] {
		return Array.isArray(value) && (<any[]>value).every(check);
	}
}
