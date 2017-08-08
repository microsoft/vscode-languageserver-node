/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="./thenable.ts" />
'use strict';

import {
	RequestType, RequestType0, RequestHandler, RequestHandler0, GenericRequestHandler, StarRequestHandler,
	NotificationType, NotificationType0, NotificationHandler, NotificationHandler0, GenericNotificationHandler, StarNotificationHandler,
	MessageType as RPCMessageType, ResponseError, ErrorCodes,
	MessageConnection, Logger, createMessageConnection,
	MessageReader, DataCallback, StreamMessageReader, IPCMessageReader,
	MessageWriter, StreamMessageWriter, IPCMessageWriter, createServerPipeTransport,
	CancellationToken, CancellationTokenSource,
	Disposable, Event, Emitter, Trace, SetTraceNotification, LogTraceNotification,
	ConnectionStrategy
} from 'vscode-jsonrpc';

import {
	TextDocument, TextDocumentChangeEvent, TextDocumentContentChangeEvent, TextDocumentWillSaveEvent,
	Location, Command, TextEdit, WorkspaceEdit, CompletionItem, CompletionList, Hover,
	SignatureHelp, Definition, DocumentHighlight, SymbolInformation, WorkspaceSymbolParams, DocumentSymbolParams,
	CodeLens, DocumentLink
} from 'vscode-languageserver-types';

import {
	RegistrationRequest, Registration, RegistrationParams, Unregistration, UnregistrationRequest, UnregistrationParams,
	InitializeRequest, InitializeParams, InitializeResult, InitializeError,
	InitializedNotification, InitializedParams, ShutdownRequest, ExitNotification,
	LogMessageNotification, MessageType, ShowMessageRequest, ShowMessageRequestParams, MessageActionItem,
	TelemetryEventNotification,
	DidChangeConfigurationNotification, DidChangeConfigurationParams,
	DidOpenTextDocumentNotification, DidOpenTextDocumentParams, DidChangeTextDocumentNotification, DidChangeTextDocumentParams,
	DidCloseTextDocumentNotification, DidCloseTextDocumentParams, DidSaveTextDocumentNotification, DidSaveTextDocumentParams,
	WillSaveTextDocumentNotification, WillSaveTextDocumentParams, WillSaveTextDocumentWaitUntilRequest,
	DidChangeWatchedFilesNotification, DidChangeWatchedFilesParams,
	PublishDiagnosticsNotification, PublishDiagnosticsParams,
	TextDocumentPositionParams, TextDocumentSyncKind,
	HoverRequest,
	CompletionRequest, CompletionResolveRequest,
	SignatureHelpRequest,
	DefinitionRequest, ReferencesRequest, ReferenceParams,
	DocumentHighlightRequest,
	DocumentSymbolRequest, WorkspaceSymbolRequest,
	CodeActionRequest, CodeActionParams, CodeLensRequest, CodeLensParams, CodeLensResolveRequest,
	DocumentFormattingRequest, DocumentFormattingParams, DocumentRangeFormattingRequest, DocumentRangeFormattingParams,
	DocumentOnTypeFormattingRequest, DocumentOnTypeFormattingParams,
	RenameRequest, RenameParams,
	DocumentLinkRequest, DocumentLinkResolveRequest, DocumentLinkParams,
	ExecuteCommandRequest, ExecuteCommandParams,
	ApplyWorkspaceEditRequest, ApplyWorkspaceEditParams, ApplyWorkspaceEditResponse
} from './protocol';

import * as Is from './utils/is';
import * as UUID from './utils/uuid';

// ------------- Reexport the API surface of the language worker API ----------------------
export {
	RequestType0, RequestHandler0, RequestType, RequestHandler,
	NotificationType0, NotificationHandler0, NotificationType, NotificationHandler,
	CancellationTokenSource, CancellationToken, ResponseError, ErrorCodes,
	MessageReader, DataCallback, StreamMessageReader, IPCMessageReader,
	MessageWriter, StreamMessageWriter, IPCMessageWriter, Disposable, createServerPipeTransport
}
export * from 'vscode-languageserver-types';
export * from './protocol';
export { Event }

import * as fm from './files';
import * as net from 'net';
import * as stream from 'stream';

export namespace Files {
	export let uriToFilePath = fm.uriToFilePath;
	export let resolveGlobalNodePath = fm.resolveGlobalNodePath;
	export let resolve = fm.resolve;
	export let resolveModule = fm.resolveModule;
	export let resolveModule2 = fm.resolveModule2;
	export let resolveModulePath = fm.resolveModulePath;
}

interface ConnectionState {
	__textDocumentSync: TextDocumentSyncKind | undefined;
}

/**
 * A manager for simple text documents
 */
export class TextDocuments {

	private _documents: { [uri: string]: TextDocument };

	private _onDidChangeContent: Emitter<TextDocumentChangeEvent>;
	private _onDidOpen: Emitter<TextDocumentChangeEvent>;
	private _onDidClose: Emitter<TextDocumentChangeEvent>;
	private _onDidSave: Emitter<TextDocumentChangeEvent>;
	private _onWillSave: Emitter<TextDocumentWillSaveEvent>;
	private _willSaveWaitUntil: RequestHandler<TextDocumentWillSaveEvent, TextEdit[], void>;

	/**
	 * Create a new text document manager.
	 */
	public constructor() {
		this._documents = Object.create(null);
		this._onDidChangeContent = new Emitter<TextDocumentChangeEvent>();
		this._onDidOpen = new Emitter<TextDocumentChangeEvent>();
		this._onDidClose = new Emitter<TextDocumentChangeEvent>();
		this._onDidSave = new Emitter<TextDocumentChangeEvent>();
		this._onWillSave = new Emitter<TextDocumentWillSaveEvent>();
	}

	/**
	 * Returns the [TextDocumentSyncKind](#TextDocumentSyncKind) used by
	 * this text document manager.
	 */
	public get syncKind(): TextDocumentSyncKind {
		return TextDocumentSyncKind.Full;
	}

