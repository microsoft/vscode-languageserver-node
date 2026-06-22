/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import yargs from 'yargs';
import { ProjectGenerator } from './generator.js';
import { ProjectOptions, Projects } from './types.js';

export * from './types.js';

const nodeRequire = createRequire(import.meta.url);

export async function main(): Promise<number> {
	const y = yargs(process.argv.slice(2));
	const args = y.
		parserConfiguration({ 'camel-case-expansion': false }).
		exitProcess(false).
		usage(`TSConfig Generator\nVersion: ${nodeRequire('../package.json').version}\nUsage: tsconfig-gen [options] file`).
		example(`tsconfig-gen .tsconfigrc.mjs`, `Creates tsconfig.json files based on the configuration in .tsconfigrc.mjs`).
		example(`tsconfig-gen -i compile -f .tsconfigrc.mjs`, `Creates tsconfig.json files for the 'compile' variant based on the configuration in .tsconfigrc.mjs`).
		version(false).
		wrap(Math.min(100, y.terminalWidth())).
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
			description: 'The input file. This option is useful together with the t option.',
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
		console.log(nodeRequire('../package.json').version);
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

	const configFile = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
	const projects: Projects = (await import(pathToFileURL(configFile).href)).default;
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

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().then((code) => { process.exitCode = code; });
}