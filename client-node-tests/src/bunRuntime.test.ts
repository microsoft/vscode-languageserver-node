/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { deepStrictEqual, rejects, strictEqual } from 'assert';
import * as cp from 'child_process';
import { isBunRuntime, buildRuntimeArgs, LanguageClient, TransportKind } from 'vscode-languageclient/node';

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

	test('Bun runtime with IPC transport is rejected client-side without spawning a child', async () => {
		const client = new LanguageClient('bun-ipc-rejection', 'Bun IPC Rejection', {
			module: '/nonexistent/server.js',
			runtime: 'bun',
			transport: TransportKind.ipc,
		}, {});
		// Intercept child_process.spawn (same module singleton the client uses)
		// to prove the early rejection happens before any child process starts.
		const childProcess = cp as unknown as { spawn: (...args: unknown[]) => unknown };
		const originalSpawn = childProcess.spawn;
		let spawnCalls = 0;
		childProcess.spawn = function (this: unknown, ...args: unknown[]) {
			spawnCalls++;
			return (originalSpawn as (...a: unknown[]) => unknown).apply(childProcess, args);
		};
		try {
			await rejects(
				client.start(),
				/does not support the IPC transport \(--node-ipc\)/,
				'start() must reject with the Bun IPC error',
			);
		} finally {
			childProcess.spawn = originalSpawn;
			await client.stop().catch(() => undefined);
		}
		strictEqual(spawnCalls, 0, 'no child process may be spawned for Bun + IPC');
	});
});
