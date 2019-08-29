/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="./thenable.d.ts" />
'use strict';

import * as Is from './is';

import {
	Message, MessageType,
	RequestMessage, RequestType, isRequestMessage,
	RequestType0, RequestType1, RequestType2, RequestType3, RequestType4,
	RequestType5, RequestType6, RequestType7, RequestType8, RequestType9,
	ResponseMessage, isResponseMessage, ResponseError, ErrorCodes,
	NotificationMessage, isNotificationMessage,
	NotificationType, NotificationType0, NotificationType1, NotificationType2, NotificationType3, NotificationType4,
	NotificationType5, NotificationType6, NotificationType7, NotificationType8, NotificationType9,
	LSPMessageType,
	_EM
} from './messages';

import { MessageReader, DataCallback, StreamMessageReader, IPCMessageReader, SocketMessageReader } from './messageReader';
import { MessageWriter, StreamMessageWriter, IPCMessageWriter, SocketMessageWriter } from './messageWriter';
import { Disposable, Event, Emitter } from './events';
import { CancellationTokenSource, CancellationToken } from './cancellation';
import { LinkedMap } from './linkedMap';

export {
	Message, MessageType, ErrorCodes, ResponseError,
	RequestMessage, RequestType,
	RequestType0, RequestType1, RequestType2, RequestType3, RequestType4,
	RequestType5, RequestType6, RequestType7, RequestType8, RequestType9,
	NotificationMessage, NotificationType,
	NotificationType0, NotificationType1, NotificationType2, NotificationType3, NotificationType4,
	NotificationType5, NotificationType6, NotificationType7, NotificationType8, NotificationType9,
	MessageReader, DataCallback, StreamMessageReader, IPCMessageReader, SocketMessageReader,
	MessageWriter, StreamMessageWriter, IPCMessageWriter, SocketMessageWriter,
	CancellationTokenSource, CancellationToken,
	Disposable, Event, Emitter
};
export * from './pipeSupport';
export * from './socketSupport';

interface CancelParams {
	/**
	 * The request id to cancel.
	 */
	id: number | string;
}

namespace CancelNotification {
	export const type = new NotificationType<CancelParams, void>('$/cancelRequest');
}

export type ProgressToken = number | string;
interface ProgressParams<T> {
	/**
	 * The progress token provided by the client.
	 */
	token: ProgressToken;

	/**
	 * The progress data.
	 */
	value: T;
}

namespace ProgressNotification {
	export const type = new NotificationType<ProgressParams<any>, void>('$/progress');
}

export class ProgressType<P> {
	public readonly _?: [P, _EM];
	constructor() {
		this._ = undefined;
	}
}

export type HandlerResult<R, E> = R | ResponseError<E> | Thenable<R> | Thenable<ResponseError<E>> | Thenable<R | ResponseError<E>>;

export interface StarRequestHandler {
	(method: string, ...params: any[]): HandlerResult<any, any>;
}

export interface GenericRequestHandler<R, E> {
	(...params: any[]): HandlerResult<R, E>;
}

export interface RequestHandler0<R, E> {
	(token: CancellationToken): HandlerResult<R, E>;
}

export interface RequestHandler<P, R, E> {
	(params: P, token: CancellationToken): HandlerResult<R, E>;
}

export interface RequestHandler1<P1, R, E> {
	(p1: P1, token: CancellationToken): HandlerResult<R, E>;
}

export interface RequestHandler2<P1, P2, R, E> {
	(p1: P1, p2: P2, token: CancellationToken): HandlerResult<R, E>;
}

export interface RequestHandler3<P1, P2, P3, R, E> {
	(p1: P1, p2: P2, p3: P3, token: CancellationToken): HandlerResult<R, E>;
}

export interface RequestHandler4<P1, P2, P3, P4, R, E> {
	(p1: P1, p2: P2, p3: P3, p4: P4, token: CancellationToken): HandlerResult<R, E>;
}

export interface RequestHandler5<P1, P2, P3, P4, P5, R, E> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, token: CancellationToken): HandlerResult<R, E>;
}

export interface RequestHandler6<P1, P2, P3, P4, P5, P6, R, E> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, token: CancellationToken): HandlerResult<R, E>;
}

export interface RequestHandler7<P1, P2, P3, P4, P5, P6, P7, R, E> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, token: CancellationToken): HandlerResult<R, E>;
}

export interface RequestHandler8<P1, P2, P3, P4, P5, P6, P7, P8, R, E> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8, token: CancellationToken): HandlerResult<R, E>;
}

export interface RequestHandler9<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E> {
	(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8, p9: P9, token: CancellationToken): HandlerResult<R, E>;
}

export interface StarNotificationHandler {
	(method: string, ...params: any[]): void;
}

export interface GenericNotificationHandler {
	(...params: any[]): void;
}

export interface NotificationHandler0 {
	(): void;
}

