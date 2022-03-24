/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="../../typings/vscode.proposed.tabs.d.ts" />

import {
	Disposable, languages as Languages, window as Window, workspace as Workspace, CancellationToken, ProviderResult,
	Diagnostic as VDiagnostic, CancellationTokenSource, TextDocument, CancellationError, Event as VEvent, EventEmitter, DiagnosticCollection, Uri, TabKindText, TabKindTextDiff
} from 'vscode';

import {
	Proposed, ClientCapabilities, ServerCapabilities, DocumentSelector, DidOpenTextDocumentNotification, DidChangeTextDocumentNotification,
	DidSaveTextDocumentNotification, DidCloseTextDocumentNotification, LinkedMap, Touch, RAL
} from 'vscode-languageserver-protocol';

import { generateUuid } from './utils/uuid';
import {
	TextDocumentFeature, BaseLanguageClient, Middleware, LSPCancellationError, DiagnosticPullMode
} from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export namespace vsdiag {
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
		};
	}

	export interface UnchangedDocumentDiagnosticReport {
		kind: DocumentDiagnosticReportKind.unChanged;
		resultId: string;
	}

	export interface RelatedUnchangedDocumentDiagnosticReport extends UnchangedDocumentDiagnosticReport {
		relatedDocuments?: {
			[uri: string /** DocumentUri */]: FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport;
		};
	}
	export type DocumentDiagnosticReport = RelatedFullDocumentDiagnosticReport | RelatedUnchangedDocumentDiagnosticReport;

	export type PreviousResultId = {
		uri: Uri;
		value: string;
	};


	export interface WorkspaceFullDocumentDiagnosticReport extends FullDocumentDiagnosticReport {
		uri: Uri;
		version: number | null;
	}

	export interface WorkspaceUnchangedDocumentDiagnosticReport extends UnchangedDocumentDiagnosticReport {
		uri: Uri;
		version: number | null;
	}

	export type WorkspaceDocumentDiagnosticReport = WorkspaceFullDocumentDiagnosticReport | WorkspaceUnchangedDocumentDiagnosticReport;

	export interface WorkspaceDiagnosticReport {
		items: WorkspaceDocumentDiagnosticReport[];
	}

	export interface WorkspaceDiagnosticReportPartialResult {
		items: WorkspaceDocumentDiagnosticReport[];
	}

	export interface ResultReporter {
		(chunk: WorkspaceDiagnosticReportPartialResult | null): void;
	}

	export interface DiagnosticProvider {
		onDidChangeDiagnostics: VEvent<void>;
		provideDiagnostics(textDocument: TextDocument, previousResultId: string | undefined, token: CancellationToken): ProviderResult<DocumentDiagnosticReport>;
		provideWorkspaceDiagnostics?(resultIds: PreviousResultId[], token: CancellationToken, resultReporter: ResultReporter): ProviderResult<WorkspaceDiagnosticReport>;
	}
}

export type ProvideDiagnosticSignature =(this: void, textDocument: TextDocument, previousResultId: string | undefined, token: CancellationToken) => ProviderResult<vsdiag.DocumentDiagnosticReport>;

export type ProvideWorkspaceDiagnosticSignature = (this: void, resultIds: vsdiag.PreviousResultId[], token: CancellationToken, resultReporter: vsdiag.ResultReporter) => ProviderResult<vsdiag.WorkspaceDiagnosticReport>;

export type DiagnosticProviderMiddleware = {
	provideDiagnostics?: (this: void, document: TextDocument, previousResultId: string | undefined, token: CancellationToken, next: ProvideDiagnosticSignature) => ProviderResult<vsdiag.DocumentDiagnosticReport>;
	provideWorkspaceDiagnostics?: (this: void, resultIds: vsdiag.PreviousResultId[], token: CancellationToken, resultReporter: vsdiag.ResultReporter, next: ProvideWorkspaceDiagnosticSignature) => ProviderResult<vsdiag.WorkspaceDiagnosticReport>;
};

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
		const openTabsHandler = () => {
			this.open.clear();
			for (const group of Window.tabGroups.groups) {
				for (const tab of group.tabs) {
					const kind = tab.kind;
					if (kind instanceof TabKindText) {
						this.open.add(kind.uri.toString());
					} else if (kind instanceof TabKindTextDiff) {
						this.open.add(kind.modified.toString());
					}
				}
			}
		};
		openTabsHandler();

		if (Window.tabGroups.onDidChangeTabGroup !== undefined) {
			this.disposable = Window.tabGroups.onDidChangeTabGroup(openTabsHandler);
		} else {
			this.disposable = { dispose: () => {} };
		}
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

