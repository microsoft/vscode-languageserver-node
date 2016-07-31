/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { RequestType, NotificationType, ResponseError } from 'vscode-jsonrpc';

import {
		TextDocument, TextDocumentChangeEvent, TextDocumentContentChangeEvent,
		Range, Position, Location, Diagnostic, DiagnosticSeverity, Command,
		TextEdit, WorkspaceEdit, WorkspaceChange, TextEditChange,
		TextDocumentIdentifier, VersionedTextDocumentIdentifier, TextDocumentItem,
		CompletionItemKind, CompletionItem, CompletionList,
		Hover, MarkedString,
		SignatureHelp, SignatureInformation, ParameterInformation,
		Definition, ReferenceContext,
		DocumentHighlight, DocumentHighlightKind,
		SymbolInformation, SymbolKind,
		CodeLens, CodeActionContext,
		FormattingOptions, Methods,
		ClientCapabilities, CodeActionParams, CodeLensOptions,
		CodeLensParams, CompletionOptions, DidChangeConfigurationParams,
		DidChangeTextDocumentParams, DidChangeWatchedFilesParams, DidCloseTextDocumentParams,
		DidOpenTextDocumentParams, DidSaveTextDocumentParams, DocumentFormattingParams,
		DocumentOnTypeFormattingOptions, DocumentOnTypeFormattingParams, DocumentRangeFormattingParams,
		DocumentSymbolParams, FileChangeType, FileEvent,
		InitializeError, InitializeParams, InitializeResult,
		LogMessageParams, MessageActionItem, MessageType,
		ReferenceParams, RenameParams, PublishDiagnosticsParams,
		ServerCapabilities, ShowMessageParams, ShowMessageRequestParams,
		SignatureHelpOptions, TextDocumentPositionParams, TextDocumentSyncKind,
		WorkspaceSymbolParams
} from 'vscode-languageserver-types';

export {
		ClientCapabilities, CodeActionParams, CodeLensOptions,
		CodeLensParams, CompletionOptions, DidChangeConfigurationParams,
		DidChangeTextDocumentParams, DidChangeWatchedFilesParams, DidCloseTextDocumentParams,
		DidOpenTextDocumentParams, DidSaveTextDocumentParams, DocumentFormattingParams,
		DocumentOnTypeFormattingOptions, DocumentOnTypeFormattingParams, DocumentRangeFormattingParams,
		DocumentSymbolParams, FileChangeType, FileEvent,
		InitializeError, InitializeParams, InitializeResult,
		LogMessageParams, MessageActionItem, MessageType,
		ReferenceParams, RenameParams, PublishDiagnosticsParams,
		ServerCapabilities, ShowMessageParams, ShowMessageRequestParams,
		SignatureHelpOptions, TextDocumentPositionParams, TextDocumentSyncKind,
		WorkspaceSymbolParams, TextDocumentContentChangeEvent
} from 'vscode-languageserver-types';

//---- Initialize Method ----
/**
 * The initialize method is sent from the client to the server.
 * It is send once as the first method after starting up the
 * worker. The requests parameter is of type [InitializeParams](#InitializeParams)
 * the response if of type [InitializeResult](#InitializeResult) of a Thenable that
 * resolves to such.
 */
export namespace InitializeRequest {
	export const type: RequestType<InitializeParams, InitializeResult, InitializeError> = { get method() { return Methods.ShutdownRequest; } };
}

//---- Shutdown Method ----

/**
 * A shutdown request is sent from the client to the server.
 * It is send once when the client descides to shutdown the
 * server. The only notification that is sent after a shudown request
 * is the exit event.
 */
export namespace ShutdownRequest {
	export const type: RequestType<void, void, void> = { get method() { return Methods.ShutdownRequest; } };
}

//---- Exit Notification ----

/**
 * The exit event is sent from the client to the server to
 * ask the server to exit its process.
 */
export namespace ExitNotification {
	export const type: NotificationType<void> = { get method() { return Methods.ExitNotification; } };
}

//---- Configuration notification ----

/**
 * The configuration change notification is sent from the client to the server
 * when the client's configuration has changed. The notification contains
 * the changed configuration as defined by the language client.
 */
export namespace DidChangeConfigurationNotification {
	export const type: NotificationType<DidChangeConfigurationParams> = { get method() { return Methods.DidChangeConfigurationNotification; } };
}

/**
 * The show message notification is sent from a server to a client to ask
 * the client to display a particular message in the user interface.
 */
