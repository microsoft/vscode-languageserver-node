/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import type { DocumentUri } from 'vscode-languageserver-types';
import type { RequestHandler } from 'vscode-jsonrpc';

import { MessageDirection, ProtocolRequestType, CM } from './messages';
import { type StaticRegistrationOptions } from './protocol';

/**
 * Client capabilities for a text document content provider.
 *
 * @since 3.18.0
 * @proposed
 */
export type TextDocumentContentClientCapabilities = {
	/**
	 * Text document content provider supports dynamic registration.
	 */
	dynamicRegistration?: boolean;
};

/**
 * Text document content provider options.
 *
 * @since 3.18.0
 * @proposed
 */
export type TextDocumentContentOptions = {
	/**
	 * The schemes for which the server provides content.
	 */
	schemes: string[];
};

/**
 * Text document content provider registration options.
 *
 * @since 3.18.0
 * @proposed
 */
export type TextDocumentContentRegistrationOptions = TextDocumentContentOptions & StaticRegistrationOptions;

/**
 * Parameters for the `workspace/textDocumentContent` request.
 *
 * @since 3.18.0
 * @proposed
 */
export interface TextDocumentContentParams {
	/**
	 * The uri of the text document.
	 */
	uri: DocumentUri;
}

/**
 * Result of the `workspace/textDocumentContent` request.
 *
 * @since 3.18.0
 * @proposed
 */
export interface TextDocumentContentResult {
	/**
	 * The text content of the text document. Please note, that the content of
	 * any subsequent open notifications for the text document might differ
	 * from the returned content due to whitespace and line ending
	 * normalizations done on the client
	 */
	text: string;
}

/**
 * The `workspace/textDocumentContent` request is sent from the client to the
 * server to request the content of a text document.
 *
 * @since 3.18.0
 * @proposed
 */
export namespace TextDocumentContentRequest {
	export const method: 'workspace/textDocumentContent' = 'workspace/textDocumentContent';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolRequestType<TextDocumentContentParams, TextDocumentContentResult, void, void, TextDocumentContentRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<TextDocumentContentParams, TextDocumentContentResult, void>;
	export const capabilities = CM.create('workspace.textDocumentContent', 'workspace.textDocumentContent');
}

/**
 * Parameters for the `workspace/textDocumentContent/refresh` request.
 *
 * @since 3.18.0
 * @proposed
 */
export interface TextDocumentContentRefreshParams {
	/**
	 * The uri of the text document to refresh.
	 */
	uri: DocumentUri;
}

/**
 * The `workspace/textDocumentContent` request is sent from the server to the client to refresh
 * the content of a specific text document.
 *
 * @since 3.18.0
 * @proposed
 */
export namespace TextDocumentContentRefreshRequest {
	export const method: `workspace/textDocumentContent/refresh` = `workspace/textDocumentContent/refresh`;
	export const messageDirection: MessageDirection = MessageDirection.serverToClient;
	export const type = new ProtocolRequestType<TextDocumentContentRefreshParams, void, void, void, void>(method);
	export type HandlerSignature = RequestHandler<TextDocumentContentRefreshParams, void, void>;
}