	/**
	 * An event that fires when a text document managed by this manager
	 * has been opened or the content changes.
	 */
	public get onDidChangeContent(): Event<TextDocumentChangeEvent> {
		return this._onDidChangeContent.event;
	}

	/**
	 * An event that fires when a text document managed by this manager
	 * has been opened.
	 */
	public get onDidOpen(): Event<TextDocumentChangeEvent> {
		return this._onDidOpen.event;
	}

	/**
	 * An event that fires when a text document managed by this manager
	 * will be saved.
	 */
	public get onWillSave(): Event<TextDocumentWillSaveEvent> {
		return this._onWillSave.event;
	}

	/**
	 * Sets a handler that will be called if a participant wants to provide
	 * edits during a text document save.
	 */
	public onWillSaveWaitUntil(handler: RequestHandler<TextDocumentWillSaveEvent, TextEdit[], void>) {
		this._willSaveWaitUntil = handler;
	}

	/**
	 * An event that fires when a text document managed by this manager
	 * has been saved.
	 */
	public get onDidSave(): Event<TextDocumentChangeEvent> {
		return this._onDidSave.event;
	}

	/**
	 * An event that fires when a text document managed by this manager
	 * has been closed.
	 */
	public get onDidClose(): Event<TextDocumentChangeEvent> {
		return this._onDidClose.event;
	}

	/**
	 * Returns the document for the given URI. Returns undefined if
	 * the document is not mananged by this instance.
	 *
	 * @param uri The text document's URI to retrieve.
	 * @return the text document or `undefined`.
	 */
	public get(uri: string): TextDocument {
		return this._documents[uri];
	}

	/**
	 * Returns all text documents managed by this instance.
	 *
	 * @return all text documents.
	 */
	public all(): TextDocument[] {
		return Object.keys(this._documents).map(key => this._documents[key]);
	}

	/**
	 * Returns the URIs of all text documents managed by this instance.
	 *
	 * @return the URI's of all text documents.
	 */
	public keys(): string[] {
		return Object.keys(this._documents);
	}

	/**
	 * Listens for `low level` notification on the given connection to
	 * update the text documents managed by this instance.
	 *
	 * @param connection The connection to listen on.
	 */
	public listen(connection: IConnection): void {
		interface UpdateableDocument extends TextDocument {
			update(event: TextDocumentContentChangeEvent, version: number): void;
		}

		function isUpdateableDocument(value: TextDocument): value is UpdateableDocument {
			return Is.func((value as UpdateableDocument).update);
		}

		(<ConnectionState><any>connection).__textDocumentSync = TextDocumentSyncKind.Full;
		connection.onDidOpenTextDocument((event: DidOpenTextDocumentParams) => {
			let td = event.textDocument;
			let document = TextDocument.create(td.uri, td.languageId, td.version, td.text);
			this._documents[td.uri] = document;
			let toFire = Object.freeze({ document });
			this._onDidOpen.fire(toFire);
			this._onDidChangeContent.fire(toFire);
		});
		connection.onDidChangeTextDocument((event: DidChangeTextDocumentParams) => {
			let td = event.textDocument;
			let changes = event.contentChanges;
			let last: TextDocumentContentChangeEvent | undefined = changes.length > 0 ? changes[changes.length - 1] : undefined;
			if (last) {
				let document = this._documents[td.uri];
				if (document && isUpdateableDocument(document)) {
					document.update(last, td.version);
					this._onDidChangeContent.fire(Object.freeze({ document }));
				}
			}
		});
		connection.onDidCloseTextDocument((event: DidCloseTextDocumentParams) => {
			let document = this._documents[event.textDocument.uri];
			if (document) {
				delete this._documents[event.textDocument.uri];
				this._onDidClose.fire(Object.freeze({ document }));
			}
		});
		connection.onWillSaveTextDocument((event: WillSaveTextDocumentParams) => {
			let document = this._documents[event.textDocument.uri];
			if (document) {
				this._onWillSave.fire(Object.freeze({ document, reason: event.reason }));
			}
		});
		connection.onWillSaveTextDocumentWaitUntil((event: WillSaveTextDocumentParams, token: CancellationToken) => {
			let document = this._documents[event.textDocument.uri];
			if (document && this._willSaveWaitUntil) {
				return this._willSaveWaitUntil(Object.freeze({ document, reason: event.reason }), token);
			} else {
				return [];
			}
		});
		connection.onDidSaveTextDocument((event: DidSaveTextDocumentParams) => {
			let document = this._documents[event.textDocument.uri];
			if (document) {
				this._onDidSave.fire(Object.freeze({ document }));
			}
		});
	}
}

// ------------------------- implementation of the language server protocol ---------------------------------------------

/**
 * An empty interface for new proposed API.
 */
export interface _ {
}

/**
 * Helps tracking error message. Equal occurences of the same
 * message are only stored once. This class is for example
 * usefull if text documents are validated in a loop and equal
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
	 * Send all tracked messages to the conenction's window.
	 *
	 * @param connection The connection establised between client and server.
	 */
	public sendErrors(connection: { window: RemoteWindow }): void {
		Object.keys(this._messages).forEach(message => {
			connection.window.showErrorMessage(message);
		});
	}
}

/**
 *
 */
export interface Remote {
	connection: MessageConnection;
}

/**
 * The RemoteConsole interface contains all functions to interact with
 * the developer console of VS Code.
 */
export interface RemoteConsole {
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
}

/**
 * The RemoteWindow interface contains all functions to interact with
 * the visual window of VS Code.
 */
export interface RemoteWindow {
	/**
	 * Show an error message.
	 *
	 * @param message The message to show.
	 */
	showErrorMessage(message: string): void;
	showErrorMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Thenable<T>;

