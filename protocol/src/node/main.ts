/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { MessageReader, MessageWriter, Logger, ConnectionStrategy, ConnectionOptions, ProtocolConnection } from '../common/api';
import { createMessageConnection } from 'vscode-jsonrpc/node';

export * from 'vscode-jsonrpc/node';
export * from '../common/api';

export function createProtocolConnection(input: MessageReader, output: MessageWriter, logger?: Logger, options?: ConnectionStrategy | ConnectionOptions): ProtocolConnection;
export function createProtocolConnection(input: NodeJS.ReadableStream, output: NodeJS.WritableStream, logger?: Logger, options?: ConnectionStrategy | ConnectionOptions): ProtocolConnection;
export function createProtocolConnection(input: MessageReader | NodeJS.ReadableStream, output: MessageWriter | NodeJS.WritableStream, logger?: Logger, options?: ConnectionStrategy | ConnectionOptions): ProtocolConnection {
	return createMessageConnection(input as any, output as any, logger, options);
}
