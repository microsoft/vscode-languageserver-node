/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	CancellationToken, ProtocolRequestType0, RequestHandler0, ProtocolRequestType, RequestHandler, GenericRequestHandler, StarRequestHandler, HandlerResult,
	ProtocolNotificationType0, NotificationHandler0, ProtocolNotificationType, NotificationHandler, GenericNotificationHandler, StarNotificationHandler, ProgressType,
	Disposable, InitializeParams, InitializeResult, InitializeError, InitializedParams, DidChangeConfigurationParams, DidChangeWatchedFilesParams,
	DidOpenTextDocumentParams, DidChangeTextDocumentParams, DidCloseTextDocumentParams, WillSaveTextDocumentParams, TextEdit, DidSaveTextDocumentParams,
	PublishDiagnosticsParams, HoverParams, Hover, CompletionParams, CompletionItem, CompletionList, SignatureHelpParams, SignatureHelp, DeclarationParams,
	Declaration, DeclarationLink, Location, DefinitionParams, Definition, DefinitionLink, TypeDefinitionParams, ImplementationParams, ReferenceParams,
	DocumentHighlightParams, DocumentHighlight, DocumentSymbolParams, SymbolInformation, DocumentSymbol, WorkspaceSymbolParams, CodeActionParams, Command,
	CodeAction, CodeLensParams, CodeLens, DocumentFormattingParams, DocumentRangeFormattingParams, DocumentOnTypeFormattingParams, RenameParams, WorkspaceEdit,
	PrepareRenameParams, Range, DocumentLinkParams, DocumentLink, DocumentColorParams, ColorInformation, ColorPresentationParams, ColorPresentation, FoldingRangeParams,
	FoldingRange, SelectionRangeParams, SelectionRange, ExecuteCommandParams, MessageActionItem, ClientCapabilities, ServerCapabilities, Logger, ProtocolConnection,
	MessageType, LogMessageNotification, ShowMessageRequestParams, ShowMessageRequest, TextDocumentSyncKind,
	RegistrationRequest, UnregistrationRequest, UnregistrationParams, MessageSignature, Registration, RegistrationParams, Unregistration,
	ApplyWorkspaceEditParams, ApplyWorkspaceEditResponse, ApplyWorkspaceEditRequest, TelemetryEventNotification, Trace, LogTraceNotification, WorkDoneProgressParams,
	PartialResultParams, ShutdownRequest, CancellationTokenSource, ExitNotification, SetTraceNotification, InitializedNotification, DidChangeConfigurationNotification,
	DidChangeWatchedFilesNotification, DidOpenTextDocumentNotification, DidChangeTextDocumentNotification, DidCloseTextDocumentNotification, WillSaveTextDocumentNotification,
	WillSaveTextDocumentWaitUntilRequest, DidSaveTextDocumentNotification, PublishDiagnosticsNotification, HoverRequest, CompletionRequest, CompletionResolveRequest,
	SignatureHelpRequest, DeclarationRequest, DefinitionRequest, TypeDefinitionRequest, ImplementationRequest, ReferencesRequest, DocumentHighlightRequest,
	DocumentSymbolRequest, WorkspaceSymbolRequest, CodeActionRequest, CodeLensRequest, CodeLensResolveRequest, DocumentFormattingRequest, DocumentRangeFormattingRequest,
	DocumentOnTypeFormattingRequest, RenameRequest, PrepareRenameRequest, DocumentLinkRequest, DocumentLinkResolveRequest, DocumentColorRequest, ColorPresentationRequest,
	FoldingRangeRequest, SelectionRangeRequest, ExecuteCommandRequest, InitializeRequest, ResponseError, RegistrationType, RequestType0, RequestType,
	NotificationType0, NotificationType, CodeActionResolveRequest, RAL, WorkspaceSymbol, WorkspaceSymbolResolveRequest
} from 'vscode-languageserver-protocol';

import * as Is from './utils/is';
import * as UUID from './utils/uuid';
import { WorkDoneProgressReporter, ResultProgressReporter, WindowProgress, ProgressFeature, attachWorkDone, attachPartialResult} from './progress';
import { Configuration, ConfigurationFeature } from './configuration';
import { WorkspaceFolders, WorkspaceFoldersFeature } from './workspaceFolder';
import { CallHierarchy, CallHierarchyFeature } from './callHierarchy';
import { SemanticTokensFeatureShape, SemanticTokensFeature } from './semanticTokens';
import { ShowDocumentFeatureShape, ShowDocumentFeature } from './showDocument';
import { FileOperationsFeature, FileOperationsFeatureShape } from './fileOperations';
import { LinkedEditingRangeFeature, LinkedEditingRangeFeatureShape } from './linkedEditingRange';
import { TypeHierarchyFeatureShape, TypeHierarchyFeature } from './typeHierarchy';
import { InlineValueFeatureShape, InlineValueFeature } from './inlineValue';
import { FoldingRangeFeatureShape, FoldingRangeFeature } from './foldingRange';
// import { InlineCompletionFeatureShape, InlineCompletionFeature } from './inlineCompletion.proposed';
import { InlayHintFeatureShape, InlayHintFeature } from './inlayHint';
import { DiagnosticFeatureShape, DiagnosticFeature } from './diagnostic';
import { NotebookSyncFeatureShape, NotebookSyncFeature } from './notebook';
import { MonikerFeature, MonikerFeatureShape } from './moniker';
import type { ConnectionState } from './textDocuments';

function null2Undefined<T>(value: T | null): T | undefined {
	if (value === null) {
		return undefined;
	}
	return value;
}

/**
 * Helps tracking error message. Equal occurrences of the same
 * message are only stored once. This class is for example
 * useful if text documents are validated in a loop and equal
 * error message should be folded into one.
 */
export class ErrorMessageTracker {

	private _messages: { [key: string]: number };

	constructor() {
		this._messages = Object.create(null);
	}

	/**
	 * Add a message to the tracker.
	 *
	 * @param message The message to add.
	 */
	public add(message: string): void {
		let count: number = this._messages[message];
		if (!count) {
			count = 0;
		}
		count++;
		this._messages[message] = count;
	}

	/**
	 * Send all tracked messages to the connection's window.
	 *
	 * @param connection The connection established between client and server.
	 */
	public sendErrors(connection: { window: RemoteWindow }): void {
		Object.keys(this._messages).forEach(message => {
			connection.window.showErrorMessage(message);
		});
	}
}

export interface FeatureBase {
	/**
	 * Called to initialize the remote with the given
	 * client capabilities
	 *
	 * @param capabilities The client capabilities
	 */
	initialize(capabilities: ClientCapabilities): void;

	/**
	 * Called to fill in the server capabilities this feature implements.
	 *
	 * @param capabilities The server capabilities to fill.
	 */
	fillServerCapabilities(capabilities: ServerCapabilities): void;
}

interface Remote extends FeatureBase {
	/**
	 * Attach the remote to the given connection.
	 *
	 * @param connection The connection this remote is operating on.
	 */
	attach(connection: Connection): void;

	/**
	 * The connection this remote is attached to.
	 */
	connection: Connection;
}

/**
 * The RemoteConsole interface contains all functions to interact with
 * the tools / clients console or log system. Internally it used `window/logMessage`
 * notifications.
 */
export interface RemoteConsole extends FeatureBase {
	/**
	 * The connection this remote is attached to.
	 */
	connection: Connection;

	/**
	 * Show an error message.
	 *
	 * @param message The message to show.
	 */
	error(message: string): void;

	/**
	 * Show a warning message.
	 *
	 * @param message The message to show.
	 */
	warn(message: string): void;

	/**
	 * Show an information message.
	 *
	 * @param message The message to show.
	 */
	info(message: string): void;

