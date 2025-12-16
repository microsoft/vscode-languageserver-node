/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	createConnection, Connection, InitializeParams, InitializeResult,
	TextDocumentSyncKind, RequestType0
} from 'vscode-languageserver/node';

const connection: Connection = createConnection();

const receivedNotifications: GetNotificationsRequest.NotificationData[] = [];

/**
 * A custom request to get a list of all text sync notifications that the server
 * has been sent.
 */
namespace GetNotificationsRequest {
	export type NotificationData = { method: string; params: any };
	export const method: 'testing/getNotifications' = 'testing/getNotifications';
	export const type = new RequestType0<NotificationData[], void>(method);
}

connection.onInitialize((_params: InitializeParams): InitializeResult => {
	return {
		capabilities: {
			textDocumentSync: {
				openClose: true,
				change: TextDocumentSyncKind.Incremental
			}
		}
	};
});

connection.onDidOpenTextDocument((params) => {
	receivedNotifications.push({ method: 'textDocument/didOpen', params });
});

connection.onDidChangeTextDocument((params) => {
	receivedNotifications.push({ method: 'textDocument/didChange', params });
});

connection.onDidCloseTextDocument((params) => {
	receivedNotifications.push({ method: 'textDocument/didClose', params });
});

connection.onRequest(GetNotificationsRequest.type, () => {
	return receivedNotifications;
});

connection.listen();
