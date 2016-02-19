/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
		RequestType, IRequestHandler, NotificationType, INotificationHandler, ResponseError, ErrorCodes,
		MessageConnection, ServerMessageConnection, ILogger, createServerMessageConnection,
		IMessageReader, DataCallback, StreamMessageReader, IPCMessageReader,
		IMessageWriter, StreamMessageWriter, IPCMessageWriter
	} from 'vscode-jsonrpc';
import {
		InitializeRequest, InitializeParams, InitializeResult, InitializeError, ClientCapabilities, ServerCapabilities,
		ShutdownRequest,
		ExitNotification,
		LogMessageNotification, LogMessageParams, MessageType,
		ShowMessageNotification, ShowMessageParams,
		DidChangeConfigurationNotification, DidChangeConfigurationParams,
		DidOpenTextDocumentNotification, DidOpenTextDocumentParams, DidChangeTextDocumentNotification, DidChangeTextDocumentParams, TextDocumentContentChangeEvent,
		DidCloseTextDocumentNotification,
		DidChangeWatchedFilesNotification, DidChangeWatchedFilesParams, FileEvent, FileChangeType,
		PublishDiagnosticsNotification, PublishDiagnosticsParams, Diagnostic, DiagnosticSeverity, Range, Position, Location,
		TextDocumentIdentifier, TextDocumentPosition, TextDocumentSyncKind,
		HoverRequest, Hover, MarkedString,
		CompletionRequest, CompletionResolveRequest, CompletionOptions, CompletionItemKind, CompletionItem, CompletionList,
		TextEdit, WorkspaceEdit, WorkspaceChange, TextEditChange,
		SignatureHelpRequest, SignatureHelp, SignatureInformation, ParameterInformation,
		DefinitionRequest, Definition, ReferencesRequest, ReferenceParams,
		DocumentHighlightRequest, DocumentHighlight, DocumentHighlightKind,
		DocumentSymbolRequest, SymbolInformation, SymbolKind, WorkspaceSymbolRequest, WorkspaceSymbolParams,
		CodeActionRequest, CodeActionParams, CodeActionContext, Command,
		CodeLensRequest, CodeLensResolveRequest, CodeLens, CodeLensOptions,
		DocumentFormattingRequest, DocumentFormattingParams, DocumentRangeFormattingRequest, DocumentRangeFormattingParams,
		DocumentOnTypeFormattingRequest, DocumentOnTypeFormattingParams, FormattingOptions,
		RenameRequest, RenameParams
	} from './protocol';

import { Event, Emitter } from './utils/events';
import * as Is from './utils/is';

// ------------- Reexport the API surface of the language worker API ----------------------
export {
		RequestType, IRequestHandler, NotificationType, INotificationHandler, ResponseError, ErrorCodes,
		IMessageReader, DataCallback, StreamMessageReader, IPCMessageReader,
		IMessageWriter, StreamMessageWriter, IPCMessageWriter,
		InitializeParams, InitializeResult, InitializeError, ServerCapabilities,
		DidChangeConfigurationParams,
		DidChangeWatchedFilesParams, FileEvent, FileChangeType,
		DidOpenTextDocumentParams, DidChangeTextDocumentParams, TextDocumentContentChangeEvent,
		PublishDiagnosticsParams, Diagnostic, DiagnosticSeverity, Range, Position, Location,
		TextDocumentIdentifier, TextDocumentPosition, TextDocumentSyncKind,
		Hover, MarkedString,
		CompletionOptions, CompletionItemKind, CompletionItem, CompletionList,
		TextEdit, WorkspaceEdit, WorkspaceChange, TextEditChange,
		SignatureHelp, SignatureInformation, ParameterInformation,
		Definition, ReferenceParams,  DocumentHighlight, DocumentHighlightKind,
		SymbolInformation, SymbolKind, WorkspaceSymbolParams,
		CodeActionParams, CodeActionContext, Command,
		CodeLensRequest, CodeLensResolveRequest, CodeLens, CodeLensOptions,
		DocumentFormattingRequest, DocumentFormattingParams, DocumentRangeFormattingRequest, DocumentRangeFormattingParams,
		DocumentOnTypeFormattingRequest, DocumentOnTypeFormattingParams, FormattingOptions,
		RenameRequest, RenameParams
}
export { Event }

