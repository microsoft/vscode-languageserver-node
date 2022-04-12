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
	NotificationSendEvent, SuspensibleLanguageFeature, DocumentSelectorOptions
} from './features';

import { Delayer } from './utils/async';
import * as UUID from './utils/uuid';

export interface TextDocumentSynchronizationMiddleware {
	didOpen?: NextSignature<TextDocument, Promise<void>>;
	didChange?: NextSignature<TextDocumentChangeEvent, Promise<void>>;
	willSave?: NextSignature<TextDocumentWillSaveEvent, Promise<void>>;
	willSaveWaitUntil?: NextSignature<TextDocumentWillSaveEvent, Thenable<VTextEdit[]>>;
	didSave?: NextSignature<TextDocument, Promise<void>>;
	didClose?: NextSignature<TextDocument, Promise<void>>;
}

export interface DidOpenTextDocumentFeatureShape extends DynamicFeature<TextDocumentRegistrationOptions>, TextDocumentSendFeature<(textDocument: TextDocument) => Promise<void>>, NotifyingFeature<TextDocument, DidOpenTextDocumentParams>, SuspensibleLanguageFeature<DocumentSelectorOptions>{
	openDocuments: Iterable<TextDocument>;
}

export type ResolvedTextDocumentSyncCapabilities = {
	resolvedTextDocumentSync?: TextDocumentSyncOptions;
};

