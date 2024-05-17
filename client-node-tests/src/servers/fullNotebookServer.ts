/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	createConnection, InitializeParams, ServerCapabilities, TextDocumentSyncKind, RequestType,
	DidOpenNotebookDocumentNotification, DidChangeNotebookDocumentNotification, DidSaveNotebookDocumentNotification,
	DidCloseNotebookDocumentNotification,
	PublishDiagnosticsNotification,
	DocumentDiagnosticReport,
	NotificationType
} from 'vscode-languageserver/node';

const connection = createConnection();

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

const receivedNotifications: Set<string> = new Set();
namespace GotNotifiedRequest {
	export const method: 'testing/gotNotified' = 'testing/gotNotified';
	export const type = new RequestType<string, boolean, void>(method);
}

namespace ClearNotifiedRequest {
	export const method: 'testing/clearNotified' = 'testing/clearNotified';
	export const type = new RequestType<string, void, void>(method);
}

namespace SetDiagnosticsNotification {
	export const method: 'testing/setDiagnostics' = 'testing/setDiagnostics';
	export const type = new NotificationType<DocumentDiagnosticReport>(method);
}

const diagnostics = new Map<string, DocumentDiagnosticReport>();

connection.onInitialize((_params: InitializeParams): any => {
	const capabilities: ServerCapabilities = {
		textDocumentSync: TextDocumentSyncKind.Full,
		notebookDocumentSync: {
			notebookSelector: [{
				notebook: { notebookType: 'jupyter-notebook' },
				cells: [{ language: 'python' }]
			}]
		},
		diagnosticProvider: {
			identifier: 'diagnostic-provider',
			documentSelector: null,
			interFileDependencies: false,
			workspaceDiagnostics: false
		}
	};
	return { capabilities };
});

connection.notebooks.synchronization.onDidOpenNotebookDocument(() => {
	receivedNotifications.add(DidOpenNotebookDocumentNotification.method);
});
connection.notebooks.synchronization.onDidChangeNotebookDocument(() => {
	receivedNotifications.add(DidChangeNotebookDocumentNotification.method);
});
connection.notebooks.synchronization.onDidSaveNotebookDocument(() => {
	receivedNotifications.add(DidSaveNotebookDocumentNotification.method);
});
connection.notebooks.synchronization.onDidCloseNotebookDocument(() => {
	receivedNotifications.add(DidCloseNotebookDocumentNotification.method);
});
connection.languages.diagnostics.on((params) => {
	receivedNotifications.add(PublishDiagnosticsNotification.method);
	const result = diagnostics.get(params.textDocument.uri) || { kind: 'unchanged', resultId: params.previousResultId || '' };
	return result;
});

connection.onRequest(GotNotifiedRequest.type, (method: string) => {
	const result = receivedNotifications.has(method);
	if (result) {
		receivedNotifications.delete(method);
	}
	return result;
});

connection.onRequest(ClearNotifiedRequest.type, (method: string) => {
	receivedNotifications.delete(method);
});

connection.onNotification(SetDiagnosticsNotification.method, (params) => {
	diagnostics.set(params.uri, params.report);
});

// Listen on the connection
connection.listen();