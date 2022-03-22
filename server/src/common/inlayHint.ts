/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { InlayHint, InlayHintParams,Disposable, RequestHandler, InlayHintRefreshRequest, InlayHintRequest, InlayHintResolveRequest } from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the inlay hints feature
 *
 * @since 3.17.0
 * @proposed
 */
export interface InlayHintFeatureShape {
	inlayHint: {
		/**
		 * Ask the client to refresh all inlay hints.
		 */
		refresh(): Promise<void>;

		/**
		 * Installs a handler for the inlay hints request.
		 *
		 * @param handler The corresponding handler.
		 */
		on(handler: ServerRequestHandler<InlayHintParams, InlayHint[] | undefined | null, InlayHint[], void>): Disposable;

		/**
		 * Installs a handler for the inlay hint resolve request.
		 *
		 * @param handler The corresponding handler.
		 */
		resolve(handler: RequestHandler<InlayHint, InlayHint, void>): Disposable;
	};
}

export const InlayHintFeature: Feature<_Languages, InlayHintFeatureShape> = (Base) => {
	return class extends Base implements InlayHintFeatureShape {
		public get inlayHint() {
			return {
				refresh: (): Promise<void> => {
					return this.connection.sendRequest(InlayHintRefreshRequest.type);
				},
				on: (handler: ServerRequestHandler<InlayHintParams, InlayHint[] | undefined | null, InlayHint[], void>): Disposable => {
					return this.connection.onRequest(InlayHintRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params));
					});
				},
				resolve: (handler: RequestHandler<InlayHint, InlayHint, void>) => {
					return this.connection.onRequest(InlayHintResolveRequest.type, (params, cancel) => {
						return handler(params, cancel);
					});
				}
			};
		}
	};
};