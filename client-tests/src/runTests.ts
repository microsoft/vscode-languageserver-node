/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as path from 'path';
import * as cp from 'child_process';

import { runTests } from 'vscode-test';

async function go() {
	try {
		const extensionDevelopmentPath = path.resolve(__dirname, '..');
		const extensionTestsPath = __dirname;
		let vscodeExecutablePath: string | undefined;
		try {
			if (process.platform === 'linux') {
				console.log('Linux');
				let kernelRelease = cp.execSync('uname -r', { encoding: 'utf8'} );
				console.log(kernelRelease);
				if (/^[0-9.]+-([0-9]+)-Microsoft|([0-9]+).([0-9]+).([0-9]+)-microsoft-standard/.test(kernelRelease)) {
					// We run on a WSL build. Check if we can locate a code-insider / code.
					let location = cp.execSync('which code-insiders', { encoding: 'utf8'});
					console.log(location);
					if (location.length === 0) {
						location = cp.execSync('which code', { encoding: 'utf8'});
					}
					console.log(location);
					if (location.length > 0 && /^\/mnt\/[a-z]\//.test(location)) {
						location = '/mnt/c/Users/dirkb/AppData/Local/Programs/Microsoft\ VS\ Code\ Insiders/bin/code-insiders';
						console.log(`Using location ${location}`);
						vscodeExecutablePath = location;

					}
				}
			}
		} catch (err) {
			// Do nothing. Use normale executable.
		}

		/**
		 * Basic usage
		 */
		await runTests({
			vscodeExecutablePath,
			extensionDevelopmentPath,
			extensionTestsPath
		});
	} catch (err) {
		console.error('Failed to run tests');
		process.exitCode = 1;
	}
}
go();