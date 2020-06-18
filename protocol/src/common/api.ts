/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

export * from 'vscode-jsonrpc';
export * from 'vscode-languageserver-types';

export * from './messages';
export * from './protocol';

export { ProtocolConnection, createProtocolConnection } from './connection';

import * as st from './protocol.semanticTokens.proposed';

export namespace Proposed {
	export const SemanticTokenTypes = st.SemanticTokenTypes;
	export const SemanticTokenModifiers = st.SemanticTokenModifiers;
	export type SemanticTokensLegend = st.SemanticTokensLegend;
	export type SemanticTokens = st.SemanticTokens;
	export const SemanticTokens = st.SemanticTokens;
	export type SemanticTokensPartialResult = st.SemanticTokensPartialResult;
	export type SemanticTokensEdit = st.SemanticTokensEdit;
	export type SemanticTokensDelta = st.SemanticTokensDelta;
	export type SemanticTokensDeltaPartialResult = st.SemanticTokensDeltaPartialResult;

	export type SemanticTokensClientCapabilities = st.SemanticTokensClientCapabilities;
	export type SemanticTokensOptions = st.SemanticTokensOptions;
	export type SemanticTokensRegistrationOptions = st.SemanticTokensRegistrationOptions;
	export type SemanticTokensServerCapabilities = st.SemanticTokensServerCapabilities;

	export type SemanticTokensParams = st.SemanticTokensParams;
	export namespace SemanticTokensRequest {
		export const method = st.SemanticTokensRequest.method;
		export const type = st.SemanticTokensRequest.type;
	}

	export type SemanticTokensDeltaParams = st.SemanticTokensDeltaParams;
	export namespace SemanticTokensDeltaRequest {
		export const method = st.SemanticTokensDeltaRequest.method;
		export const type = st.SemanticTokensDeltaRequest.type;
	}

	export type SemanticTokensRangeParams = st.SemanticTokensRangeParams;
	export namespace SemanticTokensRangeRequest {
		export const method = st.SemanticTokensRangeRequest.method;
		export const type = st.SemanticTokensRangeRequest.type;
	}
}