/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;

import {
		workspace as Workspace, window as Window, languages as Languages, extensions as Extensions, TextDocumentChangeEvent, TextDocument, Disposable,
		FileSystemWatcher, Uri, DiagnosticCollection, DocumentSelector,
		CancellationToken, Hover as VHover, Position as VPosition, Location as VLocation,
		CompletionItem as VCompletionItem, SignatureHelp as VSignatureHelp, Definition as VDefinition, DocumentHighlight as VDocumentHighlight,
		SymbolInformation as VSymbolInformation
} from 'vscode';

import {
		IRequestHandler, INotificationHandler, MessageConnection, ClientMessageConnection, ILogger, createClientMessageConnection,
		ErrorCodes, ResponseError, RequestType, NotificationType,
		IMessageReader, IPCMessageReader, IMessageWriter, IPCMessageWriter,
} from 'vscode-jsonrpc';
import {
		InitializeRequest, InitializeParams, InitializeResult, InitializeError, ClientCapabilities, ServerCapabilities, TextDocumentSyncKind,
		ShutdownRequest,
		ExitNotification,
		LogMessageNotification, LogMessageParams, MessageType,
		ShowMessageNotification, ShowMessageParams,
		DidChangeConfigurationNotification, DidChangeConfigurationParams,
		Position, Range, Location,
		TextDocumentIdentifier, TextDocumentPosition,
		DidOpenTextDocumentNotification, DidOpenTextDocumentParams, DidChangeTextDocumentNotification, DidChangeTextDocumentParams, DidCloseTextDocumentNotification,
		DidChangeWatchedFilesNotification, DidChangeWatchedFilesParams, FileEvent, FileChangeType,
		PublishDiagnosticsNotification, PublishDiagnosticsParams, Diagnostic, DiagnosticSeverity,
		CompletionRequest, CompletionResolveRequest, CompletionItem,
		HoverRequest, Hover,
		SignatureHelpRequest, DefinitionRequest, Definition, ReferencesRequest, DocumentHighlightRequest, DocumentHighlight,
		DocumentSymbolRequest, SymbolInformation, SymbolKind, WorkspaceSymbolRequest, WorkspaceSymbolParams
} from './protocol';

import * as c2p from './codeConverter';
import * as p2c from './protocolConverter';

import * as is from './utils/is';
import * as electron from './utils/electron';
import { terminate } from './utils/processes';
import { Delayer } from './utils/async'

export {
	RequestType, NotificationType, INotificationHandler,
	Position, Range, Location, TextDocumentIdentifier, TextDocumentPosition
}

declare var v8debug;

interface IConnection {

	listen(): void;

	sendRequest<P, R, E>(type: RequestType<P, R, E>, params?: P): Thenable<R>;
	sendNotification<P>(type: NotificationType<P>, params?: P): void;
	onNotification<P>(type: NotificationType<P>, handler: INotificationHandler<P>): void;

	initialize(params: InitializeParams): Thenable<InitializeResult>;
	shutdown(): Thenable<void>;
	exit(): void;

	onLogMessage(handle: INotificationHandler<LogMessageParams>): void;
	onShowMessage(handler: INotificationHandler<ShowMessageParams>): void;

	didChangeConfiguration(params: DidChangeConfigurationParams): void;
	didChangeWatchedFiles(params: DidChangeWatchedFilesParams): void;

