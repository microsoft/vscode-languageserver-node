/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as ts from 'typescript';

import * as tss from './typescripts';

import { Type as JsonType, Request as JsonRequest, Notification as JsonNotification, Type } from './metamodel';

type TypeInfoKind = 'single' | 'array' | 'union' | 'intersection' | 'void' | 'never' | 'unknown' | 'null' | 'undefined';

type TypeInfo =
{
	kind: TypeInfoKind;
} &
({
	kind: 'single';
	name: string;
	symbol: ts.Symbol;
} | {
	kind: 'array';
	elementType: TypeInfo;
} | {
	kind: 'union';
	items: TypeInfo[];
} | {
	kind: 'intersection';
	items: TypeInfo[];
} | {
	kind: 'void' | 'never' | 'unknown' | 'null' | 'undefined';
});

type RequestTypes = {
	param?: TypeInfo;
	result: TypeInfo;
	partialResult: TypeInfo;
	errorData: TypeInfo;
	registrationOptions: TypeInfo;
};

export default class Visitor {

	private readonly program: ts.Program;
	private readonly typeChecker: ts.TypeChecker;

	private readonly requests: JsonRequest[];
	private readonly notifications: JsonNotification[];

	constructor(program: ts.Program) {
		this.program = program;
		this.typeChecker = this.program.getTypeChecker();
		this.requests = [];
		this.notifications = [];
	}

	public async visitProgram(): Promise<void> {
		for (const sourceFile of this.getSourceFilesToIndex()) {
			this.visit(sourceFile);
		}
	}

	public async endVisitProgram(): Promise<void> {
		console.log(JSON.stringify({
			requests: this.requests,
			notifications: this.notifications
		}, undefined, '\t'));
	}

	protected visit(node: ts.Node): void {
		switch (node.kind) {
			case ts.SyntaxKind.ModuleDeclaration:
				this.doVisit(this.visitModuleDeclaration, this.endVisitModuleDeclaration, node as ts.ModuleDeclaration);
				break;
			default:
				this.doVisit(this.visitGeneric, this.endVisitGeneric, node);
				break;
		}
	}

	private doVisit<T extends ts.Node>(visit: (node: T) => boolean, endVisit: (node: T) => void, node: T): void {
		if (visit.call(this, node)) {
			node.forEachChild(child => this.visit(child));
		}
		endVisit.call(this, node);
	}

	private visitGeneric(_node: ts.Node): boolean {
		return true;
	}

	private endVisitGeneric(_node: ts.Node): void {
	}

	private visitModuleDeclaration(node: ts.ModuleDeclaration): boolean {
		const identifier = node.name.getText();
		// We have a request or notification definition.
		if (identifier.endsWith('Request')) {
			this.visitRequest(node);
		} else if (identifier.endsWith('Notification')) {
			this.visitNotification(node);
		}
		return true;
	}

	private visitNotification(node: ts.ModuleDeclaration): void {
		const symbol = this.typeChecker.getSymbolAtLocation(node.name);
		if (symbol === undefined) {
			return;
		}
	}

	private visitRequest(node: ts.ModuleDeclaration): void {
		const symbol = this.typeChecker.getSymbolAtLocation(node.name);
		if (symbol === undefined) {
			return;
		}
		const type = symbol.exports?.get('type' as ts.__String);
		if (type === undefined) {
			return;
		}
		const methodName = this.getMethodName(symbol, type);
		if (methodName === undefined) {
			return;
		}
		console.log(methodName);
		const requestTypes = this.getRequestTypes(type);
		if (requestTypes === undefined) {
			return;
		}
	}

	private endVisitModuleDeclaration(node: ts.ModuleDeclaration): void {
	}

	private getSourceFilesToIndex(): ReadonlyArray<ts.SourceFile> {
		const result: ts.SourceFile[] = [];
		for (const sourceFile of this.program.getSourceFiles()) {
			if (this.program.isSourceFileFromExternalLibrary(sourceFile) || this.program.isSourceFileDefaultLibrary(sourceFile)) {
				continue;
			}
			result.push(sourceFile);
		}
		return result;
	}

