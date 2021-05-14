/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	Disposable, languages as Languages, window as Window, workspace as Workspace, CancellationToken, ProviderResult,
	Diagnostic as VDiagnostic, CancellationTokenSource, TextDocument, CancellationError, Event as VEvent, EventEmitter, DiagnosticCollection, Uri
} from 'vscode';

import {
	Proposed, ClientCapabilities, ServerCapabilities, DocumentSelector, DidOpenTextDocumentNotification, DidChangeTextDocumentNotification,
	DidSaveTextDocumentNotification, DidCloseTextDocumentNotification, LinkedMap, Touch, RAL, VersionedTextDocumentIdentifier
} from 'vscode-languageserver-protocol';

import {
	TextDocumentFeature, BaseLanguageClient, Middleware, LSPCancellationError, DiagnosticPullMode
} from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

namespace vscode {
	export enum DocumentDiagnosticReportKind {
		full = 'full',
		unChanged = 'unChanged'
	}

	export interface FullDocumentDiagnosticReport {
		kind: DocumentDiagnosticReportKind.full;
		resultId?: string;
		items: VDiagnostic[];
	}

	export interface RelatedFullDocumentDiagnosticReport extends FullDocumentDiagnosticReport {
		relatedDocuments?: {
			[uri: string /** DocumentUri */]: FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport;
		}
	}

	export interface UnchangedDocumentDiagnosticReport {
		kind: DocumentDiagnosticReportKind.unChanged;
		resultId: string;
	}

	export interface RelatedUnchangedDocumentDiagnosticReport extends UnchangedDocumentDiagnosticReport {
		relatedDocuments?: {
			[uri: string /** DocumentUri */]: FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport;
		}
	}
	export type DocumentDiagnosticReport = RelatedFullDocumentDiagnosticReport | RelatedUnchangedDocumentDiagnosticReport;

	export interface DiagnosticProvider {
		onDidChangeDiagnostics: VEvent<void>;
		provideDiagnostics (textDocument: TextDocument, previousResultId: string | undefined, token: CancellationToken): ProviderResult<DocumentDiagnosticReport>;
	}
}

export interface ProvideDiagnosticSignature {
	(this: void, textDocument: TextDocument, previousResultId: string | undefined, token: CancellationToken): ProviderResult<vscode.DocumentDiagnosticReport>;
}

export interface DiagnosticProviderMiddleware {
	provideDiagnostics?: (this: void, document: TextDocument, previousResultId: string | undefined, token: CancellationToken, next: ProvideDiagnosticSignature) => ProviderResult<vscode.DocumentDiagnosticReport>;
}

enum RequestStateKind {
	active = 'open',
	reschedule = 'reschedule',
	outDated = 'drop'
}

type RequestState = {
	state: RequestStateKind.active;
	version: number;
	textDocument: TextDocument;
	tokenSource: CancellationTokenSource;
} | {
	state: RequestStateKind.reschedule;
	textDocument: TextDocument;
} | {
	state: RequestStateKind.outDated;
	textDocument: TextDocument;
};

class EditorTracker  {

	private readonly open: Set<string>;
	private readonly disposable: Disposable;

	constructor() {
		this.open = new Set();
		const openEditorsHandler = () => {
			this.open.clear();
			for (const info of Window.openEditors) {
				this.open.add(info.resource.toString());
			}
		};
		openEditorsHandler();
		this.disposable = Window.onDidChangeOpenEditors(openEditorsHandler);
	}

	public dispose(): void {
		this.disposable.dispose();
	}

	public isActive(textDocument: TextDocument): boolean {
		return Window.activeTextEditor?.document === textDocument;
	}

	public isVisible(textDocument: TextDocument): boolean {
		return this.open.has(textDocument.uri.toString());
	}
}

interface DocumentPullState {
	document: Uri;
	pulledVersion: number | undefined;
	resultId: string | undefined;
}

class DocumentPullStateTracker {

