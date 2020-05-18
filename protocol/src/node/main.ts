/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { MessageReader, MessageWriter, Logger, ConnectionStrategy, ConnectionOptions, ProtocolConnection } from '../common/common';
import { createMessageConnection } from 'vscode-jsonrpc/node';

export * from 'vscode-jsonrpc/node';
export * from '../common/common';

export function createProtocolConnection(reader: MessageReader, writer: MessageWriter, logger: Logger, options?: ConnectionStrategy | ConnectionOptions): ProtocolConnection {
	return createMessageConnection(reader, writer, logger, options);
}