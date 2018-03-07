/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import { TextDocument, Range, Position } from '../main';

suite('Text Document Lines Model Validator', () => {
	function newDocument(str: string) {
		return TextDocument.create('file://foo/bar', "text", 0, str);
	}

	test('Single line', () => {
		var str = "Hello World";
		var lm = newDocument(str);
		assert.equal(lm.lineCount, 1);

		for (var i = 0; i < str.length; i++) {
			assert.equal(lm.offsetAt(Position.create(0, i)), i);
			assert.deepEqual(lm.positionAt(i), Position.create(0, i));
		}
	});

	test('Multiple lines', () => {
		var str = "ABCDE\nFGHIJ\nKLMNO\n";
		var lm = newDocument(str);
		assert.equal(lm.lineCount, 4);

		for (var i = 0; i < str.length; i++) {
			var line = Math.floor(i / 6);
			var column = i % 6;

			assert.equal(lm.offsetAt(Position.create(line, column)), i);
			assert.deepEqual(lm.positionAt(i), Position.create(line, column));
		}

		assert.equal(lm.offsetAt(Position.create(3, 0)), 18);
		assert.equal(lm.offsetAt(Position.create(3, 1)), 18);
		assert.deepEqual(lm.positionAt(18), Position.create(3, 0));
		assert.deepEqual(lm.positionAt(19), Position.create(3, 0));
	});

	test('New line characters', () => {
		var str = "ABCDE\rFGHIJ";
		assert.equal(newDocument(str).lineCount, 2);

		var str = "ABCDE\nFGHIJ";
		assert.equal(newDocument(str).lineCount, 2);

		var str = "ABCDE\r\nFGHIJ";
		assert.equal(newDocument(str).lineCount, 2);

		str = "ABCDE\n\nFGHIJ";
		assert.equal(newDocument(str).lineCount, 3);

		str = "ABCDE\r\rFGHIJ";
		assert.equal(newDocument(str).lineCount, 3);

		str = "ABCDE\n\rFGHIJ";
		assert.equal(newDocument(str).lineCount, 3);
	})

	test('getText(Range)', () => {
		var str = "12345\n12345\n12345";
		var lm = newDocument(str);
		assert.equal(lm.getText(), str);
		assert.equal(lm.getText(Range.create(-1, 0, 0, 5)), "12345");
		assert.equal(lm.getText(Range.create(0, 0, 0, 5)), "12345");
		assert.equal(lm.getText(Range.create(0, 4, 1, 1)), "5\n1");
		assert.equal(lm.getText(Range.create(0, 4, 2, 1)), "5\n12345\n1");
		assert.equal(lm.getText(Range.create(0, 4, 3, 1)), "5\n12345\n12345");
		assert.equal(lm.getText(Range.create(0, 0, 3, 5)), str);
	});

	test('Invalid inputs', () => {
		var str = "Hello World";
		var lm = newDocument(str);

		// invalid position
		assert.equal(lm.offsetAt(Position.create(0, str.length)), str.length);
		assert.equal(lm.offsetAt(Position.create(0, str.length + 3)), str.length);
		assert.equal(lm.offsetAt(Position.create(2, 3)), str.length);
		assert.equal(lm.offsetAt(Position.create(-1, 3)), 0);
		assert.equal(lm.offsetAt(Position.create(0, -3)), 0);
		assert.equal(lm.offsetAt(Position.create(1, -3)), str.length);

		// invalid offsets
		assert.deepEqual(lm.positionAt(-1), Position.create(0, 0));
		assert.deepEqual(lm.positionAt(str.length), Position.create(0, str.length));
		assert.deepEqual(lm.positionAt(str.length + 3), Position.create(0, str.length));
	});
});
