#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

// @ts-check

const path = require('path');
const child_process = require('child_process');

const root = path.dirname(path.dirname(__dirname));
const args = process.argv.slice(2);

// When we install in a package pipeline then we don't want to call install in
// the project directories since we need to call install there to ensure proper
// dependency management.
if (args[0] === 'install' && process.env['npm_config_root_only'] === 'true') {
	return;
}

/** @type { { folder: string; scripts: string[] }[] } */
const folders = [
	{ folder: 'tools', scripts: ['install', 'clean', 'lint'] },
	{ folder: 'tsconfig-gen', scripts: ['install', 'clean', 'lint'] },
	{ folder: 'textDocument', scripts: ['install', 'clean', 'lint', 'test', 'audit'] },
	{ folder: 'types', scripts: ['install', 'clean', 'lint', 'test', 'audit'] },
	{ folder: 'jsonrpc', scripts: ['install', 'clean', 'lint', 'test', 'audit'] },
	{ folder: 'protocol', scripts: ['install', 'clean', 'lint', 'test', 'audit'] },
	{ folder: 'server', scripts: ['install', 'clean', 'lint', 'test', 'audit'] },
	{ folder: 'client', scripts: ['install', 'clean', 'lint', 'audit'] },
	{ folder: 'client-node-tests', scripts: ['install', 'clean', 'lint', 'test', 'audit'] }
];

const script = args[0] === 'run' ? args[1] : args[0];

for (const elem of folders.map(item => { return { folder: item.folder, scripts: new Set(item.scripts) }; } )) {
	if (elem.scripts.has(script)) {
		console.log(path.join(root, elem.folder));
		child_process.spawnSync(`npm ${args.join(' ')}`, { cwd: path.join(root, elem.folder), shell: true, stdio: 'inherit' });
	}
}