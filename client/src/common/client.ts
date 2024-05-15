/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	workspace as Workspace, window as Window, languages as Languages, version as VSCodeVersion, TextDocument, Disposable, OutputChannel,
	FileSystemWatcher as VFileSystemWatcher, DiagnosticCollection, Diagnostic as VDiagnostic, Uri, CancellationToken, WorkspaceEdit as VWorkspaceEdit,
	MessageItem, WorkspaceFolder as VWorkspaceFolder, env as Env, TextDocumentShowOptions, CancellationError, CancellationTokenSource, FileCreateEvent,
	FileRenameEvent, FileDeleteEvent, FileWillCreateEvent, FileWillRenameEvent, FileWillDeleteEvent, CompletionItemProvider, HoverProvider, SignatureHelpProvider,
	DefinitionProvider, ReferenceProvider, DocumentHighlightProvider, CodeActionProvider, DocumentFormattingEditProvider, DocumentRangeFormattingEditProvider,
	OnTypeFormattingEditProvider, RenameProvider, DocumentSymbolProvider, DocumentLinkProvider, DeclarationProvider, ImplementationProvider,
	DocumentColorProvider, SelectionRangeProvider, TypeDefinitionProvider, CallHierarchyProvider, LinkedEditingRangeProvider, TypeHierarchyProvider, WorkspaceSymbolProvider,
	ProviderResult, TextEdit as VTextEdit, InlineCompletionItemProvider
} from 'vscode';

import {
	RAL, Message, MessageSignature, Logger, ResponseError, RequestType0, RequestType, NotificationType0, NotificationType,
	ProtocolRequestType, ProtocolRequestType0, RequestHandler, RequestHandler0, GenericRequestHandler,
	ProtocolNotificationType, ProtocolNotificationType0, NotificationHandler, NotificationHandler0, GenericNotificationHandler,
	MessageReader, MessageWriter, Trace, Tracer, TraceFormat, TraceOptions, Event, Emitter, createProtocolConnection,
	ClientCapabilities, WorkspaceEdit, RegistrationRequest, RegistrationParams, UnregistrationRequest, UnregistrationParams,
	InitializeRequest, InitializeParams, InitializeResult, ServerCapabilities, TextDocumentSyncKind, TextDocumentSyncOptions,
	InitializedNotification, ShutdownRequest, ExitNotification, LogMessageNotification, MessageType, ShowMessageNotification,
	ShowMessageRequest, TelemetryEventNotification, DocumentSelector, DidChangeTextDocumentNotification,
	DidChangeWatchedFilesNotification, FileEvent, PublishDiagnosticsNotification, PublishDiagnosticsParams, ApplyWorkspaceEditRequest,
	ApplyWorkspaceEditParams, TextDocumentEdit, ResourceOperationKind, FailureHandlingKind, ProgressType, ProgressToken, DiagnosticTag,
	LSPErrorCodes, ShowDocumentRequest, ShowDocumentParams, ShowDocumentResult, WorkDoneProgress, SemanticTokensRequest,
	SemanticTokensRangeRequest, SemanticTokensDeltaRequest, Diagnostic, ApplyWorkspaceEditResult, CancellationStrategy, InitializeError, WorkDoneProgressBegin,
	WorkDoneProgressReport, WorkDoneProgressEnd, DidOpenTextDocumentNotification, WillSaveTextDocumentNotification, WillSaveTextDocumentWaitUntilRequest,
	DidSaveTextDocumentNotification, DidCloseTextDocumentNotification, DidCreateFilesNotification, DidRenameFilesNotification, DidDeleteFilesNotification,
	WillRenameFilesRequest, WillCreateFilesRequest, WillDeleteFilesRequest, CompletionRequest, HoverRequest, SignatureHelpRequest, DefinitionRequest,
	ReferencesRequest, DocumentHighlightRequest, CodeActionRequest, CodeLensRequest, DocumentFormattingRequest, DocumentRangeFormattingRequest,
	DocumentOnTypeFormattingRequest, RenameRequest, DocumentSymbolRequest, DocumentLinkRequest, DocumentColorRequest, DeclarationRequest, FoldingRangeRequest,
	ImplementationRequest, SelectionRangeRequest, TypeDefinitionRequest, CallHierarchyPrepareRequest, SemanticTokensRegistrationType, LinkedEditingRangeRequest,
	TypeHierarchyPrepareRequest, InlineValueRequest, InlayHintRequest, WorkspaceSymbolRequest, TextDocumentRegistrationOptions, FileOperationRegistrationOptions,
	ConnectionOptions, PositionEncodingKind, DocumentDiagnosticRequest, NotebookDocumentSyncRegistrationType, NotebookDocumentSyncRegistrationOptions, ErrorCodes,
	MessageStrategy, DidOpenTextDocumentParams, CodeLensResolveRequest, CompletionResolveRequest, CodeActionResolveRequest, InlayHintResolveRequest, DocumentLinkResolveRequest, WorkspaceSymbolResolveRequest,
	CancellationToken as ProtocolCancellationToken, InlineCompletionRequest, InlineCompletionRegistrationOptions, ExecuteCommandRequest, ExecuteCommandOptions, HandlerResult
} from 'vscode-languageserver-protocol';

import * as c2p from './codeConverter';
import * as p2c from './protocolConverter';

import * as Is from './utils/is';
import { Delayer, Semaphore } from './utils/async';
import * as UUID from './utils/uuid';
import { ProgressPart } from './progressPart';
import {
	DynamicFeature, ensure, FeatureClient, LSPCancellationError, TextDocumentSendFeature, RegistrationData, StaticFeature,
	TextDocumentProviderFeature, WorkspaceProviderFeature
} from './features';

import { DiagnosticFeature, DiagnosticProviderMiddleware, DiagnosticProviderShape, $DiagnosticPullOptions, DiagnosticFeatureShape } from './diagnostic';
import { NotebookDocumentMiddleware, $NotebookDocumentOptions, NotebookDocumentProviderShape, NotebookDocumentSyncFeature } from './notebook';
import {
	ConfigurationFeature, ConfigurationMiddleware, $ConfigurationOptions, DidChangeConfigurationMiddleware, SyncConfigurationFeature,
	SynchronizeOptions
} from './configuration';
import {
	DidChangeTextDocumentFeature, DidChangeTextDocumentFeatureShape, DidCloseTextDocumentFeature, DidCloseTextDocumentFeatureShape, DidOpenTextDocumentFeature,
	DidOpenTextDocumentFeatureShape, DidSaveTextDocumentFeature, DidSaveTextDocumentFeatureShape, ResolvedTextDocumentSyncCapabilities, TextDocumentSynchronizationMiddleware, WillSaveFeature,
	WillSaveWaitUntilFeature
} from './textSynchronization';
import { CompletionItemFeature, CompletionMiddleware } from './completion';
import { HoverFeature, HoverMiddleware } from './hover';
import { DefinitionFeature, DefinitionMiddleware } from './definition';
import { SignatureHelpFeature, SignatureHelpMiddleware } from './signatureHelp';
import { DocumentHighlightFeature, DocumentHighlightMiddleware } from './documentHighlight';
import { DocumentSymbolFeature, DocumentSymbolMiddleware } from './documentSymbol';
import { WorkspaceSymbolFeature, WorkspaceSymbolMiddleware } from './workspaceSymbol';
import { ReferencesFeature, ReferencesMiddleware } from './reference';
import { TypeDefinitionFeature, TypeDefinitionMiddleware } from './typeDefinition';
import { ImplementationFeature, ImplementationMiddleware } from './implementation';
import { ColorProviderFeature, ColorProviderMiddleware } from './colorProvider';
import { CodeActionFeature, CodeActionMiddleware } from './codeAction';
import { CodeLensFeature, CodeLensMiddleware, CodeLensProviderShape } from './codeLens';
import { DocumentFormattingFeature, DocumentOnTypeFormattingFeature, DocumentRangeFormattingFeature, FormattingMiddleware } from './formatting';
import { RenameFeature, RenameMiddleware } from './rename';
import { DocumentLinkFeature, DocumentLinkMiddleware } from './documentLink';
import { ExecuteCommandFeature, ExecuteCommandMiddleware } from './executeCommand';
import { FoldingRangeFeature, FoldingRangeProviderMiddleware, FoldingRangeProviderShape } from './foldingRange';
import { DeclarationFeature, DeclarationMiddleware } from './declaration';
import { SelectionRangeFeature, SelectionRangeProviderMiddleware } from './selectionRange';
import { CallHierarchyFeature, CallHierarchyMiddleware } from './callHierarchy';
import { SemanticTokensFeature, SemanticTokensMiddleware, SemanticTokensProviderShape } from './semanticTokens';
import { LinkedEditingFeature, LinkedEditingRangeMiddleware } from './linkedEditingRange';
import { TypeHierarchyFeature, TypeHierarchyMiddleware } from './typeHierarchy';
import { InlineValueFeature, InlineValueMiddleware, InlineValueProviderShape } from './inlineValue';
import { InlayHintsFeature, InlayHintsMiddleware, InlayHintsProviderShape } from './inlayHint';
import { WorkspaceFoldersFeature, WorkspaceFolderMiddleware } from './workspaceFolder';
import { DidCreateFilesFeature, DidDeleteFilesFeature, DidRenameFilesFeature, WillCreateFilesFeature, WillDeleteFilesFeature, WillRenameFilesFeature, FileOperationsMiddleware } from './fileOperations';
import { InlineCompletionItemFeature, InlineCompletionMiddleware } from './inlineCompletion';
import { FileSystemWatcherFeature } from './fileSystemWatcher';
import { ProgressFeature } from './progress';

/**
 * Controls when the output channel is revealed.
 */
export enum RevealOutputChannelOn {
	Debug = 0,
	Info = 1,
	Warn = 2,
	Error = 3,
	Never = 4
}

/**
 * A handler that is invoked when the initialization of the server failed.
 */
