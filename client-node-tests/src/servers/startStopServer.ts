/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createConnection, Connection, InitializeParams } from '../../../server/node';

let connection: Connection = createConnection();
connection.onInitialize((_params: InitializeParams): any => {
	return {
		capabilities: {
			executeCommandProvider: {
				commands: ['foo.command'],
			}
		}
	};
});
connection.onShutdown(() => {
});
connection.listen();