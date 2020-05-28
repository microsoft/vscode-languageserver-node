/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { ResponseMessage } from '../../common/messages';
import { BrowserMessageReader, BrowserMessageWriter } from '../main';

const reader: BrowserMessageReader = new BrowserMessageReader(self);
const writer: BrowserMessageWriter = new BrowserMessageWriter(self);

reader.listen((_message) => {
	const response: ResponseMessage = {
		jsonrpc: '2.0',
		id: 1,
		result: 42
	};
	writer.write(response);
});