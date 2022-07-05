import * as ts from 'typescript';
import * as _p from 'path';

const path = _p.posix;

type SharableOptions = {
	extends?: SharableOptions[];
	rootDir?: string;
	include?: string[];
	exclude?: string[];
	lib?: string[];
	types?: string[];
};

namespace SharableOptions {
	export function flatten(options: SharableOptions): SharableOptions {
		if (options.extends === undefined) {
			return options;
		}
		let result: SharableOptions = {};
		for (const option of options.extends) {
			result = mergeOptions(result, flatten(option));
		}
		return mergeOptions(options, result);
	}

	export function mergeInto(options: SharableOptions, compilerOptions: ts.CompilerOptions): void {
		if (options.rootDir !== undefined) {
			compilerOptions.rootDir = options.rootDir;
		}
		if (options.types !== undefined) {
			compilerOptions.types = options.types;
		}
		if (options.lib !== undefined) {
			compilerOptions.lib = options.lib;
		}
	}

	function mergeOptions(opt1: SharableOptions, opt2: SharableOptions): SharableOptions {
		const result: SharableOptions = { };
		result.rootDir = opt1.rootDir ?? opt2.rootDir;
		result.exclude = mergeArray(opt1.exclude, opt2.exclude);
		result.include = mergeArray(opt1.include, opt2.include);
		result.types = mergeArray(opt1.types, opt2.types);
		result.lib = mergeArray(opt1.lib, opt2.lib);
		return result;
	}

	function mergeArray<T>(arr1: T[] | undefined, arr2:T[] | undefined): T[] | undefined {
		if (arr1 === undefined) {
			return arr2;
		}
		if (arr2 === undefined) {
			return arr1;
		}
		return arr1.concat(...arr2);
	}
}

type SourceFolderOptions = {
	path: string;
	references?: string[];
} & SharableOptions;

type ProjectDescription = {
	name: string;
	path: string;
	out: {
		dir: string;
		buildInfoFile?: string;
	};
	files?: string[];
	references?: SourceFolderOptions[];
};

const general: SharableOptions = {
	rootDir: '.',
	include: ['.']
};

const common: SharableOptions = {
	extends: [ general ]
};

const browser: SharableOptions = {
	extends: [ common ],
	lib: [ 'es2017', 'webworker']
};

const testMixin: SharableOptions = {
	types: ['mocha']
};

const node: SharableOptions = {
	extends: [ common ],
	types: ['node']
};

const jsonrpc: ProjectDescription = {
	name: 'jsonrpc',
	path: 'jsonrpc',
	out: {
		dir: './lib',
		buildInfoFile: '${buildInfoFile}.tsbuildInfo'
	},
	references: [
		{
			path: './src/common',
			extends: [ common ],
			exclude: ['test'],
		},
		{
			path: './src/common/test',
			extends: [ common, testMixin ],
			references: [ '..' ]
		},
		{
			extends: [ browser ],
			path: './src/browser',
			exclude: [ 'test' ]
		},
		{
			extends: [ browser, testMixin ],
			path: './src/browser/test',
			references: [ '..' ]
		},
		{
			extends: [ node ],
			path: './src/node',
			exclude: [ 'test' ]
		},
		{
			extends: [ node, testMixin ],
			path: './src/node/test',
			references: [ '..' ]
		}
	]
};

type TSProjectReference = {
	path: string;
};

type TsConfigFile = {
	extends?: string;
	compilerOptions?: ts.CompilerOptions;
	include?: string[];
	exclude?: string[];
	files?: string[];
	references?: TSProjectReference[];
};

type ProjectOptions = {
	tsconfig?: string;
	variables?: Map<string, string>;
	compilerOptions?: ts.CompilerOptions;
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

class Project {

	private readonly description: ProjectDescription;
	private readonly options: Required<ProjectOptions>;

	constructor(description: ProjectDescription, options: ProjectOptions) {
		this.description = description;
		this.options = Object.assign({}, { tsconfig: 'tsconfig.json', variables: new Map(), compilerOptions: {} }, options);
	}

	public emit(): void {
		const result: TsConfigFile = {};
		const description = this.description;
		const sourceFolders: SourceFolder[] = [];

		if (description.files !== undefined) {
			result.files = description.files;
			if (description.out !== undefined) {
				result.compilerOptions = result.compilerOptions ??  { };
				result.compilerOptions.outDir = description.out.dir;
				if (description.out.buildInfoFile !== undefined) {

				}
			}
		} else if (description.references !== undefined) {
			result.compilerOptions = result.compilerOptions ?? { };
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
				sourceFolders.push(new SourceFolder(reference, description, this.options));
			}
		}
		console.log(JSON.stringify(result, undefined, 4));
		for (const sourceFolder of sourceFolders) {
			sourceFolder.emit();
		}
	}
}

class SourceFolder {

	private readonly description: SourceFolderOptions;
	private readonly projectDescription: ProjectDescription;
	private readonly options: Required<ProjectOptions>;

	constructor(description: SourceFolderOptions, projectDescription: ProjectDescription, options: Required<ProjectOptions>) {
		this.description = description;
		this.projectDescription = projectDescription;
		this.options = options;
	}

	public emit(): void {
		const result: TsConfigFile = { };
		result.compilerOptions = this.options.compilerOptions !== undefined ? Object.assign({}, this.options.compilerOptions) : {};
		const description = this.description;
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
		const options = SharableOptions.flatten(description);
		if (options.include !== undefined) {
			result.include = options.include;
		}
		if (options.exclude !== undefined) {
			result.exclude = options.exclude;
		}
		SharableOptions.mergeInto(options, result.compilerOptions);
		if (description.references) {
			result.references = [];
			for (const reference of description.references) {
				result.references.push({ path: path.join(reference, this.options.tsconfig) });
			}
		}
		console.log(JSON.stringify(result, undefined, 4));
	}
}

function main() {
	const project = new Project(jsonrpc, {
		tsconfig: 'tsconfig.json',
		variables: new Map([['buildInfoFile', 'compile']]),
		compilerOptions: {
			'strict': true,
			'noImplicitAny': true,
			'noImplicitReturns': true,
			'noImplicitThis': true,
			'noUnusedLocals': true,
			'noUnusedParameters': true,
		}
	});
	project.emit();
}


if (require.main === module) {
	main();
}