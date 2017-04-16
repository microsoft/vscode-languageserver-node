/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;

import {
	workspace as Workspace
} from 'vscode';

import {
	ErrorCodes, ResponseError,
	RequestType, RequestType0, RequestHandler, RequestHandler0, GenericRequestHandler,
	NotificationType, NotificationType0,
	NotificationHandler, NotificationHandler0, GenericNotificationHandler,
	IPCMessageReader, IPCMessageWriter, StreamMessageReader, StreamMessageWriter,
	createClientPipeTransport, generateRandomPipeName,
} from 'vscode-jsonrpc';


import {
	InitializeError
} from './protocol';

import {
	LanguageClient as BaseLanguageClient, LanguageClientOptions, MessageStream,
} from './client';

import * as is from './utils/is';
import * as electron from './utils/electron';
import { terminate } from './utils/processes';

export {
	ResponseError, InitializeError, ErrorCodes,
	RequestType, RequestType0, RequestHandler, RequestHandler0, GenericRequestHandler,
	NotificationType, NotificationType0, NotificationHandler, NotificationHandler0, GenericNotificationHandler
}
export { Converter as Code2ProtocolConverter } from './codeConverter';
export { Converter as Protocol2CodeConverter } from './protocolConverter';

export * from 'vscode-languageserver-types';
export * from './protocol';

declare var v8debug: any;

export interface StreamInfo {
	writer: NodeJS.WritableStream;
	reader: NodeJS.ReadableStream;
}

export interface ExecutableOptions {
	cwd?: string;
	stdio?: string | string[];
	env?: any;
	detached?: boolean;
}

export interface Executable {
	command: string;
	args?: string[];
	options?: ExecutableOptions;
}

export interface ForkOptions {
	cwd?: string;
	env?: any;
	encoding?: string;
	execArgv?: string[];
}

export enum TransportKind {
	stdio,
	ipc,
	pipe
}

export interface NodeModule {
	module: string;
	transport?: TransportKind;
	args?: string[];
	runtime?: string;
	options?: ForkOptions;
}

export type ServerOptions = Executable | { run: Executable; debug: Executable; } | { run: NodeModule; debug: NodeModule } | NodeModule | (() => Thenable<ChildProcess | StreamInfo>);

export class LanguageClient extends BaseLanguageClient {

	private _serverOptions: ServerOptions;
	private _forceDebug: boolean;

	private _childProcess: ChildProcess | undefined;

	public constructor(name: string, serverOptions: ServerOptions, clientOptions: LanguageClientOptions, forceDebug?: boolean);
	public constructor(id: string, name: string, serverOptions: ServerOptions, clientOptions: LanguageClientOptions, forceDebug?: boolean);
	public constructor(arg1: string, arg2: ServerOptions | string, arg3: LanguageClientOptions | ServerOptions, arg4?: boolean | LanguageClientOptions, arg5?: boolean) {
		let serverOptions: ServerOptions;
		let clientOptions: LanguageClientOptions;
		let forceDebug: boolean;
		let id: string;
		let name: string;
		if (is.string(arg2)) {
			id = arg1;
			name = arg2;
			serverOptions = arg3 as ServerOptions;
			clientOptions = arg4 as LanguageClientOptions;
			forceDebug = !!arg5;
		} else {
			id = arg1.toLowerCase();
			name = arg1;
			serverOptions = arg2 as ServerOptions;
			clientOptions = arg3 as LanguageClientOptions;
			forceDebug = arg4 as boolean;
		}
		if (forceDebug === void 0) { forceDebug = false; }
		super(id, name, () => this.openStream(), clientOptions);
		this._serverOptions = serverOptions;
		this._forceDebug = forceDebug;
		this._childProcess = undefined;
	}

