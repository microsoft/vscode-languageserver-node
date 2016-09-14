/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
		RequestType, RequestHandler, NotificationType, NotificationHandler, ResponseError, ErrorCodes,
		MessageConnection, ServerMessageConnection, Logger, createServerMessageConnection,
		MessageReader, DataCallback, StreamMessageReader, IPCMessageReader,
		MessageWriter, StreamMessageWriter, IPCMessageWriter,
		CancellationToken, CancellationTokenSource,
		Disposable, Event, Emitter, Trace, SetTraceNotification, LogTraceNotification
	} from 'vscode-jsonrpc';

import {
		TextDocument, TextDocumentChangeEvent, TextDocumentContentChangeEvent,
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
		InitializeRequest, InitializeParams, InitializeResult, InitializeError, ClientCapabilities, ServerCapabilities,
		ShutdownRequest,
		ExitNotification,
		LogMessageNotification, LogMessageParams, MessageType,
		ShowMessageNotification, ShowMessageParams, ShowMessageRequest, ShowMessageRequestParams, MessageActionItem,
		TelemetryEventNotification,
		DidChangeConfigurationNotification, DidChangeConfigurationParams,
		DidOpenTextDocumentNotification, DidOpenTextDocumentParams, DidChangeTextDocumentNotification, DidChangeTextDocumentParams,
		DidCloseTextDocumentNotification, DidCloseTextDocumentParams, DidSaveTextDocumentNotification, DidSaveTextDocumentParams,
		DidChangeWatchedFilesNotification, DidChangeWatchedFilesParams, FileEvent, FileChangeType,
		PublishDiagnosticsNotification, PublishDiagnosticsParams,
		TextDocumentPositionParams, TextDocumentSyncKind,
		HoverRequest,
		CompletionRequest, CompletionResolveRequest, CompletionOptions,
		SignatureHelpRequest,
		DefinitionRequest,  ReferencesRequest, ReferenceParams,
		DocumentHighlightRequest,
		DocumentSymbolRequest, DocumentSymbolParams,  WorkspaceSymbolRequest, WorkspaceSymbolParams,
		CodeActionRequest, CodeActionParams, CodeLensOptions,
		CodeLensRequest, CodeLensParams, CodeLensResolveRequest,
		DocumentFormattingRequest, DocumentFormattingParams, DocumentRangeFormattingRequest, DocumentRangeFormattingParams,
		DocumentOnTypeFormattingRequest, DocumentOnTypeFormattingParams,
		RenameRequest, RenameParams,
		DocumentLinkRequest, DocumentLinkResolveRequest, DocumentLinkParams
	} from './protocol';

import * as Is from './utils/is';

// ------------- Reexport the API surface of the language worker API ----------------------
export {
		RequestType, RequestHandler, NotificationType, NotificationHandler, ResponseError, ErrorCodes,
		MessageReader, DataCallback, StreamMessageReader, IPCMessageReader,
		MessageWriter, StreamMessageWriter, IPCMessageWriter,
		MessageActionItem,
		InitializeParams, InitializeResult, InitializeError, ServerCapabilities,
		DidChangeConfigurationParams,
		DidChangeWatchedFilesParams, FileEvent, FileChangeType,
		DidOpenTextDocumentParams, DidChangeTextDocumentParams, TextDocumentContentChangeEvent, DidCloseTextDocumentParams, DidSaveTextDocumentParams,
		PublishDiagnosticsParams, Diagnostic, DiagnosticSeverity, Range, Position, Location,
		TextDocumentIdentifier, TextDocumentPositionParams, TextDocumentSyncKind,
		Hover, MarkedString,
		CompletionOptions, CompletionItemKind, CompletionItem, CompletionList,
		TextDocument, TextEdit, WorkspaceEdit, WorkspaceChange, TextEditChange,
		SignatureHelp, SignatureInformation, ParameterInformation,
		Definition, ReferenceParams,  DocumentHighlight, DocumentHighlightKind,
		SymbolInformation, SymbolKind, DocumentSymbolParams, WorkspaceSymbolParams,
		CodeActionParams, CodeActionContext, Command,
		CodeLensRequest, CodeLensParams, CodeLensResolveRequest, CodeLens, CodeLensOptions,
		DocumentFormattingRequest, DocumentFormattingParams, DocumentRangeFormattingRequest, DocumentRangeFormattingParams,
		DocumentOnTypeFormattingRequest, DocumentOnTypeFormattingParams, FormattingOptions,
		RenameRequest, RenameParams, DocumentLink
}
export { Event }