export namespace ShowMessageNotification {
	export const type: NotificationType<ShowMessageParams> = { get method() { return Methods.ShowMessageNotification; } };
}

/**
 * The show message request is send from the server to the clinet to show a message
 * and a set of options actions to the user.
 */
export namespace ShowMessageRequest {
	export const type: RequestType<ShowMessageRequestParams, MessageActionItem, void> = { get method() { return Methods.ShowMessageRequest; } };
}

/**
 * The log message notification is send from the server to the client to ask
 * the client to log a particular message.
 */
export namespace LogMessageNotification {
	export let type: NotificationType<LogMessageParams> = { get method() { return Methods.LogMessageNotification; } };
}

//---- Telemetry notification

/**
 * The telemetry event notification is send from the server to the client to ask
 * the client to log telemetry data.
 */
export namespace TelemetryEventNotification {
	export let type: NotificationType<any> = { get method() { return Methods.TelemetryEventNotification; } };
}

/**
 * The document open notification is sent from the client to the server to signal
 * newly opened text documents. The document's truth is now managed by the client
 * and the server must not try to read the document's truth using the document's
 * uri.
 */
export namespace DidOpenTextDocumentNotification {
	export const type: NotificationType<DidOpenTextDocumentParams> = { get method() { return Methods.DidOpenTextDocumentNotification; } };
}

/**
 * The document change notification is sent from the client to the server to signal
 * changes to a text document.
 */
export namespace DidChangeTextDocumentNotification {
	export const type: NotificationType<DidChangeTextDocumentParams> = { get method() { return Methods.DidChangeTextDocumentNotification; } };
}

/**
 * The document close notification is sent from the client to the server when
 * the document got closed in the client. The document's truth now exists
 * where the document's uri points to (e.g. if the document's uri is a file uri
 * the truth now exists on disk).
 */
export namespace DidCloseTextDocumentNotification {
	export const type: NotificationType<DidCloseTextDocumentParams> = { get method() { return Methods.DidCloseTextDocumentNotification; } };
}

/**
 * The document save notification is sent from the client to the server when
 * the document got saved in the client.
 */
export namespace DidSaveTextDocumentNotification {
	export const type: NotificationType<DidSaveTextDocumentParams> = { get method() { return Methods.DidSaveTextDocumentNotification; } };
}

//---- File eventing ----

/**
 * The watched files notification is sent from the client to the server when
 * the client detects changes to file watched by the lanaguage client.
 */
export namespace DidChangeWatchedFilesNotification {
	export const type: NotificationType<DidChangeWatchedFilesParams> = { get method() { return Methods.DidChangeWatchedFilesNotification; } };
}

//---- Diagnostic notification ----

/**
 * Diagnostics notification are sent from the server to the client to signal
 * results of validation runs.
 */
export namespace PublishDiagnosticsNotification {
	export const type: NotificationType<PublishDiagnosticsParams> = { get method() { return Methods.PublishDiagnosticsNotification; } };
}

//---- Completion Support --------------------------

/**
 * Request to request completion at a given text document position. The request's
 * parameter is of type [TextDocumentPosition](#TextDocumentPosition) the response
 * is of type [CompletionItem[]](#CompletionItem) or [CompletionList](#CompletionList)
 * or a Thenable that resolves to such.
 */
export namespace CompletionRequest {
	export const type: RequestType<TextDocumentPositionParams, CompletionItem[] | CompletionList, void> = { get method() { return Methods.CompletionRequest; } };
}

/**
 * Request to resolve additional information for a given completion item.The request's
 * parameter is of type [CompletionItem](#CompletionItem) the response
 * is of type [CompletionItem](#CompletionItem) or a Thenable that resolves to such.
 */
export namespace CompletionResolveRequest {
	export const type: RequestType<CompletionItem, CompletionItem, void> = { get method() { return Methods.CompletionResolveRequest; } };
}

//---- Hover Support -------------------------------

/**
 * Request to request hover information at a given text document position. The request's
 * parameter is of type [TextDocumentPosition](#TextDocumentPosition) the response is of
 * type [Hover](#Hover) or a Thenable that resolves to such.
 */
export namespace HoverRequest {
	export const type: RequestType<TextDocumentPositionParams, Hover, void> = { get method() { return Methods.HoverRequest; } };
}

//---- SignatureHelp ----------------------------------

