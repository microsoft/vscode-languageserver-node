/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { InlineCompletionItem, Disposable, InlineCompletionParams, InlineCompletionList, InlineCompletionRequest } from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the inline completions feature
 *
 * @since 3.18.0
 */
export interface InlineCompletionFeatureShape {
	inlineCompletion: {
		/**
		 * Installs a handler for the inline completions request.
		 *
		 * @param handler The corresponding handler.
		 */
		on(handler: ServerRequestHandler<InlineCompletionParams, InlineCompletionList | InlineCompletionItem[] | undefined | null, InlineCompletionItem[], void>): Disposable;
	};
}

export const InlineCompletionFeature: Feature<_Languages, InlineCompletionFeatureShape> = (Base) => {
	return class extends Base implements InlineCompletionFeatureShape {
		public get inlineCompletion() {
			return {
				on: (handler: ServerRequestHandler<InlineCompletionParams, InlineCompletionList | InlineCompletionItem[] | undefined | null, InlineCompletionItem[], void>): Disposable => {
					return this.connection.onRequest(InlineCompletionRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params));
					});
				}
			};
		}
	};
};