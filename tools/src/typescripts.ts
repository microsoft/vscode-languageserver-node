/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import * as crypto from 'crypto';

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

interface InternalSymbol extends ts.Symbol {
	parent?: ts.Symbol;
	containingType?: ts.UnionOrIntersectionType;
	__symbol__data__key__: string | undefined;
}

export class Symbols {

	private readonly typeChecker: ts.TypeChecker;

	constructor(typeChecker: ts.TypeChecker) {
		this.typeChecker = typeChecker;
	}

	public static readonly Unknown = 'unknown';
	public static readonly Undefined = 'undefined';
	public static readonly None = 'none';

	public static isClass(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.getFlags() & ts.SymbolFlags.Class) !== 0;
	}

	public static isInterface(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.getFlags() & ts.SymbolFlags.Interface) !== 0;
	}

	public static isTypeLiteral(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.getFlags() & ts.SymbolFlags.TypeLiteral) !== 0;
	}

	public static isAliasSymbol(symbol: ts.Symbol): boolean  {
		return symbol !== undefined && (symbol.getFlags() & ts.SymbolFlags.Alias) !== 0;
	}

	public static isTypeAlias(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.getFlags() & ts.SymbolFlags.TypeAlias) !== 0;
	}

	public static isPrototype(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.getFlags() & ts.SymbolFlags.Prototype) !== 0;
	}

	public static isRegularEnum(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.getFlags() & ts.SymbolFlags.RegularEnum) !== 0;
	}

	public static isProperty(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.getFlags() & ts.SymbolFlags.Property) !== 0;
	}

	public static isOptional(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.getFlags() & ts.SymbolFlags.Optional) !== 0;
	}

	public static getParent(symbol: ts.Symbol): ts.Symbol | undefined {
		return (symbol as InternalSymbol).parent;
	}

	public createKey(symbol: ts.Symbol): string {
		let result: string | undefined = (symbol as InternalSymbol).__symbol__data__key__;
		if (result !== undefined) {
			return result;
		}
		const declarations = symbol.getDeclarations();
		if (declarations === undefined) {
			if (this.typeChecker.isUnknownSymbol(symbol)) {
				return Symbols.Unknown;
			} else if (this.typeChecker.isUndefinedSymbol(symbol)) {
				return Symbols.Undefined;
			} else {
				return Symbols.None;
			}
		}
		const fragments: { f: string; s: number; e: number; k: number }[] = [];
		for (const declaration of declarations) {
			fragments.push({
				f: declaration.getSourceFile().fileName,
				s: declaration.getStart(),
				e: declaration.getEnd(),
				k: declaration.kind
			});
		}
		if (fragments.length > 1) {
			fragments.sort((a, b) => {
				let result = a.f < b.f ? -1 : (a.f > b.f ? 1 : 0);
				if (result !== 0) {
					return result;
				}
				result = a.s - b.s;
				if (result !== 0) {
					return result;
				}
				result = a.e - b.e;
				if (result !== 0) {
					return result;
				}
				return a.k - b.k;
			});
		}
		const hash = crypto.createHash('md5');
		if ((symbol.flags & ts.SymbolFlags.Transient) !== 0) {
			hash.update(JSON.stringify({ trans: true }, undefined, 0));
		}
		hash.update(JSON.stringify(fragments, undefined, 0));
		result = hash.digest('base64');
		(symbol as InternalSymbol).__symbol__data__key__ = result;
		return result;
	}

	public computeBaseSymbolsForClass(symbol: ts.Symbol): ts.Symbol[] | undefined {
		const result: ts.Symbol[] = [];
		const declarations = symbol.getDeclarations();
		if (declarations === undefined) {
			return undefined;
		}
		const typeChecker = this.typeChecker;
		for (const declaration of declarations) {
			if (ts.isClassDeclaration(declaration)) {
				const heritageClauses = declaration.heritageClauses;
				if (heritageClauses) {
					for (const heritageClause of heritageClauses) {
						for (const type of heritageClause.types) {
							const tsType = typeChecker.getTypeAtLocation(type.expression);
							if (tsType !== undefined) {
								const baseSymbol = tsType.getSymbol();
								if (baseSymbol !== undefined && baseSymbol !== symbol) {
									result.push(baseSymbol);
								}
							}
						}
					}
				}
			}
		}
		return result.length === 0 ? undefined : result;
	}

	public computeBaseSymbolsForInterface(symbol: ts.Symbol): ts.Symbol[] | undefined {
		const result: ts.Symbol[] = [];
		const tsType = this.typeChecker.getDeclaredTypeOfSymbol(symbol);
		if (tsType === undefined) {
			return undefined;
		}
		const baseTypes = tsType.getBaseTypes();
		if (baseTypes !== undefined) {
			for (const base of baseTypes) {
				const symbol = base.getSymbol();
				if (symbol) {
					result.push(symbol);
				}
			}
		}
		return result.length === 0 ? undefined : result;
	}

	public getTypeOfSymbol(symbol: ts.Symbol): ts.Type {
		if (Symbols.isTypeAlias(symbol) || Symbols.isInterface(symbol)) {
			return this.typeChecker.getDeclaredTypeOfSymbol(symbol);
		}
		const location = this.inferLocationNode(symbol);
		if (location !== undefined) {
			return this.typeChecker.getTypeOfSymbolAtLocation(symbol, location);
		} else {
			return this.typeChecker.getDeclaredTypeOfSymbol(symbol);
		}
	}

	private inferLocationNode(symbol: ts.Symbol): ts.Node | undefined {
		const declarations = symbol.declarations;
		if (declarations !== undefined && declarations.length > 0) {
			return declarations[0];
		}
		if (Symbols.isPrototype(symbol)) {
			const parent = Symbols.getParent(symbol);
			if (parent !== undefined) {
				return this.inferLocationNode(parent);
			}
		}
		return undefined;
	}
}