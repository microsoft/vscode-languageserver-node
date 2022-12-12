/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as ts from 'typescript';

import { Symbols } from './typescripts';

import { Type as JsonType, Request as JsonRequest, Notification as JsonNotification, Structure, Property, StructureLiteral, BaseTypes, TypeAlias, MetaModel, Enumeration, EnumerationEntry, EnumerationType, MessageDirection } from './metaModel';
import path = require('path');

const LSPBaseTypes = new Set(['URI', 'DocumentUri', 'integer', 'uinteger', 'decimal']);
type BaseTypeInfoKind = 'string' | 'boolean' | 'URI' | 'DocumentUri' | 'integer' | 'uinteger' | 'decimal' | 'void' | 'never' | 'unknown' | 'null' | 'undefined' | 'any' | 'object';

export type TypeInfoKind = 'base' | 'reference' | 'array' | 'map' | 'intersection' | 'union' | 'tuple' | 'literal' | 'stringLiteral' | 'integerLiteral' | 'booleanLiteral';

type MapKeyType = { kind: 'base'; name: 'URI' | 'DocumentUri' | 'string' | 'integer' } | { kind: 'reference'; name: string; symbol: ts.Symbol };
namespace MapKeyType {
	export function is(value: TypeInfo): value is MapKeyType {
		return value.kind === 'reference' || (value.kind === 'base' && (value.name === 'string' || value.name === 'integer' || value.name === 'DocumentUri' || value.name === 'URI'));
	}
}
type LiteralInfo = { type: TypeInfo; optional: boolean; documentation?: string; since?: string; proposed?: boolean };

type TypeInfo =
{
	kind: TypeInfoKind;
} &
({
	kind: 'base';
	name: BaseTypeInfoKind;
} | {
	kind: 'reference';
	name: string;
	symbol: ts.Symbol;
} | {
	kind: 'array';
	elementType: TypeInfo;
} | {
	kind: 'map';
	key: MapKeyType;
	value: TypeInfo;
} | {
	kind: 'union';
	items: TypeInfo[];
} | {
	kind: 'intersection';
	items: TypeInfo[];
} | {
	kind: 'tuple';
	items: TypeInfo[];
} | {
	kind: 'literal';
	items: Map<string, LiteralInfo>;
} | {
	kind: 'stringLiteral';
	value: string;
} | {
	kind: 'integerLiteral';
	value: number;
} | {
	kind: 'booleanLiteral';
	value: boolean;
});

namespace TypeInfo {

	export function isNonLSPType(info: TypeInfo): boolean {
		return info.kind === 'base' && (info.name === 'void' || info.name === 'undefined' || info.name === 'never' || info.name === 'unknown');
	}

	export function isVoid(info: TypeInfo): info is { kind: 'base'; name: 'void' } {
		return info.kind === 'base' && info.name === 'void';
	}

