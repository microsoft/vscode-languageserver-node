/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;

import { join } from 'path';

const isWindows = (process.platform === 'win32');
const isMacintosh = (process.platform === 'darwin');
const isLinux = (process.platform === 'linux');
export function terminate(process: ChildProcess & { pid: number }, cwd?: string): boolean {
	if (isWindows) {
		try {
			// This we run in Atom execFileSync is available.
			// Ignore stderr since this is otherwise piped to parent.stderr
			// which might be already closed.
			const options: any = {
				stdio: ['pipe', 'pipe', 'ignore']
			};
			if (cwd) {
				options.cwd = cwd;
			}
			(<any>cp).execFileSync('taskkill', ['/T', '/F', '/PID', process.pid.toString()], options);
			return true;
		} catch (err) {
			return false;
		}
	} else if (isLinux || isMacintosh) {
		try {
			const cmd = join(__dirname, 'terminateProcess.sh');
			const result = (<any>cp).spawnSync(cmd, [process.pid.toString()]);
			return result.error ? false : true;
		} catch (err) {
			return false;
		}
	} else {
		process.kill('SIGKILL');
		return true;
	}
}