import * as fm from './files';

export namespace Files {
	export let uriToFilePath = fm.uriToFilePath;
	export let resolveModule = fm.resolveModule;
}

// ------------------------- text documents  --------------------------------------------------

/**
 * A simple text document. Not to be implemenented.
 */
export interface ITextDocument {

	/**
	 * The associated URI for this document. Most documents have the __file__-scheme, indicating that they
	 * represent files on disk. However, some documents may have other schemes indicating that they are not
	 * available on disk.
	 *
	 * @readonly
	 */
	uri: string;

	/**
	 * The identifier of the language associated with this document.
	 *
	 * @readonly
	 */
	languageId: string;

	/**
	 * Get the text of this document.
	 *
	 * @return The text of this document.
	 */
	getText(): string;

    /**
     * Converts a zero-based offset to a position.
     *
     * @param offset A zero-based offset.
     * @return A valid [position](#Position).
     */
    positionAt(offset: number): Position;

    /**
     * Converts the position to a zero-based offset.
     *
     * The position will be [adjusted](#TextDocument.validatePosition).
     *
     * @param position A position.
     * @return A valid zero-based offset.
     */
    offsetAt(position: Position): number;

    /**
     * The number of lines in this document.
     *
     * @readonly
     */
    lineCount: number;
}

export namespace ITextDocument {
	/**
	 * Creates a new ITextDocument literal from the given uri and content.
	 * @param uri The document's uri.
	 * @param content The document's content.
	 * @deprecated Use create function with language identifier.
	 */
	export function create(uri: string, content: string): ITextDocument;
	/**
	 * Creates a new ITextDocument literal from the given uri and content.
	 * @param uri The document's uri.
	 * @param languageId  The document's language Id.
	 * @param content The document's content.
	 */
	export function create(uri: string, languageId: string, content: string): ITextDocument;
	export function create(uri: string, arg2: string, arg3?: string): ITextDocument {
		let languageId: string;
		let content: string;
		if (Is.string(arg3)) {
			languageId = arg2;
			content = arg3;
		} else {
			languageId = undefined;
			content = arg2;
		}
		return new TextDocument(uri, languageId, content);
	}
	/**
	 * Checks whether the given literal conforms to the [ITextDocument](#ITextDocument) interface.
	 */
	export function is(value: any): value is ITextDocument {
		let candidate = value as ITextDocument;
		return Is.defined(candidate) && Is.string(candidate.uri) && (Is.undefined(candidate.languageId) || Is.string(candidate.languageId)) && Is.number(candidate.lineCount)
			&& Is.func(candidate.getText) && Is.func(candidate.positionAt) && Is.func(candidate.offsetAt) ? true : false;
	}
}

/**
 * Event to signal changes to a simple text document.
 */
export interface TextDocumentChangeEvent {
	/**
	 * The document that has changed.
	 */
	document: ITextDocument;
}

class TextDocument implements ITextDocument {

	private _uri: string;
	private _languageId: string;
	private _content: string;
	private _lineOffsets: number[];

	public constructor(uri: string, languageId: string, content: string) {
		this._uri = uri;
		this._languageId = languageId;
		this._content = content;
		this._lineOffsets = null;
	}

	public get uri(): string {
		return this._uri;
	}

	public get languageId(): string {
		return this._languageId;
	}

	public getText(): string {
		return this._content;
	}

	public update(event: TextDocumentContentChangeEvent): void {
		this._content = event.text;
		this._lineOffsets = null;
	}

