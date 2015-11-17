/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { RequestType, NotificationType, ResponseError } from 'vscode-jsonrpc';

import * as is from './utils/is';

/**
 * Defines the capabilities provided by the client.
 */
export interface ClientCapabilities {
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

/**
 * Completion options
 */
export interface CompletionOptions {
	/**
	 * The server provides support to resolve additional
	 * information for a completion item.
	 */
	resolveProvider?: boolean;

	/**
	 * The characters that trigger completion automatically.
	 */
	triggerCharacters?: string[];
}

/**
 * Signature help options
 */
export interface SignatureHelpOptions {
	/**
	 * The characters that trigger signature help
	 * automatically.
	 */
	triggerCharacters?: string[];
}

/**
 * Defines the capabilities provided by the language
 * server
 */
export interface ServerCapabilities {
	/** Defines how text documents are synced. */
	textDocumentSync?: number;
	/** The server provides hover support. */
	hoverProvider?: boolean;
	/** The server provides completion support. */
	completionProvider?: CompletionOptions;
	/** The server provides signature help support. */
	signatureHelpProvider?: SignatureHelpOptions;
	/** The server provides goto definition support. */
	definitionProvider?: boolean;
	/** The server provides find references support. */
	referencesProvider?: boolean;
	/** The server provides document highlight support. */
	documentHighlightProvider?: boolean;
	/** The server provides document symbol support. */
	documentSymbolProvider?: boolean;
	/** The server provides workspace symbol support. */
	workspaceSymbolProvider?: boolean;
}

//---- Initialize Method ----

/**
 * The initialize method is sent from the client to the server.
 * It is send once as the first method after starting up the
 * worker. The requests parameter is of type [InitializeParams](#InitializeParams)
 * the response if of type [InitializeResult](#InitializeResult) of a Thenable that
 * resolves to such.
 */
export namespace InitializeRequest {
	export const type: RequestType<InitializeParams, InitializeResult, InitializeError> = { get method() { return 'initialize'; } };
}

/**
 * The initialize parameters
 */
export interface InitializeParams {
	/**
	 * The rootPath of the workspace. Is null
	 * if no folder is open.
	 */
	rootPath: string;

	/**
	 * The capabilities provided by the client (editor)
	 */
	capabilities: ClientCapabilities;
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
 * The error returned if the initilize request fails.
 */
export interface InitializeError {
	/**
	 * Indicates whether the client should retry to send the
	 * initilize request after showing the message provided
	 * in the {@link ResponseError}
	 */
	retry: boolean;
}

//---- Shutdown Method ----

/**
 * A shutdown request is sent from the client to the server.
 * It is send once when the client descides to shutdown the
 * server. The only notification that is sent after a shudown request
 * is the exit event.
 */
export namespace ShutdownRequest {
	export const type: RequestType<void, void, void> = { get method() { return 'shutdown'; } };
}

//---- Exit Notification ----

/**
 * The exit event is sent from the client to the server to
 * ask the server to exit its process.
 */
export namespace ExitNotification {
	export const type: NotificationType<void> = { get method() { return 'exit'; } };
}

//---- Configuration notification ----

/**
 * The configuration change notification is sent from the client to the server
 * when the client's configuration has changed. The notification contains
 * the changed configuration as defined by the language client.
 */
export namespace DidChangeConfigurationNotification {
	export const type: NotificationType<DidChangeConfigurationParams> = { get method() { return 'workspace/didChangeConfiguration'; } };
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
	/** An error message. */
	Error = 1,
	/** A warning message. */
	Warning = 2,
	/** An information message. */
	Info = 3,
	/** A log message. */
	Log = 4
}

/**
 * The show message notification is sent from a server to a client to ask
 * the client to display a particular message in the user interface.
 */
export namespace ShowMessageNotification {
	export const type: NotificationType<ShowMessageParams> = { get method() { return 'window/showMessage'; } };
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
 * The log message notification is send from the server to the client to ask
 * the client to log a particular message.
 */
export namespace LogMessageNotification {
	export let type: NotificationType<LogMessageParams> = { get method() { return  'window/logMessage'; } };
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

//---- text document notifications ----

/**
 * Position in a text document expressed as zero-based line and character offset.
 */
export interface Position {
	/**
	 * Line position in a document (zero-based).
	 */
	line: number;

