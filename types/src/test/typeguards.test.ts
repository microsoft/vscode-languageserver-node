import * as assert from 'assert'
import { Range, Position } from '../main';

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
})