/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';

interface Package {
	name: string;
	location: string;
	dependsOn?: { kind: 'dev' | 'release'; package: Package }[];
}

const textDocument: Package = {
	name: 'vscode-languageserver-textdocument',
	location: './textDocument'
};

const types: Package = {
	name: 'vscode-languageserver-types',
	location: './types'
};

const jsonrpc: Package = {
	name: 'vscode-jsonrpc',
	location: './jsonrpc'
};

const protocol: Package = {
	name: 'vscode-languageserver-protocol',
	location: './protocol',
	dependsOn: [
		{ kind: 'release', package: types },
		{ kind: 'release', package: jsonrpc }
	]
};

const server: Package = {
	name: 'vscode-languageserver',
	location: './server',
	dependsOn: [
		{ kind: 'release', package: protocol },
		{ kind: 'dev', package: textDocument }
	]
};

const client: Package = {
	name: 'vscode-languageclient',
	location: './client',
	dependsOn: [
		{ kind: 'release', package: protocol }
	]
};

const clientNodeTests: Package = {
	name: 'test-extension',
	location: './client-node-tests',
	dependsOn: [
		{ kind: 'release', package: server },
		{ kind: 'release', package: client }
	]
};

const packages: Package[] = [textDocument, types, jsonrpc, protocol, server, client, clientNodeTests];
const root = path.join(__dirname, '..', '..');

interface ValidationEntry {
	package: Package;
	version: string;
	violations: {
		package: Package;
		version: string;
	}[];
}

const validations: Map<string, ValidationEntry> = new Map();

function check(): void {
	for (const pack of packages) {
		const json = require(path.join(root, pack.location, 'package.json'));
		validations.set(pack.name, { package: pack, version: json.version, violations: []});
		if (pack.dependsOn !== undefined) {
			for (const dependency of pack.dependsOn) {
				const version = dependency.kind === 'release'
					? json.dependencies[dependency.package.name]
					: json.devDependencies[dependency.package.name];
				const validationEntry = validations.get(dependency.package.name)!;
				if (version === undefined) {
					validationEntry.violations.push({ package: pack, version: 'undefined'});
				} else if (version !== validationEntry.version) {
					validationEntry.violations.push({ package: pack, version: version });
				}
			}
		}
	}
}

function printResult(): void {
	for (const entry of validations.values()) {
		if (entry.violations.length === 0) {
			continue;
		}
		process.exitCode = 1;
		process.stdout.write(`Package ${entry.package.name} at version ${entry.version} is incorrectly referenced in the following packages:\n`);
		for (const violation of entry.violations) {
			process.stdout.write(`\t ${violation.package.name} with version ${violation.version}\n`);
		}
	}
}

check();
printResult();