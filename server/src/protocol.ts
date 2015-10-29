/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { RequestType, NotificationType } from 'vscode-jsonrpc';

export interface HostCapabilities {
}

export namespace TextDocumentSync {
	export const None: number = 0;
	export const Full: number = 1;
	export const Incremental: number = 2;
}

export interface ServerCapabilities {
	textDocumentSync?: number;
	hoverProvider?: boolean;
}

/**
 * The initialize command is send from the client to the worker.
 * It is send once as the first command after starting up the
 * worker.
 */
export namespace InitializeRequest {
	export let type: RequestType<InitializeParams, InitializeResult, InitializeError> = { method: 'initialize' };
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
	export let type: RequestType<ShutdownParams, void, void> = { method: 'shutdown' };
}
export interface ShutdownParams {
}

/**
 * The exit event is send from the client to the worker to
 * ask the worker to exit its process.
 */
export namespace ExitNotification {
	export let type: NotificationType<ExitParams> = { method: 'exit' };
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
	export let type: NotificationType<DidChangeConfigurationParams> = { method: 'workspace/didChangeConfiguration' };
}
export interface DidChangeConfigurationParams {
	settings: any;
}

export namespace MessageType {
	export const Error: number = 1;
	export const Warning: number = 2;
	export const Info: number = 3;
	export const Log: number = 4;
}

/**
 * The show message event is send from a worker to a client to ask
 * the client to display a particular message in the user interface
 */
export namespace ShowMessageNotification {
	export let type: NotificationType<ShowMessageParams> = { method: 'window/showMessage' };
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

export interface HTMLContentElement {
	formattedText?:string;
	text?: string;
	className?: string;
	style?: string;
	customStyle?: any;
	tagName?: string;
	children?: HTMLContentElement[];
	isText?: boolean;
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
	export let type: NotificationType<DidOpenTextDocumentParams> = { method: 'textDocument/didOpen' };
}
export interface DidOpenTextDocumentParams extends TextDocumentIdentifier {
	/**
	 * The content of the opened document.
	 */
	text: string;
}

export namespace DidChangeTextDocumentNotification {
	export let type: NotificationType<DidChangeTextDocumentParams> = { method: 'textDocument/didChange' };
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
	export let type: NotificationType<DidCloseTextDocumentParams> = { method: 'textDocument/didClose' };
}
export interface DidCloseTextDocumentParams extends TextDocumentIdentifier {
}


export namespace DidChangeFilesNotification {
	export let type: NotificationType<DidChangeFilesParams> = { method: 'workspace/didChangeFiles' };
}
export interface DidChangeFilesParams {
	changes: FileEvent[];
}

export namespace FileChangeType {
	export let Created = 1;
	export let Changed = 2;
	export let Deleted = 3;
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
	export let type: NotificationType<PublishDiagnosticsParams> = { method: 'textDocument/publishDiagnostics' };
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

export namespace Severity {
	export let Error: number = 0;
	export let Warning: number = 1;
	export let Information: number = 2;
	export let Hint: number = 3;
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

//---- Hover support -------------------------------

export namespace HoverRequest {
	export let type: RequestType<TextDocumentPosition, HoverResult, void> = { method: 'textDocument/hover' };
}

/**
 * The result of a hove request.
 */
export interface HoverResult {
	/**
	 * The hover's content
	 */
	content: string | HTMLContentElement;

	/**
	 * An optional range
	 */
	range?: Range;
}