	/**
	 * Log a message.
	 *
	 * @param message The message to log.
	 */
	log(message: string): void;

	/**
	 * Log a debug message.
	 *
	 * @param message The message to log.
	 *
	 * @since 3.18.0
	 */
	debug(message: string): void;
}

class RemoteConsoleImpl implements Logger, RemoteConsole, Remote {

	private _rawConnection: ProtocolConnection | undefined;
	private _connection: Connection | undefined;

	public constructor() {
	}

	public rawAttach(connection: ProtocolConnection): void {
		this._rawConnection = connection;
	}

	public attach(connection: Connection) {
		this._connection = connection;
	}

	public get connection(): Connection {
		if (!this._connection) {
			throw new Error('Remote is not attached to a connection yet.');
		}
		return this._connection;
	}

	public fillServerCapabilities(_capabilities: ServerCapabilities): void {
	}

	public initialize(_capabilities: ClientCapabilities): void {
	}

	public error(message: string): void {
		this.send(MessageType.Error, message);
	}

	public warn(message: string): void {
		this.send(MessageType.Warning, message);
	}

	public info(message: string): void {
		this.send(MessageType.Info, message);
	}

	public log(message: string): void {
		this.send(MessageType.Log, message);
	}

	public debug(message: string): void {
		this.send(MessageType.Debug, message);
	}

	private send(type: MessageType, message: string): void {
		if (this._rawConnection) {
			this._rawConnection.sendNotification(LogMessageNotification.type, { type, message }).catch(() => {
				RAL().console.error(`Sending log message failed`);
			});
		}
	}
}

/**
 * The RemoteWindow interface contains all functions to interact with
 * the visual window of VS Code.
 */
export interface _RemoteWindow extends FeatureBase {
	/**
	 * The connection this remote is attached to.
	 */
	connection: Connection;

	/**
	 * Shows an error message in the client's user interface. Depending on the client this might
	 * be a modal dialog with a confirmation button or a notification in a notification center
	 *
	 * @param message The message to show.
	 * @param actions Possible additional actions presented in the user interface. The selected action
	 *  will be the value of the resolved promise
	 */
	showErrorMessage(message: string): void;
	showErrorMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Promise<T | undefined>;

	/**
	 * Shows a warning message in the client's user interface. Depending on the client this might
	 * be a modal dialog with a confirmation button or a notification in a notification center
	 *
	 * @param message The message to show.
	 * @param actions Possible additional actions presented in the user interface. The selected action
	 *  will be the value of the resolved promise
	 */
	showWarningMessage(message: string): void;
	showWarningMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Promise<T | undefined>;

	/**
	 * Shows an information message in the client's user interface. Depending on the client this might
	 * be a modal dialog with a confirmation button or a notification in a notification center
	 *
	 * @param message The message to show.
	 * @param actions Possible additional actions presented in the user interface. The selected action
	 *  will be the value of the resolved promise
	 */
	showInformationMessage(message: string): void;
	showInformationMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Promise<T | undefined>;
}

export type RemoteWindow = _RemoteWindow & WindowProgress & ShowDocumentFeatureShape;

class _RemoteWindowImpl implements _RemoteWindow, Remote {

	private _connection: Connection | undefined;

	constructor() {
	}

	public attach(connection: Connection) {
		this._connection = connection;
	}

	public get connection(): Connection {
		if (!this._connection) {
			throw new Error('Remote is not attached to a connection yet.');
		}
		return this._connection;
	}

	public initialize(_capabilities: ClientCapabilities): void {
	}

	public fillServerCapabilities(_capabilities: ServerCapabilities): void {
	}

	public showErrorMessage(message: string, ...actions: MessageActionItem[]): Promise<MessageActionItem | undefined> {
		const params: ShowMessageRequestParams = { type: MessageType.Error, message, actions };
		return this.connection.sendRequest(ShowMessageRequest.type, params).then(null2Undefined);
	}

	public showWarningMessage(message: string, ...actions: MessageActionItem[]): Promise<MessageActionItem | undefined> {
		const params: ShowMessageRequestParams = { type: MessageType.Warning, message, actions };
		return this.connection.sendRequest(ShowMessageRequest.type, params).then(null2Undefined);
	}

	public showInformationMessage(message: string, ...actions: MessageActionItem[]): Promise<MessageActionItem | undefined> {
		const params: ShowMessageRequestParams = { type: MessageType.Info, message, actions };
		return this.connection.sendRequest(ShowMessageRequest.type, params).then(null2Undefined);
	}
}

const RemoteWindowImpl: new () => RemoteWindow = ShowDocumentFeature(ProgressFeature(_RemoteWindowImpl)) as (new () => RemoteWindow);

interface MethodType {
	method: string;
}

/**
 * A bulk registration manages n single registration to be able to register
 * for n notifications or requests using one register request.
 */
export interface BulkRegistration {
	/**
	 * Adds a single registration.
	 * @param type the notification type to register for.
	 * @param registerParams special registration parameters.
	 */
	add<RO>(type: ProtocolNotificationType0<RO>, registerParams: RO): void;
	add<P, RO>(type: ProtocolNotificationType<P, RO>, registerParams: RO): void;

	/**
	 * Adds a single registration.
	 * @param type the request type to register for.
	 * @param registerParams special registration parameters.
	 */
	add<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, registerParams: RO): void;
	add<P, PR, R, E, RO>(type: ProtocolRequestType<P, PR, R, E, RO>, registerParams: RO): void;

	/**
	 * Adds a single registration.
	 * @param type the notification type to register for.
	 * @param registerParams special registration parameters.
	 */
	add<RO>(type: RegistrationType<RO>, registerParams: RO): void;
}

export namespace BulkRegistration {
	/**
	 * Creates a new bulk registration.
	 * @return an empty bulk registration.
	 */
	export function create(): BulkRegistration {
		return new BulkRegistrationImpl();
	}
}

class BulkRegistrationImpl {
	private _registrations: Registration[] = [];
	private _registered: Set<string> = new Set<string>();

	public add<RO>(type: string | MethodType, registerOptions?: RO): void {
		const method = Is.string(type) ? type : type.method;
		if (this._registered.has(method)) {
			throw new Error(`${method} is already added to this registration`);
		}
		const id = UUID.generateUuid();
		this._registrations.push({
			id: id,
			method: method,
			registerOptions: registerOptions || {}
		});
		this._registered.add(method);
	}

	public asRegistrationParams(): RegistrationParams {
		return {
			registrations: this._registrations
		};
	}
}

/**
 * A `BulkUnregistration` manages n unregistrations.
 */
export interface BulkUnregistration extends Disposable {
	/**
	 * Disposes a single registration. It will be removed from the
	 * `BulkUnregistration`.
	 */
	disposeSingle(arg: string | MessageSignature): boolean;
}

export namespace BulkUnregistration {
	export function create(): BulkUnregistration {
		return new BulkUnregistrationImpl(undefined, []);
	}
}

class BulkUnregistrationImpl implements BulkUnregistration {

	private _unregistrations: Map<string, Unregistration> = new Map<string, Unregistration>();

	constructor(private _connection: Connection | undefined, unregistrations: Unregistration[]) {
		unregistrations.forEach(unregistration => {
			this._unregistrations.set(unregistration.method, unregistration);
		});
	}

	public get isAttached(): boolean {
		return !!this._connection;
	}

	public attach(connection: Connection): void {
		this._connection = connection;
	}

	public add(unregistration: Unregistration): void {
		this._unregistrations.set(unregistration.method, unregistration);
	}

