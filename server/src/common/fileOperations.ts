/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { WorkspaceEdit } from 'vscode-languageserver-protocol';
import { CreateFilesParams, WillCreateFilesRequest } from 'vscode-languageserver-protocol/lib/common/protocol.window.fileOperations';
import type { Feature, _RemoteWindow, ServerRequestHandler } from './server';

export interface FileOperationsFeatureShape {
	onWillCreateFiles(handler: ServerRequestHandler<CreateFilesParams, WorkspaceEdit | undefined | null, never, never>): void;
}

export const FileOperationsFeature: Feature<_RemoteWindow, FileOperationsFeatureShape> = (Base) => {
	// TODO(dantup): This isn't right.. This is shared server code, and this is the test servers implementation!
	return class extends Base {

		public onWillCreateFiles(handler: ServerRequestHandler<CreateFilesParams, WorkspaceEdit | undefined | null, never, never>): void {
			this.connection.onRequest(WillCreateFilesRequest.type, (params, cancel) => {
				return handler(params, cancel, this.attachWorkDoneProgress(params), undefined);
			});
		}
	};
};

