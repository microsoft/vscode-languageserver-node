/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createConnection, Connection, InitializeParams } from 'vscode-languageserver/node';

const connection: Connection = createConnection();
connection.onInitialize((_params: InitializeParams): any => {
	return { capabilities: {} };
});
connection.onShutdown(async () => {
	return new Promise((resolve) => {
		setTimeout(resolve, 200000);
	});
});
connection.listen();