type DocumentPullState = {
	document: Uri;
	pulledVersion: number | undefined;
	resultId: string | undefined;
};

enum PullState {
	document = 1,
	workspace = 2
}

class DocumentPullStateTracker {

	private readonly documentPullStates: Map<string, DocumentPullState>;
	private readonly workspacePullStates: Map<string, DocumentPullState>;

	constructor() {
		this.documentPullStates = new Map();
		this.workspacePullStates = new Map();
	}

	public track(kind: PullState, textDocument: TextDocument): DocumentPullState;
	public track(kind: PullState, uri: string, version: number | undefined): DocumentPullState;
	public track(kind: PullState, document: TextDocument | string, arg1?: number | undefined): DocumentPullState {
		const states = kind === PullState.document ? this.documentPullStates : this.workspacePullStates;
		const [key, uri, version] = typeof document === 'string'
			? [document, Uri.parse(document), arg1 as number | undefined]
			: [document.uri.toString(), document.uri, document.version];
		let state = states.get(key);
		if (state === undefined) {
			state = { document: uri, pulledVersion: version, resultId: undefined };
			states.set(key, state);
		}
		return state;
	}


	public update(kind: PullState, textDocument: TextDocument, resultId: string | undefined): void;
	public update(kind: PullState, uri: string, version: number | undefined, resultId: string | undefined): void;
	public update(kind: PullState, document: TextDocument | string, arg1: string | number | undefined, arg2?: string | undefined): void {
		const states = kind === PullState.document ? this.documentPullStates : this.workspacePullStates;
		const [key, uri, version, resultId] = typeof document === 'string'
			? [document, Uri.parse(document), arg1 as number | undefined, arg2]
			: [document.uri.toString(), document.uri, document.version, arg1 as string | undefined];
		let state = states.get(key);
		if (state === undefined) {
			state = { document: uri, pulledVersion: version, resultId };
			states.set(key, state);
		} else {
			state.pulledVersion = version;
			state.resultId = resultId;
		}
	}

	public unTrack(kind: PullState, textDocument: TextDocument): void {
		const states = kind === PullState.document ? this.documentPullStates : this.workspacePullStates;
		states.delete(textDocument.uri.toString());
	}

	public tracks(kind: PullState, textDocument: TextDocument): boolean;
	public tracks(kind: PullState, uri: string): boolean;
	public tracks(kind: PullState, document: TextDocument | string): boolean {
		const key = typeof document === 'string' ? document : document.uri.toString();
		const states = kind === PullState.document ? this.documentPullStates : this.workspacePullStates;
		return states.has(key);
	}

	public getResultId(kind: PullState, textDocument: TextDocument): string | undefined {
		const states = kind === PullState.document ? this.documentPullStates : this.workspacePullStates;
		return states.get(textDocument.uri.toString())?.resultId;
	}

	public getAllResultIds(): Proposed.PreviousResultId[] {
		const result: Proposed.PreviousResultId[] = [];
		for (let [uri, value] of this.workspacePullStates) {
			if (this.documentPullStates.has(uri)) {
				value = this.documentPullStates.get(uri)!;
			}
			if (value.resultId !== undefined) {
				result.push({ uri, value: value.resultId });
			}
		}
		return result;
	}
}

class DiagnosticRequestor implements Disposable {

	private isDisposed: boolean;
	private readonly client: BaseLanguageClient;
	private readonly editorTracker: EditorTracker;
	private readonly options: Proposed.DiagnosticRegistrationOptions;

	public readonly onDidChangeDiagnosticsEmitter: EventEmitter<void>;
	public readonly provider: vsdiag.DiagnosticProvider;
	private readonly diagnostics: DiagnosticCollection;
	private readonly openRequests: Map<string, RequestState>;
	private readonly documentStates: DocumentPullStateTracker;

	private workspaceErrorCounter: number;
	private workspaceCancellation: CancellationTokenSource | undefined;
	private workspaceTimeout: Disposable | undefined;

