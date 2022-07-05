import * as ts from 'typescript';
import * as _p from 'path';

const path = _p.posix;

type CompilerOptions = Omit<ts.CompilerOptions, 'target' | 'module'> & { target?: string; module?: string };

namespace CompilerOptions {
	export function assign(opt1: CompilerOptions, opt2: CompilerOptions): CompilerOptions;
	export function assign(opt1: CompilerOptions, opt2: CompilerOptions | undefined): CompilerOptions;
	export function assign(opt1: CompilerOptions | undefined, opt2: CompilerOptions): CompilerOptions;
	export function assign(opt1: undefined, opt2: undefined): undefined;
	export function assign(opt1: CompilerOptions | undefined, opt2: CompilerOptions | undefined): CompilerOptions | undefined;
	export function assign(opt1: CompilerOptions | undefined, opt2: CompilerOptions | undefined): CompilerOptions | undefined {
		if (opt1 === undefined) {
			return opt2;
		}
		if (opt2 === undefined) {
			return opt1;
		}
		const result: CompilerOptions = Object.assign({}, opt1);
		for (const prop of Object.keys(opt2)) {
			const cv = result[prop];
			const nv = opt2[prop];
			if (cv === undefined) {
				result[prop] = nv;
			} else if (nv === undefined) {
				// Keep cv;
			} else if (cv !== undefined && nv !== undefined) {
				if (Array.isArray(cv) && Array.isArray(nv)) {
					result[prop] = Arrays.assign(cv as [], nv as []);
				} else {
					result[prop] = nv;
				}
			}
		}
		return result;
	}
}

namespace Arrays {
	export function assign<T>(arr1: T[] | undefined, arr2:T[] | undefined): T[] | undefined {
		if (arr1 === undefined) {
			return arr2;
		}
		if (arr2 === undefined) {
			return arr1;
		}
		return Array.from(new Set<T>(arr2.concat(...arr1)));
	}
}

type SharableOptions = {
	extends?: SharableOptions[];
	compilerOptions?: CompilerOptions;
	include?: string[];
	exclude?: string[];
};

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
		result.exclude = assignArray(opt1.exclude, opt2.exclude);
		result.include = assignArray(opt1.include, opt2.include);
		result.compilerOptions = CompilerOptions.assign(opt1.compilerOptions, opt2.compilerOptions);
		return result;
	}

	function assignArray<T>(arr1: T[] | undefined, arr2:T[] | undefined): T[] | undefined {
		if (arr1 === undefined) {
			return arr2;
		}
		if (arr2 === undefined) {
			return arr1;
		}
		return Array.from(new Set<T>(arr2.concat(...arr1)));
	}
}

type SourceFolderDescription = {
	path: string;
	out?: {
		dir: string;
		buildInfoFile?: string;
	};
	references?: string[];
} & SharableOptions;

type ProjectDescription = {
	name: string;
	path: string;
	out?: {
		dir: string;
		buildInfoFile?: string;
	};
	files?: string[];
	references?: SourceFolderDescription[];
};

const general: SharableOptions = {
	compilerOptions: {
		rootDir: '.',
	},
	include: ['.']
};

const common: SharableOptions = {
	extends: [ general ]
};

const browser: SharableOptions = {
	extends: [ common ],
	compilerOptions: {
		lib: [ 'es2017', 'webworker']
	}
};

const testMixin: SharableOptions = {
	compilerOptions: {
		types: ['mocha']
	}
};

const node: SharableOptions = {
	extends: [ common ],
	compilerOptions: {
		types: ['node']
	}
};

const textDocuments: ProjectDescription = {
	name: 'textDocuments',
	path: 'textDocuments',
	references: [
		{
			path: './src/',
			extends: [ common ],
			out: {
				dir: '../lib/${target}',
				buildInfoFile: '../lib/${target}/${buildInfoFile}.tsbuildInfo'
			},
			exclude: [ 'test' ]
		},
		{
			path: './src/test',
			extends: [ common, testMixin ],
			out: {
				dir: '../lib/${target}/test',
				buildInfoFile: '../lib/${target}/test/${buildInfoFile}.tsbuildInfo'
			},
			references: [ '..' ]
		}
	]
};

const types: ProjectDescription = {
	name: 'types',
	path: 'types',
	references: [
		{
			path: './src/',
			extends: [ common ],
			out: {
				dir: '../lib/${target}',
				buildInfoFile: '../lib/${target}/${buildInfoFile}.tsbuildInfo'
			},
			exclude: [ 'test' ]
		},
		{
			path: './src/test',
			extends: [ common, testMixin ],
			out: {
				dir: '../lib/${target}/test',
				buildInfoFile: '../lib/${target}/test/${buildInfoFile}.tsbuildInfo'
			},
			references: [ '..' ]
		}
	]
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
			exclude: [ 'test' ],
		},
		{
			path: './src/common/test',
			extends: [ common, testMixin ],
			references: [ '..' ]
		},
		{
			extends: [ browser ],
			path: './src/browser',
			exclude: [ 'test' ],
			references: [ '../common' ]
		},
		{
			extends: [ browser, testMixin ],
			path: './src/browser/test',
			references: [ '..' ]
		},
		{
			extends: [ node ],
			path: './src/node',
			exclude: [ 'test' ],
			references: [ '../common' ]
		},
		{
			extends: [ node, testMixin ],
			path: './src/node/test',
			references: [ '..' ]
		}
	]
};

const protocol: ProjectDescription = {
	name: 'protocol',
	path: 'protocol',
	out: {
		dir: './lib',
		buildInfoFile: '${buildInfoFile}.tsbuildInfo'
	},
	references: [
		{
			path: './src/common',
			extends: [ common ]
		},
		{
			extends: [ browser ],
			path: './src/browser',
			exclude: [ 'test' ],
			references: [ '../common' ]
		},
		{
			extends: [ browser, testMixin ],
			path: './src/browser/test',
			references: [ '..' ]
		},
		{
			extends: [ node ],
			path: './src/node',
			exclude: [ 'test' ],
			references: [ '../common' ]
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
	compilerOptions?: CompilerOptions;
	include?: string[];
	exclude?: string[];
	files?: string[];
	references?: TSProjectReference[];
};

type ProjectOptions = {
	tsconfig?: string;
	variables?: Map<string, string>;
	compilerOptions?: CompilerOptions;
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
		this.options = Object.freeze(Object.assign({}, { tsconfig: 'tsconfig.json', variables: new Map(), compilerOptions: {} }, options));
	}

	public emit(): void {
		const result: TsConfigFile = {};
		const description = this.description;
		const sourceFolders: SourceFolder[] = [];

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

function main() {
	new Project(jsonrpc, {
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
	}).emit();
	new Project(types, {
		tsconfig: 'tsconfig.json',
		variables: new Map([['target', 'umd'], ['buildInfoFile', 'compile']]),
		compilerOptions: {
			'incremental': true,
			'composite': true,
			'sourceMap': true,
			'declaration': true,
			'stripInternal': true,
			'target': 'es5',
			'module': 'umd',
			'lib': [ 'es2015' ],
		}
	}).emit();
}


if (require.main === module) {
	main();
}