/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
// @ts-check
'use strict';

const { CompilerOptions } = require('vscode-tsconfig-gen');

/**
 * @typedef {import('vscode-tsconfig-gen').SharableOptions} SharableOptions
 * @typedef {import('vscode-tsconfig-gen').ProjectDescription} ProjectDescription
 * @typedef {import('vscode-tsconfig-gen').ProjectOptions} ProjectOptions
 * @typedef {import('vscode-tsconfig-gen').Projects} Projects
 */

/** @type SharableOptions */
const general = {
	/**
	 * Even under browser we compile to node and commonjs and
	 * rely on webpack to package everything correctly.
	 */
	compilerOptions: {
		module: 'commonjs',
		moduleResolution: 'node',
		target: 'es2020',
		lib: [ 'es2020' ],
	}
};

/** @type SharableOptions */
const testMixin = {
	compilerOptions: {
		types: ['mocha']
	}
};

/** @type SharableOptions */
const vscodeMixin = {
	compilerOptions: {
		types: ['vscode']
	}
};

/** @type SharableOptions */
const common = {
	extends: [ general ],
	compilerOptions: {
		rootDir: '.'
	},
	include: ['.']
};

/** @type SharableOptions */
const browser = {
	extends: [ general ],
	compilerOptions: {
		rootDir: '.',
		types: [],
		lib: [ 'webworker' ]
	},
	include: ['.']
};

/** @type SharableOptions */
const node = {
	extends: [ general ],
	compilerOptions: {
		rootDir: '.',
		types: ['node']
	},
	include: ['.']
};

/** @type ProjectDescription */
const textDocument = {
	name: 'textDocument',
	path: './textDocument',
	sourceFolders: [
		{
			path: './src',
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
				dir: '../../lib/${target}/test',
				buildInfoFile: '../../lib/${target}/test/${buildInfoFile}.tsbuildInfo'
			},
			references: [ '..' ]
		}
	]
};

/** @type ProjectDescription */
const types = {
	name: 'types',
	path: './types',
	sourceFolders: [
		{
			path: './src',
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
				dir: '../../lib/${target}/test',
				buildInfoFile: '../../lib/${target}/test/${buildInfoFile}.tsbuildInfo'
			},
			references: [ '..' ]
		}
	]
};

/** @type ProjectDescription */
const jsonrpc = {
	name: 'jsonrpc',
	path: './jsonrpc',
	out: {
		dir: './lib',
		buildInfoFile: '${buildInfoFile}.tsbuildInfo'
	},
	sourceFolders: [
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
			path: './src/browser',
			extends: [ browser ],
			exclude: [ 'test' ],
			references: [ '../common' ]
		},
		{
			path: './src/browser/test',
			extends: [ browser, testMixin ],
			references: [ '..' ]
		},
		{
			path: './src/node',
			extends: [ node ],
			exclude: [ 'test' ],
			references: [ '../common' ]
		},
		{
			path: './src/node/test',
			extends: [ node, testMixin ],
			references: [ '..' ]
		}
	]
};

/** @type ProjectDescription */
const protocol = {
	name: 'protocol',
	path: './protocol',
	out: {
		dir: './lib',
		buildInfoFile: '${buildInfoFile}.tsbuildInfo'
	},
	sourceFolders: [
		{
			path: './src/common',
			extends: [ common ]
		},
		{
			path: './src/browser',
			extends: [ browser ],
			exclude: [ 'test' ],
			references: [ '../common' ]
		},
		{
			path: './src/browser/test',
			extends: [ browser, testMixin ],
			references: [ '..' ]
		},
		{
			path: './src/node',
			extends: [ node ],
			exclude: [ 'test' ],
			references: [ '../common' ]
		},
		{
			path: './src/node/test',
			extends: [ node, testMixin ],
			references: [ '..' ]
		}
	],
	references: [
		types, jsonrpc
	]
};

/** @type ProjectDescription */
const server = {
	name: 'server',
	path: './server',
	out: {
		dir: './lib',
		buildInfoFile: '${buildInfoFile}.tsbuildInfo'
	},
	sourceFolders: [
		{
			path: './src/common',
			extends: [ common ]
		},
		{
			path: './src/browser',
			extends: [ browser ],
			references: [ '../common' ]
		},
		{
			path: './src/node',
			extends: [ node ],
			exclude: [ 'test' ],
			references: [ '../common' ]
		},
		{
			path: './src/node/test',
			extends: [ node, testMixin ],
			references: [ '..' ]
		}
	],
	references: [ protocol ]
}

