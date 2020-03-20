#!/usr/bin/env node

const path = require('path');
const ln = require('./linking');

const root = path.dirname(path.dirname(__dirname));

(async function main() {
	console.log('Symlinking node modules for test setup');

	// protocol tests
	let protocolFolder = path.join(root, 'protocol');
	await ln.tryLinkCancellations(protocolFolder);

	// server tests
	let serverFolder = path.join(root, 'server');
	await ln.tryLinkCancellations(serverFolder);

	// test-extension
	let extensionFolder = path.join(root, 'client-tests');
	await ln.tryLinkJsonRpc(extensionFolder);
	await ln.tryLinkCancellations(extensionFolder);
	await ln.tryLinkTypes(extensionFolder);
	await ln.tryLinkProtocol(extensionFolder);
	await ln.tryLink(extensionFolder, 'vscode-languageserver', 'server');

	// Hard link the client to have a real path from the node_modules folder
	await ln.tryHardLink(path.join(root, 'client'), path.join(extensionFolder, 'node_modules', 'vscode-languageclient'));
})();