	private readonly states: Map<string, DocumentPullState>;

	constructor() {
		this.states = new Map();
	}

	public track(textDocument: TextDocument, resultId?: string): DocumentPullState;
	public track(uri: string, version?: number, resultId?: string): DocumentPullState;
	public track(document: TextDocument | string, arg1?: string | number, arg2?: string): DocumentPullState {
		const [key, uri, version, resultId] = typeof document === 'string'
			? [document, Uri.parse(document), arg1 as number, arg2]
			: [document.uri.toString(), document.uri, document.version, arg1 as string];
		let state = this.states.get(key);
		if (state === undefined) {
			state = { document: uri, pulledVersion: version, resultId };
			this.states.set(key, state);
		} else {
			state.pulledVersion = version;
			state.resultId = resultId;
		}
		return state;
	}

	public unTrack(textDocument: TextDocument): void {
		this.states.delete(textDocument.uri.toString());
	}

	public tracks(textDocument: TextDocument): boolean;
	public tracks(uri: string): boolean;
	public tracks(document: TextDocument | string): boolean {
		const key = typeof document === 'string' ? document : document.uri.toString();
		return this.states.has(key);
	}

	public getResultId(textDocument: TextDocument): string | undefined {
		return this.states.get(textDocument.uri.toString())?.resultId;
	}

	public getAllResultIds(): Proposed.PreviousResultId[] {
		const result: Proposed.PreviousResultId[] = [];
		for (const [uri, value] of this.states) {
			if (value.resultId !== undefined) {
				result.push({ uri, value: value.resultId });
			}
		}
		return result;
	}
}

class DiagnosticRequestor {

	private readonly client: BaseLanguageClient;
	private readonly editorTracker: EditorTracker;
	private readonly options: Proposed.DiagnosticRegistrationOptions;

	public readonly onDidChangeDiagnosticsEmitter: EventEmitter<void>;
	public readonly provider: vscode.DiagnosticProvider;
	private readonly diagnostics: DiagnosticCollection;
	private readonly openRequests: Map<string, RequestState>;
	private readonly documentStates: DocumentPullStateTracker;

	public constructor(client: BaseLanguageClient, editorTracker: EditorTracker, options: Proposed.DiagnosticRegistrationOptions) {
		this.client = client;
		this.editorTracker = editorTracker;
		this.options = options;
		this.onDidChangeDiagnosticsEmitter = new EventEmitter<void>();
		this.provider = this.createProvider();

		this.diagnostics = Languages.createDiagnosticCollection(options.identifier);
		this.openRequests = new Map();
		this.documentStates = new DocumentPullStateTracker();
	}

	public knows(textDocument: TextDocument): boolean {
		return this.documentStates.tracks(textDocument);
	}

