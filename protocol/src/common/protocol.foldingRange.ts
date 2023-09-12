/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestHandler, RequestHandler0 } from 'vscode-jsonrpc';
import { TextDocumentIdentifier, uinteger, FoldingRange, FoldingRangeKind } from 'vscode-languageserver-types';

import { MessageDirection, ProtocolRequestType, ProtocolRequestType0 } from './messages';
import type {
	TextDocumentRegistrationOptions, StaticRegistrationOptions, PartialResultParams, WorkDoneProgressParams, WorkDoneProgressOptions
} from './protocol';

// ---- capabilities

export interface FoldingRangeClientCapabilities {

	/**
	 * Whether implementation supports dynamic registration for folding range
	 * providers. If this is set to `true` the client supports the new
	 * `FoldingRangeRegistrationOptions` return value for the corresponding
	 * server capability as well.
	 */
	dynamicRegistration?: boolean;

	/**
	 * The maximum number of folding ranges that the client prefers to receive
	 * per document. The value serves as a hint, servers are free to follow the
	 * limit.
	 */
	rangeLimit?: uinteger;

	/**
	 * If set, the client signals that it only supports folding complete lines.
	 * If set, client will ignore specified `startCharacter` and `endCharacter`
	 * properties in a FoldingRange.
	 */
	lineFoldingOnly?: boolean;

	/**
	 * Specific options for the folding range kind.
	 *
	 * @since 3.17.0
	 */
	foldingRangeKind?: {
		/**
		 * The folding range kind values the client supports. When this
		 * property exists the client also guarantees that it will
		 * handle values outside its set gracefully and falls back
		 * to a default value when unknown.
		 */
		valueSet?: FoldingRangeKind[];
	};

	/**
	 * Specific options for the folding range.
	 *
	 * @since 3.17.0
	 */
	foldingRange?: {
		/**
		* If set, the client signals that it supports setting collapsedText on
		* folding ranges to display custom labels instead of the default text.
		*
		* @since 3.17.0
		*/
		collapsedText?: boolean;
	};

	/**
	 * Whether the client implementation supports a refresh request sent from the
	 * server to the client.
	 *
	 * Note that this event is global and will force the client to refresh all
	 * folding ranges currently shown. It should be used with absolute care and is
	 * useful for situation where a server for example detects a project wide
	 * change that requires such a calculation.
	 *
	 * @since 3.18.0
	 */
	refreshSupport?: boolean;
}

export interface FoldingRangeOptions extends WorkDoneProgressOptions {
}

export interface FoldingRangeRegistrationOptions extends TextDocumentRegistrationOptions, FoldingRangeOptions, StaticRegistrationOptions {
}

/**
 * Parameters for a {@link FoldingRangeRequest}.
 */
export interface FoldingRangeParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;
}

/**
 * A request to provide folding ranges in a document. The request's
 * parameter is of type {@link FoldingRangeParams}, the
 * response is of type {@link FoldingRangeList} or a Thenable
 * that resolves to such.
 */
export namespace FoldingRangeRequest {
	export const method: 'textDocument/foldingRange' = 'textDocument/foldingRange';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolRequestType<FoldingRangeParams, FoldingRange[] | null, FoldingRange[], void, FoldingRangeRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<FoldingRangeParams, FoldingRange[] | null, void>;
}

/**
 * @since 3.18.0
 */
export namespace FoldingRangeRefreshRequest {
	export const method: `workspace/foldingRange/refresh` = `workspace/foldingRange/refresh`;
	export const messageDirection: MessageDirection = MessageDirection.serverToClient;
	export const type = new ProtocolRequestType0<void, void, void, void>(method);
	export type HandlerSignature = RequestHandler0<void, void>;
}
