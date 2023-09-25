/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	Disposable, DocumentDiagnosticParams, DocumentDiagnosticReport, DocumentDiagnosticReportPartialResult, DiagnosticServerCancellationData,
	WorkspaceDiagnosticParams, WorkspaceDiagnosticReport, WorkspaceDiagnosticReportPartialResult, DiagnosticRefreshRequest, DocumentDiagnosticRequest,
	WorkspaceDiagnosticRequest
} from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the linked editing feature
 *
 * @since 3.16.0
 */
export interface DiagnosticFeatureShape {
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
		on(handler: ServerRequestHandler<DocumentDiagnosticParams, DocumentDiagnosticReport, DocumentDiagnosticReportPartialResult, DiagnosticServerCancellationData>): Disposable;

		/**
		 * Installs a handler for the workspace diagnostic request.
		 *
		 * @param handler The corresponding handler.
		 */
		 onWorkspace(handler: ServerRequestHandler<WorkspaceDiagnosticParams, WorkspaceDiagnosticReport, WorkspaceDiagnosticReportPartialResult, DiagnosticServerCancellationData>): Disposable;
	};
}

export const DiagnosticFeature: Feature<_Languages, DiagnosticFeatureShape> = (Base) => {
	return class extends Base {
		public get diagnostics() {
			return {
				refresh: (): Promise<void> => {
					return this.connection.sendRequest(DiagnosticRefreshRequest.type);
				},
				on: (handler: ServerRequestHandler<DocumentDiagnosticParams, DocumentDiagnosticReport, DocumentDiagnosticReportPartialResult, DiagnosticServerCancellationData>): Disposable => {
					return this.connection.onRequest(DocumentDiagnosticRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(DocumentDiagnosticRequest.partialResult, params));
					});
				},
				onWorkspace: (handler: ServerRequestHandler<WorkspaceDiagnosticParams, WorkspaceDiagnosticReport, WorkspaceDiagnosticReportPartialResult, DiagnosticServerCancellationData>): Disposable => {
					return this.connection.onRequest(WorkspaceDiagnosticRequest.type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(WorkspaceDiagnosticRequest.partialResult, params));
					});
				}
			};
		}
	};
};
