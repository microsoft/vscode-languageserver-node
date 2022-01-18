/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Proposed } from 'vscode-languageserver-protocol';

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
		* Installs a handler for the document diagnostic request.
		*
		* @param handler The corresponding handler.
		*/
		on(handler: ServerRequestHandler<Proposed.DocumentDiagnosticParams, Proposed.DocumentDiagnosticReport, Proposed.DocumentDiagnosticReportPartialResult, Proposed.DiagnosticServerCancellationData>): void;

		/**
		 * Installs a handler for the workspace diagnostic request.
		 *
		 * @param handler The corresponding handler.
		 */
		 onWorkspace(handler: ServerRequestHandler<Proposed.WorkspaceDiagnosticParams, Proposed.WorkspaceDiagnosticReport, Proposed.WorkspaceDiagnosticReportPartialResult, Proposed.DiagnosticServerCancellationData>): void;
	};
}

export const DiagnosticFeature: Feature<_Languages, DiagnosticsFeatureShape> = (Base) => {
	return class extends Base {
		public get diagnostics() {
			return {
				refresh: (): Promise<void> => {
					return this.connection.sendRequest(Proposed.DiagnosticRefreshRequest.type);
				},
				on: (handler: ServerRequestHandler<Proposed.DocumentDiagnosticParams, Proposed.DocumentDiagnosticReport, Proposed.DocumentDiagnosticReportPartialResult, Proposed.DiagnosticServerCancellationData>): void => {
					this.connection.onRequest(Proposed.DocumentDiagnosticRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(Proposed.DocumentDiagnosticRequest.partialResult, params));
					});
				},
				onWorkspace: (handler: ServerRequestHandler<Proposed.WorkspaceDiagnosticParams, Proposed.WorkspaceDiagnosticReport, Proposed.WorkspaceDiagnosticReportPartialResult, Proposed.DiagnosticServerCancellationData>): void => {
					this.connection.onRequest(Proposed.WorkspaceDiagnosticRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(Proposed.WorkspaceDiagnosticRequest.partialResult, params));
					});
				}
			};
		}
	};
};