/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {parseCliOpts} from '../../common/utils/process';
import assert from 'assert';

suite('parseCliArgs', () => {
	test('should parse key-value pairs with equals sign', () => {
		const args = ['--name=value', '--port=3000'];
		const result = parseCliOpts(args);

		assert.deepStrictEqual(result, {
			name: 'value',
			port: 3000
		});
	});

	test('should parse key-value pairs with space separator', () => {
		const args = ['--name', 'value', '--port', '3000'];
		const result = parseCliOpts(args);

		assert.deepStrictEqual(result, {
			name: 'value',
			port: 3000
		});
	});

	test('should handle flags without values', () => {
		const args = ['--verbose', '--name', 'value', '--debug'];
		const result = parseCliOpts(args);

		assert.deepStrictEqual(result, {
			verbose: undefined,
			name: 'value',
			debug: undefined
		});
	});

	test('should handle mixed format arguments', () => {
		const args = ['--name=john', '--age', '25', '--debug', '--port=8080'];
		const result = parseCliOpts(args);

		assert.deepStrictEqual(result, {
			name: 'john',
			age: 25,
			debug: undefined,
			port: 8080
		});
	});

	test('should handle empty array', () => {
		const args: string[] = [];
		const result = parseCliOpts(args);

		assert.deepStrictEqual(result, {});
	});

	test('converts values to their appropriate primitive', () => {
		let args = ['--string', 'hello', '--num', '12345', '--bool', 'false', '--undefined'];
		let result = parseCliOpts(args);
		assert.deepStrictEqual(result, {
			string: 'hello',
			num: 12345,
			bool: false,
			undefined: undefined
		});

		args = ['--string=hello', '--num=12345', '--bool=true', '--undefined'];
		result = parseCliOpts(args);
		assert.deepStrictEqual(result, {
			string: 'hello',
			num: 12345,
			bool: true,
			undefined: undefined
		});
	});

	test('should ignore non-flag arguments', () => {
		const args = ['node', 'myModule.js', '--name', 'value', 'another'];
		const result = parseCliOpts(args);

		assert.deepStrictEqual(result, {
			name: 'value'
		});
	});

	test('should handle last argument as flag if no value follows', () => {
		const args = ['--name', 'value', '--flag'];
		const result = parseCliOpts(args);

		assert.deepStrictEqual(result, {
			name: 'value',
			flag: undefined
		});
	});
});
