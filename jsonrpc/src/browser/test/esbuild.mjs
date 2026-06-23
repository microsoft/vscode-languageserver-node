/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// @ts-check

import * as path from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// jsonrpc/src/browser/test -> jsonrpc
const packageRoot = path.resolve(__dirname, '..', '..', '..');
const libTest = path.join(packageRoot, 'lib', 'browser', 'test');
const outDir = path.join(packageRoot, 'dist');

// The browser code is polyfill-free: the RAL/RIL split keeps the browser bundle on
// web APIs only (Uint8Array, TextEncoder/Decoder, ...). The single Node touch point
// is the tests' `import 'assert'`, which resolves to the `assert` npm package; that
// package reads `process.env.NODE_DEBUG` at load, so we define it away. No Node
// polyfill plugin is required.
/** @type {import('esbuild').BuildOptions} */
const shared = {
	bundle: true,
	format: 'iife',
	platform: 'browser',
	target: 'es2020',
	sourcemap: true,
	logLevel: 'warning',
	define: { 'process.env.NODE_DEBUG': '""' },
};

await Promise.all([
	esbuild.build({ ...shared, entryPoints: [path.join(libTest, 'test.js')], outfile: path.join(outDir, 'tests.js') }),
	esbuild.build({ ...shared, entryPoints: [path.join(libTest, 'worker.js')], outfile: path.join(outDir, 'worker.js') }),
	esbuild.build({ ...shared, entryPoints: [path.join(libTest, 'cancelWorker.js')], outfile: path.join(outDir, 'cancelWorker.js') }),
]);
