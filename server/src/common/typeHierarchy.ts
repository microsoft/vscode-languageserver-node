/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	TypeHierarchyItem, TypeHierarchyPrepareParams, TypeHierarchySupertypesParams, TypeHierarchySubtypesParams,
	TypeHierarchyPrepareRequest, TypeHierarchySupertypesRequest, TypeHierarchySubtypesRequest
} from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the type hierarchy feature
 *
 * @since 3.17.0 - proposed state
 */
export interface TypeHierarchyFeatureShape {
	callHierarchy: {
		onPrepare(handler: ServerRequestHandler<TypeHierarchyPrepareParams, TypeHierarchyItem[] | null, never, void>): void;
		onIncomingCalls(handler: ServerRequestHandler<TypeHierarchySupertypesParams, TypeHierarchyItem[] | null, TypeHierarchyItem[], void>): void;
		onOutgoingCalls(handler: ServerRequestHandler<TypeHierarchySubtypesParams, TypeHierarchyItem[] | null, TypeHierarchyItem[], void>): void;
	}
}

export const TypeHierarchyFeature: Feature<_Languages, TypeHierarchyFeatureShape> = (Base) => {
	return class extends Base {
		public get callHierarchy() {
			return {
				onPrepare: (handler: ServerRequestHandler<TypeHierarchyPrepareParams, TypeHierarchyItem[] | null, never, void>): void => {
					this.connection.onRequest(TypeHierarchyPrepareRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), undefined);
					});
				},
				onIncomingCalls: (handler: ServerRequestHandler<TypeHierarchySupertypesParams, TypeHierarchyItem[] | null, TypeHierarchyItem[], void>): void => {
					const type = TypeHierarchySupertypesRequest.type;
					this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				},
				onOutgoingCalls: (handler: ServerRequestHandler<TypeHierarchySubtypesParams, TypeHierarchyItem[] | null, TypeHierarchyItem[], void>): void => {
					const type = TypeHierarchySubtypesRequest.type;
					this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				}
			};
		}
	};
};