	didOpenTextDocument(params: DidOpenTextDocumentParams): void;
	didChangeTextDocument(params: DidChangeTextDocumentParams | DidChangeTextDocumentParams[]): void;
	didCloseTextDocument(params: TextDocumentIdentifier): void;
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

function createConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream): IConnection;
function createConnection(reader: IMessageReader, writer: IMessageWriter): IConnection;
function createConnection(input: any, output: any): IConnection {
	let logger = new Logger();
	let connection = createClientMessageConnection(input, output, logger);
	let result: IConnection = {

		listen: (): void => connection.listen(),

		sendRequest: <P, R, E>(type: RequestType<P, R, E>, params?: P): Thenable<R> => connection.sendRequest(type, params),
		sendNotification: <P>(type: NotificationType<P>, params?: P): void => connection.sendNotification(type, params),
		onNotification: <P>(type: NotificationType<P>, handler: INotificationHandler<P>): void => connection.onNotification(type, handler),

		initialize: (params: InitializeParams) => connection.sendRequest(InitializeRequest.type, params),
		shutdown: () => connection.sendRequest(ShutdownRequest.type),
		exit: () => connection.sendNotification(ExitNotification.type),

		onLogMessage: (handler: INotificationHandler<LogMessageParams>) => connection.onNotification(LogMessageNotification.type, handler),
		onShowMessage: (handler: INotificationHandler<ShowMessageParams>) => connection.onNotification(ShowMessageNotification.type, handler),

		didChangeConfiguration: (params: DidChangeConfigurationParams) => connection.sendNotification(DidChangeConfigurationNotification.type, params),
		didChangeWatchedFiles: (params: DidChangeWatchedFilesParams) => connection.sendNotification(DidChangeWatchedFilesNotification.type, params),

		didOpenTextDocument: (params: DidOpenTextDocumentParams) => connection.sendNotification(DidOpenTextDocumentNotification.type, params),
		didChangeTextDocument: (params: DidChangeTextDocumentParams  | DidChangeTextDocumentParams[]) => connection.sendNotification(DidChangeTextDocumentNotification.type, params),
		didCloseTextDocument: (params: TextDocumentIdentifier) => connection.sendNotification(DidCloseTextDocumentNotification.type, params),
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

export enum TransportKind {
	stdio,
	ipc
}

export interface NodeModule {
	module: string;
	transport?: TransportKind;
	args?: string[];
	options?: ForkOptions;
}

export type ServerOptions = Executable | { run: Executable; debug: Executable; } |  { run: NodeModule; debug: NodeModule } | NodeModule | (() => Thenable<ChildProcess | StreamInfo>);

export interface SynchronizeOptions {
	configurationSection?: string | string[];
	fileEvents?: FileSystemWatcher | FileSystemWatcher[];
	textDocumentFilter?: (textDocument: TextDocument) => boolean;
}

export interface LanguageClientOptions {
	documentSelector?: string | string[];
	synchronize?: SynchronizeOptions;
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
	private _serverOptions: ServerOptions;
	private _languageOptions: LanguageClientOptions;
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

	private _documentSyncDelayer: Delayer<void>;

	private _fileEvents: FileEvent[];
	private _fileEventDelayer: Delayer<void>;

	public constructor(name: string, serverOptions: ServerOptions, languageOptions: LanguageClientOptions, forceDebug: boolean = false) {
		this._name = name;
		this._serverOptions = serverOptions;
		this._languageOptions = languageOptions || {};
		this._languageOptions.synchronize = this._languageOptions.synchronize || {};
		this._syncExpression = this.computeSyncExpression();
		this._forceDebug = forceDebug;

		this._state = ClientState.Stopped;
		this._connection = null;
		this._childProcess = null;

		this._listeners = null;
		this._providers = null;
		this._diagnostics = null;

		this._fileEvents = [];
		this._fileEventDelayer = new Delayer<void>(250);
		this._onReady = new Promise<void>((resolve, reject) => {
			this._onReadyCallbacks = { resolve, reject };
		});
	}

	private computeSyncExpression(): SyncExpression {
		let documentSelector = this._languageOptions.documentSelector;
		let textDocumentFilter = this._languageOptions.synchronize.textDocumentFilter;

		if (!documentSelector && !textDocumentFilter) {
			return new FalseSyncExpression();
		}
		if (textDocumentFilter && !documentSelector) {
			return new FunctionSyncExpression(textDocumentFilter);
		}
		if (!textDocumentFilter && documentSelector) {
			if (is.string(documentSelector)) {
				return new LanguageIdExpression(<string>documentSelector)
			} else {
				return new CompositeSyncExpression(<string[]>documentSelector)
			}
		}
		if (textDocumentFilter && documentSelector) {
			return new CompositeSyncExpression(
				is.string(documentSelector) ? [<string>documentSelector] : <string[]>documentSelector,
				textDocumentFilter);
		}
	}

	public sendRequest<P, R, E>(type: RequestType<P, R, E>, params?: P): Thenable<R> {
		return this.onReady().then(() => {
			return this.resolveConnection().then((connection) => {
				return this.doSendRequest(connection, type, params);
			});
		});
	}

	private doSendRequest<P, R, E>(connection: IConnection, type: RequestType<P, R, E>, params?: P): Thenable<R> {
		if (this.isConnectionActive()) {
			this.forceDocumentSync();
			return connection.sendRequest(type, params);
		} else {
			return Promise.reject<R>(new ResponseError(ErrorCodes.InternalError, 'Connection is closed.'));
		}
	}

	public sendNotification<P>(type: NotificationType<P>, params?: P): void {
		this.onReady().then(() => {
			this.resolveConnection().then((connection) => {
				if (this.isConnectionActive()) {
					this.forceDocumentSync();
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

	public start(): Disposable {
		this._listeners = [];
		this._providers = [];
		this._diagnostics = Languages.createDiagnosticCollection();
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
						Window.showErrorMessage(message.message);
						break;
					case MessageType.Warning:
						Window.showWarningMessage(message.message);
						break;
					case MessageType.Info:
						Window.showInformationMessage(message.message);
						break;
					default:
						Window.showInformationMessage(message.message);
				}
			});
			connection.listen();
			this.initialize(connection);
		}, (error) => {
			this._onReadyCallbacks.reject();
			Window.showErrorMessage(`Couldn't start client ${this._name}`);
		});
		return new Disposable(() => {
			if (this.needsStop()) {
				this.stop();
			}
		});
	}
	private resolveConnection(): Thenable<IConnection> {
		if (!this._connection) {
			this._connection = this.createConnection();
		}
		return this._connection;
	}

	private initialize(connection: IConnection): Thenable<InitializeResult> {
		let initParams: InitializeParams = { processId: process.pid, rootPath: Workspace.rootPath, capabilities: { } };
		return connection.initialize(initParams).then((result) => {
			this._state = ClientState.Running;
			this._capabilites = result.capabilities;
			connection.onDiagnostics(params => this.handleDiagnostics(params));
			if (this._capabilites.textDocumentSync !== TextDocumentSyncKind.None) {
				Workspace.onDidOpenTextDocument(t => this.onDidOpenTextDoument(connection, t), null, this._listeners);
				Workspace.onDidChangeTextDocument(t => this.onDidChangeTextDocument(connection, t), null, this._listeners);
				Workspace.onDidCloseTextDocument(t => this.onDidCloseTextDoument(connection, t), null, this._listeners);
				if (this._capabilites.textDocumentSync === TextDocumentSyncKind.Full) {
					this._documentSyncDelayer = new Delayer<void>(100);
				}
			}
			this.hookFileEvents(connection);
			this.hookConfigurationChanged(connection);
			this.hookCapabilities(connection);
			this._onReadyCallbacks.resolve();
			Workspace.textDocuments.forEach(t => this.onDidOpenTextDoument(connection, t));
			return result;
		}, (error: ResponseError<InitializeError>) => {
			if (error.data.retry) {
				Window.showErrorMessage(error.message, { title: 'Retry', id: "retry"}).then(item => {
					if (item.id === 'retry') {
						this.initialize(connection);
					}
				});
			} else {
				this._onReadyCallbacks.reject();
				Window.showErrorMessage(error.message);
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
		this._listeners = null;
		this._providers.forEach(provider => provider.dispose());
		this._providers = null;
		this._diagnostics.dispose();
		this._diagnostics = null;
		this.resolveConnection().then(connection => {
			connection.shutdown().then(() => {
				connection.exit();
				connection.dispose();
				this._state = ClientState.Stopped;
				this._connection = null;
				let toCheck = this._childProcess;
				this._childProcess = null;
				// Remove all markers
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
		this._fileEventDelayer.trigger(() => {
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
		connection.didOpenTextDocument(c2p.asOpenTextDocumentParams(textDocument));
	}

	private onDidChangeTextDocument(connection: IConnection, event: TextDocumentChangeEvent): void {
		if (!this._syncExpression.evaluate(event.document)) {
			return;
		}
		let uri: string = event.document.uri.toString();
		if (this._capabilites.textDocumentSync === TextDocumentSyncKind.Incremental) {
			connection.didChangeTextDocument(c2p.asChangeTextDocumentParams(event));
		} else {
			this._documentSyncDelayer.trigger(() => {
				connection.didChangeTextDocument(c2p.asChangeTextDocumentParams(event.document));
			}, -1);
		}
	}

	private onDidCloseTextDoument(connection: IConnection, textDocument: TextDocument): void {
		if (!this._syncExpression.evaluate(textDocument)) {
			return;
		}
		connection.didCloseTextDocument(c2p.asCloseTextDocumentParams(textDocument));
	}

	private forceDocumentSync(): void {
		if (this._documentSyncDelayer) {
			this._documentSyncDelayer.forceDelivery();
		}
	}

	private handleDiagnostics(params: PublishDiagnosticsParams) {
		let uri = Uri.parse(params.uri);
		let diagnostics = p2c.asDiagnostics(params.diagnostics);
		this._diagnostics.set(uri, diagnostics);
	}

	private createConnection(): Thenable<IConnection> {
		let server = this._serverOptions;
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
				options.cwd = options.cwd || Workspace.rootPath;
				if (node.transport === TransportKind.ipc) {
					this._childProcess = cp.fork(node.module, node.args || [], options);
					if (this._childProcess.pid) {
						resolve(createConnection(new IPCMessageReader(this._childProcess), new IPCMessageWriter(this._childProcess)));
					} else {
						reject(new Error(`Unable to fork node using module ${node.module}`));
					}
				} else {
					electron.fork(node.module, node.args || [], options, (error, cp) => {
						if (error) {
							reject(error);
						} else {
							this._childProcess = cp;
							resolve(createConnection(cp.stdout, cp.stdin));
						}
					});
				}
			});
		} else if (is.defined(json.command)) {
			let command: Executable = <Executable>json;
			let options = command.options || {};
			options.cwd = options.cwd || Workspace.rootPath;
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
				process.kill(childProcess.pid, <any>0);
				terminate(childProcess);
			} catch (error) {
				// All is fine.
			}
		}, 2000);
	}

	private hookConfigurationChanged(connection: IConnection): void {
		if (!this._languageOptions.synchronize.configurationSection) {
			return;
		}
		Workspace.onDidChangeConfiguration(e => this.onDidChangeConfiguration(connection), this, this._listeners);
		this.onDidChangeConfiguration(connection);
	}

	private onDidChangeConfiguration(connection: IConnection): void {
		let keys: string[] = null;
		let configurationSection = this._languageOptions.synchronize.configurationSection;
		if (is.string(configurationSection)) {
			keys = [<string>configurationSection];
		} else if (is.stringArray(configurationSection)) {
			keys = (<string[]>configurationSection);
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
		Workspace.getConfiguration()

		let result = Object.create(null);
		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];
			let index: number = key.indexOf('.');
			let config: any = null;
			if (index >= 0) {
				config = Workspace.getConfiguration(key.substr(0, index)).get(key.substr(index + 1));
			} else {
				config = Workspace.getConfiguration(key);
			}
			if (config) {
				let path = keys[i].split('.');
				ensurePath(result, path)[path[path.length - 1]] = config;
			}
		}
		return result;
	}

	private hookFileEvents(connection: IConnection): void {
		let fileEvents = this._languageOptions.synchronize.fileEvents;
		if (!fileEvents) {
			return;
		}
		let watchers: FileSystemWatcher[] = null;
		if (is.array(fileEvents)) {
			watchers = <FileSystemWatcher[]>fileEvents;
		} else {
			watchers = [<FileSystemWatcher>fileEvents];
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
		let documentSelector = this._languageOptions.documentSelector;
		if (!documentSelector) {
			return;
		}
		this.hookCompletionProvider(documentSelector, connection);
		this.hookHoverProvider(documentSelector, connection);
		this.hookSignatureHelpProvider(documentSelector, connection);
		this.hookDefinitionProvider(documentSelector, connection);
		this.hookReferencesProvider(documentSelector, connection);
		this.hookDocumentHighlightProvider(documentSelector, connection);
		this.hookDocumentSymbolProvider(documentSelector, connection);
		this.hookWorkspaceSymbolProvider(connection);
	}

	private hookCompletionProvider(documentSelector: DocumentSelector, connection: IConnection): void {
		if (!this._capabilites.completionProvider) {
			return;
		}

		this._providers.push(Languages.registerCompletionItemProvider(documentSelector, {
			provideCompletionItems: (document: TextDocument, position: VPosition, token: CancellationToken): Thenable<VCompletionItem[]> => {
				return this.doSendRequest(connection, CompletionRequest.type, c2p.asTextDocumentPosition(document, position)). then(
					p2c.asCompletionItems,
					error => Promise.resolve([])
				)
			},
			resolveCompletionItem: this._capabilites.completionProvider.resolveProvider
				? (item: VCompletionItem, token: CancellationToken): Thenable<VCompletionItem> => {
					return this.doSendRequest(connection, CompletionResolveRequest.type, c2p.asCompletionItem(item)).then(
						p2c.asCompletionItem,
						error => Promise.resolve(item)
					);
				}
				: undefined
		}, ...this._capabilites.completionProvider.triggerCharacters));
	}

	private hookHoverProvider(documentSelector: DocumentSelector, connection: IConnection): void {
		if (!this._capabilites.hoverProvider) {
			return;
		}

		this._providers.push(Languages.registerHoverProvider(documentSelector, {
			provideHover: (document: TextDocument, position: VPosition, token: CancellationToken): Thenable<Hover> => {
				return this.doSendRequest(connection, HoverRequest.type, c2p.asTextDocumentPosition(document, position)).then(
					p2c.asHover,
					error => Promise.resolve(null)
				)
			}
		}));
	}

	private hookSignatureHelpProvider(documentSelector: DocumentSelector, connection: IConnection): void {
		if (!this._capabilites.signatureHelpProvider) {
			return;
		}
		this._providers.push(Languages.registerSignatureHelpProvider(documentSelector, {
			provideSignatureHelp: (document: TextDocument, position: VPosition, token: CancellationToken): Thenable<VSignatureHelp> => {
				return this.doSendRequest(connection, SignatureHelpRequest.type, c2p.asTextDocumentPosition(document, position)). then(
					p2c.asSignatureHelp,
					error => Promise.resolve(null)
				);
			}
		}, ...this._capabilites.signatureHelpProvider.triggerCharacters));
	}

	private hookDefinitionProvider(documentSelector: DocumentSelector, connection: IConnection): void {
		if (!this._capabilites.definitionProvider) {
			return;
		}
		this._providers.push(Languages.registerDefinitionProvider(documentSelector, {
			provideDefinition: (document: TextDocument, position: VPosition, token: CancellationToken): Thenable<VDefinition> => {
				return this.doSendRequest(connection, DefinitionRequest.type, c2p.asTextDocumentPosition(document, position)). then(
					p2c.asDefinitionResult,
					error => Promise.resolve(null)
				);
			}
		}))
	}

	private hookReferencesProvider(documentSelector: DocumentSelector, connection: IConnection): void {
		if (!this._capabilites.referencesProvider) {
			return;
		}
		this._providers.push(Languages.registerReferenceProvider(documentSelector, {
			provideReferences: (document: TextDocument, position: VPosition, options: { includeDeclaration: boolean; }, token: CancellationToken): Thenable<VLocation[]> => {
				return this.doSendRequest(connection, ReferencesRequest.type, c2p.asReferenceParams(document, position, options)).then(
					p2c.asReferences,
					error => Promise.resolve([])
				);
			}
		}));
	}

	private hookDocumentHighlightProvider(documentSelector: DocumentSelector, connection: IConnection): void {
		if (!this._capabilites.documentHighlightProvider) {
			return;
		}
		this._providers.push(Languages.registerDocumentHighlightProvider(documentSelector, {
			provideDocumentHighlights: (document: TextDocument, position: VPosition, token: CancellationToken): Thenable<VDocumentHighlight[]> => {
				return this.doSendRequest(connection, DocumentHighlightRequest.type, c2p.asTextDocumentPosition(document, position)).then(
					p2c.asDocumentHighlights,
					error => Promise.resolve([])
				);
			}
		}));
	}

	private hookDocumentSymbolProvider(documentSelector: DocumentSelector, connection: IConnection): void {
		if (!this._capabilites.documentSymbolProvider) {
			return;
		}
		this._providers.push(Languages.registerDocumentSymbolProvider(documentSelector, {
			provideDocumentSymbols: (document: TextDocument, token: CancellationToken): Thenable<VSymbolInformation[]> => {
				return this.doSendRequest(connection, DocumentSymbolRequest.type, c2p.asTextDocumentIdentifier(document)).then(
					p2c.asSymbolInformations,
					error => Promise.resolve([])
				);
			}
		}));
	}

	private hookWorkspaceSymbolProvider(connection: IConnection): void {
		if (!this._capabilites.workspaceSymbolProvider) {
			return;
		}
		this._providers.push(Languages.registerWorkspaceSymbolProvider({
			provideWorkspaceSymbols: (query: string, token: CancellationToken): Thenable<VSymbolInformation[]> => {
				return this.doSendRequest(connection, WorkspaceSymbolRequest.type, { query }).then(
					p2c.asSymbolInformations,
					error => Promise.resolve([])
				);
			}
		}));
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