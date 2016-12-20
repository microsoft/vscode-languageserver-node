/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as is from './is';

/**
 * A language server message
 */
export interface Message {
	jsonrpc: string;
}

/**
 * Request message
 */
export interface RequestMessage extends Message {

	/**
	 * The request id.
	 */
	id: number | string;

	/**
	 * The method to be invoked.
	 */
	method: string;

	/**
	 * The method's params.
	 */
	params?: any
}

/**
 * Predefined error codes.
 */
export namespace ErrorCodes {
	// Defined by JSON RPC
	export const ParseError: number = -32700;
	export const InvalidRequest: number = -32600;
	export const MethodNotFound: number = -32601;
	export const InvalidParams: number = -32602;
	export const InternalError: number = -32603;
	export const serverErrorStart: number = -32099
	export const serverErrorEnd: number = -32000;
	export const ServerNotInitialized: number = -32002;
	export const UnknownErrorCode: number = -32001;

	// Defined by VSCode.
	export const MessageWriteError: number = 1;
	export const MessageReadError: number = 2;
}

export interface ResponseErrorLiteral<D> {
	/**
	 * A number indicating the error type that occured.
	 */
	code: number;

	/**
	 * A string providing a short decription of the error.
	 */
	message: string;

	/**
	 * A Primitive or Structured value that contains additional
	 * information about the error. Can be omitted.
	 */
	data?: D;
}

/**
 * A error object return in a response in case a request
 * has failed.
 */
export class ResponseError<D> extends Error {

	public readonly code: number;
	public readonly data: D;

	constructor(code: number, message: string, data?: D) {
		super(message);
		this.code = is.number(code) ? code : ErrorCodes.UnknownErrorCode;
		if (data !== void 0) {
			this.data = data;
		}
		Object.setPrototypeOf(this, ResponseError.prototype);
	}

	public toJson(): ResponseErrorLiteral<D> {
		let result: ResponseErrorLiteral<D> = {
			code: this.code,
			message: this.message
		};
		if (this.data !== void 0) {
			result.data = this.data
		};
		return result;
	}
}

/**
 * A response message.
 */
export interface ResponseMessage extends Message {
	/**
	 * The request id.
	 */
	id: number | string;

	/**
	 * The result of a request. This can be omitted in
	 * the case of an error.
	 */
	result?: any;

	/**
	 * The error object in case a request fails.
	 */
	error?: ResponseErrorLiteral<any>;
}

/**
 * An interface to type messages.
 */
export interface MessageType {
	readonly method: string;
	readonly numberOfParams: number;
}

/**
 * An abstract implementation of a MessageType.
 */
export abstract class AbstractMessageType implements MessageType {
	constructor(private _method: string, private _numberOfParams: number) {
	}

	get method(): string {
		return this._method;
	}

	get numberOfParams(): number {
		return this._numberOfParams;
	}
}

/**
 * End marker interface for request and notification types.
 */
export interface _EM {
	_$endMarker$_: number;
}

/**
 * Classes to type request response pairs
 */
export class RequestType0<R, E, RO> extends AbstractMessageType {
	private _?: [R, E, RO, _EM];
	constructor(method: string) {
		super(method, 0);
		this._ = undefined;
	}
}

export class RequestType<P, R, E, RO> extends AbstractMessageType {
	private _?: [P, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 1);
		this._ = undefined;
	}
}


export class RequestType1<P1, R, E, RO> extends AbstractMessageType {
	private _?: [P1, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 1);
		this._ = undefined;
	}
}

export class RequestType2<P1, P2, R, E, RO> extends AbstractMessageType {
	private _?: [P1, P2, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 2);
		this._ = undefined;
	}
}

export class RequestType3<P1, P2, P3, R, E, RO> extends AbstractMessageType {
	private _?: [P1, P2, P3, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 3);
		this._ = undefined;
	}
}

export class RequestType4<P1, P2, P3, P4, R, E, RO> extends AbstractMessageType {
	private _?: [P1, P2, P3, P4, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 4);
		this._ = undefined;
	}
}

export class RequestType5<P1, P2, P3, P4, P5, R, E, RO> extends AbstractMessageType {
	private _?: [P1, P2, P3, P4, P5, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 5);
		this._ = undefined;
	}
}