import * as fm from './files';
import * as net from 'net';
import * as stream from 'stream';

export namespace Files {
	export let uriToFilePath = fm.uriToFilePath;
	export let resolveModule = fm.resolveModule;
	export let resolveModule2 = fm.resolveModule2;
	export let resolveModulePath = fm.resolveModulePath;
}

interface ConnectionState {
	__textDocumentSync: TextDocumentSyncKind;
}

/**
 * A manager for simple text documents
 */
export class TextDocuments {

	private _documents : { [uri: string]: TextDocument };

	private _onDidChangeContent: Emitter<TextDocumentChangeEvent>;
	private _onDidOpen: Emitter<TextDocumentChangeEvent>;
	private _onDidClose: Emitter<TextDocumentChangeEvent>;
	private _onDidSave: Emitter<TextDocumentChangeEvent>;

	/**
	 * Create a new text document manager.
	 */
	public constructor() {
		this._documents = Object.create(null);
		this._onDidChangeContent = new Emitter<TextDocumentChangeEvent>();
		this._onDidOpen = new Emitter<TextDocumentChangeEvent>();
		this._onDidClose = new Emitter<TextDocumentChangeEvent>();
		this._onDidSave = new Emitter<TextDocumentChangeEvent>();
	}

	/**
	 * Returns the [TextDocumentSyncKind](#TextDocumentSyncKind) used by
	 * this text document manager.
	 */
	public get syncKind(): TextDocumentSyncKind {
		return TextDocumentSyncKind.Full;
	}

	/**
	 * An event that fires when a text document managed by this manager
	 * has been opened or the content changes.
	 */
	public get onDidChangeContent(): Event<TextDocumentChangeEvent> {
		return this._onDidChangeContent.event;
	}

	/**
	 * An event that fires when a text document managed by this manager
	 * has been opened.
	 */
	public get onDidOpen(): Event<TextDocumentChangeEvent> {
		return this._onDidOpen.event;
	}

	/**
	 * An event that fires when a text document managed by this manager
	 * has been closed.
	 */
	public get onDidClose(): Event<TextDocumentChangeEvent> {
		return this._onDidClose.event;
	}

	/**
	 * An event that fires when a text document managed by this manager
	 * has been closed.
	 */
	public get onDidSave(): Event<TextDocumentChangeEvent> {
		return this._onDidSave.event;
	}

	/**
	 * Returns the document for the given URI. Returns undefined if
	 * the document is not mananged by this instance.
	 *
	 * @param uri The text document's URI to retrieve.
	 * @return the text document or `undefined`.
	 */
	public get(uri: string): TextDocument {
		return this._documents[uri];
	}

	/**
	 * Returns all text documents managed by this instance.
	 *
	 * @return all text documents.
	 */
	public all(): TextDocument[] {
		return Object.keys(this._documents).map(key => this._documents[key]);
	}

	/**
	 * Returns the URIs of all text documents managed by this instance.
	 *
	 * @return the URI's of all text documents.
	 */
	public keys(): string[] {
		return Object.keys(this._documents);
	}

	/**
	 * Listens for `low level` notification on the given connection to
	 * update the text documents managed by this instance.
	 *
	 * @param connection The connection to listen on.
	 */
	public listen(connection: IConnection): void {
		(<ConnectionState><any>connection).__textDocumentSync = TextDocumentSyncKind.Full;
		connection.onDidOpenTextDocument((event: DidOpenTextDocumentParams) => {
			let td = event.textDocument;
			let document = TextDocument.create(td.uri, td.languageId, td.version, td.text);
			this._documents[td.uri] = document;
			this._onDidOpen.fire({ document });
			this._onDidChangeContent.fire({ document });
		});
		connection.onDidChangeTextDocument((event: DidChangeTextDocumentParams) => {
			let td= event.textDocument;
			let changes = event.contentChanges;
			let last: TextDocumentContentChangeEvent = changes.length > 0 ? changes[changes.length - 1] : null;
			if (last) {
				let document = this._documents[td.uri];
				if (document && Is.func(document['update'])) {
					(<any> document).update(last, td.version);
					this._onDidChangeContent.fire({ document });
				}
			}
		});
		connection.onDidCloseTextDocument((event: DidCloseTextDocumentParams) => {
			let document = this._documents[event.textDocument.uri];
			if (document) {
				delete this._documents[event.textDocument.uri];
				this._onDidClose.fire({ document });
			}
		});
		connection.onDidSaveTextDocument((event: DidSaveTextDocumentParams) => {
			let document = this._documents[event.textDocument.uri];
			if (document) {
				this._onDidSave.fire({ document });
			}
		});
	}
}

