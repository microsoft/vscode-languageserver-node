/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Proposed, InlineValue, Disposable } from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the inline values feature
 *
 * @since 3.17.0 - proposed state
 */
export interface InlineValuesFeatureShape {
	inlineValues: {
		/**
		 * Ask the client to refresh all inline values.
		 */
		refresh(): Promise<void>;

		/**
		 * Installs a handler for the inline values request.
		 *
		 * @param handler The corresponding handler.
		 */
		on(handler: ServerRequestHandler<Proposed.InlineValueParams, InlineValue[] | undefined | null, InlineValue[], void>): Disposable;
	};
}

export const InlineValuesFeature: Feature<_Languages, InlineValuesFeatureShape> = (Base) => {
	return class extends Base implements InlineValuesFeatureShape {
		public get inlineValues() {
			return {
				refresh: (): Promise<void> => {
					return this.connection.sendRequest(Proposed.InlineValueRefreshRequest.type);
				},
				on: (handler: ServerRequestHandler<Proposed.InlineValueParams, InlineValue[] | undefined | null, InlineValue[], void>): Disposable => {
					return this.connection.onRequest(Proposed.InlineValueRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params));
					});
				}
			};
		}
	};
};