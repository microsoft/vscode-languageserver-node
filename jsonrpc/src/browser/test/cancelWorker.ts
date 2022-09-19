/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestType0 } from '../../common/messages';
import { SharedArrayReceiverStrategy, SharedArraySenderStrategy } from '../../common/sharedArrayCancellation';

import { BrowserMessageReader, BrowserMessageWriter, createMessageConnection } from '../main';

const reader: BrowserMessageReader = new BrowserMessageReader(self);
const writer: BrowserMessageWriter = new BrowserMessageWriter(self);

const type = new RequestType0<boolean, void>('test/handleCancel');
const connection = createMessageConnection(reader, writer, undefined, { cancellationStrategy: { sender: new SharedArraySenderStrategy(), receiver: new SharedArrayReceiverStrategy() } });
connection.onRequest(type, (token) => {
	return new Promise<boolean>((resolve) => {
		setInterval(() => {
			if (token.isCancellationRequested) {
				resolve(true);
			}
		}, 50);
	});
});