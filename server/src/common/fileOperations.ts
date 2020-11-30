/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	RequestHandler, WorkspaceEdit,
	CreateFilesParams, DidCreateFilesNotification, WillCreateFilesRequest,
	RenameFilesParams, DidRenameFilesNotification, WillRenameFilesRequest,
	DeleteFilesParams, DidDeleteFilesNotification, WillDeleteFilesRequest,
} from 'vscode-languageserver-protocol';

import type { Feature, _RemoteWindow } from './server';

export interface FileOperationsFeatureShape {
	onDidCreateFiles(handler: RequestHandler<CreateFilesParams, void, never>): void;
	onDidRenameFiles(handler: RequestHandler<RenameFilesParams, void, never>): void;
	onDidDeleteFiles(handler: RequestHandler<DeleteFilesParams, void, never>): void;
	onWillCreateFiles(handler: RequestHandler<CreateFilesParams, WorkspaceEdit | null, never>): void;
	onWillRenameFiles(handler: RequestHandler<RenameFilesParams, WorkspaceEdit | null, never>): void;
	onWillDeleteFiles(handler: RequestHandler<DeleteFilesParams, WorkspaceEdit | null, never>): void;
}

export const FileOperationsFeature: Feature<_RemoteWindow, FileOperationsFeatureShape> = (Base) => {
	return class extends Base {
		public onDidCreateFiles(handler: RequestHandler<CreateFilesParams, void, never>): void {
			return this.connection.onRequest(DidCreateFilesNotification.type, (params, cancel) => {
				return handler(params, cancel);
			});
		}
		public onDidRenameFiles(handler: RequestHandler<RenameFilesParams, void, never>): void {
			return this.connection.onRequest(DidRenameFilesNotification.type, (params, cancel) => {
				return handler(params, cancel);
			});
		}
		public onDidDeleteFiles(handler: RequestHandler<DeleteFilesParams, void, never>): void {
			return this.connection.onRequest(DidDeleteFilesNotification.type, (params, cancel) => {
				return handler(params, cancel);
			});
		}
		public onWillCreateFiles(handler: RequestHandler<CreateFilesParams, WorkspaceEdit | null, never>): void {
			return this.connection.onRequest(WillCreateFilesRequest.type, (params, cancel) => {
				return handler(params, cancel);
			});
		}
		public onWillRenameFiles(handler: RequestHandler<RenameFilesParams, WorkspaceEdit | null, never>): void {
			return this.connection.onRequest(WillRenameFilesRequest.type, (params, cancel) => {
				return handler(params, cancel);
			});
		}
		public onWillDeleteFiles(handler: RequestHandler<DeleteFilesParams, WorkspaceEdit | null, never>): void {
			return this.connection.onRequest(WillDeleteFilesRequest.type, (params, cancel) => {
				return handler(params, cancel);
			});
		}
	};
};