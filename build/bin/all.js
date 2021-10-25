#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
 "use strict";

// @ts-check

const path = require('path');
const child_process = require('child_process')

const root = path.dirname(path.dirname(__dirname));
const args = process.argv.slice(2);

/** @type { { folder: string; scripts: string[] }[] } */
const folders = [
	{ folder: 'textDocument', scripts: ['install', 'clean', 'lint', 'test'] },
	{ folder: 'types', scripts: ['install', 'clean', 'lint', 'test'] },
	{ folder: 'jsonrpc', scripts: ['install', 'clean', 'lint', 'test'] },
	{ folder: 'protocol', scripts: ['install', 'clean', 'lint', 'test'] },
	{ folder: 'server', scripts: ['install', 'clean', 'lint', 'test'] },
	{ folder: 'client', scripts: ['install', 'clean', 'lint'] },
	{ folder: 'client-node-tests', scripts: ['install', 'clean', 'lint', 'test'] }
];

const script = args[0] === 'run' ? args[1] : args[0];

for (const elem of folders.map(item => { return { folder: item.folder, scripts: new Set(item.scripts) } } )) {
	if (elem.scripts.has(script)) {
		console.log(path.join(root, elem.folder))
		child_process.spawnSync(`npm ${args.join(' ')}`, { cwd: path.join(root, elem.folder), shell: true, stdio: 'inherit' });
	}
}