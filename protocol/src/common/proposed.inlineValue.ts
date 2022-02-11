/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TextDocumentIdentifier, Range, InlineValue, InlineValuesContext } from 'vscode-languageserver-types';
import { RequestHandler, RequestHandler0 } from 'vscode-jsonrpc';

import { ProtocolRequestType, ProtocolRequestType0 } from './messages';
import { TextDocumentRegistrationOptions, WorkDoneProgressOptions, StaticRegistrationOptions, WorkDoneProgressParams } from './protocol';

// ---- capabilities

/**
 * Client capabilities specific to inline values.
 *
 * @since 3.17.0 - proposed state
 */
export type InlineValuesClientCapabilities = {
	/**
	 * Whether implementation supports dynamic registration for inline value providers.
	 */
	dynamicRegistration?: boolean;
};

/**
 * Client workspace capabilities specific to inline values.
 *
 * @since 3.17.0 - proposed state
 */
export type InlineValuesWorkspaceClientCapabilities = {
	/**
	 * Whether the client implementation supports a refresh request sent from the
	 * server to the client.
	 *
	 * Note that this event is global and will force the client to refresh all
	 * inline values currently shown. It should be used with absolute care and is
	 * useful for situation where a server for example detect a project wide
	 * change that requires such a calculation.
	 */
	refreshSupport?: boolean;
};

/**
 * Inline values options used during static registration.
 *
 * @since 3.17.0 - proposed state
 */
export type InlineValuesOptions = WorkDoneProgressOptions;

/**
 * Inline value options used during static or dynamic registration.
 *
 * @since 3.17.0 - proposed state
 */
export type InlineValuesRegistrationOptions = InlineValuesOptions & TextDocumentRegistrationOptions & StaticRegistrationOptions;

/**
 * A parameter literal used in inline values requests.
 *
 * @since 3.17.0 - proposed state
 */
export type InlineValuesParams = WorkDoneProgressParams & {
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
};

/**
 * A request to provide inline values in a document. The request's parameter is of
 * type [InlineValuesParams](#InlineValuesParams), the response is of type
 * [InlineValue[]](#InlineValue[]) or a Thenable that resolves to such.
 *
 * @since 3.17.0 - proposed state
 */
export namespace InlineValuesRequest {
	export const method: 'textDocument/inlineValues' = 'textDocument/inlineValues';
	export const type = new ProtocolRequestType<InlineValuesParams, InlineValue[] | null, InlineValue[], any, InlineValuesRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<InlineValuesParams, InlineValue[] | null, void>;
}

/**
 * @since 3.17.0 - proposed state
 */
export namespace InlineValuesRefreshRequest {
	export const method: `workspace/inlineValues/refresh` = `workspace/inlineValues/refresh`;
	export const type = new ProtocolRequestType0<void, void, void, void>(method);
	export type HandlerSignature = RequestHandler0<void, void>;
}