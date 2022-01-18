/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Proposed, InlineValue } from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the inline values feature
 *
 * @since 3.17.0 - proposed state
 */
export interface InlineValuesFeatureShape {
	inlineValues: {
		/**
		 * Installs a handler for the inline values request.
		 *
		 * @param handler The corresponding handler.
		 */
		on(handler: ServerRequestHandler<Proposed.InlineValuesParams, InlineValue[] | undefined | null, InlineValue[], void>): void;
	};
}

export const InlineValuesFeature: Feature<_Languages, InlineValuesFeatureShape> = (Base) => {
	return class extends Base {
		public get inlineValues() {
			return {
				on: (handler: ServerRequestHandler<Proposed.InlineValuesParams, InlineValue[] | undefined | null, InlineValue[], void>): void => {
					this.connection.onRequest(Proposed.InlineValuesRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params));
					});
				}
			};
		}
	};
};