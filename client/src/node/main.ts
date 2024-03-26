/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;
import * as fs from 'fs';
import * as path from 'path';

import { workspace as Workspace, Disposable, version as VSCodeVersion } from 'vscode';

import * as Is from '../common/utils/is';
import { BaseLanguageClient, LanguageClientOptions, MessageTransports, ShutdownMode } from '../common/client';

import { terminate } from './processes';
import { StreamMessageReader, StreamMessageWriter, IPCMessageReader, IPCMessageWriter, createClientPipeTransport, generateRandomPipeName, createClientSocketTransport, InitializeParams} from 'vscode-languageserver-protocol/node';

// Import SemVer functions individually to avoid circular dependencies in SemVer
import semverParse = require('semver/functions/parse');
import semverSatisfies = require('semver/functions/satisfies');

export * from 'vscode-languageserver-protocol/node';
export * from '../common/api';

const REQUIRED_VSCODE_VERSION = '^1.86.0'; // do not change format, updated by `updateVSCode` script

export enum TransportKind {
	stdio,
	ipc,
	pipe,
	socket
}

export interface SocketTransport {
	kind: TransportKind.socket;
	port: number;
}

/**
 * To avoid any timing, pipe name or port number issues the pipe (TransportKind.pipe)
 * and the sockets (TransportKind.socket and SocketTransport) are owned by the
 * VS Code processes. The server process simply connects to the pipe / socket.
 * In node term the VS Code process calls `createServer`, then starts the server
 * process, waits until the server process has connected to the pipe / socket
 * and then signals that the connection has been established and messages can
 * be send back and forth. If the language server is implemented in a different
 * program language the server simply needs to create a connection to the
 * passed pipe name or port number.
 */
export type Transport = TransportKind | SocketTransport;

namespace Transport {
	export function isSocket(value: Transport | undefined): value is SocketTransport {
		const candidate = value as SocketTransport;
		return candidate && candidate.kind === TransportKind.socket && Is.number(candidate.port);
	}
}

export interface ExecutableOptions {
	cwd?: string;
	env?: any;
	detached?: boolean;
	shell?: boolean;
}

export interface Executable {
	command: string;
	transport?: Transport;
	args?: string[];
	options?: ExecutableOptions;
}

namespace Executable {
	export function is(value: any): value is Executable {
		return Is.string(value.command);
	}
}

export interface ForkOptions {
	cwd?: string;
	env?: any;
	encoding?: string;
	execArgv?: string[];
}

export interface NodeModule {
	module: string;
	transport?: Transport;
	args?: string[];
	runtime?: string;
	options?: ForkOptions;
}

namespace NodeModule {
	export function is(value: any): value is NodeModule {
		return Is.string(value.module);
	}
}

export interface StreamInfo {
	writer: NodeJS.WritableStream;
	reader: NodeJS.ReadableStream;
	detached?: boolean;
}

namespace StreamInfo {
	export function is(value: any): value is StreamInfo {
		const candidate = value as StreamInfo;
		return candidate && candidate.writer !== undefined && candidate.reader !== undefined;
	}
}

export interface ChildProcessInfo {
	process: ChildProcess;
	detached: boolean;
}

namespace ChildProcessInfo {
	export function is(value: any): value is ChildProcessInfo {
		const candidate = value as ChildProcessInfo;
		return candidate && candidate.process !== undefined && typeof candidate.detached === 'boolean';
	}
}

export type ServerOptions = Executable | { run: Executable; debug: Executable } | { run: NodeModule; debug: NodeModule } | NodeModule | (() => Promise<ChildProcess | StreamInfo | MessageTransports | ChildProcessInfo>);

export class LanguageClient extends BaseLanguageClient {

	private readonly _serverOptions: ServerOptions;
	private readonly _forceDebug: boolean;
	private _serverProcess: ChildProcess | undefined;
	private _isDetached: boolean | undefined;
	private _isInDebugMode: boolean;

