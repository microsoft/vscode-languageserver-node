/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { CancellationToken, CancellationTokenSource } from '../api';

suite('CancellationTokenSource', () => {
	test('cancelling before reading the token is idempotent', () => {
		const source = new CancellationTokenSource();
		source.cancel();
		source.cancel();
		assert.strictEqual(source.token, CancellationToken.Cancelled);
		assert.strictEqual(source.token.isCancellationRequested, true);
		source.dispose();
	});

	test('cancelling after disposal preserves the empty token', () => {
		const source = new CancellationTokenSource();
		source.dispose();
		source.cancel();
		source.cancel();
		assert.strictEqual(source.token, CancellationToken.None);
		assert.strictEqual(source.token.isCancellationRequested, false);
	});

	test('cancelling a materialized token only notifies listeners once', () => {
		const source = new CancellationTokenSource();
		const token = source.token;
		let notifications = 0;
		const listener = token.onCancellationRequested(() => notifications++);
		source.cancel();
		source.cancel();
		assert.strictEqual(source.token, token);
		assert.strictEqual(token.isCancellationRequested, true);
		assert.strictEqual(notifications, 1);
		listener.dispose();
		source.dispose();
	});

	test('cancelling a disposed materialized token does not notify listeners', () => {
		const source = new CancellationTokenSource();
		const token = source.token;
		let notifications = 0;
		const listener = token.onCancellationRequested(() => notifications++);
		source.dispose();
		source.cancel();
		source.cancel();
		assert.strictEqual(source.token, token);
		assert.strictEqual(token.isCancellationRequested, true);
		assert.strictEqual(notifications, 0);
		listener.dispose();
	});
});
