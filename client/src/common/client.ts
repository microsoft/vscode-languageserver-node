/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	workspace as Workspace, window as Window, languages as Languages, commands as Commands, version as VSCodeVersion,
	TextDocumentChangeEvent, TextDocument, Disposable, OutputChannel,
	FileSystemWatcher as VFileSystemWatcher, DiagnosticCollection, Diagnostic as VDiagnostic, Uri, ProviderResult,
	CancellationToken, Position as VPosition, Location as VLocation, Range as VRange,
	CompletionItem as VCompletionItem, CompletionList as VCompletionList, SignatureHelp as VSignatureHelp, SignatureHelpContext as VSignatureHelpContext,
	SignatureHelpProvider as VSignatureHelpProvider, SignatureHelpProviderMetadata as VSignatureHelpProviderMetadata,
	Definition as VDefinition, DefinitionLink as VDefinitionLink, DocumentHighlight as VDocumentHighlight,
	SymbolInformation as VSymbolInformation, CodeActionContext as VCodeActionContext, Command as VCommand, CodeLens as VCodeLens,
	FormattingOptions as VFormattingOptions, TextEdit as VTextEdit, WorkspaceEdit as VWorkspaceEdit, MessageItem,
	Hover as VHover, CodeAction as VCodeAction, DocumentSymbol as VDocumentSymbol,
	DocumentLink as VDocumentLink, TextDocumentWillSaveEvent,
	WorkspaceFolder as VWorkspaceFolder, CompletionContext as VCompletionContext, ConfigurationChangeEvent, CompletionItemProvider, HoverProvider, SignatureHelpProvider,
	DefinitionProvider, ReferenceProvider, DocumentHighlightProvider, CodeActionProvider, DocumentSymbolProvider, CodeLensProvider, DocumentFormattingEditProvider,
	DocumentRangeFormattingEditProvider, OnTypeFormattingEditProvider, RenameProvider, DocumentLinkProvider, DocumentColorProvider, DeclarationProvider,
	FoldingRangeProvider, ImplementationProvider, SelectionRangeProvider, TypeDefinitionProvider, WorkspaceSymbolProvider, CallHierarchyProvider,
	DocumentSymbolProviderMetadata, EventEmitter, env as Env, TextDocumentShowOptions, FileWillCreateEvent, FileWillRenameEvent, FileWillDeleteEvent, FileCreateEvent, FileDeleteEvent, FileRenameEvent,
	LinkedEditingRangeProvider
} from 'vscode';

import {
	RAL, Message, MessageSignature, Logger, ResponseError, RequestType0, RequestType, NotificationType0, NotificationType,
	ProtocolRequestType, ProtocolRequestType0, RequestHandler, RequestHandler0, GenericRequestHandler,
	ProtocolNotificationType, ProtocolNotificationType0, NotificationHandler, NotificationHandler0, GenericNotificationHandler,
	MessageReader, MessageWriter, Trace, Tracer, TraceFormat, TraceOptions, Event, Emitter, createProtocolConnection,
	ClientCapabilities, WorkspaceEdit, RegistrationRequest, RegistrationParams, UnregistrationRequest, UnregistrationParams, TextDocumentRegistrationOptions,
	InitializeRequest, InitializeParams, InitializeResult, InitializeError, ServerCapabilities, TextDocumentSyncKind, TextDocumentSyncOptions,
	InitializedNotification, ShutdownRequest, ExitNotification, LogMessageNotification, LogMessageParams, MessageType, ShowMessageNotification,
	ShowMessageParams, ShowMessageRequest, TelemetryEventNotification, DidChangeConfigurationNotification, DidChangeConfigurationParams,
	DidChangeConfigurationRegistrationOptions, DocumentSelector, DidOpenTextDocumentNotification, DidOpenTextDocumentParams, DidChangeTextDocumentNotification,
	DidChangeTextDocumentParams, TextDocumentChangeRegistrationOptions, DidCloseTextDocumentNotification, DidCloseTextDocumentParams, DidSaveTextDocumentNotification,
	DidSaveTextDocumentParams, TextDocumentSaveRegistrationOptions, WillSaveTextDocumentNotification, WillSaveTextDocumentWaitUntilRequest, WillSaveTextDocumentParams,
	DidChangeWatchedFilesNotification, DidChangeWatchedFilesParams, FileEvent, FileChangeType, DidChangeWatchedFilesRegistrationOptions, WatchKind,
	PublishDiagnosticsNotification, PublishDiagnosticsParams, CompletionRequest, CompletionResolveRequest, CompletionRegistrationOptions, HoverRequest,
	SignatureHelpRequest, SignatureHelpRegistrationOptions, DefinitionRequest, ReferencesRequest, DocumentHighlightRequest, DocumentSymbolRequest, WorkspaceSymbolRequest,
	CodeActionRequest, CodeActionParams, CodeLensRequest, CodeLensResolveRequest, CodeLensRegistrationOptions, CodeLensRefreshRequest, DocumentFormattingRequest,
	DocumentFormattingParams, DocumentRangeFormattingRequest, DocumentRangeFormattingParams, DocumentOnTypeFormattingRequest, DocumentOnTypeFormattingParams,
	DocumentOnTypeFormattingRegistrationOptions, RenameRequest, RenameParams, RenameRegistrationOptions, PrepareRenameRequest, TextDocumentPositionParams,
	DocumentLinkRequest, DocumentLinkResolveRequest, DocumentLinkRegistrationOptions, ExecuteCommandRequest, ExecuteCommandParams, ExecuteCommandRegistrationOptions,
	ApplyWorkspaceEditRequest, ApplyWorkspaceEditParams, ApplyWorkspaceEditResponse, MarkupKind, SymbolKind, CompletionItemKind, Command, CodeActionKind,
	DocumentSymbol, SymbolInformation, Range, CodeActionRegistrationOptions, TextDocumentEdit, ResourceOperationKind, FailureHandlingKind, ProgressType, ProgressToken,
	WorkDoneProgressOptions, StaticRegistrationOptions, CompletionOptions, HoverRegistrationOptions, HoverOptions, SignatureHelpOptions, DefinitionRegistrationOptions,
	DefinitionOptions, ReferenceRegistrationOptions, ReferenceOptions, DocumentHighlightRegistrationOptions, DocumentHighlightOptions, DocumentSymbolRegistrationOptions,
	DocumentSymbolOptions, WorkspaceSymbolRegistrationOptions, CodeActionOptions, CodeLensOptions, DocumentFormattingOptions, DocumentRangeFormattingRegistrationOptions,
	DocumentRangeFormattingOptions, DocumentOnTypeFormattingOptions, RenameOptions, DocumentLinkOptions, CompletionItemTag, DiagnosticTag, DocumentColorRequest,
	DeclarationRequest, FoldingRangeRequest, ImplementationRequest, SelectionRangeRequest, TypeDefinitionRequest, SymbolTag, CallHierarchyPrepareRequest,
	CancellationStrategy, SaveOptions, LSPErrorCodes, CodeActionResolveRequest, RegistrationType, SemanticTokensRegistrationType, InsertTextMode, ShowDocumentRequest,
	FileOperationRegistrationOptions, WillCreateFilesRequest, WillRenameFilesRequest, WillDeleteFilesRequest, DidCreateFilesNotification, DidDeleteFilesNotification, DidRenameFilesNotification,
	ShowDocumentParams, ShowDocumentResult, LinkedEditingRangeRequest, WorkDoneProgress, WorkDoneProgressBegin, WorkDoneProgressEnd, WorkDoneProgressReport, PrepareSupportDefaultBehavior
} from 'vscode-languageserver-protocol';

import type { ColorProviderMiddleware } from './colorProvider';
import type { ImplementationMiddleware } from './implementation';
import type { TypeDefinitionMiddleware } from './typeDefinition';
import { ConfigurationWorkspaceMiddleware, toJSONObject } from './configuration';
import type { WorkspaceFolderWorkspaceMiddleware } from './workspaceFolders';
import type { FoldingRangeProviderMiddleware } from './foldingRange';
import type { DeclarationMiddleware } from './declaration';
import type { SelectionRangeProviderMiddleware } from './selectionRange';
import type { CallHierarchyMiddleware } from './callHierarchy';
import type { SemanticTokensMiddleware, SemanticTokensProviders } from './semanticTokens';
import type { FileOperationsMiddleware } from './fileOperations';
import { LinkedEditingRangeMiddleware } from './linkedEditingRange';

import * as c2p from './codeConverter';
import * as p2c from './protocolConverter';

import * as Is from './utils/is';
import { Delayer } from './utils/async';
import * as UUID from './utils/uuid';
import { ProgressPart } from './progressPart';

interface Connection {

	listen(): void;

	sendRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, token?: CancellationToken): Promise<R>;
	sendRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, params: P, token?: CancellationToken): Promise<R>;
	sendRequest<R, E>(type: RequestType0<R, E>, token?: CancellationToken): Promise<R>;
	sendRequest<P, R, E>(type: RequestType<P, R, E>, params: P, token?: CancellationToken): Promise<R>;
	sendRequest<R>(method: string, token?: CancellationToken): Promise<R>;
	sendRequest<R>(method: string, param: any, token?: CancellationToken): Promise<R>;
	sendRequest<R>(type: string | MessageSignature, ...params: any[]): Promise<R>;

	onRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, handler: RequestHandler0<R, E>): Disposable;
	onRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, handler: RequestHandler<P, R, E>): Disposable;
	onRequest<R, E>(type: RequestType0<R, E>, handler: RequestHandler0<R, E>): Disposable;
	onRequest<P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): Disposable;
	onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): Disposable;
	onRequest<R, E>(method: string | MessageSignature, handler: GenericRequestHandler<R, E>): Disposable;

	sendNotification<RO>(type: ProtocolNotificationType0<RO>): void;
	sendNotification<P, RO>(type: ProtocolNotificationType<P, RO>, params?: P): void;
	sendNotification(type: NotificationType0): void;
	sendNotification<P>(type: NotificationType<P>, params?: P): void;
	sendNotification(method: string): void;
	sendNotification(method: string, params: any): void;
	sendNotification(method: string | MessageSignature, params?: any): void;

	onNotification<RO>(type: ProtocolNotificationType0<RO>, handler: NotificationHandler0): Disposable;
	onNotification<P, RO>(type: ProtocolNotificationType<P, RO>, handler: NotificationHandler<P>): Disposable;
	onNotification(type: NotificationType0, handler: NotificationHandler0): Disposable;
	onNotification<P>(type: NotificationType<P>, handler: NotificationHandler<P>): Disposable;
	onNotification(method: string, handler: GenericNotificationHandler): Disposable;
	onNotification(method: string | MessageSignature, handler: GenericNotificationHandler): Disposable;

	onProgress<P>(type: ProgressType<P>, token: string | number, handler: NotificationHandler<P>): Disposable;
	sendProgress<P>(type: ProgressType<P>, token: string | number, value: P): void;

	trace(value: Trace, tracer: Tracer, sendNotification?: boolean): void;
	trace(value: Trace, tracer: Tracer, traceOptions?: TraceOptions): void;

	initialize(params: InitializeParams): Promise<InitializeResult>;
	shutdown(): Promise<void>;
	exit(): void;

	onLogMessage(handle: NotificationHandler<LogMessageParams>): void;
	onShowMessage(handler: NotificationHandler<ShowMessageParams>): void;
	onTelemetry(handler: NotificationHandler<any>): void;

	didChangeConfiguration(params: DidChangeConfigurationParams): void;
	didChangeWatchedFiles(params: DidChangeWatchedFilesParams): void;

	didOpenTextDocument(params: DidOpenTextDocumentParams): void;
	didChangeTextDocument(params: DidChangeTextDocumentParams): void;
	didCloseTextDocument(params: DidCloseTextDocumentParams): void;
	didSaveTextDocument(params: DidSaveTextDocumentParams): void;
	onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>): void;

	end(): void;
	dispose(): void;
}

class ConsoleLogger implements Logger {
	public error(message: string): void {
		RAL().console.error(message);
	}
	public warn(message: string): void {
		RAL().console.warn(message);
	}
	public info(message: string): void {
		RAL().console.info(message);
	}
	public log(message: string): void {
		RAL().console.log(message);
	}
}

interface ConnectionErrorHandler {
	(error: Error, message: Message | undefined, count: number | undefined): void;
}

interface ConnectionCloseHandler {
	(): void;
}

interface ConnectionOptions {
    cancellationStrategy: CancellationStrategy
    maxRestartCount?: number
}

function createConnection(input: MessageReader, output: MessageWriter, errorHandler: ConnectionErrorHandler, closeHandler: ConnectionCloseHandler, options?: ConnectionOptions): Connection {
	let logger = new ConsoleLogger();
	let connection = createProtocolConnection(input, output, logger, options);
	connection.onError((data) => { errorHandler(data[0], data[1], data[2]); });
	connection.onClose(closeHandler);
	let result: Connection = {

		listen: (): void => connection.listen(),

		sendRequest: <R>(type: string | MessageSignature, ...params: any[]): Promise<R> => connection.sendRequest(Is.string(type) ? type : type.method, ...params),
		onRequest: <R, E>(type: string | MessageSignature, handler: GenericRequestHandler<R, E>): Disposable => connection.onRequest(Is.string(type) ? type : type.method, handler),

		sendNotification: (type: string | MessageSignature, params?: any): void => connection.sendNotification(Is.string(type) ? type : type.method, params),
		onNotification: (type: string | MessageSignature, handler: GenericNotificationHandler): Disposable => connection.onNotification(Is.string(type) ? type : type.method, handler),

		onProgress: connection.onProgress,
		sendProgress: connection.sendProgress,

		trace: (value: Trace, tracer: Tracer, sendNotificationOrTraceOptions?: boolean | TraceOptions): void => {
			const defaultTraceOptions: TraceOptions = {
				sendNotification: false,
				traceFormat: TraceFormat.Text
			};

			if (sendNotificationOrTraceOptions === undefined) {
				connection.trace(value, tracer, defaultTraceOptions);
			} else if (Is.boolean(sendNotificationOrTraceOptions)) {
				connection.trace(value, tracer, sendNotificationOrTraceOptions);
			} else {
				connection.trace(value, tracer, sendNotificationOrTraceOptions);
			}
		},

		initialize: (params: InitializeParams) => connection.sendRequest(InitializeRequest.type, params),
		shutdown: () => connection.sendRequest(ShutdownRequest.type, undefined),
		exit: () => connection.sendNotification(ExitNotification.type),

		onLogMessage: (handler: NotificationHandler<LogMessageParams>) => connection.onNotification(LogMessageNotification.type, handler),
		onShowMessage: (handler: NotificationHandler<ShowMessageParams>) => connection.onNotification(ShowMessageNotification.type, handler),
		onTelemetry: (handler: NotificationHandler<any>) => connection.onNotification(TelemetryEventNotification.type, handler),

		didChangeConfiguration: (params: DidChangeConfigurationParams) => connection.sendNotification(DidChangeConfigurationNotification.type, params),
		didChangeWatchedFiles: (params: DidChangeWatchedFilesParams) => connection.sendNotification(DidChangeWatchedFilesNotification.type, params),

		didOpenTextDocument: (params: DidOpenTextDocumentParams) => connection.sendNotification(DidOpenTextDocumentNotification.type, params),
		didChangeTextDocument: (params: DidChangeTextDocumentParams) => connection.sendNotification(DidChangeTextDocumentNotification.type, params),
		didCloseTextDocument: (params: DidCloseTextDocumentParams) => connection.sendNotification(DidCloseTextDocumentNotification.type, params),
		didSaveTextDocument: (params: DidSaveTextDocumentParams) => connection.sendNotification(DidSaveTextDocumentNotification.type, params),

		onDiagnostics: (handler: NotificationHandler<PublishDiagnosticsParams>) => connection.onNotification(PublishDiagnosticsNotification.type, handler),

		end: () => connection.end(),
		dispose: () => connection.dispose()
	};

	return result;
}

/**
 * An action to be performed when the connection is producing errors.
 */
export enum ErrorAction {
	/**
	 * Continue running the server.
	 */
	Continue = 1,
	/**
	 * Shutdown the server.
	 */
	Shutdown = 2
}

/**
 * An action to be performed when the connection to a server got closed.
 */
export enum CloseAction {
	/**
	 * Don't restart the server. The connection stays closed.
	 */
	DoNotRestart = 1,
	/**
	 * Restart the server.
	 */
	Restart = 2,
}


/**
 * A plugable error handler that is invoked when the connection is either
 * producing errors or got closed.
 */
export interface ErrorHandler {
	/**
	 * An error has occurred while writing or reading from the connection.
	 *
	 * @param error - the error received
	 * @param message - the message to be delivered to the server if know.
	 * @param count - a count indicating how often an error is received. Will
	 *  be reset if a message got successfully send or received.
	 */
	error(error: Error, message: Message | undefined, count: number | undefined): ErrorAction;