	public dispose(): any {
		const unregistrations: Unregistration[] = [];
		for (const unregistration of this._unregistrations.values()) {
			unregistrations.push(unregistration);
		}
		const params: UnregistrationParams = {
			unregisterations: unregistrations
		};
		this._connection!.sendRequest(UnregistrationRequest.type, params).catch(() => {
			this._connection!.console.info(`Bulk unregistration failed.`);
		});
	}

	public disposeSingle(arg: string | MessageSignature): boolean {
		const method = Is.string(arg) ? arg : arg.method;

		const unregistration = this._unregistrations.get(method);
		if (!unregistration) {
			return false;
		}

		const params: UnregistrationParams = {
			unregisterations: [unregistration]
		};
		this._connection!.sendRequest(UnregistrationRequest.type, params).then(() => {
			this._unregistrations.delete(method);
		}, (_error) => {
			this._connection!.console.info(`Un-registering request handler for ${unregistration.id} failed.`);
		});
		return true;
	}
}

/**
 * Interface to register and unregister `listeners` on the client / tools side.
 */
export interface RemoteClient extends FeatureBase {

	/**
	 * The connection this remote is attached to.
	 */
	connection: Connection;

	/**
	 * Registers a listener for the given request.
	 *
	 * @param type the request type to register for.
	 * @param registerParams special registration parameters.
	 * @return a `Disposable` to unregister the listener again.
	 */
	register<P, RO>(type: ProtocolNotificationType<P, RO>, registerParams?: RO): Promise<Disposable>;
	register<RO>(type: ProtocolNotificationType0<RO>, registerParams?: RO): Promise<Disposable>;

	/**
	 * Registers a listener for the given request.
	 *
	 * @param unregisteration the unregistration to add a corresponding unregister action to.
	 * @param type the request type to register for.
	 * @param registerParams special registration parameters.
	 * @return the updated unregistration.
	 */
	register<P, RO>(unregisteration: BulkUnregistration, type: ProtocolNotificationType<P, RO>, registerParams?: RO): Promise<Disposable>;
	register<RO>(unregisteration: BulkUnregistration, type: ProtocolNotificationType0<RO>, registerParams?: RO): Promise<Disposable>;

	/**
	 * Registers a listener for the given request.
	 *
	 * @param type the request type to register for.
	 * @param registerParams special registration parameters.
	 * @return a `Disposable` to unregister the listener again.
	 */
	register<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, registerParams?: RO): Promise<Disposable>;
	register<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, registerParams?: RO): Promise<Disposable>;

	/**
	 * Registers a listener for the given request.
	 *
	 * @param unregisteration the unregistration to add a corresponding unregister action to.
	 * @param type the request type to register for.
	 * @param registerParams special registration parameters.
	 * @return the updated unregistration.
	 */
	register<P, R, PR, E, RO>(unregisteration: BulkUnregistration, type: ProtocolRequestType<P, R, PR, E, RO>, registerParams?: RO): Promise<Disposable>;
	register<R, PR, E, RO>(unregisteration: BulkUnregistration, type: ProtocolRequestType0<R, PR, E, RO>, registerParams?: RO): Promise<Disposable>;


	/**
	 * Registers a listener for the given registration type.
	 *
	 * @param type the registration type.
	 * @param registerParams special registration parameters.
	 * @return a `Disposable` to unregister the listener again.
	 */
	register<RO>(type: RegistrationType<RO>, registerParams?: RO): Promise<Disposable>;

	/**
	 * Registers a listener for the given registration type.
	 *
	 * @param unregisteration the unregistration to add a corresponding unregister action to.
	 * @param type the registration type.
	 * @param registerParams special registration parameters.
	 * @return the updated unregistration.
	 */
	register<RO>(unregisteration: BulkUnregistration, type: RegistrationType<RO>, registerParams?: RO): Promise<Disposable>;

	/**
	 * Registers a set of listeners.
	 * @param registrations the bulk registration
	 * @return a `Disposable` to unregister the listeners again.
	 */
	register(registrations: BulkRegistration): Promise<BulkUnregistration>;
}

class RemoteClientImpl implements RemoteClient, Remote {

	private _connection: Connection | undefined;

	public attach(connection: Connection) {
		this._connection = connection;
	}

	public get connection(): Connection {
		if (!this._connection) {
			throw new Error('Remote is not attached to a connection yet.');
		}
		return this._connection;
	}

	public initialize(_capabilities: ClientCapabilities): void {
	}

	public fillServerCapabilities(_capabilities: ServerCapabilities): void {
	}

	public register(typeOrRegistrations: string | MethodType | BulkRegistration | BulkUnregistration, registerOptionsOrType?: string | MethodType | any, registerOptions?: any): Promise<any>  /* Promise<Disposable | BulkUnregistration> */ {
		if (typeOrRegistrations instanceof BulkRegistrationImpl) {
			return this.registerMany(typeOrRegistrations);
		} else if (typeOrRegistrations instanceof BulkUnregistrationImpl) {
			return this.registerSingle1(<BulkUnregistrationImpl>typeOrRegistrations, <string | MethodType>registerOptionsOrType, registerOptions);
		} else {
			return this.registerSingle2(<string | MethodType>typeOrRegistrations, registerOptionsOrType);
		}
	}

	private registerSingle1(unregistration: BulkUnregistrationImpl, type: string | MethodType, registerOptions: any): Promise<Disposable> {
		const method = Is.string(type) ? type : type.method;
		const id = UUID.generateUuid();
		const params: RegistrationParams = {
			registrations: [{ id, method, registerOptions: registerOptions || {} }]
		};
		if (!unregistration.isAttached) {
			unregistration.attach(this.connection);
		}
		return this.connection.sendRequest(RegistrationRequest.type, params).then((_result) => {
			unregistration.add({ id: id, method: method });
			return unregistration;
		}, (_error) => {
			this.connection.console.info(`Registering request handler for ${method} failed.`);
			return Promise.reject(_error);
		});
	}

	private registerSingle2(type: string | MethodType, registerOptions: any): Promise<Disposable> {
		const method = Is.string(type) ? type : type.method;
		const id = UUID.generateUuid();
		const params: RegistrationParams = {
			registrations: [{ id, method, registerOptions: registerOptions || {} }]
		};
		return this.connection.sendRequest(RegistrationRequest.type, params).then((_result) => {
			return Disposable.create(() => {
				this.unregisterSingle(id, method).catch(() => { this.connection.console.info(`Un-registering capability with id ${id} failed.`); });
			});
		}, (_error) => {
			this.connection.console.info(`Registering request handler for ${method} failed.`);
			return Promise.reject(_error);
		});
	}

	private unregisterSingle(id: string, method: string): Promise<void> {
		const params: UnregistrationParams = {
			unregisterations: [{ id, method }]
		};

		return this.connection.sendRequest(UnregistrationRequest.type, params).catch(() => {
			this.connection.console.info(`Un-registering request handler for ${id} failed.`);
		});
	}

	private registerMany(registrations: BulkRegistrationImpl): Promise<BulkUnregistration> {
		const params = registrations.asRegistrationParams();
		return this.connection.sendRequest(RegistrationRequest.type, params).then(() => {
			return new BulkUnregistrationImpl(this._connection, params.registrations.map(registration => { return { id: registration.id, method: registration.method }; }));
		}, (_error) => {
			this.connection.console.info(`Bulk registration failed.`);
			return Promise.reject(_error);
		});
	}
}

/**
 * Represents the workspace managed by the client.
 */
export interface _RemoteWorkspace extends FeatureBase {
	/**
	 * The connection this remote is attached to.
	 */
	connection: Connection;

	/**
	 * Applies a `WorkspaceEdit` to the workspace
	 * @param param the workspace edit params.
	 * @return a thenable that resolves to the `ApplyWorkspaceEditResponse`.
	 */
	applyEdit(paramOrEdit: ApplyWorkspaceEditParams | WorkspaceEdit): Promise<ApplyWorkspaceEditResponse>;
}

