/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert'
import { Range, Position, Hover, MarkedString, TextEdit } from '../main';

suite('Type guards', () => {
	suite('Position.is', () => {
		test('Position', () => {
			const position: Position = {
				line: 0,
				character: 0
			}
			assert.strictEqual(Position.is(position), true)
		})
		test('empty object', () => {
			const position = {}
			assert.strictEqual(Position.is(position), false)
		})
		test('missing character', () => {
			const position = {
				line: 0,
			}
			assert.strictEqual(Position.is(position), false)
		})
		test('null', () => {
			const position = null
			assert.strictEqual(Position.is(position), false)
		})
		test('undefined', () => {
			const position = undefined
			assert.strictEqual(Position.is(position), false)
		})
	})
	suite('Range.is', () => {
		test('Range', () => {
			const range: Range = {
				start: {
					line: 0,
					character: 0
				},
				end: {
					line: 1,
					character: 1
				}
			}
			assert.strictEqual(Range.is(range), true)
		})
		test('empty object', () => {
			const range = {}
			assert.strictEqual(Range.is(range), false)
		})
		test('null', () => {
			const range = null
			assert.strictEqual(Range.is(range), false)
		})
		test('undefined', () => {
			const range = undefined
			assert.strictEqual(Range.is(range), false)
		})
	})
	suite('MarkedString.is', () => {
		test('string', () => {
			const markedString = 'test'
			assert.strictEqual(MarkedString.is(markedString), true)
		})
		test('language and value', () => {
			const markedString = { language: 'foo', value: 'test' }
			assert.strictEqual(MarkedString.is(markedString), true)
		})
		test('null', () => {
			const markedString = null
			assert.strictEqual(MarkedString.is(markedString), false)
		})
		test('undefined', () => {
			const markedString = undefined
			assert.strictEqual(MarkedString.is(markedString), false)
		})
	})
	suite('Hover.is', () => {
		test('string contents', () => {
			const hover = {
				contents: 'test'
			}
			assert.strictEqual(Hover.is(hover), true)
		})
		test('MarkupContent contents', () => {
			const hover = {
				contents: {
					kind: 'plaintext',
					value: 'test'
				}
			}
			assert.strictEqual(Hover.is(hover), true)
		})
		test('MarkupContent contents array', () => {
			const hover = {
				contents: [{
					kind: 'plaintext',
					value: 'test'
				}]
			}
			assert.strictEqual(Hover.is(hover), false)
		})
		test('contents array', () => {
			const hover = {
				contents: [
					'test',
					{
						language: 'foo',
						value: 'test'
					}
				]
			}
			assert.strictEqual(Hover.is(hover), true)
		})
		test('null range', () => {
			const hover = {
				contents: 'test',
				range: null
			}
			assert.strictEqual(Hover.is(hover), false)
		})
		test('null contents', () => {
			const hover = {
				contents: null
			}
			assert.strictEqual(Hover.is(hover), false)
		})
		test('contents array with null', () => {
			const hover = {
				contents: [null]
			}
			assert.strictEqual(Hover.is(hover), false)
		})
		test('null', () => {
			const hover = null
			assert.strictEqual(Hover.is(hover), false)
		})
		test('undefined', () => {
			const hover = undefined
			assert.strictEqual(Hover.is(hover), false)
		})
	})
	suite('TextEdit.is', () => {
		test('string contents, range defined', () => {
			const edit = {
				newText: 'test',
				range: Range.create(Position.create(0, 0), Position.create(0, 1)),
			}
			assert.strictEqual(TextEdit.is(edit), true)
		})
		test('string contents, range undefined', () => {
			const edit = {
				newText: 'test',
				range: undefined,
			}
			assert.strictEqual(TextEdit.is(edit), false)
		})
		test('string contents, range null', () => {
			const edit = {
				newText: 'test',
				range: null,
			}
			assert.strictEqual(TextEdit.is(edit), false)
		})
		test('null contents, range defined', () => {
			const edit = {
				contents: null,
				range: Range.create(Position.create(0, 0), Position.create(0, 1)),
			}
			assert.strictEqual(TextEdit.is(edit), false)
		})
		test('undefined contents, range defined', () => {
			const edit = {
				contents: undefined,
				range: Range.create(Position.create(0, 0), Position.create(0, 1)),
			}
			assert.strictEqual(TextEdit.is(edit), false)
		})
		test('null', () => {
			const edit = null
			assert.strictEqual(TextEdit.is(edit), false)
		})
		test('undefined', () => {
			const edit = undefined
			assert.strictEqual(TextEdit.is(edit), false)
		})
	})
})