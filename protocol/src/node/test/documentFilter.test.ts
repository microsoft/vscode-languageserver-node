/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';

import { DocumentSelector, NotebookCellTextDocumentFilter, NotebookDocumentFilter, RelativePattern, TextDocumentFilter, TextDocumentRegistrationOptions } from '../main';

suite('Document filter type guards', () => {

	const relativePattern: RelativePattern = { baseUri: 'file:///workspace', pattern: '**/*.ipynb' };

	suite('TextDocumentFilter.is', () => {
		test('valid filters', () => {
			assert.strictEqual(TextDocumentFilter.is('typescript'), true);
			assert.strictEqual(TextDocumentFilter.is({ language: 'typescript' }), true);
			assert.strictEqual(TextDocumentFilter.is({ scheme: 'file' }), true);
			assert.strictEqual(TextDocumentFilter.is({ pattern: '**/*.ts' }), true);
		});
		test('null and undefined', () => {
			assert.strictEqual(TextDocumentFilter.is(null), false);
			assert.strictEqual(TextDocumentFilter.is(undefined), false);
		});
	});

	suite('NotebookDocumentFilter.is', () => {
		test('string pattern', () => {
			assert.strictEqual(NotebookDocumentFilter.is({ pattern: '**/*.ipynb' }), true);
		});
		test('relative pattern', () => {
			assert.strictEqual(NotebookDocumentFilter.is({ pattern: relativePattern }), true);
		});
		test('relative pattern with workspace folder', () => {
			const pattern: RelativePattern = { baseUri: { uri: 'file:///workspace', name: 'workspace' }, pattern: '**/*.ipynb' };
			assert.strictEqual(NotebookDocumentFilter.is({ pattern }), true);
		});
		test('invalid pattern', () => {
			assert.strictEqual(NotebookDocumentFilter.is({}), false);
			assert.strictEqual(NotebookDocumentFilter.is({ pattern: 1 }), false);
			assert.strictEqual(NotebookDocumentFilter.is({ pattern: {} }), false);
			assert.strictEqual(NotebookDocumentFilter.is({ pattern: { baseUri: 1, pattern: '**/*.ipynb' } }), false);
		});
	});

	suite('NotebookCellTextDocumentFilter.is', () => {
		test('notebook filter with relative pattern', () => {
			assert.strictEqual(NotebookCellTextDocumentFilter.is({ notebook: { pattern: relativePattern }, language: 'python' }), true);
			assert.strictEqual(NotebookCellTextDocumentFilter.is({ notebook: { pattern: relativePattern } }), true);
		});
		test('text document filter with relative pattern', () => {
			assert.strictEqual(NotebookCellTextDocumentFilter.is({ language: 'python', pattern: relativePattern }), false);
		});
	});

	suite('DocumentSelector.is', () => {
		test('null and undefined elements', () => {
			assert.strictEqual(DocumentSelector.is([null as any]), false);
			assert.strictEqual(DocumentSelector.is([undefined as any]), false);
		});
		test('notebook cell filter with relative pattern', () => {
			const documentSelector = [{ notebook: { pattern: relativePattern } }];
			assert.strictEqual(DocumentSelector.is(documentSelector), true);
			assert.strictEqual(TextDocumentRegistrationOptions.is({ documentSelector }), true);
		});
		test('TextDocumentRegistrationOptions.is with null and undefined', () => {
			assert.strictEqual(TextDocumentRegistrationOptions.is(null), false);
			assert.strictEqual(TextDocumentRegistrationOptions.is(undefined), false);
			assert.strictEqual(TextDocumentRegistrationOptions.is({ documentSelector: [null] }), false);
		});
	});
});
