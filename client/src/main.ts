/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;

import { workspace, window, languages, extensions, TextDocumentChangeEvent, TextDocument, Disposable, FileSystemWatcher, CommandCallback } from 'vscode';

import { IRequestHandler, INotificationHandler, MessageConnection, ServerMessageConnection, ILogger, createClientMessageConnection, ErrorCodes, ResponseError } from 'vscode-jsonrpc';
import {
		InitializeRequest, InitializeParams, InitializeResult, InitializeError, HostCapabilities, ServerCapabilities,
		ShutdownRequest, ShutdownParams,
		ExitNotification, ExitParams,
		LogMessageNotification, LogMessageParams, MessageType,
		ShowMessageNotification, ShowMessageParams,
		DidChangeConfigurationNotification, DidChangeConfigurationParams,
		DidOpenTextDocumentNotification, DidOpenTextDocumentParams, DidChangeTextDocumentNotification, DidChangeTextDocumentParams, DidCloseTextDocumentNotification, DidCloseTextDocumentParams,
		DidChangeFilesNotification, DidChangeFilesParams, FileEvent, FileChangeType,
		PublishDiagnosticsNotification, PublishDiagnosticsParams, Diagnostic, Severity, Position
	} from './protocol';

import { asOpenTextDocumentParams, asChangeTextDocumentParams, asCloseTextDocumentParams, asDiagnostics } from './converters';

import * as is from './utils/is';
import * as electron from './utils/electron';
import { terminate } from './utils/processes';
import { Delayer } from './utils/async'

declare var v8debug;

export interface IConnection {

	initialize(params: InitializeParams): Thenable<InitializeResult>;
	shutdown(params: ShutdownParams): Thenable<void>;
	exit(params: ExitParams): void;

	onLogMessage(handle: INotificationHandler<LogMessageParams>): void;
	onShowMessage(handler: INotificationHandler<ShowMessageParams>): void;

	didChangeConfiguration(params: DidChangeConfigurationParams): void;
	didChangeFiles(params: DidChangeFilesParams): void;

	didOpenTextDocument(params: DidOpenTextDocumentParams): void;
	didChangeTextDocument(params: DidChangeTextDocumentParams): void;
	didCloseTextDocument(params: DidCloseTextDocumentParams): void;
	onDiagnostics(handler: INotificationHandler<PublishDiagnosticsParams>): void;

	dispose(): void;
}

class Logger implements ILogger {
	public error(message: string): void {
		console.error(message);
	}
	public warn(message: string): void {
		console.warn(message);
	}
	public info(message: string): void {
		console.info(message);
	}
	public log(message: string): void {
		console.log(message);
	}
}

export function createConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream): IConnection {
	let logger = new Logger();
	let connection = createClientMessageConnection(inputStream, outputStream, logger);
	let result: IConnection = {
		initialize: (params: InitializeParams) => connection.sendRequest(InitializeRequest.type, params),
		shutdown: (params: ShutdownParams) => connection.sendRequest(ShutdownRequest.type, params),
		exit: (params: ExitParams) => connection.sendNotification(ExitNotification.type, params),

		onLogMessage: (handler: INotificationHandler<LogMessageParams>) => connection.onNotification(LogMessageNotification.type, handler),
		onShowMessage: (handler: INotificationHandler<ShowMessageParams>) => connection.onNotification(ShowMessageNotification.type, handler),

		didChangeConfiguration: (params: DidChangeConfigurationParams) => connection.sendNotification(DidChangeConfigurationNotification.type, params),
		didChangeFiles: (params: DidChangeFilesParams) => connection.sendNotification(DidChangeFilesNotification.type, params),

		didOpenTextDocument: (params: DidOpenTextDocumentParams) => connection.sendNotification(DidOpenTextDocumentNotification.type, params),
		didChangeTextDocument: (params: DidChangeTextDocumentParams) => connection.sendNotification(DidChangeTextDocumentNotification.type, params),
		didCloseTextDocument: (params: DidCloseTextDocumentParams) => connection.sendNotification(DidCloseTextDocumentNotification.type, params),
		onDiagnostics: (handler: INotificationHandler<PublishDiagnosticsParams>) => connection.onNotification(PublishDiagnosticsNotification.type, handler),

		dispose: () => connection.dispose()
	}

	return result;
}

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

