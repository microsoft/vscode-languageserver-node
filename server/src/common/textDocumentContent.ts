/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { TextDocumentContentRefreshRequest, TextDocumentContentRequest, type Disposable, type DocumentUri, type RequestHandler, type TextDocumentContentParams, type TextDocumentContentResult } from 'vscode-languageserver-protocol';

import type { Feature, _RemoteWorkspace } from './server';

/**
 * Shape of the text document content feature
 *
 * @since 3.18.0
 * @proposed
 */
export interface TextDocumentContentFeatureShape {
	textDocumentContent: {
		refresh(uri: DocumentUri): Promise<void>;
		on(handler: RequestHandler<TextDocumentContentParams, TextDocumentContentResult | null, void>): Disposable;
	};
}

export const TextDocumentContentFeature: Feature<_RemoteWorkspace, TextDocumentContentFeatureShape> = (Base) => {
	return class extends Base {
		public get textDocumentContent() {
			return {
				refresh: (uri: DocumentUri): Promise<void> => {
					return this.connection.sendRequest(TextDocumentContentRefreshRequest.type, { uri });
				},
				on: (handler: RequestHandler<TextDocumentContentParams, TextDocumentContentResult, void>): Disposable => {
					return this.connection.onRequest(TextDocumentContentRequest.type, (params, cancel) => {
						return handler(params, cancel);
					});
				}
			};
		}
	};
};