	private openStream(): Thenable<MessageStream> {
		function getEnvironment(env: any): any {
			if (!env) {
				return process.env;
			}
			let result: any = Object.create(null);
			Object.keys(process.env).forEach(key => result[key] = process.env[key]);
			Object.keys(env).forEach(key => result[key] = env[key]);
			return result;
		}

		function startedInDebugMode(): boolean {
			let args: string[] = (process as any).execArgv;
			if (args) {
				return args.some((arg) => /^--debug=?/.test(arg) || /^--debug-brk=?/.test(arg));
			};
			return false;
		}

		let encoding = this._clientOptions.stdioEncoding;

		let server = this._serverOptions;
		// We got a function.
		if (is.func(server)) {
			return server().then((result) => {
				let info = result as StreamInfo;
				if (info.writer && info.reader) {
					return { reader: new StreamMessageReader(info.reader), writer: new StreamMessageWriter(info.writer) };
				} else {
					let cp = result as ChildProcess;
					return { reader: new StreamMessageReader(cp.stdout), writer: new StreamMessageWriter(cp.stdin) };
				}
			});
		}
		let json: { command?: string; module?: string };
		let runDebug = <{ run: any; debug: any; }>server;
		if (runDebug.run || runDebug.debug) {
			// We are under debugging. So use debug as well.
			if (typeof v8debug === 'object' || this._forceDebug || startedInDebugMode()) {
				json = runDebug.debug;
			} else {
				json = runDebug.run;
			}
		} else {
			json = server;
		}
		if (json.module) {
			let node: NodeModule = <NodeModule>json;
			let transport = node.transport || TransportKind.stdio;
			if (node.runtime) {
				let args: string[] = [];
				let options: ForkOptions = node.options || Object.create(null);
				if (options.execArgv) {
					options.execArgv.forEach(element => args.push(element));
				}
				args.push(node.module);
				if (node.args) {
					node.args.forEach(element => args.push(element));
				}
				let execOptions: ExecutableOptions = Object.create(null);
				execOptions.cwd = options.cwd || Workspace.rootPath;
				execOptions.env = getEnvironment(options.env);
				let pipeName: string | undefined = undefined;
				if (transport === TransportKind.ipc) {
					// exec options not correctly typed in lib
					execOptions.stdio = <any>[null, null, null, 'ipc'];
					args.push('--node-ipc');
				} else if (transport === TransportKind.stdio) {
					args.push('--stdio');
				} else if (transport === TransportKind.pipe) {
					pipeName = generateRandomPipeName();
					args.push(`--pipe=${pipeName}`);
				}
				if (transport === TransportKind.ipc || transport === TransportKind.stdio) {
					let process = cp.spawn(node.runtime, args, execOptions);
					if (!process || !process.pid) {
						return Promise.reject<MessageStream>(`Launching server using runtime ${node.runtime} failed.`);
					}
					this._childProcess = process;
					process.stderr.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
					if (transport === TransportKind.ipc) {
						process.stdout.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
						return Promise.resolve({ reader: new IPCMessageReader(process), writer: new IPCMessageWriter(process) });
					} else {
						return Promise.resolve({ reader: new StreamMessageReader(process.stdout), writer: new StreamMessageWriter(process.stdin) });
					}
				} else if (transport == TransportKind.pipe) {
					return createClientPipeTransport(pipeName!).then((transport) => {
						let process = cp.spawn(node.runtime!, args, execOptions);
						if (!process || !process.pid) {
							return Promise.reject<MessageStream>(`Launching server using runtime ${node.runtime} failed.`);
						}
						this._childProcess = process;
						process.stderr.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
						process.stdout.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
						return transport.onConnected().then((protocol) => {
							return { reader: protocol[0], writer: protocol[1] };
						});
					})
				}
			} else {
				let pipeName: string | undefined = undefined;
				return new Promise<MessageStream>((resolve, reject) => {
					let args = node.args && node.args.slice() || [];
					if (transport === TransportKind.ipc) {
						args.push('--node-ipc');
					} else if (transport === TransportKind.stdio) {
						args.push('--stdio');
					} else if (transport === TransportKind.pipe) {
						pipeName = generateRandomPipeName();
						args.push(`--pipe=${pipeName}`);
					}
					let options: ForkOptions = node.options || Object.create(null);
					options.execArgv = options.execArgv || [];
					options.cwd = options.cwd || Workspace.rootPath;
					if (transport === TransportKind.ipc || transport === TransportKind.stdio) {
						electron.fork(node.module, args || [], options, (error, cp) => {
							if (error || !cp) {
								reject(error);
							} else {
								this._childProcess = cp;
								cp.stderr.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
								if (transport === TransportKind.ipc) {
									cp.stdout.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
									resolve({ reader: new IPCMessageReader(this._childProcess), writer: new IPCMessageWriter(this._childProcess) });
								} else {
									resolve({ reader: new StreamMessageReader(cp.stdout), writer: new StreamMessageWriter(cp.stdin) });
								}
							}
						});
					} else if (transport === TransportKind.pipe) {
						createClientPipeTransport(pipeName!).then((transport) => {
							electron.fork(node.module, args || [], options, (error, cp) => {
								if (error || !cp) {
									reject(error);
								} else {
									this._childProcess = cp;
									cp.stderr.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
									cp.stdout.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
									transport.onConnected().then((protocol) => {
										resolve({ reader: protocol[0], writer: protocol[1] });
									});
								}
							});
						});
					}
				});
			}
		} else if (json.command) {
			let command: Executable = <Executable>json;
			let options = command.options || {};
			options.cwd = options.cwd || Workspace.rootPath;
			let process = cp.spawn(command.command, command.args, command.options);
			if (!process || !process.pid) {
				return Promise.reject<MessageStream>(`Launching server using command ${command.command} failed.`);
			}
			process.stderr.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
			this._childProcess = process;
			return Promise.resolve({ reader: new StreamMessageReader(process.stdout), writer: new StreamMessageWriter(process.stdin) });
		}
		return Promise.reject<MessageStream>(new Error(`Unsupported server configuartion ` + JSON.stringify(server, null, 4)));
	}

	protected handleConnectionClosed() {
		this._childProcess = undefined;
		super.handleConnectionClosed();
	}

	public stop(): Thenable<void> {
		return super.stop().then(() => {
			if (this._childProcess) {
				let toCheck = this._childProcess;
				this._childProcess = undefined;
				// Remove all markers
				this.checkProcessDied(toCheck);
			}
		});
	}

	private checkProcessDied(childProcess: ChildProcess | undefined): void {
		if (!childProcess) {
			return;
		}
		setTimeout(() => {
			// Test if the process is still alive. Throws an exception if not
			try {
				process.kill(childProcess.pid, <any>0);
				terminate(childProcess);
			} catch (error) {
				// All is fine.
			}
		}, 2000);
	}
}