export type InitializationFailedHandler =
	/**
	 * @param error The error returned from the server
	 * @returns if true is returned the client tries to reinitialize the server.
	 *  Implementors of a handler are responsible to not initialize the server
	 *  infinitely. Return false if initialization should stop and an error
	 *  should be reported.
	 */
	(error: ResponseError<InitializeError> | Error | any) => boolean;


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

export type ErrorHandlerResult = {
	/**
	 * The action to take.
	 */
	action: ErrorAction;

	/**
	 * An optional message to be presented to the user.
	 */
	message?: string;

	/**
	 * If set to true the client assumes that the corresponding
	 * error handler has presented an appropriate message to the
	 * user and the message will only be log to the client's
	 * output channel.
	 */
	handled?: boolean;
};

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

export type CloseHandlerResult = {
	/**
	 * The action to take.
	 */
	action: CloseAction;

	/**
	 * An optional message to be presented to the user.
	 */
	message?: string;

	/**
	 * If set to true the client assumes that the corresponding
	 * close handler has presented an appropriate message to the
	 * user and the message will only be log to the client's
	 * output channel.
	 */
	handled?: boolean;
};

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
	error(error: Error, message: Message | undefined, count: number | undefined): ErrorHandlerResult | Promise<ErrorHandlerResult>;

	/**
	 * The connection to the server got closed.
	 */
	closed(): CloseHandlerResult | Promise<CloseHandlerResult>;
}

/**
 * Signals in which state the language client is in.
 */
export enum State {
	/**
	 * The client is stopped or got never started.
	 */
	Stopped = 1,
	/**
	 * The client is starting but not ready yet.
	 */
	Starting = 3,
	/**
	 * The start has failed.
	 */
	StartFailed = 4,
	/**
	 * The client is running and ready.
	 */
	Running = 2,
}

/**
 * An event signaling a state change.
 */
export interface StateChangeEvent {
	oldState: State;
	newState: State;
}

export enum SuspendMode {
	/**
	 * Don't allow suspend mode.
	 */
	off = 'off',

	/**
	 * Support suspend mode even if not all
	 * registered providers have a corresponding
	 * activation listener.
	 */
	on = 'on',
}

export type SuspendOptions = {
	/**
	 * Whether suspend mode is supported. If suspend mode is allowed
	 * the client will stop a running server when going into suspend mode.
	 * If omitted defaults to SuspendMode.off;
	 */
	mode?: SuspendMode;

	/**
	 * A callback that is invoked before actually suspending
	 * the server. If `false` is returned the client will not continue
	 * suspending the server.
	 */
	callback?: () => Promise<boolean>;

	/**
	 * The interval in milliseconds used to check if the server
	 * can be suspended. If the check passes three times in a row
	 * (e.g. the server can be suspended for 3 * interval ms) the
	 * server is suspended. Defaults to 60000ms, which is also the
	 * minimum allowed value.
	 */
	interval?: number;
};


export interface DidChangeWatchedFileSignature {
	(this: void, event: FileEvent): Promise<void>;
}

type _WorkspaceMiddleware = {
	didChangeWatchedFile?: (this: void, event: FileEvent, next: DidChangeWatchedFileSignature) => Promise<void>;
	handleApplyEdit?: (this: void, params: ApplyWorkspaceEditParams, next: ApplyWorkspaceEditRequest.HandlerSignature) => HandlerResult<ApplyWorkspaceEditResult, void>;
};

export type WorkspaceMiddleware = _WorkspaceMiddleware & ConfigurationMiddleware & DidChangeConfigurationMiddleware & WorkspaceFolderMiddleware & FileOperationsMiddleware;

interface _WindowMiddleware {
	showDocument?: (this: void, params: ShowDocumentParams, next: ShowDocumentRequest.HandlerSignature) => Promise<ShowDocumentResult>;
}
export type WindowMiddleware = _WindowMiddleware;

export interface HandleDiagnosticsSignature {
	(this: void, uri: Uri, diagnostics: VDiagnostic[]): void;
}

export interface HandleWorkDoneProgressSignature {
	(this: void, token: ProgressToken, params: WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd): void;
}

interface _Middleware {
	handleDiagnostics?: (this: void, uri: Uri, diagnostics: VDiagnostic[], next: HandleDiagnosticsSignature) => void;
	handleWorkDoneProgress?: (this: void, token: ProgressToken, params: WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd, next: HandleWorkDoneProgressSignature) => void;
	handleRegisterCapability?: (this: void, params: RegistrationParams, next: RegistrationRequest.HandlerSignature) => Promise<void>;
	handleUnregisterCapability?: (this: void, params: UnregistrationParams, next: UnregistrationRequest.HandlerSignature) => Promise<void>;
	workspace?: WorkspaceMiddleware;
	window?: WindowMiddleware;
}

// A general middleware is applied to both requests and notifications
interface GeneralMiddleware {
	sendRequest?<P, R>(
		this: void,
		type: string | MessageSignature,
		param: P | undefined,
		token: CancellationToken | undefined,
		next: (type: string | MessageSignature, param?: P, token?: CancellationToken) => Promise<R>,
	): Promise<R>;

	sendNotification?<R>(
		this: void,
		type: string | MessageSignature,
		next: (type: string | MessageSignature, params?: R) => Promise<void>,
		params: R
	): Promise<void>;
}

/**
 * The Middleware lets extensions intercept the request and notifications send and received
 * from the server
 */
export type Middleware = _Middleware & TextDocumentSynchronizationMiddleware & CompletionMiddleware & HoverMiddleware & DefinitionMiddleware & SignatureHelpMiddleware &
DocumentHighlightMiddleware & DocumentSymbolMiddleware & WorkspaceSymbolMiddleware & ReferencesMiddleware & TypeDefinitionMiddleware & ImplementationMiddleware &
ColorProviderMiddleware & CodeActionMiddleware & CodeLensMiddleware & FormattingMiddleware & RenameMiddleware & DocumentLinkMiddleware & ExecuteCommandMiddleware &
FoldingRangeProviderMiddleware & DeclarationMiddleware & SelectionRangeProviderMiddleware & CallHierarchyMiddleware & SemanticTokensMiddleware &
LinkedEditingRangeMiddleware & TypeHierarchyMiddleware & InlineValueMiddleware & InlayHintsMiddleware & NotebookDocumentMiddleware & DiagnosticProviderMiddleware & InlineCompletionMiddleware & GeneralMiddleware;

export type LanguageClientOptions = {
	documentSelector?: DocumentSelector | string[];
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
		code2Protocol: c2p.URIConverter;
		protocol2Code: p2c.URIConverter;
	};
	workspaceFolder?: VWorkspaceFolder;
	connectionOptions?: {
		cancellationStrategy?: CancellationStrategy;
		messageStrategy?: MessageStrategy;
		maxRestartCount?: number;
	};
	markdown?: {
		isTrusted?: boolean | { readonly enabledCommands: readonly string[] };
		supportHtml?: boolean;
	};
} & $NotebookDocumentOptions & $DiagnosticPullOptions & $ConfigurationOptions;

// type TestOptions = {
// 	$testMode?: boolean;
// };

type ResolvedClientOptions = {
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
		code2Protocol: c2p.URIConverter;
		protocol2Code: p2c.URIConverter;
	};
	workspaceFolder?: VWorkspaceFolder;
	connectionOptions?: {
		cancellationStrategy?: CancellationStrategy;
		messageStrategy?: MessageStrategy;
		maxRestartCount?: number;
	};
	markdown: {
		isTrusted: boolean | { readonly enabledCommands: readonly string[] };
		supportHtml: boolean;
	};
} & Required<$NotebookDocumentOptions> & Required<$DiagnosticPullOptions>;
namespace ResolvedClientOptions {
	export function sanitizeIsTrusted(isTrusted?: boolean | { readonly enabledCommands: readonly string[] }): boolean | { readonly enabledCommands: readonly string[] } {
		if (isTrusted === undefined || isTrusted === null) {
			return false;
		}
		if ((typeof isTrusted === 'boolean') || (typeof isTrusted === 'object' && isTrusted !== null && Is.stringArray(isTrusted.enabledCommands))) {
			return isTrusted;
		}
		return false;
	}
}

class DefaultErrorHandler implements ErrorHandler {

	private readonly restarts: number[];

	constructor(private client: BaseLanguageClient, private maxRestartCount: number) {
		this.restarts = [];
	}

	public error(_error: Error, _message: Message, count: number): ErrorHandlerResult {
		if (count && count <= 3) {
			return { action: ErrorAction.Continue };
		}
		return { action: ErrorAction.Shutdown };
	}

	public closed(): CloseHandlerResult {
		this.restarts.push(Date.now());
		if (this.restarts.length <= this.maxRestartCount) {
			return { action: CloseAction.Restart };
		} else {
			const diff = this.restarts[this.restarts.length - 1] - this.restarts[0];
			if (diff <= 3 * 60 * 1000) {
				return { action: CloseAction.DoNotRestart, message: `The ${this.client.name} server crashed ${this.maxRestartCount+1} times in the last 3 minutes. The server will not be restarted. See the output for more information.` };
			} else {
				this.restarts.shift();
				return { action: CloseAction.Restart };
			}
		}
	}
}

enum ClientState {
	Initial = 'initial',
	Starting = 'starting',
	StartFailed = 'startFailed',
	Running = 'running',
	Stopping = 'stopping',
	Stopped = 'stopped'
}

export interface MessageTransports {
	reader: MessageReader;
	writer: MessageWriter;
	detached?: boolean;
}

export namespace MessageTransports {
	export function is(value: any): value is MessageTransports {
		const candidate: MessageTransports = value;
		return candidate && MessageReader.is(value.reader) && MessageWriter.is(value.writer);
	}
}

export enum ShutdownMode {
	Restart = 'restart',
	Stop = 'stop'
}

export abstract class BaseLanguageClient implements FeatureClient<Middleware, LanguageClientOptions> {

	private _id: string;
	private _name: string;
	private _clientOptions: ResolvedClientOptions;