	/**
	 * Character offset on a line in a document (zero-based).
	 */
	character: number;
}

/**
 * A range in a text document expressed as (zero-based) start and end positions.
 */
export interface Range {
	/**
	 * The range's start position
	 */
	start: Position;

	/**
	 * The range's end position
	 */
	end: Position;
}

/**
 * Represents a location inside a resource, such as a line
 * inside a text file.
 */
export class Location {
	uri: string;
	range: Range;
}

/**
 * A literal to identify a text document in the client.
 */
export interface TextDocumentIdentifier {
	/**
	 * The text document's uri.
	 */
	uri: string;
}

/**
 * A literal to define the position in a text document.
 */
export interface TextDocumentPosition extends TextDocumentIdentifier {
	/**
	 * The position inside the text document.
	 */
	position: Position;
}

/**
 * The document open notification is sent from the client to the server to signal
 * newly opened text documents. The document's truth is now managed by the client
 * and the server must not try to read the document's truth using the document's
 * uri.
 */
export namespace DidOpenTextDocumentNotification {
	export const type: NotificationType<DidOpenTextDocumentParams> = { get method() { return 'textDocument/didOpen'; } };
}

/**
 * The parameters send in a open text document notification
 */
export interface DidOpenTextDocumentParams extends TextDocumentIdentifier {
	/**
	 * The content of the opened  text document.
	 */
	text: string;
}

/**
 * The document change notification is sent from the client to the server to signal
 * changes to a text document. The notification's parameters are either a single
 * {@link DidChangeTextDocumentParams} or an array of {@link DidChangeTextDocumentParams}.
 */
export namespace DidChangeTextDocumentNotification {
	export const type: NotificationType<DidChangeTextDocumentParams> = { get method() { return 'textDocument/didChange'; } };
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
export interface DidChangeTextDocumentParams extends TextDocumentIdentifier {
	contentChanges: TextDocumentContentChangeEvent[];
}

/**
 * The document close notification is sent from the client to the server when
 * the document got closed in the client. The document's truth now exists
 * where the document's uri points to (e.g. if the document's uri is a file uri
 * the truth now exists on disk).
 */
export namespace DidCloseTextDocumentNotification {
	export const type: NotificationType<TextDocumentIdentifier> = { get method() { return 'textDocument/didClose'; } };
}

//---- File eventing ----

/**
 * The watched files notification is sent from the client to the server when
 * the client detects changes to file watched by the lanaguage client.
 */
export namespace DidChangeWatchedFilesNotification {
	export const type: NotificationType<DidChangeWatchedFilesParams> = { get method() { return 'workspace/didChangeWatchedFiles'; } };
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
	/** The file got created. */
	Created = 1,
	/** The file got changed. */
	Changed = 2,
	/** The file got deleted. */
	Deleted = 3
}

/**
 * An event describing a file change.
 */
export interface FileEvent {
	/** The file's uri. */
	uri: string;
	/** teh change type. */
	type: number;
}

//---- Diagnostic notification ----

/**
 * Diagnostics notification are sent from the server to the client to signal
 * results of validation runs.
 */
export namespace PublishDiagnosticsNotification {
	export const type: NotificationType<PublishDiagnosticsParams> = { method: 'textDocument/publishDiagnostics' };
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

/**
 * The diagnostic's serverity.
 */
export enum DiagnosticSeverity {
	/** Reports an error. */
	Error = 1,
	/** Reports a warning. */
	Warning = 2,
	/** Reports an information. */
	Information = 3,
	/** Reports a hint. */
	Hint = 4
}

/**
 * A diagnostic item found in a diagnostic notification.
 */
export interface Diagnostic {
	/**
	 * The range at which the message applies
	 */
	range: Range;

	/**
	 * The diagnostic's severity. Can be omitted. If omitted it is up to the
	 * client to interpret diagnostics as error, warning, info or hint.
	 */
	severity?: number;

	/**
	 * The diagnostic's code. Can be omitted.
	 */
	code?: number | string;

