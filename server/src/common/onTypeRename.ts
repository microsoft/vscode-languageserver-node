/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { OnTypeRenameParams, OnTypeRenameRanges, OnTypeRenameRequest } from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

export interface OnTypeRenameFeatureShape {
	/**
	 * Installs a handler for the on type rename request.
	 *
	 * @param handler The corresponding handler.
	 */
	onOnTypeRename(handler: ServerRequestHandler<OnTypeRenameParams, OnTypeRenameRanges | undefined | null, never, never>): void;
}

export const OnTypeRenameFeature: Feature<_Languages, OnTypeRenameFeatureShape> = (Base) => {
	return class extends Base {
		public onOnTypeRename(handler: ServerRequestHandler<OnTypeRenameParams, OnTypeRenameRanges | undefined | null, never, never>): void {
			this.connection.onRequest(OnTypeRenameRequest.type, (params, cancel) => {
				return handler(params, cancel, this.attachWorkDoneProgress(params), undefined);
			});
		}
	};
};