	public async pull(textDocument: TextDocument): Promise<void> {
		const key = textDocument.uri.toString();
		const currentRequestState = this.openRequests.get(key);
		const documentState = this.documentStates.track(textDocument);
		if (currentRequestState === undefined) {
			const tokenSource = new CancellationTokenSource();
			this.openRequests.set(key, { state: RequestStateKind.active, version: textDocument.version, textDocument, tokenSource });
			let report: vscode.DocumentDiagnosticReport | undefined;
			let afterState: RequestState | undefined;
			try {
				report = await this.provider.provideDiagnostics(textDocument, this.documentStates.getResultId(textDocument), tokenSource.token) ?? { kind: vscode.DocumentDiagnosticReportKind.full, items: [] };
			} catch (error) {
				if (error instanceof LSPCancellationError && Proposed.DiagnosticServerCancellationData.is(error.data) && error.data.retriggerRequest === false) {
					afterState = { state: RequestStateKind.outDated, textDocument };
				}
				if (afterState === undefined && error instanceof CancellationError) {
					afterState = { state: RequestStateKind.reschedule, textDocument };
				} else {
					throw error;
				}
			}
			afterState = afterState ?? this.openRequests.get(key);
			if (afterState === undefined) {
				// This shouldn't happen. Log it
				this.client.error(`Lost request state in diagnostic pull model. Clearing diagnostics for ${key}`);
				this.diagnostics.delete(textDocument.uri);
				return;
			}
			this.openRequests.delete(key);
			if (!this.editorTracker.isVisible(textDocument)) {
				this.documentStates.unTrack(textDocument);
				return;
			}
			if (afterState.state === RequestStateKind.outDated) {
				return;
			}
			// report is only undefined if the request has thrown.
			if (report !== undefined) {
				if (report.kind === vscode.DocumentDiagnosticReportKind.full) {
					this.diagnostics.set(textDocument.uri, report.items);
				}
				documentState.resultId = report.resultId;
			}
			if (afterState.state === RequestStateKind.reschedule) {
				this.pull(textDocument);
			}
		} else {
			if (currentRequestState.state === RequestStateKind.active) {
				// Cancel the current request and reschedule a new one when the old one returned.
				currentRequestState.tokenSource.cancel();
				this.openRequests.set(key, { state: RequestStateKind.reschedule, textDocument: currentRequestState.textDocument });
			} else if (currentRequestState.state === RequestStateKind.outDated) {
				this.openRequests.set(key, { state: RequestStateKind.reschedule, textDocument: currentRequestState.textDocument });
			}
		}
	}

	public cleanupPull(textDocument: TextDocument): void {
		const key = textDocument.uri.toString();
		const request = this.openRequests.get(key);
		if (this.options.workspaceDiagnostics || this.options.interFileDependencies) {
			if (request !== undefined) {
				this.openRequests.set(key, { state: RequestStateKind.reschedule, textDocument: textDocument });
			} else {
				this.pull(textDocument);
			}
		} else {
			if (request !== undefined) {
				if (request.state === RequestStateKind.active) {
					request.tokenSource.cancel();
				}
				this.openRequests.set(key, { state: RequestStateKind.outDated, textDocument: textDocument });
			}
			this.diagnostics.delete(textDocument.uri);
		}
	}

	private createProvider(): vscode.DiagnosticProvider {
		return {
			onDidChangeDiagnostics: this.onDidChangeDiagnosticsEmitter.event,
			provideDiagnostics: (textDocument, previousResultId, token) => {
				const provideDiagnostics: ProvideDiagnosticSignature = (textDocument, previousResultId, token) => {
					const params: Proposed.DocumentDiagnosticParams = {
						textDocument: { uri: this.client.code2ProtocolConverter.asUri(textDocument.uri) },
						previousResultId: previousResultId
					};
					return this.client.sendRequest(Proposed.DocumentDiagnosticRequest.type, params, token).then((result) => {
						if (result === undefined || result === null) {
							return { kind: vscode.DocumentDiagnosticReportKind.full, items: [] };
						}
						if (result.kind === Proposed.DocumentDiagnosticReportKind.full) {
							return { kind: vscode.DocumentDiagnosticReportKind.full, resultId: result.resultId, items: this.client.protocol2CodeConverter.asDiagnostics(result.items) };
						} else {
							return { kind: vscode.DocumentDiagnosticReportKind.unChanged, resultId: result.resultId };
						}
					}, (error) => {
						return this.client.handleFailedRequest(Proposed.DocumentDiagnosticRequest.type, token, error, { kind: vscode.DocumentDiagnosticReportKind.full, items: [] });
					});
				};
				const middleware: Middleware & DiagnosticProviderMiddleware = this.client.clientOptions.middleware!;
				return middleware.provideDiagnostics
					? middleware.provideDiagnostics(textDocument, previousResultId, token, provideDiagnostics)
					: provideDiagnostics(textDocument, previousResultId, token);
			}
		};
	}
}

export interface DiagnosticFeatureProvider {
	onDidChangeDiagnosticsEmitter: EventEmitter<void>;
	provider: vscode.DiagnosticProvider;
}

class BackgroundScheduler {

