/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Server that allows the client to request detached status of the server
 */

import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { IsDetachedRequest } from './types';

const connection = createConnection(ProposedFeatures.all);

connection.onRequest(IsDetachedRequest, () => {
	return process.argv.includes('--detached');
});

// Initialize the language server connection
connection.onInitialize(() => {
	return {
		capabilities: {}
	};
});

connection.listen();