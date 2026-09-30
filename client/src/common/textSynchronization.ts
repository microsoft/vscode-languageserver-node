/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	workspace as Workspace, languages as Languages, TextDocument, TextLine, TextDocumentChangeEvent, TextDocumentWillSaveEvent, TextEdit as VTextEdit,
	DocumentSelector as VDocumentSelector, Event, EventEmitter, Disposable, Uri as VUri, type EndOfLine, Position as VPosition, Range as VRange
} from 'vscode';

import {
	ClientCapabilities, DidChangeTextDocumentNotification, DidChangeTextDocumentParams, DidCloseTextDocumentNotification, DidCloseTextDocumentParams, DidOpenTextDocumentNotification,
	DidOpenTextDocumentParams, DidSaveTextDocumentNotification, DidSaveTextDocumentParams, DocumentSelector, ProtocolNotificationType, RegistrationType, SaveOptions,
	ServerCapabilities, TextDocumentChangeRegistrationOptions, TextDocumentRegistrationOptions, TextDocumentSaveRegistrationOptions, TextDocumentSyncKind, TextDocumentSyncOptions,
	WillSaveTextDocumentNotification, WillSaveTextDocumentParams, WillSaveTextDocumentWaitUntilRequest
} from 'vscode-languageserver-protocol';

import {
	FeatureClient, TextDocumentEventFeature, DynamicFeature, NextSignature, TextDocumentSendFeature, NotifyingFeature, ensure, RegistrationData, DynamicDocumentFeature,
	NotificationSentEvent, AboutToSendNotificationEvent
} from './features';

import * as UUID from './utils/uuid';
import { TextDocument as TextDocumentImpl } from 'vscode-languageserver-textdocument';

export interface TextDocumentSynchronizationMiddleware {
	didOpen?: NextSignature<TextDocument, Promise<void>>;
	didChange?: NextSignature<TextDocumentChangeEvent, Promise<void>>;
	willSave?: NextSignature<TextDocumentWillSaveEvent, Promise<void>>;
	willSaveWaitUntil?: NextSignature<TextDocumentWillSaveEvent, Thenable<VTextEdit[]>>;
	didSave?: NextSignature<TextDocument, Promise<void>>;
	didClose?: NextSignature<TextDocument, Promise<void>>;
}

export interface DidOpenTextDocumentFeatureShape extends DynamicFeature<TextDocumentRegistrationOptions>, TextDocumentSendFeature<(textDocument: TextDocument) => Promise<void>>, NotifyingFeature<DidOpenTextDocumentParams> {
	openDocuments: Iterable<TextDocument>;
}

export type ResolvedTextDocumentSyncCapabilities = {
	resolvedTextDocumentSync?: TextDocumentSyncOptions;
};

type $ConfigurationOptions = {
	textSynchronization?: {
		delayOpenNotifications?: boolean;
	};
};

type Deferred<T = void> = {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (error: unknown) => void;
};

function createDeferred<T = void>(): Deferred<T> {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((_resolve, _reject) => {
		resolve = _resolve;
		reject = _reject;
	});
	// Failures are reported to the parties that wait for the promise. There might be none.
	promise.catch(() => { /* handled by the waiting parties */ });
	return { promise, resolve, reject };
}

/**
 * A document whose open notification is on its way to the server.
 */
class OpeningDocument {

	private readonly _deferred: Deferred<void>;
	private _state: 'pending' | 'complete' | 'failed';
	private _inMiddleware: boolean;
	private _enteredMiddleware: Deferred<void>;

	constructor() {
		this._deferred = createDeferred();
		this._state = 'pending';
		this._inMiddleware = false;
		this._enteredMiddleware = createDeferred();
	}

	public get promise(): Promise<void> {
		return this._deferred.promise;
	}

	/**
	 * Whether user middleware is running that has not handed the notification on yet.
	 * Callers that are not interested in the document don't wait for user code.
	 */
	public get inMiddleware(): boolean {
		return this._inMiddleware;
	}

	/**
	 * Resolves when user middleware starts to process the notification.
	 */
	public get enteredMiddleware(): Promise<void> {
		return this._enteredMiddleware.promise;
	}

	public enterMiddleware(): void {
		this._inMiddleware = true;
		const entered = this._enteredMiddleware;
		this._enteredMiddleware = createDeferred();
		entered.resolve();
	}

	public leaveMiddleware(): void {
		this._inMiddleware = false;
	}

	public get state(): 'pending' | 'complete' | 'failed' {
		return this._state;
	}

	public complete(): void {
		if (this._state === 'pending') {
			this._state = 'complete';
			this._deferred.resolve();
		}
	}

	public fail(error: unknown): void {
		if (this._state === 'pending') {
			this._state = 'failed';
			this._deferred.reject(error);
		}
	}
}

type ClosingDocument = {
	count: number;
	deferred: Deferred<void>;
};

export interface DocumentClosing {

