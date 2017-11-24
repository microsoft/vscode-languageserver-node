/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	workspace as Workspace, window as Window, languages as Languages, commands as Commands,
	TextDocumentChangeEvent, TextDocument, Disposable, OutputChannel,
	FileSystemWatcher as VFileSystemWatcher, DiagnosticCollection, Uri, ProviderResult,
	CancellationToken, Position as VPosition, Location as VLocation, Range as VRange,
	CompletionItem as VCompletionItem, CompletionList as VCompletionList, SignatureHelp as VSignatureHelp, Definition as VDefinition, DocumentHighlight as VDocumentHighlight,
	SymbolInformation as VSymbolInformation, CodeActionContext as VCodeActionContext, Command as VCommand, CodeLens as VCodeLens,
	FormattingOptions as VFormattingOptions, TextEdit as VTextEdit, WorkspaceEdit as VWorkspaceEdit, MessageItem,
	Hover as VHover,
	DocumentLink as VDocumentLink, TextDocumentWillSaveEvent,
	WorkspaceFolder as VWorkspaceFolder, CompletionContext as VCompletionContext
} from 'vscode';

import {
	Message, RPCMessageType, Logger, ErrorCodes, ResponseError,
	RequestType, RequestType0, RequestHandler, RequestHandler0, GenericRequestHandler,
	NotificationType, NotificationType0,
	NotificationHandler, NotificationHandler0, GenericNotificationHandler,
	MessageReader, MessageWriter, Trace, Tracer, Event, Emitter,
	createProtocolConnection,
	ClientCapabilities, WorkspaceEdit,
	RegistrationRequest, RegistrationParams, UnregistrationRequest, UnregistrationParams, TextDocumentRegistrationOptions,
	InitializeRequest, InitializeParams, InitializeResult, InitializeError, ServerCapabilities, TextDocumentSyncKind, TextDocumentSyncOptions,
	InitializedNotification, ShutdownRequest, ExitNotification,
	LogMessageNotification, LogMessageParams, MessageType,
	ShowMessageNotification, ShowMessageParams, ShowMessageRequest,
	TelemetryEventNotification,
	DidChangeConfigurationNotification, DidChangeConfigurationParams, DidChangeConfigurationRegistrationOptions,
	DocumentSelector,
	DidOpenTextDocumentNotification, DidOpenTextDocumentParams,
	DidChangeTextDocumentNotification, DidChangeTextDocumentParams, TextDocumentChangeRegistrationOptions,
	DidCloseTextDocumentNotification, DidCloseTextDocumentParams,
	DidSaveTextDocumentNotification, DidSaveTextDocumentParams, TextDocumentSaveRegistrationOptions,
	WillSaveTextDocumentNotification, WillSaveTextDocumentWaitUntilRequest, WillSaveTextDocumentParams,
	DidChangeWatchedFilesNotification, DidChangeWatchedFilesParams, FileEvent, FileChangeType,
	DidChangeWatchedFilesRegistrationOptions, WatchKind,
	PublishDiagnosticsNotification, PublishDiagnosticsParams,
	CompletionRequest, CompletionResolveRequest, CompletionRegistrationOptions,
	HoverRequest,
	SignatureHelpRequest, SignatureHelpRegistrationOptions, DefinitionRequest, ReferencesRequest, DocumentHighlightRequest,
	DocumentSymbolRequest, WorkspaceSymbolRequest,
	CodeActionRequest, CodeActionParams,
	CodeLensRequest, CodeLensResolveRequest, CodeLensRegistrationOptions,
	DocumentFormattingRequest, DocumentFormattingParams, DocumentRangeFormattingRequest, DocumentRangeFormattingParams,
	DocumentOnTypeFormattingRequest, DocumentOnTypeFormattingParams, DocumentOnTypeFormattingRegistrationOptions,
	RenameRequest, RenameParams,
	DocumentLinkRequest, DocumentLinkResolveRequest, DocumentLinkRegistrationOptions,
	ExecuteCommandRequest, ExecuteCommandParams, ExecuteCommandRegistrationOptions,
	ApplyWorkspaceEditRequest, ApplyWorkspaceEditParams, ApplyWorkspaceEditResponse,
	MarkupKind
} from 'vscode-languageserver-protocol';

import * as c2p from './codeConverter';
import * as p2c from './protocolConverter';

import * as Is from './utils/is';
import { Delayer } from './utils/async'
import * as UUID from './utils/uuid';

export { Converter as Code2ProtocolConverter } from './codeConverter';
export { Converter as Protocol2CodeConverter } from './protocolConverter';

export * from 'vscode-languageserver-protocol';

interface IConnection {

	listen(): void;

	sendRequest<R, E, RO>(type: RequestType0<R, E, RO>, token?: CancellationToken): Thenable<R>;
	sendRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, params: P, token?: CancellationToken): Thenable<R>;
	sendRequest<R>(method: string, token?: CancellationToken): Thenable<R>;
	sendRequest<R>(method: string, param: any, token?: CancellationToken): Thenable<R>;
	sendRequest<R>(type: string | RPCMessageType, ...params: any[]): Thenable<R>;

	onRequest<R, E, RO>(type: RequestType0<R, E, RO>, handler: RequestHandler0<R, E>): void;
	onRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, handler: RequestHandler<P, R, E>): void;
	onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): void;
	onRequest<R, E>(method: string | RPCMessageType, handler: GenericRequestHandler<R, E>): void;

	sendNotification<RO>(type: NotificationType0<RO>): void;
	sendNotification<P, RO>(type: NotificationType<P, RO>, params?: P): void;
	sendNotification(method: string): void;
	sendNotification(method: string, params: any): void;
	sendNotification(method: string | RPCMessageType, params?: any): void;

	onNotification<RO>(type: NotificationType0<RO>, handler: NotificationHandler0): void;
	onNotification<P, RO>(type: NotificationType<P, RO>, handler: NotificationHandler<P>): void;
	onNotification(method: string, handler: GenericNotificationHandler): void;
	onNotification(method: string | RPCMessageType, handler: GenericNotificationHandler): void;

	trace(value: Trace, tracer: Tracer, sendNotification?: boolean): void;

	initialize(params: InitializeParams): Thenable<InitializeResult>;
	shutdown(): Thenable<void>;
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

	dispose(): void;
}

class ConsoleLogger implements Logger {
	public error(message: string): void {
		console.error(message);
	}
	public warn(message: string): void {
		console.warn(message);
	}
	public info(message: string): void {
		console.info(message);
	}
	public log(message: string): void {
		console.log(message);
	}
}

interface ConnectionErrorHandler {
	(error: Error, message: Message | undefined, count: number | undefined): void;
}

interface ConnectionCloseHandler {
	(): void;
}
function createConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, errorHandler: ConnectionErrorHandler, closeHandler: ConnectionCloseHandler): IConnection;
function createConnection(reader: MessageReader, writer: MessageWriter, errorHandler: ConnectionErrorHandler, closeHandler: ConnectionCloseHandler): IConnection;
function createConnection(input: any, output: any, errorHandler: ConnectionErrorHandler, closeHandler: ConnectionCloseHandler): IConnection {
	let logger = new ConsoleLogger();
	let connection = createProtocolConnection(input, output, logger);
	connection.onError((data) => { errorHandler(data[0], data[1], data[2]) });
	connection.onClose(closeHandler);
	let result: IConnection = {

		listen: (): void => connection.listen(),

		sendRequest: <R>(type: string | RPCMessageType, ...params: any[]): Thenable<R> => connection.sendRequest(Is.string(type) ? type : type.method, ...params),
		onRequest: <R, E>(type: string | RPCMessageType, handler: GenericRequestHandler<R, E>): void => connection.onRequest(Is.string(type) ? type : type.method, handler),

		sendNotification: (type: string | RPCMessageType, params?: any): void => connection.sendNotification(Is.string(type) ? type : type.method, params),
		onNotification: (type: string | RPCMessageType, handler: GenericNotificationHandler): void => connection.onNotification(Is.string(type) ? type : type.method, handler),

		trace: (value: Trace, tracer: Tracer, sendNotification: boolean = false): void => connection.trace(value, tracer, sendNotification),

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

		dispose: () => connection.dispose()
	}

	return result;
}

export interface ExecutableOptions {
	cwd?: string;
	stdio?: string | string[];
	env?: any;
	detached?: boolean;
}

export interface Executable {
	command: string;
	args?: string[];
	options?: ExecutableOptions;
}

export interface ForkOptions {
	cwd?: string;
	env?: any;
	encoding?: string;
	execArgv?: string[];
}

export enum TransportKind {
	stdio,
	ipc,
	pipe
}

export interface NodeModule {
	module: string;
	transport?: TransportKind;
	args?: string[];
	runtime?: string;
	options?: ForkOptions;
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
 * A pluggable error handler that is invoked when the connection is either
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
	error(error: Error, message: Message, count: number): ErrorAction;

	/**
	 * The connection to the server got closed.
	 */
	closed(): CloseAction
}

class DefaultErrorHandler implements ErrorHandler {

	private restarts: number[];

