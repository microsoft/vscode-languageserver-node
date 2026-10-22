/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import {
	Range, Position, Hover, MarkedString, TextEdit, ColorPresentation, FoldingRange, Location, DiagnosticRelatedInformation, Diagnostic, Command,
	TextDocumentEdit, TextDocumentIdentifier, VersionedTextDocumentIdentifier, OptionalVersionedTextDocumentIdentifier, TextDocumentItem,
	CodeActionContext, CodeLens, FormattingOptions, DocumentLink, InlineValueContext, TextDocument
} from '../main.js';

suite('Type guards', () => {
	suite('Position.is', () => {
		test('Position', () => {
			const position: Position = {
				line: 0,
				character: 0
			};
			assert.strictEqual(Position.is(position), true);
		});
		test('empty object', () => {
			const position = {};
			assert.strictEqual(Position.is(position), false);
		});
		test('missing character', () => {
			const position = {
				line: 0,
			};
			assert.strictEqual(Position.is(position), false);
		});
		test('null', () => {
			const position = null;
			assert.strictEqual(Position.is(position), false);
		});
		test('undefined', () => {
			const position = undefined;
			assert.strictEqual(Position.is(position), false);
		});
	});
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
			};
			assert.strictEqual(Range.is(range), true);
		});
		test('empty object', () => {
			const range = {};
			assert.strictEqual(Range.is(range), false);
		});
		test('null', () => {
			const range = null;
			assert.strictEqual(Range.is(range), false);
		});
		test('undefined', () => {
			const range = undefined;
			assert.strictEqual(Range.is(range), false);
		});
	});
	suite('FoldingRange.is', () => {
		test('FoldingRange', () => {
			assert.strictEqual(FoldingRange.is(FoldingRange.create(0, 1)), true);
		});
		test('missing endLine', () => {
			const foldingRange = {
				startLine: 0
			};
			assert.strictEqual(FoldingRange.is(foldingRange), false);
		});
	});
	suite('MarkedString.is', () => {
		test('string', () => {
			const markedString = 'test';
			assert.strictEqual(MarkedString.is(markedString), true);
		});
		test('language and value', () => {
			const markedString = { language: 'foo', value: 'test' };
			assert.strictEqual(MarkedString.is(markedString), true);
		});
		test('null', () => {
			const markedString = null;
			assert.strictEqual(MarkedString.is(markedString), false);
		});
		test('undefined', () => {
			const markedString = undefined;
			assert.strictEqual(MarkedString.is(markedString), false);
		});
	});
	suite('Hover.is', () => {
		test('string contents', () => {
			const hover = {
				contents: 'test'
			};
			assert.strictEqual(Hover.is(hover), true);
		});
		test('MarkupContent contents', () => {
			const hover = {
				contents: {
					kind: 'plaintext',
					value: 'test'
				}
			};
			assert.strictEqual(Hover.is(hover), true);
		});
		test('MarkupContent contents array', () => {
			const hover = {
				contents: [{
					kind: 'plaintext',
					value: 'test'
				}]
			};
			assert.strictEqual(Hover.is(hover), false);
		});
		test('contents array', () => {
			const hover = {
				contents: [
					'test',
					{
						language: 'foo',
						value: 'test'
					}
				]
			};
			assert.strictEqual(Hover.is(hover), true);
		});
		test('null range', () => {
			const hover = {
				contents: 'test',
				range: null
			};
			assert.strictEqual(Hover.is(hover), false);
		});
		test('null contents', () => {
			const hover = {
				contents: null
			};
			assert.strictEqual(Hover.is(hover), false);
		});
		test('contents array with null', () => {
			const hover = {
				contents: [null]
			};
			assert.strictEqual(Hover.is(hover), false);
		});
		test('null', () => {
			const hover = null;
			assert.strictEqual(Hover.is(hover), false);
		});
		test('undefined', () => {
			const hover = undefined;
			assert.strictEqual(Hover.is(hover), false);
		});
	});
	suite('TextEdit.is', () => {
		test('string contents, range defined', () => {
			const edit = {
				newText: 'test',
				range: Range.create(Position.create(0, 0), Position.create(0, 1)),
			};
			assert.strictEqual(TextEdit.is(edit), true);
		});
		test('string contents, range undefined', () => {
			const edit = {
				newText: 'test',
				range: undefined,
			};
			assert.strictEqual(TextEdit.is(edit), false);
		});
		test('string contents, range null', () => {
			const edit = {
				newText: 'test',
				range: null,
			};
			assert.strictEqual(TextEdit.is(edit), false);
		});
		test('null contents, range defined', () => {
			const edit = {
				contents: null,
				range: Range.create(Position.create(0, 0), Position.create(0, 1)),
			};
			assert.strictEqual(TextEdit.is(edit), false);
		});
		test('undefined contents, range defined', () => {
			const edit = {
				contents: undefined,
				range: Range.create(Position.create(0, 0), Position.create(0, 1)),
			};
			assert.strictEqual(TextEdit.is(edit), false);
		});
		test('null', () => {
			const edit = null;
			assert.strictEqual(TextEdit.is(edit), false);
		});
		test('undefined', () => {
			const edit = undefined;
			assert.strictEqual(TextEdit.is(edit), false);
		});
	});
	suite('ColorPresentation.is', () => {
		test('with textEdit', () => {
			const presentation = ColorPresentation.create('red', TextEdit.insert(Position.create(0, 0), 'red'));
			assert.strictEqual(ColorPresentation.is(presentation), true);
		});
	});
	suite('null and undefined', () => {
		const range = Range.create(0, 0, 0, 1);
		const guards: [string, (value: any) => boolean, any][] = [
			['DiagnosticRelatedInformation', DiagnosticRelatedInformation.is, DiagnosticRelatedInformation.create(Location.create('file:///a', range), 'message')],
			['Diagnostic', Diagnostic.is, Diagnostic.create(range, 'message')],
			['Command', Command.is, Command.create('title', 'command')],
			['TextDocumentEdit', TextDocumentEdit.is, TextDocumentEdit.create(OptionalVersionedTextDocumentIdentifier.create('file:///a', null), [])],
			['TextDocumentIdentifier', TextDocumentIdentifier.is, TextDocumentIdentifier.create('file:///a')],
			['VersionedTextDocumentIdentifier', VersionedTextDocumentIdentifier.is, VersionedTextDocumentIdentifier.create('file:///a', 1)],
			['OptionalVersionedTextDocumentIdentifier', OptionalVersionedTextDocumentIdentifier.is, OptionalVersionedTextDocumentIdentifier.create('file:///a', null)],
			['TextDocumentItem', TextDocumentItem.is, TextDocumentItem.create('file:///a', 'plaintext', 1, 'text')],
			['CodeActionContext', CodeActionContext.is, CodeActionContext.create([])],
			['CodeLens', CodeLens.is, CodeLens.create(range)],
			['FormattingOptions', FormattingOptions.is, FormattingOptions.create(4, true)],
			['DocumentLink', DocumentLink.is, DocumentLink.create(range)],
			['InlineValueContext', InlineValueContext.is, InlineValueContext.create(1, range)],
			['TextDocument', TextDocument.is, TextDocument.create('file:///a', 'plaintext', 1, 'text')],
		];
		for (const [label, is, valid] of guards) {
			test(label, () => {
				assert.strictEqual(is(valid), true);
				assert.strictEqual(is(null), false);
				assert.strictEqual(is(undefined), false);
			});
		}
		test('nested null', () => {
			assert.strictEqual(CodeLens.is({ range, command: null }), false);
			assert.strictEqual(Diagnostic.is({ range, message: 'message', relatedInformation: [null] }), false);
			assert.strictEqual(CodeActionContext.is({ diagnostics: [null] }), false);
		});
	});
});
