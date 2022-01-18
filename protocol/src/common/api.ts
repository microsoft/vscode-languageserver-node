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
	 * A request failed but it was syntactically correct, e.g the
	 * method name was known and the parameters were valid. The error
	 * message should contain human readable information about why
	 * the request failed.
	 *
	 * @since 3.17.0
	 */
	export const RequestFailed: integer = -32803;

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
import * as typeh from './proposed.typeHierarchy';
import * as iv from './proposed.inlineValue';
import * as nb from './proposed.notebooks';

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
	export const WorkspaceDiagnosticRequest: typeof diag.WorkspaceDiagnosticRequest = diag.WorkspaceDiagnosticRequest;
	export const DiagnosticRefreshRequest: typeof diag.DiagnosticRefreshRequest = diag.DiagnosticRefreshRequest;

	// type hierarchy
	export type TypeHierarchyClientCapabilities = typeh.TypeHierarchyClientCapabilities;
	export type TypeHierarchyOptions = typeh.TypeHierarchyOptions;
	export type TypeHierarchyRegistrationOptions = typeh.TypeHierarchyRegistrationOptions;
	export type TypeHierarchyPrepareParams = typeh.TypeHierarchyPrepareParams;
	export type TypeHierarchySupertypesParams = typeh.TypeHierarchySupertypesParams;
	export type TypeHierarchySubtypesParams = typeh.TypeHierarchySubtypesParams;

	export const TypeHierarchyPrepareRequest: typeof typeh.TypeHierarchyPrepareRequest = typeh.TypeHierarchyPrepareRequest;
	export const TypeHierarchySupertypesRequest: typeof typeh.TypeHierarchySupertypesRequest = typeh.TypeHierarchySupertypesRequest;
	export const TypeHierarchySubtypesRequest: typeof typeh.TypeHierarchySubtypesRequest = typeh.TypeHierarchySubtypesRequest;

	// Inline value
	export type InlineValuesClientCapabilities = iv.InlineValuesClientCapabilities;
	export type InlineValuesOptions = iv.InlineValuesOptions;
	export type InlineValuesRegistrationOptions = iv.InlineValuesRegistrationOptions;
	export type InlineValuesParams = iv.InlineValuesParams;

	export const InlineValuesRequest: typeof iv.InlineValuesRequest = iv.InlineValuesRequest;
	export const InlineValuesRefreshRequest: typeof iv.InlineValuesRefreshRequest = iv.InlineValuesRefreshRequest;

	// Notebooks
	export type $NotebookDocumentClientCapabilities = nb.$NotebookDocumentClientCapabilities;
	export type NotebookDocumentSyncClientCapabilities = nb.NotebookDocumentSyncClientCapabilities;
	export type $NotebookDocumentServerCapabilities = nb.$NotebookDocumentServerCapabilities;
	export type NotebookCellKind = nb.NotebookCellKind;
	export const NotebookCellKind = nb.NotebookCellKind;
	export type NotebookCell = nb.NotebookCell;
	export const NotebookCell = nb.NotebookCell;
	export type NotebookCellChange = nb.NotebookCellChange;
	export type NotebookDocument = nb.NotebookDocument;
	export const NotebookDocument = nb.NotebookDocument;
	export type NotebookDocumentChangeEvent = nb.NotebookDocumentChangeEvent;
	export type NotebookDocumentIdentifier = nb.NotebookDocumentIdentifier;
	export type VersionedNotebookDocumentIdentifier = nb.VersionedNotebookDocumentIdentifier;
	export type NotebookDocumentOptions = nb.NotebookDocumentOptions;
	export type NotebookDocumentRegistrationOptions = nb.NotebookDocumentRegistrationOptions;
	export const NotebookDocumentSyncRegistrationType = nb.NotebookDocumentSyncRegistrationType;
	export type DidOpenNotebookDocumentParams = nb.DidOpenNotebookDocumentParams;
	export const DidOpenNotebookDocumentNotification = nb.DidOpenNotebookDocumentNotification;
	export type DidChangeNotebookDocumentParams = nb.DidChangeNotebookDocumentParams;
	export const DidChangeNotebookDocumentNotification = nb.DidChangeNotebookDocumentNotification;
	export type DidSaveNotebookDocumentParams = nb.DidSaveNotebookDocumentParams;
	export const DidSaveNotebookDocumentNotification = nb.DidSaveNotebookDocumentNotification;
	export type DidCloseNotebookDocumentParams = nb.DidCloseNotebookDocumentParams;
	export const DidCloseNotebookDocumentNotification = nb.DidCloseNotebookDocumentNotification;
}