	private _state: ClientState;
	private _onStart: Promise<void> | undefined;
	private _onStop: Promise<void> | undefined;
	private _connection: Connection | undefined;
	private _idleInterval: Disposable | undefined;
	private readonly _ignoredRegistrations: Set<string>;
	// private _idleStart: number | undefined;
	private readonly _listeners: Disposable[];
	private _disposed: 'disposing' | 'disposed' | undefined;

	private readonly _notificationHandlers: Map<string, GenericNotificationHandler>;
	private readonly _notificationDisposables: Map<string, Disposable>;
	private readonly _pendingNotificationHandlers: Map<string, GenericNotificationHandler>;
	private readonly _requestHandlers: Map<string, GenericRequestHandler<unknown, unknown>>;
	private readonly _requestDisposables: Map<string, Disposable>;
	private readonly _pendingRequestHandlers: Map<string, GenericRequestHandler<unknown, unknown>>;
	private readonly _progressHandlers: Map<string | number,  { type: ProgressType<any>; handler: NotificationHandler<any> }>;
	private readonly _pendingProgressHandlers: Map<string | number,  { type: ProgressType<any>; handler: NotificationHandler<any> }>;
	private readonly _progressDisposables: Map<string | number,  Disposable>;

	private _initializeResult: InitializeResult | undefined;
	private _outputChannel: OutputChannel | undefined;
	private _disposeOutputChannel: boolean;
	private _traceOutputChannel: OutputChannel | undefined;
	private _capabilities!: ServerCapabilities & ResolvedTextDocumentSyncCapabilities;

	private _diagnostics: DiagnosticCollection | undefined;
	private _syncedDocuments: Map<string, TextDocument>;

	private _didChangeTextDocumentFeature: DidChangeTextDocumentFeature | undefined;
	private readonly _pendingOpenNotifications: Set<string>;
	private readonly _pendingChangeSemaphore: Semaphore<void>;
	private readonly _pendingChangeDelayer: Delayer<void>;

	private _fileEvents: FileEvent[];
	private _fileEventDelayer: Delayer<void>;

	private _telemetryEmitter: Emitter<any>;
	private _stateChangeEmitter: Emitter<StateChangeEvent>;

	private _trace: Trace;
	private _traceFormat: TraceFormat = TraceFormat.Text;
	private _tracer: Tracer;

	private readonly _c2p: c2p.Converter;
	private readonly _p2c: p2c.Converter;

	public constructor(id: string, name: string, clientOptions: LanguageClientOptions) {
		this._id = id;
		this._name = name;

		clientOptions = clientOptions || {};

		const markdown: ResolvedClientOptions['markdown'] = { isTrusted: false, supportHtml: false };
		if (clientOptions.markdown !== undefined) {
			markdown.isTrusted = ResolvedClientOptions.sanitizeIsTrusted(clientOptions.markdown.isTrusted);
			markdown.supportHtml = clientOptions.markdown.supportHtml === true;
		}

		// const defaultInterval = (clientOptions as TestOptions).$testMode ? 50 : 60000;

		this._clientOptions = {
			documentSelector: clientOptions.documentSelector ?? [],
			synchronize: clientOptions.synchronize ?? {},
			diagnosticCollectionName: clientOptions.diagnosticCollectionName,
			outputChannelName: clientOptions.outputChannelName ?? this._name,
			revealOutputChannelOn: clientOptions.revealOutputChannelOn ?? RevealOutputChannelOn.Error,
			stdioEncoding: clientOptions.stdioEncoding ?? 'utf8',
			initializationOptions: clientOptions.initializationOptions,
			initializationFailedHandler: clientOptions.initializationFailedHandler,
			progressOnInitialization: !!clientOptions.progressOnInitialization,
			errorHandler: clientOptions.errorHandler ?? this.createDefaultErrorHandler(clientOptions.connectionOptions?.maxRestartCount),
			middleware: clientOptions.middleware ?? {},
			uriConverters: clientOptions.uriConverters,
			workspaceFolder: clientOptions.workspaceFolder,
			connectionOptions: clientOptions.connectionOptions,
			markdown,
			// suspend: {
			// 	mode: clientOptions.suspend?.mode ?? SuspendMode.off,
			// 	callback: clientOptions.suspend?.callback ?? (() => Promise.resolve(true)),
			// 	interval: clientOptions.suspend?.interval ? Math.max(clientOptions.suspend.interval, defaultInterval) : defaultInterval
			// },
			diagnosticPullOptions: clientOptions.diagnosticPullOptions ?? { onChange: true, onSave: false },
			notebookDocumentOptions: clientOptions.notebookDocumentOptions ?? { }
		};
		this._clientOptions.synchronize = this._clientOptions.synchronize || {};

		this._state = ClientState.Initial;
		this._ignoredRegistrations = new Set();
		this._listeners = [];

		this._notificationHandlers = new Map();
		this._pendingNotificationHandlers = new Map();
		this._notificationDisposables = new Map();
		this._requestHandlers = new Map();
		this._pendingRequestHandlers = new Map();
		this._requestDisposables = new Map();
		this._progressHandlers = new Map();
		this._pendingProgressHandlers = new Map();
		this._progressDisposables = new Map();

		this._connection = undefined;
		// this._idleStart = undefined;
		this._initializeResult = undefined;
		if (clientOptions.outputChannel) {
			this._outputChannel = clientOptions.outputChannel;
			this._disposeOutputChannel = false;
		} else {
			this._outputChannel = undefined;
			this._disposeOutputChannel = true;
		}
		this._traceOutputChannel = clientOptions.traceOutputChannel;
		this._diagnostics = undefined;

		this._pendingOpenNotifications = new Set();
		this._pendingChangeSemaphore = new Semaphore(1);
		this._pendingChangeDelayer = new Delayer<void>(250);

		this._fileEvents = [];
		this._fileEventDelayer = new Delayer<void>(250);
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
		this._p2c = p2c.createConverter(
			clientOptions.uriConverters ? clientOptions.uriConverters.protocol2Code : undefined,
			this._clientOptions.markdown.isTrusted,
			this._clientOptions.markdown.supportHtml);
		this._syncedDocuments = new Map<string, TextDocument>();
		this.registerBuiltinFeatures();
	}

	public get name(): string {
		return this._name;
	}

