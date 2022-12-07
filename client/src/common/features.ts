/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, workspace as Workspace, TextDocument, Event as VEvent, DocumentSelector as VDocumentSelector, EventEmitter, Event,
	Disposable, CancellationToken, ProviderResult, TextEdit as VTextEdit, ReferenceProvider, DefinitionProvider, SignatureHelpProvider,
	HoverProvider, CompletionItemProvider, WorkspaceSymbolProvider, DocumentHighlightProvider, CodeActionProvider, DocumentFormattingEditProvider,
	DocumentRangeFormattingEditProvider, OnTypeFormattingEditProvider, RenameProvider, DocumentSymbolProvider, DocumentLinkProvider, DocumentColorProvider,
	DeclarationProvider, FoldingRangeProvider, ImplementationProvider, SelectionRangeProvider, TypeDefinitionProvider, CallHierarchyProvider,
	LinkedEditingRangeProvider, TypeHierarchyProvider, FileCreateEvent, FileRenameEvent, FileDeleteEvent, FileWillCreateEvent, FileWillRenameEvent,
	FileWillDeleteEvent, CancellationError
} from 'vscode';

import {
	CallHierarchyPrepareRequest, ClientCapabilities, CodeActionRequest, CodeLensRequest, CompletionRequest, DeclarationRequest, DefinitionRequest,
	DidChangeTextDocumentNotification, DidCloseTextDocumentNotification, DidCreateFilesNotification, DidDeleteFilesNotification, DidOpenTextDocumentNotification,
	DidRenameFilesNotification, DidSaveTextDocumentNotification, DocumentColorRequest, DocumentDiagnosticRequest, DocumentFormattingRequest, DocumentHighlightRequest,
	DocumentLinkRequest, DocumentOnTypeFormattingRequest, DocumentRangeFormattingRequest, DocumentSelector, DocumentSymbolRequest, FileOperationRegistrationOptions,
	FoldingRangeRequest, GenericNotificationHandler, GenericRequestHandler, HoverRequest, ImplementationRequest, InitializeParams, InlayHintRequest, InlineValueRequest,
	LinkedEditingRangeRequest, MessageSignature, NotebookDocumentSyncRegistrationOptions, NotebookDocumentSyncRegistrationType, NotificationHandler, NotificationHandler0,
	NotificationType, NotificationType0, ProgressType,  ProtocolNotificationType, ProtocolNotificationType0, ProtocolRequestType, ProtocolRequestType0, ReferencesRequest,
	RegistrationType, RenameRequest, RequestHandler, RequestHandler0, RequestType, RequestType0, SelectionRangeRequest, SemanticTokensRegistrationType, ServerCapabilities,
	SignatureHelpRequest, StaticRegistrationOptions, TextDocumentIdentifier, TextDocumentRegistrationOptions, TypeDefinitionRequest, TypeHierarchyPrepareRequest, WillCreateFilesRequest,
	WillDeleteFilesRequest, WillRenameFilesRequest, WillSaveTextDocumentNotification, WillSaveTextDocumentWaitUntilRequest, WorkDoneProgressOptions, WorkspaceSymbolRequest
} from 'vscode-languageserver-protocol';

import * as Is from './utils/is';
import * as UUID from './utils/uuid';

import type * as c2p from './codeConverter';
import type * as p2c from './protocolConverter';

export class LSPCancellationError extends CancellationError {
	public readonly data: object | Object;
	constructor(data: object | Object) {
		super();
		this.data = data;
	}
}

export function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === undefined) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface NextSignature<P, R> {
	(this: void, data: P, next: (data: P) => R): R;
}

export interface RegistrationData<T> {
	id: string;
	registerOptions: T;
}

export type FeatureStateKind = 'document' | 'workspace' | 'static' | 'window';

