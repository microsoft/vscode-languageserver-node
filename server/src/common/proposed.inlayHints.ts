/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Proposed, Disposable, RequestHandler } from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the inlay hints feature
 *
 * @since 3.17.0 - proposed state
 */
export interface InlayHintsFeatureShape {
	inlayHints: {
		/**
		 * Ask the client to refresh all inlay hints.
		 */
		refresh(): Promise<void>;

		/**
		 * Installs a handler for the inlay hints request.
		 *
		 * @param handler The corresponding handler.
		 */
		on(handler: ServerRequestHandler<Proposed.InlayHintsParams, Proposed.InlayHint[] | undefined | null, Proposed.InlayHint[], void>): Disposable;

		/**
		 * Installs a handler for the inlay hint resolve request.
		 *
		 * @param handler The corresponding handler.
		 */
		resolve(handler: RequestHandler<Proposed.InlayHint, Proposed.InlayHint, void>): Disposable;
	};
}

export const InlayHintsFeature: Feature<_Languages, InlayHintsFeatureShape> = (Base) => {
	return class extends Base implements InlayHintsFeatureShape {
		public get inlayHints() {
			return {
				refresh: (): Promise<void> => {
					return this.connection.sendRequest(Proposed.InlayHintRefreshRequest.type);
				},
				on: (handler: ServerRequestHandler<Proposed.InlayHintsParams, Proposed.InlayHint[] | undefined | null, Proposed.InlayHint[], void>): Disposable => {
					return this.connection.onRequest(Proposed.InlayHintsRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params));
					});
				},
				resolve: (handler: RequestHandler<Proposed.InlayHint, Proposed.InlayHint, void>) => {
					return this.connection.onRequest(Proposed.InlayHintResolveRequest.type, (params, cancel) => {
						return handler(params, cancel);
					});
				}
			};
		}
	};
};