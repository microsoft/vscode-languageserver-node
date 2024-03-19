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

	// test-extension
	const extensionFolder = path.join(root, 'client-node-tests');
	await ln.tryLinkJsonRpc(extensionFolder);
	await ln.tryLinkTypes(extensionFolder);
	await ln.tryLinkProtocol(extensionFolder);
	await ln.tryLink(extensionFolder, 'vscode-languageserver', path.join('..', '..', 'server'));

	// Hard link the client to have a real path from the node_modules folder
	await ln.tryHardLink(path.join(root, 'client'), path.join(extensionFolder, 'node_modules', 'vscode-languageclient'));
})();
