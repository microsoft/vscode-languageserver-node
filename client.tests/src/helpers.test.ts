/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { strictEqual, deepEqual, ok } from 'assert';

import {
	Position, Range, TextDocumentIdentifier, TextDocumentPositionParams, TextDocumentItem, VersionedTextDocumentIdentifier, Command, CodeLens, CodeActionContext,
	Diagnostic, DiagnosticSeverity, WorkspaceChange, WorkspaceEdit, TextEditChange, TextEdit
} from '../../client/lib/protocol';

suite('Protocol Helper Tests', () => {
	function rangeEqual(actual: Range, expected: Range) {
		strictEqual(actual.start.line, expected.start.line);
		strictEqual(actual.start.character, expected.start.character);
		strictEqual(actual.end.line, expected.end.line);
		strictEqual(actual.end.character, expected.end.character);
	}

	test('Position', () => {
		let position: Position = Position.create(1, 2);
		strictEqual(position.line, 1);
		strictEqual(position.character, 2);
		ok(Position.is(position));
	});

	test('Range - start/end', () => {
		let range: Range = Range.create(Position.create(1, 2), Position.create(8,9));
		strictEqual(range.start.line, 1);
		strictEqual(range.start.character, 2);
		strictEqual(range.end.line, 8);
		strictEqual(range.end.character, 9);
		ok(Range.is(range));
	});

	test('Range - line/character', () => {
		let range: Range = Range.create(1,2,8,9);
		strictEqual(range.start.line, 1);
		strictEqual(range.start.character, 2);
		strictEqual(range.end.line, 8);
		strictEqual(range.end.character, 9);
		ok(Range.is(range));
	});

	test('TextDocumentIdentifier', () => {
		let uri = 'file:///folder/file.txt';
		let identifier = TextDocumentIdentifier.create(uri);
		strictEqual(identifier.uri, uri);
		ok(TextDocumentIdentifier.is(identifier));
	});

	test('VersionedTextDocumentIdentifier', () => {
		let uri = 'file:///folder/file.txt';
		let identifier = VersionedTextDocumentIdentifier.create(uri, 9);
		strictEqual(identifier.uri, uri);
		strictEqual(identifier.version, 9);
		ok(VersionedTextDocumentIdentifier.is(identifier));
	});

	test('TextDocumentPositionParams', () => {
		let uri = 'file:///folder/file.txt';
		let params = TextDocumentPositionParams.create(uri, Position.create(1,2));
		strictEqual(params.textDocument.uri, uri);
		ok(Position.is(params.position));
		ok(TextDocumentPositionParams.is(params));
	});

	test('TextDocumentItem', () => {
		let uri = 'file:///folder/file.txt';
		let item = TextDocumentItem.create(uri, 'pain-text', 9, 'content');
		strictEqual(item.uri, uri);
		strictEqual(item.languageId, 'pain-text');
		strictEqual(item.version, 9);
		strictEqual(item.text, 'content');
		ok(TextDocumentItem.is(item));
	});

	test('Diagnostic', () => {
		let diagnostic = Diagnostic.create(Range.create(1,2,8,9), 'message', DiagnosticSeverity.Warning, 99, 'source');
		ok(Range.is(diagnostic.range));
		strictEqual(diagnostic.message, 'message');
		strictEqual(diagnostic.severity, DiagnosticSeverity.Warning);
		strictEqual(diagnostic.code, 99);
		strictEqual(diagnostic.source, 'source');
	});

	test('Command', () => {
		let command = Command.create('title', 'command', 'arg');
		strictEqual(command.title, 'title');
		strictEqual(command.command, 'command');
		strictEqual(command.arguments[0], 'arg');
	});

	test('CodeLens', () => {
		let codeLens = CodeLens.create(Range.create(1,2,8,9), 'data');
		let range = codeLens.range;
		strictEqual(range.start.line, 1);
		strictEqual(range.start.character, 2);
		strictEqual(range.end.line, 8);
		strictEqual(range.end.character, 9);
		strictEqual(codeLens.data, 'data');
	});

	test('CodeActionContext', () => {
		let codeActionContext = CodeActionContext.create([Diagnostic.create(Range.create(1, 2, 8, 9), 'message')]);
		strictEqual(codeActionContext.diagnostics.length, 1);
		ok(Diagnostic.is(codeActionContext.diagnostics[0]));
	});

	test('WorkspaceEdit', () => {
		let workspaceChange = new WorkspaceChange();
		let uri = 'file:///abc.txt';
		let change1 = workspaceChange.getTextEditChange(uri);
		change1.insert(Position.create(0,1), 'insert');
		change1.replace(Range.create(0,1,2,3), 'replace');
		change1.delete(Range.create(0,1,2,3));
		let change2 = workspaceChange.getTextEditChange('file:///xyz.txt');
		change2.insert(Position.create(2,3), 'insert');

		let workspaceEdit = workspaceChange.edit;
		let keys = Object.keys(workspaceEdit.changes);
		strictEqual(keys.length, 2);
		let edits = workspaceEdit.changes[uri];
		strictEqual(edits.length, 3);
		rangeEqual(edits[0].range, Range.create(0,1,0,1));
		strictEqual(edits[0].newText, 'insert');
		rangeEqual(edits[1].range, Range.create(0,1,2,3));
		strictEqual(edits[1].newText, 'replace');
		rangeEqual(edits[2].range, Range.create(0,1,2,3));
		strictEqual(edits[2].newText, '');

		edits = workspaceEdit.changes['file:///xyz.txt'];
		strictEqual(edits.length, 1);
		rangeEqual(edits[0].range, Range.create(2,3,2,3));
		strictEqual(edits[0].newText, 'insert');
	});
});