	/**
	 * The diagnostic message.
	 */
	message: string;
}

//---- Completion Support --------------------------

/**
 * The kind of a completion entry.
 */
export enum CompletionItemKind {
	Text = 1,
	Method = 2,
	Function = 3,
	Constructor = 4,
	Field = 5,
	Variable = 6,
	Class = 7,
	Interface = 8,
	Module = 9,
	Property = 10,
	Unit = 11,
	Value = 12,
	Enum = 13,
	Keyword = 14,
	Snippet = 15,
	Color = 16,
	File = 17,
	Reference = 18
}

/**
 * A completion item represents a text snippet that is
 * proposed to complete text that is being typed.
 */
export interface CompletionItem {
	/**
	 * The label of this completion item. By default
	 * also the text that is inserted when selecting
	 * this completion.
	 */
	label: string;

	/**
	 * The kind of this completion item. Based of the kind
	 * an icon is chosen by the editor.
	 */
	kind?: number;

	/**
	 * A human-readable string with additional information
	 * about this item, like type or symbol information.
	 */
	detail?: string;

	/**
	 * A human-readable string that represents a doc-comment.
	 */
	documentation?: string;

	/**
	 * A string that shoud be used when comparing this item
	 * with other items. When `falsy` the [label](#CompletionItem.label)
	 * is used.
	 */
	sortText?: string;

	/**
	 * A string that should be used when filtering a set of
	 * completion items. When `falsy` the [label](#CompletionItem.label)
	 * is used.
	 */
	filterText?: string;

	/**
	 * A string that should be inserted a document when selecting
	 * this completion. When `falsy` the [label](#CompletionItem.label)
	 * is used.
	 */
	insertText?: string;

	/**
	 * An [edit](#TextEdit) which is applied to a document when selecting
	 * this completion. When an edit is provided the value of
	 * [insertText](#CompletionItem.insertText) is ignored.
	 */
	textEdit?: TextEdit;

	/**
	 * An data entry field that is preserved on a completion item between
	 * a [CompletionRequest](#CompletionRequest) and a [CompletionResolveRequest]
	 * (#CompletionResolveRequest)
	 */
	data?: any
}

/**
 * The CompletionItem namespace provides functions to deal with
 * completion items.
 */
export namespace CompletionItem {
	/**
	 * Create a completion item and seed it with a label.
	 * @param label The completion item's label
	 */
	export function create(label: string): CompletionItem {
		return { label };
	}
}

/**
 * A text edit applicable to a text document.
 */
export interface TextEdit {
	/**
	 * The range of the text document to be manipulated. To insert
	 * text into a document create a range where start === end.
	 */
	range: Range;

	/**
	 * The string to be inserted. For delete operations use an
	 * empty string.
	 */
	newText: string;
}

/**
 * The TextEdit namespace provides helper function to create replace,
 * insert and delete edits more easily.
 */
export namespace TextEdit {
	/**
	 * Creates a replace text edit.
	 * @param range The range of text to be replaced.
	 * @param newText The new text.
	 */
	export function replace(range: Range, newText: string): TextEdit {
		return { range, newText };
	}
	/**
	 * Creates a insert text edit.
	 * @param psotion The position to insert the text at.
	 * @param newText The text to be inserted.
	 */
	export function insert(position: Position, newText: string): TextEdit {
		return { range: { start: position, end: position }, newText };
	}
	/**
	 * Creates a delete text edit.
	 * @param range The range of text to be deleted.
	 */
	export function del(range: Range): TextEdit {
		return { range, newText: '' };
	}
}

/**
 * Request to request completion at a given text document position. The request's
 * parameter is of type [TextDocumentPosition](#TextDocumentPosition) the response
 * is of type [CompletionItem[]](#CompletionItem) or a Thenable that resolves to such.
 */
export namespace CompletionRequest {
	export const type: RequestType<TextDocumentPosition, CompletionItem[], void> = { method: 'textDocument/completion' };
}

/**
 * Request to resolve additional information for a given completion item.The request's
 * parameter is of type [CompletionItem](#CompletionItem) the response
 * is of type [CompletionItem](#CompletionItem) or a Thenable that resolves to such.
 */
export namespace CompletionResolveRequest {
	export const type: RequestType<CompletionItem, CompletionItem, void> = { method: 'completionItem/resolve' };
}

//---- Hover Support -------------------------------

export type MarkedString = string | { language: string; value: string };

/**
 * The result of a hove request.
 */
export interface Hover {
	/**
	 * The hover's content
	 */
	contents: MarkedString | MarkedString[];

