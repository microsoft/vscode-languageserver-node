/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';

import { SemanticTokensBuilder, SemanticTokensDiff } from '../../common/semanticTokens';

suite('Semantic token tests', () => {
	test('Issue 758', () => {
		const originalSequence: number[] = [
			0, 0, 5, 4, 0,
			0, 6, 4, 5, 0,
			0, 4, 1, 5, 0,
			0, 1, 5, 5, 0,
			1, 0, 1, 8, 0,
			2, 0, 3, 7, 0,
			0, 4, 4, 7, 0,
			1, 0, 11, 4, 0,
			0, 12, 1, 11, 0,
			0, 1, 2, 8, 0,
			1, 0, 1, 8, 0,
			1, 4, 1, 60, 0,
			0, 2, 1, 51, 0,
			1, 0, 1, 8, 0,
			2, 0, 1, 8, 0
		];
		const modifiedSequence: number[] = [
			0, 0, 5, 4, 0,
			0, 6, 4, 5, 0,
			0, 4, 1, 5, 0,
			0, 1, 5, 5, 0,
			1, 0, 1, 8, 0,
			1, 0, 11, 4, 0,
			0, 12, 1, 11, 0,
			0, 1, 2, 8, 0,
			1, 0, 1, 8, 0,
			1, 4, 1, 60, 0,
			0, 2, 1, 51, 0,
			1, 0, 1, 8, 0,
			2, 0, 1, 8, 0
		];
		const edits = (new SemanticTokensDiff(originalSequence, modifiedSequence)).computeDiff();
		assert.deepEqual(edits.length, 1);
		const edit = edits[0];
		assert.deepEqual(edit.start, 25);
		assert.deepEqual(edit.deleteCount, 10);
		assert.ok(edit.data === undefined || edit.data.length === 0);
	});

	test('An unknown previousResultId falls back to a full result', () => {
		const builder = new SemanticTokensBuilder();

		builder.push(0, 0, 5, 1, 0);
		const first = builder.build();

		builder.previousResult(first.resultId!);
		builder.push(0, 0, 5, 2, 0);
		assert.strictEqual(builder.canBuildEdits(), true);
		builder.buildEdits();

		// The client asks to diff against a result this builder never issued, so
		// there is no baseline the edits could be expressed against.
		builder.previousResult('a-result-id-this-builder-never-produced');
		builder.push(0, 0, 5, 3, 0);

		assert.strictEqual(builder.canBuildEdits(), false);
		const result = builder.buildEdits();
		assert.ok('data' in result, 'expected a full result, not edits');
		assert.deepEqual((result as { data: number[] }).data, [0, 0, 5, 3, 0]);
	});
});