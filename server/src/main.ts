/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="./thenable.ts" />
'use strict';

import {
	TextDocument, TextDocumentChangeEvent, TextDocumentContentChangeEvent, TextDocumentWillSaveEvent,
	Location, Command, TextEdit, WorkspaceEdit, CompletionItem, CompletionList, Hover,
	SignatureHelp, Definition, DocumentHighlight, SymbolInformation, DocumentSymbol, WorkspaceSymbolParams, DocumentSymbolParams,
	CodeLens, DocumentLink, Range,
	RequestType, RequestType0, RequestHandler, RequestHandler0, GenericRequestHandler, StarRequestHandler,
	NotificationType, NotificationType0, NotificationHandler, NotificationHandler0, GenericNotificationHandler, StarNotificationHandler,
	RPCMessageType, ResponseError,
	Logger, MessageReader, IPCMessageReader,
	MessageWriter, IPCMessageWriter, createServerPipeTransport, createServerSocketTransport,
	CancellationToken, CancellationTokenSource,
	Disposable, Event, Emitter, Trace, SetTraceNotification, LogTraceNotification,
	ConnectionStrategy,
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
	TextDocumentPositionParams, CompletionParams, TextDocumentSyncKind,
	HoverRequest,
	CompletionRequest, CompletionResolveRequest,
	SignatureHelpRequest,
	DefinitionRequest, ReferencesRequest, ReferenceParams,
	DocumentHighlightRequest,
	DocumentSymbolRequest, WorkspaceSymbolRequest,
	CodeActionRequest, CodeActionParams, CodeLensRequest, CodeLensParams, CodeLensResolveRequest,
	DocumentFormattingRequest, DocumentFormattingParams, DocumentRangeFormattingRequest, DocumentRangeFormattingParams,
	DocumentOnTypeFormattingRequest, DocumentOnTypeFormattingParams,
	RenameRequest, RenameParams, PrepareRenameRequest,
	DocumentLinkRequest, DocumentLinkResolveRequest, DocumentLinkParams,
	ExecuteCommandRequest, ExecuteCommandParams,
	ApplyWorkspaceEditRequest, ApplyWorkspaceEditParams, ApplyWorkspaceEditResponse,
	ClientCapabilities, ServerCapabilities, ProtocolConnection, createProtocolConnection, TypeDefinitionRequest, ImplementationRequest,
	DocumentColorRequest, DocumentColorParams, ColorInformation, ColorPresentationParams, ColorPresentation, ColorPresentationRequest,
	CodeAction, FoldingRangeParams, FoldingRange, FoldingRangeRequest
} from 'vscode-languageserver-protocol';

import { Configuration, ConfigurationFeature } from './configuration';
import { WorkspaceFolders, WorkspaceFoldersFeature } from './workspaceFolders';

import * as Is from './utils/is';
import * as UUID from './utils/uuid';

// ------------- Reexport the API surface of the language worker API ----------------------
export * from 'vscode-languageserver-protocol';
export { Event }

import * as fm from './files';

export namespace Files {
	export let uriToFilePath = fm.uriToFilePath;
	export let resolveGlobalNodePath = fm.resolveGlobalNodePath;
	export let resolveGlobalYarnPath = fm.resolveGlobalYarnPath;
	export let resolve = fm.resolve;
	export let resolveModule = fm.resolveModule;
	export let resolveModule2 = fm.resolveModule2;
	export let resolveModulePath = fm.resolveModulePath;
}

let shutdownReceived: boolean = false;
let exitTimer: NodeJS.Timer | undefined = undefined;

