/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox, Microsoft and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler } from 'vscode-jsonrpc';
import { CallHierarchyItem, CallHierarchyIncomingCall, CallHierarchyOutgoingCall } from 'vscode-languageserver-types';

import { CM, MessageDirection, ProtocolRequestType } from './messages';
import {
	type TextDocumentRegistrationOptions, type StaticRegistrationOptions, type TextDocumentPositionParams, type PartialResultParams,
	type WorkDoneProgressParams, type WorkDoneProgressOptions,
} from './protocol';

/**
 * @since 3.16.0
 */
export interface CallHierarchyClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration. If this is set to `true`
	 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
	 * return value for the corresponding server capability as well.
	 */
	dynamicRegistration?: boolean;
}

/**
 * Call hierarchy options used during static registration.
 *
 * @since 3.16.0
 */
export interface CallHierarchyOptions extends WorkDoneProgressOptions {
}

/**
 * Call hierarchy options used during static or dynamic registration.
 *
 * @since 3.16.0
 */
export interface CallHierarchyRegistrationOptions extends TextDocumentRegistrationOptions, CallHierarchyOptions, StaticRegistrationOptions {
}

/**
 * The parameter of a `textDocument/prepareCallHierarchy` request.
 *
 * @since 3.16.0
 */
export interface CallHierarchyPrepareParams extends TextDocumentPositionParams, WorkDoneProgressParams {
}

/**
 * A request to result a `CallHierarchyItem` in a document at a given position.
 * Can be used as an input to an incoming or outgoing call hierarchy.
 *
 * @since 3.16.0
 */
export namespace CallHierarchyPrepareRequest {
	export const method: 'textDocument/prepareCallHierarchy' = 'textDocument/prepareCallHierarchy';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolRequestType<CallHierarchyPrepareParams, CallHierarchyItem[] | null, never, void, CallHierarchyRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<CallHierarchyPrepareParams, CallHierarchyItem[] | null, void>;
	export const capabilities = CM.create('textDocument.callHierarchy', 'callHierarchyProvider');
}

/**
 * The parameter of a `callHierarchy/incomingCalls` request.
 *
 * @since 3.16.0
 */
export interface CallHierarchyIncomingCallsParams extends WorkDoneProgressParams, PartialResultParams {
	item: CallHierarchyItem;
}

/**
 * A request to resolve the incoming calls for a given `CallHierarchyItem`.
 *
 * @since 3.16.0
 */
export namespace CallHierarchyIncomingCallsRequest {
	export const method: 'callHierarchy/incomingCalls' = 'callHierarchy/incomingCalls';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolRequestType<CallHierarchyIncomingCallsParams, CallHierarchyIncomingCall[] | null, CallHierarchyIncomingCall[], void, void>(method);
	export type HandlerSignature = RequestHandler<CallHierarchyIncomingCallsParams, CallHierarchyIncomingCall[] | null, void>;
	export const capabilities = CM.create('textDocument.callHierarchy', 'callHierarchyProvider');
}

/**
 * The parameter of a `callHierarchy/outgoingCalls` request.
 *
 * @since 3.16.0
 */
export interface CallHierarchyOutgoingCallsParams extends WorkDoneProgressParams, PartialResultParams {
	item: CallHierarchyItem;
}

/**
 * A request to resolve the outgoing calls for a given `CallHierarchyItem`.
 *
 * @since 3.16.0
 */
export namespace CallHierarchyOutgoingCallsRequest {
	export const method: 'callHierarchy/outgoingCalls' = 'callHierarchy/outgoingCalls';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolRequestType<CallHierarchyOutgoingCallsParams, CallHierarchyOutgoingCall[] | null, CallHierarchyOutgoingCall[], void, void>(method);
	export type HandlerSignature = RequestHandler<CallHierarchyOutgoingCallsParams, CallHierarchyOutgoingCall[] | null, void>;
	export const capabilities = CM.create('textDocument.callHierarchy', 'callHierarchyProvider');
}
