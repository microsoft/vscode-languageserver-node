/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as cp from 'child_process';
import ChildProcess = cp.ChildProcess;

import {
		workspace as Workspace, window as Window, languages as Languages, extensions as Extensions, TextDocumentChangeEvent, TextDocument, Disposable, OutputChannel,
		FileSystemWatcher, Uri, DiagnosticCollection, DocumentSelector as VDocumentSelector,
		CancellationToken, Hover as VHover, Position as VPosition, Location as VLocation, Range as VRange,
		CompletionItem as VCompletionItem, CompletionList as VCompletionList, SignatureHelp as VSignatureHelp, Definition as VDefinition, DocumentHighlight as VDocumentHighlight,
		SymbolInformation as VSymbolInformation, CodeActionContext as VCodeActionContext, Command as VCommand, CodeLens as VCodeLens,
		FormattingOptions as VFormattingOptions, TextEdit as VTextEdit, WorkspaceEdit as VWorkspaceEdit, MessageItem,
		DocumentLink as VDocumentLink, TextDocumentWillSaveEvent
} from 'vscode';

import {
		Message, MessageType as RPCMessageType, MessageConnection, Logger, createMessageConnection, ErrorCodes, ResponseError,
		RequestType, RequestType0, RequestType1, RequestType2, RequestType3, RequestType4,
		RequestType5, RequestType6, RequestType7, RequestType8, RequestType9,
		RequestHandler, RequestHandler0, RequestHandler1, RequestHandler2, RequestHandler3,
		RequestHandler4, RequestHandler5, RequestHandler6, RequestHandler7, RequestHandler8,
		RequestHandler9, GenericRequestHandler,
		NotificationType, NotificationType0, NotificationType1, NotificationType2, NotificationType3,
		NotificationType4, NotificationType5, NotificationType6, NotificationType7, NotificationType8,
		NotificationType9,
		NotificationHandler, NotificationHandler0, NotificationHandler1, NotificationHandler2,
		NotificationHandler3, NotificationHandler4, NotificationHandler5, NotificationHandler6,
		NotificationHandler7, NotificationHandler8, NotificationHandler9, GenericNotificationHandler,
		MessageReader, IPCMessageReader, MessageWriter, IPCMessageWriter, Trace, Tracer, Event, Emitter
} from 'vscode-jsonrpc';

import {
		Range, Position, Location, Diagnostic, DiagnosticSeverity, Command,
		TextEdit, WorkspaceEdit, WorkspaceChange, TextEditChange,
		TextDocumentIdentifier, CompletionItemKind, CompletionItem, CompletionList,
		Hover, MarkedString,
		SignatureHelp, SignatureInformation, ParameterInformation,
		Definition, CodeActionContext,
		DocumentHighlight, DocumentHighlightKind,
		SymbolInformation, SymbolKind,
		CodeLens,
		FormattingOptions, DocumentLink
} from 'vscode-languageserver-types';


import {
		RegistrationRequest, RegisterParams, UnregistrationRequest, UnregisterParams,
		InitializeRequest, InitializeParams, InitializeResult, InitializeError, ClientCapabilities, ServerCapabilities, TextDocumentSyncKind,
		ShutdownRequest,
		ExitNotification,
		LogMessageNotification, LogMessageParams, MessageType,
		ShowMessageNotification, ShowMessageParams, ShowMessageRequest, ShowMessageRequestParams,
		TelemetryEventNotification,
		DidChangeConfigurationNotification, DidChangeConfigurationParams,
		TextDocumentPositionParams, DocumentSelector, DocumentFilter,
		DidOpenTextDocumentNotification, DidOpenTextDocumentParams, DidChangeTextDocumentNotification, DidChangeTextDocumentParams,
		DidCloseTextDocumentNotification, DidCloseTextDocumentParams, DidSaveTextDocumentNotification, DidSaveTextDocumentParams,
		WillSaveTextDocumentNotification, WillSaveTextDocumentWaitUntilRequest, WillSaveTextDocumentParams,
		DidChangeWatchedFilesNotification, DidChangeWatchedFilesParams, FileEvent, FileChangeType,
		PublishDiagnosticsNotification, PublishDiagnosticsParams,
		CompletionRequest, CompletionResolveRequest,
		HoverRequest,
		SignatureHelpRequest, DefinitionRequest, ReferencesRequest, DocumentHighlightRequest,
		DocumentSymbolRequest, WorkspaceSymbolRequest, WorkspaceSymbolParams,
		CodeActionRequest, CodeActionParams,
		CodeLensRequest, CodeLensResolveRequest,
		DocumentFormattingRequest, DocumentFormattingParams, DocumentRangeFormattingRequest, DocumentRangeFormattingParams,
		DocumentOnTypeFormattingRequest, DocumentOnTypeFormattingParams,
		RenameRequest, RenameParams,
		DocumentLinkRequest, DocumentLinkResolveRequest, DocumentLinkParams
} from './protocol';

import * as c2p from './codeConverter';
import * as p2c from './protocolConverter';

import * as is from './utils/is';
import * as electron from './utils/electron';
import { terminate } from './utils/processes';
import { Delayer } from './utils/async'

export {
	ResponseError, InitializeError, ErrorCodes,
	RequestType, RequestType0, RequestHandler, RequestHandler0, GenericRequestHandler,
	NotificationType, NotificationType0, NotificationHandler, NotificationHandler0, GenericNotificationHandler,
	Position, Range, Location, TextDocumentIdentifier, TextDocumentPositionParams,
	TextEdit, TextEditChange, WorkspaceChange
}
export { Converter as Code2ProtocolConverter } from './codeConverter';
export { Converter as Protocol2CodeConverter } from './protocolConverter';

import * as Protocol from './protocol';
export { Protocol };

declare var v8debug;

interface IConnection {

	listen(): void;

	sendRequest<R, E, RO>(type: RequestType0<R, E, RO>, token?: CancellationToken) : Thenable<R>;
	sendRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, params: P, token?: CancellationToken) : Thenable<R>;
	sendRequest<R>(method: string, token?: CancellationToken) : Thenable<R>;
	sendRequest<R>(method: string, param: any, token?: CancellationToken) : Thenable<R>;
	sendRequest<R>(type: string | RPCMessageType, ...params: any[]): Thenable<R>;

	onRequest<R, E, RO>(type: RequestType0<R, E, RO>, handler: RequestHandler0<R, E>): void;
	onRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, handler: RequestHandler<P, R, E>): void;
	onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): void;
	onRequest<R, E>(method: string | RPCMessageType, handler: GenericRequestHandler<R, E>): void;

	sendNotification<RO>(type: NotificationType0<RO>): void;
	sendNotification<P, RO>(type: NotificationType<P, RO>, params?: P): void;
	sendNotification(method: string): void;
	sendNotification(method: string, params: any): void;
	sendNotification(method: string | RPCMessageType, params?: any): void;

	onNotification<RO>(type: NotificationType0<RO>, handler: NotificationHandler0): void;
	onNotification<P, RO>(type: NotificationType<P, RO>, handler: NotificationHandler<P>): void;
	onNotification(method: string, handler: GenericNotificationHandler): void;
	onNotification(method: string | RPCMessageType, handler: GenericNotificationHandler): void;

	trace(value: Trace, tracer: Tracer, sendNotification?: boolean): void;

	initialize(params: InitializeParams): Thenable<InitializeResult>;
	shutdown(): Thenable<void>;
	exit(): void;

	onLogMessage(handle: NotificationHandler<LogMessageParams>): void;
	onShowMessage(handler: NotificationHandler<ShowMessageParams>): void;
	onTelemetry(handler: NotificationHandler<any>): void;

	didChangeConfiguration(params: DidChangeConfigurationParams): void;
	didChangeWatchedFiles(params: DidChangeWatchedFilesParams): void;

	didOpenTextDocument(params: DidOpenTextDocumentParams): void;
	didChangeTextDocument(params: DidChangeTextDocumentParams): void;
	didCloseTextDocument(params: DidCloseTextDocumentParams): void;
	didSaveTextDocument(params: DidSaveTextDocumentParams): void;
	onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>): void;

	dispose(): void;
}

