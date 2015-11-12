/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
		RequestType, IRequestHandler, NotificationType, INotificationHandler, ResponseError, ErrorCodes,
		MessageConnection, ServerMessageConnection, ILogger, createServerMessageConnection
	} from 'vscode-jsonrpc';
import {
		InitializeRequest, InitializeParams, InitializeResult, InitializeError, ClientCapabilities, ServerCapabilities,
		ShutdownRequest,
		ExitNotification,
		LogMessageNotification, LogMessageParams, MessageType,
		ShowMessageNotification, ShowMessageParams,
		DidChangeConfigurationNotification, DidChangeConfigurationParams,
		DidOpenTextDocumentNotification, DidOpenTextDocumentParams, DidChangeTextDocumentNotification, DidChangeTextDocumentParams, DidCloseTextDocumentNotification,
		DidChangeWatchedFilesNotification, DidChangeWatchedFilesParams, FileEvent, FileChangeType,
		PublishDiagnosticsNotification, PublishDiagnosticsParams, Diagnostic, DiagnosticSeverity, Position, Location,
		TextDocumentIdentifier, TextDocumentPosition, TextDocumentSyncKind,
		HoverRequest, Hover,
		CompletionRequest, CompletionResolveRequest, CompletionOptions, CompletionItemKind, CompletionItem, TextEdit,
		SignatureHelpRequest, SignatureHelp, SignatureInformation, ParameterInformation,
		DefinitionRequest, Definition, ReferencesRequest, ReferenceParams,
		DocumentHighlightRequest, DocumentHighlight, DocumentHighlightKind
	} from './protocol';

import { Event, Emitter } from './utils/events';
import * as is from './utils/is';

// ------------- Reexport the API surface of the language worker API ----------------------
export {
		RequestType, IRequestHandler, NotificationType, INotificationHandler, ResponseError, ErrorCodes,
		InitializeParams, InitializeResult, InitializeError, ServerCapabilities,
		DidChangeConfigurationParams,
		DidChangeWatchedFilesParams, FileEvent, FileChangeType,
		DidOpenTextDocumentParams, DidChangeTextDocumentParams,
		PublishDiagnosticsParams, Diagnostic, DiagnosticSeverity, Position, Location,
		TextDocumentIdentifier, TextDocumentPosition, TextDocumentSyncKind,
		Hover,
		CompletionOptions, CompletionItemKind, CompletionItem, TextEdit,
		SignatureHelp, SignatureInformation, ParameterInformation,
		Definition, ReferenceParams,  DocumentHighlight, DocumentHighlightKind
}
export { Event }

import * as fm from './files';
export namespace Files {
	export let uriToFilePath = fm.uriToFilePath;
	export let resolveModule = fm.resolveModule;
}

// ------------------------- text documents  --------------------------------------------------

export interface ITextDocument {
	uri: string;
	getText(): string;
}

class TextDocument implements ITextDocument {

	private _uri: string;
	private _content: string;

	public constructor(uri: string, content: string) {
		this._uri = uri;
		this._content = content;
	}

	public get uri(): string {
		return this._uri;
	}

	public getText(): string {
		return this._content;
	}

	public update(event: DidChangeTextDocumentParams): void {
		this._content = event.text;
	}
}

export class TextDocumentChangeEvent {
	document: ITextDocument;
}

interface IConnectionState {
	__textDocumentSync: TextDocumentSyncKind;
}

export class TextDocuments {

	private _documents : { [uri: string]: TextDocument };

	private _onDidChangeContent: Emitter<TextDocumentChangeEvent>;

	public constructor() {
		this._documents = Object.create(null);
		this._onDidChangeContent = new Emitter<TextDocumentChangeEvent>();
	}

	public get syncKind(): TextDocumentSyncKind {
		return TextDocumentSyncKind.Full;
	}

	public get onDidChangeContent(): Event<TextDocumentChangeEvent> {
		return this._onDidChangeContent.event;
	}

	public get(uri: string): ITextDocument {
		return this._documents[uri];
	}

	public all(): ITextDocument[] {
		return Object.keys(this._documents).map(key => this._documents[key]);
	}

	public keys(): string[] {
		return Object.keys(this._documents);
	}

