/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok } from 'assert';
import { Uri } from 'vscode';

import {
	Position, Range, TextDocumentIdentifier, TextDocumentItem, VersionedTextDocumentIdentifier, Command, CodeLens, CodeActionContext,
	Diagnostic, DiagnosticSeverity, WorkspaceChange, TextDocumentEdit, CreateFile, RenameFile, DeleteFile, ChangeAnnotation,
	AnnotatedTextEdit, TextEdit, type RelativePattern
} from 'vscode-languageclient';

import { $GlobPattern } from 'vscode-languageclient/$test/common/diagnostic';

suite('Protocol Helper Tests', () => {
	function rangeEqual(actual: Range, expected: Range) {
		strictEqual(actual.start.line, expected.start.line);
		strictEqual(actual.start.character, expected.start.character);
		strictEqual(actual.end.line, expected.end.line);
		strictEqual(actual.end.character, expected.end.character);
	}

	test('Position', () => {
		const position: Position = Position.create(1, 2);
		strictEqual(position.line, 1);
		strictEqual(position.character, 2);
		ok(Position.is(position));
	});

	test('Range - start/end', () => {
		const range: Range = Range.create(Position.create(1, 2), Position.create(8,9));
		strictEqual(range.start.line, 1);
		strictEqual(range.start.character, 2);
		strictEqual(range.end.line, 8);
		strictEqual(range.end.character, 9);
		ok(Range.is(range));
	});

	test('Range - line/character', () => {
		const range: Range = Range.create(1,2,8,9);
		strictEqual(range.start.line, 1);
		strictEqual(range.start.character, 2);
		strictEqual(range.end.line, 8);
		strictEqual(range.end.character, 9);
		ok(Range.is(range));
	});

	test('TextDocumentIdentifier', () => {
		const uri = 'file:///folder/file.txt';
		const identifier = TextDocumentIdentifier.create(uri);
		strictEqual(identifier.uri, uri);
		ok(TextDocumentIdentifier.is(identifier));
	});

	test('VersionedTextDocumentIdentifier', () => {
		const uri = 'file:///folder/file.txt';
		const identifier = VersionedTextDocumentIdentifier.create(uri, 9);
		strictEqual(identifier.uri, uri);
		strictEqual(identifier.version, 9);
		ok(VersionedTextDocumentIdentifier.is(identifier));
	});

	// test('TextDocumentPositionParams', () => {
	// 	let uri = 'file:///folder/file.txt';
	// 	let params = TextDocumentPositionParams.create(uri, Position.create(1,2));
	// 	strictEqual(params.textDocument.uri, uri);
	// 	ok(Position.is(params.position));
	// 	ok(TextDocumentPositionParams.is(params));
	// });

	test('TextDocumentItem', () => {
		const uri = 'file:///folder/file.txt';
		const item = TextDocumentItem.create(uri, 'pain-text', 9, 'content');
		strictEqual(item.uri, uri);
		strictEqual(item.languageId, 'pain-text');
		strictEqual(item.version, 9);
		strictEqual(item.text, 'content');
		ok(TextDocumentItem.is(item));
	});

	test('Diagnostic', () => {
		const diagnostic = Diagnostic.create(Range.create(1,2,8,9), 'message', DiagnosticSeverity.Warning, 99, 'source');
		ok(Range.is(diagnostic.range));
		strictEqual(diagnostic.message, 'message');
		strictEqual(diagnostic.severity, DiagnosticSeverity.Warning);
		strictEqual(diagnostic.code, 99);
		strictEqual(diagnostic.source, 'source');
	});

	test('Command', () => {
		const command = Command.create('title', 'command', 'arg');
		strictEqual(command.title, 'title');
		strictEqual(command.command, 'command');
		strictEqual(command.arguments![0], 'arg');
	});

	test('CodeLens', () => {
		const codeLens = CodeLens.create(Range.create(1,2,8,9), 'data');
		const range = codeLens.range;
		strictEqual(range.start.line, 1);
		strictEqual(range.start.character, 2);
		strictEqual(range.end.line, 8);
		strictEqual(range.end.character, 9);
		strictEqual(codeLens.data, 'data');
	});

	test('CodeActionContext', () => {
		const codeActionContext = CodeActionContext.create([Diagnostic.create(Range.create(1, 2, 8, 9), 'message')]);
		strictEqual(codeActionContext.diagnostics.length, 1);
		ok(Diagnostic.is(codeActionContext.diagnostics[0]));
	});

	test('WorkspaceEdit - documentChanges', () => {
		const workspaceChange = new WorkspaceChange();
		const uri = 'file:///abc.txt';
		const change1 = workspaceChange.getTextEditChange({uri: uri, version: 10});
		change1.insert(Position.create(0,1), 'insert');
		change1.replace(Range.create(0,1,2,3), 'replace');
		change1.delete(Range.create(0,1,2,3));
		const change2 = workspaceChange.getTextEditChange({ uri: 'file:///xyz.txt', version: 20 });
		change2.insert(Position.create(2,3), 'insert');

		const workspaceEdit = workspaceChange.edit;
		strictEqual(workspaceEdit.changeAnnotations, undefined);
		strictEqual(workspaceEdit.documentChanges!.length, 2);
		let edits = (workspaceEdit.documentChanges![0] as TextDocumentEdit).edits;
		strictEqual(edits.length, 3);
		let edit = edits[0] as TextEdit;
		rangeEqual(edit.range, Range.create(0,1,0,1));
		strictEqual(edit.newText, 'insert');
		edit = edits[1] as TextEdit;
		rangeEqual(edit.range, Range.create(0,1,2,3));
		strictEqual(edit.newText, 'replace');
		edit = edits[2] as TextEdit;
		rangeEqual(edit.range, Range.create(0,1,2,3));
		strictEqual(edit.newText, '');

		edits = (workspaceEdit.documentChanges![1] as TextDocumentEdit).edits;
		strictEqual(edits.length, 1);
		edit = edits[0] as TextEdit;
		rangeEqual(edit.range, Range.create(2,3,2,3));
		strictEqual(edit.newText, 'insert');

		workspaceChange.createFile('file:///create.txt');
		workspaceChange.renameFile('file:///old.txt', 'file:///new.txt');
		workspaceChange.deleteFile('file:///delete.txt');

		let change = workspaceEdit.documentChanges![2];
		ok(CreateFile.is(change), 'Is create file');

		change = workspaceEdit.documentChanges![3];
		ok(RenameFile.is(change), 'Is rename file');

		change = workspaceEdit.documentChanges![4];
		ok(DeleteFile.is(change), 'Is delete file');
	});

	test('WorkspaceEdit - changes', () => {
		const workspaceChange = new WorkspaceChange();
		const uri = 'file:///abc.txt';
		const change1 = workspaceChange.getTextEditChange(uri);
		change1.insert(Position.create(0,1), 'insert');
		change1.replace(Range.create(0,1,2,3), 'replace');
		change1.delete(Range.create(0,1,2,3));
		const change2 = workspaceChange.getTextEditChange('file:///xyz.txt');
		change2.insert(Position.create(2,3), 'insert');

		const workspaceEdit = workspaceChange.edit;
		strictEqual(workspaceEdit.changeAnnotations, undefined);
		strictEqual(Object.keys(workspaceEdit.changes!).length, 2);
		let edits = workspaceEdit.changes![uri];
		strictEqual(edits.length, 3);
		rangeEqual(edits[0].range, Range.create(0,1,0,1));
		strictEqual(edits[0].newText, 'insert');
		rangeEqual(edits[1].range, Range.create(0,1,2,3));
		strictEqual(edits[1].newText, 'replace');
		rangeEqual(edits[2].range, Range.create(0,1,2,3));
		strictEqual(edits[2].newText, '');

		edits = workspaceEdit.changes!['file:///xyz.txt'];
		strictEqual(edits.length, 1);
		rangeEqual(edits[0].range, Range.create(2,3,2,3));
		strictEqual(edits[0].newText, 'insert');
	});

	test('WorkspaceEdit - change annotations', () => {
		const workspaceChange = new WorkspaceChange();
		const uri = 'file:///abc.txt';
		const change1 = workspaceChange.getTextEditChange({uri: uri, version: 10});
		change1.insert(Position.create(0,1), 'insert', ChangeAnnotation.create('label', true, 'description'));

		const workspaceEdit = workspaceChange.edit;
		const documentChanges = workspaceEdit.documentChanges!;
		ok(workspaceEdit.changeAnnotations !== undefined, 'Change annotation defined');
		const annotations = workspaceEdit.changeAnnotations!;
		strictEqual(documentChanges.length, 1);
		const edits = (documentChanges[0] as TextDocumentEdit).edits;
		strictEqual(edits.length, 1);
		strictEqual((edits[0] as AnnotatedTextEdit).annotationId, '1');
		const annotation = annotations[1];
		strictEqual(annotation.label, 'label');
		strictEqual(annotation.needsConfirmation, true);
		strictEqual(annotation.description, 'description');
	});

	test('Relative Pattern', () => {
		if (process.platform === 'win32') {
			const pattern: RelativePattern = { baseUri: Uri.file('C:\\folder1\\folder2').toString(), pattern: '**/*.txt' };
			ok($GlobPattern.match(pattern, Uri.file('c:\\folder1\\folder2\\file.txt')));
			ok($GlobPattern.match(pattern, Uri.file('c:\\folder1\\folder2\\folder3\\file.txt')));
			ok(!$GlobPattern.match(pattern, Uri.file('c:\\folder1\\folder3\\file.txt')));
		} else {
			const pattern: RelativePattern = { baseUri: Uri.file('/folder1/folder2').toString(), pattern: '**/*.txt' };
			ok($GlobPattern.match(pattern, Uri.file('/folder1/folder2/file.txt')));
			ok($GlobPattern.match(pattern, Uri.file('/folder1/folder2/folder3/file.txt')));
			ok(!$GlobPattern.match(pattern, Uri.file('/folder1/folder3/file.txt')));
		}
	});
});