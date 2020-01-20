/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { RequestHandler, ProgressType } from 'vscode-jsonrpc';
import { Definition, DefinitionLink, Location, LocationLink } from 'vscode-languageserver-types';
import { ProtocolRequestType } from './messages';
import {
	TextDocumentRegistrationOptions, StaticRegistrationOptions, TextDocumentPositionParams, PartialResultParams, WorkDoneProgressParams,
	WorkDoneProgressOptions
} from './protocol';

// @ts-ignore: to avoid inlining LocatioLink as dynamic import
let __noDynamicImport: LocationLink | Declaration | DeclarationLink | Location | undefined;

/**
 * Since 3.6.0
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
	 * Since 3.14.0
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
 * document position. The request's parameter is of type [TextDocumentPositioParams]
 * (#TextDocumentPositionParams) the response is of type [Definition](#Definition) or a
 * Thenable that resolves to such.
 */
export namespace ImplementationRequest {
	export const method: 'textDocument/implementation' = 'textDocument/implementation';
	export const type = new ProtocolRequestType<ImplementationParams, Definition | DefinitionLink[] | null, Location[] | DefinitionLink[], void, ImplementationRegistrationOptions>(method);
	/** @deprecated Use ImplementationRequest.type */
	export const resultType = new ProgressType<Location[] | DefinitionLink[]>();
	export type HandlerSignature = RequestHandler<ImplementationParams, Definition | DefinitionLink[] | null, void>;
}