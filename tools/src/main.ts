/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';

import * as ts from 'typescript';

import * as tss from './typescripts';
import Visitor from './visitor';

function loadConfigFile(file: string): ts.ParsedCommandLine {
	let absolute = path.resolve(file);

	let readResult = ts.readConfigFile(absolute, ts.sys.readFile);
	if (readResult.error) {
		throw new Error(ts.formatDiagnostics([readResult.error], ts.createCompilerHost({})));
	}
	let config = readResult.config;
	if (config.compilerOptions !== undefined) {
		config.compilerOptions = Object.assign(config.compilerOptions, tss.CompileOptions.getDefaultOptions(file));
	}
	let result = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(absolute));
	if (result.errors.length > 0) {
		throw new Error(ts.formatDiagnostics(result.errors, ts.createCompilerHost({})));
	}
	return result;
}

async function main(): Promise<number> {

	let config: ts.ParsedCommandLine = 	ts.parseCommandLine(ts.sys.args);
	let configFilePath: string | undefined = tss.CompileOptions.getConfigFilePath(config.options);
	if (configFilePath && config.options.project) {
		config = loadConfigFile(configFilePath);
	}

	const scriptSnapshots: Map<string, ts.IScriptSnapshot> = new Map();
	const host: ts.LanguageServiceHost = {
		getScriptFileNames: () => {
			return config.fileNames;
		},
		getCompilationSettings: () => {
			return config.options;
		},
		getProjectReferences: () => {
			return config.projectReferences;
		},
		getScriptVersion: (_fileName: string): string => {
			// The files are immutable.
			return '0';
		},
		// The project is immutable
		getProjectVersion: () => '0',
		getScriptSnapshot: (fileName: string): ts.IScriptSnapshot | undefined => {
			let result: ts.IScriptSnapshot | undefined = scriptSnapshots.get(fileName);
			if (result === undefined) {
				const content: string | undefined = ts.sys.readFile(fileName);
				if (content === undefined) {
					return undefined;
				}
				result = ts.ScriptSnapshot.fromString(content);
				scriptSnapshots.set(fileName, result);
			}
			return result;
		},
		getCurrentDirectory: () => {
			if (configFilePath !== undefined) {
				return path.dirname(configFilePath);
			} else {
				return process.cwd();
			}
		},
		getDefaultLibFileName: (options) => {
			// We need to return the path since the language service needs
			// to know the full path and not only the name which is return
			// from ts.getDefaultLibFileName
			return ts.getDefaultLibFilePath(options);
		},
		directoryExists: ts.sys.directoryExists,
		getDirectories: ts.sys.getDirectories,
		fileExists: ts.sys.fileExists,
		readFile: ts.sys.readFile,
		readDirectory: ts.sys.readDirectory,
		// this is necessary to make source references work.
		realpath: ts.sys.realpath
	};

	tss.LanguageServiceHost.useSourceOfProjectReferenceRedirect(host, () => {
		return !config.options.disableSourceOfProjectReferenceRedirect;
	});

	const languageService = ts.createLanguageService(host);
	let program = languageService.getProgram();
	if (program === undefined) {
		console.error('Couldn\'t create language service with underlying program.');
		process.exitCode = -1;
		return -1;
	}
	const visitor = new Visitor(program);
	await visitor.visitProgram();
	await visitor.endVisitProgram();

	return 0;
}

if (require.main === module) {
	main().then(undefined, (error) => {
		console.error(error);
		process.exitCode = 1;
	});
}