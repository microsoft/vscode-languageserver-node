/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import { TextDocument as SimpleTextDocument, TextDocumentContentChangeEvent, DocumentUri } from '../main';
import { Positions as Position, Ranges as Range } from './helper';

interface TextDocument extends SimpleTextDocument {
	update(changes: TextDocumentContentChangeEvent[], version: number): void;
}

namespace TextDocument {
	export function create(uri: DocumentUri, languageId: string, version: number, content: string): TextDocument {
		return SimpleTextDocument.create(uri, languageId, version, content) as TextDocument;
	}
}

suite('Text Document Lines Model Validator', () => {
	function newDocument(str: string) {
		return TextDocument.create('file://foo/bar', 'text', 0, str);
	}

	test('Single line', () => {
		const str = 'Hello World';
		const document = newDocument(str);
		assert.equal(document.lineCount, 1);

		for (let i = 0; i < str.length; i++) {
			assert.equal(document.offsetAt(Position.create(0, i)), i);
			assert.deepEqual(document.positionAt(i), Position.create(0, i));
		}
	});

	test('Multiple lines', () => {
		const str = 'ABCDE\nFGHIJ\nKLMNO\n';
		const document = newDocument(str);
		assert.equal(document.lineCount, 4);

		for (let i = 0; i < str.length; i++) {
			const line = Math.floor(i / 6);
			const column = i % 6;

			assert.equal(document.offsetAt(Position.create(line, column)), i);
			assert.deepEqual(document.positionAt(i), Position.create(line, column));
		}

		assert.equal(document.offsetAt(Position.create(3, 0)), 18);
		assert.equal(document.offsetAt(Position.create(3, 1)), 18);
		assert.deepEqual(document.positionAt(18), Position.create(3, 0));
		assert.deepEqual(document.positionAt(19), Position.create(3, 0));
	});

	test('New line characters', () => {
		let str = 'ABCDE\rFGHIJ';
		assert.equal(newDocument(str).lineCount, 2);

		str = 'ABCDE\nFGHIJ';
		assert.equal(newDocument(str).lineCount, 2);

		str = 'ABCDE\r\nFGHIJ';
		assert.equal(newDocument(str).lineCount, 2);

		str = 'ABCDE\n\nFGHIJ';
		assert.equal(newDocument(str).lineCount, 3);

		str = 'ABCDE\r\rFGHIJ';
		assert.equal(newDocument(str).lineCount, 3);

		str = 'ABCDE\n\rFGHIJ';
		assert.equal(newDocument(str).lineCount, 3);
	});

	test('getText(Range)', () => {
		const str = '12345\n12345\n12345';
		const document = newDocument(str);
		assert.equal(document.getText(), str);
		assert.equal(document.getText(Range.create(-1, 0, 0, 5)), '12345');
		assert.equal(document.getText(Range.create(0, 0, 0, 5)), '12345');
		assert.equal(document.getText(Range.create(0, 4, 1, 1)), '5\n1');
		assert.equal(document.getText(Range.create(0, 4, 2, 1)), '5\n12345\n1');
		assert.equal(document.getText(Range.create(0, 4, 3, 1)), '5\n12345\n12345');
		assert.equal(document.getText(Range.create(0, 0, 3, 5)), str);
	});

	test('Invalid inputs', () => {
		const str = 'Hello World';
		const document = newDocument(str);

		// invalid position
		assert.equal(document.offsetAt(Position.create(0, str.length)), str.length);
		assert.equal(document.offsetAt(Position.create(0, str.length + 3)), str.length);
		assert.equal(document.offsetAt(Position.create(2, 3)), str.length);
		assert.equal(document.offsetAt(Position.create(-1, 3)), 0);
		assert.equal(document.offsetAt(Position.create(0, -3)), 0);
		assert.equal(document.offsetAt(Position.create(1, -3)), str.length);

		// invalid offsets
		assert.deepEqual(document.positionAt(-1), Position.create(0, 0));
		assert.deepEqual(document.positionAt(str.length), Position.create(0, str.length));
		assert.deepEqual(document.positionAt(str.length + 3), Position.create(0, str.length));
	});
});

