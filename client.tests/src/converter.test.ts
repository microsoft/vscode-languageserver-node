/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { strictEqual, deepEqual, ok } from 'assert';

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
		};
		
		let result = p2c.asDiagnostic(diagnostic);
		let range = result.range;
		strictEqual(range.start.line, start.line);
		strictEqual(range.start.character, start.character);
		strictEqual(range.end.line, end.line);
		strictEqual(range.end.character, end.character);
		strictEqual(result.message, diagnostic.message);
		strictEqual(result.code, diagnostic.code);
		strictEqual(result.severity, vscode.DiagnosticSeverity.Error);
		
		ok(p2c.asDiagnostics([diagnostic]).every(value => value instanceof vscode.Diagnostic));
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
		
		ok(p2c.asCompletionItems([completionItem]).every(value => value instanceof vscode.CompletionItem));
	});
	
	test('Completion Item Text Edit', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			textEdit: proto.TextEdit.insert({ line: 1, character: 2}, 'insert')
		};
		
		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		ok(result.textEdit instanceof vscode.TextEdit);
	});
	
	test('Parameter Information', () => {
		let parameterInfo: proto.ParameterInformation = {
			label: 'label'
		};
		
		let result = p2c.asParameterInformation(parameterInfo);
		strictEqual(result.label, parameterInfo.label);
		strictEqual(result.documentation, undefined);
		
		parameterInfo.documentation = 'documentation';
		result = p2c.asParameterInformation(parameterInfo);
		strictEqual(result.label, parameterInfo.label);
		strictEqual(result.documentation, parameterInfo.documentation);
		
		ok(p2c.asParameterInformations([parameterInfo]).every(value => value instanceof vscode.ParameterInformation));
	});
	
	test('Signature Information', () => {
		let signatureInfo: proto.SignatureInformation = {
			label: 'label'
		};
		
		let result = p2c.asSignatureInformation(signatureInfo);
		strictEqual(result.label, signatureInfo.label);
		strictEqual(result.documentation, undefined);
		deepEqual(result.parameters, []);
		
		signatureInfo.documentation = 'documentation';
		signatureInfo.parameters = [ { label: 'label' } ];
		result = p2c.asSignatureInformation(signatureInfo);
		strictEqual(result.label, signatureInfo.label);
		strictEqual(result.documentation, signatureInfo.documentation);
		ok(result.parameters.every(value => value instanceof vscode.ParameterInformation));
		
		ok(p2c.asSignatureInformations([signatureInfo]).every(value => value instanceof vscode.SignatureInformation));
	});
	
	test('Signature Help', () => {
		let signatureHelp: proto.SignatureHelp = {
			signatures: [
				{ label: 'label' }
			]
		};
		
		let result = p2c.asSignatureHelp(signatureHelp);
		ok(result.signatures.every(value => value instanceof vscode.SignatureInformation));
		strictEqual(result.activeSignature, undefined);
		strictEqual(result.activeParameter, undefined);
		
		signatureHelp.activeSignature = 1;
		signatureHelp.activeParameter = 2;
		result = p2c.asSignatureHelp(signatureHelp);
		ok(result.signatures.every(value => value instanceof vscode.SignatureInformation));
		strictEqual(result.activeSignature, 1);
		strictEqual(result.activeParameter, 2);
	});
	
	test('Location', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let location: proto.Location = {
			uri: 'file://localhost/folder/file', 
			range: { start, end }
		};
		
		let result = p2c.asLocation(location);
		ok(result.uri instanceof vscode.Uri);
		ok(result.range instanceof vscode.Range);
		
		ok(p2c.asReferences([location]).every(value => value instanceof vscode.Location));
	});
	
	test('Definition', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let location: proto.Location = {
			uri: 'file://localhost/folder/file', 
			range: { start, end }
		}
		
		let single = <vscode.Location>p2c.asDefinitionResult(location);
		ok(single.uri instanceof vscode.Uri);
		ok(single.range instanceof vscode.Range);
		
		let array = <vscode.Location[]>p2c.asDefinitionResult([location]);
		ok(array.every(value => value instanceof vscode.Location));
	});
	
	test('Document Highlight Kind', () => {
		strictEqual(p2c.asDocumentHighlightKind(proto.DocumentHighlightKind.Text), vscode.DocumentHighlightKind.Text);
		strictEqual(p2c.asDocumentHighlightKind(proto.DocumentHighlightKind.Read), vscode.DocumentHighlightKind.Read);
		strictEqual(p2c.asDocumentHighlightKind(proto.DocumentHighlightKind.Write), vscode.DocumentHighlightKind.Write);
	});
	
	test ('Document Highlight', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let documentHighlight = proto.DocumentHighlight.create(
			{ start, end }
		);
		
		let result = p2c.asDocumentHighlight(documentHighlight);
		ok(result.range instanceof vscode.Range);
		strictEqual(result.kind, vscode.DocumentHighlightKind.Text);
		
		documentHighlight.kind = proto.DocumentHighlightKind.Write;
		result = p2c.asDocumentHighlight(documentHighlight);
		ok(result.range instanceof vscode.Range);
		strictEqual(result.kind, vscode.DocumentHighlightKind.Write);
		
		ok(p2c.asDocumentHighlights([documentHighlight]).every(value => value instanceof vscode.DocumentHighlight));
	});
});