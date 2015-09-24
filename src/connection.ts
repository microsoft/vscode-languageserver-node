/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { Message, RequestMessage, RequestType, ResponseMessage, Response, EventMessage, EventType, isFailedResponse, isString } from './messages';
import { MessageReader, ICallback } from './messageReader';
import { MessageWriter } from './messageWriter';

export const ERROR_NOT_HANDLED = 0x100;
export const ERROR_HANDLER_FAILURE = 0x101;
export const ERROR_CUSTOM = 0x1000;

export type RequestResult<U> = Thenable<U> | U;

export interface IRequestHandler<T, U extends Response> {
	(body?: T): RequestResult<U>;
}

export interface IEventHandler<T> {
	(body?: T): void;
}

/* @internal */
export interface Connection {
	sendEvent<T>(type: EventType<T>, body?: T) : void;
	onRequest<T, R extends Response>(type: RequestType<T, R>, handler: IRequestHandler<any, R>) : void;
	onEvent<T>(type: EventType<T>, handler: IEventHandler<T>) : void;
	dispose(): void;
}

/* @internal */
export interface WorkerConnection extends Connection {
}

/* @internal */
export interface ClientConnection extends Connection {
	sendRequest<T, R extends Response>(type: RequestType<T, R>, args?: any) : Thenable<R>;
}

function connect<T extends Connection>(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, client: boolean = false): T {
	let protocolWriter = new MessageWriter(outputStream);
	let sequenceNumber = 0;

	let requestHandlers : { [name:string]: IRequestHandler<any, Response> } = Object.create(null);
	let responseHandlers : { [name:string]: { resolve: (Response) => void, reject: (error: any) => void } } = Object.create(null);

	let eventHandlers : { [name:string]: IEventHandler<any> } = Object.create(null);

	var connection: Connection = {
		sendEvent: <T>(type: EventType<T>, body) => {
			var eventMessage : EventMessage = {
				type: Message.Event,
				seq: sequenceNumber++,
				event: type.event,
				body: body
			}
			protocolWriter.write(eventMessage);
		},
		onRequest: <T, R extends Response>(type: RequestType<T, R>, handler: IRequestHandler<any, R>) => {
			requestHandlers[type.command] = handler;
		},
		onEvent: <T>(type: EventType<T>, handler: IEventHandler<T>) => {
			eventHandlers[type.event] = handler;
		},
		dispose: () => {
			// TODO
		}
	};
	if (client) {
		(connection as ClientConnection).sendRequest = <T, R extends Response>(type: RequestType<T, R>, args) => {
			return new Promise<Response>((resolve, reject) => {
				let requestMessage : RequestMessage = {
					type: Message.Request,
					seq: sequenceNumber++,
					command: type.command,
					arguments: args
				}
				responseHandlers[String(requestMessage.seq)] = { resolve, reject };
				protocolWriter.write(requestMessage);
			});
		}
	}
	inputStream.on('end', () => outputStream.end());
	inputStream.on('close', () => outputStream.end());

	function handleRequest(requestMessage: RequestMessage) {
		function reply(response: Response): void {
			let result: ResponseMessage = <ResponseMessage> response;
			result.type = Message.Response;
			result.seq = sequenceNumber++;
			result.request_seq = requestMessage.seq;
			result.command = requestMessage.command;
			protocolWriter.write(result);
		}

		let requestHandler = requestHandlers[requestMessage.command];
		if (requestHandler) {
			try {
				let handlerResult = requestHandler(requestMessage.arguments);
				let promise = <Thenable<Response>> handlerResult;
				if (!promise) {
					reply({ success: false, message: `Handler ${requestMessage.command} failure`, code: ERROR_HANDLER_FAILURE });
				} else if (promise.then) {
					promise.then(responseContent => {
						reply(responseContent);
					}, error => {
						if (isFailedResponse(error)) {
							reply(error);
						} else if (error && isString(error.message)) {
							reply({ success: false, message: error.message, code: ERROR_HANDLER_FAILURE });
						} else {
							reply({ success: false, message: 'Request failed unexpectedly.', code: ERROR_HANDLER_FAILURE });
						}
					});
				} else {
					reply(<Response> handlerResult);
				}
			} catch (error) {
				if (error && isString(error.message)) {
					reply({ success: false, message: error.message, code: ERROR_HANDLER_FAILURE });
				} else {
					reply({ success: false, message: 'Request failed unexpectedly.', code: ERROR_HANDLER_FAILURE });
				}
			}
		} else {
			reply({ success: false, message: `Unhandled command ${requestMessage.command}`, code: ERROR_NOT_HANDLED });
		}
	}

	function handleResponse(responseMessage: ResponseMessage) {
		var responseHandler = responseHandlers[String(responseMessage.request_seq)];
		if (responseHandler) {
			responseHandler.resolve(responseMessage);
			delete responseHandlers[String(responseMessage.request_seq)];
		}
	}

	function handleEvent(eventMessage: EventMessage) {
		var eventHandler = eventHandlers[eventMessage.event];
		if (eventHandler) {
			try {
				eventHandler(eventMessage.body);
			} catch (error) {
				if (error.message) {
					console.error(`Event handler '${eventMessage.event}' failed with message: ${error.message}`)
				} else {
					console.error(`Event handler '${eventMessage.event}' failed unexpectedly.`);
				}
			}
		}
	}

	let callback: ICallback;
	if (client) {
		callback = (message) => {
			if (message.type === Message.Response) {
				handleResponse(message as ResponseMessage)
			} else if (message.type === Message.Event) {
				handleEvent(<EventMessage> message);
			}
		}
	} else {
		callback = (message) => {
			if (message.type === Message.Request) {
				handleRequest(<RequestMessage> message);
			} else if (message.type === Message.Event) {
				handleEvent(<EventMessage> message);
			}
		}
	}
	new MessageReader(inputStream, callback);
	return connection as T;
}

export function connectWorker(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream): WorkerConnection {
	return connect<WorkerConnection>(inputStream, outputStream);
}

export function connectClient(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream): ClientConnection {
	return connect<ClientConnection>(inputStream, outputStream, true);
}