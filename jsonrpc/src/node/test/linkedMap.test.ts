/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { LinkedMap, Touch, LRUCache } from '../../common/linkedMap';
import * as assert from 'assert';

suite('Linked Map', () => {
	test('Simple', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('bk', 'bv');
		assert.deepStrictEqual([...map.keys()], ['ak', 'bk']);
		assert.deepStrictEqual([...map.values()], ['av', 'bv']);
	});

	test('Touch First one', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('ak', 'av', Touch.First);
		assert.deepStrictEqual([...map.keys()], ['ak']);
		assert.deepStrictEqual([...map.values()], ['av']);
	});

	test('Touch Last one', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('ak', 'av', Touch.Last);
		assert.deepStrictEqual([...map.keys()], ['ak']);
		assert.deepStrictEqual([...map.values()], ['av']);
	});

	test('Touch First two', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('bk', 'bv');
		map.set('bk', 'bv', Touch.First);
		assert.deepStrictEqual([...map.keys()], ['bk', 'ak']);
		assert.deepStrictEqual([...map.values()], ['bv', 'av']);
	});

	test('Touch Last two', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('bk', 'bv');
		map.set('ak', 'av', Touch.Last);
		assert.deepStrictEqual([...map.keys()], ['bk', 'ak']);
		assert.deepStrictEqual([...map.values()], ['bv', 'av']);
	});

	test('Touch Frist from middle', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('bk', 'bv');
		map.set('ck', 'cv');
		map.set('bk', 'bv', Touch.First);
		assert.deepStrictEqual([...map.keys()], ['bk', 'ak', 'ck']);
		assert.deepStrictEqual([...map.values()], ['bv', 'av', 'cv']);
	});

	test('Touch Last from middle', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('bk', 'bv');
		map.set('ck', 'cv');
		map.set('bk', 'bv', Touch.Last);
		assert.deepStrictEqual([...map.keys()], ['ak', 'ck', 'bk']);
		assert.deepStrictEqual([...map.values()], ['av', 'cv', 'bv']);
	});

	test('Iterators', () => {
		const map = new LinkedMap<number, any>();
		map.set(1, 1);
		map.set(2, 2);
		map.set(3, 3);

		for (const elem of map.keys()) {
			assert.ok(elem);
		}

		for (const elem of map.values()) {
			assert.ok(elem);
		}

		for (const elem of map.entries()) {
			assert.ok(elem);
		}

		{
			const keys = map.keys();
			const values = map.values();
			const entries = map.entries();
			map.get(1);
			keys.next();
			values.next();
			entries.next();
		}

		{
			const keys = map.keys();
			const values = map.values();
			const entries = map.entries();
			map.get(1, Touch.AsNew);

			let exceptions: number = 0;
			try {
				keys.next();
			} catch (err) {
				exceptions++;
			}
			try {
				values.next();
			} catch (err) {
				exceptions++;
			}
			try {
				entries.next();
			} catch (err) {
				exceptions++;
			}

			assert.strictEqual(exceptions, 3);
		}
	});

	test('LRU Cache simple', () => {
		const cache = new LRUCache<number, number>(5);

		[1, 2, 3, 4, 5].forEach(value => cache.set(value, value));
		assert.strictEqual(cache.size, 5);
		cache.set(6, 6);
		assert.strictEqual(cache.size, 5);
		assert.deepStrictEqual([...cache.keys()], [2, 3, 4, 5, 6]);
		cache.set(7, 7);
		assert.strictEqual(cache.size, 5);
		assert.deepStrictEqual([...cache.keys()], [3, 4, 5, 6, 7]);
		let values: number[] = [];
		[3, 4, 5, 6, 7].forEach(key => values.push(cache.get(key)!));
		assert.deepStrictEqual(values, [3, 4, 5, 6, 7]);
	});

	test('LRU Cache get', () => {
		const cache = new LRUCache<number, number>(5);

		[1, 2, 3, 4, 5].forEach(value => cache.set(value, value));
		assert.strictEqual(cache.size, 5);
		assert.deepStrictEqual([...cache.keys()], [1, 2, 3, 4, 5]);
		cache.get(3);
		assert.deepStrictEqual([...cache.keys()], [1, 2, 4, 5, 3]);
		cache.peek(4);
		assert.deepStrictEqual([...cache.keys()], [1, 2, 4, 5, 3]);
		let values: number[] = [];
		[1, 2, 3, 4, 5].forEach(key => values.push(cache.get(key)!));
		assert.deepStrictEqual(values, [1, 2, 3, 4, 5]);
	});

	test('LRU Cache limit', () => {
		const cache = new LRUCache<number, number>(10);

		for (let i = 1; i <= 10; i++) {
			cache.set(i, i);
		}
		assert.strictEqual(cache.size, 10);
		cache.limit = 5;
		assert.strictEqual(cache.size, 5);
		assert.deepStrictEqual([...cache.keys()], [6, 7, 8, 9, 10]);
		cache.limit = 20;
		assert.strictEqual(cache.size, 5);
		for (let i = 11; i <= 20; i++) {
			cache.set(i, i);
		}
		assert.deepEqual(cache.size, 15);
		let values: number[] = [];
		for (let i = 6; i <= 20; i++) {
			values.push(cache.get(i)!);
			assert.strictEqual(cache.get(i), i);
		}
		assert.deepStrictEqual([...cache.values()], values);
	});

	test('LRU Cache limit with ratio', () => {
		const cache = new LRUCache<number, number>(10, 0.5);

		for (let i = 1; i <= 10; i++) {
			cache.set(i, i);
		}
		assert.strictEqual(cache.size, 10);
		cache.set(11, 11);
		assert.strictEqual(cache.size, 5);
		assert.deepStrictEqual([...cache.keys()], [7, 8, 9, 10, 11]);
		let values: number[] = [];
		[...cache.keys()].forEach(key => values.push(cache.get(key)!));
		assert.deepStrictEqual(values, [7, 8, 9, 10, 11]);
		assert.deepStrictEqual([...cache.values()], values);
	});

	test('toJSON / fromJSON', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('bk', 'bv');
		map.set('ck', 'cv');

		const json = map.toJSON();
		map = new LinkedMap<string, string>();
		map.fromJSON(json);

		let i = 0;
		map.forEach((value, key) => {
			if (i === 0) {
				assert.equal(key, 'ak');
				assert.equal(value, 'av');
			} else if (i === 1) {
				assert.equal(key, 'bk');
				assert.equal(value, 'bv');
			} else if (i === 2) {
				assert.equal(key, 'ck');
				assert.equal(value, 'cv');
			}
			i++;
		});
	});

	test('delete Head and Tail', function () {
		const map = new LinkedMap<string, number>();

		assert.equal(map.size, 0);

		map.set('1', 1);
		assert.equal(map.size, 1);
		map.delete('1');
		assert.equal(map.get('1'), undefined);
		assert.equal(map.size, 0);
		assert.equal([...map.keys()].length, 0);
	});

	test('delete Head', function () {
		const map = new LinkedMap<string, number>();

		assert.equal(map.size, 0);

		map.set('1', 1);
		map.set('2', 2);
		assert.equal(map.size, 2);
		map.delete('1');
		assert.equal(map.get('2'), 2);
		assert.equal(map.size, 1);
		assert.equal([...map.keys()].length, 1);
		assert.equal([...map.keys()][0], 2);
	});

	test('delete Tail', function () {
		const map = new LinkedMap<string, number>();

		assert.equal(map.size, 0);

		map.set('1', 1);
		map.set('2', 2);
		assert.equal(map.size, 2);
		map.delete('2');
		assert.equal(map.get('1'), 1);
		assert.equal(map.size, 1);
		assert.equal([...map.keys()].length, 1);
		assert.equal([...map.keys()][0], 1);
	});
});