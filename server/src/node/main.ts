/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="../../typings/thenable.d.ts" />

import * as Is from '../common/utils/is';
import { Connection, _, _Connection, Features, WatchDog, createConnection as createCommonConnection } from '../common/server';

import * as fm from './files';
import {
	ConnectionStrategy, ConnectionOptions, MessageReader, MessageWriter, IPCMessageReader, IPCMessageWriter, createServerPipeTransport,
	createServerSocketTransport, InitializeParams, createProtocolConnection, Logger, ProtocolConnection
} from 'vscode-languageserver-protocol/node';

export * from 'vscode-languageserver-protocol/node';
export * from '../common/api';

export namespace Files {
	export let uriToFilePath = fm.uriToFilePath;
	export let resolveGlobalNodePath = fm.resolveGlobalNodePath;
	export let resolveGlobalYarnPath = fm.resolveGlobalYarnPath;
	export let resolve = fm.resolve;
	export let resolveModulePath = fm.resolveModulePath;
}

let _protocolConnection: ProtocolConnection | undefined;
function endProtocolConnection(): void {
	if (_protocolConnection === undefined) {
		return;
	}
	try {
		_protocolConnection.end();
	} catch (_err) {
		// Ignore. The client process could have already
		// did and we can't send an end into the connection.
	}
}
let _shutdownReceived: boolean = false;
let exitTimer: NodeJS.Timer | undefined = undefined;

function setupExitTimer(): void {
	const argName = '--clientProcessId';
	function runTimer(value: string): void {
		try {
			let processId = parseInt(value);
			if (!isNaN(processId)) {
				exitTimer = setInterval(() => {
					try {
						process.kill(processId, <any>0);
					} catch (ex) {
						// Parent process doesn't exist anymore. Exit the server.
						endProtocolConnection();
						process.exit(_shutdownReceived ? 0 : 1);
					}
				}, 3000);
			}
		} catch (e) {
			// Ignore errors;
		}
	}

	for (let i = 2; i < process.argv.length; i++) {
		let arg = process.argv[i];
		if (arg === argName && i + 1 < process.argv.length) {
			runTimer(process.argv[i + 1]);
			return;
		} else {
			let args = arg.split('=');
			if (args[0] === argName) {
				runTimer(args[1]);
			}
		}
	}
}
setupExitTimer();

const watchDog: WatchDog = {
	initialize: (params: InitializeParams): void => {
		const processId = params.processId;
		if (Is.number(processId) && exitTimer === undefined) {
			// We received a parent process id. Set up a timer to periodically check
			// if the parent is still alive.
			setInterval(() => {
				try {
					process.kill(processId, <any>0);
				} catch (ex) {
					// Parent process doesn't exist anymore. Exit the server.
					process.exit(_shutdownReceived ? 0 : 1);
				}
			}, 3000);
		}
	},
	get shutdownReceived(): boolean {
		return _shutdownReceived;
	},
	set shutdownReceived(value: boolean) {
		_shutdownReceived = value;
	},
	exit: (code: number): void => {
		endProtocolConnection();
		process.exit(code);
	}
};


/**
 * Creates a new connection based on the processes command line arguments:
 *
 * @param options An optional connection strategy or connection options to control additional settings
 */
export function createConnection(options?: ConnectionStrategy | ConnectionOptions): Connection;

/**
 * Creates a new connection using a the given streams.
 *
 * @param inputStream The stream to read messages from.
 * @param outputStream The stream to write messages to.
 * @param options An optional connection strategy or connection options to control additional settings
 * @return a [connection](#IConnection)
 */
export function createConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, options?: ConnectionStrategy | ConnectionOptions): Connection;

/**
 * Creates a new connection.
 *
 * @param reader The message reader to read messages from.
 * @param writer The message writer to write message to.
 * @param options An optional connection strategy or connection options to control additional settings
 */
export function createConnection(reader: MessageReader, writer: MessageWriter, options?: ConnectionStrategy | ConnectionOptions): Connection;

/**
 * Creates a new connection based on the processes command line arguments. The new connection surfaces proposed API
 *
 * @param factories: the factories to use to implement the proposed API
 * @param options An optional connection strategy or connection options to control additional settings
 */