// ------------------------- implementation of the language server protocol ---------------------------------------------

/**
 * Helps tracking error message. Equal occurences of the same
 * message are only stored once. This class is for example
 * usefull if text documents are validated in a loop and equal
 * error message should be folded into one.
 */
export class ErrorMessageTracker {

	private messages: { [key: string]: number };

	constructor() {
		this.messages = Object.create(null);
	}

	/**
	 * Add a message to the tracker.
	 *
	 * @param message The message to add.
	 */
	public add(message: string): void {
		let count: number = this.messages[message];
		if (!count) {
			count = 0;
		}
		count++;
		this.messages[message] = count;
	}

	/**
	 * Send all tracked messages to the conenction's window.
	 *
	 * @param connection The connection establised between client and server.
	 */
	public sendErrors(connection: { window: RemoteWindow }): void {
		Object.keys(this.messages).forEach(message => {
			connection.window.showErrorMessage(message);
		});
	}
}

/**
 * The RemoteConsole interface contains all functions to interact with
 * the developer console of VS Code.
 */
export interface RemoteConsole {
	/**
	 * Show an error message.
	 *
	 * @param message The message to show.
	 */
	error(message: string);

	/**
	 * Show a warning message.
	 *
	 * @param message The message to show.
	 */
	warn(message: string);

	/**
	 * Show an information message.
	 *
	 * @param message The message to show.
	 */
	info(message: string);

	/**
	 * Log a message.
	 *
	 * @param message The message to log.
	 */
	log(message: string);
}

/**
 * The RemoteWindow interface contains all functions to interact with
 * the visual window of VS Code.
 */
export interface RemoteWindow {
	/**
	 * Show an error message.
	 *
	 * @param message The message to show.
	 */
	showErrorMessage(message: string);
	showErrorMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Thenable<T>;

	/**
	 * Show a warning message.
	 *
	 * @param message The message to show.
	 */
	showWarningMessage(message: string);
	showWarningMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Thenable<T>;

	/**
	 * Show an information message.
	 *
	 * @param message The message to show.
	 */
	showInformationMessage(message: string);
	showInformationMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Thenable<T>;
}

class ConnectionLogger implements Logger, RemoteConsole {
	private connection: MessageConnection;
	public constructor() {
	}
	public attach(connection: MessageConnection) {
		this.connection = connection;
	}
	public error(message: string): void {
		this.send(MessageType.Error, message);
	}
	public warn(message: string): void {
		this.send(MessageType.Warning, message);
	}
	public info(message: string): void {
		this.send(MessageType.Info, message);
	}
	public log(message: string): void {
		this.send(MessageType.Log, message);
	}
	private send(type: number, message: string) {
		if (this.connection) {
			this.connection.sendNotification(LogMessageNotification.type, { type, message });
		}
	}
}

class RemoteWindowImpl implements RemoteWindow {

	constructor(private connection: MessageConnection) {
	}

	public showErrorMessage(message: string, ...actions: MessageActionItem[]): Thenable<MessageActionItem> {
		return this.connection.sendRequest(ShowMessageRequest.type, { type: MessageType.Error, message, actions });
	}
	public showWarningMessage(message: string, ...actions: MessageActionItem[]): Thenable<MessageActionItem> {
		return this.connection.sendRequest(ShowMessageRequest.type, { type: MessageType.Warning, message, actions });
	}
	public showInformationMessage(message: string, ...actions: MessageActionItem[]): Thenable<MessageActionItem> {
		return this.connection.sendRequest(ShowMessageRequest.type, { type: MessageType.Info, message, actions });
	}
}

