/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { TextDocumentIdentifier, Range } from 'vscode-languageserver-types';
import { PartialResultParams, WorkDoneProgressParams, WorkDoneProgressOptions, TextDocumentRegistrationOptions, StaticRegistrationOptions } from './protocol';
import { ProtocolRequestType } from './messages';

export interface SemanticTokensLegend {
	/**
	 * The token types a server uses.
	 */
	tokenTypes: string[];

	/**
	 * The token modifiers a server uses.
	 */
	tokenModifiers: string[];
}

export interface SemanticTokens {
	/**
	 * An optional result id. If provided and clients support delta updating
	 * the client will include the result id in the next semantic token request.
	 * A server can then instead of computing all sematic tokens again simply
	 * send a delta.
	 */
	resultId?: string;

	/**
	 * The actual tokens
	 */
	data: number[];
}

export interface SemanticTokensPartialResult {
	data: number[];
}

export interface SemanticTokensEdit {
	start: number;
	deleteCount: number;
	data?: number[];
}

export interface SemanticTokensEdits {
	readonly resultId?: string;
	edits: SemanticTokensEdit[];
}

export interface SemanticTokensEditsPartialResult {
	edits: SemanticTokensEdit[]
}

//------- 'textDocument/semanticTokens' -----

export interface SemanticTokensClientCapabilities {
	/**
	 * The text document client capabilities
	 */
	textDocument?: {
		/**
		 * Capabilities specific to the `textDocument/semanticTokens`
		 */
		semanticTokens?: {
			/**
			 * Whether implementation supports dynamic registration. If this is set to `true`
			 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
			 * return value for the corresponding server capability as well.
			 */
			dynamicRegistration?: boolean;
		};
	}
}

export interface SemanticTokensOptions extends WorkDoneProgressOptions {
	/**
	 * The legend used by the server
	 */
	legend: SemanticTokensLegend;

	/**
	 * Server supports providing semantic tokens for a sepcific range
	 * of a document.
	 */
	rangeProvider?: boolean;

	/**
	 * Server supports providing semantic tokens for a full document.
	 */
	documentProvider?: boolean | {
		/**
		 * The server supports deltas for full documents.
		 */
		edits?: boolean;
	}
}

export interface SemanticTokensRegistrationOptions extends TextDocumentRegistrationOptions, SemanticTokensOptions, StaticRegistrationOptions {
}

export interface SemanticTokensServerCapabilities {
	semanticTokensProvider: SemanticTokensOptions | SemanticTokensRegistrationOptions;
}

//------- 'textDocument/semanticTokens' -----

export interface SemanticTokensParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;
}

export namespace SemanticTokensRequest {
	export const method: 'textDocument/semanticTokens' = 'textDocument/semanticTokens';
	export const type = new ProtocolRequestType<SemanticTokensParams, SemanticTokens | null, SemanticTokensPartialResult, void, SemanticTokensRegistrationOptions>(method);
}

//------- 'textDocument/semanticTokens/edits' -----

export interface SemanticTokensEditsParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The previous result id.
	 */
	previousResultId: string;
}

export namespace SemanticTokensEditsRequest {
	export const method: 'textDocument/semanticTokens/edits' = 'textDocument/semanticTokens/edits';
	export const type = new ProtocolRequestType<SemanticTokensEditsParams, SemanticTokens | SemanticTokensEdits | null, SemanticTokensPartialResult | SemanticTokensEditsPartialResult, void, SemanticTokensRegistrationOptions>(method);
}

//------- 'textDocument/semanticTokens/range' -----

export interface SemanticTokensRangeParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The range the semantic tokens are requested for.
	 */
	range: Range;
}

export namespace SemanticTokensRangeRequest {
	export const method: 'textDocument/semanticTokens/range' = 'textDocument/semanticTokens/range';
	export const type = new ProtocolRequestType<SemanticTokensRangeParams, SemanticTokens | null, SemanticTokensPartialResult, void, void>(method);
}