class ConsoleLogger implements Logger {
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

interface ConnectionErrorHandler {
	(error: Error, message: Message, count: number): void;
}

interface ConnectionCloseHandler {
	(): void;
}
function createConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, errorHandler: ConnectionErrorHandler, closeHandler: ConnectionCloseHandler): IConnection;
function createConnection(reader: MessageReader, writer: MessageWriter, errorHandler: ConnectionErrorHandler, closeHandler: ConnectionCloseHandler): IConnection;
function createConnection(input: any, output: any, errorHandler: ConnectionErrorHandler, closeHandler: ConnectionCloseHandler): IConnection {
	let logger = new ConsoleLogger();
	let connection = createMessageConnection(input, output, logger);
	connection.onError((data) => { errorHandler(data[0], data[1], data[2])});
	connection.onClose(closeHandler);
	let result: IConnection = {

		listen: (): void => connection.listen(),

		sendRequest: <R>(type: string | RPCMessageType, ...params: any[]): Thenable<R> => connection.sendRequest(type, ...params),
		onRequest: <P, R, E>(type: string | RPCMessageType, handler: GenericRequestHandler<R, E>): void => connection.onRequest(type, handler),

		sendNotification: (type: string | RPCMessageType, params?: any): void => connection.sendNotification(type, params),
		onNotification: (type: string | RPCMessageType, handler: GenericNotificationHandler): void => connection.onNotification(type, handler),

		trace: (value: Trace, tracer: Tracer, sendNotification: boolean = false): void => connection.trace(value, tracer, sendNotification),

		initialize: (params: InitializeParams) => connection.sendRequest(InitializeRequest.type, params),
		shutdown: () => connection.sendRequest(ShutdownRequest.type, undefined),
		exit: () => connection.sendNotification(ExitNotification.type),

		onLogMessage: (handler: NotificationHandler<LogMessageParams>) => connection.onNotification(LogMessageNotification.type, handler),
		onShowMessage: (handler: NotificationHandler<ShowMessageParams>) => connection.onNotification(ShowMessageNotification.type, handler),
		onTelemetry: (handler: NotificationHandler<any>) => connection.onNotification(TelemetryEventNotification.type, handler),

		didChangeConfiguration: (params: DidChangeConfigurationParams) => connection.sendNotification(DidChangeConfigurationNotification.type, params),
		didChangeWatchedFiles: (params: DidChangeWatchedFilesParams) => connection.sendNotification(DidChangeWatchedFilesNotification.type, params),

		didOpenTextDocument: (params: DidOpenTextDocumentParams) => connection.sendNotification(DidOpenTextDocumentNotification.type, params),
		didChangeTextDocument: (params: DidChangeTextDocumentParams  | DidChangeTextDocumentParams[]) => connection.sendNotification(DidChangeTextDocumentNotification.type, params),
		didCloseTextDocument: (params: DidCloseTextDocumentParams) => connection.sendNotification(DidCloseTextDocumentNotification.type, params),
		didSaveTextDocument: (params: DidSaveTextDocumentParams) => connection.sendNotification(DidSaveTextDocumentNotification.type, params),

		onDiagnostics: (handler: NotificationHandler<PublishDiagnosticsParams>) => connection.onNotification(PublishDiagnosticsNotification.type, handler),

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
	runtime?: string;
	options?: ForkOptions;
}

export type ServerOptions = Executable | { run: Executable; debug: Executable; } |  { run: NodeModule; debug: NodeModule } | NodeModule | (() => Thenable<ChildProcess | StreamInfo>);

/**
 * An action to be performed when the connection is producing errors.
 */
export enum ErrorAction {
	/**
	 * Continue running the server.
	 */
	Continue = 1,
	/**
	 * Shutdown the server.
	 */
	Shutdown = 2
}

/**
 * An action to be performed when the connection to a server got closed.
 */
export enum CloseAction {
	/**
	 * Don't restart the server. The connection stays closed.
	 */
	DoNotRestart = 1,
	/**
	 * Restart the server.
	 */
	Restart = 2,
}


/**
 * A pluggable error handler that is invoked when the connection is either
 * producing errors or got closed.
 */
export interface ErrorHandler {
	/**
	 * An error has occurred while writing or reading from the connection.
	 *
	 * @param error - the error received
	 * @param message - the message to be delivered to the server if know.
	 * @param count - a count indicating how often an error is received. Will
	 *  be reset if a message got successfully send or received.
	 */
	error(error: Error, message: Message, count: number): ErrorAction;

	/**
	 * The connection to the server got closed.
	 */
	closed(): CloseAction
}

class DefaultErrorHandler implements ErrorHandler {

	private restarts: number[];

	constructor(private name: string) {
		this.restarts = [];
	}

	public error(error: Error, message: Message, count): ErrorAction {
		if (count && count <= 3) {
			return ErrorAction.Continue;
		}
		return ErrorAction.Shutdown;
	}
	public closed(): CloseAction {
		this.restarts.push(Date.now());
		if (this.restarts.length < 5) {
			return CloseAction.Restart;
		} else {
			let diff = this.restarts[this.restarts.length - 1] - this.restarts[0];
			if (diff <= 3 * 60 * 1000) {
				Window.showErrorMessage(`The ${this.name} server crashed 5 times in the last 3 minutes. The server will not be restarted.`);
				return CloseAction.DoNotRestart;
			} else {
				this.restarts.shift();
				return CloseAction.Restart;
			}
		}
	}
}

export interface InitializationFailedHandler {
	(error: ResponseError<InitializeError> | Error | any): boolean;
}

export interface SynchronizeOptions {
	configurationSection?: string | string[];
	fileEvents?: FileSystemWatcher | FileSystemWatcher[];
	textDocumentFilter?: (textDocument: TextDocument) => boolean;
}

export interface Configuration {
	willSaveTextDocumentWaitUntilRequest?: boolean | ((textDocument: TextDocument) => boolean);
}

export interface LanguageClientOptions {
	configuration?: Configuration;
	documentSelector?: string | string[];
	synchronize?: SynchronizeOptions;
	diagnosticCollectionName?: string;
	outputChannelName?: string;
	/**
	 * The encoding use to read stdout and stderr. Defaults
	 * to 'utf8' if ommitted.
	 */
	stdioEncoding?: string;
	initializationOptions?: any | (() => any);
	initializationFailedHandler?: InitializationFailedHandler;
	errorHandler?: ErrorHandler;
	uriConverters?: {
		code2Protocol: c2p.URIConverter,
		protocol2Code: p2c.URIConverter
	};
}

export enum State {
	Stopped = 1,
	Running = 2
}

export interface StateChangeEvent {
	oldState: State;
	newState: State;
}

enum ClientState {
	Initial,
	Starting,
	StartFailed,
	Running,
	Stopping,
	Stopped
}

interface SyncExpression {
	evaluate(textDocument: TextDocument): boolean;
}

namespace SyncExpression {
	export function create(selector: DocumentSelector): SyncExpression {
		return new DocumentSelectorExpression(selector);
	}
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

class DocumentSelectorExpression implements SyncExpression {
	constructor(private _selector: DocumentSelector) {
	}
	public evaluate(textDocument: TextDocument): boolean {
		return Languages.match(this._selector, textDocument) > 0;
	}
}

class CompositeSyncExpression implements SyncExpression {
	private _expression: SyncExpression[];
	constructor(expressions: SyncExpression[]);
	constructor(values: string[], func?: (textDocument: TextDocument) => boolean);
	constructor(values: (string | SyncExpression)[], func?: (textDocument: TextDocument) => boolean) {
		this._expression = values.map((value) => {
			if (is.string(value)) {
				return new LanguageIdExpression(value);
			} else {
				return value;
			}
		});
		if (func) {
			this._expression.push(new FunctionSyncExpression(func));
		}
	}
	public evaluate(textDocument: TextDocument): boolean {
		return this._expression.some(exp => exp.evaluate(textDocument));
	}
}

export class LanguageClient {

	private _id: string;
	private _name: string;
	private _serverOptions: ServerOptions;
	private _clientOptions: LanguageClientOptions;
	private _forceDebug: boolean;

	private _state: ClientState;
	private _onReady: Promise<void>;
	private _onReadyCallbacks: { resolve: () => void; reject: (error) => void; };
	private _connection: Thenable<IConnection>;
	private _childProcess: ChildProcess;
	private _outputChannel: OutputChannel;
	private _capabilites: ServerCapabilities;
	private _configuration: Configuration;

	private _listeners: Disposable[];
	private _providers: Disposable[];
	private _diagnostics: DiagnosticCollection;

	private _syncExpression: SyncExpression;

	private _documentSyncDelayer: Delayer<void>;

	private _fileEvents: FileEvent[];
	private _fileEventDelayer: Delayer<void>;

	private _telemetryEmitter: Emitter<any>;
	private _stateChangeEmitter: Emitter<StateChangeEvent>;

	private _trace: Trace;
	private _tracer: Tracer;

	private _c2p: c2p.Converter;
	private _p2c: p2c.Converter;

	public constructor(name: string, serverOptions: ServerOptions, clientOptions: LanguageClientOptions, forceDebug?: boolean);
	public constructor(id: string, name: string, serverOptions: ServerOptions, clientOptions: LanguageClientOptions, forceDebug?: boolean);
	public constructor(arg1: string, arg2: ServerOptions | string, arg3: LanguageClientOptions | ServerOptions, arg4: boolean | LanguageClientOptions, arg5?: boolean) {
		let clientOptions: LanguageClientOptions;
		let forceDebug: boolean;
		if (is.string(arg2)) {
			this._id = arg1;
			this._name = arg2;
			this._serverOptions = arg3 as ServerOptions;
			clientOptions = arg4 as LanguageClientOptions;
			forceDebug = arg5;
		} else {
			this._id = arg1.toLowerCase();
			this._name = arg1;
			this._serverOptions = arg2 as ServerOptions;
			clientOptions = arg3 as LanguageClientOptions;
			forceDebug = arg4 as boolean;
		}
		if (forceDebug === void 0) { forceDebug = false; }
		this._clientOptions = clientOptions || {};
		this._clientOptions.synchronize = this._clientOptions.synchronize || {};
		this._clientOptions.errorHandler = this._clientOptions.errorHandler || new DefaultErrorHandler(this._name);
		this._configuration = clientOptions.configuration || {};
		this._syncExpression = this.computeSyncExpression();
		this._forceDebug = forceDebug;

		this.state = ClientState.Initial;
		this._connection = null;
		this._childProcess = null;
		this._outputChannel = null;

		this._listeners = null;
		this._providers = null;
		this._diagnostics = null;

		this._fileEvents = [];
		this._fileEventDelayer = new Delayer<void>(250);
		this._onReady = new Promise<void>((resolve, reject) => {
			this._onReadyCallbacks = { resolve, reject };
		});
		this._telemetryEmitter = new Emitter<any>();
		this._stateChangeEmitter = new Emitter<StateChangeEvent>();
		this._tracer = {
			log: (message: string, data?: string) => {
				this.logTrace(message, data);
			}
		};
		this._c2p = c2p.createConverter(clientOptions.uriConverters ? clientOptions.uriConverters.code2Protocol : undefined);
		this._p2c = p2c.createConverter(clientOptions.uriConverters ? clientOptions.uriConverters.protocol2Code : undefined);
	}

	private get state(): ClientState {
		return this._state;
	}

	private set state(value: ClientState) {
		let oldState = this.getPublicState();
		this._state = value;
		let newState = this.getPublicState();
		if (newState !== oldState) {
			this._stateChangeEmitter.fire({ oldState, newState });
		}
	}

	private getPublicState(): State {
		if (this.state === ClientState.Running) {
			return State.Running;
		} else {
			return State.Stopped;
		}
	}

	private computeSyncExpression(): SyncExpression {
		let documentSelector = this._clientOptions.documentSelector;
		let textDocumentFilter = this._clientOptions.synchronize.textDocumentFilter;

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


	public sendRequest<R, E, RO>(type: RequestType0<R, E, RO>, token?: CancellationToken): Thenable<R>;
	public sendRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, params: P, token?: CancellationToken): Thenable<R>;
	public sendRequest<R>(method: string, token?: CancellationToken): Thenable<R>;
	public sendRequest<R>(method: string, param: any, token?: CancellationToken): Thenable<R>;
	public sendRequest<R>(type: string | RPCMessageType, ...params: any[]): Thenable<R> {
		return this.onReady().then(() => {
			return this.resolveConnection().then((connection) => {
				return this._doSendRequest(connection, type, params);
			});
		});
	}

	private doSendRequest<P, R, E, RO>(connection: IConnection, type: RequestType<P, R, E, RO>, params: P, token?: CancellationToken): Thenable<R> {
		return this._doSendRequest<R>(connection, type, [params, token]);
	}

	private _doSendRequest<R>(connection: IConnection, type: string | RPCMessageType, params: any[]): Thenable<R> {
		if (this.isConnectionActive()) {
			this.forceDocumentSync();
			try {
				return connection.sendRequest<R>(type, ...params);
			} catch (error) {
				this.error(`Sending request ${is.string(type) ? type : type.method} failed.`, error);
			}
		} else {
			return Promise.reject<R>(new ResponseError(ErrorCodes.InternalError, 'Connection is closed.'));
		}
	}

	public onRequest<R, E, RO>(type: RequestType0<R, E, RO>, handler: RequestHandler0<R, E>): void;
	public onRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, handler: RequestHandler<P, R, E>): void;
	public onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): void;
	public onRequest<P, R, E>(type: string | RPCMessageType, handler: GenericRequestHandler<R, E>): void {
		this.onReady().then(() => {
			this.resolveConnection().then((connection) => {
				try {
					connection.onRequest(type, handler);
				} catch (error) {
					this.error(`Registering request handler ${is.string(type) ? type : type.method} failed.`, error);
				}
			})
		}, (error) => {
		});
	}

	public sendNotification<RO>(type: NotificationType0<RO>): void;
	public sendNotification<P, RO>(type: NotificationType<P, RO>, params?: P): void;
	public sendNotification(method: string): void;
	public sendNotification(method: string, params: any): void;
	public sendNotification<P>(type: string | RPCMessageType, params?: P): void {
		this.onReady().then(() => {
			this.resolveConnection().then((connection) => {
				if (this.isConnectionActive()) {
					this.forceDocumentSync();
					try {
						connection.sendNotification(type, params);
					} catch (error) {
						this.error(`Sending notification ${is.string(type) ? type : type.method} failed.`, error);
					}
				}
			});
		}, (error) => {
			this.error(`Sending notification ${is.string(type) ? type : type.method} failed.`, error)
		});
	}

	public onNotification<RO>(type: NotificationType0<RO>, handler: NotificationHandler0): void;
	public onNotification<P, RO>(type: NotificationType<P, RO>, handler: NotificationHandler<P>): void;
	public onNotification(method: string, handler: GenericNotificationHandler): void;
	public onNotification(type: string | RPCMessageType, handler: GenericNotificationHandler): void {
		this.onReady().then(() => {
			this.resolveConnection().then((connection) => {
				try {
					connection.onNotification(type, handler);
				} catch (error) {
					this.error(`Registering notification handler ${is.string(type) ? type : type.method} failed.`, error);
				}
			})
		}, (error) => {
		});
	}

	public get protocol2CodeConverter(): p2c.Converter {
		return this._p2c;
	}

	public get code2ProtocolConverter(): c2p.Converter {
		return this._c2p;
	}

	public get onTelemetry(): Event<any> {
		return this._telemetryEmitter.event;
	}

	public get onDidChangeState(): Event<StateChangeEvent> {
		return this._stateChangeEmitter.event;
	}

	public get outputChannel(): OutputChannel {
		if (!this._outputChannel) {
			this._outputChannel = Window.createOutputChannel(this._clientOptions.outputChannelName ? this._clientOptions.outputChannelName : this._name);
		}
		return this._outputChannel;
	}

	public get diagnostics(): DiagnosticCollection {
		return this._diagnostics;
	}

	public createDefaultErrorHandler(): ErrorHandler {
		return new DefaultErrorHandler(this._name);
	}

	public set trace(value: Trace) {
		this._trace = value;
		this.onReady().then(() => {
			this.resolveConnection().then((connection) => {
				connection.trace(value, this._tracer);
			})
		}, (error) => {
		});
	}

	private data2String(data: any): string {
		if (data instanceof ResponseError) {
			const responseError = data as ResponseError<any>;
			return `  Message: ${responseError.message}\n  Code: ${responseError.code} ${responseError.data ? '\n' + responseError.data.toString() : ''}`
		}
		if (data instanceof Error) {
			if (is.string(data.stack)) {
				return data.stack;
			}
			return (data as Error).message;
		}
		if (is.string(data)) {
			return data;
		}
		return data.toString();
	}

	public info(message: string, data?: any): void {
		this.outputChannel.appendLine(`[Info  - ${(new Date().toLocaleTimeString())}] ${message}`);
		if (data) {
			this.outputChannel.appendLine(this.data2String(data));
		}
	}

	public warn(message: string, data?: any): void {
		this.outputChannel.appendLine(`[Warn  - ${(new Date().toLocaleTimeString())}] ${message}`);
		if (data) {
			this.outputChannel.appendLine(this.data2String(data));
		}
	}

	public error(message: string, data?: any): void {
		this.outputChannel.appendLine(`[Error - ${(new Date().toLocaleTimeString())}] ${message}`);
		if (data) {
			this.outputChannel.appendLine(this.data2String(data));
		}
		this.outputChannel.show();
	}

	private logTrace(message: string, data?: any): void {
		this.outputChannel.appendLine(`[Trace - ${(new Date().toLocaleTimeString())}] ${message}`);
		if (data) {
			this.outputChannel.appendLine(this.data2String(data));
		}
		this.outputChannel.show();
	}

	public needsStart(): boolean {
		return this.state === ClientState.Initial || this.state === ClientState.Stopping || this.state === ClientState.Stopped;
	}

	public needsStop(): boolean {
		return this.state === ClientState.Starting || this.state === ClientState.Running;
	}

	public onReady(): Promise<void> {
		return this._onReady;
	}

	private isConnectionActive(): boolean {
		return this.state === ClientState.Running;
	}

	public start(): Disposable {
		this._listeners = [];
		this._providers = [];
		// If we restart then the diagnostics collection is reused.
		if (!this._diagnostics) {
			this._diagnostics = this._clientOptions.diagnosticCollectionName
				? Languages.createDiagnosticCollection(this._clientOptions.diagnosticCollectionName)
				: Languages.createDiagnosticCollection();
		}

		this.state = ClientState.Starting;
		this.resolveConnection().then((connection) => {
			connection.onLogMessage((message) => {
				switch(message.type) {
					case MessageType.Error:
						this.error(message.message);
						break;
					case MessageType.Warning:
						this.warn(message.message);
						break;
					case MessageType.Info:
						this.info(message.message);
						break;
					default:
						this.outputChannel.appendLine(message.message);
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
			connection.onRequest(ShowMessageRequest.type, (params) => {
				let messageFunc: <T extends MessageItem>(message: string, ...items: T[]) => Thenable<T> = null;
				switch(params.type) {
					case MessageType.Error:
						messageFunc = Window.showErrorMessage;
						break;
					case MessageType.Warning:
						messageFunc = Window.showWarningMessage;
						break;
					case MessageType.Info:
						messageFunc = Window.showInformationMessage;
						break;
					default:
						messageFunc = Window.showInformationMessage;
				}
				let actions = params.actions || [];
				return messageFunc(params.message, ...actions);
			});
			connection.onTelemetry((data) => {
				this._telemetryEmitter.fire(data);
			});
			connection.listen();
			// Error is handled in the intialize call.
			this.initialize(connection).then(null, (error) => {});
		}, (error) => {
			this.state = ClientState.StartFailed;
			this._onReadyCallbacks.reject(error);
			this.error('Starting client failed', error);
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
		this.refreshTrace(connection, false);
		let initOption = this._clientOptions.initializationOptions;
		let initParams: InitializeParams = {
			processId: process.pid,
			rootPath: Workspace.rootPath,
			capabilities: { },
			initializationOptions: is.func(initOption) ? initOption() : initOption,
			trace: Trace.toString(this._trace)
		};
		return connection.initialize(initParams).then((result) => {
			this.state = ClientState.Running;
			this._capabilites = result.capabilities;
			connection.onDiagnostics(params => this.handleDiagnostics(params));
			if (this._capabilites.textDocumentSync !== TextDocumentSyncKind.None) {
				Workspace.onDidOpenTextDocument(t => this.onDidOpenTextDoument(connection, t), null, this._listeners);
				Workspace.onDidChangeTextDocument(t => this.onDidChangeTextDocument(connection, t), null, this._listeners);
				Workspace.onDidCloseTextDocument(t => this.onDidCloseTextDoument(connection, t), null, this._listeners);
				Workspace.onDidSaveTextDocument(t => this.onDidSaveTextDocument(connection, t), null, this._listeners);
				if (this._capabilites.textDocumentSync === TextDocumentSyncKind.Full) {
					this._documentSyncDelayer = new Delayer<void>(100);
				}
			}
			this.hookFileEvents(connection);
			this.hookConfigurationChanged(connection);
			connection.onRequest(RegistrationRequest.type, params => this.handleRegistrationRequest(params));
			connection.onRequest(UnregistrationRequest.type, params => this.handleUnregistrationRequest(params));
			this.hookCapabilities(connection);
			this._onReadyCallbacks.resolve();
			Workspace.textDocuments.forEach(t => this.onDidOpenTextDoument(connection, t));
			return result;
		}, (error: any) => {
			if (this._clientOptions.initializationFailedHandler) {
				if (this._clientOptions.initializationFailedHandler(error)) {
					this.initialize(connection);
				} else {
					this.stop();
					this._onReadyCallbacks.reject(error);
				}
			} else if (error instanceof ResponseError && error.data && error.data.retry) {
				Window.showErrorMessage(error.message, { title: 'Retry', id: "retry"}).then(item => {
					if (is.defined(item) && item.id === 'retry') {
						this.initialize(connection);
					} else {
						this.stop();
						this._onReadyCallbacks.reject(error);
					}
				});
			} else {
				if (error && error.message) {
					Window.showErrorMessage(error.message);
				}
				this.error('Server initialization failed.', error);
				this.stop();
				this._onReadyCallbacks.reject(error);
			}
		});
	}

	public stop() {
		if (!this._connection) {
			this.state = ClientState.Stopped;
			return;
		}
		this.state = ClientState.Stopping;
		this.cleanUp();
		// unkook listeners
		this.resolveConnection().then(connection => {
			connection.shutdown().then(() => {
				connection.exit();
				connection.dispose();
				this.state = ClientState.Stopped;
				this._connection = null;
				let toCheck = this._childProcess;
				this._childProcess = null;
				// Remove all markers
				this.checkProcessDied(toCheck);
			})
		});
	}

	private cleanUp(diagnostics: boolean = true): void {
		if (this._listeners) {
			this._listeners.forEach(listener => listener.dispose());
			this._listeners = null;
		}
		if (this._providers) {
			this._providers.forEach(provider => provider.dispose());
			this._providers = null;
		}
		if (diagnostics) {
			this._diagnostics.dispose();
			this._diagnostics = null;
		}
	}

	private notifyConfigurationChanged(settings: any): void {
		this.onReady().then(() => {
			this.resolveConnection().then(connection => {
				if (this.isConnectionActive()) {
					connection.didChangeConfiguration({ settings });
				}
			}, (error) => {
				this.error(`Syncing settings failed.`, JSON.stringify(error, null, 4));
			});
		}, (error) => {
			this.error(`Syncing settings failed.`, JSON.stringify(error, null, 4));
		});
	}

	private notifyFileEvent(event: FileEvent): void {
		this._fileEvents.push(event);
		this._fileEventDelayer.trigger(() => {
			this.onReady().then(() => {
				this.resolveConnection().then(connection => {
					if (this.isConnectionActive()) {
						connection.didChangeWatchedFiles({ changes: this._fileEvents });
					}
					this._fileEvents = [];
				})
			}, (error) => {
				this.error(`Notify file events failed.`, error);
			});
		});
	}

	private onDidOpenTextDoument(connection: IConnection, textDocument: TextDocument): void {
		if (!this._syncExpression.evaluate(textDocument)) {
			return;
		}
		connection.didOpenTextDocument(this._c2p.asOpenTextDocumentParams(textDocument));
	}

	private onDidChangeTextDocument(connection: IConnection, event: TextDocumentChangeEvent): void {
		if (!this._syncExpression.evaluate(event.document)) {
			return;
		}
		let uri: string = event.document.uri.toString();
		if (this._capabilites.textDocumentSync === TextDocumentSyncKind.Incremental) {
			connection.didChangeTextDocument(this._c2p.asChangeTextDocumentParams(event));
		} else {
			this._documentSyncDelayer.trigger(() => {
				connection.didChangeTextDocument(this._c2p.asChangeTextDocumentParams(event.document));
			}, -1);
		}
	}

	private onDidCloseTextDoument(connection: IConnection, textDocument: TextDocument): void {
		if (!this._syncExpression.evaluate(textDocument)) {
			return;
		}
		connection.didCloseTextDocument(this._c2p.asCloseTextDocumentParams(textDocument));
	}

	private onDidSaveTextDocument(connection: IConnection, textDocument: TextDocument): void {
		if (!this._syncExpression.evaluate(textDocument)) {
			return;
		}
		connection.didSaveTextDocument(this._c2p.asSaveTextDocumentParams(textDocument));
	}

	private forceDocumentSync(): void {
		if (this._documentSyncDelayer) {
			this._documentSyncDelayer.forceDelivery();
		}
	}

	private handleDiagnostics(params: PublishDiagnosticsParams) {
		let uri = this._p2c.asUri(params.uri);
		let diagnostics = this._p2c.asDiagnostics(params.diagnostics);
		this._diagnostics.set(uri, diagnostics);
	}

	private createConnection(): Thenable<IConnection> {
		function getEnvironment(env: any): any {
			if (!env) {
				return process.env;
			}
			let result: any = Object.create(null);
			Object.keys(process.env).forEach(key => result[key] = process.env[key]);
			Object.keys(env).forEach(key => result[key] = env[key]);
		}

		function startedInDebugMode(): boolean {
			let args = (process as any).execArgv;
			if (args) {
				return args.some((arg) => /^--debug=?/.test(arg) || /^--debug-brk=?/.test(arg));
			};
			return false;
		}

		let encoding = this._clientOptions.stdioEncoding || 'utf8';

		let errorHandler = (error: Error, message: Message, count: number) => {
			this.handleConnectionError(error, message, count);
		}

		let closeHandler = () => {
			this.handleConnectionClosed();
		}

		let server = this._serverOptions;
		// We got a function.
		if (is.func(server)) {
			return server().then((result) => {
				let info = result as StreamInfo;
				if (info.writer && info.reader) {
					return createConnection(info.reader, info.writer, errorHandler, closeHandler);
				} else {
					let cp = result as ChildProcess;
					return createConnection(cp.stdout, cp.stdin, errorHandler, closeHandler);
				}
			});
		}
		let json: { command?: string; module?: string } = null;
		let runDebug= <{ run: any; debug: any;}>server;
		if (is.defined(runDebug.run) || is.defined(runDebug.debug)) {
			// We are under debugging. So use debug as well.
			if (typeof v8debug === 'object' || this._forceDebug || startedInDebugMode()) {
				json = runDebug.debug;
			} else {
				json = runDebug.run;
			}
		} else {
			json = server;
		}
		if (is.defined(json.module)) {
			let node: NodeModule = <NodeModule>json;
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
				if (node.transport === TransportKind.ipc) {
					execOptions.stdio = [null, null, null, 'ipc'];
					args.push('--node-ipc');
				} else if (node.transport === TransportKind.stdio) {
					args.push('--stdio');
				}
				let process = cp.spawn(node.runtime, args, execOptions);
				if (!process || !process.pid) {
					return Promise.reject<IConnection>(`Launching server using runtime ${node.runtime} failed.`);
				}
				this._childProcess = process;
				process.stderr.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
				if (node.transport === TransportKind.ipc) {
					process.stdout.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
					return Promise.resolve(createConnection(new IPCMessageReader(process), new IPCMessageWriter(process), errorHandler, closeHandler));
				} else {
					return Promise.resolve(createConnection(process.stdout, process.stdin, errorHandler, closeHandler));
				}
			} else {
				return new Promise<IConnection>((resolve, reject) => {
					let args = node.args && node.args.slice() || [];
					if (node.transport === TransportKind.ipc) {
						args.push('--node-ipc');
					} else if (node.transport === TransportKind.stdio) {
						args.push('--stdio');
					}
					let options: ForkOptions = node.options || Object.create(null);
					options.execArgv = options.execArgv || [];
					options.cwd = options.cwd || Workspace.rootPath;
					electron.fork(node.module, args || [], options, (error, cp) => {
						if (error) {
							reject(error);
						} else {
							this._childProcess = cp;
							cp.stderr.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
							if (node.transport === TransportKind.ipc) {
								cp.stdout.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
								resolve(createConnection(new IPCMessageReader(this._childProcess), new IPCMessageWriter(this._childProcess), errorHandler, closeHandler));
							} else {
								resolve(createConnection(cp.stdout, cp.stdin, errorHandler, closeHandler));
							}
						}
					});
				});
			}
		} else if (is.defined(json.command)) {
			let command: Executable = <Executable>json;
			let options = command.options || {};
			options.cwd = options.cwd || Workspace.rootPath;
			let process = cp.spawn(command.command, command.args, command.options);
			if (!process || !process.pid) {
				return Promise.reject<IConnection>(`Launching server using command ${command.command} failed.`);
			}
			process.stderr.on('data', data => this.outputChannel.append(is.string(data) ? data : data.toString(encoding)));
			this._childProcess = process;
			return Promise.resolve(createConnection(process.stdout, process.stdin, errorHandler, closeHandler));
		}
		return Promise.reject<IConnection>(new Error(`Unsupported server configuartion ` + JSON.stringify(server, null, 4)));
	}

	private handleConnectionClosed() {
		// Check whether this is a normal shutdown in progress or the client stopped normally.
		if (this.state === ClientState.Stopping || this.state === ClientState.Stopped) {
			return;
		}
		this._connection = null;
		this._childProcess = null;
		let action = this._clientOptions.errorHandler.closed();
		if (action === CloseAction.DoNotRestart) {
			this.error('Connection to server got closed. Server will not be restarted.');
			this.state = ClientState.Stopped;
			this.cleanUp();
		} else if (action === CloseAction.Restart) {
			this.info('Connection to server got closed. Server will restart.');
			this.cleanUp(false);
			this.state = ClientState.Initial;
			this.start();
		}
	}

	private handleConnectionError(error: Error, message: Message, count: number) {
		let action = this._clientOptions.errorHandler.error(error, message, count);
		if (action === ErrorAction.Shutdown) {
			this.error('Connection to server is erroring. Shutting down server.')
			this.stop();
		}
	}

	private checkProcessDied(childProcess: ChildProcess): void {
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

	private hookConfigurationChanged(connection: IConnection): void {
		if (!this._clientOptions.synchronize.configurationSection) {
			return;
		}
		Workspace.onDidChangeConfiguration(e => this.onDidChangeConfiguration(connection), this, this._listeners);
		this.onDidChangeConfiguration(connection);
	}

	private refreshTrace(connection: IConnection, sendNotification: boolean = false): void {
		let config = Workspace.getConfiguration(this._id);
		let trace: Trace = Trace.Off;
		if (config) {
			trace = Trace.fromString(config.get('trace.server', 'off'));
		}
		this._trace = trace;
		connection.trace(this._trace, this._tracer, sendNotification);
	}

	private onDidChangeConfiguration(connection: IConnection): void {
		this.refreshTrace(connection, true);
		let keys: string[] = null;
		let configurationSection = this._clientOptions.synchronize.configurationSection;
		if (is.string(configurationSection)) {
			keys = [configurationSection];
		} else if (is.stringArray(configurationSection)) {
			keys = configurationSection;
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
		let fileEvents = this._clientOptions.synchronize.fileEvents;
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

	private handleRegistrationRequest(params: RegisterParams): Thenable<void> {
		const method = params.method;
		switch (method) {
			case WillSaveTextDocumentNotification.type.method:
			case WillSaveTextDocumentWaitUntilRequest.type.method:
				return this.registerWillSaveTextDocument(params);
		}
		return Promise.reject(`Register request for unknown ${params.method} received.`);
	}

	private handleUnregistrationRequest(params: UnregisterParams): Thenable<void> {
		const method = params.method;
		switch (method) {
			case WillSaveTextDocumentNotification.type.method:
			case WillSaveTextDocumentWaitUntilRequest.type.method:
				return this.unregisterWillSaveTextDocument(params);

		}
		return Promise.reject(`Register request for unknown ${params.method} received.`);
	}

	private _willSaveTextDocumentListener: Disposable;
	private _willSaveNotifications: Map<string, DocumentSelector> = new Map<string, DocumentSelector>();
	private _willSaveRequests: Map<string, DocumentSelector> = new Map<string, DocumentSelector>();
	private registerWillSaveTextDocument(params: RegisterParams): Thenable<void> {
		if (!this._willSaveTextDocumentListener) {
			this._willSaveTextDocumentListener = Workspace.onWillSaveTextDocument(this.onWillSaveTextDocument, this);
		}
		let selector = params.registerOptions.selector;
		if (params.method === WillSaveTextDocumentNotification.type.method) {
			this._willSaveNotifications.set(params.id, selector);
		} else {
			this._willSaveRequests.set(params.id, selector);
		}
		return Promise.resolve();
	}

	private unregisterWillSaveTextDocument(params: UnregisterParams): Thenable<void> {
		if (params.method === WillSaveTextDocumentNotification.type.method) {
			this._willSaveNotifications.delete(params.id);
		} else {
			this._willSaveRequests.set(params.id);
		}
		if (this._willSaveNotifications.size === 0 && this._willSaveRequests.size === 0) {
			this._willSaveTextDocumentListener.dispose();
			this._willSaveTextDocumentListener = undefined;
		}
		return Promise.resolve();
	}

	private onWillSaveTextDocument(event: TextDocumentWillSaveEvent): void {
		let sendRequest = false;
		for (const selector of this._willSaveRequests.values()) {
			if (Languages.match(selector, event.document)) {
				sendRequest = true;
				break;
			}
		}
		let sendNotification = false;
		for (const selector of this._willSaveNotifications.values()) {
			if (Languages.match(selector, event.document)) {
				sendNotification = true;
				break;
			}
		}
		if (sendRequest || sendNotification) {
			this.onReady().then(() => {
				this.resolveConnection().then((connection) => {
					if (sendRequest) {
						event.waitUntil(
							connection.sendRequest(
								WillSaveTextDocumentWaitUntilRequest.type,
								this._c2p.asWillSaveTextDocumentParams(event)).then((result) => {
									return this._p2c.asTextEdits(result);
								})
						);
					} else {
						connection.sendNotification(WillSaveTextDocumentNotification.type, this._c2p.asWillSaveTextDocumentParams(event));
					}
				});
			})
		}
	}

	private hookCapabilities(connection: IConnection): void {
		let documentSelector = this._clientOptions.documentSelector;
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
		this.hookCodeActionsProvider(documentSelector, connection);
		this.hookCodeLensProvider(documentSelector, connection);
		this.hookDocumentFormattingProvider(documentSelector, connection);
		this.hookDocumentRangeFormattingProvider(documentSelector, connection);
		this.hookDocumentOnTypeFormattingProvider(documentSelector, connection);
		this.hookRenameProvider(documentSelector, connection);
		this.hookDocumentLinkProvider(documentSelector, connection);
	}

	private logFailedRequest(type: RequestType<any, any, any, any>, error: any): void {
		this.error(`Request ${type.method} failed.`, error);
	}

	private hookCompletionProvider(documentSelector: VDocumentSelector, connection: IConnection): void {
		if (!this._capabilites.completionProvider) {
			return;
		}

		let triggerCharacters = this._capabilites.completionProvider.triggerCharacters || [];
		this._providers.push(Languages.registerCompletionItemProvider(documentSelector, {
			provideCompletionItems: (document: TextDocument, position: VPosition, token: CancellationToken): Thenable<VCompletionList | VCompletionItem[]> => {
				return this.doSendRequest(connection, CompletionRequest.type, this._c2p.asTextDocumentPositionParams(document, position), token). then(
					this._p2c.asCompletionResult,
					(error) => {
						this.logFailedRequest(CompletionRequest.type, error);
						return Promise.resolve([]);
					}
				);
			},
			resolveCompletionItem: this._capabilites.completionProvider.resolveProvider
				? (item: VCompletionItem, token: CancellationToken): Thenable<VCompletionItem> => {
					return this.doSendRequest(connection, CompletionResolveRequest.type, this._c2p.asCompletionItem(item), token).then(
						this._p2c.asCompletionItem,
						(error) => {
							this.logFailedRequest(CompletionResolveRequest.type, error);
							return Promise.resolve(item);
						}
					);
				}
				: undefined
		},  ...triggerCharacters));
	}

	private hookHoverProvider(documentSelector: VDocumentSelector, connection: IConnection): void {
		if (!this._capabilites.hoverProvider) {
			return;
		}

		this._providers.push(Languages.registerHoverProvider(documentSelector, {
			provideHover: (document: TextDocument, position: VPosition, token: CancellationToken): Thenable<Hover> => {
				return this.doSendRequest(connection, HoverRequest.type, this._c2p.asTextDocumentPositionParams(document, position), token).then(
					this._p2c.asHover,
					(error) => {
						this.logFailedRequest(HoverRequest.type, error);
						return Promise.resolve(null);
					}
				);
			}
		}));
	}

	private hookSignatureHelpProvider(documentSelector: VDocumentSelector, connection: IConnection): void {
		if (!this._capabilites.signatureHelpProvider) {
			return;
		}
		let triggerCharacters = this._capabilites.signatureHelpProvider.triggerCharacters || [];
		this._providers.push(Languages.registerSignatureHelpProvider(documentSelector, {
			provideSignatureHelp: (document: TextDocument, position: VPosition, token: CancellationToken): Thenable<VSignatureHelp> => {
				return this.doSendRequest(connection, SignatureHelpRequest.type, this._c2p.asTextDocumentPositionParams(document, position), token). then(
					this._p2c.asSignatureHelp,
					(error) => {
						this.logFailedRequest(SignatureHelpRequest.type, error);
						return Promise.resolve(null);
					}
				);
			}
		}, ...triggerCharacters));
	}

	private hookDefinitionProvider(documentSelector: VDocumentSelector, connection: IConnection): void {
		if (!this._capabilites.definitionProvider) {
			return;
		}
		this._providers.push(Languages.registerDefinitionProvider(documentSelector, {
			provideDefinition: (document: TextDocument, position: VPosition, token: CancellationToken): Thenable<VDefinition> => {
				return this.doSendRequest(connection, DefinitionRequest.type, this._c2p.asTextDocumentPositionParams(document, position), token). then(
					this._p2c.asDefinitionResult,
					(error) => {
						this.logFailedRequest(DefinitionRequest.type, error);
						return Promise.resolve(null);
					}
				);
			}
		}))
	}

	private hookReferencesProvider(documentSelector: VDocumentSelector, connection: IConnection): void {
		if (!this._capabilites.referencesProvider) {
			return;
		}
		this._providers.push(Languages.registerReferenceProvider(documentSelector, {
			provideReferences: (document: TextDocument, position: VPosition, options: { includeDeclaration: boolean; }, token: CancellationToken): Thenable<VLocation[]> => {
				return this.doSendRequest(connection, ReferencesRequest.type, this._c2p.asReferenceParams(document, position, options), token).then(
					this._p2c.asReferences,
					(error) => {
						this.logFailedRequest(ReferencesRequest.type, error);
						return Promise.resolve([]);
					}
				);
			}
		}));
	}

	private hookDocumentHighlightProvider(documentSelector: VDocumentSelector, connection: IConnection): void {
		if (!this._capabilites.documentHighlightProvider) {
			return;
		}
		this._providers.push(Languages.registerDocumentHighlightProvider(documentSelector, {
			provideDocumentHighlights: (document: TextDocument, position: VPosition, token: CancellationToken): Thenable<VDocumentHighlight[]> => {
				return this.doSendRequest(connection, DocumentHighlightRequest.type, this._c2p.asTextDocumentPositionParams(document, position), token).then(
					this._p2c.asDocumentHighlights,
					(error) => {
						this.logFailedRequest(DocumentHighlightRequest.type, error);
						return Promise.resolve([]);
					}
				);
			}
		}));
	}

	private hookDocumentSymbolProvider(documentSelector: VDocumentSelector, connection: IConnection): void {
		if (!this._capabilites.documentSymbolProvider) {
			return;
		}
		this._providers.push(Languages.registerDocumentSymbolProvider(documentSelector, {
			provideDocumentSymbols: (document: TextDocument, token: CancellationToken): Thenable<VSymbolInformation[]> => {
				return this.doSendRequest(connection, DocumentSymbolRequest.type, this._c2p.asDocumentSymbolParams(document), token).then(
					this._p2c.asSymbolInformations,
					(error) => {
						this.logFailedRequest(DocumentSymbolRequest.type, error);
						return Promise.resolve([]);
					}
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
				return this.doSendRequest(connection, WorkspaceSymbolRequest.type, { query }, token).then(
					this._p2c.asSymbolInformations,
					(error) => {
						this.logFailedRequest(WorkspaceSymbolRequest.type, error);
						return Promise.resolve([]);
					}
				);
			}
		}));
	}

	private hookCodeActionsProvider(documentSelector: VDocumentSelector, connection: IConnection): void {
		if (!this._capabilites.codeActionProvider) {
			return;
		}
		this._providers.push(Languages.registerCodeActionsProvider(documentSelector, {
			provideCodeActions: (document: TextDocument, range: VRange, context: VCodeActionContext, token: CancellationToken): Thenable<VCommand[]> => {
				let params: CodeActionParams = {
					textDocument: this._c2p.asTextDocumentIdentifier(document),
					range: this._c2p.asRange(range),
					context: this._c2p.asCodeActionContext(context)
				};
				return this.doSendRequest(connection, CodeActionRequest.type, params, token).then(
					this._p2c.asCommands,
					(error) => {
						this.logFailedRequest(CodeActionRequest.type, error);
						return Promise.resolve([]);
					}
				);
			}
		}));
	}

	private hookCodeLensProvider(documentSelector: VDocumentSelector, connection: IConnection): void {
		if (!this._capabilites.codeLensProvider) {
			return;
		}
		this._providers.push(Languages.registerCodeLensProvider(documentSelector, {
			provideCodeLenses: (document: TextDocument, token: CancellationToken): Thenable<VCodeLens[]> => {
				return this.doSendRequest(connection, CodeLensRequest.type, this._c2p.asCodeLensParams(document), token).then(
					this._p2c.asCodeLenses,
					(error) => {
						this.logFailedRequest(CodeLensRequest.type, error);
						return Promise.resolve([]);
					}
				);
			},
			resolveCodeLens: (this._capabilites.codeLensProvider.resolveProvider)
				? (codeLens: VCodeLens, token: CancellationToken): Thenable<CodeLens> => {
					return this.doSendRequest(connection, CodeLensResolveRequest.type, this._c2p.asCodeLens(codeLens), token).then(
						this._p2c.asCodeLens,
						(error) => {
							this.logFailedRequest(CodeLensResolveRequest.type, error);
							return codeLens;
						}
					);
				}
				: undefined
		}));
	}

	private hookDocumentFormattingProvider(documentSelector: VDocumentSelector, connection: IConnection): void {
		if (!this._capabilites.documentFormattingProvider) {
			return;
		}
		this._providers.push(Languages.registerDocumentFormattingEditProvider(documentSelector, {
			provideDocumentFormattingEdits: (document: TextDocument, options: VFormattingOptions, token: CancellationToken): Thenable<VTextEdit[]> => {
				let params: DocumentFormattingParams = {
					textDocument: this._c2p.asTextDocumentIdentifier(document),
					options: this._c2p.asFormattingOptions(options)
				};
				return this.doSendRequest(connection, DocumentFormattingRequest.type, params, token).then(
					this._p2c.asTextEdits,
					(error) => {
						this.logFailedRequest(DocumentFormattingRequest.type, error);
						return Promise.resolve([]);
					}
				);
			}
		}));
	}

	private hookDocumentRangeFormattingProvider(documentSelector: VDocumentSelector, connection: IConnection): void {
		if (!this._capabilites.documentRangeFormattingProvider) {
			return;
		}
		this._providers.push(Languages.registerDocumentRangeFormattingEditProvider(documentSelector, {
			provideDocumentRangeFormattingEdits: (document: TextDocument, range: VRange, options: VFormattingOptions, token: CancellationToken): Thenable<VTextEdit[]> => {
				let params: DocumentRangeFormattingParams = {
					textDocument: this._c2p.asTextDocumentIdentifier(document),
					range: this._c2p.asRange(range),
					options: this._c2p.asFormattingOptions(options)
				};
				return this.doSendRequest(connection, DocumentRangeFormattingRequest.type, params, token).then(
					this._p2c.asTextEdits,
					(error) => {
						this.logFailedRequest(DocumentRangeFormattingRequest.type, error);
						return Promise.resolve([]);
					}
				);
			}
		}));
	}

	private hookDocumentOnTypeFormattingProvider(documentSelector: VDocumentSelector, connection: IConnection): void {
		if (!this._capabilites.documentOnTypeFormattingProvider) {
			return;
		}
		let formatCapabilities = this._capabilites.documentOnTypeFormattingProvider;
		let moreTriggerCharacter = formatCapabilities.moreTriggerCharacter || [];
		this._providers.push(Languages.registerOnTypeFormattingEditProvider(documentSelector, {
			provideOnTypeFormattingEdits: (document: TextDocument, position: VPosition, ch: string, options: VFormattingOptions, token: CancellationToken): Thenable<VTextEdit[]> => {
				let params: DocumentOnTypeFormattingParams = {
					textDocument: this._c2p.asTextDocumentIdentifier(document),
					position: this._c2p.asPosition(position),
					ch: ch,
					options: this._c2p.asFormattingOptions(options)
				};
				return this.doSendRequest(connection, DocumentOnTypeFormattingRequest.type, params, token).then(
					this._p2c.asTextEdits,
					(error) => {
						this.logFailedRequest(DocumentOnTypeFormattingRequest.type, error);
						return Promise.resolve([]);
					}
				);
			}
		}, formatCapabilities.firstTriggerCharacter, ...moreTriggerCharacter));
	}

	private hookRenameProvider(documentSelector: VDocumentSelector, connection: IConnection): void {
		if (!this._capabilites.renameProvider) {
			return;
		}
		this._providers.push(Languages.registerRenameProvider(documentSelector, {
			provideRenameEdits: (document: TextDocument, position: VPosition, newName: string, token: CancellationToken): Thenable<VWorkspaceEdit> => {
				let params: RenameParams = {
					textDocument: this._c2p.asTextDocumentIdentifier(document),
					position: this._c2p.asPosition(position),
					newName: newName
				};
				return this.doSendRequest(connection, RenameRequest.type, params, token).then(
					this._p2c.asWorkspaceEdit,
					(error: ResponseError<void>) => {
						this.logFailedRequest(RenameRequest.type, error);
						Promise.resolve(new Error(error.message));
					}
				)
			}
		}));
	}

	private hookDocumentLinkProvider(documentSelector: VDocumentSelector, connection: IConnection): void {
		if (!this._capabilites.documentLinkProvider) {
			return;
		}
		this._providers.push(Languages.registerDocumentLinkProvider(documentSelector, {
			provideDocumentLinks: (document: TextDocument, token: CancellationToken): Thenable<VDocumentLink[]> => {
				return this.doSendRequest(connection, DocumentLinkRequest.type, this._c2p.asDocumentLinkParams(document), token).then(
					this._p2c.asDocumentLinks,
					(error: ResponseError<void>) => {
						this.logFailedRequest(DocumentLinkRequest.type, error);
						Promise.resolve(new Error(error.message));
					}
				)
			},
			resolveDocumentLink: this._capabilites.documentLinkProvider.resolveProvider
				? (link: VDocumentLink, token: CancellationToken): Thenable<VDocumentLink> => {
					return this.doSendRequest(connection, DocumentLinkResolveRequest.type, this._c2p.asDocumentLink(link), token).then(
						this._p2c.asDocumentLink,
						(error: ResponseError<void>) => {
							this.logFailedRequest(DocumentLinkResolveRequest.type, error);
							Promise.resolve(new Error(error.message));
						}
					)
				}
				: undefined
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