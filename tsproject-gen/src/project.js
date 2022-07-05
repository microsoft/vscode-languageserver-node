/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

const { CompilerOptions } = require('./types');

// @ts-check

/**
 * @typedef {import('./types').SharableOptions} SharableOptions
 * @typedef {import('./types').ProjectDescription} ProjectDescription
 * @typedef {import('./types').CompilerOptions} CompilerOptions
 * @typedef {import('./types').ProjectOptions} ProjectOptions
 * @typedef {import('./types').Projects} Projects
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
	extends: [ general ]
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
const textDocuments = {
	name: 'textDocuments',
	path: './textDocuments',
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

/** @type ProjectDescription */
const types = {
	name: 'types',
	path: './types',
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

/** @type ProjectDescription */
const jsonrpc = {
	name: 'jsonrpc',
	path: './jsonrpc',
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

/** @type ProjectDescription */
const protocol = {
	name: 'protocol',
	path: './protocol',
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

/** @type CompilerOptions */
const defaultCompilerOptions = {
	'strict': true,
	'noImplicitAny': true,
	'noImplicitReturns': true,
	'noImplicitThis': true,
};

/** @type CompilerOptions */
const compileCompilerOptions = CompilerOptions.assign(defaultCompilerOptions, {
	'noUnusedLocals': true,
	'noUnusedParameters': true,
});

/** @type ProjectOptions */
const defaultProjectOptions = {
	tsconfig: 'tsconfig.json',
	variables: new Map([['buildInfoFile', 'compile']]),
	compilerOptions: defaultCompilerOptions
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
	compilerOptions: umdCompilerOptions
};

/** @type Projects */
const projects = [
	[ textDocuments, [ umdProjectOptions, esmCompilerOptions ] ],
	[ types, [ umdCompilerOptions, esmCompilerOptions ] ],
	[ jsonrpc, [ defaultProjectOptions, watchProjectOptions ] ]
];

module.exports = projects;