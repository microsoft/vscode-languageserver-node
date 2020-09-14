/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	Moniker, ResolveMonikerParams, ResolveMonikerRequest
} from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

export interface ResolveMonikerFeatureShape {
	resolveMoniker: {
		on(handler: ServerRequestHandler<ResolveMonikerParams, Moniker[], Moniker[], void>): void;
	}
}

export const ResolveMonikerFeature : Feature<_Languages, ResolveMonikerFeatureShape> = (Base) => {
	return class extends Base {
		public get resolveMoniker() {
			return {
				on: (handler: ServerRequestHandler<ResolveMonikerParams, Moniker[], Moniker[], void>): void => {
					const type = ResolveMonikerRequest.type;
					this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				},
			};
		}
	};
};