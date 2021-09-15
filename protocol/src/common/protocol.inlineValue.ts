/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestHandler } from 'vscode-jsonrpc';
import { TextDocumentIdentifier, Range, InlineValue, InlineValuesContext } from 'vscode-languageserver-types';

import { ProtocolRequestType } from './messages';
import { TextDocumentRegistrationOptions, WorkDoneProgressOptions, StaticRegistrationOptions, WorkDoneProgressParams } from './protocol';

// ---- capabilities

export interface InlineValuesClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration for inline value providers.
	 */
	dynamicRegistration?: boolean;
}

export interface InlineValuesOptions extends WorkDoneProgressOptions {
}

export interface InlineValuesRegistrationOptions extends InlineValuesOptions, TextDocumentRegistrationOptions, StaticRegistrationOptions {
}

/**
 * A parameter literal used in selection range requests.
 */
export interface InlineValuesParams extends WorkDoneProgressParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The visible document range for which inline values should be computed.
	 */
	viewPort: Range;

	/**
	 * Additional information about the context in which inline values were
	 * requested.
	 */
	context: InlineValuesContext;
}

/**
 * A request to provide inline values in a document. The request's
 * parameter is of type [InlineValuesParams](#InlineValuesParams), the
 * response is of type [InlineValue[]](#InlineValue[]) or a Thenable
 * that resolves to such.
 */
export namespace InlineValuesRequest {
	export const method: 'textDocument/inlineValues' = 'textDocument/inlineValues';
	export const type = new ProtocolRequestType<InlineValuesParams, InlineValue[] | null, InlineValue[], any, InlineValuesRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<InlineValuesParams, InlineValue[] | null, void>;
}