export interface NodeModule {
	module: string;
	args?: string[];
	options?: ForkOptions;
}

export interface ClientCustomization {
	server: Executable | { run: Executable; debug: Executable; } |  { run: NodeModule; debug: NodeModule } | NodeModule | (() => Thenable<ChildProcess | StreamInfo>);
	configuration: string | string[];
	fileWatchers: FileSystemWatcher | FileSystemWatcher[];
	syncTextDocument(textDocument: TextDocument): boolean;
}

enum ClientState {
	Starting,
	Running,
	Stopping,
	Stopped
}

export class LanguageClient {

	private _name: string;
	private _customization: ClientCustomization;
	private _forceDebug: boolean;

	private _state: ClientState;
	private _onReady: Promise<void>;
	private _onReadyCallbacks: { resolve: () => void; reject: () => void; };
	private _connection: Thenable<IConnection>;
	private _childProcess: ChildProcess;
	private _capabilites: ServerCapabilities;

	private _listeners: Disposable[];
	private _diagnostics: { [uri: string]: Disposable };

	private _fileEvents: FileEvent[];
	private _delayer: Delayer<void>;

	public constructor(name: string, customization: ClientCustomization, forceDebug: boolean = false) {
		this._name = name;
		this._customization = customization;
		this._forceDebug = forceDebug;

		this._state = ClientState.Stopped;
		this._connection = null;
		this._childProcess = null;

		this._listeners = [];
		this._diagnostics = Object.create(null);

		this._fileEvents = [];
		this._delayer = new Delayer<void>(250);
		this._onReady = new Promise<void>((resolve, reject) => {
			this._onReadyCallbacks = { resolve, reject };
		});
	}

	public needsStart(): boolean {
		return this._state === ClientState.Stopping || this._state === ClientState.Stopped;
	}

	public needsStop(): boolean {
		return this._state === ClientState.Starting || this._state === ClientState.Running;
	}

	public onReady(): Promise<void> {
		return this._onReady;
	}

	private isConnectionActive(): boolean {
		return this._state === ClientState.Running;
	}

	public start(): void {
		this._state = ClientState.Starting;
		this.resolveConnection().then((connection) => {
			this.initialize(connection);
		}, (error) => {
			this._onReadyCallbacks.reject();
			window.showErrorMessage(`Couldn't start client ${this._name}`);
		})
	}
	private resolveConnection(): Thenable<IConnection> {
		if (!this._connection) {
			this._connection = this.createConnection();
		}
		return this._connection;
	}

	private initialize(connection: IConnection): Thenable<InitializeResult> {
		let initParams: InitializeParams = { rootFolder: workspace.getPath(), capabilities: { } };
		return connection.initialize(initParams).then((result) => {
			this._state = ClientState.Running;
			this._capabilites = result.capabilities;
			connection.onDiagnostics(params => this.handleDiagnostics(params));
			workspace.onDidOpenTextDocument(t => this.onDidOpenTextDoument(connection, t), null, this._listeners);
			workspace.onDidChangeTextDocument(t => this.onDidChangeTextDocument(connection, t), null, this._listeners);
			workspace.onDidCloseTextDocument(t => this.onDidCloseTextDoument(connection, t), null, this._listeners);
			this.hookFileEvents(connection);
			this.hookConfigurationChanged(connection);
			this._onReadyCallbacks.resolve();
			workspace.getTextDocuments().forEach(t => this.onDidOpenTextDoument(connection, t));
			return result;
		}, (error: ResponseError<InitializeError>) => {
			if (error.data.retry) {
				window.showErrorMessage(error.message, { title: 'Retry', command: () => {
					this.initialize(connection);
				}});
			} else {
				this._onReadyCallbacks.reject();
				window.showErrorMessage(error.message);
			}
		});
	}

