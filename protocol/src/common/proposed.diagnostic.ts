/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler0, RequestHandler, ProgressType } from 'vscode-jsonrpc';
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

	/**
	 * Whether the clients supports related documents for document diagnostic pulls.
	 */
	relatedDocumentSupport?: boolean;
}

export interface $DiagnosticClientCapabilities {
	textDocument?: TextDocumentClientCapabilities & {
		diagnostic?: DiagnosticClientCapabilities;
	}
}

/**
 * Diagnostic options.
 *
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
	workspaceDiagnostics: boolean;
}

/**
 * Diagnostic registration options.
 *
 * @since 3.17.0 - proposed state
 */
export interface DiagnosticRegistrationOptions extends TextDocumentRegistrationOptions, DiagnosticOptions, StaticRegistrationOptions {
}

export interface $DiagnosticServerCapabilities {
	diagnosticProvider?: DiagnosticOptions;
}

/**
 * Cancellation data returned from a diagnostic request.
 *
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
 * Parameters of the document diagnostic request.
 *
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
 * The document diagnostic report kinds.
 *
 * @since 3.17.0 - proposed state
 */
export enum DocumentDiagnosticReportKind {
	/**
	 * A diagnostic report with a full
	 * set of problems.
	 */
	full = 'full',

	/**
	 * A report indicating that the last
	 * returned report is still accurate.
	 */
	unChanged = 'unChanged'
}

/**
 * A diagnostic report with a full set of problems.
 *
 * @since 3.17.0 - proposed state
 */
export interface FullDocumentDiagnosticReport {
	/**
	 * A full document diagnostic report.
	 */
	kind: DocumentDiagnosticReportKind.full;

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
}

/**
 * A full diagnostic report with a set of related documents.
 *
 * @since 3.17.0 - proposed state
 */
export interface RelatedFullDocumentDiagnosticReport extends FullDocumentDiagnosticReport {
	/**
	 * Diagnostics of related documents. This information is useful
	 * in programming languages where code in a file A can generate
	 * diagnostics in a file B which A depends on. An example of
	 * such a language is C/C++ where marco definitions in a file
	 * a.cpp and result in errors in a header file b.hpp.
	 *
	 * @since 3.17.0 - proposed state
	 */
	relatedDocuments?: {
		[uri: string /** DocumentUri */]: FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport;
	}
}

/**
 * A diagnostic report indicating that the last returned
 * report is still accurate.
 *
 * @since 3.17.0 - proposed state
 */
export interface UnchangedDocumentDiagnosticReport {
	/**
	 * A document diagnostic report indicating
	 * no changes to the last result. A server can
	 * only return `unchanged` if result ids are
	 * provided.
	 */
	kind: DocumentDiagnosticReportKind.unChanged;

	/**
	 * A result id which will be sent on the next
	 * diagnostic request for the same document.
	 */
	resultId: string;
}

/**
 * An unchanged diagnostic report with a set of related documents.
 *
 * @since 3.17.0 - proposed state
 */
export interface RelatedUnchangedDocumentDiagnosticReport extends UnchangedDocumentDiagnosticReport {
	/**
	 * Diagnostics of related documents. This information is useful
	 * in programming languages where code in a file A can generate
	 * diagnostics in a file B which A depends on. An example of
	 * such a language is C/C++ where marco definitions in a file
	 * a.cpp and result in errors in a header file b.hpp.
	 *
	 * @since 3.17.0 - proposed state
	 */
	relatedDocuments?: {
		[uri: string /** DocumentUri */]: FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport;
	}
}

/**
 * The result of a document diagnostic pull request. A report can
 * either be a full report containing all diagnostics for the
 * requested document or a unchanged report indicating that nothing
 * has changed in terms of diagnostics in comparison to the last
 * pull request.
 *
 * @since 3.17.0 - proposed state
 */
export type DocumentDiagnosticReport = RelatedFullDocumentDiagnosticReport | RelatedUnchangedDocumentDiagnosticReport;

/**
 * A partial result for a document diagnostic report.
 *
 * @since 3.17.0 - proposed state
 */
export interface DocumentDiagnosticReportPartialResult {
	relatedDocuments: {
		[uri: string /** DocumentUri */]: FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport;
	}
}

