/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';

import { TextDocument } from '../main';
import { Positions, Ranges } from './helper';

function newDocument(str: string) {
	return TextDocument.create('file://foo/bar', 'text', 0, str);
}

suite('Text Document Lines Model Validator', () => {

	test('Empty content', () => {
		const str = '';
		const document = newDocument(str);
		assert.equal(document.lineCount, 1);
		assert.equal(document.offsetAt(Positions.create(0, 0)), 0);
		assert.deepEqual(document.positionAt(0), Positions.create(0, 0));
	});

	test('Single line', () => {
		const str = 'Hello World';
		const document = newDocument(str);
		assert.equal(document.lineCount, 1);

		for (let i = 0; i < str.length; i++) {
			assert.equal(document.offsetAt(Positions.create(0, i)), i);
			assert.deepEqual(document.positionAt(i), Positions.create(0, i));
		}
	});

	test('Multiple lines', () => {
		const str = 'ABCDE\nFGHIJ\nKLMNO\n';
		const document = newDocument(str);
		assert.equal(document.lineCount, 4);

		for (let i = 0; i < str.length; i++) {
			const line = Math.floor(i / 6);
			const column = i % 6;

			assert.equal(document.offsetAt(Positions.create(line, column)), i);
			assert.deepEqual(document.positionAt(i), Positions.create(line, column));
		}

		assert.equal(document.offsetAt(Positions.create(3, 0)), 18);
		assert.equal(document.offsetAt(Positions.create(3, 1)), 18);
		assert.deepEqual(document.positionAt(18), Positions.create(3, 0));
		assert.deepEqual(document.positionAt(19), Positions.create(3, 0));
	});

	test('Starts with new-line', () => {
		const document = newDocument('\nABCDE');
		assert.equal(document.lineCount, 2);
		assert.deepEqual(document.positionAt(0), Positions.create(0, 0));
		assert.deepEqual(document.positionAt(1), Positions.create(1, 0));
		assert.deepEqual(document.positionAt(6), Positions.create(1, 5));

	});

	test('New line characters', () => {
		let document = newDocument('ABCDE\rFGHIJ');
		assert.equal(document.lineCount, 2);
		assert.equal(document.offsetAt(Positions.create(1, 0)), 6);

		document = newDocument('ABCDE\nFGHIJ');
		assert.equal(document.lineCount, 2);
		assert.equal(document.offsetAt(Positions.create(1, 0)), 6);

		document = newDocument('ABCDE\r\nFGHIJ');
		assert.equal(document.lineCount, 2);
		assert.equal(document.offsetAt(Positions.create(1, 0)), 7);

		document = newDocument('ABCDE\n\nFGHIJ');
		assert.equal(document.lineCount, 3);
		assert.equal(document.offsetAt(Positions.create(1, 0)), 6);
		assert.equal(document.offsetAt(Positions.create(2, 0)), 7);

		document = newDocument('ABCDE\r\rFGHIJ');
		assert.equal(document.lineCount, 3);
		assert.equal(document.offsetAt(Positions.create(1, 0)), 6);
		assert.equal(document.offsetAt(Positions.create(2, 0)), 7);

		document = newDocument('ABCDE\n\rFGHIJ');
		assert.equal(document.lineCount, 3);
		assert.equal(document.offsetAt(Positions.create(1, 0)), 6);
		assert.equal(document.offsetAt(Positions.create(2, 0)), 7);
	});

	test('getText(Range)', () => {
		const str = '12345\n12345\n12345';
		const document = newDocument(str);
		assert.equal(document.getText(), str);
		assert.equal(document.getText(Ranges.create(-1, 0, 0, 5)), '12345');
		assert.equal(document.getText(Ranges.create(0, 0, 0, 5)), '12345');
		assert.equal(document.getText(Ranges.create(0, 4, 1, 1)), '5\n1');
		assert.equal(document.getText(Ranges.create(0, 4, 2, 1)), '5\n12345\n1');
		assert.equal(document.getText(Ranges.create(0, 4, 3, 1)), '5\n12345\n12345');
		assert.equal(document.getText(Ranges.create(0, 0, 3, 5)), str);
	});

	test('Invalid inputs at beginning of file', () => {
		const document = newDocument('ABCDE');
		assert.equal(document.offsetAt(Positions.create(-1, 0)), 0);
		assert.equal(document.offsetAt(Positions.create(0, -1)), 0);
		assert.deepEqual(document.positionAt(-1), Positions.create(0, 0));
	});

	test('Invalid inputs at end of file', () => {
		let str = 'ABCDE\n';
		let document = newDocument(str);
		assert.equal(document.offsetAt(Positions.create(1, 1)), str.length);
		assert.equal(document.offsetAt(Positions.create(2, 0)), str.length);
		assert.deepEqual(document.positionAt(str.length), Positions.create(1, 0));
		assert.deepEqual(document.positionAt(str.length + 3), Positions.create(1, 0));

		str = 'ABCDE';
		document = newDocument(str);
		assert.equal(document.offsetAt(Positions.create(0, 10)), str.length);
		assert.equal(document.offsetAt(Positions.create(1, 1)), str.length);
		assert.deepEqual(document.positionAt(str.length), Positions.create(0, 5));
		assert.deepEqual(document.positionAt(str.length + 3), Positions.create(0, 5));
	});

	test('Invalid inputs at beginning of line', () => {
		const document = newDocument('A\nB\rC\r\nD');
		assert.equal(document.offsetAt(Positions.create(0, -1)), 0);
		assert.equal(document.offsetAt(Positions.create(1, -1)), 2);
		assert.equal(document.offsetAt(Positions.create(2, -1)), 4);
		assert.equal(document.offsetAt(Positions.create(3, -1)), 7);
	});

	test('Invalid inputs at end of line', () => {
		const document = newDocument('A\nB\rC\r\nD');
		assert.equal(document.offsetAt(Positions.create(0, 10)), 1);
		assert.equal(document.offsetAt(Positions.create(1, 10)), 3);
		assert.equal(document.offsetAt(Positions.create(2, 2)), 5); // between \r and \n
		assert.equal(document.offsetAt(Positions.create(2, 3)), 5);
		assert.equal(document.offsetAt(Positions.create(2, 10)), 5);
		assert.equal(document.offsetAt(Positions.create(3, 10)), 8);

		assert.deepEqual(document.positionAt(6), Positions.create(2, 1)); // between \r and \n
	});
});