	/**
	 * An optional range
	 */
	range?: Range;
}

/**
 * Request to request hover information at a given text document position. The request's
 * parameter is of type [TextDocumentPosition](#TextDocumentPosition) the response is of
 * type [Hover](#Hover) or a Thenable that resolves to such.
 */
export namespace HoverRequest {
	export const type: RequestType<TextDocumentPosition, Hover, void> = { method: 'textDocument/hover' };
}

//---- SignatureHelp ----------------------------------

/**
 * Represents a parameter of a callable-signature. A parameter can
 * have a label and a doc-comment.
 */
export interface ParameterInformation {
	/**
	 * The label of this signature. Will be shown in
	 * the UI.
	 */
	label: string;

	/**
	 * The human-readable doc-comment of this signature. Will be shown
	 * in the UI but can be omitted.
	 */
	documentation?: string;
}

/**
 * The ParameterInformation namespace provides helper functions to work with
 * [ParameterInformation](#ParameterInformation) literals.
 */
export namespace ParameterInformation {
	/**
	 * Creates a new parameter information literal.
	 *
	 * @param label A label string.
	 * @param documentation A doc string.
	 */
	export function create(label: string, documentation?: string): ParameterInformation {
		return documentation ? { label, documentation } : { label };
	};
}

/**
 * Represents the signature of something callable. A signature
 * can have a label, like a function-name, a doc-comment, and
 * a set of parameters.
 */
export interface SignatureInformation {
	/**
	 * The label of this signature. Will be shown in
	 * the UI.
	 */
	label: string;

	/**
	 * The human-readable doc-comment of this signature. Will be shown
	 * in the UI but can be omitted.
	 */
	documentation?: string;

	/**
	 * The parameters of this signature.
	 */
	parameters?: ParameterInformation[];
}

/**
 * The SignatureInformation namespace provides helper functions to work with
 * [SignatureInformation](#SignatureInformation) literals.
 */
export namespace SignatureInformation {
	export function create(label: string, documentation?: string, ...parameters: ParameterInformation[]): SignatureInformation {
		let result: SignatureInformation = { label };
		if (is.defined(documentation)) {
			result.documentation = documentation;
		}
		if (is.defined(parameters)) {
			result.parameters = parameters;
		} else {
			result.parameters = [];
		}
		return result;
	}
}

/**
 * Signature help represents the signature of something
 * callable. There can be multiple signature but only one
 * active and only one active parameter.
 */
export interface SignatureHelp {

	/**
	 * One or more signatures.
	 */
	signatures: SignatureInformation[];

	/**
	 * The active signature.
	 */
	activeSignature?: number;

	/**
	 * The active parameter of the active signature.
	 */
	activeParameter?: number;
}

export namespace SignatureHelpRequest {
	export const type: RequestType<TextDocumentPosition, SignatureHelp, void> = { method: 'textDocument/signatureHelp' };
}

//---- Goto Definition -------------------------------------

/**
 * The definition of a symbol represented as one or many [locations](#Location).
 * For most programming languages there is only one location at which a symbol is
 * defined.
 */
export type Definition = Location | Location[];

/**
 * A request to resolve the defintion location of a symbol at a given text
 * document position. The request's parameter is of type [TextDocumentPosition]
 * (#TextDocumentPosition) the response is of type [Definition](#Definition) or a
 * Thenable that resolves to such.
 */
export namespace DefinitionRequest {
	export const type: RequestType<TextDocumentPosition, Definition, void> = { method: 'textDocument/definition' };
}

//---- Reference Provider ----------------------------------

/**
 * Value-object that contains additional information when
 * requesting references.
 */
export interface ReferenceContext {
	/**
	 * Include the declaration of the current symbol.
	 */
	includeDeclaration: boolean;
}

/**
 * Parameters for a [ReferencesRequest](#ReferencesRequest).
 */
export interface ReferenceParams extends TextDocumentPosition {
	context: ReferenceContext
}

/**
 * A request to resolve project-wide references for the symbol denoted
 * by the given text document position. The request's parameter is of
 * type [ReferenceParams](#ReferenceParams) the response is of type
 * [Location[]](#Location) or a Thenable that resolves to such.
 */
export namespace ReferencesRequest {
	export const type: RequestType<ReferenceParams, Location[], void> = { method: 'textDocument/references' };
}

//---- Document Highlight ----------------------------------

/**
 * A document highlight kind.
 */
export enum DocumentHighlightKind {
	/**
	 * A textual occurrance.
	 */
	Text = 1,