export class RequestType6<P1, P2, P3, P4, P5, P6, R, E, RO> extends AbstractMessageType {
	private _?: [P1, P2, P3, P4, P5, P6, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 6);
		this._ = undefined;
	}
}

export class RequestType7<P1, P2, P3, P4, P5, P6, P7, R, E, RO> extends AbstractMessageType {
	private _?: [P1, P2, P3, P4, P5, P6, P7, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 7);
		this._ = undefined;
	}
}

export class RequestType8<P1, P2, P3, P4, P5, P6, P7, P8, R, E, RO> extends AbstractMessageType {
	private _?: [P1, P2, P3, P4, P5, P6, P7, P8, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 8);
		this._ = undefined;
	}
}

export class RequestType9<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E, RO> extends AbstractMessageType {
	private _?: [P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E, RO, _EM];
	constructor(method: string) {
		super(method, 9);
		this._ = undefined;
	}
}

/**
 * Notification Message
 */
export interface NotificationMessage extends Message {
	/**
	 * The method to be invoked.
	 */
	method: string;

	/**
	 * The notification's params.
	 */
	params?: any
}

export class NotificationType<P, RO> extends AbstractMessageType {
	private _?: [P, RO, _EM];
	constructor(method: string) {
		super(method, 1);
		this._ = undefined;
	}
}

export class NotificationType0<RO> extends AbstractMessageType {
	private _?: [RO, _EM];
	constructor(method: string) {
		super(method, 0);
		this._ = undefined;
	}
}

export class NotificationType1<P1, RO> extends AbstractMessageType {
	private _?: [P1, RO, _EM];
	constructor(method: string) {
		super(method, 1);
		this._ = undefined;
	}
}

export class NotificationType2<P1, P2, RO> extends AbstractMessageType {
	private _?: [P1, P2, RO, _EM];
	constructor(method: string) {
		super(method, 2);
		this._ = undefined;
	}
}

export class NotificationType3<P1, P2, P3, RO> extends AbstractMessageType {
	private _?: [P1, P2, P3, RO, _EM];
	constructor(method: string) {
		super(method, 3);
		this._ = undefined;
	}
}

export class NotificationType4<P1, P2, P3, P4, RO> extends AbstractMessageType {
	private _?: [P1, P2, P3, P4, RO, _EM];
	constructor(method: string) {
		super(method, 4);
		this._ = undefined;
	}
}

export class NotificationType5<P1, P2, P3, P4, P5, RO> extends AbstractMessageType {
	private _?: [P1, P2, P3, P4, P5, RO, _EM];
	constructor(method: string) {
		super(method, 5);
		this._ = undefined;
	}
}

export class NotificationType6<P1, P2, P3, P4, P5, P6, RO> extends AbstractMessageType {
	private _?: [P1, P2, P3, P4, P5, P6, RO, _EM];
	constructor(method: string) {
		super(method, 6);
		this._ = undefined;
	}
}

export class NotificationType7<P1, P2, P3, P4, P5, P6, P7, RO> extends AbstractMessageType {
	private _?: [P1, P2, P3, P4, P5, P6, P7, RO, _EM];
	constructor(method: string) {
		super(method, 7);
		this._ = undefined;
	}
}

export class NotificationType8<P1, P2, P3, P4, P5, P6, P7, P8, RO> extends AbstractMessageType {
	private _?: [P1, P2, P3, P4, P5, P6, P7, P8, RO, _EM];
	constructor(method: string) {
		super(method, 8);
		this._ = undefined;
	}
}

export class NotificationType9<P1, P2, P3, P4, P5, P6, P7, P8, P9, RO> extends AbstractMessageType {
	private _?: [P1, P2, P3, P4, P5, P6, P7, P8, P9, RO, _EM];
	constructor(method: string) {
		super(method, 9);
		this._ = undefined;
	}
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
	return candidate && is.string(candidate.method) && (<any>message).id === void 0;
}

/**
 * Tests if the given message is a response message
 */
export function isReponseMessage(message: Message): message is ResponseMessage {
	let candidate = <ResponseMessage>message;
	return candidate && (candidate.result !== void 0 || !!candidate.error) && (is.string(candidate.id) || is.number(candidate.id));
}