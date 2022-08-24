/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { ResponseMessage } from '../../common/messages';
import { JshostMessageReader, JshostMessageWriter, MessageChannel } from '../main';

export class Server {
	public constructor(messageChannel: MessageChannel) {
		const reader: JshostMessageReader = new JshostMessageReader(messageChannel.port2);
		const writer: JshostMessageWriter = new JshostMessageWriter(messageChannel.port1);

		reader.listen(async (_message) => {
			const response: ResponseMessage = {
				jsonrpc: '2.0',
				id: 1,
				result: 42
			};
			await writer.write(response);
		});
	}
}