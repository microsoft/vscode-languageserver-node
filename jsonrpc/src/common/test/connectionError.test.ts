/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { ConnectionError, ConnectionErrors } from '../connection';

suite('ConnectionError', () => {
	test('preserves a directly derived error prototype', () => {
		class CustomError extends ConnectionError { }
		const error = new CustomError(ConnectionErrors.Closed, 'Closed');
		assert.strictEqual(Object.getPrototypeOf(error), CustomError.prototype);
		assert.ok(error instanceof CustomError);
		assert.ok(error instanceof ConnectionError);
		assert.ok(error instanceof Error);
	});

	test('preserves methods defined by a subclass', () => {
		class CustomError extends ConnectionError {
			public describe(): string {
				return `${this.message}: ${this.code}`;
			}
		}
		const error = new CustomError(ConnectionErrors.Closed, 'Closed');
		assert.strictEqual(error.describe(), `Closed: ${ConnectionErrors.Closed}`);
	});

	test('preserves multiple levels of inheritance', () => {
		class CustomError extends ConnectionError { }
		class MoreSpecificError extends CustomError { }
		const error = new MoreSpecificError(ConnectionErrors.Closed, 'Closed');
		assert.strictEqual(Object.getPrototypeOf(error), MoreSpecificError.prototype);
		assert.ok(error instanceof MoreSpecificError);
		assert.ok(error instanceof CustomError);
		assert.ok(error instanceof ConnectionError);
		assert.ok(error instanceof Error);
	});
});
