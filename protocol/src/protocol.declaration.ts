/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { RequestType, RequestHandler } from 'vscode-jsonrpc';
import { Declaration, DeclarationLink } from 'vscode-languageserver-types';
import { TextDocumentRegistrationOptions, StaticRegistrationOptions, TextDocumentPositionParams } from './protocol';

export interface DeclarationClientCapabilities {
	/**
	 * The text document client capabilities
	 */
	textDocument?: {
		/**
		 * Capabilities specific to the `textDocument/declaration`
		 */
		declaration?: {
			/**
			 * Whether declaration supports dynamic registration. If this is set to `true`
			 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
			 * return value for the corresponding server capability as well.
			 */
			dynamicRegistration?: boolean;

			/**
			 * The client supports additional metadata in the form of declaration links.
			 */
			declarationLinkSupport?: boolean;
		};
	}
}

export interface  DeclarationServerCapabilities {
	/**
	 * The server provides Goto Type Definition support.
	 */
	declarationProvider?: boolean | (TextDocumentRegistrationOptions & StaticRegistrationOptions);
}

/**
 * A request to resolve the type definition locations of a symbol at a given text
 * document position. The request's parameter is of type [TextDocumentPositioParams]
 * (#TextDocumentPositionParams) the response is of type [Declaration](#Declaration)
 * or a typed array of [DeclarationLink](#DeclarationLink) or a Thenable that resolves
 * to such.
 */
export namespace DeclarationRequest {
	export const type = new RequestType<TextDocumentPositionParams, Declaration | DeclarationLink[] | null, void, TextDocumentRegistrationOptions>('textDocument/declaration');
	export type HandlerSignature = RequestHandler<TextDocumentPositionParams, Declaration | DeclarationLink[] | null, void>;
}