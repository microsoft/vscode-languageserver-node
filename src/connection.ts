/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { Message, RequestMessage, ResponseMessage, Response, EventMessage } from './messages';
import { MessageReader } from './messageReader';
import { MessageWriter } from './messageWriter';

export let ERROR_NOT_HANDLED = 0x100;
export let ERROR_HANDLER_FAILURE = 0x101;

export let ERROR_CUSTOM = 0x1000;

export interface IRequestHandler<T, U extends Response> {
	(body?: T): Thenable<U> | U;
}

export interface IEventHandler<T> {
	(body?: T): void;
}

export interface Connection {
	sendRequest(command: string, args?: any) : Thenable<Response>;
	sendEvent(event: string, body?: any) : void;
	onRequest(command: string, handler: IRequestHandler<any, Response>) : void;
	onEvent(event: string, handler: IEventHandler<any>) : void;
	dispose(): void;
}

export function connect(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream) : Connection {
		
	var protocolWriter = new MessageWriter(outputStream);
	var sequenceNumber = 0;

	var requestHandlers : { [name:string]: IRequestHandler<any, Response> } = {};
	var eventHandlers : { [name:string]: IEventHandler<any> } = {};
	var responseHandlers : { [name:string]: { resolve: (Response) => void, reject: (error: any) => void } } = {};
	
	var connection : Connection = {
		sendEvent: (event, body) => {
			var eventMessage : EventMessage = {
				type: Message.Event,
				seq: sequenceNumber++,
				event: event,
				body: body
			}
			protocolWriter.write(eventMessage);
		},
		sendRequest: (command, args) => {
			var seq = sequenceNumber++;			
			var requestMessage : RequestMessage = {
				type: Message.Request,
				seq: seq,
				command: command,
				arguments: args
			}
			protocolWriter.write(requestMessage);
			
			return new Promise<Response>((resolve, reject) => {
				responseHandlers[String(seq)] = { resolve, reject };
			});
		},
		onRequest: (command: string, handler: IRequestHandler<any, Response>) => {
			requestHandlers[command] = handler;
		},
		onEvent: (event: string, handler: IEventHandler<any>) => {
			eventHandlers[event] = handler;
		},
		dispose: () => {
			// TODO
		}
	};
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
		
		var requestHandler = requestHandlers[requestMessage.command];
		if (requestHandler) {
			try {
				var handlerResult = requestHandler(requestMessage.arguments);
				var promise = <Thenable<Response>> handlerResult;
				if (!promise) {
					reply({ success: false, message: `Handler ${requestMessage.command} failure`, code: ERROR_HANDLER_FAILURE });
				} else if (promise.then) {
					promise.then(responseContent => {
						reply(responseContent);
					}, error => {
						reply({ success: false, message: `Request failed unexpectedly: ${error.message}`, code: ERROR_HANDLER_FAILURE });
					});
				} else {
					reply(<Response> handlerResult);
				}
			} catch (error) {
				reply({ success: false, message: `Request failed unexpectedly: ${error.message}`, code: ERROR_HANDLER_FAILURE });
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
			eventHandler(eventMessage.body);
		}
	}	
	
	new MessageReader(inputStream, (message) => {
		if (message.type === Message.Response) {
			handleResponse(<ResponseMessage> message);
		} else if (message.type === Message.Request) {
			handleRequest(<RequestMessage> message);
		} else if (message.type === Message.Event) {
			handleEvent(<EventMessage> message);
		}
	});
	return connection;
}
