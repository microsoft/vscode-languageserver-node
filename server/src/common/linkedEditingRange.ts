/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { LinkedEditingRangeParams, LinkedEditingRanges, LinkedEditingRangeRequest, Disposable } from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the linked editing feature
 *
 * @since 3.16.0
 */
export interface LinkedEditingRangeFeatureShape {
	/**
	 * Installs a handler for the linked editing range request.
	 *
	 * @param handler The corresponding handler.
	 */
	onLinkedEditingRange(handler: ServerRequestHandler<LinkedEditingRangeParams, LinkedEditingRanges | undefined | null, never, never>): Disposable;
}

export const LinkedEditingRangeFeature: Feature<_Languages, LinkedEditingRangeFeatureShape> = (Base) => {
	return class extends Base {
		public onLinkedEditingRange(handler: ServerRequestHandler<LinkedEditingRangeParams, LinkedEditingRanges | undefined | null, never, never>): Disposable {
			return this.connection.onRequest(LinkedEditingRangeRequest.type, (params, cancel) => {
				return handler(params, cancel, this.attachWorkDoneProgress(params), undefined);
			});
		}
	};
};