	/**
	 * Show a warning message.
	 *
	 * @param message The message to show.
	 */
	showWarningMessage(message: string): void;
	showWarningMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Thenable<T>;

	/**
	 * Show an information message.
	 *
	 * @param message The message to show.
	 */
	showInformationMessage(message: string): void;
	showInformationMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Thenable<T>;
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
	add<RO>(type: NotificationType0<RO>, registerParams: RO): void;
	add<P, RO>(type: NotificationType<P, RO>, registerParams: RO): void;
	/**
	 * Adds a single registration.
	 * @param type the request type to register for.
	 * @param registerParams special registration parameters.
	 */
	add<R, E, RO>(type: RequestType0<R, E, RO>, registerParams: RO): void;
	add<P, R, E, RO>(type: RequestType<P, R, E, RO>, registerParams: RO): void;
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

	public add<RO>(type: string | RPCMessageType, registerOptions?: RO): void {
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
	disposeSingle(arg: string | RPCMessageType): boolean;
}

export namespace BulkUnregistration {
	export function create(): BulkUnregistration {
		return new BulkUnregistrationImpl(undefined, undefined, []);
	}
}

class BulkUnregistrationImpl implements BulkUnregistration {

	private _unregistrations: Map<string, Unregistration> = new Map<string, Unregistration>();

	constructor(private _connection: MessageConnection | undefined, private _console: RemoteConsole | undefined, unregistrations: Unregistration[]) {
		unregistrations.forEach(unregistration => {
			this._unregistrations.set(unregistration.method, unregistration);
		});
	}

	public get isAttached(): boolean {
		return !!this._connection && !!this._console;
	}

	public attach(connection: MessageConnection, _console: RemoteConsole): void {
		this._connection = connection;
		this._console = _console;
	}

	public add(unregistration: Unregistration): void {
		this._unregistrations.set(unregistration.method, unregistration);
	}

	public dispose(): any {
		let unregistrations: Unregistration[] = [];
		for (let unregistration of this._unregistrations.values()) {
			unregistrations.push(unregistration);
		}
		let params: UnregistrationParams = {
			unregisterations: unregistrations
		};
		this._connection!.sendRequest(UnregistrationRequest.type, params).then(undefined, (_error) => {
			this._console!.info(`Bulk unregistration failed.`);
		});
	}

	public disposeSingle(arg: string | RPCMessageType): boolean {
		const method = Is.string(arg) ? arg : arg.method;

		const unregistration = this._unregistrations.get(method);
		if (!unregistration) {
			return false;
		}

		let params: UnregistrationParams = {
			unregisterations: [unregistration]
		}
		this._connection!.sendRequest(UnregistrationRequest.type, params).then(() => {
			this._unregistrations.delete(method);
		}, (_error) => {
			this._console!.info(`Unregistering request handler for ${unregistration.id} failed.`);
		});
		return true;
	}
}

/**
 * Interface to register and unregister `listeners` on the client / tools side.
 */
export interface RemoteClient {
	/**
	 * Registers a listener for the given notification.
	 * @param type the notification type to register for.
	 * @param registerParams special registration parameters.
	 * @return a `Disposable` to unregister the listener again.
	 */
	register<RO>(type: NotificationType0<RO>, registerParams?: RO): Thenable<Disposable>;
	register<P, RO>(type: NotificationType<P, RO>, registerParams?: RO): Thenable<Disposable>;

	/**
	 * Registers a listener for the given notification.
	 * @param unregisteration the unregistration to add a corresponding unregister action to.
	 * @param type the notification type to register for.
	 * @param registerParams special registration parameters.
	 * @return the updated unregistration.
	 */
	register<RO>(unregisteration: BulkUnregistration, type: NotificationType0<RO>, registerParams?: RO): Thenable<BulkUnregistration>;
	register<P, RO>(unregisteration: BulkUnregistration, type: NotificationType<P, RO>, registerParams?: RO): Thenable<BulkUnregistration>;

	/**
	 * Registers a listener for the given request.
	 * @param type the request type to register for.
	 * @param registerParams special registration parameters.
	 * @return a `Disposable` to unregister the listener again.
	 */
	register<R, E, RO>(type: RequestType0<R, E, RO>, registerParams?: RO): Thenable<Disposable>;
	register<P, R, E, RO>(type: RequestType<P, R, E, RO>, registerParams?: RO): Thenable<Disposable>;

	/**
	 * Registers a listener for the given request.
	 * @param unregisteration the unregistration to add a corresponding unregister action to.
	 * @param type the request type to register for.
	 * @param registerParams special registration parameters.
	 * @return the updated unregistration.
	 */
	register<R, E, RO>(unregisteration: BulkUnregistration, type: RequestType0<R, E, RO>, registerParams?: RO): Thenable<BulkUnregistration>;
	register<P, R, E, RO>(unregisteration: BulkUnregistration, type: RequestType<P, R, E, RO>, registerParams?: RO): Thenable<BulkUnregistration>;
	/**
	 * Registers a set of listeners.
	 * @param registrations the bulk registration
	 * @return a `Disposable` to unregister the listeners again.
	 */
	register(registrations: BulkRegistration): Thenable<BulkUnregistration>;
}

class ConnectionLogger implements Logger, RemoteConsole {
	private _connection: MessageConnection;
	public constructor() {
	}
	public attach(connection: MessageConnection) {
		this._connection = connection;
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
	private send(type: MessageType, message: string) {
		if (this._connection) {
			this._connection.sendNotification(LogMessageNotification.type, { type, message });
		}
	}
}

class RemoteWindowImpl implements RemoteWindow {

	constructor(private _connection: MessageConnection) {
	}

	public showErrorMessage(message: string, ...actions: MessageActionItem[]): Thenable<MessageActionItem> {
		let params: ShowMessageRequestParams = { type: MessageType.Error, message, actions };
		return this._connection.sendRequest(ShowMessageRequest.type, params);
	}

