/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Proposed, Diagnostic } from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the linked editing feature
 *
 * @since 3.16.0
 */
export interface DiagnosticsFeatureShape {
	diagnostics: {
		/**
		* Asks the client to refresh all diagnostics provided by this server by
		* pull for the corresponding documents again.
		*/
		refresh(): void;

		/**
		* Installs a handler for the diagnostic request.
		*
		* @param handler The corresponding handler.
		*/
		on(handler: ServerRequestHandler<Proposed.DiagnosticParams, Proposed.DiagnosticList, Diagnostic[], Proposed.DiagnosticServerCancellationData>): void;
	}
}

export const DiagnosticFeature: Feature<_Languages, DiagnosticsFeatureShape> = (Base) => {
	return class extends Base {
		public get diagnostics() {
			return {
				refresh: (): Promise<void> => {
					return this.connection.sendRequest(Proposed.DiagnosticRefreshRequest.type);
				},
				on: (handler: ServerRequestHandler<Proposed.DiagnosticParams, Proposed.DiagnosticList, Diagnostic[], Proposed.DiagnosticServerCancellationData>): void => {
					this.connection.onRequest(Proposed.DiagnosticRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), undefined);
					});
				}
			};
		}
	};
};