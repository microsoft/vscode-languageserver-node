/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="./thenable.ts" />
'use strict';

import * as is from './is';

import { Message, MessageType,
	RequestMessage, RequestType, isRequestMessage,
	RequestType0, RequestType1, RequestType2, RequestType3, RequestType4,
	RequestType5, RequestType6, RequestType7, RequestType8, RequestType9,
	ResponseMessage, isReponseMessage, ResponseError, ErrorCodes,
	NotificationMessage, isNotificationMessage,
	NotificationType, NotificationType0, NotificationType1, NotificationType2, NotificationType3, NotificationType4,
	NotificationType5, NotificationType6, NotificationType7, NotificationType8, NotificationType9
} from './messages';

import { MessageReader, DataCallback, StreamMessageReader, IPCMessageReader } from './messageReader';
import { MessageWriter, StreamMessageWriter, IPCMessageWriter } from './messageWriter';
import { Disposable, Event, Emitter } from './events';
import { CancellationTokenSource, CancellationToken } from './cancellation';

export {
	Message, MessageType, ErrorCodes, ResponseError,
	RequestMessage, RequestType,
	RequestType0, RequestType1, RequestType2, RequestType3, RequestType4,
	RequestType5, RequestType6, RequestType7, RequestType8, RequestType9,
	NotificationMessage, NotificationType,
	NotificationType0, NotificationType1, NotificationType2, NotificationType3, NotificationType4,
	NotificationType5, NotificationType6, NotificationType7, NotificationType8, NotificationType9,
	MessageReader, DataCallback, StreamMessageReader, IPCMessageReader,
	MessageWriter, StreamMessageWriter, IPCMessageWriter,
	CancellationTokenSource, CancellationToken,
	Disposable, Event, Emitter
}

interface CancelParams {
	/**
	 * The request id to cancel.
	 */
	id: number | string;
}

namespace CancelNotification {
	export const type: NotificationType<CancelParams> = { get method() { return '$/cancelRequest'; }, _: undefined };
}

export interface GenericRequestHandler<R, E> {
	(...params: any[]): R | ResponseError<E> | Thenable<R> | Thenable<ResponseError<E>>;
}

export interface RequestHandler<P, R, E> {
	(params: P, token: CancellationToken): R | ResponseError<E> | Thenable<R> | Thenable<ResponseError<E>>;
}

export interface RequestHandler0<R, E> {
	(token: CancellationToken): R | ResponseError<E> | Thenable<R> | Thenable<ResponseError<E>>;
}

export interface RequestHandler1<P1, R, E> {
	(p1: P1, token: CancellationToken): R | ResponseError<E> | Thenable<R> | Thenable<ResponseError<E>>;
}

export interface RequestHandler2<P1, P2, R, E> {
	(p1: P1, p2: P2, token: CancellationToken): R | ResponseError<E> | Thenable<R> | Thenable<ResponseError<E>>;
}

export interface RequestHandler3<P1, P2, P3, R, E> {
	(p1: P1, p2: P2, p3: P3, token: CancellationToken): R | ResponseError<E> | Thenable<R> | Thenable<ResponseError<E>>;
}

export interface RequestHandler4<P1, P2, P3, P4, R, E> {
	(p1: P1, p2: P2, p3: P3, p4: P4, token: CancellationToken): R | ResponseError<E> | Thenable<R> | Thenable<ResponseError<E>>;
}

export interface RequestHandler5<P1, P2, P3, P4, P5, R, E> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, token: CancellationToken): R | ResponseError<E> | Thenable<R> | Thenable<ResponseError<E>>;
}

export interface RequestHandler6<P1, P2, P3, P4, P5, P6, R, E> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, token: CancellationToken): R | ResponseError<E> | Thenable<R> | Thenable<ResponseError<E>>;
}

export interface RequestHandler7<P1, P2, P3, P4, P5, P6, P7, R, E> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, token: CancellationToken): R | ResponseError<E> | Thenable<R> | Thenable<ResponseError<E>>;
}

export interface RequestHandler8<P1, P2, P3, P4, P5, P6, P7, P8, R, E> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8, token: CancellationToken): R | ResponseError<E> | Thenable<R> | Thenable<ResponseError<E>>;
}

export interface RequestHandler9<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8, p9: P9, token: CancellationToken): R | ResponseError<E> | Thenable<R> | Thenable<ResponseError<E>>;
}

