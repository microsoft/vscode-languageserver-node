/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { LinkedEditingRangeParams, LinkedEditingRanges, LinkedEditingRangeRequest } from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

export interface LinkedEditingRangeFeatureShape {
	/**
	 * Installs a handler for the linked editing range request.
	 *
	 * @param handler The corresponding handler.
	 */
	onLinkedEditingRange(handler: ServerRequestHandler<LinkedEditingRangeParams, LinkedEditingRanges | undefined | null, never, never>): void;
}

export const LinkedEditingRangeFeature: Feature<_Languages, LinkedEditingRangeFeatureShape> = (Base) => {
	return class extends Base {
		public onLinkedEditingRange(handler: ServerRequestHandler<LinkedEditingRangeParams, LinkedEditingRanges | undefined | null, never, never>): void {
			this.connection.onRequest(LinkedEditingRangeRequest.type, (params, cancel) => {
				return handler(params, cancel, this.attachWorkDoneProgress(params), undefined);
			});
		}
	};
};