	public constructor(client: BaseLanguageClient, editorTracker: EditorTracker, options: Proposed.DiagnosticRegistrationOptions) {
		this.client = client;
		this.editorTracker = editorTracker;
		this.options = options;

		this.isDisposed = false;
		this.onDidChangeDiagnosticsEmitter = new EventEmitter<void>();
		this.provider = this.createProvider();

		this.diagnostics = Languages.createDiagnosticCollection(options.identifier);
		this.openRequests = new Map();
		this.documentStates = new DocumentPullStateTracker();
		this.workspaceErrorCounter = 0;
	}

	public knows(kind: PullState, textDocument: TextDocument): boolean {
		return this.documentStates.tracks(kind, textDocument);
	}

	public pull(textDocument: TextDocument, cb?: () => void): void {
		this.pullAsync(textDocument).then(() => {
			if (cb) {
				cb();
			}
		}, (error) => {
			this.client.error(`Document pull failed for text document ${textDocument.uri.toString()}`, error, false);
		});
	}

	private async pullAsync(textDocument: TextDocument): Promise<void> {
		const key = textDocument.uri.toString();
		const version = textDocument.version;
		const currentRequestState = this.openRequests.get(key);
		const documentState = this.documentStates.track(PullState.document, textDocument);
		if (currentRequestState === undefined) {
			const tokenSource = new CancellationTokenSource();
			this.openRequests.set(key, { state: RequestStateKind.active, version: version, textDocument, tokenSource });
			let report: vsdiag.DocumentDiagnosticReport | undefined;
			let afterState: RequestState | undefined;
			try {
				report = await this.provider.provideDiagnostics(textDocument, documentState.resultId, tokenSource.token) ?? { kind: vsdiag.DocumentDiagnosticReportKind.full, items: [] };
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
				this.documentStates.unTrack(PullState.document, textDocument);
				return;
			}
			if (afterState.state === RequestStateKind.outDated) {
				return;
			}
			// report is only undefined if the request has thrown.
			if (report !== undefined) {
				if (report.kind === vsdiag.DocumentDiagnosticReportKind.full) {
					this.diagnostics.set(textDocument.uri, report.items);
				}
				documentState.pulledVersion = version;
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

	public pullWorkspace(): void {
		this.pullWorkspaceAsync().then(() => {
			this.workspaceTimeout = RAL().timer.setTimeout(() => {
				this.pullWorkspace();
			}, 2000);
		}, (error) => {
			if (!(error instanceof LSPCancellationError) && !Proposed.DiagnosticServerCancellationData.is(error.data)) {
				this.client.error(`Workspace diagnostic pull failed.`, error, false);
				this.workspaceErrorCounter++;
			}
			if (this.workspaceErrorCounter <= 5) {
				this.workspaceTimeout = RAL().timer.setTimeout(() => {
					this.pullWorkspace();
				}, 2000);
			}
		});
	}

	private async pullWorkspaceAsync(): Promise<void> {
		if (!this.provider.provideWorkspaceDiagnostics) {
			return;
		}
		if (this.workspaceCancellation !== undefined) {
			this.workspaceCancellation.cancel();
			this.workspaceCancellation = undefined;
		}
		this.workspaceCancellation = new CancellationTokenSource();
		const previousResultIds: vsdiag.PreviousResultId[] = this.documentStates.getAllResultIds().map((item) => {
			return {
				uri: this.client.protocol2CodeConverter.asUri(item.uri),
				value: item.value
			};
		});
		await this.provider.provideWorkspaceDiagnostics(previousResultIds, this.workspaceCancellation.token, (chunk) => {
			if (!chunk || this.isDisposed) {
				return;
			}
			for (const item of chunk.items) {
				if (item.kind === vsdiag.DocumentDiagnosticReportKind.full) {
					// Favour document pull result over workspace results. So skip if it is tracked
					// as a document result.
					if (!this.documentStates.tracks(PullState.document, item.uri.toString())) {
						this.diagnostics.set(item.uri, item.items);
					}
				}
				this.documentStates.update(PullState.workspace, item.uri.toString(), item.version ?? undefined, item.resultId);
			}
		});
	}

	private createProvider(): vsdiag.DiagnosticProvider {
		const result: vsdiag.DiagnosticProvider = {
			onDidChangeDiagnostics: this.onDidChangeDiagnosticsEmitter.event,
			provideDiagnostics: (textDocument, previousResultId, token) => {
				const provideDiagnostics: ProvideDiagnosticSignature = (textDocument, previousResultId, token) => {
					const params: Proposed.DocumentDiagnosticParams = {
						identifier: this.options.identifier,
						textDocument: { uri: this.client.code2ProtocolConverter.asUri(textDocument.uri) },
						previousResultId: previousResultId
					};
					return this.client.sendRequest(Proposed.DocumentDiagnosticRequest.type, params, token).then(async (result) => {
						if (result === undefined || result === null || this.isDisposed || token.isCancellationRequested) {
							return { kind: vsdiag.DocumentDiagnosticReportKind.full, items: [] };
						}
						if (result.kind === Proposed.DocumentDiagnosticReportKind.full) {
							return { kind: vsdiag.DocumentDiagnosticReportKind.full, resultId: result.resultId, items: await this.client.protocol2CodeConverter.asDiagnostics(result.items, token) };
						} else {
							return { kind: vsdiag.DocumentDiagnosticReportKind.unChanged, resultId: result.resultId };
						}
					}, (error) => {
						return this.client.handleFailedRequest(Proposed.DocumentDiagnosticRequest.type, token, error, { kind: vsdiag.DocumentDiagnosticReportKind.full, items: [] });
					});
				};
				const middleware: Middleware & DiagnosticProviderMiddleware = this.client.clientOptions.middleware!;
				return middleware.provideDiagnostics
					? middleware.provideDiagnostics(textDocument, previousResultId, token, provideDiagnostics)
					: provideDiagnostics(textDocument, previousResultId, token);
			}
		};
		if (this.options.workspaceDiagnostics) {
			result.provideWorkspaceDiagnostics = (resultIds, token, resultReporter): ProviderResult<vsdiag.WorkspaceDiagnosticReport> => {
				const convertReport = async (report: Proposed.WorkspaceDocumentDiagnosticReport): Promise<vsdiag.WorkspaceDocumentDiagnosticReport> => {
					if (report.kind === Proposed.DocumentDiagnosticReportKind.full) {
						return {
							kind: vsdiag.DocumentDiagnosticReportKind.full,
							uri: this.client.protocol2CodeConverter.asUri(report.uri),
							resultId: report.resultId,
							version: report.version,
							items: await this.client.protocol2CodeConverter.asDiagnostics(report.items, token)
						};
					} else {
						return {
							kind: vsdiag.DocumentDiagnosticReportKind.unChanged,
							uri: this.client.protocol2CodeConverter.asUri(report.uri),
							resultId: report.resultId,
							version: report.version
						};
					}
				};
				const convertPreviousResultIds = (resultIds: vsdiag.PreviousResultId[]): Proposed.PreviousResultId[] => {
					const converted: Proposed.PreviousResultId[] = [];
					for (const item of resultIds) {
						converted.push({ uri: this.client.code2ProtocolConverter.asUri(item.uri), value: item.value});
					}
					return converted;
				};
				const provideDiagnostics: ProvideWorkspaceDiagnosticSignature = (resultIds, token): ProviderResult<vsdiag.WorkspaceDiagnosticReport> => {
					const partialResultToken: string = generateUuid();
					const disposable = this.client.onProgress(Proposed.WorkspaceDiagnosticRequest.partialResult, partialResultToken, async (partialResult) => {
						if (partialResult === undefined || partialResult === null) {
							resultReporter(null);
							return;
						}
						const converted: vsdiag.WorkspaceDiagnosticReportPartialResult = {
							items: []
						};
						for (const item of partialResult.items) {
							try {
								converted.items.push(await convertReport(item));
							} catch (error) {
								this.client.error(`Converting workspace diagnostics failed.`, error);
							}
						}
						resultReporter(converted);
					});
					const params: Proposed.WorkspaceDiagnosticParams = {
						identifier: this.options.identifier,
						previousResultIds: convertPreviousResultIds(resultIds),
						partialResultToken: partialResultToken
					};
					return this.client.sendRequest(Proposed.WorkspaceDiagnosticRequest.type, params, token).then(async (result): Promise<vsdiag.WorkspaceDiagnosticReport> => {
						if (token.isCancellationRequested) {
							return { items: [] };
						}
						const converted: vsdiag.WorkspaceDiagnosticReport = {
							items: []
						};
						for (const item of result.items) {
							converted.items.push(await convertReport(item));
						}
						disposable.dispose();
						resultReporter(converted);
						return { items: [] };
					}, (error) => {
						disposable.dispose();
						return this.client.handleFailedRequest(Proposed.DocumentDiagnosticRequest.type, token, error, { items: [] });
					});
				};
				const middleware: Middleware & DiagnosticProviderMiddleware = this.client.clientOptions.middleware!;
				return middleware.provideWorkspaceDiagnostics
					? middleware.provideWorkspaceDiagnostics(resultIds, token, resultReporter, provideDiagnostics)
					: provideDiagnostics(resultIds, token, resultReporter);
			};
		}
		return result;
	}

	public dispose(): void {
		this.isDisposed = true;

		// Cancel and clear workspace pull if present.
		this.workspaceCancellation?.cancel();
		this.workspaceTimeout?.dispose();

		// Cancel all request and mark open requests as outdated.
		for (const [key, request] of this.openRequests) {
			if (request.state === RequestStateKind.active) {
				request.tokenSource.cancel();
			}
			this.openRequests.set(key, { state: RequestStateKind.outDated, textDocument: request.textDocument });
		}
	}
}

export interface DiagnosticFeatureProvider {
	onDidChangeDiagnosticsEmitter: EventEmitter<void>;
	diagnostics: vsdiag.DiagnosticProvider;
}

class BackgroundScheduler implements Disposable {

	private readonly diagnosticRequestor: DiagnosticRequestor;
	private endDocument: TextDocument | undefined;
	private readonly documents: LinkedMap<string, TextDocument>;
	private intervalHandle: Disposable | undefined;

	public constructor(diagnosticRequestor: DiagnosticRequestor) {
		this.diagnosticRequestor = diagnosticRequestor;
		this.documents = new LinkedMap();
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

	public dispose(): void {
		this.stop();
		this.documents.clear();
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
		const documentSelector = client.protocol2CodeConverter.asDocumentSelector(options.documentSelector!);
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
				this.diagnosticRequestor.pull(textDocument, () => { addToBackgroundIfNeeded(textDocument); });
			}
		}));

		// Pull all diagnostics for documents that are already open
		for (const textDocument of Workspace.textDocuments) {
			if (matches(textDocument)) {
				this.diagnosticRequestor.pull(textDocument, () => { addToBackgroundIfNeeded(textDocument); });
			}
		}

		if (diagnosticPullOptions.onChange) {
			const changeFeature = client.getFeature(DidChangeTextDocumentNotification.method);
			disposables.push(changeFeature.onNotificationSent(async (event) => {
				const textDocument = event.original.document;
				if ((diagnosticPullOptions.filter === undefined || !diagnosticPullOptions.filter(textDocument, DiagnosticPullMode.onType)) && this.diagnosticRequestor.knows(PullState.document, textDocument) && event.original.contentChanges.length > 0) {
					this.diagnosticRequestor.pull(textDocument, () => { this.backgroundScheduler.trigger(); });
				}
			}));
		}

		if (diagnosticPullOptions.onSave) {
			const saveFeature = client.getFeature(DidSaveTextDocumentNotification.method);
			disposables.push(saveFeature.onNotificationSent((event) => {
				const textDocument = event.original;
				if ((diagnosticPullOptions.filter === undefined || !diagnosticPullOptions.filter(textDocument, DiagnosticPullMode.onSave)) && this.diagnosticRequestor.knows(PullState.document, textDocument)) {
					this.diagnosticRequestor.pull(event.original, () => { this.backgroundScheduler.trigger(); });
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

		// da348dc5-c30a-4515-9d98-31ff3be38d14 is the test UUID to test the middle ware. So don't auto trigger pulls.
		if (options.workspaceDiagnostics === true && options.identifier !== 'da348dc5-c30a-4515-9d98-31ff3be38d14') {
			this.diagnosticRequestor.pullWorkspace();
		}

		this.disposable = Disposable.from(...disposables, this.backgroundScheduler, this.diagnosticRequestor);
	}

	public get onDidChangeDiagnosticsEmitter(): EventEmitter<void> {
		return this.diagnosticRequestor.onDidChangeDiagnosticsEmitter;
	}

	public get diagnostics(): vsdiag.DiagnosticProvider {
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
		// We first need to decide how a UI will look with related documents.
		// An easy implementation would be to only show related diagnostics for
		// the active editor.
		capability.relatedDocumentSupport = false;
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