export type FeatureState = {
	kind: 'document';

	/**
	 * The features's id. This is usually the method names used during
	 * registration.
	 */
	id: string;

	/**
	 * Has active registrations.
	 */
	registrations: boolean;

	/**
	 * A registration matches an open document.
	 */
	matches: boolean;

} | {
	kind: 'workspace';

	/**
	 * The features's id. This is usually the method names used during
	 * registration.
	 */
	id: string;

	/**
	 * Has active registrations.
	 */
	registrations: boolean;
} | {
	kind: 'window';

	/**
	 * The features's id. This is usually the method names used during
	 * registration.
	 */
	id: string;

	/**
	 * Has active registrations.
	 */
	registrations: boolean;
} | {
	kind: 'static';
};

/**
 * A static feature. A static feature can't be dynamically activated via the
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
	 * A preflight where the server capabilities are shown to all features
	 * before a feature is actually initialized. This allows feature to
	 * capture some state if they are a pre-requisite for other features.
	 *
	 * @param capabilities the server capabilities
	 * @param documentSelector the document selector pass to the client's constructor.
	 *  May be `undefined` if the client was created without a selector.
	 */
	preInitialize?: (capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined) => void;

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
	 * Returns the state the feature is in.
	 */
	getState(): FeatureState;

	/**
	 * Called when the client is stopped to dispose this feature. Usually a feature
	 * un-registers listeners registered hooked up with the VS Code extension host.
	 */
	dispose(): void;
}

export namespace StaticFeature {
	export function is (value: any): value is StaticFeature {
		const candidate: StaticFeature = value;
		return candidate !== undefined && candidate !== null &&
			Is.func(candidate.fillClientCapabilities) && Is.func(candidate.initialize) && Is.func(candidate.getState) && Is.func(candidate.dispose) &&
			(candidate.fillInitializeParams === undefined || Is.func(candidate.fillInitializeParams));
	}
}

/**
 * A dynamic feature can be activated via the server.
 */
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
	 * A preflight where the server capabilities are shown to all features
	 * before a feature is actually initialized. This allows feature to
	 * capture some state if they are a pre-requisite for other features.
	 *
	 * @param capabilities the server capabilities
	 * @param documentSelector the document selector pass to the client's constructor.
	 *  May be `undefined` if the client was created without a selector.
	 */
	preInitialize?: (capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined) => void;

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
	 * Returns the state the feature is in.
	 */
	getState(): FeatureState;

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

export namespace DynamicFeature {
	export function is<T>(value: any): value is DynamicFeature<T> {
		const candidate: DynamicFeature<T> = value;
		return candidate !== undefined && candidate !== null &&
			Is.func(candidate.fillClientCapabilities) && Is.func(candidate.initialize) && Is.func(candidate.getState) && Is.func(candidate.dispose) &&
			(candidate.fillInitializeParams === undefined || Is.func(candidate.fillInitializeParams)) && Is.func(candidate.register) &&
			Is.func(candidate.unregister) && candidate.registrationType !== undefined;
	}
}

interface CreateParamsSignature<E, P> {
	(data: E): P;
}

export interface NotificationSendEvent<P extends { textDocument: TextDocumentIdentifier }> {
	type: ProtocolNotificationType<P, TextDocumentRegistrationOptions>;
	params: P;
}

export interface NotifyingFeature<P extends { textDocument: TextDocumentIdentifier }> {
	onNotificationSent: VEvent<NotificationSendEvent<P>>;
}

/**
 * An abstract dynamic feature implementation that operates on documents (e.g. text
 * documents or notebooks).
 */
export abstract class DynamicDocumentFeature<RO, MW, CO = object> implements DynamicFeature<RO> {

	protected readonly _client: FeatureClient<MW, CO>;

	constructor(client: FeatureClient<MW, CO>) {
		this._client = client;
	}

