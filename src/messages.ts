/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
 'use strict';

/**
 * Message kinds.
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
 * Tests if the given message is a request message
 */
export function isRequest(message: Message): message is RequestMessage {
	return message.type === Message.Request;
}

/**
 * Tests if the given message is a event message
 */
export function isEvent(message: Message): message is EventMessage {
	return message.type === Message.Event;
}

/**
 * Tests if the given message is a response message
 */
export function isResponse(message: Message): message is ResponseMessage {
	return message.type === Message.Response;
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

export interface Request {
	/**
	 * Object containing arguments for the command
	 */
	arguments?: any;	
}

/**
 * Request message
 */
export interface RequestMessage extends Message, Request {
	/**
	 * The command to execute
	 */
	command: string;

}

export interface RequestType<T, R extends Response> {
	command: string;
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

/**
 * Response by server to client request message.
 */
export interface ResponseMessage extends Message, Response {
	/**
	 * Sequence number of the request message.
	 */
	request_seq: number;

	/**
	 * The command requested.
	 */
	command: string;
}

/**
 * Event message
 */
export interface EventMessage extends Message {
	/**
	 * Name of event
	 */
	event: string;

	/**
	 * Event-specific information
	 */
	body?: any;
}

export interface EventType<T> {
	event: string;
}