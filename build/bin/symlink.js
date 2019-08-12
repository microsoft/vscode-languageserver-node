#!/usr/bin/env node

let path  = require('path');
let shell = require('shelljs');

let fs = require('fs');
let promisify = require('util').promisify;
let stat = promisify(fs.stat);
let readdir = promisify(fs.readdir);
let mkdir = promisify(fs.mkdir);
let exists = promisify(fs.exists);

let root = path.dirname(path.dirname(__dirname));
let options = "-rf";


/**
 * @param {string} source
 * @param {string} dest
 */
async function hardLink(source, dest) {
	let sourceStat = await stat(source);
	if (sourceStat.isFile()) {
		shell.ln('-f', source, dest);
	} else {
		await mkdir(dest);
		let files = await readdir(source);
		for (let file of files) {
			if (file === '.' || file === '..') {
				continue;
			}
			await hardLink(path.join(source, file), path.join(dest, file));
		}
	}
}


async function tryHardLink(source, dest) {
	console.log(`Linking recusively ${source} -> ${dest}`);
	if (await exists(dest)) {
		shell.rm('-rf', dest);
	}
	await hardLink(source, dest)
}

/**
 * @param {string} module
 * @param {string} name
 * @param {string} source
 */
async function tryLink(module, name, source) {
	let current = process.cwd();
	try {
		process.chdir(path.join(module, 'node_modules'));
		if (await exists(name)) {
			shell.rm(options , name);
		}
		shell.ln('-s', path.join('..', '..', source), name);
	} finally {
		process.chdir(current);
	}
}

async function tryLinkJsonRpc(module) {
	return tryLink(module, 'vscode-jsonrpc', 'jsonrpc');
}

async function tryLinkTypes(module) {
	return tryLink(module, 'vscode-languageserver-types', 'types');
}

async function tryLinkProtocol(module) {
	return tryLink(module, 'vscode-languageserver-protocol', 'protocol');
}

(async function main() {
	console.log('Symlinking node modules for development setup');

	// protocol folder
	let protocolFolder = path.join(root, 'protocol');
	await tryLinkJsonRpc(protocolFolder);
	await tryLinkTypes(protocolFolder);

	// server folder
	let serverFolder = path.join(root, 'server');
	await tryLinkJsonRpc(serverFolder);
	await tryLinkTypes(serverFolder);
	await tryLinkProtocol(serverFolder);

	// client folder
	let clientFolder = path.join(root, 'client');
	await tryLinkJsonRpc(clientFolder);
	await tryLinkTypes(clientFolder);
	await tryLinkProtocol(clientFolder);

	// test-extension
	let extensionFolder = path.join(root, 'client-tests');
	await tryLinkJsonRpc(extensionFolder);
	await tryLinkTypes(extensionFolder);
	await tryLinkProtocol(extensionFolder);
	await tryLink(extensionFolder, 'vscode-languageserver', 'server');

	// Hard link the client to have a real path from the node_modules folder
	await tryHardLink(path.join(root, 'client'), path.join(extensionFolder, 'node_modules', 'vscode-languageclient'));
})();