	/**
	 * The connection to the server got closed.
	 */
	closed(): CloseAction
}

class DefaultErrorHandler implements ErrorHandler {

	private readonly restarts: number[];

	constructor(private name: string, private maxRestartCount: number) {
		this.restarts = [];
	}

	public error(_error: Error, _message: Message, count: number): ErrorAction {
		if (count && count <= 3) {
			return ErrorAction.Continue;
		}
		return ErrorAction.Shutdown;
	}
	public closed(): CloseAction {
		this.restarts.push(Date.now());
		if (this.restarts.length <= this.maxRestartCount) {
			return CloseAction.Restart;
		} else {
			let diff = this.restarts[this.restarts.length - 1] - this.restarts[0];
			if (diff <= 3 * 60 * 1000) {
				Window.showErrorMessage(`The ${this.name} server crashed ${this.maxRestartCount+1} times in the last 3 minutes. The server will not be restarted.`);
				return CloseAction.DoNotRestart;
			} else {
				this.restarts.shift();
				return CloseAction.Restart;
			}
		}
	}
}

/**
 * A handler that is invoked when the initialization of the server failed.
 */
export interface InitializationFailedHandler {
	/**
	 * @param error The error returned from the server
	 * @returns if true is returned the client tries to reinitialize the server.
	 *  Implementors of a handler are responsible to not initialize the server
	 *  infinitely. Return false if initialization should stop and an error
	 *  should be reported.
	 */
	(error: ResponseError<InitializeError> | Error | any): boolean;
}

export interface SynchronizeOptions {
	/**
	 * The configuration sections to synchronize. Pushing settings from the
	 * client to the server is deprecated in favour of the new pull model
	 * that allows servers to query settings scoped on resources. In this
	 * model the client can only deliver an empty change event since the
	 * actually setting value can vary on the provided resource scope.
	 *
	 * @deprecated Use the new pull model (`workspace/configuration` request)
	 */
	configurationSection?: string | string[];

	/**
	 * Asks the client to send file change events to the server. Watchers
	 * operate on workspace folders. The LSP client doesn't support watching
	 * files outside a workspace folder.
	 */
	fileEvents?: VFileSystemWatcher | VFileSystemWatcher[];
}

export enum RevealOutputChannelOn {
	Info = 1,
	Warn = 2,
	Error = 3,
	Never = 4
}

export interface HandleDiagnosticsSignature {
	(this: void, uri: Uri, diagnostics: VDiagnostic[]): void;
}

export interface HandleWorkDoneProgressSignature {
	(this: void, token: ProgressToken, params: WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd): void;
}

export interface ProvideCompletionItemsSignature {
	(this: void, document: TextDocument, position: VPosition, context: VCompletionContext, token: CancellationToken): ProviderResult<VCompletionItem[] | VCompletionList>;
}

export interface ResolveCompletionItemSignature {
	(this: void, item: VCompletionItem, token: CancellationToken): ProviderResult<VCompletionItem>;
}

export interface ProvideHoverSignature {
	(this: void, document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VHover>;
}

export interface ProvideSignatureHelpSignature {
	(this: void, document: TextDocument, position: VPosition, context: VSignatureHelpContext, token: CancellationToken): ProviderResult<VSignatureHelp>;
}

export interface ProvideDefinitionSignature {
	(this: void, document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VDefinition | VDefinitionLink[]>;
}

export interface ProvideReferencesSignature {
	(this: void, document: TextDocument, position: VPosition, options: { includeDeclaration: boolean; }, token: CancellationToken): ProviderResult<VLocation[]>;
}

export interface ProvideDocumentHighlightsSignature {
	(this: void, document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VDocumentHighlight[]>;
}

export interface ProvideDocumentSymbolsSignature {
	(this: void, document: TextDocument, token: CancellationToken): ProviderResult<VSymbolInformation[] | VDocumentSymbol[]>;
}

export interface ProvideWorkspaceSymbolsSignature {
	(this: void, query: string, token: CancellationToken): ProviderResult<VSymbolInformation[]>;
}

export interface ProvideCodeActionsSignature {
	(this: void, document: TextDocument, range: VRange, context: VCodeActionContext, token: CancellationToken): ProviderResult<(VCommand | VCodeAction)[]>;
}

export interface ResolveCodeActionSignature {
	(this: void, item: VCodeAction, token: CancellationToken): ProviderResult<VCodeAction>;
}

export interface ProvideCodeLensesSignature {
	(this: void, document: TextDocument, token: CancellationToken): ProviderResult<VCodeLens[]>;
}

export interface ResolveCodeLensSignature {
	(this: void, codeLens: VCodeLens, token: CancellationToken): ProviderResult<VCodeLens>;
}

export interface ProvideDocumentFormattingEditsSignature {
	(this: void, document: TextDocument, options: VFormattingOptions, token: CancellationToken): ProviderResult<VTextEdit[]>;
}

export interface ProvideDocumentRangeFormattingEditsSignature {
	(this: void, document: TextDocument, range: VRange, options: VFormattingOptions, token: CancellationToken): ProviderResult<VTextEdit[]>;
}

export interface ProvideOnTypeFormattingEditsSignature {
	(this: void, document: TextDocument, position: VPosition, ch: string, options: VFormattingOptions, token: CancellationToken): ProviderResult<VTextEdit[]>;
}

export interface ProvideRenameEditsSignature {
	(this: void, document: TextDocument, position: VPosition, newName: string, token: CancellationToken): ProviderResult<VWorkspaceEdit>;
}

export interface PrepareRenameSignature {
	(this: void, document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VRange | { range: VRange, placeholder: string }>;
}

export interface ProvideDocumentLinksSignature {
	(this: void, document: TextDocument, token: CancellationToken): ProviderResult<VDocumentLink[]>;
}

export interface ResolveDocumentLinkSignature {
	(this: void, link: VDocumentLink, token: CancellationToken): ProviderResult<VDocumentLink>;
}

export interface ExecuteCommandSignature {
	(this: void, command: string, args: any[]): ProviderResult<any>
}

export interface NextSignature<P, R> {
	(this: void, data: P, next: (data: P) => R): R;
}

export interface DidChangeConfigurationSignature {
	(this: void, sections: string[] | undefined): void;
}

export interface DidChangeWatchedFileSignature {
	(this: void, event: FileEvent): void;
}

export interface _WorkspaceMiddleware {
	didChangeConfiguration?: (this: void, sections: string[] | undefined, next: DidChangeConfigurationSignature) => void;
	didChangeWatchedFile?: (this: void, event: FileEvent, next: DidChangeWatchedFileSignature) => void;
}

export type WorkspaceMiddleware = _WorkspaceMiddleware & ConfigurationWorkspaceMiddleware & WorkspaceFolderWorkspaceMiddleware & FileOperationsMiddleware;

export interface _WindowMiddleware {
	showDocument?: (this: void, params: ShowDocumentParams, next: ShowDocumentRequest.HandlerSignature) => Promise<ShowDocumentResult>;
}

export type WindowMiddleware = _WindowMiddleware;

/**
 * The Middleware lets extensions intercept the request and notifications send and received
 * from the server
 */
export interface _Middleware {
	didOpen?: NextSignature<TextDocument, void>;
	didChange?: NextSignature<TextDocumentChangeEvent, void>;
	willSave?: NextSignature<TextDocumentWillSaveEvent, void>;
	willSaveWaitUntil?: NextSignature<TextDocumentWillSaveEvent, Thenable<VTextEdit[]>>;
	didSave?: NextSignature<TextDocument, void>;
	didClose?: NextSignature<TextDocument, void>;

	handleDiagnostics?: (this: void, uri: Uri, diagnostics: VDiagnostic[], next: HandleDiagnosticsSignature) => void;
	handleWorkDoneProgress?: (this: void, token: ProgressToken, params: WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd, next: HandleWorkDoneProgressSignature) => void;
	provideCompletionItem?: (this: void, document: TextDocument, position: VPosition, context: VCompletionContext, token: CancellationToken, next: ProvideCompletionItemsSignature) => ProviderResult<VCompletionItem[] | VCompletionList>;
	resolveCompletionItem?: (this: void, item: VCompletionItem, token: CancellationToken, next: ResolveCompletionItemSignature) => ProviderResult<VCompletionItem>;
	provideHover?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideHoverSignature) => ProviderResult<VHover>;
	provideSignatureHelp?: (this: void, document: TextDocument, position: VPosition, context: VSignatureHelpContext, token: CancellationToken, next: ProvideSignatureHelpSignature) => ProviderResult<VSignatureHelp>;
	provideDefinition?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideDefinitionSignature) => ProviderResult<VDefinition | VDefinitionLink[]>;
	provideReferences?: (this: void, document: TextDocument, position: VPosition, options: { includeDeclaration: boolean; }, token: CancellationToken, next: ProvideReferencesSignature) => ProviderResult<VLocation[]>;
	provideDocumentHighlights?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideDocumentHighlightsSignature) => ProviderResult<VDocumentHighlight[]>;
	provideDocumentSymbols?: (this: void, document: TextDocument, token: CancellationToken, next: ProvideDocumentSymbolsSignature) => ProviderResult<VSymbolInformation[] | VDocumentSymbol[]>;
	provideWorkspaceSymbols?: (this: void, query: string, token: CancellationToken, next: ProvideWorkspaceSymbolsSignature) => ProviderResult<VSymbolInformation[]>;
	provideCodeActions?: (this: void, document: TextDocument, range: VRange, context: VCodeActionContext, token: CancellationToken, next: ProvideCodeActionsSignature) => ProviderResult<(VCommand | VCodeAction)[]>;
	resolveCodeAction?: (this: void, item:  VCodeAction, token: CancellationToken, next: ResolveCodeActionSignature) => ProviderResult<VCodeAction>;
	provideCodeLenses?: (this: void, document: TextDocument, token: CancellationToken, next: ProvideCodeLensesSignature) => ProviderResult<VCodeLens[]>;
	resolveCodeLens?: (this: void, codeLens: VCodeLens, token: CancellationToken, next: ResolveCodeLensSignature) => ProviderResult<VCodeLens>;
	provideDocumentFormattingEdits?: (this: void, document: TextDocument, options: VFormattingOptions, token: CancellationToken, next: ProvideDocumentFormattingEditsSignature) => ProviderResult<VTextEdit[]>;
	provideDocumentRangeFormattingEdits?: (this: void, document: TextDocument, range: VRange, options: VFormattingOptions, token: CancellationToken, next: ProvideDocumentRangeFormattingEditsSignature) => ProviderResult<VTextEdit[]>;
	provideOnTypeFormattingEdits?: (this: void, document: TextDocument, position: VPosition, ch: string, options: VFormattingOptions, token: CancellationToken, next: ProvideOnTypeFormattingEditsSignature) => ProviderResult<VTextEdit[]>;
	provideRenameEdits?: (this: void, document: TextDocument, position: VPosition, newName: string, token: CancellationToken, next: ProvideRenameEditsSignature) => ProviderResult<VWorkspaceEdit>;
	prepareRename?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: PrepareRenameSignature) => ProviderResult<VRange | { range: VRange, placeholder: string }>;
	provideDocumentLinks?: (this: void, document: TextDocument, token: CancellationToken, next: ProvideDocumentLinksSignature) => ProviderResult<VDocumentLink[]>;
	resolveDocumentLink?: (this: void, link: VDocumentLink, token: CancellationToken, next: ResolveDocumentLinkSignature) => ProviderResult<VDocumentLink>;
	executeCommand?: (this: void, command: string, args: any[], next: ExecuteCommandSignature) => ProviderResult<any>;
	workspace?: WorkspaceMiddleware;
	window?: WindowMiddleware;
}

export type Middleware = _Middleware & TypeDefinitionMiddleware & ImplementationMiddleware & ColorProviderMiddleware &
	FoldingRangeProviderMiddleware & DeclarationMiddleware & SelectionRangeProviderMiddleware & CallHierarchyMiddleware & SemanticTokensMiddleware &
	LinkedEditingRangeMiddleware;

export interface LanguageClientOptions {
	documentSelector?: DocumentSelector | string[];
	synchronize?: SynchronizeOptions;
	diagnosticCollectionName?: string;
	outputChannel?: OutputChannel;
	outputChannelName?: string;
	traceOutputChannel?: OutputChannel;
	revealOutputChannelOn?: RevealOutputChannelOn;
	/**
	 * The encoding use to read stdout and stderr. Defaults
	 * to 'utf8' if omitted.
	 */
	stdioEncoding?: string;
	initializationOptions?: any | (() => any);
	initializationFailedHandler?: InitializationFailedHandler;
	progressOnInitialization?: boolean;
	errorHandler?: ErrorHandler;
	middleware?: Middleware;
	uriConverters?: {
		code2Protocol: c2p.URIConverter,
		protocol2Code: p2c.URIConverter
	};
	workspaceFolder?: VWorkspaceFolder;
	connectionOptions?: ConnectionOptions;
	markdown?: {
		isTrusted?: boolean;
	}
}

interface ResolvedClientOptions {
	documentSelector?: DocumentSelector;
	synchronize: SynchronizeOptions;
	diagnosticCollectionName?: string;
	outputChannelName: string;
	revealOutputChannelOn: RevealOutputChannelOn;
	stdioEncoding: string;
	initializationOptions?: any | (() => any);
	initializationFailedHandler?: InitializationFailedHandler;
	progressOnInitialization: boolean;
	errorHandler: ErrorHandler;
	middleware: Middleware;
	uriConverters?: {
		code2Protocol: c2p.URIConverter,
		protocol2Code: p2c.URIConverter
	};
	workspaceFolder?: VWorkspaceFolder;
	connectionOptions?: ConnectionOptions;
	markdown: {
		isTrusted: boolean;
	}
}

export enum State {
	Stopped = 1,
	Starting = 3,
	Running = 2
}

export interface StateChangeEvent {
	oldState: State;
	newState: State;
}

enum ClientState {
	Initial,
	Starting,
	StartFailed,
	Running,
	Stopping,
	Stopped
}

const SupportedSymbolKinds: SymbolKind[] = [
	SymbolKind.File,
	SymbolKind.Module,
	SymbolKind.Namespace,
	SymbolKind.Package,
	SymbolKind.Class,
	SymbolKind.Method,
	SymbolKind.Property,
	SymbolKind.Field,
	SymbolKind.Constructor,
	SymbolKind.Enum,
	SymbolKind.Interface,
	SymbolKind.Function,
	SymbolKind.Variable,
	SymbolKind.Constant,
	SymbolKind.String,
	SymbolKind.Number,
	SymbolKind.Boolean,
	SymbolKind.Array,
	SymbolKind.Object,
	SymbolKind.Key,
	SymbolKind.Null,
	SymbolKind.EnumMember,
	SymbolKind.Struct,
	SymbolKind.Event,
	SymbolKind.Operator,
	SymbolKind.TypeParameter
];

const SupportedCompletionItemKinds: CompletionItemKind[] = [
	CompletionItemKind.Text,
	CompletionItemKind.Method,
	CompletionItemKind.Function,
	CompletionItemKind.Constructor,
	CompletionItemKind.Field,
	CompletionItemKind.Variable,
	CompletionItemKind.Class,
	CompletionItemKind.Interface,
	CompletionItemKind.Module,
	CompletionItemKind.Property,
	CompletionItemKind.Unit,
	CompletionItemKind.Value,
	CompletionItemKind.Enum,
	CompletionItemKind.Keyword,
	CompletionItemKind.Snippet,
	CompletionItemKind.Color,
	CompletionItemKind.File,
	CompletionItemKind.Reference,
	CompletionItemKind.Folder,
	CompletionItemKind.EnumMember,
	CompletionItemKind.Constant,
	CompletionItemKind.Struct,
	CompletionItemKind.Event,
	CompletionItemKind.Operator,
	CompletionItemKind.TypeParameter
];

const SupportedSymbolTags: SymbolTag[] = [
	SymbolTag.Deprecated
];

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === undefined) {
		target[key] = {} as any;
	}
	return target[key];
}

interface ResolvedTextDocumentSyncCapabilities {
	resolvedTextDocumentSync?: TextDocumentSyncOptions;
}

export interface RegistrationData<T> {
	id: string;
	registerOptions: T;
}

/**
 * A static feature. A static feature can't be dynamically activate via the
 * server. It is wired during the initialize sequence.
 */
export interface StaticFeature {
	/**
	 * Called to fill the initialize params.
	 *
	 * @params the initialize params.
	 */
	fillInitializeParams?: (params: InitializeParams) => void;

	/**
	 * Called to fill in the client capabilities this feature implements.
	 *
	 * @param capabilities The client capabilities to fill.
	 */
	fillClientCapabilities(capabilities: ClientCapabilities): void;