	public showWarningMessage(message: string, ...actions: MessageActionItem[]): Thenable<MessageActionItem> {
		let params: ShowMessageRequestParams = { type: MessageType.Warning, message, actions };
		return this._connection.sendRequest(ShowMessageRequest.type, params);
	}

	public showInformationMessage(message: string, ...actions: MessageActionItem[]): Thenable<MessageActionItem> {
		let params: ShowMessageRequestParams = { type: MessageType.Info, message, actions };
		return this._connection.sendRequest(ShowMessageRequest.type, params);
	}
}

class RemoteClientImpl implements RemoteClient {
	constructor(private _connection: MessageConnection, private _console: RemoteConsole) {
	}

	public register(typeOrRegistrations: string | RPCMessageType | BulkRegistration | BulkUnregistration, registerOptionsOrType?: string | RPCMessageType | any, registerOptions?: any): Thenable<any>  /* Thenable<Disposable | BulkUnregistration> */ {
		if (typeOrRegistrations instanceof BulkRegistrationImpl) {
			return this.registerMany(typeOrRegistrations);
		} else if (typeOrRegistrations instanceof BulkUnregistrationImpl) {
			return this.registerSingle1(<BulkUnregistrationImpl>typeOrRegistrations, <string | RPCMessageType>registerOptionsOrType, registerOptions);
		} else {
			return this.registerSingle2(<string | RPCMessageType>typeOrRegistrations, registerOptionsOrType);
		}
	}

	private registerSingle1(unregistration: BulkUnregistrationImpl, type: string | RPCMessageType, registerOptions: any): Thenable<Disposable> {
		const method = Is.string(type) ? type : type.method;
		const id = UUID.generateUuid();
		let params: RegistrationParams = {
			registrations: [{ id, method, registerOptions: registerOptions || {} }]
		}
		if (!unregistration.isAttached) {
			unregistration.attach(this._connection, this._console);
		}
		return this._connection.sendRequest(RegistrationRequest.type, params).then((_result) => {
			unregistration.add({ id: id, method: method });
			return unregistration;
		}, (_error) => {
			this._console.info(`Registering request handler for ${method} failed.`);
			return Promise.reject(_error);
		});
	}

	private registerSingle2(type: string | RPCMessageType, registerOptions: any): Thenable<Disposable> {
		const method = Is.string(type) ? type : type.method;
		const id = UUID.generateUuid();
		let params: RegistrationParams = {
			registrations: [{ id, method, registerOptions: registerOptions || {} }]
		}
		return this._connection.sendRequest(RegistrationRequest.type, params).then((_result) => {
			return Disposable.create(() => {
				this.unregisterSingle(id, method);
			});
		}, (_error) => {
			this._console.info(`Registering request handler for ${method} failed.`);
			return Promise.reject(_error);
		});
	}

	private unregisterSingle(id: string, method: string): Thenable<void> {
		let params: UnregistrationParams = {
			unregisterations: [{ id, method }]
		};

		return this._connection.sendRequest(UnregistrationRequest.type, params).then(undefined, (_error) => {
			this._console.info(`Unregistering request handler for ${id} failed.`);
		});
	}

	private registerMany(registrations: BulkRegistrationImpl): Thenable<BulkUnregistration> {
		let params = registrations.asRegistrationParams();
		return this._connection.sendRequest(RegistrationRequest.type, params).then(() => {
			return new BulkUnregistrationImpl(this._connection, this._console, params.registrations.map(registration => { return { id: registration.id, method: registration.method } }));
		}, (_error) => {
			this._console.info(`Bulk registeration failed.`);
			return Promise.reject(_error);
		});
	}
}

/**
 * Represents the workspace managed by the client.
 */
export interface RemoteWorkspace extends Remote {
	/**
	 * Applies a `WorkspaceEdit` to the workspace
	 * @param edit the workspace edit.
	 * @return a thenable that resolves to the `ApplyWorkspaceEditResponse`.
	 */
	applyEdit(edit: WorkspaceEdit): Thenable<ApplyWorkspaceEditResponse>;
}

class RemoteWorkspaceImpl implements RemoteWorkspace {

	constructor(private _connection: MessageConnection) {
	}

	public get connection(): MessageConnection {
		return this._connection;
	}

	public applyEdit(edit: WorkspaceEdit): Thenable<ApplyWorkspaceEditResponse> {
		let params: ApplyWorkspaceEditParams = {
			edit
		};
		return this._connection.sendRequest(ApplyWorkspaceEditRequest.type, params);
	}
}

/**
 * Interface to log telemetry events. The events are actually send to the client
 * and the client needs to feed the event into a propert telemetry system.
 */
export interface Telemetry {
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
export interface Tracer {
	/**
	 * Log the given data to the trace Log
	 */
	log(message: string, verbose?: string): void;
}

class TracerImpl implements Tracer {

	private _trace: Trace;

	constructor(private _connection: MessageConnection) {
		this._trace = Trace.Off;
	}

	public set trace(value: Trace) {
		this._trace = value;
	}

	public log(message: string, verbose?: string): void {
		if (this._trace === Trace.Off) {
			return;
		}
		this._connection.sendNotification(LogTraceNotification.type, {
			message: message,
			verbose: this._trace === Trace.Verbose ? verbose : undefined
		});
	}
}

class TelemetryImpl implements Telemetry {

	constructor(private _connection: MessageConnection) {
	}

	public logEvent(data: any): void {
		this._connection.sendNotification(TelemetryEventNotification.type, data);
	}
}

/**
 * Interface to describe the shape of the server connection.
 */
export interface IConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _> {

	/**
	 * Start listening on the input stream for messages to process.
	 */
	listen(): void;

	/**
	 * Installs a request handler described by the given [RequestType](#RequestType).
	 *
	 * @param type The [RequestType](#RequestType) describing the request.
	 * @param handler The handler to install
	 */
	onRequest<R, E, RO>(type: RequestType0<R, E, RO>, handler: RequestHandler0<R, E>): void;
	onRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, handler: RequestHandler<P, R, E>): void;

