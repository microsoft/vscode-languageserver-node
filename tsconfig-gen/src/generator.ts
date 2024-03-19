/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as _p from 'path';
const path = _p.posix;

import { CompilerOptions, ProjectDescription, SharableOptions, SourceFolderDescription, Arrays, ProjectOptions } from './types';

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

namespace TSConfigFile {
	export function assign(config: TsConfigFile, options: SharableOptions): TsConfigFile {
		const result: TsConfigFile = Object.assign({}, config);
		result.compilerOptions = CompilerOptions.assign(result.compilerOptions, options.compilerOptions);
		result.include = Arrays.assign(result.include, options.include);
		result.exclude = Arrays.assign(result.exclude, options.exclude);
		result.files = Arrays.assign(result.files, options.files);
		return result;
	}

	export function assertCompilerOptions(config: TsConfigFile): asserts config is TsConfigFile & { compilerOptions: CompilerOptions } {
		if (config.compilerOptions === undefined) {
			throw new Error(`No compiler options sets although expected`);
		}
	}
}

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

export type GeneratorResultEntry = {
	path: string;
	tsconfig: TsConfigFile;
};

export class ProjectGenerator {

	private readonly description: ProjectDescription;
	private readonly options: Required<ProjectOptions>;

	constructor(description: ProjectDescription, options: ProjectOptions) {
		this.description = description;
		this.options = Object.freeze(Object.assign({}, { tsconfig: 'tsconfig.json', variables: new Map(), compilerOptions: {} }, options));
	}

	public generate(root: string): GeneratorResultEntry[] {
		let tsconfig: TsConfigFile = {};
		const description = this.description;
		const sourceFolders: SourceFolderGenerator[] = [];
		const options = SharableOptions.flatten(description);
		const singleSource = description.sourceFolders === undefined && description.out !== undefined;

		if (singleSource) {
			tsconfig = TSConfigFile.assign(tsconfig, options);
			tsconfig.compilerOptions = CompilerOptions.assign(tsconfig.compilerOptions, this.options.compilerOptions);
			tsconfig.compilerOptions.outDir = description.out!.dir;
			if (description.out!.buildInfoFile !== undefined) {
				tsconfig.compilerOptions.tsBuildInfoFile = path.join(description.out!.dir, ProjectOptions.resolveVariables(description.out!.buildInfoFile, this.options));
				tsconfig.compilerOptions.incremental = true;
			}
		} else {
			if (description.sourceFolders !== undefined || description.references !== undefined) {
				tsconfig.compilerOptions = tsconfig.compilerOptions ?? {};
				tsconfig.compilerOptions.incremental = true;
				tsconfig.compilerOptions.composite = true;
				tsconfig.files = [];
			}
		}

		if (description.references !== undefined) {
			tsconfig.references = tsconfig.references ?? [];
			for (const reference of description.references) {
				if (typeof reference === 'string') {
					const basename = path.basename(reference);
					if (basename.match(/tsconfig(\.[^\.]+)*\.json/)) {
						tsconfig.references.push({ path: reference });
					} else {
						tsconfig.references.push({ path: path.join(reference, this.options.tsconfig) });
					}
				} else {
					const parentLevels = this.parentLevels();
					let referencePath = parentLevels === undefined
						? path.join(root, reference.path, this.options.tsconfig)
						: path.join(root, parentLevels, reference.path, this.options.tsconfig);
					if (!path.isAbsolute(referencePath) && !referencePath.startsWith('./')) {
						referencePath = `./${referencePath}`;
					}
					tsconfig.references.push({ path: referencePath });
				}
			}
			if (tsconfig.files === undefined) {
				tsconfig.files = [];
			}
		}

		if (description.sourceFolders !== undefined) {
			tsconfig.compilerOptions = tsconfig.compilerOptions ?? {};
			tsconfig.references = tsconfig.references ?? [];
			for (const sourceFolder of description.sourceFolders) {
				let sfp = path.join(sourceFolder.path, this.options.tsconfig);
				if (!path.isAbsolute(sfp) && !sfp.startsWith('./')) {
					sfp = `./${sfp}`;
				}
				tsconfig.references.push({
					path: sfp
				});
				sourceFolders.push(new SourceFolderGenerator(sourceFolder, description, this.options));
			}
		}
		const result: GeneratorResultEntry[] = [];
		result.push({ path: _p.join(root, description.path, this.options.tsconfig), tsconfig });
		const compositeSourceFolders = new Set<string>();
		const sourceFolderResults: Map<string, GeneratorResultEntry> = new Map();
		for (const sourceFolder of sourceFolders) {
			const sfr =  sourceFolder.generate(_p.join(root, description.path));
			result.push(sfr.result);
			sourceFolderResults.set(path.normalize(sourceFolder.description.path), sfr.result);
			if (sfr.compositeTargets) {
				for (const compositeTarget of sfr.compositeTargets) {
					compositeSourceFolders.add(compositeTarget);
				}
			}
		}
		if (compositeSourceFolders.size > 0) {
			for (const compositeSourceFolder of compositeSourceFolders) {
				const sourceFolder = sourceFolderResults.get(compositeSourceFolder);
				if (sourceFolder !== undefined) {
					sourceFolder.tsconfig.compilerOptions = sourceFolder.tsconfig.compilerOptions ?? {};
					sourceFolder.tsconfig.compilerOptions.composite = true;
				}
			}
		}
		return result;
	}

