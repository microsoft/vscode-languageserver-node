/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as url from 'url';
import * as path from 'path';
import { exec, spawnSync, fork, ChildProcess } from 'child_process';

export function uriToFilePath(uri: string): string {
	let parsed = url.parse(uri);
	if (parsed.protocol !== 'file:' || !parsed.path) {
		return null;
	}
	let segments = parsed.path.split('/');
	for (var i = 0, len = segments.length; i < len; i++) {
		segments[i] = decodeURIComponent(segments[i]);
	}
	if (process.platform === 'win32' && segments.length > 1) {
		let first = segments[0];
		let second = segments[1];
		// Do we have a drive letter and we started with a / which is the
		// case if the first segement is empty (see split above)
		if (first.length === 0 && second.length > 1 && second[1] === ':') {
			// Remove first slash
			segments.shift();
		}
	}
	return path.normalize(segments.join('/'));
}

function isWindows(): boolean {
	return process.platform === 'win32';
}

export function resolveModule(workspaceRoot: string, moduleName: string): Thenable<any> {
	interface Message {
		command: string;
		success?: boolean;
		args?: any;
		result?: any
	}
	let nodePathKey: string = 'NODE_PATH';
	return new Promise<any>((resolve, reject) => {
		let result = Object.create(null);
		let nodePath: string[] = [];
		if (workspaceRoot) {
			nodePath.push(path.join(workspaceRoot, 'node_modules'));
		}
		exec('npm config get prefix', (error: Error, stdout: Buffer, stderr: Buffer) => {
			if (!error) {
				let globalPath = stdout.toString().replace(/[\s\r\n]+$/, '');
				if (globalPath.length > 0) {
					if (isWindows()) {
						nodePath.push(path.join(globalPath, 'node_modules'));
					} else {
						nodePath.push(path.join(globalPath, 'lib', 'node_modules'));
					}
				}
			}
			let separator = isWindows() ? ';' : ':';
			let env = process.env;
			let newEnv = Object.create(null);
			Object.keys(env).forEach(key => newEnv[key] = env[key]);
			if (newEnv[nodePathKey]) {
				newEnv[nodePathKey] = nodePath.join(separator) + separator + newEnv[nodePathKey];
			} else {
				newEnv[nodePathKey] = nodePath.join(separator);
			}
			try {
				let cp: ChildProcess = fork(path.join(__dirname, 'resolve.js'), [], <any>{ env: newEnv, execArgv: [] });
				cp.on('message', (message: Message) => {
					if (message.command === 'resolve') {
						let toRequire: string = moduleName;
						if (message.success) {
							toRequire = message.result;
						}
						cp.send({ command: 'exit' });
						try {
							resolve(require(toRequire));
						} catch (error) {
							reject(error);
						}
					}
				});
				let message: Message = {
					command: 'resolve',
					args: moduleName
				};
				cp.send(message);
			} catch (error) {
				reject(error);
			}
		});
	});
}

/**
 * Resolves the given module relative to the given workspace root. In contrast to
 * `resolveModule` this method considers the parent chain as well.
 */
export function resolveModule2(workspaceRoot: string, moduleName: string, nodePath: string, tracer: (message: string, verbose?: string) => void): Thenable<any> {

	interface Message {
		c: string;
		s?: boolean;
		a?: any;
		r?: any
	}

	const app: string = [
		"var p = process;",
		"p.on('message',function(m){",
			"if(m.c==='e'){",
				"p.exit(0);",
			"}",
			"else if(m.c==='rs'){",
				"try{",
					"var r=require.resolve(m.a);",
					"p.send({c:'r',s:true,r:r});",
				"}",
				"catch(err){",
					"p.send({c:'r',s:false});",
				"}",
			"}",
		"});"
	].join('');

	const nodePathKey: string = 'NODE_PATH';

	function getGlobalNodePath(): string {
		let npmCommand = isWindows() ? 'npm.cmd' : 'npm';

		let prefix = spawnSync(npmCommand, ['config', 'get', 'prefix'], {
			encoding: 'utf8'
		}).stdout.trim();
		if (tracer) {
			tracer(`'npm config get prefix' value is: ${prefix}`);
		}

		if (prefix.length > 0) {
			if (isWindows()) {
				return path.join(prefix, 'node_modules');
			} else {
				return path.join(prefix, 'lib', 'node_modules');
			}
		}
		return undefined;
	}

	if (nodePath && !path.isAbsolute(nodePath)) {
		nodePath = path.join(workspaceRoot, nodePath);
	}

	let nodePaths: string[] = [];
	if (nodePath) {
		nodePaths.push(nodePath);
	}
	let global = getGlobalNodePath();
	if (global) {
		nodePaths.push(global);
	}

	return new Promise<any>((resolve, reject) => {
		let env = process.env;
		let newEnv = Object.create(null);
		Object.keys(env).forEach(key => newEnv[key] = env[key]);

		if (nodePaths.length > 0) {
			if (newEnv[nodePathKey]) {
				newEnv[nodePathKey] = nodePaths.join(path.delimiter) + path.delimiter + newEnv[nodePathKey];
			} else {
				newEnv[nodePathKey] = nodePaths.join(path.delimiter);
			}
			if (tracer) {
				tracer(`NODE_PATH value is: ${newEnv[nodePathKey]}`);
			}
		}
		newEnv['ATOM_SHELL_INTERNAL_RUN_AS_NODE'] = '1';
		try {
			let cp: ChildProcess = fork('', [], <any> {
				cwd: workspaceRoot,
				env: newEnv,
				execArgv: ['-e', app]
			});
			cp.on('message', (message: Message) => {
				if (message.c === 'r') {
					let toRequire: string = moduleName;
					if (message.s) {
						toRequire = message.r;
					}
					cp.send({ c: 'e' });
					try {
						resolve(require(toRequire));
					} catch (error) {
						reject(error);
					}
				}
			});
			let message: Message = {
				c: 'rs',
				a: moduleName
			};
			cp.send(message);
		} catch (error) {
			reject(error);
		}
	});
}