	/**
	 * Initialize the feature. This method is called on a feature instance
	 * when the client has successfully received the initialize request from
	 * the server and before the client sends the initialized notification
	 * to the server.
	 *
	 * @param capabilities the server capabilities
	 * @param documentSelector the document selector pass to the client's constructor.
	 *  May be `undefined` if the client was created without a selector.
	 */
	initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void;

	/**
	 * Called when the client is stopped to dispose this feature. Usually a feature
	 * un-registers listeners registered hooked up with the VS Code extension host.
	 */
	dispose(): void;
}

export interface DynamicFeature<RO> {

	/**
	 * Called to fill the initialize params.
	 *
	 * @params the initialize params.
	 */
	fillInitializeParams?: (params: InitializeParams) => void;

	/**
	 * Called to fill in the client capabilities this feature implements.
	 *
	 * @param capabilities The client capabilities to fill.
	 */
	fillClientCapabilities(capabilities: ClientCapabilities): void;

	/**
	 * Initialize the feature. This method is called on a feature instance
	 * when the client has successfully received the initialize request from
	 * the server and before the client sends the initialized notification
	 * to the server.
	 *
	 * @param capabilities the server capabilities.
	 * @param documentSelector the document selector pass to the client's constructor.
	 *  May be `undefined` if the client was created without a selector.
	 */
	initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void;

	/**
	 * The signature (e.g. method) for which this features support dynamic activation / registration.
	 */
	registrationType: RegistrationType<RO>;

	/**
	 * Is called when the server send a register request for the given message.
	 *
	 * @param data additional registration data as defined in the protocol.
	 */
	register(data: RegistrationData<RO>): void;

	/**
	 * Is called when the server wants to unregister a feature.
	 *
	 * @param id the id used when registering the feature.
	 */
	unregister(id: string): void;

	/**
	 * Called when the client is stopped to dispose this feature. Usually a feature
	 * un-registers listeners registered hooked up with the VS Code extension host.
	 */
	dispose(): void;
}

export interface NotificationFeature<T extends Function> {
	/**
	 * Triggers the corresponding RPC method.
	 */
	getProvider(document: TextDocument): { send: T } | undefined;
}

namespace DynamicFeature {
	export function is<T>(value: any): value is DynamicFeature<T> {
		let candidate: DynamicFeature<T> = value;
		return candidate && Is.func(candidate.register) && Is.func(candidate.unregister) && Is.func(candidate.dispose) && candidate.registrationType !== undefined;
	}
}

interface CreateParamsSignature<E, P> {
	(data: E): P;
}

abstract class DocumentNotifications<P, E> implements DynamicFeature<TextDocumentRegistrationOptions>, NotificationFeature<(data: E) => void> {

	private _listener: Disposable | undefined;
	protected _selectors: Map<string, DocumentSelector> = new Map<string, DocumentSelector>();

	public static textDocumentFilter(selectors: IterableIterator<DocumentSelector>, textDocument: TextDocument): boolean {
		for (const selector of selectors) {
			if (Languages.match(selector, textDocument)) {
				return true;
			}
		}
		return false;
	}

	constructor(
		protected _client: BaseLanguageClient, private _event: Event<E>,
		protected _type: ProtocolNotificationType<P, TextDocumentRegistrationOptions>,
		protected _middleware: NextSignature<E, void> | undefined,
		protected _createParams: CreateParamsSignature<E, P>,
		protected _selectorFilter?: (selectors: IterableIterator<DocumentSelector>, data: E) => boolean) {
	}

	public abstract registrationType: RegistrationType<TextDocumentRegistrationOptions>;

	public abstract fillClientCapabilities(capabilities: ClientCapabilities): void;

	public abstract initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void;

	public register(data: RegistrationData<TextDocumentRegistrationOptions>): void {

		if (!data.registerOptions.documentSelector) {
			return;
		}
		if (!this._listener) {
			this._listener = this._event(this.callback, this);
		}
		this._selectors.set(data.id, data.registerOptions.documentSelector);
	}

	private callback(data: E): void {
		if (!this._selectorFilter || this._selectorFilter(this._selectors.values(), data)) {
			if (this._middleware) {
				this._middleware(data, (data) => this._client.sendNotification(this._type, this._createParams(data)));
			} else {
				this._client.sendNotification(this._type, this._createParams(data));
			}
			this.notificationSent(data);
		}
	}

	protected notificationSent(_data: E): void {
	}

	public unregister(id: string): void {
		this._selectors.delete(id);
		if (this._selectors.size === 0 && this._listener) {
			this._listener.dispose();
			this._listener = undefined;
		}
	}

	public dispose(): void {
		this._selectors.clear();
		if (this._listener) {
			this._listener.dispose();
			this._listener = undefined;
		}
	}

	public getProvider(document: TextDocument):  { send: (data: E) => void } | undefined {
		for (const selector of this._selectors.values()) {
			if (Languages.match(selector, document)) {
				return {
					send: (data: E) => {
						this.callback(data);
					}
				};
			}
		}
		return undefined;
	}
}

class DidOpenTextDocumentFeature extends DocumentNotifications<DidOpenTextDocumentParams, TextDocument> {
	constructor(client: BaseLanguageClient, private _syncedDocuments: Map<string, TextDocument>) {
		super(
			client, Workspace.onDidOpenTextDocument, DidOpenTextDocumentNotification.type,
			client.clientOptions.middleware!.didOpen,
			(textDocument) => client.code2ProtocolConverter.asOpenTextDocumentParams(textDocument),
			DocumentNotifications.textDocumentFilter
		);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
		if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.openClose) {
			this.register({ id: UUID.generateUuid(), registerOptions: { documentSelector: documentSelector } });
		}
	}

	public get registrationType(): RegistrationType<TextDocumentRegistrationOptions> {
		return DidOpenTextDocumentNotification.type;
	}

	public register(data: RegistrationData<TextDocumentRegistrationOptions>): void {
		super.register(data);
		if (!data.registerOptions.documentSelector) {
			return;
		}
		let documentSelector = data.registerOptions.documentSelector;
		Workspace.textDocuments.forEach((textDocument) => {
			let uri: string = textDocument.uri.toString();
			if (this._syncedDocuments.has(uri)) {
				return;
			}
			if (Languages.match(documentSelector, textDocument)) {
				let middleware = this._client.clientOptions.middleware!;
				let didOpen = (textDocument: TextDocument) => {
					this._client.sendNotification(this._type, this._createParams(textDocument));
				};
				if (middleware.didOpen) {
					middleware.didOpen(textDocument, didOpen);
				} else {
					didOpen(textDocument);
				}
				this._syncedDocuments.set(uri, textDocument);
			}
		});
	}

	protected notificationSent(textDocument: TextDocument): void {
		super.notificationSent(textDocument);
		this._syncedDocuments.set(textDocument.uri.toString(), textDocument);
	}
}

class DidCloseTextDocumentFeature extends DocumentNotifications<DidCloseTextDocumentParams, TextDocument> {

	constructor(client: BaseLanguageClient, private _syncedDocuments: Map<string, TextDocument>) {
		super(
			client, Workspace.onDidCloseTextDocument, DidCloseTextDocumentNotification.type,
			client.clientOptions.middleware!.didClose,
			(textDocument) => client.code2ProtocolConverter.asCloseTextDocumentParams(textDocument),
			DocumentNotifications.textDocumentFilter
		);
	}

	public get registrationType(): RegistrationType<TextDocumentRegistrationOptions> {
		return DidCloseTextDocumentNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
		if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.openClose) {
			this.register({ id: UUID.generateUuid(), registerOptions: { documentSelector: documentSelector } });
		}
	}

	protected notificationSent(textDocument: TextDocument): void {
		super.notificationSent(textDocument);
		this._syncedDocuments.delete(textDocument.uri.toString());
	}

	public unregister(id: string): void {
		let selector = this._selectors.get(id)!;
		// The super call removed the selector from the map
		// of selectors.
		super.unregister(id);
		let selectors = this._selectors.values();
		this._syncedDocuments.forEach((textDocument) => {
			if (Languages.match(selector, textDocument) && !this._selectorFilter!(selectors, textDocument)) {
				let middleware = this._client.clientOptions.middleware!;
				let didClose = (textDocument: TextDocument) => {
					this._client.sendNotification(this._type, this._createParams(textDocument));
				};
				this._syncedDocuments.delete(textDocument.uri.toString());
				if (middleware.didClose) {
					middleware.didClose(textDocument, didClose);
				} else {
					didClose(textDocument);
				}
			}
		});
	}
}

interface DidChangeTextDocumentData {
	documentSelector: DocumentSelector;
	syncKind: 0 | 1 | 2;
}

class DidChangeTextDocumentFeature implements DynamicFeature<TextDocumentChangeRegistrationOptions>, NotificationFeature<(event: TextDocumentChangeEvent) => void> {

	private _listener: Disposable | undefined;
	private _changeData: Map<string, DidChangeTextDocumentData> = new Map<string, DidChangeTextDocumentData>();
	private _forcingDelivery: boolean = false;
	private _changeDelayer: { uri: string; delayer: Delayer<void> } | undefined;

	constructor(private _client: BaseLanguageClient) {
	}

	public get registrationType(): RegistrationType<TextDocumentChangeRegistrationOptions> {
		return DidChangeTextDocumentNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
		if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.change !== undefined && textDocumentSyncOptions.change !== TextDocumentSyncKind.None) {
			this.register({
				id: UUID.generateUuid(),
				registerOptions: Object.assign({}, { documentSelector: documentSelector }, { syncKind: textDocumentSyncOptions.change })
			});
		}
	}

	public register(data: RegistrationData<TextDocumentChangeRegistrationOptions>): void {
		if (!data.registerOptions.documentSelector) {
			return;
		}
		if (!this._listener) {
			this._listener = Workspace.onDidChangeTextDocument(this.callback, this);
		}
		this._changeData.set(
			data.id,
			{
				documentSelector: data.registerOptions.documentSelector,
				syncKind: data.registerOptions.syncKind
			}
		);
	}

	private callback(event: TextDocumentChangeEvent): void {
		// Text document changes are send for dirty changes as well. We don't
		// have dirty / un-dirty events in the LSP so we ignore content changes
		// with length zero.
		if (event.contentChanges.length === 0) {
			return;
		}
		for (const changeData of this._changeData.values()) {
			if (Languages.match(changeData.documentSelector, event.document)) {
				let middleware = this._client.clientOptions.middleware!;
				if (changeData.syncKind === TextDocumentSyncKind.Incremental) {
					let params = this._client.code2ProtocolConverter.asChangeTextDocumentParams(event);
					if (middleware.didChange) {
						middleware.didChange(event, () => this._client.sendNotification(DidChangeTextDocumentNotification.type, params));
					} else {
						this._client.sendNotification(DidChangeTextDocumentNotification.type, params);
					}
				} else if (changeData.syncKind === TextDocumentSyncKind.Full) {
					let didChange: (event: TextDocumentChangeEvent) => void = (event) => {
						if (this._changeDelayer) {
							if (this._changeDelayer.uri !== event.document.uri.toString()) {
								// Use this force delivery to track boolean state. Otherwise we might call two times.
								this.forceDelivery();
								this._changeDelayer.uri = event.document.uri.toString();
							}
							this._changeDelayer.delayer.trigger(() => {
								this._client.sendNotification(DidChangeTextDocumentNotification.type, this._client.code2ProtocolConverter.asChangeTextDocumentParams(event.document));
							});
						} else {
							this._changeDelayer = {
								uri: event.document.uri.toString(),
								delayer: new Delayer<void>(200)
							};
							this._changeDelayer.delayer.trigger(() => {
								this._client.sendNotification(DidChangeTextDocumentNotification.type, this._client.code2ProtocolConverter.asChangeTextDocumentParams(event.document));
							}, -1);
						}
					};
					if (middleware.didChange) {
						middleware.didChange(event, didChange);
					} else {
						didChange(event);
					}
				}
			}
		}
	}

	public unregister(id: string): void {
		this._changeData.delete(id);
		if (this._changeData.size === 0 && this._listener) {
			this._listener.dispose();
			this._listener = undefined;
		}
	}

	public dispose(): void {
		this._changeDelayer = undefined;
		this._forcingDelivery = false;
		this._changeData.clear();
		if (this._listener) {
			this._listener.dispose();
			this._listener = undefined;
		}
	}

	public forceDelivery() {
		if (this._forcingDelivery || !this._changeDelayer) {
			return;
		}
		try {
			this._forcingDelivery = true;
			this._changeDelayer.delayer.forceDelivery();
		} finally {
			this._forcingDelivery = false;
		}
	}

	public getProvider(document: TextDocument): { send: (event: TextDocumentChangeEvent) => void } | undefined {
		for (const changeData of this._changeData.values()) {
			if (Languages.match(changeData.documentSelector, document)) {
				return {
					send: (event: TextDocumentChangeEvent): void => {
						this.callback(event);
					}
				};
			}
		}
		return undefined;
	}
}


class WillSaveFeature extends DocumentNotifications<WillSaveTextDocumentParams, TextDocumentWillSaveEvent> {

	constructor(client: BaseLanguageClient) {
		super(
			client, Workspace.onWillSaveTextDocument, WillSaveTextDocumentNotification.type,
			client.clientOptions.middleware!.willSave,
			(willSaveEvent) => client.code2ProtocolConverter.asWillSaveTextDocumentParams(willSaveEvent),
			(selectors, willSaveEvent) => DocumentNotifications.textDocumentFilter(selectors, willSaveEvent.document)
		);
	}

	public get registrationType(): RegistrationType<TextDocumentRegistrationOptions> {
		return WillSaveTextDocumentNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let value = ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!;
		value.willSave = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
		if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.willSave) {
			this.register({
				id: UUID.generateUuid(),
				registerOptions: { documentSelector: documentSelector }
			});
		}
	}
}

class WillSaveWaitUntilFeature implements DynamicFeature<TextDocumentRegistrationOptions> {

	private _listener: Disposable | undefined;
	private _selectors: Map<string, DocumentSelector> = new Map<string, DocumentSelector>();

	constructor(private _client: BaseLanguageClient) {
	}

	public get registrationType(): RegistrationType<TextDocumentRegistrationOptions> {
		return WillSaveTextDocumentWaitUntilRequest.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let value = ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!;
		value.willSaveWaitUntil = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
		if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.willSaveWaitUntil) {
			this.register({
				id: UUID.generateUuid(),
				registerOptions: { documentSelector: documentSelector }
			});
		}
	}

	public register(data: RegistrationData<TextDocumentRegistrationOptions>): void {
		if (!data.registerOptions.documentSelector) {
			return;
		}
		if (!this._listener) {
			this._listener = Workspace.onWillSaveTextDocument(this.callback, this);
		}
		this._selectors.set(data.id, data.registerOptions.documentSelector);
	}

	private callback(event: TextDocumentWillSaveEvent): void {
		if (DocumentNotifications.textDocumentFilter(this._selectors.values(), event.document)) {
			let middleware = this._client.clientOptions.middleware!;
			let willSaveWaitUntil = (event: TextDocumentWillSaveEvent): Thenable<VTextEdit[]> => {
				return this._client.sendRequest(WillSaveTextDocumentWaitUntilRequest.type,
					this._client.code2ProtocolConverter.asWillSaveTextDocumentParams(event)).then((edits) => {
					let vEdits = this._client.protocol2CodeConverter.asTextEdits(edits);
					return vEdits === undefined ? [] : vEdits;
				});
			};
			event.waitUntil(
				middleware.willSaveWaitUntil
					? middleware.willSaveWaitUntil(event, willSaveWaitUntil)
					: willSaveWaitUntil(event)
			);
		}
	}

	public unregister(id: string): void {
		this._selectors.delete(id);
		if (this._selectors.size === 0 && this._listener) {
			this._listener.dispose();
			this._listener = undefined;
		}
	}

	public dispose(): void {
		this._selectors.clear();
		if (this._listener) {
			this._listener.dispose();
			this._listener = undefined;
		}
	}
}

class DidSaveTextDocumentFeature extends DocumentNotifications<DidSaveTextDocumentParams, TextDocument> {

	private _includeText: boolean;

	constructor(client: BaseLanguageClient) {
		super(
			client, Workspace.onDidSaveTextDocument, DidSaveTextDocumentNotification.type,
			client.clientOptions.middleware!.didSave,
			(textDocument) => client.code2ProtocolConverter.asSaveTextDocumentParams(textDocument, this._includeText),
			DocumentNotifications.textDocumentFilter
		);
		this._includeText = false;
	}