	const baseSet = new Set(['null', 'void', 'string', 'boolean', 'URI', 'DocumentUri', 'integer', 'uinteger', 'decimal']);
	export function asJsonType(info: TypeInfo): JsonType {
		switch (info.kind) {
			case 'base':
				if (baseSet.has(info.name)) {
					return { kind: 'base', name: info.name as BaseTypes };
				}
				if (info.name === 'object') {
					return { kind: 'reference', name: 'LSPAny' };
				}
				break;
			case 'reference':
				return { kind: 'reference', name: info.name };
			case 'array':
				return { kind: 'array', element: asJsonType(info.elementType) };
			case 'map':
				return { kind: 'map', key: asJsonType(info.key) as MapKeyType, value: asJsonType(info.value) };
			case 'union':
				return { kind: 'or', items: info.items.map(info => asJsonType(info)) };
			case 'intersection':
				return { kind: 'and', items: info.items.map(info => asJsonType(info)) };
			case 'tuple':
				return { kind: 'tuple', items: info.items.map(info => asJsonType(info)) };
			case 'literal':
				const literal: StructureLiteral = { properties: [] };
				for (const entry of info.items) {
					const property: Property = { name: entry[0], type: asJsonType(entry[1].type) };
					const value = entry[1];
					if (value.optional === true) {
						property.optional = true;
					}
					if (value.documentation !== undefined) {
						property.documentation = value.documentation;
					}
					if (value.since !== undefined) {
						property.since = value.since;
					}
					if (value.proposed === true) {
						property.proposed = true;
					}
					literal.properties.push(property);
				}
				return { kind: 'literal', value: literal };
			case 'stringLiteral':
				return { kind: 'stringLiteral', value: info.value };
			case 'integerLiteral':
				return { kind: 'integerLiteral', value: info.value };
			case 'booleanLiteral':
				return { kind: 'booleanLiteral', value: info.value };
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

namespace MessageDirection {
	export const clientToServer: 'clientToServer' = 'clientToServer';
	export const serverToClient: 'serverToClient' = 'serverToClient';
	export const both: 'both' = 'both';

	export function is(value: string): value is MessageDirection {
		return value === clientToServer || value === serverToClient || value === both;
	}
}

export default class Visitor {

	private readonly program: ts.Program;
	private readonly typeChecker: ts.TypeChecker;
	private readonly symbols: Symbols;

	#currentSourceFile: ts.SourceFile | undefined;

	private readonly requests: JsonRequest[];
	private readonly notifications: JsonNotification[];
	private readonly structures: Structure[];
	private readonly enumerations: Enumeration[];
	private readonly typeAliases: TypeAlias[];
	private readonly symbolQueue: Map<string, ts.Symbol>;
	private readonly processedStructures: Map<string, ts.Symbol>;

	constructor(program: ts.Program) {
		this.program = program;
		this.typeChecker = this.program.getTypeChecker();
		this.symbols = new Symbols(this.typeChecker);
		this.requests = [];
		this.notifications = [];
		this.structures = [];
		this.enumerations = [];
		this.typeAliases = [];
		this.symbolQueue = new Map();
		this.processedStructures = new Map();
	}

	protected get currentSourceFile(): ts.SourceFile {
		if (this.#currentSourceFile === undefined) {
			throw new Error(`Current source file not known`);
		}
		return this.#currentSourceFile;
	}

	public async visitProgram(): Promise<void> {
		for (const sourceFile of this.getSourceFilesToIndex()) {
			this.visit(sourceFile);
		}
	}

	public async endVisitProgram(): Promise<void> {
		while (this.symbolQueue.size > 0) {
			const toProcess = new Map(this.symbolQueue);
			for (const entry of toProcess) {
				const element = this.processSymbol(entry[0], entry[1]);
				if (element === undefined) {
					throw new Error(`Can't create structure for type ${entry[0]}`);
				} else if (Array.isArray((element as Structure).properties)) {
					this.structures.push(element as Structure);
				} else if (Array.isArray((element as Enumeration).values)) {
					this.enumerations.push(element as Enumeration);
				} else {
					this.typeAliases.push(element as TypeAlias);
				}
				this.symbolQueue.delete(entry[0]);
				this.processedStructures.set(entry[0], entry[1]);
			}
		}
	}

	public getMetaModel(): MetaModel {
		return {
			metaData: { version: '3.17.0' },
			requests: this.requests,
			notifications: this.notifications,
			structures: this.structures,
			enumerations: this.enumerations,
			typeAliases: this.typeAliases
		};
	}

	protected visit(node: ts.Node): void {
		switch (node.kind) {
			case ts.SyntaxKind.SourceFile:
				this.doVisit(this.visitSourceFile, this.endVisitSourceFile, node as ts.SourceFile);
				break;
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

	private visitGeneric(): boolean {
		return true;
	}

	private endVisitGeneric(): void {
	}

	private visitSourceFile(node: ts.SourceFile): boolean {
		this.#currentSourceFile = node;
		// The file `protocol.$.ts` contains all definitions for things
		// that are not reference through the protocol module but part of
		// the LSP specification. So treat the definitions as such. They all need
		// to start with a $ to make this clear.
		if (path.basename(node.fileName) === 'protocol.$.ts') {
			for (const statement of node.statements) {
				if (ts.isTypeAliasDeclaration(statement) && statement.name.getText()[0] === '$') {
					this.visitTypeReference(statement);
				}
				if (ts.isVariableStatement(statement)) {
					for (const declaration of statement.declarationList.declarations) {
						if (declaration.name.getText()[0] !== '$' || declaration.initializer === undefined) {
							continue;
						}
						const symbol = this.typeChecker.getSymbolAtLocation(declaration.initializer);
						if (symbol === undefined) {
							continue;
						}
						this.queueSymbol(symbol.getName(), symbol);
					}
				}
			}
		}
		return true;
	}

	private endVisitSourceFile(): void {
		this.#currentSourceFile = undefined;
	}

	private visitModuleDeclaration(node: ts.ModuleDeclaration): boolean {
		const identifier = node.name.getText();
		// We have a request or notification definition.
		if (identifier.endsWith('Request')) {
			const request = this.visitRequest(node);
			if (request === undefined) {
				throw new Error(`Creating meta data for request ${identifier} failed.`);
			} else {
				this.requests.push(request);
			}
		} else if (identifier.endsWith('Notification')) {
			const notification = this.visitNotification(node);
			if (notification === undefined) {
				throw new Error(`Creating meta data for notification ${identifier} failed.`);
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
			if (TypeInfo.isNonLSPType(info)) {
				return undefined;
			}
			return TypeInfo.asJsonType(info);
		};
		const result: JsonRequest = {
			method: methodName,
			result: TypeInfo.isVoid(requestTypes.result) ? TypeInfo.asJsonType({ kind: 'base', name: 'null' }) : TypeInfo.asJsonType(requestTypes.result),
			messageDirection: this.getMessageDirection(symbol)
		};
		result.params = requestTypes.param !== undefined ? asJsonType(requestTypes.param) : undefined;
		result.partialResult = asJsonType(requestTypes.partialResult);
		result.errorData = asJsonType(requestTypes.errorData);
		result.registrationMethod = this.getRegistrationMethodName(symbol);
		result.registrationOptions = asJsonType(requestTypes.registrationOptions);
		this.fillDocProperties(node, result);
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
			if (TypeInfo.isNonLSPType(info)) {
				return undefined;
			}
			return TypeInfo.asJsonType(info);
		};
		const result: JsonNotification = {
			method: methodName,
			messageDirection: this.getMessageDirection(symbol)
		};
		result.params = notificationTypes.param !== undefined ? asJsonType(notificationTypes.param) : undefined;
		result.registrationMethod = this.getRegistrationMethodName(symbol);
		result.registrationOptions = asJsonType(notificationTypes.registrationOptions);
		this.fillDocProperties(node, result);
		return result;
	}

	private visitTypeReference(node: ts.TypeAliasDeclaration): void {
		const type = node.type;
		if (!ts.isTypeReferenceNode(type)) {
			return;
		}
		const symbol = this.typeChecker.getSymbolAtLocation(type.typeName);
		if (symbol === undefined) {
			return;
		}
		this.queueSymbol(type.typeName.getText(), symbol);
	}

	private queueTypeInfo(typeInfo: TypeInfo): void {
		if (typeInfo.kind === 'reference') {
			this.queueSymbol(typeInfo.name, typeInfo.symbol);
		} else if (typeInfo.kind === 'array') {
			this.queueTypeInfo(typeInfo.elementType);
		} else if (typeInfo.kind === 'union' || typeInfo.kind === 'intersection' || typeInfo.kind === 'tuple') {
			typeInfo.items.forEach(item => this.queueTypeInfo(item));
		} else if (typeInfo.kind === 'map') {
			this.queueTypeInfo(typeInfo.key);
			this.queueTypeInfo(typeInfo.value);
		} else if (typeInfo.kind === 'literal') {
			typeInfo.items.forEach(item => this.queueTypeInfo(item.type));
		}
	}

	private queueSymbol(name: string, symbol: ts.Symbol): void {
		if (name !== symbol.getName()) {
			throw new Error(`Different symbol names [${name}, ${symbol.getName()}]`);
		}
		const existing = this.symbolQueue.get(name) ?? this.processedStructures.get(name);
		if (existing === undefined) {
			const aliased = Symbols.isAliasSymbol(symbol) ? this.typeChecker.getAliasedSymbol(symbol) : undefined;
			if (aliased !== undefined && aliased.getName() !== symbol.getName()) {
				throw new Error(`The symbol ${symbol.getName()} has a different name than the aliased symbol ${aliased.getName()}`);
			}
			this.symbolQueue.set(name, aliased ?? symbol);
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
			const declaration = this.getFirstDeclaration(method);
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
			const declaration = this.getFirstDeclaration(type);
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
		return this.removeQuotes(text);
	}

	private getRegistrationMethodName(namespace: ts.Symbol): string | undefined {
		const registrationMethod = namespace.exports?.get('registrationMethod' as ts.__String);
		if (registrationMethod === undefined) {
			return undefined;
		}
		const declaration = this.getFirstDeclaration(registrationMethod);
		if (declaration === undefined || !ts.isVariableDeclaration(declaration) || declaration.initializer === undefined || !ts.isPropertyAccessExpression(declaration.initializer)) {
			return undefined;
		}
		const initializerSymbol = this.typeChecker.getSymbolAtLocation(declaration.initializer.name);
		if (initializerSymbol === undefined || initializerSymbol.valueDeclaration === undefined) {
			return undefined;
		}
		const valueDeclaration = initializerSymbol.valueDeclaration;
		if (!ts.isVariableDeclaration(valueDeclaration)) {
			return undefined;
		}
		if (valueDeclaration.initializer === undefined || (!ts.isStringLiteral(valueDeclaration.initializer) && !ts.isNoSubstitutionTemplateLiteral(valueDeclaration.initializer))) {
			return undefined;
		}

		return this.removeQuotes(valueDeclaration.initializer.getText());
	}

	private getMessageDirection(namespace: ts.Symbol): MessageDirection {
		const errorMessage = `No message direction specified for request ${namespace.getName()}`;
		const messageDirection = namespace.exports?.get('messageDirection' as ts.__String);
		if (messageDirection === undefined) {
			throw new Error(errorMessage);
		}
		const declaration = this.getFirstDeclaration(messageDirection);
		if (declaration === undefined || !ts.isVariableDeclaration(declaration) || declaration.initializer === undefined || !ts.isPropertyAccessExpression(declaration.initializer)) {
			throw new Error(errorMessage);
		}
		const initializerSymbol = this.typeChecker.getSymbolAtLocation(declaration.initializer.name);
		if (initializerSymbol === undefined || initializerSymbol.valueDeclaration === undefined) {
			throw new Error(errorMessage);
		}
		const valueDeclaration = initializerSymbol.valueDeclaration;
		if (!ts.isEnumMember(valueDeclaration)) {
			throw new Error(errorMessage);
		}
		if (valueDeclaration.initializer === undefined || !ts.isStringLiteral(valueDeclaration.initializer)) {
			throw new Error(errorMessage);
		}
		const value = this.removeQuotes(valueDeclaration.initializer.getText());
		if (!MessageDirection.is(value)) {
			throw new Error(errorMessage);
		}
		return value;
	}

	private getRequestTypes(symbol: ts.Symbol): RequestTypes | undefined {
		const declaration = this.getFirstDeclaration(symbol);
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
		const declaration = this.getFirstDeclaration(symbol);
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

	private getTypeInfo(typeNode: ts.TypeNode | ts.Identifier, isLSPAny = false): TypeInfo | undefined {
		if (ts.isIdentifier(typeNode)) {
			const typeName = typeNode.text;
			if (LSPBaseTypes.has(typeName)) {
				return { kind: 'base', name: typeName as BaseTypeInfoKind };
			}
			const symbol = this.typeChecker.getSymbolAtLocation(typeNode);
			if (symbol === undefined) {
				return undefined;
			}
			return { kind: 'reference', name: typeName, symbol };
		} else if (ts.isTypeReferenceNode(typeNode)) {
			const typeName = ts.isIdentifier(typeNode.typeName) ? typeNode.typeName.text : typeNode.typeName.right.text;
			if (LSPBaseTypes.has(typeName)) {
				return { kind: 'base', name: typeName as BaseTypeInfoKind };
			}
			const symbol = this.typeChecker.getSymbolAtLocation(typeNode.typeName);
			if (symbol === undefined) {
				return undefined;
			}
			return { kind: 'reference', name: typeName, symbol };
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
				// We need to remove undefined from LSP Any since
				// it is not a valid type on the wire
				if (isLSPAny && typeInfo.kind === 'base' && typeInfo.name === 'undefined') {
					continue;
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
		} else if (ts.isTypeLiteralNode(typeNode)) {
			const type = this.typeChecker.getTypeAtLocation(typeNode);
			const info = this.typeChecker.getIndexInfoOfType(type, ts.IndexKind.String);
			if (info !== undefined) {
				const declaration = info.declaration;
				if (declaration === undefined || declaration.parameters.length < 1) {
					return undefined;
				}
				const keyTypeNode = declaration.parameters[0].type;
				if (keyTypeNode === undefined) {
					return undefined;
				}
				const key = this.getTypeInfo(keyTypeNode);
				const value = this.getTypeInfo(declaration.type);
				if (key === undefined || value === undefined) {
					return undefined;
				}
				if (!MapKeyType.is(key)) {
					return undefined;
				}
				return { kind: 'map', key: key, value: value };
			} else {
				// We can't directly ask for the symbol since the literal has no name.
				const type = this.typeChecker.getTypeAtLocation(typeNode);
				const symbol = type.symbol;
				if (symbol === undefined) {
					return undefined;
				}
				if (symbol.members === undefined) {
					return { kind: 'literal', items: new Map() };
				}
				const items = new Map<string, { type: TypeInfo; optional: boolean }>();
				symbol.members.forEach((member) => {
					if (!Symbols.isProperty(member)) {
						return;
					}
					const declaration = this.getDeclaration(member, ts.SyntaxKind.PropertySignature);
					if (declaration === undefined || !ts.isPropertySignature(declaration) || declaration.type === undefined) {
						throw new Error(`Can't parse property ${member.getName()} of structure ${symbol.getName()}`);
					}
					const propertyType = this.getTypeInfo(declaration.type);
					if (propertyType === undefined) {
						throw new Error(`Can't parse property ${member.getName()} of structure ${symbol.getName()}`);
					}
					const literalInfo: LiteralInfo = { type: propertyType, optional: Symbols.isOptional(member) };
					this.fillDocProperties(declaration, literalInfo);
					items.set(member.getName(), literalInfo);
				});
				return { kind: 'literal', items };
			}
		} else if (ts.isTupleTypeNode(typeNode)) {
			const items: TypeInfo[] = [];
			for (const item of typeNode.elements) {
				const typeInfo = this.getTypeInfo(item);
				if (typeInfo === undefined) {
					return undefined;
				}
				items.push(typeInfo);
			}
			return { kind: 'tuple', items };
		} else if (ts.isTypeQueryNode(typeNode) && ts.isQualifiedName(typeNode.exprName)) {
			// Currently we only us the typeof operator to get to the type of a enum
			// value expressed by an or type (e.g. kind: typeof DocumentDiagnosticReportKind.full)
			// So we assume a qualifed name and turn it into a string literal type
			const typeNodeSymbol = this.typeChecker.getSymbolAtLocation(typeNode.exprName);
			if (typeNodeSymbol === undefined) {
				throw new Error(`Can't resolve symbol for right hand side of enum declaration`);
			}
			const declaration = this.getDeclaration(typeNodeSymbol, ts.SyntaxKind.VariableDeclaration);
			if (declaration === undefined || !ts.isVariableDeclaration(declaration) || declaration.initializer === undefined) {
				throw new Error(`Can't resolve variable declaration for right hand side of enum declaration`);
			}
			if (ts.isNumericLiteral(declaration.initializer)) {
				return { kind: 'integerLiteral', value: Number.parseInt(declaration.initializer.getText()) };
			} else if (ts.isStringLiteral(declaration.initializer)) {
				return { kind: 'stringLiteral', value: this.removeQuotes(declaration.initializer.getText()) };
			}
			return { kind: 'stringLiteral', value: typeNode.exprName.right.getText() };
		} else if (ts.isParenthesizedTypeNode(typeNode)) {
			return this.getTypeInfo(typeNode.type);
		} else if (ts.isLiteralTypeNode(typeNode)) {
			return this.getBaseTypeInfo(typeNode.literal);
		}
		return this.getBaseTypeInfo(typeNode);
	}

	private getBaseTypeInfo(node: ts.Node): TypeInfo | undefined {
		switch (node.kind){
			case ts.SyntaxKind.NullKeyword:
				return { kind: 'base', name: 'null' };
			case ts.SyntaxKind.UnknownKeyword:
				return { kind: 'base', name: 'unknown' };
			case ts.SyntaxKind.NeverKeyword:
				return { kind: 'base', name: 'never' };
			case ts.SyntaxKind.VoidKeyword:
				return { kind: 'base', name: 'void' };
			case ts.SyntaxKind.UndefinedKeyword:
				return { kind: 'base', name: 'undefined' };
			case ts.SyntaxKind.AnyKeyword:
				return { kind: 'base', name: 'any' };
			case ts.SyntaxKind.StringKeyword:
				return  { kind: 'base', name: 'string' };
			case ts.SyntaxKind.NumberKeyword:
				return { kind: 'base', name: 'integer' };
			case ts.SyntaxKind.BooleanKeyword:
				return { kind: 'base', name: 'boolean' };
			case ts.SyntaxKind.StringLiteral:
				return { kind: 'stringLiteral', value: this.removeQuotes(node.getText()) };
			case ts.SyntaxKind.NumericLiteral:
				return { kind: 'integerLiteral', value: Number.parseInt(node.getText()) };
			case ts.SyntaxKind.ObjectKeyword:
				return { kind: 'base', name: 'object' };
		}
		return undefined;
	}

	private static readonly Mixins: Set<string> = new Set(['WorkDoneProgressParams', 'PartialResultParams', 'StaticRegistrationOptions', 'WorkDoneProgressOptions']);
	private static readonly PropertyFilters: Map<string, Set<string>> = new Map([
		['TraceValues', new Set(['Compact'])],
		['ErrorCodes', new Set(['jsonrpcReservedErrorRangeStart', 'serverErrorStart', 'MessageWriteError', 'MessageReadError', 'PendingResponseRejected', 'ConnectionInactive', 'jsonrpcReservedErrorRangeEnd', 'serverErrorEnd'])],
		['LSPErrorCodes', new Set(['lspReservedErrorRangeStart', 'lspReservedErrorRangeEnd'])]
	]);
	private static readonly PropertyRenames: Map<string, Map<string, string>> = new Map([
		['MonikerKind', new Map([
			['$export', 'export'],
			['$import', 'import']
		])]
	]);
	private processSymbol(name: string, symbol: ts.Symbol): Structure | Enumeration | TypeAlias | undefined {
		// We can't define LSPAny in the protocol right now due to TS issues.
		// So we predefine it and emit it.
		if (name === 'LSPAny') {
			this.typeAliases.push(PreDefined.LSPArray);
			return PreDefined.LSPAny;
		}
		if (name === 'LSPArray') {
			// LSP Array is never reference via a indirect reference from
			// a request or notification.
			return undefined;
		}
		if (name === 'LSPObject') {
			return PreDefined.LSPObject;
		}
		if (Symbols.isInterface(symbol)) {
			const result: Structure = { name: name, properties: [] };
			const declaration = this.getDeclaration(symbol, ts.SyntaxKind.InterfaceDeclaration);
			if (declaration !== undefined && ts.isInterfaceDeclaration(declaration) && declaration.heritageClauses !== undefined) {
				const mixins: JsonType[] = [];
				const extend: JsonType[] = [];
				for (const clause of declaration.heritageClauses) {
					for (const type of clause.types) {
						if (ts.isIdentifier(type.expression)) {
							const typeInfo = this.getTypeInfo(type.expression);
							if (typeInfo === undefined || typeInfo.kind !== 'reference') {
								throw new Error(`Can't create type info for extends clause ${type.expression.getText()}`);
							}
							if (Visitor.Mixins.has(typeInfo.name)) {
								mixins.push(TypeInfo.asJsonType(typeInfo));
							} else {
								extend.push(TypeInfo.asJsonType(typeInfo));
							}
							this.queueTypeInfo(typeInfo);
						}
					}
				}
				if (extend.length > 0) {
					result.extends = extend;
				}
				if (mixins.length > 0) {
					result.mixins = mixins;
				}
			}
			if (declaration !== undefined) {
				this.fillDocProperties(declaration, result);
			}
			this.fillProperties(result, symbol);
			return result;
		} else if (Symbols.isTypeAlias(symbol)) {
			const declaration = this.getDeclaration(symbol, ts.SyntaxKind.TypeAliasDeclaration);
			if (declaration === undefined ||!ts.isTypeAliasDeclaration(declaration)) {
				throw new Error (`No declaration found for type alias ${symbol.getName() }`);
			}
			if (ts.isTypeLiteralNode(declaration.type)) {
				// We have a single type literal node. So treat it as a structure
				const result: Structure = { name: name, properties: [] };
				this.fillProperties(result, this.typeChecker.getTypeAtLocation(declaration.type).symbol);
				this.fillDocProperties(declaration, result);
				return result;
			} else if (ts.isIntersectionTypeNode(declaration.type)) {
				const split = this.splitIntersectionType(declaration.type);
				if (split.rest.length === 0) {
					const result: Structure = { name: name, properties: [] };
					const mixins: JsonType[] = [];
					const extend: JsonType[] = [];
					for (const reference of split.references) {
						const typeInfo = this.getTypeInfo(reference);
						if (typeInfo === undefined || typeInfo.kind !== 'reference') {
							throw new Error(`Can't create type info for type reference ${reference.getText()}`);
						}
						if (Visitor.Mixins.has(typeInfo.name)) {
							mixins.push(TypeInfo.asJsonType(typeInfo));
						} else {
							extend.push(TypeInfo.asJsonType(typeInfo));
						}
						this.queueTypeInfo(typeInfo);
					}
					if (extend.length > 0) {
						result.extends = extend;
					}
					if (mixins.length > 0) {
						result.mixins = mixins;
					}
					if (split.literal !== undefined) {
						this.fillProperties(result, this.typeChecker.getTypeAtLocation(split.literal).symbol);
					}
					this.fillDocProperties(declaration, result);
					return result;
				}
			}
			const target = this.getTypeInfo(declaration.type, name === 'LSPAny');
			if (target === undefined) {
				throw new Error(`Can't resolve target type for type alias ${symbol.getName()}`);
			}
			const namespace = this.getDeclaration(symbol, ts.SyntaxKind.ModuleDeclaration);
			if (namespace !== undefined && symbol.declarations !== undefined && symbol.declarations.length === 2) {
				const fixedSet = (target.kind === 'union' || target.kind === 'stringLiteral' || target.kind === 'integerLiteral');
				const openSet = (target.kind === 'base' && (target.name === 'string' || target.name === 'integer' || target.name === 'uinteger'));
				if (openSet || fixedSet) {
					// Check if we have a enum declaration.
					const body = namespace.getChildren().find(node => node.kind === ts.SyntaxKind.ModuleBlock);
					if (body !== undefined && ts.isModuleBlock(body)) {
						const enumValues = this.getEnumValues(target);
						const variableStatements = body.statements.filter((statement => ts.isVariableStatement(statement)));
						if ((fixedSet && enumValues !== undefined && enumValues.length > 0 && variableStatements.length === enumValues.length) || (openSet && variableStatements.length > 0)) {
							// Same length and all variable statement.
							const enumValuesSet: Set<number | string> | undefined = enumValues ? new Set<any>(enumValues as any) : undefined;
							let isEnum = true;
							const enumerations: EnumerationEntry[] = [];
							for (const variable of variableStatements) {
								if (!ts.isVariableStatement(variable) || variable.declarationList.declarations.length !== 1) {
									isEnum = false;
									break;
								}
								const declaration = variable.declarationList.declarations[0];
								if (!ts.isVariableDeclaration(declaration)) {
									isEnum = false;
									break;
								}
								const value: number | string | undefined = this.getEnumValue(declaration);
								if (value === undefined) {
									isEnum = false;
									break;
								}
								if (enumValuesSet && !enumValuesSet.has(value)) {
									isEnum = false;
									break;
								}
								let propertyName = declaration.name.getText();
								if (Visitor.PropertyRenames.has(name) && Visitor.PropertyRenames.get(name)?.has(propertyName)) {
									propertyName = Visitor.PropertyRenames.get(name)!.get(propertyName)!;
								}
								if (Visitor.PropertyFilters.has(name) && Visitor.PropertyFilters.get(name)?.has(propertyName)) {
									continue;
								}
								const entry: EnumerationEntry = { name: propertyName, value: value };
								this.fillDocProperties(variable, entry);
								enumerations.push(entry);
							}
							if (isEnum) {
								const type: EnumerationType | undefined = enumValues
									? this.getEnumBaseType(enumValues)
									: openSet ? target as EnumerationType : undefined;
								if (type !== undefined) {
									const enumeration: Enumeration = { name: name, type: type, values: enumerations };
									if (openSet && !fixedSet) {
										enumeration.supportsCustomValues = true;
									}
									// First fill the documentation from the namespace and then from the
									// type declaration.
									this.fillDocProperties(namespace, enumeration);
									if (enumeration.documentation === undefined) {
										this.fillDocProperties(namespace, enumeration);
									}
									return enumeration;
								}
							}
						}
					}
				}
			}
			// We have a single reference to another type. Treat is as an extend of
			// that structure
			if (target.kind === 'reference' && Visitor.Mixins.has(target.name)) {
				this.queueTypeInfo(target);
				const result: Structure = { name: name, mixins: [TypeInfo.asJsonType(target)], properties: [] };
				this.fillDocProperties(declaration, result);
				return result;
			} else {
				this.queueTypeInfo(target);

				// In the protocol document filter can't be a string but the implementation allows it for backwards compatibility
				if (name === 'DocumentSelector') {
					return PreDefined.DocumentSelector;
				}
				const result: TypeAlias = { name: name, type: TypeInfo.asJsonType(target) };
				this.fillDocProperties(declaration, result);
				return result;
			}
		} else if (Symbols.isRegularEnum(symbol)) {
			const entries: EnumerationEntry[] = [];
			const exports = this.typeChecker.getExportsOfModule(symbol);
			let enumBaseType: 'string' | 'integer' | 'uinteger' | undefined = undefined;
			for (const item of exports) {
				const declaration = this.getDeclaration(item, ts.SyntaxKind.EnumMember);
				if (declaration === undefined || !ts.isEnumMember(declaration) || declaration.initializer === undefined) {
					continue;
				}
				let value: string | number | undefined;
				if (ts.isNumericLiteral(declaration.initializer)) {
					value = Number.parseInt(declaration.initializer.getText());
					if (value >= 0 && enumBaseType === undefined) {
						enumBaseType = 'uinteger';
					} else {
						enumBaseType = 'integer';
					}
				} else if (ts.isStringLiteral(declaration.initializer)) {
					value = this.removeQuotes(declaration.initializer.getText());
					enumBaseType = 'string';
				}
				if (value === undefined) {
					continue;
				}
				const entry: EnumerationEntry = { name: item.getName(), value: value };
				if (Visitor.PropertyFilters.has(name) && Visitor.PropertyFilters.get(name)?.has(entry.name)) {
					continue;
				}
				this.fillDocProperties(declaration, entry);
				entries.push(entry);
			}
			const type: EnumerationType = enumBaseType === undefined
				? { kind: 'base', name: 'uinteger' }
				: { kind: 'base', name: enumBaseType };
			const result: Enumeration = { name: name, type: type, values: entries };
			if (name === 'SemanticTokenTypes' || name === 'SemanticTokenModifiers') {
				result.supportsCustomValues = true;
			}
			const declaration = this.getDeclaration(symbol, ts.SyntaxKind.EnumDeclaration);
			if (declaration !== undefined) {
				this.fillDocProperties(declaration, result);
			}
			return result;
		} else {
			const result: Structure = { name: name, properties: [] };
			this.fillProperties(result, symbol);
			const declaration = this.getFirstDeclaration(symbol);
			declaration !== undefined && this.fillDocProperties(declaration, result);
			return result;
		}
	}

	private fillProperties(result: Structure, symbol: ts.Symbol) {
		// Using the type here to navigate the properties will result in folding
		// all properties since the type contains all inherited properties. So we go
		// over the symbol to make things work.
		if (symbol.members === undefined) {
			return;
		}
		symbol.members.forEach((member) => {
			if (!Symbols.isProperty(member)) {
				return;
			}
			const declaration = this.getDeclaration(member, ts.SyntaxKind.PropertySignature);
			if (declaration === undefined || !ts.isPropertySignature(declaration) || declaration.type === undefined) {
				throw new Error(`Can't parse property ${member.getName()} of structure ${symbol.getName()}`);
			}
			const typeInfo = this.getTypeInfo(declaration.type);
			if (typeInfo === undefined) {
				throw new Error(`Can't parse property ${member.getName()} of structure ${symbol.getName()}`);
			}

			const isExperimentalProperty = (result.name === 'ServerCapabilities' && member.getName() === 'experimental' && typeInfo.kind === 'reference' && typeInfo.name === 'T');
			const property: Property = isExperimentalProperty
				? { name: member.getName(), type: TypeInfo.asJsonType({ kind: 'reference', name: 'LSPAny', symbol: typeInfo.symbol }) }
				: { name: member.getName(), type: TypeInfo.asJsonType(typeInfo) };
			if (Symbols.isOptional(member)) {
				property.optional = true;
			}
			this.fillDocProperties(declaration, property);
			result.properties.push(property);
			if (!isExperimentalProperty) {
				this.queueTypeInfo(typeInfo);
			}
		});
	}

	private splitIntersectionType(node: ts.IntersectionTypeNode): { literal: ts.TypeLiteralNode | undefined; references: ts.TypeReferenceNode[]; rest: ts.TypeNode[] } {
		let literal: ts.TypeLiteralNode | undefined;
		const rest: ts.TypeNode[] = [];
		const references: ts.TypeReferenceNode[] = [];
		for (const element of node.types) {
			if (ts.isTypeLiteralNode(element)) {
				if (literal === undefined) {
					literal = element;
				} else {
					rest.push(element);
				}
			} else if (ts.isTypeReferenceNode(element)) {
				references.push(element);
			} else {
				rest.push(element);
			}
		}
		return { literal, references, rest };
	}

	private getFirstDeclaration(symbol: ts.Symbol): ts.Node | undefined {
		const declarations = symbol.getDeclarations();
		return declarations !== undefined && declarations.length > 0 ? declarations[0] : undefined;
	}

	private getDeclaration(symbol: ts.Symbol, kind: ts.SyntaxKind): ts.Node | undefined {
		const declarations = symbol.getDeclarations();
		if (declarations === undefined) {
			return undefined;
		}
		for (const declaration of declarations) {
			if (declaration.kind === kind) {
				return declaration;
			}
		}
		return undefined;
	}

	private getEnumValues(typeInfo: TypeInfo): string[] | number[] | undefined {
		if (typeInfo.kind === 'stringLiteral') {
			return [typeInfo.value];
		}
		if (typeInfo.kind === 'integerLiteral') {
			return [typeInfo.value];
		}
		if (typeInfo.kind !== 'union' || typeInfo.items.length === 0) {
			return undefined;
		}
		const first = typeInfo.items[0];
		const item: [string, string] | [string, number] | undefined = first.kind === 'stringLiteral' ? [first.kind, first.value] : (first.kind === 'integerLiteral' ? [first.kind, first.value] : undefined);
		if (item === undefined) {
			return undefined;
		}
		const kind = item[0];
		const result: (string | number)[] = [];
		result.push(item[1]);
		for (let i = 1; i < typeInfo.items.length; i++) {
			const info = typeInfo.items[i];
			if (info.kind !== kind) {
				return undefined;
			}
			if (info.kind !== 'integerLiteral' && info.kind !== 'stringLiteral') {
				return undefined;
			}
			result.push(info.value);
		}
		return (result as string[] | number[]);
	}

	private getEnumValue(declaration: ts.VariableDeclaration): number | string | undefined {
		let enumValueNode: ts.Node | undefined;
		if (declaration.initializer !== undefined) {
			enumValueNode = declaration.initializer;
		} else if (declaration.type !== undefined && ts.isLiteralTypeNode(declaration.type)) {
			enumValueNode = declaration.type.literal;
		}
		if (enumValueNode === undefined) {
			return undefined;
		}
		if (ts.isNumericLiteral(enumValueNode) || (ts.isPrefixUnaryExpression(enumValueNode) && ts.isNumericLiteral(enumValueNode.operand))) {
			return Number.parseInt(enumValueNode.getText());
		} else if (ts.isStringLiteral(enumValueNode)) {
			return this.removeQuotes(enumValueNode.getText());
		}
		return undefined;
	}

	getEnumBaseType(values: string[] | number[]) : EnumerationType | undefined {
		if (values.length === 0) {
			return undefined;
		}
		const first = values[0];
		if (typeof first === 'string') {
			return { kind: 'base', name: 'string' };
		}
		for (const value of (values as number[])) {
			if (value < 0) {
				return { kind: 'base', name: 'integer' };
			}
		}
		return { kind: 'base', name: 'uinteger' };
	}

	private removeQuotes(text: string): string {
		const first = text[0];
		if ((first !== '\'' && first !== '"' && first !== '`') || first !== text[text.length - 1]) {
			return text;
		}
		return text.substring(1, text.length - 1);
	}

	private fillDocProperties(node: ts.Node, value: JsonRequest | JsonNotification | Property | Structure | StructureLiteral | EnumerationEntry | Enumeration | TypeAlias | LiteralInfo): void {
		const filePath = node.getSourceFile().fileName;
		const fileName = path.basename(filePath);
		const tags = ts.getJSDocTags(node);
		const since = this.getSince(tags);
		const proposed = (fileName.startsWith('proposed.') || tags.some((tag) => { return ts.isJSDocUnknownTag(tag) && tag.tagName.text === 'proposed';})) ? true : undefined;
		value.documentation = this.getDocumentation(node);
		value.since = since;
		value.proposed = proposed;
	}

	private getDocumentation(node: ts.Node): string | undefined {
		const fullText = node.getFullText();
		const ranges = ts.getLeadingCommentRanges(fullText, 0);
		if (ranges !== undefined && ranges.length > 0) {
			const start = ranges[ranges.length - 1].pos;
			const end = ranges[ranges.length -1 ].end;
			const text = fullText.substring(start, end).trim();
			if (text.startsWith('/**')) {
				const buffer: string[] = [];
				const lines = text.split(/\r?\n/);
				for (let i= 0; i < lines.length; i++) {
					let noComment = lines[i].replace(/^\s*\/\*\*(.*)\s*\*\/\s*$|^(\s*\/\*\*)|^(\s*\*\/\s*)$|^(\s*\*)/, (_match, m1) => {
						if (m1) {
							return m1;
						} else {
							return '';
						}
					});
					// First line
					if (i === 0 || i === lines.length - 1) {
						noComment = noComment.trim();
						if (noComment.length === 0) {
							continue;
						}
					}
					if (noComment.length > 0 && noComment[0] === ' ') {
						noComment = noComment.substring(1);
					}
					buffer.push(noComment);
				}
				return buffer.join('\n');
			}
		}
		return undefined;
	}

	private getSince(tags: ReadonlyArray<ts.JSDocTag>): string | undefined {
		for (const tag of tags) {
			if (tag.tagName.text === 'since' && typeof tag.comment === 'string') {
				return tag.comment;
			}
		}
		return undefined;
	}
}

namespace PreDefined {
	export const LSPAny: TypeAlias = {
		name: 'LSPAny',
		type: {
			kind: 'or',
			items: [
				{
					kind: 'reference',
					name: 'LSPObject'
				},
				{
					kind: 'reference',
					name: 'LSPArray'
				},
				{
					kind: 'base',
					name: 'string'
				},
				{
					kind: 'base',
					name: 'integer'
				},
				{
					kind: 'base',
					name: 'uinteger'
				},
				{
					kind: 'base',
					name: 'decimal'
				},
				{
					kind: 'base',
					name: 'boolean'
				},
				{
					kind: 'base',
					name: 'null'
				}
			]
		},
		documentation: 'The LSP any type.\nPlease note that strictly speaking a property with the value `undefined`\ncan\'t be converted into JSON preserving the property name. However for\nconvenience it is allowed and assumed that all these properties are\noptional as well.\n@since 3.17.0',
		since: '3.17.0'
	};

	export const LSPObject: Structure = {
		name: 'LSPObject',
		properties: [],
		documentation: 'LSP object definition.\n@since 3.17.0',
		since: '3.17.0'
	};

	export const LSPArray: TypeAlias = {
		name: 'LSPArray',
		type: {
			kind: 'array',
			element: {
				kind: 'reference',
				name: 'LSPAny'
			}
		},
		documentation: 'LSP arrays.\n@since 3.17.0',
		since: '3.17.0'
	};

	export const DocumentSelector: TypeAlias = {
		name: 'DocumentSelector',
		type: {
			kind: 'array',
			element: {
				kind: 'reference',
				name: 'DocumentFilter'
			}
		},
		documentation: 'A document selector is the combination of one or many document filters.\n\n@sample `let sel:DocumentSelector = [{ language: \'typescript\' }, { language: \'json\', pattern: \'**∕tsconfig.json\' }]`;\n\nThe use of a string as a document filter is deprecated @since 3.16.0.',
		since: '3.16.0.'
	};
}