	constructor(private name: string) {
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
		if (this.restarts.length < 5) {
			return CloseAction.Restart;
		} else {
			let diff = this.restarts[this.restarts.length - 1] - this.restarts[0];
			if (diff <= 3 * 60 * 1000) {
				Window.showErrorMessage(`The ${this.name} server crashed 5 times in the last 3 minutes. The server will not be restarted.`);
				return CloseAction.DoNotRestart;
			} else {
				this.restarts.shift();
				return CloseAction.Restart;
			}
		}
	}
}

export interface InitializationFailedHandler {
	(error: ResponseError<InitializeError> | Error | any): boolean;
}

export interface SynchronizeOptions {
	configurationSection?: string | string[];
	fileEvents?: VFileSystemWatcher | VFileSystemWatcher[];
}

export enum RevealOutputChannelOn {
	Info = 1,
	Warn = 2,
	Error = 3,
	Never = 4
}

export interface ProvideCompletionItemsSignature {
	(document: TextDocument, position: VPosition, context: VCompletionContext, token: CancellationToken): ProviderResult<VCompletionItem[] | VCompletionList>;
}

export interface ResolveCompletionItemSignature {
	(item: VCompletionItem, token: CancellationToken): ProviderResult<VCompletionItem>;
}

export interface ProvideHoverSignature {
	(document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VHover>;
}

export interface ProvideSignatureHelpSignature {
	(document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VSignatureHelp>;
}

export interface ProvideDefinitionSignature {
	(document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VDefinition>;
}

export interface ProvideReferencesSignature {
	(document: TextDocument, position: VPosition, options: { includeDeclaration: boolean; }, token: CancellationToken): ProviderResult<VLocation[]>;
}

export interface ProvideDocumentHighlightsSignature {
	(document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VDocumentHighlight[]>;
}

export interface ProvideDocumentSymbolsSignature {
	(document: TextDocument, token: CancellationToken): ProviderResult<VSymbolInformation[]>;
}

export interface ProvideWorkspaceSymbolsSignature {
	(query: string, token: CancellationToken): ProviderResult<VSymbolInformation[]>;
}

export interface ProvideCodeActionsSignature {
	(document: TextDocument, range: VRange, context: VCodeActionContext, token: CancellationToken): ProviderResult<VCommand[]>;
}

export interface ProvideCodeLensesSignature {
	(document: TextDocument, token: CancellationToken): ProviderResult<VCodeLens[]>;
}

export interface ResolveCodeLensSignature {
	(codeLens: VCodeLens, token: CancellationToken): ProviderResult<VCodeLens>;
}

export interface ProvideDocumentFormattingEditsSignature {
	(document: TextDocument, options: VFormattingOptions, token: CancellationToken): ProviderResult<VTextEdit[]>;
}

export interface ProvideDocumentRangeFormattingEditsSignature {
	(document: TextDocument, range: VRange, options: VFormattingOptions, token: CancellationToken): ProviderResult<VTextEdit[]>;
}

export interface ProvideOnTypeFormattingEditsSignature {
	(document: TextDocument, position: VPosition, ch: string, options: VFormattingOptions, token: CancellationToken): ProviderResult<VTextEdit[]>;
}

export interface ProvideRenameEditsSignature {
	(document: TextDocument, position: VPosition, newName: string, token: CancellationToken): ProviderResult<VWorkspaceEdit>;
}

export interface ProvideDocumentLinksSignature {
	(document: TextDocument, token: CancellationToken): ProviderResult<VDocumentLink[]>;
}

export interface ResolveDocumentLinkSignature {
	(link: VDocumentLink, token: CancellationToken): ProviderResult<VDocumentLink>;
}

export interface NextSignature<P, R> {
	(this: void, data: P, next: (data: P) => R): R;
}

export interface DidChangeConfigurationSignature {
	(sections: string[] | undefined): void;
}

export interface WorkspaceMiddleware {
	didChangeConfiguration?: (this: void, sections: string[] | undefined, next: DidChangeConfigurationSignature) => void;
}

export interface Middleware {
	didOpen?: NextSignature<TextDocument, void>;
	didChange?: NextSignature<TextDocumentChangeEvent, void>;
	willSave?: NextSignature<TextDocumentWillSaveEvent, void>;
	willSaveWaitUntil?: NextSignature<TextDocumentWillSaveEvent, Thenable<VTextEdit[]>>;
	didSave?: NextSignature<TextDocument, void>;
	didClose?: NextSignature<TextDocument, void>;

	provideCompletionItem?: (this: void, document: TextDocument, position: VPosition, context: VCompletionContext, token: CancellationToken, next: ProvideCompletionItemsSignature) => ProviderResult<VCompletionItem[] | VCompletionList>;
	resolveCompletionItem?: (this: void, item: VCompletionItem, token: CancellationToken, next: ResolveCompletionItemSignature) => ProviderResult<VCompletionItem>;
	provideHover?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideHoverSignature) => ProviderResult<VHover>;
	provideSignatureHelp?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideSignatureHelpSignature) => ProviderResult<VSignatureHelp>;
	provideDefinition?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideDefinitionSignature) => ProviderResult<VDefinition>;
	provideReferences?: (this: void, document: TextDocument, position: VPosition, options: { includeDeclaration: boolean; }, token: CancellationToken, next: ProvideReferencesSignature) => ProviderResult<VLocation[]>;
	provideDocumentHighlights?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideDocumentHighlightsSignature) => ProviderResult<VDocumentHighlight[]>;
	provideDocumentSymbols?: (this: void, document: TextDocument, token: CancellationToken, next: ProvideDocumentSymbolsSignature) => ProviderResult<VSymbolInformation[]>;
	provideWorkspaceSymbols?: (this: void, query: string, token: CancellationToken, next: ProvideWorkspaceSymbolsSignature) => ProviderResult<VSymbolInformation[]>;
	provideCodeActions?: (this: void, document: TextDocument, range: VRange, context: VCodeActionContext, token: CancellationToken, next: ProvideCodeActionsSignature) => ProviderResult<VCommand[]>;
	provideCodeLenses?: (this: void, document: TextDocument, token: CancellationToken, next: ProvideCodeLensesSignature) => ProviderResult<VCodeLens[]>;
	resolveCodeLens?: (this: void, codeLens: VCodeLens, token: CancellationToken, next: ResolveCodeLensSignature) => ProviderResult<VCodeLens>;
	provideDocumentFormattingEdits?: (this: void, document: TextDocument, options: VFormattingOptions, token: CancellationToken, next: ProvideDocumentFormattingEditsSignature) => ProviderResult<VTextEdit[]>;
	provideDocumentRangeFormattingEdits?: (this: void, document: TextDocument, range: VRange, options: VFormattingOptions, token: CancellationToken, next: ProvideDocumentRangeFormattingEditsSignature) => ProviderResult<VTextEdit[]>;
	provideOnTypeFormattingEdits?: (this: void, document: TextDocument, position: VPosition, ch: string, options: VFormattingOptions, token: CancellationToken, next: ProvideOnTypeFormattingEditsSignature) => ProviderResult<VTextEdit[]>;
	provideRenameEdits?: (this: void, document: TextDocument, position: VPosition, newName: string, token: CancellationToken, next: ProvideRenameEditsSignature) => ProviderResult<VWorkspaceEdit>;
	provideDocumentLinks?: (this: void, document: TextDocument, token: CancellationToken, next: ProvideDocumentLinksSignature) => ProviderResult<VDocumentLink[]>;
	resolveDocumentLink?: (this: void, link: VDocumentLink, token: CancellationToken, next: ResolveDocumentLinkSignature) => ProviderResult<VDocumentLink>;
	workspace?: WorkspaceMiddleware;
}

export interface LanguageClientOptions {
	documentSelector?: DocumentSelector | string[];
	synchronize?: SynchronizeOptions;
	diagnosticCollectionName?: string;
	outputChannel?: OutputChannel;
	outputChannelName?: string;
	revealOutputChannelOn?: RevealOutputChannelOn;
	/**
	 * The encoding use to read stdout and stderr. Defaults
	 * to 'utf8' if ommitted.
	 */
	stdioEncoding?: string;
	initializationOptions?: any | (() => any);
	initializationFailedHandler?: InitializationFailedHandler;
	errorHandler?: ErrorHandler;
	middleware?: Middleware;
	uriConverters?: {
		code2Protocol: c2p.URIConverter,
		protocol2Code: p2c.URIConverter
	};
	workspaceFolder?: VWorkspaceFolder;
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
	errorHandler: ErrorHandler;
	middleware: Middleware;
	uriConverters?: {
		code2Protocol: c2p.URIConverter,
		protocol2Code: p2c.URIConverter
	};
	workspaceFolder?: VWorkspaceFolder
}

export enum State {
	Stopped = 1,
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
	 * when the client has successfully received the initalize request from
	 * the server and before the client sends the initialized notification
	 * to the server.
	 *
	 * @param capabilities the server capabilities
	 * @param documentSelector the document selector pass to the client's constuctor.
	 *  May be `undefined` if the client was created without a selector.
	 */
	initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void;
}

export interface RegistrationData<T> {
	id: string;
	registerOptions: T;
}

export interface DynamicFeature<T> {

	/**
	 * The message for which this features support dynamic activation / registration.
	 */
	messages: RPCMessageType | RPCMessageType[];

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
	 * when the client has successfully received the initalize request from
	 * the server and before the client sends the initialized notification
	 * to the server.
	 *
	 * @param capabilities the server capabilities.
	 * @param documentSelector the document selector pass to the client's constuctor.
	 *  May be `undefined` if the client was created without a selector.
	 */
	initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void;

