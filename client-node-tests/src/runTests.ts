/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as uuid from 'uuid';

import { runTests } from 'vscode-test';

function rimraf(location: string) {
	const stat = fs.lstatSync(location);
	if (stat) {
		if (stat.isDirectory() && !stat.isSymbolicLink()) {
			for (const dir of fs.readdirSync(location)) {
				rimraf(path.join(location, dir));
			}

			fs.rmdirSync(location);
		}
		else {
			fs.unlinkSync(location);
		}
	}
}


async function go() {
	try {
		const extensionDevelopmentPath = path.resolve(__dirname, '..');
		const extensionTestsPath = __dirname;

		const testDir = path.join(os.tmpdir(), uuid.v4());
		fs.mkdirSync(testDir, { recursive: true });
		const userDataDir = path.join(testDir, 'userData');
		fs.mkdirSync(userDataDir);
		const extensionDir = path.join(testDir, 'extensions');
		fs.mkdirSync(extensionDir);
		const workspaceFolder = path.join(testDir, 'workspace');
		fs.mkdirSync(workspaceFolder);

		/**
		 * Basic usage
		 */
		await runTests({
			version: '1.62.0',
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [
				'--user-data-dir', userDataDir,
				'--extensions-dir', extensionDir,
				'--enable-proposed-api', 'ms-vscode.test-extension',
				workspaceFolder
			]
		});
		rimraf(testDir);
	} catch (err) {
		console.error('Failed to run tests');
		process.exitCode = 1;
	}
}

go().catch(console.error);