	private getLineOffsets() : number[] {
		if (this._lineOffsets === null) {
			let lineOffsets: number[] = [];
			let text = this._content;
			let isLineStart = true;
			for (let i = 0; i < text.length; i++) {
				if (isLineStart) {
					lineOffsets.push(i);
					isLineStart = false;
				}
				let ch = text.charAt(i);
				isLineStart = (ch === '\r' || ch === '\n');
				if (ch === '\r' && i + 1 < text.length && text.charAt(i+1) === '\n') {
					i++;
				}
			}
			if (isLineStart && text.length > 0) {
				lineOffsets.push(text.length);
			}
			this._lineOffsets = lineOffsets;
		}
		return this._lineOffsets;
	}

	public positionAt(offset:number) {
		offset = Math.max(Math.min(offset, this._content.length), 0);

		let lineOffsets = this.getLineOffsets();
		let low = 0, high = lineOffsets.length;
		if (high === 0) {
			return Position.create(0, offset);
		}
		while (low < high) {
			let mid = Math.floor((low + high) / 2);
			if (lineOffsets[mid] > offset) {
				high = mid;
			} else {
				low = mid + 1;
			}
		}
		// low is the least x for which the line offset is larger than the current offset
		// or array.length if no line offset is larger than the current offset
		let line = low - 1;
		return Position.create(line, offset - lineOffsets[line]);
	}

	public offsetAt(position: Position) {
		let lineOffsets = this.getLineOffsets();
		if (position.line >= lineOffsets.length) {
			return this._content.length;
		} else if (position.line < 0) {
			return 0;
		}
		let lineOffset = lineOffsets[position.line];
		let nextLineOffset = (position.line + 1 < lineOffsets.length) ? lineOffsets[position.line + 1] : this._content.length;
		return Math.max(Math.min(lineOffset + position.character, nextLineOffset), lineOffset);
	}

	public get lineCount() {
		return this.getLineOffsets().length;
	}
}

interface IConnectionState {
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

