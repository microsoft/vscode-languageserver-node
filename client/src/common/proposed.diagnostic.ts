/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	Disposable, languages as Languages, window as Window, CancellationToken, ProviderResult,
	Diagnostic as VDiagnostic, CancellationTokenSource, TextDocument, CancellationError, Event as VEvent, EventEmitter, DiagnosticCollection
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
		provideDiagnostics (textDocument: TextDocument, previousResultId: string, token: CancellationToken): ProviderResult<DocumentDiagnosticReport>;
	}
}

export interface ProvideDiagnosticSignature {
	(this: void, textDocument: TextDocument, token: CancellationToken): ProviderResult<vscode.DocumentDiagnosticReport>;
}

export interface DiagnosticProviderMiddleware {
	provideDiagnostics?: (this: void, document: TextDocument, token: CancellationToken, next: ProvideDiagnosticSignature) => ProviderResult<vscode.DocumentDiagnosticReport>;
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

	public manages(textDocument: TextDocument): boolean {
		return this.open.has(textDocument.uri.toString());
	}
}

class DocumentDiagnosticScheduler {

	private readonly client: BaseLanguageClient;
	private readonly editorTracker: EditorTracker;
	private readonly provider: vscode.DiagnosticProvider;
	private readonly options: Proposed.DiagnosticRegistrationOptions;

	private readonly diagnostics: DiagnosticCollection;
	private readonly openRequests: Map<string, RequestState>;

	public constructor(client: BaseLanguageClient, editorTracker: EditorTracker, provider: vscode.DiagnosticProvider, options: Proposed.DiagnosticRegistrationOptions) {
		this.client = client;
		this.editorTracker = editorTracker;
		this.provider = provider;
		this.options = options;

		this.diagnostics = Languages.createDiagnosticCollection(options.identifier);
		this.openRequests = new Map();
	}