	public constructor(name: string, serverOptions: ServerOptions, clientOptions: LanguageClientOptions, forceDebug?: boolean);
	public constructor(id: string, name: string, serverOptions: ServerOptions, clientOptions: LanguageClientOptions, forceDebug?: boolean);
	public constructor(arg1: string, arg2: ServerOptions | string, arg3: LanguageClientOptions | ServerOptions, arg4?: boolean | LanguageClientOptions, arg5?: boolean) {
		let id: string;
		let name: string;
		let serverOptions: ServerOptions;
		let clientOptions: LanguageClientOptions;
		let forceDebug: boolean;
		if (Is.string(arg2)) {
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
		if (forceDebug === undefined) { forceDebug = false; }
		super(id, name, clientOptions);
		this._serverOptions = serverOptions;
		this._forceDebug = forceDebug;
		this._isInDebugMode = forceDebug;
		try {
			this.checkVersion();
		} catch (error: any) {
			if (Is.string(error.message)) {
				this.outputChannel.appendLine(error.message);
			}
			throw error;
		}
	}

	private checkVersion() {
		const codeVersion = semverParse(VSCodeVersion);
		if (!codeVersion) {
			throw new Error(`No valid VS Code version detected. Version string is: ${VSCodeVersion}`);
		}
		// Remove the insider pre-release since we stay API compatible.
		if (codeVersion.prerelease && codeVersion.prerelease.length > 0) {
			codeVersion.prerelease = [];
		}
		if (!semverSatisfies(codeVersion, REQUIRED_VSCODE_VERSION)) {
			throw new Error(`The language client requires VS Code version ${REQUIRED_VSCODE_VERSION} but received version ${VSCodeVersion}`);
		}
	}

	public get isInDebugMode(): boolean {
		return this._isInDebugMode;
	}

	public async restart(): Promise<void> {
		await this.stop();
		// We are in debug mode. Wait a little before we restart
		// so that the debug port can be freed. We can safely ignore
		// the disposable returned from start since it will call
		// stop on the same client instance.
		if (this.isInDebugMode) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			await this.start();
		} else {
			await this.start();
		}
	}

	protected shutdown(mode: ShutdownMode, timeout: number = 2000): Promise<void> {
		return super.shutdown(mode, timeout).finally(() => {
			if (this._serverProcess) {
				const toCheck = this._serverProcess;
				this._serverProcess = undefined;
				if (this._isDetached === undefined || !this._isDetached) {
					this.checkProcessDied(toCheck);
				}
				this._isDetached = undefined;
			}
		});
	}

	private checkProcessDied(childProcess: ChildProcess | undefined): void {
		if (!childProcess || childProcess.pid === undefined) {
			return;
		}
		setTimeout(() => {
			// Test if the process is still alive. Throws an exception if not
			try {
				if (childProcess.pid !== undefined) {
					process.kill(childProcess.pid, <any>0);
					terminate(childProcess as (ChildProcess & { pid: number }));
				}
			} catch (error) {
				// All is fine.
			}
		}, 2000);
	}

	protected handleConnectionClosed(): Promise<void> {
		this._serverProcess = undefined;
		return super.handleConnectionClosed();
	}

	protected fillInitializeParams(params: InitializeParams): void {
		super.fillInitializeParams(params);
		if (params.processId === null) {
			params.processId = process.pid;
		}
	}

