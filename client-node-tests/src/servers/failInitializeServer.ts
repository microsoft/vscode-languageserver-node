/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createConnection, InitializeError, ResponseError } from '@vscode/languageserver/node';

const connection = createConnection();
connection.onInitialize(() => {
	// Refuse initialization but keep running, so the client still owns a live connection.
	return new ResponseError<InitializeError>(1, 'Initialization refused', { retry: false });
});
connection.listen();
