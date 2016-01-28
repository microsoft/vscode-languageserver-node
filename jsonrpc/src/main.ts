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

import { IMessageReader, DataCallback, StreamMessageReader, IPCMessageReader } from './messageReader';
import { IMessageWriter, StreamMessageWriter, IPCMessageWriter } from './messageWriter';

export {
	ErrorCodes, ResponseError, RequestType, NotificationType,
	IMessageReader, DataCallback, StreamMessageReader, IPCMessageReader,
	IMessageWriter, StreamMessageWriter, IPCMessageWriter
}

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
	sendRequest<P, R, E>(type: RequestType<P, R, E>, params?: P) : Thenable<R>;
	onRequest<P, R, E>(type: RequestType<P, R, E>, handler: IRequestHandler<P, R, E>): void;
	sendNotification<P>(type: NotificationType<P>, params?: P): void;
	onNotification<P>(type: NotificationType<P>, handler: INotificationHandler<P>): void;
	listen();
	dispose(): void;
}

export interface ServerMessageConnection extends MessageConnection {
}

export interface ClientMessageConnection extends MessageConnection {
}

function createMessageConnection<T extends MessageConnection>(messageReader: IMessageReader, messageWriter: IMessageWriter, logger: ILogger, client: boolean = false): T {
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
			try {
				let handlerResult = requestHandler(requestMessage.params);
				let promise = <Thenable<any | ResponseError<any>>>handlerResult;
				if (!handlerResult) {
					replySuccess(handlerResult);
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
		let responseHandler = responseHandlers[key];
		if (responseHandler) {
			try {
				if (is.defined(responseMessage.error)) {
					responseHandler.reject(responseMessage.error);
				} else if (is.defined(responseMessage.result)) {
					responseHandler.resolve(responseMessage.result);
				} else {
					throw new Error('Should never happen.');
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

	function handleInvalidMessage(message: Message) {
		if (!message) {
			logger.error('Received empty message.');
			return;
		}
		logger.error(`Recevied message which is neither a response nor a notification message:\n${JSON.stringify(message, null, 4)}`);
		// Test whether we find an id to reject the promise
		let responseMessage: ResponseMessage = message as ResponseMessage;
		if (is.string(responseMessage.id) || is.number(responseMessage.id)) {
			let key = String(responseMessage.id);
			let responseHandler = responseHandlers[key];
			if (responseHandler) {
				responseHandler.reject(new Error('The received response has neither a result nor an error property.'));
			}
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

	let connection: MessageConnection = {
		sendNotification: <P>(type: NotificationType<P>, params) => {
			let notificatioMessage : NotificationMessage = {
				jsonrpc: version,
				method: type.method,
				params: params
			}
			messageWriter.write(notificatioMessage);
		},
		onNotification: <P>(type: NotificationType<P>, handler: INotificationHandler<P>) => {
			eventHandlers[type.method] = handler;
		},
		sendRequest: <P, R, E>(type: RequestType<P, R, E>, params: P) => {
			return new Promise<R | ResponseError<E>>((resolve, reject) => {
				let id = sequenceNumber++;
				let requestMessage : RequestMessage = {
					jsonrpc: version,
					id: id,
					method: type.method,
					params: params
				}
				responseHandlers[String(id)] = { method: type.method, resolve, reject };
				messageWriter.write(requestMessage);
			});
		},
		onRequest: <P, R, E>(type: RequestType<P, R, E>, handler: IRequestHandler<P, R, E>) => {
			requestHandlers[type.method] = handler;
		},
		dispose: () => {
		},
		listen: () => {
			messageReader.listen(callback);
		}
	};
	return connection as T;
}

function isMessageReader(value: any): value is IMessageReader {
	return is.defined(value.listen) && is.undefined(value.read);
}

function isMessageWriter(value: any): value is IMessageWriter {
	return is.defined(value.write) && is.undefined(value.end);
}

export function createServerMessageConnection(reader: IMessageReader, writer: IMessageWriter, logger: ILogger): ServerMessageConnection;
export function createServerMessageConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, logger: ILogger): ServerMessageConnection;
export function createServerMessageConnection(input: IMessageReader | NodeJS.ReadableStream, output: IMessageWriter | NodeJS.WritableStream, logger: ILogger): ServerMessageConnection {
	let reader = isMessageReader(input) ? input : new StreamMessageReader(input);
	let writer = isMessageWriter(output) ? output : new StreamMessageWriter(output);
	return createMessageConnection<ServerMessageConnection>(reader, writer, logger);
}

export function createClientMessageConnection(reader: IMessageReader, writer: IMessageWriter, logger: ILogger): ClientMessageConnection;
export function createClientMessageConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, logger: ILogger): ClientMessageConnection;
export function createClientMessageConnection(input: IMessageReader | NodeJS.ReadableStream, output: IMessageWriter | NodeJS.WritableStream, logger: ILogger): ClientMessageConnection {
	let reader = isMessageReader(input) ? input : new StreamMessageReader(input);
	let writer = isMessageWriter(output) ? output : new StreamMessageWriter(output);
	return createMessageConnection<ClientMessageConnection>(reader, writer, logger, true);
}