/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	ErrorCodes, ResponseError, CancellationToken, CancellationTokenSource,
	Disposable, Event, Emitter, Trace, SetTraceNotification, LogTraceNotification,
	Message, NotificationMessage, RequestMessage, MessageType as RPCMessageType,
	RequestType, RequestType0, RequestHandler, RequestHandler0, GenericRequestHandler, StarRequestHandler,
	NotificationType, NotificationType0, NotificationHandler, NotificationHandler0, GenericNotificationHandler, StarNotificationHandler,
	MessageReader, MessageWriter, Logger, ConnectionStrategy,
	StreamMessageReader, StreamMessageWriter, IPCMessageReader, IPCMessageWriter,
	createClientPipeTransport, createServerPipeTransport, generateRandomPipeName, DataCallback,
	createClientSocketTransport, createServerSocketTransport,
	createMessageConnection, Tracer
} from 'vscode-jsonrpc';

export {
	ErrorCodes, ResponseError, CancellationToken, CancellationTokenSource,
	Disposable, Event, Emitter, Trace, SetTraceNotification, LogTraceNotification,
	Message, NotificationMessage, RequestMessage, RPCMessageType,
	RequestType, RequestType0, RequestHandler, RequestHandler0, GenericRequestHandler, StarRequestHandler,
	NotificationType, NotificationType0, NotificationHandler, NotificationHandler0, GenericNotificationHandler, StarNotificationHandler,
	MessageReader, MessageWriter, Logger, ConnectionStrategy,
	StreamMessageReader, StreamMessageWriter,
	IPCMessageReader, IPCMessageWriter,
	createClientPipeTransport, createServerPipeTransport, generateRandomPipeName, DataCallback,
	createClientSocketTransport, createServerSocketTransport,
	Tracer
}
export * from 'vscode-languageserver-types';
export * from './protocol';

import * as config from './protocol.configuration.proposed';
import * as folders from './protocol.workspaceFolders.proposed';
import * as color from './protocol.colorProvider.proposed';
import { InitializeParams } from './protocol';

export namespace Proposed {
	export type ConfigurationClientCapabilities = config.ConfigurationClientCapabilities;
	export type ConfigurationParams = config.ConfigurationParams;
	export type ConfigurationItem = config.ConfigurationItem;
	export namespace ConfigurationRequest {
		export const type = config.ConfigurationRequest.type;
		export type HandlerSignature = config.ConfigurationRequest.HandlerSignature;
		export type MiddlewareSignature = config.ConfigurationRequest.MiddlewareSignature;
	};

	export type WorkspaceFoldersInitializeParams = InitializeParams & folders.WorkspaceFoldersInitializeParams;
	export type WorkspaceFoldersClientCapabilities = folders.WorkspaceFoldersClientCapabilities;
	export type WorkspaceFoldersServerCapabilities = folders.WorkspaceFoldersServerCapabilities;
	export type WorkspaceFolder = folders.WorkspaceFolder;
	export type WorkspaceFoldersChangeEvent = folders.WorkspaceFoldersChangeEvent;
	export type DidChangeWorkspaceFoldersParams = folders.DidChangeWorkspaceFoldersParams;
	export namespace WorkspaceFoldersRequest {
		export const type = folders.WorkspaceFoldersRequest.type;
		export type HandlerSignature = folders.WorkspaceFoldersRequest.HandlerSignature;
		export type MiddlewareSignature = folders.WorkspaceFoldersRequest.MiddlewareSignature;
	}
	export namespace DidChangeWorkspaceFoldersNotification {
		export const type = folders.DidChangeWorkspaceFoldersNotification.type;
		export type HandlerSignature = folders.DidChangeWorkspaceFoldersNotification.HandlerSignature;
		export type MiddlewareSignature = folders.DidChangeWorkspaceFoldersNotification.MiddlewareSignature;
	}

	export type ColorProviderOptions = color.ColorProviderOptions;
	export type DocumentColorParams = color.DocumentColorParams;
	export type ColorPresentationParams = color.ColorPresentationParams;
	export type Color = color.Color;
	export type ColorInformation = color.ColorInformation;
	export type ColorPresentation = color.ColorPresentation;
	export type ColorServerCapabilities = color.ServerCapabilities;
	export const DocumentColorRequest = color.DocumentColorRequest;
	export const ColorPresentationRequest = color.ColorPresentationRequest;
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
	 * Enables tracing mode for the connection.
	 */
	trace(value: Trace, tracer: Tracer, sendNotification?: boolean): void;

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