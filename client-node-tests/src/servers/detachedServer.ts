/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Server that allows the client to request detached status of the server
 */

import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { IsDetachedRequest } from './types';
import { parseCliOpts } from 'vscode-languageserver/utils';

const connection = createConnection(ProposedFeatures.all);

connection.onRequest(IsDetachedRequest, () => {
	const args = parseCliOpts(process.argv);
	const detached = Object.keys(args).includes('detached');
	const timeout = args['detached'];
	return { detached, timeout };
});

// Initialize the language server connection
connection.onInitialize(() => {
	return {
		capabilities: {}
	};
});

connection.listen();