/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	RequestHandler, NotificationHandler, WorkspaceEdit,
	CreateFilesParams, DidCreateFilesNotification, WillCreateFilesRequest,
	RenameFilesParams, DidRenameFilesNotification, WillRenameFilesRequest,
	DeleteFilesParams, DidDeleteFilesNotification, WillDeleteFilesRequest,
} from 'vscode-languageserver-protocol';

import type { Feature, _RemoteWorkspace } from './server';

/**
 * Shape of the file operations feature
 *
 * @since 3.16.0
 */
export interface FileOperationsFeatureShape {
	onDidCreateFiles(handler: NotificationHandler<CreateFilesParams>): void;
	onDidRenameFiles(handler: NotificationHandler<RenameFilesParams>): void;
	onDidDeleteFiles(handler: NotificationHandler<DeleteFilesParams>): void;
	onWillCreateFiles(handler: RequestHandler<CreateFilesParams, WorkspaceEdit | null, never>): void;
	onWillRenameFiles(handler: RequestHandler<RenameFilesParams, WorkspaceEdit | null, never>): void;
	onWillDeleteFiles(handler: RequestHandler<DeleteFilesParams, WorkspaceEdit | null, never>): void;
}

export const FileOperationsFeature: Feature<_RemoteWorkspace, FileOperationsFeatureShape> = (Base) => {
	return class extends Base {
		public onDidCreateFiles(handler: NotificationHandler<CreateFilesParams>): void {
			this.connection.onNotification(DidCreateFilesNotification.type, (params) => {
				handler(params);
			});
		}
		public onDidRenameFiles(handler: NotificationHandler<RenameFilesParams>): void {
			this.connection.onNotification(DidRenameFilesNotification.type, (params) => {
				handler(params);
			});
		}
		public onDidDeleteFiles(handler: NotificationHandler<DeleteFilesParams>): void {
			this.connection.onNotification(DidDeleteFilesNotification.type, (params) => {
				handler(params);
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