export type RemoteWorkspace = _RemoteWorkspace & Configuration & WorkspaceFolders & FileOperationsFeatureShape;

class _RemoteWorkspaceImpl implements _RemoteWorkspace, Remote {

	private _connection: Connection | undefined;

	public constructor() {
	}

	public attach(connection: Connection) {
		this._connection = connection;
	}

	public get connection(): Connection {
		if (!this._connection) {
			throw new Error('Remote is not attached to a connection yet.');
		}
		return this._connection;
	}

	public initialize(_capabilities: ClientCapabilities): void {
	}

	public fillServerCapabilities(_capabilities: ServerCapabilities): void {
	}

	public applyEdit(paramOrEdit: ApplyWorkspaceEditParams | WorkspaceEdit): Promise<ApplyWorkspaceEditResponse> {
		function isApplyWorkspaceEditParams(value: ApplyWorkspaceEditParams | WorkspaceEdit): value is ApplyWorkspaceEditParams {
			return value && !!(value as ApplyWorkspaceEditParams).edit;
		}

		const params: ApplyWorkspaceEditParams = isApplyWorkspaceEditParams(paramOrEdit) ? paramOrEdit : { edit: paramOrEdit };
		return this.connection.sendRequest(ApplyWorkspaceEditRequest.type, params);
	}
}

const RemoteWorkspaceImpl: new () => RemoteWorkspace = FileOperationsFeature(WorkspaceFoldersFeature(ConfigurationFeature(_RemoteWorkspaceImpl))) as (new () => RemoteWorkspace);

/**
 * Interface to log telemetry events. The events are actually send to the client
 * and the client needs to feed the event into a proper telemetry system.
 */
export interface Telemetry extends FeatureBase {
	/**
	 * The connection this remote is attached to.
	 */
	connection: Connection;

	/**
	 * Log the given data to telemetry.
	 *
	 * @param data The data to log. Must be a JSON serializable object.
	 */
	logEvent(data: any): void;
}

/**
 * Interface to log traces to the client. The events are sent to the client and the
 * client needs to log the trace events.
 */
export interface RemoteTracer extends FeatureBase {
	/**
	 * The connection this remote is attached to.
	 */
	connection: Connection;

	/**
	 * Log the given data to the trace Log
	 */
	log(message: string, verbose?: string): void;
}

class TracerImpl implements RemoteTracer, Remote {

	private _trace: Trace;
	private _connection: Connection | undefined;

	constructor() {
		this._trace = Trace.Off;
	}

	public attach(connection: Connection) {
		this._connection = connection;
	}

	public get connection(): Connection {
		if (!this._connection) {
			throw new Error('Remote is not attached to a connection yet.');
		}
		return this._connection;
	}

	public initialize(_capabilities: ClientCapabilities): void {
	}

	public fillServerCapabilities(_capabilities: ServerCapabilities): void {
	}

	public set trace(value: Trace) {
		this._trace = value;
	}

	public log(message: string, verbose?: string): void {
		if (this._trace === Trace.Off) {
			return;
		}
		this.connection.sendNotification(LogTraceNotification.type, {
			message: message,
			verbose: this._trace === Trace.Verbose ? verbose : undefined
		}).catch(() => {
			// Very hard to decide what to do. We tried to send a log
			// message which failed so we can't simply send another :-(.
		});
	}
}

class TelemetryImpl implements Telemetry, Remote {

	private _connection: Connection | undefined;

	constructor() {
	}

	public attach(connection: Connection) {
		this._connection = connection;
	}

	public get connection(): Connection {
		if (!this._connection) {
			throw new Error('Remote is not attached to a connection yet.');
		}
		return this._connection;
	}

	public initialize(_capabilities: ClientCapabilities): void {
	}

	public fillServerCapabilities(_capabilities: ServerCapabilities): void {
	}

	public logEvent(data: any): void {
		this.connection.sendNotification(TelemetryEventNotification.type, data).catch(() => {
			this.connection.console.log(`Sending TelemetryEventNotification failed`);
		});
	}
}

export interface _Languages extends FeatureBase {
	connection: Connection;
	attachWorkDoneProgress(params: WorkDoneProgressParams): WorkDoneProgressReporter;
	attachPartialResultProgress<PR>(type: ProgressType<PR>, params: PartialResultParams): ResultProgressReporter<PR> | undefined;
}

export class _LanguagesImpl implements Remote, _Languages {

	private _connection: Connection | undefined;

	constructor() {
	}

	public attach(connection: Connection) {
		this._connection = connection;
	}

	public get connection(): Connection {
		if (!this._connection) {
			throw new Error('Remote is not attached to a connection yet.');
		}
		return this._connection;
	}

	public initialize(_capabilities: ClientCapabilities): void {
	}

	public fillServerCapabilities(_capabilities: ServerCapabilities): void {
	}

	public attachWorkDoneProgress(params: WorkDoneProgressParams): WorkDoneProgressReporter {
		return attachWorkDone(this.connection, params);
	}

	public attachPartialResultProgress<PR>(_type: ProgressType<PR>, params: PartialResultParams): ResultProgressReporter<PR> | undefined {
		return attachPartialResult(this.connection, params);
	}
}

export type Languages = _Languages & CallHierarchy & SemanticTokensFeatureShape & LinkedEditingRangeFeatureShape & TypeHierarchyFeatureShape & InlineValueFeatureShape & InlayHintFeatureShape & DiagnosticFeatureShape & MonikerFeatureShape & FoldingRangeFeatureShape;
const LanguagesImpl: new () => Languages = FoldingRangeFeature(MonikerFeature(DiagnosticFeature(InlayHintFeature(InlineValueFeature(TypeHierarchyFeature(LinkedEditingRangeFeature(SemanticTokensFeature(CallHierarchyFeature(_LanguagesImpl))))))))) as (new () => Languages);

export interface _Notebooks extends FeatureBase {
	connection: Connection;
	attachWorkDoneProgress(params: WorkDoneProgressParams): WorkDoneProgressReporter;
	attachPartialResultProgress<PR>(type: ProgressType<PR>, params: PartialResultParams): ResultProgressReporter<PR> | undefined;
}

export class _NotebooksImpl implements Remote, _Notebooks {

	private _connection: Connection | undefined;

	constructor() {
	}

	public attach(connection: Connection) {
		this._connection = connection;
	}

	public get connection(): Connection {
		if (!this._connection) {
			throw new Error('Remote is not attached to a connection yet.');
		}
		return this._connection;
	}

	public initialize(_capabilities: ClientCapabilities): void {
	}

	public fillServerCapabilities(_capabilities: ServerCapabilities): void {
	}

	public attachWorkDoneProgress(params: WorkDoneProgressParams): WorkDoneProgressReporter {
		return attachWorkDone(this.connection, params);
	}

	public attachPartialResultProgress<PR>(_type: ProgressType<PR>, params: PartialResultParams): ResultProgressReporter<PR> | undefined {
		return attachPartialResult(this.connection, params);
	}
}

export type Notebooks = _Notebooks & NotebookSyncFeatureShape;
const NotebooksImpl: new () => Notebooks = NotebookSyncFeature(_NotebooksImpl);

/**
 * An empty interface for new proposed API.
 */
export interface _ {
}

export interface ServerRequestHandler<P, R, PR, E> {
	(params: P, token: CancellationToken, workDoneProgress: WorkDoneProgressReporter, resultProgress?: ResultProgressReporter<PR>): HandlerResult<R, E>;
}

/**
 * Interface to describe the shape of the server connection.
 */
export interface _Connection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _, PNotebooks = _> {

