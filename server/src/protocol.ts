/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { RequestType, NotificationType, ResponseError } from 'vscode-jsonrpc';

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
}

//---- Initialize Method ----

/**
 * The initialize method is sent from the client to the server.
 * It is send once as the first method after starting up the
 * worker.
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
 * server. The only event that is sent after a shudown request
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
	export const type: NotificationType<DidChangeTextDocumentParams | DidChangeTextDocumentParams[]> = { get method() { return 'textDocument/didChange'; } };
}
/**
 * The arguments describing a change to a text document. If range and rangeLength are omitted
 * the new text is considered to be the full content of the document.
 */
export interface DidChangeTextDocumentParams extends TextDocumentIdentifier {

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

export interface CompletionItem {
	label: string;
	kind?: number;
	detail?: string;
	documentation?: string;
	sortText?: string;
	filterText?: string;
	insertText?: string;
	textEdit?: TextEdit;
}

export namespace CompletionItem {
	export function create(label: string): CompletionItem {
		return { label };
	}
}

export interface TextEdit {
	range: Range;
	newText: string;
}

export namespace TextEdit {
	export function replace(range: Range, newText: string): TextEdit {
		return { range, newText };
	}
	export function insert(position: Position, newText: string): TextEdit {
		return { range: { start: position, end: position }, newText };
	}
	export function del(range: Range): TextEdit {
		return { range, newText: '' };
	}
}

export namespace CompletionRequest {
	export const type: RequestType<TextDocumentPosition, CompletionItem[], void> = { method: 'textDocument/completion' };
}

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

export namespace HoverRequest {
	export const type: RequestType<TextDocumentPosition, Hover, void> = { method: 'textDocument/hover' };
}

//---- SignatureHelp ----------------------------------

export interface ParameterInformation {
	label: string;
	documentation?: string;
}

export namespace ParameterInformation {
	export function create(label: string, documentation?: string): ParameterInformation {
		return documentation ? { label, documentation } : { label };
	};
}

export interface SignatureInformation {
	label: string;
	documentation?: string;
	parameters?: ParameterInformation[];
}

export namespace SignatureInformation {
	export function create(label: string, documentation?: string): SignatureInformation {
		return documentation ? { label, documentation } : { label };
	}
}

export interface SignatureHelp {
	signatures?: SignatureInformation[];
	activeSignature?: number;
	activeParameter?: number;
}

export namespace SignatureHelpRequest {
	export const type: RequestType<TextDocumentPosition, SignatureHelp, void> = { method: 'textDocument/signatureHelp' };
}

//---- Goto Definition -------------------------------------

/**
 * The definition of a symbol is one or many [locations](#Location)
 */
export type Definition = Location | Location[];

export namespace DefinitionRequest {
	export const type: RequestType<TextDocumentPosition, Definition, void> = { method: 'textDocument/definition' };
}

//---- Reference Provider ----------------------------------

export interface ReferenceParams extends TextDocumentPosition {
	options: { includeDeclaration: boolean; }
}

export namespace ReferencesRequest {
	export const type: RequestType<ReferenceParams, Location[], void> = { method: 'textDocument/references' };
}

//---- Document Highlight ----------------------------------

export enum DocumentHighlightKind {
	Text = 1,
	Read = 2,
	Write = 3
}

export interface DocumentHighlight {
	range: Range;
	kind?: number;
}

export namespace DocumentHighlightRequest {
	export const type: RequestType<TextDocumentPosition, DocumentHighlight[], void> = { method: 'textDocument/documentHighlight' };
}