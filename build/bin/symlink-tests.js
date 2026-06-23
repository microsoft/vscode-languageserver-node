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
	console.log('Hard linking the language client into the test extension');

	// The client uses a VS Code proposed API (codeActionAI). VS Code grants proposed
	// API access based on the real path that owns the code. npm workspaces only expose
	// the client as a symlink whose real path resolves back out to <root>/client
	// (outside this extension), so the proposal would be rejected. Hard linking a real
	// copy of the client into the extension's node_modules gives it a real path inside
	// the extension. All other workspace packages are resolved via the root node_modules.
	const extensionFolder = path.join(root, 'client-node-tests');
	await ln.tryHardLink(path.join(root, 'client'), path.join(extensionFolder, 'node_modules', '@vscode', 'languageclient'));
})();