/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { TextDocumentIdentifier, Range } from 'vscode-languageserver-types';
import { PartialResultParams, WorkDoneProgressParams, WorkDoneProgressOptions, TextDocumentRegistrationOptions, StaticRegistrationOptions } from './protocol';
import { ProtocolRequestType } from './messages';

/**
 * A set of predefined token types. This set is not fixed
 * an clients can specify additional token types via the
 * corresponding client capabilities.
 *
 * @since 3.16.0 - Proposed state
 */
export enum SemanticTokenTypes {
	namespace = 'namespace',
	type = 'type',
	class = 'class',
	enum = 'enum',
	interface = 'interface',
	struct = 'struct',
	typeParameter = 'typeParameter',
	parameter = 'parameter',
	variable = 'variable',
	property = 'property',
	enumMember = 'enumMember',
	event = 'event',
	function = 'function',
	member = 'member',
	macro = 'macro',
	keyword = 'keyword',
	modifier = 'modifier',
	comment = 'comment',
	string = 'string',
	number = 'number',
	regexp = 'regexp',
	operator = 'operator'
}

/**
 * A set of predefined token modifiers. This set is not fixed
 * an clients can specify additional token types via the
 * corresponding client capabilities.
 *
 * @since 3.16.0 - Proposed state
 */
export enum SemanticTokenModifiers {
	declaration = 'declaration',
	definition = 'definition',
	readonly = 'readonly',
	static = 'static',
	deprecated = 'deprecated',
	abstract = 'abstract',
	async = 'async',
	import = 'import',
	modification = 'modification',
	documentation = 'documentation',
	defaultLibrary = 'defaultLibrary'
}

/**
 * @since 3.16.0 - Proposed state
 */
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

/**
 * @since 3.16.0 - Proposed state
 */
export interface SemanticTokens {
	/**
	 * An optional result id. If provided and clients support delta updating
	 * the client will include the result id in the next semantic token request.
	 * A server can then instead of computing all semantic tokens again simply
	 * send a delta.
	 */
	resultId?: string;

	/**
	 * The actual tokens. For a detailed description about how the data is
	 * structured pls see
	 * https://github.com/microsoft/vscode-extension-samples/blob/5ae1f7787122812dcc84e37427ca90af5ee09f14/semantic-tokens-sample/vscode.proposed.d.ts#L71
	 */
	data: number[];
}

/**
 * @since 3.16.0 - Proposed state
 */
export namespace SemanticTokens {
	export function is(value: any): value is SemanticTokens {
		const candidate = value as SemanticTokens;
		return candidate !== undefined && (candidate.resultId === undefined || typeof candidate.resultId === 'string') &&
			Array.isArray(candidate.data) && (candidate.data.length === 0 || typeof candidate.data[0] === 'number');
	}
}

/**
 * @since 3.16.0 - Proposed state
 */
export interface SemanticTokensPartialResult {
	data: number[];
}

/**
 * @since 3.16.0 - Proposed state
 */
export interface SemanticTokensEdit {
	/**
	 * The start offset of the edit.
	 */
	start: number;
	/**
	 * The count of elements to remove.
	 */
	deleteCount: number;
	/**
	 * The elements to insert.
	 */
	data?: number[];
}

/**
 * @since 3.16.0 - Proposed state
 */
export interface SemanticTokensEdits {
	readonly resultId?: string;
	/**
	 * For a detailed description how these edits are structured pls see
	 * https://github.com/microsoft/vscode-extension-samples/blob/5ae1f7787122812dcc84e37427ca90af5ee09f14/semantic-tokens-sample/vscode.proposed.d.ts#L131
	 */
	edits: SemanticTokensEdit[];
}

/**
 * @since 3.16.0 - Proposed state
 */
export interface SemanticTokensEditsPartialResult {
	edits: SemanticTokensEdit[]
}

//------- 'textDocument/semanticTokens' -----

/**
 * @since 3.16.0 - Proposed state
 */
export interface SemanticTokensClientCapabilities {
	/**
	 * The text document client capabilities
	 */
	textDocument?: {
		/**
		 * Capabilities specific to the `textDocument/semanticTokens`
		 *
		 * @since 3.16.0 - Proposed state
		 */
		semanticTokens?: {
			/**
			 * Whether implementation supports dynamic registration. If this is set to `true`
			 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
			 * return value for the corresponding server capability as well.
			 */
			dynamicRegistration?: boolean;

			/**
			 * The token types that the client supports.
			 */
			tokenTypes: string[];

			/**
			 * The token modifiers that the client supports.
			 */
			tokenModifiers: string[]
		};
	}
}

/**
 * @since 3.16.0 - Proposed state
 */
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

/**
 * @since 3.16.0 - Proposed state
 */
export interface SemanticTokensRegistrationOptions extends TextDocumentRegistrationOptions, SemanticTokensOptions, StaticRegistrationOptions {
}

/**
 * @since 3.16.0 - Proposed state
 */
export interface SemanticTokensServerCapabilities {
	semanticTokensProvider: SemanticTokensOptions | SemanticTokensRegistrationOptions;
}

//------- 'textDocument/semanticTokens' -----

/**
 * @since 3.16.0 - Proposed state
 */
export interface SemanticTokensParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;
}

/**
 * @since 3.16.0 - Proposed state
 */
export namespace SemanticTokensRequest {
	export const method: 'textDocument/semanticTokens' = 'textDocument/semanticTokens';
	export const type = new ProtocolRequestType<SemanticTokensParams, SemanticTokens | null, SemanticTokensPartialResult, void, SemanticTokensRegistrationOptions>(method);
}

//------- 'textDocument/semanticTokens/edits' -----

/**
 * @since 3.16.0 - Proposed state
 */
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

/**
 * @since 3.16.0 - Proposed state
 */
export namespace SemanticTokensEditsRequest {
	export const method: 'textDocument/semanticTokens/edits' = 'textDocument/semanticTokens/edits';
	export const type = new ProtocolRequestType<SemanticTokensEditsParams, SemanticTokens | SemanticTokensEdits | null, SemanticTokensPartialResult | SemanticTokensEditsPartialResult, void, SemanticTokensRegistrationOptions>(method);
}

//------- 'textDocument/semanticTokens/range' -----

/**
 * @since 3.16.0 - Proposed state
 */
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

/**
 * @since 3.16.0 - Proposed state
 */
export namespace SemanticTokensRangeRequest {
	export const method: 'textDocument/semanticTokens/range' = 'textDocument/semanticTokens/range';
	export const type = new ProtocolRequestType<SemanticTokensRangeParams, SemanticTokens | null, SemanticTokensPartialResult, void, void>(method);
}