/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	MessageReader, MessageWriter, Logger, ConnectionStrategy, ConnectionOptions, ProtocolConnection, WatchDog, InitializeParams, createProtocolConnection,
	createConnection as createCommonConnection, Connection, Features, _Connection, _
} from '../common/api';

export * from 'vscode-languageserver-protocol/jshost';
export * from '../common/api';

let _shutdownReceived: boolean = false;
const watchDog: WatchDog = {
	initialize: (_params: InitializeParams): void => {
	},
	get shutdownReceived(): boolean {
		return _shutdownReceived;
	},
	set shutdownReceived(value: boolean) {
		_shutdownReceived = value;
	},
	exit: (_code: number): void => {
	}
};

/**
 * Creates a new connection.
 *
 * @param factories: The factories for proposed features.
 * @param reader The message reader to read messages from.
 * @param writer The message writer to write message to.
 * @param options An optional connection strategy or connection options to control additional settings
 */
export function createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _>(
	factories: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages>,
	reader: MessageReader, writer: MessageWriter, options?: ConnectionStrategy | ConnectionOptions
): _Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages>;


/**
 * Creates a new connection.
 *
 * @param reader The message reader to read messages from.
 * @param writer The message writer to write message to.
 * @param options An optional connection strategy or connection options to control additional settings
 */
export function createConnection(reader: MessageReader, writer: MessageWriter, options?: ConnectionStrategy | ConnectionOptions): Connection;
export function createConnection(arg1: any, arg2: any, arg3?: any, arg4?: any): Connection {
	let factories: Features | undefined;
	let reader: MessageReader | undefined;
	let writer: MessageWriter | undefined;
	let options: ConnectionStrategy | ConnectionOptions | undefined;

	if (arg1 !== void 0 && (arg1 as Features).__brand === 'features') {
		factories = arg1;
		arg1 = arg2; arg2 = arg3; arg3 = arg4;
	}
	if (ConnectionStrategy.is(arg1) || ConnectionOptions.is(arg1)) {
		options = arg1;
	} else {
		reader = arg1;
		writer = arg2;
		options = arg3;
	}

	const connectionFactory = (logger: Logger): ProtocolConnection => {
		return createProtocolConnection(reader!, writer!, logger, options);
	};
	return createCommonConnection(connectionFactory, watchDog, factories);
}