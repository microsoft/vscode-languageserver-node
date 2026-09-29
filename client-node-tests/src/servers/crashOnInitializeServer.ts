/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createConnection } from 'vscode-languageserver/node';

const connection = createConnection();
connection.onInitialize(() => {
	process.exit(100);
});
connection.listen();
