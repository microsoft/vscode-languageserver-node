/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;

import {
		workspace, window, languages, extensions, TextDocumentChangeEvent, TextDocument, Disposable, FileSystemWatcher, CommandCallback, Uri, DiagnosticCollection, LanguageSelector,
		CancellationToken, Hover, Position as VPosition, IHTMLContentElement
} from 'vscode';

import { IRequestHandler, INotificationHandler, MessageConnection, ClientMessageConnection, ILogger, createClientMessageConnection, ErrorCodes, ResponseError, RequestType, NotificationType } from 'vscode-jsonrpc';
import {
		InitializeRequest, InitializeParams, InitializeResult, InitializeError, HostCapabilities, ServerCapabilities, TextDocumentSync,
		ShutdownRequest, ShutdownParams,
		ExitNotification, ExitParams,
		LogMessageNotification, LogMessageParams, MessageType,
		ShowMessageNotification, ShowMessageParams,
		DidChangeConfigurationNotification, DidChangeConfigurationParams,
		DidOpenTextDocumentNotification, DidOpenTextDocumentParams, DidChangeTextDocumentNotification, DidChangeTextDocumentParams, DidCloseTextDocumentNotification, DidCloseTextDocumentParams,
		DidChangeWatchedFilesNotification, DidChangeWatchedFilesParams, FileEvent, FileChangeType,
		PublishDiagnosticsNotification, PublishDiagnosticsParams, Diagnostic, Severity, Position,
		HoverRequest, HoverResult
	} from './protocol';

import { asOpenTextDocumentParams, asChangeTextDocumentParams, asCloseTextDocumentParams, asDiagnostics, asRange, asTextDocumentPosition } from './converters';

import * as is from './utils/is';
import * as electron from './utils/electron';
import { terminate } from './utils/processes';
import { Delayer } from './utils/async'

export { RequestType, NotificationType, INotificationHandler }

declare var v8debug;

interface IConnection {

	listen(): void;

	sendRequest<P, R, E>(type: RequestType<P, R, E>, params?: P): Thenable<R>;
	sendNotification<P>(type: NotificationType<P>, params?: P): void;
	onNotification<P>(type: NotificationType<P>, handler: INotificationHandler<P>): void;

	initialize(params: InitializeParams): Thenable<InitializeResult>;
	shutdown(params: ShutdownParams): Thenable<void>;
	exit(params: ExitParams): void;

	onLogMessage(handle: INotificationHandler<LogMessageParams>): void;
	onShowMessage(handler: INotificationHandler<ShowMessageParams>): void;

