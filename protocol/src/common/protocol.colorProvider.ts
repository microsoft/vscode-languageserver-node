/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler } from 'vscode-jsonrpc';
import { TextDocumentIdentifier, Range, Color, ColorInformation, ColorPresentation } from 'vscode-languageserver-types';

import { MessageDirection, ProtocolRequestType } from './messages';
import type {
	TextDocumentRegistrationOptions, StaticRegistrationOptions, PartialResultParams, WorkDoneProgressParams, WorkDoneProgressOptions
} from './protocol';

//---- Client capability ----

export interface DocumentColorClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration. If this is set to `true`
	 * the client supports the new `DocumentColorRegistrationOptions` return value
	 * for the corresponding server capability as well.
	 */
	dynamicRegistration?: boolean;
}

export interface DocumentColorOptions extends WorkDoneProgressOptions {
}

export interface DocumentColorRegistrationOptions extends TextDocumentRegistrationOptions, StaticRegistrationOptions, DocumentColorOptions {
}

//---- Color Symbol Provider ---------------------------

/**
 * Parameters for a [DocumentColorRequest](#DocumentColorRequest).
 */
export interface DocumentColorParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;
}

/**
 * A request to list all color symbols found in a given text document. The request's
 * parameter is of type [DocumentColorParams](#DocumentColorParams) the
 * response is of type [ColorInformation[]](#ColorInformation) or a Thenable
 * that resolves to such.
 */
export namespace DocumentColorRequest {
	export const method: 'textDocument/documentColor' = 'textDocument/documentColor';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolRequestType<DocumentColorParams, ColorInformation[], ColorInformation[], void, DocumentColorRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<DocumentColorParams, ColorInformation[], void>;
}

/**
 * Parameters for a [ColorPresentationRequest](#ColorPresentationRequest).
 */
export interface ColorPresentationParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The color to request presentations for.
	 */
	color: Color;

	/**
	 * The range where the color would be inserted. Serves as a context.
	 */
	range: Range;
}

/**
 * A request to list all presentation for a color. The request's
 * parameter is of type [ColorPresentationParams](#ColorPresentationParams) the
 * response is of type [ColorInformation[]](#ColorInformation) or a Thenable
 * that resolves to such.
 */
export namespace ColorPresentationRequest {
	export const method: 'textDocument/colorPresentation' = 'textDocument/colorPresentation';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolRequestType<ColorPresentationParams, ColorPresentation[], ColorPresentation[], void, WorkDoneProgressOptions & TextDocumentRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<ColorPresentationParams, ColorPresentation[], void>;
}
