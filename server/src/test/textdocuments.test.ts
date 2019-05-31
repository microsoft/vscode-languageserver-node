/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';

import { Duplex } from 'stream';
import {
	TextDocuments,
	IConnection,
	createConnection,
	DidOpenTextDocumentParams,
	TextDocumentContentChangeEvent,
	DidChangeTextDocumentParams,
	DidOpenTextDocumentNotification,
	DidChangeTextDocumentNotification,
	TextDocumentSyncKind,
	Range
} from '../main';
import { TextDocument, Position } from 'vscode-languageserver-types';

class TestStream extends Duplex {
	_write(chunk: string, _encoding: string, done: () => void) {
		this.emit('data', chunk);
		done();
	}
	_read(_size: number) { }
}

const TEST_URI = 'file:///my/path/to/my-file.ts';
const TEST_LANGUAGE_ID = 'typescript';

function mockOpenDocNotif(config: { version: number, text: string }): DidOpenTextDocumentParams {
	const { version, text } = config;
	return { textDocument: { uri: TEST_URI, languageId: TEST_LANGUAGE_ID, version, text } };
}

function mockChangeDocNotif(config: { version: number, contentChanges: TextDocumentContentChangeEvent[] }): DidChangeTextDocumentParams {
	const { version, contentChanges } = config;
	return { textDocument: { uri: TEST_URI, version }, contentChanges };
}

suite('TextDocuments Tests', () => {
	let server: IConnection;
	let client: IConnection;

	beforeEach(() => {
		const up = new TestStream();
		const down = new TestStream();

		server = createConnection(up, down);
		client = createConnection(down, up);

		server.listen();
		client.listen();
	});

	test('onDidChangeContent TextDocumentSyncKind.Full change file content', done => {
		const textDocs = new TextDocuments(TextDocumentSyncKind.Full);
		textDocs.listen(server);
		textDocs.onDidChangeContent(event => {
			if (event.document.version === 2) {
				debugger;
				assert.equal(event.document.getText(), 'efg456');
				done();
			}
		});

		const openDocNotif = mockOpenDocNotif({ version: 1, text: 'abc123' });
		client.sendNotification(DidOpenTextDocumentNotification.type, openDocNotif);
		const changeDocNotif = mockChangeDocNotif({ version: 2, contentChanges: [{ text: 'efg456' }] });
		client.sendNotification(DidChangeTextDocumentNotification.type, changeDocNotif);
	});

	test('onDidChangeContent TextDocumentSyncKind.Full several content updates', done => {
		const textDocs = new TextDocuments(TextDocumentSyncKind.Full);
		textDocs.listen(server);
		textDocs.onDidChangeContent(event => {
			if (event.document.version === 2) {
				assert.equal(event.document.getText(), 'world');
				done();
			}
		});

		const openDocNotif = mockOpenDocNotif({ version: 1, text: 'abc123' });
		client.sendNotification(DidOpenTextDocumentNotification.type, openDocNotif);
		const changeDocNotif = mockChangeDocNotif({ version: 2, contentChanges: [{ text: 'hello' }, { text: 'world' }] });
		client.sendNotification(DidChangeTextDocumentNotification.type, changeDocNotif);
	});

	test('onDidChangeContent TextDocumentSyncKind.Incremental removing content', done => {
		const textDocs = new TextDocuments(TextDocumentSyncKind.Incremental);
		textDocs.listen(server);
		textDocs.onDidChangeContent(event => {
			if (event.document.version === 2) {
				assert.equal(event.document.getText(), 'function abc() {\n  console.log("hello");\n}');
				done();
			}
		});

		const openDocNotif = mockOpenDocNotif({ version: 1, text: 'function abc() {\n  console.log("hello, world!");\n}' });
		client.sendNotification(DidOpenTextDocumentNotification.type, openDocNotif);
		const changeDocNotif = mockChangeDocNotif({ version: 2, contentChanges: [{ text: 'hello', range: Range.create(1, 15, 1, 28) }] });
		client.sendNotification(DidChangeTextDocumentNotification.type, changeDocNotif);
	});

	test('onDidChangeContent TextDocumentSyncKind.Incremental adding content', done => {
		const textDocs = new TextDocuments(TextDocumentSyncKind.Incremental);
		textDocs.listen(server);
		textDocs.onDidChangeContent(event => {
			if (event.document.version === 2) {
				assert.equal(event.document.getText(), 'function abc() {\n  console.log("hello, world!");\n}');
				done();
			}
		});

		const openDocNotif = mockOpenDocNotif({ version: 1, text: 'function abc() {\n  console.log("hello");\n}' });
		client.sendNotification(DidOpenTextDocumentNotification.type, openDocNotif);
		const changeDocNotif = mockChangeDocNotif({ version: 2, contentChanges: [{ text: ', world!', range: Range.create(1, 20, 1, 20) }] });
		client.sendNotification(DidChangeTextDocumentNotification.type, changeDocNotif);
	});

	test('onDidChangeContent TextDocumentSyncKind.Incremental replacing content', done => {
		const textDocs = new TextDocuments(TextDocumentSyncKind.Incremental);
		textDocs.listen(server);
		textDocs.onDidChangeContent(event => {
			if (event.document.version === 2) {
				assert.equal(event.document.getText(), 'function abc() {\n  console.log("hello, test case!!!");\n}');
				done();
			}
		});

		const openDocNotif = mockOpenDocNotif({ version: 1, text: 'function abc() {\n  console.log("hello, world!");\n}' });
		client.sendNotification(DidOpenTextDocumentNotification.type, openDocNotif);
		const changeDocNotif = mockChangeDocNotif({ version: 2, contentChanges: [{ text: 'hello, test case!!!', range: Range.create(1, 15, 1, 28) }] });
		client.sendNotification(DidChangeTextDocumentNotification.type, changeDocNotif);
	});

	test('onDidChangeContent TextDocumentSyncKind.Incremental several content changes', done => {
		const textDocs = new TextDocuments(TextDocumentSyncKind.Incremental);
		textDocs.listen(server);
		textDocs.onDidChangeContent(event => {
			if (event.document.version === 2) {
				assert.equal(event.document.getText(), 'function abcdefghij() {\n  console.log("hello, test case!!!");\n}');
				done();
			}
		});

		const openDocNotif = mockOpenDocNotif({ version: 1, text: 'function abc() {\n  console.log("hello, world!");\n}' });
		client.sendNotification(DidOpenTextDocumentNotification.type, openDocNotif);
		const changeDocNotif = mockChangeDocNotif({
			version: 2,
			contentChanges: [
				{ text: 'defg', range: Range.create(0, 12, 0, 12) },
				{ text: 'hello, test case!!!', range: Range.create(1, 15, 1, 28) },
				{ text: 'hij', range: Range.create(0, 16, 0, 16) },
			]
		});
		client.sendNotification(DidChangeTextDocumentNotification.type, changeDocNotif);
	});
})

