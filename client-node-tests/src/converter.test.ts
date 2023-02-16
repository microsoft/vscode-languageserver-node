/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, deepEqual, ok } from 'assert';

import * as proto from 'vscode-languageclient';
import * as codeConverter from 'vscode-languageclient/lib/common/codeConverter';
import * as protocolConverter from 'vscode-languageclient/lib/common/protocolConverter';
import ProtocolCompletionItem from 'vscode-languageclient/lib/common/protocolCompletionItem';
import ProtocolInlayHint from 'vscode-languageclient/lib/common/protocolInlayHint';
import { DiagnosticCode, ProtocolDiagnostic } from 'vscode-languageclient/lib/common/protocolDiagnostic';
import * as Is from 'vscode-languageclient/lib/common/utils/is';
import * as async from 'vscode-languageclient/lib/common/utils/async';

import * as vscode from 'vscode';

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
	target: vscode.Uri;
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

suite('Async Array', () => {

	suiteSetup(() => {
		async.setTestMode();
	});

	suiteTeardown(() => {
		async.clearTestMode();
	});

	test('map', async() => {
		const ranges: proto.Range[] = new Array(10000);
		for (let i = 0; i < ranges.length; i++) {
			ranges[i] = proto.Range.create(i, i, i, i);
		}
		let yielded = 0;
		const converted = await async.map(ranges, p2c.asRange, undefined, { yieldAfter: 2, yieldCallback: () => { yielded++; }});
		ok(yielded > 0);
		strictEqual(converted.length, ranges.length);
		for (let i = 0; i < converted.length; i++) {
			ok(converted[i] instanceof vscode.Range);
			strictEqual(converted[i]?.start.line, i);
		}
	}).timeout(5000);

	test('map async', async() => {
		const ranges: proto.Range[] = new Array(5000);
		for (let i = 0; i < ranges.length; i++) {
			ranges[i] = proto.Range.create(i, i, i, i);
		}
		let yielded = 0;
		const converted = await async.mapAsync(ranges, (item): Promise<vscode.Range> => {
			return new Promise((resolve) => {
				proto.RAL().timer.setImmediate(() => {
					resolve(p2c.asRange(item));
				});
			});
		}, undefined, { yieldAfter: 2, yieldCallback: () => { yielded++; }});
		ok(yielded > 0);
		strictEqual(converted.length, ranges.length);
		for (let i = 0; i < converted.length; i++) {
			ok(converted[i] instanceof vscode.Range);
			strictEqual(converted[i]?.start.line, i);
		}
	}).timeout(5000);

	test('forEach', async() => {
		const ranges: proto.Range[] = new Array(7500);
		for (let i = 0; i < ranges.length; i++) {
			ranges[i] = proto.Range.create(i + 1, 0, i + 2, 1);
		}
		let sum: number = 0;
		let yielded = 0;
		await async.forEach(ranges, (item) => {
			const codeRange = p2c.asRange(item);
			sum += codeRange.start.line;
		}, undefined, { yieldAfter: 2, yieldCallback: () => { yielded++; }});
		ok(yielded > 0);
		strictEqual(sum, 28128750);
	}).timeout(5000);
});