	/**
	 * Start listening on the input stream for messages to process.
	 */
	listen(): void;

	/**
	 * Installs a request handler described by the given {@link RequestType}.
	 *
	 * @param type The {@link RequestType} describing the request.
	 * @param handler The handler to install
	 */
	onRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, handler: RequestHandler0<R, E>): Disposable;
	onRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, handler: RequestHandler<P, R, E>): Disposable;
	onRequest<R, PR, E, RO>(type: RequestType0<R, E>, handler: RequestHandler0<R, E>): Disposable;
	onRequest<P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): Disposable;

	/**
	 * Installs a request handler for the given method.
	 *
	 * @param method The method to register a request handler for.
	 * @param handler The handler to install.
	 */
	onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): Disposable;

	/**
	 * Installs a request handler that is invoked if no specific request handler can be found.
	 *
	 * @param handler a handler that handles all requests.
	 */
	onRequest(handler: StarRequestHandler): Disposable;

	/**
	 * Send a request to the client.
	 *
	 * @param type The {@link RequestType} describing the request.
	 * @param params The request's parameters.
	 */
	sendRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, token?: CancellationToken): Promise<R>;
	sendRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, params: P, token?: CancellationToken): Promise<R>;
	sendRequest<R, E>(type: RequestType0<R, E>, token?: CancellationToken): Promise<R>;
	sendRequest<P, R, E>(type: RequestType<P, R, E>, params: P, token?: CancellationToken): Promise<R>;

	/**
	 * Send a request to the client.
	 *
	 * @param method The method to invoke on the client.
	 * @param params The request's parameters.
	 */
	sendRequest<R>(method: string, token?: CancellationToken): Promise<R>;
	sendRequest<R>(method: string, params: any, token?: CancellationToken): Promise<R>;

	/**
	 * Installs a notification handler described by the given {@link NotificationType}.
	 *
	 * @param type The {@link NotificationType} describing the notification.
	 * @param handler The handler to install.
	 */
	onNotification<RO>(type: ProtocolNotificationType0<RO>, handler: NotificationHandler0): Disposable;
	onNotification<P, RO>(type: ProtocolNotificationType<P, RO>, handler: NotificationHandler<P>): Disposable;
	onNotification(type: NotificationType0, handler: NotificationHandler0): Disposable;
	onNotification<P>(type: NotificationType<P>, handler: NotificationHandler<P>): Disposable;

	/**
	 * Installs a notification handler for the given method.
	 *
	 * @param method The method to register a request handler for.
	 * @param handler The handler to install.
	 */
	onNotification(method: string, handler: GenericNotificationHandler): Disposable;

	/**
	 * Installs a notification handler that is invoked if no specific notification handler can be found.
	 *
	 * @param handler a handler that handles all notifications.
	 */
	onNotification(handler: StarNotificationHandler): Disposable;

	/**
	 * Send a notification to the client.
	 *
	 * @param type The {@link NotificationType} describing the notification.
	 * @param params The notification's parameters.
	 */
	sendNotification<RO>(type: ProtocolNotificationType0<RO>): Promise<void>;
	sendNotification<P, RO>(type: ProtocolNotificationType<P, RO>, params: P): Promise<void>;
	sendNotification(type: NotificationType0): Promise<void>;
	sendNotification<P>(type: NotificationType<P>, params: P): Promise<void>;

	/**
	 * Send a notification to the client.
	 *
	 * @param method The method to invoke on the client.
	 * @param params The notification's parameters.
	 */
	sendNotification(method: string, params?: any): Promise<void>;

	/**
	 * Installs a progress handler for a given token.
	 * @param type the progress type
	 * @param token the token
	 * @param handler the handler
	 */
	onProgress<P>(type: ProgressType<P>, token: string | number, handler: NotificationHandler<P>): Disposable;

	/**
	 * Sends progress.
	 * @param type the progress type
	 * @param token the token to use
	 * @param value the progress value
	 */
	sendProgress<P>(type: ProgressType<P>, token: string | number, value: P): Promise<void>;

	/**
	 * Installs a handler for the initialize request.
	 *
	 * @param handler The initialize handler.
	 */
	onInitialize(handler: ServerRequestHandler<InitializeParams, InitializeResult, never, InitializeError>): Disposable;

	/**
	 * Installs a handler for the initialized notification.
	 *
	 * @param handler The initialized handler.
	 */
	onInitialized(handler: NotificationHandler<InitializedParams>): Disposable;

	/**
	 * Installs a handler for the shutdown request.
	 *
	 * @param handler The initialize handler.
	 */
	onShutdown(handler: RequestHandler0<void, void>): Disposable;

	/**
	 * Installs a handler for the exit notification.
	 *
	 * @param handler The exit handler.
	 */
	onExit(handler: NotificationHandler0): Disposable;

	/**
	 * A property to provide access to console specific features.
	 */
	console: RemoteConsole & PConsole;

	/**
	 * A property to provide access to tracer specific features.
	 */
	tracer: RemoteTracer & PTracer;

	/**
	 * A property to provide access to telemetry specific features.
	 */
	telemetry: Telemetry & PTelemetry;

	/**
	 * A property to provide access to client specific features like registering
	 * for requests or notifications.
	 */
	client: RemoteClient & PClient;

	/**
	 * A property to provide access to windows specific features.
	 */
	window: RemoteWindow & PWindow;

	/**
	 * A property to provide access to workspace specific features.
	 */
	workspace: RemoteWorkspace & PWorkspace;

	/**
	 * A property to provide access to language specific features.
	 */
	languages: Languages & PLanguages;

	/**
	 * A property to provide access to notebook specific features.
	 */
	notebooks: Notebooks & PNotebooks;

	/**
	 * Installs a handler for the `DidChangeConfiguration` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidChangeConfiguration(handler: NotificationHandler<DidChangeConfigurationParams>): Disposable;

	/**
	 * Installs a handler for the `DidChangeWatchedFiles` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidChangeWatchedFiles(handler: NotificationHandler<DidChangeWatchedFilesParams>): Disposable;

	/**
	 * Installs a handler for the `DidOpenTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidOpenTextDocument(handler: NotificationHandler<DidOpenTextDocumentParams>): Disposable;

	/**
	 * Installs a handler for the `DidChangeTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidChangeTextDocument(handler: NotificationHandler<DidChangeTextDocumentParams>): Disposable;

	/**
	 * Installs a handler for the `DidCloseTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidCloseTextDocument(handler: NotificationHandler<DidCloseTextDocumentParams>): Disposable;

	/**
	 * Installs a handler for the `WillSaveTextDocument` notification.
	 *
	 * Note that this notification is opt-in. The client will not send it unless
	 * your server has the `textDocumentSync.willSave` capability or you've
	 * dynamically registered for the `textDocument/willSave` method.
	 *
	 * @param handler The corresponding handler.
	 */
	onWillSaveTextDocument(handler: NotificationHandler<WillSaveTextDocumentParams>): Disposable;

	/**
	 * Installs a handler for the `WillSaveTextDocumentWaitUntil` request.
	 *
	 * Note that this request is opt-in. The client will not send it unless
	 * your server has the `textDocumentSync.willSaveWaitUntil` capability,
	 * or you've dynamically registered for the `textDocument/willSaveWaitUntil`
	 * method.
	 *
	 * @param handler The corresponding handler.
	 */
	onWillSaveTextDocumentWaitUntil(handler: RequestHandler<WillSaveTextDocumentParams, TextEdit[] | undefined | null, void>): Disposable;

	/**
	 * Installs a handler for the `DidSaveTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidSaveTextDocument(handler: NotificationHandler<DidSaveTextDocumentParams>): Disposable;

	/**
	 * Sends diagnostics computed for a given document to VSCode to render them in the
	 * user interface.
	 *
	 * @param params The diagnostic parameters.
	 */
	sendDiagnostics(params: PublishDiagnosticsParams): Promise<void>;

	/**
	 * Installs a handler for the `Hover` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onHover(handler: ServerRequestHandler<HoverParams, Hover | undefined | null, never, void>): Disposable;

	/**
	 * Installs a handler for the `Completion` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCompletion(handler: ServerRequestHandler<CompletionParams, CompletionItem[] | CompletionList | undefined | null, CompletionItem[], void>): Disposable;

	/**
	 * Installs a handler for the `CompletionResolve` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCompletionResolve(handler: RequestHandler<CompletionItem, CompletionItem, void>): Disposable;

	/**
	 * Installs a handler for the `SignatureHelp` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onSignatureHelp(handler: ServerRequestHandler<SignatureHelpParams, SignatureHelp | undefined | null, never, void>): Disposable;

	/**
	 * Installs a handler for the `Declaration` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDeclaration(handler: ServerRequestHandler<DeclarationParams, Declaration | DeclarationLink[] | undefined | null, Location[] | DeclarationLink[], void>): Disposable;

	/**
	 * Installs a handler for the `Definition` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDefinition(handler: ServerRequestHandler<DefinitionParams, Definition | DefinitionLink[] | undefined | null, Location[] | DefinitionLink[], void>): Disposable;

	/**
	 * Installs a handler for the `Type Definition` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onTypeDefinition(handler: ServerRequestHandler<TypeDefinitionParams, Definition | DefinitionLink[] | undefined | null, Location[] | DefinitionLink[], void>): Disposable;

	/**
	 * Installs a handler for the `Implementation` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onImplementation(handler: ServerRequestHandler<ImplementationParams, Definition | DefinitionLink[] | undefined | null, Location[] | DefinitionLink[], void>): Disposable;

	/**
	 * Installs a handler for the `References` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onReferences(handler: ServerRequestHandler<ReferenceParams, Location[] | undefined | null, Location[], void>): Disposable;

	/**
	 * Installs a handler for the `DocumentHighlight` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentHighlight(handler: ServerRequestHandler<DocumentHighlightParams, DocumentHighlight[] | undefined | null, DocumentHighlight[], void>): Disposable;

	/**
	 * Installs a handler for the `DocumentSymbol` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentSymbol(handler: ServerRequestHandler<DocumentSymbolParams, SymbolInformation[] | DocumentSymbol[] | undefined | null, SymbolInformation[] | DocumentSymbol[], void>): Disposable;

	/**
	 * Installs a handler for the `WorkspaceSymbol` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onWorkspaceSymbol(handler: ServerRequestHandler<WorkspaceSymbolParams, SymbolInformation[] | WorkspaceSymbol[] | undefined | null, SymbolInformation[], void>): Disposable;

	/**
	 * Installs a handler for the `WorkspaceSymbol` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onWorkspaceSymbolResolve(handler: RequestHandler<WorkspaceSymbol, WorkspaceSymbol, void>): Disposable;

	/**
	 * Installs a handler for the `CodeAction` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeAction(handler: ServerRequestHandler<CodeActionParams, (Command | CodeAction)[] | undefined | null, (Command | CodeAction)[], void>): Disposable;

	/**
	 * Installs a handler for the `CodeAction` resolve request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeActionResolve(handler: RequestHandler<CodeAction, CodeAction, void>): Disposable;

	/**
	 * Compute a list of {@link CodeLens lenses}. This call should return as fast as possible and if
	 * computing the commands is expensive implementers should only return code lens objects with the
	 * range set and handle the resolve request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeLens(handler: ServerRequestHandler<CodeLensParams, CodeLens[] | undefined | null, CodeLens[], void>): Disposable;

	/**
	 * This function will be called for each visible code lens, usually when scrolling and after
	 * the onCodeLens has been called.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeLensResolve(handler: RequestHandler<CodeLens, CodeLens, void>): Disposable;

	/**
	 * Installs a handler for the document formatting request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentFormatting(handler: ServerRequestHandler<DocumentFormattingParams, TextEdit[] | undefined | null, never, void>): Disposable;

	/**
	 * Installs a handler for the document range formatting request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentRangeFormatting(handler: ServerRequestHandler<DocumentRangeFormattingParams, TextEdit[] | undefined | null, never, void>): Disposable;

	/**
	 * Installs a handler for the document on type formatting request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentOnTypeFormatting(handler: RequestHandler<DocumentOnTypeFormattingParams, TextEdit[] | undefined | null, void>): Disposable;

	/**
	 * Installs a handler for the rename request.
	 *
	 * @param handler The corresponding handler.
	 */
	onRenameRequest(handler: ServerRequestHandler<RenameParams, WorkspaceEdit | undefined | null, never, void>): Disposable;

	/**
	 * Installs a handler for the prepare rename request.
	 *
	 * @param handler The corresponding handler.
	 */
	onPrepareRename(handler: RequestHandler<PrepareRenameParams, Range | { range: Range; placeholder: string } | { defaultBehavior: boolean } | undefined | null, void>): Disposable;

	/**
	 * Installs a handler for the document links request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentLinks(handler: ServerRequestHandler<DocumentLinkParams, DocumentLink[] | undefined | null, DocumentLink[], void>): Disposable;

	/**
	 * Installs a handler for the document links resolve request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentLinkResolve(handler: RequestHandler<DocumentLink, DocumentLink | undefined | null, void>): Disposable;

	/**
	 * Installs a handler for the document color request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentColor(handler: ServerRequestHandler<DocumentColorParams, ColorInformation[] | undefined | null, ColorInformation[], void>): Disposable;

	/**
	 * Installs a handler for the document color request.
	 *
	 * @param handler The corresponding handler.
	 */
	onColorPresentation(handler: ServerRequestHandler<ColorPresentationParams, ColorPresentation[] | undefined | null, ColorPresentation[], void>): Disposable;

	/**
	 * Installs a handler for the folding ranges request.
	 *
	 * @param handler The corresponding handler.
	 */
	onFoldingRanges(handler: ServerRequestHandler<FoldingRangeParams, FoldingRange[] | undefined | null, FoldingRange[], void>): Disposable;

	/**
	 * Installs a handler for the selection ranges request.
	 *
	 * @param handler The corresponding handler.
	 */
	onSelectionRanges(handler: ServerRequestHandler<SelectionRangeParams, SelectionRange[] | undefined | null, SelectionRange[], void>): Disposable;

	/**
	 * Installs a handler for the execute command request.
	 *
	 * @param handler The corresponding handler.
	 */
	onExecuteCommand(handler: ServerRequestHandler<ExecuteCommandParams, any | undefined | null, never, void>): Disposable;

	/**
	 * Disposes the connection
	 */
	dispose(): void;
}