	/**
	 * Is called when the server send a register request for the given message.
	 *
	 * @param message the message to register for.
	 * @param data additional registration data as defined in the protocol.
	 */
	register(message: RPCMessageType, data: RegistrationData<T>): void;

	/**
	 * Is called when the server wants to unregister a feature.
	 *
	 * @param id the id used when registering the feature.
	 */
	unregister(id: string): void;

	/**
	 * Called when the client is stopped to dispose this feature. Usually a feature
	 * unregisters listeners registerd hooked up with the VS Code extension host.
	 */
	dispose(): void;
}

namespace DynamicFeature {
	export function is<T>(value: any): value is DynamicFeature<T> {
		let candidate: DynamicFeature<T> = value;
		return candidate && Is.func(candidate.register) && Is.func(candidate.unregister) && Is.func(candidate.dispose) && candidate.messages !== void 0;
	}
}

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

interface CreateParamsSignature<E, P> {
	(data: E): P;
}

interface ResolvedTextDocumentSyncCapabilities {
	resolvedTextDocumentSync?: TextDocumentSyncOptions;
}

abstract class DocumentNotifiactions<P, E> implements DynamicFeature<TextDocumentRegistrationOptions> {

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
		protected _type: NotificationType<P, TextDocumentRegistrationOptions>,
		protected _middleware: NextSignature<E, void> | undefined,
		protected _createParams: CreateParamsSignature<E, P>,
		protected _selectorFilter?: (selectors: IterableIterator<DocumentSelector>, data: E) => boolean) {
	}

	public abstract messages: RPCMessageType | RPCMessageType[];

	public abstract fillClientCapabilities(capabilities: ClientCapabilities): void;

	public abstract initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void;

	public register(_message: RPCMessageType, data: RegistrationData<TextDocumentRegistrationOptions>): void {

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
		if (this._listener) {
			this._listener.dispose();
		}
	}
}

class DidOpenTextDocumentFeature extends DocumentNotifiactions<DidOpenTextDocumentParams, TextDocument> {
	constructor(client: BaseLanguageClient, private _syncedDocuments: Map<string, TextDocument>) {
		super(
			client, Workspace.onDidOpenTextDocument, DidOpenTextDocumentNotification.type,
			client.clientOptions.middleware!.didOpen,
			(textDocument) => client.code2ProtocolConverter.asOpenTextDocumentParams(textDocument),
			DocumentNotifiactions.textDocumentFilter
		);
	}

	public get messages(): typeof DidOpenTextDocumentNotification.type {
		return DidOpenTextDocumentNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
		if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.openClose) {
			this.register(this.messages, { id: UUID.generateUuid(), registerOptions: { documentSelector: documentSelector } });
		}
	}

	public register(message: RPCMessageType, data: RegistrationData<TextDocumentRegistrationOptions>): void {
		super.register(message, data);
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

class DidCloseTextDocumentFeature extends DocumentNotifiactions<DidCloseTextDocumentParams, TextDocument> {

	constructor(client: BaseLanguageClient, private _syncedDocuments: Map<string, TextDocument>) {
		super(
			client, Workspace.onDidCloseTextDocument, DidCloseTextDocumentNotification.type,
			client.clientOptions.middleware!.didClose,
			(textDocument) => client.code2ProtocolConverter.asCloseTextDocumentParams(textDocument),
			DocumentNotifiactions.textDocumentFilter
		);
	}

	public get messages(): typeof DidCloseTextDocumentNotification.type {
		return DidCloseTextDocumentNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
		if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.openClose) {
			this.register(this.messages, { id: UUID.generateUuid(), registerOptions: { documentSelector: documentSelector } });
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

class DidChangeTextDocumentFeature implements DynamicFeature<TextDocumentChangeRegistrationOptions> {

	private _listener: Disposable | undefined;
	private _changeData: Map<string, DidChangeTextDocumentData> = new Map<string, DidChangeTextDocumentData>();
	private _forcingDelivery: boolean = false;
	private _changeDelayer: { uri: string; delayer: Delayer<void> } | undefined;

	constructor(private _client: BaseLanguageClient) {
	}

	public get messages(): typeof DidChangeTextDocumentNotification.type {
		return DidChangeTextDocumentNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
		if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.change !== void 0 && textDocumentSyncOptions.change !== TextDocumentSyncKind.None) {
			this.register(this.messages,
				{
					id: UUID.generateUuid(),
					registerOptions: Object.assign({}, { documentSelector: documentSelector }, { syncKind: textDocumentSyncOptions.change })
				}
			);
		}
	}

	public register(_message: RPCMessageType, data: RegistrationData<TextDocumentChangeRegistrationOptions>): void {
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
							}
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
}


class WillSaveFeature extends DocumentNotifiactions<WillSaveTextDocumentParams, TextDocumentWillSaveEvent> {

	constructor(client: BaseLanguageClient) {
		super(
			client, Workspace.onWillSaveTextDocument, WillSaveTextDocumentNotification.type,
			client.clientOptions.middleware!.willSave,
			(willSaveEvent) => client.code2ProtocolConverter.asWillSaveTextDocumentParams(willSaveEvent),
			(selectors, willSaveEvent) => DocumentNotifiactions.textDocumentFilter(selectors, willSaveEvent.document)
		)
	}

	public get messages(): RPCMessageType {
		return WillSaveTextDocumentNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let value = ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!;
		value.willSave = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
		if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.willSave) {
			this.register(this.messages, {
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

	public get messages(): RPCMessageType {
		return WillSaveTextDocumentWaitUntilRequest.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let value = ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!;
		value.willSaveWaitUntil = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
		if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.willSaveWaitUntil) {
			this.register(this.messages, {
				id: UUID.generateUuid(),
				registerOptions: { documentSelector: documentSelector }
			});
		}
	}

	public register(_message: RPCMessageType, data: RegistrationData<TextDocumentRegistrationOptions>): void {
		if (!data.registerOptions.documentSelector) {
			return;
		}
		if (!this._listener) {
			this._listener = Workspace.onWillSaveTextDocument(this.callback, this);
		}
		this._selectors.set(data.id, data.registerOptions.documentSelector);
	}

	private callback(event: TextDocumentWillSaveEvent): void {
		if (DocumentNotifiactions.textDocumentFilter(this._selectors.values(), event.document)) {
			let middleware = this._client.clientOptions.middleware!;
			let willSaveWaitUntil = (event: TextDocumentWillSaveEvent): Thenable<VTextEdit[]> => {
				return this._client.sendRequest(WillSaveTextDocumentWaitUntilRequest.type,
					this._client.code2ProtocolConverter.asWillSaveTextDocumentParams(event)).then((edits) => {
						let vEdits = this._client.protocol2CodeConverter.asTextEdits(edits);
						return vEdits === void 0 ? [] : vEdits;
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
		if (this._listener) {
			this._listener.dispose();
			this._listener = undefined;
		}
	}
}

class DidSaveTextDocumentFeature extends DocumentNotifiactions<DidSaveTextDocumentParams, TextDocument> {

	private _includeText: boolean;

	constructor(client: BaseLanguageClient) {
		super(
			client, Workspace.onDidSaveTextDocument, DidSaveTextDocumentNotification.type,
			client.clientOptions.middleware!.didSave,
			(textDocument) => client.code2ProtocolConverter.asSaveTextDocumentParams(textDocument, this._includeText),
			DocumentNotifiactions.textDocumentFilter
		);
	}

	public get messages(): RPCMessageType {
		return DidSaveTextDocumentNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!.didSave = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
		if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.save) {
			this.register(this.messages, {
				id: UUID.generateUuid(),
				registerOptions: Object.assign({}, { documentSelector: documentSelector }, { includeText: !!textDocumentSyncOptions.save.includeText })
			});
		}
	}

	public register(method: RPCMessageType, data: RegistrationData<TextDocumentSaveRegistrationOptions>): void {
		this._includeText = !!data.registerOptions.includeText;
		super.register(method, data);
	}
}

class FileSystemWatcherFeature implements DynamicFeature<DidChangeWatchedFilesRegistrationOptions> {

	private _watchers: Map<string, Disposable[]> = new Map<string, Disposable[]>();

	constructor(private _client: BaseLanguageClient, private _notifyFileEvent: (event: FileEvent) => void) {
	}

	public get messages(): RPCMessageType {
		return DidChangeWatchedFilesNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'workspace')!, 'didChangeWatchedFiles')!.dynamicRegistration = true;
	}

	public initialize(_capabilities: ServerCapabilities, _documentSelector: DocumentSelector): void {
	}

	public register(_method: RPCMessageType, data: RegistrationData<DidChangeWatchedFilesRegistrationOptions>): void {
		if (!Array.isArray(data.registerOptions.watchers)) {
			return;
		}
		let disposeables: Disposable[] = [];
		for (let watcher of data.registerOptions.watchers) {
			if (!Is.string(watcher.globPattern)) {
				continue;
			}
			let watchCreate: boolean = true, watchChange: boolean = true, watchDelete: boolean = true;
			if (watcher.kind !== void 0 && watcher.kind !== null) {
				watchCreate = (watcher.kind & WatchKind.Create) !== 0;
				watchChange = (watcher.kind & WatchKind.Change) != 0;
				watchDelete = (watcher.kind & WatchKind.Delete) != 0;
			}
			let fileSystemWatcher: VFileSystemWatcher = Workspace.createFileSystemWatcher(watcher.globPattern, !watchCreate, !watchChange, !watchDelete);
			this.hookListeners(fileSystemWatcher, watchCreate, watchChange, watchDelete);
			disposeables.push(fileSystemWatcher);
		}
		this._watchers.set(data.id, disposeables);
	}

	public registerRaw(id: string, fileSystemWatchers: VFileSystemWatcher[]) {
		let disposeables: Disposable[] = [];
		for (let fileSystemWatcher of fileSystemWatchers) {
			this.hookListeners(fileSystemWatcher, true, true, true, disposeables);
		}
		this._watchers.set(id, disposeables);
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
		let disposeables = this._watchers.get(id);
		if (disposeables) {
			for (let disposable of disposeables) {
				disposable.dispose();
			}
		}
	}

	public dispose(): void {
		this._watchers.forEach((disposeables) => {
			for (let disposable of disposeables) {
				disposable.dispose();
			}
		});
	}
}

abstract class TextDocumentFeature<T extends TextDocumentRegistrationOptions> implements DynamicFeature<T> {

	protected _providers: Map<string, Disposable> = new Map<string, Disposable>();

	constructor(protected _client: BaseLanguageClient, private _message: RPCMessageType) {
	}

	public get messages(): RPCMessageType {
		return this._message;
	}

	public abstract fillClientCapabilities(capabilities: ClientCapabilities): void;

	public abstract initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void;

	public register(message: RPCMessageType, data: RegistrationData<T>): void {
		if (message.method !== this.messages.method) {
			throw new Error(`Register called on wron feature. Requested ${message.method} but reached feature ${this.messages.method}`);
		}
		if (!data.registerOptions.documentSelector) {
			return;
		}
		let provider = this.registerLanguageProvider(data.registerOptions);
		if (provider) {
			this._providers.set(data.id, provider);
		}
	}

	protected abstract registerLanguageProvider(options: T): Disposable;

	public unregister(id: string): void {
		let provider = this._providers.get(id);
		if (provider) {
			provider.dispose();
		}
	}

	public dispose(): void {
		this._providers.forEach((value) => {
			value.dispose();
		});
	}
}

abstract class WorkspaceFeature<T> implements DynamicFeature<T> {

	protected _providers: Map<string, Disposable> = new Map<string, Disposable>();

	constructor(protected _client: BaseLanguageClient, private _message: RPCMessageType) {
	}

	public get messages(): RPCMessageType {
		return this._message;
	}

	public abstract fillClientCapabilities(capabilities: ClientCapabilities): void;

	public abstract initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void;

	public register(message: RPCMessageType, data: RegistrationData<T>): void {
		if (message.method !== this.messages.method) {
			throw new Error(`Register called on wron feature. Requested ${message.method} but reached feature ${this.messages.method}`);
		}
		let provider = this.registerLanguageProvider(data.registerOptions);
		if (provider) {
			this._providers.set(data.id, provider);
		}
	}

	protected abstract registerLanguageProvider(options: T): Disposable;

	public unregister(id: string): void {
		let provider = this._providers.get(id);
		if (provider) {
			provider.dispose();
		}
	}

	public dispose(): void {
		this._providers.forEach((value) => {
			value.dispose();
		});
	}
}

class CompletionItemFeature extends TextDocumentFeature<CompletionRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, CompletionRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		let completion = ensure(ensure(capabilites, 'textDocument')!, 'completion')!;
		completion.dynamicRegistration = true;
		completion.contextSupport = true;
		completion.completionItem = { snippetSupport: true, commitCharactersSupport: true, documentationFormat: [MarkupKind.Markdown, MarkupKind.PlainText] };
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.completionProvider || !documentSelector) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, { documentSelector: documentSelector }, capabilities.completionProvider)
		});
	}

	protected registerLanguageProvider(options: CompletionRegistrationOptions): Disposable {
		let triggerCharacters = options.triggerCharacters || [];
		let client = this._client;
		let provideCompletionItems: ProvideCompletionItemsSignature = (document, position, context, token) => {
			return client.sendRequest(CompletionRequest.type, client.code2ProtocolConverter.asCompletionParams(document, position, context), token).then(
				client.protocol2CodeConverter.asCompletionResult,
				(error) => {
					client.logFailedRequest(CompletionRequest.type, error);
					return Promise.resolve([]);
				}
			);
		};
		let resolveCompletionItem: ResolveCompletionItemSignature = (item, token) => {
			return client.sendRequest(CompletionResolveRequest.type, client.code2ProtocolConverter.asCompletionItem(item), token).then(
				client.protocol2CodeConverter.asCompletionItem,
				(error) => {
					client.logFailedRequest(CompletionResolveRequest.type, error);
					return Promise.resolve(item);
				}
			);
		};

		let middleware = this._client.clientOptions.middleware!;
		return Languages.registerCompletionItemProvider(options.documentSelector!, {
			provideCompletionItems: (document: TextDocument, position: VPosition, token: CancellationToken, context: VCompletionContext): ProviderResult<VCompletionList | VCompletionItem[]> => {
				return middleware.provideCompletionItem
					? middleware.provideCompletionItem(document, position, context, token, provideCompletionItems)
					: provideCompletionItems(document, position, context, token);
			},
			resolveCompletionItem: options.resolveProvider
				? (item: VCompletionItem, token: CancellationToken): ProviderResult<VCompletionItem> => {
					return middleware.resolveCompletionItem
						? middleware.resolveCompletionItem(item, token, resolveCompletionItem)
						: resolveCompletionItem(item, token);
				}
				: undefined
		}, ...triggerCharacters);
	}
}

class HoverFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, HoverRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		ensure(ensure(capabilites, 'textDocument')!, 'hover')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.hoverProvider || !documentSelector) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, { documentSelector: documentSelector })
		});
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): Disposable {
		let client = this._client;
		let provideHover: ProvideHoverSignature = (document, position, token) => {
			return client.sendRequest(HoverRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then(
				client.protocol2CodeConverter.asHover,
				(error) => {
					client.logFailedRequest(HoverRequest.type, error);
					return Promise.resolve(null);
				}
			);
		};
		let middleware = client.clientOptions.middleware!;
		return Languages.registerHoverProvider(options.documentSelector!, {
			provideHover: (document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VHover> => {
				return middleware.provideHover
					? middleware.provideHover(document, position, token, provideHover)
					: provideHover(document, position, token);
			}
		});
	}
}

class SignatureHelpFeature extends TextDocumentFeature<SignatureHelpRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, SignatureHelpRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		let config = ensure(ensure(capabilites, 'textDocument')!, 'signatureHelp')!;
		config.dynamicRegistration = true;
		config.signatureInformation = { documentationFormat: [MarkupKind.Markdown, MarkupKind.PlainText] };
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.signatureHelpProvider || !documentSelector) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, { documentSelector: documentSelector }, capabilities.signatureHelpProvider)
		});
	}

	protected registerLanguageProvider(options: SignatureHelpRegistrationOptions): Disposable {
		let client = this._client;
		let providerSignatureHelp: ProvideSignatureHelpSignature = (document, position, token) => {
			return client.sendRequest(SignatureHelpRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then(
				client.protocol2CodeConverter.asSignatureHelp,
				(error) => {
					client.logFailedRequest(SignatureHelpRequest.type, error);
					return Promise.resolve(null);
				}
			);
		};
		let middleware = client.clientOptions.middleware!;
		let triggerCharacters = options.triggerCharacters || [];
		return Languages.registerSignatureHelpProvider(options.documentSelector!, {
			provideSignatureHelp: (document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VSignatureHelp> => {
				return middleware.provideSignatureHelp
					? middleware.provideSignatureHelp(document, position, token, providerSignatureHelp)
					: providerSignatureHelp(document, position, token);
			}
		}, ...triggerCharacters);
	}
}

class DefinitionFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, DefinitionRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		ensure(ensure(capabilites, 'textDocument')!, 'definition')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.definitionProvider || !documentSelector) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, { documentSelector: documentSelector })
		});
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): Disposable {
		let client = this._client;
		let provideDefinition: ProvideDefinitionSignature = (document, position, token) => {
			return client.sendRequest(DefinitionRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then(
				client.protocol2CodeConverter.asDefinitionResult,
				(error) => {
					client.logFailedRequest(DefinitionRequest.type, error);
					return Promise.resolve(null);
				}
			);
		};
		let middleware = client.clientOptions.middleware!;
		return Languages.registerDefinitionProvider(options.documentSelector!, {
			provideDefinition: (document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VDefinition> => {
				return middleware.provideDefinition
					? middleware.provideDefinition(document, position, token, provideDefinition)
					: provideDefinition(document, position, token);
			}
		});
	}
}

class ReferencesFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, ReferencesRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		ensure(ensure(capabilites, 'textDocument')!, 'references')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.referencesProvider || !documentSelector) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, { documentSelector: documentSelector })
		});
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): Disposable {
		let client = this._client;
		let providerReferences: ProvideReferencesSignature = (document, position, options, token) => {
			return client.sendRequest(ReferencesRequest.type, client.code2ProtocolConverter.asReferenceParams(document, position, options), token).then(
				client.protocol2CodeConverter.asReferences,
				(error) => {
					client.logFailedRequest(ReferencesRequest.type, error);
					return Promise.resolve([]);
				}
			);
		};
		let middleware = client.clientOptions.middleware!;
		return Languages.registerReferenceProvider(options.documentSelector!, {
			provideReferences: (document: TextDocument, position: VPosition, options: { includeDeclaration: boolean; }, token: CancellationToken): ProviderResult<VLocation[]> => {
				return middleware.provideReferences
					? middleware.provideReferences(document, position, options, token, providerReferences)
					: providerReferences(document, position, options, token)
			}
		});
	}
}

class DocumentHighlightFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, DocumentHighlightRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		ensure(ensure(capabilites, 'textDocument')!, 'documentHighlight')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.documentHighlightProvider || !documentSelector) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, { documentSelector: documentSelector })
		});
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): Disposable {
		let client = this._client;
		let provideDocumentHighlights: ProvideDocumentHighlightsSignature = (document, position, token) => {
			return client.sendRequest(DocumentHighlightRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then(
				client.protocol2CodeConverter.asDocumentHighlights,
				(error) => {
					client.logFailedRequest(DocumentHighlightRequest.type, error);
					return Promise.resolve([]);
				}
			);
		};
		let middleware = client.clientOptions.middleware!;
		return Languages.registerDocumentHighlightProvider(options.documentSelector!, {
			provideDocumentHighlights: (document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VDocumentHighlight[]> => {
				return middleware.provideDocumentHighlights
					? middleware.provideDocumentHighlights(document, position, token, provideDocumentHighlights)
					: provideDocumentHighlights(document, position, token);
			}
		});
	}
}

class DocumentSymbolFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, DocumentSymbolRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		ensure(ensure(capabilites, 'textDocument')!, 'documentSymbol')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.documentSymbolProvider || !documentSelector) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, { documentSelector: documentSelector })
		});
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): Disposable {
		let client = this._client;
		let provideDocumentSymbols: ProvideDocumentSymbolsSignature = (document, token) => {
			return client.sendRequest(DocumentSymbolRequest.type, client.code2ProtocolConverter.asDocumentSymbolParams(document), token).then(
				client.protocol2CodeConverter.asSymbolInformations,
				(error) => {
					client.logFailedRequest(DocumentSymbolRequest.type, error);
					return Promise.resolve([]);
				}
			);
		};
		let middleware = client.clientOptions.middleware!;
		return Languages.registerDocumentSymbolProvider(options.documentSelector!, {
			provideDocumentSymbols: (document: TextDocument, token: CancellationToken): ProviderResult<VSymbolInformation[]> => {
				return middleware.provideDocumentSymbols
					? middleware.provideDocumentSymbols(document, token, provideDocumentSymbols)
					: provideDocumentSymbols(document, token);
			}
		});
	}
}

class WorkspaceSymbolFeature extends WorkspaceFeature<undefined> {

	constructor(client: BaseLanguageClient) {
		super(client, WorkspaceSymbolRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		ensure(ensure(capabilites, 'workspace')!, 'symbol')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities): void {
		if (!capabilities.workspaceSymbolProvider) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: undefined
		});
	}

	protected registerLanguageProvider(_options: undefined): Disposable {
		let client = this._client;
		let provideWorkspaceSymbols: ProvideWorkspaceSymbolsSignature = (query, token) => {
			return client.sendRequest(WorkspaceSymbolRequest.type, { query }, token).then(
				client.protocol2CodeConverter.asSymbolInformations,
				(error) => {
					client.logFailedRequest(WorkspaceSymbolRequest.type, error);
					return Promise.resolve([]);
				}
			);
		};
		let middleware = client.clientOptions.middleware!;
		return Languages.registerWorkspaceSymbolProvider({
			provideWorkspaceSymbols: (query: string, token: CancellationToken): ProviderResult<VSymbolInformation[]> => {
				return middleware.provideWorkspaceSymbols
					? middleware.provideWorkspaceSymbols(query, token, provideWorkspaceSymbols)
					: provideWorkspaceSymbols(query, token);
			}
		});
	}
}

class CodeActionFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, CodeActionRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		ensure(ensure(capabilites, 'textDocument')!, 'codeAction')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.codeActionProvider || !documentSelector) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, { documentSelector: documentSelector })
		});
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): Disposable {
		let client = this._client;
		let provideCodeActions: ProvideCodeActionsSignature = (document, range, context, token) => {
			let params: CodeActionParams = {
				textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
				range: client.code2ProtocolConverter.asRange(range),
				context: client.code2ProtocolConverter.asCodeActionContext(context)
			};
			return client.sendRequest(CodeActionRequest.type, params, token).then(
				client.protocol2CodeConverter.asCommands,
				(error) => {
					client.logFailedRequest(CodeActionRequest.type, error);
					return Promise.resolve([]);
				}
			);
		}
		let middleware = client.clientOptions.middleware!;
		return Languages.registerCodeActionsProvider(options.documentSelector!, {
			provideCodeActions: (document: TextDocument, range: VRange, context: VCodeActionContext, token: CancellationToken): ProviderResult<VCommand[]> => {
				return middleware.provideCodeActions
					? middleware.provideCodeActions(document, range, context, token, provideCodeActions)
					: provideCodeActions(document, range, context, token);
			}
		});
	}
}

class CodeLensFeature extends TextDocumentFeature<CodeLensRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, CodeLensRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		ensure(ensure(capabilites, 'textDocument')!, 'codeLens')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.codeLensProvider || !documentSelector) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, { documentSelector: documentSelector }, capabilities.codeLensProvider)
		});
	}

	protected registerLanguageProvider(options: CodeLensRegistrationOptions): Disposable {
		let client = this._client;
		let provideCodeLenses: ProvideCodeLensesSignature = (document, token) => {
			return client.sendRequest(CodeLensRequest.type, client.code2ProtocolConverter.asCodeLensParams(document), token).then(
				client.protocol2CodeConverter.asCodeLenses,
				(error) => {
					client.logFailedRequest(CodeLensRequest.type, error);
					return Promise.resolve([]);
				}
			);
		};
		let resolveCodeLens: ResolveCodeLensSignature = (codeLens, token) => {
			return client.sendRequest(CodeLensResolveRequest.type, client.code2ProtocolConverter.asCodeLens(codeLens), token).then(
				client.protocol2CodeConverter.asCodeLens,
				(error) => {
					client.logFailedRequest(CodeLensResolveRequest.type, error);
					return codeLens;
				}
			);
		};
		let middleware = client.clientOptions.middleware!;
		return Languages.registerCodeLensProvider(options.documentSelector!, {
			provideCodeLenses: (document: TextDocument, token: CancellationToken): ProviderResult<VCodeLens[]> => {
				return middleware.provideCodeLenses
					? middleware.provideCodeLenses(document, token, provideCodeLenses)
					: provideCodeLenses(document, token);
			},
			resolveCodeLens: (options.resolveProvider)
				? (codeLens: VCodeLens, token: CancellationToken): ProviderResult<VCodeLens> => {
					return middleware.resolveCodeLens
						? middleware.resolveCodeLens(codeLens, token, resolveCodeLens)
						: resolveCodeLens(codeLens, token);
				}
				: undefined
		});
	}
}

class DocumentFormattingFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, DocumentFormattingRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		ensure(ensure(capabilites, 'textDocument')!, 'formatting')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.documentFormattingProvider || !documentSelector) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, { documentSelector: documentSelector })
		});
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): Disposable {
		let client = this._client;
		let provideDocumentFormattingEdits: ProvideDocumentFormattingEditsSignature = (document, options, token) => {
			let params: DocumentFormattingParams = {
				textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
				options: client.code2ProtocolConverter.asFormattingOptions(options)
			};
			return client.sendRequest(DocumentFormattingRequest.type, params, token).then(
				client.protocol2CodeConverter.asTextEdits,
				(error) => {
					client.logFailedRequest(DocumentFormattingRequest.type, error);
					return Promise.resolve([]);
				}
			);
		};
		let middleware = client.clientOptions.middleware!;
		return Languages.registerDocumentFormattingEditProvider(options.documentSelector!, {
			provideDocumentFormattingEdits: (document: TextDocument, options: VFormattingOptions, token: CancellationToken): ProviderResult<VTextEdit[]> => {
				return middleware.provideDocumentFormattingEdits
					? middleware.provideDocumentFormattingEdits(document, options, token, provideDocumentFormattingEdits)
					: provideDocumentFormattingEdits(document, options, token);
			}
		});
	}
}

class DocumentRangeFormattingFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, DocumentRangeFormattingRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		ensure(ensure(capabilites, 'textDocument')!, 'rangeFormatting')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.documentRangeFormattingProvider || !documentSelector) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, { documentSelector: documentSelector })
		});
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): Disposable {
		let client = this._client;
		let provideDocumentRangeFormattingEdits: ProvideDocumentRangeFormattingEditsSignature = (document, range, options, token) => {
			let params: DocumentRangeFormattingParams = {
				textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
				range: client.code2ProtocolConverter.asRange(range),
				options: client.code2ProtocolConverter.asFormattingOptions(options)
			};
			return client.sendRequest(DocumentRangeFormattingRequest.type, params, token).then(
				client.protocol2CodeConverter.asTextEdits,
				(error) => {
					client.logFailedRequest(DocumentRangeFormattingRequest.type, error);
					return Promise.resolve([]);
				}
			);
		};
		let middleware = client.clientOptions.middleware!;
		return Languages.registerDocumentRangeFormattingEditProvider(options.documentSelector!, {
			provideDocumentRangeFormattingEdits: (document: TextDocument, range: VRange, options: VFormattingOptions, token: CancellationToken): ProviderResult<VTextEdit[]> => {
				return middleware.provideDocumentRangeFormattingEdits
					? middleware.provideDocumentRangeFormattingEdits(document, range, options, token, provideDocumentRangeFormattingEdits)
					: provideDocumentRangeFormattingEdits(document, range, options, token);
			}
		});
	}
}

class DocumentOnTypeFormattingFeature extends TextDocumentFeature<DocumentOnTypeFormattingRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, DocumentOnTypeFormattingRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		ensure(ensure(capabilites, 'textDocument')!, 'onTypeFormatting')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.documentOnTypeFormattingProvider || !documentSelector) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, { documentSelector: documentSelector }, capabilities.documentOnTypeFormattingProvider)
		});
	}

	protected registerLanguageProvider(options: DocumentOnTypeFormattingRegistrationOptions): Disposable {
		let client = this._client;
		let moreTriggerCharacter = options.moreTriggerCharacter || [];
		let provideOnTypeFormattingEdits: ProvideOnTypeFormattingEditsSignature = (document, position, ch, options, token) => {
			let params: DocumentOnTypeFormattingParams = {
				textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
				position: client.code2ProtocolConverter.asPosition(position),
				ch: ch,
				options: client.code2ProtocolConverter.asFormattingOptions(options)
			};
			return client.sendRequest(DocumentOnTypeFormattingRequest.type, params, token).then(
				client.protocol2CodeConverter.asTextEdits,
				(error) => {
					client.logFailedRequest(DocumentOnTypeFormattingRequest.type, error);
					return Promise.resolve([]);
				}
			);
		};
		let middleware = client.clientOptions.middleware!;
		return Languages.registerOnTypeFormattingEditProvider(options.documentSelector!, {
			provideOnTypeFormattingEdits: (document: TextDocument, position: VPosition, ch: string, options: VFormattingOptions, token: CancellationToken): ProviderResult<VTextEdit[]> => {
				return middleware.provideOnTypeFormattingEdits
					? middleware.provideOnTypeFormattingEdits(document, position, ch, options, token, provideOnTypeFormattingEdits)
					: provideOnTypeFormattingEdits(document, position, ch, options, token);
			}
		}, options.firstTriggerCharacter, ...moreTriggerCharacter);
	}
}

class RenameFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, RenameRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		ensure(ensure(capabilites, 'textDocument')!, 'rename')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.renameProvider || !documentSelector) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, { documentSelector: documentSelector })
		});
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): Disposable {
		let client = this._client;
		let provideRenameEdits: ProvideRenameEditsSignature = (document, position, newName, token) => {
			let params: RenameParams = {
				textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
				position: client.code2ProtocolConverter.asPosition(position),
				newName: newName
			};
			return client.sendRequest(RenameRequest.type, params, token).then(
				client.protocol2CodeConverter.asWorkspaceEdit,
				(error: ResponseError<void>) => {
					client.logFailedRequest(RenameRequest.type, error);
					Promise.reject(new Error(error.message));
				}
			);
		};
		let middleware = client.clientOptions.middleware!;
		return Languages.registerRenameProvider(options.documentSelector!, {
			provideRenameEdits: (document: TextDocument, position: VPosition, newName: string, token: CancellationToken): ProviderResult<VWorkspaceEdit> => {
				return middleware.provideRenameEdits
					? middleware.provideRenameEdits(document, position, newName, token, provideRenameEdits)
					: provideRenameEdits(document, position, newName, token);
			}
		});
	}
}

class DocumentLinkFeature extends TextDocumentFeature<DocumentLinkRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, DocumentLinkRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		ensure(ensure(capabilites, 'textDocument')!, 'documentLink')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.documentLinkProvider || !documentSelector) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, { documentSelector: documentSelector }, capabilities.documentLinkProvider)
		});
	}

	protected registerLanguageProvider(options: DocumentLinkRegistrationOptions): Disposable {
		let client = this._client;
		let provideDocumentLinks: ProvideDocumentLinksSignature = (document, token) => {
			return client.sendRequest(DocumentLinkRequest.type, client.code2ProtocolConverter.asDocumentLinkParams(document), token).then(
				client.protocol2CodeConverter.asDocumentLinks,
				(error: ResponseError<void>) => {
					client.logFailedRequest(DocumentLinkRequest.type, error);
					Promise.resolve(new Error(error.message));
				}
			);
		};
		let resolveDocumentLink: ResolveDocumentLinkSignature = (link, token) => {
			return client.sendRequest(DocumentLinkResolveRequest.type, client.code2ProtocolConverter.asDocumentLink(link), token).then(
				client.protocol2CodeConverter.asDocumentLink,
				(error: ResponseError<void>) => {
					client.logFailedRequest(DocumentLinkResolveRequest.type, error);
					Promise.resolve(new Error(error.message));
				}
			);
		}
		let middleware = client.clientOptions.middleware!;
		return Languages.registerDocumentLinkProvider(options.documentSelector!, {
			provideDocumentLinks: (document: TextDocument, token: CancellationToken): ProviderResult<VDocumentLink[]> => {
				return middleware.provideDocumentLinks
					? middleware.provideDocumentLinks(document, token, provideDocumentLinks)
					: provideDocumentLinks(document, token);
			},
			resolveDocumentLink: options.resolveProvider
				? (link: VDocumentLink, token: CancellationToken): ProviderResult<VDocumentLink> => {
					return middleware.resolveDocumentLink
						? middleware.resolveDocumentLink(link, token, resolveDocumentLink)
						: resolveDocumentLink(link, token);
				}
				: undefined
		});
	}
}

class ConfigurationFeature implements DynamicFeature<DidChangeConfigurationRegistrationOptions> {

	private _listeners: Map<string, Disposable> = new Map<string, Disposable>();

	constructor(private _client: BaseLanguageClient) {
	}

