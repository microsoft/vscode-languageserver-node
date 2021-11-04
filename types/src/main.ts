/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

/**
 * A tagging type for string properties that are actually document URIs.
 */
export type DocumentUri = string;

/**
 * A tagging type for string properties that are actually URIs
 *
 * @since 3.16.0
 */
export type URI = string;

/**
 * Defines an integer in the range of -2^31 to 2^31 - 1.
 */
export type integer = number;

export namespace integer {
	export const MIN_VALUE = -2147483648;
	export const MAX_VALUE = 2147483647;
}

/**
 * Defines an unsigned integer in the range of 0 to 2^31 - 1.
 */
export type uinteger = number;

export namespace uinteger {
	export const MIN_VALUE = 0;
	export const MAX_VALUE = 2147483647;
}

/**
 * Defines a decimal number. Since decimal numbers are very
 * rare in the language server specification we denote the
 * exact range with every decimal using the mathematics
 * interval notations (e.g. [0, 1] denotes all decimals d with
 * 0 <= d <= 1.
 */
export type decimal = number;


/**
 * The LSP any type
 *
 * @since 3.17.0
 */
export type LSPAny = LSPObject | LSPArray | string | integer | uinteger | decimal | boolean | null;

/**
 * LSP object definition.
 *
 * @since 3.17.0
 */
export type LSPObject = { [key: string]: LSPAny };

/**
 * LSP arrays.
 *
 * @since 3.17.0
 */
