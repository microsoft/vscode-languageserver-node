/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { Response } from './messages';
import {
		InitializeRequest, InitializeArguments, InitializeResponse, Capabilities,
		ShutdownRequest, ShutdownArguments, ShutdownResponse,
		ExitEvent, ExitArguments,
		ConfigurationChangeEvent, ConfigurationChangeArguments,
		DocumentOpenEvent, DocumentOpenArguments, DocumentChangeEvent, DocumentChangeArguments, DocumentCloseEvent, DocumentCloseArguments,
		FileEvent, FileEventArguments,
		DiagnosticEvent, DiagnosticEventArguments, Diagnostic, Severity, Location
	} from './protocol';
import { IRequestHandler, IEventHandler, WorkerConnection, connectWorker, ClientConnection, connectClient } from './connection';

// Reexport the plubic available API.
export { Response, InitializeResponse, Diagnostic, Severity, Location }

// -------------- single file validator -------------------

export type Result<T> = T | Thenable<T>;

export interface IDocument {
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

	let validationSupportEnabled = false;
	let validationTrigger: NodeJS.Timer = null;

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

	function validate(document: Document): void {
		let result = handler.validate(document);
		doProcess(result, (value) => {
			connection.sendDiagnosticEvent({
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
		process.nextTick(() => { validate(document); });
	});

	connection.onDidChangeDocument(event => {
		let document = trackedDocuments[event.uri];
		if (document) {
			document.setText(event.content);
			process.nextTick(() => { validate(document); });
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
		process.nextTick(() => {
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
		process.nextTick(() => {
			requestor.toValidate.forEach(document => {
				validate(document);
			});
		});
	});
}

function getValidationWorkerConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream) {
	let connection = connectWorker(inputStream, outputStream);
	return {
		onInitialize: (handler: IRequestHandler<InitializeArguments, InitializeResponse>) => connection.onRequest(InitializeRequest.type, handler),
		onShutdown: (handler: IRequestHandler<ShutdownArguments, ShutdownResponse>) => connection.onRequest(ShutdownRequest.type, handler),
		onExit: (handler: IEventHandler<ExitArguments>) => connection.onEvent(ExitEvent.type, handler),

		onDidChangeConfiguration: (handler: IEventHandler<ConfigurationChangeArguments>) => connection.onEvent(ConfigurationChangeEvent.type, handler),

		onDidOpenDocument: (handler: IEventHandler<DocumentOpenArguments>) => connection.onEvent(DocumentOpenEvent.type, handler),
		onDidChangeDocument: (handler: IEventHandler<DocumentChangeArguments>) => connection.onEvent(DocumentChangeEvent.type, handler),
		onDidCloseDocumet: (handler: IEventHandler<DocumentCloseArguments>) => connection.onEvent(DocumentCloseEvent.type, handler),

		onDidChangeFiles: (handler: IEventHandler<FileEventArguments>) => connection.onEvent(FileEvent.type, handler),

		sendDiagnosticEvent: (body: DiagnosticEventArguments) => connection.sendEvent(DiagnosticEvent.type, body),

		dispose: () => connection.dispose()
	}
}

function getValidationClientConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream) {
	let connection = connectClient(inputStream, outputStream);
	return {
		initialize: (args: InitializeArguments) => connection.sendRequest(InitializeRequest.type, args),
		shutdown: (args: ShutdownArguments) => connection.sendRequest(ShutdownRequest.type, args),
		exit: () => connection.sendEvent(ExitEvent.type),

		configurationChange: (body: ConfigurationChangeArguments) => connection.sendEvent(ConfigurationChangeEvent.type, body),

		documentOpen: (body: DocumentOpenArguments) => connection.sendEvent(DocumentOpenEvent.type, body),
		documentChange: (body: DocumentChangeArguments) => connection.sendEvent(DocumentChangeEvent.type, body),
		documentClose: (body: DocumentCloseArguments) => connection.sendEvent(DocumentCloseEvent.type, body),

		fileEvent: (body: FileEventArguments) => connection.sendEvent(FileEvent.type, body),

		onDiagnosticEvent: (handler: IEventHandler<DiagnosticEventArguments>) => connection.onEvent(DiagnosticEvent.type, handler),

		dispose: () => connection.dispose()
	}
}