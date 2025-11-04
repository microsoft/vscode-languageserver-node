/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	createConnection, Connection, InitializeParams, InitializeResult,
	TextDocumentSyncKind, RequestType0
} from 'vscode-languageserver/node';

const connection: Connection = createConnection();

const receivedNotifications: string[] = [];

/**
 * A custom request to get a list of all text sync notifications that the server
 * has been sent.
 */
namespace GetNotificationsRequest {
	export const method: 'testing/getNotifications' = 'testing/getNotifications';
	export const type = new RequestType0<string[], void>(method);
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

connection.onDidOpenTextDocument(() => {
	receivedNotifications.push('textDocument/didOpen');
});

connection.onDidChangeTextDocument(() => {
	receivedNotifications.push('textDocument/didChange');
});

connection.onDidCloseTextDocument(() => {
	receivedNotifications.push('textDocument/didClose');
});

connection.onRequest(GetNotificationsRequest.type, () => {
	return receivedNotifications;
});

connection.listen();
