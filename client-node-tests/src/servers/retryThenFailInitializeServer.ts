/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createConnection, InitializeError, ResponseError } from 'vscode-languageserver/node';
const connection = createConnection();
let refused = false;
connection.onInitialize(() => {
	// Refuse the first initialization and ask the client to retry, then fail the retry
	// with a distinct error that can't be retried.
	if (!refused) {
		refused = true;
		return new ResponseError<InitializeError>(1, 'Initialization refused', { retry: true });
	}
	return new ResponseError<InitializeError>(1, 'Initialization failed after retry', { retry: false });
});
connection.listen();
