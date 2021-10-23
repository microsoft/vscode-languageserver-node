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
import * as fs from './proposed.fileSystemProvider';

export namespace Proposed {
	// ------------------------------ Diagnostics ------------------------------
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

	// ------------------------------ Type Hierarchy ------------------------------
	export type TypeHierarchyClientCapabilities = typeh.TypeHierarchyClientCapabilities;
	export type TypeHierarchyOptions = typeh.TypeHierarchyOptions;
	export type TypeHierarchyRegistrationOptions = typeh.TypeHierarchyRegistrationOptions;
	export type TypeHierarchyPrepareParams = typeh.TypeHierarchyPrepareParams;
	export type TypeHierarchySupertypesParams = typeh.TypeHierarchySupertypesParams;
	export type TypeHierarchySubtypesParams = typeh.TypeHierarchySubtypesParams;

	export const TypeHierarchyPrepareRequest: typeof typeh.TypeHierarchyPrepareRequest = typeh.TypeHierarchyPrepareRequest;
	export const TypeHierarchySupertypesRequest: typeof typeh.TypeHierarchySupertypesRequest = typeh.TypeHierarchySupertypesRequest;
	export const TypeHierarchySubtypesRequest: typeof typeh.TypeHierarchySubtypesRequest = typeh.TypeHierarchySubtypesRequest;

	// ------------------------------ FileSystem ------------------------------

	// -> Basic Structures
	export type FileType = fs.FileType;
	export type FileSystemErrorType = fs.FileSystemErrorType;

	// -> Client & Server Capabilities
	export type FileSystemProviderClientCapabilities = fs.FileSystemProviderClientCapabilities;
	export type $FileSystemProviderClientCapabilities = fs.$FileSystemProviderClientCapabilities;
	export type FileSystemProviderOptions  = fs.FileSystemProviderOptions;
	export type FileSystemProviderRegistrationOptions  = fs.FileSystemProviderRegistrationOptions;
	export type $FileSystemProviderServerCapabilities  = fs.$FileSystemProviderServerCapabilities;

	// -> Requests & Notifications
	export type DidChangeFileParams = fs.DidChangeFileParams;
	export type FileChangeEvent = fs.FileChangeEvent;
	export type FileChangeType = fs.FileChangeType;

	export type WatchParams = fs.WatchParams;
	export type WatchFileOptions = fs.WatchFileOptions;

	export type StopWatchingParams = fs.StopWatchingParams;

	export type FileStatParams = fs.FileStatParams;
	export type FileStatResponse = fs.FileStatResponse;

	export type ReadDirectoryParams = fs.ReadDirectoryParams;
	export type ReadDirectoryResponse = fs.ReadDirectoryResponse;
	export type DirectoryChild = fs.DirectoryChild;

	export type CreateDirectoryParams = fs.CreateDirectoryParams;

	export type ReadFileParams = fs.ReadFileParams;
	export type ReadFileResponse = fs.ReadFileResponse;

	export type WriteFileParams = fs.WriteFileParams;
	export type WriteFileOptions = fs.WriteFileOptions;

	export type DeleteFileParams = fs.DeleteFileParams;
	export type DeleteFileOptions = fs.DeleteFileOptions;

	export type RenameFileParams = fs.RenameFileParams;
	export type RenameFileOptions = fs.RenameFileOptions;
}