export function createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _>(
	factories: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages>,
	options?: ConnectionStrategy | ConnectionOptions
): _Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages>;

/**
 * Creates a new connection using a the given streams.
 *
 * @param inputStream The stream to read messages from.
 * @param outputStream The stream to write messages to.
 * @param options An optional connection strategy or connection options to control additional settings
 * @return a [connection](#IConnection)
 */
export function createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _>(
	factories: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages>,
	inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, options?: ConnectionStrategy | ConnectionOptions
): _Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages>;

/**
 * Creates a new connection.
 *
 * @param reader The message reader to read messages from.
 * @param writer The message writer to write message to.
 * @param options An optional connection strategy or connection options to control additional settings
 */
export function createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _>(
	factories: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages>,
	reader: MessageReader, writer: MessageWriter, options?: ConnectionStrategy | ConnectionOptions
): _Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages>;

export function createConnection(arg1?: any, arg2?: any, arg3?: any, arg4?: any): Connection {
	let factories: Features | undefined;
	let input: NodeJS.ReadableStream | MessageReader | undefined;
	let output: NodeJS.WritableStream | MessageWriter | undefined;
	let options: ConnectionStrategy | ConnectionOptions | undefined;
	if (arg1 !== void 0 && (arg1 as Features).__brand === 'features') {
		factories = arg1;
		arg1 = arg2; arg2 = arg3; arg3 = arg4;
	}
	if (ConnectionStrategy.is(arg1) || ConnectionOptions.is(arg1)) {
		options = arg1;
	} else {
		input = arg1;
		output = arg2;
		options = arg3;
	}
	return _createConnection(input, output, options, factories);
}

function _createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _>(
	input?: NodeJS.ReadableStream | MessageReader, output?: NodeJS.WritableStream | MessageWriter,
	options?: ConnectionStrategy | ConnectionOptions,
	factories?: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages>,
): _Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages> {
	if (!input && !output && process.argv.length > 2) {
		let port: number | undefined = void 0;
		let pipeName: string | undefined = void 0;
		let argv = process.argv.slice(2);
		for (let i = 0; i < argv.length; i++) {
			let arg = argv[i];
			if (arg === '--node-ipc') {
				input = new IPCMessageReader(process);
				output = new IPCMessageWriter(process);
				break;
			} else if (arg === '--stdio') {
				input = process.stdin;
				output = process.stdout;
				break;
			} else if (arg === '--socket') {
				port = parseInt(argv[i + 1]);
				break;
			} else if (arg === '--pipe') {
				pipeName = argv[i + 1];
				break;
			}
			else {
				var args = arg.split('=');
				if (args[0] === '--socket') {
					port = parseInt(args[1]);
					break;
				} else if (args[0] === '--pipe') {
					pipeName = args[1];
					break;
				}
			}
		}
		if (port) {
			let transport = createServerSocketTransport(port);
			input = transport[0];
			output = transport[1];
		} else if (pipeName) {
			let transport = createServerPipeTransport(pipeName);
			input = transport[0];
			output = transport[1];
		}
	}
	var commandLineMessage = 'Use arguments of createConnection or set command line parameters: \'--node-ipc\', \'--stdio\' or \'--socket={number}\'';
	if (!input) {
		throw new Error('Connection input stream is not set. ' + commandLineMessage);
	}
	if (!output) {
		throw new Error('Connection output stream is not set. ' + commandLineMessage);
	}

	// Backwards compatibility
	if (Is.func((input as NodeJS.ReadableStream).read) && Is.func((input as NodeJS.ReadableStream).on)) {
		let inputStream = <NodeJS.ReadableStream>input;
		inputStream.on('end', () => {
			endProtocolConnection();
			process.exit(_shutdownReceived ? 0 : 1);
		});
		inputStream.on('close', () => {
			endProtocolConnection();
			process.exit(_shutdownReceived ? 0 : 1);
		});
	}

	const connectionFactory = (logger: Logger): ProtocolConnection => {
		const result = createProtocolConnection(input as any, output as any, logger, options);
		return result;
	};
	return createCommonConnection(connectionFactory, watchDog, factories);
}