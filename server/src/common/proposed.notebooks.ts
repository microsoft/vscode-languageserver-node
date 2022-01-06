/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Proposed, NotificationHandler1 } from 'vscode-languageserver-protocol';

import type { Feature, _Notebooks, } from './server';

/**
 * Shape of the type hierarchy feature
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebooksFeatureShape {
	synchronization: {
		onDidOpenNotebookDocument(handler: NotificationHandler1<Proposed.DidOpenNotebookDocumentParams>): void;
		onDidChangeNotebookDocument(handler: NotificationHandler1<Proposed.DidChangeNotebookDocumentParams>): void;
		onDidCloseNotebookDocument(handler: NotificationHandler1<Proposed.DidCloseNotebookDocumentParams>): void;
	}
}

export const NotebooksFeature: Feature<_Notebooks, NotebooksFeatureShape> = (Base) => {
	return class extends Base {
		public get synchronization() {
			return {
				onDidOpenNotebookDocument: (handler: NotificationHandler1<Proposed.DidOpenNotebookDocumentParams>): void => {
					this.connection.onNotification(Proposed.DidOpenNotebookDocumentNotification.type, (params) => {
						handler(params);
					});
				},
				onDidChangeNotebookDocument: (handler: NotificationHandler1<Proposed.DidChangeNotebookDocumentParams>): void => {
					this.connection.onNotification(Proposed.DidChangeNotebookDocumentNotification.type, (params) => {
						handler(params);
					});
				},
				onDidCloseNotebookDocument: (handler: NotificationHandler1<Proposed.DidCloseNotebookDocumentParams>): void => {
					this.connection.onNotification(Proposed.DidCloseNotebookDocumentNotification.type, (params) => {
						handler(params);
					});
				}
			};
		}
	};
};