export interface GenericNotificationHandler {
	(...params: any[]): void;
}

export interface NotificationHandler<P> {
	(params: P): void;
}

export interface NotificationHandler0 {
	(): void;
}

export interface NotificationHandler1<P1> {
	(p1: P1): void;
}

export interface NotificationHandler2<P1, P2> {
	(p1: P1, p2: P2): void;
}

export interface NotificationHandler3<P1, P2, P3> {
	(p1: P1, p2: P2, p3: P3): void;
}

export interface NotificationHandler4<P1, P2, P3, P4> {
	(p1: P1, p2: P2, p3: P3, p4: P4): void;
}

export interface NotificationHandler5<P1, P2, P3, P4, P5> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5): void;
}

export interface NotificationHandler6<P1, P2, P3, P4, P5, P6> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6): void;
}

export interface NotificationHandler7<P1, P2, P3, P4, P5, P6, P7> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7): void;
}

export interface NotificationHandler8<P1, P2, P3, P4, P5, P6, P7, P8> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8): void;
}

export interface NotificationHandler9<P1, P2, P3, P4, P5, P6, P7, P8, P9> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8, p9: P9): void;
}

export interface Logger {
	error(message: string): void;
	warn(message: string): void;
	info(message: string): void;
	log(message: string): void;
}

export enum Trace {
	Off, Messages, Verbose
}

export type TraceValues = 'off' | 'messages' | 'verbose';
export namespace Trace {
	export function fromString(value: string): Trace {
		value = value.toLowerCase();
		switch (value) {
			case 'off':
				return Trace.Off;
			case 'messages':
				return Trace.Messages;
			case 'verbose':
				return Trace.Verbose;
			default:
				return Trace.Off;
		}
	}

	export function toString(value: Trace): TraceValues {
		switch (value) {
			case Trace.Off:
				return 'off';
			case Trace.Messages:
				return 'messages';
			case Trace.Verbose:
				return 'verbose';
			default:
				return 'off';
		}
 	}
}

export interface SetTraceParams {
	value: TraceValues;
}

export namespace SetTraceNotification {
	export const type: NotificationType<SetTraceParams> = { get method() { return '$/setTraceNotification'; }, _: undefined };
}

export interface LogTraceParams {
	message: string;
	verbose?: string;
}

export namespace LogTraceNotification {
	export const type: NotificationType<LogTraceParams> = { get method() { return '$/logTraceNotification'; }, _: undefined };
}

export interface Tracer {
	log(message: string, data?: string): void;
}

export interface MessageConnection {
	sendRequest<P, R, E>(type: RequestType<P, R, E>, params: P, token?: CancellationToken) : Thenable<R>;
	sendRequest<R, E>(type: RequestType0<R, E>, token?: CancellationToken) : Thenable<R>;
	sendRequest<P1, R, E>(type: RequestType1<P1, R, E>, p1: P1, token?: CancellationToken) : Thenable<R>;
	sendRequest<P1, P2, R, E>(type: RequestType2<P1, P2, R, E>, p1: P1, p2: P2, token?: CancellationToken) : Thenable<R>;
	sendRequest<P1, P2, P3, R, E>(type: RequestType3<P1, P2, P3, R, E>, p1: P1, p2: P2, p3: P3, token?: CancellationToken) : Thenable<R>;
	sendRequest<P1, P2, P3, P4, R, E>(type: RequestType4<P1, P2, P3, P4, R, E>, p1: P1, p2: P2, p3: P3, p4: P4, token?: CancellationToken) : Thenable<R>;
	sendRequest<P1, P2, P3, P4, P5, R, E>(type: RequestType5<P1, P2, P3, P4, P5, R, E>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, token?: CancellationToken) : Thenable<R>;
	sendRequest<P1, P2, P3, P4, P5, P6, R, E>(type: RequestType6<P1, P2, P3, P4, P5, P6, R, E>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, token?: CancellationToken) : Thenable<R>;
	sendRequest<P1, P2, P3, P4, P5, P6, P7, R, E>(type: RequestType7<P1, P2, P3, P4, P5, P6, P7, R, E>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, token?: CancellationToken) : Thenable<R>;
	sendRequest<P1, P2, P3, P4, P5, P6, P7, P8, R, E>(type: RequestType8<P1, P2, P3, P4, P5, P6, P7, P8, R, E>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8, token?: CancellationToken) : Thenable<R>;
	sendRequest<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E>(type: RequestType9<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8, p9: P9, token?: CancellationToken) : Thenable<R>;
	sendRequest<R>(method: string | MessageType, ...params: any[]): Thenable<R>;

