/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { createProtocolConnection, JshostMessageReader, JshostMessageWriter } from '../main';
import { CompletionRequest } from '../../common/api';
import { MessageChannel } from 'vscode-jsonrpc/jshost';

export class Server {
	public constructor(messageChannel: MessageChannel) {
		const reader: JshostMessageReader = new JshostMessageReader(messageChannel.port2);
		const writer: JshostMessageWriter = new JshostMessageWriter(messageChannel.port1);

		const connection = createProtocolConnection(reader, writer);

		connection.onRequest(CompletionRequest.type, (_params: any) => {
			return [];
		});

		connection.listen();
	}
}