	/**
	 * Installs a request handler for the given method.
	 *
	 * @param method The method to register a request handler for.
	 * @param handler The handler to install.
	 */
	onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): void;

	/**
	 * Installs a request handler that is invoked if no specific request handler can be found.
	 *
	 * @param handler a handler that handles all requests.
	 */
	onRequest(handler: StarRequestHandler): void;

	/**
	 * Send a request to the client.
	 *
	 * @param type The [RequestType](#RequestType) describing the request.
	 * @param params The request's parameters.
	 */
	sendRequest<R, E, RO>(type: RequestType0<R, E, RO>, token?: CancellationToken): Thenable<R>;
	sendRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, params: P, token?: CancellationToken): Thenable<R>;

	/**
	 * Send a request to the client.
	 *
	 * @param method The method to invoke on the client.
	 * @param params The request's parameters.
	 */
	sendRequest<R>(method: string, ...params: any[]): Thenable<R>;

	/**
	 * Installs a notification handler described by the given [NotificationType](#NotificationType).
	 *
	 * @param type The [NotificationType](#NotificationType) describing the notification.
	 * @param handler The handler to install.
	 */
	onNotification<RO>(type: NotificationType0<RO>, handler: NotificationHandler0): void;
	onNotification<P, RO>(type: NotificationType<P, RO>, handler: NotificationHandler<P>): void;

	/**
	 * Installs a notification handler for the given method.
	 *
	 * @param method The method to register a request handler for.
	 * @param handler The handler to install.
	 */
	onNotification(method: string, handler: GenericNotificationHandler): void;

	/**
	 * Installs a notification handler that is invoked if no specific notification handler can be found.
	 *
	 * @param handler a handler that handles all notifications.
	 */
	onNotification(handler: StarNotificationHandler): void;

	/**
	 * Send a notification to the client.
	 *
	 * @param type The [NotificationType](#NotificationType) describing the notification.
	 * @param params The notification's parameters.
	 */
	sendNotification<RO>(type: NotificationType0<RO>): void;
	sendNotification<P, RO>(type: NotificationType<P, RO>, params?: P): void;

	/**
	 * Send a notification to the client.
	 *
	 * @param method The method to invoke on the client.
	 * @param params The notification's parameters.
	 */
	sendNotification(method: string, ...args: any[]): void;

	/**
	 * Installs a handler for the intialize request.
	 *
	 * @param handler The initialize handler.
	 */
	onInitialize(handler: RequestHandler<InitializeParams, InitializeResult, InitializeError>): void;

	/**
	 * Installs a handler for the intialized notification.
	 *
	 * @param handler The initialized handler.
	 */
	onInitialized(handler: NotificationHandler<InitializedParams>): void;

	/**
	 * Installs a handler for the shutdown request.
	 *
	 * @param handler The initialize handler.
	 */
	onShutdown(handler: RequestHandler0<void, void>): void;

	/**
	 * Installs a handler for the exit notification.
	 *
	 * @param handler The exit handler.
	 */
	onExit(handler: NotificationHandler0): void;

	/**
	 * A proxy for VSCode's development console. See [RemoteConsole](#RemoteConsole)
	 */
	console: RemoteConsole & PConsole;

	/**
	 * A proxy to send trace events to the client.
	 */
	tracer: Tracer & PTracer;

	/**
	 * A proxy to send telemetry events to the client.
	 */
	telemetry: Telemetry & PTelemetry;

	/**
	 * A proxy interface for the language client interface to register for requests or
	 * notifications.
	 */
	client: RemoteClient & PClient;

	/**
	 * A proxy for VSCode's window. See [RemoteWindow](#RemoteWindow)
	 */
	window: RemoteWindow & PWindow;

	/**
	 * A proxy to talk to the client's workspace.
	 */
	workspace: RemoteWorkspace & PWorkspace;

	/**
	 * Installs a handler for the `DidChangeConfiguration` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidChangeConfiguration(handler: NotificationHandler<DidChangeConfigurationParams>): void;

	/**
	 * Installs a handler for the `DidChangeWatchedFiles` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidChangeWatchedFiles(handler: NotificationHandler<DidChangeWatchedFilesParams>): void;

	/**
	 * Installs a handler for the `DidOpenTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidOpenTextDocument(handler: NotificationHandler<DidOpenTextDocumentParams>): void;

	/**
	 * Installs a handler for the `DidChangeTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidChangeTextDocument(handler: NotificationHandler<DidChangeTextDocumentParams>): void;

	/**
	 * Installs a handler for the `DidCloseTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidCloseTextDocument(handler: NotificationHandler<DidCloseTextDocumentParams>): void;

	/**
	 * Installs a handler for the `DidSaveTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onWillSaveTextDocument(handler: NotificationHandler<WillSaveTextDocumentParams>): void;

	/**
	 * Installs a handler for the `DidSaveTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onWillSaveTextDocumentWaitUntil(handler: RequestHandler<WillSaveTextDocumentParams, TextEdit[], void>): void;

	/**
	 * Installs a handler for the `DidSaveTextDocument` notification.
	 *
	 * @param handler The corresponding handler.
	 */
	onDidSaveTextDocument(handler: NotificationHandler<DidSaveTextDocumentParams>): void;

	/**
	 * Sends diagnostics computed for a given document to VSCode to render them in the
	 * user interface.
	 *
	 * @param params The diagnostic parameters.
	 */
	sendDiagnostics(params: PublishDiagnosticsParams): void;

