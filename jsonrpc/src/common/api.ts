/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="../../typings/thenable.d.ts" />

import {
	Message, MessageSignature, RequestMessage, RequestType, RequestType0, RequestType1, RequestType2, RequestType3, RequestType4, RequestType5, RequestType6,
	RequestType7, RequestType8, RequestType9, ResponseError, ErrorCodes, NotificationMessage, NotificationType, NotificationType0, NotificationType1,
	NotificationType2, NotificationType3, NotificationType4, NotificationType5, NotificationType6, NotificationType7, NotificationType8,
	NotificationType9, ResponseMessage, ParameterStructures, _EM
} from './messages';

import { LinkedMap, LRUCache, Touch } from './linkedMap';
import { Disposable } from './disposable';
import { Event, Emitter } from './events';
import { AbstractCancellationTokenSource, CancellationTokenSource, CancellationToken } from './cancellation';
import { MessageReader, AbstractMessageReader, ReadableStreamMessageReader, DataCallback, MessageReaderOptions, PartialMessageInfo } from './messageReader';
import { MessageWriter, AbstractMessageWriter, WriteableStreamMessageWriter, MessageWriterOptions } from './messageWriter';
import {
	Logger, ConnectionStrategy, ConnectionOptions, MessageConnection, NullLogger, createMessageConnection,
	ProgressToken, ProgressType, HandlerResult, StarRequestHandler, GenericRequestHandler,
	RequestHandler0, RequestHandler, RequestHandler1, RequestHandler2, RequestHandler3, RequestHandler4, RequestHandler5, RequestHandler6, RequestHandler7, RequestHandler8,
	RequestHandler9, StarNotificationHandler, GenericNotificationHandler, NotificationHandler0, NotificationHandler, NotificationHandler1, NotificationHandler2, NotificationHandler3,
	NotificationHandler4, NotificationHandler5, NotificationHandler6, NotificationHandler7, NotificationHandler8, NotificationHandler9, Trace, TraceValues, TraceFormat,
	TraceOptions, SetTraceParams, SetTraceNotification, LogTraceParams, LogTraceNotification, Tracer, ConnectionErrors, ConnectionError, CancellationId,
	CancellationReceiverStrategy, CancellationSenderStrategy, CancellationStrategy
} from './connection';

import RAL from './ral';

export {
	RAL,
	// Export from messages
	Message, MessageSignature, RequestMessage, RequestType, RequestType0, RequestType1, RequestType2, RequestType3, RequestType4, RequestType5, RequestType6,
	RequestType7, RequestType8, RequestType9, ResponseError, ErrorCodes, NotificationMessage, NotificationType, NotificationType0, NotificationType1,
	NotificationType2, NotificationType3, NotificationType4, NotificationType5, NotificationType6, NotificationType7, NotificationType8,
	NotificationType9, ResponseMessage, ParameterStructures, _EM,
	// Export from linkedMap
	LinkedMap, Touch, LRUCache,
	// Export from disposable
	Disposable,
	// Export from events
	Event, Emitter,
	// Export from cancellation
	AbstractCancellationTokenSource, CancellationTokenSource, CancellationToken,
	// Export from message reader
	MessageReader, AbstractMessageReader, ReadableStreamMessageReader, DataCallback, MessageReaderOptions, PartialMessageInfo,
	// Export from message write
	MessageWriter, AbstractMessageWriter, WriteableStreamMessageWriter, MessageWriterOptions,
	// Export from connection
	Logger, ConnectionStrategy, ConnectionOptions, MessageConnection, NullLogger, createMessageConnection,
	ProgressToken, ProgressType, HandlerResult, StarRequestHandler, GenericRequestHandler,
	RequestHandler0, RequestHandler, RequestHandler1, RequestHandler2, RequestHandler3, RequestHandler4, RequestHandler5, RequestHandler6, RequestHandler7, RequestHandler8,
	RequestHandler9, StarNotificationHandler, GenericNotificationHandler, NotificationHandler0, NotificationHandler, NotificationHandler1, NotificationHandler2, NotificationHandler3,
	NotificationHandler4, NotificationHandler5, NotificationHandler6, NotificationHandler7, NotificationHandler8, NotificationHandler9, Trace, TraceValues, TraceFormat,
	TraceOptions, SetTraceParams, SetTraceNotification, LogTraceParams, LogTraceNotification, Tracer, ConnectionErrors, ConnectionError, CancellationId,
	CancellationReceiverStrategy, CancellationSenderStrategy, CancellationStrategy,
};
