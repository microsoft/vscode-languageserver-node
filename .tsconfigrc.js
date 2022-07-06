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
	compilerOptions: {
		rootDir: '.',
	},
	include: ['.']
};

/** @type SharableOptions */
const common = {
	extends: [ general ],
	/**
	 * Even under browser we compile to node and commonjs and
	 * rely on webpack to package everything correctly.
	 */
	compilerOptions: {
		"target": "es2020",
		"module": "commonjs",
		"moduleResolution": "node",
		"lib": [ "es2020" ],
	}
};

/** @type SharableOptions */
const browser = {
	extends: [ common ],
	compilerOptions: {
		lib: [ 'es2017', 'webworker']
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
const node = {
	extends: [ common ],
	compilerOptions: {
		target: 'es2020',
		module: 'commonjs',
		moduleResolution: 'node',
		lib: [ 'es2020' ],
		types: ['node']
	}
};

/** @type ProjectDescription */
const textDocument = {
	name: 'textDocument',
	path: './textDocument',
	sourceFolders: [
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

/** @type ProjectDescription */
const types = {
	name: 'types',
	path: './types',
	sourceFolders: [
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
			compilerOptions: {
				composite: true
			},
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
			compilerOptions: {
				composite: true
			},
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
			compilerOptions: {
				composite: true
			},
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
			extends: [ browser ],
			path: './src/browser',
			references: [ '../common' ]
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
			extends: [ browser, vscodeMixin ],
			path: './src/browser',
			references: [ '../common' ]
		},
		{
			extends: [ node, vscodeMixin ],
			path: './src/node',
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
const root = {
	name: 'root',
	path: './',
	references: [ textDocument, types, jsonrpc, protocol, client, server, client_node_tests ]
}

/** @type CompilerOptions */
const defaultCompilerOptions = {
	strict: true,
	noImplicitAny: true,
	noImplicitReturns: true,
	noImplicitThis: true,
};

/** @type CompilerOptions */
const compileCompilerOptions = CompilerOptions.assign(defaultCompilerOptions, {
	'noUnusedLocals': true,
	'noUnusedParameters': true,
});

/** @type ProjectOptions */
const compileProjectOptions = {
	tsconfig: 'tsconfig.json',
	variables: new Map([['buildInfoFile', 'compile']]),
	compilerOptions: compileCompilerOptions
};

/** @type CompilerOptions */
const watchCompilerOptions = CompilerOptions.assign(defaultCompilerOptions, {
	'noUnusedLocals': false,
	'noUnusedParameters': false,
	'assumeChangesOnlyAffectDirectDependencies': true,
});

/** @type ProjectOptions */
const watchProjectOptions = {
	tsconfig: 'tsconfig.watch.json',
	variables: new Map([['buildInfoFile', 'watch']]),
	compilerOptions: watchCompilerOptions
};

/** @type CompilerOptions */
const umdCompilerOptions = {
	'incremental': true,
	'composite': true,
	'sourceMap': true,
	'declaration': true,
	'stripInternal': true,
	'target': 'es5',
	'module': 'umd',
	'lib': [ 'es2015' ],
};

/** @type ProjectOptions */
const umdProjectOptions = {
	tsconfig: 'tsconfig.json',
	variables: new Map([['target', 'umd'], ['buildInfoFile', 'compile']]),
	compilerOptions: umdCompilerOptions
};

/** @type CompilerOptions */
const esmCompilerOptions = {
	'incremental': true,
	'target': 'es5',
	'module': 'es6',
	'sourceMap': false,
	'declaration': true,
	'stripInternal': true,
	'lib': [ 'es2015' ],
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
	[ root, [ compileProjectOptions, watchProjectOptions ] ]
];

module.exports = projects;