	/**
	 * Installs a handler for the `Hover` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onHover(handler: RequestHandler<TextDocumentPositionParams, Hover, void>): void;

	/**
	 * Installs a handler for the `Completion` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCompletion(handler: RequestHandler<TextDocumentPositionParams, CompletionItem[] | CompletionList, void>): void;

	/**
	 * Installs a handler for the `CompletionResolve` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCompletionResolve(handler: RequestHandler<CompletionItem, CompletionItem, void>): void;

	/**
	 * Installs a handler for the `SignatureHelp` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onSignatureHelp(handler: RequestHandler<TextDocumentPositionParams, SignatureHelp, void>): void;

	/**
	 * Installs a handler for the `Definition` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDefinition(handler: RequestHandler<TextDocumentPositionParams, Definition, void>): void;

	/**
	 * Installs a handler for the `References` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onReferences(handler: RequestHandler<ReferenceParams, Location[], void>): void;

	/**
	 * Installs a handler for the `DocumentHighlight` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentHighlight(handler: RequestHandler<TextDocumentPositionParams, DocumentHighlight[], void>): void;

	/**
	 * Installs a handler for the `DocumentSymbol` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentSymbol(handler: RequestHandler<DocumentSymbolParams, SymbolInformation[], void>): void;

	/**
	 * Installs a handler for the `WorkspaceSymbol` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onWorkspaceSymbol(handler: RequestHandler<WorkspaceSymbolParams, SymbolInformation[], void>): void;

	/**
	 * Installs a handler for the `CodeAction` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeAction(handler: RequestHandler<CodeActionParams, Command[], void>): void;

	/**
	 * Compute a list of [lenses](#CodeLens). This call should return as fast as possible and if
	 * computing the commands is expensive implementors should only return code lens objects with the
	 * range set and handle the resolve request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeLens(handler: RequestHandler<CodeLensParams, CodeLens[], void>): void;

	/**
	 * This function will be called for each visible code lens, usually when scrolling and after
	 * the onCodeLens has been called.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeLensResolve(handler: RequestHandler<CodeLens, CodeLens, void>): void;

	/**
	 * Installs a handler for the document formatting request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentFormatting(handler: RequestHandler<DocumentFormattingParams, TextEdit[], void>): void;

	/**
	 * Installs a handler for the document range formatting request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentRangeFormatting(handler: RequestHandler<DocumentRangeFormattingParams, TextEdit[], void>): void;

	/**
	 * Installs a handler for the document on type formatting request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentOnTypeFormatting(handler: RequestHandler<DocumentOnTypeFormattingParams, TextEdit[], void>): void;

	/**
	 * Installs a handler for the rename request.
	 *
	 * @param handler The corresponding handler.
	 */
	onRenameRequest(handler: RequestHandler<RenameParams, WorkspaceEdit, void>): void;

	/**
	 * Installs a handler for the document links request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentLinks(handler: RequestHandler<DocumentLinkParams, DocumentLink[], void>): void;

	/**
	 * Installs a handler for the document links resolve request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentLinkResolve(handler: RequestHandler<DocumentLink, DocumentLink, void>): void;

	/**
	 * Installs a handler for the execute command request.
	 *
	 * @param handler The corresponding handler.
	 */
	onExecuteCommand(handler: RequestHandler<ExecuteCommandParams, any, void>): void;

	/**
	 * Disposes the connection
	 */
	dispose(): void;
}

/**
 * Creates a new connection using a the given streams.
 *
 * @param inputStream The stream to read messages from.
 * @param outputStream The stream to write messages to.
 * @param strategy An optional connection strategy to control additinal settings
 * @return a [connection](#IConnection)
 */
export function createConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, strategy?: ConnectionStrategy): IConnection;

/**
 * Creates a new connection.
 *
 * @param reader The message reader to read messages from.
 * @param writer The message writer to write message to.
 * @param strategy An optional connection strategy to control additinal settings
 */
export function createConnection(reader: MessageReader, writer: MessageWriter, strategy?: ConnectionStrategy): IConnection;
/**
 * Creates a new connection based on the processes command line arguments:
 * --ipc : connection using the node process ipc
 *
 * @param strategy An optional connection strategy to control additinal settings
 */
export function createConnection(strategy?: ConnectionStrategy): IConnection;
export function createConnection(arg1?: NodeJS.ReadableStream | MessageReader | ConnectionStrategy, arg2?: NodeJS.WritableStream | MessageWriter, arg3?: ConnectionStrategy): IConnection {
	let input: NodeJS.ReadableStream | MessageReader | undefined;
	let output: NodeJS.WritableStream | MessageWriter | undefined;
	let strategy: ConnectionStrategy | undefined;
	if (ConnectionStrategy.is(arg1)) {
		strategy = arg1;
	} else {
		input = arg1;
		output = arg2;
		strategy = arg3;
	}
	return _createConnection(input, output, strategy, undefined);
}

export interface RemoteFactory<B, P> {
	(Base: new(connection: MessageConnection) => B): new(connection: MessageConnection) => B & P;
}

export interface RemoteConsoleFactory<P> {
	(Base: new() => RemoteConsole): new() => RemoteConsole & P;
}
export interface RemoteClientFactory<P> {
	(Base: new(connection: MessageConnection, console: RemoteConsole) => RemoteClient): new(connection: MessageConnection, console: RemoteConsole) => RemoteClient & P;
}
export type RemoteWindowFactory<P> = RemoteFactory<RemoteWindow, P>;
export type RemoteTelemetryFactory<P> = RemoteFactory<Telemetry, P>;
export type RemoteTracerFactory<P> = RemoteFactory<Tracer, P>;
export type RemoteWorkspaceFactory<P> = RemoteFactory<RemoteWorkspace, P>;

export interface RemoteFactories<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _> {
	console?: RemoteConsoleFactory<PConsole>;
	tracer?: RemoteTracerFactory<PTracer>;
	telemetry?: RemoteTelemetryFactory<PTelemetry>;
	client?: RemoteClientFactory<PClient>;
	window?: RemoteWindowFactory<PWindow>;
	workspace?: RemoteWorkspaceFactory<PWorkspace>;
}