	protected createMessageTransports(encoding: string): Promise<MessageTransports> {

		function getEnvironment(env: any, fork: boolean): any {
			if (!env && !fork) {
				return undefined;
			}
			const result: any = Object.create(null);
			Object.keys(process.env).forEach(key => result[key] = process.env[key]);
			if (fork) {
				result['ELECTRON_RUN_AS_NODE'] = '1';
				result['ELECTRON_NO_ASAR'] = '1';
			}
			if (env) {
				Object.keys(env).forEach(key => result[key] = env[key]);
			}
			return result;
		}

		const debugStartWith: string[] = ['--debug=', '--debug-brk=', '--inspect=', '--inspect-brk='];
		const debugEquals: string[] = ['--debug', '--debug-brk', '--inspect', '--inspect-brk'];
		function startedInDebugMode(): boolean {
			const args: string[] = (process as any).execArgv;
			if (args) {
				return args.some((arg) => {
					return debugStartWith.some(value => arg.startsWith(value)) ||
						debugEquals.some(value => arg === value);
				});
			}
			return false;
		}

		function assertStdio(process: cp.ChildProcess): asserts process is cp.ChildProcessWithoutNullStreams {
			if (process.stdin === null || process.stdout === null || process.stderr === null) {
				throw new Error('Process created without stdio streams');
			}
		}

		const server = this._serverOptions;
		// We got a function.
		if (Is.func(server)) {
			return server().then((result) => {
				if (MessageTransports.is(result)) {
					this._isDetached = !!result.detached;
					return result;
				} else if (StreamInfo.is(result)) {
					this._isDetached = !!result.detached;
					return { reader: new StreamMessageReader(result.reader), writer: new StreamMessageWriter(result.writer) };
				} else {
					let cp: ChildProcess;
					if (ChildProcessInfo.is(result)) {
						cp = result.process;
						this._isDetached = result.detached;
					} else {
						cp = result;
						this._isDetached = false;
					}
					cp.stderr!.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
					return { reader: new StreamMessageReader(cp.stdout!), writer: new StreamMessageWriter(cp.stdin!) };
				}
			});
		}
		let json: NodeModule | Executable;
		const runDebug = <{ run: any; debug: any }>server;
		if (runDebug.run || runDebug.debug) {
			if (this._forceDebug || startedInDebugMode()) {
				json = runDebug.debug;
				this._isInDebugMode = true;
			} else {
				json = runDebug.run;
				this._isInDebugMode = false;
			}
		} else {
			json = server as NodeModule | Executable;
		}
		return this._getServerWorkingDir(json.options).then(serverWorkingDir => {
			if (NodeModule.is(json) && json.module) {
				const node = json;
				const transport = node.transport || TransportKind.stdio;
				if (node.runtime) {
					const args: string[] = [];
					const options: ForkOptions = node.options ?? Object.create(null);
					if (options.execArgv) {
						options.execArgv.forEach(element => args.push(element));
					}
					args.push(node.module);
					if (node.args) {
						node.args.forEach(element => args.push(element));
					}
					const execOptions: cp.SpawnOptionsWithoutStdio = Object.create(null);
					execOptions.cwd = serverWorkingDir;
					execOptions.env = getEnvironment(options.env, false);
					const runtime = this._getRuntimePath(node.runtime, serverWorkingDir);
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
					} else if (Transport.isSocket(transport)) {
						args.push(`--socket=${transport.port}`);
					}
					args.push(`--clientProcessId=${process.pid.toString()}`);
					if (transport === TransportKind.ipc || transport === TransportKind.stdio) {
						const serverProcess = cp.spawn(runtime, args, execOptions);
						if (!serverProcess || !serverProcess.pid) {
							return handleChildProcessStartError(serverProcess, `Launching server using runtime ${runtime} failed.`);
						}
						this._serverProcess = serverProcess;
						serverProcess.stderr.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
						if (transport === TransportKind.ipc) {
							serverProcess.stdout.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
							return Promise.resolve({ reader: new IPCMessageReader(serverProcess), writer: new IPCMessageWriter(serverProcess) });
						} else {
							return Promise.resolve({ reader: new StreamMessageReader(serverProcess.stdout), writer: new StreamMessageWriter(serverProcess.stdin) });
						}
					} else if (transport === TransportKind.pipe) {
						return createClientPipeTransport(pipeName!).then((transport) => {
							const process = cp.spawn(runtime, args, execOptions);
							if (!process || !process.pid) {
								return handleChildProcessStartError(process, `Launching server using runtime ${runtime} failed.`);
							}
							this._serverProcess = process;
							process.stderr.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
							process.stdout.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
							return transport.onConnected().then((protocol) => {
								return { reader: protocol[0], writer: protocol[1] };
							});
						});
					} else if (Transport.isSocket(transport)) {
						return createClientSocketTransport(transport.port).then((transport) => {
							const process = cp.spawn(runtime, args, execOptions);
							if (!process || !process.pid) {
								return handleChildProcessStartError(process, `Launching server using runtime ${runtime} failed.`);
							}
							this._serverProcess = process;
							process.stderr.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
							process.stdout.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
							return transport.onConnected().then((protocol) => {
								return { reader: protocol[0], writer: protocol[1] };
							});
						});
					}
				} else {
					let pipeName: string | undefined = undefined;
					return new Promise<MessageTransports>((resolve, reject) => {
						const args = (node.args && node.args.slice()) ?? [];
						if (transport === TransportKind.ipc) {
							args.push('--node-ipc');
						} else if (transport === TransportKind.stdio) {
							args.push('--stdio');
						} else if (transport === TransportKind.pipe) {
							pipeName = generateRandomPipeName();
							args.push(`--pipe=${pipeName}`);
						} else if (Transport.isSocket(transport)) {
							args.push(`--socket=${transport.port}`);
						}
						args.push(`--clientProcessId=${process.pid.toString()}`);
						const options: cp.ForkOptions = node.options ?? Object.create(null);
						options.env = getEnvironment(options.env, true);
						options.execArgv = options.execArgv || [];
						options.cwd = serverWorkingDir;
						options.silent = true;
						if (transport === TransportKind.ipc || transport === TransportKind.stdio) {
							const sp = cp.fork(node.module, args || [], options);
							assertStdio(sp);
							this._serverProcess = sp;
							sp.stderr.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
							if (transport === TransportKind.ipc) {
								sp.stdout.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
								resolve({ reader: new IPCMessageReader(this._serverProcess), writer: new IPCMessageWriter(this._serverProcess) });
							} else {
								resolve({ reader: new StreamMessageReader(sp.stdout), writer: new StreamMessageWriter(sp.stdin) });
							}
						} else if (transport === TransportKind.pipe) {
							createClientPipeTransport(pipeName!).then((transport) => {
								const sp = cp.fork(node.module, args || [], options);
								assertStdio(sp);
								this._serverProcess = sp;
								sp.stderr.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
								sp.stdout.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
								transport.onConnected().then((protocol) => {
									resolve({ reader: protocol[0], writer: protocol[1] });
								}, reject);
							}, reject);
						} else if (Transport.isSocket(transport)) {
							createClientSocketTransport(transport.port).then((transport) => {
								const sp = cp.fork(node.module, args || [], options);
								assertStdio(sp);
								this._serverProcess = sp;
								sp.stderr.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
								sp.stdout.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
								transport.onConnected().then((protocol) => {
									resolve({ reader: protocol[0], writer: protocol[1] });
								}, reject);
							}, reject);
						}
					});
				}
			} else if (Executable.is(json) && json.command) {
				const command: Executable = <Executable>json;
				const args: string[] = json.args !== undefined ? json.args.slice(0) : [];
				let pipeName: string | undefined = undefined;
				const transport = json.transport;
				if (transport === TransportKind.stdio) {
					args.push('--stdio');
				} else if (transport === TransportKind.pipe) {
					pipeName = generateRandomPipeName();
					args.push(`--pipe=${pipeName}`);
				} else if (Transport.isSocket(transport)) {
					args.push(`--socket=${transport.port}`);
				} else if (transport === TransportKind.ipc) {
					throw new Error(`Transport kind ipc is not support for command executable`);
				}
				const options = Object.assign({}, command.options);
				options.cwd = options.cwd || serverWorkingDir;
				if (transport === undefined || transport === TransportKind.stdio) {
					const serverProcess = cp.spawn(command.command, args, options);
					if (!serverProcess || !serverProcess.pid) {
						return handleChildProcessStartError(serverProcess, `Launching server using command ${command.command} failed.`);
					}
					serverProcess.stderr.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
					this._serverProcess = serverProcess;
					this._isDetached = !!options.detached;
					return Promise.resolve({ reader: new StreamMessageReader(serverProcess.stdout), writer: new StreamMessageWriter(serverProcess.stdin) });
				} else if (transport === TransportKind.pipe) {
					return createClientPipeTransport(pipeName!).then((transport) => {
						const serverProcess = cp.spawn(command.command, args, options);
						if (!serverProcess || !serverProcess.pid) {
							return handleChildProcessStartError(serverProcess, `Launching server using command ${command.command} failed.`);
						}
						this._serverProcess = serverProcess;
						this._isDetached = !!options.detached;
						serverProcess.stderr.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
						serverProcess.stdout.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
						return transport.onConnected().then((protocol) => {
							return { reader: protocol[0], writer: protocol[1] };
						});
					});
				} else if (Transport.isSocket(transport)) {
					return createClientSocketTransport(transport.port).then((transport) => {
						const serverProcess = cp.spawn(command.command, args, options);
						if (!serverProcess || !serverProcess.pid) {
							return handleChildProcessStartError(serverProcess, `Launching server using command ${command.command} failed.`);
						}
						this._serverProcess = serverProcess;
						this._isDetached = !!options.detached;
						serverProcess.stderr.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
						serverProcess.stdout.on('data', data => this.outputChannel.append(Is.string(data) ? data : data.toString(encoding)));
						return transport.onConnected().then((protocol) => {
							return { reader: protocol[0], writer: protocol[1] };
						});
					});
				}
			}
			return Promise.reject<MessageTransports>(new Error(`Unsupported server configuration ` + JSON.stringify(server, null, 4)));
		}).finally(() => {
			if (this._serverProcess !== undefined) {
				this._serverProcess.on('exit', (code, signal) => {
					if (code === 0) {
						this.info('Server process exited successfully', undefined, false);
					} else if (code !== null) {
						this.error(`Server process exited with code ${code}.`, undefined, false);
					}
					if (signal !== null) {
						this.error(`Server process exited with signal ${signal}.`, undefined, false);
					}
				});
			}
		});
	}

	private _getRuntimePath(runtime: string, serverWorkingDirectory: string | undefined): string {
		if (path.isAbsolute(runtime)) {
			return runtime;
		}
		const mainRootPath = this._mainGetRootPath();
		if (mainRootPath !== undefined) {
			const result = path.join(mainRootPath, runtime);
			if (fs.existsSync(result)) {
				return result;
			}
		}
		if (serverWorkingDirectory !== undefined) {
			const result = path.join(serverWorkingDirectory, runtime);
			if (fs.existsSync(result)) {
				return result;
			}
		}
		return runtime;
	}

	private _mainGetRootPath(): string | undefined {
		const folders = Workspace.workspaceFolders;
		if (!folders || folders.length === 0) {
			return undefined;
		}
		const folder = folders[0];
		if (folder.uri.scheme === 'file') {
			return folder.uri.fsPath;
		}
		return undefined;
	}

	private _getServerWorkingDir(options?: { cwd?: string }): Promise<string | undefined> {
		let cwd = options && options.cwd;
		if (!cwd) {
			cwd = this.clientOptions.workspaceFolder
				? this.clientOptions.workspaceFolder.uri.fsPath
				: this._mainGetRootPath();
		}
		if (cwd) {
			// make sure the folder exists otherwise creating the process will fail
			return new Promise(s => {
				fs.lstat(cwd!, (err, stats) => {
					s(!err && stats.isDirectory() ? cwd : undefined);
				});
			});
		}
		return Promise.resolve(undefined);
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
				void this._client.stop();
			}
		});
	}

	private onDidChangeConfiguration(): void {
		const index = this._setting.indexOf('.');
		const primary = index >= 0 ? this._setting.substr(0, index) : this._setting;
		const rest = index >= 0 ? this._setting.substr(index + 1) : undefined;
		const enabled = rest ? Workspace.getConfiguration(primary).get(rest, false) : Workspace.getConfiguration(primary);
		if (enabled && this._client.needsStart()) {
			this._client.start().catch((error) => this._client.error('Start failed after configuration change', error, 'force'));
		} else if (!enabled && this._client.needsStop()) {
			void this._client.stop().catch((error) => this._client.error('Stop failed after configuration change', error, 'force'));
		}
	}
}

function handleChildProcessStartError(process: ChildProcess, message: string) {
	if (process === null) {
		return Promise.reject<MessageTransports>(message);
	}

	return new Promise<MessageTransports>((_, reject) => {
		process.on('error', (err) => {
			reject(`${message} ${err}`);
		});
		// the error event should always be run immediately,
		// but race on it just in case
		setImmediate(() => reject(message));
	});
}
