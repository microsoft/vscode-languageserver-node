/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as path from 'path';

import { runTests } from 'vscode-test';

async function go() {
	try {
		const extensionDevelopmentPath = path.resolve(__dirname, '..');
		const extensionTestsPath = __dirname;

		/**
		 * Basic usage
		 */
		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath
		});
	} catch (err) {
		console.error('Failed to run tests');
		process.exitCode = 1;
	}
}
go();