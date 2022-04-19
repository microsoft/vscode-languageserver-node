/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	createConnection, InitializeParams, ServerCapabilities, TextDocumentSyncKind, RequestType,
	Proposed, ProposedFeatures, DidOpenTextDocumentNotification, DidChangeTextDocumentNotification, DidCloseTextDocumentNotification
} from '../../../server/node';

const connection: ProposedFeatures.Connection = createConnection(ProposedFeatures.all);

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

const receivedNotifications: Set<string> = new Set();
namespace GotNotifiedRequest {
	export const method: 'testing/gotNotified' = 'testing/gotNotified';
	export const type = new RequestType<string, boolean, void>(method);
}

connection.onInitialize((_params: InitializeParams): any => {
	const capabilities: ServerCapabilities & Proposed.$DiagnosticServerCapabilities & Proposed.$NotebookDocumentSyncServerCapabilities = {
		textDocumentSync: TextDocumentSyncKind.Incremental
	};
	return { capabilities };
});

connection.onDidOpenTextDocument(() => {
	receivedNotifications.add(DidOpenTextDocumentNotification.method);
});

connection.onDidChangeTextDocument(() => {
	receivedNotifications.add(DidChangeTextDocumentNotification.method);
});

connection.onDidCloseTextDocument(() => {
	receivedNotifications.add(DidCloseTextDocumentNotification.method);
});

connection.onRequest(GotNotifiedRequest.type, (method: string) => {
	const result = receivedNotifications.has(method);
	if (result) {
		receivedNotifications.delete(method);
	}
	return result;
});

// Listen on the connection
connection.listen();
