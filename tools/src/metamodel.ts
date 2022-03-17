/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

export type BaseTypes = 'Uri' | 'DocumentUri' | 'integer' | 'uinteger' | 'decimal' | 'RegExp' | 'null' | 'void';

export type Type = BaseTypes | string | {
	array: Type;
} | {
	and: Type[];
} | {
	or: Type[];
};

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
	 * support partial result reporting.
	 */
	partialResult?: Type;

	/**
	 * An optional error data type;
	 */
	errorData?: Type;

	/**
	 * Optional registration options if the request
	 * support dynamic registration.
	 */
	registrationOptions?: Type;
};

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
	 * support dynamic registration.
	 */
	registrationOptions?: Type;
};

export type Property = {
	/**
	 * The property name;
	 */
	name: string;

	/**
	 * An optional documentation;
	 */
	documentation?: string;

	/**
	 * The type of the property
	 */
	type: Type;
};

export type Structure = {
	/**
	 * The name of the structure
	 */
	name: string;

	/**
	 * An optional documentation;
	 */
	documentation?: string;

	/**
	 * Structures extended from
	 */
	extends?: string[];

	/**
	 * Structures to mix in.
	 */
	mixins?: string[];

	/**
	 * The Properties
	 */
	properties: Property[];
};