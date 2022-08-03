/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as fs from 'fs';
import path = require('path');
import * as yargs from 'yargs';
import { ProjectGenerator } from './generator';
import { ProjectOptions, Projects } from './types';

export * from './types';

export function main(): number {
	const args = yargs.
		parserConfiguration({ 'camel-case-expansion': false }).
		exitProcess(false).
		usage(`TSConfig Generator\nVersion: ${require('../package.json').version}\nUsage: tsconfig-gen [options] file`).
		example(`tsconfig-gen .tsconfigrc.js`, `Creates tsconfig.json files based on the configuration in .tsconfigrc.js`).
		example(`tsconfig-gen -i compile -f .tsconfigrc.js`, `Creates tsconfig.json files for the 'compile' variant based on the configuration in .tsconfigrc.js`).
		version(false).
		wrap(Math.min(100, yargs.terminalWidth())).
		option('d', {
			alias: 'dryRun',
			description: 'Dry run without writing tsconfig files. Prints the new configuration files to stdout.',
			boolean: true
		}).
		option('t', {
			alias: 'tag',
			description: 'Only the compile variants with the give tag are generated. If omitted all variants are generated.',
			array: true
		}).
		option('f', {
			alias: 'file',
			description: 'The input file. This option is useful together with the i option.',
			string: true,
		}).
		option('v', {
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
	const test = args.d;
	const free = args._;
	let file = args.f;
	if (file === undefined && free.length === 1 && typeof free[0] === 'string') {
		file = free[0];
	}

	if (file === undefined) {
		console.error('No input file specified.');
		return 1;
	}

	if (!fs.existsSync(file)) {
		console.error(`Input file ${file} does not exist.`);
		return 1;
	}

	const ext = path.extname(file);
	if (ext.length > 0) {
		file = file.substring(0, file.length - ext.length);
	}

	const variants: Set<string | number> | undefined =  args.t && new Set(args.t);
	function match(variant: ProjectOptions): boolean {
		if (variants === undefined) {
			return true;
		}
		for (const tag of variant.tags) {
			if (variants.has(tag)) {
				return true;
			}
		}
		return false;
	}

	const projects: Projects = require(path.isAbsolute(file) ? file : path.join(process.cwd(), file));
	for (const project of projects) {
		for (const variant of project[1]) {
			if (!match(variant)) {
				continue;
			}
			const generator = new ProjectGenerator(project[0], variant);
			const result = generator.generate(path.dirname(file));
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