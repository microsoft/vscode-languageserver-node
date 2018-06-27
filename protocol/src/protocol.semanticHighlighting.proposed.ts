/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { NotificationType } from 'vscode-jsonrpc';
import { VersionedTextDocumentIdentifier } from 'vscode-languageserver-types';

/**
 * Parameters for the semantic highlighting (server-side) push notification.
 */
export interface SemanticHighlightingParams {

	/**
	 * The text document that has to be decorated with the semantic highlighting information.
	 */
	textDocument: VersionedTextDocumentIdentifier;

	/**
	 * An array of semantic highlighting information.
	 */
	lines: SemanticHighlightingInformation[];

}

/**
 * Represents a semantic highlighting information that has to be applied on a specific line of the text document.
 */
export interface SemanticHighlightingInformation {

	/**
	 * The zero-based line position in the text document.
	 */
	line: number;

	/**
	 * A base64 encoded string representing every single highlighted characters with its start position, length and the "lookup table" index of
	 * of the semantic highlighting [TextMate scopes](https://manual.macromates.com/en/language_grammars).
	 * If the `tokens` is empty or not defined, then no highlighted positions are available for the line.
	 */
	tokens?: string;

}

/**
 * Language server push notification providing the semantic highlighting information for a text document.
 */
export namespace SemanticHighlightingNotification {
	export const type = new NotificationType<SemanticHighlightingParams, void>('textDocument/semanticHighlighting');
}

/**
 * Capability that has to be set by the language client if that supports the semantic highlighting feature for the text documents.
 */
export interface SemanticHighlightingClientCapabilities {

	/**
	 * The text document client capabilities.
	 */
	textDocument?: {

		/**
		 * The client's semantic highlighting capability.
		 */
		semanticHighlightingCapabilities?: {

			/**
			 * `true` if the client supports semantic highlighting support text documents. Otherwise, `false`. It is `false` by default.
			 */
			semanticHighlighting: boolean;

		}

	}
}

/**
 * Semantic highlighting server capabilities.
 */
export interface SemanticHighlightingServerCapabilities {

	/**
	 * A "lookup table" of semantic highlighting [TextMate scopes](https://manual.macromates.com/en/language_grammars)
	 * supported by the language server. If not defined or empty, then the server does not support the semantic highlighting
	 * feature. Otherwise, clients should reuse this "lookup table" when receiving semantic highlighting notifications from
	 * the server.
	 */
	scopes?: string[][];

}
