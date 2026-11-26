/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createConnection, Connection, InitializeParams, ResponseError, ErrorCodes } from 'vscode-languageserver/node';

const connection: Connection = createConnection();
connection.onInitialize((_params: InitializeParams): any => {
	return { capabilities: {} };
});
connection.onShutdown(() => {
	throw new ResponseError(ErrorCodes.InternalError, 'Shutdown refused');
});
connection.onRequest('test/hang', () => {
	void connection.sendNotification('test/hanging');
	return new Promise<void>(() => {});
});
connection.listen();
