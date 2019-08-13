#!/usr/bin/env node

const path  = require('path');
const shell = require('shelljs');

const fs = require('fs');
const promisify = require('util').promisify;
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

/**
 * @param {string} source
 * @param {string} dest
 */
const hardLink = exports.hardLink = async function(source, dest) {
	const sourceStat = await stat(source);
	if (sourceStat.isFile()) {
		shell.ln('-f', source, dest);
	} else {
		await mkdir(dest);
		const files = await readdir(source);
		for (const file of files) {
			if (file === '.' || file === '..') {
				continue;
			}
			await hardLink(path.join(source, file), path.join(dest, file));
		}
	}
}

const tryHardLink = exports.tryHardLink = async function(source, dest) {
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
const tryLink = exports.tryLink = async function(module, name, source) {
	const current = process.cwd();
	try {
		process.chdir(path.join(module, 'node_modules'));
		if (await exists(name)) {
			shell.rm('-rf' , name);
		}
		shell.ln('-s', path.join('..', '..', source), name);
	} finally {
		process.chdir(current);
	}
}

exports.tryLinkJsonRpc = async function(module) {
	return tryLink(module, 'vscode-jsonrpc', 'jsonrpc');
}

exports.tryLinkTypes = async function(module) {
	return tryLink(module, 'vscode-languageserver-types', 'types');
}

exports.tryLinkProtocol = async function(module) {
	return tryLink(module, 'vscode-languageserver-protocol', 'protocol');
}