/**
 * Creates a new connection using a the given streams. The new connection surfaces proposed API
 *
 * @param factories: the factories to use to implement the proposed API
 * @param inputStream The stream to read messages from.
 * @param outputStream The stream to write messages to.
 * @param strategy An optional connection strategy to control additinal settings
 * @return a [connection](#IConnection)
 */
export function createProposedConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _>(
	factories: RemoteFactories<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>,
	inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, strategy?: ConnectionStrategy
): IConnection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>;

/**
 * Creates a new connection.
 *
 * @param factories: the factories to use to implement the proposed API
 * @param reader The message reader to read messages from.
 * @param writer The message writer to write message to.
 * @param strategy An optional connection strategy to control additinal settings
 */
export function createProposedConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _>(
	factories: RemoteFactories<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>,
	reader: MessageReader, writer: MessageWriter, strategy?: ConnectionStrategy
): IConnection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>;

/**
 * Creates a new connection based on the processes command line arguments:
 * --ipc : connection using the node process ipc
 *
 * @param factories: the factories to use to implement the proposed API
 * @param strategy An optional connection strategy to control additinal settings
 */
export function createProposedConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _>(
	factories: RemoteFactories<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>,
	strategy?: ConnectionStrategy
): IConnection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>;

export function createProposedConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _>(
	factories: RemoteFactories<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>,
	arg1?: NodeJS.ReadableStream | MessageReader | ConnectionStrategy,
	arg2?: NodeJS.WritableStream | MessageWriter,
	arg3?: ConnectionStrategy
): IConnection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace> {
	let input: NodeJS.ReadableStream | MessageReader | undefined;
	let output: NodeJS.WritableStream | MessageWriter | undefined;
	let strategy: ConnectionStrategy | undefined;
	if (ConnectionStrategy.is(arg1)) {
		strategy = arg1;
	} else {
		input = arg1;
		output = arg2;
		strategy = arg3;
	}
	return _createConnection(input, output, strategy, factories);
}

