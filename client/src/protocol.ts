/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { RequestType, RequestType0, NotificationType, NotificationType0, ResponseError } from 'vscode-jsonrpc';

import {
	TextDocument, TextDocumentChangeEvent, TextDocumentContentChangeEvent, TextDocumentSaveReason,
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
	FormattingOptions, DocumentLink
} from 'vscode-languageserver-types';


export interface DocumentFilter {
	/**
	 * A language id, like `typescript`.
	 */
	language?: string;

	/**
	 * A Uri [scheme](#Uri.scheme), like `file` or `untitled`.
	 */
	scheme?: string;

	/**
	 * A glob pattern, like `*.{ts,js}`.
	 */
	pattern?: string;
}

/**
 * A language selector is the combination of one or many language identifiers
 * and [language filters](#DocumentFilter).
 *
 * @sample `let sel:DocumentSelector = 'typescript'`;
 * @sample `let sel:DocumentSelector = ['typescript', { language: 'json', pattern: '**∕tsconfig.json' }]`;
 */
export type DocumentSelector = string | DocumentFilter | (string | DocumentFilter)[];

/**
 * General paramters to to regsiter for an notification or to register a provider.
 */
export interface Registration {
	/**
	 * The id used to register the request. The id can be used to deregister
	 * the request again.
	 */
	id: string;

	/**
	 * The method to register for.
	 */
	method: string;

	/**
	 * Options necessary for the registration.
	 */
	registerOptions: DocumentOptions;
}

export interface RegistrationParams {
	registrations: Registration[];
}

/**
 * Register the given request or notification on the other side. Since requests can be sent from the client
 * to the server and vice versa this request can be sent into both directions.
 */
export namespace RegistrationRequest {
	export const type: RequestType<RegistrationParams, void, void, void> = { get method() { return 'client/registrationRequest'; }, _: undefined }
}

/**
 * General parameters to unregister a request or notification.
 */
export interface Unregistration {
	/**
	 * The id used to unregister the request or notification. Usually an id
	 * provided during the register request.
	 */
	id: string;

	/**
	 * The method to unregister for.
	 */
	method: string;
}

export interface UnregistrationParams {
	unregisterations: Unregistration[];
}

/**
 * Unregisters the given request on the other side.
 */
export namespace UnregistrationRequest {
	export const type: RequestType<UnregistrationParams, void, void, void> = { get method() { return 'client/unregistrationRequest'; }, _: undefined }
}

/**
 * A parameter literal used in requests to pass a text document and a position inside that
 * document.
 */
export interface TextDocumentPositionParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The position inside the text document.
	 */
	position: Position;
}

//---- Initialize Method ----

/**
 * Defines the capabilities provided by the client.
 */
export interface ClientCapabilities {
	dynamicRegistration?: boolean;
	willSaveTextDocument?: {
		waitUntil?: boolean;
	}
}

/**
 * Defines how the host (editor) should sync
 * document changes to the language server.
 */
export enum TextDocumentSyncKind {
	/**
	 * Documents should not be synced at all.
	 */
	None = 0,

	/**
	 * Documents are synced by always sending the full content
	 * of the document.
	 */
	Full = 1,

	/**
	 * Documents are synced by sending the full content on open.
	 * After that only incremental updates to the document are
	 * send.
	 */
	Incremental = 2
}

export interface DocumentOptions {
	/**
	 * An optional document selector to identify the scope of the registration. If not
	 * provided the registration happens for the scope determined by the other side.
	 */
	documentSelector?: DocumentSelector;
}

/**
 * Completion options.
 */
export interface CompletionOptions extends DocumentOptions {
	/**
	 * The characters that trigger completion automatically.
	 */
	triggerCharacters?: string[];

	/**
	 * The server provides support to resolve additional
	 * information for a completion item.
	 */
	resolveProvider?: boolean;
}

/**
 * Signature help options.
 */
export interface SignatureHelpOptions extends DocumentOptions {
	/**
	 * The characters that trigger signature help
	 * automatically.
	 */
	triggerCharacters?: string[];
}

/**
 * Code Lens options.
 */
export interface CodeLensOptions extends DocumentOptions {
	/**
	 * Code lens has a resolve provider as well.
	 */
	resolveProvider?: boolean;
}

/**
 * Format document on type options
 */
