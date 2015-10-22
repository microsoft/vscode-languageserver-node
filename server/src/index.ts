/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { LanguageServerError, MessageKind } from './languageServerError';
import { IRequestHandler, INotificationHandler, MessageConnection, ServerMessageConnection, ILogger, createServerMessageConnection, ResponseError, ErrorCodes } from 'vscode-jsonrpc';
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

import { ISimpleTextDocument, SimpleTextDocument } from './textDocuments';

// ------------- Reexport the API surface of the language worker API ----------------------
export { InitializeResult, InitializeError, Diagnostic, Severity, Position, FileEvent, FileChangeType, ErrorCodes }
export { LanguageServerError, MessageKind }
export { ISimpleTextDocument }

import * as fm from './files';
export namespace Files {
	export let uriToFilePath = fm.uriToFilePath;
	export let resolveModule = fm.resolveModule;
}

// -------------- single file validator -------------------

export type Result<T> = T | Thenable<T>;

export interface IValidationRequestor {
	all(): void;
}

export interface SingleFileValidator {
	initialize?(rootFolder: string): Result<InitializeResult | ResponseError<InitializeError>>;
	validate(document: ISimpleTextDocument): Result<Diagnostic[]>;
	onConfigurationChange?(settings: any, requestor: IValidationRequestor): void;
	onFileEvents?(changes: FileEvent[], requestor: IValidationRequestor): void;
	shutdown?(): void;
}

// ------------------------- implementation of the language worker protocol ---------------------------------------------

function isFunction(arg: any): arg is Function {
	return Object.prototype.toString.call(arg) === '[object Function]';
}

function isArray(array: any): array is any[] {
	if (Array.isArray) {
		return Array.isArray(array);
	}
	if (array && typeof (array.length) === 'number' && array.constructor === Array) {
		return true;
	}
	return false;
}

class DocumentManager {

	private trackedDocuments : { [uri: string]: SimpleTextDocument };

	public constructor() {
		this.trackedDocuments = Object.create(null);
	}

	public add(uri: string, document: SimpleTextDocument) {
		this.trackedDocuments[uri] = document;
	}

	public remove(uri: string): boolean {
		return delete this.trackedDocuments[uri];
	}

	public get(uri: string): SimpleTextDocument {
		return this.trackedDocuments[uri];
	}

	public all(): SimpleTextDocument[] {
		return Object.keys(this.trackedDocuments).map(key => this.trackedDocuments[key]);
	}

	public keys(): string[] {
		return Object.keys(this.trackedDocuments);
	}
 }

class ErrorMessageTracker {

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
	public publish(connection: { window: RemoteWindow }): void {
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

	onInitialize(handler: IRequestHandler<InitializeParams, InitializeResult, InitializeError>): void;
	onShutdown(handler: IRequestHandler<ShutdownParams, void, void>): void;
	onExit(handler: INotificationHandler<ExitParams>): void;

	console: RemoteConsole;
	window: RemoteWindow;

	onDidChangeConfiguration(handler: INotificationHandler<DidChangeConfigurationParams>): void;
	onDidChangeFiles(handler: INotificationHandler<DidChangeFilesParams>): void;

	onDidOpenTextDocument(handler: INotificationHandler<DidOpenTextDocumentParams>): void;
	onDidChangeTextDocument(handler: INotificationHandler<DidChangeTextDocumentParams>): void;
	onDidCloseTextDocument(handler: INotificationHandler<DidCloseTextDocumentParams>): void;
	publishDiagnostics(args: PublishDiagnosticsParams): void;

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

	let shutdownHandler: IRequestHandler<ShutdownParams, void, void> = null;
	connection.onRequest(ShutdownRequest.type, (params) => {
		shutdownReceived = true;
		if (shutdownHandler) {
			return shutdownHandler(params);
		} else {
			return undefined;
		}
	});
	let result: IConnection = {
		onInitialize: (handler) => connection.onRequest(InitializeRequest.type, handler),
		onShutdown: (handler) => shutdownHandler = handler,
		onExit: (handler) => connection.onNotification(ExitNotification.type, handler),

		get console() { return logger; },
		get window() { return remoteWindow; },

		onDidChangeConfiguration: (handler) => connection.onNotification(DidChangeConfigurationNotification.type, handler),
		onDidChangeFiles: (handler) => connection.onNotification(DidChangeFilesNotification.type, handler),

		onDidOpenTextDocument: (handler) => connection.onNotification(DidOpenTextDocumentNotification.type, handler),
		onDidChangeTextDocument: (handler) => connection.onNotification(DidChangeTextDocumentNotification.type, handler),
		onDidCloseTextDocument: (handler) => connection.onNotification(DidCloseTextDocumentNotification.type, handler),
		publishDiagnostics: (params) => connection.sendNotification(PublishDiagnosticsNotification.type, params),

		dispose: () => connection.dispose()
	}

	return result;
}

export interface IValidatorConnection {
	console: RemoteConsole;
	window: RemoteWindow;

