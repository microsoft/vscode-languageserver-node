/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { Response } from './messages';
import {
		InitializeRequest, InitializeArguments, InitializeResponse, Capabilities,
		ShutdownRequest, ShutdownArguments, ShutdownResponse,
		ExitEvent, ExitArguments,
		LogMessageEvent, LogMessageArguments, MessageSeverity,
		DidChangeConfigurationEvent, DidChangeConfigurationArguments,
		DidOpenDocumentEvent, DidOpenDocumentArguments, DidChangeDocumentEvent, DidChangeDocumentArguments, DidCloseDocumentEvent, DidCloseDocumentArguments,
		DidChangeFilesEvent, DidChangeFilesArguments,
		PublishDiagnosticsEvent, PublishDiagnosticsArguments, Diagnostic, Severity, Location
	} from './protocol';
import { IRequestHandler, IEventHandler, Connection, WorkerConnection, connectWorker, ClientConnection, connectClient, ILogger } from './connection';

// ------------- Reexport the API surface of the language worker API ----------------------
export { Response, InitializeResponse, Diagnostic, Severity, Location }

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

export interface FileEvent {
	filesAdded: string[];
	filesRemoved: string[];
	filesChanged: string[];
}

export interface SingleFileValidator {
	initialize?(rootFolder: string): Result<InitializeResponse>;
	validate(document: IDocument): Result<Diagnostic[]>;
	onConfigurationChange?(settings: any, requestor: IValidationRequestor): void;
	onFileEvent?(event: FileEvent, requestor: IValidationRequestor): void;
	shutdown?();
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
			return Object.keys(this._toValidate).map(key => this.toValidate[key]);
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

	function isFunction(arg: any): arg is Function {
		return Object.prototype.toString.call(arg) === '[object Function]';
	}

	function doProcess<T, R>(result: Result<T>, complete: (value: T) => Result<R>, error?: (error: any) => void): Result<R> {
		if (isFunction((result as Thenable<T>).then)) {
			return (result as Thenable<T>).then(complete, error);
		} else {
			return complete(result as T);
		}
	}

	function safeRunner(func: () => void): void {
		process.nextTick(() => {
			try {
				func();
			} catch (error) {
				if (error.message) {
					connection.publishLogMessage({ severity: MessageSeverity.Error, message: `Safe Runner failed with message: ${error.message}`});
				} else {
					connection.publishLogMessage({ severity: MessageSeverity.Error, message: 'Safe Runner failed unexpectedly.'});
				}
			}
		});
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
		safeRunner(() => { validate(document); });
	});

	connection.onDidChangeDocument(event => {
		let document = trackedDocuments[event.uri];
		if (document) {
			document.setText(event.content);
			safeRunner(() => { validate(document); });
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
		safeRunner(() => {
			requestor.toValidate.forEach(document => {
				validate(document);
			});
		});
	});

	connection.onDidChangeFiles(fileEvent => {
		let requestor = new ValidationRequestor();
		if (isFunction(handler.onFileEvent)) {
			handler.onFileEvent(fileEvent, requestor);
		} else {
			requestor.all();
		}
		safeRunner(() => {
			requestor.toValidate.forEach(document => {
				validate(document);
			});
		});
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

		dispose: () => connection.dispose()
	}
}