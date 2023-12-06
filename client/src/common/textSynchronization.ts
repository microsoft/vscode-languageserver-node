/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	workspace as Workspace, languages as Languages, TextDocument, TextDocumentChangeEvent, TextDocumentWillSaveEvent, TextEdit as VTextEdit,
	DocumentSelector as VDocumentSelector, Event, EventEmitter, Disposable
} from 'vscode';

import {
	ClientCapabilities, DidChangeTextDocumentNotification, DidChangeTextDocumentParams, DidCloseTextDocumentNotification, DidCloseTextDocumentParams, DidOpenTextDocumentNotification,
	DidOpenTextDocumentParams, DidSaveTextDocumentNotification, DidSaveTextDocumentParams, DocumentSelector, ProtocolNotificationType, RegistrationType, SaveOptions,
	ServerCapabilities, TextDocumentChangeRegistrationOptions, TextDocumentRegistrationOptions, TextDocumentSaveRegistrationOptions, TextDocumentSyncKind, TextDocumentSyncOptions,
	WillSaveTextDocumentNotification, WillSaveTextDocumentParams, WillSaveTextDocumentWaitUntilRequest
} from 'vscode-languageserver-protocol';

import {
	FeatureClient, TextDocumentEventFeature, DynamicFeature, NextSignature, TextDocumentSendFeature, NotifyingFeature, ensure, RegistrationData, DynamicDocumentFeature,
	NotificationSendEvent
} from './features';

import * as UUID from './utils/uuid';

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

export class DidOpenTextDocumentFeature extends TextDocumentEventFeature<DidOpenTextDocumentParams, TextDocument, TextDocumentSynchronizationMiddleware> implements DidOpenTextDocumentFeatureShape {

	private readonly _syncedDocuments: Map<string, TextDocument>;

	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware>, syncedDocuments: Map<string, TextDocument>) {
		super(
			client, Workspace.onDidOpenTextDocument, DidOpenTextDocumentNotification.type,
			() => client.middleware.didOpen,
			(textDocument) => client.code2ProtocolConverter.asOpenTextDocumentParams(textDocument),
			(data) => data,
			TextDocumentEventFeature.textDocumentFilter
		);
		this._syncedDocuments = syncedDocuments;
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
		Workspace.textDocuments.forEach((textDocument) => {
			const uri: string = textDocument.uri.toString();
			if (this._syncedDocuments.has(uri)) {
				return;
			}
			if (Languages.match(documentSelector, textDocument) > 0 && !this._client.hasDedicatedTextSynchronizationFeature(textDocument)) {
				const middleware = this._client.middleware;
				const didOpen = (textDocument: TextDocument): Promise<void> => {
					return this._client.sendNotification(this._type, this._createParams(textDocument));
				};
				(middleware.didOpen ? middleware.didOpen(textDocument, didOpen) : didOpen(textDocument)).catch((error) => {
					this._client.error(`Sending document notification ${this._type.method} failed`, error);
				});
				this._syncedDocuments.set(uri, textDocument);
			}
		});
	}

	protected getTextDocument(data: TextDocument): TextDocument {
		return data;
	}

	protected notificationSent(textDocument: TextDocument, type: ProtocolNotificationType<DidOpenTextDocumentParams, TextDocumentRegistrationOptions>, params: DidOpenTextDocumentParams): void {
		this._syncedDocuments.set(textDocument.uri.toString(), textDocument);
		super.notificationSent(textDocument, type, params);
	}
}

export interface DidCloseTextDocumentFeatureShape extends DynamicFeature<TextDocumentRegistrationOptions>, TextDocumentSendFeature<(textDocument: TextDocument) => Promise<void>>, NotifyingFeature<DidCloseTextDocumentParams> {
}

export class DidCloseTextDocumentFeature extends TextDocumentEventFeature<DidCloseTextDocumentParams, TextDocument, TextDocumentSynchronizationMiddleware> implements DidCloseTextDocumentFeatureShape {

	private readonly _syncedDocuments: Map<string, TextDocument>;
	private readonly _pendingTextDocumentChanges: Map<string, TextDocument>;

	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware>, syncedDocuments: Map<string, TextDocument>, pendingTextDocumentChanges: Map<string, TextDocument>) {
		super(
			client, Workspace.onDidCloseTextDocument, DidCloseTextDocumentNotification.type,
			() => client.middleware.didClose,
			(textDocument) => client.code2ProtocolConverter.asCloseTextDocumentParams(textDocument),
			(data) => data,
			TextDocumentEventFeature.textDocumentFilter
		);
		this._syncedDocuments = syncedDocuments;
		this._pendingTextDocumentChanges = pendingTextDocumentChanges;
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
		await super.callback(data);
		this._pendingTextDocumentChanges.delete(data.uri.toString());
	}

	protected getTextDocument(data: TextDocument): TextDocument {
		return data;
	}

	protected notificationSent(textDocument: TextDocument, type: ProtocolNotificationType<DidCloseTextDocumentParams, TextDocumentRegistrationOptions>, params: DidCloseTextDocumentParams): void {
		this._syncedDocuments.delete(textDocument.uri.toString());
		super.notificationSent(textDocument, type, params);
	}

	public unregister(id: string): void {
		const selector = this._selectors.get(id)!;
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
	private readonly _onNotificationSent: EventEmitter<NotificationSendEvent<DidChangeTextDocumentParams>>;
	private readonly _onPendingChangeAdded: EventEmitter<void>;
	private readonly _pendingTextDocumentChanges: Map<string, TextDocument>;
	private _syncKind: TextDocumentSyncKind;

	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware>, pendingTextDocumentChanges: Map<string, TextDocument>) {
		super(client);
		this._changeData = new Map<string, DidChangeTextDocumentData>();
		this._onNotificationSent = new EventEmitter();
		this._onPendingChangeAdded = new EventEmitter();
		this._pendingTextDocumentChanges = pendingTextDocumentChanges;
		this._syncKind = TextDocumentSyncKind.None;
	}

	public get onNotificationSent(): Event<NotificationSendEvent<DidChangeTextDocumentParams>> {
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