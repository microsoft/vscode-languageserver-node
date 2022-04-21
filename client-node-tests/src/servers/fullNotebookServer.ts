/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	createConnection, InitializeParams, ServerCapabilities, TextDocumentSyncKind, RequestType,
	Proposed, ProposedFeatures
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
		textDocumentSync: TextDocumentSyncKind.Full,
		notebookDocumentSync: {
			notebookSelector: [{
				notebook: { notebookType: 'jupyter-notebook' },
				cells: [{ language: 'python' }]
			}]
		}
	};
	return { capabilities };
});

connection.notebooks.synchronization.onDidOpenNotebookDocument(() => {
	receivedNotifications.add(Proposed.DidOpenNotebookDocumentNotification.method);
});
connection.notebooks.synchronization.onDidChangeNotebookDocument(() => {
	receivedNotifications.add(Proposed.DidChangeNotebookDocumentNotification.method);
});
connection.notebooks.synchronization.onDidSaveNotebookDocument(() => {
	receivedNotifications.add(Proposed.DidSaveNotebookDocumentNotification.method);
});
connection.notebooks.synchronization.onDidCloseNotebookDocument(() => {
	receivedNotifications.add(Proposed.DidCloseNotebookDocumentNotification.method);
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
