#!/usr/bin/env node

const path = require('path');
const ln = require('./linking');

const root = path.dirname(path.dirname(__dirname));

(async function main() {
	console.log('Symlinking node modules for testbed');

	{
		// testbed-client
		let testbedClientFolder = path.join(root, 'testbed', 'client');
		await ln.softLink(path.join(root, 'jsonrpc'), path.join(testbedClientFolder, 'node_modules', 'vscode-jsonrpc'));
		await ln.softLink(path.join(root, 'types'), path.join(testbedClientFolder, 'node_modules', 'vscode-languageserver-types'));
		await ln.softLink(path.join(root, 'protocol'), path.join(testbedClientFolder, 'node_modules', 'vscode-languageserver-protocol'));
		await ln.tryHardLink(path.join(root, 'client'), path.join(testbedClientFolder, 'node_modules', 'vscode-languageclient'));
	}
	{
		let testbedServerFolder = path.join(root, 'testbed', 'server');
		await ln.softLink(path.join(root, 'jsonrpc'), path.join(testbedServerFolder, 'node_modules', 'vscode-jsonrpc'));
		await ln.softLink(path.join(root, 'types'), path.join(testbedServerFolder, 'node_modules', 'vscode-languageserver-types'));
		await ln.softLink(path.join(root, 'protocol'), path.join(testbedServerFolder, 'node_modules', 'vscode-languageserver-protocol'));
		await ln.softLink(path.join(root, 'textDocument'), path.join(testbedServerFolder, 'node_modules', 'vscode-languageserver-textdocument'));
		await ln.softLink(path.join(root, 'server'), path.join(testbedServerFolder, 'node_modules', 'vscode-languageserver'));
	}
	// testbed-server

})();