export type LSPArray = LSPAny[];

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
	 */
	line: uinteger;

	/**
	 * Character offset on a line in a document (zero-based). Assuming that the line is
	 * represented as a string, the `character` value represents the gap between the
	 * `character` and `character + 1`.
	 *
	 * If the character value is greater than the line length it defaults back to the
	 * line length.
	 */
	character: uinteger;
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
	export function create(line: uinteger, character: uinteger): Position {
		if (line === Number.MAX_VALUE) { line = uinteger.MAX_VALUE; }
		if (character === Number.MAX_VALUE) { character = uinteger.MAX_VALUE; }
		return { line, character };
	}
	/**
	 * Checks whether the given literal conforms to the [Position](#Position) interface.
	 */
	export function is(value: any): value is Position {
		let candidate = value as Position;
		return Is.objectLiteral(candidate) && Is.uinteger(candidate.line) && Is.uinteger(candidate.character);
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
	 * Create a new Range literal.
	 * @param start The range's start position.
	 * @param end The range's end position.
	 */
	export function create(start: Position, end: Position): Range;
	/**
	 * Create a new Range literal.
	 * @param startLine The start line number.
	 * @param startCharacter The start character.
	 * @param endLine The end line number.
	 * @param endCharacter The end character.
	 */
	export function create(startLine: uinteger, startCharacter: uinteger, endLine: uinteger, endCharacter: uinteger): Range;
	export function create(one: Position | uinteger, two: Position | uinteger, three?: uinteger, four?: uinteger): Range {
		if (Is.uinteger(one) && Is.uinteger(two) && Is.uinteger(three) && Is.uinteger(four)) {
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
	uri: DocumentUri;
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
	export function create(uri: DocumentUri, range: Range): Location {
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
	 * Represents the connection of two locations. Provides additional metadata over normal [locations](#Location),
	 * including an origin range.
 */
export interface LocationLink {
	/**
	 * Span of the origin of this link.
	 *
	 * Used as the underlined span for mouse definition hover. Defaults to the word range at
	 * the definition position.
	 */
	originSelectionRange?: Range;

	/**
	 * The target resource identifier of this link.
	 */
	targetUri: DocumentUri;

	/**
	 * The full target range of this link. If the target for example is a symbol then target range is the
	 * range enclosing this symbol not including leading/trailing whitespace but everything else
	 * like comments. This information is typically used to highlight the range in the editor.
	 */
	targetRange: Range;

	/**
	 * The range that should be selected and revealed when this link is being followed, e.g the name of a function.
	 * Must be contained by the the `targetRange`. See also `DocumentSymbol#range`
	 */
	targetSelectionRange: Range;
}

/**
 * The LocationLink namespace provides helper functions to work with
 * [LocationLink](#LocationLink) literals.
 */
export namespace LocationLink {

	/**
	 * Creates a LocationLink literal.
	 * @param targetUri The definition's uri.
	 * @param targetRange The full range of the definition.
	 * @param targetSelectionRange The span of the symbol definition at the target.
	 * @param originSelectionRange The span of the symbol being defined in the originating source file.
	 */
	export function create(targetUri: DocumentUri, targetRange: Range, targetSelectionRange: Range, originSelectionRange?: Range): LocationLink {
		return { targetUri, targetRange, targetSelectionRange, originSelectionRange };
	}

	/**
	 * Checks whether the given literal conforms to the [LocationLink](#LocationLink) interface.
	 */
	export function is(value: any): value is LocationLink {
		let candidate = value as LocationLink;
		return Is.defined(candidate) && Range.is(candidate.targetRange) && Is.string(candidate.targetUri)
			&& Range.is(candidate.targetSelectionRange)
			&& (Range.is(candidate.originSelectionRange) || Is.undefined(candidate.originSelectionRange));
	}
}

/**
 * Represents a color in RGBA space.
 */
export interface Color {

	/**
	 * The red component of this color in the range [0-1].
	 */
	readonly red: decimal;

	/**
	 * The green component of this color in the range [0-1].
	 */
	readonly green: decimal;

	/**
	 * The blue component of this color in the range [0-1].
	 */
	readonly blue: decimal;

	/**
	 * The alpha component of this color in the range [0-1].
	 */
	readonly alpha: decimal;
}

/**
 * The Color namespace provides helper functions to work with
 * [Color](#Color) literals.
 */
export namespace Color {
	/**
	 * Creates a new Color literal.
	 */
	export function create(red: decimal, green: decimal, blue: decimal, alpha: decimal): Color {
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
		return Is.objectLiteral(candidate) && Is.numberRange(candidate.red, 0, 1)
			&& Is.numberRange(candidate.green, 0, 1)
			&& Is.numberRange(candidate.blue, 0, 1)
			&& Is.numberRange(candidate.alpha, 0, 1);
	}
}

/**
 * Represents a color range from a document.
 */
export interface ColorInformation {

	/**
	 * The range in the document where this color appears.
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
		return Is.objectLiteral(candidate) && Range.is(candidate.range) && Color.is(candidate.color);
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
		return Is.objectLiteral(candidate) && Is.string(candidate.label)
			&& (Is.undefined(candidate.textEdit) || TextEdit.is(candidate))
			&& (Is.undefined(candidate.additionalTextEdits) || Is.typedArray(candidate.additionalTextEdits, TextEdit.is));
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
 * Represents a folding range. To be valid, start and end line must be bigger than zero and smaller
 * than the number of lines in the document. Clients are free to ignore invalid ranges.
 */
export interface FoldingRange {

	/**
	 * The zero-based start line of the range to fold. The folded area starts after the line's last character.
	 * To be valid, the end must be zero or larger and smaller than the number of lines in the document.
	 */
	startLine: uinteger;

	/**
	 * The zero-based character offset from where the folded range starts. If not defined, defaults to the length of the start line.
	 */
	startCharacter?: uinteger;

	/**
	 * The zero-based end line of the range to fold. The folded area ends with the line's last character.
	 * To be valid, the end must be zero or larger and smaller than the number of lines in the document.
	 */
	endLine: uinteger;

	/**
	 * The zero-based character offset before the folded range ends. If not defined, defaults to the length of the end line.
	 */
	endCharacter?: uinteger;

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
	export function create(startLine: uinteger, endLine: uinteger, startCharacter?: uinteger, endCharacter?: uinteger, kind?: string): FoldingRange {
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
		return Is.objectLiteral(candidate) && Is.uinteger(candidate.startLine) && Is.uinteger(candidate.startLine)
			&& (Is.undefined(candidate.startCharacter) || Is.uinteger(candidate.startCharacter))
			&& (Is.undefined(candidate.endCharacter) || Is.uinteger(candidate.endCharacter))
			&& (Is.undefined(candidate.kind) || Is.string(candidate.kind));
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
 * The diagnostic tags.
 *
 * @since 3.15.0
 */
export namespace DiagnosticTag {

	/**
	 * Unused or unnecessary code.
	 *
	 * Clients are allowed to render diagnostics with this tag faded out instead of having
	 * an error squiggle.
	 */
	export const Unnecessary: 1 = 1;

	/**
	 * Deprecated or obsolete code.
	 *
	 * Clients are allowed to rendered diagnostics with this tag strike through.
	 */
	export const Deprecated: 2 = 2;
}

export type DiagnosticTag = 1 | 2;

/**
 * Structure to capture a description for an error code.
 *
 * @since 3.16.0
 */
export interface CodeDescription {
	/**
	 * An URI to open with more information about the diagnostic error.
	 */
	href: URI;
}

/**
 * The CodeDescription namespace provides functions to deal with descriptions for diagnostic codes.
 *
 * @since 3.16.0
 */
export namespace CodeDescription {
	export function is(value: any): value is CodeDescription {
		const candidate: CodeDescription = value as CodeDescription;
		return Is.objectLiteral(candidate) && Is.string(candidate.href);
	}
}

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
	 * The diagnostic's code, which usually appear in the user interface.
	 */
	code?: integer | string;

	/**
	 * An optional property to describe the error code.
	 * Requires the code field (above) to be present/not null.
	 *
	 * @since 3.16.0
	 */
	codeDescription?: CodeDescription;

	/**
	 * A human-readable string describing the source of this
	 * diagnostic, e.g. 'typescript' or 'super lint'. It usually
	 * appears in the user interface.
	 */
	source?: string;

	/**
	 * The diagnostic's message. It usually appears in the user interface
	 */
	message: string;

	/**
	 * Additional metadata about the diagnostic.
	 *
	 * @since 3.15.0
	 */
	tags?: DiagnosticTag[];

	/**
	 * An array of related diagnostic information, e.g. when symbol-names within
	 * a scope collide all definitions can be marked via this property.
	 */
	relatedInformation?: DiagnosticRelatedInformation[];

	/**
	 * A data entry field that is preserved between a `textDocument/publishDiagnostics`
	 * notification and `textDocument/codeAction` request.
	 *
	 * @since 3.16.0
	 */
	data?: LSPAny;
}

/**
 * The Diagnostic namespace provides helper functions to work with
 * [Diagnostic](#Diagnostic) literals.
 */
export namespace Diagnostic {
	/**
	 * Creates a new Diagnostic literal.
	 */
	export function create(range: Range, message: string, severity?: DiagnosticSeverity, code?: integer | string, source?: string, relatedInformation?: DiagnosticRelatedInformation[]): Diagnostic {
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
			&& (Is.integer(candidate.code) || Is.string(candidate.code) || Is.undefined(candidate.code))
			&& (Is.undefined(candidate.codeDescription) || (Is.string(candidate.codeDescription?.href)))
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
	arguments?: LSPAny[];
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
 * Additional information that describes document changes.
 *
 * @since 3.16.0
 */
export interface ChangeAnnotation {
	/**
     * A human-readable string describing the actual change. The string
	 * is rendered prominent in the user interface.
     */
	label: string;

	/**
     * A flag which indicates that user confirmation is needed
	 * before applying the change.
     */
	needsConfirmation?: boolean;

	/**
	 * A human-readable string which is rendered less prominent in
	 * the user interface.
	 */
	description?: string;
}

export namespace ChangeAnnotation {
	export function create(label: string, needsConfirmation?: boolean, description?: string): ChangeAnnotation {
		const result: ChangeAnnotation = { label };
		if (needsConfirmation !== undefined) {
			result.needsConfirmation = needsConfirmation;
		}
		if (description !== undefined) {
			result.description = description;
		}
		return result;
	}
	export function is(value: any): value is ChangeAnnotation {
		const candidate = value as ChangeAnnotation;
		return Is.objectLiteral(candidate) && Is.string(candidate.label) &&
			(Is.boolean(candidate.needsConfirmation) || candidate.needsConfirmation === undefined) &&
			(Is.string(candidate.description) || candidate.description === undefined);
	}
}

export namespace ChangeAnnotationIdentifier {
	export function is(value: any): value is ChangeAnnotationIdentifier {
		const candidate = value as ChangeAnnotationIdentifier;
		return Is.string(candidate);
	}
}

/**
 * An identifier to refer to a change annotation stored with a workspace edit.
 */
export type ChangeAnnotationIdentifier = string;

/**
 * A special text edit with an additional change annotation.
 *
 * @since 3.16.0.
 */
export interface AnnotatedTextEdit extends TextEdit {
	/**
	 * The actual identifier of the change annotation
	 */
	annotationId: ChangeAnnotationIdentifier;
}

export namespace AnnotatedTextEdit {

	/**
	 * Creates an annotated replace text edit.
	 *
	 * @param range The range of text to be replaced.
	 * @param newText The new text.
	 * @param annotation The annotation.
	 */
	export function replace(range: Range, newText: string, annotation: ChangeAnnotationIdentifier): AnnotatedTextEdit {
		return { range, newText, annotationId: annotation };
	}
	/**
	 * Creates an annotated insert text edit.
	 *
	 * @param position The position to insert the text at.
	 * @param newText The text to be inserted.
	 * @param annotation The annotation.
	 */
	export function insert(position: Position, newText: string, annotation: ChangeAnnotationIdentifier): AnnotatedTextEdit {
		return { range: { start: position, end: position }, newText, annotationId: annotation };
	}
	/**
	 * Creates an annotated delete text edit.
	 *
	 * @param range The range of text to be deleted.
	 * @param annotation The annotation.
	 */
	export function del(range: Range, annotation: ChangeAnnotationIdentifier): AnnotatedTextEdit {
		return { range, newText: '', annotationId: annotation };
	}

	export function is(value: any): value is AnnotatedTextEdit {
		const candidate: AnnotatedTextEdit = value as AnnotatedTextEdit;
		return TextEdit.is(candidate) && (ChangeAnnotation.is(candidate.annotationId) || ChangeAnnotationIdentifier.is(candidate.annotationId));
	}
}


/**
 * Describes textual changes on a text document. A TextDocumentEdit describes all changes
 * on a document version Si and after they are applied move the document to version Si+1.
 * So the creator of a TextDocumentEdit doesn't need to sort the array of edits or do any
 * kind of ordering. However the edits must be non overlapping.
 */
export interface TextDocumentEdit {
	/**
	 * The text document to change.
	 */
	textDocument: OptionalVersionedTextDocumentIdentifier;

	/**
	 * The edits to be applied.
	 *
	 * @since 3.16.0 - support for AnnotatedTextEdit. This is guarded using a
	 * client capability.
	 */
	edits: (TextEdit | AnnotatedTextEdit)[];
}

/**
 * The TextDocumentEdit namespace provides helper function to create
 * an edit that manipulates a text document.
 */
export namespace TextDocumentEdit {
	/**
	 * Creates a new `TextDocumentEdit`
	 */
	export function create(textDocument: OptionalVersionedTextDocumentIdentifier, edits: (TextEdit | AnnotatedTextEdit)[]): TextDocumentEdit {
		return { textDocument, edits };
	}

	export function is(value: any): value is TextDocumentEdit {
		let candidate = value as TextDocumentEdit;
		return Is.defined(candidate)
			&& OptionalVersionedTextDocumentIdentifier.is(candidate.textDocument)
			&& Array.isArray(candidate.edits);
	}
}

/**
 * A generic resource operation.
 */
interface ResourceOperation {
	/**
	 * The resource operation kind.
	 */
	kind: string;

	/**
	 * An optional annotation identifier describing the operation.
	 *
	 * @since 3.16.0
	 */
	annotationId?: ChangeAnnotationIdentifier;
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
	uri: DocumentUri;

	/**
	 * Additional options
	 */
	options?: CreateFileOptions;
}

export namespace CreateFile {
	export function create(uri: DocumentUri, options?: CreateFileOptions, annotation?: ChangeAnnotationIdentifier): CreateFile {
		let result: CreateFile = {
			kind: 'create',
			uri
		};
		if (options !== undefined && (options.overwrite !== undefined || options.ignoreIfExists !== undefined)) {
			result.options = options;
		}
		if (annotation !== undefined) {
			result.annotationId = annotation;
		}
		return result;
	}

	export function is(value: any): value is CreateFile {
		let candidate: CreateFile = value;
		return candidate && candidate.kind === 'create' && Is.string(candidate.uri) && (
			candidate.options === undefined ||
			((candidate.options.overwrite === undefined || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === undefined || Is.boolean(candidate.options.ignoreIfExists)))
		) && (
			candidate.annotationId === undefined || ChangeAnnotationIdentifier.is(candidate.annotationId)
		);
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
	oldUri: DocumentUri;

	/**
	 * The new location.
	 */
	newUri: DocumentUri;

	/**
	 * Rename options.
	 */
	options?: RenameFileOptions;
}

export namespace RenameFile {
	export function create(oldUri: DocumentUri, newUri: DocumentUri, options?: RenameFileOptions, annotation?: ChangeAnnotationIdentifier): RenameFile {
		let result: RenameFile = {
			kind: 'rename',
			oldUri,
			newUri
		};
		if (options !== undefined && (options.overwrite !== undefined || options.ignoreIfExists !== undefined)) {
			result.options = options;
		}
		if (annotation !== undefined) {
			result.annotationId = annotation;
		}
		return result;
	}

	export function is(value: any): value is RenameFile {
		let candidate: RenameFile = value;
		return candidate && candidate.kind === 'rename' && Is.string(candidate.oldUri) && Is.string(candidate.newUri) && (
			candidate.options === undefined ||
			((candidate.options.overwrite === undefined || Is.boolean(candidate.options.overwrite)) && (candidate.options.ignoreIfExists === undefined || Is.boolean(candidate.options.ignoreIfExists)))
		) && (
			candidate.annotationId === undefined || ChangeAnnotationIdentifier.is(candidate.annotationId)
		);
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
	uri: DocumentUri;

	/**
	 * Delete options.
	 */
	options?: DeleteFileOptions;
}

export namespace DeleteFile {
	export function create(uri: DocumentUri, options?: DeleteFileOptions, annotation?: ChangeAnnotationIdentifier): DeleteFile {
		let result: DeleteFile = {
			kind: 'delete',
			uri
		};
		if (options !== undefined && (options.recursive !== undefined || options.ignoreIfNotExists !== undefined)) {
			result.options = options;
		}
		if (annotation !== undefined) {
			result.annotationId = annotation;
		}
		return result;
	}

	export function is(value: any): value is DeleteFile {
		let candidate: DeleteFile = value;
		return candidate && candidate.kind === 'delete' && Is.string(candidate.uri) && (
			candidate.options === undefined ||
			((candidate.options.recursive === undefined || Is.boolean(candidate.options.recursive)) && (candidate.options.ignoreIfNotExists === undefined || Is.boolean(candidate.options.ignoreIfNotExists)))
		) && (
			candidate.annotationId === undefined || ChangeAnnotationIdentifier.is(candidate.annotationId)
		);
	}
}

/**
 * A workspace edit represents changes to many resources managed in the workspace. The edit
 * should either provide `changes` or `documentChanges`. If documentChanges are present
 * they are preferred over `changes` if the client can handle versioned document edits.
 *
 * Since version 3.13.0 a workspace edit can contain resource operations as well. If resource
 * operations are present clients need to execute the operations in the order in which they
 * are provided. So a workspace edit for example can consist of the following two changes:
 * (1) a create file a.txt and (2) a text document edit which insert text into file a.txt.
 *
 * An invalid sequence (e.g. (1) delete file a.txt and (2) insert text into file a.txt) will
 * cause failure of the operation. How the client recovers from the failure is described by
 * the client capability: `workspace.workspaceEdit.failureHandling`
 */
export interface WorkspaceEdit {
	/**
	 * Holds changes to existing resources.
	 */
	changes?: { [uri: DocumentUri]: TextEdit[]; };

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


	/**
	 * A map of change annotations that can be referenced in `AnnotatedTextEdit`s or create, rename and
	 * delete file / folder operations.
	 *
	 * Whether clients honor this property depends on the client capability `workspace.changeAnnotationSupport`.
	 *
	 * @since 3.16.0
	 */
	changeAnnotations?: {
		[id: ChangeAnnotationIdentifier]: ChangeAnnotation;
	}
}

export namespace WorkspaceEdit {
	export function is(value: any): value is WorkspaceEdit {
		let candidate: WorkspaceEdit = value;
		return candidate &&
			(candidate.changes !== undefined || candidate.documentChanges !== undefined) &&
			(candidate.documentChanges === undefined || candidate.documentChanges.every((change) => {
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
	 *
	 * @since 3.16.0 - support for annotated text edits. This is usually
	 * guarded using a client capability.
	 */
	all(): (TextEdit | AnnotatedTextEdit)[];

	/**
	 * Clears the edits for this change.
	 */
	clear(): void;

	/**
	 * Adds a text edit.
	 *
	 * @param edit the text edit to add.
	 *
	 * @since 3.16.0 - support for annotated text edits. This is usually
	 * guarded using a client capability.
	 */
	add(edit: TextEdit | AnnotatedTextEdit): void;

	/**
	 * Insert the given text at the given position.
	 *
	 * @param position A position.
	 * @param newText A string.
	 * @param annotation An optional annotation.
	 */
	insert(position: Position, newText: string): void;
	insert(position: Position, newText: string, annotation: ChangeAnnotation | ChangeAnnotationIdentifier): ChangeAnnotationIdentifier;

	/**
	 * Replace the given range with given text for the given resource.
	 *
	 * @param range A range.
	 * @param newText A string.
	 * @param annotation An optional annotation.
	 */
	replace(range: Range, newText: string): void;
	replace(range: Range, newText: string, annotation?: ChangeAnnotation | ChangeAnnotationIdentifier): ChangeAnnotationIdentifier;

	/**
	 * Delete the text at the given range.
	 *
	 * @param range A range.
	 * @param annotation An optional annotation.
	 */
	delete(range: Range): void;
	delete(range: Range, annotation?: ChangeAnnotation | ChangeAnnotationIdentifier): ChangeAnnotationIdentifier;
}

class TextEditChangeImpl implements TextEditChange {

	private edits: (TextEdit | AnnotatedTextEdit)[];
	private changeAnnotations: ChangeAnnotations | undefined;

	public constructor(edits: (TextEdit | AnnotatedTextEdit)[], changeAnnotations?: ChangeAnnotations) {
		this.edits = edits;
		this.changeAnnotations = changeAnnotations;
	}

	public insert(position: Position, newText: string): void
	public insert(position: Position, newText: string, annotation: ChangeAnnotation | ChangeAnnotationIdentifier): ChangeAnnotationIdentifier;
	public insert(position: Position, newText: string, annotation?: ChangeAnnotation | ChangeAnnotationIdentifier): ChangeAnnotationIdentifier | void {
		let edit: TextEdit;
		let id: ChangeAnnotationIdentifier | undefined;
		if (annotation === undefined) {
			edit = TextEdit.insert(position, newText);
		} else if (ChangeAnnotationIdentifier.is(annotation)) {
			id = annotation;
			edit = AnnotatedTextEdit.insert(position, newText, annotation);
		} else {
			this.assertChangeAnnotations(this.changeAnnotations);
			id = this.changeAnnotations.manage(annotation);
			edit = AnnotatedTextEdit.insert(position, newText, id);
		}
		this.edits.push(edit);
		if (id !== undefined) {
			return id;
		}
	}

	public replace(range: Range, newText: string): void;
	public replace(range: Range, newText: string, annotation: ChangeAnnotation | ChangeAnnotationIdentifier): ChangeAnnotationIdentifier;
	public replace(range: Range, newText: string, annotation?: ChangeAnnotation | ChangeAnnotationIdentifier): ChangeAnnotationIdentifier | void {
		let edit: TextEdit;
		let id: ChangeAnnotationIdentifier | undefined;
		if (annotation === undefined) {
			edit = TextEdit.replace(range, newText);
		} else if (ChangeAnnotationIdentifier.is(annotation)) {
			id = annotation;
			edit = AnnotatedTextEdit.replace(range, newText, annotation);
		} else {
			this.assertChangeAnnotations(this.changeAnnotations);
			id = this.changeAnnotations.manage(annotation);
			edit = AnnotatedTextEdit.replace(range, newText, id);
		}
		this.edits.push(edit);
		if (id !== undefined) {
			return id;
		}
	}

	public delete(range: Range): void;
	public delete(range: Range, annotation: ChangeAnnotation | ChangeAnnotationIdentifier): ChangeAnnotationIdentifier;
	public delete(range: Range, annotation?: ChangeAnnotation | ChangeAnnotationIdentifier): ChangeAnnotationIdentifier | void {
		let edit: TextEdit;
		let id: ChangeAnnotationIdentifier | undefined;
		if (annotation === undefined) {
			edit = TextEdit.del(range);
		} else if (ChangeAnnotationIdentifier.is(annotation)) {
			id = annotation;
			edit = AnnotatedTextEdit.del(range, annotation);
		} else {
			this.assertChangeAnnotations(this.changeAnnotations);
			id = this.changeAnnotations.manage(annotation);
			edit = AnnotatedTextEdit.del(range, id);
		}
		this.edits.push(edit);
		if (id !== undefined) {
			return id;
		}
	}

	public add(edit: TextEdit | AnnotatedTextEdit): void {
		this.edits.push(edit);
	}

	public all(): (TextEdit | AnnotatedTextEdit)[] {
		return this.edits;
	}

	public clear(): void {
		this.edits.splice(0, this.edits.length);
	}

	private assertChangeAnnotations(value: ChangeAnnotations | undefined): asserts value is ChangeAnnotations {
		if (value === undefined) {
			throw new Error(`Text edit change is not configured to manage change annotations.`);
		}
	}
}

/**
 * A helper class
 */
class ChangeAnnotations {

	private _annotations: { [id: ChangeAnnotationIdentifier]: ChangeAnnotation };
	private _counter: number;
	private _size: number;

	public constructor(annotations?: { [id: string]: ChangeAnnotation }) {
		this._annotations = annotations === undefined ? Object.create(null) : annotations;
		this._counter = 0;
		this._size = 0;
	}

	public all(): { [id: string]: ChangeAnnotation } {
		return this._annotations;
	}

	public get size(): number {
		return this._size;
	}

	public manage(annotation: ChangeAnnotation): ChangeAnnotationIdentifier;
	public manage(id: ChangeAnnotationIdentifier, annotation: ChangeAnnotation): ChangeAnnotationIdentifier;
	public manage(idOrAnnotation: ChangeAnnotationIdentifier | ChangeAnnotation, annotation?: ChangeAnnotation): ChangeAnnotationIdentifier {
		let id: ChangeAnnotationIdentifier;
		if (ChangeAnnotationIdentifier.is(idOrAnnotation)) {
			id = idOrAnnotation;
		} else {
			id = this.nextId();
			annotation = idOrAnnotation;
		}
		if (this._annotations[id] !== undefined) {
			throw new Error(`Id ${id} is already in use.`);
		}
		if (annotation === undefined) {
			throw new Error(`No annotation provided for id ${id}`);
		}
		this._annotations[id] = annotation;
		this._size++;
		return id;
	}

	private nextId(): ChangeAnnotationIdentifier {
		this._counter++;
		return this._counter.toString();
	}
}

/**
 * A workspace change helps constructing changes to a workspace.
 */
export class WorkspaceChange {
	private _workspaceEdit: WorkspaceEdit;
	private _textEditChanges: { [uri: DocumentUri]: TextEditChange };
	private _changeAnnotations: ChangeAnnotations | undefined;

	constructor(workspaceEdit?: WorkspaceEdit) {
		this._textEditChanges = Object.create(null);
		if (workspaceEdit !== undefined) {
			this._workspaceEdit = workspaceEdit;
			if (workspaceEdit.documentChanges) {
				this._changeAnnotations = new ChangeAnnotations(workspaceEdit.changeAnnotations);
				workspaceEdit.changeAnnotations = this._changeAnnotations.all();
				workspaceEdit.documentChanges.forEach((change) => {
					if (TextDocumentEdit.is(change)) {
						const textEditChange = new TextEditChangeImpl(change.edits, this._changeAnnotations!);
						this._textEditChanges[change.textDocument.uri] = textEditChange;
					}
				});
			} else if (workspaceEdit.changes) {
				Object.keys(workspaceEdit.changes).forEach((key) => {
					const textEditChange = new TextEditChangeImpl(workspaceEdit.changes![key]);
					this._textEditChanges[key] = textEditChange;
				});
			}
		} else {
			this._workspaceEdit = {
			};
		}
	}

	/**
	 * Returns the underlying [WorkspaceEdit](#WorkspaceEdit) literal
	 * use to be returned from a workspace edit operation like rename.
	 */
	public get edit(): WorkspaceEdit {
		this.initDocumentChanges();
		if (this._changeAnnotations !== undefined) {
			if (this._changeAnnotations.size === 0) {
				this._workspaceEdit.changeAnnotations = undefined;
			} else {
				this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
			}
		}
		return this._workspaceEdit;
	}

	/**
	 * Returns the [TextEditChange](#TextEditChange) to manage text edits
	 * for resources.
	 */
	public getTextEditChange(textDocument: OptionalVersionedTextDocumentIdentifier): TextEditChange;
	public getTextEditChange(uri: DocumentUri): TextEditChange;
	public getTextEditChange(key: DocumentUri | OptionalVersionedTextDocumentIdentifier): TextEditChange {
		if (OptionalVersionedTextDocumentIdentifier.is(key)) {
			this.initDocumentChanges();
			if (this._workspaceEdit.documentChanges === undefined) {
				throw new Error('Workspace edit is not configured for document changes.');
			}
			const textDocument: OptionalVersionedTextDocumentIdentifier = { uri: key.uri, version: key.version };
			let result: TextEditChange = this._textEditChanges[textDocument.uri];
			if (!result) {
				const edits: (TextEdit | AnnotatedTextEdit)[] = [];
				const textDocumentEdit: TextDocumentEdit = {
					textDocument,
					edits
				};
				this._workspaceEdit.documentChanges.push(textDocumentEdit);
				result = new TextEditChangeImpl(edits, this._changeAnnotations);
				this._textEditChanges[textDocument.uri] = result;
			}
			return result;
		} else {
			this.initChanges();
			if (this._workspaceEdit.changes === undefined) {
				throw new Error('Workspace edit is not configured for normal text edit changes.');
			}
			let result: TextEditChange = this._textEditChanges[key];
			if (!result) {
				let edits: (TextEdit | AnnotatedTextEdit)[] = [];
				this._workspaceEdit.changes[key] = edits;
				result = new TextEditChangeImpl(edits);
				this._textEditChanges[key] = result;
			}
			return result;
		}
	}

	private initDocumentChanges(): void {
		if (this._workspaceEdit.documentChanges === undefined && this._workspaceEdit.changes === undefined) {
			this._changeAnnotations = new ChangeAnnotations();
			this._workspaceEdit.documentChanges = [];
			this._workspaceEdit.changeAnnotations = this._changeAnnotations.all();
		}
	}

	private initChanges(): void {
		if (this._workspaceEdit.documentChanges === undefined && this._workspaceEdit.changes === undefined) {
			this._workspaceEdit.changes = Object.create(null);
		}
	}

	public createFile(uri: DocumentUri, options?: CreateFileOptions): void;
	public createFile(uri: DocumentUri, annotation: ChangeAnnotation | ChangeAnnotationIdentifier, options?: CreateFileOptions): ChangeAnnotationIdentifier;
	public createFile(uri: DocumentUri, optionsOrAnnotation?: CreateFileOptions | ChangeAnnotation | ChangeAnnotationIdentifier, options?: CreateFileOptions): ChangeAnnotationIdentifier | void {
		this.initDocumentChanges();
		if (this._workspaceEdit.documentChanges === undefined) {
			throw new Error('Workspace edit is not configured for document changes.');
		}
		let annotation: ChangeAnnotation | ChangeAnnotationIdentifier | undefined;
		if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
			annotation = optionsOrAnnotation;
		} else {
			options = optionsOrAnnotation;
		}

		let operation: CreateFile;
		let id: ChangeAnnotationIdentifier | undefined;
		if (annotation === undefined) {
			operation = CreateFile.create(uri, options);
		} else {
			id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations!.manage(annotation);
			operation = CreateFile.create(uri, options, id);
		}
		this._workspaceEdit.documentChanges.push(operation);
		if (id !== undefined) {
			return id;
		}
	}

	public renameFile(oldUri: DocumentUri, newUri: DocumentUri, options?: RenameFileOptions): void;
	public renameFile(oldUri: DocumentUri, newUri: DocumentUri, annotation?: ChangeAnnotation | ChangeAnnotationIdentifier, options?: RenameFileOptions): ChangeAnnotationIdentifier;
	public renameFile(oldUri: DocumentUri, newUri: DocumentUri, optionsOrAnnotation?: RenameFileOptions | ChangeAnnotation | ChangeAnnotationIdentifier, options?: RenameFileOptions): ChangeAnnotationIdentifier | void {
		this.initDocumentChanges();
		if (this._workspaceEdit.documentChanges === undefined) {
			throw new Error('Workspace edit is not configured for document changes.');
		}
		let annotation: ChangeAnnotation | ChangeAnnotationIdentifier | undefined;
		if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
			annotation = optionsOrAnnotation;
		} else {
			options = optionsOrAnnotation;
		}

		let operation: RenameFile;
		let id: ChangeAnnotationIdentifier | undefined;
		if (annotation === undefined) {
			operation = RenameFile.create(oldUri, newUri, options);
		} else {
			id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations!.manage(annotation);
			operation = RenameFile.create(oldUri, newUri, options, id);
		}
		this._workspaceEdit.documentChanges.push(operation);
		if (id !== undefined) {
			return id;
		}
	}

	public deleteFile(uri: DocumentUri, options?: DeleteFileOptions): void;
	public deleteFile(uri: DocumentUri, annotation: ChangeAnnotation | ChangeAnnotationIdentifier, options?: DeleteFileOptions): ChangeAnnotationIdentifier;
	public deleteFile(uri: DocumentUri, optionsOrAnnotation?: DeleteFileOptions | ChangeAnnotation | ChangeAnnotationIdentifier, options?: DeleteFileOptions): ChangeAnnotationIdentifier | void {
		this.initDocumentChanges();
		if (this._workspaceEdit.documentChanges === undefined) {
			throw new Error('Workspace edit is not configured for document changes.');
		}
		let annotation: ChangeAnnotation | ChangeAnnotationIdentifier | undefined;
		if (ChangeAnnotation.is(optionsOrAnnotation) || ChangeAnnotationIdentifier.is(optionsOrAnnotation)) {
			annotation = optionsOrAnnotation;
		} else {
			options = optionsOrAnnotation;
		}

		let operation: DeleteFile;
		let id: ChangeAnnotationIdentifier | undefined;
		if (annotation === undefined) {
			operation = DeleteFile.create(uri, options);
		} else {
			id = ChangeAnnotationIdentifier.is(annotation) ? annotation : this._changeAnnotations!.manage(annotation);
			operation = DeleteFile.create(uri, options, id);
		}
		this._workspaceEdit.documentChanges.push(operation);
		if (id !== undefined) {
			return id;
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
	uri: DocumentUri;
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
	export function create(uri: DocumentUri): TextDocumentIdentifier {
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
 * A text document identifier to denote a specific version of a text document.
 */
export interface VersionedTextDocumentIdentifier extends TextDocumentIdentifier {
	/**
	 * The version number of this document.
	 */
	version: integer;
}

/**
 * The VersionedTextDocumentIdentifier namespace provides helper functions to work with
 * [VersionedTextDocumentIdentifier](#VersionedTextDocumentIdentifier) literals.
 */
export namespace VersionedTextDocumentIdentifier {
	/**
	 * Creates a new VersionedTextDocumentIdentifier literal.
	 * @param uri The document's uri.
	 * @param version The document's version.
	 */
	export function create(uri: DocumentUri, version: integer): VersionedTextDocumentIdentifier {
		return { uri, version };
	}

	/**
	 * Checks whether the given literal conforms to the [VersionedTextDocumentIdentifier](#VersionedTextDocumentIdentifier) interface.
	 */
	export function is(value: any): value is VersionedTextDocumentIdentifier {
		let candidate = value as VersionedTextDocumentIdentifier;
		return Is.defined(candidate) && Is.string(candidate.uri) && Is.integer(candidate.version);
	}
}

/**
 * A text document identifier to optionally denote a specific version of a text document.
 */
export interface OptionalVersionedTextDocumentIdentifier extends TextDocumentIdentifier {
	/**
	 * The version number of this document. If a versioned text document identifier
	 * is sent from the server to the client and the file is not open in the editor
	 * (the server has not received an open notification before) the server can send
	 * `null` to indicate that the version is unknown and the content on disk is the
	 * truth (as specified with document content ownership).
	 */
	version: integer | null;
}

/**
 * The OptionalVersionedTextDocumentIdentifier namespace provides helper functions to work with
 * [OptionalVersionedTextDocumentIdentifier](#OptionalVersionedTextDocumentIdentifier) literals.
 */
export namespace OptionalVersionedTextDocumentIdentifier {
	/**
	 * Creates a new OptionalVersionedTextDocumentIdentifier literal.
	 * @param uri The document's uri.
	 * @param version The document's version.
	 */
	export function create(uri: DocumentUri, version: integer | null): OptionalVersionedTextDocumentIdentifier {
		return { uri, version };
	}

	/**
	 * Checks whether the given literal conforms to the [OptionalVersionedTextDocumentIdentifier](#OptionalVersionedTextDocumentIdentifier) interface.
	 */
	export function is(value: any): value is OptionalVersionedTextDocumentIdentifier {
		let candidate = value as OptionalVersionedTextDocumentIdentifier;
		return Is.defined(candidate) && Is.string(candidate.uri) && (candidate.version === null || Is.integer(candidate.version));
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
	uri: DocumentUri;

	/**
	 * The text document's language identifier
	 */
	languageId: string;

	/**
	 * The version number of this document (it will increase after each
	 * change, including undo/redo).
	 */
	version: integer;

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
	export function create(uri: DocumentUri, languageId: string, version: integer, text: string): TextDocumentItem {
		return { uri, languageId, version, text };
	}

	/**
	 * Checks whether the given literal conforms to the [TextDocumentItem](#TextDocumentItem) interface.
	 */
	export function is(value: any): value is TextDocumentItem {
		let candidate = value as TextDocumentItem;
		return Is.defined(candidate) && Is.string(candidate.uri) && Is.string(candidate.languageId) && Is.integer(candidate.version) && Is.string(candidate.text);
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
	 * See also: https://microsoft.github.io/language-server-protocol/specifications/specification-current/#snippet_syntax
	 */
	export const Snippet: 2 = 2;
}

export type InsertTextFormat = 1 | 2;


/**
 * Completion item tags are extra annotations that tweak the rendering of a completion
 * item.
 *
 * @since 3.15.0
 */
export namespace CompletionItemTag {
	/**
	 * Render a completion as obsolete, usually using a strike-out.
	 */
	export const Deprecated = 1;
}

export type CompletionItemTag = 1;

/**
 * A special text edit to provide an insert and a replace operation.
 *
 * @since 3.16.0
 */
export interface InsertReplaceEdit {
	/**
	 * The string to be inserted.
	 */
	newText: string;

	/**
	 * The range if the insert is requested
	 */
	insert: Range;

	/**
	 * The range if the replace is requested.
	 */
	replace: Range;
}

/**
 * The InsertReplaceEdit namespace provides functions to deal with insert / replace edits.
 *
 * @since 3.16.0
 */
export namespace InsertReplaceEdit {

	/**
	 * Creates a new insert / replace edit
	 */
	export function create(newText: string, insert: Range, replace: Range): InsertReplaceEdit {
		return { newText, insert, replace };
	}

	/**
	 * Checks whether the given literal conforms to the [InsertReplaceEdit](#InsertReplaceEdit) interface.
	 */
	export function is(value: TextEdit | InsertReplaceEdit): value is InsertReplaceEdit {
		const candidate: InsertReplaceEdit = value as InsertReplaceEdit;
		return candidate && Is.string(candidate.newText) && Range.is(candidate.insert) && Range.is(candidate.replace);
	}
}

/**
 * How whitespace and indentation is handled during completion
 * item insertion.
 *
 * @since 3.16.0
 */
export namespace InsertTextMode {
	/**
	 * The insertion or replace strings is taken as it is. If the
	 * value is multi line the lines below the cursor will be
	 * inserted using the indentation defined in the string value.
	 * The client will not apply any kind of adjustments to the
	 * string.
	 */
	export const asIs: 1 = 1;

	/**
	 * The editor adjusts leading whitespace of new lines so that
	 * they match the indentation up to the cursor of the line for
	 * which the item is accepted.
	 *
	 * Consider a line like this: <2tabs><cursor><3tabs>foo. Accepting a
	 * multi line completion item is indented using 2 tabs and all
	 * following lines inserted will be indented using 2 tabs as well.
	 */
	export const adjustIndentation: 2 = 2;
}

export type InsertTextMode = 1 | 2;

/**
 * Additional details for a completion item label.
 *
 * @since 3.17.0 - proposed state
 */
export interface CompletionItemLabelDetails {
	/**
	 * An optional string which is rendered less prominently directly after {@link CompletionItem.label label},
	 * without any spacing. Should be used for function signatures or type annotations.
	 */
	detail?: string;

	/**
	 * An optional string which is rendered less prominently after {@link CompletionItem.detail}. Should be used
	 * for fully qualified names or file path.
	 */
	description?: string;
}

export namespace CompletionItemLabelDetails {
	export function is(value: any): value is CompletionItemLabelDetails {
		const candidate = value as CompletionItemLabelDetails;
		return candidate && (Is.string(candidate.detail) || candidate.detail === undefined) &&
			(Is.string(candidate.description) || candidate.description === undefined);
	}
}

/**
 * A completion item represents a text snippet that is
 * proposed to complete text that is being typed.
 */
export interface CompletionItem {

	/**
	 * The label of this completion item.
	 *
	 * The label property is also by default the text that
	 * is inserted when selecting this completion.
	 *
	 * If label details are provided the label itself should
	 * be an unqualified name of the completion item.
	 */
	label: string;

	/**
	 * Additional details for the label
	 *
	 * @since 3.17.0 - proposed state
	 */
	labelDetails?: CompletionItemLabelDetails;

	/**
	 * The kind of this completion item. Based of the kind
	 * an icon is chosen by the editor.
	 */
	kind?: CompletionItemKind;

	/**
	 * Tags for this completion item.
	 *
	 * @since 3.15.0
	 */
	tags?: CompletionItemTag[];

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
	 * @deprecated Use `tags` instead.
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
	 */
	insertText?: string;

	/**
	 * The format of the insert text. The format applies to both the `insertText` property
	 * and the `newText` property of a provided `textEdit`. If omitted defaults to
	 * `InsertTextFormat.PlainText`.
	 *
	 * Please note that the insertTextFormat doesn't apply to `additionalTextEdits`.
	 */
	insertTextFormat?: InsertTextFormat;

	/**
	 * How whitespace and indentation is handled during completion
	 * item insertion. If ignored the clients default value depends on
	 * the `textDocument.completion.insertTextMode` client capability.
	 *
	 * @since 3.16.0
	 */
	insertTextMode?: InsertTextMode;

	/**
	 * An [edit](#TextEdit) which is applied to a document when selecting
	 * this completion. When an edit is provided the value of
	 * [insertText](#CompletionItem.insertText) is ignored.
	 *
	 * Most editors support two different operation when accepting a completion item. One is to insert a
	 * completion text and the other is to replace an existing text with a completion text. Since this can
	 * usually not predetermined by a server it can report both ranges. Clients need to signal support for
	 * `InsertReplaceEdits` via the `textDocument.completion.insertReplaceSupport` client capability
	 * property.
	 *
	 * *Note 1:* The text edit's range as well as both ranges from a insert replace edit must be a
	 * [single line] and they must contain the position at which completion has been requested.
	 * *Note 2:* If an `InsertReplaceEdit` is returned the edit's insert range must be a prefix of
	 * the edit's replace range, that means it must be contained and starting at the same position.
	 *
	 * @since 3.16.0 additional type `InsertReplaceEdit`
	 */
	textEdit?: TextEdit | InsertReplaceEdit;

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
	 * A data entry field that is preserved on a completion item between a
	 * [CompletionRequest](#CompletionRequest) and a [CompletionResolveRequest](#CompletionResolveRequest).
	 */
	data?: LSPAny;
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
	 * In many cases the items of an actual completion result share the same
	 * value for properties like `commitCharacters` or the range of a text
	 * edit. A completion list can therefore define item defaults which will
	 * be used if a completion item itself doesn't specify the value.
	 *
	 * If a completion list specifies a default value and a completion item
	 * also specifies a corresponding value the one from the item is used.
	 *
	 * Servers are only allowed to return default values if the client
	 * signals support for this via the `completionList.itemDefaults`
	 * capability.
	 *
	 * @since 3.17.0 - proposed state
	 */
	itemDefaults?: {
		/**
		 * A default commit character set.
		 *
		 * @since 3.17.0 - proposed state
		 */
		commitCharacters?: string[];

		/**
		 * A default edit range
		 *
		 * @since 3.17.0 - proposed state
		 */
		editRange?: Range | {
			insert: Range;
			replace: Range;
		};

		/**
		 * A default insert text format
		 *
		 * @since 3.17.0 - proposed state
		 */
		insertTextFormat?: InsertTextFormat;

		/**
		 * A default insert text mode
		 *
		 * @since 3.17.0 - proposed state
		 */
		insertTextMode?: InsertTextMode;
	}

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
		return plainText.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&'); // escape markdown syntax tokens: http://daringfireball.net/projects/markdown/syntax#backslash
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
		return !!candidate && Is.objectLiteral(candidate) && (
			MarkupContent.is(candidate.contents) ||
			MarkedString.is(candidate.contents) ||
			Is.typedArray(candidate.contents, MarkedString.is)
		) && (
			value.range === undefined || Range.is(value.range)
		);
	}
}

/**
 * Represents a parameter of a callable-signature. A parameter can
 * have a label and a doc-comment.
 */
export interface ParameterInformation {

	/**
	 * The label of this parameter information.
	 *
	 * Either a string or an inclusive start and exclusive end offsets within its containing
	 * signature label. (see SignatureInformation.label). The offsets are based on a UTF-16
	 * string representation as `Position` and `Range` does.
	 *
	 * *Note*: a label of type string should be a substring of its containing signature label.
	 * Its intended use case is to highlight the parameter label part in the `SignatureInformation.label`.
	 */
	label: string | [uinteger, uinteger];

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
	export function create(label: string | [uinteger, uinteger], documentation?: string): ParameterInformation {
		return documentation ? { label, documentation } : { label };
	}
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

	/**
	 * The index of the active parameter.
	 *
	 * If provided, this is used in place of `SignatureHelp.activeParameter`.
	 *
	 * @since 3.16.0
	 */
	activeParameter?: uinteger;
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
	 * The active signature. If omitted or the value lies outside the
	 * range of `signatures` the value defaults to zero or is ignored if
	 * the `SignatureHelp` has no signatures.
	 *
	 * Whenever possible implementors should make an active decision about
	 * the active signature and shouldn't rely on a default value.
	 *
	 * In future version of the protocol this property might become
	 * mandatory to better express this.
	 */
	activeSignature?: uinteger;

	/**
	 * The active parameter of the active signature. If omitted or the value
	 * lies outside the range of `signatures[activeSignature].parameters`
	 * defaults to 0 if the active signature has parameters. If
	 * the active signature has no parameters it is ignored.
	 * In future version of the protocol this property might become
	 * mandatory to better express the active parameter if the
	 * active signature does have any.
	 */
	 activeParameter?: uinteger;
}

/**
 * The definition of a symbol represented as one or many [locations](#Location).
 * For most programming languages there is only one location at which a symbol is
 * defined.
 *
 * Servers should prefer returning `DefinitionLink` over `Definition` if supported
 * by the client.
 */
export type Definition = Location | Location[];

/**
 * Information about where a symbol is defined.
 *
 * Provides additional metadata over normal [location](#Location) definitions, including the range of
 * the defining symbol
 */
export type DefinitionLink = LocationLink;

/**
 * The declaration of a symbol representation as one or many [locations](#Location).
 */
export type Declaration = Location | Location[];

/**
 * Information about where a symbol is declared.
 *
 * Provides additional metadata over normal [location](#Location) declarations, including the range of
 * the declaring symbol.
 *
 * Servers should prefer returning `DeclarationLink` over `Declaration` if supported
 * by the client.
 */
export type DeclarationLink = LocationLink;

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
	 * @param kind The highlight kind
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
 * Symbol tags are extra annotations that tweak the rendering of a symbol.
 * @since 3.16
 */
export namespace SymbolTag {

	/**
	 * Render a symbol as obsolete, usually using a strike-out.
	 */
	export const Deprecated: 1 = 1;
}

export type SymbolTag = 1;


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
	 * Tags for this completion item.
	 *
	 * @since 3.16.0
	 */
	tags?: SymbolTag[];

	/**
	 * Indicates if this symbol is deprecated.
	 *
	 * @deprecated Use tags instead
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
	 * @param uri The resource of the location of symbol.
	 * @param containerName The name of the symbol containing the symbol.
	 */
	export function create(name: string, kind: SymbolKind, range: Range, uri: DocumentUri, containerName?: string): SymbolInformation {
		let result: SymbolInformation = {
			name,
			kind,
			location: { uri, range }
		};
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
export interface DocumentSymbol {

	/**
	 * The name of this symbol. Will be displayed in the user interface and therefore must not be
	 * an empty string or a string only consisting of white spaces.
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
	 * Tags for this document symbol.
	 *
	 * @since 3.16.0
	 */
	tags?: SymbolTag[];

	/**
	 * Indicates if this symbol is deprecated.
	 *
	 * @deprecated Use tags instead
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
		if (children !== undefined) {
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
			(candidate.detail === undefined || Is.string(candidate.detail)) &&
			(candidate.deprecated === undefined || Is.boolean(candidate.deprecated)) &&
			(candidate.children === undefined || Array.isArray(candidate.children)) &&
			(candidate.tags === undefined || Array.isArray(candidate.tags));
	}
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
	 * Empty kind.
	 */
	export const Empty: CodeActionKind = '';

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

	/**
	 * Base kind for auto-fix source actions: `source.fixAll`.
	 *
	 * Fix all actions automatically fix errors that have a clear fix that do not require user input.
	 * They should not suppress errors or perform unsafe fixes such as generating new types or classes.
	 *
	 * @since 3.15.0
	 */
	export const SourceFixAll: CodeActionKind = 'source.fixAll';
}

/**
 * The reason why code actions were requested.
 *
 * @since 3.17.0 - proposed state
 */
export namespace CodeActionTriggerKind {
	/**
	 * Code actions were explicitly requested by the user or by an extension.
	 */
	export const Invoked: 1 = 1;

	/**
	 * Code actions were requested automatically.
	 *
	 * This typically happens when current selection in a file changes, but can
	 * also be triggered when file content changes.
	 */
	export const Automatic: 2 = 2;
}

export type CodeActionTriggerKind = 1 | 2;


/**
 * Contains additional diagnostic information about the context in which
 * a [code action](#CodeActionProvider.provideCodeActions) is run.
 */
export interface CodeActionContext {
	/**
	 * An array of diagnostics known on the client side overlapping the range provided to the
	 * `textDocument/codeAction` request. They are provided so that the server knows which
	 * errors are currently presented to the user for the given range. There is no guarantee
	 * that these accurately reflect the error state of the resource. The primary parameter
	 * to compute code actions is the provided range.
	 */
	diagnostics: Diagnostic[];

	/**
	 * Requested kind of actions to return.
	 *
	 * Actions not of this kind are filtered out by the client before being shown. So servers
	 * can omit computing them.
	 */
	only?: CodeActionKind[];

	/**
	 * The reason why code actions were requested.
	 *
	 * @since 3.17.0
	 */
	triggerKind?: CodeActionTriggerKind;
}

/**
 * The CodeActionContext namespace provides helper functions to work with
 * [CodeActionContext](#CodeActionContext) literals.
 */
export namespace CodeActionContext {
	/**
	 * Creates a new CodeActionContext literal.
	 */
	export function create(diagnostics: Diagnostic[], only?: CodeActionKind[], triggerKind?: CodeActionTriggerKind): CodeActionContext {
		let result: CodeActionContext = { diagnostics };
		if (only !== undefined && only !== null) {
			result.only = only;
		}
		if (triggerKind !== undefined && triggerKind !== null) {
			result.triggerKind = triggerKind;
		}
		return result;
	}
	/**
	 * Checks whether the given literal conforms to the [CodeActionContext](#CodeActionContext) interface.
	 */
	export function is(value: any): value is CodeActionContext {
		let candidate = value as CodeActionContext;
		return Is.defined(candidate) && Is.typedArray<Diagnostic[]>(candidate.diagnostics, Diagnostic.is)
			&& (candidate.only === undefined || Is.typedArray(candidate.only, Is.string))
			&& (candidate.triggerKind === undefined || candidate.triggerKind === CodeActionTriggerKind.Invoked || candidate.triggerKind === CodeActionTriggerKind.Automatic);
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
	 * Marks this as a preferred action. Preferred actions are used by the `auto fix` command and can be targeted
	 * by keybindings.
	 *
	 * A quick fix should be marked preferred if it properly addresses the underlying error.
	 * A refactoring should be marked preferred if it is the most reasonable choice of actions to take.
	 *
	 * @since 3.15.0
	 */
	isPreferred?: boolean;

	/**
	 * Marks that the code action cannot currently be applied.
	 *
	 * Clients should follow the following guidelines regarding disabled code actions:
	 *
	 *   - Disabled code actions are not shown in automatic [lightbulb](https://code.visualstudio.com/docs/editor/editingevolved#_code-action)
	 *     code action menu.
	 *
	 *   - Disabled actions are shown as faded out in the code action menu when the user request a more specific type
	 *     of code action, such as refactorings.
	 *
	 *   - If the user has a [keybinding](https://code.visualstudio.com/docs/editor/refactoring#_keybindings-for-code-actions)
	 *     that auto applies a code action and only a disabled code actions are returned, the client should show the user an
	 *     error message with `reason` in the editor.
	 *
	 * @since 3.16.0
	 */
	disabled?: {

		/**
		 * Human readable description of why the code action is currently disabled.
		 *
		 * This is displayed in the code actions UI.
		 */
		reason: string;
	};

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

	/**
	 * A data entry field that is preserved on a code action between
	 * a `textDocument/codeAction` and a `codeAction/resolve` request.
	 *
	 * @since 3.16.0
	 */
	data?: LSPAny;
}

export namespace CodeAction {
	/**
	 * Creates a new code action.
	 *
	 * @param title The title of the code action.
	 * @param kind The kind of the code action.
	 */
	export function create(title: string, kind?: CodeActionKind): CodeAction;

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
	 * @param edit The edit to perform.
	 * @param kind The kind of the code action.
	 */
	export function create(title: string, edit: WorkspaceEdit, kind?: CodeActionKind): CodeAction;

	export function create(title: string, kindOrCommandOrEdit?: CodeActionKind | Command | WorkspaceEdit, kind?: CodeActionKind): CodeAction {
		let result: CodeAction = { title };
		let checkKind: boolean = true;
		if (typeof kindOrCommandOrEdit === 'string') {
			checkKind = false;
			result.kind = kindOrCommandOrEdit;
		} else if (Command.is(kindOrCommandOrEdit)) {
			result.command = kindOrCommandOrEdit;
		} else {
			result.edit = kindOrCommandOrEdit;
		}
		if (checkKind && kind !== undefined) {
			result.kind = kind;
		}
		return result;
	}
	export function is(value: any): value is CodeAction {
		let candidate: CodeAction = value;
		return candidate && Is.string(candidate.title) &&
			(candidate.diagnostics === undefined || Is.typedArray(candidate.diagnostics, Diagnostic.is)) &&
			(candidate.kind === undefined || Is.string(candidate.kind)) &&
			(candidate.edit !== undefined || candidate.command !== undefined) &&
			(candidate.command === undefined || Command.is(candidate.command)) &&
			(candidate.isPreferred === undefined || Is.boolean(candidate.isPreferred)) &&
			(candidate.edit === undefined || WorkspaceEdit.is(candidate.edit));
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
	 * A data entry field that is preserved on a code lens item between
	 * a [CodeLensRequest](#CodeLensRequest) and a [CodeLensResolveRequest]
	 * (#CodeLensResolveRequest)
	 */
	data?: LSPAny;
}

/**
 * The CodeLens namespace provides helper functions to work with
 * [CodeLens](#CodeLens) literals.
 */
export namespace CodeLens {
	/**
	 * Creates a new CodeLens literal.
	 */
	export function create(range: Range, data?: LSPAny): CodeLens {
		let result: CodeLens = { range };
		if (Is.defined(data)) { result.data = data; }
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
	tabSize: uinteger;

	/**
	 * Prefer spaces over tabs.
	 */
	insertSpaces: boolean;

	/**
	 * Trim trailing whitespaces on a line.
	 *
	 * @since 3.15.0
	 */
	trimTrailingWhitespace?: boolean;

	/**
	 * Insert a newline character at the end of the file if one does not exist.
	 *
	 * @since 3.15.0
	 */
	insertFinalNewline?: boolean;

	/**
	 * Trim all newlines after the final newline at the end of the file.
	 *
	 * @since 3.15.0
	 */
	trimFinalNewlines?: boolean;

	/**
	 * Signature for further properties.
	 */
	[key: string]: boolean | integer | string | undefined;
}

/**
 * The FormattingOptions namespace provides helper functions to work with
 * [FormattingOptions](#FormattingOptions) literals.
 */
export namespace FormattingOptions {
	/**
	 * Creates a new FormattingOptions literal.
	 */
	export function create(tabSize: uinteger, insertSpaces: boolean): FormattingOptions {
		return { tabSize, insertSpaces };
	}
	/**
	 * Checks whether the given literal conforms to the [FormattingOptions](#FormattingOptions) interface.
	 */
	export function is(value: any): value is FormattingOptions {
		let candidate = value as FormattingOptions;
		return Is.defined(candidate) && Is.uinteger(candidate.tabSize) && Is.boolean(candidate.insertSpaces);
	}
}

/**
 * A document link is a range in a text document that links to an internal or external resource, like another
 * text document or a web site.
 */
export interface DocumentLink {

	/**
	 * The range this link applies to.
	 */
	range: Range;

	/**
	 * The uri this link points to.
	 */
	target?: string;

	/**
	 * The tooltip text when you hover over this link.
	 *
	 * If a tooltip is provided, is will be displayed in a string that includes instructions on how to
	 * trigger the link, such as `{0} (ctrl + click)`. The specific instructions vary depending on OS,
	 * user settings, and localization.
	 *
	 * @since 3.15.0
	 */
	tooltip?: string;

	/**
	 * A data entry field that is preserved on a document link between a
	 * DocumentLinkRequest and a DocumentLinkResolveRequest.
	 */
	data?: LSPAny;
}

/**
 * The DocumentLink namespace provides helper functions to work with
 * [DocumentLink](#DocumentLink) literals.
 */
export namespace DocumentLink {
	/**
	 * Creates a new DocumentLink literal.
	 */
	export function create(range: Range, target?: string, data?: LSPAny): DocumentLink {
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

/**
 * A selection range represents a part of a selection hierarchy. A selection range
 * may have a parent selection range that contains it.
 */
export interface SelectionRange {

	/**
	 * The [range](#Range) of this selection range.
	 */
	range: Range;

	/**
	 * The parent selection range containing this range. Therefore `parent.range` must contain `this.range`.
	 */
	parent?: SelectionRange;

}

/**
 * The SelectionRange namespace provides helper function to work with
 * SelectionRange literals.
 */
export namespace SelectionRange {
	/**
	 * Creates a new SelectionRange
	 * @param range the range.
	 * @param parent an optional parent.
	 */
	export function create(range: Range, parent?: SelectionRange): SelectionRange {
		return { range, parent };
	}

	export function is(value: any): value is SelectionRange {
		let candidate = value as SelectionRange;
		return Is.objectLiteral(candidate) && Range.is(candidate.range) && (candidate.parent === undefined || SelectionRange.is(candidate.parent));
	}
}

/**
 * Represents programming constructs like functions or constructors in the context
 * of call hierarchy.
 *
 * @since 3.16.0
 */
export interface CallHierarchyItem {
	/**
	 * The name of this item.
	 */
	name: string;

	/**
	 * The kind of this item.
	 */
	kind: SymbolKind;

	/**
	 * Tags for this item.
	 */
	tags?: SymbolTag[];

	/**
	 * More detail for this item, e.g. the signature of a function.
	 */
	detail?: string;

	/**
	 * The resource identifier of this item.
	 */
	uri: DocumentUri;

	/**
	 * The range enclosing this symbol not including leading/trailing whitespace but everything else, e.g. comments and code.
	 */
	range: Range;

	/**
	 * The range that should be selected and revealed when this symbol is being picked, e.g. the name of a function.
	 * Must be contained by the [`range`](#CallHierarchyItem.range).
	 */
	selectionRange: Range;

	/**
	 * A data entry field that is preserved between a call hierarchy prepare and
	 * incoming calls or outgoing calls requests.
	 */
	data?: LSPAny;
}

/**
 * Represents an incoming call, e.g. a caller of a method or constructor.
 *
 * @since 3.16.0
 */
export interface CallHierarchyIncomingCall {

	/**
	 * The item that makes the call.
	 */
	from: CallHierarchyItem;

	/**
	 * The ranges at which the calls appear. This is relative to the caller
	 * denoted by [`this.from`](#CallHierarchyIncomingCall.from).
	 */
	fromRanges: Range[];
}

/**
 * Represents an outgoing call, e.g. calling a getter from a method or a method from a constructor etc.
 *
 * @since 3.16.0
 */
export interface CallHierarchyOutgoingCall {

	/**
	 * The item that is called.
	 */
	to: CallHierarchyItem;

	/**
	 * The range at which this item is called. This is the range relative to the caller, e.g the item
	 * passed to [`provideCallHierarchyOutgoingCalls`](#CallHierarchyItemProvider.provideCallHierarchyOutgoingCalls)
	 * and not [`this.to`](#CallHierarchyOutgoingCall.to).
	 */
	fromRanges: Range[];
}

/**
 * A set of predefined token types. This set is not fixed
 * an clients can specify additional token types via the
 * corresponding client capabilities.
 *
 * @since 3.16.0
 */
export enum SemanticTokenTypes {
	namespace = 'namespace',
	/**
	 * Represents a generic type. Acts as a fallback for types which can't be mapped to
	 * a specific type like class or enum.
	 */
	type = 'type',
	class = 'class',
	enum = 'enum',
	interface = 'interface',
	struct = 'struct',
	typeParameter = 'typeParameter',
	parameter = 'parameter',
	variable = 'variable',
	property = 'property',
	enumMember = 'enumMember',
	event = 'event',
	function = 'function',
	method = 'method',
	macro = 'macro',
	keyword = 'keyword',
	modifier = 'modifier',
	comment = 'comment',
	string = 'string',
	number = 'number',
	regexp = 'regexp',
	operator = 'operator',
	/**
	 * @since 3.17.0
	 */
	decorator = 'decorator'
}

/**
 * A set of predefined token modifiers. This set is not fixed
 * an clients can specify additional token types via the
 * corresponding client capabilities.
 *
 * @since 3.16.0
 */
export enum SemanticTokenModifiers {
	declaration = 'declaration',
	definition = 'definition',
	readonly = 'readonly',
	static = 'static',
	deprecated = 'deprecated',
	abstract = 'abstract',
	async = 'async',
	modification = 'modification',
	documentation = 'documentation',
	defaultLibrary = 'defaultLibrary'
}

/**
 * @since 3.16.0
 */
export interface SemanticTokensLegend {
	/**
	 * The token types a server uses.
	 */
	tokenTypes: string[];

	/**
	 * The token modifiers a server uses.
	 */
	tokenModifiers: string[];
}

/**
 * @since 3.16.0
 */
export interface SemanticTokens {
	/**
	 * An optional result id. If provided and clients support delta updating
	 * the client will include the result id in the next semantic token request.
	 * A server can then instead of computing all semantic tokens again simply
	 * send a delta.
	 */
	resultId?: string;

	/**
	 * The actual tokens.
	 */
	data: uinteger[];
}

/**
 * @since 3.16.0
 */
export namespace SemanticTokens {
	export function is(value: any): value is SemanticTokens {
		const candidate = value as SemanticTokens;
		return Is.objectLiteral(candidate) && (candidate.resultId === undefined || typeof candidate.resultId === 'string') &&
			Array.isArray(candidate.data) && (candidate.data.length === 0 || typeof candidate.data[0] === 'number');
	}
}

/**
 * @since 3.16.0
 */
export interface SemanticTokensEdit {
	/**
	 * The start offset of the edit.
	 */
	start: uinteger;

	/**
	 * The count of elements to remove.
	 */
	deleteCount: uinteger;

	/**
	 * The elements to insert.
	 */
	data?: uinteger[];
}

/**
 * @since 3.16.0
 */
export interface SemanticTokensDelta {
	readonly resultId?: string;
	/**
	 * The semantic token edits to transform a previous result into a new result.
	 */
	edits: SemanticTokensEdit[];
}

/**
 * @since 3.17.0 - proposed state
 */
export interface TypeHierarchyItem {
	/**
	 * The name of this item.
	 */
	name: string;

	/**
	 * The kind of this item.
	 */
	kind: SymbolKind;

	/**
	 * Tags for this item.
	 */
	tags?: SymbolTag[];

	/**
	 * More detail for this item, e.g. the signature of a function.
	 */
	detail?: string;

	/**
	 * The resource identifier of this item.
	 */
	uri: DocumentUri;

	/**
	 * The range enclosing this symbol not including leading/trailing whitespace
	 * but everything else, e.g. comments and code.
	 */
	range: Range;

	/**
	 * The range that should be selected and revealed when this symbol is being
	 * picked, e.g. the name of a function. Must be contained by the
	 * [`range`](#TypeHierarchyItem.range).
	 */
	selectionRange: Range;

	/**
	 * A data entry field that is preserved between a type hierarchy prepare and
	 * supertypes or subtypes requests. It could also be used to identify the
	 * type hierarchy in the server, helping improve the performance on
	 * resolving supertypes and subtypes.
	 */
	data?: LSPAny;
}

/**
 * Provide inline value as text.
 *
 * @since 3.17.0 - proposed state
 */
export interface InlineValueText {
	/**
	 * The document range for which the inline value applies.
	 */
	range: Range;

	/**
	 * The text of the inline value.
	 */
	text: string;
}

/**
 * The InlineValueText namespace provides functions to deal with InlineValueTexts.
 *
 * @since 3.17.0 - proposed state
 */
export namespace InlineValueText {
	/**
	 * Creates a new InlineValueText literal.
	 */
	export function create(range: Range, text: string): InlineValueText {
		return { range, text };
	}

	export function is(value: InlineValue | undefined | null): value is InlineValueText {
		const candidate = value as InlineValueText;
		return candidate !== undefined && candidate !== null && Range.is(candidate.range) && Is.string(candidate.text);
	}
}

/**
 * Provide inline value through a variable lookup.
 * If only a range is specified, the variable name will be extracted from the underlying document.
 * An optional variable name can be used to override the extracted name.
 *
 * @since 3.17.0 - proposed state
 */
export interface InlineValueVariableLookup {
	/**
	 * The document range for which the inline value applies.
	 * The range is used to extract the variable name from the underlying document.
	 */
	range: Range;

	/**
	 * If specified the name of the variable to look up.
	 */
	variableName?: string;

	/**
	 * How to perform the lookup.
	 */
	caseSensitiveLookup: boolean;
}

/**
 * The InlineValueVariableLookup namespace provides functions to deal with InlineValueVariableLookups.
 *
 * @since 3.17.0
 */
export namespace InlineValueVariableLookup {
	/**
	 * Creates a new InlineValueText literal.
	 */
	export function create(range: Range, variableName: string | undefined, caseSensitiveLookup: boolean): InlineValueVariableLookup {
		return { range, variableName, caseSensitiveLookup };
	}

	export function is(value: InlineValue | undefined | null): value is InlineValueVariableLookup {
		const candidate = value as InlineValueVariableLookup;
		return candidate !== undefined && candidate !== null && Range.is(candidate.range) && Is.boolean(candidate.caseSensitiveLookup)
			&& (Is.string(candidate.variableName) || candidate.variableName === undefined);
	}
}

/**
 * Provide an inline value through an expression evaluation.
 * If only a range is specified, the expression will be extracted from the underlying document.
 * An optional expression can be used to override the extracted expression.
 *
 * @since 3.17.0 - proposed state
 */
export interface InlineValueEvaluatableExpression {
	/**
	 * The document range for which the inline value applies.
	 * The range is used to extract the evaluatable expression from the underlying document.
	 */
	range: Range;

	/**
	 * If specified the expression overrides the extracted expression.
	 */
	expression?: string;
}

/**
 * The InlineValueEvaluatableExpression namespace provides functions to deal with InlineValueEvaluatableExpression.
 *
 * @since 3.17.0 - proposed state
 */
export namespace InlineValueEvaluatableExpression {
	/**
	 * Creates a new InlineValueEvaluatableExpression literal.
	 */
	export function create(range: Range, expression: string | undefined): InlineValueEvaluatableExpression {
		return { range, expression };
	}

	export function is(value: InlineValue | undefined | null): value is InlineValueEvaluatableExpression {
		const candidate = value as InlineValueEvaluatableExpression;
		return candidate !== undefined && candidate !== null && Range.is(candidate.range)
			&& (Is.string(candidate.expression) || candidate.expression === undefined);
	}
}

/**
 * Inline value information can be provided by different means:
 * - directly as a text value (class InlineValueText).
 * - as a name to use for a variable lookup (class InlineValueVariableLookup)
 * - as an evaluatable expression (class InlineValueEvaluatableExpression)
 * The InlineValue types combines all inline value types into one type.
 *
 * @since 3.17.0 - proposed state
 */
export type InlineValue = InlineValueText | InlineValueVariableLookup | InlineValueEvaluatableExpression;

/**
 * @since 3.17.0 - proposed state
 */
export interface InlineValuesContext {
	/**
	 * The document range where execution has stopped.
	 * Typically the end position of the range denotes the line where the inline values are shown.
	 */
	stoppedLocation: Range;
}

/**
 * The InlineValuesContext namespace provides helper functions to work with
 * [InlineValuesContext](#InlineValuesContext) literals.
 *
 * @since 3.17.0 - proposed state
 */
export namespace InlineValuesContext {
	/**
	 * Creates a new InlineValuesContext literal.
	 */
	export function create(stoppedLocation: Range): InlineValuesContext {
		return { stoppedLocation };
	}

	/**
	 * Checks whether the given literal conforms to the [InlineValuesContext](#InlineValuesContext) interface.
	 */
	export function is(value: any): value is InlineValuesContext {
		const candidate = value as InlineValuesContext;
		return Is.defined(candidate) && Range.is(value.stoppedLocation);
	}
}

export const EOL: string[] = ['\n', '\r\n', '\r'];

/**
 * A simple text document. Not to be implemented. The document keeps the content
 * as string.
 *
 * @deprecated Use the text document from the new vscode-languageserver-textdocument package.
 */
export interface TextDocument {

	/**
	 * The associated URI for this document. Most documents have the __file__-scheme, indicating that they
	 * represent files on disk. However, some documents may have other schemes indicating that they are not
	 * available on disk.
	 *
	 * @readonly
	 */
	readonly uri: DocumentUri;

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
	readonly version: integer;

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
	positionAt(offset: uinteger): Position;

	/**
	 * Converts the position to a zero-based offset.
	 * Invalid positions are adjusted as described in [Position.line](#Position.line)
	 * and [Position.character](#Position.character).
	 *
	 * @param position A position.
	 * @return A valid zero-based offset.
	 */
	offsetAt(position: Position): uinteger;

	/**
	 * The number of lines in this document.
	 *
	 * @readonly
	 */
	readonly lineCount: uinteger;
}

/**
 * @deprecated Use the text document from the new vscode-languageserver-textdocument package.
 */
export namespace TextDocument {
	/**
	 * Creates a new ITextDocument literal from the given uri and content.
	 * @param uri The document's uri.
	 * @param languageId The document's language Id.
	 * @param version The document's version.
	 * @param content The document's content.
	 */
	export function create(uri: DocumentUri, languageId: string, version: integer, content: string): TextDocument {
		return new FullTextDocument(uri, languageId, version, content);
	}
	/**
	 * Checks whether the given literal conforms to the [ITextDocument](#ITextDocument) interface.
	 */
	export function is(value: any): value is TextDocument {
		let candidate = value as TextDocument;
		return Is.defined(candidate) && Is.string(candidate.uri) && (Is.undefined(candidate.languageId) || Is.string(candidate.languageId)) && Is.uinteger(candidate.lineCount)
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
				throw new Error('Overlapping edit');
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
 * An event describing a change to a text document. If range and rangeLength are omitted
 * the new text is considered to be the full content of the document.
 *
 * @deprecated Use the text document from the new vscode-languageserver-textdocument package.
 */
type TextDocumentContentChangeEvent = {
	/**
	 * The range of the document that changed.
	 */
	range: Range;

	/**
	 * The optional length of the range that got replaced.
	 *
	 * @deprecated use range instead.
	 */
	rangeLength?: uinteger;

	/**
	 * The new text for the provided range.
	 */
	text: string;
} | {
	/**
	 * The new text of the whole document.
	 */
	text: string;
};

/**
 * @deprecated Use the text document from the new vscode-languageserver-textdocument package.
 */
class FullTextDocument implements TextDocument {

	private _uri: DocumentUri;
	private _languageId: string;
	private _version: integer;
	private _content: string;
	private _lineOffsets: uinteger[] | undefined;

	public constructor(uri: DocumentUri, languageId: string, version: integer, content: string) {
		this._uri = uri;
		this._languageId = languageId;
		this._version = version;
		this._content = content;
		this._lineOffsets = undefined;
	}

	public get uri(): string {
		return this._uri;
	}

	public get languageId(): string {
		return this._languageId;
	}

	public get version(): integer {
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

	public update(event: TextDocumentContentChangeEvent, version: integer): void {
		this._content = event.text;
		this._version = version;
		this._lineOffsets = undefined;
	}

	private getLineOffsets(): uinteger[] {
		if (this._lineOffsets === undefined) {
			let lineOffsets: uinteger[] = [];
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

	public positionAt(offset: uinteger) {
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

	export function numberRange(value: any, min: number, max: number): value is number {
		return toString.call(value) === '[object Number]' && min <= value && value <= max;
	}

	export function integer(value: any): value is integer {
		return toString.call(value) === '[object Number]' && -2147483648 <= value && value <= 2147483647;
	}

	export function uinteger(value: any): value is uinteger {
		return toString.call(value) === '[object Number]' && 0 <= value && value <= 2147483647;
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
