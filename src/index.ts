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
	onConfigurationChange(settings: any, requestor: IValidationRequestor): void;
	onFileEvent(event: FileEvent, requestor: IValidationRequestor): void;
	shutdown();
}

export function runSingleFileValidator(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, handler: SingleFileValidator) : void {
	runSingleFileValidator(inputStream, outputStream, handler);
}

// -------------- validator open tools protocol -------------------

export function getValidationWorkerConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream) {
	let connection = connectWorker(inputStream, outputStream);
	return {
		onInitialize: (handler: IRequestHandler<InitializeArguments, InitializeResponse>) => connection.onRequest(InitializeRequest.command, handler),
		onShutdown: (handler: IRequestHandler<ShutdownArguments, ShutdownResponse>) => connection.onRequest(ShutdownRequest.command, handler),
		onExit: (handler: IEventHandler<ExitArguments>) => connection.onEvent(ExitEvent.command, handler),
		
		onConfigurationChange: (handler: IEventHandler<ConfigurationChangeArguments>) => connection.onEvent(ConfigurationChangeEvent.command, handler),
		
		onDocumentOpen: (handler: IEventHandler<DocumentOpenArguments>) => connection.onEvent(DocumentOpenEvent.command, handler),
		onDocumentChange: (handler: IEventHandler<DocumentChangeArguments>) => connection.onEvent(DocumentChangeEvent.command, handler),
		onDocumetClose: (handler: IEventHandler<DocumentCloseArguments>) => connection.onEvent(DocumentChangeEvent.command, handler),
		
		onFileEvent: (handler: IEventHandler<FileEventArguments>) => connection.onEvent(FileEvent.command, handler),
		
		sendDiagnosticEvent: (body: DiagnosticEventArguments) => connection.sendEvent(DiagnosticEvent.command, body),
		
		dispose: () => connection.dispose()
	}
}

export function getValidationClientConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream) {
	let connection = connectClient(inputStream, outputStream);
	return {
		initialize: (args: InitializeArguments) => connection.sendRequest(InitializeRequest.command, args) as Thenable<InitializeResponse>,
		shutdown: (args: ShutdownArguments) => connection.sendRequest(ShutdownRequest.command, args) as Thenable<ShutdownResponse>,
		exit: () => connection.sendEvent(ExitEvent.command),
		
		configurationChange: (body: ConfigurationChangeArguments) => connection.sendEvent(ConfigurationChangeEvent.command, body),
		
		documentOpen: (body: DocumentOpenArguments) => connection.sendEvent(DocumentOpenEvent.command, body),
		documentChange: (body: DocumentChangeArguments) => connection.sendEvent(DocumentChangeEvent.command, body),
		documentClose: (body: DocumentCloseArguments) => connection.sendEvent(DocumentCloseEvent.command, body),
		
		fileEvent: (body: FileEventArguments) => connection.sendEvent(FileEvent.command, body),
		
		onDiagnosticEvent: (handler: IEventHandler<DiagnosticEventArguments>) => connection.onEvent(DiagnosticEvent.command, handler),
		
		dispose: () => connection.dispose()
	}
}