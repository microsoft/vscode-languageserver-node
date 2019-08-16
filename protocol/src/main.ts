/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	ErrorCodes, ResponseError, CancellationToken, CancellationTokenSource,
	Disposable, Event, Emitter, Trace, Tracer, TraceFormat, TraceOptions, SetTraceNotification, LogTraceNotification,
	Message, NotificationMessage, RequestMessage, MessageType as RPCMessageType,
	RequestType, RequestType0, RequestHandler, RequestHandler0, GenericRequestHandler, StarRequestHandler, HandlerResult,
	NotificationType, NotificationType0, NotificationHandler, NotificationHandler0, GenericNotificationHandler, StarNotificationHandler,
	MessageReader, MessageWriter, Logger, ConnectionStrategy,
	StreamMessageReader, StreamMessageWriter, IPCMessageReader, IPCMessageWriter,
	createClientPipeTransport, createServerPipeTransport, generateRandomPipeName, DataCallback,
	createClientSocketTransport, createServerSocketTransport, ProgressType, ProgressToken,
	createMessageConnection
} from 'vscode-jsonrpc';

export {
	ErrorCodes, ResponseError, CancellationToken, CancellationTokenSource,
	Disposable, Event, Emitter, Trace, Tracer, TraceFormat, TraceOptions, SetTraceNotification, LogTraceNotification,
	Message, NotificationMessage, RequestMessage, RPCMessageType,
	RequestType, RequestType0, RequestHandler, RequestHandler0, GenericRequestHandler, StarRequestHandler, HandlerResult,
	NotificationType, NotificationType0, NotificationHandler, NotificationHandler0, GenericNotificationHandler, StarNotificationHandler,
	MessageReader, MessageWriter, Logger, ConnectionStrategy,
	StreamMessageReader, StreamMessageWriter,
	IPCMessageReader, IPCMessageWriter,
	createClientPipeTransport, createServerPipeTransport, generateRandomPipeName, DataCallback,
	createClientSocketTransport, createServerSocketTransport, ProgressType, ProgressToken
}

export * from 'vscode-languageserver-types';
export * from './protocol';

export { FoldingRangeParams as FoldingRangeRequestParam } from './protocol'; // for backward compatibility

import * as callHierarchy from './protocol.callHierarchy.proposed';
import * as progress from './protocol.progress.proposed';

export namespace Proposed {

	export type CallHierarchyClientCapabilities = callHierarchy.CallHierarchyClientCapabilities;
	export type CallHierarchyServerCapabilities = callHierarchy.CallHierarchyServerCapabilities;

	export namespace CallHierarchyRequest {
		export const type = callHierarchy.CallHierarchyRequest.type;
		export type HandlerSignature = callHierarchy.CallHierarchyRequest.HandlerSignature;
	}

	export namespace CallHierarchyDirection {
		export const CallsFrom = callHierarchy.CallHierarchyDirection.CallsFrom;
		export const CallsTo = callHierarchy.CallHierarchyDirection.CallsTo;
	}

	export type CallHierarchyParams = callHierarchy.CallHierarchyParams;
	export type CallHierarchyDirection = callHierarchy.CallHierarchyDirection;
	export type CallHierarchyItem = callHierarchy.CallHierarchyItem;
	export type CallHierarchyCall = callHierarchy.CallHierarchyCall;

	export type WorkDoneProgressClientCapabilities = progress.WorkDoneProgressClientCapabilities;
	export type WorkDoneProgressBegin = progress.WorkDoneProgressBegin;
	export type WorkDoneProgressReport = progress.WorkDoneProgressReport;
	export type WorkDoneProgressDone = progress.WorkDoneProgressDone;
	// export type ProgressServerCapabilities = progress.ProgressServerCapabilities;

	export namespace WorkDoneProgress {
		export const type = progress.WorkDoneProgress.type;
	}

	export type WorkDoneProgressCreateParams = progress.WorkDoneProgressCreateParams;
	export namespace WorkDoneProgressCreateRequest {
		export const type = progress.WorkDoneProgressCreateRequest.type;
		export type HandlerSignature = progress.WorkDoneProgressCreateRequest.HandlerSignature;
	}

	export type WorkDoneProgressCancelParams = progress.WorkDoneProgressCancelParams;
	export namespace WorkDoneProgressCancelNotification {
		export const type = progress.WorkDoneProgressCancelNotification.type;
		export type HandlerSignature = progress.WorkDoneProgressCancelNotification.HandlerSignature;
	}
}

export interface ProtocolConnection {

	/**
	 * Sends a request and returns a promise resolving to the result of the request.
	 *
	 * @param type The type of request to sent.
	 * @param token An optional cancellation token.
	 * @returns A promise resolving to the request's result.
	 */
	sendRequest<R, E, RO>(type: RequestType0<R, E, RO>, token?: CancellationToken): Thenable<R>;

