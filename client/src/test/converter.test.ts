/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { strictEqual, deepEqual, ok } from 'assert';

import * as proto from 'vscode-languageserver-protocol';
import * as codeConverter from '../codeConverter';
import * as protocolConverter from '../protocolConverter';
import ProtocolCompletionItem from '../protocolCompletionItem';
import * as Is from '../utils/is';

import * as vscode from 'vscode';

const c2p: codeConverter.Converter = codeConverter.createConverter();
const p2c: protocolConverter.Converter = protocolConverter.createConverter();

suite('Protocol Converter', () => {

	function rangeEqual(actual: vscode.Range, expected: proto.Range) : void;
	function rangeEqual(actual: proto.Range, expected: vscode.Range) : void;
	function rangeEqual(actual: vscode.Range | proto.Range, expected: proto.Range | proto.Range) : void {
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

		strictEqual(p2c.asPosition(null), undefined);
		strictEqual(p2c.asPosition(undefined), undefined);
	});

	test('Range Converter', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };

		let result = p2c.asRange({start, end});
		strictEqual(result.start.line, start.line);
		strictEqual(result.start.character, start.character);
		strictEqual(result.end.line, end.line);
		strictEqual(result.end.character, end.character);

		strictEqual(p2c.asRange(null), undefined);
		strictEqual(p2c.asRange(undefined), undefined);
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
			source: 'source',
			tags: [proto.DiagnosticTag.Unnecessary]
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
		strictEqual(result.tags !== undefined, true);
		strictEqual(result.tags![0], vscode.DiagnosticTag.Unnecessary);

		ok(p2c.asDiagnostics([diagnostic]).every(value => value instanceof vscode.Diagnostic));
	});

	test('Hover', () => {
		strictEqual(p2c.asHover(undefined), undefined);
		strictEqual(p2c.asHover(null), undefined);

		let hover: proto.Hover = {
			contents: 'hover'
		};

		let result = p2c.asHover(hover);
		strictEqual(result.contents.length, 1);
		ok(result.contents[0] instanceof vscode.MarkdownString)
		strictEqual((result.contents[0] as vscode.MarkdownString).value, 'hover');
		strictEqual(result.range, undefined);

		hover.range = {
			start: { line: 1, character: 2 },
			end: { line: 8, character: 9 }
		}
		result = p2c.asHover(hover);
		let range = result.range!;
		strictEqual(range.start.line, hover.range.start.line);
		strictEqual(range.start.character, hover.range.start.character);
		strictEqual(range.end.line, hover.range.end.line);
		strictEqual(range.end.character, hover.range.end.character);

		/*
		let multisegmentHover: proto.Hover = {
			contents:{
				kind: MarkupKind.Markdown,
				value:`First Section
				---
				Second Section
				---
				Third Section`
			}
		}
		result = p2c.asHover(multisegmentHover);
		strictEqual(result.contents.length, 3);
		strictEqual((result.contents[0] as vscode.MarkdownString).value, 'First Section');
		strictEqual((result.contents[1] as vscode.MarkdownString).value, 'Second Section');
		strictEqual((result.contents[2] as vscode.MarkdownString).value, 'Third Section');
		strictEqual(result.range, undefined);
		*/
	});

	test('Text Edit undefined | null', () => {
		strictEqual(p2c.asTextEdit(null), undefined);
		strictEqual(p2c.asTextEdit(undefined), undefined);
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

		strictEqual(p2c.asTextEdits(undefined), undefined);
		strictEqual(p2c.asTextEdits(null), undefined);
		deepEqual(p2c.asTextEdits([]), []);
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
		strictEqual(result.range, undefined);
		strictEqual(result.kind, undefined);
		strictEqual(result.sortText, undefined);
		strictEqual(result.textEdit, undefined);
		strictEqual(result.data, undefined);
	});

	test('Completion Item Full', () => {
		let command = proto.Command.create('title', 'commandId');
		command.arguments = ['args'];

		let completionItem: proto.CompletionItem = {
			label: 'item',
			detail: 'detail',
			documentation: 'doc',
			filterText: 'filter',
			insertText: 'insert',
			insertTextFormat: proto.InsertTextFormat.PlainText,
			kind: proto.CompletionItemKind.Field,
			sortText: 'sort',
			data: 'data',
			additionalTextEdits: [proto.TextEdit.insert({ line: 1, character: 2}, 'insert')],
			command: command
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
		strictEqual(result.command!.title, command.title);
		strictEqual(result.command!.command, command.command);
		strictEqual(result.command!.arguments, command.arguments);
		ok(result.additionalTextEdits![0] instanceof vscode.TextEdit);

		let completionResult = p2c.asCompletionResult([completionItem]);
		ok(completionResult.every(value => value instanceof vscode.CompletionItem));
	});

	test('Completion Item Preserve Insert Text', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			insertText: "insert"
		};

		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.insertText, "insert");
		let back = c2p.asCompletionItem(result);
		strictEqual(back.insertText, "insert");
	});

	test('Completion Item Snippet String', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			insertText: "${value}",
			insertTextFormat: proto.InsertTextFormat.Snippet
		};

		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		ok(result.insertText instanceof vscode.SnippetString);
		strictEqual((<vscode.SnippetString> result.insertText).value, "${value}");
		strictEqual(result.range, undefined);
		strictEqual(result.textEdit, undefined);

		let back = c2p.asCompletionItem(result);
		strictEqual(back.insertTextFormat, proto.InsertTextFormat.Snippet);
		strictEqual(back.insertText, "${value}");
	});

	test('Completion Item Text Edit', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			textEdit: proto.TextEdit.insert({ line: 1, character: 2}, 'insert')
		};

		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.textEdit, undefined);
		strictEqual(result.insertText, "insert");
		rangeEqual(result.range!, completionItem.textEdit!.range);

		let back = c2p.asCompletionItem(result);
		strictEqual(back.insertTextFormat, proto.InsertTextFormat.PlainText);
		strictEqual(back.insertText, undefined);
		strictEqual(back.textEdit!.newText, 'insert');
		rangeEqual(back.textEdit!.range, result.range!);
	});

	test('Completion Item Text Edit Snippet String', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			textEdit: proto.TextEdit.insert({ line: 1, character: 2}, '${insert}'),
			insertTextFormat: proto.InsertTextFormat.Snippet
		};

		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.textEdit, undefined);
		ok(result.insertText instanceof vscode.SnippetString && result.insertText.value === '${insert}');
		rangeEqual(result.range!, completionItem.textEdit!.range);

		let back = c2p.asCompletionItem(result);
		strictEqual(back.insertText, undefined);
		strictEqual(back.insertTextFormat, proto.InsertTextFormat.Snippet);
		strictEqual(back.textEdit!.newText, '${insert}');
		rangeEqual(back.textEdit!.range, result.range!);
	});

	test('Completion Item Preserve Data', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			data: 'data'
		};

		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.data, completionItem.data);
	});

	test('Completion Item Preserve Data === 0', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			data: 0
		};

		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.data, completionItem.data);
	});

	test('Completion Item Preserve Data === false', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			data: false
		};

		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.data, completionItem.data);
	});

	test('Completion Item Preserve Data === ""', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			data: ''
		};

		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.data, completionItem.data);
	});

	test('Completion Item Documentation as string', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			documentation: 'doc'
		};
		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		ok(Is.string(result.documentation) && result.documentation === 'doc');
	});

	test('Completion Item Documentation as PlainText', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			documentation: {
				kind: proto.MarkupKind.PlainText,
				value: 'doc'
			}
		};
		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual((result.documentation as proto.MarkupContent).kind, proto.MarkupKind.PlainText);
		strictEqual((result.documentation as proto.MarkupContent).value, 'doc');
	});

	test('Completion Item Documentation as Markdown', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			documentation: {
				kind: proto.MarkupKind.Markdown,
				value: '# Header'
			}
		};
		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual((result.documentation as proto.MarkupContent).kind, proto.MarkupKind.Markdown);
		strictEqual((result.documentation as proto.MarkupContent).value, '# Header');
	});

	test('Completion Item Kind Outside', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			kind: Number.MAX_VALUE as any
		};
		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.kind, vscode.CompletionItemKind.Text);

		let back = c2p.asCompletionItem(result);
		strictEqual(back.kind, Number.MAX_VALUE);
	});

	test('Completion Result', () => {
		let completionResult: proto.CompletionList = {
			isIncomplete: true,
			items: [ { label: 'item', data: 'data' } ]
		};
		let result = p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');

		strictEqual(p2c.asCompletionResult(undefined), undefined);
		strictEqual(p2c.asCompletionResult(null), undefined);
		deepEqual(p2c.asCompletionResult([]), []);
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
			],
			activeSignature: null,
			activeParameter: null
		};

		let result = p2c.asSignatureHelp(signatureHelp);
		ok(result.signatures.every(value => value instanceof vscode.SignatureInformation));
		strictEqual(result.activeSignature, 0);
		strictEqual(result.activeParameter, 0);

		signatureHelp.activeSignature = 1;
		signatureHelp.activeParameter = 2;
		result = p2c.asSignatureHelp(signatureHelp);
		ok(result.signatures.every(value => value instanceof vscode.SignatureInformation));
		strictEqual(result.activeSignature, 1);
		strictEqual(result.activeParameter, 2);

		strictEqual(p2c.asSignatureHelp(undefined), undefined);
		strictEqual(p2c.asSignatureHelp(null), undefined);
	});

	test('Location', () => {
		strictEqual(p2c.asLocation(undefined), undefined);
		strictEqual(p2c.asLocation(null), undefined);

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

		strictEqual(p2c.asDefinitionResult(undefined), undefined);
		strictEqual(p2c.asDefinitionResult(null), undefined);
		deepEqual(p2c.asDefinitionResult([]), []);
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
		strictEqual(p2c.asDocumentHighlights(undefined), undefined);
		strictEqual(p2c.asDocumentHighlights(null), undefined);
		deepEqual(p2c.asDocumentHighlights([]), []);
	});

	test ('Document Links', () => {
		let location = 'file:///foo/bar';
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let documentLink = proto.DocumentLink.create(
			{ start, end }, location
		);

		let result = p2c.asDocumentLink(documentLink);
		ok(result.range instanceof vscode.Range);
		strictEqual(result.target!.toString(), location);

		ok(p2c.asDocumentLinks([documentLink]).every(value => value instanceof vscode.DocumentLink));
		strictEqual(p2c.asDocumentLinks(undefined), undefined);
		strictEqual(p2c.asDocumentLinks(null), undefined);
		deepEqual(p2c.asDocumentLinks([]), []);
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
		strictEqual(p2c.asSymbolInformations(undefined), undefined);
		strictEqual(p2c.asSymbolInformations(null), undefined);
		deepEqual(p2c.asSymbolInformations([]), []);
	});

	test('SymbolInformation Kind outside', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let location: proto.Location = {
			uri: 'file://localhost/folder/file',
			range: { start, end }
		};
		let symbolInformation: proto.SymbolInformation = {
			name: 'name',
			kind: Number.MAX_VALUE as any,
			location: location
		};
		let result = p2c.asSymbolInformation(symbolInformation);
		strictEqual(result.kind, vscode.SymbolKind.Property);
	});

	test('Command', () => {
		let command = proto.Command.create('title', 'commandId');
		command.arguments = ['args'];

		let result = p2c.asCommand(command);
		strictEqual(result.title, command.title);
		strictEqual(result.command, command.command);
		strictEqual(result.arguments, command.arguments);

		ok(p2c.asCommands([command]).every(elem => !!elem.title && !!elem.command));
		strictEqual(p2c.asCommands(undefined), undefined);
		strictEqual(p2c.asCommands(null), undefined);
		deepEqual(p2c.asCommands([]), []);
	});

	test('Code Lens', () => {
		let codeLens: proto.CodeLens = proto.CodeLens.create(proto.Range.create(1,2,8,9), 'data');

		let result = p2c.asCodeLens(codeLens);
		rangeEqual(result.range, codeLens.range);

		codeLens.command = proto.Command.create('title', 'commandId');
		result = p2c.asCodeLens(codeLens);
		strictEqual(result.command!.title, codeLens.command.title);
		strictEqual(result.command!.command, codeLens.command.command);

		ok(p2c.asCodeLenses([codeLens]).every(elem => elem instanceof vscode.CodeLens));
		strictEqual(p2c.asCodeLenses(undefined), undefined);
		strictEqual(p2c.asCodeLenses(null), undefined);
		deepEqual(p2c.asCodeLenses([]), []);
	});

	test('Code Lens Preserve Data', () => {
		let codeLens: proto.CodeLens = proto.CodeLens.create(proto.Range.create(1,2,8,9), 'data');
		let result = c2p.asCodeLens(p2c.asCodeLens(codeLens));
		strictEqual(result.data, codeLens.data);
	});

	test('WorkspaceEdit', () => {
		let workspaceChange = new proto.WorkspaceChange();
		let uri1 = 'file:///abc.txt';
		let change1 = workspaceChange.getTextEditChange({uri: uri1, version: 1});
		change1.insert(proto.Position.create(0,1), 'insert');
		let uri2 = 'file:///xyz.txt';
		let change2 = workspaceChange.getTextEditChange({uri: uri2, version: 99});
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

		strictEqual(p2c.asWorkspaceEdit(undefined), undefined);
		strictEqual(p2c.asWorkspaceEdit(null), undefined);
	});

	test('Uri Rewrite', () => {
		let converter = protocolConverter.createConverter((value: string) => {
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
		strictEqual(result.additionalTextEdits, undefined);
		strictEqual(result.command, undefined);
	});

	test('Completion Item Full', () => {
		let item: vscode.CompletionItem = new vscode.CompletionItem('label');
		item.detail = 'detail';
		item.documentation = 'documentation';
		item.filterText = 'filter';
		item.insertText = 'insert';
		item.kind = vscode.CompletionItemKind.Interface;
		item.sortText = 'sort';
		let edit = vscode.TextEdit.insert(new vscode.Position(1, 2), 'insert');
		item.additionalTextEdits = [edit];
		item.command = { title: 'title', command: 'commandId' }

		let result = c2p.asCompletionItem(<any>item);
		strictEqual(result.label, item.label);
		strictEqual(result.detail, item.detail);
		strictEqual(result.documentation, item.documentation);
		strictEqual(result.filterText, item.filterText);
		strictEqual(result.insertText, item.insertText);
		strictEqual(result.kind, proto.CompletionItemKind.Interface);
		strictEqual(result.sortText, item.sortText);
		rangeEqual(result.additionalTextEdits![0].range, item.additionalTextEdits[0].range);
		strictEqual(result.additionalTextEdits![0].newText, item.additionalTextEdits[0].newText);
	});

	test('Completion Item insertText', () => {
		let item: ProtocolCompletionItem = new ProtocolCompletionItem ('label');
		item.insertText = 'insert';
		item.fromEdit = false;

		let result = c2p.asCompletionItem(<any>item);
		strictEqual(result.insertText, item.insertText);
	});

	test('Completion Item TextEdit', () => {
		let item: ProtocolCompletionItem = new ProtocolCompletionItem ('label');
		item.textEdit = vscode.TextEdit.insert(new vscode.Position(1, 2), 'insert');
		item.fromEdit = false;

		let result = c2p.asCompletionItem(<any>item);
		strictEqual(result.insertText, item.textEdit.newText);
	});

	test('Completion Item Insert Text and Range', () => {
		let item: ProtocolCompletionItem = new ProtocolCompletionItem('label');
		item.insertText = 'insert';
		item.range = new vscode.Range(1, 2, 1, 2);
		item.fromEdit = true;

		let result = c2p.asCompletionItem(<any>item);
		strictEqual(result.insertText, undefined);
		rangeEqual(result.textEdit!.range, item.range);
		strictEqual(result.textEdit!.newText, item.insertText);
	});

	test('Completion Item TextEdit from Edit', () => {
		let item: ProtocolCompletionItem = new ProtocolCompletionItem ('label');
		item.textEdit = vscode.TextEdit.insert(new vscode.Position(1, 2), 'insert');
		item.fromEdit = true;

		let result = c2p.asCompletionItem(<any>item);
		strictEqual(result.insertText, undefined);
		rangeEqual(result.textEdit!.range, item.textEdit.range);
		strictEqual(result.textEdit!.newText, item.textEdit.newText);
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
		item.tags = [vscode.DiagnosticTag.Unnecessary];

		let result = c2p.asDiagnostic(<any>item);
		rangeEqual(result.range, item.range);
		strictEqual(result.message, item.message);
		strictEqual(result.severity, proto.DiagnosticSeverity.Warning);
		strictEqual(result.code, item.code);
		strictEqual(result.source, item.source);
		strictEqual(result.tags !== undefined, true);
		strictEqual(result.tags![0], proto.DiagnosticTag.Unnecessary);
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
		let converter = codeConverter.createConverter((value: vscode.Uri) => {
			return `${value.toString()}.vscode`;
		});

		let result = converter.asUri(vscode.Uri.parse('file://localhost/folder/file'));
		strictEqual('file://localhost/folder/file.vscode', result);
	});
});