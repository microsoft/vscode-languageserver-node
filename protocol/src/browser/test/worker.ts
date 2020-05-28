/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { createProtocolConnection, BrowserMessageReader, BrowserMessageWriter } from '../main';
import { CompletionRequest } from '../../common/api';

const reader: BrowserMessageReader = new BrowserMessageReader(self);
const writer: BrowserMessageWriter = new BrowserMessageWriter(self);

const connection = createProtocolConnection(reader, writer);

connection.onRequest(CompletionRequest.type, (_params) => {
	return [];
});

connection.listen();