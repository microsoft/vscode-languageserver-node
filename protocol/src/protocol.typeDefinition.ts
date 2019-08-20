/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { RequestType, RequestHandler, ProgressType } from 'vscode-jsonrpc';
import { Definition, DefinitionLink, LocationLink, Location } from 'vscode-languageserver-types';
import { TextDocumentRegistrationOptions, StaticRegistrationOptions, TextDocumentPositionParams, PartialResultParams, WorkDoneProgressParams, WorkDoneProgressOptions } from './protocol';

// @ts-ignore: to avoid inlining LocatioLink as dynamic import
let __noDynamicImport: LocationLink | Declaration | DeclarationLink | Location | undefined;

export interface TypeDefinitionClientCapabilities {
	/**
	 * The text document client capabilities
	 */
	textDocument?: {
		/**
		 * Capabilities specific to the `textDocument/typeDefinition`
		 */
		typeDefinition?: {
			/**
			 * Whether implementation supports dynamic registration. If this is set to `true`
			 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
			 * return value for the corresponding server capability as well.
			 */
			dynamicRegistration?: boolean;

			/**
			 * The client supports additional metadata in the form of definition links.
			 */
			linkSupport?: boolean;
		};
	}
}

export interface TypeDefinitionOptions extends WorkDoneProgressOptions {
}

export interface TypeDefinitionRegistrationOptions extends TextDocumentRegistrationOptions, TypeDefinitionOptions {
}

export interface  TypeDefinitionServerCapabilities {
	/**
	 * The server provides Goto Type Definition support.
	 */
	typeDefinitionProvider?: boolean | TypeDefinitionOptions | (TypeDefinitionRegistrationOptions & StaticRegistrationOptions);
}

export interface TypeDefinitionParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
}

/**
 * A request to resolve the type definition locations of a symbol at a given text
 * document position. The request's parameter is of type [TextDocumentPositioParams]
 * (#TextDocumentPositionParams) the response is of type [Definition](#Definition) or a
 * Thenable that resolves to such.
 */
export namespace TypeDefinitionRequest {
	export const type = new RequestType<TypeDefinitionParams, Definition | DefinitionLink[] | null, void, TypeDefinitionRegistrationOptions>('textDocument/typeDefinition');
	export const resultType = new ProgressType<Location[] | DefinitionLink[]>();
	export type HandlerSignature = RequestHandler<TypeDefinitionParams, Definition | DefinitionLink[] | null, void>;
}