export interface NotificationHandler<P> {
	(params: P): void;
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

export const NullLogger: Logger = Object.freeze({
	error: () => {},
	warn: () => {},
	info: () => {},
	log: () => {}
});

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

export enum TraceFormat {
	Text = 'text',
	JSON = 'json'
}
export namespace TraceFormat {
	export function fromString(value: string): TraceFormat {
		value = value.toLowerCase();
		if (value === 'json') {
			return TraceFormat.JSON;
		} else {
			return TraceFormat.Text;
		}
	}
}

export interface TraceOptions {
	sendNotification?: boolean;
	traceFormat?: TraceFormat;
}

export interface SetTraceParams {
	value: TraceValues;
}

export namespace SetTraceNotification {
	export const type = new NotificationType<SetTraceParams, void>('$/setTraceNotification');
}

export interface LogTraceParams {
	message: string;
	verbose?: string;
}

export namespace LogTraceNotification {
	export const type = new NotificationType<LogTraceParams, void>('$/logTraceNotification');
}

export interface Tracer {
	log(dataObject: any): void;
	log(message: string, data?: string): void;
}

export enum ConnectionErrors {
	/**
	 * The connection is closed.
	 */
	Closed = 1,
	/**
	 * The connection got disposed.
	 */
	Disposed = 2,
	/**
	 * The connection is already in listening mode.
	 */
	AlreadyListening = 3
}

export class ConnectionError extends Error {

	public readonly code: ConnectionErrors;

	constructor(code: ConnectionErrors, message: string) {
		super(message);
		this.code = code;
		Object.setPrototypeOf(this, ConnectionError.prototype);
	}
}

export type MessageQueue = LinkedMap<string, Message>;

export type ConnectionStrategy = {
	cancelUndispatched?: (message: Message, next: (message: Message) => ResponseMessage | undefined) => ResponseMessage | undefined;
};

export namespace ConnectionStrategy {
	export function is(value: any): value is ConnectionStrategy {
		let candidate: ConnectionStrategy = value;
		return candidate && Is.func(candidate.cancelUndispatched);
	}
}

export interface MessageConnection {
	sendRequest<R, E, RO>(type: RequestType0<R, E, RO>, token?: CancellationToken): Thenable<R>;
	sendRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, params: P, token?: CancellationToken): Thenable<R>;
	sendRequest<P1, R, E, RO>(type: RequestType1<P1, R, E, RO>, p1: P1, token?: CancellationToken): Thenable<R>;
	sendRequest<P1, P2, R, E, RO>(type: RequestType2<P1, P2, R, E, RO>, p1: P1, p2: P2, token?: CancellationToken): Thenable<R>;
	sendRequest<P1, P2, P3, R, E, RO>(type: RequestType3<P1, P2, P3, R, E, RO>, p1: P1, p2: P2, p3: P3, token?: CancellationToken): Thenable<R>;
	sendRequest<P1, P2, P3, P4, R, E, RO>(type: RequestType4<P1, P2, P3, P4, R, E, RO>, p1: P1, p2: P2, p3: P3, p4: P4, token?: CancellationToken): Thenable<R>;
	sendRequest<P1, P2, P3, P4, P5, R, E, RO>(type: RequestType5<P1, P2, P3, P4, P5, R, E, RO>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, token?: CancellationToken): Thenable<R>;
	sendRequest<P1, P2, P3, P4, P5, P6, R, E, RO>(type: RequestType6<P1, P2, P3, P4, P5, P6, R, E, RO>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, token?: CancellationToken): Thenable<R>;
	sendRequest<P1, P2, P3, P4, P5, P6, P7, R, E, RO>(type: RequestType7<P1, P2, P3, P4, P5, P6, P7, R, E, RO>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, token?: CancellationToken): Thenable<R>;
	sendRequest<P1, P2, P3, P4, P5, P6, P7, P8, R, E, RO>(type: RequestType8<P1, P2, P3, P4, P5, P6, P7, P8, R, E, RO>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8, token?: CancellationToken): Thenable<R>;
	sendRequest<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E, RO>(type: RequestType9<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E, RO>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8, p9: P9, token?: CancellationToken): Thenable<R>;
	sendRequest<R>(method: string, ...params: any[]): Thenable<R>;

