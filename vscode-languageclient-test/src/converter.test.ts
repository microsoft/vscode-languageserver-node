/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { strictEqual, deepEqual, ok } from 'assert';

import * as proto from 'vscode-languageserver-types';
import * as c2p from '../../client/lib/codeConverter';
import * as p2c from '../../client/lib/protocolConverter';

import * as vscode from 'vscode';

suite('Protocol Converter', () => {

	function rangeEqual(actual: vscode.Range, expected: proto.Range) {
		strictEqual(actual.start.line, expected.start.line);
		strictEqual(actual.start.character, expected.start.character);
		strictEqual(actual.end.line, expected.end.line);
		strictEqual(actual.end.character, expected.end.character);
	}

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
			code: 99,
			source: 'source'
		};
		
		let result = p2c.asDiagnostic(diagnostic);
		let range = result.range;
		strictEqual(range.start.line, start.line);
		strictEqual(range.start.character, start.character);
		strictEqual(range.end.line, end.line);
		strictEqual(range.end.character, end.character);
		strictEqual(result.message, diagnostic.message);
		strictEqual(result.code, diagnostic.code);
		strictEqual(result.source, diagnostic.source);
		strictEqual(result.severity, vscode.DiagnosticSeverity.Error);
		
		ok(p2c.asDiagnostics([diagnostic]).every(value => value instanceof vscode.Diagnostic));
	});
	
	test('Hover', () => {
		strictEqual(undefined, p2c.asHover(undefined));
		strictEqual(null, p2c.asHover(null));
		
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
	
	test('Text Edits', () => {
		let edit: proto.TextEdit = proto.TextEdit.del(
			{ 
				start: { line: 1, character: 2 },
				end: { line: 8, character: 9 }
			});
		ok(p2c.asTextEdits([edit]).every(elem => elem instanceof vscode.TextEdit));
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
		
		let completionResult = p2c.asCompletionResult([completionItem]);
		if (Array.isArray(completionResult)) {
			ok(completionResult.every(value => value instanceof vscode.CompletionItem));
		} else {
			ok(completionResult.items.every(value => value instanceof vscode.CompletionItem));
		}
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
	
	test('Completion Item Preserve Data', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			data: 'data'
		};
		
		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.data, completionItem.data);
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
		strictEqual(undefined, p2c.asLocation(undefined));
		strictEqual(null, p2c.asLocation(null));
		
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
		strictEqual(p2c.asDocumentHighlightKind(<any>proto.DocumentHighlightKind.Text), vscode.DocumentHighlightKind.Text);
		strictEqual(p2c.asDocumentHighlightKind(<any>proto.DocumentHighlightKind.Read), vscode.DocumentHighlightKind.Read);
		strictEqual(p2c.asDocumentHighlightKind(<any>proto.DocumentHighlightKind.Write), vscode.DocumentHighlightKind.Write);
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
	
	test('Symbol Information', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let location: proto.Location = {
			uri: 'file://localhost/folder/file', 
			range: { start, end }
		};
		let symbolInformation: proto.SymbolInformation = {
			name: 'name',
			kind: proto.SymbolKind.Array,
			location: location
		};
		
		let result = p2c.asSymbolInformation(symbolInformation);
		strictEqual(result.name, symbolInformation.name);
		strictEqual(result.kind, vscode.SymbolKind.Array);
		strictEqual(result.containerName, undefined);
		ok(result.location instanceof vscode.Location);
		
		symbolInformation.containerName = 'container';
		result = p2c.asSymbolInformation(symbolInformation);
		strictEqual(result.containerName, symbolInformation.containerName);
		
		ok(p2c.asSymbolInformations([symbolInformation]).every(value => value instanceof vscode.SymbolInformation));
	});
	
	test('Command', () => {
		let command = proto.Command.create('title', 'commandId');
		command.arguments = ['args'];
		
		let result = p2c.asCommand(command);
		strictEqual(result.title, command.title);
		strictEqual(result.command, command.command);
		strictEqual(result.arguments, command.arguments);
		
		ok(p2c.asCommands([command]).every(elem => !!elem.title && !!elem.command));
	});
	
	test('Code Lens', () => {
		let codeLens: proto.CodeLens = proto.CodeLens.create(proto.Range.create(1,2,8,9), 'data');
		
		let result = p2c.asCodeLens(codeLens);
		rangeEqual(result.range, codeLens.range);

		codeLens.command = proto.Command.create('title', 'commandId');
		result = p2c.asCodeLens(codeLens);
		strictEqual(result.command.title, codeLens.command.title);
		strictEqual(result.command.command, codeLens.command.command);
		
		ok(p2c.asCodeLenses([codeLens]).every(elem => elem instanceof vscode.CodeLens));
	});
	
	test('Code Lens Preserve Data', () => {
		let codeLens: proto.CodeLens = proto.CodeLens.create(proto.Range.create(1,2,8,9), 'data');
		let result = c2p.asCodeLens(p2c.asCodeLens(codeLens));
		strictEqual(result.data, codeLens.data);
	});
	
	test('WorkspaceEdit', () => {
		let workspaceChange = new proto.WorkspaceChange();
		let uri1 = 'file:///abc.txt';
		let change1 = workspaceChange.getTextEditChange(uri1);
		change1.insert(proto.Position.create(0,1), 'insert');
		let uri2 = 'file:///xyz.txt';
		let change2 = workspaceChange.getTextEditChange(uri2);
		change2.replace(proto.Range.create(0,1,2,3), 'replace');
		
		let result = p2c.asWorkspaceEdit(workspaceChange.edit);
		let edits = result.get(vscode.Uri.parse(uri1));
		strictEqual(edits.length, 1);
		rangeEqual(edits[0].range, proto.Range.create(0,1,0,1));
		strictEqual(edits[0].newText, 'insert');
		
		edits = result.get(vscode.Uri.parse(uri2));
		strictEqual(edits.length, 1);
		rangeEqual(edits[0].range, proto.Range.create(0,1,2,3));
		strictEqual(edits[0].newText, 'replace');
	});

	test('Uri Rewrite', () => {
		let converter = p2c.createConverter((value: string) => {
			return vscode.Uri.parse(`${value}.vscode`);
		});

		let result = converter.asUri('file://localhost/folder/file');
		strictEqual('file://localhost/folder/file.vscode', result.toString());
	});
});

