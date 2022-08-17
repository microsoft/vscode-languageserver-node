/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import RAL from './ral';
import * as Is from './is';

import {
	Message, MessageSignature, RequestMessage, RequestType, RequestType0, RequestType1, RequestType2, RequestType3,
	RequestType4, RequestType5, RequestType6, RequestType7, RequestType8, RequestType9, ResponseMessage,
	ResponseError, ErrorCodes, NotificationMessage, NotificationType, NotificationType0, NotificationType1,
	NotificationType2, NotificationType3, NotificationType4, NotificationType5, NotificationType6, NotificationType7, NotificationType8,
	NotificationType9, LSPMessageType, _EM, ParameterStructures
} from './messages';

import { LinkedMap } from './linkedMap';
import type { Disposable } from './disposable';
import { Event, Emitter } from './events';
import { CancellationTokenSource, CancellationToken, AbstractCancellationTokenSource } from './cancellation';
import { MessageReader, DataCallback } from './messageReader';
import { MessageWriter } from './messageWriter';


interface CancelParams {
	/**
	 * The request id to cancel.
	 */
	id: number | string;
}

namespace CancelNotification {
	export const type = new NotificationType<CancelParams>('$/cancelRequest');
}

export type ProgressToken = number | string;
export namespace ProgressToken {
	export function is(value: any): value is number | string {
		return typeof value === 'string' || typeof value === 'number';
	}
}
interface ProgressParams<T> {
	/**
	 * The progress token provided by the client or server.
	 */
	token: ProgressToken;

	/**
	 * The progress data.
	 */
	value: T;
}

namespace ProgressNotification {
	export const type = new NotificationType<ProgressParams<any>>('$/progress');
}

export class ProgressType<PR> {
	/**
	 * Clients must not use these properties. They are here to ensure correct typing.
	 * in TypeScript
	 */
	public readonly __?: [PR, _EM];
	public readonly _pr?: PR;

	constructor() {
	}
}

export type HandlerResult<R, E> = R | ResponseError<E> | Thenable<R> | Thenable<ResponseError<E>> | Thenable<R | ResponseError<E>>;

export interface StarRequestHandler {
	(method: string, params: any[] | object | undefined, token: CancellationToken): HandlerResult<any, any>;
}

namespace StarRequestHandler {
	export function is(value: any): value is StarRequestHandler {
		return Is.func(value);
	}
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
	(method: string, params: any[] | object | undefined): void;
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
	Off, Messages, Compact, Verbose
}

export namespace TraceValues {
	/**
	 * Turn tracing off.
	 */
	export const Off: 'off' = 'off';

	/**
	 * Trace messages only.
	 */
	export const Messages: 'messages' = 'messages';

	/**
	 * Compact message tracing.
	 */
	export const Compact: 'compact' = 'compact';

	/**
	 * Verbose message tracing.
	 */
	export const Verbose: 'verbose' = 'verbose';
}
export type TraceValues = 'off' | 'messages' | 'compact' | 'verbose';

