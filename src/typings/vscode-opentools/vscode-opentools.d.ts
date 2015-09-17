/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
export interface Contents {
	[uri: string]: string;
}
export interface Diagnostics {
	[uri: string]: Diagnostic[];
}
export interface Subscriptions {
	filePathPatterns?: string[];
	mimeTypes?: string[];
	configFilePathPatterns?: string[];
}
export interface SingleFileValidator {
	startValidation(root: string, settings: any): Subscriptions;
	stopValidation(): void;
	configurationChanged(addedURIs: string[], removedURIs: string[], changedURIs: string[]): boolean | Thenable<boolean>;
	validate(contents: Contents): Diagnostics | Thenable<Diagnostics>;
	shutdown(): any;
}
export function runSingleFileValidator(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, handler: SingleFileValidator): void;
export function getValidationHostConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream): {
	onInitialize: (handler: IRequestHandler<InitializeArguments, InitializeResponse>) => void;
	onConfigureValidator: (handler: IRequestHandler<ConfigureValidatorArguments, ConfigureValidatorResponse>) => void;
	onShutdown: (handler: IRequestHandler<ShutdownArguments, ShutdownResponse>) => void;
	requestFileEvents: (body: RequestFileEventsArguments) => Thenable<RequestFileEventsResponse>;
	requestDocumentEvents: (body: RequestDocumentEventsArguments) => Thenable<RequestDocumentEventsResponse>;
	requestDocuments: (body: RequestDocumentsArguments) => Thenable<RequestDocumentsResponse>;
	sendValidationEvent: (body: ValidationEventBody) => void;
	onConfigureEvent: (handler: IEventHandler<ConfigureEventBody>) => void;
	onFileEvent: (handler: IEventHandler<FileEventBody>) => void;
	onDocumentEvent: (handler: IEventHandler<DocumentEventBody>) => void;
	dispose: () => void;
};
export function getValidationClientConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream): {
	initialize: (args: InitializeArguments) => Thenable<InitializeResponse>;
	configureValidator: (args: ConfigureValidatorArguments) => Thenable<ConfigureValidatorResponse>;
	shutdown: (args: ShutdownArguments) => Thenable<ShutdownResponse>;
	onRequestFileEvents: (handler: IRequestHandler<RequestFileEventsArguments, RequestFileEventsResponse>) => void;
	onRequestDocumentEvents: (handler: IRequestHandler<RequestDocumentEventsArguments, RequestDocumentEventsResponse>) => void;
	onRequestDocument: (handler: IRequestHandler<RequestDocumentsArguments, RequestDocumentsResponse>) => void;
	sendConfigureEvent: (body: ConfigureEventBody) => void;
	sendFilesChangedEvent: (body: FileEventBody) => void;
	sendBuffersChangedEvent: (body: DocumentEventBody) => void;
	onValidationEvent: (handler: IEventHandler<ValidationEventBody>) => void;
	dispose: () => void;
};
/**
* initializeCommand: Host to client.
* Sent once, right after startup
*/
export const initializeCommand: string;
export interface Capabilities {
	validation?: boolean;
}
export interface InitializeArguments {
	rootFolder: string;
	defaultEncoding: string;
	capabilities: Capabilities;
}
export interface InitializeResponse extends Response {
	body: {
		capabilities: Capabilities;
	};
}
/**
* configureEvent: Host to client.
* Sent whenever there is a configuration change
*/
export const configureEvent: string;
export interface ConfigureEventBody {
	defaultEncoding?: string;
}
/**
* configureValidation: Host to client.
* Sent to turn the validator on or off or to set new validator configuration settings
*/
export const configureValidatorCommand: string;
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
export  const requestFileEventsCommand: string;
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
export  const requestDocumentEventsCommand: string;
export interface RequestDocumentEventsArguments {
	filePathPatterns: string[];
	mimeTypes: string[];
}
export interface RequestDocumentEventsResponse extends Response {
	body: {
		buffersOpen: DocumentIdentifier[];
	};
}
/**
* fileEvent: Host to client.
* Used by the host to signal that files have been added, deleted or modified
*/
export  const fileEvent: string;
export interface FileEventBody {
	filesAdded: string[];
	filesRemoved: string[];
	filesChanged: string[];
}
/**
* fileEvent: Host to client.
* Used by the host to signal that documents have been opened, closed or modified
*/
export const documentEvent: string;
export interface DocumentEventBody {
	documentsOpened: DocumentIdentifier[];
	documentsChanged: DocumentIdentifier[];
	documentsClosed: DocumentIdentifier[];
}
/**
* requestDocumentsCommand: Client to host
* Used by the client to ask the host for the latest content of a document or file.
*/
export const requestDocumentsCommand: string;
export interface RequestDocumentsArguments {
	documents: DocumentIdentifier[];
}
export interface RequestDocumentsResponse extends Response {
	body: {
		[uri: string]: {
			content: string;
		};
	};
}
/**
* validationEvent: Client to host
* Used by the client to notify validation marker changes in the open documents
*/
export const validationEvent: string;
export interface ValidationEventBody {
	[uri: string]: {
		m: Diagnostic[];
	};
}
/**
* shutdownCommand: Host to client
* Used by the host to signal to close.
*/
export const shutdownCommand: string;
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
	let Error: number;
	let Warning: number;
	let Info: number;
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

export interface Response {
	/**
	* Outcome of the request.
	*/
	success: boolean;

	/**
	* Contains error message if success === false.
	*/
	message?: string;

	/**
	* Contains error code if success === false. Can
	* be omitted if not available
	*/
	code?: number;
	
	/**
	* Indicates whether the response can be retried 
	* after the provided message has been showed to
	* the user.
	*/
	retry?: boolean;

	/**
	* Contains message body if success === true.
	*/
	body?: any;
}

export interface IRequestHandler<T, U extends Response> {
	(body?: T): Thenable<U> | U;
}

export interface IEventHandler<T> {
	(body?: T): void;
}
