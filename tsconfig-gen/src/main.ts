/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as fs from 'fs';
import path = require('path');
import * as yargs from 'yargs';
import { ProjectGenerator } from './generator';
import { Projects } from './types';

export * from './types';

function main(): number {
	const args = yargs.
		parserConfiguration({ 'camel-case-expansion': false }).
		exitProcess(false).
		usage(`TSConfig Generator\nVersion: ${require('../package.json').version}\nUsage: tsconfig-gen [options] file`).
		example(`tsconfig-gen .tsconfigrc.js`, `Create tsconfig.json files based on the configuration in .tsconfigrc.js`).
		version(false).
		wrap(Math.min(100, yargs.terminalWidth())).
		option('t', {
			alias: 'test',
			description: 'Runs in test mode. Prints the new configuration files to stdout.',
			boolean: true
		}).
		options('v', {
			alias: 'version',
			description: 'Output the version number',
			boolean: true
		}).
		options('h', {
			alias: 'help',
			description: 'Provide help',
			boolean: true
		}).
		parseSync();

	if (args.h) {
		return 0;
	}
	if (args.v) {
		console.log(require('../package.json').version);
		return 0;
	}
	const test = args.t;
	const free = args._;
	if (free.length !== 1 && typeof free[0] !== 'string') {
		console.error('No input file specified.');
		return 1;
	}
	let input = free[0] as string;
	if (!fs.existsSync(input)) {
		console.error(`Input file ${input} does not exist.`);
		return 1;
	}

	const ext = path.extname(input);
	if (ext.length > 0) {
		input = input.substring(0, input.length - ext.length);
	}

	const projects: Projects = require(path.isAbsolute(input) ? input : path.join(process.cwd(), input));
	for (const project of projects) {
		for (const variant of project[1]) {
			const generator = new ProjectGenerator(project[0], variant);
			const result = generator.generate(path.dirname(input));
			if (test) {
				console.log(JSON.stringify(result, undefined, 4));
			} else {
				for (const config of result) {
					const filename = config.path;
					fs.writeFileSync(filename, JSON.stringify(config.tsconfig, undefined, 4));
				}
			}
		}
	}

	return 0;
}

if (require.main === module) {
	process.exitCode = main();
}