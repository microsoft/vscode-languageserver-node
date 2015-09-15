/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { Response } from './messages';
import { IRequestHandler, IEventHandler, Connection, connect } from './connection';


export function getValidationHostConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream) {
	var connection = connect(inputStream, outputStream);
	return {
		onInitializeRequest: (handler: IRequestHandler<InitializeArguments, InitializeResponse>) => connection.onRequest(initializeCommand, handler),
		onConfigureValidationRequest: (handler: IRequestHandler<ConfigureValidationArguments, ConfigureValidationResponse>) => connection.onRequest(configureValidationCommand, handler),
		onShutdownRequest: (handler: IRequestHandler<ShutdownArguments, ShutdownResponse>) => connection.onRequest(shutdownCommand, handler),
		
		requestFileEvents: (body: SubscribeFileEventsArguments) => <Thenable<SubscribeFileEventsResponse>> connection.sendRequest(subscribeFileEventsCommand, body),
		requestBufferEvents: (body: SubscribeBufferEventsArguments) => <Thenable<SubscribeBufferEventsResponse>> connection.sendRequest(subscribeBufferEventsCommand, body),
		requestTextBuffers: (body: GetTextBufferArguments) => <Thenable<GetTextBuffersResponse>> connection.sendRequest(getTextBuffersCommand, body),
	
		sendValidationEvent: (body: ValidationEventBody) => connection.sendEvent(validationEvent, body),
		
		onConfigureEvent: (handler: IEventHandler<ConfigureEventBody>) => connection.onEvent(configureEvent, handler),
		onFilesChangedEvent: (handler: IEventHandler<FilesChangedEventBody>) => connection.onEvent(filesChangedEvent, handler),
		onBuffersChangedEvent: (handler: IEventHandler<BufferChangedEventBody>) => connection.onEvent(buffersChangedEvent, handler),
		dispose: () => connection.dispose()
	}
}

/* Connection from client to host */
export interface ValidationHostConnection extends Connection {
	onRequest(command: string, handler: IRequestHandler<any, Response>) : void;
	onRequest(command: 'initialize', handler: IRequestHandler<InitializeArguments, InitializeResponse>) : void;
	onRequest(command: 'configureValidation', handler: IRequestHandler<ConfigureValidationArguments, ConfigureValidationResponse>) : void;
	onRequest(command: 'shutdown', handler: IRequestHandler<ShutdownArguments, ShutdownResponse>) : void;	
	
	sendRequest(command: string, args: any) : Thenable<Response>;
	sendRequest(command: 'subscribeFileEvents', args: SubscribeFileEventsArguments) : Thenable<SubscribeFileEventsResponse>;
	sendRequest(command: 'subscribeBufferEvents', args: SubscribeBufferEventsArguments) : Thenable<SubscribeBufferEventsResponse>;	
	sendRequest(command: 'getTextBuffers', args: GetTextBufferArguments) : Thenable<GetTextBuffersResponse>;

	sendEvent(event: string, body?: any) : void;
	sendEvent(event: 'validationEvent', body: ValidationEventBody) : void;
	
	onEvent(event: string, handler: IEventHandler<any>) : void;
	onEvent(event: 'configureEvent', handler: IEventHandler<ConfigureEventBody>) : void;
	onEvent(event: 'filesChangedEvent', handler: IEventHandler<FilesChangedEventBody>) : void;
	onEvent(event: 'buffersChangedEvent', handler: IEventHandler<BufferChangedEventBody>) : void;	
	dispose(): void;
}

/* Connection from host to client */
export interface ValidationClientConnection extends Connection {
	sendRequest(command: string, args: any) : Thenable<Response>;
	sendRequest(command: 'initialize', args: InitializeArguments) : Thenable<InitializeResponse>;
	sendRequest(command: 'configureValidation', args: ConfigureValidationArguments) : Thenable<ConfigureValidationResponse>;
	sendRequest(command: 'shutdown', args: ShutdownArguments) : Thenable<ShutdownResponse>;
	
	onRequest(command: string, handler: IRequestHandler<any, Response>) : void;
	onRequest(command: 'getTextBuffers', handler: IRequestHandler<GetTextBufferArguments, GetTextBuffersResponse>): void;

	sendEvent(event: string, body?: any) : void;
	sendEvent(event: 'configureEvent', body?: ConfigureEventBody) : void;
	
	onEvent(event: string, handler: IEventHandler<any>) : void;
	onEvent(event: 'validationEvent', handler?: IEventHandler<ValidationEventBody>) : void;	
	dispose(): void;
}


// initializeCommand: Host to client
// Sent once, right after startup

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

export const configureEvent: string = 'configureEvent';

export interface ConfigureEventBody {
	defaultEncoding?: string;
}



// configureValidation: Host to client
// Configures the validation with user or workspace settings

export const configureValidationCommand: string = 'configureValidation';

export interface ConfigureValidationArguments {
	enable: boolean;
	settings?: any;
}

export interface ConfigureValidationResponse extends Response {
}

// subscribeFileEventsCommand: Client to host
// Used by the client to ask the host to send file events for the given file path patterns
// When called multiple times, the filePathsPatterns of the latest call are used

export const subscribeFileEventsCommand: string = 'subscribeFileEvents';

export interface SubscribeFileEventsArguments {
	filePathPatterns: string[];
}

export interface SubscribeFileEventsResponse extends Response {
}

// subscribeBufferEventsCommand: Client to host
// Used by the client to ask the host to send buffer events for the given file path patterns
// The host replies with the currently open buffers
// When called multiple times, the filePaths of the latest call are used

export const subscribeBufferEventsCommand: string = 'subscribeBufferEvents';

export interface SubscribeBufferEventsArguments {
	filePathPatterns: string[];
}

export interface SubscribeBufferEventsResponse extends Response {
	body: { 
		buffersOpen: TextBufferIdentifier[]
	}
}

// filesChangedEvent: Host to client
// Used by the host to signal that files have been added, deleted or that files have changed
export const filesChangedEvent: string = 'filesChangedEvent';
export interface FilesChangedEventBody {
	filesAdded: string[];
	filesRemoved: string[];
	filesChanged: string[];
}

// buffersChangedEvent: Host to client
// Used by the host to signal that buffers have been opened, changed or closed
export const buffersChangedEvent: string = 'buffersChangedEvent';
export interface BufferChangedEventBody {
	buffersOpened: TextBufferIdentifier[];
	buffersChanged: TextBufferIdentifier[];
	buffersClosed: TextBufferIdentifier[];
}


// getDocumentCommand: Client to host
// Used by the client to ask the host for the latest content of a buffer or file. 

export const getTextBuffersCommand: string = 'getTextBuffers';

export interface GetTextBufferArguments {
	textBuffers: TextBufferIdentifier[];
}

export interface GetTextBuffersResponse extends Response {
	body: {
		[uri:string]: {
			content: string
		}
	}
}

// validationEvent: Client to host
// Used by the client to notify validation marker changes in the open buffers
export const validationEvent: string = 'validationEvent';
export interface ValidationEventBody {
	[uri:string]: {
		m: Diagnostic[]
	}
}


// shutdownCommand: Host to client
// Used by the host to signal to close.

export const shutdownCommand: string = 'shutdown';

export interface ShutdownArguments {
}

export interface ShutdownResponse extends Response {
}

export interface TextBufferIdentifier {
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

