/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

// @ts-check

import { CompilerOptions } from '@vscode/tsconfig-gen';

/**
 * @typedef {import('@vscode/tsconfig-gen').SharableOptions} SharableOptions
 * @typedef {import('@vscode/tsconfig-gen').ProjectDescription} ProjectDescription
 * @typedef {import('@vscode/tsconfig-gen').ProjectOptions} ProjectOptions
 * @typedef {import('@vscode/tsconfig-gen').Projects} Projects
 */

/**
 * Creates a publish project description from a normal project description by removing
 * any project reference from it since it has to come via a npm dependency during publish.
 *
 * @param {ProjectDescription} projectDescription The project description
 * @returns {ProjectDescription} The project description without project references
 */
function createPublishProjectDescription(projectDescription) {
	const result = Object.assign({}, projectDescription);
	delete result.references;
	return result;
}

/** @type SharableOptions */
const general = {
	/**
	 * Even under browser we compile to node and commonjs and
	 * rely on webpack to package everything correctly.
	 */
	compilerOptions: {
		module: 'node16',
		moduleResolution: 'node16'
	}
};

/** @type SharableOptions */
const testMixin = {
	compilerOptions: {
		types: ['mocha']
	}
};

/** @type SharableOptions */
const skipLibCheckMixin = {
	compilerOptions: {
		skipLibCheck: true
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
		rootDir: '.',
		types: [],
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
				dir: '../lib',
				buildInfoFile: '../lib/${buildInfoFile}.tsbuildInfo'
			},
			exclude: [ 'test' ]
		},
		{
			path: './src/test',
			extends: [ common, testMixin ],
			out: {
				dir: '../../lib/test',
				buildInfoFile: '../../lib/test/${buildInfoFile}.tsbuildInfo'
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
				dir: '../lib',
				buildInfoFile: '../lib/${buildInfoFile}.tsbuildInfo'
			},
			exclude: [ 'test' ]
		},
		{
			path: './src/test',
			extends: [ common, testMixin ],
			out: {
				dir: '../../lib/test',
				buildInfoFile: '../../lib/test/${buildInfoFile}.tsbuildInfo'
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
};

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
};


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
			extends: [ node, vscodeMixin, testMixin, browser, skipLibCheckMixin ],
		}
	],
	references: [ protocol, client, server ]
};

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
};

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
};

/** @type ProjectDescription */
const root = {
	name: 'root',
	path: './',
	references: [ textDocument, types, jsonrpc, protocol, client, server, client_node_tests, tools, tsconfig_gen ]
};

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
	sourceMap: true,
	declarationMap: true,
	noUnusedLocals: true,
	noUnusedParameters: true,
	target: 'es2022',
	lib: [ 'es2023' ],
});

/** @type ProjectOptions */
const compileProjectOptions = {
	tags: ['compile'],
	tsconfig: 'tsconfig.json',
	variables: new Map([['buildInfoFile', 'compile']]),
	compilerOptions: compileCompilerOptions
};

/** @type CompilerOptions */
const watchCompilerOptions = CompilerOptions.assign(defaultCompilerOptions, {
	sourceMap: true,
	declarationMap: true,
	noUnusedLocals: false,
	noUnusedParameters: false,
	assumeChangesOnlyAffectDirectDependencies: true,
	target: 'es2022',
	lib: [ 'es2023' ],
});

/** @type ProjectOptions */
const watchProjectOptions = {
	tags: ['watch'],
	tsconfig: 'tsconfig.watch.json',
	variables: new Map([['buildInfoFile', 'watch']]),
	compilerOptions: watchCompilerOptions
};

/** @type CompilerOptions */
const publishCompilerOptions = CompilerOptions.assign(defaultCompilerOptions, {
	sourceMap: false,
	declarationMap: false,
	noUnusedLocals: true,
	noUnusedParameters: true,
	target: 'es2022',
	lib: [ 'es2023' ]

});

/** @type ProjectOptions */
const publishProjectOptions = {
	tags: ['publish'],
	tsconfig: 'tsconfig.publish.json',
	variables: new Map([['buildInfoFile', 'publish']]),
	compilerOptions: publishCompilerOptions
};

/** @type Projects */
const projects = [
	[ textDocument, [ compileProjectOptions, watchProjectOptions ] ],
	[ createPublishProjectDescription(textDocument), [ publishProjectOptions ] ],
	[ types, [ compileProjectOptions, watchProjectOptions ] ],
	[ createPublishProjectDescription(types), [ publishProjectOptions ] ],
	[ jsonrpc, [ compileProjectOptions, watchProjectOptions ] ],
	[ createPublishProjectDescription(jsonrpc), [ publishProjectOptions ] ],
	[ protocol, [ compileProjectOptions, watchProjectOptions ] ],
	[ createPublishProjectDescription(protocol), [ publishProjectOptions ] ],
	[ server, [ compileProjectOptions, watchProjectOptions ] ],
	[ createPublishProjectDescription(server), [ publishProjectOptions ] ],
	[ client, [ compileProjectOptions, watchProjectOptions ] ],
	[ createPublishProjectDescription(client), [ publishProjectOptions ] ],
	[ client_node_tests, [ compileProjectOptions, watchProjectOptions ] ],
	[ createPublishProjectDescription(client_node_tests), [ publishProjectOptions ] ],
	[ tools, [ compileProjectOptions, watchProjectOptions ] ],
	[ tsconfig_gen, [ compileProjectOptions, watchProjectOptions ] ],
	[ createPublishProjectDescription(tsconfig_gen), [ publishProjectOptions ] ],
	[ root, [ compileProjectOptions, watchProjectOptions ] ],
];

export default projects;