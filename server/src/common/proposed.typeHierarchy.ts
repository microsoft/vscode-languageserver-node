/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Proposed, TypeHierarchyItem, Disposable } from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the type hierarchy feature
 *
 * @since 3.17.0 - proposed state
 */
export interface TypeHierarchyFeatureShape {
	typeHierarchy: {
		onPrepare(handler: ServerRequestHandler<Proposed.TypeHierarchyPrepareParams, TypeHierarchyItem[] | null, never, void>): Disposable;
		onSupertypes(handler: ServerRequestHandler<Proposed.TypeHierarchySupertypesParams, TypeHierarchyItem[] | null, TypeHierarchyItem[], void>): Disposable;
		onSubtypes(handler: ServerRequestHandler<Proposed.TypeHierarchySubtypesParams, TypeHierarchyItem[] | null, TypeHierarchyItem[], void>): Disposable;
	};
}

export const TypeHierarchyFeature: Feature<_Languages, TypeHierarchyFeatureShape> = (Base) => {
	return class extends Base {
		public get typeHierarchy() {
			return {
				onPrepare: (handler: ServerRequestHandler<Proposed.TypeHierarchyPrepareParams, TypeHierarchyItem[] | null, never, void>): Disposable => {
					return this.connection.onRequest(Proposed.TypeHierarchyPrepareRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), undefined);
					});
				},
				onSupertypes: (handler: ServerRequestHandler<Proposed.TypeHierarchySupertypesParams, TypeHierarchyItem[] | null, TypeHierarchyItem[], void>): Disposable => {
					const type = Proposed.TypeHierarchySupertypesRequest.type;
					return this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				},
				onSubtypes: (handler: ServerRequestHandler<Proposed.TypeHierarchySubtypesParams, TypeHierarchyItem[] | null, TypeHierarchyItem[], void>): Disposable => {
					const type = Proposed.TypeHierarchySubtypesRequest.type;
					return this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				}
			};
		}
	};
};