	public stop() {
		if (!this._connection) {
			this._state = ClientState.Stopped;
			return;
		}
		this._state = ClientState.Stopping;
		// unkook listeners
		this._listeners.forEach(listener => listener.dispose());
		this.resolveConnection().then(connection => {
			connection.shutdown({}).then(() => {
				connection.exit({});
				connection.dispose();
				this._state = ClientState.Stopped;
				this._connection = null;
				let toCheck = this._childProcess;
				this._childProcess = null;
				// Remove all markers
				Object.keys(this._diagnostics).forEach(key => this._diagnostics[key].dispose());
				this._diagnostics = Object.create(null);
				this.checkProcessDied(toCheck);
			})
		});
	}

	public notifyConfigurationChanged(settings: any): void {
		this.onReady().then(() => {
			this.resolveConnection().then(connection => {
				if (this.isConnectionActive()) {
					connection.didChangeConfiguration({ settings });
				}
			}, (error) => {
				console.error(`Syncing settings failed with error ${JSON.stringify(error, null, 4)}`);
			});
		});
	}

	public notifyFileEvent(event: FileEvent): void {
		this._fileEvents.push(event);
		this._delayer.trigger(() => {
			this.onReady().then(() => {
				this.resolveConnection().then(connection => {
					if (this.isConnectionActive()) {
						connection.didChangeFiles({ changes: this._fileEvents });
					}
					this._fileEvents = [];
				})
			});
		});
	}

	private onDidOpenTextDoument(connection: IConnection, textDocument: TextDocument): void {
		if (!this._customization.syncTextDocument(textDocument)) {
			return;
		}
		connection.didOpenTextDocument(asOpenTextDocumentParams(textDocument));
	}

	private onDidChangeTextDocument(connection: IConnection, event: TextDocumentChangeEvent): void {
		if (!this._customization.syncTextDocument(event.document)) {
			return;
		}
		let uri: string = event.document.getUri().toString();
		if (this._capabilites.incrementalTextDocumentSync) {
			asChangeTextDocumentParams(event).forEach(param => connection.didChangeTextDocument(param));
		} else {
			connection.didChangeTextDocument(asChangeTextDocumentParams(event.document));
		}
	}

	private onDidCloseTextDoument(connection: IConnection, textDocument: TextDocument): void {
		if (!this._customization.syncTextDocument(textDocument)) {
			return;
		}
		connection.didCloseTextDocument(asCloseTextDocumentParams(textDocument));
	}

	private handleDiagnostics(params: PublishDiagnosticsParams) {
		let uri = params.uri;
		let diagnostics = asDiagnostics(params);
		let disposable = languages.addDiagnostics(diagnostics);
		let old = this._diagnostics[uri];
		old && old.dispose();
		this._diagnostics[uri] = disposable;
	}

	private createConnection(): Thenable<IConnection> {
		let server = this._customization.server;
		// We got a function.
		if (is.func(server)) {
			return server().then((result) => {
				let info = result as StreamInfo;
				if (info.writer && info.reader) {
					return createConnection(info.reader, info.writer);
				} else {
					let cp = result as ChildProcess;
					return createConnection(cp.stdout, cp.stdin);
				}
			});
		}
		let json: { command?: string; module?: string } = null;
		let runDebug= <{ run: any; debug: any;}>server;
		if (is.defined(runDebug.run) || is.defined(runDebug.debug)) {
			// We are under debugging. So use debug as well.
			if (typeof v8debug === 'object' || this._forceDebug) {
				json = runDebug.debug;
			} else {
				json = runDebug.run;
			}
		} else {
			json = server;
		}
		if (is.defined(json.module)) {
			let node: NodeModule = <NodeModule>json;
			return new Promise<IConnection>((resolve, reject) => {
				let options = node.options || {};
				options.execArgv = options.execArgv || [];
				options.cwd = options.cwd || workspace.getPath();
				electron.fork(node.module, node.args || [], options, (error, cp) => {
					if (error) {
						reject(error);
					} else {
						this._childProcess = cp;
						resolve(createConnection(cp.stdout, cp.stdin));
					}
				});
			});
		} else if (is.defined(json.command)) {
			let command: Executable = <Executable>json;
			let options = command.options || {};
			options.cwd = options.cwd || workspace.getPath();
			let process = cp.spawn(command.command, command.args, command.options);
			this._childProcess = process;
			return Promise.resolve(createConnection(process.stdout, process.stdin));
		}
		return Promise.reject<IConnection>(new Error(`Unsupported server configuartion ` + JSON.stringify(server, null, 4)));
	}

