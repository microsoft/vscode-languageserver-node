/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestHandler } from 'vscode-jsonrpc';
import { TextDocumentIdentifier, Position, SelectionRange } from 'vscode-languageserver-types';

import { MessageDirection, ProtocolRequestType } from './messages';
import {
	type TextDocumentRegistrationOptions, type WorkDoneProgressOptions, type StaticRegistrationOptions, type WorkDoneProgressParams, type PartialResultParams,
	CM
} from './protocol';

// ---- capabilities

export interface SelectionRangeClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration for selection range providers. If this is set to `true`
	 * the client supports the new `SelectionRangeRegistrationOptions` return value for the corresponding server
	 * capability as well.
	 */
	dynamicRegistration?: boolean;
}

export interface SelectionRangeOptions extends WorkDoneProgressOptions {
}

export interface SelectionRangeRegistrationOptions extends SelectionRangeOptions, TextDocumentRegistrationOptions, StaticRegistrationOptions {
}

/**
 * A parameter literal used in selection range requests.
 */
export interface SelectionRangeParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The positions inside the text document.
	 */
	positions: Position[];
}

/**
 * A request to provide selection ranges in a document. The request's
 * parameter is of type {@link SelectionRangeParams}, the
 * response is of type {@link SelectionRange SelectionRange[]} or a Thenable
 * that resolves to such.
 */
export namespace SelectionRangeRequest {
	export const method: 'textDocument/selectionRange' = 'textDocument/selectionRange';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolRequestType<SelectionRangeParams, SelectionRange[] | null, SelectionRange[], void, SelectionRangeRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<SelectionRangeParams, SelectionRange[] | null, void>;
	export const capabilities = CM.create('textDocument.selectionRange', 'selectionRangeProvider');
}