export interface Connection extends _Connection {
}

export interface Feature<B extends FeatureBase, P> {
	(Base: new () => B): new () => B & P;
}

export type ConsoleFeature<P> = Feature<RemoteConsole, P>;
export function combineConsoleFeatures<O, T>(one: ConsoleFeature<O>, two: ConsoleFeature<T>): ConsoleFeature<O & T> {
	return function (Base: new () => RemoteConsole): new () => RemoteConsole & O & T {
		return two(one(Base)) as any;
	};
}

export type TelemetryFeature<P> = Feature<Telemetry, P>;
export function combineTelemetryFeatures<O, T>(one: TelemetryFeature<O>, two: TelemetryFeature<T>): TelemetryFeature<O & T> {
	return function (Base: new () => Telemetry): new () => Telemetry & O & T {
		return two(one(Base)) as any;
	};
}

export type TracerFeature<P> = Feature<RemoteTracer, P>;
export function combineTracerFeatures<O, T>(one: TracerFeature<O>, two: TracerFeature<T>): TracerFeature<O & T> {
	return function (Base: new () => RemoteTracer): new () => RemoteTracer & O & T {
		return two(one(Base)) as any;
	};
}

export type ClientFeature<P> = Feature<RemoteClient, P>;
export function combineClientFeatures<O, T>(one: ClientFeature<O>, two: ClientFeature<T>): ClientFeature<O & T> {
	return function (Base: new () => RemoteClient): new () => RemoteClient & O & T {
		return two(one(Base)) as any;
	};
}
export type WindowFeature<P> = Feature<_RemoteWindow, P>;
export function combineWindowFeatures<O, T>(one: WindowFeature<O>, two: WindowFeature<T>): WindowFeature<O & T> {
	return function (Base: new () => _RemoteWindow): new () => _RemoteWindow & O & T {
		return two(one(Base)) as any;
	};
}
export type WorkspaceFeature<P> = Feature<_RemoteWorkspace, P>;
export function combineWorkspaceFeatures<O, T>(one: WorkspaceFeature<O>, two: WorkspaceFeature<T>): WorkspaceFeature<O & T> {
	return function (Base: new () => _RemoteWorkspace): new () => _RemoteWorkspace & O & T {
		return two(one(Base)) as any;
	};
}
export type LanguagesFeature<P> = Feature<_Languages, P>;
export function combineLanguagesFeatures<O, T>(one: LanguagesFeature<O>, two: LanguagesFeature<T>): LanguagesFeature<O & T> {
	return function (Base: new () => _Languages): new () => _Languages & O & T {
		return two(one(Base)) as any;
	};
}
export type NotebooksFeature<P> = Feature<_Notebooks, P>;
export function combineNotebooksFeatures<O, T>(one: NotebooksFeature<O>, two: NotebooksFeature<T>): NotebooksFeature<O & T> {
	return function (Base: new () => _Notebooks): new () => _Notebooks & O & T {
		return two(one(Base)) as any;
	};
}