suite('Code Converter', () => {
	
	function positionEqual(actual: proto.Position, expected: vscode.Position) {
		strictEqual(actual.line, expected.line);
		strictEqual(actual.character, expected.character);		
	}
	
	function rangeEqual(actual: proto.Range, expected: vscode.Range) {
		strictEqual(actual.start.line, expected.start.line);
		strictEqual(actual.start.character, expected.start.character);
		strictEqual(actual.end.line, expected.end.line);
		strictEqual(actual.end.character, expected.end.character);
	}
	
	test('Position', () => {
		let position = new vscode.Position(1, 2);
		let result = c2p.asPosition(position);
		positionEqual(result, position);
	});
	
	test('Range', () => {
		let range = new vscode.Range(new vscode.Position(1, 2), new vscode.Position(8, 9));
		let result = c2p.asRange(range);
		rangeEqual(result, range);
	});
	
	test('Text Edit Insert', () => {
		let insert = vscode.TextEdit.insert(new vscode.Position(1, 2), 'insert');
		let result = c2p.asTextEdit(insert);
		rangeEqual(result.range, insert.range);
		strictEqual(result.newText, insert.newText);
	});
	
	test('Text Edit Replace', () => {
		let replace = vscode.TextEdit.replace(new vscode.Range(new vscode.Position(1, 2), new vscode.Position(8, 9)), 'insert');
		let result = c2p.asTextEdit(replace);
		rangeEqual(result.range, replace.range);
		strictEqual(result.newText, replace.newText);
	});
	
	test('Text Edit Delete', () => {
		let del = vscode.TextEdit.delete(new vscode.Range(new vscode.Position(1, 2), new vscode.Position(8, 9)));
		let result = c2p.asTextEdit(del);
		rangeEqual(result.range, del.range);
		strictEqual(result.newText, del.newText);
	});
	
	test('Completion Item', () => {
		let item: vscode.CompletionItem = new vscode.CompletionItem('label');
		let result = c2p.asCompletionItem(<any>item);
		strictEqual(result.label, item.label);
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
		let item: vscode.CompletionItem = new vscode.CompletionItem('label');
		item.detail = 'detail';
		item.documentation = 'documentation';
		item.filterText = 'filter';
		item.insertText = 'insert';
		item.kind = vscode.CompletionItemKind.Interface;
		item.sortText = 'sort';
		
		let result = c2p.asCompletionItem(<any>item);
		strictEqual(result.label, item.label);
		strictEqual(result.detail, item.detail);
		strictEqual(result.documentation, item.documentation);
		strictEqual(result.filterText, item.filterText);
		strictEqual(result.insertText, item.insertText);
		strictEqual(result.kind, proto.CompletionItemKind.Interface);
		strictEqual(result.sortText, item.sortText);
	});
	
	test('Completion Item Text Edit', () => {
		let item: vscode.CompletionItem = new vscode.CompletionItem('label');
		item.textEdit = vscode.TextEdit.insert(new vscode.Position(1, 2), 'insert');
		
		let result = c2p.asCompletionItem(<any>item);
		rangeEqual(result.textEdit.range, item.textEdit.range);
		strictEqual(result.textEdit.newText, item.textEdit.newText);
	});
	
	test('DiagnosticSeverity', () => {
		strictEqual(c2p.asDiagnosticSeverity(<any>vscode.DiagnosticSeverity.Error), proto.DiagnosticSeverity.Error);
		strictEqual(c2p.asDiagnosticSeverity(<any>vscode.DiagnosticSeverity.Warning), proto.DiagnosticSeverity.Warning);
		strictEqual(c2p.asDiagnosticSeverity(<any>vscode.DiagnosticSeverity.Information), proto.DiagnosticSeverity.Information);
		strictEqual(c2p.asDiagnosticSeverity(<any>vscode.DiagnosticSeverity.Hint), proto.DiagnosticSeverity.Hint);
	});
	
	test('Diagnostic', () => {
		let item: vscode.Diagnostic = new vscode.Diagnostic(new vscode.Range(1, 2, 8, 9), "message", vscode.DiagnosticSeverity.Warning);
		item.code = 99;
		item.source = 'source';
		
		let result = c2p.asDiagnostic(<any>item);
		rangeEqual(result.range, item.range);
		strictEqual(result.message, item.message);
		strictEqual(result.severity, proto.DiagnosticSeverity.Warning);
		strictEqual(result.code, item.code);
		strictEqual(result.source, item.source);
		ok(c2p.asDiagnostics(<any>[item]).every(elem => proto.Diagnostic.is(elem)));
	});
	
	test("CodeActionContext", () => {
		let item: vscode.CodeActionContext = {
			diagnostics: [new vscode.Diagnostic(new vscode.Range(1, 2, 8, 9), "message", vscode.DiagnosticSeverity.Warning)]
		};
		
		let result = c2p.asCodeActionContext(<any>item);
		ok(result.diagnostics.every(elem => proto.Diagnostic.is(elem)));
	});

	test('Uri Rewrite', () => {
		let converter = c2p.createConverter((value: vscode.Uri) => {
			return `${value.toString()}.vscode`;
		});

		let result = converter.asUri(vscode.Uri.parse('file://localhost/folder/file'));
		strictEqual('file://localhost/folder/file.vscode', result);
	});	
});