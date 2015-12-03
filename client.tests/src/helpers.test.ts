/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { strictEqual, deepEqual, ok } from 'assert';

import { Position, Range, TextDocumentIdentifier, TextDocumentPosition } from '../../client/lib/protocol';

suite('Protocol Helper Tests', () => {
	test('Position', () => {
		let position: Position = Position.create(1, 2);
		strictEqual(position.line, 1);
		strictEqual(position.character, 2);
		ok(Position.is(position));
	});
	
	test('Range - start/end', () => {
		let range: Range = Range.create(Position.create(1, 2), Position.create(8,9));
		strictEqual(range.start.line, 1);
		strictEqual(range.start.character, 2);
		strictEqual(range.end.line, 8);
		strictEqual(range.end.character, 9);
		ok(Range.is(range));
	});
	
	test('Range - line/character', () => {
		let range: Range = Range.create(1,2,8,9);
		strictEqual(range.start.line, 1);
		strictEqual(range.start.character, 2);
		strictEqual(range.end.line, 8);
		strictEqual(range.end.character, 9);
		ok(Range.is(range));
	});
	
	test('TextDocumentIdentifier', () => {
		let uri = 'file:///folder/file.txt';
		let identifier = TextDocumentIdentifier.create(uri);
		strictEqual(identifier.uri, uri);
		ok(TextDocumentIdentifier.is(identifier));
	});
	
	test('TextDocumentPosition', () => {
		let uri = 'file:///folder/file.txt';
		let position = TextDocumentPosition.create(uri, Position.create(1,2));
		strictEqual(position.uri, uri);
		ok(Position.is(position.position));
		ok(TextDocumentPosition.is(position));
	});
});