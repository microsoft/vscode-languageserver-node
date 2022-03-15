/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';

import * as ts from 'typescript';

const isWindows = process.platform === 'win32';
function normalizePath(value: string): string {
	if (isWindows) {
		value = value.replace(/\\/g, '/');
		if (/^[a-z]:/.test(value)) {
			value = value.charAt(0).toUpperCase() + value.substring(1);
		}
	}
	const result = path.posix.normalize(value);
	return result.length > 0 && result.charAt(result.length - 1) === '/' ? result.substr(0, result.length - 1) : result;
}

function makeAbsolute(p: string, root?: string): string {
	if (path.isAbsolute(p)) {
		return normalizePath(p);
	}
	if (root === undefined) {
		return normalizePath(path.join(process.cwd(), p));
	} else {
		return normalizePath(path.join(root, p));
	}
}

interface InternalCompilerOptions extends ts.CompilerOptions {
	configFilePath?: string;
}

export namespace CompileOptions {
	export function getConfigFilePath(options: ts.CompilerOptions): string | undefined {
		if (options.project) {
			const projectPath = path.resolve(options.project);
			if (ts.sys.directoryExists(projectPath)) {
				return normalizePath(path.join(projectPath, 'tsconfig.json'));
			} else {
				return normalizePath(projectPath);
			}
		}
		const result = (options as InternalCompilerOptions).configFilePath;
		return result && makeAbsolute(result);
	}

	export function getDefaultOptions(configFileName?: string) {
		const options: ts.CompilerOptions = configFileName && path.basename(configFileName) === 'jsconfig.json'
			? { allowJs: true, maxNodeModuleJsDepth: 2, allowSyntheticDefaultImports: true, skipLibCheck: true, noEmit: true }
			: {};
		return options;
	}
}


interface InternalLanguageServiceHost extends ts.LanguageServiceHost {
	useSourceOfProjectReferenceRedirect?(): boolean;
}

export namespace LanguageServiceHost {
	export function useSourceOfProjectReferenceRedirect(host: ts.LanguageServiceHost, value: () => boolean): void {
		(host as InternalLanguageServiceHost).useSourceOfProjectReferenceRedirect = value;
	}
}

export namespace Type {
	export function isObjectType(type: ts.Type): type is ts.ObjectType {
		return (type.flags & ts.TypeFlags.Object) !== 0;
	}

	export function isTypeReference(type: ts.ObjectType): type is ts.TypeReference {
		return (type.objectFlags & ts.ObjectFlags.Reference) !== 0;
	}

	export function isVoidType(type: ts.Type): type is ts.Type {
		return (type.flags & ts.TypeFlags.Void) !== 0;
	}

	export function isNullType(type: ts.Type): boolean {
		return (type.flags & ts.TypeFlags.Null) !== 0;
	}

	export function isUndefinedType(type: ts.Type): boolean {
		return (type.flags & ts.TypeFlags.Undefined) !== 0;
	}
}