	/**
	 * Create a new text document manager.
	 */
	public constructor() {
		this._documents = Object.create(null);
		this._onDidChangeContent = new Emitter<TextDocumentChangeEvent>();
		this._onDidOpen = new Emitter<TextDocumentChangeEvent>();
		this._onDidClose = new Emitter<TextDocumentChangeEvent>();
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
	 * Returns the document for the given URI. Returns undefined if
	 * the document is not mananged by this instance.
	 *
	 * @param uri The text document's URI to retrieve.
	 * @return the text document or `undefined`.
	 */
	public get(uri: string): ITextDocument {
		return this._documents[uri];
	}

	/**
	 * Returns all text documents managed by this instance.
	 *
	 * @return all text documents.
	 */
	public all(): ITextDocument[] {
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
		(<IConnectionState><any>connection).__textDocumentSync = TextDocumentSyncKind.Full;
		connection.onDidOpenTextDocument((event: DidOpenTextDocumentParams) => {
			let document = new TextDocument(event.uri, event.languageId, event.text);
			this._documents[event.uri] = document;
            this._onDidOpen.fire({ document });
			this._onDidChangeContent.fire({ document });
		});
		connection.onDidChangeTextDocument((event: DidChangeTextDocumentParams) => {
			let changes = event.contentChanges;
			let last: TextDocumentContentChangeEvent = changes.length > 0 ? changes[changes.length - 1] : null;
			if (last) {
				let document = this._documents[event.uri];
				document.update(last);
				this._onDidChangeContent.fire({ document });
			}
		});
		connection.onDidCloseTextDocument((event: TextDocumentIdentifier) => {
            let document = this._documents[event.uri];
			delete this._documents[event.uri];
            this._onDidClose.fire({ document });
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

	/**
	 * Show a warning message.
	 *
	 * @param message The message to show.
	 */
	showWarningMessage(message: string);

	/**
	 * Show an information message.
	 *
	 * @param message The message to show.
	 */
	showInformationMessage(message: string);
}

class Logger implements ILogger, RemoteConsole {
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

	public showErrorMessage(message: string) {
		this.connection.sendNotification(ShowMessageNotification.type, { type: MessageType.Error, message });
	}
	public showWarningMessage(message: string) {
		this.connection.sendNotification(ShowMessageNotification.type, { type: MessageType.Warning, message });
	}
	public showInformationMessage(message: string) {
		this.connection.sendNotification(ShowMessageNotification.type, { type: MessageType.Info, message });
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
	onRequest<P, R, E>(type: RequestType<P, R, E>, handler: IRequestHandler<P, R, E>): void;

	/**
	 * Installs a notification handler described by the given [NotificationType](#NotificationType).
	 *
	 * @param type The [NotificationType](#NotificationType) describing the notification.
	 * @param handler The handler to install
	 */
	onNotification<P>(type: NotificationType<P>, handler: INotificationHandler<P>): void;

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
	onInitialize(handler: IRequestHandler<InitializeParams, InitializeResult, InitializeError>): void;

	/**
	 * Installs a handler for the shutdown request.
	 *
	 * @param handler The initialize handler.
	 */
	onShutdown(handler: IRequestHandler<void, void, void>): void;

	/**
	 * Installs a handler for the exit notification.
	 *
	 * @param handler The exit handler.
	 */
	onExit(handler: INotificationHandler<void>): void;

	/**
	 * A proxy for VSCode's development console. See [RemoteConsole](#RemoteConsole)
	 */
	console: RemoteConsole;

	/**
	 * A proxy for VSCode's window. See [RemoteWindow](#RemoteWindow)
	 */
	window: RemoteWindow;

	/**
	 * Installs a handler for the `DidChangeConfiguration` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidChangeConfiguration(handler: INotificationHandler<DidChangeConfigurationParams>): void;

	/**
	 * Installs a handler for the `DidChangeWatchedFiles` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidChangeWatchedFiles(handler: INotificationHandler<DidChangeWatchedFilesParams>): void;

	/**
	 * Installs a handler for the `DidOpenTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidOpenTextDocument(handler: INotificationHandler<DidOpenTextDocumentParams>): void;

	/**
	 * Installs a handler for the `DidChangeTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidChangeTextDocument(handler: INotificationHandler<DidChangeTextDocumentParams>): void;

	/**
	 * Installs a handler for the `DidCloseTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidCloseTextDocument(handler: INotificationHandler<TextDocumentIdentifier>): void;

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
	onHover(handler: IRequestHandler<TextDocumentPosition, Hover, void>): void;

	/**
	 * Installs a handler for the `Completion` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCompletion(handler: IRequestHandler<TextDocumentPosition, CompletionItem[] | CompletionList, void>): void;

	/**
	 * Installs a handler for the `CompletionResolve` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCompletionResolve(handler: IRequestHandler<CompletionItem, CompletionItem, void>): void;

	/**
	 * Installs a handler for the `SignatureHelp` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onSignatureHelp(handler: IRequestHandler<TextDocumentIdentifier, SignatureHelp, void>): void;

	/**
	 * Installs a handler for the `Definition` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDefinition(handler: IRequestHandler<TextDocumentPosition, Definition, void>): void;

	/**
	 * Installs a handler for the `References` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onReferences(handler: IRequestHandler<ReferenceParams, Location[], void>): void;

	/**
	 * Installs a handler for the `DocumentHighlight` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentHighlight(handler: IRequestHandler<TextDocumentPosition, DocumentHighlight[], void>): void;

	/**
	 * Installs a handler for the `DocumentSymbol` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentSymbol(handler: IRequestHandler<TextDocumentIdentifier, SymbolInformation[], void>): void;

	/**
	 * Installs a handler for the `WorkspaceSymbol` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onWorkspaceSymbol(handler: IRequestHandler<WorkspaceSymbolParams, SymbolInformation[], void>): void;

	/**
	 * Installs a handler for the `CodeAction` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeAction(handler: IRequestHandler<CodeActionParams, Command[], void>): void;

	/**
	 * Compute a list of [lenses](#CodeLens). This call should return as fast as possible and if
	 * computing the commands is expensive implementors should only return code lens objects with the
	 * range set and handle the resolve request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeLens(handler: IRequestHandler<TextDocumentIdentifier, CodeLens[], void>): void;

	/**
	 * This function will be called for each visible code lens, usually when scrolling and after
	 * the onCodeLens has been called.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeLensResolve(handler: IRequestHandler<CodeLens, CodeLens, void>): void;

	/**
	 * Installs a handler for the document formatting request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentFormatting(handler: IRequestHandler<DocumentFormattingParams, TextEdit[], void>): void;

	/**
	 * Installs a handler for the document range formatting request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentRangeFormatting(handler: IRequestHandler<DocumentRangeFormattingParams, TextEdit[], void>): void;

	/**
	 * Installs a handler for the document on type formatting request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentOnTypeFormatting(handler: IRequestHandler<DocumentOnTypeFormattingParams, TextEdit[], void>): void;

	/**
	 * Installs a handler for rename request.
	 *
	 * @param handler The corresponding handler.
	 */
	onRenameRequest(handler: IRequestHandler<RenameParams, WorkspaceEdit, void>): void;
	/**
	 * Disposes the connection
	 */
	dispose(): void;
}

/**
 * Creates a new connection.
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
export function createConnection(reader: IMessageReader, writer: IMessageWriter): IConnection;
export function createConnection(input: any, output: any): IConnection {
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

	let logger = new Logger();
	let connection = createServerMessageConnection(input, output, logger);
	logger.attach(connection);
	let remoteWindow = new RemoteWindowImpl(connection);

	function asThenable<T>(value: T | Thenable<T>): Thenable<T> {
		if (Is.thenable(value)) {
			return value;
		} else {
			return Promise.resolve<T>(<T>value);
		}
	}

	let shutdownHandler: IRequestHandler<void, void, void> = null;
	let initializeHandler: IRequestHandler<InitializeParams, InitializeResult, InitializeError> = null;
	let exitHandler: INotificationHandler<void> = null;
	let protocolConnection: IConnection & IConnectionState = {
		listen: (): void => connection.listen(),
		sendRequest: <P, R, E>(type: RequestType<P, R, E>, params?: P): Thenable<R> => connection.sendRequest(type, params),
		onRequest: <P, R, E>(type: RequestType<P, R, E>, handler: IRequestHandler<P, R, E>): void => connection.onRequest(type, handler),
		sendNotification: <P>(type: NotificationType<P>, params?: P): void => connection.sendNotification(type, params),
		onNotification: <P>(type: NotificationType<P>, handler: INotificationHandler<P>): void => connection.onNotification(type, handler),

		onInitialize: (handler) => initializeHandler = handler,
		onShutdown: (handler) => shutdownHandler = handler,
		onExit: (handler) => exitHandler = handler,

		get console() { return logger; },
		get window() { return remoteWindow; },

		onDidChangeConfiguration: (handler) => connection.onNotification(DidChangeConfigurationNotification.type, handler),
		onDidChangeWatchedFiles: (handler) => connection.onNotification(DidChangeWatchedFilesNotification.type, handler),

		__textDocumentSync: undefined,
		onDidOpenTextDocument: (handler) => connection.onNotification(DidOpenTextDocumentNotification.type, handler),
		onDidChangeTextDocument: (handler) => connection.onNotification(DidChangeTextDocumentNotification.type, handler),
		onDidCloseTextDocument: (handler) => connection.onNotification(DidCloseTextDocumentNotification.type, handler),

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
		if (initializeHandler) {
			let result = initializeHandler(params);
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
			return shutdownHandler(params);
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
	})

	return protocolConnection;
}