export interface DocumentOnTypeFormattingOptions extends DocumentOptions {
	/**
	 * A character on which formatting should be triggered, like `}`.
	 */
	firstTriggerCharacter: string;
	/**
	 * More trigger characters.
	 */
	moreTriggerCharacter?: string[]
}

/**
 * Document link options
 */
export interface DocumentLinkOptions extends DocumentOptions {
	/**
	 * Document links have a resolve provider as well.
	 */
	resolveProvider?: boolean;
}

/**
 * Defines the capabilities provided by a language
 * server.
 */
export interface ServerCapabilities {
	/**
	 * Defines how text documents are synced.
	 */
	textDocumentSync?: number;
	/**
	 * The server provides hover support.
	 */
	hoverProvider?: boolean;
	/**
	 * The server provides completion support.
	 */
	completionProvider?: CompletionOptions;
	/**
	 * The server provides signature help support.
	 */
	signatureHelpProvider?: SignatureHelpOptions;
	/**
	 * The server provides goto definition support.
	 */
	definitionProvider?: boolean;
	/**
	 * The server provides find references support.
	 */
	referencesProvider?: boolean;
	/**
	 * The server provides document highlight support.
	 */
	documentHighlightProvider?: boolean;
	/**
	 * The server provides document symbol support.
	 */
	documentSymbolProvider?: boolean;
	/**
	 * The server provides workspace symbol support.
	 */
	workspaceSymbolProvider?: boolean;
	/**
	 * The server provides code actions.
	 */
	codeActionProvider?: boolean;
	/**
	 * The server provides code lens.
	 */
	codeLensProvider?: CodeLensOptions;
	/**
	 * The server provides document formatting.
	 */
	documentFormattingProvider?: boolean;
	/**
	 * The server provides document range formatting.
	 */
	documentRangeFormattingProvider?: boolean;
	/**
	 * The server provides document formatting on typing.
	 */
	documentOnTypeFormattingProvider?: DocumentOnTypeFormattingOptions;
	/**
	 * The server provides rename support.
	 */
	renameProvider?: boolean;
	/**
	 * The server provides document link support.
	 */
	documentLinkProvider?: DocumentLinkOptions;
}

/**
 * The initialize request is sent from the client to the server.
 * It is sent once as the request after starting up the server.
 * The requests parameter is of type [InitializeParams](#InitializeParams)
 * the response if of type [InitializeResult](#InitializeResult) of a Thenable that
 * resolves to such.
 */
export namespace InitializeRequest {
	export const type: RequestType<InitializeParams, InitializeResult, InitializeError, void> = { get method() { return 'initialize'; }, _: undefined };
}

/**
 * The initialize parameters
 */
export interface InitializeParams {
	/**
	 * The process Id of the parent process that started
	 * the server.
	 */
	processId: number;

	/**
	 * The rootPath of the workspace. Is null
	 * if no folder is open.
	 */
	rootPath: string;

	/**
	 * The capabilities provided by the client (editor)
	 */
	capabilities: ClientCapabilities;

	/**
	 * User provided initialization options.
	 */
	initializationOptions?: any;

	/**
	 * The initial trace setting. If omitted trace is disabled ('off').
	 */
	trace?: 'off' | 'messages' | 'verbose';
}

/**
 * The result returned from an initilize request.
 */
export interface InitializeResult {
	/**
	 * The capabilities the language server provides.
	 */
	capabilities: ServerCapabilities;
}

/**
 * The data type of the ResponseError if the
 * initialize request fails.
 */
export interface InitializeError {
	/**
	 * Indicates whether the client should retry to send the
	 * initialize request after showing the message provided
	 * in the {@link ResponseError}
	 */
	retry: boolean;
}

export interface InitializedParams {
}

/**
 * The intialized notification is send from the client to the
 * server after the client is fully initialized and the server
 * is allowed to send requests from the server to the client.
 */
export namespace InitializedNotification {
	export const type: NotificationType<InitializedParams, void> = { get method() { return 'initialized'; }, _: undefined };
}

//---- Shutdown Method ----

/**
 * A shutdown request is sent from the client to the server.
 * It is sent once when the client descides to shutdown the
 * server. The only notification that is sent after a shudown request
 * is the exit event.
 */
export namespace ShutdownRequest {
	export const type: RequestType0<void, void, void> = { get method() { return 'shutdown'; }, _: undefined };
}

//---- Exit Notification ----

/**
 * The exit event is sent from the client to the server to
 * ask the server to exit its process.
 */
