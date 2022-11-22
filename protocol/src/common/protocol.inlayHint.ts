/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestHandler, RequestHandler0 } from 'vscode-jsonrpc';
import { Range, TextDocumentIdentifier, InlayHint } from 'vscode-languageserver-types';
import { MessageDirection, ProtocolRequestType, ProtocolRequestType0 } from './messages';

import type { StaticRegistrationOptions, TextDocumentRegistrationOptions, WorkDoneProgressOptions, WorkDoneProgressParams } from './protocol';

/**
 * Inlay hint client capabilities.
 *
 * @since 3.17.0
 */
export type InlayHintClientCapabilities = {

	/**
	 * Whether inlay hints support dynamic registration.
	 */
	dynamicRegistration?: boolean;

	/**
	 * Indicates which properties a client can resolve lazily on an inlay
	 * hint.
	 */
	resolveSupport?: {

		/**
		 * The properties that a client can resolve lazily.
		 */
		properties: string[];
	};
};

/**
 * Client workspace capabilities specific to inlay hints.
 *
 * @since 3.17.0
 */
export type InlayHintWorkspaceClientCapabilities = {
	/**
	 * Whether the client implementation supports a refresh request sent from
	 * the server to the client.
	 *
	 * Note that this event is global and will force the client to refresh all
	 * inlay hints currently shown. It should be used with absolute care and
	 * is useful for situation where a server for example detects a project wide
	 * change that requires such a calculation.
	 */
	refreshSupport?: boolean;
};


/**
 * Inlay hint options used during static registration.
 *
 * @since 3.17.0
 */
export type InlayHintOptions = WorkDoneProgressOptions & {
	/**
	 * The server provides support to resolve additional
	 * information for an inlay hint item.
	 */
	resolveProvider?: boolean;
};

/**
 * Inlay hint options used during static or dynamic registration.
 *
 * @since 3.17.0
 */
export type InlayHintRegistrationOptions = InlayHintOptions & TextDocumentRegistrationOptions & StaticRegistrationOptions;

/**
 * A parameter literal used in inlay hint requests.
 *
 * @since 3.17.0
 */
export type InlayHintParams = WorkDoneProgressParams & {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The document range for which inlay hints should be computed.
	 */
	range: Range;
};

/**
 * A request to provide inlay hints in a document. The request's parameter is of
 * type {@link InlayHintsParams}, the response is of type
 * {@link InlayHint InlayHint[]} or a Thenable that resolves to such.
 *
 * @since 3.17.0
 */
export namespace InlayHintRequest {
	export const method: 'textDocument/inlayHint' = 'textDocument/inlayHint';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolRequestType<InlayHintParams, InlayHint[] | null, InlayHint[], void, InlayHintRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<InlayHintParams, InlayHint[] | null, void>;
}

/**
 * A request to resolve additional properties for an inlay hint.
 * The request's parameter is of type {@link InlayHint}, the response is
 * of type {@link InlayHint} or a Thenable that resolves to such.
 *
 * @since 3.17.0
 */
export namespace InlayHintResolveRequest {
	export const method: 'inlayHint/resolve' = 'inlayHint/resolve';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolRequestType<InlayHint, InlayHint, never, void, void>(method);
	export type HandlerSignature = RequestHandler<InlayHint, InlayHint, void>;
}

/**
 * @since 3.17.0
 */
export namespace InlayHintRefreshRequest {
	export const method: `workspace/inlayHint/refresh` = `workspace/inlayHint/refresh`;
	export const messageDirection: MessageDirection = MessageDirection.serverToClient;
	export const type = new ProtocolRequestType0<void, void, void, void>(method);
	export type HandlerSignature = RequestHandler0<void, void>;
}
