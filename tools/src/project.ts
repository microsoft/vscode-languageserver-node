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

type SourceFolderOptions = {
	path: string;
	references?: string[];
} & SharableOptions;

type ProjectDescription = {
	name: string;
	path: string;
	outDir: string;
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

const test: SharableOptions = {
	types: ['mocha']
};

const node: SharableOptions = {
	types: ['node']
};

const jsonrpc: ProjectDescription = {
	name: 'jsonrpc',
	path: 'jsonrpc',
	outDir: './lib',
	references: [
		{
			path: './src/common',
			extends: [ common ],
			exclude: ['test'],
		},
		{
			path: './src/common/test',
			extends: [ common, test ],
			references: [ '..' ]
		},
		{
			extends: [ browser ],
			path: './src/browser',
			exclude: [ 'test' ]
		},
		{
			extends: [ browser, test ],
			path: './src/browser/test',
			references: [ '..' ]
		},
		{
			extends: [ node ],
			path: './src/node',
			exclude: [ 'test' ]
		},
		{
			extends: [ node, test ],
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
};

class Project {

	private readonly description: ProjectDescription;
	private readonly options: Required<ProjectOptions>;

	constructor(description: ProjectDescription, options: ProjectOptions) {
		this.description = description;
		this.options = Object.assign({}, { tsconfig: 'tsconfig.json' }, options);
	}

	public emit(): void {
		const result: TsConfigFile = {};
		const description = this.description;
		const sourceFolders: SourceFolder[] = [];

		if (description.files !== undefined) {
			result.files = description.files;
			if (description.outDir !== undefined) {
				result.compilerOptions = result.compilerOptions ?? { };
				result.compilerOptions.outDir = description.outDir;
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
				sourceFolders.push(new SourceFolder(reference, description.outDir, this.options));
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
	private readonly outDir: string;
	private readonly options: Required<ProjectOptions>;

	constructor(description: SourceFolderOptions, outDir: string, options: Required<ProjectOptions>) {
		this.description = description;
		this.outDir = outDir;
		this.options = options;
	}

	public emit(): void {
		const result: TsConfigFile = { };
		result.compilerOptions = {};
		const description = this.description;
		const outAbsolute = path.isAbsolute(this.outDir) ? this.outDir : path.join('/', this.outDir);
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
		const options = this.flattenOptions(description);
		if (options.include !== undefined) {
			result.include = options.include;
		}
		if (options.exclude !== undefined) {
			result.exclude = options.exclude;
		}
		if (options.rootDir !== undefined) {
			result.compilerOptions.rootDir = options.rootDir;
		}
		if (options.types !== undefined) {
			result.compilerOptions.types = options.types;
		}
		if (options.lib !== undefined) {
			result.compilerOptions.lib = options.lib;
		}
		if (description.references) {
			result.references = [];
			for (const reference of description.references) {
				result.references.push({ path: path.join(reference, this.options.tsconfig) });
			}
		}

		console.log(JSON.stringify(result, undefined, 4));
	}

	private flattenOptions(options: SharableOptions): SharableOptions {
		if (options.extends === undefined) {
			return options;
		}
		let result: SharableOptions = {};
		for (const option of options.extends) {
			result = Object.assign(result, this.flattenOptions(option));
		}
		return Object.assign(result, options);
	}
}

function main() {
	const project = new Project(jsonrpc, { tsconfig: 'tsconfig.json'} );
	project.emit();
}


if (require.main === module) {
	main();
}