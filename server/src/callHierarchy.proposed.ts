/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	ClientCapabilities, Proposed
} from 'vscode-languageserver-protocol';

import { Feature, _Languages, ServerRequestHandler } from './main';

export interface CallHierarchy {
	onCallHierarchyPrepare(handler: ServerRequestHandler<Proposed.CallHierarchyPrepareParams, Proposed.CallHierarchyItem[] | null, void>): void;
}

export const CallHierarchyFeature: Feature<_Languages, CallHierarchy> = (Base) => {
	return class extends Base {
		public onCallHierarchyPrepare(handler: ServerRequestHandler<Proposed.CallHierarchyPrepareParams, Proposed.CallHierarchyItem[] | null, void>): void {
			const connection = this.connection;
			connection.onRequest(Proposed.CallHierarchyPrepareRequest.type, (params, cancel) => {
				return handler(params, cancel, this.attachWorkDoneProgress(params), undefined);
			});
		}
		public onCallHierarchyIncomingCalls(handler: ServerRequestHandler<Proposed.CallHierarchyIncomingCallsParams, Proposed.CallHierarchyIncomingCall[] | null, void>) {
			const connection = this.connection;
			connection.onRequest(Proposed.CallHierarchyIncomingCallsRequest.type, (params, cancel) => {
				return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(params));
			});
		}
	};
};