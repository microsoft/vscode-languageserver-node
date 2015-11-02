/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { RequestType, NotificationType } from 'vscode-jsonrpc';

export interface HostCapabilities {
}

export enum TextDocumentSyncKind {
	None = 0,
	Full = 1,
	Incremental = 2
}

export interface CompletionOptions {
	resolveProvider?: boolean;
	triggerCharacters?: string[];
}

export interface SignatureHelpOptions {
	triggerCharacters?: string[];
}

export interface ServerCapabilities {
	textDocumentSync?: number;
	hoverProvider?: boolean;
	completionProvider?: CompletionOptions;
	signatureHelpProvider?: SignatureHelpOptions;
}

/**
 * The initialize command is send from the client to the worker.
 * It is send once as the first command after starting up the
 * worker.
 */
export namespace InitializeRequest {
	export const type: RequestType<InitializeParams, InitializeResult, InitializeError> = { method: 'initialize' };
}
export interface InitializeParams {
	rootFolder: string;
	capabilities: HostCapabilities;
}

export interface InitializeResult {
	capabilities: ServerCapabilities;
}

export interface InitializeError {
	retry: boolean;
}

/**
 * The shutdown command is send from the client to the worker.
 * It is send once when the client descides to shutdown the
 * worker. The only event that is send after a shudown request
 * is the exit event.
 */
export namespace ShutdownRequest {
	export const type: RequestType<ShutdownParams, void, void> = { method: 'shutdown' };
}
export interface ShutdownParams {
}

/**
 * The exit event is send from the client to the worker to
 * ask the worker to exit its process.
 */
export namespace ExitNotification {
	export const type: NotificationType<ExitParams> = { method: 'exit' };
}
export interface ExitParams {
}

/**
 * The configuration change event is send from the client to the worker
 * when the client's configuration has changed. The event contains
 * the changed configuration as defined by the language worker statically
 * in it's extension manifest.
 */
export namespace DidChangeConfigurationNotification {
	export const type: NotificationType<DidChangeConfigurationParams> = { method: 'workspace/didChangeConfiguration' };
}
export interface DidChangeConfigurationParams {
	settings: any;
}

export enum MessageType {
	Error = 1,
	Warning = 2,
	Info = 3,
	Log = 4
}

/**
 * The show message event is send from a worker to a client to ask
 * the client to display a particular message in the user interface
 */
export namespace ShowMessageNotification {
	export const type: NotificationType<ShowMessageParams> = { method: 'window/showMessage' };
}
export interface ShowMessageParams {
	type: number;
	message: string;
}

export namespace LogMessageNotification {
	export let type: NotificationType<LogMessageParams> = { method: 'window/logMessage' };
}
export interface LogMessageParams {
	type: number;
	message: string;
}

/**
 * Position in a text document expressed as (zero-based) line and character offset.
 */
export interface Position {
	/**
	 * Line Position in a document (zero-based)
	 */
	line: number;

	/**
	 * Character offset on a line in a document (zero-based)
	 */
	character: number;
}

/**
 * A range in a text document.
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

export interface TextDocumentIdentifier {
	/**
	 * A URI identifying the resource in the client.
	 */
	uri: string;
}

export interface TextDocumentPosition extends TextDocumentIdentifier {
	/**
	 * The position inside the text document.
	 */
	position: Position;
}

/**
 * The document event is send from the client to the worker to signal
 * newly opened, changed and closed documents.
 */
export namespace DidOpenTextDocumentNotification {
	export const type: NotificationType<DidOpenTextDocumentParams> = { method: 'textDocument/didOpen' };
}
export interface DidOpenTextDocumentParams extends TextDocumentIdentifier {
	/**
	 * The content of the opened document.
	 */
	text: string;
}

export namespace DidChangeTextDocumentNotification {
	export const type: NotificationType<DidChangeTextDocumentParams> = { method: 'textDocument/didChange' };
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

export namespace DidCloseTextDocumentNotification {
	export const type: NotificationType<DidCloseTextDocumentParams> = { method: 'textDocument/didClose' };
}
export interface DidCloseTextDocumentParams extends TextDocumentIdentifier {
}


export namespace DidChangeWatchedFilesNotification {
	export const type: NotificationType<DidChangeWatchedFilesParams> = { method: 'workspace/didChangeFiles' };
}
export interface DidChangeWatchedFilesParams {
	changes: FileEvent[];
}

export enum FileChangeType {
	Created = 1,
	Changed = 2,
	Deleted = 3
}

export interface FileEvent {
	uri: string;
	type: number;
}


/**
 * Diagnostics notification are send from the worker to clients to signal
 * results of validation runs
 */
export namespace PublishDiagnosticsNotification {
	export const type: NotificationType<PublishDiagnosticsParams> = { method: 'textDocument/publishDiagnostics' };
}
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

export enum Severity {
	Error = 0,
	Warning = 1,
	Information = 2,
	Hint = 3
}

/**
 * Item of diagnostic information found in a DiagnosticEvent message.
 */
export interface Diagnostic {
	/**
	 * Starting position at which text appies.
	 */
	start: Position;

	/**
	 * The last position at which the text applies. Can be omitted.
	 */
	end?: Position;

	/**
	 * The diagnostic's severity. Can be omitted. If omitted it is up to the
	 * client to interpret diagnostics as error, warning or info.
	 */
	severity?: number;

	/**
	 * The diagnostic code. Can be omitted.
	 */
	code?: string;

	/**
	 * The diagnostic message.
	 */
	message: string;
}

//---- Completion Support --------------------------

export enum CompletionItemKind {
	Text,
	Method,
	Function,
	Constructor,
	Field,
	Variable,
	Class,
	Interface,
	Module,
	Property,
	Unit,
	Value,
	Enum,
	Keyword,
	Snippet,
	Color,
	File,
	Reference
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