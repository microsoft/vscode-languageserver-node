/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
 'use strict';

import * as is from './is';

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
 * A language server message
 */
export interface Message {
	jsonrpc: string;
}

/**
 * A Json RPC request message
 */
export interface Request {

	/**
	 * The method's params
	 */
	params?: any
}

/**
 * Request message
 */
export interface RequestMessage extends Message, Request {

	/**
	 * The request id;
	 */
	id: number | string;

	/**
	 * The method to be invoked
	 */
	method: string;
}

/**
 * A interface to type the request parameter / response pair
 */
export interface RequestType<P, R extends Response> {
	method: string;
}

/**
 * Predefined error codes.
 */
export namespace ErrorCodes {
	export const ParseError: number = -32700;
	export const InvalidRequest: number = -32600;
	export const MethodNotFound: number = -32601;
	export const InvalidParams: number = -32602;
	export const InternalError: number = -32603;
	export const serverErrorStart: number = -32099
	export const serverErrorEnd: number = -32000;
}

/**
 * A error object return in a response in case a request
 * has failed.
 */
export interface ErrorInfo {
	/**
	 * A number indicating the error type that occured
	 */
	code: number;

	/**
	 * A string providing a short decription of the error.
	 */
	message: string;

	/**
	 * A Primitive or Structured value that contains additional
	 * information about the error. Can be omitted;
	 */
	data?: any;
}

export interface Response {
	/**
	 * The result of a request. This can be omitted in
	 * the case of an error
	 */
	result?: any;

	/**
	 * The error object in case a request fails.
	 */
	error?: ErrorInfo;
}

/**
 * A response message.
 */
export interface ResponseMessage extends Message, Response {
	/**
	 * The request id;
	 */
	id: number | string;
}

export interface Notification {
	/**
	 * The notification's params
	 */
	params?: any
}

/**
 * Notification Message
 */
export interface NotificationMessage extends Message, Notification {
	/**
	 * The method to be invoked
	 */
	method: string;
}

export interface NotificationType<P> {
	method: string;
}

/**
 * Tests if the given message is a request message
 */
export function isRequestMessage(message: Message): message is RequestMessage {
	let candidate = <RequestMessage>message;
	return candidate && is.string(candidate.method) && (is.string(candidate.id) || is.number(candidate.id));
}

/**
 * Tests if the given message is a notification message
 */
export function isNotificationMessage(message: Message): message is NotificationMessage {
	let candidate = <NotificationMessage>message;
	return candidate && is.string(candidate.method) && is.undefined((<any>message).id);
}

/**
 * Tests if the given message is a response message
 */
export function isReponseMessage(message: Message): message is ResponseMessage {
	let candidate = <ResponseMessage>message;
	return candidate && (is.defined(candidate.result) || is.defined(candidate.error)) && (is.string(candidate.id) || is.number(candidate.id));
}

export function isResponse(value: any): value is Response {
	let candidate = value as Response;
	return candidate && (is.defined(candidate.result) || is.defined(candidate.error));
}

export function isFailedResponse(value: any): value is Response {
	let candidate = value as Response;
	return candidate && is.defined(candidate.error) && is.undefined(candidate.result);
}

export function isSuccessfulResponse(value: any): value is Response {
	let candidate = value as Response;
	return candidate && is.defined(candidate.result) && is.undefined(candidate.error);
}