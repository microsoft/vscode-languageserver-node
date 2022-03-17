/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as ts from 'typescript';

import { Symbols, Type } from './typescripts';

import { Type as JsonType, Request as JsonRequest, Notification as JsonNotification, Structure, Property } from './metamodel';

type TypeInfoKind = 'single' | 'array' | 'union' | 'intersection' | 'void' | 'never' | 'unknown' | 'null' | 'undefined' | 'any';

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
	kind: 'void' | 'never' | 'unknown' | 'null' | 'undefined' | 'any';
});

namespace TypeInfo {
	export function asJsonType(info: TypeInfo): JsonType {
		switch (info.kind) {
			case 'single':
				return info.name;
			case 'array':
				return { array: asJsonType(info.elementType) };
			case 'union':
				return { or: info.items.map(info => asJsonType(info)) };
			case 'intersection':
				return { and: info.items.map(info => asJsonType(info)) };
			case 'null':
				return 'null';
			case 'void':
				return 'void';
		}
		throw new Error(`Can't convert type info ${JSON.stringify(info, undefined, 0)}`);
	}
}

type RequestTypes = {
	param?: TypeInfo;
	result: TypeInfo;
	partialResult: TypeInfo;
	errorData: TypeInfo;
	registrationOptions: TypeInfo;
};

type NotificationTypes = {
	param?: TypeInfo;
	registrationOptions: TypeInfo;
};


export default class Visitor {

	private readonly program: ts.Program;
	private readonly typeChecker: ts.TypeChecker;
	private readonly symbols: Symbols;

	private readonly requests: JsonRequest[];
	private readonly notifications: JsonNotification[];
	private readonly structures: Structure[];
	private readonly structureQueue: Map<string, ts.Symbol>;
	private readonly processedStructures: Map<string, ts.Symbol>;

	constructor(program: ts.Program) {
		this.program = program;
		this.typeChecker = this.program.getTypeChecker();
		this.symbols = new Symbols(this.typeChecker);
		this.requests = [];
		this.notifications = [];
		this.structures = [];
		this.structureQueue = new Map();
		this.processedStructures = new Map();
	}

	public async visitProgram(): Promise<void> {
		for (const sourceFile of this.getSourceFilesToIndex()) {
			this.visit(sourceFile);
		}
	}

