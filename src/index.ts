/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { Response } from './messages';
import { 
		InitializeRequest, InitializeArguments, InitializeResponse,
		ShutdownRequest, ShutdownArguments, ShutdownResponse,
		ExitEvent, ExitArguments,
		ConfigurationChangeEvent, ConfigurationChangeArguments,
		DocumentOpenEvent, DocumentOpenArguments, DocumentChangeEvent, DocumentChangeArguments, DocumentCloseEvent, DocumentCloseArguments,
		FileEvent, FileEventArguments,
		DiagnosticEvent, DiagnosticEventArguments, Diagnostic
	} from './protocol';
import { IRequestHandler, IEventHandler, WorkerConnection, connectWorker, ClientConnection, connectClient } from './connection';
import { runSingleFileValidator } from './singleFileValidator';

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
	validate(document: IDocument): Result<Diagnostic[]>;
	onConfigurationChange?(settings: any, requestor: IValidationRequestor): void;
	onFileEvent?(event: FileEvent, requestor: IValidationRequestor): void;
	shutdown?();
}

export function runSingleFileValidator(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, handler: SingleFileValidator) : void {
	runSingleFileValidator(inputStream, outputStream, handler);
}

// -------------- validator open tools protocol -------------------

export function getValidationWorkerConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream) {
	let connection = connectWorker(inputStream, outputStream);
	return {
		onInitialize: (handler: IRequestHandler<InitializeArguments, InitializeResponse>) => connection.onRequest(InitializeRequest.type, handler),
		onShutdown: (handler: IRequestHandler<ShutdownArguments, ShutdownResponse>) => connection.onRequest(ShutdownRequest.type, handler),
		onExit: (handler: IEventHandler<ExitArguments>) => connection.onEvent(ExitEvent.type, handler),
		
		onConfigurationChange: (handler: IEventHandler<ConfigurationChangeArguments>) => connection.onEvent(ConfigurationChangeEvent.type, handler),
		
		onDocumentOpen: (handler: IEventHandler<DocumentOpenArguments>) => connection.onEvent(DocumentOpenEvent.type, handler),
		onDocumentChange: (handler: IEventHandler<DocumentChangeArguments>) => connection.onEvent(DocumentChangeEvent.type, handler),
		onDocumetClose: (handler: IEventHandler<DocumentCloseArguments>) => connection.onEvent(DocumentChangeEvent.type, handler),
		
		onFileEvent: (handler: IEventHandler<FileEventArguments>) => connection.onEvent(FileEvent.type, handler),
		
		sendDiagnosticEvent: (body: DiagnosticEventArguments) => connection.sendEvent(DiagnosticEvent.type, body),
		
		dispose: () => connection.dispose()
	}
}

export function getValidationClientConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream) {
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