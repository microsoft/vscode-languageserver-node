/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, deepEqual, ok } from 'assert';

import * as proto from 'vscode-languageserver-protocol';
import * as codeConverter from 'vscode-languageclient/lib/common/codeConverter';
import * as protocolConverter from 'vscode-languageclient/lib/common/protocolConverter';
import ProtocolCompletionItem from 'vscode-languageclient/lib/common/protocolCompletionItem';
import { DiagnosticCode, ProtocolDiagnostic } from 'vscode-languageclient/lib/common/protocolDiagnostic';
import * as Is from 'vscode-languageclient/lib/common/utils/is';

import * as vscode from 'vscode';
import { CompletionItemTag, InsertTextMode, SymbolTag } from 'vscode-languageserver-protocol';

const c2p: codeConverter.Converter = codeConverter.createConverter();
const p2c: protocolConverter.Converter = protocolConverter.createConverter(undefined, false, false);

interface InsertReplaceRange {
	inserting: vscode.Range;
	replacing: vscode.Range;
}

namespace InsertReplaceRange {
	export function is(value: vscode.Range | InsertReplaceRange | proto.Range): value is InsertReplaceRange {
		const candidate = value as InsertReplaceRange;
		return candidate && !!candidate.inserting && !!candidate.replacing;
	}
}

function assertDefined<T>(value: T | undefined | null): asserts value is T {
	ok(value !== undefined && value !== null);
}

interface ComplexCode {
	value: string | number;
	target: vscode.Uri
}

function assertComplexCode(value: undefined | number | string | ComplexCode ): asserts value is ComplexCode {
	if (value === undefined || typeof value === 'number' || typeof value === 'string') {
		throw new Error(`Code is not complex`);
	}
}

function assertRange(value: vscode.Range | InsertReplaceRange | undefined | null): asserts value is vscode.Range {
	if (!value || InsertReplaceRange.is(value)) {
		throw new Error(`Expected a normal range but got an insert / replace range.`);
	}
}

function assertInsertReplaceRange(value: vscode.Range | InsertReplaceRange | undefined | null): asserts value is InsertReplaceRange {
	if (!value || !InsertReplaceRange.is(value)) {
		throw new Error(`Expected an insert / replace range but got a normal range.`);
	}
}

function assertTextEdit(value: proto.TextEdit | proto.InsertReplaceEdit | undefined | null): asserts value is proto.TextEdit {
	if (!value || proto.InsertReplaceEdit.is(value)) {
		throw new Error(`Expected a text edit but got an insert replace edit.`);
	}
}

function assertInsertReplaceEdit(value: proto.TextEdit | proto.InsertReplaceEdit | undefined | null): asserts value is proto.InsertReplaceEdit {
	if (!value || !proto.InsertReplaceEdit.is(value)) {
		throw new Error(`Expected an insert replace edit but got a normal text edit.`);
	}
}

function assertDiagnosticCode(value: string | number | DiagnosticCode | undefined | null): asserts value is DiagnosticCode {
	if (!value || !DiagnosticCode.is(value)) {
		throw new Error(`Expected complex diagnostic code.`);
	}
}