export namespace Trace {
	export function fromString(value: string): Trace {
		if (!Is.string(value)) {
			return Trace.Off;
		}
		value = value.toLowerCase();
		switch (value) {
			case 'off':
				return Trace.Off;
			case 'messages':
				return Trace.Messages;
			case 'compact':
				return Trace.Compact;
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
			case Trace.Compact:
				return 'compact';
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
		if (!Is.string(value)) {
			return TraceFormat.Text;
		}
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
	export const type = new NotificationType<SetTraceParams>('$/setTrace');
}

export interface LogTraceParams {
	message: string;
	verbose?: string;
}

export namespace LogTraceNotification {
	export const type = new NotificationType<LogTraceParams>('$/logTrace');
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

type MessageQueue = LinkedMap<string, Message>;

export type ConnectionStrategy = {
	cancelUndispatched?: (message: Message, next: (message: Message) => ResponseMessage | undefined) => ResponseMessage | undefined;
};

export namespace ConnectionStrategy {
	export function is(value: any): value is ConnectionStrategy {
		const candidate: ConnectionStrategy = value;
		return candidate && Is.func(candidate.cancelUndispatched);
	}
}

export type CancellationId = number | string;
export interface CancellationReceiverStrategy {
	createCancellationTokenSource(id: CancellationId): AbstractCancellationTokenSource;
	dispose?(): void;
}
export namespace CancellationReceiverStrategy {
	export const Message: CancellationReceiverStrategy = Object.freeze({
		createCancellationTokenSource(_: CancellationId): AbstractCancellationTokenSource {
			return new CancellationTokenSource();
		}
	});

	export function is(value: any): value is CancellationReceiverStrategy {
		const candidate: CancellationReceiverStrategy = value;
		return candidate && Is.func(candidate.createCancellationTokenSource);
	}
}

export interface CancellationSenderStrategy {
	sendCancellation(conn: MessageConnection, id: CancellationId): Promise<void>;
	cleanup(id: CancellationId): void;
	dispose?(): void;
}
export namespace CancellationSenderStrategy {
	export const Message: CancellationSenderStrategy = Object.freeze({
		sendCancellation(conn: MessageConnection, id: CancellationId): Promise<void> {
			return conn.sendNotification(CancelNotification.type, { id });
		},
		cleanup(_: CancellationId): void { }
	});

	export function is(value: any): value is CancellationSenderStrategy {
		const candidate: CancellationSenderStrategy = value;
		return candidate && Is.func(candidate.sendCancellation) && Is.func(candidate.cleanup);
	}
}

export interface CancellationStrategy {
	receiver: CancellationReceiverStrategy;
	sender: CancellationSenderStrategy;
}
export namespace CancellationStrategy {
	export const Message: CancellationStrategy = Object.freeze({
		receiver: CancellationReceiverStrategy.Message,
		sender: CancellationSenderStrategy.Message
	});

	export function is(value: any): value is CancellationStrategy {
		const candidate: CancellationStrategy = value;
		return candidate && CancellationReceiverStrategy.is(candidate.receiver) && CancellationSenderStrategy.is(candidate.sender);
	}
}

export interface ConnectionOptions {
	cancellationStrategy?: CancellationStrategy;
	connectionStrategy?: ConnectionStrategy;
}
export namespace ConnectionOptions {
	export function is(value: any): value is ConnectionOptions {
		const candidate: ConnectionOptions = value;
		return candidate && (CancellationStrategy.is(candidate.cancellationStrategy) || ConnectionStrategy.is(candidate.connectionStrategy));
	}
}

export interface MessageConnection {
	sendRequest<R, E>(type: RequestType0<R, E>, token?: CancellationToken): Promise<R>;
	sendRequest<P, R, E>(type: RequestType<P, R, E>, params: P, token?: CancellationToken): Promise<R>;
	sendRequest<P1, R, E>(type: RequestType1<P1, R, E>, p1: P1, token?: CancellationToken): Promise<R>;
	sendRequest<P1, P2, R, E>(type: RequestType2<P1, P2, R, E>, p1: P1, p2: P2, token?: CancellationToken): Promise<R>;
	sendRequest<P1, P2, P3, R, E>(type: RequestType3<P1, P2, P3, R, E>, p1: P1, p2: P2, p3: P3, token?: CancellationToken): Promise<R>;
	sendRequest<P1, P2, P3, P4, R, E>(type: RequestType4<P1, P2, P3, P4, R, E>, p1: P1, p2: P2, p3: P3, p4: P4, token?: CancellationToken): Promise<R>;
	sendRequest<P1, P2, P3, P4, P5, R, E>(type: RequestType5<P1, P2, P3, P4, P5, R, E>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, token?: CancellationToken): Promise<R>;
	sendRequest<P1, P2, P3, P4, P5, P6, R, E>(type: RequestType6<P1, P2, P3, P4, P5, P6, R, E>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, token?: CancellationToken): Promise<R>;
	sendRequest<P1, P2, P3, P4, P5, P6, P7, R, E>(type: RequestType7<P1, P2, P3, P4, P5, P6, P7, R, E>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, token?: CancellationToken): Promise<R>;
	sendRequest<P1, P2, P3, P4, P5, P6, P7, P8, R, E>(type: RequestType8<P1, P2, P3, P4, P5, P6, P7, P8, R, E>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8, token?: CancellationToken): Promise<R>;
	sendRequest<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E>(type: RequestType9<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8, p9: P9, token?: CancellationToken): Promise<R>;
	sendRequest<R>(method: string, r0?: ParameterStructures | any, ...rest: any[]): Promise<R>;

	onRequest<R, E>(type: RequestType0<R, E>, handler: RequestHandler0<R, E>): Disposable;
	onRequest<P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): Disposable;
	onRequest<P1, R, E>(type: RequestType1<P1, R, E>, handler: RequestHandler1<P1, R, E>): Disposable;
	onRequest<P1, P2, R, E>(type: RequestType2<P1, P2, R, E>, handler: RequestHandler2<P1, P2, R, E>): Disposable;
	onRequest<P1, P2, P3, R, E>(type: RequestType3<P1, P2, P3, R, E>, handler: RequestHandler3<P1, P2, P3, R, E>): Disposable;
	onRequest<P1, P2, P3, P4, R, E>(type: RequestType4<P1, P2, P3, P4, R, E>, handler: RequestHandler4<P1, P2, P3, P4, R, E>): Disposable;
	onRequest<P1, P2, P3, P4, P5, R, E>(type: RequestType5<P1, P2, P3, P4, P5, R, E>, handler: RequestHandler5<P1, P2, P3, P4, P5, R, E>): Disposable;
	onRequest<P1, P2, P3, P4, P5, P6, R, E>(type: RequestType6<P1, P2, P3, P4, P5, P6, R, E>, handler: RequestHandler6<P1, P2, P3, P4, P5, P6, R, E>): Disposable;
	onRequest<P1, P2, P3, P4, P5, P6, P7, R, E>(type: RequestType7<P1, P2, P3, P4, P5, P6, P7, R, E>, handler: RequestHandler7<P1, P2, P3, P4, P5, P6, P7, R, E>): Disposable;
	onRequest<P1, P2, P3, P4, P5, P6, P7, P8, R, E>(type: RequestType8<P1, P2, P3, P4, P5, P6, P7, P8, R, E>, handler: RequestHandler8<P1, P2, P3, P4, P5, P6, P7, P8, R, E>): Disposable;
	onRequest<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E>(type: RequestType9<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E>, handler: RequestHandler9<P1, P2, P3, P4, P5, P6, P7, P8, P9, R, E>): Disposable;
	onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): Disposable;
	onRequest(handler: StarRequestHandler): Disposable;

	hasPendingResponse(): boolean;

	sendNotification(type: NotificationType0): Promise<void>;
	sendNotification<P>(type: NotificationType<P>, params?: P): Promise<void>;
	sendNotification<P1>(type: NotificationType1<P1>, p1: P1): Promise<void>;
	sendNotification<P1, P2>(type: NotificationType2<P1, P2>, p1: P1, p2: P2): Promise<void>;
	sendNotification<P1, P2, P3>(type: NotificationType3<P1, P2, P3>, p1: P1, p2: P2, p3: P3): Promise<void>;
	sendNotification<P1, P2, P3, P4>(type: NotificationType4<P1, P2, P3, P4>, p1: P1, p2: P2, p3: P3, p4: P4): Promise<void>;
	sendNotification<P1, P2, P3, P4, P5>(type: NotificationType5<P1, P2, P3, P4, P5>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5): Promise<void>;
	sendNotification<P1, P2, P3, P4, P5, P6>(type: NotificationType6<P1, P2, P3, P4, P5, P6>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6): Promise<void>;
	sendNotification<P1, P2, P3, P4, P5, P6, P7>(type: NotificationType7<P1, P2, P3, P4, P5, P6, P7>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7): Promise<void>;
	sendNotification<P1, P2, P3, P4, P5, P6, P7, P8>(type: NotificationType8<P1, P2, P3, P4, P5, P6, P7, P8>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8): Promise<void>;
	sendNotification<P1, P2, P3, P4, P5, P6, P7, P8, P9>(type: NotificationType9<P1, P2, P3, P4, P5, P6, P7, P8, P9>, p1: P1, p2: P2, p3: P3, p4: P4, p5: P5, p6: P6, p7: P7, p8: P8, p9: P9): Promise<void>;
	sendNotification(method: string, r0?: ParameterStructures | any, ...rest: any[]): Promise<void>;

	onNotification(type: NotificationType0, handler: NotificationHandler0): Disposable;
	onNotification<P>(type: NotificationType<P>, handler: NotificationHandler<P>): Disposable;
	onNotification<P1>(type: NotificationType1<P1>, handler: NotificationHandler1<P1>): Disposable;
	onNotification<P1, P2>(type: NotificationType2<P1, P2>, handler: NotificationHandler2<P1, P2>): Disposable;
	onNotification<P1, P2, P3>(type: NotificationType3<P1, P2, P3>, handler: NotificationHandler3<P1, P2, P3>): Disposable;
	onNotification<P1, P2, P3, P4>(type: NotificationType4<P1, P2, P3, P4>, handler: NotificationHandler4<P1, P2, P3, P4>): Disposable;
	onNotification<P1, P2, P3, P4, P5>(type: NotificationType5<P1, P2, P3, P4, P5>, handler: NotificationHandler5<P1, P2, P3, P4, P5>): Disposable;
	onNotification<P1, P2, P3, P4, P5, P6>(type: NotificationType6<P1, P2, P3, P4, P5, P6>, handler: NotificationHandler6<P1, P2, P3, P4, P5, P6>): Disposable;
	onNotification<P1, P2, P3, P4, P5, P6, P7>(type: NotificationType7<P1, P2, P3, P4, P5, P6, P7>, handler: NotificationHandler7<P1, P2, P3, P4, P5, P6, P7>): Disposable;
	onNotification<P1, P2, P3, P4, P5, P6, P7, P8>(type: NotificationType8<P1, P2, P3, P4, P5, P6, P7, P8>, handler: NotificationHandler8<P1, P2, P3, P4, P5, P6, P7, P8>): Disposable;
	onNotification<P1, P2, P3, P4, P5, P6, P7, P8, P9>(type: NotificationType9<P1, P2, P3, P4, P5, P6, P7, P8, P9>, handler: NotificationHandler9<P1, P2, P3, P4, P5, P6, P7, P8, P9>): Disposable;
	onNotification(method: string, handler: GenericNotificationHandler): Disposable;
	onNotification(handler: StarNotificationHandler): Disposable;

	onUnhandledNotification: Event<NotificationMessage>;

	onProgress<P>(type: ProgressType<P>, token: string | number, handler: NotificationHandler<P>): Disposable;
	sendProgress<P>(type: ProgressType<P>, token: string | number, value: P): Promise<void>;

	onUnhandledProgress: Event<ProgressParams<any>>;

	trace(value: Trace, tracer: Tracer, sendNotification?: boolean): Promise<void>;
	trace(value: Trace, tracer: Tracer, traceOptions?: TraceOptions): Promise<void>;

	onError: Event<[Error, Message | undefined, number | undefined]>;
	onClose: Event<void>;
	listen(): void;

	end(): void;

	onDispose: Event<void>;
	dispose(): void;

	inspect(): void;
}

interface ResponsePromise {
	method: string;
	timerStart: number;
	resolve: (response: any) => void;
	reject: (error: any) => void;
}

enum ConnectionState {
	New = 1,
	Listening = 2,
	Closed = 3,
	Disposed = 4
}

interface RequestHandlerElement {
	type: MessageSignature | undefined;
	handler: GenericRequestHandler<any, any>;
}
interface NotificationHandlerElement {
	type: MessageSignature | undefined;
	handler: GenericNotificationHandler;
}

export function createMessageConnection(messageReader: MessageReader, messageWriter: MessageWriter, _logger?: Logger, options?: ConnectionOptions): MessageConnection {
	const logger: Logger = _logger !== undefined ? _logger : NullLogger;

	let sequenceNumber = 0;
	let notificationSequenceNumber = 0;
	let unknownResponseSequenceNumber = 0;
	const version: string = '2.0';

	let starRequestHandler: StarRequestHandler | undefined = undefined;
	const requestHandlers: Map<string, RequestHandlerElement> = new Map();
	let starNotificationHandler: StarNotificationHandler | undefined = undefined;
	const notificationHandlers: Map<string, NotificationHandlerElement> = new Map();
	const progressHandlers: Map<number | string, NotificationHandler1<any>> = new Map();

	let timer: Disposable | undefined;
	let messageQueue: MessageQueue = new LinkedMap<string, Message>();
	let responsePromises: Map<string | number, ResponsePromise> = new Map();
	let knownCanceledRequests: Set<string | number> = new Set();
	let requestTokens: Map<string | number, AbstractCancellationTokenSource> = new Map();

	let trace: Trace = Trace.Off;
	let traceFormat: TraceFormat = TraceFormat.Text;
	let tracer: Tracer | undefined;

	let state: ConnectionState = ConnectionState.New;
	const errorEmitter: Emitter<[Error, Message | undefined, number | undefined]> = new Emitter<[Error, Message, number]>();
	const closeEmitter: Emitter<void> = new Emitter<void>();
	const unhandledNotificationEmitter: Emitter<NotificationMessage> = new Emitter<NotificationMessage>();
	const unhandledProgressEmitter: Emitter<ProgressParams<any>> = new Emitter<ProgressParams<any>>();

	const disposeEmitter: Emitter<void> = new Emitter<void>();
	const cancellationStrategy = (options && options.cancellationStrategy) ? options.cancellationStrategy : CancellationStrategy.Message;

	function createRequestQueueKey(id: string | number | null): string {
		if (id === null) {
			throw new Error(`Can't send requests with id null since the response can't be correlated.`);
		}
		return 'req-' + id.toString();
	}

	function createResponseQueueKey(id: string | number | null): string {
		if (id === null) {
			return 'res-unknown-' + (++unknownResponseSequenceNumber).toString();
		} else {
			return 'res-' + id.toString();
		}
	}

	function createNotificationQueueKey(): string {
		return 'not-' + (++notificationSequenceNumber).toString();
	}

	function addMessageToQueue(queue: MessageQueue, message: Message): void {
		if (Message.isRequest(message)) {
			queue.set(createRequestQueueKey(message.id), message);
		} else if (Message.isResponse(message)) {
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

	function writeErrorHandler(data: [Error, Message | undefined, number | undefined]): void {
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
		timer = RAL().timer.setImmediate(() => {
			timer = undefined;
			processMessageQueue();
		});
	}

	function processMessageQueue(): void {
		if (messageQueue.size === 0) {
			return;
		}
		const message = messageQueue.shift()!;
		try {
			if (Message.isRequest(message)) {
				handleRequest(message);
			} else if (Message.isNotification(message)) {
				handleNotification(message);
			} else if (Message.isResponse(message)) {
				handleResponse(message);
			} else {
				handleInvalidMessage(message);
			}
		} finally {
			triggerMessageQueue();
		}
	}

	const callback: DataCallback = (message) => {
		try {
			// We have received a cancellation message. Check if the message is still in the queue
			// and cancel it if allowed to do so.
			if (Message.isNotification(message) && message.method === CancelNotification.type.method) {
				const cancelId = (message.params as CancelParams).id;
				const key = createRequestQueueKey(cancelId);
				const toCancel = messageQueue.get(key);
				if (Message.isRequest(toCancel)) {
					const strategy = options?.connectionStrategy;
					const response = (strategy && strategy.cancelUndispatched) ? strategy.cancelUndispatched(toCancel, cancelUndispatched) : cancelUndispatched(toCancel);
					if (response && (response.error !== undefined || response.result !== undefined)) {
						messageQueue.delete(key);
						requestTokens.delete(cancelId);
						response.id = toCancel.id;
						traceSendingResponse(response, message.method, Date.now());
						messageWriter.write(response).catch(() => logger.error(`Sending response for canceled message failed.`));
						return;
					}
				}
				const cancellationToken = requestTokens.get(cancelId);
				// The request is already running. Cancel the token
				if (cancellationToken !== undefined) {
					cancellationToken.cancel();
					traceReceivedNotification(message);
					return;
				} else {
					// Remember the cancel but still queue the message to
					// clean up state in process message.
					knownCanceledRequests.add(cancelId);
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
			const message: ResponseMessage = {
				jsonrpc: version,
				id: requestMessage.id
			};
			if (resultOrError instanceof ResponseError) {
				message.error = (<ResponseError<any>>resultOrError).toJson();
			} else {
				message.result = resultOrError === undefined ? null : resultOrError;
			}
			traceSendingResponse(message, method, startTime);
			messageWriter.write(message).catch(() => logger.error(`Sending response failed.`));
		}
		function replyError(error: ResponseError<any>, method: string, startTime: number) {
			const message: ResponseMessage = {
				jsonrpc: version,
				id: requestMessage.id,
				error: error.toJson()
			};
			traceSendingResponse(message, method, startTime);
			messageWriter.write(message).catch(() => logger.error(`Sending response failed.`));
		}
		function replySuccess(result: any, method: string, startTime: number) {
			// The JSON RPC defines that a response must either have a result or an error
			// So we can't treat undefined as a valid response result.
			if (result === undefined) {
				result = null;
			}
			const message: ResponseMessage = {
				jsonrpc: version,
				id: requestMessage.id,
				result: result
			};
			traceSendingResponse(message, method, startTime);
			messageWriter.write(message).catch(() => logger.error(`Sending response failed.`));
		}
		traceReceivedRequest(requestMessage);

		const element = requestHandlers.get(requestMessage.method);
		let type: MessageSignature | undefined;
		let requestHandler: GenericRequestHandler<any, any> | undefined;
		if (element) {
			type = element.type;
			requestHandler = element.handler;
		}
		const startTime = Date.now();
		if (requestHandler || starRequestHandler) {
			const tokenKey = requestMessage.id ?? String(Date.now()); //
			const cancellationSource = cancellationStrategy.receiver.createCancellationTokenSource(tokenKey);
			if (requestMessage.id !== null && knownCanceledRequests.has(requestMessage.id)) {
				cancellationSource.cancel();
			}
			if (requestMessage.id !== null) {
				requestTokens.set(tokenKey, cancellationSource);
			}
			try {
				let handlerResult: any;
				if (requestHandler) {
					if (requestMessage.params === undefined) {
						if (type !== undefined && type.numberOfParams !== 0) {
							replyError(new ResponseError<void>(ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines ${type.numberOfParams} params but received none.`), requestMessage.method, startTime);
							return;
						}
						handlerResult = requestHandler(cancellationSource.token);
					} else if (Array.isArray(requestMessage.params)) {
						if (type !== undefined && type.parameterStructures === ParameterStructures.byName) {
							replyError(new ResponseError<void>(ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines parameters by name but received parameters by position`), requestMessage.method, startTime);
							return;
						}
						handlerResult = requestHandler(...requestMessage.params, cancellationSource.token);
					} else {
						if (type !== undefined && type.parameterStructures === ParameterStructures.byPosition) {
							replyError(new ResponseError<void>(ErrorCodes.InvalidParams, `Request ${requestMessage.method} defines parameters by position but received parameters by name`), requestMessage.method, startTime);
							return;
						}
						handlerResult = requestHandler(requestMessage.params, cancellationSource.token);
					}
				} else if (starRequestHandler) {
					handlerResult = starRequestHandler(requestMessage.method, requestMessage.params, cancellationSource.token);
				}

				const promise = handlerResult as Thenable<any | ResponseError<any>>;
				if (!handlerResult) {
					requestTokens.delete(tokenKey);
					replySuccess(handlerResult, requestMessage.method, startTime);
				} else if (promise.then) {
					promise.then((resultOrError): any | ResponseError<any> => {
						requestTokens.delete(tokenKey);
						reply(resultOrError, requestMessage.method, startTime);
					}, error => {
						requestTokens.delete(tokenKey);
						if (error instanceof ResponseError) {
							replyError(<ResponseError<any>>error, requestMessage.method, startTime);
						} else if (error && Is.string(error.message)) {
							replyError(new ResponseError<void>(ErrorCodes.InternalError, `Request ${requestMessage.method} failed with message: ${error.message}`), requestMessage.method, startTime);
						} else {
							replyError(new ResponseError<void>(ErrorCodes.InternalError, `Request ${requestMessage.method} failed unexpectedly without providing any details.`), requestMessage.method, startTime);
						}
					});
				} else {
					requestTokens.delete(tokenKey);
					reply(handlerResult, requestMessage.method, startTime);
				}
			} catch (error: any) {
				requestTokens.delete(tokenKey);
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
			const key = responseMessage.id;
			const responsePromise = responsePromises.get(key);
			traceReceivedResponse(responseMessage, responsePromise);
			if (responsePromise !== undefined) {
				responsePromises.delete(key);
				try {
					if (responseMessage.error) {
						const error = responseMessage.error;
						responsePromise.reject(new ResponseError(error.code, error.message, error.data));
					} else if (responseMessage.result !== undefined) {
						responsePromise.resolve(responseMessage.result);
					} else {
						throw new Error('Should never happen.');
					}
				} catch (error: any) {
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
		let type: MessageSignature | undefined = undefined;
		let notificationHandler: GenericNotificationHandler | undefined;
		if (message.method === CancelNotification.type.method) {
			const cancelId = (message.params as CancelParams).id;
			knownCanceledRequests.delete(cancelId);
			traceReceivedNotification(message);
			return;
		} else {
			const element = notificationHandlers.get(message.method);
			if (element) {
				notificationHandler = element.handler;
				type = element.type;
			}
		}
		if (notificationHandler || starNotificationHandler) {
			try {
				traceReceivedNotification(message);
				if (notificationHandler) {
					if (message.params === undefined) {
						if (type !== undefined) {
							if (type.numberOfParams !== 0 && type.parameterStructures !== ParameterStructures.byName) {
								logger.error(`Notification ${message.method} defines ${type.numberOfParams} params but received none.`);
							}
						}
						notificationHandler();
					} else if (Array.isArray(message.params)) {
						// There are JSON-RPC libraries that send progress message as positional params although
						// specified as named. So convert them if this is the case.
						const params = message.params;
						if (message.method === ProgressNotification.type.method && params.length === 2 && ProgressToken.is(params[0])) {
							notificationHandler({ token: params[0], value: params[1] } as ProgressParams<any>);
						} else {
							if (type !== undefined) {
								if (type.parameterStructures === ParameterStructures.byName) {
									logger.error(`Notification ${message.method} defines parameters by name but received parameters by position`);
								}
								if (type.numberOfParams !== message.params.length) {
									logger.error(`Notification ${message.method} defines ${type.numberOfParams} params but received ${params.length} arguments`);
								}
							}
							notificationHandler(...params);
						}
					} else {
						if (type !== undefined && type.parameterStructures === ParameterStructures.byPosition) {
							logger.error(`Notification ${message.method} defines parameters by position but received parameters by name`);
						}
						notificationHandler(message.params);
					}
				} else if (starNotificationHandler) {
					starNotificationHandler(message.method, message.params);
				}
			} catch (error: any) {
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
		const responseMessage: ResponseMessage = message as ResponseMessage;
		if (Is.string(responseMessage.id) || Is.number(responseMessage.id)) {
			const key = responseMessage.id;
			const responseHandler = responsePromises.get(key);
			if (responseHandler) {
				responseHandler.reject(new Error('The received response has neither a result nor an error property.'));
			}
		}
	}

	function stringifyTrace(params: string | number | boolean | object | any[]): string;
	function stringifyTrace(params: string | number | boolean | object | any[] | undefined | null): string | undefined;
	function stringifyTrace(params: string | number | boolean | object | any[] | undefined | null): string | undefined {
		if (params === undefined || params === null) {
			return undefined;
		}
		switch (trace) {
			case Trace.Verbose:
				return JSON.stringify(params, null, 4);
			case Trace.Compact:
				return JSON.stringify(params);
			default:
				return undefined;
		}
	}

	function traceSendingRequest(message: RequestMessage): void {
		if (trace === Trace.Off || !tracer) {
			return;
		}

		if (traceFormat === TraceFormat.Text) {
			let data: string | undefined = undefined;
			if ((trace === Trace.Verbose || trace === Trace.Compact) && message.params) {
				data = `Params: ${stringifyTrace(message.params)}\n\n`;
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
			if (trace === Trace.Verbose || trace === Trace.Compact) {
				if (message.params) {
					data = `Params: ${stringifyTrace(message.params)}\n\n`;
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
			if (trace === Trace.Verbose || trace === Trace.Compact) {
				if (message.error && message.error.data) {
					data = `Error data: ${stringifyTrace(message.error.data)}\n\n`;
				} else {
					if (message.result) {
						data = `Result: ${stringifyTrace(message.result)}\n\n`;
					} else if (message.error === undefined) {
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
			if ((trace === Trace.Verbose || trace === Trace.Compact) && message.params) {
				data = `Params: ${stringifyTrace(message.params)}\n\n`;
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
			if (trace === Trace.Verbose || trace === Trace.Compact) {
				if (message.params) {
					data = `Params: ${stringifyTrace(message.params)}\n\n`;
				} else {
					data = 'No parameters provided.\n\n';
				}
			}
			tracer.log(`Received notification '${message.method}'.`, data);
		} else {
			logLSPMessage('receive-notification', message);
		}
	}

	function traceReceivedResponse(message: ResponseMessage, responsePromise: ResponsePromise | undefined): void {
		if (trace === Trace.Off || !tracer) {
			return;
		}

		if (traceFormat === TraceFormat.Text) {
			let data: string | undefined = undefined;
			if (trace === Trace.Verbose || trace === Trace.Compact) {
				if (message.error && message.error.data) {
					data = `Error data: ${stringifyTrace(message.error.data)}\n\n`;
				} else {
					if (message.result) {
						data = `Result: ${stringifyTrace(message.result)}\n\n`;
					} else if (message.error === undefined) {
						data = 'No result returned.\n\n';
					}
				}
			}
			if (responsePromise) {
				const error = message.error ? ` Request failed: ${message.error.message} (${message.error.code}).` : '';
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
		if (param === undefined) {
			return null;
		} else {
			return param;
		}
	}

	function nullToUndefined(param: any) {
		if (param === null) {
			return undefined;
		} else {
			return param;
		}
	}

	function isNamedParam(param: any): boolean {
		return param !== undefined && param !== null && !Array.isArray(param) && typeof param === 'object';
	}

	function computeSingleParam(parameterStructures: ParameterStructures, param: any): any | any[] {
		switch(parameterStructures) {
			case ParameterStructures.auto:
				if (isNamedParam(param)) {
					return nullToUndefined(param);
				} else {
					return [undefinedToNull(param)];
				}
			case ParameterStructures.byName:
				if (!isNamedParam(param)) {
					throw new Error(`Received parameters by name but param is not an object literal.`);
				}
				return nullToUndefined(param);
			case ParameterStructures.byPosition:
				return [undefinedToNull(param)];
			default:
				throw new Error(`Unknown parameter structure ${parameterStructures.toString()}`);
		}
	}

	function computeMessageParams(type: MessageSignature, params: any[]): any | any[] | null {
		let result: any | any[] | null;
		const numberOfParams = type.numberOfParams;
		switch (numberOfParams) {
			case 0:
				result = undefined;
				break;
			case 1:
				result = computeSingleParam(type.parameterStructures, params[0]);
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

	const connection: MessageConnection = {
		sendNotification: (type: string | MessageSignature, ...args: any[]): Promise<void> => {
			throwIfClosedOrDisposed();

			let method: string;
			let messageParams: object | [] | undefined;
			if (Is.string(type)) {
				method = type;
				const first: unknown = args[0];
				let paramStart: number = 0;
				let parameterStructures: ParameterStructures = ParameterStructures.auto;
				if (ParameterStructures.is(first)) {
					paramStart = 1;
					parameterStructures = first;
				}
				let paramEnd: number = args.length;
				const numberOfParams = paramEnd - paramStart;
				switch (numberOfParams) {
					case 0:
						messageParams = undefined;
						break;
					case 1:
						messageParams = computeSingleParam(parameterStructures, args[paramStart]);
						break;
					default:
						if (parameterStructures === ParameterStructures.byName) {
							throw new Error(`Received ${numberOfParams} parameters for 'by Name' notification parameter structure.`);
						}
						messageParams = args.slice(paramStart, paramEnd).map(value => undefinedToNull(value));
						break;
				}
			} else {
				const params = args;
				method = type.method;
				messageParams = computeMessageParams(type, params);
			}
			const notificationMessage: NotificationMessage = {
				jsonrpc: version,
				method: method,
				params: messageParams
			};
			traceSendingNotification(notificationMessage);
			return messageWriter.write(notificationMessage).catch(() => logger.error(`Sending notification failed.`));
		},
		onNotification: (type: string | MessageSignature | StarNotificationHandler, handler?: GenericNotificationHandler): Disposable => {
			throwIfClosedOrDisposed();
			let method: string | undefined;
			if (Is.func(type)) {
				starNotificationHandler = type as StarNotificationHandler;
			} else if (handler) {
				if (Is.string(type)) {
					method = type;
					notificationHandlers.set(type, { type: undefined, handler });
				} else {
					method = type.method;
					notificationHandlers.set(type.method, { type, handler });
				}
			}
			return {
				dispose: () => {
					if (method !== undefined) {
						notificationHandlers.delete(method);
					} else {
						starNotificationHandler = undefined;
					}
				}
			};
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
		sendProgress: <P>(_type: ProgressType<P>, token: string | number, value: P): Promise<void> => {
			return connection.sendNotification(ProgressNotification.type, { token, value });
		},
		onUnhandledProgress: unhandledProgressEmitter.event,
		sendRequest: <R, E>(type: string | MessageSignature, ...args: any[]) => {
			throwIfClosedOrDisposed();
			throwIfNotListening();

			let method: string;
			let messageParams: object | [] | undefined;
			let token: CancellationToken | undefined = undefined;
			if (Is.string(type)) {
				method = type;
				const first: unknown = args[0];
				const last: unknown = args[args.length - 1];
				let paramStart: number = 0;
				let parameterStructures: ParameterStructures = ParameterStructures.auto;
				if (ParameterStructures.is(first)) {
					paramStart = 1;
					parameterStructures = first;
				}
				let paramEnd: number = args.length;
				if (CancellationToken.is(last)) {
					paramEnd = paramEnd - 1;
					token = last;
				}
				const numberOfParams = paramEnd - paramStart;
				switch (numberOfParams) {
					case 0:
						messageParams = undefined;
						break;
					case 1:
						messageParams = computeSingleParam(parameterStructures, args[paramStart]);
						break;
					default:
						if (parameterStructures === ParameterStructures.byName) {
							throw new Error(`Received ${numberOfParams} parameters for 'by Name' request parameter structure.`);
						}
						messageParams = args.slice(paramStart, paramEnd).map(value => undefinedToNull(value));
						break;
				}
			} else {
				const params = args;
				method = type.method;
				messageParams = computeMessageParams(type, params);
				const numberOfParams = type.numberOfParams;
				token = CancellationToken.is(params[numberOfParams]) ? params[numberOfParams] : undefined;
			}

			const id = sequenceNumber++;
			let disposable: Disposable;
			if (token) {
				disposable = token.onCancellationRequested(() => {
					const p = cancellationStrategy.sender.sendCancellation(connection, id);
					if (p === undefined) {
						logger.log(`Received no promise from cancellation strategy when cancelling id ${id}`);
						return Promise.resolve();
					} else {
						return p.catch(() => {
							logger.log(`Sending cancellation messages for id ${id} failed`);
						});
					}
				});
			}
			const result = new Promise<R | ResponseError<E>>((resolve, reject) => {
				const requestMessage: RequestMessage = {
					jsonrpc: version,
					id: id,
					method: method,
					params: messageParams
				};

				const resolveWithCleanup = (r: any) => {
					resolve(r);
					cancellationStrategy.sender.cleanup(id);
					disposable?.dispose();

				};
				const rejectWithCleanup = (r: any) => {
					reject(r);
					cancellationStrategy.sender.cleanup(id);
					disposable?.dispose();
				};

				let responsePromise: ResponsePromise | null = { method: method, timerStart: Date.now(), resolve: resolveWithCleanup, reject: rejectWithCleanup };
				traceSendingRequest(requestMessage);
				try {
					messageWriter.write(requestMessage).catch(() => logger.error(`Sending request failed.`));
				} catch (e: any) {
					// Writing the message failed. So we need to reject the promise.
					responsePromise.reject(new ResponseError<void>(ErrorCodes.MessageWriteError, e.message ? e.message : 'Unknown reason'));
					responsePromise = null;
				}
				if (responsePromise) {
					responsePromises.set(id, responsePromise);
				}
			});
			return result;
		},
		onRequest: <R, E>(type: string | MessageSignature | StarRequestHandler, handler?: GenericRequestHandler<R, E>): Disposable => {
			throwIfClosedOrDisposed();

			let method: string | undefined | null = null;
			if (StarRequestHandler.is(type)) {
				method = undefined;
				starRequestHandler = type;
			} else if (Is.string(type)) {
				method = null;
				if (handler !== undefined) {
					method = type;
					requestHandlers.set(type, { handler: handler, type: undefined });
				}
			} else {
				if (handler !== undefined) {
					method = type.method;
					requestHandlers.set(type.method, { type, handler });
				}
			}
			return {
				dispose: () => {
					if (method === null) {
						return;
					}
					if (method !== undefined) {
						requestHandlers.delete(method);
					} else {
						starRequestHandler = undefined;
					}
				}
			};
		},
		hasPendingResponse: (): boolean => {
			return responsePromises.size > 0;
		},
		trace: async (_value: Trace, _tracer: Tracer, sendNotificationOrTraceOptions?: boolean | TraceOptions): Promise<void> => {
			let _sendNotification: boolean = false;
			let _traceFormat: TraceFormat = TraceFormat.Text;

			if (sendNotificationOrTraceOptions !== undefined) {
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
				await connection.sendNotification(SetTraceNotification.type, { value: Trace.toString(_value) });
			}
		},
		onError: errorEmitter.event,
		onClose: closeEmitter.event,
		onUnhandledNotification: unhandledNotificationEmitter.event,
		onDispose: disposeEmitter.event,
		end: () => {
			messageWriter.end();
		},
		dispose: () => {
			if (isDisposed()) {
				return;
			}
			state = ConnectionState.Disposed;
			disposeEmitter.fire(undefined);
			const error = new ResponseError(ErrorCodes.PendingResponseRejected, 'Pending response rejected since connection got disposed');
			for (const promise of responsePromises.values()) {
				promise.reject(error);
			}
			responsePromises = new Map();
			requestTokens = new Map();
			knownCanceledRequests = new Set();
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
			RAL().console.log('inspect');
		}
	};

	connection.onNotification(LogTraceNotification.type, (params) => {
		if (trace === Trace.Off || !tracer) {
			return;
		}
		const verbose = trace === Trace.Verbose || trace === Trace.Compact;
		tracer.log(params.message, verbose ? params.verbose : undefined);
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