/**
 * Interface to log telemetry events. The events are actually send to the client
 * and the client needs to feed the event into a propert telemetry system.
 */
export interface Telemetry {
	/**
	 * Log the given data to telemetry.
	 *
	 * @param data The data to log. Must be a JSON serializable object.
	 */
	logEvent(data: any): void;
}

/**
 * Interface to log traces to the client. The events are sent to the client and the
 * client needs to log the trace events.
 */
export interface Tracer {
	/**
	 * Log the given data to the trace Log
	 */
	log(message: string, verbose?: string): void;
}

class TracerImpl implements Tracer {

	private _trace: Trace;

	constructor(private connection: MessageConnection) {
		this._trace = Trace.Off;
	}

	public set trace(value: Trace) {
		this._trace = value;
	}

	public log(message: string, verbose?: string): void {
		if (this._trace === Trace.Off) {
			return;
		}
		this.connection.sendNotification(LogTraceNotification.type, {
			message: message,
			verbose: this._trace === Trace.Verbose ? verbose : null
		});
	}
}

class TelemetryImpl implements Telemetry {

	constructor(private connection: MessageConnection) {
	}

	public logEvent(data: any): void {
		this.connection.sendNotification(TelemetryEventNotification.type, data);
	}
}

/**
 * Interface to describe the shape of the server connection.
 */
export interface IConnection {

	/**
	 * Start listening on the input stream for messages to process.
	 */
	listen(): void;

