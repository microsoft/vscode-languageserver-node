/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createConnection, InitializeError, ResponseError } from 'vscode-languageserver/node';
const connection = createConnection();
connection.onInitialize(() => {
	// Ask the client to retry, then exit while the client asks the user whether to retry.
	setTimeout(() => process.exit(0), 100);
	return new ResponseError<InitializeError>(1, 'Initialization refused', { retry: true });
});
connection.listen();