export namespace ExitNotification {
	export const type: NotificationType0<void> = { get method() { return 'exit'; }, _: undefined };
}

//---- Configuration notification ----

/**
 * The configuration change notification is sent from the client to the server
 * when the client's configuration has changed. The notification contains
 * the changed configuration as defined by the language client.
 */
export namespace DidChangeConfigurationNotification {
	export const type: NotificationType<DidChangeConfigurationParams, void> = { get method() { return 'workspace/didChangeConfiguration'; }, _: undefined };
}

/**
 * The parameters of a change configuration notification.
 */
export interface DidChangeConfigurationParams {
	/**
	 * The actual changed settings
	 */
	settings: any;
}

//---- Message show and log notifications ----

/**
 * The message type
 */
export enum MessageType {
	/**
	 * An error message.
	 */
	Error = 1,
	/**
	 * A warning message.
	 */
	Warning = 2,
	/**
	 * An information message.
	 */
	Info = 3,
	/**
	 * A log message.
	 */
	Log = 4
}

/**
 * The parameters of a notification message.
 */
export interface ShowMessageParams {
	/**
	 * The message type. See {@link MessageType}
	 */
	type: number;

	/**
	 * The actual message
	 */
	message: string;
}

/**
 * The show message notification is sent from a server to a client to ask
 * the client to display a particular message in the user interface.
 */
export namespace ShowMessageNotification {
	export const type: NotificationType<ShowMessageParams, void> = { get method() { return 'window/showMessage'; }, _: undefined };
}

export interface MessageActionItem {
	/**
	 * A short title like 'Retry', 'Open Log' etc.
	 */
	title: string;
}

export interface ShowMessageRequestParams {
	/**
	 * The message type. See {@link MessageType}
	 */
	type: number;

	/**
	 * The actual message
	 */
	message: string;

	/**
	 * The message action items to present.
	 */
	actions?: MessageActionItem[];
}

/**
 * The show message request is sent from the server to the clinet to show a message
 * and a set of options actions to the user.
 */
export namespace ShowMessageRequest {
	export const type: RequestType<ShowMessageRequestParams, MessageActionItem, void, void> = { get method() { return 'window/showMessageRequest'; }, _: undefined };
}

/**
 * The log message notification is sent from the server to the client to ask
 * the client to log a particular message.
 */
export namespace LogMessageNotification {
	export let type: NotificationType<LogMessageParams, void> = { get method() { return 'window/logMessage'; }, _: undefined };
}

/**
 * The log message parameters.
 */
export interface LogMessageParams {
	/**
	 * The message type. See {@link MessageType}
	 */
	type: number;

	/**
	 * The actual message
	 */
	message: string;
}

//---- Telemetry notification

/**
 * The telemetry event notification is sent from the server to the client to ask
 * the client to log telemetry data.
 */
export namespace TelemetryEventNotification {
	export let type: NotificationType<any, void> = { get method() { return 'telemetry/event'; }, _: undefined };
}

//---- Text document notifications ----

/**
 * The parameters send in a open text document notification
 */
export interface DidOpenTextDocumentParams {
	/**
	 * The document that was opened.
	 */
	textDocument: TextDocumentItem;
}

/**
 * The document open notification is sent from the client to the server to signal
 * newly opened text documents. The document's truth is now managed by the client
 * and the server must not try to read the document's truth using the document's
 * uri.
 */
export namespace DidOpenTextDocumentNotification {
	export const type: NotificationType<DidOpenTextDocumentParams, DocumentOptions> = { get method() { return 'textDocument/didOpen'; }, _: undefined };
}

/**
 * An event describing a change to a text document. If range and rangeLength are omitted
 * the new text is considered to be the full content of the document.
 */
export interface TextDocumentContentChangeEvent {
	/**
	 * The range of the document that changed.
	 */
	range?: Range;

	/**
	 * The length of the range that got replaced.
	 */
	rangeLength?: number;

	/**
	 * The new text of the document.
	 */
	text: string;
}

/**
 * The change text document notification's parameters.
 */
export interface DidChangeTextDocumentParams {
	/**
	 * The document that did change. The version number points
	 * to the version after all provided content changes have
	 * been applied.
	 */
	textDocument: VersionedTextDocumentIdentifier;

	/**
	 * The actual content changes.
	 */
	contentChanges: TextDocumentContentChangeEvent[];
}

/**
 * The document change notification is sent from the client to the server to signal
 * changes to a text document.
 */