export namespace SignatureHelpRequest {
	export const type: RequestType<TextDocumentPositionParams, SignatureHelp, void> = { get method() { return Methods.SignatureHelpRequest; } };
}

//---- Goto Definition -------------------------------------

/**
 * A request to resolve the defintion location of a symbol at a given text
 * document position. The request's parameter is of type [TextDocumentPosition]
 * (#TextDocumentPosition) the response is of type [Definition](#Definition) or a
 * Thenable that resolves to such.
 */
export namespace DefinitionRequest {
	export const type: RequestType<TextDocumentPositionParams, Definition, void> = { get method() { return Methods.DefinitionRequest; } };
}

//---- Reference Provider ----------------------------------

/**
 * A request to resolve project-wide references for the symbol denoted
 * by the given text document position. The request's parameter is of
 * type [ReferenceParams](#ReferenceParams) the response is of type
 * [Location[]](#Location) or a Thenable that resolves to such.
 */
export namespace ReferencesRequest {
	export const type: RequestType<ReferenceParams, Location[], void> = { get method() { return Methods.ReferencesRequest; } };
}

//---- Document Highlight ----------------------------------

/**
 * Request to resolve a [DocumentHighlight](#DocumentHighlight) for a given
 * text document position. The request's parameter is of type [TextDocumentPosition]
 * (#TextDocumentPosition) the request reponse is of type [DocumentHighlight[]]
 * (#DocumentHighlight) or a Thenable that resolves to such.
 */
export namespace DocumentHighlightRequest {
	export const type: RequestType<TextDocumentPositionParams, DocumentHighlight[], void> = { get method() { return Methods.DocumentHighlightRequest; } };
}

//---- Document Symbol Provider ---------------------------

/**
 * A request to list all symbols found in a given text document. The request's
 * parameter is of type [TextDocumentIdentifier](#TextDocumentIdentifier) the
 * response is of type [SymbolInformation[]](#SymbolInformation) or a Thenable
 * that resolves to such.
 */
export namespace DocumentSymbolRequest {
	export const type: RequestType<DocumentSymbolParams, SymbolInformation[], void> = { get method() { return Methods.DocumentSymbolRequest; } };
}

//---- Workspace Symbol Provider ---------------------------

/**
 * A request to list project-wide symbols matching the query string given
 * by the [WorkspaceSymbolParams](#WorkspaceSymbolParams). The response is
 * of type [SymbolInformation[]](#SymbolInformation) or a Thenable that
 * resolves to such.
 */
export namespace WorkspaceSymbolRequest {
	export const type: RequestType<WorkspaceSymbolParams, SymbolInformation[], void> = { get method() { return Methods.WorkspaceSymbolRequest; } };
}

//---- Code Action Provider ----------------------------------

/**
 * A request to provide commands for the given text document and range.
 */
export namespace CodeActionRequest {
	export const type: RequestType<CodeActionParams, Command[], void> = { get method() { return Methods.CodeActionRequest; } };
}

//---- Code Lens Provider -------------------------------------------

/**
 * A request to provide code lens for the given text document.
 */
export namespace CodeLensRequest {
	export const type: RequestType<CodeLensParams, CodeLens[], void> = { get method() { return Methods.CodeLensRequest; } };
}

/**
 * A request to resolve a command for a given code lens.
 */
export namespace CodeLensResolveRequest {
	export const type: RequestType<CodeLens, CodeLens, void> = { get method() { return Methods.CodeLensResolveRequest; } };
}

//---- Formatting ----------------------------------------------

/**
 * A request to to format a whole document.
 */
export namespace DocumentFormattingRequest {
	export const type: RequestType<DocumentFormattingParams, TextEdit[], void> = { get method() { return Methods.DocumentFormattingRequest; } };
}

/**
 * A request to to format a range in a document.
 */
export namespace DocumentRangeFormattingRequest {
	export const type: RequestType<DocumentRangeFormattingParams, TextEdit[], void> = { get method() { return Methods.DocumentRangeFormattingRequest; } };
}

/**
 * A request to format a document on type.
 */
export namespace DocumentOnTypeFormattingRequest {
	export const type: RequestType<DocumentOnTypeFormattingParams, TextEdit[], void> = { get method() { return Methods.DocumentOnTypeFormattingRequest; } };
}

//---- Rename ----------------------------------------------

/**
 * A request to rename a symbol.
 */
export namespace RenameRequest {
	export const type: RequestType<RenameParams, WorkspaceEdit, void> = { get method() { return Methods.RenameRequest; } };
}