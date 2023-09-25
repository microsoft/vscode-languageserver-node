/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { Position, Range, TextEdit, TextDocument } from '../main';

export namespace Positions {
	export function create(line: number, character: number): Position {
		return { line, character };
	}

	export function afterSubstring(document: TextDocument, subText: string): Position {
		const index = document.getText().indexOf(subText);
		return document.positionAt(index + subText.length);
	}
}

export namespace Ranges {
	export function create(startLine: number, startCharacter: number, endLine: number, endCharacter: number): Range {
		return { start: Positions.create(startLine, startCharacter), end: Positions.create(endLine, endCharacter) };
	}

	export function forSubstring(document: TextDocument, subText: string): Range {
		const index = document.getText().indexOf(subText);
		return { start: document.positionAt(index), end: document.positionAt(index + subText.length) };
	}

	export function afterSubstring(document: TextDocument, subText: string): Range {
		const pos = Positions.afterSubstring(document, subText);
		return { start: pos, end: pos };
	}

}

export namespace TextEdits {
	export function replace(range: Range, newText: string): TextEdit {
		return { range, newText };
	}
	export function insert(position: Position, newText: string): TextEdit {
		return { range: { start: position, end: position }, newText };
	}
	export function del(range: Range): TextEdit {
		return { range, newText: '' };
	}
}
