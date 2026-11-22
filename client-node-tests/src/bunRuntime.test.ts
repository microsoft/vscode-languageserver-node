/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { deepStrictEqual, strictEqual } from 'assert';
import { isBunRuntime, buildRuntimeArgs } from 'vscode-languageclient/node';

suite('Bun runtime support (issue #1321)', () => {

	test('isBunRuntime detects bun binaries', () => {
		strictEqual(isBunRuntime('bun'), true);
		strictEqual(isBunRuntime('bun.exe'), true);
		strictEqual(isBunRuntime('/usr/local/bin/bun'), true);
		strictEqual(isBunRuntime('/opt/homebrew/bin/bun'), true);
		strictEqual(isBunRuntime('BUN'), true);
	});

	test('isBunRuntime rejects non-bun runtimes', () => {
		// bunx is Bun's package-binary runner, not a runtime: `bunx run <module>`
		// would execute a package binary named "run" instead of the server module.
		strictEqual(isBunRuntime('bunx'), false);
		strictEqual(isBunRuntime('/usr/local/bin/bunx'), false);
		strictEqual(isBunRuntime('bunx.exe'), false);
		strictEqual(isBunRuntime('bunker'), false);
		strictEqual(isBunRuntime('node'), false);
		strictEqual(isBunRuntime('/usr/bin/node'), false);
		strictEqual(isBunRuntime('node.exe'), false);
		strictEqual(isBunRuntime('/usr/local/bin/nodejs'), false);
		strictEqual(isBunRuntime('deno'), false);
	});

	test('buildRuntimeArgs keeps the node argument vector unchanged', () => {
		const args = buildRuntimeArgs('/usr/bin/node', {
			module: '/servers/server.js',
			args: ['--verbose'],
			options: { execArgv: ['--inspect=9229'] }
		}, ['--stdio'], 4242);
		deepStrictEqual(args, ['--inspect=9229', '/servers/server.js', '--verbose', '--stdio', '--clientProcessId=4242']);
	});

	test('buildRuntimeArgs uses `bun run` and forwards args to the script', () => {
		const args = buildRuntimeArgs('bun', {
			module: '/servers/server.js',
			args: ['--verbose'],
			options: { execArgv: ['--inspect=9229'] } // no node-style exec flags under bun
		}, ['--pipe=/tmp/lsp-pipe'], 7);
		deepStrictEqual(args, ['run', '/servers/server.js', '--verbose', '--pipe=/tmp/lsp-pipe', '--clientProcessId=7']);
	});

	test('buildRuntimeArgs works without args or options', () => {
		deepStrictEqual(
			buildRuntimeArgs('bun', { module: 'server.js' }, ['--stdio'], 1),
			['run', 'server.js', '--stdio', '--clientProcessId=1']);
		deepStrictEqual(
			buildRuntimeArgs('node', { module: 'server.js' }, ['--stdio'], 1),
			['server.js', '--stdio', '--clientProcessId=1']);
	});
});
