/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler } from 'vscode-jsonrpc';
import { Definition, DefinitionLink, Location, LocationLink } from 'vscode-languageserver-types';

import { CM, MessageDirection, ProtocolRequestType } from './messages';
import {
	type TextDocumentRegistrationOptions, type StaticRegistrationOptions, type TextDocumentPositionParams, type PartialResultParams, type WorkDoneProgressParams,
	type WorkDoneProgressOptions
} from './protocol';

// @ts-ignore: to avoid inlining LocationLink as dynamic import
let __noDynamicImport: LocationLink | Declaration | DeclarationLink | Location | undefined;

/**
 * @since 3.6.0
 */
export interface ImplementationClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration. If this is set to `true`
	 * the client supports the new `ImplementationRegistrationOptions` return value
	 * for the corresponding server capability as well.
	 */
	dynamicRegistration?: boolean;

	/**
	 * The client supports additional metadata in the form of definition links.
	 *
	 * @since 3.14.0
	 */
	linkSupport?: boolean;
}

export interface ImplementationOptions extends WorkDoneProgressOptions {
}

export interface ImplementationRegistrationOptions extends TextDocumentRegistrationOptions, ImplementationOptions, StaticRegistrationOptions {
}

export interface ImplementationParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
}

/**
 * A request to resolve the implementation locations of a symbol at a given text
 * document position. The request's parameter is of type {@link TextDocumentPositionParams}
 * the response is of type {@link Definition} or a Thenable that resolves to such.
 */
export namespace ImplementationRequest {
	export const method: 'textDocument/implementation' = 'textDocument/implementation';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolRequestType<ImplementationParams, Definition | DefinitionLink[] | null, Location[] | DefinitionLink[], void, ImplementationRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<ImplementationParams, Definition | DefinitionLink[] | null, void>;
	export const capabilities = CM.create('textDocument.implementation', 'implementationProvider');
}