	public get registrationType(): RegistrationType<TextDocumentSaveRegistrationOptions> {
		return DidSaveTextDocumentNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!.didSave = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
		if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.save) {
			const saveOptions: SaveOptions = typeof textDocumentSyncOptions.save === 'boolean'
				? { includeText: false }
				: { includeText: !!textDocumentSyncOptions.save.includeText };
			this.register({
				id: UUID.generateUuid(),
				registerOptions: Object.assign({}, { documentSelector: documentSelector }, saveOptions)
			});
		}
	}

	public register(data: RegistrationData<TextDocumentSaveRegistrationOptions>): void {
		this._includeText = !!data.registerOptions.includeText;
		super.register(data);
	}
}

class FileSystemWatcherFeature implements DynamicFeature<DidChangeWatchedFilesRegistrationOptions> {

	private _watchers: Map<string, Disposable[]> = new Map<string, Disposable[]>();

	constructor(private _client: BaseLanguageClient, private _notifyFileEvent: (event: FileEvent) => void) {
	}

	public get registrationType(): RegistrationType<DidChangeWatchedFilesRegistrationOptions> {
		return DidChangeWatchedFilesNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'workspace')!, 'didChangeWatchedFiles')!.dynamicRegistration = true;
	}

	public initialize(_capabilities: ServerCapabilities, _documentSelector: DocumentSelector): void {
	}

	public register(data: RegistrationData<DidChangeWatchedFilesRegistrationOptions>): void {
		if (!Array.isArray(data.registerOptions.watchers)) {
			return;
		}
		let disposables: Disposable[] = [];
		for (let watcher of data.registerOptions.watchers) {
			if (!Is.string(watcher.globPattern)) {
				continue;
			}
			let watchCreate: boolean = true, watchChange: boolean = true, watchDelete: boolean = true;
			if (watcher.kind !== undefined && watcher.kind !== null) {
				watchCreate = (watcher.kind & WatchKind.Create) !== 0;
				watchChange = (watcher.kind & WatchKind.Change) !== 0;
				watchDelete = (watcher.kind & WatchKind.Delete) !== 0;
			}
			let fileSystemWatcher: VFileSystemWatcher = Workspace.createFileSystemWatcher(watcher.globPattern, !watchCreate, !watchChange, !watchDelete);
			this.hookListeners(fileSystemWatcher, watchCreate, watchChange, watchDelete);
			disposables.push(fileSystemWatcher);
		}
		this._watchers.set(data.id, disposables);
	}

	public registerRaw(id: string, fileSystemWatchers: VFileSystemWatcher[]) {
		let disposables: Disposable[] = [];
		for (let fileSystemWatcher of fileSystemWatchers) {
			this.hookListeners(fileSystemWatcher, true, true, true, disposables);
		}
		this._watchers.set(id, disposables);
	}

	private hookListeners(fileSystemWatcher: VFileSystemWatcher, watchCreate: boolean, watchChange: boolean, watchDelete: boolean, listeners?: Disposable[]): void {
		if (watchCreate) {
			fileSystemWatcher.onDidCreate((resource) => this._notifyFileEvent(
				{
					uri: this._client.code2ProtocolConverter.asUri(resource),
					type: FileChangeType.Created
				}
			), null, listeners);
		}
		if (watchChange) {
			fileSystemWatcher.onDidChange((resource) => this._notifyFileEvent(
				{
					uri: this._client.code2ProtocolConverter.asUri(resource),
					type: FileChangeType.Changed
				}
			), null, listeners);
		}
		if (watchDelete) {
			fileSystemWatcher.onDidDelete((resource) => this._notifyFileEvent(
				{
					uri: this._client.code2ProtocolConverter.asUri(resource),
					type: FileChangeType.Deleted
				}
			), null, listeners);
		}
	}

	public unregister(id: string): void {
		let disposables = this._watchers.get(id);
		if (disposables) {
			for (let disposable of disposables) {
				disposable.dispose();
			}
		}
	}

	public dispose(): void {
		this._watchers.forEach((disposables) => {
			for (let disposable of disposables) {
				disposable.dispose();
			}
		});
		this._watchers.clear();
	}
}

interface TextDocumentFeatureRegistration<RO, PR> {
	disposable: Disposable;
	data: RegistrationData<RO>;
	provider: PR;
}

export interface TextDocumentProviderFeature<T> {
	/**
	 * Triggers the corresponding RPC method.
	 */
	getProvider(textDocument: TextDocument): T | undefined;
}

export abstract class TextDocumentFeature<PO, RO extends TextDocumentRegistrationOptions & PO, PR> implements DynamicFeature<RO> {

	private _registrations: Map<string, TextDocumentFeatureRegistration<RO, PR>> = new Map();

	constructor(protected _client: BaseLanguageClient, private _registrationType: RegistrationType<RO>) {
	}

	public get registrationType():  RegistrationType<RO> {
		return this._registrationType;
	}

	public abstract fillClientCapabilities(capabilities: ClientCapabilities): void;

	public abstract initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void;

	public register(data: RegistrationData<RO>): void {
		if (!data.registerOptions.documentSelector) {
			return;
		}
		let registration = this.registerLanguageProvider(data.registerOptions);
		this._registrations.set(data.id, { disposable: registration[0], data, provider: registration[1] });
	}

	protected abstract registerLanguageProvider(options: RO): [Disposable, PR];

	public unregister(id: string): void {
		let registration = this._registrations.get(id);
		if (registration !== undefined) {
			registration.disposable.dispose();
		}
	}

	public dispose(): void {
		this._registrations.forEach((value) => {
			value.disposable.dispose();
		});
		this._registrations.clear();
	}

	protected getRegistration(documentSelector: DocumentSelector | undefined, capability: undefined | PO | (RO & StaticRegistrationOptions)): [string | undefined, (RO & { documentSelector: DocumentSelector }) | undefined] {
		if (!capability) {
			return [undefined, undefined];
		} else if (TextDocumentRegistrationOptions.is(capability)) {
			const id = StaticRegistrationOptions.hasId(capability) ? capability.id : UUID.generateUuid();
			const selector = capability.documentSelector || documentSelector;
			if (selector) {
				return [id, Object.assign({}, capability, { documentSelector: selector })];
			}
		} else if (Is.boolean(capability) && capability === true || WorkDoneProgressOptions.is(capability)) {
			if (!documentSelector) {
				return [undefined, undefined];
			}
			let options: RO & { documentSelector: DocumentSelector } = (Is.boolean(capability) && capability === true ? { documentSelector } : Object.assign({}, capability, { documentSelector })) as any;
			return [UUID.generateUuid(), options];
		}
		return [undefined, undefined];
	}

	protected getRegistrationOptions(documentSelector: DocumentSelector | undefined, capability: undefined | PO) : (RO & { documentSelector: DocumentSelector }) | undefined {
		if (!documentSelector || !capability) {
			return undefined;
		}
		return (Is.boolean(capability) && capability === true ? { documentSelector } : Object.assign({}, capability, { documentSelector })) as RO & { documentSelector: DocumentSelector };
	}

	public getProvider(textDocument: TextDocument): PR | undefined {
		for (const registration of this._registrations.values()) {
			let selector = registration.data.registerOptions.documentSelector;
			if (selector !== null && Languages.match(selector, textDocument)) {
				return registration.provider;
			}
		}
		return undefined;
	}

	protected getAllProviders(): Iterable<PR> {
		const result: PR[] = [];
		for (const item of this._registrations.values()) {
			result.push(item.provider);
		}
		return result;
	}
}

export interface WorkspaceProviderFeature<PR> {
	getProviders(): PR[] | undefined;
}

interface WorkspaceFeatureRegistration<PR> {
	disposable: Disposable;
	provider: PR;
}

abstract class WorkspaceFeature<RO, PR> implements DynamicFeature<RO> {

	protected _registrations: Map<string, WorkspaceFeatureRegistration<PR>> = new Map();

	constructor(protected _client: BaseLanguageClient, private _registrationType: RegistrationType<RO>) {
	}

	public get registrationType(): RegistrationType<RO> {
		return this._registrationType;
	}

	public abstract fillClientCapabilities(capabilities: ClientCapabilities): void;

	public abstract initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void;

	public register(data: RegistrationData<RO>): void {
		const registration = this.registerLanguageProvider(data.registerOptions);
		this._registrations.set(data.id, { disposable: registration[0], provider: registration[1] });
	}

	protected abstract registerLanguageProvider(options: RO): [Disposable, PR];

	public unregister(id: string): void {
		let registration = this._registrations.get(id);
		if (registration !== undefined) {
			registration.disposable.dispose();
		}
	}

	public dispose(): void {
		this._registrations.forEach((registration) => {
			registration.disposable.dispose();
		});
		this._registrations.clear();
	}

	public getProviders(): PR[] {
		const result: PR[] = [];
		for (const registration of this._registrations.values()) {
			result.push(registration.provider);
		}
		return result;
	}
}

export interface ProvideResolveFeature<T1 extends Function, T2 extends Function> {
	provide: T1;
	resolve: T2;
}

class CompletionItemFeature extends TextDocumentFeature<CompletionOptions, CompletionRegistrationOptions, CompletionItemProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, CompletionRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let completion = ensure(ensure(capabilities, 'textDocument')!, 'completion')!;
		completion.dynamicRegistration = true;
		completion.contextSupport = true;
		completion.completionItem = {
			snippetSupport: true,
			commitCharactersSupport: true,
			documentationFormat: [MarkupKind.Markdown, MarkupKind.PlainText],
			deprecatedSupport: true,
			preselectSupport: true,
			tagSupport: { valueSet:  [ CompletionItemTag.Deprecated ] },
			insertReplaceSupport: true,
			resolveSupport: {
				properties: ['documentation', 'detail', 'additionalTextEdits']
			},
			insertTextModeSupport: { valueSet: [InsertTextMode.asIs, InsertTextMode.adjustIndentation] }
		};
		completion.completionItemKind = { valueSet: SupportedCompletionItemKinds };
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.completionProvider);
		if (!options) {
			return;
		}
		this.register({
			id: UUID.generateUuid(),
			registerOptions: options
		});
	}

	protected registerLanguageProvider(options: CompletionRegistrationOptions): [Disposable, CompletionItemProvider] {
		const triggerCharacters = options.triggerCharacters || [];
		const provider: CompletionItemProvider = {
			provideCompletionItems: (document: TextDocument, position: VPosition, token: CancellationToken, context: VCompletionContext): ProviderResult<VCompletionList | VCompletionItem[]> => {
				const client = this._client;
				const middleware = this._client.clientOptions.middleware!;
				const provideCompletionItems: ProvideCompletionItemsSignature = (document, position, context, token) => {
					return client.sendRequest(CompletionRequest.type, client.code2ProtocolConverter.asCompletionParams(document, position, context), token).then(
						client.protocol2CodeConverter.asCompletionResult,
						(error) => {
							return client.handleFailedRequest(CompletionRequest.type, error, null);
						}
					);
				};
				return middleware.provideCompletionItem
					? middleware.provideCompletionItem(document, position, context, token, provideCompletionItems)
					: provideCompletionItems(document, position, context, token);
			},
			resolveCompletionItem: options.resolveProvider
				? (item: VCompletionItem, token: CancellationToken): ProviderResult<VCompletionItem> => {
					const client = this._client;
					const middleware = this._client.clientOptions.middleware!;
					const resolveCompletionItem: ResolveCompletionItemSignature = (item, token) => {
						return client.sendRequest(CompletionResolveRequest.type, client.code2ProtocolConverter.asCompletionItem(item), token).then(
							client.protocol2CodeConverter.asCompletionItem,
							(error) => {
								return client.handleFailedRequest(CompletionResolveRequest.type, error, item);
							}
						);
					};
					return middleware.resolveCompletionItem
						? middleware.resolveCompletionItem(item, token, resolveCompletionItem)
						: resolveCompletionItem(item, token);
				}
				: undefined
		};
		return [Languages.registerCompletionItemProvider(options.documentSelector!, provider, ...triggerCharacters), provider];
	}
}