	// Repeat from interface.
	public abstract fillClientCapabilities(capabilities: ClientCapabilities): void;
	public abstract initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector | undefined): void;
	public abstract registrationType: RegistrationType<RO>;
	public abstract register(data: RegistrationData<RO>): void;
	public abstract unregister(id: string): void;
	public abstract dispose(): void;

	/**
	 * Returns the state the feature is in.
	 */
	public getState(): FeatureState {
		const selectors = this.getDocumentSelectors();

		let count: number = 0;
		for (const selector of selectors) {
			count++;
			for (const document of Workspace.textDocuments) {
				if (Languages.match(selector, document) > 0) {
					return { kind: 'document', id: this.registrationType.method, registrations: true, matches: true };
				}
			}
		}
		const registrations = count > 0;
		return { kind: 'document', id: this.registrationType.method, registrations, matches: false };

	}

	protected abstract getDocumentSelectors(): IterableIterator<VDocumentSelector>;
}

/**
 * A mixin type that allows to send notification or requests using a registered
 * provider.
 */
export interface TextDocumentSendFeature<T extends Function> {
	/**
	 * Returns a provider for the given text document.
	 */
	getProvider(document: TextDocument): { send: T } | undefined;
}


/**
 * An abstract base class to implement features that react to events
 * emitted from text documents.
 */
export abstract class TextDocumentEventFeature<P extends { textDocument: TextDocumentIdentifier }, E, M> extends DynamicDocumentFeature<TextDocumentRegistrationOptions, M> implements TextDocumentSendFeature<(data: E) => Promise<void>>, NotifyingFeature<P> {

	private readonly _event: Event<E>;
	protected readonly _type: ProtocolNotificationType<P, TextDocumentRegistrationOptions>;
	protected readonly _middleware: () => NextSignature<E, Promise<void>> | undefined;
	protected readonly _createParams: CreateParamsSignature<E, P>;
	protected readonly _textDocument: (data: E) => TextDocument;
	protected readonly _selectorFilter?: (selectors: IterableIterator<VDocumentSelector>, data: E) => boolean;

	private _listener: Disposable | undefined;
	protected readonly _selectors: Map<string, VDocumentSelector>;
	private readonly _onNotificationSent: EventEmitter<NotificationSendEvent<P>>;

	public static textDocumentFilter(selectors: IterableIterator<VDocumentSelector>, textDocument: TextDocument): boolean {
		for (const selector of selectors) {
			if (Languages.match(selector, textDocument) > 0) {
				return true;
			}
		}
		return false;
	}

	constructor(client: FeatureClient<M>, event: Event<E>, type: ProtocolNotificationType<P, TextDocumentRegistrationOptions>,
		middleware: () => NextSignature<E, Promise<void>> | undefined, createParams: CreateParamsSignature<E, P>,
		textDocument: (data: E) => TextDocument,
		selectorFilter?: (selectors: IterableIterator<VDocumentSelector>, data: E) => boolean
	) {
		super(client);
		this._event = event;
		this._type = type;
		this._middleware = middleware;
		this._createParams = createParams;
		this._textDocument = textDocument;
		this._selectorFilter = selectorFilter;

		this._selectors = new Map<string, VDocumentSelector>();
		this._onNotificationSent = new EventEmitter<NotificationSendEvent<P>>();
	}

	protected getStateInfo(): [IterableIterator<VDocumentSelector>, boolean] {
		return [this._selectors.values(), false];
	}
	protected getDocumentSelectors(): IterableIterator<VDocumentSelector> {
		return this._selectors.values();
	}

	public register(data: RegistrationData<TextDocumentRegistrationOptions>): void {

		if (!data.registerOptions.documentSelector) {
			return;
		}
		if (!this._listener) {
			this._listener = this._event((data) => {
				this.callback(data).catch((error) => {
					this._client.error(`Sending document notification ${this._type.method} failed.`, error);
				});
			});
		}
		this._selectors.set(data.id, this._client.protocol2CodeConverter.asDocumentSelector(data.registerOptions.documentSelector));
	}

	private async callback(data: E): Promise<void> {
		const doSend = async (data: E): Promise<void> => {
			const params = this._createParams(data);
			const sendPromise = this._client.sendNotification(this._type, params);
			this.notificationSending(this._type, sendPromise);
			await sendPromise;
			this.notificationSent(this._type, params);
		};
		if (this.matches(data)) {
			const middleware = this._middleware();
			return middleware ? middleware(data, (data) => doSend(data)) : doSend(data);
		}
	}

