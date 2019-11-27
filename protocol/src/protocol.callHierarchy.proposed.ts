/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { RequestType, RequestHandler, ProgressType } from 'vscode-jsonrpc';
import { SymbolKind, SymbolTag, Range, DocumentUri } from 'vscode-languageserver-types';
import {
	TextDocumentRegistrationOptions, StaticRegistrationOptions, TextDocumentPositionParams, PartialResultParams,
	WorkDoneProgressParams, WorkDoneProgressOptions
} from './protocol';

export interface CallHierarchyItem {
	/**
	 * The name of this item.
	 */
	name: string;

	/**
	 * The kind of this item.
	 */
	kind: SymbolKind;

	/**
	 * Tags for this item.
	 */
	tags?: SymbolTag[];

	/**
	 * More detail for this item, e.g. the signature of a function.
	 */
	detail?: string;

	/**
	 * The resource identifier of this item.
	 */
	uri: DocumentUri;

	/**
	 * The range enclosing this symbol not including leading/trailing whitespace but everything else, e.g. comments and code.
	 */
	range: Range;

	/**
	 * The range that should be selected and revealed when this symbol is being picked, e.g. the name of a function.
	 * Must be contained by the [`range`](#CallHierarchyItem.range).
	 */
	selectionRange: Range;
}

/**
 * Represents an incoming call, e.g. a caller of a method or constructor.
 */
export interface CallHierarchyIncomingCall {

	/**
	 * The item that makes the call.
	 */
	from: CallHierarchyItem;

	/**
	 * The range at which at which the calls appears. This is relative to the caller
	 * denoted by [`this.from`](#CallHierarchyIncomingCall.from).
	 */
	fromRanges: Range[];
}

/**
 * Represents an outgoing call, e.g. calling a getter from a method or a method from a constructor etc.
 */
export interface CallHierarchyOutgoingCall {

	/**
	 * The item that is called.
	 */
	to: CallHierarchyItem;

	/**
	 * The range at which this item is called. This is the range relative to the caller, e.g the item
	 * passed to [`provideCallHierarchyOutgoingCalls`](#CallHierarchyItemProvider.provideCallHierarchyOutgoingCalls)
	 * and not [`this.to`](#CallHierarchyOutgoingCall.to).
	 */
	fromRanges: Range[];
}

export interface CallHierarchyClientCapabilities {
	/**
	 * The text document client capabilities
	 */
	textDocument?: {
		/**
		 * Capabilities specific to the `textDocument/callHierarchy`
		 */
		callHierarchy?: {
			/**
			 * Whether implementation supports dynamic registration. If this is set to `true`
			 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
			 * return value for the corresponding server capability as well.
			 */
			dynamicRegistration?: boolean;
		};
	}
}

export interface CallHierarchyOptions extends WorkDoneProgressOptions {
}

export interface CallHierarchyRegistrationOptions extends TextDocumentRegistrationOptions, CallHierarchyOptions {
}

export interface CallHierarchyServerCapabilities {
	/**
	 * The server provides Call Hierarchy support.
	 */
	callHierarchyProvider?: boolean | CallHierarchyOptions | (CallHierarchyRegistrationOptions & StaticRegistrationOptions);
}

/**
 * The parameter of a `textDocument/prepareCallHierarchy` request.
 */
export interface CallHierarchyPrepareParams extends TextDocumentPositionParams, WorkDoneProgressParams {
}

export namespace CallHierarchyPrepareRequest {
	export const method: 'textDocument/prepareCallHierarchy' = 'textDocument/prepareCallHierarchy';
	export const type = new RequestType<CallHierarchyPrepareParams, CallHierarchyItem[] | null, void, CallHierarchyRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<CallHierarchyPrepareParams, CallHierarchyItem[] | null, void>;
}

export interface CallHierarchyIncomingCallsParams extends WorkDoneProgressParams, PartialResultParams {
	item: CallHierarchyItem;
}

export namespace CallHierarchyIncomingCallsRequest {
	export const method: 'callHierarchy/incomingCalls' = 'callHierarchy/incomingCalls';
	export const type = new RequestType<CallHierarchyIncomingCallsParams, CallHierarchyIncomingCall[] | null, void, void>(method);
	export const resultType = new ProgressType<CallHierarchyIncomingCall[]>();
	export type HandlerSignature = RequestHandler<CallHierarchyIncomingCallsParams, CallHierarchyIncomingCall[] | null, void>;
}

export interface CallHierarchyOutgoingCallsParams extends WorkDoneProgressParams, PartialResultParams {
	item: CallHierarchyItem;
}

export namespace CallHierarchyOutgoingCallsRequest {
	export const method: 'callHierarchy/outgoingCalls' = 'callHierarchy/outgoingCalls';
	export const type = new RequestType<CallHierarchyOutgoingCallsParams, CallHierarchyOutgoingCall[] | null, void, void>(method);
	export const resultType = new ProgressType<CallHierarchyOutgoingCall[]>();
	export type HandlerSignature = RequestHandler<CallHierarchyOutgoingCallsParams, CallHierarchyOutgoingCall[] | null, void>;
}