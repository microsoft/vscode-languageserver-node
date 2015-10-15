/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { LanguageWorkerError, MessageKind } from './languageWorkerError';
import { Response } from './messages';
import {
		InitializeRequest, InitializeArguments, InitializeResponse, Capabilities,
		ShutdownRequest, ShutdownArguments, ShutdownResponse,
		ExitEvent, ExitArguments,
		LogMessageEvent, LogMessageArguments, MessageType,
		ShowMessageEvent, ShowMessageArguments,
		DidChangeConfigurationEvent, DidChangeConfigurationArguments,
		DidOpenDocumentEvent, DidOpenDocumentArguments, DidChangeDocumentEvent, DidChangeDocumentArguments, DidCloseDocumentEvent, DidCloseDocumentArguments,
		DidChangeFilesEvent, DidChangeFilesArguments, FileEvent, FileChangeType,
		PublishDiagnosticsEvent, PublishDiagnosticsArguments, Diagnostic, Severity, Position
	} from './protocol';
import { IRequestHandler, IEventHandler, MessageConnection, WorkerMessageConnection, createWorkerMessageConnection, ILogger } from './messageConnection';

// ------------- Reexport the API surface of the language worker API ----------------------
export { Response, InitializeResponse, Diagnostic, Severity, Position, FileEvent, FileChangeType }
export { LanguageWorkerError, MessageKind }

import * as fm from './files';
export namespace Files {
	export let uriToFilePath = fm.uriToFilePath;
	export let resolveModule = fm.resolveModule;
}

// -------------- single file validator -------------------

export type Result<T> = T | Thenable<T>;

export interface IDocument {
	uri: string;
	getText(): string;
}

export interface IValidationRequestor {
	all(): void;
}

export interface SingleFileValidator {
	initialize?(rootFolder: string): Result<InitializeResponse>;
	validate(document: IDocument): Result<Diagnostic[]>;
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

class Document implements IDocument {

	private _uri: string;
	private _content: string;

	constructor(uri: string, content: string) {
		this._uri = uri;
		this._content = content;
	}

	public get uri(): string {
		return this._uri;
	}

	public getText(): string {
		return this._content;
	}

	public setText(content: string): void {
		this._content = content;
	}
}

class DocumentManager {

	private trackedDocuments : { [uri: string]: Document };

	public constructor() {
		this.trackedDocuments = Object.create(null);
	}

	public add(uri: string, document: Document) {
		this.trackedDocuments[uri] = document;
	}

	public remove(uri: string): boolean {
		return delete this.trackedDocuments[uri];
	}

	public get(uri: string): Document {
		return this.trackedDocuments[uri];
	}

	public all(): Document[] {
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
			this.connection.sendEvent(LogMessageEvent.type, { type, message });
		}
	}
}

class RemoteWindowImpl implements RemoteWindow {

	constructor(private connection: MessageConnection) {
	}

	public showErrorMessage(message: string) {
		this.connection.sendEvent(ShowMessageEvent.type, { type: MessageType.Error, message });
	}
	public showWarningMessage(message: string) {
		this.connection.sendEvent(ShowMessageEvent.type, { type: MessageType.Warning, message });
	}
	public showInformationMessage(message: string) {
		this.connection.sendEvent(ShowMessageEvent.type, { type: MessageType.Info, message });
	}
}

export interface IConnection {

	onInitialize(handler: IRequestHandler<InitializeArguments, InitializeResponse>): void;
	onShutdown(handler: IRequestHandler<ShutdownArguments, ShutdownResponse>): void;
	onExit(handler: IEventHandler<ExitArguments>): void;

	console: RemoteConsole;
	window: RemoteWindow;

	onDidChangeConfiguration(handler: IEventHandler<DidChangeConfigurationArguments>): void;
	onDidChangeFiles(handler: IEventHandler<DidChangeFilesArguments>): void;

	onDidOpenDocument(handler: IEventHandler<DidOpenDocumentArguments>): void;
	onDidChangeDocument(handler: IEventHandler<DidChangeDocumentArguments>): void;
	onDidCloseDocumet(handler: IEventHandler<DidCloseDocumentArguments>): void;
	publishDiagnostics(args: PublishDiagnosticsArguments): void;

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
	let connection = createWorkerMessageConnection(inputStream, outputStream, logger);
	logger.attach(connection);
	let remoteWindow = new RemoteWindowImpl(connection);

	let shutdownHandler: IRequestHandler<ShutdownArguments, ShutdownResponse> = null;
	connection.onRequest(ShutdownRequest.type, (args) => {
		shutdownReceived = true;
		if (shutdownHandler) {
			return shutdownHandler(args)
		} else {
			return { success: true };
		}
	});
	let result: IConnection = {
		onInitialize: (handler) => connection.onRequest(InitializeRequest.type, handler),
		onShutdown: (handler) => shutdownHandler = handler,
		onExit: (handler) => connection.onEvent(ExitEvent.type, handler),

		get console() { return logger; },
		get window() { return remoteWindow; },

		onDidChangeConfiguration: (handler) => connection.onEvent(DidChangeConfigurationEvent.type, handler),
		onDidChangeFiles: (handler) => connection.onEvent(DidChangeFilesEvent.type, handler),

		onDidOpenDocument: (handler) => connection.onEvent(DidOpenDocumentEvent.type, handler),
		onDidChangeDocument: (handler) => connection.onEvent(DidChangeDocumentEvent.type, handler),
		onDidCloseDocumet: (handler) => connection.onEvent(DidCloseDocumentEvent.type, handler),
		publishDiagnostics: (args) => connection.sendEvent(PublishDiagnosticsEvent.type, args),

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
	private _toValidate: { [uri: string]: Document };

	public constructor(documents: DocumentManager) {
		this.documents = documents;
		this._toValidate = Object.create(null);
	}

	public get toValidate(): Document[] {
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
					if (error instanceof LanguageWorkerError) {
						let workerError = error as LanguageWorkerError;
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

		function validate(document: Document): void {
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

		function createInitializeResponse(initArgs: InitializeArguments): InitializeResponse {
			var resultCapabilities : Capabilities = {};
			if (initArgs.capabilities.validation) {
				resultCapabilities.validation = true;
			}
			return { success: true, body: { capabilities: resultCapabilities }};
		}

		connection.onInitialize(initArgs => {
			rootFolder = initArgs.rootFolder;
			if (isFunction(handler.initialize)) {
				return doProcess(handler.initialize(rootFolder), (response) => {
					if (response && !response.success) {
						return response;
					} else {
						return createInitializeResponse(initArgs);
					}
				});
			} else {
				return createInitializeResponse(initArgs);
			}
		});

		connection.onShutdown(shutdownArgs => {
			if (isFunction(handler.shutdown)) {
				handler.shutdown();
			}
			return { success: true };
		});

		connection.onExit(() => {
			process.exit(0);
		});

		connection.onDidOpenDocument(event => {
			let document = new Document(event.uri, event.content);
			documents.add(event.uri, document);
			process.nextTick(() => safeRunner(document, validate));
		});

		connection.onDidChangeDocument(event => {
			let document = documents.get(event.uri);
			if (document) {
				document.setText(event.content);
				process.nextTick(() => safeRunner(document, validate));
			}
		});

		connection.onDidCloseDocumet(event => {
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