	private matches(data: E): boolean {
		if (this._client.hasDedicatedTextSynchronizationFeature(this._textDocument(data))) {
			return false;
		}
		return !this._selectorFilter || this._selectorFilter(this._selectors.values(), data);
	}

	public get onNotificationSent(): VEvent<NotificationSendEvent<P>> {
		return this._onNotificationSent.event;
	}

	protected notificationSending(_type: ProtocolNotificationType<P, TextDocumentRegistrationOptions>, _sendPromise: Promise<void>): void {
	}

	protected notificationSent(type: ProtocolNotificationType<P, TextDocumentRegistrationOptions>, params: P): void {
		this._onNotificationSent.fire({ type, params });
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
		this._onNotificationSent.dispose();
		if (this._listener) {
			this._listener.dispose();
			this._listener = undefined;
		}
	}

	public getProvider(document: TextDocument):  { send: (data: E) => Promise<void> } | undefined {
		for (const selector of this._selectors.values()) {
			if (Languages.match(selector, document) > 0) {
				return {
					send: (data: E) => {
						return this.callback(data);
					}
				};
			}
		}
		return undefined;
	}
}

type TextDocumentFeatureRegistration<RO, PR> = {
	disposable: Disposable;
	data: RegistrationData<RO>;
	provider: PR;
};

/**
 * A mixin type to access a provider that is registered for a
 * given text document / document selector.
 */
export interface TextDocumentProviderFeature<T> {
	/**
	 * Triggers the corresponding RPC method.
	 */
	getProvider(textDocument: TextDocument): T | undefined;
}

export type DocumentSelectorOptions = {
	documentSelector: DocumentSelector;
};

/**
 * A abstract feature implementation that registers language providers
 * for text documents using a given document selector.
 */
export abstract class TextDocumentLanguageFeature<PO, RO extends TextDocumentRegistrationOptions & PO, PR, MW, CO = object> extends DynamicDocumentFeature<RO, MW, CO> {

	private readonly _registrationType: RegistrationType<RO>;
	private readonly _registrations: Map<string, TextDocumentFeatureRegistration<RO, PR>>;

	constructor(client: FeatureClient<MW, CO>, registrationType: RegistrationType<RO>) {
		super(client);
		this._registrationType = registrationType;
		this._registrations =  new Map();
	}

	protected *getDocumentSelectors(): IterableIterator<VDocumentSelector> {
		for (const registration of this._registrations.values()) {
			const selector = registration.data.registerOptions.documentSelector;
			if (selector === null) {
				continue;
			}
			yield this._client.protocol2CodeConverter.asDocumentSelector(selector);
		}
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
		let registration = this.registerLanguageProvider(data.registerOptions, data.id);
		this._registrations.set(data.id, { disposable: registration[0], data, provider: registration[1] });
	}

