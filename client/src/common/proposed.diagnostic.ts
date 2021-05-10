/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	Disposable, languages as Languages, window as Window, CancellationToken, ProviderResult,
	Diagnostic as VDiagnostic, CancellationTokenSource, TextDocument, CancellationError, Event as VEvent, EventEmitter, DiagnosticCollection, Uri
} from 'vscode';

import {
	Proposed, ClientCapabilities, ServerCapabilities, DocumentSelector, DidOpenTextDocumentNotification, DidChangeTextDocumentNotification,
	DidSaveTextDocumentNotification, DidCloseTextDocumentNotification
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

class DiagnosticScheduler {

	private readonly client: BaseLanguageClient;
	private readonly editorTracker: EditorTracker;
	public readonly onDidChangeDiagnosticsEmitter: EventEmitter<void>;
	public readonly provider: vscode.DiagnosticProvider;

	private readonly diagnostics: DiagnosticCollection;
	private readonly openRequests: Map<string, RequestState>;
	private readonly documentStates: DocumentPullStateTracker;

	public constructor(client: BaseLanguageClient, editorTracker: EditorTracker, options: Proposed.DiagnosticRegistrationOptions) {
		this.client = client;
		this.editorTracker = editorTracker;
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
			if (afterState.state === RequestStateKind.outDated || !this.editorTracker.isVisible(textDocument)) {
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

class DiagnosticFeatureProviderImpl implements DiagnosticFeatureProvider {

	public readonly disposable: Disposable;
	private readonly scheduler: DiagnosticScheduler;

	constructor(client: BaseLanguageClient, editorTracker: EditorTracker, options: Proposed.DiagnosticRegistrationOptions) {
		const diagnosticPullOptions = client.clientOptions.diagnosticPullOptions ?? { onType: true, onSave: false };
		const documentSelector = options.documentSelector!;
		const disposables: Disposable[] = [];

		const matches = (textDocument: TextDocument): boolean => {
			return Languages.match(documentSelector, textDocument) > 0 && editorTracker.isVisible(textDocument);
		};


		this.scheduler = new DiagnosticScheduler(client, editorTracker, options);

		// We always pull on open.
		const openFeature = client.getFeature(DidOpenTextDocumentNotification.method);
		disposables.push(openFeature.onNotificationSent((event) => {
			const textDocument = event.original;
			if (matches(textDocument)) {
				this.scheduler.pull(textDocument);
			}
		}));

		// Pull all diagnostics for documents that are already open
		for (const textDocument of openFeature.openDocuments) {
			if (matches(textDocument)) {
				this.scheduler.pull(textDocument);
			}
		}

		if (diagnosticPullOptions.onType) {
			const changeFeature = client.getFeature(DidChangeTextDocumentNotification.method);
			disposables.push(changeFeature.onNotificationSent((event) => {
				const textDocument = event.original.document;
				if ((diagnosticPullOptions.filter === undefined || !diagnosticPullOptions.filter(textDocument, DiagnosticPullMode.onType)) && this.scheduler.knows(textDocument) && event.original.contentChanges.length > 0) {
					this.scheduler.pull(textDocument);
				}
			}));
		}

		if (diagnosticPullOptions.onSave) {
			const saveFeature = client.getFeature(DidSaveTextDocumentNotification.method);
			disposables.push(saveFeature.onNotificationSent((event) => {
				const textDocument = event.original;
				if ((diagnosticPullOptions.filter === undefined || !diagnosticPullOptions.filter(textDocument, DiagnosticPullMode.onSave)) && this.scheduler.knows(textDocument)) {
					this.scheduler.pull(event.original);
				}
			}));
		}

		// When the document closes clear things up
		const closeFeature = client.getFeature(DidCloseTextDocumentNotification.method);
		disposables.push(closeFeature.onNotificationSent((event) => {
			const textDocument = event.original;
			if (!this.scheduler.knows(textDocument)) {
				return;
			}
			const key = textDocument.uri.toString();
			const requestState = requestStates.get(textDocument.uri.toString());
			if (options.workspaceDiagnostics || options.interFileDependencies) {
				// Schedule a last request so that we show accurate information for closed documents
				// so that a workspace provider can from now on take over.
				if (requestState !== undefined) {
					requestStates.set(key, { state: RequestStateKind.reschedule, textDocument });
				} else {
					pullDiagnostics(textDocument);
				}
			} else {
				if (requestState !== undefined) {
					requestStates.set(textDocument.uri.toString(),{ state: RequestStateKind.outDated, textDocument });
				}
				collection.delete(textDocument.uri);
			}
			managedDocuments.delete(textDocument.uri.toString());
		}));
		this.onDidChangeDiagnosticsEmitter.event(() => {
			for (const item of managedDocuments.values()) {
				pullDiagnostics(item.document);
			}
		});

		this.disposable = Disposable.from(...disposables);
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
		const provider = new DiagnosticFeatureProviderImpl(this._client, options);
		return [provider.disposable, provider];
	}
}