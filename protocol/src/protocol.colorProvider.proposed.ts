/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { RequestType } from 'vscode-jsonrpc';
import { TextDocumentRegistrationOptions } from './protocol';
import { TextDocumentIdentifier, Range } from 'vscode-languageserver-types';

//---- Server capability ----

export interface ColorProviderOptions {
}

export interface ServerCapabilities {
	/**
	 * The server provides document range formatting.
	 */
	colorProvider?: ColorProviderOptions;
}

//---- Color Symbol Provider ---------------------------

/**
 * Parameters for a [DocumentColorParams](#DocumentColorParams).
 */
export interface DocumentColorParams {
    /**
     * The text document.
     */
	textDocument: TextDocumentIdentifier;
}

/**
 * A request to list all color symbols found in a given text document. The request's
 * parameter is of type [TextDocumentIdentifier](#TextDocumentIdentifier) the
 * response is of type [ColorInformation[]](#ColorInformation) or a Thenable
 * that resolves to such.
 */
export namespace DocumentColorRequest {
	export const type = new RequestType<DocumentColorParams, ColorInformation[], void, TextDocumentRegistrationOptions>('textDocument/documentColor');
}

/**
 * Represents a color in RGBA space.
 */
export class Color {

	/**
	 * The red component of this color in the range [0-1].
	 */
	readonly red: number;

	/**
	 * The green component of this color in the range [0-1].
	 */
	readonly green: number;

	/**
	 * The blue component of this color in the range [0-1].
	 */
	readonly blue: number;

	/**
	 * The alpha component of this color in the range [0-1].
	 */
	readonly alpha: number;
}

export interface ColorInformation {
	range: Range;
	color: Color;
}