	/**
	 * Resolves when the open notification that was on its way when the document got
	 * closed has been sent. Rejects if sending it failed.
	 */
	readonly ready: Promise<void>;

	/**
	 * Signals that the close notification has been handled.
	 */
	done(): void;
}

export class DidOpenTextDocumentFeature extends TextDocumentEventFeature<DidOpenTextDocumentParams, TextDocument, TextDocumentSynchronizationMiddleware> implements DidOpenTextDocumentFeatureShape {

	private static readonly noClosing: DocumentClosing = { ready: Promise.resolve(), done: () => { /* nothing to do */ } };

	private readonly _syncedDocuments: Map<string, TextDocument>;
	private readonly _pendingOpenNotifications: Map<string, TextDocument>;
	private readonly _openingDocuments: Map<string, OpeningDocument>;
	private readonly _closingDocuments: Map<string, ClosingDocument>;
	private readonly _openParams: WeakMap<DidOpenTextDocumentParams, { generation: number; opening: OpeningDocument }>;
	private readonly _delayOpen: boolean;
	private readonly _openCompleted: () => void;
	private _pendingOpenListeners: Disposable[] | undefined;
	private _openGeneration: number;
	private _cleared: Deferred<never>;

	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware, $ConfigurationOptions>, syncedDocuments: Map<string, TextDocument>, openCompleted: () => void) {
		super(
			client, Workspace.onDidOpenTextDocument, DidOpenTextDocumentNotification.type,
			() => client.middleware.didOpen,
			(textDocument) => client.code2ProtocolConverter.asOpenTextDocumentParams(textDocument),
			(data) => data,
			TextDocumentEventFeature.textDocumentFilter
		);
		this._syncedDocuments = syncedDocuments;
		this._pendingOpenNotifications = new Map<string, TextDocument>();
		this._openingDocuments = new Map<string, OpeningDocument>();
		this._closingDocuments = new Map<string, ClosingDocument>();
		this._openParams = new WeakMap();
		this._delayOpen = client.clientOptions.textSynchronization?.delayOpenNotifications ?? false;
		this._openCompleted = openCompleted;
		this._openGeneration = 0;
		this._cleared = createDeferred<never>();
	}

	protected async callback(document: TextDocument): Promise<void> {
		if (!this._delayOpen) {
			return super.callback(document);
		}
		if (!this.matches(document)) {
			return;
		}
		this.queueOpenNotification(document);
		if (this._client.visibleDocuments.isVisible(document)) {
			await this.sendPendingOpenNotifications();
		}
	}

	private queueOpenNotification(document: TextDocument): void {
		const uri = document.uri.toString();
		if (!this._pendingOpenNotifications.has(uri)) {
			// Snapshot the text document so that when we send the delayed
			// notification it is based on the content/version at the time
			// it would've been sent, and not the updated version. This is
			// also true for visible documents since the notification can be
			// held back and the changes made in the meantime are sent after it.
			//
			// See https://github.com/microsoft/vscode-languageserver-node/issues/1695
			this._pendingOpenNotifications.set(uri, new TextDocumentSnapshot(document));
		}
	}

	public get openDocuments(): IterableIterator<TextDocument> {
		return this._syncedDocuments.values();
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
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
		const documentSelector = this._client.protocol2CodeConverter.asDocumentSelector(data.registerOptions.documentSelector);
		let sendPending = false;
		Workspace.textDocuments.forEach((textDocument) => {
			const uri: string = textDocument.uri.toString();
			if (this._syncedDocuments.has(uri) || this._pendingOpenNotifications.has(uri) || this._openingDocuments.has(uri)) {
				return;
			}
			if (Languages.match(documentSelector, textDocument) > 0 && !this._client.hasDedicatedTextSynchronizationFeature(textDocument)) {
				if (this._delayOpen) {
					this.queueOpenNotification(textDocument);
					sendPending = sendPending || this._client.visibleDocuments.isVisible(textDocument);
				} else {
					const middleware = this._client.middleware;
					const didOpen = (textDocument: TextDocument): Promise<void> => {
						return this._client.sendNotification(this._type, this._createParams(textDocument));
					};
					(middleware.didOpen ? middleware.didOpen(textDocument, didOpen) : didOpen(textDocument)).catch((error) => {
						this._client.error(`Sending document notification ${this._type.method} failed`, error);
					});
					this._syncedDocuments.set(uri, textDocument);
				}
			}
		});
		if (sendPending) {
			this.flushPendingOpenNotifications();
		}
		if (this._delayOpen && this._pendingOpenListeners === undefined) {
			this._pendingOpenListeners = [];
			this._pendingOpenListeners.push(this._client.visibleDocuments.onOpen((opened) => {
				for (const uri of opened) {
					if (this._pendingOpenNotifications.has(uri.toString())) {
						this.flushPendingOpenNotifications();
						break;
					}
				}
			}));
		}
	}

	private flushPendingOpenNotifications(): void {
		// Failures are reported when the open notification fails.
		this.sendPendingOpenNotifications().catch(() => { /* already reported */ });
	}

	/**
	 * Makes sure the open notifications that were held back are sent to the
	 * server before the notification or request the caller is about to send.
	 *
	 * Opens are not serialized and callers that are not interested in a document
	 * don't wait for user middleware (`didOpen` or `sendNotification`) that holds
	 * back its open notification. Otherwise middleware that talks to the server
	 * itself would block itself. Callers that pass the `document` they are about
	 * to send a message for wait for that document to be opened, however long it
	 * takes.
	 *
	 * @param document The URI of the document the caller is about to send a
	 *  message for.
	 * @returns A promise that rejects if the open notification of `document` fails
	 *  or if the client was stopped or restarted in the meantime.
	 */
	public async sendPendingOpenNotifications(document?: string): Promise<void> {
		if (!this._delayOpen) {
			return;
		}
		const generation = this._openGeneration;
		const cleared = this._cleared.promise;
		if (document !== undefined && this._pendingOpenNotifications.has(document)) {
			const closing = this._closingDocuments.get(document);
			if (closing !== undefined) {
				// The document got closed and opened again. The close has to reach
				// the server before the open.
				await Promise.race([closing.deferred.promise, cleared]);
				this.checkOpenGeneration(generation);
			}
		}
		for (const [uri, snapshot] of Array.from(this._pendingOpenNotifications)) {
			// An open that follows a close of the same document is sent when the close is done.
			if (this._closingDocuments.has(uri) || this._pendingOpenNotifications.get(uri) !== snapshot) {
				continue;
			}
			this._pendingOpenNotifications.delete(uri);
			this.startOpen(uri, snapshot, generation);
		}
		const waiting: Promise<unknown>[] = [];
		for (const [uri, opening] of this._openingDocuments) {
			if (opening.state !== 'pending') {
				continue;
			}
			if (uri === document) {
				waiting.push(opening.promise);
			} else if (!opening.inMiddleware) {
				// Callers that are not interested in the document wait until it is sent
				// or handed to user middleware. Whether it fails is none of their business.
				waiting.push(Promise.race([opening.promise, opening.enteredMiddleware]).catch(() => undefined));
			}
		}
		if (waiting.length > 0) {
			await Promise.race([Promise.all(waiting), cleared]);
		}
		this.checkOpenGeneration(generation);
	}

	private startOpen(uri: string, snapshot: TextDocument, generation: number): void {
		const opening = new OpeningDocument();
		this._openingDocuments.set(uri, opening);
		void this.sendOpenNow(snapshot, generation, opening).then(() => {
			opening.complete();
		}, (error) => {
			if (opening.state === 'pending') {
				opening.fail(error);
				this.reportOpenFailure(generation, error);
			} else if (opening.state === 'complete') {
				// The document got sent but the middleware failed afterwards.
				this.reportOpenFailure(generation, error);
			}
		}).then(() => {
			if (this._openingDocuments.get(uri) === opening) {
				this._openingDocuments.delete(uri);
			}
			if (generation === this._openGeneration) {
				this._openCompleted();
			}
		});
	}

	private reportOpenFailure(generation: number, error: unknown): void {
		if (generation === this._openGeneration) {
			this._client.error(`Sending document notification ${this._type.method} failed`, error);
		}
	}

	private checkOpenGeneration(generation: number): void {
		if (generation !== this._openGeneration) {
			throw new Error('Document synchronization was cleared.');
		}
	}

	private async sendOpenNow(document: TextDocument, generation: number, opening: OpeningDocument): Promise<void> {
		this.checkOpenGeneration(generation);
		if (!this.matches(document) || (document instanceof TextDocumentSnapshot && document.original.isClosed)) {
			return;
		}
		const send = async (textDocument: TextDocument): Promise<void> => {
			opening.leaveMiddleware();
			try {
				this.checkOpenGeneration(generation);
				const params = this._createParams(textDocument);
				this.aboutToSendNotification(textDocument, this._type, params);
				this._openParams.set(params, { generation, opening });
				await this._client.sendNotification(this._type, params);
				this.checkOpenGeneration(generation);
				this.notificationSent(textDocument, this._type, params);
				opening.complete();
			} catch (error) {
				if (opening.state === 'pending') {
					opening.fail(error);
					this.reportOpenFailure(generation, error);
				}
				throw error;
			}
		};
		const middleware = this._client.middleware.didOpen;
		if (middleware === undefined) {
			return send(document);
		}
		opening.enterMiddleware();
		try {
			await middleware(document, send);
		} finally {
			opening.leaveMiddleware();
		}
	}

	/**
	 * Called synchronously when a document gets closed, before the close
	 * notification is sent, and therefore before any later event for the same
	 * document (e.g. a change of the language mode closes and opens the document)
	 * is processed.
	 *
	 * @param uri The URI of the document that is closed.
	 * @returns `undefined` if the server never heard of the document because the
	 *  open notification was held back or failed. The close must not be sent either.
	 */
	public beginClose(uri: string): DocumentClosing | undefined {
		if (!this._delayOpen) {
			return DidOpenTextDocumentFeature.noClosing;
		}
		const opening = this._openingDocuments.get(uri);
		const isOpening = opening !== undefined && opening.state === 'pending';
		if (this._pendingOpenNotifications.delete(uri) || (!isOpening && !this._syncedDocuments.has(uri))) {
			return undefined;
		}
		let closing = this._closingDocuments.get(uri);
		if (closing === undefined) {
			closing = { count: 0, deferred: createDeferred() };
			this._closingDocuments.set(uri, closing);
		}
		closing.count++;
		const generation = this._openGeneration;
		let finished = false;
		return {
			ready: isOpening ? opening.promise : Promise.resolve(),
			done: () => {
				if (finished || generation !== this._openGeneration) {
					return;
				}
				finished = true;
				const current = this._closingDocuments.get(uri);
				if (current === undefined || --current.count > 0) {
					return;
				}
				this._closingDocuments.delete(uri);
				current.deferred.resolve();
				// The document got opened again while the close was on its way.
				if (this._pendingOpenNotifications.has(uri)) {
					this.flushPendingOpenNotifications();
				}
			}
		};
	}

	/**
	 * Whether the given open notification was created before the client got
	 * stopped or restarted.
	 */
	public isStaleOpen(params: DidOpenTextDocumentParams): boolean {
		const entry = this._openParams.get(params);
		return entry !== undefined && entry.generation !== this._openGeneration;
	}

	/**
	 * Marks the given open notification as being processed by user middleware
	 * and returns a function to call when the middleware hands it on.
	 */
	public enterNotificationMiddleware(params: DidOpenTextDocumentParams): () => void {
		const entry = this._openParams.get(params);
		if (entry === undefined) {
			return () => { /* nothing to do */ };
		}
		entry.opening.enterMiddleware();
		return () => entry.opening.leaveMiddleware();
	}

	/**
	 * The URIs of the documents that are known to the client but whose open
	 * notification was not sent yet.
	 */
	public getOpeningDocuments(): Set<string> {
		const result = new Set<string>(this._pendingOpenNotifications.keys());
		for (const [uri, opening] of this._openingDocuments) {
			if (opening.state === 'pending') {
				result.add(uri);
			}
		}
		return result;
	}

	protected getTextDocument(data: TextDocument): TextDocument {
		return data;
	}

	protected notificationSent(textDocument: TextDocument, type: ProtocolNotificationType<DidOpenTextDocumentParams, TextDocumentRegistrationOptions>, params: DidOpenTextDocumentParams): void {
		// Delayed documents are sent using a snapshot. Keep track of the document itself.
		const document = textDocument instanceof TextDocumentSnapshot ? textDocument.original : textDocument;
		this._syncedDocuments.set(textDocument.uri.toString(), document);
		super.notificationSent(textDocument, type, params);
	}

	public clear(): void {
		this._openGeneration++;
		const cleared = this._cleared;
		this._cleared = createDeferred<never>();
		cleared.reject(new Error('Document synchronization was cleared.'));
		this._pendingOpenNotifications.clear();
		this._openingDocuments.clear();
		this._closingDocuments.clear();
		if (this._pendingOpenListeners !== undefined) {
			for (const listener of this._pendingOpenListeners) {
				listener.dispose();
			}
			this._pendingOpenListeners = undefined;
		}
		super.clear();
	}
}

