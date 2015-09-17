/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { Response } from './messages';
import { IRequestHandler, IEventHandler, Connection, connect } from './connection';
import { runSingleFileValidator } from './singleFileValidator';


// -------------- single file validator -------------------

export interface Contents {
	[uri:string]: string;
}

export interface Diagnostics {
	[uri:string]: Diagnostic[];
}

export interface Subscriptions {
	filePathPatterns?: string[];
	mimeTypes?: string[];
	configFilePathPatterns?: string[];
}

export interface SingleFileValidator {
	startValidation(root: string,  settings: any) : Subscriptions;
	stopValidation(): void;
	configurationChanged(addedURIs: string[], removedURIs: string[], changedURIs: string[]) : boolean | Thenable<boolean>;
	validate(contents: Contents): Diagnostics | Thenable<Diagnostics>;
	shutdown();
}


export function runSingleFileValidator(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, handler: SingleFileValidator) : void {
	runSingleFileValidator(inputStream, outputStream, handler);
}


// -------------- validator open tools protocol -------------------

export function getValidationHostConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream) {
	var connection = connect(inputStream, outputStream);
	return {
		onInitialize: (handler: IRequestHandler<InitializeArguments, InitializeResponse>) => connection.onRequest(initializeCommand, handler),
		onConfigureValidator: (handler: IRequestHandler<ConfigureValidatorArguments, ConfigureValidatorResponse>) => connection.onRequest(configureValidatorCommand, handler),
		onShutdown: (handler: IRequestHandler<ShutdownArguments, ShutdownResponse>) => connection.onRequest(shutdownCommand, handler),
		
		requestFileEvents: (body: RequestFileEventsArguments) => <Thenable<RequestFileEventsResponse>> connection.sendRequest(requestFileEventsCommand, body),
		requestDocumentEvents: (body: RequestDocumentEventsArguments) => <Thenable<RequestDocumentEventsResponse>> connection.sendRequest(requestDocumentEventsCommand, body),
		requestDocuments: (body: RequestDocumentsArguments) => <Thenable<RequestDocumentsResponse>> connection.sendRequest(requestDocumentsCommand, body),
	
		sendValidationEvent: (body: ValidationEventBody) => connection.sendEvent(validationEvent, body),
		
		onConfigureEvent: (handler: IEventHandler<ConfigureEventBody>) => connection.onEvent(configureEvent, handler),
		onFileEvent: (handler: IEventHandler<FileEventBody>) => connection.onEvent(fileEvent, handler),
		onDocumentEvent: (handler: IEventHandler<DocumentEventBody>) => connection.onEvent(documentEvent, handler),
		dispose: () => connection.dispose()
	}
}

export function getValidationClientConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream) {
	var connection = connect(inputStream, outputStream);
	return {
		initialize: (args: InitializeArguments) => <Thenable<InitializeResponse>> connection.sendRequest(initializeCommand, args),
		configureValidator: (args: ConfigureValidatorArguments) => <Thenable<ConfigureValidatorResponse>> connection.sendRequest(configureValidatorCommand, args),
		shutdown: (args: ShutdownArguments) => <Thenable<ShutdownResponse>> connection.sendRequest(shutdownCommand, args),
		
		onRequestFileEvents: (handler: IRequestHandler<RequestFileEventsArguments, RequestFileEventsResponse>) => connection.onRequest(requestFileEventsCommand, handler),
		onRequestDocumentEvents: (handler: IRequestHandler<RequestDocumentEventsArguments, RequestDocumentEventsResponse>) => connection.onRequest(requestDocumentEventsCommand, handler),
		onRequestDocument: (handler: IRequestHandler<RequestDocumentsArguments, RequestDocumentsResponse>) => connection.onRequest(requestDocumentsCommand, handler),
			
		sendConfigureEvent: (body: ConfigureEventBody) => connection.sendEvent(configureEvent, body),
		sendFilesChangedEvent: (body: FileEventBody) => connection.sendEvent(fileEvent, body),
		sendBuffersChangedEvent: (body: DocumentEventBody) => connection.sendEvent(documentEvent, body),
		
		onValidationEvent: (handler: IEventHandler<ValidationEventBody>) => connection.onEvent(validationEvent, handler),

		dispose: () => connection.dispose()
	}
}

/**
 * initializeCommand: Host to client.
 * Sent once, right after startup
 */
