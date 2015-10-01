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
		LogMessageEvent, LogMessageArguments, MessageSeverity,
		ShowMessageEvent, ShowMessageArguments,
		DidChangeConfigurationEvent, DidChangeConfigurationArguments,
		DidOpenDocumentEvent, DidOpenDocumentArguments, DidChangeDocumentEvent, DidChangeDocumentArguments, DidCloseDocumentEvent, DidCloseDocumentArguments,
		DidChangeFilesEvent, DidChangeFilesArguments, FileEvent, FileChangeType,
		PublishDiagnosticsEvent, PublishDiagnosticsArguments, Diagnostic, Severity, Position
	} from './protocol';
import { IRequestHandler, IEventHandler, Connection, WorkerConnection, connectWorker, ClientConnection, connectClient, ILogger } from './connection';

// ------------- Reexport the API surface of the language worker API ----------------------
export { Response, InitializeResponse, Diagnostic, Severity, Location, FileEvent, FileChangeType }
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

// -------------- validator open tools protocol -------------------
export function runSingleFileValidator(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, handler: SingleFileValidator) : void {
	let connection = getValidationWorkerConnection(inputStream, outputStream);
	let rootFolder: string;
	let shutdownReceived: boolean;

	inputStream.on('end', () => {
		process.exit(shutdownReceived ? 0 : 1);
	});
	inputStream.on('close', () => {
		process.exit(shutdownReceived ? 0 : 1);
	});

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

	let trackedDocuments : { [uri: string]: Document } = Object.create(null);
	let changedDocuments : { [uri: string]: Document } = Object.create(null);

	class ValidationRequestor implements IValidationRequestor {
		private _toValidate: { [uri: string]: Document };

		constructor() {
			this._toValidate = Object.create(null);
		}

		public get toValidate(): Document[] {
			return Object.keys(this._toValidate).map(key => this._toValidate[key]);
		}

		public all(): void {
			Object.keys(trackedDocuments).forEach(key => this._toValidate[key] = trackedDocuments[key]);
		}

		public single(uri: string): boolean {
			let document = trackedDocuments[uri];
			if (document) {
				this._toValidate[uri] = document;
			}
			return !!document;
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
		public publish(connection: { publishShowMessage(args: ShowMessageArguments): void }): void {
			Object.keys(this.messages).forEach(message => {
				connection.publishShowMessage({ message: message, severity: MessageSeverity.Error });
			});
		}
	}

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
			connection.publishLogMessage({ severity: MessageSeverity.Error, message: `Safe Runner failed with message: ${message}`});
		} else {
			connection.publishLogMessage({ severity: MessageSeverity.Error, message: 'Safe Runner failed unexpectedly.'});
		}
	}

	function validate(document: Document): void {
		let result = handler.validate(document);
		doProcess(result, (value) => {
			connection.publishDiagnostics({
				uri: document.uri,
				diagnostics: result as Diagnostic[]
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
			return doProcess(handler.initialize(rootFolder), (value) => {
				if (value && !value.success) {
					return value;
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
		trackedDocuments[event.uri] = document;
		process.nextTick(() => safeRunner(document, validate));
	});

	connection.onDidChangeDocument(event => {
		let document = trackedDocuments[event.uri];
		if (document) {
			document.setText(event.content);
			process.nextTick(() => safeRunner(document, validate));
		}
	});

	connection.onDidCloseDocumet(event => {
		delete trackedDocuments[event.uri];
	});

	connection.onDidChangeConfiguration(eventBody => {
		let settings = eventBody.settings;
		let requestor = new ValidationRequestor();
		if (isFunction(handler.onConfigurationChange)) {
			handler.onConfigurationChange(settings, requestor);
		} else {
			requestor.all();
		}
		process.nextTick(() => safeRunner(requestor.toValidate, validate));
	});

	connection.onDidChangeFiles(args => {
		let requestor = new ValidationRequestor();
		if (isFunction(handler.onFileEvents)) {
			handler.onFileEvents(args.changes, requestor);
		} else {
			requestor.all();
		}
		process.nextTick(() => safeRunner(requestor.toValidate, validate));
	});
}

class Logger implements ILogger {
	private connection: Connection;
	public constructor() {
	}
	public attach(connection: Connection) {
		this.connection = connection;
	}
	public error(message: string): void {
		this.send(MessageSeverity.Error, message);
	}
	public log(message: string): void {
		this.send(MessageSeverity.Warning, message);
	}
	public info(message: string): void {
		this.send(MessageSeverity.Info, message);
	}
	private send(severity: number, message: string) {
		if (this.connection) {
			this.connection.sendEvent(LogMessageEvent.type, { severity, message });
		}
	}
}

function getValidationWorkerConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream) {
	let logger = new Logger();
	let connection = connectWorker(inputStream, outputStream, logger);
	logger.attach(connection);
	return {
		onInitialize: (handler: IRequestHandler<InitializeArguments, InitializeResponse>) => connection.onRequest(InitializeRequest.type, handler),
		onShutdown: (handler: IRequestHandler<ShutdownArguments, ShutdownResponse>) => connection.onRequest(ShutdownRequest.type, handler),
		onExit: (handler: IEventHandler<ExitArguments>) => connection.onEvent(ExitEvent.type, handler),

		onDidChangeConfiguration: (handler: IEventHandler<DidChangeConfigurationArguments>) => connection.onEvent(DidChangeConfigurationEvent.type, handler),

		onDidOpenDocument: (handler: IEventHandler<DidOpenDocumentArguments>) => connection.onEvent(DidOpenDocumentEvent.type, handler),
		onDidChangeDocument: (handler: IEventHandler<DidChangeDocumentArguments>) => connection.onEvent(DidChangeDocumentEvent.type, handler),
		onDidCloseDocumet: (handler: IEventHandler<DidCloseDocumentArguments>) => connection.onEvent(DidCloseDocumentEvent.type, handler),

		onDidChangeFiles: (handler: IEventHandler<DidChangeFilesArguments>) => connection.onEvent(DidChangeFilesEvent.type, handler),

		publishDiagnostics: (args: PublishDiagnosticsArguments) => connection.sendEvent(PublishDiagnosticsEvent.type, args),
		publishLogMessage: (args: LogMessageArguments) => connection.sendEvent(LogMessageEvent.type, args),
		publishShowMessage: (args: ShowMessageArguments) => connection.sendEvent(ShowMessageEvent.type, args),

		dispose: () => connection.dispose()
	}
}

function getValidationClientConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream) {
	let logger = new Logger();
	let connection = connectClient(inputStream, outputStream, logger);
	logger.attach(connection);
	return {
		initialize: (args: InitializeArguments) => connection.sendRequest(InitializeRequest.type, args),
		shutdown: (args: ShutdownArguments) => connection.sendRequest(ShutdownRequest.type, args),
		exit: () => connection.sendEvent(ExitEvent.type),

		publishConfigurationDidChange: (args: DidChangeConfigurationArguments) => connection.sendEvent(DidChangeConfigurationEvent.type, args),

		publishDocumentDidOpen: (args: DidOpenDocumentArguments) => connection.sendEvent(DidOpenDocumentEvent.type, args),
		publishDocumentDidChange: (args: DidChangeDocumentArguments) => connection.sendEvent(DidChangeDocumentEvent.type, args),
		publishDocumentDidClose: (args: DidCloseDocumentArguments) => connection.sendEvent(DidCloseDocumentEvent.type, args),

		publishFilesDidChange: (args: DidChangeFilesArguments) => connection.sendEvent(DidChangeFilesEvent.type, args),

		onDiagnosticEvent: (handler: IEventHandler<PublishDiagnosticsArguments>) => connection.onEvent(PublishDiagnosticsEvent.type, handler),
		onLogMessage: (handler: IEventHandler<LogMessageArguments>) => connection.onEvent(LogMessageEvent.type, handler),
		onShowMessage: (handler: IEventHandler<ShowMessageArguments>) => connection.onEvent(ShowMessageEvent.type, handler),

		dispose: () => connection.dispose()
	}
}