suite('Text Document Full Updates', () => {
	function newDocument(str: string) {
		return TextDocument.create('file://foo/bar', 'text', 0, str);
	}

	test('Simple Update', () => {
		const document = newDocument('abc123');
		document.update([{ text: 'efg456' }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'efg456');
	});

	test('Several full content updates', () => {
		const document = newDocument('abc123');
		document.update([{ text: 'hello' }, { text: 'world' }], 2);
		assert.strictEqual(document.version, 2);
		assert.strictEqual(document.getText(), 'world');
	});
});

suite('Text Document Incremental Updates', () => {
	function newDocument(str: string) {
		return TextDocument.create('file://foo/bar', 'text', 0, str);
	}

	test('Incrementally removing content', () => {
		const document = newDocument('function abc() {\n  console.log("hello, world!");\n}');
		document.update([{ text: 'hello', range: Range.create(1, 15, 1, 28) }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'function abc() {\n  console.log("hello");\n}');
	});

	test('Incrementally adding content', () => {
		const document = newDocument('function abc() {\n  console.log("hello");\n}');
		document.update([{ text: ', world!', range: Range.create(1, 20, 1, 20) }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'function abc() {\n  console.log("hello, world!");\n}');
	});

	test('Incrementally replacing content', () => {
		const document = newDocument('function abc() {\n  console.log("hello, world!");\n}');
		document.update([{ text: 'hello, test case!!!', range: Range.create(1, 15, 1, 28) }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'function abc() {\n  console.log("hello, test case!!!");\n}');
	});

	test('Several incremental content changes', () => {
		const document = newDocument('function abc() {\n  console.log("hello, world!");\n}');
		document.update([
			{ text: 'defg', range: Range.create(0, 12, 0, 12) },
			{ text: 'hello, test case!!!', range: Range.create(1, 15, 1, 28) },
			{ text: 'hij', range: Range.create(0, 16, 0, 16) },
		], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'function abcdefghij() {\n  console.log("hello, test case!!!");\n}');
	});

	test('Basic append', () => {
		let document = newDocument('foooo\nbar\nbaz');

		assert.equal(document.offsetAt(Position.create(2, 0)), 10);

		document.update([{ text: ' some extra content', range: Range.create(1, 3, 1, 3) }], 1);
		assert.equal(document.getText(), 'foooo\nbar some extra content\nbaz');
		assert.equal(document.version, 1);
		assert.equal(document.offsetAt(Position.create(2, 0)), 29);
	});

	test('Multi-line append', () => {
		let document = newDocument('foooo\nbar\nbaz');

		assert.equal(document.offsetAt(Position.create(2, 0)), 10);

		document.update([{ text: ' some extra\ncontent', range: Range.create(1, 3, 1, 3) }], 1);
		assert.equal(document.getText(), 'foooo\nbar some extra\ncontent\nbaz');
		assert.equal(document.version, 1);
		assert.equal(document.offsetAt(Position.create(3, 0)), 29);
		assert.equal(document.lineCount, 4);
	});

	test('Basic delete', () => {
		let document = newDocument('foooo\nbar\nbaz');

		assert.equal(document.offsetAt(Position.create(2, 0)), 10);

		document.update([{ text: '', range: Range.create(1, 0, 1, 3) }], 1);
		assert.equal(document.getText(), 'foooo\n\nbaz');
		assert.equal(document.version, 1);
		assert.equal(document.offsetAt(Position.create(2, 0)), 7);
	});

	test('Multi-line delete', () => {
		let lm = newDocument('foooo\nbar\nbaz');

		assert.equal(lm.offsetAt(Position.create(2, 0)), 10);

		lm.update([{ text: '', range: Range.create(0, 5, 1, 3) }], 1);
		assert.equal(lm.getText(), 'foooo\nbaz');
		assert.equal(lm.version, 1);
		assert.equal(lm.offsetAt(Position.create(1, 0)), 6);
	});

	test('Single character replace', () => {
		let document = newDocument('foooo\nbar\nbaz');

		assert.equal(document.offsetAt(Position.create(2, 0)), 10);

		document.update([{ text: 'z', range: Range.create(1, 2, 1, 3) }], 2);
		assert.equal(document.getText(), 'foooo\nbaz\nbaz');
		assert.equal(document.version, 2);
		assert.equal(document.offsetAt(Position.create(2, 0)), 10);
	});

	test('Multi-character replace', () => {
		let lm = newDocument('foo\nbar');

		assert.equal(lm.offsetAt(Position.create(1, 0)), 4);

		lm.update([{ text: 'foobar', range: Range.create(1, 0, 1, 3) }], 1);
		assert.equal(lm.getText(), 'foo\nfoobar');
		assert.equal(lm.version, 1);
		assert.equal(lm.offsetAt(Position.create(1, 0)), 4);
	});

	test('Invalid update ranges', () => {
		// Before the document starts -> before the document starts
		let document = newDocument('foo\nbar');
		document.update([{ text: 'abc123', range: Range.create(-2, 0, -1, 3) }], 2);
		assert.equal(document.getText(), 'abc123foo\nbar');
		assert.equal(document.version, 2);

		// Before the document starts -> the middle of document
		document = newDocument('foo\nbar');
		document.update([{ text: 'foobar', range: Range.create(-1, 0, 0, 3) }], 2);
		assert.equal(document.getText(), 'foobar\nbar');
		assert.equal(document.version, 2);
		assert.equal(document.offsetAt(Position.create(1, 0)), 7);

		// The middle of document -> after the document ends
		document = newDocument('foo\nbar');
		document.update([{ text: 'foobar', range: Range.create(1, 0, 1, 10) }], 2);
		assert.equal(document.getText(), 'foo\nfoobar');
		assert.equal(document.version, 2);
		assert.equal(document.offsetAt(Position.create(1, 1000)), 10);

		// After the document ends -> after the document ends
		document = newDocument('foo\nbar');
		document.update([{ text: 'abc123', range: Range.create(3, 0, 6, 10) }], 2);
		assert.equal(document.getText(), 'foo\nbarabc123');
		assert.equal(document.version, 2);

		// Before the document starts -> after the document ends
		document = newDocument('foo\nbar');
		document.update([{ text: 'entirely new content', range: Range.create(-1, 1, 2, 10000) }], 2);
		assert.equal(document.getText(), 'entirely new content');
		assert.equal(document.version, 2);
		assert.equal(document.lineCount, 1);
	});
});