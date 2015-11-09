/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as is from './is';

import { Message,
	RequestMessage, RequestType, isRequestMessage,
	ResponseMessage, isReponseMessage, ResponseError, ErrorCodes,
	NotificationMessage,  NotificationType, isNotificationMessage
} from './messages';

import { MessageReader, ICallback } from './messageReader';
import { MessageWriter } from './messageWriter';

export { ErrorCodes, ResponseError, RequestType, NotificationType }

export interface IRequestHandler<P, R, E> {
	(params?: P): R | ResponseError<E> | Thenable<R | ResponseError<E>>;
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
	onNotification<P>(type: NotificationType<P>, handler: INotificationHandler<P>): void;
	listen();
	dispose(): void;
}

export interface ServerMessageConnection extends MessageConnection {
	onRequest<P, R, E>(type: RequestType<P, R, E>, handler: IRequestHandler<P, R, E>): void;
}

export interface ClientMessageConnection extends MessageConnection {
	sendRequest<P, R, E>(type: RequestType<P, R, E>, params?: P) : Thenable<R>;
}

function createMessageConnection<T extends MessageConnection>(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, logger: ILogger, client: boolean = false): T {
	let protocolWriter = new MessageWriter(outputStream);
	let sequenceNumber = 0;
	const version: string = '2.0';

	let requestHandlers : { [name: string]: IRequestHandler<any, any, any> } = Object.create(null);
	let responseHandlers : { [name: string]: { method: string, resolve: (Response) => void, reject: (error: any) => void } } = Object.create(null);

	let eventHandlers : { [name: string]: INotificationHandler<any> } = Object.create(null);

	function handleRequest(requestMessage: RequestMessage) {
		function reply(resultOrError: any | ResponseError<any>): void {
			let message: ResponseMessage = {
				jsonrpc: version,
				id: requestMessage.id
			};
			if (resultOrError instanceof ResponseError) {
				message.error = (<ResponseError<any>>resultOrError).toJson();
			} else {
				message.result = resultOrError;
			}
			protocolWriter.write(message);
		}
		function replyError(error: ResponseError<any>) {
			let message: ResponseMessage = {
				jsonrpc: version,
				id: requestMessage.id,
				error: error.toJson()
			};
			protocolWriter.write(message);
		}
		function replySuccess(result: any) {
			let message: ResponseMessage = {
				jsonrpc: version,
				id: requestMessage.id,
				result: result
			};
			protocolWriter.write(message);
		}

		let requestHandler = requestHandlers[requestMessage.method];
		if (requestHandler) {
			try {
				let handlerResult = requestHandler(requestMessage.params);
				let promise = <Thenable<any | ResponseError<any>>>handlerResult;
				if (!promise) {
					replySuccess({});
				} else if (promise.then) {
					promise.then((resultOrError): any | ResponseError<any>  => {
						reply(resultOrError);
					}, error => {
						if (error instanceof ResponseError) {
							replyError(<ResponseError<any>>error);
						} else if (error && is.string(error.message)) {
							replyError(new ResponseError<void>(ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`));
						} else {
							replyError(new ResponseError<void>(ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`));
						}
					});
				} else {
					reply(handlerResult);
				}
			} catch (error) {
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
		let key = String(responseMessage.id);
		var responseHandler = responseHandlers[key];
		if (responseHandler) {
			try {
				if (responseMessage.error) {
					responseHandler.reject(responseMessage.error);
				} else if (responseMessage.result) {
					responseHandler.resolve(responseMessage.result);
				} else {
					responseHandler.resolve(undefined);
				}
				delete responseHandlers[key];
			} catch (error) {
				if (error.message) {
					 logger.error(`Response handler '${responseHandler.method}' failed with message: ${error.message}`);
				} else {
					logger.error(`Response handler '${responseHandler.method}' failed unexpectedly.`);
				}
			}
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

	let connection: MessageConnection = {
		sendNotification: <P>(type: NotificationType<P>, params) => {
			let notificatioMessage : NotificationMessage = {
				jsonrpc: version,
				method: type.method,
				params: params
			}
			protocolWriter.write(notificatioMessage);
		},
		onNotification: <P>(type: NotificationType<P>, handler: INotificationHandler<P>) => {
			eventHandlers[type.method] = handler;
		},
		dispose: () => {
		},
		listen: () => {
			new MessageReader(inputStream, callback);
		}
	};
	if (client) {
		(connection as ClientMessageConnection).sendRequest = <P, R, E>(type: RequestType<P, R, E>, params: P) => {
			return new Promise<R | ResponseError<E>>((resolve, reject) => {
				let id = sequenceNumber++;
				let requestMessage : RequestMessage = {
					jsonrpc: version,
					id: id,
					method: type.method,
					params: params
				}
				responseHandlers[String(id)] = { method: type.method, resolve, reject };
				protocolWriter.write(requestMessage);
			});
		}
	} else {
		(connection as ServerMessageConnection).onRequest = <P, R, E>(type: RequestType<P, R, E>, handler: IRequestHandler<P, R, E>) => {
			requestHandlers[type.method] = handler;
		}
	}
	
	inputStream.on('end', () => outputStream.end());
	inputStream.on('close', () => outputStream.end());
	return connection as T;
}

export function createServerMessageConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, logger: ILogger): ServerMessageConnection {
	return createMessageConnection<ServerMessageConnection>(inputStream, outputStream, logger);
}

export function createClientMessageConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, logger: ILogger): ClientMessageConnection {
	return createMessageConnection<ClientMessageConnection>(inputStream, outputStream, logger, true);
}