	/**
	 * Installs a request handler described by the given [RequestType](#RequestType).
	 *
	 * @param type The [RequestType](#RequestType) describing the request.
	 * @param handler The handler to install
	 */
	onRequest<P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): void;

	/**
	 * Installs a notification handler described by the given [NotificationType](#NotificationType).
	 *
	 * @param type The [NotificationType](#NotificationType) describing the notification.
	 * @param handler The handler to install
	 */
	onNotification<P>(type: NotificationType<P>, handler: NotificationHandler<P>): void;

	/**
	 * Send a notification to the client.
	 *
	 * @param type The [NotificationType](#NotificationType) describing the notification.
	 * @param params The notification's parameters.
	 */
	sendNotification<P>(type: NotificationType<P>, params?: P): void;

	/**
	 * Send a request to the client.
	 *
	 * @param type The [RequestType](#RequestType) describing the request.
	 * @param params The request's parameters.
	 */
	sendRequest<P, R, E>(type: RequestType<P, R, E>, params?: P): Thenable<R>;

	/**
	 * Installs a handler for the intialize request.
	 *
	 * @param handler The initialize handler.
	 */
	onInitialize(handler: RequestHandler<InitializeParams, InitializeResult, InitializeError>): void;

	/**
	 * Installs a handler for the shutdown request.
	 *
	 * @param handler The initialize handler.
	 */
	onShutdown(handler: RequestHandler<void, void, void>): void;

	/**
	 * Installs a handler for the exit notification.
	 *
	 * @param handler The exit handler.
	 */
	onExit(handler: NotificationHandler<void>): void;

	/**
	 * A proxy for VSCode's development console. See [RemoteConsole](#RemoteConsole)
	 */
	console: RemoteConsole;

	/**
	 * A proxy for VSCode's window. See [RemoteWindow](#RemoteWindow)
	 */
	window: RemoteWindow;

	/**
	 * A proxy to send telemetry events to the client.
	 */
	telemetry: Telemetry;

	/**
	 * A proxy to send trace events to the client.
	 */
	tracer: Tracer;

	/**
	 * Installs a handler for the `DidChangeConfiguration` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidChangeConfiguration(handler: NotificationHandler<DidChangeConfigurationParams>): void;

	/**
	 * Installs a handler for the `DidChangeWatchedFiles` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidChangeWatchedFiles(handler: NotificationHandler<DidChangeWatchedFilesParams>): void;

	/**
	 * Installs a handler for the `DidOpenTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidOpenTextDocument(handler: NotificationHandler<DidOpenTextDocumentParams>): void;

	/**
	 * Installs a handler for the `DidChangeTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidChangeTextDocument(handler: NotificationHandler<DidChangeTextDocumentParams>): void;

	/**
	 * Installs a handler for the `DidCloseTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidCloseTextDocument(handler: NotificationHandler<DidCloseTextDocumentParams>): void;

	/**
	 * Installs a handler for the `DidSaveTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidSaveTextDocument(handler: NotificationHandler<DidSaveTextDocumentParams>): void;

	/**
	 * Sends diagnostics computed for a given document to VSCode to render them in the
	 * user interface.
	 *
	 * @param params The diagnostic parameters.
	 */
	sendDiagnostics(params: PublishDiagnosticsParams): void;

	/**
	 * Installs a handler for the `Hover` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onHover(handler: RequestHandler<TextDocumentPositionParams, Hover, void>): void;

	/**
	 * Installs a handler for the `Completion` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCompletion(handler: RequestHandler<TextDocumentPositionParams, CompletionItem[] | CompletionList, void>): void;

	/**
	 * Installs a handler for the `CompletionResolve` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCompletionResolve(handler: RequestHandler<CompletionItem, CompletionItem, void>): void;

	/**
	 * Installs a handler for the `SignatureHelp` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onSignatureHelp(handler: RequestHandler<TextDocumentPositionParams, SignatureHelp, void>): void;

	/**
	 * Installs a handler for the `Definition` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDefinition(handler: RequestHandler<TextDocumentPositionParams, Definition, void>): void;

	/**
	 * Installs a handler for the `References` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onReferences(handler: RequestHandler<ReferenceParams, Location[], void>): void;

	/**
	 * Installs a handler for the `DocumentHighlight` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentHighlight(handler: RequestHandler<TextDocumentPositionParams, DocumentHighlight[], void>): void;

	/**
	 * Installs a handler for the `DocumentSymbol` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentSymbol(handler: RequestHandler<DocumentSymbolParams, SymbolInformation[], void>): void;

	/**
	 * Installs a handler for the `WorkspaceSymbol` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onWorkspaceSymbol(handler: RequestHandler<WorkspaceSymbolParams, SymbolInformation[], void>): void;

	/**
	 * Installs a handler for the `CodeAction` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeAction(handler: RequestHandler<CodeActionParams, Command[], void>): void;

	/**
	 * Compute a list of [lenses](#CodeLens). This call should return as fast as possible and if
	 * computing the commands is expensive implementors should only return code lens objects with the
	 * range set and handle the resolve request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeLens(handler: RequestHandler<CodeLensParams, CodeLens[], void>): void;

	/**
	 * This function will be called for each visible code lens, usually when scrolling and after
	 * the onCodeLens has been called.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeLensResolve(handler: RequestHandler<CodeLens, CodeLens, void>): void;

	/**
	 * Installs a handler for the document formatting request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentFormatting(handler: RequestHandler<DocumentFormattingParams, TextEdit[], void>): void;

	/**
	 * Installs a handler for the document range formatting request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentRangeFormatting(handler: RequestHandler<DocumentRangeFormattingParams, TextEdit[], void>): void;

	/**
	 * Installs a handler for the document on type formatting request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentOnTypeFormatting(handler: RequestHandler<DocumentOnTypeFormattingParams, TextEdit[], void>): void;

	/**
	 * Installs a handler for the rename request.
	 *
	 * @param handler The corresponding handler.
	 */
	onRenameRequest(handler: RequestHandler<RenameParams, WorkspaceEdit, void>): void;

	/**
	 * Installs a handler for the document links request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentLinkRequest(handler: RequestHandler<DocumentLinkParams, DocumentLink[], void>): void;	

	/**
	 * Installs a handler for the document links resolve request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentLinkResolveRequest(handler: RequestHandler<DocumentLink, DocumentLink, void>): void;	

	/**
	 * Disposes the connection
	 */
	dispose(): void;
}

/**
 * Creates a new connection using a the given streams.
 *
 * @param inputStream The stream to read messages from.
 * @param outputStream The stream to write messages to.
 * @return a [connection](#IConnection)
 */
export function createConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream): IConnection;

