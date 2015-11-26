/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { strictEqual, deepEqual } from 'assert';

import * as proto from '../../client/lib/protocol';
import * as c2p from '../../client/lib/codeConverter';
import * as p2c from '../../client/lib/protocolConverter';

import * as vscode from 'vscode';

suite('Protocol Converter', () => {

	test('Position Converter', () => {
		let position: proto.Position = { line: 1, character: 2 };
		let result = p2c.asPosition(position);
		strictEqual(result.line, position.line);
		strictEqual(result.character, position.character);
	});
	
	test('Range Converter', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let result = p2c.asRange({start, end});
		strictEqual(result.start.line, start.line);
		strictEqual(result.start.character, start.character);
		strictEqual(result.end.line, end.line);
		strictEqual(result.end.character, end.character);
	});
	
	test('Diagnostic Severity', () => {
		strictEqual(p2c.asDiagnosticSeverity(proto.DiagnosticSeverity.Error), vscode.DiagnosticSeverity.Error);
		strictEqual(p2c.asDiagnosticSeverity(proto.DiagnosticSeverity.Warning), vscode.DiagnosticSeverity.Warning);
		strictEqual(p2c.asDiagnosticSeverity(proto.DiagnosticSeverity.Information), vscode.DiagnosticSeverity.Information);
		strictEqual(p2c.asDiagnosticSeverity(proto.DiagnosticSeverity.Hint), vscode.DiagnosticSeverity.Hint);
	});
	
	test('Diagnostic', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let diagnostic: proto.Diagnostic = {
			range: { start, end},
			message: 'error',
			severity: proto.DiagnosticSeverity.Error,
			code: 99
		}
		let result = p2c.asDiagnostic(diagnostic);
		let range = result.range;
		strictEqual(range.start.line, start.line);
		strictEqual(range.start.character, start.character);
		strictEqual(range.end.line, end.line);
		strictEqual(range.end.character, end.character);
		strictEqual(result.message, diagnostic.message);
		strictEqual(result.code, diagnostic.code);
		strictEqual(result.severity, vscode.DiagnosticSeverity.Error);
	});
	
	test('Hover', () => {
		let hover: proto.Hover = {
			contents: 'hover'
		};
		let result = p2c.asHover(hover);
		deepEqual(result.contents, ['hover']);
		strictEqual(result.range, undefined);
		
		hover.range = {
			start: { line: 1, character: 2 },
			end: { line: 8, character: 9 }
		}
		result = p2c.asHover(hover);
		let range = result.range;
		strictEqual(range.start.line, hover.range.start.line);
		strictEqual(range.start.character, hover.range.start.character);
		strictEqual(range.end.line, hover.range.end.line);
		strictEqual(range.end.character, hover.range.end.character);
	});
	
	test('Text Edit Insert', () => {
		let edit: proto.TextEdit = proto.TextEdit.insert({ line: 1, character: 2 }, 'insert');
		let result = p2c.asTextEdit(edit);
		let range = result.range;
		strictEqual(range.start.line, edit.range.start.line);
		strictEqual(range.start.character, edit.range.start.character);
		strictEqual(range.end.line, edit.range.end.line);
		strictEqual(range.end.character, edit.range.end.character);
		strictEqual(result.newText, edit.newText);
	});
	
	test('Text Edit Replace', () => {
		let edit: proto.TextEdit = proto.TextEdit.replace(
			{ 
				start: { line: 1, character: 2 },
				end: { line: 8, character: 9 }
			}, 
			'insert');
		let result = p2c.asTextEdit(edit);
		let range = result.range;
		strictEqual(range.start.line, edit.range.start.line);
		strictEqual(range.start.character, edit.range.start.character);
		strictEqual(range.end.line, edit.range.end.line);
		strictEqual(range.end.character, edit.range.end.character);
		strictEqual(result.newText, edit.newText);
	});
	
	test('Text Edit Delete', () => {
		let edit: proto.TextEdit = proto.TextEdit.del(
			{ 
				start: { line: 1, character: 2 },
				end: { line: 8, character: 9 }
			});
		let result = p2c.asTextEdit(edit);
		let range = result.range;
		strictEqual(range.start.line, edit.range.start.line);
		strictEqual(range.start.character, edit.range.start.character);
		strictEqual(range.end.line, edit.range.end.line);
		strictEqual(range.end.character, edit.range.end.character);
		strictEqual(result.newText, edit.newText);
	});
	
	test('Completion Item', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item'
		};
		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.detail, undefined);
		strictEqual(result.documentation, undefined);
		strictEqual(result.filterText, undefined);
		strictEqual(result.insertText, undefined);
		strictEqual(result.kind, undefined);
		strictEqual(result.sortText, undefined);
		strictEqual(result.textEdit, undefined);
		strictEqual(result.data, undefined);
	});
	
	test('Completion Item Full', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			detail: 'detail',
			documentation: 'doc',
			filterText: 'filter',
			insertText: 'insert',
			kind: proto.CompletionItemKind.Field,
			sortText: 'sort',
			data: 'data'
		};
		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.detail, completionItem.detail);
		strictEqual(result.documentation, completionItem.documentation);
		strictEqual(result.filterText, completionItem.filterText);
		strictEqual(result.insertText, completionItem.insertText);
		strictEqual(result.kind, vscode.CompletionItemKind.Field);
		strictEqual(result.sortText, completionItem.sortText);
		strictEqual(result.textEdit, undefined);
		strictEqual(result.data, completionItem.data);
	});
});