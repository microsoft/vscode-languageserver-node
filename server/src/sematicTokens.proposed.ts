/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Proposed } from 'vscode-languageserver-protocol';
import { Feature, _Languages, ServerRequestHandler } from './main';

export interface SemanticTokens {
	semanticTokens: {
		on(handler: ServerRequestHandler<Proposed.SemanticTokensParams, Proposed.SemanticTokens, Proposed.SemanticTokensPartialResult, void>): void;
		onEdits(handler: ServerRequestHandler<Proposed.SemanticTokensEditsParams, Proposed.SemanticTokensEdits, Proposed.SemanticTokensEditsPartialResult, void>): void;
		onRange(handler: ServerRequestHandler<Proposed.SemanticTokensRangeParams, Proposed.SemanticTokens, Proposed.SemanticTokensPartialResult, void>): void;
	}
}

export const SemanticTokensFeature: Feature<_Languages, SemanticTokens> = (Base) => {
	return class extends Base {
		public get semanticTokens() {
			return {
				on: (handler: ServerRequestHandler<Proposed.SemanticTokensParams, Proposed.SemanticTokens, Proposed.SemanticTokensPartialResult, void>): void => {
					const type = Proposed.SemanticTokensRequest.type;
					this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				},
				onEdits: (handler: ServerRequestHandler<Proposed.SemanticTokensEditsParams, Proposed.SemanticTokensEdits, Proposed.SemanticTokensEditsPartialResult, void>): void => {
					const type = Proposed.SemanticTokensEditsRequest.type;
					this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				},
				onRange: (handler: ServerRequestHandler<Proposed.SemanticTokensRangeParams, Proposed.SemanticTokens, Proposed.SemanticTokensPartialResult, void>): void => {
					const type = Proposed.SemanticTokensRangeRequest.type;
					this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				}
			};
		}
	};
};