/** @type ProjectDescription */
const client = {
	name: 'client',
	path: './client',
	out: {
		dir: './lib',
		buildInfoFile: '${buildInfoFile}.tsbuildInfo'
	},
	sourceFolders: [
		{
			path: './src/common',
			extends: [ common, vscodeMixin ]
		},
		{
			path: './src/browser',
			extends: [ browser, vscodeMixin ],
			references: [ '../common' ]
		},
		{
			path: './src/node',
			extends: [ node, vscodeMixin ],
			references: [ '../common' ]
		}
	],
	references: [ protocol ]
}


/** @type ProjectDescription */
const client_node_tests = {
	name: 'client-node-tests',
	path: './client-node-tests',
	out: {
		dir: './lib',
		buildInfoFile: '${buildInfoFile}.tsbuildInfo'
	},
	sourceFolders: [
		{
			path: './src',
			extends: [ node, vscodeMixin, testMixin ]
		}
	],
	references: [ protocol, client, server ]
}

/** @type ProjectDescription */
const tools = {
	name: 'tools',
	path: './tools',
	extends: [ node ],
	out: {
		dir: './lib',
		buildInfoFile: '${buildInfoFile}.tsbuildInfo'
	},
	compilerOptions: {
		rootDir: './src'
	}
}

/** @type ProjectDescription */
const tsconfig_gen = {
	name: 'tsconfig-gen',
	path: './tsconfig-gen',
	extends: [ node ],
	out: {
		dir: './lib',
		buildInfoFile: '${buildInfoFile}.tsbuildInfo'
	},
	compilerOptions: {
		rootDir: './src'
	}
}

/** @type ProjectDescription */
const root = {
	name: 'root',
	path: './',
	references: [ textDocument, types, jsonrpc, protocol, client, server, client_node_tests, tools, tsconfig_gen ]
}

/** @type CompilerOptions */
const defaultCompilerOptions = {
	strict: true,
	noImplicitAny: true,
	noImplicitReturns: true,
	noImplicitThis: true,
	declaration: true,
	stripInternal: true
};

/** @type CompilerOptions */
const compileCompilerOptions = CompilerOptions.assign(defaultCompilerOptions, {
	noUnusedLocals: true,
	noUnusedParameters: true,
});

/** @type ProjectOptions */
const compileProjectOptions = {
	tsconfig: 'tsconfig.json',
	variables: new Map([['buildInfoFile', 'compile']]),
	compilerOptions: compileCompilerOptions
};

/** @type CompilerOptions */
const watchCompilerOptions = CompilerOptions.assign(defaultCompilerOptions, {
	noUnusedLocals: false,
	noUnusedParameters: false,
	assumeChangesOnlyAffectDirectDependencies: true,
});

/** @type ProjectOptions */
const watchProjectOptions = {
	tsconfig: 'tsconfig.watch.json',
	variables: new Map([['buildInfoFile', 'watch']]),
	compilerOptions: watchCompilerOptions
};

/** @type CompilerOptions */
const umdCompilerOptions = {
	incremental: true,
	composite: true,
	sourceMap: true,
	declaration: true,
	stripInternal: true,
	target: 'es5',
	module: 'umd',
	lib: [ 'es2015' ],
};

/** @type ProjectOptions */
const umdProjectOptions = {
	tsconfig: 'tsconfig.json',
	variables: new Map([['target', 'umd'], ['buildInfoFile', 'compile']]),
	compilerOptions: umdCompilerOptions
};

/** @type CompilerOptions */
const esmCompilerOptions = {
	incremental: true,
	target: 'es5',
	module: 'es6',
	sourceMap: false,
	declaration: true,
	stripInternal: true,
	lib: [ 'es2015' ]
};

/** @type ProjectOptions */
const esmProjectOptions = {
	tsconfig: 'tsconfig.esm.json',
	variables: new Map([['target', 'esm'], ['buildInfoFile', 'compile']]),
	compilerOptions: esmCompilerOptions
};

/** @type Projects */
const projects = [
	[ textDocument, [ umdProjectOptions, esmProjectOptions ] ],
	[ types, [ umdProjectOptions, esmProjectOptions ] ],
	[ jsonrpc, [ compileProjectOptions, watchProjectOptions ] ],
	[ protocol, [ compileProjectOptions, watchProjectOptions ] ],
	[ server, [ compileProjectOptions, watchProjectOptions ] ],
	[ client, [ compileProjectOptions, watchProjectOptions ] ],
	[ client_node_tests, [ compileProjectOptions, watchProjectOptions ] ],
	[ tools, [ compileProjectOptions, watchProjectOptions ] ],
	[ tsconfig_gen, [ compileProjectOptions, watchProjectOptions ] ],
	[ root, [ compileProjectOptions, watchProjectOptions ] ]
];

module.exports = projects;