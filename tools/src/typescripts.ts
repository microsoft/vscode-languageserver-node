/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as crypto from 'crypto';

import * as ts from 'typescript-7/unstable/sync';
import { SyntaxKind, ClassDeclaration, Node } from 'typescript-7/unstable/ast';

interface InternalSymbol extends ts.Symbol {
	__symbol__data__key__: string | undefined;
}

export class Symbols {

	private readonly project: ts.Project;
	private readonly typeChecker: ts.Checker;

	constructor(project: ts.Project, typeChecker: ts.Checker) {
		this.project = project;
		this.typeChecker = typeChecker;
	}

	public static readonly Unknown = 'unknown';
	public static readonly Undefined = 'undefined';
	public static readonly None = 'none';

	public static isClass(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.flags & ts.SymbolFlags.Class) !== 0;
	}

	public static isInterface(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.flags & ts.SymbolFlags.Interface) !== 0;
	}

	public static isTypeLiteral(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.flags & ts.SymbolFlags.TypeLiteral) !== 0;
	}

	public static isAliasSymbol(symbol: ts.Symbol): boolean  {
		return symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0;
	}

	public static isTypeAlias(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.flags & ts.SymbolFlags.TypeAlias) !== 0;
	}

	public static isPrototype(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.flags & ts.SymbolFlags.Prototype) !== 0;
	}

	public static isRegularEnum(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.flags & ts.SymbolFlags.RegularEnum) !== 0;
	}

	public static isProperty(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.flags & ts.SymbolFlags.Property) !== 0;
	}

	public static isOptional(symbol: ts.Symbol): boolean {
		return symbol !== undefined && (symbol.flags & ts.SymbolFlags.Optional) !== 0;
	}

	public static getParent(symbol: ts.Symbol): ts.Symbol | undefined {
		return (symbol as InternalSymbol).getParent();
	}

	public createKey(symbol: ts.Symbol): string {
		let result: string | undefined = (symbol as InternalSymbol).__symbol__data__key__;
		if (result !== undefined) {
			return result;
		}
		const declarations = symbol.declarations;
		if (declarations === undefined) {
			if (this.typeChecker.isUnknownSymbol(symbol)) {
				return Symbols.Unknown;
			} else if (this.typeChecker.isUndefinedSymbol(symbol)) {
				return Symbols.Undefined;
			} else {
				return Symbols.None;
			}
		}
		const fragments: { p: string; i: number; k: number }[] = [];
		for (const declaration of declarations) {
			fragments.push({
				p: declaration.path,
				i: declaration.index,
				k: declaration.kind
			});
		}
		if (fragments.length > 1) {
			fragments.sort((a, b) => {
				let result = a.p < b.p ? -1 : (a.p > b.p ? 1 : 0);
				if (result !== 0) {
					return result;
				}
				return a.i - b.i;
			});
		}
		const hash = crypto.createHash('sha256');
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
		const declarations = symbol.declarations;
		if (declarations === undefined) {
			return undefined;
		}
		const typeChecker = this.typeChecker;
		for (const declaration of declarations) {
			if (declaration.kind !== SyntaxKind.ClassDeclaration) {
				continue;
			}
			const classDeclaration = declaration.resolve() as ClassDeclaration;
			const heritageClauses = classDeclaration.heritageClauses;
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
			return this.typeChecker.getDeclaredTypeOfSymbol(symbol)!;
		}
		const location = this.inferLocationNode(symbol);
		if (location !== undefined) {
			return this.typeChecker.getTypeOfSymbolAtLocation(symbol, location)!;
		} else {
			return this.typeChecker.getDeclaredTypeOfSymbol(symbol)!;
		}
	}

	private inferLocationNode(symbol: ts.Symbol): Node | undefined {
		const declarations = symbol.declarations;
		if (declarations !== undefined && declarations.length > 0) {
			return declarations[0].resolve();
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