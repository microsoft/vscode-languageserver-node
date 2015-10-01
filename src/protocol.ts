/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { Response, RequestType, EventType } from './messages';

/**
 * The shutdown command is send from the client to the worker.
 * It is send once when the client descides to shutdown the
 * worker. The only event that is send after a shudown request
 * is the exit event.
 */
export namespace ShutdownRequest {
	export let type: RequestType<ShutdownArguments, ShutdownResponse> = { command: 'shutdown' };
}

export interface ShutdownArguments {
}

export interface ShutdownResponse extends Response {
}

/**
 * The exit event is send from the client to the worker to
 * ask the worker to exit its process.
 */
export namespace ExitEvent {
	export let type: EventType<ExitArguments> = { event: 'exit' };
}
export interface ExitArguments {
}

/**
 * The initialize command is send from the client to the worker.
 * It is send once as the first command after starting up the
 * worker.
 */
export interface Capabilities {
	validation?: boolean;
}

export namespace InitializeRequest {
	export let type: RequestType<InitializeArguments, InitializeResponse> = { command: 'initialize' };
}
export interface InitializeArguments {
	rootFolder: string;
	capabilities: Capabilities;
}

export interface InitializeResponse extends Response {
	body?: { capabilities: Capabilities; }
}

/**
 * The configuration change event is send from the client to the worker
 * when the client's configuration has changed. The event contains
 * the changed configuration as defined by the language worker statically
 * in it's extension manifest.
 */
export namespace DidChangeConfigurationEvent {
	export let type: EventType<DidChangeConfigurationArguments> = { event: 'workspace/didChangeConfiguration' };
}
export interface DidChangeConfigurationArguments {
	settings: any;
}

export namespace MessageSeverity {
	export let Error: number = 1;
	export let Warning: number = 2;
	export let Info: number = 3;
}

/**
 * The show message event is send from a worker to a client to ask
 * the client to display a particular message in the user interface
 */
export namespace ShowMessageEvent {
	export let type: EventType<ShowMessageArguments> = { event: 'shell/showMessage' };
}
export interface ShowMessageArguments {
	severity: number;
	message: string;
}

export namespace LogMessageEvent {
	export let type: EventType<LogMessageArguments> = { event: 'shell/logMessage' };
}

export interface LogMessageArguments {
	severity: number;
	message: string;
}

export interface DocumentIdentifier {
	/**
	 * A URI identifying the resource in the client.
	 */
	uri: string;
}

/**
 * The document event is send from the client to the worker to signal
 * newly opened, changed and closed documents.
 */
export namespace DidOpenDocumentEvent {
	export let type: EventType<DidOpenDocumentArguments> = { event: 'document/didOpen' };
}
export interface DidOpenDocumentArguments extends DocumentIdentifier {
	/**
	 * The content of the opened document.
	 */
	content: string;
}

export namespace DidChangeDocumentEvent {
	export let type: EventType<DidChangeDocumentArguments> = { event: 'document/didChange' };
}
export interface DidChangeDocumentArguments extends DocumentIdentifier {
	/**
	 * The new content of the document.
	 */
	content: string;
}

export namespace DidCloseDocumentEvent {
	export let type: EventType<DidCloseDocumentArguments> = { event: 'document/didClose' };
}
export interface DidCloseDocumentArguments extends DocumentIdentifier {
}


/**
 */
export namespace DidChangeFilesEvent {
	export let type: EventType<DidChangeFilesArguments> = { event: 'workspace/didChangeFiles' };
}

export namespace FileChangeType {
	export let Created = 1;
	export let Changed = 2;
	export let Deleted = 3;
}

export interface FileEvent {
	path: string;
	type: number;
}

export interface DidChangeFilesArguments {
	changes: FileEvent[];
}


/**
 * Diagnostics events are send from the worker to clients to signal
 * results of validation runs
 */
export namespace PublishDiagnosticsEvent {
	export let type: EventType<PublishDiagnosticsArguments> = { event: 'document/publishDiagnostics' };
}
export interface PublishDiagnosticsArguments {
	/**
	 * The URI for which diagnostic information is reported.
	 */
	uri: string;

	/**
	 * An array of diagnostic information items.
	 */
	diagnostics: Diagnostic[];
}
export interface PublishDiagnosticsEvent {
	body: PublishDiagnosticsArguments;
}

/**
 * Location in document expressed as (one-based) line and character offset.
 */
export interface Location {
	/**
	 * Line location in a document (one-based)
	 */
	line: number;

	/**
	 * Character offset on a line in a document (one-based)
	 */
	character: number;
}

export namespace Severity {
	export let Error: number = 1;
	export let Warning: number = 2;
	export let Info: number = 3;
}

/**
 * Item of diagnostic information found in a DiagnosticEvent message.
 */
export interface Diagnostic {
	/**
	 * Starting file location at which text appies.
	 */
	start: Location;

	/**
	 * The last file location at which the text applies. Can be omitted.
	 */
	end?: Location;

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