	public listen(connection: IConnection): void {
		(<IConnectionState><any>connection).__textDocumentSync = TextDocumentSyncKind.Full;
		connection.onDidOpenTextDocument((event: DidOpenTextDocumentParams) => {
			let document = new TextDocument(event.uri, event.text);
			this._documents[event.uri] = document;
			this._onDidChangeContent.fire({ document });
		});
		connection.onDidChangeTextDocument((event: DidChangeTextDocumentParams | DidChangeTextDocumentParams[]) => {
			let last: DidChangeTextDocumentParams = null;
			if (is.array<DidChangeTextDocumentParams>(event)) {
				if (event.length > 0) {
					last = event[event.length - 1];
				}
			} else {
				last = event;
			}
			if (last) {
				let document = this._documents[last.uri];
				document.update(last);
				this._onDidChangeContent.fire({ document });
			}
		});
		connection.onDidCloseTextDocument((event: TextDocumentIdentifier) => {
			delete this._documents[event.uri];
		});
	}
}

// ------------------------- implementation of the language server protocol ---------------------------------------------

export class ErrorMessageTracker {

	private messages: { [key: string]: number };
	constructor() {
		this.messages = Object.create(null);
	}
	public add(message: string): void {
		let count: number = this.messages[message];
		if (!count) {
			count = 0;
		}
		count++;
		this.messages[message] = count;
	}
	public sendErrors(connection: { window: RemoteWindow }): void {
		Object.keys(this.messages).forEach(message => {
			connection.window.showErrorMessage(message);
		});
	}
}

export interface RemoteConsole {
	error(message: string);
	warn(message: string);
	info(message: string);
	log(message: string);
}

export interface RemoteWindow {
	showErrorMessage(message: string);
	showWarningMessage(message: string);
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

export interface IConnection {

	listen(): void;

	onRequest<P, R, E>(type: RequestType<P, R, E>, handler: IRequestHandler<P, R, E>): void;
	sendNotification<P>(type: NotificationType<P>, params?: P): void;
	onNotification<P>(type: NotificationType<P>, handler: INotificationHandler<P>): void;

	onInitialize(handler: IRequestHandler<InitializeParams, InitializeResult, InitializeError>): void;
	onShutdown(handler: IRequestHandler<void, void, void>): void;
	onExit(handler: INotificationHandler<void>): void;

	console: RemoteConsole;
	window: RemoteWindow;

	onDidChangeConfiguration(handler: INotificationHandler<DidChangeConfigurationParams>): void;
	onDidChangeWatchedFiles(handler: INotificationHandler<DidChangeWatchedFilesParams>): void;

	onDidOpenTextDocument(handler: INotificationHandler<DidOpenTextDocumentParams>): void;
	onDidChangeTextDocument(handler: INotificationHandler<DidChangeTextDocumentParams | DidChangeTextDocumentParams[]>): void;
	onDidCloseTextDocument(handler: INotificationHandler<TextDocumentIdentifier>): void;
	sendDiagnostics(args: PublishDiagnosticsParams): void;

	onHover(handler: IRequestHandler<TextDocumentPosition, Hover, void>): void;
	onCompletion(handler: IRequestHandler<TextDocumentPosition, CompletionItem[], void>): void;
	onCompletionResolve(handler: IRequestHandler<CompletionItem, CompletionItem, void>): void;
	onSignatureHelp(handler: IRequestHandler<TextDocumentIdentifier, SignatureHelp, void>): void;
	onDefinition(handler: IRequestHandler<TextDocumentPosition, Definition, void>): void;
	onReferences(handler: IRequestHandler<ReferenceParams, Location[], void>): void;
	onDocumentHighlight(handler: IRequestHandler<TextDocumentPosition, DocumentHighlight[], void>): void;

	dispose(): void;
}

export function createConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream): IConnection {
	let shutdownReceived: boolean;
	inputStream.on('end', () => {
		process.exit(shutdownReceived ? 0 : 1);
	});
	inputStream.on('close', () => {
		process.exit(shutdownReceived ? 0 : 1);
	});

	let logger = new Logger();
	let connection = createServerMessageConnection(inputStream, outputStream, logger);
	logger.attach(connection);
	let remoteWindow = new RemoteWindowImpl(connection);

	function asThenable<T>(value: T | Thenable<T>): Thenable<T> {
		if (is.thenable(value)) {
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

		dispose: () => connection.dispose()
	};

	connection.onRequest(InitializeRequest.type, (params) => {
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
				if (!is.number(capabilities.textDocumentSync)) {
					capabilities.textDocumentSync = is.number(protocolConnection.__textDocumentSync) ? protocolConnection.__textDocumentSync : TextDocumentSyncKind.None;
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