suite('Text Document Full Updates', () => {
	test('One full update', () => {
		const document = newDocument('abc123');
		TextDocument.update(document, [{ text: 'efg456' }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'efg456');
	});

	test('Several full content updates', () => {
		const document = newDocument('abc123');
		TextDocument.update(document, [{ text: 'hello' }, { text: 'world' }], 2);
		assert.strictEqual(document.version, 2);
		assert.strictEqual(document.getText(), 'world');
	});
});

suite('Text Document Incremental Updates', () => {

	// assumes that only '\n' is used
	function assertValidLineNumbers(doc: TextDocument) {
		const text = doc.getText();
		let expectedLineNumber = 0;
		for (let i = 0; i < text.length; i++) {
			assert.equal(doc.positionAt(i).line, expectedLineNumber);
			const ch = text[i];
			if (ch === '\n') {
				expectedLineNumber++;
			}
		}
		assert.equal(doc.positionAt(text.length).line, expectedLineNumber);
	}

	test('Incrementally removing content', () => {
		const document = newDocument('function abc() {\n  console.log("hello, world!");\n}');
		assert.equal(document.lineCount, 3);
		assertValidLineNumbers(document);
		TextDocument.update(document, [{ text: '', range: Ranges.forSubstring(document, 'hello, world!') }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'function abc() {\n  console.log("");\n}');
		assert.equal(document.lineCount, 3);
		assertValidLineNumbers(document);
	});

	test('Incrementally removing multi-line content', () => {
		const document = newDocument('function abc() {\n  foo();\n  bar();\n  \n}');
		assert.equal(document.lineCount, 5);
		assertValidLineNumbers(document);
		TextDocument.update(document, [{ text: '', range: Ranges.forSubstring(document, '  foo();\n  bar();\n') }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'function abc() {\n  \n}');
		assert.equal(document.lineCount, 3);
		assertValidLineNumbers(document);
	});

	test('Incrementally removing multi-line content 2', () => {
		const document = newDocument('function abc() {\n  foo();\n  bar();\n  \n}');
		assert.equal(document.lineCount, 5);
		assertValidLineNumbers(document);
		TextDocument.update(document, [{ text: '', range: Ranges.forSubstring(document, 'foo();\n  bar();') }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'function abc() {\n  \n  \n}');
		assert.equal(document.lineCount, 4);
		assertValidLineNumbers(document);
	});

	test('Incrementally adding content', () => {
		const document = newDocument('function abc() {\n  console.log("hello");\n}');
		assert.equal(document.lineCount, 3);
		assertValidLineNumbers(document);
		TextDocument.update(document, [{ text: ', world!', range: Ranges.afterSubstring(document, 'hello') }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'function abc() {\n  console.log("hello, world!");\n}');
		assert.equal(document.lineCount, 3);
		assertValidLineNumbers(document);
	});

	test('Incrementally adding multi-line content', () => {
		const document = newDocument('function abc() {\n  while (true) {\n    foo();\n  };\n}');
		assert.equal(document.lineCount, 5);
		assertValidLineNumbers(document);
		TextDocument.update(document, [{ text: '\n    bar();', range: Ranges.afterSubstring(document, 'foo();') }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'function abc() {\n  while (true) {\n    foo();\n    bar();\n  };\n}');
		assert.equal(document.lineCount, 6);
		assertValidLineNumbers(document);
	});

	test('Incrementally replacing single-line content, more chars', () => {
		const document = newDocument('function abc() {\n  console.log("hello, world!");\n}');
		assert.equal(document.lineCount, 3);
		assertValidLineNumbers(document);
		TextDocument.update(document, [{ text: 'hello, test case!!!', range: Ranges.forSubstring(document, 'hello, world!') }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'function abc() {\n  console.log("hello, test case!!!");\n}');
		assert.equal(document.lineCount, 3);
		assertValidLineNumbers(document);
	});

	test('Incrementally replacing single-line content, less chars', () => {
		const document = newDocument('function abc() {\n  console.log("hello, world!");\n}');
		assert.equal(document.lineCount, 3);
		assertValidLineNumbers(document);
		TextDocument.update(document, [{ text: 'hey', range: Ranges.forSubstring(document, 'hello, world!') }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'function abc() {\n  console.log("hey");\n}');
		assert.equal(document.lineCount, 3);
		assertValidLineNumbers(document);
	});

	test('Incrementally replacing single-line content, same num of chars', () => {
		const document = newDocument('function abc() {\n  console.log("hello, world!");\n}');
		assert.equal(document.lineCount, 3);
		assertValidLineNumbers(document);
		TextDocument.update(document, [{ text: 'world, hello!', range: Ranges.forSubstring(document, 'hello, world!') }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'function abc() {\n  console.log("world, hello!");\n}');
		assert.equal(document.lineCount, 3);
		assertValidLineNumbers(document);
	});

	test('Incrementally replacing multi-line content, more lines', () => {
		const document = newDocument('function abc() {\n  console.log("hello, world!");\n}');
		assert.equal(document.lineCount, 3);
		assertValidLineNumbers(document);
		TextDocument.update(document, [{ text: '\n//hello\nfunction d(){', range: Ranges.forSubstring(document, 'function abc() {') }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), '\n//hello\nfunction d(){\n  console.log("hello, world!");\n}');
		assert.equal(document.lineCount, 5);
		assertValidLineNumbers(document);
	});

	test('Incrementally replacing multi-line content, less lines', () => {
		const document = newDocument('a1\nb1\na2\nb2\na3\nb3\na4\nb4\n');
		assert.equal(document.lineCount, 9);
		assertValidLineNumbers(document);
		TextDocument.update(document, [{ text: 'xx\nyy', range: Ranges.forSubstring(document, '\na3\nb3\na4\nb4\n') }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'a1\nb1\na2\nb2xx\nyy');
		assert.equal(document.lineCount, 5);
		assertValidLineNumbers(document);
	});

	test('Incrementally replacing multi-line content, same num of lines and chars', () => {
		const document = newDocument('a1\nb1\na2\nb2\na3\nb3\na4\nb4\n');
		assert.equal(document.lineCount, 9);
		assertValidLineNumbers(document);
		TextDocument.update(document, [{ text: '\nxx1\nxx2', range: Ranges.forSubstring(document, 'a2\nb2\na3') }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'a1\nb1\n\nxx1\nxx2\nb3\na4\nb4\n');
		assert.equal(document.lineCount, 9);
		assertValidLineNumbers(document);
	});

	test('Incrementally replacing multi-line content, same num of lines but diff chars', () => {
		const document = newDocument('a1\nb1\na2\nb2\na3\nb3\na4\nb4\n');
		assert.equal(document.lineCount, 9);
		assertValidLineNumbers(document);
		TextDocument.update(document, [{ text: '\ny\n', range: Ranges.forSubstring(document, 'a2\nb2\na3') }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'a1\nb1\n\ny\n\nb3\na4\nb4\n');
		assert.equal(document.lineCount, 9);
		assertValidLineNumbers(document);
	});

	test('Incrementally replacing multi-line content, huge number of lines', () => {
		const document = newDocument('a1\ncc\nb1');
		assert.equal(document.lineCount, 3);
		assertValidLineNumbers(document);
		const text = new Array(20000).join('\ndd'); // a string with 19999 `\n`
		TextDocument.update(document, [{ text, range: Ranges.forSubstring(document, '\ncc') }], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'a1' + text + '\nb1');
		assert.equal(document.lineCount, 20001);
		assertValidLineNumbers(document);
	});

	test('Several incremental content changes', () => {
		const document = newDocument('function abc() {\n  console.log("hello, world!");\n}');
		TextDocument.update(document, [
			{ text: 'defg', range: Ranges.create(0, 12, 0, 12) },
			{ text: 'hello, test case!!!', range: Ranges.create(1, 15, 1, 28) },
			{ text: 'hij', range: Ranges.create(0, 16, 0, 16) },
		], 1);
		assert.strictEqual(document.version, 1);
		assert.strictEqual(document.getText(), 'function abcdefghij() {\n  console.log("hello, test case!!!");\n}');
		assertValidLineNumbers(document);
	});

	test('Basic append', () => {
		const document = newDocument('foooo\nbar\nbaz');

		assert.equal(document.offsetAt(Positions.create(2, 0)), 10);

		TextDocument.update(document, [{ text: ' some extra content', range: Ranges.create(1, 3, 1, 3) }], 1);
		assert.equal(document.getText(), 'foooo\nbar some extra content\nbaz');
		assert.equal(document.version, 1);
		assert.equal(document.offsetAt(Positions.create(2, 0)), 29);
		assertValidLineNumbers(document);
	});

	test('Multi-line append', () => {
		const document = newDocument('foooo\nbar\nbaz');

		assert.equal(document.offsetAt(Positions.create(2, 0)), 10);

		TextDocument.update(document, [{ text: ' some extra\ncontent', range: Ranges.create(1, 3, 1, 3) }], 1);
		assert.equal(document.getText(), 'foooo\nbar some extra\ncontent\nbaz');
		assert.equal(document.version, 1);
		assert.equal(document.offsetAt(Positions.create(3, 0)), 29);
		assert.equal(document.lineCount, 4);
		assertValidLineNumbers(document);
	});

	test('Basic delete', () => {
		const document = newDocument('foooo\nbar\nbaz');

		assert.equal(document.offsetAt(Positions.create(2, 0)), 10);

		TextDocument.update(document, [{ text: '', range: Ranges.create(1, 0, 1, 3) }], 1);
		assert.equal(document.getText(), 'foooo\n\nbaz');
		assert.equal(document.version, 1);
		assert.equal(document.offsetAt(Positions.create(2, 0)), 7);
		assertValidLineNumbers(document);
	});

	test('Multi-line delete', () => {
		const lm = newDocument('foooo\nbar\nbaz');

		assert.equal(lm.offsetAt(Positions.create(2, 0)), 10);

		TextDocument.update(lm, [{ text: '', range: Ranges.create(0, 5, 1, 3) }], 1);
		assert.equal(lm.getText(), 'foooo\nbaz');
		assert.equal(lm.version, 1);
		assert.equal(lm.offsetAt(Positions.create(1, 0)), 6);
		assertValidLineNumbers(lm);
	});

	test('Single character replace', () => {
		const document = newDocument('foooo\nbar\nbaz');

		assert.equal(document.offsetAt(Positions.create(2, 0)), 10);

		TextDocument.update(document, [{ text: 'z', range: Ranges.create(1, 2, 1, 3) }], 2);
		assert.equal(document.getText(), 'foooo\nbaz\nbaz');
		assert.equal(document.version, 2);
		assert.equal(document.offsetAt(Positions.create(2, 0)), 10);
		assertValidLineNumbers(document);
	});

	test('Multi-character replace', () => {
		const lm = newDocument('foo\nbar');

		assert.equal(lm.offsetAt(Positions.create(1, 0)), 4);

		TextDocument.update(lm, [{ text: 'foobar', range: Ranges.create(1, 0, 1, 3) }], 1);
		assert.equal(lm.getText(), 'foo\nfoobar');
		assert.equal(lm.version, 1);
		assert.equal(lm.offsetAt(Positions.create(1, 0)), 4);
		assertValidLineNumbers(lm);
	});

	test('Invalid update ranges', () => {
		// Before the document starts -> before the document starts
		let document = newDocument('foo\nbar');
		TextDocument.update(document, [{ text: 'abc123', range: Ranges.create(-2, 0, -1, 3) }], 2);
		assert.equal(document.getText(), 'abc123foo\nbar');
		assert.equal(document.version, 2);
		assertValidLineNumbers(document);

		// Before the document starts -> the middle of document
		document = newDocument('foo\nbar');
		TextDocument.update(document, [{ text: 'foobar', range: Ranges.create(-1, 0, 0, 3) }], 2);
		assert.equal(document.getText(), 'foobar\nbar');
		assert.equal(document.version, 2);
		assert.equal(document.offsetAt(Positions.create(1, 0)), 7);
		assertValidLineNumbers(document);

		// The middle of document -> after the document ends
		document = newDocument('foo\nbar');
		TextDocument.update(document, [{ text: 'foobar', range: Ranges.create(1, 0, 1, 10) }], 2);
		assert.equal(document.getText(), 'foo\nfoobar');
		assert.equal(document.version, 2);
		assert.equal(document.offsetAt(Positions.create(1, 1000)), 10);
		assertValidLineNumbers(document);

		// After the document ends -> after the document ends
		document = newDocument('foo\nbar');
		TextDocument.update(document, [{ text: 'abc123', range: Ranges.create(3, 0, 6, 10) }], 2);
		assert.equal(document.getText(), 'foo\nbarabc123');
		assert.equal(document.version, 2);
		assertValidLineNumbers(document);

		// Before the document starts -> after the document ends
		document = newDocument('foo\nbar');
		TextDocument.update(document, [{ text: 'entirely new content', range: Ranges.create(-1, 1, 2, 10000) }], 2);
		assert.equal(document.getText(), 'entirely new content');
		assert.equal(document.version, 2);
		assert.equal(document.lineCount, 1);
		assertValidLineNumbers(document);
	});
});