function setupExitTimer(): void {
	const argName = '--clientProcessId';
	function runTimer(value: string): void {
		try {
			let processId = parseInt(value);
			if (!isNaN(processId)) {
				exitTimer = setInterval(() => {
					try {
						process.kill(processId, <any>0);
					} catch (ex) {
						// Parent process doesn't exist anymore. Exit the server.
						process.exit(shutdownReceived ? 0 : 1);
					}
				}, 3000);
			}
		} catch (e) {
			// Ignore errors;
		}
	}

	for (let i = 2; i < process.argv.length; i++) {
		let arg = process.argv[i];
		if (arg === argName && i + 1 < process.argv.length) {
			runTimer(process.argv[i + 1]);
			return;
		} else {
			let args = arg.split('=');
			if (args[0] === argName) {
				runTimer(args[1]);
			}
		}
	}
}
setupExitTimer();

function null2Undefined<T>(value: T | null): T | undefined {
	if (value === null) {
		return void 0;
	}
	return value;
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
	public get(uri: string): TextDocument | undefined {
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
					if (td.version === null || td.version === void 0) {
						throw new Error(`Recevied document change event for ${td.uri} without valid version identifier`);
					}
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

/**
 *
 */
export interface Remote {
	/**
	 * Attach the remote to the given connection.
	 *
	 * @param connection The connection this remote is operating on.
	 */
	attach(connection: IConnection): void;

	/**
	 * The connection this remote is attached to.
	 */
	connection: IConnection;

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

/**
 * The RemoteConsole interface contains all functions to interact with
 * the tools / clients console or log system. Interally it used `window/logMessage`
 * notifications.
 */
export interface RemoteConsole extends Remote {
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
export interface RemoteWindow extends Remote {
	/**
	 * Show an error message.
	 *
	 * @param message The message to show.
	 */
	showErrorMessage(message: string): void;
	showErrorMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Thenable<T | undefined>;

	/**
	 * Show a warning message.
	 *
	 * @param message The message to show.
	 */
	showWarningMessage(message: string): void;
	showWarningMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Thenable<T | undefined>;

	/**
	 * Show an information message.
	 *
	 * @param message The message to show.
	 */
	showInformationMessage(message: string): void;
	showInformationMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Thenable<T | undefined>;
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
		return new BulkUnregistrationImpl(undefined, []);
	}
}

class BulkUnregistrationImpl implements BulkUnregistration {

	private _unregistrations: Map<string, Unregistration> = new Map<string, Unregistration>();

	constructor(private _connection: IConnection | undefined, unregistrations: Unregistration[]) {
		unregistrations.forEach(unregistration => {
			this._unregistrations.set(unregistration.method, unregistration);
		});
	}

	public get isAttached(): boolean {
		return !!this._connection;
	}

	public attach(connection: IConnection): void {
		this._connection = connection;
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
			this._connection!.console.info(`Bulk unregistration failed.`);
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
			this._connection!.console.info(`Unregistering request handler for ${unregistration.id} failed.`);
		});
		return true;
	}
}

/**
 * Interface to register and unregister `listeners` on the client / tools side.
 */
export interface RemoteClient extends Remote {
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

	private _rawConnection: ProtocolConnection;
	private _connection: IConnection;

	public constructor() {
	}

	public rawAttach(connection: ProtocolConnection): void {
		this._rawConnection = connection;
	}

	public attach(connection: IConnection) {
		this._connection = connection;
	}

	public get connection(): IConnection {
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

	private send(type: MessageType, message: string) {
		if (this._rawConnection) {
			this._rawConnection.sendNotification(LogMessageNotification.type, { type, message });
		}
	}
}

class RemoteWindowImpl implements RemoteWindow {

	private _connection: IConnection;

	constructor() {
	}

	public attach(connection: IConnection) {
		this._connection = connection;
	}

	public get connection(): IConnection {
		if (!this._connection) {
			throw new Error('Remote is not attached to a connection yet.');
		}
		return this._connection;
	}

	public initialize(_capabilities: ClientCapabilities): void {
	}

	public fillServerCapabilities(_capabilities: ServerCapabilities): void {
	}

	public showErrorMessage(message: string, ...actions: MessageActionItem[]): Thenable<MessageActionItem | undefined> {
		let params: ShowMessageRequestParams = { type: MessageType.Error, message, actions };
		return this._connection.sendRequest(ShowMessageRequest.type, params).then(null2Undefined);
	}

	public showWarningMessage(message: string, ...actions: MessageActionItem[]): Thenable<MessageActionItem | undefined> {
		let params: ShowMessageRequestParams = { type: MessageType.Warning, message, actions };
		return this._connection.sendRequest(ShowMessageRequest.type, params).then(null2Undefined);
	}

	public showInformationMessage(message: string, ...actions: MessageActionItem[]): Thenable<MessageActionItem | undefined> {
		let params: ShowMessageRequestParams = { type: MessageType.Info, message, actions };
		return this._connection.sendRequest(ShowMessageRequest.type, params).then(null2Undefined);
	}
}

class RemoteClientImpl implements RemoteClient {

	private _connection: IConnection;

	public attach(connection: IConnection) {
		this._connection = connection;
	}

	public get connection(): IConnection {
		if (!this._connection) {
			throw new Error('Remote is not attached to a connection yet.');
		}
		return this._connection;
	}

	public initialize(_capabilities: ClientCapabilities): void {
	}

	public fillServerCapabilities(_capabilities: ServerCapabilities): void {
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
			unregistration.attach(this._connection);
		}
		return this._connection.sendRequest(RegistrationRequest.type, params).then((_result) => {
			unregistration.add({ id: id, method: method });
			return unregistration;
		}, (_error) => {
			this.connection.console.info(`Registering request handler for ${method} failed.`);
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
			this.connection.console.info(`Registering request handler for ${method} failed.`);
			return Promise.reject(_error);
		});
	}

	private unregisterSingle(id: string, method: string): Thenable<void> {
		let params: UnregistrationParams = {
			unregisterations: [{ id, method }]
		};

		return this._connection.sendRequest(UnregistrationRequest.type, params).then(undefined, (_error) => {
			this.connection.console.info(`Unregistering request handler for ${id} failed.`);
		});
	}

	private registerMany(registrations: BulkRegistrationImpl): Thenable<BulkUnregistration> {
		let params = registrations.asRegistrationParams();
		return this._connection.sendRequest(RegistrationRequest.type, params).then(() => {
			return new BulkUnregistrationImpl(this._connection, params.registrations.map(registration => { return { id: registration.id, method: registration.method } }));
		}, (_error) => {
			this.connection.console.info(`Bulk registration failed.`);
			return Promise.reject(_error);
		});
	}
}

/**
 * Represents the workspace managed by the client.
 */
export interface _RemoteWorkspace extends Remote {
	/**
	 * Applies a `WorkspaceEdit` to the workspace
	 * @param param the workspace edit params.
	 * @return a thenable that resolves to the `ApplyWorkspaceEditResponse`.
	 */
	applyEdit(paramOrEdit: ApplyWorkspaceEditParams | WorkspaceEdit): Thenable<ApplyWorkspaceEditResponse>;
}

export type RemoteWorkspace = _RemoteWorkspace & Configuration & WorkspaceFolders;

class _RemoteWorkspaceImpl implements _RemoteWorkspace {

	private _connection: IConnection;

	public constructor() {
	}

	public attach(connection: IConnection) {
		this._connection = connection;
	}

	public get connection(): IConnection {
		if (!this._connection) {
			throw new Error('Remote is not attached to a connection yet.');
		}
		return this._connection;
	}

	public initialize(_capabilities: ClientCapabilities): void {
	}

	public fillServerCapabilities(_capabilities: ServerCapabilities): void {
	}

	public applyEdit(paramOrEdit: ApplyWorkspaceEditParams | WorkspaceEdit): Thenable<ApplyWorkspaceEditResponse> {
		function isApplyWorkspaceEditParams(value: ApplyWorkspaceEditParams | WorkspaceEdit): value is ApplyWorkspaceEditParams {
			return value && !!(value as ApplyWorkspaceEditParams).edit;
		}

		let params: ApplyWorkspaceEditParams = isApplyWorkspaceEditParams(paramOrEdit) ? paramOrEdit : { edit: paramOrEdit };
		return this._connection.sendRequest(ApplyWorkspaceEditRequest.type, params);
	}
}

const RemoteWorkspaceImpl: new () => RemoteWorkspace = WorkspaceFoldersFeature(ConfigurationFeature(_RemoteWorkspaceImpl)) as (new () => RemoteWorkspace);

/**
 * Interface to log telemetry events. The events are actually send to the client
 * and the client needs to feed the event into a proper telemetry system.
 */
export interface Telemetry extends Remote {
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
export interface Tracer extends Remote {
	/**
	 * Log the given data to the trace Log
	 */
	log(message: string, verbose?: string): void;
}

class TracerImpl implements Tracer {

	private _trace: Trace;
	private _connection: IConnection;

	constructor() {
		this._trace = Trace.Off;
	}

	public attach(connection: IConnection) {
		this._connection = connection;
	}

	public get connection(): IConnection {
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
		this._connection.sendNotification(LogTraceNotification.type, {
			message: message,
			verbose: this._trace === Trace.Verbose ? verbose : undefined
		});
	}
}

class TelemetryImpl implements Telemetry {

	private _connection: IConnection;

	constructor() {
	}

	public attach(connection: IConnection) {
		this._connection = connection;
	}

	public get connection(): IConnection {
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
		this._connection.sendNotification(TelemetryEventNotification.type, data);
	}
}

/**
 * Interface to describe the shape of the server connection.
 */
export interface Connection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _> {

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
	sendRequest<R>(method: string, token?: CancellationToken): Thenable<R>;
	sendRequest<R>(method: string, params: any, token?: CancellationToken): Thenable<R>;

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
	sendNotification<P, RO>(type: NotificationType<P, RO>, params: P): void;

	/**
	 * Send a notification to the client.
	 *
	 * @param method The method to invoke on the client.
	 * @param params The notification's parameters.
	 */
	sendNotification(method: string, params?: any): void;

	/**
	 * Installs a handler for the initialize request.
	 *
	 * @param handler The initialize handler.
	 */
	onInitialize(handler: RequestHandler<InitializeParams, InitializeResult, InitializeError>): void;

	/**
	 * Installs a handler for the initialized notification.
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
	 * Installs a handler for the `WillSaveTextDocument` notification.
	 *
	 * Note that this notification is opt-in. The client will not send it unless
	 * your server has the `textDocumentSync.willSave` capability or you've
	 * dynamically registered for the `textDocument/willSave` method.
	 *
	 * @param handler The corresponding handler.
	 */
	onWillSaveTextDocument(handler: NotificationHandler<WillSaveTextDocumentParams>): void;

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
	onWillSaveTextDocumentWaitUntil(handler: RequestHandler<WillSaveTextDocumentParams, TextEdit[] | undefined | null, void>): void;

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
	onHover(handler: RequestHandler<TextDocumentPositionParams, Hover | undefined | null, void>): void;

	/**
	 * Installs a handler for the `Completion` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCompletion(handler: RequestHandler<CompletionParams, CompletionItem[] | CompletionList | undefined | null, void>): void;

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
	onSignatureHelp(handler: RequestHandler<TextDocumentPositionParams, SignatureHelp | undefined | null, void>): void;

	/**
	 * Installs a handler for the `Definition` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDefinition(handler: RequestHandler<TextDocumentPositionParams, Definition | undefined | null, void>): void;

	/**
	 * Installs a handler for the `Type Definition` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onTypeDefinition(handler: RequestHandler<TextDocumentPositionParams, Definition | undefined | null, void>): void;

	/**
	 * Installs a handler for the `Implementation` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onImplementation(handler: RequestHandler<TextDocumentPositionParams, Definition | undefined | null, void>): void;

	/**
	 * Installs a handler for the `References` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onReferences(handler: RequestHandler<ReferenceParams, Location[] | undefined | null, void>): void;

	/**
	 * Installs a handler for the `DocumentHighlight` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentHighlight(handler: RequestHandler<TextDocumentPositionParams, DocumentHighlight[] | undefined | null, void>): void;

	/**
	 * Installs a handler for the `DocumentSymbol` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentSymbol(handler: RequestHandler<DocumentSymbolParams, SymbolInformation[] | DocumentSymbol[] | undefined | null, void>): void;

	/**
	 * Installs a handler for the `WorkspaceSymbol` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onWorkspaceSymbol(handler: RequestHandler<WorkspaceSymbolParams, SymbolInformation[] | undefined | null, void>): void;

	/**
	 * Installs a handler for the `CodeAction` request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeAction(handler: RequestHandler<CodeActionParams, (Command | CodeAction)[] | undefined | null, void>): void;

	/**
	 * Compute a list of [lenses](#CodeLens). This call should return as fast as possible and if
	 * computing the commands is expensive implementers should only return code lens objects with the
	 * range set and handle the resolve request.
	 *
	 * @param handler The corresponding handler.
	 */
	onCodeLens(handler: RequestHandler<CodeLensParams, CodeLens[] | undefined | null, void>): void;

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
	onDocumentFormatting(handler: RequestHandler<DocumentFormattingParams, TextEdit[] | undefined | null, void>): void;

	/**
	 * Installs a handler for the document range formatting request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentRangeFormatting(handler: RequestHandler<DocumentRangeFormattingParams, TextEdit[] | undefined | null, void>): void;

	/**
	 * Installs a handler for the document on type formatting request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentOnTypeFormatting(handler: RequestHandler<DocumentOnTypeFormattingParams, TextEdit[] | undefined | null, void>): void;

	/**
	 * Installs a handler for the rename request.
	 *
	 * @param handler The corresponding handler.
	 */
	onRenameRequest(handler: RequestHandler<RenameParams, WorkspaceEdit | undefined | null, void>): void;

	/**
	 * Installs a handler for the prepare rename request.
	 *
	 * @param handler The corresponding handler.
	 */
	onPrepareRename(handler: RequestHandler<TextDocumentPositionParams, Range | { range: Range, placeholder: string } | undefined | null, void>): void;

	/**
	 * Installs a handler for the document links request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentLinks(handler: RequestHandler<DocumentLinkParams, DocumentLink[] | undefined | null, void>): void;

	/**
	 * Installs a handler for the document links resolve request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentLinkResolve(handler: RequestHandler<DocumentLink, DocumentLink | undefined | null, void>): void;

	/**
	 * Installs a handler for the document color request.
	 *
	 * @param handler The corresponding handler.
	 */
	onDocumentColor(handler: RequestHandler<DocumentColorParams, ColorInformation[] | undefined | null, void>): void;

	/**
	 * Installs a handler for the document color request.
	 *
	 * @param handler The corresponding handler.
	 */
	onColorPresentation(handler: RequestHandler<ColorPresentationParams, ColorPresentation[] | undefined | null, void>): void;

	/**
	 * Installs a handler for the folding ranges request.
	 *
	 * @param handler The corresponding handler.
	 */
	onFoldingRanges(handler: RequestHandler<FoldingRangeParams, FoldingRange[] | undefined | null, void>): void;


	/**
	 * Installs a handler for the execute command request.
	 *
	 * @param handler The corresponding handler.
	 */
	onExecuteCommand(handler: RequestHandler<ExecuteCommandParams, any | undefined | null, void>): void;

	/**
	 * Disposes the connection
	 */
	dispose(): void;
}

export interface IConnection extends Connection {
}

export interface Feature<B, P> {
	(Base: new () => B): new () => B & P;
}

export type ConsoleFeature<P> = Feature<RemoteConsole, P>;
export function combineConsoleFeatures<O, T>(one: ConsoleFeature<O>, two: ConsoleFeature<T>): ConsoleFeature<O & T> {
	return function (Base: new () => RemoteConsole): new () => RemoteConsole & O & T {
		return two(one(Base)) as any;
	}
}

export type TelemetryFeature<P> = Feature<Telemetry, P>;
export function combineTelemetryFeatures<O, T>(one: TelemetryFeature<O>, two: TelemetryFeature<T>): TelemetryFeature<O & T> {
	return function (Base: new () => Telemetry): new () => Telemetry & O & T {
		return two(one(Base)) as any;
	}
}

export type TracerFeature<P> = Feature<Tracer, P>;
export function combineTracerFeatures<O, T>(one: TracerFeature<O>, two: TracerFeature<T>): TracerFeature<O & T> {
	return function (Base: new () => Tracer): new () => Tracer & O & T {
		return two(one(Base)) as any;
	}
}

export type ClientFeature<P> = Feature<RemoteClient, P>;
export function combineClientFeatures<O, T>(one: ClientFeature<O>, two: ClientFeature<T>): ClientFeature<O & T> {
	return function (Base: new () => RemoteClient): new () => RemoteClient & O & T {
		return two(one(Base)) as any;
	}
}
export type WindowFeature<P> = Feature<RemoteWindow, P>;
export function combineWindowFeatures<O, T>(one: WindowFeature<O>, two: WindowFeature<T>): WindowFeature<O & T> {
	return function (Base: new () => RemoteWindow): new () => RemoteWindow & O & T {
		return two(one(Base)) as any;
	}
}
export type WorkspaceFeature<P> = Feature<RemoteWorkspace, P>;
export function combineWorkspaceFeatures<O, T>(one: WorkspaceFeature<O>, two: WorkspaceFeature<T>): WorkspaceFeature<O & T> {
	return function (Base: new () => RemoteWorkspace): new () => RemoteWorkspace & O & T {
		return two(one(Base)) as any;
	}
}

export interface Features<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _> {
	__brand: 'features';
	console?: ConsoleFeature<PConsole>;
	tracer?: TracerFeature<PTracer>;
	telemetry?: TelemetryFeature<PTelemetry>;
	client?: ClientFeature<PClient>;
	window?: WindowFeature<PWindow>;
	workspace?: WorkspaceFeature<PWorkspace>;
}
export function combineFeatures<OConsole, OTracer, OTelemetry, OClient, OWindow, OWorkspace, TConsole, TTracer, TTelemetry, TClient, TWindow, TWorkspace>(
	one: Features<OConsole, OTracer, OTelemetry, OClient, OWindow, OWorkspace>,
	two: Features<TConsole, TTracer, TTelemetry, TClient, TWindow, TWorkspace>
): Features<OConsole & TConsole, OTracer & TTracer, OTelemetry & TTelemetry, OClient & TClient, OWindow & TWindow, OWorkspace & TWorkspace> {
	function combine<O, T>(one: O, two: T, func: (one: O, two: T) => any): any {
		if (one && two) {
			return func(one, two);
		} else if (one) {
			return one;
		} else {
			return two;
		}
	}
	let result: Features<OConsole & TConsole, OTracer & TTracer, OTelemetry & TTelemetry, OClient & TClient, OWindow & TWindow, OWorkspace & TWorkspace> = {
		__brand: 'features',
		console: combine(one.console, two.console, combineConsoleFeatures),
		tracer: combine(one.tracer, two.tracer, combineTracerFeatures),
		telemetry: combine(one.telemetry, two.telemetry, combineTelemetryFeatures),
		client: combine(one.client, two.client, combineClientFeatures),
		window: combine(one.window, two.window, combineWindowFeatures),
		workspace: combine(one.workspace, two.workspace, combineWorkspaceFeatures)
	};
	return result;
}

/**
 * Creates a new connection based on the processes command line arguments:
 *
 * @param strategy An optional connection strategy to control additional settings
 */
export function createConnection(strategy?: ConnectionStrategy): IConnection;

/**
 * Creates a new connection using a the given streams.
 *
 * @param inputStream The stream to read messages from.
 * @param outputStream The stream to write messages to.
 * @param strategy An optional connection strategy to control additional settings
 * @return a [connection](#IConnection)
 */
export function createConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, strategy?: ConnectionStrategy): IConnection;

/**
 * Creates a new connection.
 *
 * @param reader The message reader to read messages from.
 * @param writer The message writer to write message to.
 * @param strategy An optional connection strategy to control additional settings
 */
export function createConnection(reader: MessageReader, writer: MessageWriter, strategy?: ConnectionStrategy): IConnection;

/**
 * Creates a new connection based on the processes command line arguments. The new connection surfaces proposed API
 *
 * @param factories: the factories to use to implement the proposed API
 * @param strategy An optional connection strategy to control additional settings
 */
export function createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _>(
	factories: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>,
	strategy?: ConnectionStrategy
): Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>;

/**
 * Creates a new connection using a the given streams.
 *
 * @param inputStream The stream to read messages from.
 * @param outputStream The stream to write messages to.
 * @param strategy An optional connection strategy to control additional settings
 * @return a [connection](#IConnection)
 */
export function createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _>(
	factories: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>,
	inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, strategy?: ConnectionStrategy
): Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>;

/**
 * Creates a new connection.
 *
 * @param reader The message reader to read messages from.
 * @param writer The message writer to write message to.
 * @param strategy An optional connection strategy to control additional settings
 */
export function createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _>(
	factories: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>,
	reader: MessageReader, writer: MessageWriter, strategy?: ConnectionStrategy
): Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>;

export function createConnection(arg1?: any, arg2?: any, arg3?: any, arg4?: any): IConnection {
	let factories: Features | undefined;
	let input: NodeJS.ReadableStream | MessageReader | undefined;
	let output: NodeJS.WritableStream | MessageWriter | undefined;
	let strategy: ConnectionStrategy | undefined;
	if (arg1 !== void 0 && (arg1 as Features).__brand === 'features') {
		factories = arg1;
		arg1 = arg2; arg2 = arg3; arg3 = arg4;
	}
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
	factories?: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace>
): Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace> {
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
			let transport = createServerSocketTransport(port);
			input = transport[0];
			output = transport[1];
		} else if (pipeName) {
			let transport = createServerPipeTransport(pipeName);
			input = transport[0];
			output = transport[1];
		}
	}
	var commandLineMessage = "Use arguments of createConnection or set command line parameters: '--node-ipc', '--stdio' or '--socket={number}'";
	if (!input) {
		throw new Error("Connection input stream is not set. " + commandLineMessage);
	}
	if (!output) {
		throw new Error("Connection output stream is not set. " + commandLineMessage);
	}

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
	const connection = createProtocolConnection(input as any, output as any, logger, strategy);
	logger.rawAttach(connection);
	const tracer = (factories && factories.tracer ? new (factories.tracer(TracerImpl))() : new TracerImpl()) as TracerImpl & PTracer;
	const telemetry = (factories && factories.telemetry ? new (factories.telemetry(TelemetryImpl))() : new TelemetryImpl()) as Telemetry & PTelemetry;
	const client = (factories && factories.client ? new (factories.client(RemoteClientImpl))() : new RemoteClientImpl()) as RemoteClient & PClient;
	const remoteWindow = (factories && factories.window ? new (factories.window(RemoteWindowImpl))() : new RemoteWindowImpl()) as RemoteWindow & PWindow;
	const workspace = (factories && factories.workspace ? new (factories.workspace(RemoteWorkspaceImpl))() : new RemoteWorkspaceImpl()) as RemoteWorkspace & PWorkspace;
	const allRemotes: Remote[] = [logger, tracer, telemetry, client, remoteWindow, workspace];

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
	let protocolConnection: Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace> & ConnectionState = {
		listen: (): void => connection.listen(),

		sendRequest: <R>(type: string | RPCMessageType, ...params: any[]): Thenable<R> => connection.sendRequest(Is.string(type) ? type : type.method, ...params),
		onRequest: <R, E>(type: string | RPCMessageType | StarRequestHandler, handler?: GenericRequestHandler<R, E>): void => (connection as any).onRequest(type, handler),

		sendNotification: (type: string | RPCMessageType, param?: any): void => {
			const method = Is.string(type) ? type : type.method;
			if (arguments.length === 1) {
				connection.sendNotification(method)
			} else {
				connection.sendNotification(method, param);
			}
		},
		onNotification: (type: string | RPCMessageType | StarNotificationHandler, handler?: GenericNotificationHandler): void => (connection as any).onNotification(type, handler),

		onInitialize: (handler) => initializeHandler = handler,
		onInitialized: (handler) => connection.onNotification(InitializedNotification.type, handler),
		onShutdown: (handler) => shutdownHandler = handler,
		onExit: (handler) => exitHandler = handler,

		get console() { return logger; },
		get telemetry() { return telemetry; },
		get tracer() { return tracer; },
		get client() { return client; },
		get window() { return remoteWindow; },
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
		onTypeDefinition: (handler) => connection.onRequest(TypeDefinitionRequest.type, handler),
		onImplementation: (handler) => connection.onRequest(ImplementationRequest.type, handler),
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
		onPrepareRename: (handler) => connection.onRequest(PrepareRenameRequest.type, handler),
		onDocumentLinks: (handler) => connection.onRequest(DocumentLinkRequest.type, handler),
		onDocumentLinkResolve: (handler) => connection.onRequest(DocumentLinkResolveRequest.type, handler),
		onDocumentColor: (handler) => connection.onRequest(DocumentColorRequest.type, handler),
		onColorPresentation: (handler) => connection.onRequest(ColorPresentationRequest.type, handler),
		onFoldingRanges: (handler) => connection.onRequest(FoldingRangeRequest.type, handler),
		onExecuteCommand: (handler) => connection.onRequest(ExecuteCommandRequest.type, handler),

		dispose: () => connection.dispose()
	};
	for (let remote of allRemotes) {
		remote.attach(protocolConnection);
	}

	connection.onRequest(InitializeRequest.type, (params) => {
		if (Is.number(params.processId) && exitTimer === void 0) {
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
		for (let remote of allRemotes) {
			remote.initialize(params.capabilities);
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
				if (capabilities.textDocumentSync === void 0 || capabilities.textDocumentSync === null) {
					capabilities.textDocumentSync = Is.number(protocolConnection.__textDocumentSync) ? protocolConnection.__textDocumentSync : TextDocumentSyncKind.None;
				} else if (!Is.number(capabilities.textDocumentSync) && !Is.number(capabilities.textDocumentSync.change)) {
					capabilities.textDocumentSync.change = Is.number(protocolConnection.__textDocumentSync) ? protocolConnection.__textDocumentSync : TextDocumentSyncKind.None;
				}
				for (let remote of allRemotes) {
					remote.fillServerCapabilities(capabilities);
				}
				return result;
			});
		} else {
			let result: InitializeResult = { capabilities: { textDocumentSync: TextDocumentSyncKind.None } };
			for (let remote of allRemotes) {
				remote.fillServerCapabilities(result.capabilities);
			}
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

export namespace ProposedFeatures {
	export const all: Features<_, _, _, _, _, _> = {
		__brand: 'features',
	}
}
