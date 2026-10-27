/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

const assert = require('assert');
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const filename = path.join(root, 'build', 'bin', 'all.js');
const source = fs.readFileSync(filename, 'utf8').replace(/^#![^\r\n]*/, '');

function run(args, results = [], env = {}) {
	const calls = [];
	const errors = [];
	const process = { argv: ['node', filename, ...args], env, exitCode: 0 };
	const execute = vm.compileFunction(source, ['require', 'process', 'console', '__dirname'], { filename });
	execute((id) => {
		if (id === 'child_process') {
			return {
				spawnSync(command, options) {
					calls.push({ command, ...options });
					return { status: 0, signal: null, ...results[calls.length - 1] };
				}
			};
		}
		assert.strictEqual(id, 'path');
		return path;
	}, process, { log() {}, error(error) { errors.push(error); } }, path.dirname(filename));
	return { calls, errors, exitCode: process.exitCode };
}

suite('Package command runner', () => {
	for (const status of [0, 2]) {
		test(`exits the Node process with status ${status}`, () => {
			const result = child_process.spawnSync(process.execPath, ['-e', `
				require('child_process').spawnSync = () => ({ status: ${status}, signal: null });
				process.argv = ['node', ${JSON.stringify(filename)}, 'run', 'test'];
				require(${JSON.stringify(filename)});
			`], { encoding: 'utf8' });
			assert.ifError(result.error);
			assert.strictEqual(result.signal, null);
			assert.strictEqual(result.status, status, result.stderr);
		});
	}

	test('runs tests in the existing package order', () => {
		const result = run(['run', 'test']);
		assert.strictEqual(result.exitCode, 0);
		assert.deepStrictEqual(result.errors, []);
		assert.deepStrictEqual(result.calls.map(call => path.basename(call.cwd)), [
			'textDocument', 'types', 'jsonrpc', 'protocol', 'server', 'client-node-tests'
		]);
		for (const call of result.calls) {
			assert.strictEqual(call.command, 'npm run test');
			assert.strictEqual(call.shell, true);
			assert.strictEqual(call.stdio, 'inherit');
			assert.strictEqual(path.dirname(call.cwd), root);
		}
	});

	for (const args of [['run', 'test'], ['run', 'lint'], ['install'], ['run', 'clean'], ['audit']]) {
		test(`propagates a failed ${args.join(' ')} command and continues running packages`, () => {
			const success = run(args);
			const result = run(args, [{ status: 2 }]);
			assert.strictEqual(result.exitCode, 2);
			assert.deepStrictEqual(result.calls, success.calls);
		});
	}

	test('preserves the first failure when later commands fail or succeed', () => {
		const result = run(['run', 'test'], [{ status: 2 }, { status: 3 }]);
		assert.strictEqual(result.exitCode, 2);
		assert.strictEqual(result.calls.length, 6);
	});

	test('propagates a failure in the last package', () => {
		const result = run(['run', 'test'], [{}, {}, {}, {}, {}, { status: 7 }]);
		assert.strictEqual(result.exitCode, 7);
	});

	test('reports spawn errors and exits unsuccessfully', () => {
		const error = new Error('Unable to spawn npm');
		const result = run(['run', 'test'], [{ status: null, error }]);
		assert.strictEqual(result.exitCode, 1);
		assert.deepStrictEqual(result.errors, [error]);
		assert.strictEqual(result.calls.length, 6);
	});

	test('reports signal termination and exits unsuccessfully', () => {
		const result = run(['run', 'test'], [{ status: null, signal: 'SIGTERM' }]);
		assert.strictEqual(result.exitCode, 1);
		assert.deepStrictEqual(result.errors, ['Command terminated by signal SIGTERM.']);
		assert.strictEqual(result.calls.length, 6);
	});

	test('does not treat a missing exit status as success', () => {
		assert.strictEqual(run(['run', 'test'], [{ status: null }]).exitCode, 1);
	});

	test('preserves additional command arguments', () => {
		const result = run(['audit', 'fix']);
		assert.strictEqual(result.exitCode, 0);
		assert.strictEqual(result.calls.length, 7);
		assert.ok(result.calls.every(call => call.command === 'npm audit fix'));
	});

	test('skips package installation for root-only installs', () => {
		const result = run(['install'], [], { npm_config_root_only: 'true' });
		assert.deepStrictEqual(result.calls, []);
		assert.strictEqual(result.exitCode, 0);
	});

	test('root-only installation setting does not skip tests', () => {
		assert.strictEqual(run(['run', 'test'], [], { npm_config_root_only: 'true' }).calls.length, 6);
	});
});
