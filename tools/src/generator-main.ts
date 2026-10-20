/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { statSync } from 'fs';

import { API, formatDiagnostics, Snapshot } from '@typescript/native/sync';

import Visitor from './visitor.js';
import { parseArgs } from 'util';

async function main(): Promise<number> {
	const args = parseArgs({
		args: process.argv.slice(2),
		options: {
			project: {
				type: 'string',
				short: 'p'
			}
		}
	});

	using api = new API();
	const projectPath = path.resolve(args.values.project ?? '.');
	let initialSnapshot: Snapshot;
	try {
		const configFilePath = statSync(projectPath).isDirectory() ? path.join(projectPath, 'tsconfig.json') : projectPath;
		const config = api.parseConfigFile(configFilePath);
		if (config.errors.length > 0) {
			console.error(formatDiagnostics(config.errors, api));
			return -1;
		}
		initialSnapshot = api.createSnapshot({
			createPrograms: [{
				rootFiles: config.fileNames,
				compilerOptions: {
					...config.options,
					disableSourceOfProjectReferenceRedirect: true
				},
				options: {
					projectReferences: config.projectReferences
				}
			}]
		});
	} catch (error) {
		console.error('Couldn\'t load project with underlying program.');
		process.exitCode = -1;
		return -1;
	}

	using snapshot = initialSnapshot;
	const visitor = new Visitor(snapshot.getProjects()[0]);
	await visitor.visitProgram();
	await visitor.endVisitProgram();

	console.log(JSON.stringify(visitor.getMetaModel(), undefined, '\t'));
	return 0;
}
main().then((code) => {
	process.exitCode = code;
}, (error) => {
	console.error(error);
	process.exitCode = 1;
});