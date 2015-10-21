/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import * as is from './is';

import { Message,
	RequestMessage, Request, RequestType, isRequestMessage,
	ResponseMessage, Response, isReponseMessage, isSuccessfulResponse, isFailedResponse,
	ErrorCodes,
	NotificationMessage, Notification, NotificationType, isNotificationMessage
} from './messages';

import { MessageReader, ICallback } from './messageReader';
import { MessageWriter } from './messageWriter';

export { Response, ErrorCodes, RequestType, NotificationType }

export interface IRequestHandler<P, R extends Response> {
	(params?: P): R | Thenable<R>;
}

export interface INotificationHandler<P> {
	(params?: P): void;
}

export interface ILogger {
	error(message: string);
	warn(message: string);
	info(message: string);
	log(message: string);
}

export interface MessageConnection {
	sendNotification<P>(type: NotificationType<P>, params?: P): void;
	onRequest<P, R extends Response>(type: RequestType<P, R>, handler: IRequestHandler<P, R>): void;
	onNotification<P>(type: NotificationType<P>, handler: INotificationHandler<P>): void;
	dispose(): void;
}

export interface ServerMessageConnection extends MessageConnection {
}

export interface ClientMessageConnection extends MessageConnection {
	sendRequest<P, R extends Response>(type: RequestType<P, R>, params?: P) : Thenable<R>;
}

function createMessageConnection<T extends MessageConnection>(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, logger: ILogger, client: boolean = false): T {
	let protocolWriter = new MessageWriter(outputStream);
	let sequenceNumber = 0;
	const version: string = '2.0';

	let requestHandlers : { [name: string]: IRequestHandler<any, Response> } = Object.create(null);
	let responseHandlers : { [name: string]: { resolve: (Response) => void, reject: (error: any) => void } } = Object.create(null);

	let eventHandlers : { [name: string]: INotificationHandler<any> } = Object.create(null);

	let connection: MessageConnection = {
		sendNotification: <P>(type: NotificationType<P>, params) => {
			let notificatioMessage : NotificationMessage = {
				jsonrpc: version,
				method: type.method,
				params: params
			}
			protocolWriter.write(notificatioMessage);
		},
		onRequest: <P, R extends Response>(type: RequestType<P, R>, handler: IRequestHandler<P, R>) => {
			requestHandlers[type.method] = handler;
		},
		onNotification: <P>(type: NotificationType<P>, handler: INotificationHandler<P>) => {
			eventHandlers[type.method] = handler;
		},
		dispose: () => {
		}
	};
	if (client) {
		(connection as ClientMessageConnection).sendRequest = <P, R extends Response>(type: RequestType<P, R>, params: P) => {
			return new Promise<Response>((resolve, reject) => {
				let id = sequenceNumber++;
				let requestMessage : RequestMessage = {
					jsonrpc: version,
					id: id,
					method: type.method,
					params: params
				}
				responseHandlers[String(id)] = { resolve, reject };
				protocolWriter.write(requestMessage);
			});
		}
	}
	inputStream.on('end', () => outputStream.end());
	inputStream.on('close', () => outputStream.end());

	function handleRequest(requestMessage: RequestMessage) {
		function reply(response: Response): void {
			let message: ResponseMessage = {
				jsonrpc: version,
				id: requestMessage.id
			}
			if (is.defined(response.error)) {
				message.error = response.error;
			} else if (is.defined(response.result)) {
				message.result = response.result;
			} else {
				message.error = {
					code: ErrorCodes.InvalidRequest,
					message: `The request ${requestMessage.method} did neither return a result nor a error.`
				}
			}
			protocolWriter.write(message);
		}

		let requestHandler = requestHandlers[requestMessage.method];
		if (requestHandler) {
			try {
				let handlerResult = requestHandler(requestMessage.params);
				let promise = <Thenable<Response>> handlerResult;
				if (!promise) {
					reply({ result: {} });
				} else if (promise.then) {
					promise.then(response => {
						reply(response);
					}, error => {
						if (isFailedResponse(error)) {
							reply(error);
						} else if (error && is.string(error.message)) {
							reply( { error: { code: ErrorCodes.InternalError, message: `Request ${requestMessage.method} failed with message: ${error.message}` }});
						} else {
							reply( { error: { code: ErrorCodes.InternalError, message: `Request ${requestMessage.method} failed unexpectedly without providing any details.` }}) ;
						}
					});
				} else {
					reply(<Response>handlerResult);
				}
			} catch (error) {
				if (error && is.string(error.message)) {
					reply( { error: { code: ErrorCodes.InternalError, message: `Request ${requestMessage.method} failed with message: ${error.message}` }});
				} else {
					reply( { error: { code: ErrorCodes.InternalError, message: `Request ${requestMessage.method} failed unexpectedly without providing any details.` }}) ;
				}
			}
		} else {
			reply({ error: { code: ErrorCodes.MethodNotFound, message: `Unhandled method ${requestMessage.method}` } });
		}
	}

	function handleResponse(responseMessage: ResponseMessage) {
		let key = String(responseMessage.id);
		var responseHandler = responseHandlers[key];
		if (responseHandler) {
			responseHandler.resolve(responseMessage);
			delete responseHandlers[String(responseMessage.id)];
		}
	}

	function handleNotification(message: NotificationMessage) {
		var eventHandler = eventHandlers[message.method];
		if (eventHandler) {
			try {
				eventHandler(message.params);
			} catch (error) {
				if (error.message) {
					 logger.error(`Notification handler '${message.method}' failed with message: ${error.message}`);
				} else {
					logger.error(`Notification handler '${message.method}' failed unexpectedly.`);
				}
			}
		}
	}

	let callback: ICallback;
	if (client) {
		callback = (message) => {
			if (isReponseMessage(message)) {
				handleResponse(message)
			} else if (isNotificationMessage(message)) {
				handleNotification(message);
			}
		}
	} else {
		callback = (message) => {
			if (isRequestMessage(message)) {
				handleRequest(message);
			} else if (isNotificationMessage(message)) {
				handleNotification(message);
			}
		}
	}
	new MessageReader(inputStream, callback);
	return connection as T;
}

export function createServerMessageConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, logger: ILogger): ServerMessageConnection {
	return createMessageConnection<ServerMessageConnection>(inputStream, outputStream, logger);
}

export function createClientMessageConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, logger: ILogger): ClientMessageConnection {
	return createMessageConnection<ClientMessageConnection>(inputStream, outputStream, logger, true);
}