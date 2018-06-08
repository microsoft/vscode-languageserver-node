/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { LinkedMap, Touch } from '../linkedMap';
import * as assert from 'assert';

describe('Linked Map', () => {
    it('Simple', () => {
        let map = new LinkedMap<string, string>();
        map.set('ak', 'av');
        map.set('bk', 'bv');
        assert.deepStrictEqual(map.keys(), ['ak', 'bk']);
        assert.deepStrictEqual(map.values(), ['av', 'bv']);
    });

    it('Touch First one', () => {
        let map = new LinkedMap<string, string>();
        map.set('ak', 'av');
        map.set('ak', 'av', Touch.First);
        assert.deepStrictEqual(map.keys(), ['ak']);
        assert.deepStrictEqual(map.values(), ['av']);
    });

    it('Touch Last one', () => {
        let map = new LinkedMap<string, string>();
        map.set('ak', 'av');
        map.set('ak', 'av', Touch.Last);
        assert.deepStrictEqual(map.keys(), ['ak']);
        assert.deepStrictEqual(map.values(), ['av']);
    });

    it('Touch First two', () => {
        let map = new LinkedMap<string, string>();
        map.set('ak', 'av');
        map.set('bk', 'bv');
        map.set('bk', 'bv', Touch.First);
        assert.deepStrictEqual(map.keys(), ['bk', 'ak']);
        assert.deepStrictEqual(map.values(), ['bv', 'av']);
    });

    it('Touch Last two', () => {
        let map = new LinkedMap<string, string>();
        map.set('ak', 'av');
        map.set('bk', 'bv');
        map.set('ak', 'av', Touch.Last);
        assert.deepStrictEqual(map.keys(), ['bk', 'ak']);
        assert.deepStrictEqual(map.values(), ['bv', 'av']);
    });

    it('Touch Frist from middle', () => {
        let map = new LinkedMap<string, string>();
        map.set('ak', 'av');
        map.set('bk', 'bv');
        map.set('ck', 'cv');
        map.set('bk', 'bv', Touch.First);
        assert.deepStrictEqual(map.keys(), ['bk', 'ak', 'ck']);
        assert.deepStrictEqual(map.values(), ['bv', 'av', 'cv']);
    });

    it('Touch Last from middle', () => {
        let map = new LinkedMap<string, string>();
        map.set('ak', 'av');
        map.set('bk', 'bv');
        map.set('ck', 'cv');
        map.set('bk', 'bv', Touch.Last);
        assert.deepStrictEqual(map.keys(), ['ak', 'ck', 'bk']);
        assert.deepStrictEqual(map.values(), ['av', 'cv', 'bv']);
    });
});