	public get middleware(): Middleware {
		return this._clientOptions.middleware ?? Object.create(null);
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

	public get state(): State {
		return this.getPublicState();
	}

	private get $state(): ClientState {
		return this._state;
	}

	private set $state(value: ClientState) {
		const oldState = this.getPublicState();
		this._state = value;
		const newState = this.getPublicState();
		if (newState !== oldState) {
			this._stateChangeEmitter.fire({ oldState, newState });
		}
	}

	private getPublicState(): State {
		switch (this.$state) {
			case ClientState.Starting:
				return State.Starting;
			case ClientState.Running:
				return State.Running;
			case ClientState.StartFailed:
				return State.StartFailed;
			default:
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
	public async sendRequest<R>(type: string | MessageSignature, ...params: any[]): Promise<R> {
		if (this.$state === ClientState.StartFailed || this.$state === ClientState.Stopping || this.$state === ClientState.Stopped) {
			return Promise.reject(new ResponseError(ErrorCodes.ConnectionInactive, `Client is not running`));
		}

		// Ensure we have a connection before we force the document sync.
		const connection = await this.$start();
		// If any document is synced in full mode make sure we flush any pending
		// full document syncs.
		if (this._didChangeTextDocumentFeature!.syncKind === TextDocumentSyncKind.Full) {
			await this.sendPendingFullTextDocumentChanges(connection);
		}

		let param: any | undefined = undefined;
		let token: CancellationToken | undefined = undefined;
		// Separate cancellation tokens from other parameters for a better client interface
		if (params.length === 1) {
			// CancellationToken is an interface, so we need to check if the first param complies to it
			if (ProtocolCancellationToken.is(params[0])) {
				token = params[0];
			} else {
				param = params[0];
			}
		} else if (params.length === 2) {
			param = params[0];
			token = params[1];
		}
		if (token !== undefined && token.isCancellationRequested) {
			return Promise.reject(new ResponseError(LSPErrorCodes.RequestCancelled, 'Request got cancelled'));
		}
		const _sendRequest = this._clientOptions.middleware?.sendRequest;
		if (_sendRequest !== undefined) {
			// Return the general middleware invocation defining `next` as a utility function that reorganizes parameters to
			// pass them to the original sendRequest function.
			return _sendRequest(type, param, token, (type, param, token) => {
				const params: any[] = [];

				// Add the parameters if there are any
				if (param !== undefined) {
					params.push(param);
				}

				// Add the cancellation token if there is one
				if (token !== undefined) {
					params.push(token);
				}

				return connection.sendRequest<R>(type, ...params);
			});
		} else {
			return connection.sendRequest<R>(type, ...params);
		}
	}

	public onRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, handler: RequestHandler0<R, E>): Disposable;
	public onRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, handler: RequestHandler<P, R, E>): Disposable;
	public onRequest<R, E>(type: RequestType0<R, E>, handler: RequestHandler0<R, E>): Disposable;
	public onRequest<P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): Disposable;
	public onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): Disposable;
	public onRequest<R, E>(type: string | MessageSignature, handler: GenericRequestHandler<R, E>): Disposable {
		const method = typeof type === 'string' ? type : type.method;
		this._requestHandlers.set(method, handler);
		const connection = this.activeConnection();
		let disposable: Disposable;
		if (connection !== undefined) {
			this._requestDisposables.set(method, connection.onRequest(type, handler));
			disposable = {
				dispose: () => {
					const disposable = this._requestDisposables.get(method);
					if (disposable !== undefined) {
						disposable.dispose();
						this._requestDisposables.delete(method);
					}
				}
			};
		} else {
			this._pendingRequestHandlers.set(method, handler);
			disposable = {
				dispose: () => {
					this._pendingRequestHandlers.delete(method);
					const disposable = this._requestDisposables.get(method);
					if (disposable !== undefined) {
						disposable.dispose();
						this._requestDisposables.delete(method);
					}
				}
			};
		}
		return {
			dispose: () => {
				this._requestHandlers.delete(method);
				disposable.dispose();
			}
		};
	}

	public sendNotification<RO>(type: ProtocolNotificationType0<RO>): Promise<void>;
	public sendNotification<P, RO>(type: ProtocolNotificationType<P, RO>, params?: P): Promise<void>;
	public sendNotification(type: NotificationType0): Promise<void>;
	public sendNotification<P>(type: NotificationType<P>, params?: P): Promise<void>;
	public sendNotification(method: string): Promise<void>;
	public sendNotification(method: string, params: any): Promise<void>;
	public async sendNotification<P>(type: string | MessageSignature, params?: P): Promise<void> {
		if (this.$state === ClientState.StartFailed || this.$state === ClientState.Stopping || this.$state === ClientState.Stopped) {
			return Promise.reject(new ResponseError(ErrorCodes.ConnectionInactive, `Client is not running`));
		}

		const needsPendingFullTextDocumentSync: boolean = this._didChangeTextDocumentFeature!.syncKind === TextDocumentSyncKind.Full;
		let openNotification: string | undefined;
		if (needsPendingFullTextDocumentSync && typeof type !== 'string' && type.method === DidOpenTextDocumentNotification.method) {
			openNotification = (params as DidOpenTextDocumentParams)?.textDocument.uri;
			this._pendingOpenNotifications.add(openNotification);
		}
		// Ensure we have a connection before we force the document sync.
		const connection = await this.$start();
		// If any document is synced in full mode make sure we flush any pending
		// full document syncs.
		if (needsPendingFullTextDocumentSync) {
			await this.sendPendingFullTextDocumentChanges(connection);
		}
		// We need to remove the pending open notification before we actually
		// send the notification over the connection. Otherwise there could be
		// a request coming in that although the open notification got already put
		// onto the wire will ignore pending document changes.
		//
		// Since the code path of connection.sendNotification is actually sync
		// until the message is handed of to the writer and the writer as a semaphore
		// lock with a capacity of 1 no additional async scheduling can happen until
		// the message is actually handed of.
		if (openNotification !== undefined) {
			this._pendingOpenNotifications.delete(openNotification);
		}

		const _sendNotification = this._clientOptions.middleware?.sendNotification;

		return _sendNotification
			? _sendNotification(type, connection.sendNotification.bind(connection), params)
			: connection.sendNotification(type, params);
	}

	public onNotification<RO>(type: ProtocolNotificationType0<RO>, handler: NotificationHandler0): Disposable;
	public onNotification<P, RO>(type: ProtocolNotificationType<P, RO>, handler: NotificationHandler<P>): Disposable;
	public onNotification(type: NotificationType0, handler: NotificationHandler0): Disposable;
	public onNotification<P>(type: NotificationType<P>, handler: NotificationHandler<P>): Disposable;
	public onNotification(method: string, handler: GenericNotificationHandler): Disposable;
	public onNotification(type: string | MessageSignature, handler: GenericNotificationHandler): Disposable {
		const method = typeof type === 'string' ? type : type.method;
		this._notificationHandlers.set(method, handler);
		const connection = this.activeConnection();
		let disposable: Disposable;
		if (connection !== undefined) {
			this._notificationDisposables.set(method, connection.onNotification(type, handler));
			disposable = {
				dispose: () => {
					const disposable = this._notificationDisposables.get(method);
					if (disposable !== undefined) {
						disposable.dispose();
						this._notificationDisposables.delete(method);
					}
				}
			};
		} else {
			this._pendingNotificationHandlers.set(method, handler);
			disposable = {
				dispose: () => {
					this._pendingNotificationHandlers.delete(method);
					const disposable = this._notificationDisposables.get(method);
					if (disposable !== undefined) {
						disposable.dispose();
						this._notificationDisposables.delete(method);
					}
				}
			};
		}
		return {
			dispose: () => {
				this._notificationHandlers.delete(method);
				disposable.dispose();
			}
		};
	}

	public async sendProgress<P>(type: ProgressType<P>, token: string | number, value: P): Promise<void> {
		if (this.$state === ClientState.StartFailed || this.$state === ClientState.Stopping || this.$state === ClientState.Stopped) {
			return Promise.reject(new ResponseError(ErrorCodes.ConnectionInactive, `Client is not running`));
		}
		try {
			// Ensure we have a connection before we force the document sync.
			const connection = await this.$start();
			return connection.sendProgress(type, token, value);
		} catch (error) {
			this.error(`Sending progress for token ${token} failed.`, error);
			throw error;
		}
	}

	public onProgress<P>(type: ProgressType<P>, token: string | number, handler: NotificationHandler<P>): Disposable {
		this._progressHandlers.set(token, { type, handler });
		const connection = this.activeConnection();
		let disposable: Disposable;
		const handleWorkDoneProgress = this._clientOptions.middleware?.handleWorkDoneProgress;
		const realHandler = WorkDoneProgress.is(type) && handleWorkDoneProgress !== undefined
			? (params: P) => {
				handleWorkDoneProgress(token, params as any, () => handler(params as unknown as P));
			}
			: handler;
		if (connection !== undefined) {
			this._progressDisposables.set(token, connection.onProgress(type, token, realHandler));
			disposable = {
				dispose: () => {
					const disposable = this._progressDisposables.get(token);
					if (disposable !== undefined) {
						disposable.dispose();
						this._progressDisposables.delete(token);
					}
				}
			};
		} else {
			this._pendingProgressHandlers.set(token, { type, handler });
			disposable = {
				dispose: () => {
					this._pendingProgressHandlers.delete(token);
					const disposable = this._progressDisposables.get(token);
					if (disposable !== undefined) {
						disposable.dispose();
						this._progressDisposables.delete(token);
					}
				}
			};
		}
		return {
			dispose: (): void => {
				this._progressHandlers.delete(token);
				disposable.dispose();
			}
		};
	}

	public createDefaultErrorHandler(maxRestartCount?: number): ErrorHandler {
		if (maxRestartCount !== undefined && maxRestartCount < 0) {
			throw new Error(`Invalid maxRestartCount: ${maxRestartCount}`);
		}
		return new DefaultErrorHandler(this, maxRestartCount ?? 4);
	}

	public async setTrace(value: Trace): Promise<void> {
		this._trace = value;
		const connection = this.activeConnection();
		if (connection !== undefined) {
			await connection.trace(this._trace, this._tracer, {
				sendNotification: false,
				traceFormat: this._traceFormat
			});
		}
	}

	private data2String(data: Object): string {
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

	public debug(message: string, data?: any, showNotification: boolean = true): void {
		this.logOutputMessage(MessageType.Debug, RevealOutputChannelOn.Debug, 'Debug', message, data, showNotification);
	}

	public info(message: string, data?: any, showNotification: boolean = true): void {
		this.logOutputMessage(MessageType.Info, RevealOutputChannelOn.Info, 'Info', message, data, showNotification);
	}

	public warn(message: string, data?: any, showNotification: boolean = true): void {
		this.logOutputMessage(MessageType.Warning, RevealOutputChannelOn.Warn, 'Warn', message, data, showNotification);
	}

	public error(message: string, data?: any, showNotification: boolean | 'force' = true): void {
		this.logOutputMessage(MessageType.Error, RevealOutputChannelOn.Error, 'Error', message, data, showNotification);
	}

	private logOutputMessage(type: MessageType, reveal: RevealOutputChannelOn, name: string, message: string, data: any | undefined, showNotification: boolean | 'force'): void {
		this.outputChannel.appendLine(`[${name.padEnd(5)} - ${(new Date().toLocaleTimeString())}] ${message}`);
		if (data !== null && data !== undefined) {
			this.outputChannel.appendLine(this.data2String(data));
		}
		if (showNotification === 'force' || (showNotification && this._clientOptions.revealOutputChannelOn <= reveal)) {
			this.showNotificationMessage(type, message);
		}
	}

	private showNotificationMessage(type: MessageType, message?: string) {
		message = message ?? 'A request has failed. See the output for more information.';
		const messageFunc = type === MessageType.Error
			? Window.showErrorMessage
			: type === MessageType.Warning
				? Window.showWarningMessage
				: Window.showInformationMessage;
		void messageFunc(message, 'Go to output').then((selection) => {
			if (selection !== undefined) {
				this.outputChannel.show(true);
			}
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
		return this.$state === ClientState.Initial || this.$state === ClientState.Stopping || this.$state === ClientState.Stopped;
	}

	public needsStop(): boolean {
		return this.$state === ClientState.Starting || this.$state === ClientState.Running;
	}

	private activeConnection(): Connection | undefined {
		return this.$state === ClientState.Running && this._connection !== undefined ? this._connection : undefined;
	}

	public isRunning(): boolean {
		return this.$state === ClientState.Running;
	}

	public async start(): Promise<void> {
		if (this._disposed === 'disposing' || this._disposed === 'disposed') {
			throw new Error(`Client got disposed and can't be restarted.`);
		}
		if (this.$state === ClientState.Stopping) {
			throw new Error(`Client is currently stopping. Can only restart a full stopped client`);
		}
		// We are already running or are in the process of getting up
		// to speed.
		if (this._onStart !== undefined) {
			return this._onStart;
		}
		const [promise, resolve, reject] = this.createOnStartPromise();
		this._onStart = promise;

		// If we restart then the diagnostics collection is reused.
		if (this._diagnostics === undefined) {
			this._diagnostics = this._clientOptions.diagnosticCollectionName
				? Languages.createDiagnosticCollection(this._clientOptions.diagnosticCollectionName)
				: Languages.createDiagnosticCollection();
		}

		// When we start make all buffer handlers pending so that they
		// get added.
		for (const [method, handler] of this._notificationHandlers) {
			if (!this._pendingNotificationHandlers.has(method)) {
				this._pendingNotificationHandlers.set(method, handler);
			}
		}
		for (const [method, handler] of this._requestHandlers) {
			if (!this._pendingRequestHandlers.has(method)) {
				this._pendingRequestHandlers.set(method, handler);
			}
		}
		for (const [token, data] of this._progressHandlers) {
			if (!this._pendingProgressHandlers.has(token)) {
				this._pendingProgressHandlers.set(token, data);
			}
		}

		this.$state = ClientState.Starting;
		try {
			const connection = await this.createConnection();
			connection.onNotification(LogMessageNotification.type, (message) => {
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
					case MessageType.Debug:
						this.debug(message.message, undefined, false);
						break;
					default:
						this.outputChannel.appendLine(message.message);
				}
			});
			connection.onNotification(ShowMessageNotification.type, (message) => {
				switch (message.type) {
					case MessageType.Error:
						void Window.showErrorMessage(message.message);
						break;
					case MessageType.Warning:
						void Window.showWarningMessage(message.message);
						break;
					case MessageType.Info:
						void Window.showInformationMessage(message.message);
						break;
					default:
						void Window.showInformationMessage(message.message);
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
				const actions = params.actions || [];
				return messageFunc(params.message, ...actions);
			});
			connection.onNotification(TelemetryEventNotification.type, (data) => {
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
						return { success: false };
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
			await this.initialize(connection);
			resolve();
		} catch (error) {
			this.$state = ClientState.StartFailed;
			this.error(`${this._name} client: couldn't create connection to server.`, error, 'force');
			reject(error);
		}
		return this._onStart;
	}

	private createOnStartPromise(): [ Promise<void>, () => void, (error:any) => void] {
		let resolve!: () => void;
		let reject!: (error: any) => void;
		const promise: Promise<void> = new Promise((_resolve, _reject) => {
			resolve = _resolve;
			reject = _reject;
		});
		return [promise, resolve, reject];
	}

	private async initialize(connection: Connection): Promise<InitializeResult> {
		this.refreshTrace(connection, false);
		const initOption = this._clientOptions.initializationOptions;
		// If the client is locked to a workspace folder use it. In this case the workspace folder
		// feature is not registered and we need to initialize the value here.
		const [rootPath, workspaceFolders] = this._clientOptions.workspaceFolder !== undefined
			? [this._clientOptions.workspaceFolder.uri.fsPath, [{ uri: this._c2p.asUri(this._clientOptions.workspaceFolder.uri), name: this._clientOptions.workspaceFolder.name }]]
			: [this._clientGetRootPath(), null];
		const initParams: InitializeParams = {
			processId: null,
			clientInfo: {
				name: Env.appName,
				version: VSCodeVersion
			},
			locale: this.getLocale(),
			rootPath: rootPath ? rootPath : null,
			rootUri: rootPath ? this._c2p.asUri(Uri.file(rootPath)) : null,
			capabilities: this.computeClientCapabilities(),
			initializationOptions: Is.func(initOption) ? initOption() : initOption,
			trace: Trace.toString(this._trace),
			workspaceFolders: workspaceFolders
		};
		this.fillInitializeParams(initParams);
		if (this._clientOptions.progressOnInitialization) {
			const token: ProgressToken = UUID.generateUuid();
			const part: ProgressPart = new ProgressPart(connection, token);
			initParams.workDoneToken = token;
			try {
				const result = await this.doInitialize(connection, initParams);
				part.done();
				return result;
			} catch (error) {
				part.cancel();
				throw error;
			}
		} else {
			return this.doInitialize(connection, initParams);
		}
	}

	private async doInitialize(connection: Connection, initParams: InitializeParams): Promise<InitializeResult> {
		try {
			const result = await connection.initialize(initParams);
			if (result.capabilities.positionEncoding !== undefined && result.capabilities.positionEncoding !== PositionEncodingKind.UTF16) {
				throw new Error(`Unsupported position encoding (${result.capabilities.positionEncoding}) received from server ${this.name}`);
			}

			this._initializeResult = result;
			this.$state = ClientState.Running;

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

			connection.onNotification(PublishDiagnosticsNotification.type, params => this.handleDiagnostics(params));
			connection.onRequest(RegistrationRequest.type, params => this.handleRegistrationRequest(params));
			// See https://github.com/Microsoft/vscode-languageserver-node/issues/199
			connection.onRequest('client/registerFeature', params => this.handleRegistrationRequest(params));
			connection.onRequest(UnregistrationRequest.type, params => this.handleUnregistrationRequest(params));
			// See https://github.com/Microsoft/vscode-languageserver-node/issues/199
			connection.onRequest('client/unregisterFeature', params => this.handleUnregistrationRequest(params));
			connection.onRequest(ApplyWorkspaceEditRequest.type, params => this.handleApplyWorkspaceEdit(params));

			// Add pending notification, request and progress handlers.
			for (const [method, handler] of this._pendingNotificationHandlers) {
				this._notificationDisposables.set(method, connection.onNotification(method, handler));
			}
			this._pendingNotificationHandlers.clear();
			for (const [method, handler] of this._pendingRequestHandlers) {
				this._requestDisposables.set(method, connection.onRequest(method, handler));
			}
			this._pendingRequestHandlers.clear();
			for (const [token, data] of this._pendingProgressHandlers) {
				this._progressDisposables.set(token, connection.onProgress(data.type, token, data.handler));
			}
			this._pendingProgressHandlers.clear();

			// if (this._clientOptions.suspend.mode !== SuspendMode.off) {
			// 	this._idleInterval =  RAL().timer.setInterval(() => this.checkSuspend(), this._clientOptions.suspend.interval);
			// }

			await connection.sendNotification(InitializedNotification.type, {});

			this.hookFileEvents(connection);
			this.hookConfigurationChanged(connection);
			this.initializeFeatures(connection);

			return result;
		} catch (error: any) {
			if (this._clientOptions.initializationFailedHandler) {
				if (this._clientOptions.initializationFailedHandler(error)) {
					void this.initialize(connection);
				} else {
					void this.stop();
				}
			} else if (error instanceof ResponseError && error.data && error.data.retry) {
				void Window.showErrorMessage(error.message, { title: 'Retry', id: 'retry' }).then(item => {
					if (item && item.id === 'retry') {
						void this.initialize(connection);
					} else {
						void this.stop();
					}
				});
			} else {
				if (error && error.message) {
					void Window.showErrorMessage(error.message);
				}
				this.error('Server initialization failed.', error);
				void this.stop();
			}
			throw error;
		}
	}

	private _clientGetRootPath(): string | undefined {
		const folders = Workspace.workspaceFolders;
		if (!folders || folders.length === 0) {
			return undefined;
		}
		const folder = folders[0];
		if (folder.uri.scheme === 'file') {
			return folder.uri.fsPath;
		}
		return undefined;
	}

	public stop(timeout: number = 2000): Promise<void> {
		// Wait 2 seconds on stop
		return this.shutdown(ShutdownMode.Stop, timeout);
	}

	public dispose(timeout: number = 2000): Promise<void> {
		try {
			this._disposed = 'disposing';
			return this.stop(timeout);
		} finally {
			this._disposed = 'disposed';
		}
	}

	protected async shutdown(mode: ShutdownMode, timeout: number = 2000): Promise<void> {
		// If the client is stopped or in its initial state return.
		if (this.$state === ClientState.Stopped || this.$state === ClientState.Initial) {
			return;
		}

		// If we are stopping the client and have a stop promise return it.
		if (this.$state === ClientState.Stopping) {
			if (this._onStop !== undefined) {
				return this._onStop;
			} else {
				throw new Error(`Client is stopping but no stop promise available.`);
			}
		}

		const connection = this.activeConnection();

		// We can't stop a client that is not running (e.g. has no connection). Especially not
		// on that us starting since it can't be correctly synchronized.
		if (connection === undefined || this.$state !== ClientState.Running) {
			throw new Error(`Client is not running and can't be stopped. It's current state is: ${this.$state}`);
		}

		this._initializeResult = undefined;
		this.$state = ClientState.Stopping;
		this.cleanUp(mode);

		const tp = new Promise<undefined>(c => { RAL().timer.setTimeout(c, timeout); });
		const shutdown = (async (connection) => {
			await connection.shutdown();
			await connection.exit();
			return connection;
		})(connection);

		return this._onStop = Promise.race([tp, shutdown]).then((connection) => {
			// The connection won the race with the timeout.
			if (connection !== undefined) {
				connection.end();
				connection.dispose();
			} else {
				this.error(`Stopping server timed out`, undefined, false);
				throw new Error(`Stopping the server timed out`);
			}
		}, (error) => {
			this.error(`Stopping server failed`, error, false);
			throw error;
		}).finally(() => {
			this.$state = ClientState.Stopped;
			mode === ShutdownMode.Stop && this.cleanUpChannel();
			this._onStart = undefined;
			this._onStop = undefined;
			this._connection = undefined;
			this._ignoredRegistrations.clear();
		});
	}

	private cleanUp(mode: ShutdownMode): void {
		// purge outstanding file events.
		this._fileEvents = [];
		this._fileEventDelayer.cancel();

		const disposables = this._listeners.splice(0, this._listeners.length);
		for (const disposable of disposables) {
			disposable.dispose();
		}

		if (this._syncedDocuments) {
			this._syncedDocuments.clear();
		}
		// Clear features in reverse order;
		for (const feature of Array.from(this._features.entries()).map(entry => entry[1]).reverse()) {
			feature.clear();
		}
		if ((mode === ShutdownMode.Stop || mode === ShutdownMode.Restart) && this._diagnostics !== undefined) {
			this._diagnostics.dispose();
			this._diagnostics = undefined;
		}

		if (this._idleInterval !== undefined) {
			this._idleInterval.dispose();
			this._idleInterval = undefined;
		}
		// this._idleStart = undefined;
	}

	private cleanUpChannel(): void {
		if (this._outputChannel !== undefined && this._disposeOutputChannel) {
			this._outputChannel.dispose();
			this._outputChannel = undefined;
		}
	}

	private notifyFileEvent(event: FileEvent): void {
		const client = this;
		async function didChangeWatchedFile(this: void, event: FileEvent): Promise<void> {
			client._fileEvents.push(event);
			return client._fileEventDelayer.trigger(async (): Promise<void> => {
				await client.sendNotification(DidChangeWatchedFilesNotification.type, { changes: client._fileEvents });
				client._fileEvents = [];
			});
		}
		const workSpaceMiddleware = this.clientOptions.middleware?.workspace;
		(workSpaceMiddleware?.didChangeWatchedFile ? workSpaceMiddleware.didChangeWatchedFile(event, didChangeWatchedFile) : didChangeWatchedFile(event)).catch((error) => {
			client.error(`Notify file events failed.`, error);
		});
	}

	private async sendPendingFullTextDocumentChanges(connection: Connection): Promise<void> {
		return this._pendingChangeSemaphore.lock(async () => {
			try {
				const changes = this._didChangeTextDocumentFeature!.getPendingDocumentChanges(this._pendingOpenNotifications);
				if (changes.length === 0) {
					return;
				}
				for (const document of changes) {
					const params = this.code2ProtocolConverter.asChangeTextDocumentParams(document);
					// We await the send and not the delivery since it is more or less the same for
					// notifications.
					await connection.sendNotification(DidChangeTextDocumentNotification.type, params);
					this._didChangeTextDocumentFeature!.notificationSent(document, DidChangeTextDocumentNotification.type, params);
				}
			} catch (error) {
				this.error(`Sending pending changes failed`, error, false);
				throw error;
			}
		});
	}

	private triggerPendingChangeDelivery(): void {
		this._pendingChangeDelayer.trigger(async () => {
			const connection = this.activeConnection();
			if (connection === undefined) {
				this.triggerPendingChangeDelivery();
				return;
			}
			await this.sendPendingFullTextDocumentChanges(connection);

		}).catch((error) => this.error(`Delivering pending changes failed`, error, false));
	}

	private _diagnosticQueue: Map<string, Diagnostic[]> = new Map();
	private _diagnosticQueueState: { state: 'idle' } | { state: 'busy'; document: string; tokenSource: CancellationTokenSource } = { state: 'idle' };
	private handleDiagnostics(params: PublishDiagnosticsParams) {
		if (!this._diagnostics) {
			return;
		}
		const key = params.uri;
		if (this._diagnosticQueueState.state === 'busy' && this._diagnosticQueueState.document === key)  {
			// Cancel the active run;
			this._diagnosticQueueState.tokenSource.cancel();
		}
		this._diagnosticQueue.set(params.uri, params.diagnostics);
		this.triggerDiagnosticQueue();
	}

	private triggerDiagnosticQueue(): void {
		RAL().timer.setImmediate(() => { this.workDiagnosticQueue(); });
	}

	private workDiagnosticQueue(): void {
		if (this._diagnosticQueueState.state === 'busy') {
			return;
		}
		const next = this._diagnosticQueue.entries().next();
		if (next.done === true) {
			// Nothing in the queue
			return;
		}
		const [document, diagnostics] = next.value;
		this._diagnosticQueue.delete(document);
		const tokenSource = new CancellationTokenSource();
		this._diagnosticQueueState = { state: 'busy', document: document, tokenSource };
		this._p2c.asDiagnostics(diagnostics, tokenSource.token).then((converted) => {
			if (!tokenSource.token.isCancellationRequested) {
				const uri = this._p2c.asUri(document);
				const middleware = this.clientOptions.middleware!;
				if (middleware.handleDiagnostics) {
					middleware.handleDiagnostics(uri, converted, (uri, diagnostics) => this.setDiagnostics(uri, diagnostics));
				} else {
					this.setDiagnostics(uri, converted);
				}
			}
		}).catch((error) => {
			this.error(`Processing diagnostic queue failed.`, error);
		}).finally(() => {
			this._diagnosticQueueState = { state: 'idle' };
			this.triggerDiagnosticQueue();
		});
	}

	private setDiagnostics(uri: Uri, diagnostics: VDiagnostic[] | undefined) {
		if (!this._diagnostics) {
			return;
		}
		this._diagnostics.set(uri, diagnostics);
	}

	protected getLocale(): string {
		return Env.language;
	}

	protected abstract createMessageTransports(encoding: string): Promise<MessageTransports>;

	private async $start(): Promise<Connection> {
		if (this.$state === ClientState.StartFailed) {
			throw new Error(`Previous start failed. Can't restart server.`);
		}
		await this.start();
		const connection = this.activeConnection();
		if (connection === undefined) {
			throw new Error(`Starting server failed`);
		}
		return connection;
	}

	private async createConnection(): Promise<Connection> {
		const errorHandler = (error: Error, message: Message | undefined, count: number | undefined) => {
			this.handleConnectionError(error, message, count).catch((error) => this.error(`Handling connection error failed`, error));
		};

		const closeHandler = () => {
			this.handleConnectionClosed().catch((error) => this.error(`Handling connection close failed`, error));
		};

		const transports = await this.createMessageTransports(this._clientOptions.stdioEncoding || 'utf8');
		this._connection = createConnection(transports.reader, transports.writer, errorHandler, closeHandler, this._clientOptions.connectionOptions);
		return this._connection;
	}

	protected async handleConnectionClosed(): Promise<void> {
		// Check whether this is a normal shutdown in progress or the client stopped normally.
		if (this.$state === ClientState.Stopped) {
			return;
		}
		try {
			if (this._connection !== undefined) {
				this._connection.dispose();
			}
		} catch (error) {
			// Disposing a connection could fail if error cases.
		}
		let handlerResult: CloseHandlerResult = { action: CloseAction.DoNotRestart };
		if (this.$state !== ClientState.Stopping) {
			try {
				handlerResult = await this._clientOptions.errorHandler!.closed();
			} catch (error) {
				// Ignore errors coming from the error handler.
			}
		}
		this._connection = undefined;
		if (handlerResult.action === CloseAction.DoNotRestart) {
			this.error(handlerResult.message ?? 'Connection to server got closed. Server will not be restarted.', undefined, handlerResult.handled === true ? false : 'force');
			this.cleanUp(ShutdownMode.Stop);
			if (this.$state === ClientState.Starting) {
				this.$state = ClientState.StartFailed;
			} else {
				this.$state = ClientState.Stopped;
			}
			this._onStop = Promise.resolve();
			this._onStart = undefined;
		} else if (handlerResult.action === CloseAction.Restart) {
			this.info(handlerResult.message ?? 'Connection to server got closed. Server will restart.', !handlerResult.handled);
			this.cleanUp(ShutdownMode.Restart);
			this.$state = ClientState.Initial;
			this._onStop = Promise.resolve();
			this._onStart = undefined;
			this.start().catch((error) => this.error(`Restarting server failed`, error, 'force'));
		}
	}

	private async handleConnectionError(error: Error, message: Message | undefined, count: number | undefined): Promise<void> {
		const handlerResult: ErrorHandlerResult = await this._clientOptions.errorHandler!.error(error, message, count);
		if (handlerResult.action === ErrorAction.Shutdown) {
			this.error(handlerResult.message ?? `Client ${this._name}: connection to server is erroring.\n${error.message}\nShutting down server.`, undefined, handlerResult.handled === true ? false : 'force');
			this.stop().catch((error) => {
				this.error(`Stopping server failed`, error, false);
			});
		} else {
			this.error(handlerResult.message ??
				`Client ${this._name}: connection to server is erroring.\n${error.message}`, undefined, handlerResult.handled === true ? false : 'force');
		}
	}

	private hookConfigurationChanged(connection: Connection): void {
		this._listeners.push(Workspace.onDidChangeConfiguration(() => {
			this.refreshTrace(connection, true);
		}));
	}

	private refreshTrace(connection: Connection, sendNotification: boolean = false): void {
		const config = Workspace.getConfiguration(this._id);
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
		}).catch((error) => { this.error(`Updating trace failed with error`, error, false);});
	}


	private hookFileEvents(_connection: Connection): void {
		const fileEvents = this._clientOptions.synchronize.fileEvents;
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
		for (const feature of features) {
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

	getFeature(request: typeof DidOpenTextDocumentNotification.method): DidOpenTextDocumentFeatureShape;
	getFeature(request: typeof DidChangeTextDocumentNotification.method): DidChangeTextDocumentFeatureShape;
	getFeature(request: typeof WillSaveTextDocumentNotification.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentSendFeature<(textDocument: TextDocument) => Promise<void>>;
	getFeature(request: typeof WillSaveTextDocumentWaitUntilRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentSendFeature<(textDocument: TextDocument) => ProviderResult<VTextEdit[]>>;
	getFeature(request: typeof DidSaveTextDocumentNotification.method): DidSaveTextDocumentFeatureShape;
	getFeature(request: typeof DidCloseTextDocumentNotification.method): DidCloseTextDocumentFeatureShape;
	getFeature(request: typeof DidCreateFilesNotification.method): DynamicFeature<FileOperationRegistrationOptions> & { send: (event: FileCreateEvent) => Promise<void> };
	getFeature(request: typeof DidRenameFilesNotification.method): DynamicFeature<FileOperationRegistrationOptions> & { send: (event: FileRenameEvent) => Promise<void> };
	getFeature(request: typeof DidDeleteFilesNotification.method): DynamicFeature<FileOperationRegistrationOptions> & { send: (event: FileDeleteEvent) => Promise<void> };
	getFeature(request: typeof WillCreateFilesRequest.method): DynamicFeature<FileOperationRegistrationOptions> & { send: (event: FileWillCreateEvent) => Promise<void> };
	getFeature(request: typeof WillRenameFilesRequest.method): DynamicFeature<FileOperationRegistrationOptions> & { send: (event: FileWillRenameEvent) => Promise<void> };
	getFeature(request: typeof WillDeleteFilesRequest.method): DynamicFeature<FileOperationRegistrationOptions> & { send: (event: FileWillDeleteEvent) => Promise<void> };
	getFeature(request: typeof CompletionRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<CompletionItemProvider>;
	getFeature(request: typeof HoverRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<HoverProvider>;
	getFeature(request: typeof SignatureHelpRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<SignatureHelpProvider>;
	getFeature(request: typeof DefinitionRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DefinitionProvider>;
	getFeature(request: typeof ReferencesRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<ReferenceProvider>;
	getFeature(request: typeof DocumentHighlightRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DocumentHighlightProvider>;
	getFeature(request: typeof CodeActionRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<CodeActionProvider>;
	getFeature(request: typeof CodeLensRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<CodeLensProviderShape>;
	getFeature(request: typeof DocumentFormattingRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DocumentFormattingEditProvider>;
	getFeature(request: typeof DocumentRangeFormattingRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DocumentRangeFormattingEditProvider>;
	getFeature(request: typeof DocumentOnTypeFormattingRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<OnTypeFormattingEditProvider>;
	getFeature(request: typeof RenameRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<RenameProvider>;
	getFeature(request: typeof DocumentSymbolRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DocumentSymbolProvider>;
	getFeature(request: typeof DocumentLinkRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DocumentLinkProvider>;
	getFeature(request: typeof DocumentColorRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DocumentColorProvider>;
	getFeature(request: typeof DeclarationRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DeclarationProvider>;
	getFeature(request: typeof FoldingRangeRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<FoldingRangeProviderShape>;
	getFeature(request: typeof ImplementationRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<ImplementationProvider>;
	getFeature(request: typeof SelectionRangeRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<SelectionRangeProvider>;
	getFeature(request: typeof TypeDefinitionRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<TypeDefinitionProvider>;
	getFeature(request: typeof CallHierarchyPrepareRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<CallHierarchyProvider>;
	getFeature(request: typeof SemanticTokensRegistrationType.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<SemanticTokensProviderShape>;
	getFeature(request: typeof LinkedEditingRangeRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<LinkedEditingRangeProvider>;
	getFeature(request: typeof TypeHierarchyPrepareRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<TypeHierarchyProvider>;
	getFeature(request: typeof InlineValueRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<InlineValueProviderShape>;
	getFeature(request: typeof InlayHintRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<InlayHintsProviderShape>;
	getFeature(request: typeof WorkspaceSymbolRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & WorkspaceProviderFeature<WorkspaceSymbolProvider>;
	getFeature(request: typeof DocumentDiagnosticRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DiagnosticProviderShape> & DiagnosticFeatureShape;
	getFeature(request: typeof NotebookDocumentSyncRegistrationType.method): DynamicFeature<NotebookDocumentSyncRegistrationOptions> & NotebookDocumentProviderShape;
	getFeature(request: typeof InlineCompletionRequest.method): (DynamicFeature<InlineCompletionRegistrationOptions> & TextDocumentProviderFeature<InlineCompletionItemProvider>) | undefined;
	getFeature(request: typeof ExecuteCommandRequest.method): DynamicFeature<ExecuteCommandOptions>;
	public getFeature(request: string): DynamicFeature<any> | undefined {
		return this._dynamicFeatures.get(request);
	}

	hasDedicatedTextSynchronizationFeature(textDocument: TextDocument): boolean {
		const feature = this.getFeature(NotebookDocumentSyncRegistrationType.method);
		if (feature === undefined || !(feature instanceof NotebookDocumentSyncFeature)) {
			return false;
		}
		return feature.handles(textDocument);
	}

	protected registerBuiltinFeatures() {
		const pendingFullTextDocumentChanges: Map<string, TextDocument> = new Map();
		this.registerFeature(new ConfigurationFeature(this));
		this.registerFeature(new DidOpenTextDocumentFeature(this, this._syncedDocuments));
		this._didChangeTextDocumentFeature = new DidChangeTextDocumentFeature(this, pendingFullTextDocumentChanges);
		this._didChangeTextDocumentFeature.onPendingChangeAdded(() => {
			this.triggerPendingChangeDelivery();
		});
		this.registerFeature(this._didChangeTextDocumentFeature);
		this.registerFeature(new WillSaveFeature(this));
		this.registerFeature(new WillSaveWaitUntilFeature(this));
		this.registerFeature(new DidSaveTextDocumentFeature(this));
		this.registerFeature(new DidCloseTextDocumentFeature(this, this._syncedDocuments, pendingFullTextDocumentChanges));
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
		this.registerFeature(new SyncConfigurationFeature(this));
		this.registerFeature(new TypeDefinitionFeature(this));
		this.registerFeature(new ImplementationFeature(this));
		this.registerFeature(new ColorProviderFeature(this));
		// We only register the workspace folder feature if the client is not locked
		// to a specific workspace folder.
		if (this.clientOptions.workspaceFolder === undefined) {
			this.registerFeature(new WorkspaceFoldersFeature(this));
		}
		this.registerFeature(new FoldingRangeFeature(this));
		this.registerFeature(new DeclarationFeature(this));
		this.registerFeature(new SelectionRangeFeature(this));
		this.registerFeature(new ProgressFeature(this));
		this.registerFeature(new CallHierarchyFeature(this));
		this.registerFeature(new SemanticTokensFeature(this));
		this.registerFeature(new LinkedEditingFeature(this));
		this.registerFeature(new DidCreateFilesFeature(this));
		this.registerFeature(new DidRenameFilesFeature(this));
		this.registerFeature(new DidDeleteFilesFeature(this));
		this.registerFeature(new WillCreateFilesFeature(this));
		this.registerFeature(new WillRenameFilesFeature(this));
		this.registerFeature(new WillDeleteFilesFeature(this));
		this.registerFeature(new TypeHierarchyFeature(this));
		this.registerFeature(new InlineValueFeature(this));
		this.registerFeature(new InlayHintsFeature(this));
		this.registerFeature(new DiagnosticFeature(this));
		this.registerFeature(new NotebookDocumentSyncFeature(this));
	}

	public registerProposedFeatures() {
		this.registerFeatures(ProposedFeatures.createAll(this));
	}

	protected fillInitializeParams(params: InitializeParams): void {
		for (const feature of this._features) {
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
		workspaceEdit.metadataSupport = true;
		workspaceEdit.snippetEditSupport = true;

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
		generalCapabilities.staleRequestSupport = {
			cancel: true,
			retryOnContentModified: Array.from(BaseLanguageClient.RequestsToCancelOnContentModified)
		};
		generalCapabilities.regularExpressions = { engine: 'ECMAScript', version: 'ES2020' };
		generalCapabilities.markdown = {
			parser: 'marked',
			version: '1.1.0',
		};
		generalCapabilities.positionEncodings = ['utf-16'];

		if (this._clientOptions.markdown.supportHtml) {
			generalCapabilities.markdown.allowedTags = ['ul', 'li', 'p', 'code', 'blockquote', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'em', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'del', 'a', 'strong', 'br', 'img', 'span'];
		}

		for (const feature of this._features) {
			feature.fillClientCapabilities(result);
		}
		return result;
	}

	private initializeFeatures(_connection: Connection): void {
		const documentSelector = this._clientOptions.documentSelector;
		for (const feature of this._features) {
			if (Is.func(feature.preInitialize)) {
				feature.preInitialize(this._capabilities, documentSelector);
			}
		}
		for (const feature of this._features) {
			feature.initialize(this._capabilities, documentSelector);
		}
	}

	private async handleRegistrationRequest(params: RegistrationParams): Promise<void> {
		const middleware = this.clientOptions.middleware?.handleRegisterCapability;
		if (middleware) {
			return middleware(params, nextParams => this.doRegisterCapability(nextParams));
		} else {
			return this.doRegisterCapability(params);
		}
	}

	private async doRegisterCapability(params: RegistrationParams): Promise<void> {
		// We will not receive a registration call before a client is running
		// from a server. However if we stop or shutdown we might which might
		// try to restart the server. So ignore registrations if we are not running
		if (!this.isRunning()) {
			for (const registration of params.registrations) {
				this._ignoredRegistrations.add(registration.id);
			}
			return;
		}

		interface WithDocumentSelector {
			documentSelector: DocumentSelector | undefined;
		}
		for (const registration of params.registrations) {
			const feature = this._dynamicFeatures.get(registration.method);
			if (feature === undefined) {
				return Promise.reject(new Error(`No feature implementation for ${registration.method} found. Registration failed.`));
			}
			const options = registration.registerOptions ?? {};
			(options as unknown as WithDocumentSelector).documentSelector = (options as unknown as WithDocumentSelector).documentSelector ?? this._clientOptions.documentSelector;
			const data: RegistrationData<any> = {
				id: registration.id,
				registerOptions: options
			};
			try {
				feature.register(data);
			} catch (err) {
				return Promise.reject(err);
			}
		}
	}

	private async handleUnregistrationRequest(params: UnregistrationParams): Promise<void> {
		const middleware = this.clientOptions.middleware?.handleUnregisterCapability;
		if(middleware) {
			return middleware(params, nextParams => this.doUnregisterCapability(nextParams));
		} else {
			return this.doUnregisterCapability(params);
		}
	}

	private async doUnregisterCapability(params: UnregistrationParams): Promise<void> {
		for (const unregistration of params.unregisterations) {
			if (this._ignoredRegistrations.has(unregistration.id)) {
				continue;
			}
			const feature = this._dynamicFeatures.get(unregistration.method);
			if (!feature) {
				return Promise.reject(new Error(`No feature implementation for ${unregistration.method} found. Unregistration failed.`));
			}
			feature.unregister(unregistration.id);
		}
	}

	private async handleApplyWorkspaceEdit(params: ApplyWorkspaceEditParams): Promise<ApplyWorkspaceEditResult> {
		const middleware = this.clientOptions.middleware?.workspace?.handleApplyEdit;
		if(middleware) {
			const resultOrError = await middleware(params, nextParams => this.doHandleApplyWorkspaceEdit(nextParams));
			if(resultOrError instanceof ResponseError) {
				return Promise.reject(resultOrError);
			}
			return resultOrError;
		} else {
			return this.doHandleApplyWorkspaceEdit(params);
		}
	}

	private workspaceEditLock: Semaphore<VWorkspaceEdit> = new Semaphore(1);
	private async doHandleApplyWorkspaceEdit(params: ApplyWorkspaceEditParams): Promise<ApplyWorkspaceEditResult> {
		const workspaceEdit: WorkspaceEdit = params.edit;
		// Make sure we convert workspace edits one after the other. Otherwise
		// we might execute a workspace edit received first after we received another
		// one since the conversion might race.
		const converted = await this.workspaceEditLock.lock(() => {
			return this._p2c.asWorkspaceEdit(workspaceEdit);
		});

		// This is some sort of workaround since the version check should be done by VS Code in the Workspace.applyEdit.
		// However doing it here adds some safety since the server can lag more behind then an extension.
		const openTextDocuments: Map<string, TextDocument> = new Map<string, TextDocument>();
		Workspace.textDocuments.forEach((document) => openTextDocuments.set(document.uri.toString(), document));
		let versionMismatch = false;
		if (workspaceEdit.documentChanges) {
			for (const change of workspaceEdit.documentChanges) {
				if (TextDocumentEdit.is(change) && change.textDocument.version && change.textDocument.version >= 0) {
					const changeUri = this._p2c.asUri(change.textDocument.uri).toString();
					const textDocument = openTextDocuments.get(changeUri);
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
		return Is.asPromise(Workspace.applyEdit(converted, { isRefactoring: params.metadata?.isRefactoring }).then((value) => { return { applied: value }; }));
	}

	private static RequestsToCancelOnContentModified: Set<string> = new Set([
		SemanticTokensRequest.method,
		SemanticTokensRangeRequest.method,
		SemanticTokensDeltaRequest.method
	]);
	private static CancellableResolveCalls: Set<string> = new Set([
		CompletionResolveRequest.method,
		CodeLensResolveRequest.method,
		CodeActionResolveRequest.method,
		InlayHintResolveRequest.method,
		DocumentLinkResolveRequest.method,
		WorkspaceSymbolResolveRequest.method
	]);

	public handleFailedRequest<T>(type: MessageSignature, token: CancellationToken | undefined, error: any, defaultValue: T, showNotification: boolean = true, throwOnCancel: boolean = false): T {
		// If we get a request cancel or a content modified don't log anything.
		if (error instanceof ResponseError) {
			// The connection got disposed while we were waiting for a response.
			// Simply return the default value. Is the best we can do.
			if (error.code === ErrorCodes.PendingResponseRejected || error.code === ErrorCodes.ConnectionInactive) {
				return defaultValue;
			}
			if (error.code === LSPErrorCodes.RequestCancelled || error.code === LSPErrorCodes.ServerCancelled) {
				if (token !== undefined && token.isCancellationRequested && !throwOnCancel) {
					return defaultValue;
				} else {
					if (error.data !== undefined) {
						throw new LSPCancellationError(error.data);
					} else {
						throw new CancellationError();
					}
				}
			} else if (error.code === LSPErrorCodes.ContentModified) {
				if (BaseLanguageClient.RequestsToCancelOnContentModified.has(type.method) || BaseLanguageClient.CancellableResolveCalls.has(type.method)) {
					throw new CancellationError();
				} else {
					return defaultValue;
				}
			}
		}
		this.error(`Request ${type.method} failed.`, error, showNotification);
		throw error;
	}

	// private checkSuspend(): void {
	// 	if (this.$state !== ClientState.Running) {
	// 		return;
	// 	}
	// 	const connection = this.activeConnection();
	// 	if (connection === undefined) {
	// 		this._idleStart = undefined;
	// 		return;
	// 	}
	// 	// Since the last idle start we sent a request. Cancel the idle counting.
	// 	if (connection.hasPendingResponse() || (this._idleStart !== undefined && connection.lastUsed > this._idleStart)) {
	// 		this._idleStart = undefined;
	// 		return;
	// 	}
	// 	if (this.isIdle()) {
	// 		const production = (this.clientOptions as TestOptions).$testMode !== true;
	// 		// Only do this in production since in test cases we only have
	// 		// 2000 ms to suspend.
	// 		if (production) {
	// 			if (this._idleStart === undefined) {
	// 				this._idleStart = Date.now();
	// 				return;
	// 			}

	// 			const interval = this._clientOptions.suspend.interval;
	// 			const diff = Date.now() - this._idleStart;
	// 			if (diff < interval * 3) {
	// 				return;
	// 			}
	// 			if (diff > interval * 5) {
	// 				// Avoid that we shutdown the server when a computer resumes from sleep.
	// 				this._idleStart = undefined;
	// 				return;
	// 			}
	// 		}

	// 		this._idleStart = undefined;
	// 		this.info(`Suspending server`);
	// 		this._clientOptions.suspend.callback().then((approved) => {
	// 			if (!approved) {
	// 				this._idleStart = undefined;
	// 				return;
	// 			}
	// 			return this.suspend().then(() => {
	// 				this.info(`Server got suspended`);
	// 			});
	// 		}, (error) => {
	// 			this.error(`Suspending server failed`, error, 'force');
	// 		});
	// 	} else {
	// 		this._idleStart = undefined;
	// 	}
	// }

	// private isIdle(): boolean {
	// 	const suspendMode = this._clientOptions.suspend.mode;
	// 	if (suspendMode === SuspendMode.off) {
	// 		return false;
	// 	}

	// 	for (const feature of this._features) {
	// 		const state = feature.getState();
	// 		// 'static' feature don't depend on registrations. So they
	// 		// can't block suspend
	// 		if (state.kind === 'static') {
	// 			continue;
	// 		}
	// 		// The feature has no registrations. So no blocking of the
	// 		// suspend.
	// 		if (!state.registrations) {
	// 			continue;
	// 		}

	// 		if (state.kind === 'document' && state.matches === true) {
	// 			return false;
	// 		}
	// 	}
	// 	return true;
	// }
}

export type ServerOptions = () => Promise<MessageTransports>;
export class LanguageClient extends BaseLanguageClient {

	private readonly serverOptions: ServerOptions;

	constructor(id: string, name: string, serverOptions: ServerOptions, clientOptions: LanguageClientOptions) {
		super(id, name, clientOptions);
		this.serverOptions = serverOptions;
	}

	protected async createMessageTransports(_encoding: string): Promise<MessageTransports> {
		return this.serverOptions();
	}
}

interface Connection {

	listen(): void;

	sendRequest<R>(type: string | MessageSignature, ...params: any[]): Promise<R>;
	onRequest<R, E>(method: string | MessageSignature, handler: GenericRequestHandler<R, E>): Disposable;

	hasPendingResponse(): boolean;

	sendNotification(method: string | MessageSignature, params?: any): Promise<void>;
	onNotification(method: string | MessageSignature, handler: GenericNotificationHandler): Disposable;

	onProgress<P>(type: ProgressType<P>, token: string | number, handler: NotificationHandler<P>): Disposable;
	sendProgress<P>(type: ProgressType<P>, token: string | number, value: P): Promise<void>;

	trace(value: Trace, tracer: Tracer, sendNotification?: boolean): Promise<void>;
	trace(value: Trace, tracer: Tracer, traceOptions?: TraceOptions): Promise<void>;

	initialize(params: InitializeParams): Promise<InitializeResult>;
	shutdown(): Promise<void>;
	exit(): Promise<void>;

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

function createConnection(input: MessageReader, output: MessageWriter, errorHandler: ConnectionErrorHandler, closeHandler: ConnectionCloseHandler, options?: ConnectionOptions): Connection {
	const logger = new ConsoleLogger();
	const connection = createProtocolConnection(input, output, logger, options);
	connection.onError((data) => { errorHandler(data[0], data[1], data[2]); });
	connection.onClose(closeHandler);
	const result: Connection = {

		listen: (): void => connection.listen(),

		sendRequest: connection.sendRequest,

		onRequest: connection.onRequest,

		hasPendingResponse: connection.hasPendingResponse,

		sendNotification: connection.sendNotification,

		onNotification: connection.onNotification,

		onProgress: connection.onProgress,
		sendProgress: connection.sendProgress,

		trace: (value: Trace, tracer: Tracer, sendNotificationOrTraceOptions?: boolean | TraceOptions): Promise<void> => {
			const defaultTraceOptions: TraceOptions = {
				sendNotification: false,
				traceFormat: TraceFormat.Text
			};

			if (sendNotificationOrTraceOptions === undefined) {
				return connection.trace(value, tracer, defaultTraceOptions);
			} else if (Is.boolean(sendNotificationOrTraceOptions)) {
				return connection.trace(value, tracer, sendNotificationOrTraceOptions);
			} else {
				return connection.trace(value, tracer, sendNotificationOrTraceOptions);
			}
		},

		initialize: (params: InitializeParams) => {
			// This needs to return and MUST not be await to avoid any async
			// scheduling. Otherwise messages might overtake each other.
			return connection.sendRequest(InitializeRequest.type, params);
		},
		shutdown: () => {
			// This needs to return and MUST not be await to avoid any async
			// scheduling. Otherwise messages might overtake each other.
			return connection.sendRequest(ShutdownRequest.type, undefined);
		},
		exit: () => {
			// This needs to return and MUST not be await to avoid any async
			// scheduling. Otherwise messages might overtake each other.
			return connection.sendNotification(ExitNotification.type);
		},

		end: () => connection.end(),
		dispose: () => connection.dispose()
	};

	return result;
}

// Exporting proposed protocol.

export namespace ProposedFeatures {
	export function createAll(_client: FeatureClient<Middleware, LanguageClientOptions>): (StaticFeature | DynamicFeature<any>)[] {
		const result: (StaticFeature | DynamicFeature<any>)[] = [
			new InlineCompletionItemFeature(_client)
		];
		return result;
	}
}