export const initializeCommand: string = 'initialize';

export interface Capabilities {
	validation?: boolean;
}

export interface InitializeArguments {
	rootFolder: string;
	defaultEncoding: string;
	capabilities: Capabilities;
}

export interface InitializeResponse extends Response {
	body: { capabilities: Capabilities; }
}

/**
 * configureEvent: Host to client.
 * Sent whenever there is a configuration change
 */
export const configureEvent: string = 'configureEvent';

export interface ConfigureEventBody {
	defaultEncoding?: string;
}


/**
 * configureValidation: Host to client.
 * Sent to turn the validator on or off or to set new validator configuration settings
 */
export const configureValidatorCommand: string = 'configureValidator';

export interface ConfigureValidatorArguments {
	enable: boolean;
	settings?: any;
}

export interface ConfigureValidatorResponse extends Response {
}

/**
 * requestFileEventsCommand: Client to host
 * Used by the client to ask the host to send file events for the given file path patterns
 * When called multiple times, the arguments of the last call replace arguments of the previous call
 */
export const requestFileEventsCommand: string = 'requestFileEvents';

export interface RequestFileEventsArguments {
	filePathPatterns: string[];
}

export interface RequestFileEventsResponse extends Response {
}

/**
 * requestDocumentEventsCommand: Client to host
 * Used by the client to ask the host to send document events for the given file path patterns and/or mime types
 * When called multiple times, the arguments of the last call replace arguments of the previous call
 */
export const requestDocumentEventsCommand: string = 'requestDocumentEvents';

export interface RequestDocumentEventsArguments {
	filePathPatterns: string[];
	mimeTypes: string[];
}

export interface RequestDocumentEventsResponse extends Response {
	body: { 
		buffersOpen: DocumentIdentifier[]
	}
}

/**
 * fileEvent: Host to client.
 * Used by the host to signal that files have been added, deleted or modified
 */
export const fileEvent: string = 'fileEvent';
export interface FileEventBody {
	filesAdded: string[];
	filesRemoved: string[];
	filesChanged: string[];
}

/**
 * fileEvent: Host to client.
 * Used by the host to signal that documents have been opened, closed or modified
 */
export const documentEvent: string = 'documentEvent';
export interface DocumentEventBody {
	documentsOpened: DocumentIdentifier[];
	documentsChanged: DocumentIdentifier[];
	documentsClosed: DocumentIdentifier[];
}

/**
 * requestDocumentsCommand: Client to host
 * Used by the client to ask the host for the latest content of a document or file. 
 */
export const requestDocumentsCommand: string = 'requestDocuments';

export interface RequestDocumentsArguments {
	documents: DocumentIdentifier[];
}

export interface RequestDocumentsResponse extends Response {
	body: {
		[uri:string]: {
			content: string
		}
	}
}

/**
 * validationEvent: Client to host
 * Used by the client to notify validation marker changes in the open documents
 */
export const validationEvent: string = 'validationEvent';
export interface ValidationEventBody {
	[uri:string]: {
		m: Diagnostic[]
	}
}

/**
 * shutdownCommand: Host to client
 * Used by the host to signal to close.
 */
export const shutdownCommand: string = 'shutdown';

export interface ShutdownArguments {
}

export interface ShutdownResponse extends Response {
}

export interface DocumentIdentifier {
	uri: string;
}

/**
 * Location in document expressed as (one-based) line and character offset.
 */
export interface Location {
	/**
	 * Line location in a document (one-based)
	 */
	line: number;

	/**
	 * Character offset on a line in a document (one-based)
	 */
	offset: number;
}


export namespace Severity {
	export let Error: number = 1;
	export let Warning: number = 2;
	export let Info: number = 3;	
}

/**
 * Item of diagnostic information found in a DiagnosticEvent message.
 */
export interface Diagnostic {
	/**
	 * Starting file location at which text appies.
	 */
	start: Location;

	/**
	 * The last file location at which the text applies. Can be omitted.
	 */
	end?: Location;

	/**
	 * The diagnostic's severity. Can be omitted. If omitted it is up to the
	 * client to interpret diagnostics as error, warning or info. 
	 */
	severity?: number;
	
	/**
	 * The diagnostic code. Can be omitted.
	 */
	code?: string;

	/**
	 * The diagnostic message.
	 */
	message: string;
}