	private getMethodName(namespace: ts.Symbol, type: ts.Symbol): string | undefined {
		const method = namespace.exports?.get('method' as ts.__String);
		let text: string;
		if (method !== undefined) {
			const declaration = this.getDeclaration(method);
			if (declaration === undefined) {
				return undefined;
			}
			if (!ts.isVariableDeclaration(declaration)) {
				return undefined;
			}
			const initializer = declaration.initializer;
			if (initializer === undefined || !ts.isStringLiteral(initializer)) {
				return undefined;
			}
			text = initializer.getText();
		} else {
			const declaration = this.getDeclaration(type);
			if (declaration === undefined) {
				return undefined;
			}
			if (!ts.isVariableDeclaration(declaration)) {
				return undefined;
			}
			const initializer = declaration.initializer;
			if (initializer === undefined || !ts.isNewExpression(initializer)) {
				return undefined;
			}
			const args = initializer.arguments;
			if (args === undefined || args.length < 1) {
				return undefined;
			}
			text = args[0].getText();
		}
		return text.substring(1, text.length - 1);
	}

	private getRequestTypes(symbol: ts.Symbol): RequestTypes | undefined {
		const declaration = this.getDeclaration(symbol);
		if (declaration === undefined) {
			return undefined;
		}
		if (!ts.isVariableDeclaration(declaration)) {
			return;
		}
		const initializer = declaration.initializer;
		if (initializer === undefined || !ts.isNewExpression(initializer)) {
			return undefined;
		}
		if (initializer.typeArguments === undefined) {
			return undefined;
		}
		const typeInfos: TypeInfo[] = [];
		for (const typeNode of initializer.typeArguments) {
			const info = this.getTypeInfo(typeNode);
			if (info === undefined) {
				return undefined;
			}
			typeInfos.push(info);
		}
		return undefined;
	}

	private getTypeInfo(typeNode: ts.TypeNode): TypeInfo | undefined {
		if (ts.isTypeReferenceNode(typeNode)) {
			const symbol = this.typeChecker.getSymbolAtLocation(typeNode.typeName);
			if (symbol === undefined) {
				return undefined;
			}
			const typeName = ts.isIdentifier(typeNode.typeName) ? typeNode.typeName.text : typeNode.typeName.right.text;
			return { kind: 'single', name: typeName, symbol };
		} else if (ts.isArrayTypeNode(typeNode)) {
			const elementType = this.getTypeInfo(typeNode.elementType);
			if (elementType === undefined) {
				return undefined;
			}
			return { kind: 'array', elementType: elementType };
		} else if (ts.isUnionTypeNode(typeNode)) {
			const items: TypeInfo[] = [];
			for (const item of typeNode.types) {
				const typeInfo = this.getTypeInfo(item);
				if (typeInfo === undefined) {
					return undefined;
				}
				items.push(typeInfo);
			}
			return { kind: 'union', items };
		} else if (ts.isIntersectionTypeNode(typeNode)) {
			const items: TypeInfo[] = [];
			for (const item of typeNode.types) {
				const typeInfo = this.getTypeInfo(item);
				if (typeInfo === undefined) {
					return undefined;
				}
				items.push(typeInfo);
			}
			return { kind: 'intersection', items };
		}
		return undefined;
	}

	private getDeclaration(symbol: ts.Symbol): ts.Node | undefined {
		const declarations = symbol.getDeclarations();
		return declarations === undefined || declarations.length !== 1 ? undefined : declarations[0];
	}

	private getJsonType(type: ts.Type): JsonType | undefined {
		const indexInfo = this.typeChecker.getIndexInfoOfType(type, ts.IndexKind.Number);
		if (indexInfo !== undefined) {
			const elementType = this.getJsonType(indexInfo.type);
			return elementType !== undefined ? { array: elementType } : undefined;
		} else if (type.aliasSymbol !== undefined) {
			return type.aliasSymbol.getName();
		} else if (type.isUnion()) {
			const jsonTypes: JsonType[] = [];
			for (const item of type.types) {
				const jsonType = this.getJsonType(item);
				if (jsonType !== undefined) {
					jsonTypes.push(jsonType);
				}
			}
			return { or: jsonTypes };
		} else if (type.isIntersection()) {
			const jsonTypes: JsonType[] = [];
			for (const item of type.types) {
				const jsonType = this.getJsonType(item);
				if (jsonType !== undefined) {
					jsonTypes.push(jsonType);
				}
			}
			return { and: jsonTypes };
		} else if (tss.Type.isNullType(type)) {
			return 'null';
		}
		const symbol = type.getSymbol();
		if (symbol === undefined) {
			return undefined;
		}
		return symbol.getName();
	}
}