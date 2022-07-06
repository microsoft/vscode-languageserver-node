/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as _p from 'path';
const path = _p.posix;

import { CompilerOptions, ProjectDescription, SharableOptions, SourceFolderDescription, Arrays, ProjectOptions, Projects } from './types';

namespace SharableOptions {
	export function flatten(options: SharableOptions): SharableOptions {
		if (options.extends === undefined) {
			return options;
		}
		let result: SharableOptions = {};
		for (const option of options.extends) {
			result = assign(flatten(option), result);
		}
		return assign(result, options);
	}

	function assign(opt1: SharableOptions, opt2: SharableOptions): SharableOptions {
		const result: SharableOptions = { };
		result.exclude = Arrays.assign(opt1.exclude, opt2.exclude);
		result.include = Arrays.assign(opt1.include, opt2.include);
		result.compilerOptions = CompilerOptions.assign(opt1.compilerOptions, opt2.compilerOptions);
		return result;
	}
}

type TSProjectReference = {
	path: string;
};

type TsConfigFile = {
	extends?: string;
	compilerOptions?: CompilerOptions;
	include?: string[];
	exclude?: string[];
	files?: string[];
	references?: TSProjectReference[];
};

namespace ProjectOptions {
	export function resolveVariables(value: string, options: ProjectOptions): string {
		if (options.variables === undefined) {
			return value;
		}
		return value.replace(/(\$\{([^\}]*)\})/g, (match, m1, m2) => {
			if (m1 === undefined || m2 === undefined) {
				return match;
			}
			const value = options.variables!.get(m2);
			return value ?? match;
		});
	}
}

export class ProjectEmitter {

	private readonly description: ProjectDescription;
	private readonly options: Required<ProjectOptions>;

	constructor(description: ProjectDescription, options: ProjectOptions) {
		this.description = description;
		this.options = Object.freeze(Object.assign({}, { tsconfig: 'tsconfig.json', variables: new Map(), compilerOptions: {} }, options));
	}

	public emit(): void {
		const result: TsConfigFile = {};
		const description = this.description;
		const sourceFolders: SourceFolderEmitter[] = [];

		if (description.files !== undefined) {
			result.files = description.files;
			result.compilerOptions = result.compilerOptions ?? Object.assign({}, this.options.compilerOptions);
			if (description.out !== undefined) {
				result.compilerOptions.outDir = description.out.dir;
				if (description.out.buildInfoFile !== undefined) {
					result.compilerOptions.tsBuildInfoFile = path.join(description.out.dir, ProjectOptions.resolveVariables(description.out.buildInfoFile, this.options));
				}
			}
		} else if (description.references !== undefined) {
			result.compilerOptions = result.compilerOptions ?? {};
			if (description.files === undefined) {
				result.files = [];
				result.compilerOptions.composite = true;
				result.compilerOptions.incremental = true;
			}
			result.references = [];
			for (const reference of description.references) {
				result.references.push({
					path: path.join(reference.path, this.options.tsconfig)
				});
				sourceFolders.push(new SourceFolderEmitter(reference, description, this.options));
			}
		}
		console.log(JSON.stringify(result, undefined, 4));
		for (const sourceFolder of sourceFolders) {
			sourceFolder.emit();
		}
	}
}

class SourceFolderEmitter {

	private readonly description: SourceFolderDescription;
	private readonly projectDescription: ProjectDescription;
	private readonly options: Required<ProjectOptions>;

	constructor(description: SourceFolderDescription, projectDescription: ProjectDescription, options: Required<ProjectOptions>) {
		this.description = description;
		this.projectDescription = projectDescription;
		this.options = options;
	}

	public emit(): void {
		const result: TsConfigFile = { };
		result.compilerOptions = Object.assign({}, this.options.compilerOptions);
		const description = this.description;
		if (description.out !== undefined) {
			const out = description.out;
			result.compilerOptions.outDir = ProjectOptions.resolveVariables(out.dir, this.options);
			if (out.buildInfoFile !== undefined) {
				result.compilerOptions.tsBuildInfoFile = ProjectOptions.resolveVariables(out.buildInfoFile, this.options);
			}
		} else  if (this.projectDescription.out !== undefined) {
			const out = this.projectDescription.out;
			const outAbsolute = path.isAbsolute(out.dir) ? out.dir : path.join('/', out.dir);
			const sourceAbsolute = path.isAbsolute(description.path) ? description.path : path.join('/', description.path);
			let outDir = path.relative(sourceAbsolute, outAbsolute);
			const outSplit = outAbsolute.split(path.sep);
			const sourceSplit = sourceAbsolute.split(path.sep);
			if (sourceSplit.length > outSplit.length) {
				for (let i = outSplit.length; i < sourceSplit.length; i++) {
					outDir = path.join(outDir, sourceSplit[i]);
				}
			}
			result.compilerOptions.outDir = outDir;
			if (out.buildInfoFile !== undefined) {
				result.compilerOptions.tsBuildInfoFile = path.join(outDir, ProjectOptions.resolveVariables(out.buildInfoFile, this.options));
			}
		}
		const options = SharableOptions.flatten(description);
		if (options.include !== undefined) {
			result.include = options.include;
		}
		if (options.exclude !== undefined) {
			result.exclude = options.exclude;
		}
		result.compilerOptions =  CompilerOptions.assign(result.compilerOptions, options.compilerOptions);
		if (description.references) {
			result.references = [];
			for (const reference of description.references) {
				result.references.push({ path: path.join(reference, this.options.tsconfig) });
			}
		}
		console.log(JSON.stringify(result, undefined, 4));
	}
}

const projects: Projects = require('../src/.tsconfigrc');

function main() {
	for (const project of projects) {
		const emitter = new ProjectEmitter(project[0], project[1][0]);
		emitter.emit();
	}
}


if (require.main === module) {
	main();
}