	private readonly diagnosticRequestor: DiagnosticRequestor;
	private endDocument: TextDocument | undefined;
	private readonly documents: LinkedMap<string, TextDocument>;
	private interval: number;
	private intervalHandle: Disposable | undefined;

	public constructor(diagnosticRequestor: DiagnosticRequestor) {
		this.diagnosticRequestor = diagnosticRequestor;
		this.documents = new LinkedMap();
		this.interval = 0;
	}

	public add(textDocument: TextDocument): void {
		const key = textDocument.uri.toString();
		if (this.documents.has(key)) {
			return;
		}
		this.documents.set(textDocument.uri.toString(), textDocument, Touch.Last);
		this.trigger();
	}

	public remove(textDocument: TextDocument): void {
		const key = textDocument.uri.toString();
		if (this.documents.has(key)) {
			this.documents.delete(key);
			// Do a last pull
			this.diagnosticRequestor.pull(textDocument);
		}
		// No more documents. Stop background activity.
		if (this.documents.size === 0) {
			this.stop();
		} else if (textDocument === this.endDocument) {
			// Make sure we have a correct last document. It could have
			this.endDocument = this.documents.last;
		}
	}

	public trigger(): void {
		// We have a round running. So simply make sure we run up to the
		// last document
		if (this.intervalHandle !== undefined) {
			this.endDocument = this.documents.last;
			return;
		}
		this.endDocument = this.documents.last;
		this.intervalHandle = RAL().timer.setInterval(() => {
			const document = this.documents.first;
			if (document !== undefined) {
				this.diagnosticRequestor.pull(document);
				this.documents.set(document.uri.toString(), document, Touch.Last);
				if (document === this.endDocument) {
					this.stop();
				}
			}
		}, 200);
	}

	private stop(): void {
		this.intervalHandle?.dispose();
		this.intervalHandle = undefined;
		this.endDocument = undefined;
	}
}

class DiagnosticFeatureProviderImpl implements DiagnosticFeatureProvider {

	public readonly disposable: Disposable;
	private readonly diagnosticRequestor: DiagnosticRequestor;
	private activeTextDocument: TextDocument | undefined;
	private readonly backgroundScheduler: BackgroundScheduler;