export namespace DidChangeTextDocumentNotification {
	export const type: NotificationType<DidChangeTextDocumentParams, DocumentOptions> = { get method() { return 'textDocument/didChange'; }, _: undefined };
}

/**
 * The parameters send in a close text document notification
 */
export interface DidCloseTextDocumentParams {
	/**
	 * The document that was closed.
	 */
	textDocument: TextDocumentIdentifier;
}

/**
 * The document close notification is sent from the client to the server when
 * the document got closed in the client. The document's truth now exists
 * where the document's uri points to (e.g. if the document's uri is a file uri
 * the truth now exists on disk).
 */
export namespace DidCloseTextDocumentNotification {
	export const type: NotificationType<DidCloseTextDocumentParams, DocumentOptions> = { get method() { return 'textDocument/didClose'; }, _: undefined };
}

/**
 * The parameters send in a save text document notification
 */
export interface DidSaveTextDocumentParams {
	/**
	 * The document that was closed.
	 */
	textDocument: TextDocumentIdentifier;
}

/**
 * The document save notification is sent from the client to the server when
 * the document got saved in the client.
 */
export namespace DidSaveTextDocumentNotification {
	export const type: NotificationType<DidSaveTextDocumentParams, DocumentOptions> = { get method() { return 'textDocument/didSave'; }, _: undefined };
}

/**
 * The parameters send in a will save text document notification.
 */
export interface WillSaveTextDocumentParams {
	/**
	 * The document that will be saved.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The 'TextDocumentSaveReason'.
	 */
	reason: number;
}

/**
 * A document will save notification is sent from the client to the server before
 * the document is actually saved.
 */
export namespace WillSaveTextDocumentNotification {
	export const type: NotificationType<WillSaveTextDocumentParams, DocumentOptions> = { get method() { return 'textDocument/willSave'; }, _: undefined }
}

/**
 * A document will save request is sent from the client to the server before
 * the document is actually saved. The request can return an array of TextEdits
 * which will be applied to the text document before it is saved. Please note that
 * clients might drop results if computing the text edits took too long or if a
 * server constantly fails on this request. This is done to keep the save fast and
 * reliable.
 */
export namespace WillSaveTextDocumentWaitUntilRequest {
	export const type: RequestType<WillSaveTextDocumentParams, TextEdit[], void, DocumentOptions> = { get method() { return 'textDocument/willSaveWaitUntil'; }, _: undefined }
}

//---- File eventing ----

/**
 * The watched files notification is sent from the client to the server when
 * the client detects changes to file watched by the lanaguage client.
 */
export namespace DidChangeWatchedFilesNotification {
	export const type: NotificationType<DidChangeWatchedFilesParams, void> = { get method() { return 'workspace/didChangeWatchedFiles'; }, _: undefined };
}

/**
 * The watched files change notification's parameters.
 */
export interface DidChangeWatchedFilesParams {
	/**
	 * The actual file events.
	 */
	changes: FileEvent[];
}

/**
 * The file event type
 */
export enum FileChangeType {
	/**
	 * The file got created.
	 */
	Created = 1,
	/**
	 * The file got changed.
	 */
	Changed = 2,
	/**
	 * The file got deleted.
	 */
	Deleted = 3
}

/**
 * An event describing a file change.
 */
export interface FileEvent {
	/**
	 * The file's uri.
	 */
	uri: string;
	/**
	 * The change type.
	 */
	type: number;
}

//---- Diagnostic notification ----

/**
 * Diagnostics notification are sent from the server to the client to signal
 * results of validation runs.
 */
export namespace PublishDiagnosticsNotification {
	export const type: NotificationType<PublishDiagnosticsParams, void> = { get method() { return 'textDocument/publishDiagnostics'; }, _: undefined };
}

/**
 * The publish diagnostic notification's parameters.
 */
export interface PublishDiagnosticsParams {
	/**
	 * The URI for which diagnostic information is reported.
	 */
	uri: string;

	/**
	 * An array of diagnostic information items.
	 */
	diagnostics: Diagnostic[];
}

//---- Completion Support --------------------------

/**
 * Request to request completion at a given text document position. The request's
 * parameter is of type [TextDocumentPosition](#TextDocumentPosition) the response
 * is of type [CompletionItem[]](#CompletionItem) or [CompletionList](#CompletionList)
 * or a Thenable that resolves to such.
 */
