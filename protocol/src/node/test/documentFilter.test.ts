/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';

import {
	DiagnosticServerCancellationData, DocumentSelector, NotebookCellTextDocumentFilter, NotebookDocumentFilter,
	RelativePattern, TextDocumentFilter, TextDocumentRegistrationOptions, WorkDoneProgressOptions
} from '../main';

suite('Document filter type guards', () => {

	const relativePattern: RelativePattern = { baseUri: 'file:///workspace', pattern: '**/*.ipynb' };

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

	suite('TextDocumentFilter.is', () => {
		test('string filter', () => {
			assert.strictEqual(TextDocumentFilter.is('typescript'), true);
		});
		test('language filter', () => {
			assert.strictEqual(TextDocumentFilter.is({ language: 'typescript' }), true);
		});
		test('scheme filter', () => {
			assert.strictEqual(TextDocumentFilter.is({ scheme: 'file' }), true);
		});
		test('pattern filter with string pattern', () => {
			assert.strictEqual(TextDocumentFilter.is({ pattern: '**/*.ts' }), true);
		});
		test('pattern filter with relative pattern', () => {
			assert.strictEqual(TextDocumentFilter.is({ pattern: relativePattern }), true);
		});
		test('null and undefined', () => {
			assert.strictEqual(TextDocumentFilter.is(null), false);
			assert.strictEqual(TextDocumentFilter.is(undefined), false);
		});
		test('invalid values', () => {
			assert.strictEqual(TextDocumentFilter.is({}), false);
			assert.strictEqual(TextDocumentFilter.is(123), false);
			assert.strictEqual(TextDocumentFilter.is(true), false);
			assert.strictEqual(TextDocumentFilter.is({ pattern: 123 }), false);
		});
	});

	suite('DocumentSelector.is', () => {
		test('notebook cell filter with relative pattern', () => {
			const documentSelector = [{ notebook: { pattern: relativePattern } }];
			assert.strictEqual(DocumentSelector.is(documentSelector), true);
			assert.strictEqual(TextDocumentRegistrationOptions.is({ documentSelector }), true);
		});
		test('null and undefined elements', () => {
			assert.strictEqual(DocumentSelector.is([null]), false);
			assert.strictEqual(DocumentSelector.is([undefined]), false);
			assert.strictEqual(DocumentSelector.is(['typescript', null]), false);
		});
		test('null and undefined selector', () => {
			assert.strictEqual(DocumentSelector.is(null), false);
			assert.strictEqual(DocumentSelector.is(undefined), false);
		});
	});

	suite('TextDocumentRegistrationOptions.is', () => {
		test('valid registration options', () => {
			assert.strictEqual(TextDocumentRegistrationOptions.is({ documentSelector: ['typescript'] }), true);
			assert.strictEqual(TextDocumentRegistrationOptions.is({ documentSelector: null }), true);
		});
		test('invalid registration options', () => {
			assert.strictEqual(TextDocumentRegistrationOptions.is({ documentSelector: [null] }), false);
			assert.strictEqual(TextDocumentRegistrationOptions.is({ documentSelector: [undefined] }), false);
		});
		test('null and undefined', () => {
			assert.strictEqual(TextDocumentRegistrationOptions.is(null), false);
			assert.strictEqual(TextDocumentRegistrationOptions.is(undefined), false);
			assert.strictEqual(TextDocumentRegistrationOptions.is(123), false);
		});
	});

	suite('WorkDoneProgressOptions and DiagnosticServerCancellationData null handling', () => {
		test('WorkDoneProgressOptions.hasWorkDoneProgress', () => {
			assert.strictEqual(WorkDoneProgressOptions.hasWorkDoneProgress({ workDoneProgress: true }), true);
			assert.strictEqual(WorkDoneProgressOptions.hasWorkDoneProgress({ workDoneProgress: false }), true);
			assert.strictEqual(WorkDoneProgressOptions.hasWorkDoneProgress({}), false);
			assert.strictEqual(WorkDoneProgressOptions.hasWorkDoneProgress(null), false);
			assert.strictEqual(WorkDoneProgressOptions.hasWorkDoneProgress(undefined), false);
		});
		test('DiagnosticServerCancellationData.is', () => {
			assert.strictEqual(DiagnosticServerCancellationData.is({ retriggerRequest: true }), true);
			assert.strictEqual(DiagnosticServerCancellationData.is({ retriggerRequest: false }), true);
			assert.strictEqual(DiagnosticServerCancellationData.is({}), false);
			assert.strictEqual(DiagnosticServerCancellationData.is(null), false);
			assert.strictEqual(DiagnosticServerCancellationData.is(undefined), false);
		});
	});
});