	onRequest<P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): void;
	onRequest<R, E>(type: RequestType0<R, E>, handler: RequestHandler0<R, E>): void;
	onRequest<P1, R, E>(type: RequestType1<P1, R, E>, handler: RequestHandler1<P1, R, E>): void;
	onRequest<P1, P2, R, E>(type: RequestType2<P1, P2, R, E>, handler: RequestHandler2<P1, P2, R, E>): void;
	onRequest<P1, P2, P3, R, E>(type: RequestType3<P1, P2, P3, R, E>, handler: RequestHandler3<P1, P2, P3, R, E>): void;
	onRequest<P1, P2, P3, P4, R, E>(type: RequestType4<P1, P2, P3, P4, R, E>, handler: RequestHandler4<P1, P2, P3, P4, R, E>): void;
	onRequest<P1, P2, P3, P4, P5, R, E>(type: RequestType5<P1, P2, P3, P4, P5, R, E>, handler: RequestHandler5<P1, P2, P3, P4, P5, R, E>): void;
	onRequest<P1, P2, P3, P4, P5, P6, R, E>(type: RequestType6<P1, P2, P3, P4, P5, P6, R, E>, handler: RequestHandler6<P1, P2, P3, P4, P5, P6, R, E>): void;
	onRequest<P1, P2, P3, P4, P5, P6, P7, R, E>(type: RequestType7<P1, P2, P3, P4, P5, P6, P7, R, E>, handler: RequestHandler7<P1, P2, P3, P4, P5, P6, P7, R, E>): void;
	onRequest<P1, P2, P3, P4, P5, P6, P7, P8, R, E>(type: RequestType8<P1, P2, P3, P4, P5, P6, P7, P8, R, E>, handler: RequestHandler8<P1, P2, P3, P4, P5, P6, P7, P8, R, E>): void;
	onRequest<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E>(type: RequestType9<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E>, handler: RequestHandler9<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E>): void;
	onRequest<R, E>(method: string | MessageType, handler: GenericRequestHandler<R, E>): void;

	sendNotification<P>(type: NotificationType<P>, params?: P): void;
	sendNotification(type: NotificationType0): void;
	sendNotification<P1>(type: NotificationType1<P1>, p1: P1): void;
	sendNotification<P1, P2>(type: NotificationType2<P1, P2>, p1: P1, p2: P2): void;
	sendNotification<P1, P2, P3>(type: NotificationType3<P1, P2, P3>, p1: P1, p2: P2, p3: P3): void;
	sendNotification<P1, P2, P3, P4>(type: NotificationType4<P1, P2, P3, P4>, p1: P1, p2: P2, p3: P3, p4: P4): void;
	sendNotification<P1, P2, P3, P4, P5>(type: NotificationType5<P1, P2, P3, P4, P5>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5): void;
	sendNotification<P1, P2, P3, P4, P5, P6>(type: NotificationType6<P1, P2, P3, P4, P5, P6>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6): void;
	sendNotification<P1, P2, P3, P4, P5, P6, P7>(type: NotificationType7<P1, P2, P3, P4, P5, P6, P7>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7): void;
	sendNotification<P1, P2, P3, P4, P5, P6, P7, P8>(type: NotificationType8<P1, P2, P3, P4, P5, P6, P7, P8>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8): void;
	sendNotification<P1, P2, P3, P4, P5, P6, P7, P8, P9>(type: NotificationType9<P1, P2, P3, P4, P5, P6, P7, P8, P9>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8, p9: P9): void;
	sendNotification(method: string | MessageType, ...params: any[]): void;

	onNotification<P>(type: NotificationType<P>, handler: NotificationHandler<P>): void;
	onNotification(type: NotificationType0, handler: NotificationHandler0): void;
	onNotification<P1>(type: NotificationType1<P1>, handler: NotificationHandler1<P1>): void;
	onNotification<P1, P2>(type: NotificationType2<P1, P2>, handler: NotificationHandler2<P1, P2>): void;
	onNotification<P1, P2, P3>(type: NotificationType3<P1, P2, P3>, handler: NotificationHandler3<P1, P2, P3>): void;
	onNotification<P1, P2, P3, P4>(type: NotificationType4<P1, P2, P3, P4>, handler: NotificationHandler4<P1, P2, P3, P4>): void;
	onNotification<P1, P2, P3, P4, P5>(type: NotificationType5<P1, P2, P3, P4, P5>, handler: NotificationHandler5<P1, P2, P3, P4, P5>): void;
	onNotification<P1, P2, P3, P4, P5, P6>(type: NotificationType6<P1, P2, P3, P4, P5, P6>, handler: NotificationHandler6<P1, P2, P3, P4, P5, P6>): void;
	onNotification<P1, P2, P3, P4, P5, P6, P7>(type: NotificationType7<P1, P2, P3, P4, P5, P6, P7>, handler: NotificationHandler7<P1, P2, P3, P4, P5, P6, P7>): void;
	onNotification<P1, P2, P3, P4, P5, P6, P7, P8>(type: NotificationType8<P1, P2, P3, P4, P5, P6, P7, P8>, handler: NotificationHandler8<P1, P2, P3, P4, P5, P6, P7, P8>): void;
	onNotification<P1, P2, P3, P4, P5, P6, P7, P8, P9>(type: NotificationType9<P1, P2, P3, P4, P5, P6, P7, P8, P9>, handler: NotificationHandler9<P1, P2, P3, P4, P5, P6, P7, P8, P9>): void;
	onNotification(method: string | MessageType, handler: GenericNotificationHandler): void;

	trace(value: Trace, tracer: Tracer, sendNotification?: boolean): void;

	onError: Event<[Error, Message, number]>;
	onClose: Event<void>;
	onUnhandledNotification: Event<NotificationMessage>;
	listen();
	onDispose: Event<void>;
	dispose(): void;
}

