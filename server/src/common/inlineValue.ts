/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { InlineValue, Disposable, InlineValueParams, InlineValueRefreshRequest, InlineValueRequest } from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the inline values feature
 *
 * @since 3.17.0
 * @proposed
 */
export interface InlineValueFeatureShape {
	inlineValue: {
		/**
		 * Ask the client to refresh all inline values.
		 */
		refresh(): Promise<void>;

		/**
		 * Installs a handler for the inline values request.
		 *
		 * @param handler The corresponding handler.
		 */
		on(handler: ServerRequestHandler<InlineValueParams, InlineValue[] | undefined | null, InlineValue[], void>): Disposable;
	};
}

export const InlineValueFeature: Feature<_Languages, InlineValueFeatureShape> = (Base) => {
	return class extends Base implements InlineValueFeatureShape {
		public get inlineValue() {
			return {
				refresh: (): Promise<void> => {
					return this.connection.sendRequest(InlineValueRefreshRequest.type);
				},
				on: (handler: ServerRequestHandler<InlineValueParams, InlineValue[] | undefined | null, InlineValue[], void>): Disposable => {
					return this.connection.onRequest(InlineValueRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params));
					});
				}
			};
		}
	};
};