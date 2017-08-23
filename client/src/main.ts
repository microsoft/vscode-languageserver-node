/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;

import { BaseLanguageClient, LanguageClientOptions, MessageTransports } from './client';

import {
	workspace as Workspace, Disposable
} from 'vscode';

import {
	StreamMessageReader, StreamMessageWriter,
	IPCMessageReader, IPCMessageWriter,
	createClientPipeTransport, generateRandomPipeName
} from 'vscode-jsonrpc';

import * as is from './utils/is';
import * as electron from './utils/electron';
import { terminate } from './utils/processes';

export * from './client';

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
		let id: string;
		let name: string;
		let serverOptions: ServerOptions;
		let clientOptions: LanguageClientOptions;
		let forceDebug: boolean;
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
		super(id, name, clientOptions);
		this._serverOptions = serverOptions;
		this._forceDebug = forceDebug;
	}

	public stop(): Thenable<void> {
		return super.stop().then(() => {
			if (this._childProcess) {
				let toCheck = this._childProcess;
				this._childProcess = undefined;
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

	protected handleConnectionClosed() {
		this._childProcess = undefined;
		super.handleConnectionClosed();
	}


	protected createMessageTransports(encoding: string): Thenable<MessageTransports> {
		let rootPath = this.clientOptions.workspaceFolder
			? this.clientOptions.workspaceFolder.uri.fsPath
			: Workspace.rootPath;

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
				return args.some((arg) => /^--debug=?/.test(arg) || /^--debug-brk=?/.test(arg) || /^--inspect=?/.test(arg) || /^--inspect-brk=?/.test(arg));
			};
			return false;
		}

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
			json = server as NodeModule;
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
				execOptions.cwd = options.cwd || rootPath;
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
						return Promise.reject<MessageTransports>(`Launching server using runtime ${node.runtime} failed.`);
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
							return Promise.reject<MessageTransports>(`Launching server using runtime ${node.runtime} failed.`);
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
				return new Promise<MessageTransports>((resolve, reject) => {
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
					options.cwd = options.cwd || rootPath;
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
					}  else if (transport === TransportKind.pipe) {
						createClientPipeTransport(pipeName!).then((transport) => {
							electron.fork(node.module, args || [], options, (error, cp) => {
								if (error || !cp) {
									reject(error);
								} else {
									this._childProcess = cp;
									cp.stderr.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
									cp.stdout.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
									transport.onConnected().then((protocol) => {
										resolve({ reader: protocol[0], writer: protocol[1]});
									});
								}
							});
						});
					}
				});
			}
		} else if (json.command) {
			let command: Executable = <Executable>json;
			let args = command.args || [];
			let options = command.options || {};
			options.cwd = options.cwd || rootPath;
			let process = cp.spawn(command.command, args, options);
			if (!process || !process.pid) {
				return Promise.reject<MessageTransports>(`Launching server using command ${command.command} failed.`);
			}
			process.stderr.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
			this._childProcess = process;
			return Promise.resolve({ reader: new StreamMessageReader(process.stdout), writer: new StreamMessageWriter(process.stdin) });
		}
		return Promise.reject<MessageTransports>(new Error(`Unsupported server configuration ` + JSON.stringify(server, null, 4)));
	}
}

export class SettingMonitor {

	private _listeners: Disposable[];

	constructor(private _client: LanguageClient, private _setting: string) {
		this._listeners = [];
	}

	public start(): Disposable {
		Workspace.onDidChangeConfiguration(this.onDidChangeConfiguration, this, this._listeners);
		this.onDidChangeConfiguration();
		return new Disposable(() => {
			if (this._client.needsStop()) {
				this._client.stop();
			}
		});
	}

	private onDidChangeConfiguration(): void {
		let index = this._setting.indexOf('.');
		let primary = index >= 0 ? this._setting.substr(0, index) : this._setting;
		let rest = index >= 0 ? this._setting.substr(index + 1) : undefined;
		let enabled = rest ? Workspace.getConfiguration(primary).get(rest, false) : Workspace.getConfiguration(primary);
		if (enabled && this._client.needsStart()) {
			this._client.start();
		} else if (!enabled && this._client.needsStop()) {
			this._client.stop();
		}
	}
}

export * from './proposed';