	constructor(client: BaseLanguageClient, editorTracker: EditorTracker, options: Proposed.DiagnosticRegistrationOptions) {
		const diagnosticPullOptions = client.clientOptions.diagnosticPullOptions ?? { onChange: true, onSave: false };
		const documentSelector = options.documentSelector!;
		const disposables: Disposable[] = [];

		const matches = (textDocument: TextDocument): boolean => {
			return Languages.match(documentSelector, textDocument) > 0 && editorTracker.isVisible(textDocument);
		};

		this.diagnosticRequestor = new DiagnosticRequestor(client, editorTracker, options);
		this.backgroundScheduler = new BackgroundScheduler(this.diagnosticRequestor);

		const addToBackgroundIfNeeded = (textDocument: TextDocument): void => {
			if (!matches(textDocument) || !options.interFileDependencies || this.activeTextDocument === textDocument) {
				return;
			}
			this.backgroundScheduler.add(textDocument);
		};

		this.activeTextDocument = Window.activeTextEditor?.document;
		Window.onDidChangeActiveTextEditor((editor) => {
			const oldActive = this.activeTextDocument;
			this.activeTextDocument = editor?.document;
			if (oldActive !== undefined) {
				addToBackgroundIfNeeded(oldActive);
			}
			if (this.activeTextDocument !== undefined) {
				this.backgroundScheduler.remove(this.activeTextDocument);
			}
		});

		// We always pull on open.
		const openFeature = client.getFeature(DidOpenTextDocumentNotification.method);
		disposables.push(openFeature.onNotificationSent((event) => {
			const textDocument = event.original;
			if (matches(textDocument)) {
				this.diagnosticRequestor.pull(textDocument).then(() => {
					addToBackgroundIfNeeded(textDocument);
				});
			}
		}));

		// Pull all diagnostics for documents that are already open
		for (const textDocument of Workspace.textDocuments) {
			if (matches(textDocument)) {
				this.diagnosticRequestor.pull(textDocument).then(() => {
					addToBackgroundIfNeeded(textDocument);
				});
			}
		}

		if (diagnosticPullOptions.onChange) {
			const changeFeature = client.getFeature(DidChangeTextDocumentNotification.method);
			disposables.push(changeFeature.onNotificationSent(async (event) => {
				const textDocument = event.original.document;
				if ((diagnosticPullOptions.filter === undefined || !diagnosticPullOptions.filter(textDocument, DiagnosticPullMode.onType)) && this.diagnosticRequestor.knows(textDocument) && event.original.contentChanges.length > 0) {
					this.diagnosticRequestor.pull(textDocument).then(() => {
						this.backgroundScheduler.trigger();
					});
				}
			}));
		}

		if (diagnosticPullOptions.onSave) {
			const saveFeature = client.getFeature(DidSaveTextDocumentNotification.method);
			disposables.push(saveFeature.onNotificationSent((event) => {
				const textDocument = event.original;
				if ((diagnosticPullOptions.filter === undefined || !diagnosticPullOptions.filter(textDocument, DiagnosticPullMode.onSave)) && this.diagnosticRequestor.knows(textDocument)) {
					this.diagnosticRequestor.pull(event.original).then(() => {
						this.backgroundScheduler.trigger();
					});
				}
			}));
		}

		// When the document closes clear things up
		const closeFeature = client.getFeature(DidCloseTextDocumentNotification.method);
		disposables.push(closeFeature.onNotificationSent((event) => {
			const textDocument = event.original;
			this.diagnosticRequestor.cleanupPull(textDocument);
			this.backgroundScheduler.remove(textDocument);
		}));

		// We received a did change from the server.
		this.diagnosticRequestor.onDidChangeDiagnosticsEmitter.event(() => {
			for (const textDocument of Workspace.textDocuments) {
				if (matches(textDocument)) {
					this.diagnosticRequestor.pull(textDocument);
				}
			}
		});

		this.disposable = Disposable.from(...disposables);
	}

	public get onDidChangeDiagnosticsEmitter(): EventEmitter<void> {
		return this.diagnosticRequestor.onDidChangeDiagnosticsEmitter;
	}

	public get provider(): vscode.DiagnosticProvider {
		return this.diagnosticRequestor.provider;
	}
}

export class DiagnosticFeature extends TextDocumentFeature<Proposed.DiagnosticOptions, Proposed.DiagnosticRegistrationOptions, DiagnosticFeatureProvider> {

	private readonly editorTracker: EditorTracker;

	constructor(client: BaseLanguageClient) {
		super(client, Proposed.DocumentDiagnosticRequest.type);
		this.editorTracker = new EditorTracker();
	}

	public fillClientCapabilities(capabilities: ClientCapabilities & Proposed.$DiagnosticClientCapabilities): void {
		let capability = ensure(ensure(capabilities, 'textDocument')!, 'diagnostic')!;
		capability.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities & Proposed.$DiagnosticServerCapabilities, documentSelector: DocumentSelector): void {
		const client = this._client;
		client.onRequest(Proposed.DiagnosticRefreshRequest.type, async () => {
			for (const provider of this.getAllProviders()) {
				provider.onDidChangeDiagnosticsEmitter.fire();
			}
		});
		let [id, options] = this.getRegistration(documentSelector, capabilities.diagnosticProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	public dispose(): void {
		this.editorTracker.dispose();
		super.dispose();
	}

	protected registerLanguageProvider(options: Proposed.DiagnosticRegistrationOptions): [Disposable, DiagnosticFeatureProvider] {
		const provider = new DiagnosticFeatureProviderImpl(this._client, this.editorTracker, options);
		return [provider.disposable, provider];
	}
}