	private checkProcessDied(childProcess: ChildProcess): void {
		setTimeout(() => {
			// Test if the process is still alive. Throws an exception if not
			try {
				process.kill(childProcess.pid, '0');
				terminate(childProcess);
			} catch (error) {
				// All is fine.
			}
		}, 2000);
	}

	private hookConfigurationChanged(connection: IConnection): void {
		if (!this._customization.configuration) {
			return;
		}
		extensions.onDidChangeConfiguration(e => this.onDidChangeConfiguration(connection), this, this._listeners);
		this.onDidChangeConfiguration(connection);
	}

	private onDidChangeConfiguration(connection: IConnection): void {
		let keys: string[] = null;
		if (is.string(this._customization.configuration)) {
			keys = [<string>this._customization.configuration];
		} else if (is.stringArray(this._customization.configuration)) {
			keys = (<string[]>this._customization.configuration);
		}
		if (keys) {
			this.extractSettingsInformation(keys).then((settings) => {
				if (this.isConnectionActive()) {
					connection.didChangeConfiguration({ settings });
				}
			}, (error) => {
				console.error(`Syncing settings failed with error ${JSON.stringify(error, null, 4)}`);
			});
		}
	}

	private extractSettingsInformation(keys: string[]): Thenable<any> {
		function ensurePath(config: any, path: string[]): any {
			let current = config;
			for (let i = 0; i < path.length - 1; i++) {
				let obj = current[path[i]];
				if (!obj) {
					obj = Object.create(null);
					current[path[i]] = obj;
				}
				current = obj;
			}
			return current;
		}
		let promises: Thenable<any>[] = [];
		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];
			let index: number = key.indexOf('.');
			if (index >= 0) {
				promises.push(extensions.getConfigurationMemento(key.substr(0, index)).getValue(key.substr(index + 1)));
			} else {
				promises.push(extensions.getConfigurationMemento(key).getValues());
			}
		}
		return Promise.all(promises).then(values => {
			let result = Object.create(null);
			for (let i = 0; i < values.length; i++) {
				let path = keys[i].split('.');
				let value = values[i];
				ensurePath(result, path)[path[path.length - 1]] = value;
			}
			return result;
		});
	}

	private hookFileEvents(connection: IConnection): void {
		if (!this._customization.fileWatchers) {
			return;
		}
		let watchers: FileSystemWatcher[] = null;
		if (is.array(this._customization.fileWatchers)) {
			watchers = <FileSystemWatcher[]>this._customization.fileWatchers;
		} else {
			watchers = [<FileSystemWatcher>this._customization.fileWatchers];
		}
		if (!watchers) {
			return;
		}
		watchers.forEach(watcher => {
			watcher.onDidCreate((resource) => this.notifyFileEvent(
				{
					uri: resource.toString(),
					type: FileChangeType.Created
				}
			), null, this._listeners);
			watcher.onDidChange((resource) => this.notifyFileEvent(
				{
					uri: resource.toString(),
					type: FileChangeType.Changed
				}

			), null, this._listeners);
			watcher.onDidDelete((resource) => this.notifyFileEvent(
				{
					uri: resource.toString(),
					type: FileChangeType.Deleted
				}
			), null, this._listeners);
		})
	}
}

export class ClientController {

	private _disposables: Disposable[];

	constructor(private _client: LanguageClient, private _setting: string) {
		this._disposables = [];
		extensions.onDidChangeConfiguration(this.onDidChangeConfiguration, this, this._disposables);
		this.onDidChangeConfiguration();
	}

	private onDidChangeConfiguration(): void {
		let memento = extensions.getConfigurationMemento(this._setting);
		memento.getValue('enable', false).then(enabled => {
			if (enabled && this._client.needsStart()) {
				this._client.start();
			} else if (!enabled && this._client.needsStop()) {
				this._client.stop();
			}
		});
	}
}