/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler } from 'vscode-jsonrpc';
import { TextDocumentIdentifier, Range, Color, ColorInformation, ColorPresentation } from 'vscode-languageserver-types';

import { CM, MessageDirection, ProtocolRequestType } from './messages';
import {
	type TextDocumentRegistrationOptions, type StaticRegistrationOptions, type PartialResultParams, type WorkDoneProgressParams, type WorkDoneProgressOptions,
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
 * Parameters for a {@link DocumentColorRequest}.
 */
export interface DocumentColorParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;
}

/**
 * A request to list all color symbols found in a given text document. The request's
 * parameter is of type {@link DocumentColorParams} the
 * response is of type {@link ColorInformation ColorInformation[]} or a Thenable
 * that resolves to such.
 */
export namespace DocumentColorRequest {
	export const method: 'textDocument/documentColor' = 'textDocument/documentColor';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolRequestType<DocumentColorParams, ColorInformation[] | null, ColorInformation[], void, DocumentColorRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<DocumentColorParams, ColorInformation[] | null, void>;
	export const capabilities = CM.create('textDocument.colorProvider', 'colorProvider');
}

/**
 * Parameters for a {@link ColorPresentationRequest}.
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
 * parameter is of type {@link ColorPresentationParams} the
 * response is of type {@link ColorInformation ColorInformation[]} or a Thenable
 * that resolves to such.
 */
export namespace ColorPresentationRequest {
	export const method: 'textDocument/colorPresentation' = 'textDocument/colorPresentation';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolRequestType<ColorPresentationParams, ColorPresentation[] | null, ColorPresentation[], void, WorkDoneProgressOptions & TextDocumentRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<ColorPresentationParams, ColorPresentation[] | null, void>;
	export const capabilities = CM.create('textDocument.colorProvider', 'colorProvider');
}
