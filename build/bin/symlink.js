#!/usr/bin/env node

const path = require('path');
const ln = require('./linking');

const root = path.dirname(path.dirname(__dirname));

(async function main() {
	console.log('Symlinking node modules for development setup');

	// protocol folder
	let protocolFolder = path.join(root, 'protocol');
	await ln.tryLinkJsonRpc(protocolFolder);
	await ln.tryLinkTypes(protocolFolder);

	// server folder
	let serverFolder = path.join(root, 'server');
	await ln.tryLinkJsonRpc(serverFolder);
	await ln.tryLinkTypes(serverFolder);
	await ln.tryLinkProtocol(serverFolder);

	// client folder
	let clientFolder = path.join(root, 'client');
	await ln.tryLinkJsonRpc(clientFolder);
	await ln.tryLinkTypes(clientFolder);
	await ln.tryLinkProtocol(clientFolder);
})();