export interface DidCloseTextDocumentFeatureShape extends DynamicFeature<TextDocumentRegistrationOptions>, TextDocumentSendFeature<(textDocument: TextDocument) => Promise<void>>, NotifyingFeature<DidCloseTextDocumentParams> {
}

export class DidCloseTextDocumentFeature extends TextDocumentEventFeature<DidCloseTextDocumentParams, TextDocument, TextDocumentSynchronizationMiddleware> implements DidCloseTextDocumentFeatureShape {

	private readonly _syncedDocuments: Map<string, TextDocument>;
	private readonly _pendingTextDocumentChanges: Map<string, TextDocument>;
	private readonly _openFeature: DidOpenTextDocumentFeature;

	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware>, syncedDocuments: Map<string, TextDocument>, pendingTextDocumentChanges: Map<string, TextDocument>, openFeature: DidOpenTextDocumentFeature) {
		super(
			client, Workspace.onDidCloseTextDocument, DidCloseTextDocumentNotification.type,
			() => client.middleware.didClose,
			(textDocument) => client.code2ProtocolConverter.asCloseTextDocumentParams(textDocument),
			(data) => data,
			TextDocumentEventFeature.textDocumentFilter
		);
		this._syncedDocuments = syncedDocuments;
		this._pendingTextDocumentChanges = pendingTextDocumentChanges;
		this._openFeature = openFeature;
	}

	public get registrationType(): RegistrationType<TextDocumentRegistrationOptions> {
		return DidCloseTextDocumentNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
		if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.openClose) {
			this.register({ id: UUID.generateUuid(), registerOptions: { documentSelector: documentSelector } });
		}
	}

	protected async callback(data: TextDocument): Promise<void> {
		const uri = data.uri.toString();
		// Has to happen before anything else can happen to the document.
		const closing = this._openFeature.beginClose(uri);
		if (closing === undefined) {
			this._pendingTextDocumentChanges.delete(uri);
			return;
		}
		try {
			try {
				await closing.ready;
			} catch {
				// Opening the document failed. The server doesn't know it and there is nothing to close.
				this._pendingTextDocumentChanges.delete(uri);
				return;
			}
			await super.callback(data);
		} finally {
			closing.done();
		}
		this._pendingTextDocumentChanges.delete(uri);
	}

	protected getTextDocument(data: TextDocument): TextDocument {
		return data;
	}

	protected notificationSent(textDocument: TextDocument, type: ProtocolNotificationType<DidCloseTextDocumentParams, TextDocumentRegistrationOptions>, params: DidCloseTextDocumentParams): void {
		this._syncedDocuments.delete(textDocument.uri.toString());
		super.notificationSent(textDocument, type, params);
	}

	public unregister(id: string): void {
		const selector = this._selectors.get(id);
		if (selector === undefined) {
			return;
		}
		// The super call removed the selector from the map
		// of selectors.
		super.unregister(id);
		const selectors = this._selectors.values();
		this._syncedDocuments.forEach((textDocument) => {
			if (Languages.match(selector, textDocument) > 0 && !this._selectorFilter!(selectors, textDocument) && !this._client.hasDedicatedTextSynchronizationFeature(textDocument)) {
				const middleware = this._client.middleware;
				const didClose = (textDocument: TextDocument): Promise<void> => {
					return this._client.sendNotification(this._type, this._createParams(textDocument));
				};
				this._syncedDocuments.delete(textDocument.uri.toString());
				(middleware.didClose ? middleware.didClose(textDocument, didClose) :didClose(textDocument)).catch((error) => {
					this._client.error(`Sending document notification ${this._type.method} failed`, error);
				});
			}
		});
	}
}