	/**
	 * Sends a request and returns a promise resolving to the result of the request.
	 *
	 * @param type The type of request to sent.
	 * @param params The request's parameter.
	 * @param token An optional cancellation token.
	 * @returns A promise resolving to the request's result.
	 */
	sendRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, params: P, token?: CancellationToken): Thenable<R>;

	/**
	 * Sends a request and returns a promise resolving to the result of the request.
	 *
	 * @param method the request's method name.
	 * @param token An optional cancellation token.
	 * @returns A promise resolving to the request's result.
	 */
	sendRequest<R>(method: string, token?: CancellationToken): Thenable<R>;

	/**
	 * Sends a request and returns a promise resolving to the result of the request.
	 *
	 * @param method the request's method name.
	 * @param params The request's parameter.
	 * @param token An optional cancellation token.
	 * @returns A promise resolving to the request's result.
	 */
	sendRequest<R>(method: string, param: any, token?: CancellationToken): Thenable<R>;

	/**
	 * Installs a request handler.
	 *
	 * @param type The request type to install the handler for.
	 * @param handler The actual handler.
	 */
	onRequest<R, E, RO>(type: RequestType0<R, E, RO>, handler: RequestHandler0<R, E>): void;

	/**
	 * Installs a request handler.
	 *
	 * @param type The request type to install the handler for.
	 * @param handler The actual handler.
	 */
	onRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, handler: RequestHandler<P, R, E>): void;

	/**
	 * Installs a request handler.
	 *
	 * @param methods The method name to install the handler for.
	 * @param handler The actual handler.
	 */
	onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): void;

	/**
	 * Sends a notification.
	 *
	 * @param type the notification's type to send.
	 */
	sendNotification<RO>(type: NotificationType0<RO>): void;

	/**
	 * Sends a notification.
	 *
	 * @param type the notification's type to send.
	 * @param params the notification's parameters.
	 */
	sendNotification<P, RO>(type: NotificationType<P, RO>, params?: P): void;

	/**
	 * Sends a notification.
	 *
	 * @param method the notification's method name.
	 */
	sendNotification(method: string): void;

	/**
	 * Sends a notification.
	 *
	 * @param method the notification's method name.
	 * @param params the notification's parameters.
	 */
	sendNotification(method: string, params: any): void;

	/**
	 * Installs a notification handler.
	 *
	 * @param type The notification type to install the handler for.
	 * @param handler The actual handler.
	 */
	onNotification<RO>(type: NotificationType0<RO>, handler: NotificationHandler0): void;

	/**
	 * Installs a notification handler.
	 *
	 * @param type The notification type to install the handler for.
	 * @param handler The actual handler.
	 */
	onNotification<P, RO>(type: NotificationType<P, RO>, handler: NotificationHandler<P>): void;

	/**
	 * Installs a notification handler.
	 *
	 * @param methods The method name to install the handler for.
	 * @param handler The actual handler.
	 */
	onNotification(method: string, handler: GenericNotificationHandler): void;

	/**
	 * Installs a progress handler for a given token.
	 * @param type the progress type
	 * @param token the token
	 * @param handler the handler
	 */
	onProgress<P>(type: ProgressType<P>, token: string | number, handler: NotificationHandler<P>): Disposable;

	/**
	 * Sends progress.
	 * @param type the progress type
	 * @param token the token to use
	 * @param value the progress value
	 */
	sendProgress<P>(type: ProgressType<P>, token: string | number, value: P): void;

	/**
	 * Enables tracing mode for the connection.
	 */
	trace(value: Trace, tracer: Tracer, sendNotification?: boolean): void;
	trace(value: Trace, tracer: Tracer, traceOptions?: TraceOptions): void;

	/**
	 * An event emitter firing when an error occurs on the connection.
	 */
	onError: Event<[Error, Message | undefined, number | undefined]>;

	/**
	 * An event emitter firing when the connection got closed.
	 */
	onClose: Event<void>;

	/**
	 * An event emiiter firing when the connection receives a notification that is not
	 * handled.
	 */
	onUnhandledNotification: Event<NotificationMessage>;

	/**
	 * An event emitter firing when the connection got disposed.
	 */
	onDispose: Event<void>;

	/**
	 * Actively disposes the connection.
	 */
	dispose(): void;

	/**
	 * Turns the connection into listening mode
	 */
	listen(): void;
}

/**
 * @deprecated Use ProtocolConnection instead.
 */
export type ProtocolConnetion = ProtocolConnection;

export function createProtocolConnection(reader: MessageReader, writer: MessageWriter, logger: Logger, strategy?: ConnectionStrategy): ProtocolConnection {
	return createMessageConnection(reader, writer, logger, strategy);
}
