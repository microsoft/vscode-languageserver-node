/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createConnection, Connection, InitializeParams, NotificationType0 } from 'vscode-languageserver/node';

namespace CrashNotification {
	export const type = new NotificationType0('test/crash');
}

const connection: Connection = createConnection();
connection.onInitialize((_params: InitializeParams): any => {
	return {
		capabilities: {
		}
	};
});
connection.onNotification(CrashNotification.type, () => {
	process.exit(100);
});
connection.listen();