interface DidChangeTextDocumentData {
	syncKind: 0 | 1 | 2;
	documentSelector: VDocumentSelector;
}

export interface DidChangeTextDocumentFeatureShape extends DynamicFeature<TextDocumentChangeRegistrationOptions>, TextDocumentSendFeature<(event: TextDocumentChangeEvent) => Promise<void>>, NotifyingFeature<DidChangeTextDocumentParams> {
}

export class DidChangeTextDocumentFeature extends DynamicDocumentFeature<TextDocumentChangeRegistrationOptions, TextDocumentSynchronizationMiddleware> implements DidChangeTextDocumentFeatureShape {

	private _listener: Disposable | undefined;
	private readonly _changeData: Map<string, DidChangeTextDocumentData>;
	private readonly _onAboutToSendNotification: EventEmitter<AboutToSendNotificationEvent<DidChangeTextDocumentParams>>;
	private readonly _onNotificationSent: EventEmitter<NotificationSentEvent<DidChangeTextDocumentParams>>;
	private readonly _onPendingChangeAdded: EventEmitter<void>;
	private readonly _pendingTextDocumentChanges: Map<string, TextDocument>;
	private _syncKind: TextDocumentSyncKind;

	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware>, pendingTextDocumentChanges: Map<string, TextDocument>) {
		super(client);
		this._changeData = new Map<string, DidChangeTextDocumentData>();
		this._onAboutToSendNotification = new EventEmitter();
		this._onNotificationSent = new EventEmitter();
		this._onPendingChangeAdded = new EventEmitter();
		this._pendingTextDocumentChanges = pendingTextDocumentChanges;
		this._syncKind = TextDocumentSyncKind.None;
	}

	public get onAboutToSendNotification(): Event<AboutToSendNotificationEvent<DidChangeTextDocumentParams>> {
		return this._onAboutToSendNotification.event;
	}

	public get onNotificationSent(): Event<NotificationSentEvent<DidChangeTextDocumentParams>> {
		return this._onNotificationSent.event;
	}

	public get onPendingChangeAdded(): Event<void> {
		return this._onPendingChangeAdded.event;
	}

	public get syncKind(): TextDocumentSyncKind {
		return this._syncKind;
	}

	public get registrationType(): RegistrationType<TextDocumentChangeRegistrationOptions> {
		return DidChangeTextDocumentNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
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
				syncKind: data.registerOptions.syncKind,
				documentSelector: this._client.protocol2CodeConverter.asDocumentSelector(data.registerOptions.documentSelector),
			}
		);
		this.updateSyncKind(data.registerOptions.syncKind);
	}

	public *getDocumentSelectors(): IterableIterator<VDocumentSelector> {
		for (const data of this._changeData.values()) {
			yield data.documentSelector;
		}
	}

	private async callback(event: TextDocumentChangeEvent): Promise<void> {
		// Text document changes are send for dirty changes as well. We don't
		// have dirty / un-dirty events in the LSP so we ignore content changes
		// with length zero.
		if (event.contentChanges.length === 0) {
			return;
		}

		// We need to capture the URI and version here since they might change on the text document
		// until we reach did `didChange` call since the middleware support async execution.
		const uri = event.document.uri;
		const version = event.document.version;

		const promises: Promise<void>[] = [];
		for (const changeData of this._changeData.values()) {
			if (Languages.match(changeData.documentSelector, event.document) > 0 && !this._client.hasDedicatedTextSynchronizationFeature(event.document)) {
				const middleware = this._client.middleware;
				if (changeData.syncKind === TextDocumentSyncKind.Incremental) {
					const didChange = async (event: TextDocumentChangeEvent): Promise<void> => {
						const params = this._client.code2ProtocolConverter.asChangeTextDocumentParams(event, uri, version);
						this.aboutToSendNotification(event.document, DidChangeTextDocumentNotification.type, params);
						await this._client.sendNotification(DidChangeTextDocumentNotification.type, params);
						this.notificationSent(event.document, DidChangeTextDocumentNotification.type, params);
					};
					promises.push(middleware.didChange ? middleware.didChange(event, event => didChange(event)) : didChange(event));
				} else if (changeData.syncKind === TextDocumentSyncKind.Full) {
					const didChange = async (event: TextDocumentChangeEvent): Promise<void> => {
						const eventUri: string = event.document.uri.toString();
						this._pendingTextDocumentChanges.set(eventUri, event.document);
						this._onPendingChangeAdded.fire();
					};
					promises.push(middleware.didChange ? middleware.didChange(event, event => didChange(event)) : didChange(event));
				}
			}
		}
		return Promise.all(promises).then(undefined, (error) => {
			this._client.error(`Sending document notification ${DidChangeTextDocumentNotification.type.method} failed`, error);
			throw error;
		});
	}

	public aboutToSendNotification(textDocument: TextDocument, type: ProtocolNotificationType<DidChangeTextDocumentParams, TextDocumentRegistrationOptions>, params: DidChangeTextDocumentParams): void {
		this._onAboutToSendNotification.fire({ textDocument, type, params });
	}

	public notificationSent(textDocument: TextDocument, type: ProtocolNotificationType<DidChangeTextDocumentParams, TextDocumentRegistrationOptions>, params: DidChangeTextDocumentParams): void {
		this._onNotificationSent.fire({ textDocument, type, params });
	}

	public unregister(id: string): void {
		this._changeData.delete(id);
		if (this._changeData.size === 0) {
			if (this._listener) {
				this._listener.dispose();
				this._listener = undefined;
			}
			this._syncKind = TextDocumentSyncKind.None;
		} else {
			this._syncKind = TextDocumentSyncKind.None as TextDocumentSyncKind;
			for (const changeData of this._changeData.values()) {
				this.updateSyncKind(changeData.syncKind);
				if (this._syncKind === TextDocumentSyncKind.Full) {
					break;
				}
			}
		}
	}

	public clear(): void {
		this._pendingTextDocumentChanges.clear();
		this._changeData.clear();
		this._syncKind = TextDocumentSyncKind.None;
		if (this._listener) {
			this._listener.dispose();
			this._listener = undefined;
		}
	}

	public getPendingDocumentChanges(excludes: Set<string>): TextDocument[] {
		if (this._pendingTextDocumentChanges.size === 0) {
			return [];
		}
		let result: TextDocument[];
		if (excludes.size === 0) {
			result = Array.from(this._pendingTextDocumentChanges.values());
			this._pendingTextDocumentChanges.clear();
		} else {
			result = [];
			for (const entry of this._pendingTextDocumentChanges) {
				if (!excludes.has(entry[0])) {
					result.push(entry[1]);
					this._pendingTextDocumentChanges.delete(entry[0]);
				}
			}
		}
		return result;
	}

	public getProvider(document: TextDocument): { send: (event: TextDocumentChangeEvent) => Promise<void> } | undefined {
		for (const changeData of this._changeData.values()) {
			if (Languages.match(changeData.documentSelector, document) > 0) {
				return {
					send: (event: TextDocumentChangeEvent): Promise<void> => {
						return this.callback(event);
					}
				};
			}
		}
		return undefined;
	}

	private updateSyncKind(syncKind: TextDocumentSyncKind): void {
		if (this._syncKind === TextDocumentSyncKind.Full) {
			return;
		}
		switch (syncKind) {
			case TextDocumentSyncKind.Full:
				this._syncKind = syncKind;
				break;
			case TextDocumentSyncKind.Incremental:
				if (this._syncKind === TextDocumentSyncKind.None) {
					this._syncKind= TextDocumentSyncKind.Incremental;
				}
				break;
		}
	}
}

