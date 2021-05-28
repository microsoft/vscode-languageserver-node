/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import type { integer } from 'vscode-languageserver-types';

export * from 'vscode-jsonrpc';
export * from 'vscode-languageserver-types';

export * from './messages';
export * from './protocol';

export { ProtocolConnection, createProtocolConnection } from './connection';

export namespace LSPErrorCodes {
	/**
	* This is the start range of LSP reserved error codes.
	* It doesn't denote a real error code.
	*
	* @since 3.16.0
	*/
	export const lspReservedErrorRangeStart: integer = -32899;

	/**
	 * The server cancelled the request. This error code should
	 * only be used for requests that explicitly support being
	 * server cancellable.
	 *
	 * @since 3.17.0
	 */
	export const ServerCancelled: integer = -32802;

	/**
	 * The server detected that the content of a document got
	 * modified outside normal conditions. A server should
	 * NOT send this error code if it detects a content change
	 * in it unprocessed messages. The result even computed
	 * on an older state might still be useful for the client.
	 *
	 * If a client decides that a result is not of any use anymore
	 * the client should cancel the request.
	 */
	export const ContentModified: integer = -32801;

	/**
	 * The client has canceled a request and a server as detected
	 * the cancel.
	 */
	export const RequestCancelled: integer = -32800;

	/**
	* This is the end range of LSP reserved error codes.
	* It doesn't denote a real error code.
	*
	* @since 3.16.0
	*/
	export const lspReservedErrorRangeEnd: integer = -32800;
}

import * as diag from './proposed.diagnostic';

export namespace Proposed {
	export type DiagnosticClientCapabilities = diag.DiagnosticClientCapabilities;
	export type $DiagnosticClientCapabilities = diag.$DiagnosticClientCapabilities;
	export type DiagnosticOptions = diag.DiagnosticOptions;
	export type DiagnosticRegistrationOptions = diag.DiagnosticRegistrationOptions;
	export type $DiagnosticServerCapabilities = diag.$DiagnosticServerCapabilities;

	export type DocumentDiagnosticParams = diag.DocumentDiagnosticParams;
	export type DiagnosticServerCancellationData = diag.DiagnosticServerCancellationData;
	export const DiagnosticServerCancellationData = diag.DiagnosticServerCancellationData;
	export type DocumentDiagnosticReportKind = diag.DocumentDiagnosticReportKind;
	export const DocumentDiagnosticReportKind = diag.DocumentDiagnosticReportKind;
	export type FullDocumentDiagnosticReport = diag.FullDocumentDiagnosticReport;
	export type RelatedFullDocumentDiagnosticReport = diag.RelatedFullDocumentDiagnosticReport;
	export type UnchangedDocumentDiagnosticReport = diag.UnchangedDocumentDiagnosticReport;
	export type RelatedUnchangedDocumentDiagnosticReport = diag.RelatedUnchangedDocumentDiagnosticReport;
	export type DocumentDiagnosticReport = diag.DocumentDiagnosticReport;
	export type DocumentDiagnosticReportPartialResult = diag.DocumentDiagnosticReportPartialResult;
	export const DocumentDiagnosticRequest: typeof diag.DocumentDiagnosticRequest = diag.DocumentDiagnosticRequest;

	export type PreviousResultId = diag.PreviousResultId;
	export type WorkspaceDiagnosticParams = diag.WorkspaceDiagnosticParams;
	export type WorkspaceFullDocumentDiagnosticReport = diag.WorkspaceFullDocumentDiagnosticReport;
	export type WorkspaceUnchangedDocumentDiagnosticReport = diag.WorkspaceUnchangedDocumentDiagnosticReport;
	export type WorkspaceDocumentDiagnosticReport = diag.WorkspaceDocumentDiagnosticReport;
	export type WorkspaceDiagnosticReport = diag.WorkspaceDiagnosticReport;
	export type WorkspaceDiagnosticReportPartialResult = diag.WorkspaceDiagnosticReportPartialResult;
	export const DiagnosticRefreshRequest: typeof diag.DiagnosticRefreshRequest = diag.DiagnosticRefreshRequest;
}

import * as inlay from './proposed.inlayHints';

export namespace Proposed {
	export type InlayHintCategory = inlay.InlayHintCategory;
	export const InlayHintCategory = inlay.InlayHintCategory;
	export type InlayHint = inlay.InlayHint;
	export type InlayHintsClientCapabilities = inlay.InlayHintsClientCapabilities;
	export type InlayHintsOptions = inlay.InlayHintsOptions;
	export type InlayHintsRegistrationOptions = inlay.InlayHintsRegistrationOptions;
	export type $InlayHintsClientCapabilities = inlay.$InlayHintsClientCapabilities;
	export type $InlayHintsServerCapabilities = inlay.$InlayHintsServerCapabilities;
	export type InlayHintsParams = inlay.InlayHintsParams;
	export const InlayHintsRequest: typeof inlay.InlayHintsRequest = inlay.InlayHintsRequest;
}