	public async endVisitProgram(): Promise<void> {
		while (this.structureQueue.size > 0) {
			const toProcess = new Map(this.structureQueue);
			for (const entry of toProcess) {
				const structure = this.createStructure(entry[0], entry[1]);
				if (structure === undefined) {
					console.error(`Can't create structure for type ${entry[0]}`);
				} else {
					this.structures.push(structure);
				}
				this.structureQueue.delete(entry[0]);
				this.processedStructures.set(entry[0], entry[1]);
			}
		}
		console.log(JSON.stringify({
			requests: this.requests,
			notifications: this.notifications,
			structures: this.structures
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
			const request = this.visitRequest(node);
			if (request === undefined) {
				console.error(`Creating meta data for request ${identifier} failed.`);
			} else {
				this.requests.push(request);
			}
		} else if (identifier.endsWith('Notification')) {
			const notification = this.visitNotification(node);
			if (notification === undefined) {
				console.error(`Creating meta data for notification ${identifier} failed.`);
			} else {
				this.notifications.push(notification);
			}
		}
		return true;
	}

	private visitRequest(node: ts.ModuleDeclaration): JsonRequest | undefined {
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
		const requestTypes = this.getRequestTypes(type);
		if (requestTypes === undefined) {
			return;
		}
		requestTypes.param && this.queueTypeInfo(requestTypes.param);
		this.queueTypeInfo(requestTypes.result);
		this.queueTypeInfo(requestTypes.partialResult);
		this.queueTypeInfo(requestTypes.errorData);
		this.queueTypeInfo(requestTypes.registrationOptions);
		const asJsonType = (info: TypeInfo) => {
			if (info.kind === 'void' || info.kind === 'undefined' || info.kind === 'never' || info.kind === 'unknown') {
				return undefined;
			}
			return TypeInfo.asJsonType(info);
		};
		const result: JsonRequest = { method: methodName, result: requestTypes.result.kind === 'void' ? 'null' : TypeInfo.asJsonType(requestTypes.result) };
		result.params = requestTypes.param !== undefined ? asJsonType(requestTypes.param) : undefined;
		result.partialResult = asJsonType(requestTypes.partialResult);
		result.errorData = asJsonType(requestTypes.errorData);
		result.registrationOptions = asJsonType(requestTypes.registrationOptions);
		return result;
	}

	private visitNotification(node: ts.ModuleDeclaration): JsonNotification | undefined {
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
		const notificationTypes = this.getNotificationTypes(type);
		if (notificationTypes === undefined) {
			return undefined;
		}
		notificationTypes.param && this.queueTypeInfo(notificationTypes.param);
		this.queueTypeInfo(notificationTypes.registrationOptions);
		const asJsonType = (info: TypeInfo) => {
			if (info.kind === 'void' || info.kind === 'undefined' || info.kind === 'never' || info.kind === 'unknown') {
				return undefined;
			}
			return TypeInfo.asJsonType(info);
		};
		const result: JsonNotification = { method: methodName };
		result.params = notificationTypes.param !== undefined ? asJsonType(notificationTypes.param) : undefined;
		result.registrationOptions = asJsonType(notificationTypes.registrationOptions);
		return result;
	}

	private queueTypeInfo(typeInfo: TypeInfo): void {
		if (typeInfo.kind === 'single') {
			this.queueSymbol(typeInfo.name, typeInfo.symbol);
		} else if (typeInfo.kind === 'array') {
			this.queueTypeInfo(typeInfo.elementType);
		} else if (typeInfo.kind === 'union' || typeInfo.kind === 'intersection') {
			typeInfo.items.forEach(item => this.queueTypeInfo(item));
		}
	}

	private queueSymbol(name: string, symbol: ts.Symbol): void {
		if (name !== symbol.getName()) {
			throw new Error(`Diferent symbol names [${name}, ${symbol.getName()}]`);
		}
		const existing = this.structureQueue.get(name) ?? this.processedStructures.get(name);
		if (existing === undefined) {
			const aliased = Symbols.isAliasSymbol(symbol) ? this.typeChecker.getAliasedSymbol(symbol) : undefined;
			if (aliased !== undefined && aliased.getName() !== symbol.getName()) {
				throw new Error(`The symbol ${symbol.getName()} has a different name than the aliased symbol ${aliased.getName()}`);
			}
			this.structureQueue.set(name, aliased ?? symbol);
		} else {
			const left = Symbols.isAliasSymbol(symbol) ? this.typeChecker.getAliasedSymbol(symbol) : symbol;
			const right = Symbols.isAliasSymbol(existing) ? this.typeChecker.getAliasedSymbol(existing) : existing;
			if (this.symbols.createKey(left) !== this.symbols.createKey(right)) {
				throw new Error(`The type ${name} has two different declarations`);
			}
		}
	}

	private endVisitModuleDeclaration(_node: ts.ModuleDeclaration): void {
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
			if (initializer === undefined || (!ts.isStringLiteral(initializer) && !ts.isNoSubstitutionTemplateLiteral(initializer))) {
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
		if (typeInfos.length !== initializer.typeArguments.length) {
			return undefined;
		}
		switch (initializer.typeArguments.length) {
			case 4:
				return { result: typeInfos[0], partialResult: typeInfos[1], errorData: typeInfos[2], registrationOptions: typeInfos[3] };
			case 5:
				return { param: typeInfos[0], result: typeInfos[1], partialResult: typeInfos[2], errorData: typeInfos[3], registrationOptions: typeInfos[4] };
		}
		return undefined;
	}

	private getNotificationTypes(symbol: ts.Symbol): NotificationTypes | undefined {
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
		if (typeInfos.length !== initializer.typeArguments.length) {
			return undefined;
		}
		switch (initializer.typeArguments.length) {
			case 1:
				return { registrationOptions: typeInfos[0] };
			case 2:
				return { param: typeInfos[0], registrationOptions: typeInfos[1] };
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
		} else if (ts.isParenthesizedTypeNode(typeNode)) {
			return this.getTypeInfo(typeNode.type);
		} else if (ts.isLiteralTypeNode(typeNode)) {
			return this.getLiteralType(typeNode.literal);
		}
		return this.getLiteralType(typeNode);
	}

	private getLiteralType(node: ts.Node): { kind: 'void' | 'never' | 'unknown' | 'null' | 'undefined' | 'any' } | undefined {
		switch (node.kind){
			case ts.SyntaxKind.NullKeyword:
				return { kind: 'null' };
			case ts.SyntaxKind.UnknownKeyword:
				return { kind: 'unknown' };
			case ts.SyntaxKind.NeverKeyword:
				return { kind: 'never' };
			case ts.SyntaxKind.VoidKeyword:
				return { kind: 'void' };
			case ts.SyntaxKind.UndefinedKeyword:
				return { kind: 'undefined' };
			case ts.SyntaxKind.AnyKeyword:
				return { kind: 'any' };
		}
		return undefined;
	}

	private getDeclaration(symbol: ts.Symbol): ts.Node | undefined {
		const declarations = symbol.getDeclarations();
		return declarations === undefined || declarations.length !== 1 ? undefined : declarations[0];
	}

	private createStructure(name: string, symbol: ts.Symbol): Structure | undefined {
		const result: Structure = { name: name, properties: [] };
		if (Symbols.isInterface(symbol)) {
			const baseTypes = this.symbols.computeBaseSymbolsForInterface(symbol);
			if (baseTypes !== undefined) {
				const extend: string[] = [];
				const mixin: string[] = [];
				for (const base of baseTypes) {
					const name = base.getName();
					if (base.getName() === 'TextDocumentPositionParams') {
						extend.push(name);
					} else {
						mixin.push(name);
					}
				}
				if (extend.length > 0) {
					result.extends = extend;
				}
				if (mixin.length > 0) {
					result.mixins = mixin;
				}
			}
		}
		const declaration = this.getDeclaration(symbol);
		if (declaration !== undefined) {
			const type = this.typeChecker.getTypeOfSymbolAtLocation(symbol, declaration);
			const members = this.typeChecker.getPropertiesOfType(type);
			for (const member of members) {
				const declaration = this.getDeclaration(member);
				if (declaration !== undefined) {
					const type = this.typeChecker.getTypeOfSymbolAtLocation(member, declaration);
					result.properties.push({
						name: member.getName(),
						type: this.typeChecker.typeToString(type)
					});
					const typeSymbol = type.symbol;
					if (typeSymbol !== undefined) {
						this.queueSymbol(typeSymbol.getName(), typeSymbol);
					}
				}
			}
		}
		return result;
	}
}