	public get messages(): RPCMessageType {
		return DidChangeConfigurationNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'workspace')!, 'didChangeConfiguration')!.dynamicRegistration = true;
	}

	public initialize(): void {
		let section = this._client.clientOptions.synchronize!.configurationSection;
		if (section !== void 0) {
			this.register(this.messages, {
				id: UUID.generateUuid(),
				registerOptions: {
					section: section
				}
			})
		}
	}

	public register(_message: RPCMessageType, data: RegistrationData<DidChangeConfigurationRegistrationOptions>): void {
		let disposable = Workspace.onDidChangeConfiguration(() => {
			this.onDidChangeConfiguration(data.registerOptions.section);
		});
		this._listeners.set(data.id, disposable);
		if (data.registerOptions.section !== void 0) {
			this.onDidChangeConfiguration(data.registerOptions.section);
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
	}

	private onDidChangeConfiguration(configurationSection: string | string[] | undefined): void {
		let sections: string[] | undefined;
		if (Is.string(configurationSection)) {
			sections = [configurationSection];
		} else {
			sections = configurationSection;
		}
		let didChangeConfiguration = (sections: string[] | undefined): void => {
			if (sections === void 0) {
				this._client.sendNotification(DidChangeConfigurationNotification.type, { settings: null });
				return;
			}
			this._client.sendNotification(DidChangeConfigurationNotification.type, { settings: this.extractSettingsInformation(sections) });
		}
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
				config = Workspace.getConfiguration(key, resource);
			}
			if (config) {
				let path = keys[i].split('.');
				ensurePath(result, path)[path[path.length - 1]] = config;
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

	public get messages(): RPCMessageType {
		return ExecuteCommandRequest.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'workspace')!, 'executeCommand')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities): void {
		if (!capabilities.executeCommandProvider) {
			return;
		}
		this.register(this.messages, {
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, capabilities.executeCommandProvider)
		});
	}

	public register(_message: RPCMessageType, data: RegistrationData<ExecuteCommandRegistrationOptions>): void {
		let client = this._client;
		if (data.registerOptions.commands) {
			let disposeables: Disposable[] = [];
			for (const command of data.registerOptions.commands) {
				disposeables.push(Commands.registerCommand(command, (...args: any[]) => {
					let params: ExecuteCommandParams = {
						command,
						arguments: args
					};
					client.sendRequest(ExecuteCommandRequest.type, params).then(
						undefined,
						(error) => {
							client.logFailedRequest(ExecuteCommandRequest.type, error);
						}
					);
				}));
			}
			this._commands.set(data.id, disposeables);
		}
	}

	public unregister(id: string): void {
		let disposeables = this._commands.get(id);
		if (disposeables) {
			disposeables.forEach(disposable => disposable.dispose());
		}
	}

	public dispose(): void {
		this._commands.forEach((value) => {
			value.forEach(disposable => disposable.dispose());
		});
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

export abstract class BaseLanguageClient {

	private _id: string;
	private _name: string;
	private _clientOptions: ResolvedClientOptions;

	private _state: ClientState;
	private _onReady: Promise<void>;
	private _onReadyCallbacks: { resolve: () => void; reject: (error: any) => void; };
	private _connectionPromise: Thenable<IConnection> | undefined;
	private _resolvedConnection: IConnection | undefined;
	private _initializeResult: InitializeResult | undefined;
	private _outputChannel: OutputChannel | undefined;
	private _disposeOutputChannel: boolean;
	private _capabilities: ServerCapabilities & ResolvedTextDocumentSyncCapabilities;

	private _listeners: Disposable[] | undefined;
	private _providers: Disposable[] | undefined;
	private _diagnostics: DiagnosticCollection | undefined;

	private _fileEvents: FileEvent[];
	private _fileEventDelayer: Delayer<void>;

	private _telemetryEmitter: Emitter<any>;
	private _stateChangeEmitter: Emitter<StateChangeEvent>;

	private _trace: Trace;
	private _tracer: Tracer;

	private _c2p: c2p.Converter;
	private _p2c: p2c.Converter;

	public constructor(id: string, name: string, clientOptions: LanguageClientOptions) {
		this._id = id;
		this._name = name;

		clientOptions = clientOptions || {};
		this._clientOptions = {
			documentSelector: clientOptions.documentSelector || [],
			synchronize: clientOptions.synchronize || {},
			diagnosticCollectionName: clientOptions.diagnosticCollectionName,
			outputChannelName: clientOptions.outputChannelName || this._name,
			revealOutputChannelOn: clientOptions.revealOutputChannelOn || RevealOutputChannelOn.Error,
			stdioEncoding: clientOptions.stdioEncoding || 'utf8',
			initializationOptions: clientOptions.initializationOptions,
			initializationFailedHandler: clientOptions.initializationFailedHandler,
			errorHandler: clientOptions.errorHandler || new DefaultErrorHandler(this._name),
			middleware: clientOptions.middleware || {},
			uriConverters: clientOptions.uriConverters,
			workspaceFolder: clientOptions.workspaceFolder
		};
		this._clientOptions.synchronize = this._clientOptions.synchronize || {};

		this.state = ClientState.Initial;
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

		this._listeners = undefined;
		this._providers = undefined;
		this._diagnostics = undefined;

		this._fileEvents = [];
		this._fileEventDelayer = new Delayer<void>(250);
		this._onReady = new Promise<void>((resolve, reject) => {
			this._onReadyCallbacks = { resolve, reject };
		});
		this._telemetryEmitter = new Emitter<any>();
		this._stateChangeEmitter = new Emitter<StateChangeEvent>();
		this._tracer = {
			log: (message: string, data?: string) => {
				this.logTrace(message, data);
			}
		};
		this._c2p = c2p.createConverter(clientOptions.uriConverters ? clientOptions.uriConverters.code2Protocol : undefined);
		this._p2c = p2c.createConverter(clientOptions.uriConverters ? clientOptions.uriConverters.protocol2Code : undefined);
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
		} else {
			return State.Stopped;
		}
	}

	public get initializeResult(): InitializeResult | undefined {
		return this._initializeResult;
	}

	public sendRequest<R, E, RO>(type: RequestType0<R, E, RO>, token?: CancellationToken): Thenable<R>;
	public sendRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, params: P, token?: CancellationToken): Thenable<R>;
	public sendRequest<R>(method: string, token?: CancellationToken): Thenable<R>;
	public sendRequest<R>(method: string, param: any, token?: CancellationToken): Thenable<R>;
	public sendRequest<R>(type: string | RPCMessageType, ...params: any[]): Thenable<R> {
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

	public onRequest<R, E, RO>(type: RequestType0<R, E, RO>, handler: RequestHandler0<R, E>): void;
	public onRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, handler: RequestHandler<P, R, E>): void;
	public onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): void;
	public onRequest<R, E>(type: string | RPCMessageType, handler: GenericRequestHandler<R, E>): void {
		if (!this.isConnectionActive()) {
			throw new Error('Language client is not ready yet');
		}
		try {
			this._resolvedConnection!.onRequest(type, handler);
		} catch (error) {
			this.error(`Registering request handler ${Is.string(type) ? type : type.method} failed.`, error);
			throw error;
		}
	}

	public sendNotification<RO>(type: NotificationType0<RO>): void;
	public sendNotification<P, RO>(type: NotificationType<P, RO>, params?: P): void;
	public sendNotification(method: string): void;
	public sendNotification(method: string, params: any): void;
	public sendNotification<P>(type: string | RPCMessageType, params?: P): void {
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

	public onNotification<RO>(type: NotificationType0<RO>, handler: NotificationHandler0): void;
	public onNotification<P, RO>(type: NotificationType<P, RO>, handler: NotificationHandler<P>): void;
	public onNotification(method: string, handler: GenericNotificationHandler): void;
	public onNotification(type: string | RPCMessageType, handler: GenericNotificationHandler): void {
		if (!this.isConnectionActive()) {
			throw new Error('Language client is not ready yet');
		}
		try {
			this._resolvedConnection!.onNotification(type, handler);
		} catch (error) {
			this.error(`Registering notification handler ${Is.string(type) ? type : type.method} failed.`, error);
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

	public get diagnostics(): DiagnosticCollection | undefined {
		return this._diagnostics;
	}

	public createDefaultErrorHandler(): ErrorHandler {
		return new DefaultErrorHandler(this._name);
	}

	public set trace(value: Trace) {
		this._trace = value;
		this.onReady().then(() => {
			this.resolveConnection().then((connection) => {
				connection.trace(value, this._tracer);
			})
		}, () => {
		});
	}

	private data2String(data: any): string {
		if (data instanceof ResponseError) {
			const responseError = data as ResponseError<any>;
			return `  Message: ${responseError.message}\n  Code: ${responseError.code} ${responseError.data ? '\n' + responseError.data.toString() : ''}`
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

	public info(message: string, data?: any): void {
		this.outputChannel.appendLine(`[Info  - ${(new Date().toLocaleTimeString())}] ${message}`);
		if (data) {
			this.outputChannel.appendLine(this.data2String(data));
		}
		if (this._clientOptions.revealOutputChannelOn <= RevealOutputChannelOn.Info) {
			this.outputChannel.show(true);
		}
	}

	public warn(message: string, data?: any): void {
		this.outputChannel.appendLine(`[Warn  - ${(new Date().toLocaleTimeString())}] ${message}`);
		if (data) {
			this.outputChannel.appendLine(this.data2String(data));
		}
		if (this._clientOptions.revealOutputChannelOn <= RevealOutputChannelOn.Warn) {
			this.outputChannel.show(true);
		}
	}

	public error(message: string, data?: any): void {
		this.outputChannel.appendLine(`[Error - ${(new Date().toLocaleTimeString())}] ${message}`);
		if (data) {
			this.outputChannel.appendLine(this.data2String(data));
		}
		if (this._clientOptions.revealOutputChannelOn <= RevealOutputChannelOn.Error) {
			this.outputChannel.show(true);
		}
	}

	private logTrace(message: string, data?: any): void {
		this.outputChannel.appendLine(`[Trace - ${(new Date().toLocaleTimeString())}] ${message}`);
		if (data) {
			this.outputChannel.appendLine(this.data2String(data));
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
						this.error(message.message);
						break;
					case MessageType.Warning:
						this.warn(message.message);
						break;
					case MessageType.Info:
						this.info(message.message);
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
			connection.listen();
			// Error is handled in the intialize call.
			this.initialize(connection).then(undefined, () => { });
		}, (error) => {
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

	private resolveConnection(): Thenable<IConnection> {
		if (!this._connectionPromise) {
			this._connectionPromise = this.createConnection();
		}
		return this._connectionPromise;
	}

	private initialize(connection: IConnection): Thenable<InitializeResult> {
		this.refreshTrace(connection, false);
		let initOption = this._clientOptions.initializationOptions;
		let rootPath = this._clientOptions.workspaceFolder
			? this._clientOptions.workspaceFolder.uri.fsPath
			: Workspace.rootPath;
		let initParams: InitializeParams = {
			processId: process.pid,
			rootPath: rootPath ? rootPath : null,
			rootUri: rootPath ? this._c2p.asUri(Uri.file(rootPath)) : null,
			capabilities: this.computeClientCapabilities(),
			initializationOptions: Is.func(initOption) ? initOption() : initOption,
			trace: Trace.toString(this._trace)
		};
		this.fillInitializeParams(initParams);
		return connection.initialize(initParams).then((result) => {
			this._resolvedConnection = connection;
			this._initializeResult = result;
			this.state = ClientState.Running;

			let textDocumentSyncOptions: TextDocumentSyncOptions | undefined = undefined;
			if (Is.number(result.capabilities.textDocumentSync) && result.capabilities.textDocumentSync !== TextDocumentSyncKind.None) {
				textDocumentSyncOptions = {
					openClose: true,
					change: result.capabilities.textDocumentSync,
					save: {
						includeText: false
					}
				};
			} else if (result.capabilities.textDocumentSync !== void 0 && result.capabilities.textDocumentSync !== null) {
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
		}, (error: any) => {
			if (this._clientOptions.initializationFailedHandler) {
				if (this._clientOptions.initializationFailedHandler(error)) {
					this.initialize(connection);
				} else {
					this.stop();
					this._onReadyCallbacks.reject(error);
				}
			} else if (error instanceof ResponseError && error.data && error.data.retry) {
				Window.showErrorMessage(error.message, { title: 'Retry', id: "retry" }).then(item => {
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
		});
	}

	public stop(): Thenable<void> {
		this._initializeResult = undefined;
		if (!this._connectionPromise) {
			this.state = ClientState.Stopped;
			return Promise.resolve();
		}
		this.state = ClientState.Stopping;
		this.cleanUp();
		// unkook listeners
		return this.resolveConnection().then(connection => {
			return connection.shutdown().then(() => {
				connection.exit();
				connection.dispose();
				this.state = ClientState.Stopped;
				this._connectionPromise = undefined;
				this._resolvedConnection = undefined;
				if (this._outputChannel) {
					this._outputChannel.clear();
				}
			})
		});
	}

	private cleanUp(restart: boolean = false): void {
		if (this._listeners) {
			this._listeners.forEach(listener => listener.dispose());
			this._listeners = undefined;
		}
		if (this._providers) {
			this._providers.forEach(provider => provider.dispose());
			this._providers = undefined;
		}
		for (let handler of this._dynamicFeatures.values()) {
			handler.dispose();
		}
		if (this._outputChannel && this._disposeOutputChannel) {
			this._outputChannel.dispose();
		}
		if (!restart && this._diagnostics) {
			this._diagnostics.dispose();
			this._diagnostics = undefined;
		}
	}

	private notifyFileEvent(event: FileEvent): void {
		this._fileEvents.push(event);
		this._fileEventDelayer.trigger(() => {
			this.onReady().then(() => {
				this.resolveConnection().then(connection => {
					if (this.isConnectionActive()) {
						connection.didChangeWatchedFiles({ changes: this._fileEvents });
					}
					this._fileEvents = [];
				})
			}, (error) => {
				this.error(`Notify file events failed.`, error);
			});
		});
	}

	private forceDocumentSync(): void {
		(this._dynamicFeatures.get(DidChangeTextDocumentNotification.type.method) as DidChangeTextDocumentFeature).forceDelivery();
	}

	private handleDiagnostics(params: PublishDiagnosticsParams) {
		if (!this._diagnostics) {
			return;
		}
		let uri = this._p2c.asUri(params.uri);
		let diagnostics = this._p2c.asDiagnostics(params.diagnostics);
		this._diagnostics.set(uri, diagnostics);
	}

	protected abstract createMessageTransports(encoding: string): Thenable<MessageTransports>;

	private createConnection(): Thenable<IConnection> {
		let errorHandler = (error: Error, message: Message, count: number) => {
			this.handleConnectionError(error, message, count);
		}

		let closeHandler = () => {
			this.handleConnectionClosed();
		}

		return this.createMessageTransports(this._clientOptions.stdioEncoding || 'utf8').then((transports) => {
			return createConnection(transports.reader, transports.writer, errorHandler, closeHandler);
		});
	}

	protected handleConnectionClosed() {
		// Check whether this is a normal shutdown in progress or the client stopped normally.
		if (this.state === ClientState.Stopping || this.state === ClientState.Stopped) {
			return;
		}
		if (this._resolvedConnection) {
			this._resolvedConnection.dispose();
		}
		this._connectionPromise = undefined;
		this._resolvedConnection = undefined;
		let action = this._clientOptions.errorHandler!.closed();
		if (action === CloseAction.DoNotRestart) {
			this.error('Connection to server got closed. Server will not be restarted.');
			this.state = ClientState.Stopped;
			this.cleanUp(false);
		} else if (action === CloseAction.Restart) {
			this.info('Connection to server got closed. Server will restart.');
			this.cleanUp(true);
			this.state = ClientState.Initial;
			this.start();
		}
	}

	private handleConnectionError(error: Error, message: Message, count: number) {
		let action = this._clientOptions.errorHandler!.error(error, message, count);
		if (action === ErrorAction.Shutdown) {
			this.error('Connection to server is erroring. Shutting down server.')
			this.stop();
		}
	}

	private hookConfigurationChanged(connection: IConnection): void {
		Workspace.onDidChangeConfiguration(() => {
			this.refreshTrace(connection, true);
		});
	}

	private refreshTrace(connection: IConnection, sendNotification: boolean = false): void {
		let config = Workspace.getConfiguration(this._id);
		let trace: Trace = Trace.Off;
		if (config) {
			trace = Trace.fromString(config.get('trace.server', 'off'));
		}
		this._trace = trace;
		connection.trace(this._trace, this._tracer, sendNotification);
	}


	private hookFileEvents(_connection: IConnection): void {
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
	private readonly _method2Message: Map<string, RPCMessageType> = new Map<string, RPCMessageType>();
	private readonly _dynamicFeatures: Map<string, DynamicFeature<any>> = new Map<string, DynamicFeature<any>>();


	public registerFeatures(features: (StaticFeature | DynamicFeature<any>)[]): void {
		for (let feature of features) {
			this.registerFeature(feature);
		}
	}

	public registerFeature(feature: StaticFeature | DynamicFeature<any>): void {
		this._features.push(feature);
		if (DynamicFeature.is(feature)) {
			let messages = feature.messages;
			if (Array.isArray(messages)) {
				for (let message of messages) {
					this._method2Message.set(message.method, message);
					this._dynamicFeatures.set(message.method, feature);
				}
			} else {
				this._method2Message.set(messages.method, messages);
				this._dynamicFeatures.set(messages.method, feature);
			}
		}
	}

	private registerBuiltinFeatures() {
		const syncedDocuments: Map<string, TextDocument> = new Map<string, TextDocument>();
		this.registerFeature(new ConfigurationFeature(this));
		this.registerFeature(new DidOpenTextDocumentFeature(this, syncedDocuments));
		this.registerFeature(new DidChangeTextDocumentFeature(this));
		this.registerFeature(new WillSaveFeature(this));
		this.registerFeature(new WillSaveWaitUntilFeature(this));
		this.registerFeature(new DidSaveTextDocumentFeature(this));
		this.registerFeature(new DidCloseTextDocumentFeature(this, syncedDocuments));
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

	private fillInitializeParams(params: InitializeParams): void {
		for (let feature of this._features) {
			if (Is.func(feature.fillInitializeParams)) {
				feature.fillInitializeParams(params);
			}
		}
	}

	private computeClientCapabilities(): ClientCapabilities {
		let result: ClientCapabilities = {};
		ensure(result, 'workspace')!.applyEdit = true;
		for (let feature of this._features) {
			feature.fillClientCapabilities(result);
		}
		return result;
	}

	private initializeFeatures(_connection: IConnection): void {
		let documentSelector = this._clientOptions.documentSelector;
		for (let feature of this._features) {
			feature.initialize(this._capabilities, documentSelector);
		}
	}

	private handleRegistrationRequest(params: RegistrationParams): Thenable<void> {
		return new Promise<void>((resolve, reject) => {
			for (let registration of params.registrations) {
				const feature = this._dynamicFeatures.get(registration.method);
				if (!feature) {
					reject(new Error(`No feature implementation for ${registration.method} found. Registration failed.`));
					return;
				}
				const options = registration.registerOptions || {};
				options.documentSelector = options.documentSelector || this._clientOptions.documentSelector;
				const data: RegistrationData<any> = {
					id: registration.id,
					registerOptions: options
				}
				feature.register(this._method2Message.get(registration.method)!, data);
			}
			resolve();
		});
	}

	private handleUnregistrationRequest(params: UnregistrationParams): Thenable<void> {
		return new Promise<void>((resolve, reject) => {
			for (let unregistration of params.unregisterations) {
				const feature = this._dynamicFeatures.get(unregistration.method);
				if (!feature) {
					reject(new Error(`No feature implementation for ${unregistration.method} found. Unregistration failed.`));
					return;
				}
				feature.unregister(unregistration.id);
			};
			resolve();
		});
	}

	private handleApplyWorkspaceEdit(params: ApplyWorkspaceEditParams): Thenable<ApplyWorkspaceEditResponse> {
		// This is some sort of workaround since the version check should be done by VS Code in the Workspace.applyEdit.
		// However doing it here adds some safety since the server can lag more behind then an extension.
		let workspaceEdit: WorkspaceEdit = params.edit;
		let openTextDocuments: Map<string, TextDocument> = new Map<string, TextDocument>();
		Workspace.textDocuments.forEach((document) => openTextDocuments.set(document.uri.toString(), document));
		let versionMismatch = false;
		if (workspaceEdit.documentChanges) {
			for (const change of workspaceEdit.documentChanges) {
				if (change.textDocument.version && change.textDocument.version >= 0) {
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
		return Workspace.applyEdit(this._p2c.asWorkspaceEdit(params.edit)).then((value) => { return { applied: value }; });
	};

	public logFailedRequest(type: RPCMessageType, error: any): void {
		// If we get a request cancel don't log anything.
		if (error instanceof ResponseError && error.code === ErrorCodes.RequestCancelled) {
			return;
		}
		this.error(`Request ${type.method} failed.`, error);
	}
}