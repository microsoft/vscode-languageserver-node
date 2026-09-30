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
 * has been sent. Hover requests are recorded as well to be able to verify that
 * they don't overtake the open notification of the document.
 */
namespace GetNotificationsRequest {
	export type NotificationData = { method: string; params: any };
	export const method: 'testing/getNotifications' = 'testing/getNotifications';
	export const type = new RequestType0<NotificationData[], void>(method);
}

connection.onInitialize((params: InitializeParams): InitializeResult => {
	return {
		capabilities: {
			textDocumentSync: {
				openClose: true,
				change: params.initializationOptions?.syncKind ?? TextDocumentSyncKind.Incremental
			},
			hoverProvider: true
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

connection.onHover((params) => {
	receivedNotifications.push({ method: 'textDocument/hover', params });
	return null;
});

connection.onRequest(GetNotificationsRequest.type, () => {
	return receivedNotifications;
});

connection.listen();