interface ResponsePromise {
	method: string;
	timerStart: number;
	resolve: (response) => void;
	reject: (error: any) => void
}

enum ConnectionState {
	New = 1,
	Listening = 2,
	Closed = 3,
	Disposed = 4
}

function _createMessageConnection(messageReader: MessageReader, messageWriter: MessageWriter, logger: Logger): MessageConnection {
	let sequenceNumber = 0;
	const version: string = '2.0';

	let requestHandlers : { [name: string]: GenericRequestHandler<any, any> } = Object.create(null);
	let notificationHandlers : { [name: string]: GenericNotificationHandler } = Object.create(null);

	let responsePromises : { [name: string]: ResponsePromise } = Object.create(null);
	let requestTokens: { [id: string] : CancellationTokenSource } = Object.create(null);

	let trace: Trace = Trace.Off;
	let tracer: Tracer;

	let state: ConnectionState = ConnectionState.New;
	let errorEmitter: Emitter<[Error, Message, number]> = new Emitter<[Error, Message, number]>();
	let closeEmitter: Emitter<void> = new Emitter<void>();
	let unhandledNotificationEmitter: Emitter<NotificationMessage> = new Emitter<NotificationMessage>();
	let disposeEmitter: Emitter<void> = new Emitter<void>();

	function isListening(): boolean {
		return state === ConnectionState.Listening;
	}

	function isClosed(): boolean {
		return state === ConnectionState.Closed;
	}

	function isDisposed(): boolean {
		return state === ConnectionState.Disposed;
	}

	function closeHandler(): void {
		if (state === ConnectionState.New || state === ConnectionState.Listening) {
			state = ConnectionState.Closed;
			closeEmitter.fire(undefined);
		}
		// If the connection is disposed don't sent close events.
	};

	function readErrorHandler(error: Error): void {
		errorEmitter.fire([error, undefined, undefined]);
	}

	function writeErrorHandler(data: [Error, Message, number]): void {
		errorEmitter.fire(data);
	}

	messageReader.onClose(closeHandler);
	messageReader.onError(readErrorHandler);

	messageWriter.onClose(closeHandler);
	messageWriter.onError(writeErrorHandler);

	function handleRequest(requestMessage: RequestMessage) {
		if (isDisposed()) {
			// we return here silently since we fired an event when the
			// connection got disposed.
			return;
		}

		function reply(resultOrError: any | ResponseError<any>): void {
			let message: ResponseMessage = {
				jsonrpc: version,
				id: requestMessage.id
			};
			if (resultOrError instanceof ResponseError) {
				message.error = (<ResponseError<any>>resultOrError).toJson();
			} else {
				message.result = is.undefined(resultOrError) ? null : resultOrError;
			}
			messageWriter.write(message);
		}
		function replyError(error: ResponseError<any>) {
			let message: ResponseMessage = {
				jsonrpc: version,
				id: requestMessage.id,
				error: error.toJson()
			};
			messageWriter.write(message);
		}
		function replySuccess(result: any) {
			// The JSON RPC defines that a response must either have a result or an error
			// So we can't treat undefined as a valid response result.
			if (is.undefined(result)) {
				result = null;
			}
			let message: ResponseMessage = {
				jsonrpc: version,
				id: requestMessage.id,
				result: result
			};
			messageWriter.write(message);
		}

		let requestHandler = requestHandlers[requestMessage.method];
		if (requestHandler) {
			let cancellationSource = new CancellationTokenSource();
			let tokenKey = String(requestMessage.id);
			requestTokens[tokenKey] = cancellationSource;
			try {
				let handlerResult: any;
				if (is.nil(requestMessage.params)) {
					handlerResult = requestHandler(cancellationSource.token);
				} else if (is.array(requestMessage.params)) {
					handlerResult = requestHandler(...requestMessage.params, cancellationSource.token);
				} else {
					handlerResult = requestHandler(requestMessage.params, cancellationSource.token);
				}

				let promise = <Thenable<any | ResponseError<any>>>handlerResult;
				if (!handlerResult) {
					delete requestTokens[tokenKey];
					replySuccess(handlerResult);
				} else if (promise.then) {
					promise.then((resultOrError): any | ResponseError<any>  => {
						delete requestTokens[tokenKey];
						reply(resultOrError);
					}, error => {
						delete requestTokens[tokenKey];
						if (error instanceof ResponseError) {
							replyError(<ResponseError<any>>error);
						} else if (error && is.string(error.message)) {
							replyError(new ResponseError<void>(ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`));
						} else {
							replyError(new ResponseError<void>(ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`));
						}
					});
				} else {
					delete requestTokens[tokenKey];
					reply(handlerResult);
				}
			} catch (error) {
				delete requestTokens[tokenKey];
				if (error instanceof ResponseError) {
					reply(<ResponseError<any>>error);
				} else if (error && is.string(error.message)) {
					replyError(new ResponseError<void>(ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`));
				} else {
					replyError(new ResponseError<void>(ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`));
				}
			}
		} else {
			replyError(new ResponseError<void>(ErrorCodes.MethodNotFound, `Unhandled method ${requestMessage.method}`));
		}
	}

	function handleResponse(responseMessage: ResponseMessage) {
		if (isDisposed()) {
			// See handle request.
			return;
		}

		let key = String(responseMessage.id);
		let responsePromise = responsePromises[key];
		if (trace != Trace.Off && tracer) {
			traceResponse(responseMessage, responsePromise);
		}
		if (responsePromise) {
			delete responsePromises[key];
			try {
				if (is.defined(responseMessage.error)) {
					let error = responseMessage.error;
					responsePromise.reject(new ResponseError(error.code, error.message, error.data));
				} else if (is.defined(responseMessage.result)) {
					responsePromise.resolve(responseMessage.result);
				} else {
					throw new Error('Should never happen.');
				}
			} catch (error) {
				if (error.message) {
					 logger.error(`Response handler '${responsePromise.method}' failed with message: ${error.message}`);
				} else {
					logger.error(`Response handler '${responsePromise.method}' failed unexpectedly.`);
				}
			}
		}
	}

	function handleNotification(message: NotificationMessage) {
		if (isDisposed()) {
			// See handle request.
			return;
		}
		let notificationHandler: GenericNotificationHandler;
		if (message.method === CancelNotification.type.method) {
			notificationHandler = (params: CancelParams) => {
				let id = params.id;
				let source = requestTokens[String(id)];
				if (source) {
					source.cancel();
				}
			}
		} else {
			notificationHandler = notificationHandlers[message.method];
		}
		if (notificationHandler) {
			try {
				if (trace != Trace.Off && tracer) {
					traceReceivedNotification(message);
				}
				if (is.nil(message.params)) {
					notificationHandler();
				} else if (is.array(message.params)) {
					notificationHandler(...message.params);
				} else {
					notificationHandler(message.params);
				}
			} catch (error) {
				if (error.message) {
					 logger.error(`Notification handler '${message.method}' failed with message: ${error.message}`);
				} else {
					logger.error(`Notification handler '${message.method}' failed unexpectedly.`);
				}
			}
		} else {
			unhandledNotificationEmitter.fire(message);
		}
	}

	function handleInvalidMessage(message: Message) {
		if (!message) {
			logger.error('Received empty message.');
			return;
		}
		logger.error(`Received message which is neither a response nor a notification message:\n${JSON.stringify(message, null, 4)}`);
		// Test whether we find an id to reject the promise
		let responseMessage: ResponseMessage = message as ResponseMessage;
		if (is.string(responseMessage.id) || is.number(responseMessage.id)) {
			let key = String(responseMessage.id);
			let responseHandler = responsePromises[key];
			if (responseHandler) {
				responseHandler.reject(new Error('The received response has neither a result nor an error property.'));
			}
		}
	}

	function traceRequest(message: RequestMessage): void {
		let data: string = undefined;
		if (trace === Trace.Verbose && message.params) {
			data = `Params: ${JSON.stringify(message.params, null, 4)}\n\n`;
		}
		tracer.log(`Sending request '${message.method} - (${message.id})'.`, data);
	}

	function traceSendNotification(message: NotificationMessage): void {
		let data: string = undefined;
		if (trace === Trace.Verbose) {
			if (message.params) {
				data = `Params: ${JSON.stringify(message.params, null, 4)}\n\n`;
			} else {
				data = 'No parameters provided.\n\n';
			}
		}
		tracer.log(`Sending notification '${message.method}'.`, data);
	}

	function traceReceivedNotification(message: NotificationMessage): void {
		if (message.method === LogTraceNotification.type.method) {
			return;
		}
		let data: string = undefined;
		if (trace === Trace.Verbose) {
			if (message.params) {
				data = `Params: ${JSON.stringify(message.params, null, 4)}\n\n`;
			} else {
				data = 'No parameters provided.\n\n';
			}
		}
		tracer.log(`Received notification '${message.method}'.`, data);
	}

	function traceResponse(message: ResponseMessage, responsePromise: ResponsePromise): void {
		let data: string = undefined;
		if (trace === Trace.Verbose) {
			if (message.error && message.error.data) {
				data = `Error data: ${JSON.stringify(message.error.data, null, 4)}\n\n`;
			} else {
				if (message.result) {
					data = `Result: ${JSON.stringify(message.result, null, 4)}\n\n`;
				} else if (is.undefined(message.error)) {
					data = 'No result returned.\n\n';
				}
			}
		}
		if (responsePromise) {
			let error = message.error ? ` Request failed: ${message.error.message} (${message.error.code}).` : '';
			tracer.log(`Received response '${responsePromise.method} - (${message.id})' in ${Date.now() - responsePromise.timerStart}ms.${error}`, data);
		} else {
			tracer.log(`Received response ${message.id} without active response promise.`, data);
		}
	}

	let callback: DataCallback = (message) => {
		if (isRequestMessage(message)) {
			handleRequest(message);
		} else if (isReponseMessage(message)) {
			handleResponse(message)
		} else if (isNotificationMessage(message)) {
			handleNotification(message);
		} else {
			handleInvalidMessage(message);
		}
	};

	function throwIfClosedOrDisposed() {
		if (isClosed()) {
			throw new Error('Connection is closed.');
		}
		if (isDisposed()) {
			throw new Error('Connection is disposed.');
		}
	}

	function throwIfListening() {
		if (isListening()) {
			throw new Error('Connection is already listening');
		}
	}

	let connection: MessageConnection = {
		sendNotification: (type: string | MessageType, ...params: any[]): void => {
			throwIfClosedOrDisposed();

			let messageParams: any[];
			switch (params.length) {
				case 0:
					messageParams = null;
					break;
				case 1:
					messageParams = params[0];
					break;
				default:
					messageParams = params;
					break;
			}
			let notificatioMessage : NotificationMessage = {
				jsonrpc: version,
				method: is.string(type) ? type : type.method,
				params: messageParams
			}
			if (trace != Trace.Off && tracer) {
				traceSendNotification(notificatioMessage);
			}
			messageWriter.write(notificatioMessage);
		},
		onNotification: (type: string | MessageType, handler: GenericNotificationHandler): void => {
			throwIfClosedOrDisposed();

			notificationHandlers[is.string(type) ? type : type.method] = handler;
		},
		sendRequest: <R, E>(type: string | MessageType, ...params: any[]) => {
			throwIfClosedOrDisposed();

			const method = is.string(type) ? type : type.method;
			let messageParams: any[];
			let token: CancellationToken = undefined;
			switch (params.length) {
				case 0:
					messageParams = null;
					break;
				case 1:
					if (CancellationToken.is(params[0])) {
						messageParams = null;
						token = params[0];
					} else {
						messageParams = params[0];
					}
					break;
				default:
					const last = params.length - 1;
					if (CancellationToken.is(params[last])) {
						messageParams = params.slice(0, last);
						token = params[last];
					} else {
						messageParams = params;
					}
					break;
			}

			let id = sequenceNumber++;
			let result = new Promise<R | ResponseError<E>>((resolve, reject) => {
				let requestMessage : RequestMessage = {
					jsonrpc: version,
					id: id,
					method: method,
					params: messageParams
				}
				let responsePromise: ResponsePromise = { method: method, timerStart: Date.now(), resolve, reject };
				if (trace != Trace.Off && tracer) {
					traceRequest(requestMessage);
				}
				try {
					messageWriter.write(requestMessage);
				} catch (e) {
					// Writing the message failed. So we need to reject the promise.
					responsePromise.reject(new ResponseError<void>(ErrorCodes.MessageWriteError, e.message ? e.message : 'Unknown reason'));
					responsePromise = null;
				}
				if (responsePromise) {
					responsePromises[String(id)] = responsePromise;
				}
			});
			if (token) {
				token.onCancellationRequested((event) => {
					connection.sendNotification(CancelNotification.type, { id });
				});
			}
			return result;
		},
		onRequest: <R, E>(type: string | MessageType, handler: GenericRequestHandler<R, E>): void => {
			throwIfClosedOrDisposed();

			requestHandlers[is.string(type) ? type : type.method] = handler;
		},
		trace: (_value: Trace, _tracer: Tracer, sendNotification: boolean = false) => {
			trace = _value;
			if (trace === Trace.Off) {
				tracer = null;
			} else {
				tracer = _tracer;
			}
			if (sendNotification && !isClosed() && !isDisposed()) {
				connection.sendNotification(SetTraceNotification.type, { value: Trace.toString(_value) });
			}
		},
		onError: errorEmitter.event,
		onClose: closeEmitter.event,
		onUnhandledNotification: unhandledNotificationEmitter.event,
		onDispose: disposeEmitter.event,
		dispose: () => {
			if (isDisposed()) {
				return;
			}
			state = ConnectionState.Disposed;
			disposeEmitter.fire(undefined);
			let error = new Error('Connection got disposed.');
			Object.keys(responsePromises).forEach((key) => {
				responsePromises[key].reject(error);
			});
			responsePromises = Object.create(null);
			requestTokens = Object.create(null);
		},
		listen: () => {
			throwIfClosedOrDisposed();
			throwIfListening();

			state = ConnectionState.Listening;
			messageReader.listen(callback);
		}
	};

	connection.onNotification(LogTraceNotification.type, (params) => {
		if (trace === Trace.Off) {
			return;
		}
		tracer.log(params.message, trace === Trace.Verbose ? params.verbose : undefined);
	});

	return connection;
}

function isMessageReader(value: any): value is MessageReader {
	return is.defined(value.listen) && is.undefined(value.read);
}

function isMessageWriter(value: any): value is MessageWriter {
	return is.defined(value.write) && is.undefined(value.end);
}

export function createMessageConnection(reader: MessageReader, writer: MessageWriter, logger: Logger): MessageConnection;
export function createMessageConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, logger: Logger): MessageConnection;
export function createMessageConnection(input: MessageReader | NodeJS.ReadableStream, output: MessageWriter | NodeJS.WritableStream, logger: Logger): MessageConnection {
	let reader = isMessageReader(input) ? input : new StreamMessageReader(input);
	let writer = isMessageWriter(output) ? output : new StreamMessageWriter(output);
	return _createMessageConnection(reader, writer, logger);
}