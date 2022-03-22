/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TextDocumentIdentifier, Range, InlineValue, InlineValueContext } from 'vscode-languageserver-types';
import { RequestHandler, RequestHandler0 } from 'vscode-jsonrpc';

import { ProtocolRequestType, ProtocolRequestType0 } from './messages';
import type { TextDocumentRegistrationOptions, WorkDoneProgressOptions, StaticRegistrationOptions, WorkDoneProgressParams } from './protocol';

// ---- capabilities

/**
 * Client capabilities specific to inline values.
 *
 * @since 3.17.0
 * @proposed
 */
export type InlineValueClientCapabilities = {
	/**
	 * Whether implementation supports dynamic registration for inline value providers.
	 */
	dynamicRegistration?: boolean;
};

/**
 * Client workspace capabilities specific to inline values.
 *
 * @since 3.17.0
 * @proposed
 */
export type InlineValueWorkspaceClientCapabilities = {
	/**
	 * Whether the client implementation supports a refresh request sent from the
	 * server to the client.
	 *
	 * Note that this event is global and will force the client to refresh all
	 * inline values currently shown. It should be used with absolute care and is
	 * useful for situation where a server for example detects a project wide
	 * change that requires such a calculation.
	 */
	refreshSupport?: boolean;
};

/**
 * Inline value options used during static registration.
 *
 * @since 3.17.0
 * @proposed
 */
export type InlineValueOptions = WorkDoneProgressOptions;

/**
 * Inline value options used during static or dynamic registration.
 *
 * @since 3.17.0
 * @proposed
 */
export type InlineValueRegistrationOptions = InlineValueOptions & TextDocumentRegistrationOptions & StaticRegistrationOptions;

/**
 * A parameter literal used in inline value requests.
 *
 * @since 3.17.0
 * @proposed
 */
export type InlineValueParams = WorkDoneProgressParams & {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The document range for which inline values should be computed.
	 */
	range: Range;

	/**
	 * Additional information about the context in which inline values were
	 * requested.
	 */
	context: InlineValueContext;
};

/**
 * A request to provide inline values in a document. The request's parameter is of
 * type [InlineValueParams](#InlineValueParams), the response is of type
 * [InlineValue[]](#InlineValue[]) or a Thenable that resolves to such.
 *
 * @since 3.17.0
 * @proposed
 */
export namespace InlineValueRequest {
	export const method: 'textDocument/inlineValue' = 'textDocument/inlineValue';
	export const type = new ProtocolRequestType<InlineValueParams, InlineValue[] | null, InlineValue[], void, InlineValueRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<InlineValueParams, InlineValue[] | null, void>;
}

/**
 * @since 3.17.0
 * @proposed
 */
export namespace InlineValueRefreshRequest {
	export const method: `workspace/inlineValue/refresh` = `workspace/inlineValue/refresh`;
	export const type = new ProtocolRequestType0<void, void, void, void>(method);
	export type HandlerSignature = RequestHandler0<void, void>;
}