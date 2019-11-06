/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

/**
 * A tagging type for string properties that are actually URIs.
 */
export type DocumentUri = string;

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
 * An event describing a change to a text document. If range and rangeLength are omitted
 * the new text is considered to be the full content of the document.
 */
export type TextDocumentContentChangeEvent = {
	/**
	 * The range of the document that changed.
	 */
	range: Range;

	/**
	 * The optional length of the range that got replaced.
	 *
	 * @deprecated use range instead.
	 */
	rangeLength?: number;

	/**
	 * The new text for the provided range.
	 */
	text: string;
} | {
	/**
	 * The new text of the whole document.
	 */
	text: string;
}

/**
 * A simple text document. Not to be implemented. The document keeps the content
 * as string.
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

class FullTextDocument implements TextDocument {

	private _uri: DocumentUri;
	private _languageId: string;
	private _version: number;
	private _content: string;
	private _lineOffsets: number[] | undefined;

	public constructor(uri: DocumentUri, languageId: string, version: number, content: string) {
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

	public get version(): number {
		return this._version;
	}

	public getText(range?: Range): string {
		if (range) {
			const start = this.offsetAt(range.start);
			const end = this.offsetAt(range.end);
			return this._content.substring(start, end);
		}
		return this._content;
	}

	public update(changes: TextDocumentContentChangeEvent[], version: number): void {
		for (let change of changes) {
			if (FullTextDocument.isIncremental(change)) {
				// makes sure start is before end
				const range = getWellformedRange(change.range);

				// update content
				const startOffset = this.offsetAt(range.start);
				const endOffset = this.offsetAt(range.end);
				this._content = this._content.substring(0, startOffset) + change.text + this._content.substring(endOffset, this._content.length);

				// update the offsets
				const startLine = Math.max(range.start.line, 0);
				const endLine = Math.max(range.end.line, 0);
				let lineOffsets = this._lineOffsets!;
				const addedLineOffsets = computeLineOffsets(change.text, false, startOffset);
				if (endLine - startLine === addedLineOffsets.length) {
					for (let i = 0, len = addedLineOffsets.length; i < len; i++) {
						lineOffsets[i + startLine + 1] = addedLineOffsets[i];
					}
				} else {
					if (addedLineOffsets.length < 10000) {
						lineOffsets.splice(startLine + 1, endLine - startLine, ...addedLineOffsets);
					} else { // avoid too many arguments for splice
						this._lineOffsets = lineOffsets = lineOffsets.slice(0, startLine + 1).concat(addedLineOffsets, lineOffsets.slice(endLine + 1));
					}
				}
				const diff = change.text.length - (endOffset - startOffset);
				if (diff !== 0) {
					for (let i = startLine + 1 + addedLineOffsets.length, len = lineOffsets.length; i < len; i++) {
						lineOffsets[i] = lineOffsets[i] + diff;
					}
				}
			} else if (FullTextDocument.isFull(change)) {
				this._content = change.text;
				this._lineOffsets = undefined;
			} else {
				throw new Error('Unknown change event received');
			}
		}
		this._version = version;
	}

	private getLineOffsets(): number[] {
		if (this._lineOffsets === undefined) {
			this._lineOffsets = computeLineOffsets(this._content, true);
		}
		return this._lineOffsets;
	}

	public positionAt(offset: number): Position {
		offset = Math.max(Math.min(offset, this._content.length), 0);

		let lineOffsets = this.getLineOffsets();
		let low = 0, high = lineOffsets.length;
		if (high === 0) {
			return { line: 0, character: offset };
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
		return { line, character: offset - lineOffsets[line] };
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

	private static isIncremental(event: TextDocumentContentChangeEvent): event is { range: Range; rangeLength?: number; text: string; } {
		let candidate: { range: Range; rangeLength?: number; text: string; } = event as any;
		return candidate !== undefined && candidate !== null &&
			typeof candidate.text === 'string' && candidate.range !== undefined &&
			(candidate.rangeLength === undefined || typeof candidate.rangeLength === 'number');
	}

	private static isFull(event: TextDocumentContentChangeEvent): event is { text: string; } {
		let candidate: { range?: Range; rangeLength?: number; text: string; } = event as any;
		return candidate !== undefined && candidate !== null &&
			typeof candidate.text === 'string' && candidate.range === undefined && candidate.rangeLength === undefined;
	}
}

export namespace TextDocument {
	/**
	 * Creates a new text document.
	 *
	 * @param uri The document's uri.
	 * @param languageId  The document's language Id.
	 * @param version The document's initial version number.
	 * @param content The document's content.
	 */
	export function create(uri: DocumentUri, languageId: string, version: number, content: string): TextDocument {
		return new FullTextDocument(uri, languageId, version, content);
	}

	/**
	 * Updates a TextDocument by modifing its content.
	 *
	 * @param document the document to update. Only documents created by TextDocument.create are valid inputs.
	 * @param changes the changes to apply to the document.
	 * @returns The updated TextDocument. Note: That's the same document instance passed in as first parameter.
	 *
	 */
	export function update(document: TextDocument, changes: TextDocumentContentChangeEvent[], version: number): TextDocument {
		if (document instanceof FullTextDocument) {
			document.update(changes, version);
			return document;
		} else {
			throw new Error('TextDocument.update: document must be created by TextDocument.create');
		}
	}

	export function applyEdits(document: TextDocument, edits: TextEdit[]): string {
		let text = document.getText();
		let sortedEdits = mergeSort(edits.map(getWellformedEdit), (a, b) => {
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

const enum CharCode {
	/**
	 * The `\n` character.
	 */
	LineFeed = 10,
	/**
	 * The `\r` character.
	 */
	CarriageReturn = 13,
}

function computeLineOffsets(text: string, isAtLineStart: boolean, textOffset = 0): number[] {
	const result: number[] = isAtLineStart ? [textOffset] : [];
	for (let i = 0; i < text.length; i++) {
		let ch = text.charCodeAt(i);
		if (ch === CharCode.CarriageReturn || ch === CharCode.LineFeed) {
			if (ch === CharCode.CarriageReturn && i + 1 < text.length && text.charCodeAt(i + 1) === CharCode.LineFeed) {
				i++;
			}
			result.push(textOffset + i + 1);
		}
	}
	return result;
}

function getWellformedRange(range: Range): Range {
	const start = range.start;
	const end = range.end;
	if (start.line > end.line || (start.line === end.line && start.character > end.character)) {
		return { start: end, end: start };
	}
	return range;
}

function getWellformedEdit(textEdit: TextEdit): TextEdit {
	const range = getWellformedRange(textEdit.range);
	if (range !== textEdit.range) {
		return { newText: textEdit.newText, range }
	}
	return textEdit;
}