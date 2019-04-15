/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import { TextDocument, Range, Position, TextDocumentContentChangeEvent } from '../main';

interface UpdateableDocument extends TextDocument {
	update(event: TextDocumentContentChangeEvent, version: number): void;
}

function isUpdateableDocument(value: TextDocument): value is UpdateableDocument {
	const updateFunc = (value as UpdateableDocument).update;
	return Object.prototype.toString.call(updateFunc) === '[object Function]';
}

function newDocument(str: string, isFullSync: boolean): UpdateableDocument {
	const doc = TextDocument.create('file://foo/bar', "text", 0, str, isFullSync);

	if (!isUpdateableDocument(doc)) {
		throw new Error('Document must be updateable!');
	}

	return doc;
}

suite('TextDocument Lines Model Validator', () => {
	// Generates test cases to be shared between Full and Incrementally Synced
	// variants - the inputs can be the same, as the implementations of each
	// function are black-boxes
	function generateSharedTests(config: { isFullSync: boolean }): void {
		const docType = config.isFullSync ? 'FullTextDocument' : 'IncrementalTextDocument';

		test(`${docType} - Single line`, () => {
			let str = "Hello World";
			let lm = newDocument(str, config.isFullSync);
			assert.equal(lm.lineCount, 1);

			for (let i = 0; i < str.length; i++) {
				assert.equal(lm.offsetAt(Position.create(0, i)), i);
				assert.deepEqual(lm.positionAt(i), Position.create(0, i));
			}
		});

		test(`${docType} - Multiple lines`, () => {
			let str = "ABCDE\nFGHIJ\nKLMNO\n";
			let lm = newDocument(str, config.isFullSync);
			assert.equal(lm.lineCount, 4);

			for (let i = 0; i < str.length; i++) {
				let line = Math.floor(i / 6);
				let column = i % 6;

				assert.equal(lm.offsetAt(Position.create(line, column)), i);
				assert.deepEqual(lm.positionAt(i), Position.create(line, column));
			}

			assert.equal(lm.offsetAt(Position.create(3, 0)), 18);
			assert.equal(lm.offsetAt(Position.create(3, 1)), 18);
			assert.deepEqual(lm.positionAt(18), Position.create(3, 0));
			assert.deepEqual(lm.positionAt(19), Position.create(3, 0));
		});

		test(`${docType} - New line characters`, () => {
			let str = "ABCDE\rFGHIJ";
			assert.equal(newDocument(str, config.isFullSync).lineCount, 2);

			str = "ABCDE\nFGHIJ";
			assert.equal(newDocument(str, config.isFullSync).lineCount, 2);

			str = "ABCDE\r\nFGHIJ";
			assert.equal(newDocument(str, config.isFullSync).lineCount, 2);

			str = "ABCDE\n\nFGHIJ";
			assert.equal(newDocument(str, config.isFullSync).lineCount, 3);

			str = "ABCDE\r\rFGHIJ";
			assert.equal(newDocument(str, config.isFullSync).lineCount, 3);

			str = "ABCDE\n\rFGHIJ";
			assert.equal(newDocument(str, config.isFullSync).lineCount, 3);
		})

		test(`${docType} - getText(Range)`, () => {
			let str = "12345\n12345\n12345";
			let lm = newDocument(str, config.isFullSync);
			assert.equal(lm.getText(), str);
			assert.equal(lm.getText(Range.create(-1, 0, 0, 5)), "12345");
			assert.equal(lm.getText(Range.create(0, 0, 0, 5)), "12345");
			assert.equal(lm.getText(Range.create(0, 4, 1, 1)), "5\n1");
			assert.equal(lm.getText(Range.create(0, 4, 2, 1)), "5\n12345\n1");
			assert.equal(lm.getText(Range.create(0, 4, 3, 1)), "5\n12345\n12345");
			assert.equal(lm.getText(Range.create(0, 0, 3, 5)), str);
		});

		test(`${docType} - Invalid inputs`, () => {
			let str = "Hello World";
			let lm = newDocument(str, config.isFullSync);

			// invalid position
			assert.equal(lm.offsetAt(Position.create(0, str.length)), str.length);
			assert.equal(lm.offsetAt(Position.create(0, str.length + 3)), str.length);
			assert.equal(lm.offsetAt(Position.create(2, 3)), str.length);
			assert.equal(lm.offsetAt(Position.create(-1, 3)), 0);
			assert.equal(lm.offsetAt(Position.create(0, -3)), 0);
			assert.equal(lm.offsetAt(Position.create(-1, -1)), 0);
			assert.equal(lm.offsetAt(Position.create(1, -3)), str.length);

			// invalid offsets
			assert.deepEqual(lm.positionAt(-1), Position.create(0, 0));
			assert.deepEqual(lm.positionAt(str.length), Position.create(0, str.length));
			assert.deepEqual(lm.positionAt(str.length + 3), Position.create(0, str.length));
		});
	}

	generateSharedTests({ isFullSync: true });
	generateSharedTests({ isFullSync: false });
});

