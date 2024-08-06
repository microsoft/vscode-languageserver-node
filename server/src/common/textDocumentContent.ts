/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { TextDocumentContentRequest, type Disposable, type RequestHandler, type TextDocumentContentParams } from 'vscode-languageserver-protocol';

import type { Feature, _RemoteWorkspace } from './server';

/**
 * Shape of the text document content feature
 *
 * @since 3.18.0
 * @proposed
 */
export interface TextDocumentContentFeatureShape {
	textDocumentContent: {
		on(handler: RequestHandler<TextDocumentContentParams, string | null, void>): Disposable;
	};
}

export const TextDocumentContentFeature: Feature<_RemoteWorkspace, TextDocumentContentFeatureShape> = (Base) => {
	return class extends Base {
		public get textDocumentContent() {
			return {
				on: (handler: RequestHandler<TextDocumentContentParams, string | null, void>): Disposable => {
					return this.connection.onRequest(TextDocumentContentRequest.type, (params, cancel) => {
						return handler(params, cancel);
					});
				}
			};
		}
	};
};