suite('Protocol Converter', () => {

	function rangeEqual(actual: vscode.Range, expected: proto.Range): void;
	function rangeEqual(actual: proto.Range, expected: vscode.Range): void;
	function rangeEqual(actual: vscode.Range | proto.Range, expected: vscode.Range | proto.Range): void {
		strictEqual(actual.start.line, expected.start.line);
		strictEqual(actual.start.character, expected.start.character);
		strictEqual(actual.end.line, expected.end.line);
		strictEqual(actual.end.character, expected.end.character);
	}

	function completionEditEqual(text: string, range: vscode.Range | InsertReplaceRange, expected: proto.TextEdit | proto.InsertReplaceEdit): void {
		strictEqual(text, expected.newText);
		if (InsertReplaceRange.is(range)) {
			ok(proto.InsertReplaceEdit.is(expected));
		} else {
			assertTextEdit(expected);
			rangeEqual(range, expected.range);
		}
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

		let result = p2c.asRange({ start, end });
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

	test('Diagnostic Tag', () => {
		strictEqual(p2c.asDiagnosticTag(proto.DiagnosticTag.Unnecessary), vscode.DiagnosticTag.Unnecessary);
		strictEqual(p2c.asDiagnosticTag(proto.DiagnosticTag.Deprecated), vscode.DiagnosticTag.Deprecated);
	});

	test('Diagnostic', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		const location: proto.Location = proto.Location.create('file://localhost/folder/file', proto.Range.create(0, 1, 2, 3));
		let diagnostic: proto.Diagnostic = {
			range: { start, end },
			message: 'error',
			severity: proto.DiagnosticSeverity.Error,
			code: 99,
			source: 'source',
			tags: [proto.DiagnosticTag.Unnecessary],
			relatedInformation: [
				{ message: 'related', location: location }
			]
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
		strictEqual(Array.isArray(result.relatedInformation), true);
		strictEqual(result.relatedInformation!.length, 1);
		strictEqual(result.relatedInformation![0].message, 'related');
		strictEqual(result.relatedInformation![0].location.uri.toString(), 'file://localhost/folder/file');
		strictEqual(result.relatedInformation![0].location.range.end.character, 3);

		ok(p2c.asDiagnostics([diagnostic]).every(value => value instanceof vscode.Diagnostic));
	});

	test('Diagnostic - Complex Code', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let diagnostic: proto.Diagnostic = {
			range: { start, end },
			message: 'error',
			severity: proto.DiagnosticSeverity.Error,
			code: 99,
			codeDescription: {
				href: 'https://code.visualstudio.com/'
			},
			source: 'source',
		};

		let result = p2c.asDiagnostic(diagnostic);
		assertDefined(result.code);
		assertComplexCode(result.code);
		strictEqual(result.code.value, 99);
		strictEqual(result.code.target.toString(), 'https://code.visualstudio.com/');
	});

	test('Diagnostic - Complex Code - Deprecated', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let diagnostic: proto.Diagnostic = {
			range: { start, end },
			message: 'error',
			severity: proto.DiagnosticSeverity.Error,
			code: { value: 99, target: 'https://code.visualstudio.com/'} as any,
			source: 'source',
		};

		let result = p2c.asDiagnostic(diagnostic);
		assertDefined(result.code);
		assertComplexCode(result.code);
		strictEqual(result.code.value, 99);
		strictEqual(result.code.target.toString(), 'https://code.visualstudio.com/');
	});

	test('Hover', () => {
		strictEqual(p2c.asHover(undefined), undefined);
		strictEqual(p2c.asHover(null), undefined);

		let hover: proto.Hover = {
			contents: 'hover'
		};

		let result = p2c.asHover(hover);
		strictEqual(result.contents.length, 1);
		ok(result.contents[0] instanceof vscode.MarkdownString);
		strictEqual((result.contents[0] as vscode.MarkdownString).value, 'hover');
		strictEqual(result.range, undefined);

		hover.range = {
			start: { line: 1, character: 2 },
			end: { line: 8, character: 9 }
		};
		result = p2c.asHover(hover);
		let range = result.range!;
		strictEqual(range.start.line, hover.range.start.line);
		strictEqual(range.start.character, hover.range.start.character);
		strictEqual(range.end.line, hover.range.end.line);
		strictEqual(range.end.character, hover.range.end.character);

		/*
		let multiSegmentHover: proto.Hover = {
			contents:{
				kind: MarkupKind.Markdown,
				value:`First Section
				---
				Second Section
				---
				Third Section`
			}
		}
		result = p2c.asHover(multiSegmentHover);
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

	test('Completion Item - Deprecated boolean', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			deprecated: true
		};

		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.tags![0], CompletionItemTag.Deprecated);
	});

	test('Completion Item - Deprecated tag', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			tags: [proto.CompletionItemTag.Deprecated]
		};

		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.tags![0], CompletionItemTag.Deprecated);
	});

	test('Completion Item - Full', () => {
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
			additionalTextEdits: [proto.TextEdit.insert({ line: 1, character: 2 }, 'insert')],
			command: command,
			commitCharacters: ['.'],
			tags: [proto.CompletionItemTag.Deprecated]
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
		strictEqual(result.tags![0], CompletionItemTag.Deprecated);
		strictEqual(result.commitCharacters!.length, 1);
		strictEqual(result.commitCharacters![0], '.');
		ok(result.additionalTextEdits![0] instanceof vscode.TextEdit);

		let completionResult = p2c.asCompletionResult([completionItem]);
		ok(completionResult.every(value => value instanceof vscode.CompletionItem));
	});

	test('Completion Item - Preserve Insert Text', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			insertText: 'insert'
		};

		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.insertText, 'insert');
		let back = c2p.asCompletionItem(result);
		strictEqual(back.insertText, 'insert');
	});

	test('Completion Item - Snippet String', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			insertText: '${value}',
			insertTextFormat: proto.InsertTextFormat.Snippet
		};

		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		ok(result.insertText instanceof vscode.SnippetString);
		strictEqual((<vscode.SnippetString>result.insertText).value, '${value}');
		strictEqual(result.range, undefined);
		strictEqual(result.textEdit, undefined);

		let back = c2p.asCompletionItem(result);
		strictEqual(back.insertTextFormat, proto.InsertTextFormat.Snippet);
		strictEqual(back.insertText, '${value}');
	});

	test('Completion Item - Text Edit', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			textEdit: proto.TextEdit.insert({ line: 1, character: 2 }, 'insert')
		};

		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.textEdit, undefined);
		strictEqual(result.insertText, 'insert');
		assertRange(result.range);
		assertTextEdit(completionItem.textEdit);
		rangeEqual(result.range, completionItem.textEdit.range);

		let back = c2p.asCompletionItem(result);
		strictEqual(back.insertTextFormat, proto.InsertTextFormat.PlainText);
		strictEqual(back.insertText, undefined);
		assertTextEdit(back.textEdit);
		strictEqual(back.textEdit.newText, 'insert');
		rangeEqual(back.textEdit.range, result.range!);
	});

	test('Completion Item - Insert / Replace Edit', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			textEdit: proto.InsertReplaceEdit.create('text', proto.Range.create(0,0,0,0), proto.Range.create(0, 0, 0, 2))
		};

		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.textEdit, undefined);
		strictEqual(result.insertText, 'text');
		assertInsertReplaceRange(result.range);
		assertInsertReplaceEdit(completionItem.textEdit);
		completionEditEqual(result.insertText as string, result.range, completionItem.textEdit);

		let back = c2p.asCompletionItem(result);
		strictEqual(back.insertTextFormat, proto.InsertTextFormat.PlainText);
		strictEqual(back.insertText, undefined);
		assertInsertReplaceEdit(back.textEdit);
		assertInsertReplaceRange(result.range);
		strictEqual(back.textEdit.newText, 'text');
		rangeEqual(back.textEdit.insert, result.range.inserting);
		rangeEqual(back.textEdit.replace, result.range.replacing);
	});

	test('Completion Item - Text Edit Snippet String', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			textEdit: proto.TextEdit.insert({ line: 1, character: 2 }, '${insert}'),
			insertTextFormat: proto.InsertTextFormat.Snippet
		};

		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.textEdit, undefined);
		ok(result.insertText instanceof vscode.SnippetString && result.insertText.value === '${insert}');
		assertRange(result.range);
		assertTextEdit(completionItem.textEdit);
		rangeEqual(result.range, completionItem.textEdit.range);

		let back = c2p.asCompletionItem(result);
		strictEqual(back.insertText, undefined);
		strictEqual(back.insertTextFormat, proto.InsertTextFormat.Snippet);
		assertTextEdit(back.textEdit);
		strictEqual(back.textEdit.newText, '${insert}');
		rangeEqual(back.textEdit.range, result.range!);
	});

	test('Completion Item - Preserve Data', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			data: 'data'
		};

		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.data, completionItem.data);
	});

	test('Completion Item - Preserve Data === 0', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			data: 0
		};

		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.data, completionItem.data);
	});

	test('Completion Item - Preserve Data === false', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			data: false
		};

		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.data, completionItem.data);
	});

	test('Completion Item - Preserve Data === ""', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			data: ''
		};

		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.data, completionItem.data);
	});

	test('Completion Item - Preserve deprecated', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			deprecated: true
		};

		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.deprecated, true);
		strictEqual(result.tags, undefined);
	});

	test('Completion Item - Preserve tag', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			tags: [proto.CompletionItemTag.Deprecated]
		};

		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.deprecated, undefined);
		strictEqual(result.tags![0], proto.CompletionItemTag.Deprecated);
	});

	test('Completion Item - Documentation as string', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			documentation: 'doc'
		};
		let result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		ok(Is.string(result.documentation) && result.documentation === 'doc');
	});

	test('Completion Item - Documentation as PlainText', () => {
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

	test('Completion Item - Documentation as Markdown', () => {
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

	test('Completion Item - Kind Outside', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			kind: Number.MAX_VALUE as any
		};
		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.kind, vscode.CompletionItemKind.Text);

		let back = c2p.asCompletionItem(result);
		strictEqual(back.kind, Number.MAX_VALUE);
	});

	test('Completion Item - InsertTextMode.asIs', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			kind: Number.MAX_VALUE as any,
			insertTextMode: InsertTextMode.asIs
		};
		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.kind, vscode.CompletionItemKind.Text);
		strictEqual(result.keepWhitespace, true);

		let back = c2p.asCompletionItem(result);
		strictEqual(back.kind, Number.MAX_VALUE);
		strictEqual(back.insertTextMode, InsertTextMode.asIs);
	});

	test('Completion Item - InsertTextMode.adjustIndentation', () => {
		let completionItem: proto.CompletionItem = {
			label: 'item',
			kind: Number.MAX_VALUE as any,
			insertTextMode: InsertTextMode.adjustIndentation
		};
		let result = p2c.asCompletionItem(completionItem);
		strictEqual(result.kind, vscode.CompletionItemKind.Text);
		strictEqual(result.keepWhitespace, undefined);

		let back = c2p.asCompletionItem(result);
		strictEqual(back.kind, Number.MAX_VALUE);
		strictEqual(back.insertTextMode, InsertTextMode.adjustIndentation);
	});

	test('Completion Item - Label Details', () => {
		const completionItem: proto.CompletionItem = {
			label: 'name',
			labelDetails: { detail: 'detail', description: 'description' }
		};
		const result = p2c.asCompletionItem(completionItem);
		ok(typeof result.label !== 'string');
		const label: vscode.CompletionItemLabel = result.label as vscode.CompletionItemLabel;
		strictEqual(label.label, 'name');
		strictEqual(label.detail, 'detail');
		strictEqual(label.description, 'description');

		const back = c2p.asCompletionItem(result, true);
		strictEqual(proto.CompletionItemLabelDetails.is(back.labelDetails), true);
		strictEqual(back.labelDetails?.detail, 'detail');
		strictEqual(back.labelDetails?.description, 'description');

		const back2 = c2p.asCompletionItem(result, false);
		strictEqual(back2.labelDetails, undefined);
		strictEqual(back2.label, 'name');
	});

	test('Completion Item - default commit characters', () => {
		const completionItem: proto.CompletionItem = {
			label: 'name'
		};
		let result = p2c.asCompletionItem(completionItem, ['.']);
		strictEqual(result.commitCharacters!.length, 1);
		strictEqual(result.commitCharacters![0], '.');

		completionItem.commitCharacters = [':'];
		result = p2c.asCompletionItem(completionItem, ['.']);
		strictEqual(result.commitCharacters!.length, 1);
		strictEqual(result.commitCharacters![0], ':');
	});

	test('Completion Result', () => {
		const completionResult: proto.CompletionList = {
			isIncomplete: true,
			items: [{ label: 'item', data: 'data' }]
		};
		const result = p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');

		strictEqual(p2c.asCompletionResult(undefined), undefined);
		strictEqual(p2c.asCompletionResult(null), undefined);
		deepEqual(p2c.asCompletionResult([]), []);
	});

	test('Completion Result - edit range', () => {
		const completionResult: proto.CompletionList = {
			isIncomplete: true,
			itemDefaults:  { editRange: proto.Range.create(1,2,3,4) },
			items: [{ label: 'item', data: 'data' }]
		};
		const result = p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');
		rangeEqual(result.items[0].range as vscode.Range, completionResult.itemDefaults?.editRange as proto.Range);
	});

	test('Completion Result - insert / replace range', () => {
		const completionResult: proto.CompletionList = {
			isIncomplete: true,
			itemDefaults: { editRange: { insert: proto.Range.create(1,1,1,1), replace: proto.Range.create(1,2,3,4) } },
			items: [{ label: 'item', data: 'data' }]
		};
		const result = p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');
		const range = result.items[0].range;
		rangeEqual((range as { inserting: vscode.Range }).inserting, (completionResult.itemDefaults?.editRange as { insert: proto.Range}).insert);
		rangeEqual((range as { replacing: vscode.Range }).replacing, (completionResult.itemDefaults?.editRange as { replace: proto.Range}).replace);
	});

	test('Completion Result - commit characters', () => {
		const completionResult: proto.CompletionList = {
			isIncomplete: true,
			itemDefaults: { commitCharacters: ['.', ',']},
			items: [{ label: 'item', data: 'data' }]
		};
		const result = p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');
		const commitCharacters = result.items[0].commitCharacters!;
		strictEqual(commitCharacters?.length, 2);
		strictEqual(commitCharacters[0], '.');
		strictEqual(commitCharacters[1], ',');
	});

	test('Completion Result - insert text mode', () => {
		const completionResult: proto.CompletionList = {
			isIncomplete: true,
			itemDefaults: { insertTextMode: proto.InsertTextMode.asIs },
			items: [{ label: 'item', data: 'data' }]
		};
		const result = p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');
		strictEqual(result.items[0].keepWhitespace, true);
	});

	test('Completion Result - insert text format', () => {
		const completionResult: proto.CompletionList = {
			isIncomplete: true,
			itemDefaults: { insertTextFormat: proto.InsertTextFormat.Snippet },
			items: [{ label: 'item', insertText: '${value}', data: 'data' }]
		};
		const result = p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');
		ok(result.items[0].insertText instanceof vscode.SnippetString);
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
		signatureInfo.parameters = [{ label: 'label' }];
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
			activeSignature: undefined,
			activeParameter: undefined
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
		};

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

	test('Document Highlight', () => {
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

	test('Document Links', () => {
		let location = 'file:///foo/bar';
		let tooltip = 'tooltip';
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let documentLink = proto.DocumentLink.create(
			{ start, end }, location
		);
		documentLink.tooltip = tooltip;

		let result = p2c.asDocumentLink(documentLink);
		ok(result.range instanceof vscode.Range);
		strictEqual(result.target!.toString(), location);
		strictEqual(result.tooltip, tooltip);

		ok(p2c.asDocumentLinks([documentLink]).every(value => value instanceof vscode.DocumentLink));
		strictEqual(p2c.asDocumentLinks(undefined), undefined);
		strictEqual(p2c.asDocumentLinks(null), undefined);
		deepEqual(p2c.asDocumentLinks([]), []);
	});

	test('SymbolInformation', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let location: proto.Location = {
			uri: 'file://localhost/folder/file',
			range: { start, end }
		};
		let symbolInformation: proto.SymbolInformation = {
			name: 'name',
			kind: proto.SymbolKind.Array,
			tags: [proto.SymbolTag.Deprecated],
			location: location
		};

		let result = p2c.asSymbolInformation(symbolInformation);
		strictEqual(result.name, symbolInformation.name);
		strictEqual(result.kind, vscode.SymbolKind.Array);
		strictEqual(result.containerName, undefined);
		assertDefined(result.tags);
		strictEqual(result.tags.length, 1);
		strictEqual(result.tags[0], vscode.SymbolTag.Deprecated);
		ok(result.location instanceof vscode.Location);

		symbolInformation.containerName = 'container';
		result = p2c.asSymbolInformation(symbolInformation);
		strictEqual(result.containerName, symbolInformation.containerName);

		ok(p2c.asSymbolInformations([symbolInformation]).every(value => value instanceof vscode.SymbolInformation));
		strictEqual(p2c.asSymbolInformations(undefined), undefined);
		strictEqual(p2c.asSymbolInformations(null), undefined);
		deepEqual(p2c.asSymbolInformations([]), []);
	});

	test('SymbolInformation Tag outside', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let location: proto.Location = {
			uri: 'file://localhost/folder/file',
			range: { start, end }
		};
		let symbolInformation: proto.SymbolInformation = {
			name: 'name',
			kind: proto.SymbolKind.Array,
			tags: [Number.MAX_VALUE as SymbolTag],
			location: location
		};
		let result = p2c.asSymbolInformation(symbolInformation);
		strictEqual(result.tags, undefined);
	});

	test('SymbolInformation deprecated', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let location: proto.Location = {
			uri: 'file://localhost/folder/file',
			range: { start, end }
		};
		let symbolInformation: proto.SymbolInformation = {
			name: 'name',
			kind: proto.SymbolKind.Array,
			location: location,
			deprecated: true
		};
		let result = p2c.asSymbolInformation(symbolInformation);
		assertDefined(result.tags);
		strictEqual(result.tags.length, 1);
		strictEqual(result.tags[0], vscode.SymbolTag.Deprecated);
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

	test('DocumentSymbol', () => {
		let start: proto.Position = { line: 1, character: 2 };
		let end: proto.Position = { line: 8, character: 9 };
		let documentSymbol: proto.DocumentSymbol = {
			name: 'name',
			kind: proto.SymbolKind.Array,
			tags: [proto.SymbolTag.Deprecated],
			range: { start, end },
			selectionRange: { start, end }
		};
		ok(proto.DocumentSymbol.is(documentSymbol));
		let result = p2c.asDocumentSymbol(documentSymbol);
		strictEqual(result.name, documentSymbol.name);
		strictEqual(result.kind, vscode.SymbolKind.Array);
		strictEqual(result.children.length, 0);
		assertDefined(result.tags);
		strictEqual(result.tags.length, 1);
		strictEqual(result.tags[0], vscode.SymbolTag.Deprecated);
		rangeEqual(result.range, documentSymbol.range);
		rangeEqual(result.selectionRange, documentSymbol.selectionRange);
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
		let codeLens: proto.CodeLens = proto.CodeLens.create(proto.Range.create(1, 2, 8, 9), 'data');

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
		let codeLens: proto.CodeLens = proto.CodeLens.create(proto.Range.create(1, 2, 8, 9), 'data');
		let result = c2p.asCodeLens(p2c.asCodeLens(codeLens));
		strictEqual(result.data, codeLens.data);
	});

	test('WorkspaceEdit', () => {
		let workspaceChange = new proto.WorkspaceChange();
		let uri1 = 'file:///abc.txt';
		let change1 = workspaceChange.getTextEditChange({ uri: uri1, version: 1 });
		change1.insert(proto.Position.create(0, 1), 'insert');
		let uri2 = 'file:///xyz.txt';
		let change2 = workspaceChange.getTextEditChange({ uri: uri2, version: 99 });
		change2.replace(proto.Range.create(0, 1, 2, 3), 'replace');

		let result = p2c.asWorkspaceEdit(workspaceChange.edit);
		let edits = result.get(vscode.Uri.parse(uri1));
		strictEqual(edits.length, 1);
		rangeEqual(edits[0].range, proto.Range.create(0, 1, 0, 1));
		strictEqual(edits[0].newText, 'insert');

		edits = result.get(vscode.Uri.parse(uri2));
		strictEqual(edits.length, 1);
		rangeEqual(edits[0].range, proto.Range.create(0, 1, 2, 3));
		strictEqual(edits[0].newText, 'replace');

		strictEqual(p2c.asWorkspaceEdit(undefined), undefined);
		strictEqual(p2c.asWorkspaceEdit(null), undefined);
	});

	test('Uri Rewrite', () => {
		let converter = protocolConverter.createConverter((value: string) => {
			return vscode.Uri.parse(`${value}.vscode`);
		}, false, false);

		let result = converter.asUri('file://localhost/folder/file');
		strictEqual('file://localhost/folder/file.vscode', result.toString());
	});

	test('InlineValues', () => {
		const items: proto.InlineValue[] = [
			proto.InlineValueText.create(proto.Range.create(1, 2, 8, 9), 'literalString'),
			proto.InlineValueVariableLookup.create(proto.Range.create(1, 2, 8, 9), 'varName', false),
			proto.InlineValueVariableLookup.create(proto.Range.create(1, 2, 8, 9), undefined, true),
			proto.InlineValueEvaluatableExpression.create(proto.Range.create(1, 2, 8, 9), 'expression'),
			proto.InlineValueEvaluatableExpression.create(proto.Range.create(1, 2, 8, 9), undefined),
		];

		let result = p2c.asInlineValues(<any>items);


		ok(result.every((r) => r.range instanceof vscode.Range));
		for (const r of result) {
			rangeEqual(r.range, proto.Range.create(1, 2, 8, 9));
		}

		ok(result[0] instanceof vscode.InlineValueText && result[0].text === 'literalString');
		ok(result[1] instanceof vscode.InlineValueVariableLookup && result[1].variableName === 'varName' && result[1].caseSensitiveLookup === false);
		ok(result[2] instanceof vscode.InlineValueVariableLookup && result[2].variableName === undefined && result[2].caseSensitiveLookup === true);
		ok(result[3] instanceof vscode.InlineValueEvaluatableExpression && result[3].expression === 'expression');
		ok(result[4] instanceof vscode.InlineValueEvaluatableExpression && result[4].expression === undefined);
	});

	test('Bug #361', () => {
		const item: proto.CompletionItem = {
			'label': 'MyLabel',
			'textEdit': {
				'range': {
					'start': {
						'line': 0,
						'character': 0
					},
					'end': {
						'line': 0,
						'character': 10
					}
				},
				'newText': ''
			}
		};
		const converted = p2c.asCompletionItem(item);
		const toResolve = c2p.asCompletionItem(converted);
		assertTextEdit(toResolve.textEdit);
		strictEqual(toResolve.textEdit.range.start.line, 0);
		strictEqual(toResolve.textEdit.range.start.character, 0);
		strictEqual(toResolve.textEdit.range.end.line, 0);
		strictEqual(toResolve.textEdit.range.end.character, 10);
		strictEqual(toResolve.textEdit.newText, '');

		const resolved = p2c.asCompletionItem(toResolve);
		strictEqual(resolved.label, item.label);
		const range = resolved.range!;
		assertRange(range);
		strictEqual(range.start.line, 0);
		strictEqual(range.start.character, 0);
		strictEqual(range.end.line, 0);
		strictEqual(range.end.character, 10);
		strictEqual(resolved.insertText, '');
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
		strictEqual(result.deprecated, undefined);
		strictEqual(result.tags, undefined);
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
		item.tags = [vscode.CompletionItemTag.Deprecated];
		item.command = { title: 'title', command: 'commandId' };

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
		strictEqual(result.tags![0], proto.CompletionItemTag.Deprecated);
		strictEqual(result.deprecated, undefined);
	});

	test('Completion Item - insertText', () => {
		let item: ProtocolCompletionItem = new ProtocolCompletionItem('label');
		item.insertText = 'insert';
		item.fromEdit = false;

		let result = c2p.asCompletionItem(<any>item);
		strictEqual(result.insertText, item.insertText);
	});

	test('Completion Item - TextEdit', () => {
		let item: ProtocolCompletionItem = new ProtocolCompletionItem('label');
		item.textEdit = vscode.TextEdit.insert(new vscode.Position(1, 2), 'insert');
		item.fromEdit = false;

		let result = c2p.asCompletionItem(<any>item);
		strictEqual(result.insertText, item.textEdit.newText);
	});

	test('Completion Item - Insert Text and Range', () => {
		let item: ProtocolCompletionItem = new ProtocolCompletionItem('label');
		item.insertText = 'insert';
		item.range = new vscode.Range(1, 2, 1, 2);
		item.fromEdit = true;

		let result = c2p.asCompletionItem(<any>item);
		strictEqual(result.insertText, undefined);
		assertTextEdit(result.textEdit);
		rangeEqual(result.textEdit.range, item.range);
		strictEqual(result.textEdit.newText, item.insertText);
	});

	test('Completion Item - TextEdit from Edit', () => {
		let item: ProtocolCompletionItem = new ProtocolCompletionItem('label');
		item.textEdit = vscode.TextEdit.insert(new vscode.Position(1, 2), 'insert');
		item.fromEdit = true;

		let result = c2p.asCompletionItem(<any>item);
		strictEqual(result.insertText, undefined);
		assertTextEdit(result.textEdit);
		rangeEqual(result.textEdit.range, item.textEdit.range);
		strictEqual(result.textEdit.newText, item.textEdit.newText);
	});

	test('Completion Item - Keep whitespace', () => {
		let item: ProtocolCompletionItem = new ProtocolCompletionItem('label');
		item.textEdit = vscode.TextEdit.insert(new vscode.Position(1, 2), 'insert');
		item.fromEdit = true;
		item.keepWhitespace = true;

		let result = c2p.asCompletionItem(<any>item);
		strictEqual(result.insertText, undefined);
		assertTextEdit(result.textEdit);
		rangeEqual(result.textEdit.range, item.textEdit.range);
		strictEqual(result.textEdit.newText, item.textEdit.newText);
		strictEqual(result.insertTextMode, InsertTextMode.adjustIndentation);
	});

	test('DiagnosticSeverity', () => {
		strictEqual(c2p.asDiagnosticSeverity(<any>vscode.DiagnosticSeverity.Error), proto.DiagnosticSeverity.Error);
		strictEqual(c2p.asDiagnosticSeverity(<any>vscode.DiagnosticSeverity.Warning), proto.DiagnosticSeverity.Warning);
		strictEqual(c2p.asDiagnosticSeverity(<any>vscode.DiagnosticSeverity.Information), proto.DiagnosticSeverity.Information);
		strictEqual(c2p.asDiagnosticSeverity(<any>vscode.DiagnosticSeverity.Hint), proto.DiagnosticSeverity.Hint);
	});

	test('DiagnosticTag', () => {
		strictEqual(c2p.asDiagnosticTag(<any>vscode.DiagnosticTag.Unnecessary), proto.DiagnosticTag.Unnecessary);
		strictEqual(c2p.asDiagnosticTag(<any>vscode.DiagnosticTag.Deprecated), proto.DiagnosticTag.Deprecated);
	});

	test('Diagnostic', () => {
		let item: vscode.Diagnostic = new vscode.Diagnostic(new vscode.Range(1, 2, 8, 9), 'message', vscode.DiagnosticSeverity.Warning);
		item.code = 99;
		item.source = 'source';
		item.tags = [vscode.DiagnosticTag.Unnecessary];
		item.relatedInformation = [
			new vscode.DiagnosticRelatedInformation(new vscode.Location(vscode.Uri.parse('file://localhost/folder/file'), new vscode.Range(0, 1, 2, 3)), 'related')
		];

		let result = c2p.asDiagnostic(<any>item);
		rangeEqual(result.range, item.range);
		strictEqual(result.message, item.message);
		strictEqual(result.severity, proto.DiagnosticSeverity.Warning);
		strictEqual(result.code, item.code);
		strictEqual(result.source, item.source);
		strictEqual(result.tags !== undefined, true);
		strictEqual(result.tags![0], proto.DiagnosticTag.Unnecessary);
		strictEqual(Array.isArray(result.relatedInformation), true);
		strictEqual(result.relatedInformation!.length, 1);
		strictEqual(result.relatedInformation![0].message, 'related');
		strictEqual(result.relatedInformation![0].location.uri, 'file://localhost/folder/file');
		strictEqual(result.relatedInformation![0].location.range.end.character, 3);
		ok(c2p.asDiagnostics(<any>[item]).every(elem => proto.Diagnostic.is(elem)));
	});

	test('Diagnostic - Complex Code', () => {
		let item: vscode.Diagnostic = new vscode.Diagnostic(new vscode.Range(1, 2, 8, 9), 'message', vscode.DiagnosticSeverity.Warning);
		item.code = { value: 99, target: vscode.Uri.parse('https://code.visualstudio.com/') };

		let result = c2p.asDiagnostic(<any>item);

		strictEqual(result.code, 99);
		strictEqual(result.codeDescription?.href, 'https://code.visualstudio.com/');
	});

	test('Diagnostic - Complex Code - Deprecated', () => {
		const item: ProtocolDiagnostic = new ProtocolDiagnostic(new vscode.Range(1, 2, 8, 9), 'message', vscode.DiagnosticSeverity.Warning, undefined);
		item.hasDiagnosticCode = true;
		item.code = { value: 99, target: vscode.Uri.parse('https://code.visualstudio.com/') };

		const result = c2p.asDiagnostic(item);

		assertDiagnosticCode(result.code);
		strictEqual(result.code.value, 99);
		strictEqual(result.code.target, 'https://code.visualstudio.com/');
	});

	test('CodeActionContext', () => {
		let item: vscode.CodeActionContext = {
			diagnostics: [new vscode.Diagnostic(new vscode.Range(1, 2, 8, 9), 'message', vscode.DiagnosticSeverity.Warning)],
			triggerKind: vscode.CodeActionTriggerKind.Invoke
		};

		let result = c2p.asCodeActionContext(<any>item);
		ok(result.diagnostics.every(elem => proto.Diagnostic.is(elem)));
		strictEqual(result.triggerKind, proto.CodeActionTriggerKind.Invoked);
	});

	test('CodeActionContext - automatic', () => {
		let item: vscode.CodeActionContext = {
			diagnostics: [],
			triggerKind: vscode.CodeActionTriggerKind.Automatic
		};

		let result = c2p.asCodeActionContext(<any>item);
		strictEqual(result.triggerKind, proto.CodeActionTriggerKind.Automatic);
	});

	test('Uri Rewrite', () => {
		let converter = codeConverter.createConverter((value: vscode.Uri) => {
			return `${value.toString()}.vscode`;
		});

		let result = converter.asUri(vscode.Uri.parse('file://localhost/folder/file'));
		strictEqual('file://localhost/folder/file.vscode', result);
	});

	test('InlineValuesContext', () => {
		const item: proto.InlineValuesContext = {
			stoppedLocation: new vscode.Range(1, 2, 8, 9),
		};

		let result = c2p.asInlineValuesContext(<any>item);

		strictEqual(result.stoppedLocation.start.line, 1);
		strictEqual(result.stoppedLocation.start.character, 2);
		strictEqual(result.stoppedLocation.end.line, 8);
		strictEqual(result.stoppedLocation.end.character, 9);
	});
});