	public async pull(textDocument: TextDocument): Promise<void> {
		const key = textDocument.uri.toString();
		const currentRequestState = this.openRequests.get(key);
		if (currentRequestState === undefined) {
			const tokenSource = new CancellationTokenSource();
			this.openRequests.set(key, { state: RequestStateKind.active, version: textDocument.version, textDocument, tokenSource });
			let report: vscode.DocumentDiagnosticReport | undefined;
			let afterState: RequestState | undefined;
			try {
				report = await this.provider.provideDiagnostics(textDocument,  tokenSource.token) ?? { kind: vscode.DocumentDiagnosticReportKind.full, items: [] };
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
			if (afterState.state === RequestStateKind.outDated || !this.editorTracker.manages(textDocument)) {
				return;
			}
			// report is only undefined if the request has thrown.
			if (report !== undefined) {
				if (report.kind === vscode.DocumentDiagnosticReportKind.full) {
					this.diagnostics.set(textDocument.uri, report.items);
				}
				if (report.resultId !== undefined) {
					const info = managedDocuments.get(key);
					if (info !== undefined) {
						info.resultId = report.resultId;
					}
				}
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
}



interface DocumentPullState {
	document: TextDocument;
	pulledVersion: number | undefined;
	resultId: string | undefined;
}

export interface DiagnosticFeatureProvider {
	onDidChangeDiagnosticsEmitter: EventEmitter<void>;
	provider: DiagnosticProvider;
}

class DiagnosticFeatureProviderImpl implements DiagnosticFeatureProvider {

	public readonly onDidChangeDiagnosticsEmitter: EventEmitter<void>;
	public readonly provider: DiagnosticProvider;
	public readonly disposable: Disposable;

	constructor(client: BaseLanguageClient, options: Proposed.DiagnosticRegistrationOptions) {
		const diagnosticPullOptions = client.clientOptions.diagnosticPullOptions ?? { onType: true, onSave: false };
		const documentSelector = options.documentSelector!;
		const disposables: Disposable[] = [];
		const collection = Languages.createDiagnosticCollection(options.identifier);
		disposables.push(collection);
		const availableEditors: Set<string> = new Set();
		const managedDocuments: Map<string, DocumentPullState> = new Map();

		const matches = (textDocument: TextDocument): boolean => {
			return Languages.match(documentSelector, textDocument) > 0 && availableEditors.has(textDocument.uri.toString());
		};

		const manages = (textDocument: TextDocument): boolean => {
			return managedDocuments.has(textDocument.uri.toString());
		};

		this.onDidChangeDiagnosticsEmitter = new EventEmitter<void>();
		this.provider = {
			onDidChangeDiagnostics: this.onDidChangeDiagnosticsEmitter.event,
			provideDiagnostics: (textDocument, token) => {
				const provideDiagnostics: ProvideDiagnosticSignature = (textDocument, token) => {
					const key = textDocument.uri.toString();
					const params: Proposed.DocumentDiagnosticParams = {
						textDocument: { uri: client.code2ProtocolConverter.asUri(textDocument.uri) },
						previousResultId: managedDocuments.get(key)?.resultId
					};
					return client.sendRequest(Proposed.DocumentDiagnosticRequest.type, params, token).then((result) => {
						if (result === undefined || result === null) {
							return { kind: vscode.DocumentDiagnosticReportKind.full, items: [] };
						}
						if (result.kind === Proposed.DocumentDiagnosticReportKind.full) {
							return { kind: vscode.DocumentDiagnosticReportKind.full, resultId: result.resultId, items: client.protocol2CodeConverter.asDiagnostics(result.items) };
						} else {
							return { kind: vscode.DocumentDiagnosticReportKind.unChanged, resultId: result.resultId };
						}
					}, (error) => {
						return client.handleFailedRequest(Proposed.DocumentDiagnosticRequest.type, token, error, { kind: vscode.DocumentDiagnosticReportKind.full, items: [] });
					});
				};
				const middleware: Middleware & DiagnosticProviderMiddleware = client.clientOptions.middleware!;
				return middleware.provideDiagnostics
					? middleware.provideDiagnostics(textDocument, token, provideDiagnostics)
					: provideDiagnostics(textDocument, token);
			}
		};

		const requestStates: Map<string, RequestState> = new Map();
		const pullDiagnostics = async (textDocument: TextDocument): Promise<void> => {
			const key = textDocument.uri.toString();
			const currentState = requestStates.get(key);
			if (currentState !== undefined) {
				if (currentState.state === RequestStateKind.active) {
					currentState.tokenSource.cancel();
				}
				requestStates.set(key, { state: RequestStateKind.reschedule, textDocument });
				// We have a state. Wait until the request returns.
				return;
			}
			const tokenSource = new CancellationTokenSource();
			requestStates.set(key, { state: RequestStateKind.active, version: textDocument.version, textDocument, tokenSource });
			let diagnosticReport: vscode.DocumentDiagnosticReport | undefined;
			let afterState: RequestState | undefined;
			try {
				diagnosticReport = await this.provider.provideDiagnostics(textDocument, tokenSource.token) ?? { kind: vscode.DocumentDiagnosticReportKind.full, items: [] };
			} catch (error: unknown) {
				if (error instanceof LSPCancellationError && Proposed.DiagnosticServerCancellationData.is(error.data) && error.data.retriggerRequest === false) {
					afterState = { state: RequestStateKind.outDated, textDocument };
				}
				if (afterState === undefined && error instanceof CancellationError) {
					afterState = { state: RequestStateKind.reschedule, textDocument };
				} else {
					throw error;
				}
			}
			afterState = afterState ?? requestStates.get(key);
			if (afterState === undefined) {
				// This shouldn't happen. Log it
				client.error(`Lost request state in diagnostic pull model. Clearing diagnostics for ${key}`);
				collection.delete(textDocument.uri);
				return;
			}
			requestStates.delete(key);
			if (afterState.state === RequestStateKind.outDated || !manages(textDocument)) {
				return;
			}
			// diagnostics is only undefined if the request has thrown.
			if (diagnosticReport !== undefined) {
				if (diagnosticReport.kind === vscode.DocumentDiagnosticReportKind.full) {
					collection.set(textDocument.uri, diagnosticReport.items);
				}
				if (diagnosticReport.resultId !== undefined) {
					const info = managedDocuments.get(key);
					if (info !== undefined) {
						info.resultId = diagnosticReport.resultId;
					}
				}
			}
			if (afterState.state === RequestStateKind.reschedule) {
				pullDiagnostics(textDocument);
			}
		};

		const openEditorsHandler = () => {
			availableEditors.clear();
			for (const info of Window.openEditors) {
				availableEditors.add(info.resource.toString());
			}
		};
		openEditorsHandler();
		disposables.push(Window.onDidChangeOpenEditors(openEditorsHandler));

		// We always pull on open.
		const openFeature = client.getFeature(DidOpenTextDocumentNotification.method);
		disposables.push(openFeature.onNotificationSent((event) => {
			const textDocument = event.original;
			if (matches(textDocument)) {
				managedDocuments.set(textDocument.uri.toString(), { document: textDocument, pulledVersion: undefined, resultId: undefined });
				pullDiagnostics(event.original);
			}
		}));
		// Pull all diagnostics for documents that are already open
		for (const textDocument of openFeature.openDocuments) {
			if (matches(textDocument)) {
				managedDocuments.set(textDocument.uri.toString(), {document: textDocument, pulledVersion: undefined, resultId: undefined });
				pullDiagnostics(textDocument);
			}
		}

		if (diagnosticPullOptions.onType) {
			const changeFeature = client.getFeature(DidChangeTextDocumentNotification.method);
			disposables.push(changeFeature.onNotificationSent((event) => {
				const textDocument = event.original.document;
				if ((diagnosticPullOptions.filter === undefined || !diagnosticPullOptions.filter(textDocument, DiagnosticPullMode.onType)) && manages(textDocument) && event.original.contentChanges.length > 0) {
					pullDiagnostics(textDocument);
				}
			}));
		}
		if (diagnosticPullOptions.onSave) {
			const saveFeature = client.getFeature(DidSaveTextDocumentNotification.method);
			disposables.push(saveFeature.onNotificationSent((event) => {
				const textDocument = event.original;
				if ((diagnosticPullOptions.filter === undefined || !diagnosticPullOptions.filter(textDocument, DiagnosticPullMode.onSave)) && manages(textDocument)) {
					pullDiagnostics(event.original);
				}
			}));
		}

		// When the document closes clear things up
		const closeFeature = client.getFeature(DidCloseTextDocumentNotification.method);
		disposables.push(closeFeature.onNotificationSent((event) => {
			const textDocument = event.original;
			if (!manages(textDocument)) {
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

	constructor(client: BaseLanguageClient) {
		super(client, Proposed.DocumentDiagnosticRequest.type);
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

	protected registerLanguageProvider(options: Proposed.DiagnosticRegistrationOptions): [Disposable, DiagnosticFeatureProvider] {
		const provider = new DiagnosticFeatureProviderImpl(this._client, options);
		return [provider.disposable, provider];
	}
}