	protected abstract registerLanguageProvider(options: RO, id: string): [Disposable, PR];

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
			if (selector !== null && Languages.match(this._client.protocol2CodeConverter.asDocumentSelector(selector), textDocument) > 0) {
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

type WorkspaceFeatureRegistration<PR> = {
	disposable: Disposable;
	provider: PR;
};

export abstract class WorkspaceFeature<RO, PR, M> implements DynamicFeature<RO> {

	protected readonly _client: FeatureClient<M>;
	private readonly _registrationType: RegistrationType<RO>;
	protected readonly _registrations: Map<string, WorkspaceFeatureRegistration<PR>>;

	constructor(client: FeatureClient<M>, registrationType: RegistrationType<RO>) {
		this._client = client;
		this._registrationType = registrationType;
		this._registrations = new Map();
	}

	public getState(): FeatureState {
		const registrations = this._registrations.size > 0;
		return { kind: 'workspace', id: this._registrationType.method, registrations };
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

export interface DedicatedTextSynchronizationFeature {
	handles(textDocument: TextDocument): boolean;
}

// Features can refer to other feature when implementing themselves.
// Hence the feature client needs to provide access to them. To
// avoid cyclic dependencies these import MUST ALL be type imports.
import type { SemanticTokensProviderShape } from './semanticTokens';
import type { DidChangeTextDocumentFeatureShape, DidCloseTextDocumentFeatureShape, DidOpenTextDocumentFeatureShape, DidSaveTextDocumentFeatureShape } from './textSynchronization';
import type { CodeLensProviderShape } from './codeLens';
import type { InlineValueProviderShape } from './inlineValue';
import type { InlayHintsProviderShape } from './inlayHint';
import type { DiagnosticProviderShape } from './diagnostic';
import type { NotebookDocumentProviderShape } from './notebook';

export interface FeatureClient<M, CO = object> {

	protocol2CodeConverter: p2c.Converter;
	code2ProtocolConverter: c2p.Converter;

	clientOptions: CO;
	middleware: M;

	start(): Promise<void>;
	isRunning(): boolean;
	stop(): Promise<void>;

	sendRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, token?: CancellationToken): Promise<R>;
	sendRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, params: P, token?: CancellationToken): Promise<R>;
	sendRequest<R, E>(type: RequestType0<R, E>, token?: CancellationToken): Promise<R>;
	sendRequest<P, R, E>(type: RequestType<P, R, E>, params: P, token?: CancellationToken): Promise<R>;
	sendRequest<R>(method: string, token?: CancellationToken): Promise<R>;
	sendRequest<R>(method: string, param: any, token?: CancellationToken): Promise<R>;

	onRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, handler: RequestHandler0<R, E>): Disposable;
	onRequest<P, R, PR, E, RO>(type: ProtocolRequestType<P, R, PR, E, RO>, handler: RequestHandler<P, R, E>): Disposable;
	onRequest<R, E>(type: RequestType0<R, E>, handler: RequestHandler0<R, E>): Disposable;
	onRequest<P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): Disposable;
	onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): Disposable;

	sendNotification<RO>(type: ProtocolNotificationType0<RO>): Promise<void>;
	sendNotification<P, RO>(type: ProtocolNotificationType<P, RO>, params?: P): Promise<void>;
	sendNotification(type: NotificationType0): Promise<void>;
	sendNotification<P>(type: NotificationType<P>, params?: P): Promise<void>;
	sendNotification(method: string): Promise<void>;
	sendNotification(method: string, params: any): Promise<void>;

	onNotification<RO>(type: ProtocolNotificationType0<RO>, handler: NotificationHandler0): Disposable;
	onNotification<P, RO>(type: ProtocolNotificationType<P, RO>, handler: NotificationHandler<P>): Disposable;
	onNotification(type: NotificationType0, handler: NotificationHandler0): Disposable;
	onNotification<P>(type: NotificationType<P>, handler: NotificationHandler<P>): Disposable;
	onNotification(method: string, handler: GenericNotificationHandler): Disposable;

	onProgress<P>(type: ProgressType<P>, token: string | number, handler: NotificationHandler<P>): Disposable;

	info(message: string, data?: any, showNotification?: boolean): void;
	warn(message: string, data?: any, showNotification?: boolean): void;
	error(message: string, data?: any, showNotification?: boolean | 'force'): void;

	handleFailedRequest<T>(type: MessageSignature, token: CancellationToken | undefined, error: any, defaultValue: T, showNotification?: boolean): T;

	hasDedicatedTextSynchronizationFeature(textDocument: TextDocument): boolean;

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
	getFeature(request: typeof FoldingRangeRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<FoldingRangeProvider>;
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
	getFeature(request: typeof DocumentDiagnosticRequest.method): DynamicFeature<TextDocumentRegistrationOptions> & TextDocumentProviderFeature<DiagnosticProviderShape> | undefined;
	getFeature(request: typeof NotebookDocumentSyncRegistrationType.method): DynamicFeature<NotebookDocumentSyncRegistrationOptions> & NotebookDocumentProviderShape | undefined;
}