class HoverFeature extends TextDocumentFeature<boolean | HoverOptions, HoverRegistrationOptions, HoverProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, HoverRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const hoverCapability = (ensure(ensure(capabilities, 'textDocument')!, 'hover')!);
		hoverCapability.dynamicRegistration = true;
		hoverCapability.contentFormat = [MarkupKind.Markdown, MarkupKind.PlainText];
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.hoverProvider);
		if (!options) {
			return;
		}
		this.register({
			id: UUID.generateUuid(),
			registerOptions: options
		});
	}

	protected registerLanguageProvider(options: HoverRegistrationOptions): [Disposable, HoverProvider] {
		const provider: HoverProvider = {
			provideHover: (document, position, token) => {
				const client = this._client;
				const provideHover: ProvideHoverSignature = (document, position, token) => {
					return client.sendRequest(HoverRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then(
						client.protocol2CodeConverter.asHover,
						(error) => {
							return client.handleFailedRequest(HoverRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideHover
					? middleware.provideHover(document, position, token, provideHover)
					: provideHover(document, position, token);
			}
		};
		return [Languages.registerHoverProvider(options.documentSelector!, provider), provider];
	}
}

class SignatureHelpFeature extends TextDocumentFeature<SignatureHelpOptions, SignatureHelpRegistrationOptions, VSignatureHelpProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, SignatureHelpRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let config = ensure(ensure(capabilities, 'textDocument')!, 'signatureHelp')!;
		config.dynamicRegistration = true;
		config.signatureInformation = { documentationFormat: [MarkupKind.Markdown, MarkupKind.PlainText] };
		config.signatureInformation.parameterInformation = { labelOffsetSupport: true };
		config.signatureInformation.activeParameterSupport = true;
		config.contextSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.signatureHelpProvider);
		if (!options) {
			return;
		}
		this.register({
			id: UUID.generateUuid(),
			registerOptions: options
		});
	}

	protected registerLanguageProvider(options: SignatureHelpRegistrationOptions): [Disposable, VSignatureHelpProvider] {
		const provider: VSignatureHelpProvider = {
			provideSignatureHelp: (document, position, token, context) => {
				const client = this._client;
				const providerSignatureHelp: ProvideSignatureHelpSignature = (document, position, context, token) => {
					return client.sendRequest(SignatureHelpRequest.type, client.code2ProtocolConverter.asSignatureHelpParams(document, position, context), token).then(
						client.protocol2CodeConverter.asSignatureHelp,
						(error) => {
							return client.handleFailedRequest(SignatureHelpRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideSignatureHelp
					? middleware.provideSignatureHelp(document, position, context, token, providerSignatureHelp)
					: providerSignatureHelp(document, position, context, token);
			}
		};
		let disposable: Disposable;
		if (options.retriggerCharacters === undefined) {
			const triggerCharacters = options.triggerCharacters || [];
			disposable = Languages.registerSignatureHelpProvider(options.documentSelector!, provider, ...triggerCharacters);
		} else {
			const metaData: VSignatureHelpProviderMetadata = {
				triggerCharacters: options.triggerCharacters || [],
				retriggerCharacters: options.retriggerCharacters || []
			};
			disposable = Languages.registerSignatureHelpProvider(options.documentSelector!, provider, metaData);
		}
		return [disposable, provider];
	}
}

class DefinitionFeature extends TextDocumentFeature<boolean | DefinitionOptions, DefinitionRegistrationOptions, DefinitionProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, DefinitionRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let definitionSupport = ensure(ensure(capabilities, 'textDocument')!, 'definition')!;
		definitionSupport.dynamicRegistration = true;
		definitionSupport.linkSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.definitionProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: DefinitionRegistrationOptions): [Disposable, DefinitionProvider] {
		const provider: DefinitionProvider = {
			provideDefinition:  (document, position, token) => {
				const client = this._client;
				const provideDefinition: ProvideDefinitionSignature = (document, position, token) => {
					return client.sendRequest(DefinitionRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then(
						client.protocol2CodeConverter.asDefinitionResult,
						(error) => {
							return client.handleFailedRequest(DefinitionRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideDefinition
					? middleware.provideDefinition(document, position, token, provideDefinition)
					: provideDefinition(document, position, token);
			}
		};
		return [Languages.registerDefinitionProvider(options.documentSelector!, provider), provider];
	}
}

class ReferencesFeature extends TextDocumentFeature<boolean | ReferenceOptions, ReferenceRegistrationOptions, ReferenceProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, ReferencesRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'references')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.referencesProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): [Disposable, ReferenceProvider] {
		const provider: ReferenceProvider = {
			provideReferences: (document, position, options, token) => {
				const client = this._client;
				const _providerReferences: ProvideReferencesSignature = (document, position, options, token) => {
					return client.sendRequest(ReferencesRequest.type, client.code2ProtocolConverter.asReferenceParams(document, position, options), token).then(
						client.protocol2CodeConverter.asReferences,
						(error) => {
							return client.handleFailedRequest(ReferencesRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideReferences
					? middleware.provideReferences(document, position, options, token, _providerReferences)
					: _providerReferences(document, position, options, token);
			}
		};
		return [Languages.registerReferenceProvider(options.documentSelector!, provider), provider];
	}
}

class DocumentHighlightFeature extends TextDocumentFeature<boolean | DocumentHighlightOptions, DocumentHighlightRegistrationOptions, DocumentHighlightProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, DocumentHighlightRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'documentHighlight')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.documentHighlightProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): [Disposable, DocumentHighlightProvider] {
		const provider: DocumentHighlightProvider = {
			provideDocumentHighlights: (document, position, token) => {
				const client = this._client;
				const _provideDocumentHighlights: ProvideDocumentHighlightsSignature = (document, position, token) => {
					return client.sendRequest(DocumentHighlightRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then(
						client.protocol2CodeConverter.asDocumentHighlights,
						(error) => {
							return client.handleFailedRequest(DocumentHighlightRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideDocumentHighlights
					? middleware.provideDocumentHighlights(document, position, token, _provideDocumentHighlights)
					: _provideDocumentHighlights(document, position, token);
			}
		};
		return [Languages.registerDocumentHighlightProvider(options.documentSelector!, provider), provider];
	}
}

class DocumentSymbolFeature extends TextDocumentFeature<boolean | DocumentSymbolOptions, DocumentSymbolRegistrationOptions, DocumentSymbolProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, DocumentSymbolRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let symbolCapabilities = ensure(ensure(capabilities, 'textDocument')!, 'documentSymbol')!;
		symbolCapabilities.dynamicRegistration = true;
		symbolCapabilities.symbolKind = {
			valueSet: SupportedSymbolKinds
		};
		symbolCapabilities.hierarchicalDocumentSymbolSupport = true;
		symbolCapabilities.tagSupport = {
			valueSet: SupportedSymbolTags
		};
		symbolCapabilities.labelSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.documentSymbolProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: DocumentSymbolRegistrationOptions): [Disposable, DocumentSymbolProvider] {
		const provider: DocumentSymbolProvider = {
			provideDocumentSymbols: (document, token) => {
				const client = this._client;
				const _provideDocumentSymbols: ProvideDocumentSymbolsSignature = (document, token) => {
					return client.sendRequest(DocumentSymbolRequest.type, client.code2ProtocolConverter.asDocumentSymbolParams(document), token).then(
						(data) => {
							if (data === null) {
								return undefined;
							}
							if (data.length === 0) {
								return [];
							} else {
								let element = data[0];
								if (DocumentSymbol.is(element)) {
									return client.protocol2CodeConverter.asDocumentSymbols(data as DocumentSymbol[]);
								} else {
									return client.protocol2CodeConverter.asSymbolInformations(data as SymbolInformation[]);
								}
							}
						},
						(error) => {
							return client.handleFailedRequest(DocumentSymbolRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideDocumentSymbols
					? middleware.provideDocumentSymbols(document, token, _provideDocumentSymbols)
					: _provideDocumentSymbols(document, token);
			}
		};
		const metaData: DocumentSymbolProviderMetadata | undefined = options.label !== undefined ? { label: options.label } : undefined;
		return [Languages.registerDocumentSymbolProvider(options.documentSelector!, provider, metaData), provider];
	}
}

class WorkspaceSymbolFeature extends WorkspaceFeature<WorkspaceSymbolRegistrationOptions, WorkspaceSymbolProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, WorkspaceSymbolRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let symbolCapabilities = ensure(ensure(capabilities, 'workspace')!, 'symbol')!;
		symbolCapabilities.dynamicRegistration = true;
		symbolCapabilities.symbolKind = {
			valueSet: SupportedSymbolKinds
		};
		symbolCapabilities.tagSupport = {
			valueSet: SupportedSymbolTags
		};
	}

	public initialize(capabilities: ServerCapabilities): void {
		if (!capabilities.workspaceSymbolProvider) {
			return;
		}
		this.register({
			id: UUID.generateUuid(),
			registerOptions: capabilities.workspaceSymbolProvider === true ? { workDoneProgress: false } : capabilities.workspaceSymbolProvider
		});
	}

	protected registerLanguageProvider(_options: WorkspaceSymbolRegistrationOptions): [Disposable, WorkspaceSymbolProvider] {
		const provider: WorkspaceSymbolProvider = {
			provideWorkspaceSymbols:  (query, token) => {
				const client = this._client;
				const provideWorkspaceSymbols: ProvideWorkspaceSymbolsSignature = (query, token) => {
					return client.sendRequest(WorkspaceSymbolRequest.type, { query }, token).then(
						client.protocol2CodeConverter.asSymbolInformations,
						(error) => {
							return client.handleFailedRequest(WorkspaceSymbolRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideWorkspaceSymbols
					? middleware.provideWorkspaceSymbols(query, token, provideWorkspaceSymbols)
					: provideWorkspaceSymbols(query, token);
			}
		};
		return [Languages.registerWorkspaceSymbolProvider(provider), provider];
	}
}

declare module 'vscode' {
	export interface CodeActionProvider<T extends CodeAction = CodeAction> {
		resolveCodeAction?(codeAction: T, token: CancellationToken): ProviderResult<T>;
	}
}

class CodeActionFeature extends TextDocumentFeature<boolean | CodeActionOptions, CodeActionRegistrationOptions, CodeActionProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, CodeActionRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const cap = ensure(ensure(capabilities, 'textDocument')!, 'codeAction')!;
		cap.dynamicRegistration = true;
		cap.isPreferredSupport = true;
		cap.disabledSupport = true;
		cap.dataSupport = true;
		// We can only resolve the edit property.
		cap.resolveSupport = {
			properties: ['edit']
		};
		cap.codeActionLiteralSupport = {
			codeActionKind: {
				valueSet: [
					CodeActionKind.Empty,
					CodeActionKind.QuickFix,
					CodeActionKind.Refactor,
					CodeActionKind.RefactorExtract,
					CodeActionKind.RefactorInline,
					CodeActionKind.RefactorRewrite,
					CodeActionKind.Source,
					CodeActionKind.SourceOrganizeImports
				]
			}
		};
		cap.honorsChangeAnnotations = false;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.codeActionProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: CodeActionRegistrationOptions): [Disposable, CodeActionProvider] {
		const provider: CodeActionProvider = {
			provideCodeActions: (document, range, context, token) => {
				const client = this._client;
				const _provideCodeActions: ProvideCodeActionsSignature = (document, range, context, token) => {
					const params: CodeActionParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						range: client.code2ProtocolConverter.asRange(range),
						context: client.code2ProtocolConverter.asCodeActionContext(context)
					};
					return client.sendRequest(CodeActionRequest.type, params, token).then((values) => {
						if (values === null) {
							return undefined;
						}
						const result: (VCommand | VCodeAction)[] = [];
						for (let item of values) {
							if (Command.is(item)) {
								result.push(client.protocol2CodeConverter.asCommand(item));
							} else {
								result.push(client.protocol2CodeConverter.asCodeAction(item));
							}
						}
						return result;
					},
					(error) => {
						return client.handleFailedRequest(CodeActionRequest.type, error, null);
					}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideCodeActions
					? middleware.provideCodeActions(document, range, context, token, _provideCodeActions)
					: _provideCodeActions(document, range, context, token);
			},
			resolveCodeAction: options.resolveProvider
				? (item: VCodeAction, token: CancellationToken) => {
					const client = this._client;
					const middleware = this._client.clientOptions.middleware!;
					const resolveCodeAction: ResolveCodeActionSignature = (item, token) => {
						return client.sendRequest(CodeActionResolveRequest.type, client.code2ProtocolConverter.asCodeAction(item), token).then(
							client.protocol2CodeConverter.asCodeAction,
							(error) => {
								return client.handleFailedRequest(CodeActionResolveRequest.type, error, item);
							}
						);
					};
					return middleware.resolveCodeAction
						? middleware.resolveCodeAction(item, token, resolveCodeAction)
						: resolveCodeAction(item, token);
				}
				: undefined
		};
		return [Languages.registerCodeActionsProvider(options.documentSelector!, provider,
			(options.codeActionKinds
				? { providedCodeActionKinds: this._client.protocol2CodeConverter.asCodeActionKinds(options.codeActionKinds) }
				: undefined)), provider];
	}
}

interface CodeLensProviderData {
	provider?: CodeLensProvider
	onDidChangeCodeLensEmitter: EventEmitter<void>;
}

class CodeLensFeature extends TextDocumentFeature<CodeLensOptions, CodeLensRegistrationOptions, CodeLensProviderData> {

	constructor(client: BaseLanguageClient) {
		super(client, CodeLensRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'codeLens')!.dynamicRegistration = true;
		ensure(ensure(capabilities, 'workspace')!, 'codeLens')!.refreshSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const client = this._client;
		client.onRequest(CodeLensRefreshRequest.type, async () => {
			for (const provider of this.getAllProviders()) {
				provider.onDidChangeCodeLensEmitter.fire();
			}
		});
		const options = this.getRegistrationOptions(documentSelector, capabilities.codeLensProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: CodeLensRegistrationOptions): [Disposable, CodeLensProviderData] {
		const eventEmitter: EventEmitter<void> = new EventEmitter<void>();
		const provider: CodeLensProvider = {
			onDidChangeCodeLenses: eventEmitter.event,
			provideCodeLenses: (document, token) => {
				const client = this._client;
				const provideCodeLenses: ProvideCodeLensesSignature = (document, token) => {
					return client.sendRequest(CodeLensRequest.type, client.code2ProtocolConverter.asCodeLensParams(document), token).then(
						client.protocol2CodeConverter.asCodeLenses,
						(error) => {
							return client.handleFailedRequest(CodeLensRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideCodeLenses
					? middleware.provideCodeLenses(document, token, provideCodeLenses)
					: provideCodeLenses(document, token);
			},
			resolveCodeLens: (options.resolveProvider)
				? (codeLens: VCodeLens, token: CancellationToken): ProviderResult<VCodeLens> => {
					const client = this._client;
					const resolveCodeLens: ResolveCodeLensSignature = (codeLens, token) => {
						return client.sendRequest(CodeLensResolveRequest.type, client.code2ProtocolConverter.asCodeLens(codeLens), token).then(
							client.protocol2CodeConverter.asCodeLens,
							(error) => {
								return client.handleFailedRequest(CodeLensResolveRequest.type, error, codeLens);
							}
						);
					};
					const middleware = client.clientOptions.middleware!;
					return middleware.resolveCodeLens
						? middleware.resolveCodeLens(codeLens, token, resolveCodeLens)
						: resolveCodeLens(codeLens, token);
				}
				: undefined
		};
		return [Languages.registerCodeLensProvider(options.documentSelector!, provider), { provider, onDidChangeCodeLensEmitter: eventEmitter }];
	}
}

class DocumentFormattingFeature extends TextDocumentFeature<boolean | DocumentFormattingOptions, DocumentHighlightRegistrationOptions, DocumentFormattingEditProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, DocumentFormattingRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'formatting')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.documentFormattingProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): [Disposable, DocumentFormattingEditProvider] {
		const provider: DocumentFormattingEditProvider = {
			provideDocumentFormattingEdits: (document, options, token) => {
				const client = this._client;
				const provideDocumentFormattingEdits: ProvideDocumentFormattingEditsSignature = (document, options, token) => {
					const filesConfig = Workspace.getConfiguration('files', document);
					const params: DocumentFormattingParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						options: client.code2ProtocolConverter.asFormattingOptions(options, filesConfig)
					};
					return client.sendRequest(DocumentFormattingRequest.type, params, token).then(
						client.protocol2CodeConverter.asTextEdits,
						(error) => {
							return client.handleFailedRequest(DocumentFormattingRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideDocumentFormattingEdits
					? middleware.provideDocumentFormattingEdits(document, options, token, provideDocumentFormattingEdits)
					: provideDocumentFormattingEdits(document, options, token);
			}
		};
		return [Languages.registerDocumentFormattingEditProvider(options.documentSelector!, provider), provider];
	}
}

class DocumentRangeFormattingFeature extends TextDocumentFeature<boolean | DocumentRangeFormattingOptions, DocumentRangeFormattingRegistrationOptions, DocumentRangeFormattingEditProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, DocumentRangeFormattingRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'rangeFormatting')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.documentRangeFormattingProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): [Disposable, DocumentRangeFormattingEditProvider] {
		const provider: DocumentRangeFormattingEditProvider = {
			provideDocumentRangeFormattingEdits: (document, range, options, token) => {
				const client = this._client;
				const provideDocumentRangeFormattingEdits: ProvideDocumentRangeFormattingEditsSignature = (document, range, options, token) => {
					const filesConfig = Workspace.getConfiguration('files', document);
					const params: DocumentRangeFormattingParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						range: client.code2ProtocolConverter.asRange(range),
						options: client.code2ProtocolConverter.asFormattingOptions(options, filesConfig)
					};
					return client.sendRequest(DocumentRangeFormattingRequest.type, params, token).then(
						client.protocol2CodeConverter.asTextEdits,
						(error) => {
							return client.handleFailedRequest(DocumentRangeFormattingRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideDocumentRangeFormattingEdits
					? middleware.provideDocumentRangeFormattingEdits(document, range, options, token, provideDocumentRangeFormattingEdits)
					: provideDocumentRangeFormattingEdits(document, range, options, token);
			}
		};
		return [Languages.registerDocumentRangeFormattingEditProvider(options.documentSelector!, provider), provider];
	}
}

class DocumentOnTypeFormattingFeature extends TextDocumentFeature<DocumentOnTypeFormattingOptions, DocumentOnTypeFormattingRegistrationOptions, OnTypeFormattingEditProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, DocumentOnTypeFormattingRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'onTypeFormatting')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.documentOnTypeFormattingProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: DocumentOnTypeFormattingRegistrationOptions): [Disposable, OnTypeFormattingEditProvider] {
		const provider: OnTypeFormattingEditProvider = {
			provideOnTypeFormattingEdits: (document, position, ch, options, token) => {
				const client = this._client;
				const provideOnTypeFormattingEdits: ProvideOnTypeFormattingEditsSignature = (document, position, ch, options, token) => {
					const filesConfig = Workspace.getConfiguration('files', document);
					let params: DocumentOnTypeFormattingParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						position: client.code2ProtocolConverter.asPosition(position),
						ch: ch,
						options: client.code2ProtocolConverter.asFormattingOptions(options, filesConfig)
					};
					return client.sendRequest(DocumentOnTypeFormattingRequest.type, params, token).then(
						client.protocol2CodeConverter.asTextEdits,
						(error) => {
							return client.handleFailedRequest(DocumentOnTypeFormattingRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideOnTypeFormattingEdits
					? middleware.provideOnTypeFormattingEdits(document, position, ch, options, token, provideOnTypeFormattingEdits)
					: provideOnTypeFormattingEdits(document, position, ch, options, token);
			}
		};

		const moreTriggerCharacter = options.moreTriggerCharacter || [];
		return [Languages.registerOnTypeFormattingEditProvider(options.documentSelector!, provider, options.firstTriggerCharacter, ...moreTriggerCharacter), provider];
	}
}

interface DefaultBehavior {
	defaultBehavior: boolean;
}

class RenameFeature extends TextDocumentFeature<boolean | RenameOptions, RenameRegistrationOptions, RenameProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, RenameRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let rename = ensure(ensure(capabilities, 'textDocument')!, 'rename')!;
		rename.dynamicRegistration = true;
		rename.prepareSupport = true;
		rename.prepareSupportDefaultBehavior = PrepareSupportDefaultBehavior.Identifier;
		rename.honorsChangeAnnotations = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.renameProvider);
		if (!options) {
			return;
		}
		if (Is.boolean(capabilities.renameProvider)) {
			options.prepareProvider = false;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: RenameRegistrationOptions): [Disposable, RenameProvider] {
		const provider: RenameProvider = {
			provideRenameEdits: (document, position, newName, token) => {
				const client = this._client;
				const provideRenameEdits: ProvideRenameEditsSignature = (document, position, newName, token) => {
					let params: RenameParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						position: client.code2ProtocolConverter.asPosition(position),
						newName: newName
					};
					return client.sendRequest(RenameRequest.type, params, token).then(
						client.protocol2CodeConverter.asWorkspaceEdit,
						(error: ResponseError<void>) => {
							return client.handleFailedRequest(RenameRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideRenameEdits
					? middleware.provideRenameEdits(document, position, newName, token, provideRenameEdits)
					: provideRenameEdits(document, position, newName, token);
			},
			prepareRename: options.prepareProvider
				? (document, position, token) => {
					const client = this._client;
					const prepareRename: PrepareRenameSignature = (document, position, token) => {
						let params: TextDocumentPositionParams = {
							textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
							position: client.code2ProtocolConverter.asPosition(position),
						};
						return client.sendRequest(PrepareRenameRequest.type, params, token).then((result) => {
							if (Range.is(result)) {
								return client.protocol2CodeConverter.asRange(result);
							} else if (this.isDefaultBehavior(result)) {
								return result.defaultBehavior === true
									? null
									: Promise.reject(new Error(`The element can't be renamed.`));
							} else if (result && Range.is(result.range)) {
								return {
									range: client.protocol2CodeConverter.asRange(result.range),
									placeholder: result.placeholder
								};
							}
							// To cancel the rename vscode API expects a rejected promise.
							return Promise.reject(new Error(`The element can't be renamed.`));
						},
						(error: ResponseError<void>) => {
							return client.handleFailedRequest(PrepareRenameRequest.type, error, undefined);
						}
						);
					};
					const middleware = client.clientOptions.middleware!;
					return middleware.prepareRename
						? middleware.prepareRename(document, position, token, prepareRename)
						: prepareRename(document, position, token);
				}
				: undefined
		};
		return [Languages.registerRenameProvider(options.documentSelector!, provider), provider];
	}

	private isDefaultBehavior(value: any): value is DefaultBehavior {
		const candidate: DefaultBehavior = value;
		return candidate && Is.boolean(candidate.defaultBehavior);
	}
}

class DocumentLinkFeature extends TextDocumentFeature<DocumentLinkOptions, DocumentLinkRegistrationOptions, DocumentLinkProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, DocumentLinkRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const documentLinkCapabilities = ensure(ensure(capabilities, 'textDocument')!, 'documentLink')!;
		documentLinkCapabilities.dynamicRegistration = true;
		documentLinkCapabilities.tooltipSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.documentLinkProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: DocumentLinkRegistrationOptions): [Disposable, DocumentLinkProvider] {
		const provider: DocumentLinkProvider = {
			provideDocumentLinks: (document: TextDocument, token: CancellationToken): ProviderResult<VDocumentLink[]> => {
				const client = this._client;
				const provideDocumentLinks: ProvideDocumentLinksSignature = (document, token) => {
					return client.sendRequest(DocumentLinkRequest.type, client.code2ProtocolConverter.asDocumentLinkParams(document), token).then(
						client.protocol2CodeConverter.asDocumentLinks,
						(error: ResponseError<void>) => {
							return client.handleFailedRequest(DocumentLinkRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideDocumentLinks
					? middleware.provideDocumentLinks(document, token, provideDocumentLinks)
					: provideDocumentLinks(document, token);
			},
			resolveDocumentLink: options.resolveProvider
				? (link, token) => {
					const client = this._client;
					let resolveDocumentLink: ResolveDocumentLinkSignature = (link, token) => {
						return client.sendRequest(DocumentLinkResolveRequest.type, client.code2ProtocolConverter.asDocumentLink(link), token).then(
							client.protocol2CodeConverter.asDocumentLink,
							(error: ResponseError<void>) => {
								return client.handleFailedRequest(DocumentLinkResolveRequest.type, error, link);
							}
						);
					};
					const middleware = client.clientOptions.middleware!;
					return middleware.resolveDocumentLink
						? middleware.resolveDocumentLink(link, token, resolveDocumentLink)
						: resolveDocumentLink(link, token);
				}
				: undefined
		};
		return [Languages.registerDocumentLinkProvider(options.documentSelector!, provider), provider];
	}
}

class ConfigurationFeature implements DynamicFeature<DidChangeConfigurationRegistrationOptions> {

	private _listeners: Map<string, Disposable> = new Map<string, Disposable>();

	constructor(private _client: BaseLanguageClient) {
	}

	public get registrationType(): RegistrationType<DidChangeConfigurationRegistrationOptions> {
		return DidChangeConfigurationNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'workspace')!, 'didChangeConfiguration')!.dynamicRegistration = true;
	}

	public initialize(): void {
		let section = this._client.clientOptions.synchronize!.configurationSection;
		if (section !== undefined) {
			this.register({
				id: UUID.generateUuid(),
				registerOptions: {
					section: section
				}
			});
		}
	}

	public register(data: RegistrationData<DidChangeConfigurationRegistrationOptions>): void {
		let disposable = Workspace.onDidChangeConfiguration((event) => {
			this.onDidChangeConfiguration(data.registerOptions.section, event);
		});
		this._listeners.set(data.id, disposable);
		if (data.registerOptions.section !== undefined) {
			this.onDidChangeConfiguration(data.registerOptions.section, undefined);
		}
	}

	public unregister(id: string): void {
		let disposable = this._listeners.get(id);
		if (disposable) {
			this._listeners.delete(id);
			disposable.dispose();
		}
	}

	public dispose(): void {
		for (let disposable of this._listeners.values()) {
			disposable.dispose();
		}
		this._listeners.clear();
	}

	private onDidChangeConfiguration(configurationSection: string | string[] | undefined, event: ConfigurationChangeEvent | undefined): void {
		let sections: string[] | undefined;
		if (Is.string(configurationSection)) {
			sections = [configurationSection];
		} else {
			sections = configurationSection;
		}
		if (sections !== undefined && event !== undefined) {
			let affected = sections.some((section) => event.affectsConfiguration(section));
			if (!affected) {
				return;
			}
		}
		let didChangeConfiguration = (sections: string[] | undefined): void => {
			if (sections === undefined) {
				this._client.sendNotification(DidChangeConfigurationNotification.type, { settings: null });
				return;
			}
			this._client.sendNotification(DidChangeConfigurationNotification.type, { settings: this.extractSettingsInformation(sections) });
		};
		let middleware = this.getMiddleware();
		middleware
			? middleware(sections, didChangeConfiguration)
			: didChangeConfiguration(sections);
	}

	private extractSettingsInformation(keys: string[]): any {
		function ensurePath(config: any, path: string[]): any {
			let current = config;
			for (let i = 0; i < path.length - 1; i++) {
				let obj = current[path[i]];
				if (!obj) {
					obj = Object.create(null);
					current[path[i]] = obj;
				}
				current = obj;
			}
			return current;
		}
		let resource: Uri | undefined = this._client.clientOptions.workspaceFolder
			? this._client.clientOptions.workspaceFolder.uri
			: undefined;
		let result = Object.create(null);
		for (let i = 0; i < keys.length; i++) {
			let key = keys[i];
			let index: number = key.indexOf('.');
			let config: any = null;
			if (index >= 0) {
				config = Workspace.getConfiguration(key.substr(0, index), resource).get(key.substr(index + 1));
			} else {
				config = Workspace.getConfiguration(undefined, resource).get(key);
			}
			if (config) {
				let path = keys[i].split('.');
				ensurePath(result, path)[path[path.length - 1]] = toJSONObject(config);
			}
		}
		return result;
	}

	private getMiddleware() {
		let middleware = this._client.clientOptions.middleware!;
		if (middleware.workspace && middleware.workspace.didChangeConfiguration) {
			return middleware.workspace.didChangeConfiguration;
		} else {
			return undefined;
		}
	}
}

class ExecuteCommandFeature implements DynamicFeature<ExecuteCommandRegistrationOptions> {

	private _commands: Map<string, Disposable[]> = new Map<string, Disposable[]>();

	constructor(private _client: BaseLanguageClient) {
	}

	public get registrationType(): RegistrationType<ExecuteCommandRegistrationOptions> {
		return ExecuteCommandRequest.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'workspace')!, 'executeCommand')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities): void {
		if (!capabilities.executeCommandProvider) {
			return;
		}
		this.register({
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, capabilities.executeCommandProvider)
		});
	}

	public register(data: RegistrationData<ExecuteCommandRegistrationOptions>): void {
		const client = this._client;
		const middleware = client.clientOptions.middleware!;
		const executeCommand: ExecuteCommandSignature = (command: string, args: any[]): any => {
			let params: ExecuteCommandParams = {
				command,
				arguments: args
			};
			return client.sendRequest(ExecuteCommandRequest.type, params).then(
				undefined,
				(error) => {
					return client.handleFailedRequest(ExecuteCommandRequest.type, error, undefined);
				}
			);
		};

		if (data.registerOptions.commands) {
			const disposables: Disposable[] = [];
			for (const command of data.registerOptions.commands) {
				disposables.push(Commands.registerCommand(command, (...args: any[]) => {
					return middleware.executeCommand
						? middleware.executeCommand(command, args, executeCommand)
						: executeCommand(command, args);
				}));
			}
			this._commands.set(data.id, disposables);
		}
	}

	public unregister(id: string): void {
		let disposables = this._commands.get(id);
		if (disposables) {
			disposables.forEach(disposable => disposable.dispose());
		}
	}

	public dispose(): void {
		this._commands.forEach((value) => {
			value.forEach(disposable => disposable.dispose());
		});
		this._commands.clear();
	}
}

export interface MessageTransports {
	reader: MessageReader;
	writer: MessageWriter;
	detached?: boolean;
}

export namespace MessageTransports {
	export function is(value: any): value is MessageTransports {
		let candidate: MessageTransports = value;
		return candidate && MessageReader.is(value.reader) && MessageWriter.is(value.writer);
	}
}

class OnReady {

	private _used: boolean;

	constructor(private _resolve: () => void, private _reject: (error: any) => void) {
		this._used = false;
	}

	public get isUsed(): boolean {
		return this._used;
	}

	public resolve(): void {
		this._used = true;
		this._resolve();
	}

	public reject(error: any): void {
		this._used = true;
		this._reject(error);
	}
}

export abstract class BaseLanguageClient {

	private _id: string;
	private _name: string;
	private _clientOptions: ResolvedClientOptions;

	private _state: ClientState;
	private _onReady: Promise<void>;
	private _onReadyCallbacks!: OnReady;
	private _onStop: Promise<void> | undefined;
	private _connectionPromise: Promise<Connection> | undefined;
	private _resolvedConnection: Connection | undefined;
	private _initializeResult: InitializeResult | undefined;
	private _outputChannel: OutputChannel | undefined;
	private _disposeOutputChannel: boolean;
	private _traceOutputChannel: OutputChannel | undefined;
	private _capabilities!: ServerCapabilities & ResolvedTextDocumentSyncCapabilities;

	private _listeners: Disposable[] | undefined;
	private _providers: Disposable[] | undefined;
	private _diagnostics: DiagnosticCollection | undefined;
	private _syncedDocuments: Map<string, TextDocument>;

	private _fileEvents: FileEvent[];
	private _fileEventDelayer: Delayer<void>;

	private _telemetryEmitter: Emitter<any>;
	private _stateChangeEmitter: Emitter<StateChangeEvent>;

	private _trace: Trace;
	private _traceFormat: TraceFormat = TraceFormat.Text;
	private _tracer: Tracer;

	private _c2p: c2p.Converter;
	private _p2c: p2c.Converter;

	public constructor(id: string, name: string, clientOptions: LanguageClientOptions) {
		this._id = id;
		this._name = name;

		clientOptions = clientOptions || {};

		const markdown = { isTrusted: false };
		if (clientOptions.markdown !== undefined && clientOptions.markdown.isTrusted === true) {
			markdown.isTrusted = true;
		}

		this._clientOptions = {
			documentSelector: clientOptions.documentSelector || [],
			synchronize: clientOptions.synchronize || {},
			diagnosticCollectionName: clientOptions.diagnosticCollectionName,
			outputChannelName: clientOptions.outputChannelName || this._name,
			revealOutputChannelOn: clientOptions.revealOutputChannelOn || RevealOutputChannelOn.Error,
			stdioEncoding: clientOptions.stdioEncoding || 'utf8',
			initializationOptions: clientOptions.initializationOptions,
			initializationFailedHandler: clientOptions.initializationFailedHandler,
			progressOnInitialization: !!clientOptions.progressOnInitialization,
			errorHandler: clientOptions.errorHandler || this.createDefaultErrorHandler(clientOptions.connectionOptions?.maxRestartCount),
			middleware: clientOptions.middleware || {},
			uriConverters: clientOptions.uriConverters,
			workspaceFolder: clientOptions.workspaceFolder,
			connectionOptions: clientOptions.connectionOptions,
			markdown
		};
		this._clientOptions.synchronize = this._clientOptions.synchronize || {};

		this._state = ClientState.Initial;
		this._connectionPromise = undefined;
		this._resolvedConnection = undefined;
		this._initializeResult = undefined;
		if (clientOptions.outputChannel) {
			this._outputChannel = clientOptions.outputChannel;
			this._disposeOutputChannel = false;
		} else {
			this._outputChannel = undefined;
			this._disposeOutputChannel = true;
		}
		this._traceOutputChannel = clientOptions.traceOutputChannel;
		this._listeners = undefined;
		this._providers = undefined;
		this._diagnostics = undefined;

		this._fileEvents = [];
		this._fileEventDelayer = new Delayer<void>(250);
		this._onReady = new Promise<void>((resolve, reject) => {
			this._onReadyCallbacks = new OnReady(resolve, reject);
		});
		this._onStop = undefined;
		this._telemetryEmitter = new Emitter<any>();
		this._stateChangeEmitter = new Emitter<StateChangeEvent>();
		this._trace = Trace.Off;
		this._tracer = {
			log: (messageOrDataObject: string | any, data?: string) => {
				if (Is.string(messageOrDataObject)) {
					this.logTrace(messageOrDataObject, data);
				} else {
					this.logObjectTrace(messageOrDataObject);
				}
			},
		};
		this._c2p = c2p.createConverter(clientOptions.uriConverters ? clientOptions.uriConverters.code2Protocol : undefined);
		this._p2c = p2c.createConverter(clientOptions.uriConverters ? clientOptions.uriConverters.protocol2Code : undefined, this._clientOptions.markdown.isTrusted);
		this._syncedDocuments = new Map<string, TextDocument>();
		this.registerBuiltinFeatures();
	}

	private get state(): ClientState {
		return this._state;
	}

	private set state(value: ClientState) {
		let oldState = this.getPublicState();
		this._state = value;
		let newState = this.getPublicState();
		if (newState !== oldState) {
			this._stateChangeEmitter.fire({ oldState, newState });
		}
	}

	private getPublicState(): State {
		if (this.state === ClientState.Running) {
			return State.Running;
		} else if (this.state === ClientState.Starting) {
			return State.Starting;
		} else {
			return State.Stopped;
		}
	}

	public get initializeResult(): InitializeResult | undefined {
		return this._initializeResult;
	}

	public sendRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, token?: CancellationToken): Promise<R>;
	public sendRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, params: P, token?: CancellationToken): Promise<R>;
	public sendRequest<R, E>(type: RequestType0<R, E>, token?: CancellationToken): Promise<R>;
	public sendRequest<P, R, E>(type: RequestType<P, R, E>, params: P, token?: CancellationToken): Promise<R>;
	public sendRequest<R>(method: string, token?: CancellationToken): Promise<R>;
	public sendRequest<R>(method: string, param: any, token?: CancellationToken): Promise<R>;
	public sendRequest<R>(type: string | MessageSignature, ...params: any[]): Promise<R> {
		if (!this.isConnectionActive()) {
			throw new Error('Language client is not ready yet');
		}
		this.forceDocumentSync();
		try {
			return this._resolvedConnection!.sendRequest<R>(type, ...params);
		} catch (error) {
			this.error(`Sending request ${Is.string(type) ? type : type.method} failed.`, error);
			throw error;
		}
	}

	public onRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, handler: RequestHandler0<R, E>): Disposable;
	public onRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, handler: RequestHandler<P, R, E>): Disposable;
	public onRequest<R, E>(type: RequestType0<R, E>, handler: RequestHandler0<R, E>): Disposable;
	public onRequest<P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): Disposable;
	public onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): Disposable;
	public onRequest<R, E>(type: string | MessageSignature, handler: GenericRequestHandler<R, E>): Disposable {
		if (!this.isConnectionActive()) {
			throw new Error('Language client is not ready yet');
		}
		try {
			return this._resolvedConnection!.onRequest(type, handler);
		} catch (error) {
			this.error(`Registering request handler ${Is.string(type) ? type : type.method} failed.`, error);
			throw error;
		}
	}

	public sendNotification<RO>(type: ProtocolNotificationType0<RO>): void;
	public sendNotification<P, RO>(type: ProtocolNotificationType<P, RO>, params?: P): void;
	public sendNotification(type: NotificationType0): void;
	public sendNotification<P>(type: NotificationType<P>, params?: P): void;
	public sendNotification(method: string): void;
	public sendNotification(method: string, params: any): void;
	public sendNotification<P>(type: string | MessageSignature, params?: P): void {
		if (!this.isConnectionActive()) {
			throw new Error('Language client is not ready yet');
		}
		this.forceDocumentSync();
		try {
			this._resolvedConnection!.sendNotification(type, params);
		} catch (error) {
			this.error(`Sending notification ${Is.string(type) ? type : type.method} failed.`, error);
			throw error;
		}
	}

	public onNotification<RO>(type: ProtocolNotificationType0<RO>, handler: NotificationHandler0): Disposable;
	public onNotification<P, RO>(type: ProtocolNotificationType<P, RO>, handler: NotificationHandler<P>): Disposable;
	public onNotification(type: NotificationType0, handler: NotificationHandler0): Disposable;
	public onNotification<P>(type: NotificationType<P>, handler: NotificationHandler<P>): Disposable;
	public onNotification(method: string, handler: GenericNotificationHandler): Disposable;
	public onNotification(type: string | MessageSignature, handler: GenericNotificationHandler): Disposable {
		if (!this.isConnectionActive()) {
			throw new Error('Language client is not ready yet');
		}
		try {
			return this._resolvedConnection!.onNotification(type, handler);
		} catch (error) {
			this.error(`Registering notification handler ${Is.string(type) ? type : type.method} failed.`, error);
			throw error;
		}
	}

	public onProgress<P>(type: ProgressType<P>, token: string | number, handler: NotificationHandler<P>): Disposable {
		if (!this.isConnectionActive()) {
			throw new Error('Language client is not ready yet');
		}
		try {
			if (WorkDoneProgress.is(type)) {
				const handleWorkDoneProgress = this._clientOptions.middleware!.handleWorkDoneProgress;
				if (handleWorkDoneProgress !== undefined) {
					return this._resolvedConnection!.onProgress(type, token, (params) => {
						handleWorkDoneProgress(token, params, () => handler(params as unknown as P));
					});
				}
			}

			return this._resolvedConnection!.onProgress(type, token, handler);
		} catch (error) {
			this.error(`Registering progress handler for token ${token} failed.`, error);
			throw error;
		}
	}

	public sendProgress<P>(type: ProgressType<P>, token: string | number, value: P): void {
		if (!this.isConnectionActive()) {
			throw new Error('Language client is not ready yet');
		}
		this.forceDocumentSync();
		try {
			this._resolvedConnection!.sendProgress(type, token, value);
		} catch (error) {
			this.error(`Sending progress for token ${token} failed.`, error);
			throw error;
		}
	}

	public get clientOptions(): LanguageClientOptions {
		return this._clientOptions;
	}

	public get protocol2CodeConverter(): p2c.Converter {
		return this._p2c;
	}

	public get code2ProtocolConverter(): c2p.Converter {
		return this._c2p;
	}

	public get onTelemetry(): Event<any> {
		return this._telemetryEmitter.event;
	}

	public get onDidChangeState(): Event<StateChangeEvent> {
		return this._stateChangeEmitter.event;
	}

	public get outputChannel(): OutputChannel {
		if (!this._outputChannel) {
			this._outputChannel = Window.createOutputChannel(this._clientOptions.outputChannelName ? this._clientOptions.outputChannelName : this._name);
		}
		return this._outputChannel;
	}

	public get traceOutputChannel(): OutputChannel {
		if (this._traceOutputChannel) {
			return this._traceOutputChannel;
		}
		return this.outputChannel;
	}

	public get diagnostics(): DiagnosticCollection | undefined {
		return this._diagnostics;
	}

	public createDefaultErrorHandler(maxRestartCount?: number): ErrorHandler {
		if (maxRestartCount !== undefined && maxRestartCount < 0) {
			throw new Error(`Invalid maxRestartCount: ${maxRestartCount}`);
		}
		return new DefaultErrorHandler(this._name, maxRestartCount ?? 4);
	}

	public set trace(value: Trace) {
		this._trace = value;
		this.onReady().then(() => {
			this.resolveConnection().then((connection) => {
				connection.trace(this._trace, this._tracer, {
					sendNotification: false,
					traceFormat: this._traceFormat
				});
			});
		}, () => {
		});
	}

	private data2String(data: any): string {
		if (data instanceof ResponseError) {
			const responseError = data as ResponseError<any>;
			return `  Message: ${responseError.message}\n  Code: ${responseError.code} ${responseError.data ? '\n' + responseError.data.toString() : ''}`;
		}
		if (data instanceof Error) {
			if (Is.string(data.stack)) {
				return data.stack;
			}
			return (data as Error).message;
		}
		if (Is.string(data)) {
			return data;
		}
		return data.toString();
	}

	public info(message: string, data?: any, showNotification: boolean = true): void {
		this.outputChannel.appendLine(`[Info  - ${(new Date().toLocaleTimeString())}] ${message}`);
		if (data) {
			this.outputChannel.appendLine(this.data2String(data));
		}
		if (showNotification && this._clientOptions.revealOutputChannelOn <= RevealOutputChannelOn.Info) {
			this.showNotificationMessage();
		}
	}

	public warn(message: string, data?: any, showNotification: boolean = true): void {
		this.outputChannel.appendLine(`[Warn  - ${(new Date().toLocaleTimeString())}] ${message}`);
		if (data) {
			this.outputChannel.appendLine(this.data2String(data));
		}
		if (showNotification && this._clientOptions.revealOutputChannelOn <= RevealOutputChannelOn.Warn) {
			this.showNotificationMessage();
		}
	}

	public error(message: string, data?: any, showNotification: boolean = true): void {
		this.outputChannel.appendLine(`[Error - ${(new Date().toLocaleTimeString())}] ${message}`);
		if (data) {
			this.outputChannel.appendLine(this.data2String(data));
		}
		if (showNotification && this._clientOptions.revealOutputChannelOn <= RevealOutputChannelOn.Error) {
			this.showNotificationMessage();
		}
	}

	private showNotificationMessage() {
		Window.showInformationMessage('A request has failed. See the output for more information.', 'Go to output').then(() => {
			this.outputChannel.show(true);
		});
	}

	private logTrace(message: string, data?: any): void {
		this.traceOutputChannel.appendLine(`[Trace - ${(new Date().toLocaleTimeString())}] ${message}`);
		if (data) {
			this.traceOutputChannel.appendLine(this.data2String(data));
		}
	}

	private logObjectTrace(data: any): void {
		if (data.isLSPMessage && data.type) {
			this.traceOutputChannel.append(`[LSP   - ${(new Date().toLocaleTimeString())}] `);
		} else {
			this.traceOutputChannel.append(`[Trace - ${(new Date().toLocaleTimeString())}] `);
		}
		if (data) {
			this.traceOutputChannel.appendLine(`${JSON.stringify(data)}`);
		}
	}

	public needsStart(): boolean {
		return this.state === ClientState.Initial || this.state === ClientState.Stopping || this.state === ClientState.Stopped;
	}

	public needsStop(): boolean {
		return this.state === ClientState.Starting || this.state === ClientState.Running;
	}

	public onReady(): Promise<void> {
		return this._onReady;
	}

	private isConnectionActive(): boolean {
		return this.state === ClientState.Running && !!this._resolvedConnection;
	}

	public start(): Disposable {
		if (this._onReadyCallbacks.isUsed) {
			this._onReady = new Promise((resolve, reject) => {
				this._onReadyCallbacks = new OnReady(resolve, reject);
			});
		}
		this._listeners = [];
		this._providers = [];
		// If we restart then the diagnostics collection is reused.
		if (!this._diagnostics) {
			this._diagnostics = this._clientOptions.diagnosticCollectionName
				? Languages.createDiagnosticCollection(this._clientOptions.diagnosticCollectionName)
				: Languages.createDiagnosticCollection();
		}

		this.state = ClientState.Starting;
		this.resolveConnection().then((connection) => {
			connection.onLogMessage((message) => {
				switch (message.type) {
					case MessageType.Error:
						this.error(message.message, undefined, false);
						break;
					case MessageType.Warning:
						this.warn(message.message, undefined, false);
						break;
					case MessageType.Info:
						this.info(message.message, undefined, false);
						break;
					default:
						this.outputChannel.appendLine(message.message);
				}
			});
			connection.onShowMessage((message) => {
				switch (message.type) {
					case MessageType.Error:
						Window.showErrorMessage(message.message);
						break;
					case MessageType.Warning:
						Window.showWarningMessage(message.message);
						break;
					case MessageType.Info:
						Window.showInformationMessage(message.message);
						break;
					default:
						Window.showInformationMessage(message.message);
				}
			});
			connection.onRequest(ShowMessageRequest.type, (params) => {
				let messageFunc: <T extends MessageItem>(message: string, ...items: T[]) => Thenable<T>;
				switch (params.type) {
					case MessageType.Error:
						messageFunc = Window.showErrorMessage;
						break;
					case MessageType.Warning:
						messageFunc = Window.showWarningMessage;
						break;
					case MessageType.Info:
						messageFunc = Window.showInformationMessage;
						break;
					default:
						messageFunc = Window.showInformationMessage;
				}
				let actions = params.actions || [];
				return messageFunc(params.message, ...actions);
			});
			connection.onTelemetry((data) => {
				this._telemetryEmitter.fire(data);
			});
			connection.onRequest(ShowDocumentRequest.type, async (params): Promise<ShowDocumentResult> => {
				const showDocument = async (params: ShowDocumentParams): Promise<ShowDocumentResult> => {
					const uri = this.protocol2CodeConverter.asUri(params.uri);
					try {
						if (params.external === true) {
							const success = await Env.openExternal(uri);
							return { success };
						} else {
							const options: TextDocumentShowOptions = {};
							if (params.selection !== undefined) {
								options.selection = this.protocol2CodeConverter.asRange(params.selection);
							}
							if (params.takeFocus === undefined || params.takeFocus === false) {
								options.preserveFocus = true;
							} else if (params.takeFocus === true) {
								options.preserveFocus = false;
							}
							await Window.showTextDocument(uri, options);
							return { success: true };
						}
					} catch (error) {
						return { success: true };
					}
				};
				const middleware = this._clientOptions.middleware.window?.showDocument;
				if (middleware !== undefined)  {
					return middleware(params, showDocument);
				} else {
					return showDocument(params);
				}
			});
			connection.listen();
			// Error is handled in the initialize call.
			return this.initialize(connection);
		}).then(undefined, (error) => {
			this.state = ClientState.StartFailed;
			this._onReadyCallbacks.reject(error);
			this.error('Starting client failed', error);
			Window.showErrorMessage(`Couldn't start client ${this._name}`);
		});
		return new Disposable(() => {
			if (this.needsStop()) {
				this.stop();
			}
		});
	}

	private resolveConnection(): Promise<Connection> {
		if (!this._connectionPromise) {
			this._connectionPromise = this.createConnection();
		}
		return this._connectionPromise;
	}

	private initialize(connection: Connection): Promise<InitializeResult> {
		this.refreshTrace(connection, false);
		let initOption = this._clientOptions.initializationOptions;
		let rootPath = this._clientOptions.workspaceFolder
			? this._clientOptions.workspaceFolder.uri.fsPath
			: this._clientGetRootPath();
		let initParams: InitializeParams = {
			processId: null,
			clientInfo: {
				name: env.appName,
				version: VSCodeVersion
			},
			locale: this.getLocale(),
			rootPath: rootPath ? rootPath : null,
			rootUri: rootPath ? this._c2p.asUri(Uri.file(rootPath)) : null,
			capabilities: this.computeClientCapabilities(),
			initializationOptions: Is.func(initOption) ? initOption() : initOption,
			trace: Trace.toString(this._trace),
			workspaceFolders: null
		};
		this.fillInitializeParams(initParams);
		if (this._clientOptions.progressOnInitialization) {
			const token: ProgressToken = UUID.generateUuid();
			const part: ProgressPart = new ProgressPart(connection, token);
			initParams.workDoneToken = token;
			return this.doInitialize(connection, initParams).then((result) => {
				part.done();
				return result;
			}, (error) => {
				part.cancel();
				throw error;
			});
		} else {
			return this.doInitialize(connection, initParams);
		}
	}

	private doInitialize(connection: Connection, initParams: InitializeParams): Promise<InitializeResult> {
		return connection.initialize(initParams).then((result) => {
			this._resolvedConnection = connection;
			this._initializeResult = result;
			this.state = ClientState.Running;

			let textDocumentSyncOptions: TextDocumentSyncOptions | undefined = undefined;
			if (Is.number(result.capabilities.textDocumentSync)) {
				if (result.capabilities.textDocumentSync === TextDocumentSyncKind.None) {
					textDocumentSyncOptions = {
						openClose: false,
						change: TextDocumentSyncKind.None,
						save: undefined
					};
				} else {
					textDocumentSyncOptions = {
						openClose: true,
						change: result.capabilities.textDocumentSync,
						save: {
							includeText: false
						}
					};
				}
			} else if (result.capabilities.textDocumentSync !== undefined && result.capabilities.textDocumentSync !== null) {
				textDocumentSyncOptions = result.capabilities.textDocumentSync as TextDocumentSyncOptions;
			}
			this._capabilities = Object.assign({}, result.capabilities, { resolvedTextDocumentSync: textDocumentSyncOptions });

			connection.onDiagnostics(params => this.handleDiagnostics(params));
			connection.onRequest(RegistrationRequest.type, params => this.handleRegistrationRequest(params));
			// See https://github.com/Microsoft/vscode-languageserver-node/issues/199
			connection.onRequest('client/registerFeature', params => this.handleRegistrationRequest(params));
			connection.onRequest(UnregistrationRequest.type, params => this.handleUnregistrationRequest(params));
			// See https://github.com/Microsoft/vscode-languageserver-node/issues/199
			connection.onRequest('client/unregisterFeature', params => this.handleUnregistrationRequest(params));
			connection.onRequest(ApplyWorkspaceEditRequest.type, params => this.handleApplyWorkspaceEdit(params));

			connection.sendNotification(InitializedNotification.type, {});

			this.hookFileEvents(connection);
			this.hookConfigurationChanged(connection);
			this.initializeFeatures(connection);
			this._onReadyCallbacks.resolve();
			return result;
		}).then<InitializeResult>(undefined, (error: any) => {
			if (this._clientOptions.initializationFailedHandler) {
				if (this._clientOptions.initializationFailedHandler(error)) {
					this.initialize(connection);
				} else {
					this.stop();
					this._onReadyCallbacks.reject(error);
				}
			} else if (error instanceof ResponseError && error.data && error.data.retry) {
				Window.showErrorMessage(error.message, { title: 'Retry', id: 'retry' }).then(item => {
					if (item && item.id === 'retry') {
						this.initialize(connection);
					} else {
						this.stop();
						this._onReadyCallbacks.reject(error);
					}
				});
			} else {
				if (error && error.message) {
					Window.showErrorMessage(error.message);
				}
				this.error('Server initialization failed.', error);
				this.stop();
				this._onReadyCallbacks.reject(error);
			}
			throw error;
		});
	}

	private _clientGetRootPath(): string | undefined {
		let folders = Workspace.workspaceFolders;
		if (!folders || folders.length === 0) {
			return undefined;
		}
		let folder = folders[0];
		if (folder.uri.scheme === 'file') {
			return folder.uri.fsPath;
		}
		return undefined;
	}

	public stop(): Promise<void> {
		this._initializeResult = undefined;
		if (!this._connectionPromise) {
			this.state = ClientState.Stopped;
			return Promise.resolve();
		}
		if (this.state === ClientState.Stopping && this._onStop) {
			return this._onStop;
		}
		this.state = ClientState.Stopping;
		this.cleanUp(false);
		// unhook listeners
		return this._onStop = this.resolveConnection().then(connection => {
			return connection.shutdown().then(() => {
				connection.exit();
				connection.end();
				connection.dispose();
				this.state = ClientState.Stopped;
				this.cleanUpChannel();
				this._onStop = undefined;
				this._connectionPromise = undefined;
				this._resolvedConnection = undefined;
			});
		});
	}

	private cleanUp(channel: boolean = true, diagnostics: boolean = true): void {
		if (this._listeners) {
			this._listeners.forEach(listener => listener.dispose());
			this._listeners = undefined;
		}
		if (this._providers) {
			this._providers.forEach(provider => provider.dispose());
			this._providers = undefined;
		}
		if (this._syncedDocuments) {
			this._syncedDocuments.clear();
		}
		for (const feature of this._features.values()) {
			feature.dispose();
		}
		if (channel) {
			this.cleanUpChannel();
		}
		if (diagnostics && this._diagnostics) {
			this._diagnostics.dispose();
			this._diagnostics = undefined;
		}
	}

	private cleanUpChannel(): void {
		if (this._outputChannel && this._disposeOutputChannel) {
			this._outputChannel.dispose();
			this._outputChannel = undefined;
		}
	}

	private notifyFileEvent(event: FileEvent): void {
		const client = this;
		function didChangeWatchedFile(this: void, event: FileEvent) {
			client._fileEvents.push(event);
			client._fileEventDelayer.trigger(() => {
				client.onReady().then(() => {
					client.resolveConnection().then(connection => {
						if (client.isConnectionActive()) {
							client.forceDocumentSync();
							connection.didChangeWatchedFiles({ changes: client._fileEvents });
						}
						client._fileEvents = [];
					});
				}, (error) => {
					client.error(`Notify file events failed.`, error);
				});
			});
		}
		const workSpaceMiddleware = this.clientOptions.middleware?.workspace;
		workSpaceMiddleware?.didChangeWatchedFile ? workSpaceMiddleware.didChangeWatchedFile(event, didChangeWatchedFile) : didChangeWatchedFile(event);
	}

	private _didChangeTextDocumentFeature: DidChangeTextDocumentFeature | undefined;
	private forceDocumentSync(): void {
		if (this._didChangeTextDocumentFeature === undefined) {
			this._didChangeTextDocumentFeature = this._dynamicFeatures.get(DidChangeTextDocumentNotification.type.method) as DidChangeTextDocumentFeature;
		}
		this._didChangeTextDocumentFeature.forceDelivery();
	}

	private handleDiagnostics(params: PublishDiagnosticsParams) {
		if (!this._diagnostics) {
			return;
		}
		let uri = this._p2c.asUri(params.uri);
		let diagnostics = this._p2c.asDiagnostics(params.diagnostics);
		let middleware = this.clientOptions.middleware!;
		if (middleware.handleDiagnostics) {
			middleware.handleDiagnostics(uri, diagnostics, (uri, diagnostics) => this.setDiagnostics(uri, diagnostics));
		} else {
			this.setDiagnostics(uri, diagnostics);
		}
	}

	private setDiagnostics(uri: Uri, diagnostics: VDiagnostic[] | undefined) {
		if (!this._diagnostics) {
			return;
		}
		this._diagnostics.set(uri, diagnostics);
	}

	protected abstract getLocale(): string;

	protected abstract createMessageTransports(encoding: string): Promise<MessageTransports>;

	private createConnection(): Promise<Connection> {
		let errorHandler = (error: Error, message: Message | undefined, count: number | undefined) => {
			this.handleConnectionError(error, message, count);
		};

		let closeHandler = () => {
			this.handleConnectionClosed();
		};

		return this.createMessageTransports(this._clientOptions.stdioEncoding || 'utf8').then((transports) => {
			return createConnection(transports.reader, transports.writer, errorHandler, closeHandler, this._clientOptions.connectionOptions);
		});
	}

	protected handleConnectionClosed() {
		// Check whether this is a normal shutdown in progress or the client stopped normally.
		if (this.state === ClientState.Stopping || this.state === ClientState.Stopped) {
			return;
		}
		try {
			if (this._resolvedConnection) {
				this._resolvedConnection.dispose();
			}
		} catch (error) {
			// Disposing a connection could fail if error cases.
		}
		let action = CloseAction.DoNotRestart;
		try {
			action = this._clientOptions.errorHandler!.closed();
		} catch (error) {
			// Ignore errors coming from the error handler.
		}
		this._connectionPromise = undefined;
		this._resolvedConnection = undefined;
		if (action === CloseAction.DoNotRestart) {
			this.error('Connection to server got closed. Server will not be restarted.');
			if (this.state === ClientState.Starting) {
				this._onReadyCallbacks.reject(new Error(`Connection to server got closed. Server will not be restarted.`));
				this.state = ClientState.StartFailed;
			} else {
				this.state = ClientState.Stopped;
			}
			this.cleanUp(false, true);
		} else if (action === CloseAction.Restart) {
			this.info('Connection to server got closed. Server will restart.');
			this.cleanUp(false, false);
			this.state = ClientState.Initial;
			this.start();
		}
	}

	private handleConnectionError(error: Error, message: Message | undefined, count: number | undefined) {
		let action = this._clientOptions.errorHandler!.error(error, message, count);
		if (action === ErrorAction.Shutdown) {
			this.error('Connection to server is erroring. Shutting down server.');
			this.stop();
		}
	}

	private hookConfigurationChanged(connection: Connection): void {
		Workspace.onDidChangeConfiguration(() => {
			this.refreshTrace(connection, true);
		});
	}

	private refreshTrace(connection: Connection, sendNotification: boolean = false): void {
		let config = Workspace.getConfiguration(this._id);
		let trace: Trace = Trace.Off;
		let traceFormat: TraceFormat = TraceFormat.Text;
		if (config) {
			const traceConfig = config.get('trace.server', 'off');

			if (typeof traceConfig === 'string') {
				trace = Trace.fromString(traceConfig);
			} else {
				trace = Trace.fromString(config.get('trace.server.verbosity', 'off'));
				traceFormat = TraceFormat.fromString(config.get('trace.server.format', 'text'));
			}
		}
		this._trace = trace;
		this._traceFormat = traceFormat;
		connection.trace(this._trace, this._tracer, {
			sendNotification,
			traceFormat: this._traceFormat
		});
	}


	private hookFileEvents(_connection: Connection): void {
		let fileEvents = this._clientOptions.synchronize.fileEvents;
		if (!fileEvents) {
			return;
		}
		let watchers: VFileSystemWatcher[];
		if (Is.array(fileEvents)) {
			watchers = <VFileSystemWatcher[]>fileEvents;
		} else {
			watchers = [<VFileSystemWatcher>fileEvents];
		}
		if (!watchers) {
			return;
		}
		(this._dynamicFeatures.get(DidChangeWatchedFilesNotification.type.method)! as FileSystemWatcherFeature).registerRaw(UUID.generateUuid(), watchers);
	}

	private readonly _features: (StaticFeature | DynamicFeature<any>)[] = [];
	private readonly _dynamicFeatures: Map<string, DynamicFeature<any>> = new Map<string, DynamicFeature<any>>();

	public registerFeatures(features: (StaticFeature | DynamicFeature<any>)[]): void {
		for (let feature of features) {
			this.registerFeature(feature);
		}
	}

	public registerFeature(feature: StaticFeature | DynamicFeature<any>): void {
		this._features.push(feature);
		if (DynamicFeature.is(feature)) {
			const registrationType = feature.registrationType;
			this._dynamicFeatures.set(registrationType.method, feature);
		}
	}

	public getFeature(request: typeof DidOpenTextDocumentNotification.method): DynamicFeature<TextDocumentRegistrationOptions> & NotificationFeature<(textDocument: TextDocument) => void>;
	public getFeature(request: typeof DidChangeTextDocumentNotification.method): DynamicFeature<TextDocumentRegistrationOptions> & NotificationFeature<(textDocument: TextDocument) => void>;
	public getFeature(request: typeof WillSaveTextDocumentNotification.method): DynamicFeature<TextDocumentRegistrationOptions> & NotificationFeature<(textDocument: TextDocument) => void>;
	public getFeature(request: typeof WillSaveTextDocumentWaitUntilRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & NotificationFeature<(textDocument: TextDocument) => ProviderResult<VTextEdit[]>>;
	public getFeature(request: typeof DidSaveTextDocumentNotification.method): DynamicFeature<TextDocumentRegistrationOptions> & NotificationFeature<(textDocument: TextDocument) => void>;
	public getFeature(request: typeof DidCloseTextDocumentNotification.method): DynamicFeature<TextDocumentRegistrationOptions> & NotificationFeature<(textDocument: TextDocument) => void>;
	public getFeature(request: typeof DidCreateFilesNotification.method): DynamicFeature<FileOperationRegistrationOptions> & { send: (event: FileCreateEvent) => Promise<void> };
	public getFeature(request: typeof DidRenameFilesNotification.method): DynamicFeature<FileOperationRegistrationOptions> & { send: (event: FileRenameEvent) => Promise<void> };
	public getFeature(request: typeof DidDeleteFilesNotification.method): DynamicFeature<FileOperationRegistrationOptions> & { send: (event: FileDeleteEvent) => Promise<void> };
	public getFeature(request: typeof WillCreateFilesRequest.method): DynamicFeature<FileOperationRegistrationOptions> & { send: (event: FileWillCreateEvent) => Promise<void> };
	public getFeature(request: typeof WillRenameFilesRequest.method): DynamicFeature<FileOperationRegistrationOptions> & { send: (event: FileWillRenameEvent) => Promise<void> };
	public getFeature(request: typeof WillDeleteFilesRequest.method): DynamicFeature<FileOperationRegistrationOptions> & { send: (event: FileWillDeleteEvent) => Promise<void> };
	public getFeature(request: typeof CompletionRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<CompletionItemProvider>;
	public getFeature(request: typeof HoverRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<HoverProvider>;
	public getFeature(request: typeof SignatureHelpRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<SignatureHelpProvider>;
	public getFeature(request: typeof DefinitionRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DefinitionProvider>;
	public getFeature(request: typeof ReferencesRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<ReferenceProvider>;
	public getFeature(request: typeof DocumentHighlightRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DocumentHighlightProvider>;
	public getFeature(request: typeof CodeActionRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<CodeActionProvider>;
	public getFeature(request: typeof DocumentFormattingRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DocumentFormattingEditProvider>;
	public getFeature(request: typeof DocumentRangeFormattingRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DocumentRangeFormattingEditProvider>;
	public getFeature(request: typeof DocumentOnTypeFormattingRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<OnTypeFormattingEditProvider>;
	public getFeature(request: typeof RenameRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<RenameProvider>;
	public getFeature(request: typeof DocumentSymbolRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DocumentSymbolProvider>;
	public getFeature(request: typeof DocumentLinkRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DocumentLinkProvider>;
	public getFeature(request: typeof DocumentColorRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DocumentColorProvider>;
	public getFeature(request: typeof DeclarationRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DeclarationProvider>;
	public getFeature(request: typeof FoldingRangeRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<FoldingRangeProvider>;
	public getFeature(request: typeof ImplementationRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<ImplementationProvider>;
	public getFeature(request: typeof SelectionRangeRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<SelectionRangeProvider>;
	public getFeature(request: typeof TypeDefinitionRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<TypeDefinitionProvider>;
	public getFeature(request: typeof CallHierarchyPrepareRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<CallHierarchyProvider>;
	public getFeature(request: typeof SemanticTokensRegistrationType.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<SemanticTokensProviders>;
	public getFeature(request: typeof LinkedEditingRangeRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<LinkedEditingRangeProvider>;

	public getFeature(request: typeof WorkspaceSymbolRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & WorkspaceProviderFeature<WorkspaceSymbolProvider>;
	public getFeature(request: string): DynamicFeature<any> | undefined {
		return this._dynamicFeatures.get(request);
	}

	protected registerBuiltinFeatures() {
		this.registerFeature(new ConfigurationFeature(this));
		this.registerFeature(new DidOpenTextDocumentFeature(this, this._syncedDocuments));
		this.registerFeature(new DidChangeTextDocumentFeature(this));
		this.registerFeature(new WillSaveFeature(this));
		this.registerFeature(new WillSaveWaitUntilFeature(this));
		this.registerFeature(new DidSaveTextDocumentFeature(this));
		this.registerFeature(new DidCloseTextDocumentFeature(this, this._syncedDocuments));
		this.registerFeature(new FileSystemWatcherFeature(this, (event) => this.notifyFileEvent(event)));
		this.registerFeature(new CompletionItemFeature(this));
		this.registerFeature(new HoverFeature(this));
		this.registerFeature(new SignatureHelpFeature(this));
		this.registerFeature(new DefinitionFeature(this));
		this.registerFeature(new ReferencesFeature(this));
		this.registerFeature(new DocumentHighlightFeature(this));
		this.registerFeature(new DocumentSymbolFeature(this));
		this.registerFeature(new WorkspaceSymbolFeature(this));
		this.registerFeature(new CodeActionFeature(this));
		this.registerFeature(new CodeLensFeature(this));
		this.registerFeature(new DocumentFormattingFeature(this));
		this.registerFeature(new DocumentRangeFormattingFeature(this));
		this.registerFeature(new DocumentOnTypeFormattingFeature(this));
		this.registerFeature(new RenameFeature(this));
		this.registerFeature(new DocumentLinkFeature(this));
		this.registerFeature(new ExecuteCommandFeature(this));
	}

	protected fillInitializeParams(params: InitializeParams): void {
		for (let feature of this._features) {
			if (Is.func(feature.fillInitializeParams)) {
				feature.fillInitializeParams(params);
			}
		}
	}

	private computeClientCapabilities(): ClientCapabilities {
		const result: ClientCapabilities = {};
		ensure(result, 'workspace')!.applyEdit = true;

		const workspaceEdit = ensure(ensure(result, 'workspace')!, 'workspaceEdit')!;
		workspaceEdit.documentChanges = true;
		workspaceEdit.resourceOperations = [ResourceOperationKind.Create, ResourceOperationKind.Rename, ResourceOperationKind.Delete];
		workspaceEdit.failureHandling = FailureHandlingKind.TextOnlyTransactional;
		workspaceEdit.normalizesLineEndings = true;
		workspaceEdit.changeAnnotationSupport = {
			groupsOnLabel: true
		};

		const diagnostics = ensure(ensure(result, 'textDocument')!, 'publishDiagnostics')!;
		diagnostics.relatedInformation = true;
		diagnostics.versionSupport = false;
		diagnostics.tagSupport = { valueSet: [ DiagnosticTag.Unnecessary, DiagnosticTag.Deprecated ] };
		diagnostics.codeDescriptionSupport = true;
		diagnostics.dataSupport = true;

		const windowCapabilities = ensure(result, 'window')!;
		const showMessage = ensure(windowCapabilities, 'showMessage')!;
		showMessage.messageActionItem = { additionalPropertiesSupport: true };
		const showDocument = ensure(windowCapabilities, 'showDocument')!;
		showDocument.support = true;

		const generalCapabilities = ensure(result, 'general')!;
		generalCapabilities.regularExpressions = { engine: 'ECMAScript', version: 'ES2020' };
		generalCapabilities.markdown = { parser: 'marked', version: '1.1.0'};

		for (let feature of this._features) {
			feature.fillClientCapabilities(result);
		}
		return result;
	}

	private initializeFeatures(_connection: Connection): void {
		let documentSelector = this._clientOptions.documentSelector;
		for (let feature of this._features) {
			feature.initialize(this._capabilities, documentSelector);
		}
	}

	private handleRegistrationRequest(params: RegistrationParams): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			for (const registration of params.registrations) {
				const feature = this._dynamicFeatures.get(registration.method);
				if (feature === undefined) {
					reject(new Error(`No feature implementation for ${registration.method} found. Registration failed.`));
					return;
				}
				const options = registration.registerOptions || {};
				options.documentSelector = options.documentSelector || this._clientOptions.documentSelector;
				const data: RegistrationData<any> = {
					id: registration.id,
					registerOptions: options
				};
				try {
					feature.register(data);
				} catch (err) {
					reject(err);
					return;
				}
			}
			resolve();
		});
	}

	private handleUnregistrationRequest(params: UnregistrationParams): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			for (let unregistration of params.unregisterations) {
				const feature = this._dynamicFeatures.get(unregistration.method);
				if (!feature) {
					reject(new Error(`No feature implementation for ${unregistration.method} found. Unregistration failed.`));
					return;
				}
				feature.unregister(unregistration.id);
			}
			resolve();
		});
	}

	private handleApplyWorkspaceEdit(params: ApplyWorkspaceEditParams): Promise<ApplyWorkspaceEditResponse> {
		// This is some sort of workaround since the version check should be done by VS Code in the Workspace.applyEdit.
		// However doing it here adds some safety since the server can lag more behind then an extension.
		let workspaceEdit: WorkspaceEdit = params.edit;
		let openTextDocuments: Map<string, TextDocument> = new Map<string, TextDocument>();
		Workspace.textDocuments.forEach((document) => openTextDocuments.set(document.uri.toString(), document));
		let versionMismatch = false;
		if (workspaceEdit.documentChanges) {
			for (const change of workspaceEdit.documentChanges) {
				if (TextDocumentEdit.is(change) && change.textDocument.version && change.textDocument.version >= 0) {
					let textDocument = openTextDocuments.get(change.textDocument.uri);
					if (textDocument && textDocument.version !== change.textDocument.version) {
						versionMismatch = true;
						break;
					}
				}
			}
		}
		if (versionMismatch) {
			return Promise.resolve({ applied: false });
		}
		return Is.asPromise(Workspace.applyEdit(this._p2c.asWorkspaceEdit(params.edit)).then((value) => { return { applied: value }; }));
	}

	public handleFailedRequest<T>(type: MessageSignature, error: any, defaultValue: T): T {
		// If we get a request cancel or a content modified don't log anything.
		if (error instanceof ResponseError) {
			if (error.code === LSPErrorCodes.RequestCancelled) {
				throw this.makeCancelError();
			} else if (error.code === LSPErrorCodes.ContentModified) {
				return defaultValue;
			}
		}
		this.error(`Request ${type.method} failed.`, error);
		throw error;
	}

	private static Canceled = 'Canceled';
	private makeCancelError(): Error {
		const result = new Error(BaseLanguageClient.Canceled);
		result.name = BaseLanguageClient.Canceled;
		return result;
	}
}
