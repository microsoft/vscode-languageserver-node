/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler, WorkspaceEdit, CreateFilesParams, WillCreateFilesRequest } from 'vscode-languageserver-protocol';

import type { Feature, _RemoteWindow } from './server';

export interface FileOperationsFeatureShape {
	onWillCreateFiles(handler: RequestHandler<CreateFilesParams, WorkspaceEdit | null, never>): void;
}

export const FileOperationsFeature: Feature<_RemoteWindow, FileOperationsFeatureShape> = (Base) => {
	return class extends Base {
		public onWillCreateFiles(handler: RequestHandler<CreateFilesParams, WorkspaceEdit | null, never>): void {
			return this.connection.onRequest(WillCreateFilesRequest.type, (params, cancel) => {
				return handler(params, cancel);
			});
		}
	};
};