	/**
	 * Read-access of a symbol, like reading a variable.
	 */
	Read = 2,

	/**
	 * Write-access of a symbol, like writing to a variable.
	 */
	Write = 3
}

/**
 * A document highlight is a range inside a text document which deserves
 * special attention. Usually a document highlight is visualized by changing
 * the background color of its range.
 */
export interface DocumentHighlight {

	/**
	 * The range this highlight applies to.
	 */
	range: Range;

	/**
	 * The highlight kind, default is [text](#DocumentHighlightKind.Text).
	 */
	kind?: number;
}

/**
 * DocumentHighlight namespace to provide helper functions to work with
 * [DocumentHighlight](#DocumentHighlight) literals.
 */
export namespace DocumentHighlight {
	/**
	 * Create a DocumentHighlight object.
	 * @param range The range the highlight applies to.
	 */
	export function create(range: Range, kind?: number): DocumentHighlight {
		let result: DocumentHighlight = { range };
		if (is.number(kind)) {
			result.kind = kind;
		}
		return result;
	}
}

/**
 * Request to resolve a [DocumentHighlight](#DocumentHighlight) for a given
 * text document position. The request's parameter is of type [TextDocumentPosition]
 * (#TextDocumentPosition) the request reponse is of type [DocumentHighlight[]]
 * (#DocumentHighlight) or a Thenable that resolves to such.
 */
export namespace DocumentHighlightRequest {
	export const type: RequestType<TextDocumentPosition, DocumentHighlight[], void> = { method: 'textDocument/documentHighlight' };
}

//---- Document Symbol Provider ---------------------------

/**
 * A symbol kind.
 */
export enum SymbolKind {
	File = 1,
	Module = 2,
	Namespace = 3,
	Package = 4,
	Class = 5,
	Method = 6,
	Property = 7,
	Field = 8,
	Constructor = 9,
	Enum = 10,
	Interface = 11,
	Function = 12,
	Variable = 13,
	Constant = 14,
	String = 15,
	Number = 16,
	Boolean = 17,
	Array = 18,
}

/**
 * Represents information about programming constructs like variables, classes,
 * interfaces etc.
 */
export interface SymbolInformation {
	/**
	 * The name of this symbol.
	 */
	name: string;

	/**
	 * The kind of this symbol.
	 */
	kind: number;

	/**
	 * The location of this symbol.
	 */
	location: Location;

	/**
	 * The name of the symbol containing this symbol.
	 */
	containerName?: string;
}

export namespace SymbolInformation {
	/**
	 * Creates a new symbol information literal.
	 *
	 * @param name The name of the symbol.
	 * @param kind The kind of the symbol.
	 * @param range The range of the location of the symbol.
	 * @param uri The resource of the location of symbol, defaults to the current document.
	 * @param containerName The name of the symbol containg the symbol.
	 */
	export function create(name: string, kind: SymbolKind, range: Range, uri?: string, containerName?: string): SymbolInformation {
		let result: SymbolInformation = {
			name,
			kind,
			location: { uri, range }
		}
		if (containerName) {
			result.containerName = containerName;
		}
		return result;
	}
}

/**
 * A request to list all symbols found in a given text document. The request's
 * parameter is of type [TextDocumentIdentifier](#TextDocumentIdentifier) the
 * response is of type [SymbolInformation[]](#SymbolInformation) or a Thenable
 * that resolves to such.
 */
export namespace DocumentSymbolRequest {
	export const type: RequestType<TextDocumentIdentifier, SymbolInformation[], void> = { method: 'textDocument/documentSymbol' };
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
export namespace  WorkspaceSymbolRequest {
	export const type: RequestType<WorkspaceSymbolParams, SymbolInformation[], void> = { method: 'workspace/symbol' };
}