// The IncrementalTextDocumentsclass is not exported, but it can be created and maintained by
// TextDocuments document manager.  In these tests, the document manager creates the incrementally
// synced document.  The tests fetch the document from the manager and call TextDocument API functions
// on it to check functionality
suite('IncrementalTextDocument', () => {
	let server: IConnection;
	let client: IConnection;

	beforeEach(() => {
		const up = new TestStream();
		const down = new TestStream();

		server = createConnection(up, down);
		client = createConnection(down, up);

		server.listen();
		client.listen();
	});

	interface UpdateableDocument extends TextDocument {
		update(event: TextDocumentContentChangeEvent, version: number): void;
	}

	function isUpdateableDocument(value: TextDocument): value is UpdateableDocument {
		const updateFunc = (value as UpdateableDocument).update;
		return Object.prototype.toString.call(updateFunc) === '[object Function]';
	}

	function generateTextDocument(text: string): Promise<UpdateableDocument> {
		return new Promise((resolve, reject) => {
			const textDocs = new TextDocuments(TextDocumentSyncKind.Incremental);
			textDocs.listen(server);
			textDocs.onDidOpen(event => {
				const { document } = event;
				isUpdateableDocument(document) ? resolve(document) : reject(new Error("Document must be updateable!"));
			});
			const openDocNotif = mockOpenDocNotif({ version: 1, text });
			client.sendNotification(DidOpenTextDocumentNotification.type, openDocNotif);
		})
	}

	test('Single line document', async () => {
		let str = "Hello World";
		let lm = await generateTextDocument(str);
		assert.equal(lm.lineCount, 1);

		for (let i = 0; i < str.length; i++) {
			assert.equal(lm.offsetAt(Position.create(0, i)), i);
			assert.deepEqual(lm.positionAt(i), Position.create(0, i));
		}
	});

	test('Multiple line document', async () => {
		let str = "ABCDE\nFGHIJ\nKLMNO\n";
		let lm = await generateTextDocument(str);
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

	test('Varying newline characters', async () => {
		let str = "ABCDE\rFGHIJ";
		assert.equal((await generateTextDocument(str)).lineCount, 2);

		str = "ABCDE\nFGHIJ";
		assert.equal((await generateTextDocument(str)).lineCount, 2);

		str = "ABCDE\r\nFGHIJ";
		assert.equal((await generateTextDocument(str)).lineCount, 2);

		str = "ABCDE\n\nFGHIJ";
		assert.equal((await generateTextDocument(str)).lineCount, 3);

		str = "ABCDE\r\rFGHIJ";
		assert.equal((await generateTextDocument(str)).lineCount, 3);

		str = "ABCDE\n\rFGHIJ";
		assert.equal((await generateTextDocument(str)).lineCount, 3);
	})

	test('getText(Range)', async () => {
		let str = "12345\n12345\n12345";
		let lm = await generateTextDocument(str);
		assert.equal(lm.getText(), str);
		assert.equal(lm.getText(Range.create(-1, 0, 0, 5)), "12345");
		assert.equal(lm.getText(Range.create(0, 0, 0, 5)), "12345");
		assert.equal(lm.getText(Range.create(0, 4, 1, 1)), "5\n1");
		assert.equal(lm.getText(Range.create(0, 4, 2, 1)), "5\n12345\n1");
		assert.equal(lm.getText(Range.create(0, 4, 3, 1)), "5\n12345\n12345");
		assert.equal(lm.getText(Range.create(0, 0, 3, 5)), str);
	});

	test('Invalid inputs', async () => {
		let str = "Hello World";
		let lm = await generateTextDocument(str);

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

	test('Basic append', async () => {
		let lm = await generateTextDocument("foooo\nbar\nbaz");

		assert.equal(lm.offsetAt(Position.create(2, 0)), 10);

		lm.update({ text: " some extra content", range: Range.create(1, 3, 1, 3) }, 2);
		assert.equal(lm.getText(), "foooo\nbar some extra content\nbaz");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(2, 0)), 29);
	});

	test('Multi-line append', async () => {
		let lm = await generateTextDocument("foooo\nbar\nbaz");

		assert.equal(lm.offsetAt(Position.create(2, 0)), 10);

		lm.update({ text: " some extra\ncontent", range: Range.create(1, 3, 1, 3) }, 2);
		assert.equal(lm.getText(), "foooo\nbar some extra\ncontent\nbaz");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(3, 0)), 29);
		assert.equal(lm.lineCount, 4);
	});

	test('Basic delete', async () => {
		let lm = await generateTextDocument("foooo\nbar\nbaz");

		assert.equal(lm.offsetAt(Position.create(2, 0)), 10);

		lm.update({ text: "", range: Range.create(1, 0, 1, 3) }, 2);
		assert.equal(lm.getText(), "foooo\n\nbaz");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(2, 0)), 7);
	});

	test('IncrementalTextDocument - multi-line delete', async () => {
		let lm = await generateTextDocument("foooo\nbar\nbaz");

		assert.equal(lm.offsetAt(Position.create(2, 0)), 10);

		lm.update({ text: "", range: Range.create(0, 5, 1, 3) }, 2);
		assert.equal(lm.getText(), "foooo\nbaz");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(1, 0)), 6);
	});

	test('Single character replace', async () => {
		let lm = await generateTextDocument("foooo\nbar\nbaz");

		assert.equal(lm.offsetAt(Position.create(2, 0)), 10);

		lm.update({ text: "z", range: Range.create(1, 2, 1, 3) }, 2);
		assert.equal(lm.getText(), "foooo\nbaz\nbaz");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(2, 0)), 10);
	});

	test('Multi-character replace', async () => {
		let lm = await generateTextDocument("foo\nbar");

		assert.equal(lm.offsetAt(Position.create(1, 0)), 4);

		lm.update({ text: "foobar", range: Range.create(1, 0, 1, 3) }, 2);
		assert.equal(lm.getText(), "foo\nfoobar");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(1, 0)), 4);
	});

	test('Invalid update ranges', async () => {
		// Before the document starts -> before the document starts
		let lm = await generateTextDocument("foo\nbar");
		lm.update({ text: "abc123", range: Range.create(-2, 0, -1, 3) }, 2);
		assert.equal(lm.getText(), "abc123foo\nbar");
		assert.equal(lm.version, 2);

		// Before the document starts -> the middle of document
		lm = await generateTextDocument("foo\nbar");
		lm.update({ text: "foobar", range: Range.create(-1, 0, 0, 3) }, 2);
		assert.equal(lm.getText(), "foobar\nbar");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(1, 0)), 7);

		// The middle of document -> after the document ends
		lm = await generateTextDocument("foo\nbar");
		lm.update({ text: "foobar", range: Range.create(1, 0, 1, 10) }, 2);
		assert.equal(lm.getText(), "foo\nfoobar");
		assert.equal(lm.version, 2);
		assert.equal(lm.offsetAt(Position.create(1, 1000)), 10);

		// After the document ends -> after the document ends
		lm = await generateTextDocument("foo\nbar");
		lm.update({ text: "abc123", range: Range.create(3, 0, 6, 10) }, 2);
		assert.equal(lm.getText(), "foo\nbarabc123");
		assert.equal(lm.version, 2);

		// Before the document starts -> after the document ends
		lm = await generateTextDocument("foo\nbar");
		lm.update({ text: "entirely new content", range: Range.create(-1, 1, 2, 10000) }, 2);
		assert.equal(lm.getText(), "entirely new content");
		assert.equal(lm.version, 2);
		assert.equal(lm.lineCount, 1);
	});

});
