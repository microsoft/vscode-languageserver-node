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
	/**
	 * Installs a handler for the linked editing range request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDiagnostic(handler: ServerRequestHandler<Proposed.DiagnosticParams, Diagnostic[] | undefined | null, never, never>): void;
}

export const DiagnosticFeature: Feature<_Languages, DiagnosticsFeatureShape> = (Base) => {
	return class extends Base {
		public onDiagnostic(handler: ServerRequestHandler<Proposed.DiagnosticParams, Diagnostic[] | undefined | null, never, never>): void {
			this.connection.onRequest(Proposed.DiagnosticRequest.type, (params, cancel) => {
				return handler(params, cancel, this.attachWorkDoneProgress(params), undefined);
			});
		}
	};
};