	didChangeConfiguration(params: DidChangeConfigurationParams): void;
	didChangeWatchedFiles(params: DidChangeWatchedFilesParams): void;

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

function createConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream): IConnection {
	let logger = new Logger();
	let connection = createClientMessageConnection(inputStream, outputStream, logger);
	let result: IConnection = {

		listen: (): void => connection.listen(),

		sendRequest: <P, R, E>(type: RequestType<P, R, E>, params?: P): Thenable<R> => connection.sendRequest(type, params),
		sendNotification: <P>(type: NotificationType<P>, params?: P): void => connection.sendNotification(type, params),
		onNotification: <P>(type: NotificationType<P>, handler: INotificationHandler<P>): void => connection.onNotification(type, handler),

		initialize: (params: InitializeParams) => connection.sendRequest(InitializeRequest.type, params),
		shutdown: (params: ShutdownParams) => connection.sendRequest(ShutdownRequest.type, params),
		exit: (params: ExitParams) => connection.sendNotification(ExitNotification.type, params),

		onLogMessage: (handler: INotificationHandler<LogMessageParams>) => connection.onNotification(LogMessageNotification.type, handler),
		onShowMessage: (handler: INotificationHandler<ShowMessageParams>) => connection.onNotification(ShowMessageNotification.type, handler),

		didChangeConfiguration: (params: DidChangeConfigurationParams) => connection.sendNotification(DidChangeConfigurationNotification.type, params),
		didChangeWatchedFiles: (params: DidChangeWatchedFilesParams) => connection.sendNotification(DidChangeWatchedFilesNotification.type, params),

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

export interface ClientOptions {
	server: Executable | { run: Executable; debug: Executable; } |  { run: NodeModule; debug: NodeModule } | NodeModule | (() => Thenable<ChildProcess | StreamInfo>);
	configuration?: string | string[];
	fileWatchers?: FileSystemWatcher | FileSystemWatcher[];
	languageSelector?: string | string[];
	syncTextDocument?: (textDocument: TextDocument) => boolean;
}

enum ClientState {
	Starting,
	Running,
	Stopping,
	Stopped
}

interface SyncExpression {
	evaluate(textDocument: TextDocument): boolean;
}

class FalseSyncExpression implements SyncExpression {
	public evaluate(textDocument: TextDocument): boolean {
		return false;
	}
}

class LanguageIdExpression implements SyncExpression {
	constructor(private _id: string) {
	}
	public evaluate(textDocument: TextDocument): boolean {
		return this._id === textDocument.languageId;
	}
}

class FunctionSyncExpression implements SyncExpression {
	constructor(private _func: (textDocument: TextDocument) => boolean) {
	}
	public evaluate(textDocument: TextDocument): boolean {
		return this._func(textDocument);
	}
}

class CompositeSyncExpression implements SyncExpression {
	private _expression: SyncExpression[];
	constructor(values: string[], func?: (textDocument: TextDocument) => boolean) {
		this._expression = values.map(value => new LanguageIdExpression(value));
		if (func) {
			this._expression.push(new FunctionSyncExpression(func));
		}
	}
	public evaluate(textDocument: TextDocument): boolean {
		return this._expression.some(exp => exp.evaluate(textDocument));
	}
}

export class LanguageClient {

	private _name: string;
	private _options: ClientOptions;
	private _forceDebug: boolean;

	private _state: ClientState;
	private _onReady: Promise<void>;
	private _onReadyCallbacks: { resolve: () => void; reject: () => void; };
	private _connection: Thenable<IConnection>;
	private _childProcess: ChildProcess;
	private _capabilites: ServerCapabilities;

	private _listeners: Disposable[];
	private _providers: Disposable[];
	private _diagnostics: DiagnosticCollection;

	private _syncExpression: SyncExpression;

	private _fileEvents: FileEvent[];
	private _delayer: Delayer<void>;

	public constructor(name: string, options: ClientOptions, forceDebug: boolean = false) {
		this._name = name;
		this._options = options;
		this._syncExpression = this.computeSyncExpression();
		this._forceDebug = forceDebug;

		this._state = ClientState.Stopped;
		this._connection = null;
		this._childProcess = null;

		this._listeners = [];
		this._providers = [];
		this._diagnostics = languages.createDiagnosticCollection();

		this._fileEvents = [];
		this._delayer = new Delayer<void>(250);
		this._onReady = new Promise<void>((resolve, reject) => {
			this._onReadyCallbacks = { resolve, reject };
		});
	}

	private computeSyncExpression(): SyncExpression {
		if (!this._options.languageSelector && !this._options.syncTextDocument) {
			return new FalseSyncExpression();
		}
		if (this._options.syncTextDocument && !this._options.languageSelector) {
			return new FunctionSyncExpression(this._options.syncTextDocument);
		}
		if (!this._options.syncTextDocument && this._options.languageSelector) {
			if (is.string(this._options.languageSelector)) {
				return new LanguageIdExpression(<string>this._options.languageSelector)
			} else {
				return new CompositeSyncExpression(<string[]>this._options.languageSelector)
			}
		}
		if (this._options.syncTextDocument && this._options.languageSelector) {
			return new CompositeSyncExpression(
				is.string(this._options.languageSelector) ? [<string>this._options.languageSelector] : <string[]>this._options.languageSelector,
				this._options.syncTextDocument);
		}
	}

	public sendRequest<P, R, E>(type: RequestType<P, R, E>, params?: P): Thenable<R> {
		return this.onReady().then(() => {
			return this.resolveConnection().then((connection) => {
				if (this.isConnectionActive()) {
					return connection.sendRequest(type, params);
				} else {
					return Promise.reject<R>(new ResponseError(ErrorCodes.InternalError, 'Connection is already closed'));
				}
			});
		});
	}

	public sendNotification<P>(type: NotificationType<P>, params?: P): void {
		this.onReady().then(() => {
			this.resolveConnection().then((connection) => {
				if (this.isConnectionActive()) {
					connection.sendNotification(type, params);
				}
			});
		});
	}

	public onNotification<P>(type: NotificationType<P>, handler: INotificationHandler<P>): void {
		this.onReady().then(() => {
			this.resolveConnection().then((connection) => {
				connection.onNotification(type, handler);
			})
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
			connection.onLogMessage((message) => {
				switch(message.type) {
					case MessageType.Error:
						console.error(message.message);
						break;
					case MessageType.Warning:
						console.warn(message.message);
						break;
					case MessageType.Info:
						console.info(message.message);
						break;
					default:
						console.log(message.message);
				}
			});
			connection.onShowMessage((message) => {
				switch(message.type) {
					case MessageType.Error:
						window.showErrorMessage(message.message);
						break;
					case MessageType.Warning:
						window.showWarningMessage(message.message);
						break;
					case MessageType.Info:
						window.showInformationMessage(message.message);
						break;
					default:
						window.showInformationMessage(message.message);
				}
			});
			connection.listen();
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
		let initParams: InitializeParams = { rootFolder: workspace.rootPath, capabilities: { } };
		return connection.initialize(initParams).then((result) => {
			this._state = ClientState.Running;
			this._capabilites = result.capabilities;
			connection.onDiagnostics(params => this.handleDiagnostics(params));
			if (this._capabilites.textDocumentSync !== TextDocumentSync.None) {
				workspace.onDidOpenTextDocument(t => this.onDidOpenTextDoument(connection, t), null, this._listeners);
				workspace.onDidChangeTextDocument(t => this.onDidChangeTextDocument(connection, t), null, this._listeners);
				workspace.onDidCloseTextDocument(t => this.onDidCloseTextDoument(connection, t), null, this._listeners);
			}
			this.hookFileEvents(connection);
			this.hookConfigurationChanged(connection);
			this.hookCapabilities(connection);
			this._onReadyCallbacks.resolve();
			workspace.textDocuments.forEach(t => this.onDidOpenTextDoument(connection, t));
			return result;
		}, (error: ResponseError<InitializeError>) => {
			if (error.data.retry) {
				window.showErrorMessage(error.message, { title: 'Retry', id: "retry"}).then(item => {
					if (item.id === 'retry') {
						this.initialize(connection);
					}
				});
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
						connection.didChangeWatchedFiles({ changes: this._fileEvents });
					}
					this._fileEvents = [];
				})
			});
		});
	}

	private onDidOpenTextDoument(connection: IConnection, textDocument: TextDocument): void {
		if (!this._syncExpression.evaluate(textDocument)) {
			return;
		}
		connection.didOpenTextDocument(asOpenTextDocumentParams(textDocument));
	}

	private onDidChangeTextDocument(connection: IConnection, event: TextDocumentChangeEvent): void {
		if (!this._syncExpression.evaluate(event.document)) {
			return;
		}
		let uri: string = event.document.uri.toString();
		if (this._capabilites.textDocumentSync === TextDocumentSync.Incremental) {
			asChangeTextDocumentParams(event).forEach(param => connection.didChangeTextDocument(param));
		} else {
			connection.didChangeTextDocument(asChangeTextDocumentParams(event.document));
		}
	}

	private onDidCloseTextDoument(connection: IConnection, textDocument: TextDocument): void {
		if (!this._syncExpression.evaluate(textDocument)) {
			return;
		}
		connection.didCloseTextDocument(asCloseTextDocumentParams(textDocument));
	}

	private handleDiagnostics(params: PublishDiagnosticsParams) {
		let uri = Uri.parse(params.uri);
		let diagnostics = asDiagnostics(params.diagnostics);
		this._diagnostics.set(uri, diagnostics);
	}

	private createConnection(): Thenable<IConnection> {
		let server = this._options.server;
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
				options.cwd = options.cwd || workspace.rootPath;
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
			options.cwd = options.cwd || workspace.rootPath;
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
		if (!this._options.configuration) {
			return;
		}
		workspace.onDidChangeConfiguration(e => this.onDidChangeConfiguration(connection), this, this._listeners);
		this.onDidChangeConfiguration(connection);
	}

	private onDidChangeConfiguration(connection: IConnection): void {
		let keys: string[] = null;
		if (is.string(this._options.configuration)) {
			keys = [<string>this._options.configuration];
		} else if (is.stringArray(this._options.configuration)) {
			keys = (<string[]>this._options.configuration);
		}
		if (keys) {
			if (this.isConnectionActive()) {
				connection.didChangeConfiguration({ settings: this.extractSettingsInformation(keys) });
			}
		}
	}

	private extractSettingsInformation(keys: string[]): any {
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
		workspace.getConfiguration()

		let result = Object.create(null);
		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];
			let index: number = key.indexOf('.');
			let config: any = null;
			if (index >= 0) {
				config = workspace.getConfiguration(key.substr(0, index)).get(key.substr(index + 1));
			} else {
				config = workspace.getConfiguration(key);
			}
			if (config) {
				let path = keys[i].split('.');
				ensurePath(result, path)[path[path.length - 1]] = config;
			}
		}
		return result;
	}

	private hookFileEvents(connection: IConnection): void {
		if (!this._options.fileWatchers) {
			return;
		}
		let watchers: FileSystemWatcher[] = null;
		if (is.array(this._options.fileWatchers)) {
			watchers = <FileSystemWatcher[]>this._options.fileWatchers;
		} else {
			watchers = [<FileSystemWatcher>this._options.fileWatchers];
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

	private hookCapabilities(connection: IConnection): void {
		if (this._capabilites.hoverProvider && this._options.languageSelector) {
			this._providers.push(languages.registerHoverProvider(this._options.languageSelector, {
				provideHover: (document: TextDocument, position: VPosition, token: CancellationToken): Thenable<Hover> => {
					if (this.isConnectionActive()) {
						return connection.sendRequest(HoverRequest.type, asTextDocumentPosition(document, position)).then((result: HoverResult) => {
							if (is.string(result.content)) {
								return new Hover(<string>result.content, asRange(result.range));
							} else {
								return new Hover(<IHTMLContentElement>result.content, asRange(result.range));
							}
						});
					} else {
						return Promise.reject<Hover>(new Error('Connection is not active anymore'));
					}
				}
			}));
		}
	}
}

export class ClientStarter {

	private _setting: string;
	private _listeners: Disposable[];

	constructor(private _client: LanguageClient) {
		this._listeners = [];
	}

	public watchSetting(setting: string) {
		this._setting = setting;
		workspace.onDidChangeConfiguration(this.onDidChangeConfiguration, this, this._listeners);
		this.onDidChangeConfiguration();
	}

	private onDidChangeConfiguration(): void {
		let index = this._setting.indexOf('.');
		let primary = index >= 0 ? this._setting.substr(0, index) : this._setting;
		let rest = index >= 0 ? this._setting.substr(index + 1) : undefined;
		let enabled = rest ? workspace.getConfiguration(primary).get(rest, false) : workspace.getConfiguration(primary);
		if (enabled && this._client.needsStart()) {
			this._client.start();
		} else if (!enabled && this._client.needsStop()) {
			this._client.stop();
		}
	}
}