	run(handler: SingleFileValidator): void;
}

class ValidationRequestor implements IValidationRequestor {
	private documents: DocumentManager;
	private _toValidate: { [uri: string]: SimpleTextDocument };

	public constructor(documents: DocumentManager) {
		this.documents = documents;
		this._toValidate = Object.create(null);
	}

	public get toValidate(): SimpleTextDocument[] {
		return Object.keys(this._toValidate).map(key => this._toValidate[key]);
	}

	public all(): void {
		this.documents.keys().forEach(key => this._toValidate[key] = this.documents.get(key));
	}

	public single(uri: string): boolean {
		let document = this.documents.get(uri);
		if (document) {
			this._toValidate[uri] = document;
		}
		return !!document;
	}
}

export function createValidatorConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream): IValidatorConnection {
	let connection = createConnection(inputStream, outputStream);
	let documents = new DocumentManager();

	function run(handler: SingleFileValidator): void {
		let rootFolder: string;

		function doProcess<T, R>(result: Result<T>, complete: (value: T) => Result<R>, error?: (error: any) => void): Result<R> {
			if (isFunction((result as Thenable<T>).then)) {
				return (result as Thenable<T>).then(complete, error);
			} else {
				return complete(result as T);
			}
		}

		function safeRunner<T>(values: T | T[], func: (value: T) => void): void {
			let messageTracker: ErrorMessageTracker = new ErrorMessageTracker();
			let runSingle = (value: T) => {
				try {
					func(value);
				} catch (error) {
					if (error instanceof LanguageServerError) {
						let workerError = error as LanguageServerError;
						switch( workerError.messageKind) {
							case MessageKind.Show:
								messageTracker.add(workerError.message);
								break;
							case MessageKind.Log:
								logSafeRunnerMessage(workerError.message);
								break;
						}
					} else {
						logSafeRunnerMessage(error.message);
					}
				}
			}
			if (isArray(values)) {
				for (let value of (values as T[])) {
					runSingle(value);
				}
			} else {
				runSingle(values as T);
			}
			messageTracker.publish(connection);
		}

		function logSafeRunnerMessage(message?: string): void {
			if (message) {
				connection.console.error(`Safe Runner failed with message: ${message}`);
			} else {
				connection.console.error('Safe Runner failed unexpectedly.');
			}
		}

		function validate(document: SimpleTextDocument): void {
			let result = handler.validate(document);
			doProcess(result, (diagnostics) => {
				connection.publishDiagnostics({
					uri: document.uri,
					diagnostics: diagnostics
				});
			}, (error) => {
				// We need a log event to tell the client that a diagnostic
				// failed.
			})
		}

		function createInitializeResult(initArgs: InitializeParams): InitializeResult {
			var resultCapabilities : ServerCapabilities = {
				incrementalTextDocumentSync: false
			};
			return { capabilities: resultCapabilities };
		}

		connection.onInitialize(initArgs => {
			rootFolder = initArgs.rootFolder;
			if (isFunction(handler.initialize)) {
				return doProcess(handler.initialize(rootFolder), (resultOrError) => {
					if (resultOrError) {
						return resultOrError;
					} else {
						return createInitializeResult(initArgs);
					}
				});
			} else {
				return createInitializeResult(initArgs);
			}
		});

		connection.onShutdown(params => {
			if (isFunction(handler.shutdown)) {
				handler.shutdown();
			}
			return undefined;
		});

		connection.onExit(() => {
			process.exit(0);
		});

		connection.onDidOpenTextDocument(event => {
			let document = new SimpleTextDocument(event.uri, event.text);
			documents.add(event.uri, document);
			process.nextTick(() => safeRunner(document, validate));
		});

		connection.onDidChangeTextDocument(event => {
			let document = documents.get(event.uri);
			if (document) {
				document.setText(event.text);
				process.nextTick(() => safeRunner(document, validate));
			}
		});

		connection.onDidCloseTextDocument(event => {
			documents.remove(event.uri);
		});

		connection.onDidChangeConfiguration(eventBody => {
			let settings = eventBody.settings;
			let requestor = new ValidationRequestor(documents);
			if (isFunction(handler.onConfigurationChange)) {
				handler.onConfigurationChange(settings, requestor);
			} else {
				requestor.all();
			}
			process.nextTick(() => safeRunner(requestor.toValidate, validate));
		});

		connection.onDidChangeFiles(args => {
			let requestor = new ValidationRequestor(documents);
			if (isFunction(handler.onFileEvents)) {
				handler.onFileEvents(args.changes, requestor);
			} else {
				requestor.all();
			}
			process.nextTick(() => safeRunner(requestor.toValidate, validate));
		});
	}

	let result: IValidatorConnection = {
		get console() { return connection.console; },
		get window() { return connection.window },
		run: run
	};
	return result;
}

export function runSingleFileValidator(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, handler: SingleFileValidator) : void {
	createValidatorConnection(inputStream, outputStream).run(handler);
}