suite('Protocol Converter', () => {

	function rangeEqual(actual: vscode.Range, expected: proto.Range): void;
	function rangeEqual(actual: proto.Range, expected: vscode.Range): void;
	function rangeEqual(actual: vscode.Range | proto.Range, expected: vscode.Range | proto.Range): void {
		strictEqual(actual.start.line, expected.start.line);
		strictEqual(actual.start.character, expected.start.character);
		strictEqual(actual.end.line, expected.end.line);
		strictEqual(actual.end.character, expected.end.character);
	}

	function positionEqual(actual: vscode.Position, expected: proto.Position): void;
	function positionEqual(actual: proto.Position, expected: vscode.Position): void;
	function positionEqual(actual: vscode.Position | proto.Position, expected: vscode.Position | proto.Position): void {
		strictEqual(actual.line, expected.line);
		strictEqual(actual.character, expected.character);
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
		const position: proto.Position = { line: 1, character: 2 };

		const result = p2c.asPosition(position);
		strictEqual(result.line, position.line);
		strictEqual(result.character, position.character);

		strictEqual(p2c.asPosition(null), undefined);
		strictEqual(p2c.asPosition(undefined), undefined);
	});

	test('Range Converter', () => {
		const start: proto.Position = { line: 1, character: 2 };
		const end: proto.Position = { line: 8, character: 9 };

		const result = p2c.asRange({ start, end });
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

	test('Diagnostic', async () => {
		const start: proto.Position = { line: 1, character: 2 };
		const end: proto.Position = { line: 8, character: 9 };
		const location: proto.Location = proto.Location.create('file://localhost/folder/file', proto.Range.create(0, 1, 2, 3));
		const diagnostic: proto.Diagnostic = {
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

		const result = p2c.asDiagnostic(diagnostic);
		const range = result.range;
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

		ok((await p2c.asDiagnostics([diagnostic])).every(value => value instanceof vscode.Diagnostic));
	});

	test('Diagnostic - Complex Code', () => {
		const start: proto.Position = { line: 1, character: 2 };
		const end: proto.Position = { line: 8, character: 9 };
		const diagnostic: proto.Diagnostic = {
			range: { start, end },
			message: 'error',
			severity: proto.DiagnosticSeverity.Error,
			code: 99,
			codeDescription: {
				href: 'https://code.visualstudio.com/'
			},
			source: 'source',
		};

		const result = p2c.asDiagnostic(diagnostic);
		assertDefined(result.code);
		assertComplexCode(result.code);
		strictEqual(result.code.value, 99);
		strictEqual(result.code.target.toString(), 'https://code.visualstudio.com/');
	});

	test('Diagnostic - Complex Code - Deprecated', () => {
		const start: proto.Position = { line: 1, character: 2 };
		const end: proto.Position = { line: 8, character: 9 };
		const diagnostic: proto.Diagnostic = {
			range: { start, end },
			message: 'error',
			severity: proto.DiagnosticSeverity.Error,
			code: { value: 99, target: 'https://code.visualstudio.com/'} as any,
			source: 'source',
		};

		const result = p2c.asDiagnostic(diagnostic);
		assertDefined(result.code);
		assertComplexCode(result.code);
		strictEqual(result.code.value, 99);
		strictEqual(result.code.target.toString(), 'https://code.visualstudio.com/');
	});

	test('Hover', () => {
		strictEqual(p2c.asHover(undefined), undefined);
		strictEqual(p2c.asHover(null), undefined);

		const hover: proto.Hover = {
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
		const range = result.range!;
		strictEqual(range.start.line, hover.range.start.line);
		strictEqual(range.start.character, hover.range.start.character);
		strictEqual(range.end.line, hover.range.end.line);
		strictEqual(range.end.character, hover.range.end.character);

		/*
		const multiSegmentHover: proto.Hover = {
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
		const edit: proto.TextEdit = proto.TextEdit.insert({ line: 1, character: 2 }, 'insert');
		const result = p2c.asTextEdit(edit);
		const range = result.range;
		strictEqual(range.start.line, edit.range.start.line);
		strictEqual(range.start.character, edit.range.start.character);
		strictEqual(range.end.line, edit.range.end.line);
		strictEqual(range.end.character, edit.range.end.character);
		strictEqual(result.newText, edit.newText);
	});

	test('Text Edit Replace', () => {
		const edit: proto.TextEdit = proto.TextEdit.replace(
			{
				start: { line: 1, character: 2 },
				end: { line: 8, character: 9 }
			},
			'insert');

		const result = p2c.asTextEdit(edit);
		const range = result.range;
		strictEqual(range.start.line, edit.range.start.line);
		strictEqual(range.start.character, edit.range.start.character);
		strictEqual(range.end.line, edit.range.end.line);
		strictEqual(range.end.character, edit.range.end.character);
		strictEqual(result.newText, edit.newText);
	});

	test('Text Edit Delete', () => {
		const edit: proto.TextEdit = proto.TextEdit.del(
			{
				start: { line: 1, character: 2 },
				end: { line: 8, character: 9 }
			});

		const result = p2c.asTextEdit(edit);
		const range = result.range;
		strictEqual(range.start.line, edit.range.start.line);
		strictEqual(range.start.character, edit.range.start.character);
		strictEqual(range.end.line, edit.range.end.line);
		strictEqual(range.end.character, edit.range.end.character);
		strictEqual(result.newText, edit.newText);
	});

	test('Text Edits', async () => {
		const edit: proto.TextEdit = proto.TextEdit.del(
			{
				start: { line: 1, character: 2 },
				end: { line: 8, character: 9 }
			});
		ok((await p2c.asTextEdits([edit])).every(elem => elem instanceof vscode.TextEdit));

		strictEqual(await p2c.asTextEdits(undefined), undefined);
		strictEqual(await p2c.asTextEdits(null), undefined);
		deepEqual(await p2c.asTextEdits([]), []);
	});

	test('Completion Item', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item'
		};

		const result = p2c.asCompletionItem(completionItem);
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
		const completionItem: proto.CompletionItem = {
			label: 'item',
			deprecated: true
		};

		const result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.tags![0], proto.CompletionItemTag.Deprecated);
	});

	test('Completion Item - Deprecated tag', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			tags: [proto.CompletionItemTag.Deprecated]
		};

		const result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.tags![0], proto.CompletionItemTag.Deprecated);
	});

	test('Completion Item - Full', async () => {
		const command = proto.Command.create('title', 'commandId');
		command.arguments = ['args'];

		const completionItem: proto.CompletionItem = {
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

		const result = p2c.asCompletionItem(completionItem);
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
		strictEqual(result.tags![0], proto.CompletionItemTag.Deprecated);
		strictEqual(result.commitCharacters!.length, 1);
		strictEqual(result.commitCharacters![0], '.');
		ok(result.additionalTextEdits![0] instanceof vscode.TextEdit);

		const completionResult = await p2c.asCompletionResult([completionItem]);
		ok(completionResult.every(value => value instanceof vscode.CompletionItem));
	});

	test('Completion Item - Preserve Insert Text', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			insertText: 'insert'
		};

		const result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.insertText, 'insert');
		const back = c2p.asCompletionItem(result);
		strictEqual(back.insertText, 'insert');
	});

	test('Completion Item - Snippet String', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			insertText: '${value}',
			insertTextFormat: proto.InsertTextFormat.Snippet
		};

		const result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		ok(result.insertText instanceof vscode.SnippetString);
		strictEqual((<vscode.SnippetString>result.insertText).value, '${value}');
		strictEqual(result.range, undefined);
		strictEqual(result.textEdit, undefined);

		const back = c2p.asCompletionItem(result);
		strictEqual(back.insertTextFormat, proto.InsertTextFormat.Snippet);
		strictEqual(back.insertText, '${value}');
	});

	test('Completion Item - Text Edit', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			textEdit: proto.TextEdit.insert({ line: 1, character: 2 }, 'insert')
		};

		const result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.textEdit, undefined);
		strictEqual(result.insertText, 'insert');
		assertRange(result.range);
		assertTextEdit(completionItem.textEdit);
		rangeEqual(result.range, completionItem.textEdit.range);

		const back = c2p.asCompletionItem(result);
		strictEqual(back.insertTextFormat, proto.InsertTextFormat.PlainText);
		strictEqual(back.insertText, undefined);
		assertTextEdit(back.textEdit);
		strictEqual(back.textEdit.newText, 'insert');
		rangeEqual(back.textEdit.range, result.range!);
	});

	test('Completion Item - Insert / Replace Edit', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			textEdit: proto.InsertReplaceEdit.create('text', proto.Range.create(0,0,0,0), proto.Range.create(0, 0, 0, 2))
		};

		const result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.textEdit, undefined);
		strictEqual(result.insertText, 'text');
		assertInsertReplaceRange(result.range);
		assertInsertReplaceEdit(completionItem.textEdit);
		completionEditEqual(result.insertText as string, result.range, completionItem.textEdit);

		const back = c2p.asCompletionItem(result);
		strictEqual(back.insertTextFormat, proto.InsertTextFormat.PlainText);
		strictEqual(back.insertText, undefined);
		assertInsertReplaceEdit(back.textEdit);
		assertInsertReplaceRange(result.range);
		strictEqual(back.textEdit.newText, 'text');
		rangeEqual(back.textEdit.insert, result.range.inserting);
		rangeEqual(back.textEdit.replace, result.range.replacing);
	});

	test('Completion Item - Text Edit Snippet String', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			textEdit: proto.TextEdit.insert({ line: 1, character: 2 }, '${insert}'),
			insertTextFormat: proto.InsertTextFormat.Snippet
		};

		const result = p2c.asCompletionItem(completionItem);
		strictEqual(result.label, completionItem.label);
		strictEqual(result.textEdit, undefined);
		ok(result.insertText instanceof vscode.SnippetString && result.insertText.value === '${insert}');
		assertRange(result.range);
		assertTextEdit(completionItem.textEdit);
		rangeEqual(result.range, completionItem.textEdit.range);

		const back = c2p.asCompletionItem(result);
		strictEqual(back.insertText, undefined);
		strictEqual(back.insertTextFormat, proto.InsertTextFormat.Snippet);
		assertTextEdit(back.textEdit);
		strictEqual(back.textEdit.newText, '${insert}');
		rangeEqual(back.textEdit.range, result.range!);
	});

	test('Completion Item - Preserve Data', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			data: 'data'
		};

		const result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.data, completionItem.data);
	});

	test('Completion Item - Preserve Data === 0', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			data: 0
		};

		const result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.data, completionItem.data);
	});

	test('Completion Item - Preserve Data === false', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			data: false
		};

		const result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.data, completionItem.data);
	});

	test('Completion Item - Preserve Data === ""', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			data: ''
		};

		const result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.data, completionItem.data);
	});

	test('Completion Item - Preserve deprecated', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			deprecated: true
		};

		const result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.deprecated, true);
		strictEqual(result.tags, undefined);
	});

	test('Completion Item - Preserve tag', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			tags: [proto.CompletionItemTag.Deprecated]
		};

		const result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual(result.deprecated, undefined);
		strictEqual(result.tags![0], proto.CompletionItemTag.Deprecated);
	});

	test('Completion Item - Documentation as string', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			documentation: 'doc'
		};
		const result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		ok(Is.string(result.documentation) && result.documentation === 'doc');
	});

	test('Completion Item - Documentation as PlainText', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			documentation: {
				kind: proto.MarkupKind.PlainText,
				value: 'doc'
			}
		};
		const result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual((result.documentation as proto.MarkupContent).kind, proto.MarkupKind.PlainText);
		strictEqual((result.documentation as proto.MarkupContent).value, 'doc');
	});

	test('Completion Item - Documentation as Markdown', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			documentation: {
				kind: proto.MarkupKind.Markdown,
				value: '# Header'
			}
		};
		const result = c2p.asCompletionItem(p2c.asCompletionItem(completionItem));
		strictEqual((result.documentation as proto.MarkupContent).kind, proto.MarkupKind.Markdown);
		strictEqual((result.documentation as proto.MarkupContent).value, '# Header');
	});

	test('Completion Item - Kind Outside', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			kind: Number.MAX_VALUE as any
		};
		const result = p2c.asCompletionItem(completionItem);
		strictEqual(result.kind, vscode.CompletionItemKind.Text);

		const back = c2p.asCompletionItem(result);
		strictEqual(back.kind, Number.MAX_VALUE);
	});

	test('Completion Item - InsertTextMode.asIs', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			kind: Number.MAX_VALUE as any,
			insertTextMode: proto.InsertTextMode.asIs
		};
		const result = p2c.asCompletionItem(completionItem);
		strictEqual(result.kind, vscode.CompletionItemKind.Text);
		strictEqual(result.keepWhitespace, true);

		const back = c2p.asCompletionItem(result);
		strictEqual(back.kind, Number.MAX_VALUE);
		strictEqual(back.insertTextMode, proto.InsertTextMode.asIs);
	});

	test('Completion Item - InsertTextMode.adjustIndentation', () => {
		const completionItem: proto.CompletionItem = {
			label: 'item',
			kind: Number.MAX_VALUE as any,
			insertTextMode: proto.InsertTextMode.adjustIndentation
		};
		const result = p2c.asCompletionItem(completionItem);
		strictEqual(result.kind, vscode.CompletionItemKind.Text);
		strictEqual(result.keepWhitespace, undefined);

		const back = c2p.asCompletionItem(result);
		strictEqual(back.kind, Number.MAX_VALUE);
		strictEqual(back.insertTextMode, proto.InsertTextMode.adjustIndentation);
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

	test('Completion Result', async () => {
		const completionResult: proto.CompletionList = {
			isIncomplete: true,
			items: [{ label: 'item', data: 'data' }]
		};
		const result = await p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');

		strictEqual(await p2c.asCompletionResult(undefined), undefined);
		strictEqual(await p2c.asCompletionResult(null), undefined);
		deepEqual(await p2c.asCompletionResult([]), []);
	});

	test('Completion Result - edit range', async () => {
		const completionResult: proto.CompletionList = {
			isIncomplete: true,
			itemDefaults:  { editRange: proto.Range.create(1,2,3,4) },
			items: [{ label: 'item', data: 'data' }]
		};
		const result = await p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');
		rangeEqual(result.items[0].range as vscode.Range, completionResult.itemDefaults?.editRange as proto.Range);
	});

	test('Completion Result - edit range with textEditText', async () => {
		const completionResult: proto.CompletionList = {
			isIncomplete: true,
			itemDefaults:  { editRange: proto.Range.create(1,2,3,4) },
			items: [{ label: 'item', textEditText: 'text', data: 'data' }]
		};
		const result = await p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');
		strictEqual(result.items[0].insertText, 'text');
		rangeEqual(result.items[0].range as vscode.Range, completionResult.itemDefaults?.editRange as proto.Range);
	});

	test('Completion Result - insert / replace range', async () => {
		const completionResult: proto.CompletionList = {
			isIncomplete: true,
			itemDefaults: { editRange: { insert: proto.Range.create(1,1,1,1), replace: proto.Range.create(1,2,3,4) } },
			items: [{ label: 'item', data: 'data' }]
		};
		const result = await p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');
		const range = result.items[0].range;
		rangeEqual((range as { inserting: vscode.Range }).inserting, (completionResult.itemDefaults?.editRange as { insert: proto.Range}).insert);
		rangeEqual((range as { replacing: vscode.Range }).replacing, (completionResult.itemDefaults?.editRange as { replace: proto.Range}).replace);
	});

	test('Completion Result - insert / replace range with textEditText', async () => {
		const completionResult: proto.CompletionList = {
			isIncomplete: true,
			itemDefaults: { editRange: { insert: proto.Range.create(1,1,1,1), replace: proto.Range.create(1,2,3,4) } },
			items: [{ label: 'item', textEditText: 'text', data: 'data' }]
		};
		const result = await p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');
		strictEqual(result.items[0].insertText, 'text');
		const range = result.items[0].range;
		rangeEqual((range as { inserting: vscode.Range }).inserting, (completionResult.itemDefaults?.editRange as { insert: proto.Range}).insert);
		rangeEqual((range as { replacing: vscode.Range }).replacing, (completionResult.itemDefaults?.editRange as { replace: proto.Range}).replace);
	});

	test('Completion Result - commit characters', async () => {
		const completionResult: proto.CompletionList = {
			isIncomplete: true,
			itemDefaults: { commitCharacters: ['.', ',']},
			items: [{ label: 'item', data: 'data' }]
		};
		const result = await p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');
		const commitCharacters = result.items[0].commitCharacters!;
		strictEqual(commitCharacters?.length, 2);
		strictEqual(commitCharacters[0], '.');
		strictEqual(commitCharacters[1], ',');
	});

	test('Completion Result - insert text mode', async () => {
		const completionResult: proto.CompletionList = {
			isIncomplete: true,
			itemDefaults: { insertTextMode: proto.InsertTextMode.asIs },
			items: [{ label: 'item', data: 'data' }]
		};
		const result = await p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');
		strictEqual(result.items[0].keepWhitespace, true);
	});

	test('Completion Result - insert text format', async () => {
		const completionResult: proto.CompletionList = {
			isIncomplete: true,
			itemDefaults: { insertTextFormat: proto.InsertTextFormat.Snippet },
			items: [{ label: 'item', insertText: '${value}', data: 'data' }]
		};
		const result = await p2c.asCompletionResult(completionResult);
		strictEqual(result.isIncomplete, completionResult.isIncomplete);
		strictEqual(result.items.length, 1);
		strictEqual(result.items[0].label, 'item');
		ok(result.items[0].insertText instanceof vscode.SnippetString);
	});

	test('Parameter Information', async () => {
		const parameterInfo: proto.ParameterInformation = {
			label: 'label'
		};

		let result = p2c.asParameterInformation(parameterInfo);
		strictEqual(result.label, parameterInfo.label);
		strictEqual(result.documentation, undefined);

		parameterInfo.documentation = 'documentation';
		result = p2c.asParameterInformation(parameterInfo);
		strictEqual(result.label, parameterInfo.label);
		strictEqual(result.documentation, parameterInfo.documentation);

		ok((await p2c.asParameterInformations([parameterInfo])).every(value => value instanceof vscode.ParameterInformation));
	});

	test('Signature Information', async () => {
		const signatureInfo: proto.SignatureInformation = {
			label: 'label'
		};

		let result = await p2c.asSignatureInformation(signatureInfo);
		strictEqual(result.label, signatureInfo.label);
		strictEqual(result.documentation, undefined);
		deepEqual(result.parameters, []);

		signatureInfo.documentation = 'documentation';
		signatureInfo.parameters = [{ label: 'label' }];
		signatureInfo.activeParameter = 1;
		result = await p2c.asSignatureInformation(signatureInfo);
		strictEqual(result.label, signatureInfo.label);
		strictEqual(result.documentation, signatureInfo.documentation);
		strictEqual(result.activeParameter, signatureInfo.activeParameter);
		ok(result.parameters.every(value => value instanceof vscode.ParameterInformation));

		// VS Code uses -1 where LSP uses `null`.
		signatureInfo.activeParameter = null;
		result = await p2c.asSignatureInformation(signatureInfo);
		strictEqual(result.activeParameter, -1);

		ok((await p2c.asSignatureInformations([signatureInfo])).every(value => value instanceof vscode.SignatureInformation));
	});

	test('Signature Help', async () => {
		const signatureHelp: proto.SignatureHelp = {
			signatures: [
				{ label: 'label' }
			],
			activeSignature: undefined,
			activeParameter: undefined
		};

		let result = await p2c.asSignatureHelp(signatureHelp);
		ok(result.signatures.every(value => value instanceof vscode.SignatureInformation));
		strictEqual(result.activeSignature, 0);
		strictEqual(result.activeParameter, 0);

		// VS Code uses -1 where LSP uses `null`.
		signatureHelp.activeParameter = null;
		result = await p2c.asSignatureHelp(signatureHelp);
		strictEqual(result.activeParameter, -1);

		signatureHelp.activeSignature = 1;
		signatureHelp.activeParameter = 2;
		result = await p2c.asSignatureHelp(signatureHelp);
		ok(result.signatures.every(value => value instanceof vscode.SignatureInformation));
		strictEqual(result.activeSignature, 1);
		strictEqual(result.activeParameter, 2);

		strictEqual(await p2c.asSignatureHelp(undefined), undefined);
		strictEqual(await p2c.asSignatureHelp(null), undefined);
	});

	test('Location', async () => {
		strictEqual(p2c.asLocation(undefined), undefined);
		strictEqual(p2c.asLocation(null), undefined);

		const start: proto.Position = { line: 1, character: 2 };
		const end: proto.Position = { line: 8, character: 9 };
		const location: proto.Location = {
			uri: 'file://localhost/folder/file',
			range: { start, end }
		};

		const result = p2c.asLocation(location);
		ok(result.uri instanceof vscode.Uri);
		ok(result.range instanceof vscode.Range);

		ok((await p2c.asReferences([location])).every(value => value instanceof vscode.Location));
	});

	test('Definition', async () => {
		const start: proto.Position = { line: 1, character: 2 };
		const end: proto.Position = { line: 8, character: 9 };
		const location: proto.Location = {
			uri: 'file://localhost/folder/file',
			range: { start, end }
		};

		const single = <vscode.Location> await p2c.asDefinitionResult(location);
		ok(single.uri instanceof vscode.Uri);
		ok(single.range instanceof vscode.Range);

		const array = <vscode.Location[]> await p2c.asDefinitionResult([location]);
		ok(array.every(value => value instanceof vscode.Location));

		strictEqual(await p2c.asDefinitionResult(undefined), undefined);
		strictEqual(await p2c.asDefinitionResult(null), undefined);
		deepEqual(await p2c.asDefinitionResult([]), []);
	});

	test('Document Highlight Kind', () => {
		strictEqual(p2c.asDocumentHighlightKind(<any>proto.DocumentHighlightKind.Text), vscode.DocumentHighlightKind.Text);
		strictEqual(p2c.asDocumentHighlightKind(<any>proto.DocumentHighlightKind.Read), vscode.DocumentHighlightKind.Read);
		strictEqual(p2c.asDocumentHighlightKind(<any>proto.DocumentHighlightKind.Write), vscode.DocumentHighlightKind.Write);
	});

	test('Document Highlight', async () => {
		const start: proto.Position = { line: 1, character: 2 };
		const end: proto.Position = { line: 8, character: 9 };
		const documentHighlight = proto.DocumentHighlight.create(
			{ start, end }
		);

		let result = p2c.asDocumentHighlight(documentHighlight);
		ok(result.range instanceof vscode.Range);
		strictEqual(result.kind, vscode.DocumentHighlightKind.Text);

		documentHighlight.kind = proto.DocumentHighlightKind.Write;
		result = p2c.asDocumentHighlight(documentHighlight);
		ok(result.range instanceof vscode.Range);
		strictEqual(result.kind, vscode.DocumentHighlightKind.Write);

		ok((await p2c.asDocumentHighlights([documentHighlight])).every(value => value instanceof vscode.DocumentHighlight));
		strictEqual(await p2c.asDocumentHighlights(undefined), undefined);
		strictEqual(await p2c.asDocumentHighlights(null), undefined);
		deepEqual(await p2c.asDocumentHighlights([]), []);
	});

	test('Document Links', async () => {
		const location = 'file:///foo/bar';
		const tooltip = 'tooltip';
		const start: proto.Position = { line: 1, character: 2 };
		const end: proto.Position = { line: 8, character: 9 };
		const documentLink = proto.DocumentLink.create(
			{ start, end }, location
		);
		documentLink.tooltip = tooltip;

		const result = p2c.asDocumentLink(documentLink);
		ok(result.range instanceof vscode.Range);
		strictEqual(result.target!.toString(), location);
		strictEqual(result.tooltip, tooltip);

		ok((await p2c.asDocumentLinks([documentLink])).every(value => value instanceof vscode.DocumentLink));
		strictEqual(await p2c.asDocumentLinks(undefined), undefined);
		strictEqual(await p2c.asDocumentLinks(null), undefined);
		deepEqual(await p2c.asDocumentLinks([]), []);
	});

	test('SymbolInformation', async () => {
		const start: proto.Position = { line: 1, character: 2 };
		const end: proto.Position = { line: 8, character: 9 };
		const location: proto.Location = {
			uri: 'file://localhost/folder/file',
			range: { start, end }
		};
		const symbolInformation: proto.SymbolInformation = {
			name: 'name',
			kind: proto.SymbolKind.Array,
			tags: [proto.SymbolTag.Deprecated],
			location: location
		};

		let result = p2c.asSymbolInformation(symbolInformation);
		strictEqual(result.name, symbolInformation.name);
		strictEqual(result.kind, vscode.SymbolKind.Array);
		strictEqual(result.containerName, '');
		assertDefined(result.tags);
		strictEqual(result.tags.length, 1);
		strictEqual(result.tags[0], vscode.SymbolTag.Deprecated);
		ok(result.location instanceof vscode.Location);

		symbolInformation.containerName = 'container';
		result = p2c.asSymbolInformation(symbolInformation);
		strictEqual(result.containerName, symbolInformation.containerName);

		ok((await p2c.asSymbolInformations([symbolInformation])).every(value => value instanceof vscode.SymbolInformation));
		strictEqual(await p2c.asSymbolInformations(undefined), undefined);
		strictEqual(await p2c.asSymbolInformations(null), undefined);
		deepEqual(await p2c.asSymbolInformations([]), []);
	});

	test('WorkspaceSymbol', () => {
		const workspaceSymbol: proto.WorkspaceSymbol = {
			name: 'name',
			kind: proto.SymbolKind.Array,
			location: { uri: 'file://localhost/folder/file' },
			data: 'data'
		};

		const result = p2c.asSymbolInformation(workspaceSymbol);
		strictEqual(result.name, workspaceSymbol.name);
		strictEqual(result.kind, vscode.SymbolKind.Array);
		ok(result.location instanceof vscode.Location);
		rangeEqual(result.location.range, new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0)));

		const back = c2p.asWorkspaceSymbol(result);
		strictEqual(back.data, 'data');
		strictEqual(back.location.uri, workspaceSymbol.location.uri);
		strictEqual((back.location as { range?: proto.Range }).range, undefined);
	});

	test('SymbolInformation Tag outside', () => {
		const start: proto.Position = { line: 1, character: 2 };
		const end: proto.Position = { line: 8, character: 9 };
		const location: proto.Location = {
			uri: 'file://localhost/folder/file',
			range: { start, end }
		};
		const symbolInformation: proto.SymbolInformation = {
			name: 'name',
			kind: proto.SymbolKind.Array,
			tags: [Number.MAX_VALUE as proto.SymbolTag],
			location: location
		};
		const result = p2c.asSymbolInformation(symbolInformation);
		strictEqual(result.tags, undefined);
	});

	test('SymbolInformation deprecated', () => {
		const start: proto.Position = { line: 1, character: 2 };
		const end: proto.Position = { line: 8, character: 9 };
		const location: proto.Location = {
			uri: 'file://localhost/folder/file',
			range: { start, end }
		};
		const symbolInformation: proto.SymbolInformation = {
			name: 'name',
			kind: proto.SymbolKind.Array,
			location: location,
			deprecated: true
		};
		const result = p2c.asSymbolInformation(symbolInformation);
		assertDefined(result.tags);
		strictEqual(result.tags.length, 1);
		strictEqual(result.tags[0], vscode.SymbolTag.Deprecated);
	});

	test('SymbolInformation Kind outside', () => {
		const start: proto.Position = { line: 1, character: 2 };
		const end: proto.Position = { line: 8, character: 9 };
		const location: proto.Location = {
			uri: 'file://localhost/folder/file',
			range: { start, end }
		};
		const symbolInformation: proto.SymbolInformation = {
			name: 'name',
			kind: Number.MAX_VALUE as any,
			location: location
		};
		const result = p2c.asSymbolInformation(symbolInformation);
		strictEqual(result.kind, vscode.SymbolKind.Property);
	});

	test('DocumentSymbol', () => {
		const start: proto.Position = { line: 1, character: 2 };
		const end: proto.Position = { line: 8, character: 9 };
		const documentSymbol: proto.DocumentSymbol = {
			name: 'name',
			kind: proto.SymbolKind.Array,
			tags: [proto.SymbolTag.Deprecated],
			range: { start, end },
			selectionRange: { start, end }
		};
		ok(proto.DocumentSymbol.is(documentSymbol));
		const result = p2c.asDocumentSymbol(documentSymbol);
		strictEqual(result.name, documentSymbol.name);
		strictEqual(result.kind, vscode.SymbolKind.Array);
		strictEqual(result.children.length, 0);
		assertDefined(result.tags);
		strictEqual(result.tags.length, 1);
		strictEqual(result.tags[0], vscode.SymbolTag.Deprecated);
		rangeEqual(result.range, documentSymbol.range);
		rangeEqual(result.selectionRange, documentSymbol.selectionRange);
	});

	test('Command', async () => {
		const command = proto.Command.create('title', 'commandId');
		command.arguments = ['args'];

		const result = p2c.asCommand(command);
		strictEqual(result.title, command.title);
		strictEqual(result.command, command.command);
		strictEqual(result.arguments, command.arguments);

		ok((await p2c.asCommands([command])).every(elem => !!elem.title && !!elem.command));
		strictEqual(await p2c.asCommands(undefined), undefined);
		strictEqual(await p2c.asCommands(null), undefined);
		deepEqual(await p2c.asCommands([]), []);
	});

	test('Code Lens', async () => {
		const codeLens: proto.CodeLens = proto.CodeLens.create(proto.Range.create(1, 2, 8, 9), 'data');

		let result = p2c.asCodeLens(codeLens);
		rangeEqual(result.range, codeLens.range);

		codeLens.command = proto.Command.create('title', 'commandId');
		result = p2c.asCodeLens(codeLens);
		strictEqual(result.command!.title, codeLens.command.title);
		strictEqual(result.command!.command, codeLens.command.command);

		ok((await p2c.asCodeLenses([codeLens])).every(elem => elem instanceof vscode.CodeLens));
		strictEqual(await p2c.asCodeLenses(undefined), undefined);
		strictEqual(await p2c.asCodeLenses(null), undefined);
		deepEqual(await p2c.asCodeLenses([]), []);
	});

	test('Code Lens Preserve Data', () => {
		const codeLens: proto.CodeLens = proto.CodeLens.create(proto.Range.create(1, 2, 8, 9), 'data');
		const result = c2p.asCodeLens(p2c.asCodeLens(codeLens));
		strictEqual(result.data, codeLens.data);
	});

	test('WorkspaceEdit', async () => {
		const workspaceChange = new proto.WorkspaceChange();
		const uri1 = 'file:///abc.txt';
		const change1 = workspaceChange.getTextEditChange({ uri: uri1, version: 1 });
		change1.insert(proto.Position.create(0, 1), 'insert');
		const uri2 = 'file:///xyz.txt';
		const change2 = workspaceChange.getTextEditChange({ uri: uri2, version: 99 });
		change2.replace(proto.Range.create(0, 1, 2, 3), 'replace');

		const result = await p2c.asWorkspaceEdit(workspaceChange.edit);
		let edits = result.get(vscode.Uri.parse(uri1));
		strictEqual(edits.length, 1);
		rangeEqual(edits[0].range, proto.Range.create(0, 1, 0, 1));
		strictEqual(edits[0].newText, 'insert');

		edits = result.get(vscode.Uri.parse(uri2));
		strictEqual(edits.length, 1);
		rangeEqual(edits[0].range, proto.Range.create(0, 1, 2, 3));
		strictEqual(edits[0].newText, 'replace');

		strictEqual(await p2c.asWorkspaceEdit(undefined), undefined);
		strictEqual(await p2c.asWorkspaceEdit(null), undefined);
	});

	test('Uri Rewrite', () => {
		const converter = protocolConverter.createConverter((value: string) => {
			return vscode.Uri.parse(`${value}.vscode`);
		}, false, false);

		const result = converter.asUri('file://localhost/folder/file');
		strictEqual('file://localhost/folder/file.vscode', result.toString());
	});

	test('InlineValues', async () => {
		const items: proto.InlineValue[] = [
			proto.InlineValueText.create(proto.Range.create(1, 2, 8, 9), 'literalString'),
			proto.InlineValueVariableLookup.create(proto.Range.create(1, 2, 8, 9), 'varName', false),
			proto.InlineValueVariableLookup.create(proto.Range.create(1, 2, 8, 9), undefined, true),
			proto.InlineValueEvaluatableExpression.create(proto.Range.create(1, 2, 8, 9), 'expression'),
			proto.InlineValueEvaluatableExpression.create(proto.Range.create(1, 2, 8, 9), undefined),
		];

		const result = await p2c.asInlineValues(items);
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

	test('InlayHint', async () => {
		const one: proto.InlayHint = proto.InlayHint.create(proto.Position.create(1,1), 'one', proto.InlayHintKind.Parameter);
		one.data = '1';
		const two: proto.InlayHint = proto.InlayHint.create(proto.Position.create(2,2), 'two', proto.InlayHintKind.Type);
		two.data = '2';
		const items = [one, two];

		const result = await p2c.asInlayHints(items);
		ok(result.every(hint => hint instanceof ProtocolInlayHint));
		for (var i = 0; i < result.length; i++) {
			positionEqual(result[i].position, items[i].position);
		}
		strictEqual((result[0] as ProtocolInlayHint).data, '1');
		strictEqual((result[1] as ProtocolInlayHint).data, '2');
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
		const position = new vscode.Position(1, 2);
		const result = c2p.asPosition(position);
		positionEqual(result, position);
	});

	test('Range', () => {
		const range = new vscode.Range(new vscode.Position(1, 2), new vscode.Position(8, 9));
		const result = c2p.asRange(range);
		rangeEqual(result, range);
	});

	test('Text Edit Insert', () => {
		const insert = vscode.TextEdit.insert(new vscode.Position(1, 2), 'insert');
		const result = c2p.asTextEdit(insert);
		rangeEqual(result.range, insert.range);
		strictEqual(result.newText, insert.newText);
	});

	test('Text Edit Replace', () => {
		const replace = vscode.TextEdit.replace(new vscode.Range(new vscode.Position(1, 2), new vscode.Position(8, 9)), 'insert');
		const result = c2p.asTextEdit(replace);
		rangeEqual(result.range, replace.range);
		strictEqual(result.newText, replace.newText);
	});

	test('Text Edit Delete', () => {
		const del = vscode.TextEdit.delete(new vscode.Range(new vscode.Position(1, 2), new vscode.Position(8, 9)));
		const result = c2p.asTextEdit(del);
		rangeEqual(result.range, del.range);
		strictEqual(result.newText, del.newText);
	});

	test('Completion Item', () => {
		const item: vscode.CompletionItem = new vscode.CompletionItem('label');
		const result = c2p.asCompletionItem(<any>item);
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
		const item: vscode.CompletionItem = new vscode.CompletionItem('label');
		item.detail = 'detail';
		item.documentation = 'documentation';
		item.filterText = 'filter';
		item.insertText = 'insert';
		item.kind = vscode.CompletionItemKind.Interface;
		item.sortText = 'sort';
		const edit = vscode.TextEdit.insert(new vscode.Position(1, 2), 'insert');
		item.additionalTextEdits = [edit];
		item.tags = [vscode.CompletionItemTag.Deprecated];
		item.command = { title: 'title', command: 'commandId' };

		const result = c2p.asCompletionItem(<any>item);
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
		const item: ProtocolCompletionItem = new ProtocolCompletionItem('label');
		item.insertText = 'insert';
		item.fromEdit = false;

		const result = c2p.asCompletionItem(<any>item);
		strictEqual(result.insertText, item.insertText);
	});

	test('Completion Item - TextEdit', () => {
		const item: ProtocolCompletionItem = new ProtocolCompletionItem('label');
		item.textEdit = vscode.TextEdit.insert(new vscode.Position(1, 2), 'insert');
		item.fromEdit = false;

		const result = c2p.asCompletionItem(<any>item);
		strictEqual(result.insertText, item.textEdit.newText);
	});

	test('Completion Item - Insert Text and Range', () => {
		const item: ProtocolCompletionItem = new ProtocolCompletionItem('label');
		item.insertText = 'insert';
		item.range = new vscode.Range(1, 2, 1, 2);
		item.fromEdit = true;

		const result = c2p.asCompletionItem(<any>item);
		strictEqual(result.insertText, undefined);
		assertTextEdit(result.textEdit);
		rangeEqual(result.textEdit.range, item.range);
		strictEqual(result.textEdit.newText, item.insertText);
	});

	test('Completion Item - TextEdit from Edit', () => {
		const item: ProtocolCompletionItem = new ProtocolCompletionItem('label');
		item.textEdit = vscode.TextEdit.insert(new vscode.Position(1, 2), 'insert');
		item.fromEdit = true;

		const result = c2p.asCompletionItem(<any>item);
		strictEqual(result.insertText, undefined);
		assertTextEdit(result.textEdit);
		rangeEqual(result.textEdit.range, item.textEdit.range);
		strictEqual(result.textEdit.newText, item.textEdit.newText);
	});

	test('Completion Item - Keep whitespace', () => {
		const item: ProtocolCompletionItem = new ProtocolCompletionItem('label');
		item.textEdit = vscode.TextEdit.insert(new vscode.Position(1, 2), 'insert');
		item.fromEdit = true;
		item.keepWhitespace = true;

		const result = c2p.asCompletionItem(<any>item);
		strictEqual(result.insertText, undefined);
		assertTextEdit(result.textEdit);
		rangeEqual(result.textEdit.range, item.textEdit.range);
		strictEqual(result.textEdit.newText, item.textEdit.newText);
		strictEqual(result.insertTextMode, proto.InsertTextMode.adjustIndentation);
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

	test('Diagnostic', async () => {
		const item: vscode.Diagnostic = new vscode.Diagnostic(new vscode.Range(1, 2, 8, 9), 'message', vscode.DiagnosticSeverity.Warning);
		item.code = 99;
		item.source = 'source';
		item.tags = [vscode.DiagnosticTag.Unnecessary];
		item.relatedInformation = [
			new vscode.DiagnosticRelatedInformation(new vscode.Location(vscode.Uri.parse('file://localhost/folder/file'), new vscode.Range(0, 1, 2, 3)), 'related')
		];

		const result = c2p.asDiagnostic(item);
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
		ok((await c2p.asDiagnostics([item])).every(elem => proto.Diagnostic.is(elem)));
	});

	test('Diagnostic - Complex Code', () => {
		const item: vscode.Diagnostic = new vscode.Diagnostic(new vscode.Range(1, 2, 8, 9), 'message', vscode.DiagnosticSeverity.Warning);
		item.code = { value: 99, target: vscode.Uri.parse('https://code.visualstudio.com/') };

		const result = c2p.asDiagnostic(<any>item);

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

	test('CodeActionContext', async () => {
		const item: vscode.CodeActionContext = {
			diagnostics: [new vscode.Diagnostic(new vscode.Range(1, 2, 8, 9), 'message', vscode.DiagnosticSeverity.Warning)],
			triggerKind: vscode.CodeActionTriggerKind.Invoke,
			only: undefined
		};

		const result = await c2p.asCodeActionContext(item);
		ok(result.diagnostics.every(elem => proto.Diagnostic.is(elem)));
		strictEqual(result.triggerKind, proto.CodeActionTriggerKind.Invoked);
	});

	test('CodeActionContext - automatic', async () => {
		const item: vscode.CodeActionContext = {
			diagnostics: [],
			triggerKind: vscode.CodeActionTriggerKind.Automatic,
			only: undefined
		};

		const result = await c2p.asCodeActionContext(item);
		strictEqual(result.triggerKind, proto.CodeActionTriggerKind.Automatic);
	});

	test('Uri Rewrite', () => {
		const converter = codeConverter.createConverter((value: vscode.Uri) => {
			return `${value.toString()}.vscode`;
		});

		const result = converter.asUri(vscode.Uri.parse('file://localhost/folder/file'));
		strictEqual('file://localhost/folder/file.vscode', result);
	});

	test('InlineValueContext', () => {
		const item: vscode.InlineValueContext = {
			frameId: 101,
			stoppedLocation: new vscode.Range(1, 2, 8, 9),
		};

		const result = c2p.asInlineValueContext(<any>item);

		strictEqual(result.frameId, 101);
		strictEqual(result.stoppedLocation.start.line, 1);
		strictEqual(result.stoppedLocation.start.character, 2);
		strictEqual(result.stoppedLocation.end.line, 8);
		strictEqual(result.stoppedLocation.end.character, 9);
	});

	test('InlayHint', () => {
		const item: ProtocolInlayHint = new ProtocolInlayHint(new vscode.Position(1, 1), 'label', vscode.InlayHintKind.Type);
		item.data = '1';

		const result = c2p.asInlayHint(item);

		positionEqual(result.position, item.position);
		strictEqual(result.label, 'label');
		strictEqual(result.kind, proto.InlayHintKind.Type);
		strictEqual(result.data, '1');
	});
});
