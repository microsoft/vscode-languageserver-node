/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { ResponseError } from '../messages';

suite('ResponseError', () => {
	test('preserves a directly derived error prototype', () => {
		class CustomError extends ResponseError<string> { }
		const error = new CustomError(-32001, 'Failed', 'details');
		assert.strictEqual(Object.getPrototypeOf(error), CustomError.prototype);
		assert.ok(error instanceof CustomError);
		assert.ok(error instanceof ResponseError);
		assert.ok(error instanceof Error);
	});

	test('preserves methods defined by a subclass', () => {
		class CustomError extends ResponseError<string> {
			public describe(): string {
				return `${this.message}: ${this.data}`;
			}
		}
		const error = new CustomError(-32001, 'Failed', 'details');
		assert.strictEqual(error.describe(), 'Failed: details');
	});

	test('preserves multiple levels of inheritance', () => {
		class CustomError extends ResponseError<string> { }
		class MoreSpecificError extends CustomError { }
		const error = new MoreSpecificError(-32001, 'Failed', 'details');
		assert.strictEqual(Object.getPrototypeOf(error), MoreSpecificError.prototype);
		assert.ok(error instanceof MoreSpecificError);
		assert.ok(error instanceof CustomError);
		assert.ok(error instanceof ResponseError);
		assert.ok(error instanceof Error);
	});
});
