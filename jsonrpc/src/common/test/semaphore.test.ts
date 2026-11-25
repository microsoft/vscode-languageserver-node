/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import RAL from '../ral';
import { Semaphore } from '../semaphore';

function deferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	const thenable: PromiseLike<T> = { then: promise.then.bind(promise) };
	return { promise, thenable, resolve, reject };
}

function nextTurn(): Promise<void> {
	return new Promise(resolve => RAL().timer.setImmediate(resolve));
}

suite('Semaphore', () => {
	for (const reject of [false, true]) {
		test(`keeps a slot until a thenable ${reject ? 'rejects' : 'resolves'}`, async () => {
			const semaphore = new Semaphore<number>();
			const result = deferred<number>();
			const started = deferred<void>();
			const error = new Error('thenable rejected');
			let secondStarted = false;
			const first = semaphore.lock(() => {
				started.resolve();
				return result.thenable;
			});
			const firstOutcome = first.then(value => value, reason => {
				assert.strictEqual(reason, error);
				return -1;
			});
			const second = semaphore.lock(() => {
				secondStarted = true;
				return 2;
			});

			await started.promise;
			await nextTurn();
			try {
				assert.strictEqual(semaphore.active, 1);
				assert.strictEqual(secondStarted, false);
			} finally {
				if (reject) {
					result.reject(error);
				} else {
					result.resolve(1);
				}
			}

			assert.deepStrictEqual(await Promise.all([firstOutcome, second]), [reject ? -1 : 1, 2]);
			assert.strictEqual(semaphore.active, 0);
		});
	}

	test('preserves the configured capacity while thenables are pending', async () => {
		const semaphore = new Semaphore<number>(2);
		const result = deferred<number>();
		let running = 0;
		const operations = [1, 2, 3].map(() => semaphore.lock(() => {
			running++;
			return result.thenable;
		}));
		await nextTurn();
		try {
			assert.strictEqual(running, 2);
			assert.strictEqual(semaphore.active, 2);
		} finally {
			result.resolve(1);
		}
		assert.deepStrictEqual(await Promise.all(operations), [1, 1, 1]);
		assert.strictEqual(running, 3);
		assert.strictEqual(semaphore.active, 0);
	});

	test('continues after a synchronous throw', async () => {
		const semaphore = new Semaphore<number>();
		const error = new Error('thunk failed');
		const first = semaphore.lock(() => { throw error; }).catch(reason => {
			assert.strictEqual(reason, error);
			return -1;
		});
		const second = semaphore.lock(() => 2);
		assert.deepStrictEqual(await Promise.all([first, second]), [-1, 2]);
		assert.strictEqual(semaphore.active, 0);
	});

	test('preserves synchronous values and native promises', async () => {
		const semaphore = new Semaphore<number>();
		const results = [semaphore.lock(() => 1), semaphore.lock(() => Promise.resolve(2))];
		assert.deepStrictEqual(await Promise.all(results), [1, 2]);
		assert.strictEqual(semaphore.active, 0);
	});
});