export interface Features<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _, PNotebooks = _> {
	__brand: 'features';
	console?: ConsoleFeature<PConsole>;
	tracer?: TracerFeature<PTracer>;
	telemetry?: TelemetryFeature<PTelemetry>;
	client?: ClientFeature<PClient>;
	window?: WindowFeature<PWindow>;
	workspace?: WorkspaceFeature<PWorkspace>;
	languages?: LanguagesFeature<PLanguages>;
	notebooks?: NotebooksFeature<PNotebooks>;
}

export function combineFeatures<OConsole, OTracer, OTelemetry, OClient, OWindow, OWorkspace, OLanguages, ONotebooks, TConsole, TTracer, TTelemetry, TClient, TWindow, TWorkspace, TLanguages, TNotebooks>(
	one: Features<OConsole, OTracer, OTelemetry, OClient, OWindow, OWorkspace, OLanguages, ONotebooks>,
	two: Features<TConsole, TTracer, TTelemetry, TClient, TWindow, TWorkspace, TLanguages, TNotebooks>
): Features<OConsole & TConsole, OTracer & TTracer, OTelemetry & TTelemetry, OClient & TClient, OWindow & TWindow, OWorkspace & TWorkspace, OLanguages & TLanguages, ONotebooks & TNotebooks> {
	function combine<O, T>(one: O | undefined, two: T | undefined, func: (one: O, two: T) => any): any {
		if (one && two) {
			return func(one, two);
		} else if (one) {
			return one;
		} else {
			return two;
		}
	}
	const result: Features<OConsole & TConsole, OTracer & TTracer, OTelemetry & TTelemetry, OClient & TClient, OWindow & TWindow, OWorkspace & TWorkspace, OLanguages & TLanguages, ONotebooks & TNotebooks> = {
		__brand: 'features',
		console: combine(one.console, two.console, combineConsoleFeatures),
		tracer: combine(one.tracer, two.tracer, combineTracerFeatures),
		telemetry: combine(one.telemetry, two.telemetry, combineTelemetryFeatures),
		client: combine(one.client, two.client, combineClientFeatures),
		window: combine(one.window, two.window, combineWindowFeatures),
		workspace: combine(one.workspace, two.workspace, combineWorkspaceFeatures),
		languages: combine(one.languages, two.languages, combineLanguagesFeatures),
		notebooks: combine(one.notebooks, two.notebooks, combineNotebooksFeatures)
	};
	return result;
}

export interface WatchDog {
	shutdownReceived: boolean;
	initialize(params: InitializeParams): void;
	exit(code: number): void;
}