/**
 * The document diagnostic request definition.
 *
 * @since 3.17.0 - proposed state
 */
export namespace DocumentDiagnosticRequest {
	export const method: 'textDocument/diagnostic' = 'textDocument/diagnostic';
	export const type = new ProtocolRequestType<DocumentDiagnosticParams, DocumentDiagnosticReport, DocumentDiagnosticReportPartialResult, DiagnosticServerCancellationData, DiagnosticRegistrationOptions>(method);
	export const partialResult = new ProgressType<DocumentDiagnosticReportPartialResult>();
	export type HandlerSignature = RequestHandler<DocumentDiagnosticParams, DocumentDiagnosticReport, void>;
}

/**
 * A previous result id in a workspace pull request.
 *
 * @since 3.17.0 - proposed state
 */
export type PreviousResultId = {
	/**
	 * The URI for which the client knowns a
	 * result id.
	 */
	uri: DocumentUri;

	/**
	 * The value of the previous result id.
	 */
	value: string;
};

/**
 * Parameters of the workspace diagnostic request.
 *
 * @since 3.17.0 - proposed state
 */
export interface WorkspaceDiagnosticParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The additional identifier provided during registration.
	 */
	identifier?: string;

	/**
	 * The currently known diagnostic reports with their
	 * previous result ids.
	 */
	previousResultIds: PreviousResultId[];
}

/**
 * A full document diagnostic report for a workspace diagnostic result.
 *
 * @since 3.17.0 - proposed state
 */
export interface WorkspaceFullDocumentDiagnosticReport extends FullDocumentDiagnosticReport {

	/**
	 * The URI for which diagnostic information is reported.
	 */
	uri: DocumentUri;

	/**
	 * The version number for which the diagnostics are reported.
	 * If the document is not marked as open `null` can be provided.
	 */
	version: integer | null;
}

/**
 * An unchanged document diagnostic report for a workspace diagnostic result.
 *
 * @since 3.17.0 - proposed state
 */
export interface WorkspaceUnchangedDocumentDiagnosticReport extends UnchangedDocumentDiagnosticReport {

	/**
	 * The URI for which diagnostic information is reported.
	 */
	uri: DocumentUri;

	/**
	 * The version number for which the diagnostics are reported.
	 * If the document is not marked as open `null` can be provided.
	 */
	version: integer | null;
}

/**
 * A workspace diagnostic document report.
 *
 * @since 3.17.0 - proposed state
 */
export type WorkspaceDocumentDiagnosticReport = WorkspaceFullDocumentDiagnosticReport | WorkspaceUnchangedDocumentDiagnosticReport;


/**
 * A workspace diagnostic report.
 *
 * @since 3.17.0 - proposed state
 */
export interface WorkspaceDiagnosticReport {
	items: WorkspaceDocumentDiagnosticReport[];
}

/**
 * A partial result for a workspace diagnostic report.
 *
 * @since 3.17.0 - proposed state
 */
export interface WorkspaceDiagnosticReportPartialResult {
	items: WorkspaceDocumentDiagnosticReport[];
}

/**
 * The workspace diagnostic request definition.
 *
 * @since 3.17.0 - proposed state
 */
export namespace WorkspaceDiagnosticRequest {
	export const method: 'workspace/diagnostic' = 'workspace/diagnostic';
	export const type = new ProtocolRequestType<WorkspaceDiagnosticParams, WorkspaceDiagnosticReport, WorkspaceDiagnosticReportPartialResult, DiagnosticServerCancellationData, void>(method);
	export const partialResult = new ProgressType<WorkspaceDiagnosticReportPartialResult>();
	export type HandlerSignature = RequestHandler<WorkspaceDiagnosticParams, WorkspaceDiagnosticReport | null, void>;
}

/**
 * The diagnostic refresh request definition.
 *
 * @since 3.17.0 - proposed state
 */
export namespace DiagnosticRefreshRequest {
	export const method: `workspace/diagnostic/refresh` = `workspace/diagnostic/refresh`;
	export const type = new ProtocolRequestType0<void, void, void, void>(method);
	export type HandlerSignature = RequestHandler0<void, void>;
}