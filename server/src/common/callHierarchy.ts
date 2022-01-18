/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	CallHierarchyItem, CallHierarchyPrepareParams, CallHierarchyIncomingCallsParams, CallHierarchyIncomingCall, CallHierarchyOutgoingCallsParams,
	CallHierarchyOutgoingCall, CallHierarchyPrepareRequest, CallHierarchyIncomingCallsRequest, CallHierarchyOutgoingCallsRequest
} from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the call hierarchy feature
 *
 * @since 3.16.0
 */
export interface CallHierarchy {
	callHierarchy: {
		onPrepare(handler: ServerRequestHandler<CallHierarchyPrepareParams, CallHierarchyItem[] | null, never, void>): void;
		onIncomingCalls(handler: ServerRequestHandler<CallHierarchyIncomingCallsParams, CallHierarchyIncomingCall[] | null, CallHierarchyIncomingCall[], void>): void;
		onOutgoingCalls(handler: ServerRequestHandler<CallHierarchyOutgoingCallsParams, CallHierarchyOutgoingCall[] | null, CallHierarchyOutgoingCall[], void>): void;
	};
}

export const CallHierarchyFeature: Feature<_Languages, CallHierarchy> = (Base) => {
	return class extends Base {
		public get callHierarchy() {
			return {
				onPrepare: (handler: ServerRequestHandler<CallHierarchyPrepareParams, CallHierarchyItem[] | null, never, void>): void => {
					this.connection.onRequest(CallHierarchyPrepareRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), undefined);
					});
				},
				onIncomingCalls: (handler: ServerRequestHandler<CallHierarchyIncomingCallsParams, CallHierarchyIncomingCall[] | null, CallHierarchyIncomingCall[], void>): void => {
					const type = CallHierarchyIncomingCallsRequest.type;
					this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				},
				onOutgoingCalls: (handler: ServerRequestHandler<CallHierarchyOutgoingCallsParams, CallHierarchyOutgoingCall[] | null, CallHierarchyOutgoingCall[], void>): void => {
					const type = CallHierarchyOutgoingCallsRequest.type;
					this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				}
			};
		}
	};
};