export namespace CompletionRequest {
	export const type: RequestType<TextDocumentPositionParams, CompletionItem[] | CompletionList, void, CompletionOptions> = { get method() { return 'textDocument/completion'; }, _: undefined };
}

/**
 * Request to resolve additional information for a given completion item.The request's
 * parameter is of type [CompletionItem](#CompletionItem) the response
 * is of type [CompletionItem](#CompletionItem) or a Thenable that resolves to such.
 */
export namespace CompletionResolveRequest {
	export const type: RequestType<CompletionItem, CompletionItem, void, void> = { get method() { return 'completionItem/resolve'; }, _: undefined };
}

//---- Hover Support -------------------------------

export type MarkedString = string | { language: string; value: string };

/**
 * Request to request hover information at a given text document position. The request's
 * parameter is of type [TextDocumentPosition](#TextDocumentPosition) the response is of
 * type [Hover](#Hover) or a Thenable that resolves to such.
 */
export namespace HoverRequest {
	export const type: RequestType<TextDocumentPositionParams, Hover, void, DocumentOptions> = { get method() { return 'textDocument/hover'; }, _: undefined };
}

//---- SignatureHelp ----------------------------------

export namespace SignatureHelpRequest {
	export const type: RequestType<TextDocumentPositionParams, SignatureHelp, void, SignatureHelpOptions> = { get method() { return 'textDocument/signatureHelp'; }, _: undefined };
}

//---- Goto Definition -------------------------------------


/**
 * A request to resolve the defintion location of a symbol at a given text
 * document position. The request's parameter is of type [TextDocumentPosition]
 * (#TextDocumentPosition) the response is of type [Definition](#Definition) or a
 * Thenable that resolves to such.
 */
export namespace DefinitionRequest {
	export const type: RequestType<TextDocumentPositionParams, Definition, void, DocumentOptions> = { get method() { return 'textDocument/definition'; }, _: undefined };
}

//---- Reference Provider ----------------------------------

/**
 * Parameters for a [ReferencesRequest](#ReferencesRequest).
 */
export interface ReferenceParams extends TextDocumentPositionParams {
	context: ReferenceContext
}

/**
 * A request to resolve project-wide references for the symbol denoted
 * by the given text document position. The request's parameter is of
 * type [ReferenceParams](#ReferenceParams) the response is of type
 * [Location[]](#Location) or a Thenable that resolves to such.
 */
export namespace ReferencesRequest {
	export const type: RequestType<ReferenceParams, Location[], void, DocumentOptions> = { get method() { return 'textDocument/references'; }, _: undefined };
}

//---- Document Highlight ----------------------------------

/**
 * Request to resolve a [DocumentHighlight](#DocumentHighlight) for a given
 * text document position. The request's parameter is of type [TextDocumentPosition]
 * (#TextDocumentPosition) the request reponse is of type [DocumentHighlight[]]
 * (#DocumentHighlight) or a Thenable that resolves to such.
 */
export namespace DocumentHighlightRequest {
	export const type: RequestType<TextDocumentPositionParams, DocumentHighlight[], void, DocumentOptions> = { get method() { return 'textDocument/documentHighlight'; }, _: undefined };
}

//---- Document Symbol Provider ---------------------------

/**
 * Parameters for a [DocumentSymbolRequest](#DocumentSymbolRequest).
 */
export interface DocumentSymbolParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;
}

/**
 * A request to list all symbols found in a given text document. The request's
 * parameter is of type [TextDocumentIdentifier](#TextDocumentIdentifier) the
 * response is of type [SymbolInformation[]](#SymbolInformation) or a Thenable
 * that resolves to such.
 */
export namespace DocumentSymbolRequest {
	export const type: RequestType<DocumentSymbolParams, SymbolInformation[], void, DocumentOptions> = { get method() { return 'textDocument/documentSymbol'; }, _: undefined };
}

//---- Workspace Symbol Provider ---------------------------

/**
 * The parameters of a [WorkspaceSymbolRequest](#WorkspaceSymbolRequest).
 */
export interface WorkspaceSymbolParams {
	/**
	 * A non-empty query string
	 */
	query: string;
}

/**
 * A request to list project-wide symbols matching the query string given
 * by the [WorkspaceSymbolParams](#WorkspaceSymbolParams). The response is
 * of type [SymbolInformation[]](#SymbolInformation) or a Thenable that
 * resolves to such.
 */