	private parentLevels(): string | undefined {
		const normalized = path.normalize(this.description.path);
		if (normalized === '.' || normalized === './') {
			return undefined;
		}
		const split = normalized.split(path.sep);
		for (let i = 0; i < split.length; i++) {
			split[i] = '..';
		}
		return split.join(path.sep);
	}
}

class SourceFolderGenerator {

	public readonly description: SourceFolderDescription;
	private readonly projectDescription: ProjectDescription;
	private readonly options: Required<ProjectOptions>;

	constructor(description: SourceFolderDescription, projectDescription: ProjectDescription, options: Required<ProjectOptions>) {
		this.description = description;
		this.projectDescription = projectDescription;
		this.options = options;
	}

	public generate(root: string): { result: GeneratorResultEntry; compositeTargets?: string[] } {
		let result: TsConfigFile = { };
		const description = this.description;
		const options = SharableOptions.flatten(description);
		result = TSConfigFile.assign(result, options);
		result.compilerOptions = CompilerOptions.assign(result.compilerOptions, this.options.compilerOptions);
		if (description.out !== undefined) {
			const out = description.out;
			result.compilerOptions = result.compilerOptions ?? {};
			result.compilerOptions.outDir = ProjectOptions.resolveVariables(out.dir, this.options);
			if (out.buildInfoFile !== undefined) {
				result.compilerOptions.tsBuildInfoFile = ProjectOptions.resolveVariables(out.buildInfoFile, this.options);
				result.compilerOptions.incremental = true;
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
			result.compilerOptions = result.compilerOptions ?? {};
			result.compilerOptions.outDir = outDir;
			if (out.buildInfoFile !== undefined) {
				result.compilerOptions.tsBuildInfoFile = path.join(outDir, ProjectOptions.resolveVariables(out.buildInfoFile, this.options));
				result.compilerOptions.incremental = true;
			}
		}
		const compositeTargets: string[] = [];
		if (description.references) {
			result.references = [];
			for (const reference of description.references) {
				result.references.push({ path: path.join(reference, this.options.tsconfig) });
				if (!path.isAbsolute(reference)) {
					compositeTargets.push(path.normalize(path.join(description.path, reference)));
				}
			}
		}
		return { result: { path: _p.join(root, description.path, this.options.tsconfig), tsconfig: result }, compositeTargets };
	}
}