export class WillSaveFeature extends TextDocumentEventFeature<WillSaveTextDocumentParams, TextDocumentWillSaveEvent, TextDocumentSynchronizationMiddleware> {

	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware>) {
		super(
			client, Workspace.onWillSaveTextDocument, WillSaveTextDocumentNotification.type,
			() => client.middleware.willSave,
			(willSaveEvent) => client.code2ProtocolConverter.asWillSaveTextDocumentParams(willSaveEvent),
			(event) => event.document,
			(selectors, willSaveEvent) => TextDocumentEventFeature.textDocumentFilter(selectors, willSaveEvent.document)
		);
	}

	public get registrationType(): RegistrationType<TextDocumentRegistrationOptions> {
		return WillSaveTextDocumentNotification.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const value = ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!;
		value.willSave = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
		if (documentSelector && textDocumentSyncOptions && textDocumentSyncOptions.willSave) {
			this.register({
				id: UUID.generateUuid(),
				registerOptions: { documentSelector: documentSelector }
			});
		}
	}

	protected getTextDocument(data: TextDocumentWillSaveEvent): TextDocument {
		return data.document;
	}
}

export class WillSaveWaitUntilFeature extends DynamicDocumentFeature<TextDocumentRegistrationOptions, TextDocumentSynchronizationMiddleware> {

