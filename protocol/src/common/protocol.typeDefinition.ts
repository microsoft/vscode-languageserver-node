/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler } from 'vscode-jsonrpc';
import { MessageDirection, Definition, DefinitionLink, LocationLink, Location } from 'vscode-languageserver-types';

import { ProtocolRequestType } from './messages';
import type {
	TextDocumentRegistrationOptions, StaticRegistrationOptions, TextDocumentPositionParams, PartialResultParams, WorkDoneProgressParams,
	WorkDoneProgressOptions
} from './protocol';

// @ts-ignore: to avoid inlining LocatioLink as dynamic import
let __noDynamicImport: LocationLink | Declaration | DeclarationLink | Location | undefined;

/**
 * Since 3.6.0
 */
export interface TypeDefinitionClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration. If this is set to `true`
	 * the client supports the new `TypeDefinitionRegistrationOptions` return value
	 * for the corresponding server capability as well.
	 */
	dynamicRegistration?: boolean;

	/**
	 * The client supports additional metadata in the form of definition links.
	 *
	 * Since 3.14.0
	 */
	linkSupport?: boolean;
}

export interface TypeDefinitionOptions extends WorkDoneProgressOptions {
}

export interface TypeDefinitionRegistrationOptions extends TextDocumentRegistrationOptions, TypeDefinitionOptions, StaticRegistrationOptions {
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
	export const method: 'textDocument/typeDefinition' = 'textDocument/typeDefinition';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolRequestType<TypeDefinitionParams, Definition | DefinitionLink[] | null, Location[] | DefinitionLink[], void, TypeDefinitionRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<TypeDefinitionParams, Definition | DefinitionLink[] | null, void>;
}