suite('Updateable TextDocument Validator', () => {
	test('FullTextDocument - update', () => {
		let lm = newDocument("foooo\nbar\nbaz", true);

		assert.equal(lm.offsetAt(Position.create(2, 0)), 10);

		lm.update({ text: "foooo\nbar some extra content\nbaz" }, 2);
		assert.equal(lm.getText(), "foooo\nbar some extra content\nbaz");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(2, 0)), 29);
	});

	test('IncrementalTextDocument - basic append', () => {
		let lm = newDocument("foooo\nbar\nbaz", false);

		assert.equal(lm.offsetAt(Position.create(2, 0)), 10);

		lm.update({ text: " some extra content", range: Range.create(1, 3, 1, 3) }, 2);
		assert.equal(lm.getText(), "foooo\nbar some extra content\nbaz");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(2, 0)), 29);
	});

	test('IncrementalTextDocument - multi-line append', () => {
		let lm = newDocument("foooo\nbar\nbaz", false);

		assert.equal(lm.offsetAt(Position.create(2, 0)), 10);

		lm.update({ text: " some extra\ncontent", range: Range.create(1, 3, 1, 3) }, 2);
		assert.equal(lm.getText(), "foooo\nbar some extra\ncontent\nbaz");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(3, 0)), 29);
		assert.equal(lm.lineCount, 4);
	});

	test('IncrementalTextDocument - basic delete', () => {
		let lm = newDocument("foooo\nbar\nbaz", false);

		assert.equal(lm.offsetAt(Position.create(2, 0)), 10);

		lm.update({ text: "", range: Range.create(1, 0, 1, 3) }, 2);
		assert.equal(lm.getText(), "foooo\n\nbaz");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(2, 0)), 7);
	});

	test('IncrementalTextDocument - multi-line delete', () => {
		let lm = newDocument("foooo\nbar\nbaz", false);

		assert.equal(lm.offsetAt(Position.create(2, 0)), 10);

		lm.update({ text: "", range: Range.create(0, 5, 1, 3) }, 2);
		assert.equal(lm.getText(), "foooo\nbaz");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(1, 0)), 6);
	});

	test('IncrementalTextDocument - single character replace', () => {
		let lm = newDocument("foooo\nbar\nbaz", false);

		assert.equal(lm.offsetAt(Position.create(2, 0)), 10);

		lm.update({ text: "z", range: Range.create(1, 2, 1, 3) }, 2);
		assert.equal(lm.getText(), "foooo\nbaz\nbaz");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(2, 0)), 10);
	});

	test('IncrementalTextDocument - multi-character replace', () => {
		let lm = newDocument("foo\nbar", false);

		assert.equal(lm.offsetAt(Position.create(1, 0)), 4);

		lm.update({ text: "foobar", range: Range.create(1, 0, 1, 3) }, 2);
		assert.equal(lm.getText(), "foo\nfoobar");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(1, 0)), 4);
	});

	test('IncrementalTextDocument - invalid update ranges', () => {
		// Before the document starts
		let lm = newDocument("foo\nbar", false);
		lm.update({ text: "foobar", range: Range.create(-1, 0, 0, 3) }, 2);
		assert.equal(lm.getText(), "foobar\nbar");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(1, 0)), 7);

		// After the document ends
		lm = newDocument("foo\nbar", false);
		lm.update({ text: "foobar", range: Range.create(1, 0, 1, 10) }, 2);
		assert.equal(lm.getText(), "foo\nfoobar");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(1, 1000)), 10);

		// Before the document starts and after the document ends
		lm = newDocument("foo\nbar", false);
		lm.update({ text: "entirely new content", range: Range.create(-1, 1, 2, 10000) }, 2);
		assert.equal(lm.getText(), "entirely new content");
		assert.equal(lm.version, 2);
		assert.equal(lm.lineCount, 1);
	});
});
