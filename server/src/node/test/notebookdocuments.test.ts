/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';

import { Duplex } from 'stream';
import {
	Connection,
	createConnection,
	NotebookDocuments,
	NotebookCell,
	NotebookCellKind,
	TextDocumentItem,
	DidOpenNotebookDocumentNotification,
	DidChangeNotebookDocumentNotification,
} from '../main.js';
import type { NotebookDocumentChangeEvent } from '../../common/notebook.js';

import { TextDocument } from '@vscode/languageserver-textdocument';

class TestStream extends Duplex {
	_write(chunk: string, _encoding: string, done: () => void) {
		this.emit('data', chunk);
		done();
	}
	_read(_size: number) { }
}

const NOTEBOOK_URI = 'file:///my/path/to/notebook.ipynb';
const CELL_1_URI = 'vscode-notebook-cell:/my/path/to/notebook.ipynb#cell1';
const CELL_2_URI = 'vscode-notebook-cell:/my/path/to/notebook.ipynb#cell2';

function mockCellTextDocument(uri: string): TextDocumentItem {
	return { uri, languageId: 'python', version: 1, text: '' };
}

suite('Notebook documents', () => {
	let server: Connection;
	let client: Connection;

	setup(() => {
		const up = new TestStream();
		const down = new TestStream();

		server = createConnection(up, down);
		client = createConnection(down, up);

		server.listen();
		client.listen();
	});

	test('A removed cell is no longer resolvable', async () => {
		const notebooks = new NotebookDocuments(TextDocument);
		notebooks.listen(server);
		const changeEvent = new Promise<NotebookDocumentChangeEvent>(resolve => {
			notebooks.onDidChange(resolve);
		});

		const cell1: NotebookCell = { kind: NotebookCellKind.Code, document: CELL_1_URI };
		const cell2: NotebookCell = { kind: NotebookCellKind.Code, document: CELL_2_URI };
		void client.sendNotification(DidOpenNotebookDocumentNotification.type, {
			notebookDocument: { uri: NOTEBOOK_URI, notebookType: 'jupyter-notebook', version: 1, cells: [cell1, cell2] },
			cellTextDocuments: [mockCellTextDocument(CELL_1_URI), mockCellTextDocument(CELL_2_URI)]
		});
		void client.sendNotification(DidChangeNotebookDocumentNotification.type, {
			notebookDocument: { uri: NOTEBOOK_URI, version: 2 },
			change: { cells: { structure: { array: { start: 1, deleteCount: 1 }, didClose: [{ uri: CELL_2_URI }] } } }
		});

		const event = await changeEvent;
		assert.deepStrictEqual(event.cells?.removed, [cell2]);
		assert.strictEqual(notebooks.getNotebookCell(CELL_2_URI), undefined);
		assert.strictEqual(notebooks.findNotebookDocumentForCell(CELL_2_URI), undefined);
		assert.deepStrictEqual(notebooks.getNotebookCell(CELL_1_URI), cell1);
	});
});
