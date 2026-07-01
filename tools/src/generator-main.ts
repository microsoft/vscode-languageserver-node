/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';

import { API, Snapshot } from 'typescript-7/unstable/sync';

import Visitor from './visitor';
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

	const api = new API({});
	const projectPath = path.resolve(args.values.project ?? '.');
	let snapshot: Snapshot;
	try {
		snapshot = api.updateSnapshot({ openProject: projectPath });
	} catch (error) {
		console.error('Couldn\'t load project with underlying program.');
		process.exitCode = -1;
		return -1;
	}

	const visitor = new Visitor(snapshot.getProjects()[0]);
	await visitor.visitProgram();
	await visitor.endVisitProgram();

	console.log(JSON.stringify(visitor.getMetaModel(), undefined, '\t'));
	return 0;
}

if (require.main === module) {
	main().then(undefined, (error) => {
		console.error(error);
		process.exitCode = 1;
	});
}