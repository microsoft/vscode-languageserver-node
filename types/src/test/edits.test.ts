/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import { TextDocument, TextEdit, Position, Range, WorkspaceChange, WorkspaceEdit, AnnotatedTextEdit, ChangeAnnotation } from '../main';

const applyEdits = TextDocument.applyEdits;

suite('Edits', () => {

	test('inserts', function (): any {
		const input = TextDocument.create('foo://bar/f', 'html', 0, '012345678901234567890123456789');
		assert.equal(applyEdits(input, [TextEdit.insert(Position.create(0, 0), 'Hello')]), 'Hello012345678901234567890123456789');
		assert.equal(applyEdits(input, [TextEdit.insert(Position.create(0, 1), 'Hello')]), '0Hello12345678901234567890123456789');
		assert.equal(applyEdits(input, [TextEdit.insert(Position.create(0, 1), 'Hello'), TextEdit.insert(Position.create(0, 1), 'World')]), '0HelloWorld12345678901234567890123456789');
		assert.equal(applyEdits(input, [TextEdit.insert(Position.create(0, 2), 'One'), TextEdit.insert(Position.create(0, 1), 'Hello'), TextEdit.insert(Position.create(0, 1), 'World'), TextEdit.insert(Position.create(0, 2), 'Two'), TextEdit.insert(Position.create(0, 2), 'Three')]), '0HelloWorld1OneTwoThree2345678901234567890123456789');
	});

	test('replace', function (): any {
		const input = TextDocument.create('foo://bar/f', 'html', 0, '012345678901234567890123456789');
		assert.equal(applyEdits(input, [TextEdit.replace(Range.create(Position.create(0, 3), Position.create(0, 6)), 'Hello')]), '012Hello678901234567890123456789');
		assert.equal(applyEdits(input, [TextEdit.replace(Range.create(Position.create(0, 3), Position.create(0, 6)), 'Hello'), TextEdit.replace(Range.create(Position.create(0, 6), Position.create(0, 9)), 'World')]), '012HelloWorld901234567890123456789');
		assert.equal(applyEdits(input, [TextEdit.replace(Range.create(Position.create(0, 3), Position.create(0, 6)), 'Hello'), TextEdit.insert(Position.create(0, 6), 'World')]), '012HelloWorld678901234567890123456789');
		assert.equal(applyEdits(input, [TextEdit.insert(Position.create(0, 6), 'World'), TextEdit.replace(Range.create(Position.create(0, 3), Position.create(0, 6)), 'Hello')]), '012HelloWorld678901234567890123456789');
		assert.equal(applyEdits(input, [TextEdit.insert(Position.create(0, 3), 'World'), TextEdit.replace(Range.create(Position.create(0, 3), Position.create(0, 6)), 'Hello')]), '012WorldHello678901234567890123456789');

	});

	test('overlap', function (): any {
		const input = TextDocument.create('foo://bar/f', 'html', 0, '012345678901234567890123456789');
		assert.throws(() => applyEdits(input, [TextEdit.replace(Range.create(Position.create(0, 3), Position.create(0, 6)), 'Hello'), TextEdit.insert(Position.create(0, 3), 'World')]));
		assert.throws(() => applyEdits(input, [TextEdit.replace(Range.create(Position.create(0, 3), Position.create(0, 6)), 'Hello'), TextEdit.insert(Position.create(0, 4), 'World')]));
	});

	test('multiline', function (): any {
		const input = TextDocument.create('foo://bar/f', 'html', 0, '0\n1\n2\n3\n4');
		assert.equal(applyEdits(input, [TextEdit.replace(Range.create(Position.create(2, 0), Position.create(3, 0)), 'Hello'), TextEdit.insert(Position.create(1, 1), 'World')]), '0\n1World\nHello3\n4');
	});

});

suite('WorkspaceChange', () => {

	test('keeps change annotations of an existing edit', function (): any {
		const workspaceEdit: WorkspaceEdit = {
			documentChanges: [{ textDocument: { uri: 'file:///abc.txt', version: 1 }, edits: [AnnotatedTextEdit.insert(Position.create(0, 0), 'insert', 'a1')] }],
			changeAnnotations: { a1: ChangeAnnotation.create('label', true) }
		};
		const workspaceChange = new WorkspaceChange(workspaceEdit);
		assert.deepStrictEqual(workspaceChange.edit.changeAnnotations, { a1: ChangeAnnotation.create('label', true) });
	});

	test('does not reuse ids of existing change annotations', function (): any {
		const first = new WorkspaceChange();
		first.getTextEditChange({ uri: 'file:///abc.txt', version: 1 }).insert(Position.create(0, 0), 'first', ChangeAnnotation.create('first'));
		const second = new WorkspaceChange(first.edit);
		const id = second.getTextEditChange({ uri: 'file:///xyz.txt', version: 1 }).insert(Position.create(0, 0), 'second', ChangeAnnotation.create('second'));
		const annotations = second.edit.changeAnnotations!;
		assert.notStrictEqual(id, '1');
		assert.strictEqual(annotations['1'].label, 'first');
		assert.strictEqual(annotations[id].label, 'second');
	});

});