/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import {
	createConnection, IConnection,
	TextDocuments, InitializeParams, ServerCapabilities
} from '../../../../server/lib/main';

let connection: IConnection = createConnection();

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

let documents: TextDocuments = new TextDocuments();
documents.listen(connection);

connection.onInitialize((params: InitializeParams): any => {

	console.log(params.capabilities);

	let capabilities: ServerCapabilities = {
		textDocumentSync: documents.syncKind,
		completionProvider: { resolveProvider: true, triggerCharacters: ['"', ':'] },
		hoverProvider: true
	};
	return { capabilities, customResults: { "hello": "world" } };
});


// Listen on the connection
connection.listen();