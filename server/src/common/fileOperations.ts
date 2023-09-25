/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	RequestHandler, NotificationHandler, WorkspaceEdit,
	CreateFilesParams, DidCreateFilesNotification, WillCreateFilesRequest,
	RenameFilesParams, DidRenameFilesNotification, WillRenameFilesRequest,
	DeleteFilesParams, DidDeleteFilesNotification, WillDeleteFilesRequest, Disposable,
} from 'vscode-languageserver-protocol';

import type { Feature, _RemoteWorkspace } from './server';

/**
 * Shape of the file operations feature
 *
 * @since 3.16.0
 */
export interface FileOperationsFeatureShape {
	onDidCreateFiles(handler: NotificationHandler<CreateFilesParams>): Disposable;
	onDidRenameFiles(handler: NotificationHandler<RenameFilesParams>): Disposable;
	onDidDeleteFiles(handler: NotificationHandler<DeleteFilesParams>): Disposable;
	onWillCreateFiles(handler: RequestHandler<CreateFilesParams, WorkspaceEdit | null, never>): Disposable;
	onWillRenameFiles(handler: RequestHandler<RenameFilesParams, WorkspaceEdit | null, never>): Disposable;
	onWillDeleteFiles(handler: RequestHandler<DeleteFilesParams, WorkspaceEdit | null, never>): Disposable;
}

export const FileOperationsFeature: Feature<_RemoteWorkspace, FileOperationsFeatureShape> = (Base) => {
	return class extends Base {
		public onDidCreateFiles(handler: NotificationHandler<CreateFilesParams>): Disposable {
			return this.connection.onNotification(DidCreateFilesNotification.type, (params) => {
				handler(params);
			});
		}
		public onDidRenameFiles(handler: NotificationHandler<RenameFilesParams>): Disposable {
			return this.connection.onNotification(DidRenameFilesNotification.type, (params) => {
				handler(params);
			});
		}
		public onDidDeleteFiles(handler: NotificationHandler<DeleteFilesParams>): Disposable {
			return this.connection.onNotification(DidDeleteFilesNotification.type, (params) => {
				handler(params);
			});
		}
		public onWillCreateFiles(handler: RequestHandler<CreateFilesParams, WorkspaceEdit | null, never>): Disposable {
			return this.connection.onRequest(WillCreateFilesRequest.type, (params, cancel) => {
				return handler(params, cancel);
			});
		}
		public onWillRenameFiles(handler: RequestHandler<RenameFilesParams, WorkspaceEdit | null, never>): Disposable {
			return this.connection.onRequest(WillRenameFilesRequest.type, (params, cancel) => {
				return handler(params, cancel);
			});
		}
		public onWillDeleteFiles(handler: RequestHandler<DeleteFilesParams, WorkspaceEdit | null, never>): Disposable {
			return this.connection.onRequest(WillDeleteFilesRequest.type, (params, cancel) => {
				return handler(params, cancel);
			});
		}
	};
};
