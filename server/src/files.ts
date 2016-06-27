/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as url from 'url';
import * as path from 'path';
import { exec, fork, ChildProcess } from 'child_process';

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