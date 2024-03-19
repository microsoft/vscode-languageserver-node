/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { MonikerParams, Moniker, MonikerRequest, Disposable } from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the moniker feature
 *
 * @since 3.16.0
 */
export interface MonikerFeatureShape {
	moniker: {
		on(handler: ServerRequestHandler<MonikerParams, Moniker[] | null, Moniker[], void>): Disposable;
	};
}

export const MonikerFeature : Feature<_Languages, MonikerFeatureShape> = (Base) => {
	return class extends Base {
		public get moniker() {
			return {
				on: (handler: ServerRequestHandler<MonikerParams, Moniker[] | null, Moniker[], void>): Disposable => {
					const type = MonikerRequest.type;
					return this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				},
			};
		}
	};
};