export namespace WorkspaceSymbolRequest {
	export const type: RequestType<WorkspaceSymbolParams, SymbolInformation[], void, void> = { get method() { return 'workspace/symbol'; }, _: undefined };
}

//---- Code Action Provider ----------------------------------



/**
 * Params for the CodeActionRequest
 */
export interface CodeActionParams {
	/**
	 * The document in which the command was invoked.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The range for which the command was invoked.
	 */
	range: Range;

	/**
	 * Context carrying additional information.
	 */
	context: CodeActionContext;
}

/**
 * A request to provide commands for the given text document and range.
 */
export namespace CodeActionRequest {
	export const type: RequestType<CodeActionParams, Command[], void, DocumentOptions> = { get method() { return 'textDocument/codeAction'; }, _: undefined };
}

//---- Code Lens Provider -------------------------------------------

/**
 * Params for the Code Lens request.
 */
export interface CodeLensParams {
	/**
	 * The document to request code lens for.
	 */
	textDocument: TextDocumentIdentifier;
}

/**
 * A request to provide code lens for the given text document.
 */
export namespace CodeLensRequest {
	export const type: RequestType<CodeLensParams, CodeLens[], void, CodeLensOptions> = { get method() { return 'textDocument/codeLens'; }, _: undefined };
}

/**
 * A request to resolve a command for a given code lens.
 */
export namespace CodeLensResolveRequest {
	export const type: RequestType<CodeLens, CodeLens, void, void> = { get method() { return 'codeLens/resolve'; }, _: undefined };
}

//---- Formatting ----------------------------------------------

export interface DocumentFormattingParams {
	/**
	 * The document to format.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The format options
	 */
	options: FormattingOptions;
}

/**
 * A request to to format a whole document.
 */
export namespace DocumentFormattingRequest {
	export const type: RequestType<DocumentFormattingParams, TextEdit[], void, DocumentOptions> = { get method() { return 'textDocument/formatting'; }, _: undefined };
}

export interface DocumentRangeFormattingParams {
	/**
	 * The document to format.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The range to format
	 */
	range: Range;

	/**
	 * The format options
	 */
	options: FormattingOptions;
}

/**
 * A request to to format a range in a document.
 */
export namespace DocumentRangeFormattingRequest {
	export const type: RequestType<DocumentRangeFormattingParams, TextEdit[], void, DocumentOptions> = { get method() { return 'textDocument/rangeFormatting'; }, _: undefined };
}

export interface DocumentOnTypeFormattingParams {
	/**
	 * The document to format.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The position at which this request was send.
	 */
	position: Position;

	/**
	 * The character that has been typed.
	 */
	ch: string;

	/**
	 * The format options.
	 */
	options: FormattingOptions;
}

/**
 * A request to format a document on type.
 */
export namespace DocumentOnTypeFormattingRequest {
	export const type: RequestType<DocumentOnTypeFormattingParams, TextEdit[], void, DocumentOnTypeFormattingOptions> = { get method() { return 'textDocument/onTypeFormatting'; }, _: undefined };
}

//---- Rename ----------------------------------------------

export interface RenameParams {
	/**
	 * The document to format.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The position at which this request was send.
	 */
	position: Position;

	/**
	 * The new name of the symbol. If the given name is not valid the
	 * request must return a [ResponseError](#ResponseError) with an
	 * appropriate message set.
	 */
	newName: string;
}

/**
 * A request to rename a symbol.
 */
export namespace RenameRequest {
	export const type: RequestType<RenameParams, WorkspaceEdit, void, DocumentOptions> = { get method() { return 'textDocument/rename'; }, _: undefined };
}

//---- Document Links ----------------------------------------------

export interface DocumentLinkParams {
	/**
	 * The document to provide document links for.
	 */
	textDocument: TextDocumentIdentifier;
}

/**
 * A request to provide document links
 */
export namespace DocumentLinkRequest {
	export const type: RequestType<DocumentLinkParams, DocumentLink[], void, DocumentLinkOptions> = { get method() { return 'textDocument/documentLink'; }, _: undefined };
}

/**
 * Request to resolve additional information for a given document link. The request's
 * parameter is of type [DocumentLink](#DocumentLink) the response
 * is of type [DocumentLink](#DocumentLink) or a Thenable that resolves to such.
 */
export namespace DocumentLinkResolveRequest {
	export const type: RequestType<DocumentLink, DocumentLink, void, void> = { get method() { return 'documentLink/resolve'; }, _: undefined };
}