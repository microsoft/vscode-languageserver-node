/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createConnection, InitializeParams } from 'vscode-languageserver/node';

const connection = createConnection();
let received: InitializeParams | undefined;
connection.onInitialize((params: InitializeParams) => {
	received = params;
	return { capabilities: {} };
});

// Returns the parts of the initialize params the tests check.
connection.onRequest('initializeParams', () => {
	return {
		initializationOptions: received?.initializationOptions,
		processId: received?.processId,
		fillOrder: (received as { fillOrder?: string[] } | undefined)?.fillOrder
	};
});

connection.listen();
