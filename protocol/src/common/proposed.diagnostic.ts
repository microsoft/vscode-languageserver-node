/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler0, RequestHandler } from 'vscode-jsonrpc';
import { TextDocumentIdentifier, Diagnostic, DocumentUri, integer } from 'vscode-languageserver-types';

import * as Is from './utils/is';
import { ProtocolRequestType0, ProtocolRequestType } from './messages';
import {
	PartialResultParams, StaticRegistrationOptions, WorkDoneProgressParams, TextDocumentRegistrationOptions, WorkDoneProgressOptions, TextDocumentClientCapabilities
} from './protocol';


/**
 * @since 3.17.0 - proposed state
 */
export interface DiagnosticClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration. If this is set to `true`
	 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
	 * return value for the corresponding server capability as well.
	 */
	dynamicRegistration?: boolean;
}

export interface $DiagnosticClientCapabilities {
	textDocument?: TextDocumentClientCapabilities & {
		diagnostic: DiagnosticClientCapabilities;
	}
}

/**
 * @since 3.17.0 - proposed state
 */
export interface DiagnosticOptions extends WorkDoneProgressOptions {
	/**
	 * An optional identifier under which the diagnostics are
	 * managed by the client.
	 */
	identifier?: string;

	/**
	 * Whether the language has inter file dependencies meaning that
	 * editing code in one file can result in a different diagnostic
	 * set in another file. Inter file dependencies are common for
	 * most programming languages and typically uncommon for linters.
	 */
	interFileDependencies: boolean;

	/**
	 * The server provides support for workspace diagnostics as well.
	 */
	workspaceProvider: boolean;
}

/**
 * @since 3.17.0 - proposed state
 */
export interface DiagnosticRegistrationOptions extends TextDocumentRegistrationOptions, DiagnosticOptions, StaticRegistrationOptions {
}

export interface $DiagnosticServerCapabilities {
	diagnosticProvider?: DiagnosticOptions;
}

/**
 * @since 3.17.0 - proposed state
 */
export interface DiagnosticServerCancellationData {
	retriggerRequest: boolean;
}

/**
 * @since 3.17.0 - proposed state
 */
export namespace DiagnosticServerCancellationData {
	export function is(value: any): value is DiagnosticServerCancellationData {
		const candidate = value as DiagnosticServerCancellationData;
		return candidate && Is.boolean(candidate.retriggerRequest);
	}
}


/**
 * @since 3.17.0 - proposed state
 */
export interface DocumentDiagnosticParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The additional identifier  provided during registration.
	 */
	identifier?: string;

	/**
	 * The result id of a previous response if provided.
	 */
	previousResultId?: string;
}

/**
 * The result of a diagnostic pull request.
 *
 * @since 3.17.0 - proposed state
 */
export type DocumentDiagnosticReport = {

	/**
	 * A full document diagnostic report.
	 */
	kind: 'full';

	/**
	 * An optional result id. If provided it will
	 * be sent on the next diagnostic request for the
	 * same document.
	 */
	resultId?: string;

	/**
	 * The actual items.
	 */
	items: Diagnostic[];
} | {
	/**
	 * A document diagnostic report indicating
	 * no changes to the last result. A server can
	 * only return `unchanged` if result ids are
	 * provided.
	 */
	kind: 'unChanged';

	/**
	 * A result id which will be sent on the next
	 * diagnostic request for the same document.
	 */
	resultId: string;
};

export interface DocumentDiagnosticReportPartialResult {
	items: Diagnostic[];
}

/**
 * @since 3.17.0 - proposed state
 */
export namespace DocumentDiagnosticRequest {
	export const method: 'textDocument/diagnostic' = 'textDocument/diagnostic';
	export const type = new ProtocolRequestType<DocumentDiagnosticParams, DocumentDiagnosticReport, DocumentDiagnosticReportPartialResult, DiagnosticServerCancellationData, DiagnosticRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<DocumentDiagnosticParams, DocumentDiagnosticReport, void>;
}

export interface WorkspaceDiagnosticParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The additional identifier provided during registration.
	 */
	identifier?: string;
}

export type WorkspaceDocumentDiagnosticReport = {

	/**
	 * The URI for which diagnostic information is reported.
	 */
	uri: DocumentUri;

	/**
	 * The version number for which the diagnostics are reported.
	 * If the document is not marked as open `null` can be provided.
	 */
	version: integer | null;
} & DocumentDiagnosticReport;

export interface WorkspaceDiagnosticReport {
	items: WorkspaceDocumentDiagnosticReport[];
}

export interface WorkspaceDiagnosticReportPartialResult {
	items: WorkspaceDocumentDiagnosticReport[];
}

/**
 * @since 3.17.0 - proposed state
 */
export namespace WorkspaceDiagnosticRequest {
	export const method: 'workspace/diagnostic' = 'workspace/diagnostic';
	export const type = new ProtocolRequestType<WorkspaceDiagnosticParams, WorkspaceDiagnosticReport, WorkspaceDiagnosticReportPartialResult, DiagnosticServerCancellationData, void>(method);
	export type HandlerSignature = RequestHandler<WorkspaceDiagnosticParams, WorkspaceDiagnosticReport | null, void>;
}

/**
 * @since 3.17.0 - proposed state
 */
export namespace DiagnosticRefreshRequest {
	export const method: `workspace/diagnostic/refresh` = `workspace/diagnostic/refresh`;
	export const type = new ProtocolRequestType0<void, void, void, void>(method);
	export type HandlerSignature = RequestHandler0<void, void>;
}