function _createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _>(
	input?: NodeJS.ReadableStream | MessageReader, output?: NodeJS.WritableStream | MessageWriter, strategy?: ConnectionStrategy,
	factories?: RemoteFactories<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>
): IConnection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace> {
	if (!input && !output && process.argv.length > 2) {
		let port: number | undefined = void 0;
		let pipeName: string | undefined = void 0;
		let argv = process.argv.slice(2);
		for (let i = 0; i < argv.length; i++) {
			let arg = argv[i];
			if (arg === '--node-ipc') {
				input = new IPCMessageReader(process);
				output = new IPCMessageWriter(process);
				break;
			} else if (arg === '--stdio') {
				input = process.stdin;
				output = process.stdout;
				break;
			} else if (arg === '--socket') {
				port = parseInt(argv[i + 1]);
				break;
			} else if (arg === '--pipe') {
				pipeName = argv[i + 1];
				break;
			}
			else {
				var args = arg.split('=');
				if (args[0] === '--socket') {
					port = parseInt(args[1]);
					break;
				} else if (args[0] === '--pipe') {
					pipeName = args[1];
					break;
				}
			}
		}
		if (port) {
			output = new stream.PassThrough();
			input = new stream.PassThrough();
			let server = net.createServer(socket => {
				server.close();
				socket.pipe(output as stream.PassThrough);
				(input as stream.PassThrough).pipe(socket);
			}).listen(port);
		} else if (pipeName) {
			let protocol = createServerPipeTransport(pipeName);
			input = protocol[0];
			output = protocol[1];
		}
	}
	var commandLineMessage = "Use arguments of createConnection or set command line parameters: '--node-ipc', '--stdio' or '--socket={number}'";
	if (!input) {
		throw new Error("Connection input stream is not set. " + commandLineMessage);
	}
	if (!output) {
		throw new Error("Connection output stream is not set. " + commandLineMessage);
	}

	let shutdownReceived: boolean;
	// Backwards compatibility
	if (Is.func((input as NodeJS.ReadableStream).read) && Is.func((input as NodeJS.ReadableStream).on)) {
		let inputStream = <NodeJS.ReadableStream>input;
		inputStream.on('end', () => {
			process.exit(shutdownReceived ? 0 : 1);
		});
		inputStream.on('close', () => {
			process.exit(shutdownReceived ? 0 : 1);
		});
	}

	const logger = (factories && factories.console ? new (factories.console(ConnectionLogger))() : new ConnectionLogger()) as ConnectionLogger & PConsole;
	const connection = createMessageConnection(input as any, output as any, logger, strategy);
	logger.attach(connection);
	const tracer = (factories && factories.tracer ? new (factories.tracer(TracerImpl))(connection) : new TracerImpl(connection)) as TracerImpl & PTracer;
	const telemetry = (factories && factories.telemetry ? new (factories.telemetry(TelemetryImpl))(connection) : new TelemetryImpl(connection)) as TelemetryImpl & PTelemetry;
	const client = (factories && factories.client ? new (factories.client(RemoteClientImpl))(connection, logger) :  new RemoteClientImpl(connection, logger)) as RemoteClientImpl & PClient;
	const remoteWindow = (factories && factories.window ? new (factories.window(RemoteWindowImpl))(connection) : new RemoteWindowImpl(connection)) as RemoteWindowImpl & PWindow;
	const workspace = (factories && factories.workspace ? new (factories.workspace(RemoteWorkspaceImpl))(connection) : new RemoteWorkspaceImpl(connection)) as RemoteWorkspaceImpl & PWorkspace;

	function asThenable<T>(value: Thenable<T>): Thenable<T>;
	function asThenable<T>(value: T): Thenable<T>;
	function asThenable<T>(value: T | Thenable<T>): Thenable<T> {
		if (Is.thenable(value)) {
			return value;
		} else {
			return Promise.resolve<T>(<T>value);
		}
	}

	let shutdownHandler: RequestHandler0<void, void> | undefined = undefined;
	let initializeHandler: RequestHandler<InitializeParams, InitializeResult, InitializeError> | undefined = undefined;
	let exitHandler: NotificationHandler0 | undefined = undefined;
	let protocolConnection: IConnection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace> & ConnectionState = {
		listen: (): void => connection.listen(),

		sendRequest: <R>(type: string | RPCMessageType, ...params: any[]): Thenable<R> => connection.sendRequest(Is.string(type) ? type : type.method, ...params),
		onRequest: <R, E>(type: string | RPCMessageType | StarRequestHandler, handler?: GenericRequestHandler<R, E>): void => (connection as any).onRequest(type, handler),

		sendNotification: (type: string | RPCMessageType, ...params: any[]): void => connection.sendNotification(Is.string(type) ? type : type.method, ...params),
		onNotification: (type: string | RPCMessageType | StarNotificationHandler, handler?: GenericNotificationHandler): void => (connection as any).onNotification(type, handler),

		onInitialize: (handler) => initializeHandler = handler,
		onInitialized: (handler) => connection.onNotification(InitializedNotification.type, handler),
		onShutdown: (handler) => shutdownHandler = handler,
		onExit: (handler) => exitHandler = handler,

		get console() { return logger; },
		get window() { return remoteWindow; },
		get telemetry() { return telemetry; },
		get tracer() { return tracer; },
		get client() { return client; },
		get workspace() { return workspace; },

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

		onHover: (handler) => connection.onRequest(HoverRequest.type, handler),
		onCompletion: (handler) => connection.onRequest(CompletionRequest.type, handler),
		onCompletionResolve: (handler) => connection.onRequest(CompletionResolveRequest.type, handler),
		onSignatureHelp: (handler) => connection.onRequest(SignatureHelpRequest.type, handler),
		onDefinition: (handler) => connection.onRequest(DefinitionRequest.type, handler),
		onReferences: (handler) => connection.onRequest(ReferencesRequest.type, handler),
		onDocumentHighlight: (handler) => connection.onRequest(DocumentHighlightRequest.type, handler),
		onDocumentSymbol: (handler) => connection.onRequest(DocumentSymbolRequest.type, handler),
		onWorkspaceSymbol: (handler) => connection.onRequest(WorkspaceSymbolRequest.type, handler),
		onCodeAction: (handler) => connection.onRequest(CodeActionRequest.type, handler),
		onCodeLens: (handler) => connection.onRequest(CodeLensRequest.type, handler),
		onCodeLensResolve: (handler) => connection.onRequest(CodeLensResolveRequest.type, handler),
		onDocumentFormatting: (handler) => connection.onRequest(DocumentFormattingRequest.type, handler),
		onDocumentRangeFormatting: (handler) => connection.onRequest(DocumentRangeFormattingRequest.type, handler),
		onDocumentOnTypeFormatting: (handler) => connection.onRequest(DocumentOnTypeFormattingRequest.type, handler),
		onRenameRequest: (handler) => connection.onRequest(RenameRequest.type, handler),
		onDocumentLinks: (handler) => connection.onRequest(DocumentLinkRequest.type, handler),
		onDocumentLinkResolve: (handler) => connection.onRequest(DocumentLinkResolveRequest.type, handler),
		onExecuteCommand: (handler) => connection.onRequest(ExecuteCommandRequest.type, handler),

		dispose: () => connection.dispose()
	};

	connection.onRequest(InitializeRequest.type, (params) => {
		if (Is.number(params.processId)) {
			// We received a parent process id. Set up a timer to periodically check
			// if the parent is still alive.
			setInterval(() => {
				try {
					process.kill(params.processId, <any>0);
				} catch (ex) {
					// Parent process doesn't exist anymore. Exit the server.
					process.exit(shutdownReceived ? 0 : 1);
				}
			}, 3000);
		}
		if (Is.string(params.trace)) {
			tracer.trace = Trace.fromString(params.trace);
		}
		if (initializeHandler) {
			let result = initializeHandler(params, new CancellationTokenSource().token);
			return asThenable(result).then((value) => {
				if (value instanceof ResponseError) {
					return value;
				}
				let result = <InitializeResult>value;
				if (!result) {
					result = { capabilities: {} };
				}
				let capabilities = result.capabilities;
				if (!capabilities) {
					capabilities = {}
					result.capabilities = capabilities;
				}
				if (!capabilities.textDocumentSync) {
					capabilities.textDocumentSync = Is.number(protocolConnection.__textDocumentSync) ? protocolConnection.__textDocumentSync : TextDocumentSyncKind.None;
				} else if (!Is.number(capabilities.textDocumentSync) && !Is.number(capabilities.textDocumentSync.change)) {
					capabilities.textDocumentSync.change = Is.number(protocolConnection.__textDocumentSync) ? protocolConnection.__textDocumentSync : TextDocumentSyncKind.None;
				}
				return result;
			});
		} else {
			let result: InitializeResult = { capabilities: { textDocumentSync: TextDocumentSyncKind.None } };
			return result;
		}
	});

	connection.onRequest<void, void, void>(ShutdownRequest.type, () => {
		shutdownReceived = true;
		if (shutdownHandler) {
			return shutdownHandler(new CancellationTokenSource().token);
		} else {
			return undefined;
		}
	});

	connection.onNotification(ExitNotification.type, () => {
		try {
			if (exitHandler) {
				exitHandler();
			}
		} finally {
			if (shutdownReceived) {
				process.exit(0);
			} else {
				process.exit(1);
			}
		}
	});

	connection.onNotification(SetTraceNotification.type, (params) => {
		tracer.trace = Trace.fromString(params.value);
	});

	return protocolConnection;
}

// Export the protocol currently in proposed state.

import { factories, RemoteWorkspaceProposed } from './proposed';
export interface ProposedProtocol {
	factories: RemoteFactories<_, _, _, _, _, RemoteWorkspaceProposed>
}
export const ProposedProtocol = {
	factories
}