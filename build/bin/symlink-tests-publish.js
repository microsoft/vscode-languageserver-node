#!/usr/bin/env node
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
//@ts-check

const path = require('path');
const ln = require('./linking');

const root = path.dirname(path.dirname(__dirname));

(async function main() {
	console.log('Symlinking node modules for test setup');

	// Hard link the client to have a real path from the node_modules folder
	await ln.tryHardLink(path.join(root, 'client'), path.join(extensionFolder, 'node_modules', 'vscode-languageclient'));
})();