	private _listener: Disposable | undefined;
	private readonly _selectors: Map<string, VDocumentSelector>;

	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware>) {
		super(client);
		this._selectors = new Map<string, VDocumentSelector>();
	}

	protected getDocumentSelectors(): IterableIterator<VDocumentSelector> {
		return this._selectors.values();
	}

	public get registrationType(): RegistrationType<TextDocumentRegistrationOptions> {
		return WillSaveTextDocumentWaitUntilRequest.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const value = ensure(ensure(capabilities, 'textDocument')!, 'synchronization')!;
		value.willSaveWaitUntil = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const textDocumentSyncOptions = (capabilities as ResolvedTextDocumentSyncCapabilities).resolvedTextDocumentSync;
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
		this._selectors.set(data.id, this._client.protocol2CodeConverter.asDocumentSelector(data.registerOptions.documentSelector));
	}

	private callback(event: TextDocumentWillSaveEvent): void {
		if (TextDocumentEventFeature.textDocumentFilter(this._selectors.values(), event.document) && !this._client.hasDedicatedTextSynchronizationFeature(event.document)) {
			const middleware = this._client.middleware;
			const willSaveWaitUntil = (event: TextDocumentWillSaveEvent): Thenable<VTextEdit[]> => {
				return this._client.sendRequest(WillSaveTextDocumentWaitUntilRequest.type,
					this._client.code2ProtocolConverter.asWillSaveTextDocumentParams(event)).then(async (edits) => {
					const vEdits = await this._client.protocol2CodeConverter.asTextEdits(edits);
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

	public clear(): void {
		this._selectors.clear();
		if (this._listener) {
			this._listener.dispose();
			this._listener = undefined;
		}
	}
}

export interface DidSaveTextDocumentFeatureShape extends DynamicFeature<TextDocumentRegistrationOptions>, TextDocumentSendFeature<(textDocument: TextDocument) => Promise<void>>, NotifyingFeature<DidSaveTextDocumentParams> {
}

export class DidSaveTextDocumentFeature extends TextDocumentEventFeature<DidSaveTextDocumentParams, TextDocument, TextDocumentSynchronizationMiddleware> implements DidSaveTextDocumentFeatureShape {

	private _includeText: boolean;

	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware>) {
		super(
			client, Workspace.onDidSaveTextDocument, DidSaveTextDocumentNotification.type,
			() => client.middleware.didSave,
			(textDocument) => client.code2ProtocolConverter.asSaveTextDocumentParams(textDocument, this._includeText),
			(data) => data,
			TextDocumentEventFeature.textDocumentFilter
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

	protected getTextDocument(data: TextDocument): TextDocument {
		return data;
	}
}

// Copied from https://github.com/microsoft/vscode/src/vs/editor/common/core/wordHelper.ts
const USUAL_WORD_SEPARATORS = '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?';

/**
 * Create a word definition regular expression based on default word separators.
 * Optionally provide allowed separators that should be included in words.
 *
 * The default would look like this:
 * /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
 */
function createWordRegExp(allowInWords: string = ''): RegExp {
	let source = '(-?\\d*\\.\\d\\w*)|([^';
	for (const sep of USUAL_WORD_SEPARATORS) {
		if (allowInWords.indexOf(sep) >= 0) {
			continue;
		}
		source += '\\' + sep;
	}
	source += '\\s]+)';
	return new RegExp(source, 'g');
}

// catches numbers (including floating numbers) in the first group, and alphanum in the second
const DEFAULT_WORD_REGEXP = createWordRegExp();

class TextDocumentSnapshot implements TextDocument {

	private readonly _extTextDocument: TextDocument;
	private readonly _capturedTextDocument: TextDocumentImpl;

	private readonly _content: string;
	private readonly _uri: VUri;
	private readonly _fileName: string;
	private readonly _languageId: string;
	private readonly _version: number;
	private readonly _eol: EndOfLine;
	private readonly _isUntitled: boolean;
	private readonly _encoding: string;
	private readonly _isDirty: boolean;
	private readonly _isClosed: boolean;

	constructor(textDocument: TextDocument) {
		this._extTextDocument = textDocument;
		this._content = textDocument.getText();
		this._uri = textDocument.uri;
		this._fileName = textDocument.fileName;
		this._languageId = textDocument.languageId;
		this._version = textDocument.version;
		this._eol = textDocument.eol;
		this._isUntitled = textDocument.isUntitled;
		this._encoding = textDocument.encoding;
		this._isDirty = textDocument.isDirty;
		this._isClosed = textDocument.isClosed;

		this._capturedTextDocument = TextDocumentImpl.create(this._uri.toString(), this._languageId, this._version, this._content);
	}

	/**
	 * The document this snapshot was taken from.
	 */
	public get original(): TextDocument {
		return this._extTextDocument;
	}

	public get uri(): VUri {
		return this._uri;
	}

	public get languageId(): string {
		return this._languageId;
	}

	public get version(): number {
		return this._version;
	}

	public get eol(): EndOfLine {
		return this._eol;
	}

	public get isUntitled(): boolean {
		return this._isUntitled;
	}

	public get encoding(): string {
		return this._encoding;
	}

	public get fileName(): string {
		return this._fileName;
	}

	public get isDirty(): boolean {
		return this._isDirty;
	}

	public get isClosed(): boolean {
		return this._isClosed;
	}

	public save(): Thenable<boolean> {
		return this.version === this._extTextDocument.version
			? this._extTextDocument.save()
			: Promise.resolve(false);
	}

	public get lineCount(): number {
		return this._capturedTextDocument.lineCount;
	}

	public offsetAt(position: VPosition): number {
		return this._capturedTextDocument.offsetAt(position);
	}

	public positionAt(offset: number): VPosition {
		const position = this._capturedTextDocument.positionAt(offset);
		return new VPosition(position.line, position.character);
	}

	public getText(range?: VRange): string {
		return this._capturedTextDocument.getText(range);
	}

	public lineAt(line: number): TextLine;
	public lineAt(position: VPosition): TextLine;
	public lineAt(lineOrPosition: VPosition | number): TextLine {
		const line = typeof lineOrPosition === 'number' ? lineOrPosition : this.validatePosition(lineOrPosition).line;
		if (line < 0 || line >= this.lineCount) {
			throw new RangeError(`Illegal value for line: ${line}`);
		}
		const lineRange = this._capturedTextDocument.getLineRange(line);
		const text = this._capturedTextDocument.getText(lineRange);
		const firstNonWhitespaceCharacterIndex = text.search(/\S/);
		const range = new VRange(lineRange.start.line, lineRange.start.character, lineRange.end.line, lineRange.end.character);
		const rangeIncludingLineBreak = line + 1 < this.lineCount
			? new VRange(range.start.line, range.start.character, line + 1, 0)
			: range;
		return {
			lineNumber: line,
			text,
			range,
			rangeIncludingLineBreak,
			firstNonWhitespaceCharacterIndex: firstNonWhitespaceCharacterIndex === -1 ? text.length : firstNonWhitespaceCharacterIndex,
			isEmptyOrWhitespace: firstNonWhitespaceCharacterIndex === -1
		};
	}

	getWordRangeAtPosition(position: VPosition, regex?: RegExp): VRange | undefined {
		const lineNumber = this.validatePosition(position).line;
		const lineText = this.lineAt(lineNumber).text;

		const wordRegex = TextDocumentSnapshot.getWordRegExp(regex);

		let match;
		wordRegex.lastIndex = 0;
		while ((match = wordRegex.exec(lineText)) !== null) {
			if (match.index <= position.character && wordRegex.lastIndex >= position.character) {
				return new VRange(lineNumber, match.index, lineNumber, wordRegex.lastIndex);
			}
		}

		return undefined;
	}

	validateRange(range: VRange): VRange {
		const start = this.validatePosition(range.start);
		const end = this.validatePosition(range.end);

		if (start === range.start && end === range.end) {
			return range;
		}
		return new VRange(start.line, start.character, end.line, end.character);
	}

	validatePosition(position: VPosition): VPosition {
		const line = Math.min(Math.max(position.line, 0), this.lineCount - 1);
		const lineRange = this._capturedTextDocument.getLineRange(line);
		const character = Math.min(Math.max(position.character, 0), lineRange.end.character);
		if (line === position.line && character === position.character) {
			return position;
		}
		return new VPosition(line, character);
	}

	private static getWordRegExp(regex?: RegExp): RegExp {
		const result = regex ?? DEFAULT_WORD_REGEXP;
		if (result.flags.includes('g')) {
			return result;
		}
		const flags = `${result.flags}g`;
		return new RegExp(result.source, flags);
	}
}