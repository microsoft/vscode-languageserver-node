/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { FoldingRange, Disposable, FoldingRangeParams, FoldingRangeRefreshRequest, FoldingRangeRequest } from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the folding range feature
 */
export interface FoldingRangeFeatureShape {
	foldingRange: {
		/**
		 * Ask the client to refresh all folding ranges
		 *
		 * @since 3.18.0.
		 */
		refresh(): Promise<void>;

		/**
		 * Installs a handler for the folding range request.
		 *
		 * @param handler The corresponding handler.
		 */
		on(handler: ServerRequestHandler<FoldingRangeParams, FoldingRange[] | undefined | null, FoldingRange[], void>): Disposable;
	};
}

export const FoldingRangeFeature: Feature<_Languages, FoldingRangeFeatureShape> = (Base) => {
	return class extends Base implements FoldingRangeFeatureShape {
		public get foldingRange() {
			return {
				refresh: (): Promise<void> => {
					return this.connection.sendRequest(FoldingRangeRefreshRequest.type);
				},
				on: (handler: ServerRequestHandler<FoldingRangeParams, FoldingRange[] | undefined | null, FoldingRange[], void>): Disposable => {
					const type = FoldingRangeRequest.type;
					return this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				}
			};
		}
	};
};