/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { deepStrictEqual } from 'assert';
import { convert2RegExp } from 'vscode-languageclient/lib/common/utils/patternParser';

suite('Pattern Parser Tests', () => {
	// TODO(dantup): Windows
	const samplePaths = [
		'file1',
		'file2.txt',
		'file3.js',
		'folder1/',
		'folder1/file1',
		'folder1/file2.txt',
		'folder1/file3.js',
		'folder1/folder1/',
		'folder1/folder1/file1',
		'folder1/folder1/file2.txt',
		'folder1/folder1/file3.js',
	];

	function testPattern(pattern: string, input: string[], expected: string[]) {
		const regex = convert2RegExp(pattern)!;
		const matches = input.filter((path) => regex.test(path));
		deepStrictEqual(matches, expected);
	}

	test('**{/,} matches everything', () => {
		testPattern('**{/,}', samplePaths, samplePaths);
	});

	test('*/ matches top level folders', () => {
		testPattern('*/', samplePaths, [
			'folder1/',
		]);
	});

	test('**/ matches all folders', () => {
		testPattern('**/', samplePaths, [
			'folder1/',
			'folder1/folder1/',
		]);
	});

	test('* matches top level files', () => {
		testPattern('*', samplePaths, [
			'file1',
			'file2.txt',
			'file3.js',
		]);
	});

	test('{**/,}* matches all files', () => {
		testPattern('{**/,}*', samplePaths, [
			'file1',
			'file2.txt',
			'file3.js',
			'folder1/file1',
			'folder1/file2.txt',
			'folder1/file3.js',
			'folder1/folder1/file1',
			'folder1/folder1/file2.txt',
			'folder1/folder1/file3.js',
		]);
	});

	test('**/* matches nesteed files', () => {
		testPattern('**/*', samplePaths, [
			'folder1/file1',
			'folder1/file2.txt',
			'folder1/file3.js',
			'folder1/folder1/file1',
			'folder1/folder1/file2.txt',
			'folder1/folder1/file3.js',
		]);
	});

	test('*.js matches top level js files', () => {
		testPattern('*.js', samplePaths, [
			'file3.js',
		]);
	});

	test('{**/,}*.js matches all js files', () => {
		testPattern('{**/,}*.js', samplePaths, [
			'file3.js',
			'folder1/file3.js',
			'folder1/folder1/file3.js',
		]);
	});
});