	onRequest<R, E, RO>(type: RequestType0<R, E, RO>, handler: RequestHandler0<R, E>): void;
	onRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, handler: RequestHandler<P, R, E>): void;
	onRequest<P1, R, E, RO>(type: RequestType1<P1, R, E, RO>, handler: RequestHandler1<P1, R, E>): void;
	onRequest<P1, P2, R, E, RO>(type: RequestType2<P1, P2, R, E, RO>, handler: RequestHandler2<P1, P2, R, E>): void;
	onRequest<P1, P2, P3, R, E, RO>(type: RequestType3<P1, P2, P3, R, E, RO>, handler: RequestHandler3<P1, P2, P3, R, E>): void;
	onRequest<P1, P2, P3, P4, R, E, RO>(type: RequestType4<P1, P2, P3, P4, R, E, RO>, handler: RequestHandler4<P1, P2, P3, P4, R, E>): void;
	onRequest<P1, P2, P3, P4, P5, R, E, RO>(type: RequestType5<P1, P2, P3, P4, P5, R, E, RO>, handler: RequestHandler5<P1, P2, P3, P4, P5, R, E>): void;
	onRequest<P1, P2, P3, P4, P5, P6, R, E, RO>(type: RequestType6<P1, P2, P3, P4, P5, P6, R, E, RO>, handler: RequestHandler6<P1, P2, P3, P4, P5, P6, R, E>): void;
	onRequest<P1, P2, P3, P4, P5, P6, P7, R, E, RO>(type: RequestType7<P1, P2, P3, P4, P5, P6, P7, R, E, RO>, handler: RequestHandler7<P1, P2, P3, P4, P5, P6, P7, R, E>): void;
	onRequest<P1, P2, P3, P4, P5, P6, P7, P8, R, E, RO>(type: RequestType8<P1, P2, P3, P4, P5, P6, P7, P8, R, E, RO>, handler: RequestHandler8<P1, P2, P3, P4, P5, P6, P7, P8, R, E>): void;
	onRequest<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E, RO>(type: RequestType9<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E, RO>, handler: RequestHandler9<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E>): void;
	onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): void;
	onRequest(handler: StarRequestHandler): void;

	sendNotification<RO>(type: NotificationType0<RO>): void;
	sendNotification<P, RO>(type: NotificationType<P, RO>, params?: P): void;
	sendNotification<P1, RO>(type: NotificationType1<P1, RO>, p1: P1): void;
	sendNotification<P1, P2, RO>(type: NotificationType2<P1, P2, RO>, p1: P1, p2: P2): void;
	sendNotification<P1, P2, P3, RO>(type: NotificationType3<P1, P2, P3, RO>, p1: P1, p2: P2, p3: P3): void;
	sendNotification<P1, P2, P3, P4, RO>(type: NotificationType4<P1, P2, P3, P4, RO>, p1: P1, p2: P2, p3: P3, p4: P4): void;
	sendNotification<P1, P2, P3, P4, P5, RO>(type: NotificationType5<P1, P2, P3, P4, P5, RO>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5): void;
	sendNotification<P1, P2, P3, P4, P5, P6, RO>(type: NotificationType6<P1, P2, P3, P4, P5, P6, RO>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6): void;
	sendNotification<P1, P2, P3, P4, P5, P6, P7, RO>(type: NotificationType7<P1, P2, P3, P4, P5, P6, P7, RO>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7): void;
	sendNotification<P1, P2, P3, P4, P5, P6, P7, P8, RO>(type: NotificationType8<P1, P2, P3, P4, P5, P6, P7, P8, RO>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8): void;
	sendNotification<P1, P2, P3, P4, P5, P6, P7, P8, P9, RO>(type: NotificationType9<P1, P2, P3, P4, P5, P6, P7, P8, P9, RO>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8, p9: P9): void;
	sendNotification(method: string, ...params: any[]): void;

	onNotification<RO>(type: NotificationType0<RO>, handler: NotificationHandler0): void;
	onNotification<P, RO>(type: NotificationType<P, RO>, handler: NotificationHandler<P>): void;
	onNotification<P1, RO>(type: NotificationType1<P1, RO>, handler: NotificationHandler1<P1>): void;
	onNotification<P1, P2, RO>(type: NotificationType2<P1, P2, RO>, handler: NotificationHandler2<P1, P2>): void;
	onNotification<P1, P2, P3, RO>(type: NotificationType3<P1, P2, P3, RO>, handler: NotificationHandler3<P1, P2, P3>): void;
	onNotification<P1, P2, P3, P4, RO>(type: NotificationType4<P1, P2, P3, P4, RO>, handler: NotificationHandler4<P1, P2, P3, P4>): void;
	onNotification<P1, P2, P3, P4, P5, RO>(type: NotificationType5<P1, P2, P3, P4, P5, RO>, handler: NotificationHandler5<P1, P2, P3, P4, P5>): void;
	onNotification<P1, P2, P3, P4, P5, P6, RO>(type: NotificationType6<P1, P2, P3, P4, P5, P6, RO>, handler: NotificationHandler6<P1, P2, P3, P4, P5, P6>): void;
	onNotification<P1, P2, P3, P4, P5, P6, P7, RO>(type: NotificationType7<P1, P2, P3, P4, P5, P6, P7, RO>, handler: NotificationHandler7<P1, P2, P3, P4, P5, P6, P7>): void;
	onNotification<P1, P2, P3, P4, P5, P6, P7, P8, RO>(type: NotificationType8<P1, P2, P3, P4, P5, P6, P7, P8, RO>, handler: NotificationHandler8<P1, P2, P3, P4, P5, P6, P7, P8>): void;
	onNotification<P1, P2, P3, P4, P5, P6, P7, P8, P9, RO>(type: NotificationType9<P1, P2, P3, P4, P5, P6, P7, P8, P9, RO>, handler: NotificationHandler9<P1, P2, P3, P4, P5, P6, P7, P8, P9>): void;
	onNotification(method: string, handler: GenericNotificationHandler): void;
	onNotification(handler: StarNotificationHandler): void;

	onUnhandledNotification: Event<NotificationMessage>;

	onProgress<P>(type: ProgressType<P>, token: string | number, handler: NotificationHandler<P>): Disposable;
	sendProgress<P>(type: ProgressType<P>, token: string | number, value: P): void;

	onUnhandledProgress: Event<ProgressParams<any>>;

	trace(value: Trace, tracer: Tracer, sendNotification?: boolean): void;
	trace(value: Trace, tracer: Tracer, traceOptions?: TraceOptions): void;

	onError: Event<[Error, Message | undefined, number | undefined]>;
	onClose: Event<void>;
	listen(): void;

	onDispose: Event<void>;
	dispose(): void;

	inspect(): void;
}