export function createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _, PNotebooks = _>(
	connectionFactory: (logger: Logger) => ProtocolConnection, watchDog: WatchDog,
	factories?: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages, PNotebooks>,
): _Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages, PNotebooks> {

	const logger = (factories && factories.console ? new (factories.console(RemoteConsoleImpl))() : new RemoteConsoleImpl()) as RemoteConsoleImpl & PConsole;
	const connection = connectionFactory(logger);
	logger.rawAttach(connection);
	const tracer = (factories && factories.tracer ? new (factories.tracer(TracerImpl))() : new TracerImpl()) as TracerImpl & PTracer;
	const telemetry = (factories && factories.telemetry ? new (factories.telemetry(TelemetryImpl))() : new TelemetryImpl()) as TelemetryImpl & PTelemetry;
	const client = (factories && factories.client ? new (factories.client(RemoteClientImpl))() : new RemoteClientImpl()) as RemoteClientImpl & PClient;
	const remoteWindow = (factories && factories.window ? new (factories.window(RemoteWindowImpl))() : new RemoteWindowImpl()) as Remote & RemoteWindow & PWindow;
	const workspace = (factories && factories.workspace ? new (factories.workspace(RemoteWorkspaceImpl))() : new RemoteWorkspaceImpl()) as Remote & RemoteWorkspace & PWorkspace;
	const languages = (factories && factories.languages ? new (factories.languages(LanguagesImpl))() : new LanguagesImpl()) as Remote & Languages & PLanguages;
	const notebooks = (factories && factories.notebooks ? new (factories.notebooks(NotebooksImpl))(): new NotebooksImpl()) as Remote & Notebooks & PNotebooks;
	const allRemotes: Remote[] = [logger, tracer, telemetry, client, remoteWindow, workspace, languages, notebooks];

	function asPromise<T>(value: Promise<T>): Promise<T>;
	function asPromise<T>(value: Thenable<T>): Promise<T>;
	function asPromise<T>(value: T): Promise<T>;
	function asPromise(value: any): Promise<any> {
		if (value instanceof Promise) {
			return value;
		} else if (Is.thenable(value)) {
			return new Promise((resolve, reject) => {
				value.then((resolved) => resolve(resolved), (error) => reject(error));
			});
		} else {
			return Promise.resolve(value);
		}
	}

	let shutdownHandler: RequestHandler0<void, void> | undefined = undefined;
	let initializeHandler: ServerRequestHandler<InitializeParams, InitializeResult, never, InitializeError> | undefined = undefined;
	let exitHandler: NotificationHandler0 | undefined = undefined;
	const protocolConnection: _Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages, PNotebooks> & ConnectionState = {
		listen: (): void => connection.listen(),

		sendRequest: <R>(type: string | MessageSignature, ...params: any[]): Promise<R> => connection.sendRequest(Is.string(type) ? type : type.method, ...params),
		onRequest: <R, E>(type: string | MessageSignature | StarRequestHandler, handler?: GenericRequestHandler<R, E>): Disposable => (connection as any).onRequest(type, handler),

		sendNotification: (type: string | MessageSignature, param?: any): Promise<void> => {
			const method = Is.string(type) ? type : type.method;
			return connection.sendNotification(method, param);
		},
		onNotification: (type: string | MessageSignature | StarNotificationHandler, handler?: GenericNotificationHandler): Disposable => (connection as any).onNotification(type, handler),

		onProgress: connection.onProgress,
		sendProgress: connection.sendProgress,

		onInitialize: (handler) =>  {
			initializeHandler = handler;
			return {
				dispose: () => {
					initializeHandler = undefined;
				}
			};
		},
		onInitialized: (handler) => connection.onNotification(InitializedNotification.type, handler),
		onShutdown: (handler) => {
			shutdownHandler = handler;
			return {
				dispose: () => {
					shutdownHandler = undefined;
				}
			};
		},
		onExit: (handler) => {
			exitHandler = handler;
			return {
				dispose: () => {
					exitHandler = undefined;
				}
			};
		},

		get console() { return logger; },
		get telemetry() { return telemetry; },
		get tracer() { return tracer; },
		get client() { return client; },
		get window() { return remoteWindow; },
		get workspace() { return workspace; },
		get languages() { return languages; },
		get notebooks() { return notebooks; },

		onDidChangeConfiguration: (handler) => connection.onNotification(DidChangeConfigurationNotification.type, handler),
		onDidChangeWatchedFiles: (handler) => connection.onNotification(DidChangeWatchedFilesNotification.type, handler),

		__textDocumentSync: undefined,
		onDidOpenTextDocument: (handler) => connection.onNotification(DidOpenTextDocumentNotification.type, handler),
		onDidChangeTextDocument: (handler) => connection.onNotification(DidChangeTextDocumentNotification.type, handler),
		onDidCloseTextDocument: (handler) => connection.onNotification(DidCloseTextDocumentNotification.type, handler),
		onWillSaveTextDocument: (handler) => connection.onNotification(WillSaveTextDocumentNotification.type, handler),
		onWillSaveTextDocumentWaitUntil: (handler) => connection.onRequest(WillSaveTextDocumentWaitUntilRequest.type, handler),
		onDidSaveTextDocument: (handler) => connection.onNotification(DidSaveTextDocumentNotification.type, handler),

		sendDiagnostics: (params) => connection.sendNotification(PublishDiagnosticsNotification.type, params),

		onHover: (handler) => connection.onRequest(HoverRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), undefined);
		}),
		onCompletion: (handler) => connection.onRequest(CompletionRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onCompletionResolve: (handler) => connection.onRequest(CompletionResolveRequest.type, handler),
		onSignatureHelp: (handler) => connection.onRequest(SignatureHelpRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), undefined);
		}),
		onDeclaration: (handler) => connection.onRequest(DeclarationRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onDefinition: (handler) => connection.onRequest(DefinitionRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onTypeDefinition: (handler) => connection.onRequest(TypeDefinitionRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onImplementation: (handler) => connection.onRequest(ImplementationRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onReferences: (handler) => connection.onRequest(ReferencesRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onDocumentHighlight: (handler) => connection.onRequest(DocumentHighlightRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onDocumentSymbol: (handler) => connection.onRequest(DocumentSymbolRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onWorkspaceSymbol: (handler) => connection.onRequest(WorkspaceSymbolRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onWorkspaceSymbolResolve: (handler) => connection.onRequest(WorkspaceSymbolResolveRequest.type, handler),
		onCodeAction: (handler) => connection.onRequest(CodeActionRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onCodeActionResolve: (handler) => connection.onRequest(CodeActionResolveRequest.type, (params, cancel) => {
			return handler(params, cancel);
		}),
		onCodeLens: (handler) => connection.onRequest(CodeLensRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onCodeLensResolve: (handler) => connection.onRequest(CodeLensResolveRequest.type, (params, cancel) => {
			return handler(params, cancel);
		}),
		onDocumentFormatting: (handler) => connection.onRequest(DocumentFormattingRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), undefined);
		}),
		onDocumentRangeFormatting: (handler) => connection.onRequest(DocumentRangeFormattingRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), undefined);
		}),
		onDocumentOnTypeFormatting: (handler) => connection.onRequest(DocumentOnTypeFormattingRequest.type, (params, cancel) => {
			return handler(params, cancel);
		}),
		onRenameRequest: (handler) => connection.onRequest(RenameRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), undefined);
		}),
		onPrepareRename: (handler) => connection.onRequest(PrepareRenameRequest.type, (params, cancel) => {
			return handler(params, cancel);
		}),
		onDocumentLinks: (handler) => connection.onRequest(DocumentLinkRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onDocumentLinkResolve: (handler) => connection.onRequest(DocumentLinkResolveRequest.type, (params, cancel) => {
			return handler(params, cancel);
		}),
		onDocumentColor: (handler) => connection.onRequest(DocumentColorRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onColorPresentation: (handler) => connection.onRequest(ColorPresentationRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onFoldingRanges: (handler) => connection.onRequest(FoldingRangeRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onSelectionRanges: (handler) => connection.onRequest(SelectionRangeRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), attachPartialResult(connection, params));
		}),
		onExecuteCommand: (handler) => connection.onRequest(ExecuteCommandRequest.type, (params, cancel) => {
			return handler(params, cancel, attachWorkDone(connection, params), undefined);
		}),

		dispose: () => connection.dispose()
	};
	for (const remote of allRemotes) {
		remote.attach(protocolConnection);
	}

	connection.onRequest(InitializeRequest.type, (params) => {
		watchDog.initialize(params);
		if (Is.string(params.trace)) {
			tracer.trace = Trace.fromString(params.trace);
		}
		for (const remote of allRemotes) {
			remote.initialize(params.capabilities);
		}
		if (initializeHandler) {
			const result = initializeHandler(params, new CancellationTokenSource().token, attachWorkDone(connection, params), undefined);
			return asPromise(result).then((value) => {
				if (value instanceof ResponseError) {
					return value;
				}
				let result = <InitializeResult>value;
				if (!result) {
					result = { capabilities: {} };
				}
				let capabilities = result.capabilities;
				if (!capabilities) {
					capabilities = {};
					result.capabilities = capabilities;
				}
				if (capabilities.textDocumentSync === undefined || capabilities.textDocumentSync === null) {
					capabilities.textDocumentSync = Is.number(protocolConnection.__textDocumentSync) ? protocolConnection.__textDocumentSync : TextDocumentSyncKind.None;
				} else if (!Is.number(capabilities.textDocumentSync) && !Is.number(capabilities.textDocumentSync.change)) {
					capabilities.textDocumentSync.change = Is.number(protocolConnection.__textDocumentSync) ? protocolConnection.__textDocumentSync : TextDocumentSyncKind.None;
				}
				for (const remote of allRemotes) {
					remote.fillServerCapabilities(capabilities);
				}
				return result;
			});
		} else {
			const result: InitializeResult = { capabilities: { textDocumentSync: TextDocumentSyncKind.None } };
			for (const remote of allRemotes) {
				remote.fillServerCapabilities(result.capabilities);
			}
			return result;
		}
	});

	connection.onRequest<void, void, void, unknown>(ShutdownRequest.type, () => {
		watchDog.shutdownReceived = true;
		if (shutdownHandler) {
			return shutdownHandler(new CancellationTokenSource().token);
		} else {
			return undefined;
		}
	});

	connection.onNotification(ExitNotification.type, () => {
		try {
			if (exitHandler) {
				return exitHandler();
			}
		} finally {
			if (watchDog.shutdownReceived) {
				watchDog.exit(0);
			} else {
				watchDog.exit(1);
			}
		}
	});

	connection.onNotification(SetTraceNotification.type, (params) => {
		tracer.trace = Trace.fromString(params.value);
	});

	return protocolConnection;
}
