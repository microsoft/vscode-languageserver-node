/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Proposed } from 'vscode-languageserver-protocol';
import { Feature, _Languages, ServerRequestHandler } from './main';

export interface CallHierarchy {
	callHierarchy: {
		onPrepare(handler: ServerRequestHandler<Proposed.CallHierarchyPrepareParams, Proposed.CallHierarchyItem[] | null, never, void>): void;
		onIncomingCalls(handler: ServerRequestHandler<Proposed.CallHierarchyIncomingCallsParams, Proposed.CallHierarchyIncomingCall[] | null, Proposed.CallHierarchyIncomingCall[], void>): void;
		onOutgoingCalls(handler: ServerRequestHandler<Proposed.CallHierarchyOutgoingCallsParams, Proposed.CallHierarchyOutgoingCall[] | null, Proposed.CallHierarchyOutgoingCall[], void>): void;
	}
}

export const CallHierarchyFeature: Feature<_Languages, CallHierarchy> = (Base) => {
	return class extends Base {
		public get callHierarchy() {
			return {
				onPrepare: (handler: ServerRequestHandler<Proposed.CallHierarchyPrepareParams, Proposed.CallHierarchyItem[] | null, never, void>): void => {
					this.connection.onRequest(Proposed.CallHierarchyPrepareRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), undefined);
					});
				},
				onIncomingCalls: (handler: ServerRequestHandler<Proposed.CallHierarchyIncomingCallsParams, Proposed.CallHierarchyIncomingCall[] | null, Proposed.CallHierarchyIncomingCall[], void>): void => {
					const type = Proposed.CallHierarchyIncomingCallsRequest.type;
					this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				},
				onOutgoingCalls: (handler: ServerRequestHandler<Proposed.CallHierarchyOutgoingCallsParams, Proposed.CallHierarchyOutgoingCall[] | null, Proposed.CallHierarchyOutgoingCall[], void>): void => {
					const type = Proposed.CallHierarchyOutgoingCallsRequest.type;
					this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				}
			};
		}
	};
};