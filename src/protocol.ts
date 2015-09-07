/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
 'use strict';

/**
 * OpenTools message kinds.
 */
export namespace Message {
	/**
	 * A request message usually send from the client to the server
	 */
	export var Request: string = 'request';

	/**
	 * A message response usually send from the server to the client
	 */
	export var Response: string = 'response';

	/**
	 * A event message usually send asynchronously from the server to the client
	 */
	export var Event: string = 'event';
}

/**
 * An OpenTools message
 */
export interface Message {
	/**
	 * One of 'request', 'response', or 'event'
	 * See also namespace Message
	 */
	type: string;
	
	/**
	 * Sequence number of the message
	 */
	seq: number;
}

/**
 * Client-initiated request message
 */
export interface Request extends Message {
	/**
	 * The command to execute
	 */
	command: string;

	/**
	 * Object containing arguments for the command
	 */
	arguments?: any;
}

/**
 * Response by server to client request message.
 */
export interface Response extends Message {
	/**
	 * Sequence number of the request message.
	 */
	request_seq: number;

	/**
	 * The command requested.
	 */
	command: string;

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

/**
 * Server-initiated event message
 */
export interface Event extends Message {
	/**
	 * Name of event
	 */
	event: string;

	/**
	 * Event-specific information
	 */
	body?: any;
}

export namespace InitializeRequest {
	export let command: string = 'initialize';
}

export interface InitializeRequest extends Request {
}

export interface InitializeReponse extends Response {
}

/**
 * A request to shutdown the open tools server service
 */
export namespace ShutdownRequest {
	 export let command: string = 'showdown';
}

export interface ShutdownRequest extends Request {
}

/**
 * The response for a shutdown request
 */
export interface ShutdownResponse extends Response {
}

export interface ConfigureRequestArgs {
	options?: any;
}

export namespace ConfigureRequest {
	export let command: string = 'configure';
}

export interface ConfigureRequest extends Request {
	arguments?: ConfigureRequestArgs;
}

export interface ConfigureResponse extends Response {
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

export interface DocumentInfo {
	/**
	* Either the full content of the document
	*/
	content?: string;

	/**
	* Or a URI to the resource providing the content. If a URI is used
	* then the document must be opened in the language server before
	* using the 'document/open' command.
	*/
	uri?: string;
}

export interface ValidateRequestArgs {
	documents: DocumentInfo[];
}

export namespace ValidateRequest {
	export let command: string = 'document/validate';
}

export interface ValidateRequest extends Request {
	arguments: ValidateRequestArgs;
}

export interface ValidateResponse extends Response {
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

export interface DiagnosticEventBody {
	/**
	 * The URI for which diagnostic information is reported.
	 */
	uri: string;

	/**
	 * An array of diagnostic information items.
	 */
	diagnostics: Diagnostic[];
}

export namespace DiagnosticEvent {
	export let id: string = 'diagnostics';
}

/**
 * Event send as a result of a validate request.
 */
export interface DiagnosticEvent extends Event {
	body: DiagnosticEventBody;
}