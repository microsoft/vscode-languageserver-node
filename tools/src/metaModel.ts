/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

export type BaseTypes = 'Uri' | 'DocumentUri' | 'integer' | 'uinteger' | 'decimal' | 'RegExp' | 'string' | 'boolean' | 'null';

export type TypeKind = 'base' | 'reference' | 'array' | 'map' | 'and' | 'or' | 'tuple' | 'literal' | 'stringLiteral' | 'numberLiteral' | 'booleanLiteral';

export type Type = {
	kind: TypeKind;
} & ({
	/**
	 * Represents a base type like `string` or `DocumentUri`
	 */
	kind: 'base';
	name: BaseTypes;
} | {
	/**
	 * Represents a reference to another type (e.g. `TextDocument`)
	 */
	kind: 'reference';
	name: string;
} | {
	/**
	 * Represents an array type (e.g. `TextDocument[]`)
	 */
	kind: 'array';
	element: Type;
} | {
	/**
	 * Represents a JSON object map.
	 * (e.g. `interface Map<K extends string | number, V> { [key: K] => V; }`)
	 */
	kind: 'map';
	key: Type;
	value: Type;
} | {
	/**
	 * Represents an `and`, `or` or `tuple` type
	 * - and: `TextDocumentParams & WorkDoneProgressParams`
	 * - or: `Location | LocationLink`
	 * - tuple: `[integer, integer]`
	 */
	kind: 'and' | 'or' | 'tuple';
	items: Type[];
} | {
	/**
	 * Represents a literal structure
	 * (e.g. `property: { start: uinteger; end: uinteger; })`
	 */
	kind: 'literal';
	value: StructureLiteral;
} | {
	/**
	 * Represents a string literal type
	 * (e.g. `kind: 'rename'`)
	 */
	kind: 'stringLiteral';
	value: string;
} | {
	/**
	 * Represents a number literal type
	 * (e.g. `kind: 1`)
	 */
	kind: 'numberLiteral';
	value: number;
} | {
	/**
	 * Represents a boolean literal type
	 * (e.g. `kind: true`)
	 */
	kind: 'booleanLiteral';
	value: boolean;
});

/**
 * Represents a LSP request
 */
export type Request = {
	/**
	 * The request's method name.
	 */
	method: string;

	/**
	 * The parameter type(s) if any.
	 */
	params?: Type | Type[];

	/**
	 * The result type.
	 */
	result: Type;

	/**
	 * Optional partial result type if the request
	 * supports partial result reporting.
	 */
	partialResult?: Type;

	/**
	 * An optional error data type.
	 */
	errorData?: Type;

	/**
	 * Optional registration options if the request
	 * supports dynamic registration.
	 */
	registrationOptions?: Type;

	/**
	 * Whether this is a proposed feature. If omitted,
	 * the feature is final.
	 */
	proposed?: boolean;
};

/**
 * Represents a LSP notification
 */
export type Notification = {
	/**
	 * The request's method name.
	 */
	method: string;

	/**
	 * The parameter type(s) if any.
	 */
	params?: Type | Type[];

	/**
	 * Optional registration options if the notification
	 * supports dynamic registration.
	 */
	registrationOptions?: Type;

	/**
	 * Whether this is a proposed feature. If omitted,
	 * the feature is final.
	 */
	proposed?: boolean;
};

/**
 * Represents an object property.
 */
export type Property = {
	/**
	 * The property name;
	 */
	name: string;

	/**
	 * An optional documentation.
	 */
	documentation?: string;

	/**
	 * The type of the property.
	 */
	type: Type;

	/**
	 * Whether the property is optional. If
	 * omitted, the property is mandatory.
	 */
	optional?: boolean;
};

/**
 * Defines the structure of an object literal.
 */
export type Structure = {
	/**
	 * The name of the structure.
	 */
	name: string;

	/**
	 * An optional documentation.
	 */
	documentation?: string;

	/**
	 * Whether this is a proposed feature. If omitted,
	 * the feature is final.
	 */
	proposed?: boolean;

	/**
	 * Structures extended from.
	 */
	extends?: Type[];

	/**
	 * Structures to mix in.
	 */
	mixins?: Type[];

	/**
	 * The properties.
	 */
	properties: Property[];
};

/**
 * Defines a unnamed structure of an object literal.
 */
export type StructureLiteral = {

	/**
	 * An optional documentation.
	 */
	documentation?: string;

	/**
	 * Whether this is a proposed feature. If omitted,
	 * the feature is final.
	 */
	proposed?: boolean;

	/**
	 * The properties.
	 */
	properties: Property[];
};

/**
 * Defines a type alias.
 * (e.g. `type Definition = Location | LocationLink`)
 */
export type TypeAlias = {
	/**
	 * The name of the type alias.
	 */
	name: string;

	/**
	 * The aliased type.
	 */
	type: Type;

	/**
	 * Whether this is a proposed feature. If omitted,
	 * the feature is final.
	 */
	proposed?: boolean;
};

/**
 * Defines a enumeration entry.
 */
export type EnumerationEntry = {
	/**
	 * The name of the enum item.
	 */
	name: string;

	/**
	 * The value.
	 */
	value: string | number;
};

/**
 * Defines a enumeration.
 */
export type Enumeration = {
	/**
	 * The name of the enumeration.
	 */
	name: string;

	/**
	 * The type of the elements.
	 */
	type: 'string' | 'number';

	/**
	 * The enum values.
	 */
	values: EnumerationEntry[];

	/**
	 * Whether this is a proposed feature. If omitted,
	 * the feature is final.
	 */
	proposed?: boolean;
};

/**
 * The actual meta model.
 */
export type MetaModel = {
	/**
	 * The requests.
	 */
	requests: Request[];

	/**
	 * The notifications.
	 */
	notifications: Notification[];

	/**
	 * The structures.
	 */
	structures: Structure[];

	/**
	 * The enumerations.
	 */
	enumerations: Enumeration[];

	/**
	 * The type aliases.
	 */
	typeAliases: TypeAlias[];
};