export class DidOpenTextDocumentFeature extends TextDocumentEventFeature<DidOpenTextDocumentParams, TextDocument, TextDocumentSynchronizationMiddleware> implements DidOpenTextDocumentFeatureShape {
	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware>, private _syncedDocuments: Map<string, TextDocument>) {
		super(
			client, Workspace.onDidOpenTextDocument, DidOpenTextDocumentNotification.type,
			client.middleware.didOpen,
			(textDocument) => client.code2ProtocolConverter.asOpenTextDocumentParams(textDocument),
			TextDocumentEventFeature.textDocumentFilter
		);
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
			if (Languages.match(documentSelector, textDocument)) {
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

	public registerActivation(options: DocumentSelectorOptions): void {
		const selector = this._client.protocol2CodeConverter.asDocumentSelector(options.documentSelector);
		this.doRegisterActivation(() => {
			return Workspace.onDidOpenTextDocument((document) => {
				if (Languages.match(selector, document) > 0) {
					this.handleActivation();
				}
			});
		});
	}

	protected notificationSent(textDocument: TextDocument, type: ProtocolNotificationType<DidOpenTextDocumentParams, TextDocumentRegistrationOptions>, params: DidOpenTextDocumentParams): void {
		super.notificationSent(textDocument, type, params);
		this._syncedDocuments.set(textDocument.uri.toString(), textDocument);
	}
}

export interface DidCloseTextDocumentFeatureShape extends DynamicFeature<TextDocumentRegistrationOptions>, TextDocumentSendFeature<(textDocument: TextDocument) => Promise<void>>, NotifyingFeature<TextDocument, DidCloseTextDocumentParams> {
}

export class DidCloseTextDocumentFeature extends TextDocumentEventFeature<DidCloseTextDocumentParams, TextDocument, TextDocumentSynchronizationMiddleware> implements DidCloseTextDocumentFeatureShape {

	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware>, private _syncedDocuments: Map<string, TextDocument>) {
		super(
			client, Workspace.onDidCloseTextDocument, DidCloseTextDocumentNotification.type,
			client.middleware.didClose,
			(textDocument) => client.code2ProtocolConverter.asCloseTextDocumentParams(textDocument),
			TextDocumentEventFeature.textDocumentFilter
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

	protected notificationSent(textDocument: TextDocument, type: ProtocolNotificationType<DidCloseTextDocumentParams, TextDocumentRegistrationOptions>, params: DidCloseTextDocumentParams): void {
		super.notificationSent(textDocument, type, params);
		this._syncedDocuments.delete(textDocument.uri.toString());
	}

	public unregister(id: string): void {
		const selector = this._selectors.get(id)!;
		// The super call removed the selector from the map
		// of selectors.
		super.unregister(id);
		const selectors = this._selectors.values();
		this._syncedDocuments.forEach((textDocument) => {
			if (Languages.match(selector, textDocument) && !this._selectorFilter!(selectors, textDocument)) {
				let middleware = this._client.middleware;
				let didClose = (textDocument: TextDocument): Promise<void> => {
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

export interface DidChangeTextDocumentFeatureShape extends DynamicFeature<TextDocumentChangeRegistrationOptions>, TextDocumentSendFeature<(event: TextDocumentChangeEvent) => Promise<void>>, NotifyingFeature<TextDocumentChangeEvent, DidChangeTextDocumentParams> {
}

export class DidChangeTextDocumentFeature extends DynamicDocumentFeature<TextDocumentChangeRegistrationOptions, TextDocumentSynchronizationMiddleware> implements DidChangeTextDocumentFeatureShape {

	private _listener: Disposable | undefined;
	private readonly _changeData: Map<string, DidChangeTextDocumentData>;
	private _forcingDelivery: boolean = false;
	private _changeDelayer: { uri: string; delayer: Delayer<void> } | undefined;
	private readonly _onNotificationSent: EventEmitter<NotificationSendEvent<TextDocumentChangeEvent, DidChangeTextDocumentParams>>;

	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware>) {
		super(client);
		this._changeData = new Map<string, DidChangeTextDocumentData>();
		this._onNotificationSent = new EventEmitter();
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
				syncKind: data.registerOptions.syncKind,
				documentSelector: this._client.protocol2CodeConverter.asDocumentSelector(data.registerOptions.documentSelector),
			}
		);
	}

	protected getStateInfo(): [IterableIterator<VDocumentSelector>, boolean] {
		return [this.getDocumentSelectors(), false];
	}

	private *getDocumentSelectors(): IterableIterator<VDocumentSelector> {
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
		const promises: Promise<void>[] = [];
		for (const changeData of this._changeData.values()) {
			if (Languages.match(changeData.documentSelector, event.document)) {
				const middleware = this._client.middleware;
				if (changeData.syncKind === TextDocumentSyncKind.Incremental) {
					const didChange = async (event: TextDocumentChangeEvent): Promise<void> => {
						const params = this._client.code2ProtocolConverter.asChangeTextDocumentParams(event);
						await this._client.sendNotification(DidChangeTextDocumentNotification.type, params);
						this.notificationSent(event, DidChangeTextDocumentNotification.type, params);
					};
					promises.push(middleware.didChange ? middleware.didChange(event, event => didChange(event)) : didChange(event));
				} else if (changeData.syncKind === TextDocumentSyncKind.Full) {
					const didChange = async (event: TextDocumentChangeEvent): Promise<void> => {
						const doSend = async (event: TextDocumentChangeEvent): Promise<void> => {
							const params = this._client.code2ProtocolConverter.asChangeTextDocumentParams(event.document);
							await this._client.sendNotification(DidChangeTextDocumentNotification.type, params);
							this.notificationSent(event, DidChangeTextDocumentNotification.type, params);
						};
						if (this._changeDelayer) {
							if (this._changeDelayer.uri !== event.document.uri.toString()) {
								// Use this force delivery to track boolean state. Otherwise we might call two times.
								this.forceDelivery();
								this._changeDelayer.uri = event.document.uri.toString();
							}
							return this._changeDelayer.delayer.trigger(() => doSend(event));
						} else {
							this._changeDelayer = {
								uri: event.document.uri.toString(),
								delayer: new Delayer<void>(200)
							};
							return this._changeDelayer.delayer.trigger(() => doSend(event), -1);
						}
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

	public get onNotificationSent(): Event<NotificationSendEvent<TextDocumentChangeEvent, DidChangeTextDocumentParams>> {
		return this._onNotificationSent.event;
	}

	private notificationSent(changeEvent: TextDocumentChangeEvent, type: ProtocolNotificationType<DidChangeTextDocumentParams, TextDocumentRegistrationOptions>, params: DidChangeTextDocumentParams): void {
		this._onNotificationSent.fire({ original: changeEvent, type, params });
	}

	public unregister(id: string): void {
		this._changeData.delete(id);
		if (this._changeData.size === 0 && this._listener) {
			this._listener.dispose();
			this._listener = undefined;
		}
	}

	public dispose(): void {
		if (this._changeDelayer !== undefined) {
			this._changeDelayer.delayer.cancel();
		}
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

	public getProvider(document: TextDocument): { send: (event: TextDocumentChangeEvent) => Promise<void> } | undefined {
		for (const changeData of this._changeData.values()) {
			if (Languages.match(changeData.documentSelector, document)) {
				return {
					send: (event: TextDocumentChangeEvent): Promise<void> => {
						return this.callback(event);
					}
				};
			}
		}
		return undefined;
	}
}

export class WillSaveFeature extends TextDocumentEventFeature<WillSaveTextDocumentParams, TextDocumentWillSaveEvent, TextDocumentSynchronizationMiddleware> {

	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware>) {
		super(
			client, Workspace.onWillSaveTextDocument, WillSaveTextDocumentNotification.type,
			client.middleware.willSave,
			(willSaveEvent) => client.code2ProtocolConverter.asWillSaveTextDocumentParams(willSaveEvent),
			(selectors, willSaveEvent) => TextDocumentEventFeature.textDocumentFilter(selectors, willSaveEvent.document)
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

export class WillSaveWaitUntilFeature extends DynamicDocumentFeature<TextDocumentRegistrationOptions, TextDocumentSynchronizationMiddleware> {

	private _listener: Disposable | undefined;
	private readonly _selectors: Map<string, VDocumentSelector>;

	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware>) {
		super(client);
		this._selectors = new Map<string, VDocumentSelector>();
	}

	protected getStateInfo(): [IterableIterator<VDocumentSelector>, boolean] {
		return [this.getDocumentSelectors(), false];
	}

	private getDocumentSelectors(): IterableIterator<VDocumentSelector> {
		return this._selectors.values();
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
		this._selectors.set(data.id, this._client.protocol2CodeConverter.asDocumentSelector(data.registerOptions.documentSelector));
	}

	private callback(event: TextDocumentWillSaveEvent): void {
		if (TextDocumentEventFeature.textDocumentFilter(this._selectors.values(), event.document)) {
			let middleware = this._client.middleware;
			let willSaveWaitUntil = (event: TextDocumentWillSaveEvent): Thenable<VTextEdit[]> => {
				return this._client.sendRequest(WillSaveTextDocumentWaitUntilRequest.type,
					this._client.code2ProtocolConverter.asWillSaveTextDocumentParams(event)).then(async (edits) => {
					let vEdits = await this._client.protocol2CodeConverter.asTextEdits(edits);
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

export interface DidSaveTextDocumentFeatureShape extends DynamicFeature<TextDocumentRegistrationOptions>, TextDocumentSendFeature<(textDocument: TextDocument) => Promise<void>>, NotifyingFeature<TextDocument, DidSaveTextDocumentParams> {
}

export class DidSaveTextDocumentFeature extends TextDocumentEventFeature<DidSaveTextDocumentParams, TextDocument, TextDocumentSynchronizationMiddleware> implements DidSaveTextDocumentFeatureShape {

	private _includeText: boolean;

	constructor(client: FeatureClient<TextDocumentSynchronizationMiddleware>) {
		super(
			client, Workspace.onDidSaveTextDocument, DidSaveTextDocumentNotification.type,
			client.middleware.didSave,
			(textDocument) => client.code2ProtocolConverter.asSaveTextDocumentParams(textDocument, this._includeText),
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
}