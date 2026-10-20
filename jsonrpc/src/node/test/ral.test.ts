/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { RAL } from '../main';

suite('Node runtime crypto', () => {
	test('randomUUID generates distinct canonical v4 UUIDs', () => {
		const values = new Set<string>();
		for (let i = 0; i < 100; i++) {
			const value = RAL().crypto.randomUUID();
			assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
			values.add(value);
		}
		assert.strictEqual(values.size, 100);
	});
});

suite('Node runtime message buffer', () => {
	test('reading part of a Uint8Array respects the requested length', () => {
		const buffer = RAL().messageBuffer.create('utf-8');
		buffer.append(new Uint8Array([1, 2, 3, 4]));
		assert.deepStrictEqual(Array.from(buffer.tryReadBody(2)!), [1, 2]);
		assert.deepStrictEqual(Array.from(buffer.tryReadBody(2)!), [3, 4]);
	});
});