/**
 * Creates a new connection.
 *
 * @param reader The message reader to read messages from.
 * @param writer The message writer to write message to.
 */
export function createConnection(reader: MessageReader, writer: MessageWriter): IConnection;
/**
 * Creates a new connection based on the processes command line arguments:
 * --ipc : connection using the node  process ipc
 *
 * @param reader The message reader to read messages from.
 * @param writer The message writer to write message to.
 */
export function createConnection(): IConnection;
export function createConnection(input?: any, output?: any): IConnection {
	if (!input && !output && process.argv.length > 2) {
		let port = void 0;
		let argv = process.argv.slice(2);
		for (let i = 0; i < argv.length; i++) {
			let arg = argv[i];
			if (arg === '--node-ipc') {
				input = new IPCMessageReader(process);
				output = new IPCMessageWriter(process);
			} else if (arg === '--stdio') {
				input = process.stdin;
				output = process.stdout;
			} else if (arg === '--socket') {
				port = parseInt(argv[i + 1]);
				i++;
			} else {
				var args = arg.split('=');
				if (args[0] === '--socket') {
					port = parseInt(args[1]);
				}
			}
		}
		if (port) {
			output = new stream.PassThrough();
			input = new stream.PassThrough();
  			let server = net.createServer(socket => {
				server.close();
				socket.pipe(output);
				input.pipe(socket);
     		}).listen(port);
		}
	}
	var commandLineMessage = "Use arguments of createConnection or set command line parameters: '--node-ipc', '--stdio' or '--socket={number}'";
	if (!input) {
		throw new Error("Connection input stream is not set. " + commandLineMessage);
	}
	if (!output) {
		throw new Error("Connection output stream is not set. " + commandLineMessage);
	}

	let shutdownReceived: boolean;
	// Backwards compatibility
	if (Is.func(input.read) && Is.func(input.on)) {
		let inputStream = <NodeJS.ReadableStream>input;
		inputStream.on('end', () => {
			process.exit(shutdownReceived ? 0 : 1);
		});
		inputStream.on('close', () => {
			process.exit(shutdownReceived ? 0 : 1);
		});
	}

	const logger = new ConnectionLogger();
	const connection = createServerMessageConnection(input, output, logger);
	logger.attach(connection);
	const remoteWindow = new RemoteWindowImpl(connection);
	const telemetry = new TelemetryImpl(connection);
	const tracer = new TracerImpl(connection);

	function asThenable<T>(value: T | Thenable<T>): Thenable<T> {
		if (Is.thenable(value)) {
			return value;
		} else {
			return Promise.resolve<T>(<T>value);
		}
	}

	let shutdownHandler: RequestHandler<void, void, void> = null;
	let initializeHandler: RequestHandler<InitializeParams, InitializeResult, InitializeError> = null;
	let exitHandler: NotificationHandler<void> = null;
	let protocolConnection: IConnection & ConnectionState = {
		listen: (): void => connection.listen(),
		sendRequest: <P, R, E>(type: RequestType<P, R, E>, params?: P): Thenable<R> => connection.sendRequest(type, params),
		onRequest: <P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): void => connection.onRequest(type, handler),
		sendNotification: <P>(type: NotificationType<P>, params?: P): void => connection.sendNotification(type, params),
		onNotification: <P>(type: NotificationType<P>, handler: NotificationHandler<P>): void => connection.onNotification(type, handler),

		onInitialize: (handler) => initializeHandler = handler,
		onShutdown: (handler) => shutdownHandler = handler,
		onExit: (handler) => exitHandler = handler,

		get console() { return logger; },
		get window() { return remoteWindow; },
		get telemetry() { return telemetry; },
		get tracer() { return tracer; },

		onDidChangeConfiguration: (handler) => connection.onNotification(DidChangeConfigurationNotification.type, handler),
		onDidChangeWatchedFiles: (handler) => connection.onNotification(DidChangeWatchedFilesNotification.type, handler),

		__textDocumentSync: undefined,
		onDidOpenTextDocument: (handler) => connection.onNotification(DidOpenTextDocumentNotification.type, handler),
		onDidChangeTextDocument: (handler) => connection.onNotification(DidChangeTextDocumentNotification.type, handler),
		onDidCloseTextDocument: (handler) => connection.onNotification(DidCloseTextDocumentNotification.type, handler),
		onDidSaveTextDocument: (handler) => connection.onNotification(DidSaveTextDocumentNotification.type, handler),

		sendDiagnostics: (params) => connection.sendNotification(PublishDiagnosticsNotification.type, params),

		onHover: (handler) => connection.onRequest(HoverRequest.type, handler),
		onCompletion: (handler) => connection.onRequest(CompletionRequest.type, handler),
		onCompletionResolve: (handler) => connection.onRequest(CompletionResolveRequest.type, handler),
		onSignatureHelp: (handler) => connection.onRequest(SignatureHelpRequest.type, handler),
		onDefinition: (handler) => connection.onRequest(DefinitionRequest.type, handler),
		onReferences: (handler) => connection.onRequest(ReferencesRequest.type, handler),
		onDocumentHighlight: (handler) => connection.onRequest(DocumentHighlightRequest.type, handler),
		onDocumentSymbol: (handler) => connection.onRequest(DocumentSymbolRequest.type, handler),
		onWorkspaceSymbol: (handler) => connection.onRequest(WorkspaceSymbolRequest.type, handler),
		onCodeAction: (handler) => connection.onRequest(CodeActionRequest.type, handler),
		onCodeLens: (handler) => connection.onRequest(CodeLensRequest.type, handler),
		onCodeLensResolve: (handler) => connection.onRequest(CodeLensResolveRequest.type, handler),
		onDocumentFormatting: (handler) => connection.onRequest(DocumentFormattingRequest.type, handler),
		onDocumentRangeFormatting: (handler) => connection.onRequest(DocumentRangeFormattingRequest.type, handler),
		onDocumentOnTypeFormatting: (handler) => connection.onRequest(DocumentOnTypeFormattingRequest.type, handler),
		onRenameRequest: (handler) => connection.onRequest(RenameRequest.type, handler),
		onDocumentLinkRequest: (handler) => connection.onRequest(DocumentLinkRequest.type, handler),
		onDocumentLinkResolveRequest: (handler) => connection.onRequest(DocumentLinkResolveRequest.type, handler),

		dispose: () => connection.dispose()
	};

	connection.onRequest(InitializeRequest.type, (params) => {
		if (Is.number(params.processId)) {
			// We received a parent process id. Set up a timer to periodically check
			// if the parent is still alive.
			setInterval(() => {
				try {
					process.kill(params.processId, <any>0);
				} catch (ex) {
					// Parent process doesn't exist anymore. Exit the server.
					process.exit(shutdownReceived ? 0 : 1);
				}
			}, 3000);
		}
		if (Is.string(params.trace)) {
			tracer.trace = Trace.fromString(params.trace);
		}
		if (initializeHandler) {
			let result = initializeHandler(params, new CancellationTokenSource().token);
			return asThenable(result).then((value) => {
				if (value instanceof ResponseError) {
					return value;
				}
				let result = <InitializeResult>value;
				if (!result) {
					result = { capabilities: {} };
				}
				let capabilities = result.capabilities;
				if (!capabilities) {
					capabilities = {}
					result.capabilities = {};
				}
				if (!Is.number(capabilities.textDocumentSync)) {
					capabilities.textDocumentSync = Is.number(protocolConnection.__textDocumentSync) ? protocolConnection.__textDocumentSync : TextDocumentSyncKind.None;
				}
				return result;
			});
		} else {
			let result: InitializeResult = { capabilities: { textDocumentSync: TextDocumentSyncKind.None } };
			return result;
		}
	});

	connection.onRequest(ShutdownRequest.type, (params) => {
		shutdownReceived = true;
		if (shutdownHandler) {
			return shutdownHandler(params, new CancellationTokenSource().token);
		} else {
			return undefined;
		}
	});

	connection.onNotification(ExitNotification.type, (params) => {
		try {
			if (exitHandler) {
				exitHandler(params);
			}
		} finally {
			if (shutdownReceived) {
				process.exit(0);
			} else {
				process.exit(1);
			}
		}
	});

	connection.onNotification(SetTraceNotification.type, (params) => {
		tracer.trace = Trace.fromString(params.value);;
	});

	return protocolConnection;
}