interface ResponsePromise {
	method: string;
	timerStart: number;
	resolve: (response: any) => void;
	reject: (error: any) => void
}

enum ConnectionState {
	New = 1,
	Listening = 2,
	Closed = 3,
	Disposed = 4
}

interface RequestHandlerElement {
	type: MessageType | undefined;
	handler: GenericRequestHandler<any, any>;
}
interface NotificationHandlerElement {
	type: MessageType | undefined;
	handler: GenericNotificationHandler;
}

function _createMessageConnection(messageReader: MessageReader, messageWriter: MessageWriter, logger: Logger, strategy?: ConnectionStrategy): MessageConnection {
	let sequenceNumber = 0;
	let notificationSquenceNumber = 0;
	let unknownResponseSquenceNumber = 0;
	const version: string = '2.0';

	let starRequestHandler: StarRequestHandler | undefined = undefined;
	let requestHandlers: { [name: string]: RequestHandlerElement | undefined } = Object.create(null);
	let starNotificationHandler: StarNotificationHandler | undefined = undefined;
	let notificationHandlers: { [name: string]: NotificationHandlerElement | undefined } = Object.create(null);
	let progressHandlers: Map<number | string, NotificationHandler1<any>> = new Map();

	let timer: NodeJS.Timer | undefined;
	let messageQueue: MessageQueue = new LinkedMap<string, Message>();
	let responsePromises: { [name: string]: ResponsePromise } = Object.create(null);
	let requestTokens: { [id: string]: CancellationTokenSource } = Object.create(null);

	let trace: Trace = Trace.Off;
	let traceFormat: TraceFormat = TraceFormat.Text;
	let tracer: Tracer | undefined;

	let state: ConnectionState = ConnectionState.New;
	let errorEmitter: Emitter<[Error, Message | undefined, number | undefined]> = new Emitter<[Error, Message, number]>();
	let closeEmitter: Emitter<void> = new Emitter<void>();
	let unhandledNotificationEmitter: Emitter<NotificationMessage> = new Emitter<NotificationMessage>();
	let unhandledProgressEmitter: Emitter<ProgressParams<any>> = new Emitter<ProgressParams<any>>();

	let disposeEmitter: Emitter<void> = new Emitter<void>();

	function createRequestQueueKey(id: string | number): string {
		return 'req-' + id.toString();
	}

	function createResponseQueueKey(id: string | number | null): string {
		if (id === null) {
			return 'res-unknown-' + (++unknownResponseSquenceNumber).toString();
		} else {
			return 'res-' + id.toString();
		}
	}

	function createNotificationQueueKey(): string {
		return 'not-' + (++notificationSquenceNumber).toString();
	}

	function addMessageToQueue(queue: MessageQueue, message: Message): void {
		if (isRequestMessage(message)) {
			queue.set(createRequestQueueKey(message.id), message);
		} else if (isResponseMessage(message)) {
			queue.set(createResponseQueueKey(message.id), message);
		} else {
			queue.set(createNotificationQueueKey(), message);
		}
	}

	function cancelUndispatched(_message: Message): ResponseMessage | undefined {
		return undefined;
	}

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
	}

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

	function triggerMessageQueue(): void {
		if (timer || messageQueue.size === 0) {
			return;
		}
		timer = setImmediate(() => {
			timer = undefined;
			processMessageQueue();
		});
	}

	function processMessageQueue(): void {
		if (messageQueue.size === 0) {
			return;
		}
		let message = messageQueue.shift()!;
		try {
			if (isRequestMessage(message)) {
				handleRequest(message);
			} else if (isNotificationMessage(message)) {
				handleNotification(message);
			} else if (isResponseMessage(message)) {
				handleResponse(message);
			} else {
				handleInvalidMessage(message);
			}
		} finally {
			triggerMessageQueue();
		}
	}

	let callback: DataCallback = (message) => {
		try {
			// We have received a cancellation message. Check if the message is still in the queue
			// and cancel it if allowed to do so.
			if (isNotificationMessage(message) && message.method === CancelNotification.type.method) {
				let key = createRequestQueueKey((message.params as CancelParams).id);
				let toCancel = messageQueue.get(key);
				if (isRequestMessage(toCancel)) {
					let response = strategy && strategy.cancelUndispatched ? strategy.cancelUndispatched(toCancel, cancelUndispatched) : cancelUndispatched(toCancel);
					if (response && (response.error !== void 0 || response.result !== void 0)) {
						messageQueue.delete(key);
						response.id = toCancel.id;
						traceSendingResponse(response, message.method, Date.now());
						messageWriter.write(response);
						return;
					}
				}
			}
			addMessageToQueue(messageQueue, message);
		} finally {
			triggerMessageQueue();
		}
	};

	function handleRequest(requestMessage: RequestMessage) {
		if (isDisposed()) {
			// we return here silently since we fired an event when the
			// connection got disposed.
			return;
		}

		function reply(resultOrError: any | ResponseError<any>, method: string, startTime: number): void {
			let message: ResponseMessage = {
				jsonrpc: version,
				id: requestMessage.id
			};
			if (resultOrError instanceof ResponseError) {
				message.error = (<ResponseError<any>>resultOrError).toJson();
			} else {
				message.result = resultOrError === void 0 ? null : resultOrError;
			}
			traceSendingResponse(message, method, startTime);
			messageWriter.write(message);
		}
		function replyError(error: ResponseError<any>, method: string, startTime: number) {
			let message: ResponseMessage = {
				jsonrpc: version,
				id: requestMessage.id,
				error: error.toJson()
			};
			traceSendingResponse(message, method, startTime);
			messageWriter.write(message);
		}
		function replySuccess(result: any, method: string, startTime: number) {
			// The JSON RPC defines that a response must either have a result or an error
			// So we can't treat undefined as a valid response result.
			if (result === void 0) {
				result = null;
			}
			let message: ResponseMessage = {
				jsonrpc: version,
				id: requestMessage.id,
				result: result
			};
			traceSendingResponse(message, method, startTime);
			messageWriter.write(message);
		}

		traceReceivedRequest(requestMessage);

		let element = requestHandlers[requestMessage.method];
		let type: MessageType | undefined;
		let requestHandler: GenericRequestHandler<any, any> | undefined;
		if (element) {
			type = element.type;
			requestHandler = element.handler;
		}
		let startTime = Date.now();
		if (requestHandler || starRequestHandler) {
			let cancellationSource = new CancellationTokenSource();
			let tokenKey = String(requestMessage.id);
			requestTokens[tokenKey] = cancellationSource;
			try {
				let handlerResult: any;
				if (requestMessage.params === void 0 || (type !== void 0 && type.numberOfParams === 0)) {
					handlerResult = requestHandler
						? requestHandler(cancellationSource.token)
						: starRequestHandler!(requestMessage.method, cancellationSource.token);
				} else if (Is.array(requestMessage.params) && (type === void 0 || type.numberOfParams > 1)) {
					handlerResult = requestHandler
						? requestHandler(...requestMessage.params, cancellationSource.token)
						: starRequestHandler!(requestMessage.method, ...requestMessage.params, cancellationSource.token);
				} else {
					handlerResult = requestHandler
						? requestHandler(requestMessage.params, cancellationSource.token)
						: starRequestHandler!(requestMessage.method, requestMessage.params, cancellationSource.token);
				}

				let promise = <Thenable<any | ResponseError<any>>>handlerResult;
				if (!handlerResult) {
					delete requestTokens[tokenKey];
					replySuccess(handlerResult, requestMessage.method, startTime);
				} else if (promise.then) {
					promise.then((resultOrError): any | ResponseError<any> => {
						delete requestTokens[tokenKey];
						reply(resultOrError, requestMessage.method, startTime);
					}, error => {
						delete requestTokens[tokenKey];
						if (error instanceof ResponseError) {
							replyError(<ResponseError<any>>error, requestMessage.method, startTime);
						} else if (error && Is.string(error.message)) {
							replyError(new ResponseError<void>(ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`), requestMessage.method, startTime);
						} else {
							replyError(new ResponseError<void>(ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`), requestMessage.method, startTime);
						}
					});
				} else {
					delete requestTokens[tokenKey];
					reply(handlerResult, requestMessage.method, startTime);
				}
			} catch (error) {
				delete requestTokens[tokenKey];
				if (error instanceof ResponseError) {
					reply(<ResponseError<any>>error, requestMessage.method, startTime);
				} else if (error && Is.string(error.message)) {
					replyError(new ResponseError<void>(ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`), requestMessage.method, startTime);
				} else {
					replyError(new ResponseError<void>(ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`), requestMessage.method, startTime);
				}
			}
		} else {
			replyError(new ResponseError<void>(ErrorCodes.MethodNotFound, `Unhandled method ${requestMessage.method}`), requestMessage.method, startTime);
		}
	}

	function handleResponse(responseMessage: ResponseMessage) {
		if (isDisposed()) {
			// See handle request.
			return;
		}

		if (responseMessage.id === null) {
			if (responseMessage.error) {
				logger.error(`Received response message without id: Error is: \n${JSON.stringify(responseMessage.error, undefined, 4)}`);
			} else {
				logger.error(`Received response message without id. No further error information provided.`);
			}
		} else {
			let key = String(responseMessage.id);
			let responsePromise = responsePromises[key];
			traceReceivedResponse(responseMessage, responsePromise);
			if (responsePromise) {
				delete responsePromises[key];
				try {
					if (responseMessage.error) {
						let error = responseMessage.error;
						responsePromise.reject(new ResponseError(error.code, error.message, error.data));
					} else if (responseMessage.result !== void 0) {
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

	}

	function handleNotification(message: NotificationMessage) {
		if (isDisposed()) {
			// See handle request.
			return;
		}
		let type: MessageType | undefined = undefined;
		let notificationHandler: GenericNotificationHandler | undefined;
		if (message.method === CancelNotification.type.method) {
			notificationHandler = (params: CancelParams) => {
				let id = params.id;
				let source = requestTokens[String(id)];
				if (source) {
					source.cancel();
				}
			};
		} else {
			let element = notificationHandlers[message.method];
			if (element) {
				notificationHandler = element.handler;
				type = element.type;
			}
		}
		if (notificationHandler || starNotificationHandler) {
			try {
				traceReceivedNotification(message);
				if (message.params === void 0 || (type !== void 0 && type.numberOfParams === 0)) {
					notificationHandler ? notificationHandler() : starNotificationHandler!(message.method);
				} else if (Is.array(message.params) && (type === void 0 || type.numberOfParams > 1)) {
					notificationHandler ? notificationHandler(...message.params) : starNotificationHandler!(message.method, ...message.params);
				} else {
					notificationHandler ? notificationHandler(message.params) : starNotificationHandler!(message.method, message.params);
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
		if (Is.string(responseMessage.id) || Is.number(responseMessage.id)) {
			let key = String(responseMessage.id);
			let responseHandler = responsePromises[key];
			if (responseHandler) {
				responseHandler.reject(new Error('The received response has neither a result nor an error property.'));
			}
		}
	}

	function traceSendingRequest(message: RequestMessage): void {
		if (trace === Trace.Off || !tracer) {
			return;
		}

		if (traceFormat === TraceFormat.Text) {
			let data: string | undefined = undefined;
			if (trace === Trace.Verbose && message.params) {
				data = `Params: ${JSON.stringify(message.params, null, 4)}\n\n`;
			}
			tracer.log(`Sending request '${message.method} - (${message.id})'.`, data);
		} else {
			logLSPMessage('send-request', message);
		}
	}

	function traceSendingNotification(message: NotificationMessage): void {
		if (trace === Trace.Off || !tracer) {
			return;
		}

		if (traceFormat === TraceFormat.Text) {
			let data: string | undefined = undefined;
			if (trace === Trace.Verbose) {
				if (message.params) {
					data = `Params: ${JSON.stringify(message.params, null, 4)}\n\n`;
				} else {
					data = 'No parameters provided.\n\n';
				}
			}
			tracer.log(`Sending notification '${message.method}'.`, data);
		} else {
			logLSPMessage('send-notification', message);
		}
	}

	function traceSendingResponse(message: ResponseMessage, method: string, startTime: number): void {
		if (trace === Trace.Off || !tracer) {
			return;
		}

		if (traceFormat === TraceFormat.Text) {
			let data: string | undefined = undefined;
			if (trace === Trace.Verbose) {
				if (message.error && message.error.data) {
					data = `Error data: ${JSON.stringify(message.error.data, null, 4)}\n\n`;
				} else {
					if (message.result) {
						data = `Result: ${JSON.stringify(message.result, null, 4)}\n\n`;
					} else if (message.error === void 0) {
						data = 'No result returned.\n\n';
					}
				}
			}
			tracer.log(`Sending response '${method} - (${message.id})'. Processing request took ${Date.now() - startTime}ms`, data);
		} else {
			logLSPMessage('send-response', message);
		}
	}

	function traceReceivedRequest(message: RequestMessage): void {
		if (trace === Trace.Off || !tracer) {
			return;
		}

		if (traceFormat === TraceFormat.Text) {
			let data: string | undefined = undefined;
			if (trace === Trace.Verbose && message.params) {
				data = `Params: ${JSON.stringify(message.params, null, 4)}\n\n`;
			}
			tracer.log(`Received request '${message.method} - (${message.id})'.`, data);
		} else {
			logLSPMessage('receive-request', message);
		}
	}

	function traceReceivedNotification(message: NotificationMessage): void {
		if (trace === Trace.Off || !tracer || message.method === LogTraceNotification.type.method) {
			return;
		}

		if (traceFormat === TraceFormat.Text) {
			let data: string | undefined = undefined;
			if (trace === Trace.Verbose) {
				if (message.params) {
					data = `Params: ${JSON.stringify(message.params, null, 4)}\n\n`;
				} else {
					data = 'No parameters provided.\n\n';
				}
			}
			tracer.log(`Received notification '${message.method}'.`, data);
		} else {
			logLSPMessage('receive-notification', message);
		}
	}

	function traceReceivedResponse(message: ResponseMessage, responsePromise: ResponsePromise): void {
		if (trace === Trace.Off || !tracer) {
			return;
		}

		if (traceFormat === TraceFormat.Text) {
			let data: string | undefined = undefined;
			if (trace === Trace.Verbose) {
				if (message.error && message.error.data) {
					data = `Error data: ${JSON.stringify(message.error.data, null, 4)}\n\n`;
				} else {
					if (message.result) {
						data = `Result: ${JSON.stringify(message.result, null, 4)}\n\n`;
					} else if (message.error === void 0) {
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
		} else {
			logLSPMessage('receive-response', message);
		}
	}

	function logLSPMessage(type: LSPMessageType, message: RequestMessage | ResponseMessage | NotificationMessage): void {
		if (!tracer || trace === Trace.Off) {
			return;
		}

		const lspMessage = {
			isLSPMessage: true,
			type,
			message,
			timestamp: Date.now()
		};

		tracer.log(lspMessage);
	}

	function throwIfClosedOrDisposed() {
		if (isClosed()) {
			throw new ConnectionError(ConnectionErrors.Closed, 'Connection is closed.');
		}
		if (isDisposed()) {
			throw new ConnectionError(ConnectionErrors.Disposed, 'Connection is disposed.');
		}
	}

	function throwIfListening() {
		if (isListening()) {
			throw new ConnectionError(ConnectionErrors.AlreadyListening, 'Connection is already listening');
		}
	}

	function throwIfNotListening() {
		if (!isListening()) {
			throw new Error('Call listen() first.');
		}
	}

	function undefinedToNull(param: any) {
		if (param === void 0) {
			return null;
		} else {
			return param;
		}
	}

	function computeMessageParams(type: MessageType, params: any[]): any | any[] | null {
		let result: any | any[] | null;
		let numberOfParams = type.numberOfParams;
		switch (numberOfParams) {
			case 0:
				result = null;
				break;
			case 1:
				result = undefinedToNull(params[0]);
				break;
			default:
				result = [];
				for (let i = 0; i < params.length && i < numberOfParams; i++) {
					result.push(undefinedToNull(params[i]));
				}
				if (params.length < numberOfParams) {
					for (let i = params.length; i < numberOfParams; i++) {
						result.push(null);
					}
				}
				break;
		}
		return result;
	}

	let connection: MessageConnection = {
		sendNotification: (type: string | MessageType, ...params: any[]): void => {
			throwIfClosedOrDisposed();

			let method: string;
			let messageParams: any | any[] | null;
			if (Is.string(type)) {
				method = type;
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
			} else {
				method = type.method;
				messageParams = computeMessageParams(type, params);
			}
			let notificationMessage: NotificationMessage = {
				jsonrpc: version,
				method: method,
				params: messageParams
			};
			traceSendingNotification(notificationMessage);
			messageWriter.write(notificationMessage);
		},
		onNotification: (type: string | MessageType | StarNotificationHandler, handler?: GenericNotificationHandler): void => {
			throwIfClosedOrDisposed();
			if (Is.func(type)) {
				starNotificationHandler = type as StarNotificationHandler;
			} else if (handler) {
				if (Is.string(type)) {
					notificationHandlers[type] = { type: undefined, handler };
				} else {
					notificationHandlers[type.method] = { type, handler };
				}
			}
		},
		onProgress: <P>(_type: ProgressType<P>, token: string | number, handler: NotificationHandler<P>): Disposable => {
			if (progressHandlers.has(token)) {
				throw new Error(`Progress handler for token ${token} already registered`);
			}
			progressHandlers.set(token, handler);
			return {
				dispose: () => {
					progressHandlers.delete(token);
				}
			};
		},
		sendProgress: <P>(_type: ProgressType<P>, token: string | number, value: P): void => {
			connection.sendNotification(ProgressNotification.type, { token, value });
		},
		onUnhandledProgress: unhandledProgressEmitter.event,
		sendRequest: <R, E>(type: string | MessageType, ...params: any[]) => {
			throwIfClosedOrDisposed();
			throwIfNotListening();

			let method: string;
			let messageParams: object | object[] | null;
			let token: CancellationToken | undefined = undefined;
			if (Is.string(type)) {
				method = type;
				switch (params.length) {
					case 0:
						messageParams = null;
						break;
					case 1:
						// The cancellation token is optional so it can also be undefined.
						if (CancellationToken.is(params[0])) {
							messageParams = null;
							token = params[0];
						} else {
							messageParams = undefinedToNull(params[0]);
						}
						break;
					default:
						const last = params.length - 1;
						if (CancellationToken.is(params[last])) {
							token = params[last];
							if (params.length === 2) {
								messageParams = undefinedToNull(params[0]);
							} else {
								messageParams = params.slice(0, last).map(value => undefinedToNull(value));
							}
						} else {
							messageParams = params.map(value => undefinedToNull(value));
						}
						break;
				}
			} else {
				method = type.method;
				messageParams = computeMessageParams(type, params);
				let numberOfParams = type.numberOfParams;
				token = CancellationToken.is(params[numberOfParams]) ? params[numberOfParams] : undefined;
			}

			let id = sequenceNumber++;
			let result = new Promise<R | ResponseError<E>>((resolve, reject) => {
				let requestMessage: RequestMessage = {
					jsonrpc: version,
					id: id,
					method: method,
					params: messageParams
				};
				let responsePromise: ResponsePromise | null = { method: method, timerStart: Date.now(), resolve, reject };
				traceSendingRequest(requestMessage);
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
				token.onCancellationRequested(() => {
					connection.sendNotification(CancelNotification.type, { id });
				});
			}
			return result;
		},
		onRequest: <R, E>(type: string | MessageType | StarRequestHandler, handler?: GenericRequestHandler<R, E>): void => {
			throwIfClosedOrDisposed();

			if (Is.func(type)) {
				starRequestHandler = type as StarRequestHandler;
			} else if (handler) {
				if (Is.string(type)) {
					requestHandlers[type] = { type: undefined, handler };
				} else {
					requestHandlers[type.method] = { type, handler };
				}
			}
		},
		trace: (_value: Trace, _tracer: Tracer, sendNotificationOrTraceOptions?: boolean | TraceOptions) => {
			let _sendNotification: boolean = false;
			let _traceFormat: TraceFormat = TraceFormat.Text;

			if (sendNotificationOrTraceOptions !== void 0) {
				if (Is.boolean(sendNotificationOrTraceOptions)) {
					_sendNotification = sendNotificationOrTraceOptions;
				} else {
					_sendNotification = sendNotificationOrTraceOptions.sendNotification || false;
					_traceFormat = sendNotificationOrTraceOptions.traceFormat || TraceFormat.Text;
				}
			}

			trace = _value;
			traceFormat = _traceFormat;
			if (trace === Trace.Off) {
				tracer = undefined;
			} else {
				tracer = _tracer;
			}
			if (_sendNotification && !isClosed() && !isDisposed()) {
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
			messageQueue = new LinkedMap<string, Message>();
			// Test for backwards compatibility
			if (Is.func(messageWriter.dispose)) {
				messageWriter.dispose();
			}
			if (Is.func(messageReader.dispose)) {
				messageReader.dispose();
			}
		},
		listen: () => {
			throwIfClosedOrDisposed();
			throwIfListening();

			state = ConnectionState.Listening;
			messageReader.listen(callback);
		},
		inspect: (): void => {
			// eslint-disable-next-line no-console
			console.log('inspect');
		}
	};

	connection.onNotification(LogTraceNotification.type, (params) => {
		if (trace === Trace.Off || !tracer) {
			return;
		}
		tracer.log(params.message, trace === Trace.Verbose ? params.verbose : undefined);
	});
	connection.onNotification(ProgressNotification.type, (params) => {
		const handler = progressHandlers.get(params.token);
		if (handler) {
			handler(params.value);
		} else {
			unhandledProgressEmitter.fire(params);
		}
	});

	return connection;
}

function isMessageReader(value: any): value is MessageReader {
	return value.listen !== void 0 && value.read === void 0;
}

function isMessageWriter(value: any): value is MessageWriter {
	return value.write !== void 0 && value.end === void 0;
}

export function createMessageConnection(reader: MessageReader, writer: MessageWriter, logger?: Logger, strategy?: ConnectionStrategy): MessageConnection;
export function createMessageConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, logger?: Logger, strategy?: ConnectionStrategy): MessageConnection;
export function createMessageConnection(input: MessageReader | NodeJS.ReadableStream, output: MessageWriter | NodeJS.WritableStream, logger?: Logger, strategy?: ConnectionStrategy): MessageConnection {
	if (!logger) {
		logger = NullLogger;
	}
	let reader = isMessageReader(input) ? input : new StreamMessageReader(input);
	let writer = isMessageWriter(output) ? output : new StreamMessageWriter(output);
	return _createMessageConnection(reader, writer, logger, strategy);
}