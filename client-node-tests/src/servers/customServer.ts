/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createConnection, Connection, InitializeParams, InitializeResult } from 'vscode-languageserver/node';

const connection: Connection = createConnection();
connection.onInitialize((_params: InitializeParams): InitializeResult => {
	return {
		capabilities: {
		}
	};
});

connection.onRequest('request', (param: { value: number }): number => {
	return param.value + 1;
});

connection.onNotification('notification', () => {
});

connection.onRequest('triggerRequest', async () => {
	await connection.sendRequest('request');
});

connection.onRequest('triggerNotification', async () => {
	await connection.sendNotification('notification');
});

connection.listen();
