/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="../../typings/vscode.proposed.tabs.d.ts" />

import * as minimatch from 'minimatch';

import {
	Disposable, languages as Languages, window as Window, workspace as Workspace, CancellationToken, ProviderResult, Diagnostic as VDiagnostic,
	CancellationTokenSource, TextDocument, CancellationError, Event as VEvent, EventEmitter, DiagnosticCollection, Uri, TabInputText, TabInputTextDiff
} from 'vscode';

import {
	ClientCapabilities, ServerCapabilities, DocumentSelector, DidOpenTextDocumentNotification, DidChangeTextDocumentNotification,
	DidSaveTextDocumentNotification, DidCloseTextDocumentNotification, LinkedMap, Touch, RAL, TextDocumentFilter, PreviousResultId,
	DiagnosticRegistrationOptions, DiagnosticServerCancellationData, DocumentDiagnosticParams, DocumentDiagnosticRequest, DocumentDiagnosticReportKind,
	WorkspaceDocumentDiagnosticReport, WorkspaceDiagnosticRequest, WorkspaceDiagnosticParams, DiagnosticOptions, DiagnosticRefreshRequest
} from 'vscode-languageserver-protocol';

import { generateUuid } from './utils/uuid';
import {
	TextDocumentLanguageFeature, FeatureClient, LSPCancellationError
} from './features';

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
		provideDiagnostics(document: TextDocument | Uri, previousResultId: string | undefined, token: CancellationToken): ProviderResult<DocumentDiagnosticReport>;
		provideWorkspaceDiagnostics?(resultIds: PreviousResultId[], token: CancellationToken, resultReporter: ResultReporter): ProviderResult<WorkspaceDiagnosticReport>;
	}
}

export type ProvideDiagnosticSignature = (this: void, document: TextDocument | Uri, previousResultId: string | undefined, token: CancellationToken) => ProviderResult<vsdiag.DocumentDiagnosticReport>;

export type ProvideWorkspaceDiagnosticSignature = (this: void, resultIds: vsdiag.PreviousResultId[], token: CancellationToken, resultReporter: vsdiag.ResultReporter) => ProviderResult<vsdiag.WorkspaceDiagnosticReport>;

export type DiagnosticProviderMiddleware = {
	provideDiagnostics?: (this: void, document: TextDocument | Uri, previousResultId: string | undefined, token: CancellationToken, next: ProvideDiagnosticSignature) => ProviderResult<vsdiag.DocumentDiagnosticReport>;
	provideWorkspaceDiagnostics?: (this: void, resultIds: vsdiag.PreviousResultId[], token: CancellationToken, resultReporter: vsdiag.ResultReporter, next: ProvideWorkspaceDiagnosticSignature) => ProviderResult<vsdiag.WorkspaceDiagnosticReport>;
};

export enum DiagnosticPullMode {
	onType = 'onType',
	onSave = 'onSave'
}

export type DiagnosticPullOptions = {
	diagnosticPullOptions?: {
		/**
		* Whether to pull for diagnostics on document change.
		*/
		onChange?: boolean;

		/**
		* Whether to pull for diagnostics on document save.
		*/
		onSave?: boolean;

		/**
		* An optional filter method that is consulted when triggering a
		* diagnostic pull during document change or document save.
		*
		* @param document the document that changes or got save
		* @param mode the mode
		*/
		filter?(document: TextDocument, mode: DiagnosticPullMode): boolean;

		/**
		* Whether to pull for diagnostics on resources of non instantiated
		* tabs. If it is set to true it is highly recommended to provide
		* a match method as well. Otherwise the client will not pull for
		* tabs if the used document selector specifies a language property
		* since the language value is not known for resources.
		*/
		onTabs?: boolean;

		/**
		* A optional match method that is consulted when pulling for diagnostics
		* when only a URI is known (e.g. for not instantiated tabs)
		*
		* @param documentSelector the document selector
		* @param resource the resource.
		*/
		match?(documentSelector: DocumentSelector, resource: Uri): boolean;
	};
};


enum RequestStateKind {
	active = 'open',
	reschedule = 'reschedule',
	outDated = 'drop'
}

type RequestState = {
	state: RequestStateKind.active;
	document: TextDocument | Uri;
	version: number | undefined;
	tokenSource: CancellationTokenSource;
} | {
	state: RequestStateKind.reschedule;
	document: TextDocument | Uri;
} | {
	state: RequestStateKind.outDated;
	document: TextDocument | Uri;
};

class Tabs {

	private readonly open: Set<string>;
	private readonly disposable: Disposable;

	constructor() {
		this.open = new Set();
		const openTabsHandler = () => {
			this.open.clear();
			for (const group of Window.tabGroups.all) {
				for (const tab of group.tabs) {
					const input = tab.input;
					if (input instanceof TabInputText) {
						this.open.add(input.uri.toString());
					} else if (input instanceof TabInputTextDiff) {
						this.open.add(input.modified.toString());
					}
				}
			}
		};
		openTabsHandler();

		if (Window.tabGroups.onDidChangeTabGroups !== undefined) {
			this.disposable = Window.tabGroups.onDidChangeTabGroups(openTabsHandler);
		} else {
			this.disposable = { dispose: () => {} };
		}
	}

	public dispose(): void {
		this.disposable.dispose();
	}

	public isActive(document: TextDocument | Uri): boolean {
		return document instanceof Uri
			? Window.activeTextEditor?.document.uri === document
			: Window.activeTextEditor?.document === document;
	}

	public isVisible(document: TextDocument | Uri): boolean {
		const uri = document instanceof Uri ? document : document.uri;
		return this.open.has(uri.toString());
	}

	public getTabResources(): Uri[] {
		const result: Uri[] = [];
		for (const group of Window.tabGroups.all) {
			for (const tab of group.tabs) {
				const input = tab.input;
				if (input instanceof TabInputText) {
					result.push(input.uri);
				} else if (input instanceof TabInputTextDiff) {
					result.push(input.modified);
				}
			}
		}
		return result;
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
	public track(kind: PullState, uri: Uri, version: number | undefined): DocumentPullState;
	public track(kind: PullState, document: TextDocument | Uri, arg1?: number | undefined): DocumentPullState {
		const states = kind === PullState.document ? this.documentPullStates : this.workspacePullStates;
		const [key, uri, version] = document instanceof Uri
			? [document.toString(), document, arg1 as number | undefined]
			: [document.uri.toString(), document.uri, document.version];
		let state = states.get(key);
		if (state === undefined) {
			state = { document: uri, pulledVersion: version, resultId: undefined };
			states.set(key, state);
		}
		return state;
	}


	public update(kind: PullState, textDocument: TextDocument, resultId: string | undefined): void;
	public update(kind: PullState, uri: Uri, version: number | undefined, resultId: string | undefined): void;
	public update(kind: PullState, document: TextDocument | Uri, arg1: string | number | undefined, arg2?: string | undefined): void {
		const states = kind === PullState.document ? this.documentPullStates : this.workspacePullStates;
		const [key, uri, version, resultId] = document instanceof Uri
			? [document.toString(), document, arg1 as number | undefined, arg2]
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

	public unTrack(kind: PullState, document: TextDocument | Uri): void {
		const key = document instanceof Uri ? document.toString() : document.uri.toString();
		const states = kind === PullState.document ? this.documentPullStates : this.workspacePullStates;
		states.delete(key);
	}

	public tracks(kind: PullState, textDocument: TextDocument): boolean;
	public tracks(kind: PullState, uri: Uri): boolean;
	public tracks(kind: PullState, document: TextDocument | Uri): boolean {
		const key = document instanceof Uri ? document.toString() : document.uri.toString();
		const states = kind === PullState.document ? this.documentPullStates : this.workspacePullStates;
		return states.has(key);
	}

	public getResultId(kind: PullState, document: TextDocument): string | undefined;
	public getResultId(kind: PullState, document: Uri): string | undefined;
	public getResultId(kind: PullState, document: TextDocument | Uri): string | undefined {
		const key = document instanceof Uri ? document.toString() : document.uri.toString();
		const states = kind === PullState.document ? this.documentPullStates : this.workspacePullStates;
		return states.get(key)?.resultId;
	}

	public getAllResultIds(): PreviousResultId[] {
		const result: PreviousResultId[] = [];
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
	private readonly client: FeatureClient<DiagnosticProviderMiddleware, DiagnosticPullOptions>;
	private readonly tabs: Tabs;
	private readonly options: DiagnosticRegistrationOptions;

	public readonly onDidChangeDiagnosticsEmitter: EventEmitter<void>;
	public readonly provider: vsdiag.DiagnosticProvider;
	private readonly diagnostics: DiagnosticCollection;
	private readonly openRequests: Map<string, RequestState>;
	private readonly documentStates: DocumentPullStateTracker;

	private workspaceErrorCounter: number;
	private workspaceCancellation: CancellationTokenSource | undefined;
	private workspaceTimeout: Disposable | undefined;

	public constructor(client: FeatureClient<DiagnosticProviderMiddleware, DiagnosticPullOptions>, tabs: Tabs, options: DiagnosticRegistrationOptions) {
		this.client = client;
		this.tabs = tabs;
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

	public pull(document: TextDocument | Uri, cb?: () => void): void {
		const uri = document instanceof Uri ? document : document.uri;
		this.pullAsync(document).then(() => {
			if (cb) {
				cb();
			}
		}, (error) => {
			this.client.error(`Document pull failed for text document ${uri.toString()}`, error, false);
		});
	}

	private async pullAsync(document: TextDocument | Uri, version?: number | undefined): Promise<void> {
		const isUri = document instanceof Uri;
		const uri = isUri ? document : document.uri;
		const key = uri.toString();
		version = isUri ? version : document.version;
		const currentRequestState = this.openRequests.get(key);
		const documentState = isUri
			? this.documentStates.track(PullState.document, document, version)
			: this.documentStates.track(PullState.document, document);
		if (currentRequestState === undefined) {
			const tokenSource = new CancellationTokenSource();
			this.openRequests.set(key, { state: RequestStateKind.active, document: document, version: version, tokenSource });
			let report: vsdiag.DocumentDiagnosticReport | undefined;
			let afterState: RequestState | undefined;
			try {
				report = await this.provider.provideDiagnostics(document, documentState.resultId, tokenSource.token) ?? { kind: vsdiag.DocumentDiagnosticReportKind.full, items: [] };
			} catch (error) {
				if (error instanceof LSPCancellationError && DiagnosticServerCancellationData.is(error.data) && error.data.retriggerRequest === false) {
					afterState = { state: RequestStateKind.outDated, document };
				}
				if (afterState === undefined && error instanceof CancellationError) {
					afterState = { state: RequestStateKind.reschedule, document };
				} else {
					throw error;
				}
			}
			afterState = afterState ?? this.openRequests.get(key);
			if (afterState === undefined) {
				// This shouldn't happen. Log it
				this.client.error(`Lost request state in diagnostic pull model. Clearing diagnostics for ${key}`);
				this.diagnostics.delete(uri);
				return;
			}
			this.openRequests.delete(key);
			if (!this.tabs.isVisible(document)) {
				this.documentStates.unTrack(PullState.document, document);
				return;
			}
			if (afterState.state === RequestStateKind.outDated) {
				return;
			}
			// report is only undefined if the request has thrown.
			if (report !== undefined) {
				if (report.kind === vsdiag.DocumentDiagnosticReportKind.full) {
					this.diagnostics.set(uri, report.items);
				}
				documentState.pulledVersion = version;
				documentState.resultId = report.resultId;
			}
			if (afterState.state === RequestStateKind.reschedule) {
				this.pull(document);
			}
		} else {
			if (currentRequestState.state === RequestStateKind.active) {
				// Cancel the current request and reschedule a new one when the old one returned.
				currentRequestState.tokenSource.cancel();
				this.openRequests.set(key, { state: RequestStateKind.reschedule, document: currentRequestState.document });
			} else if (currentRequestState.state === RequestStateKind.outDated) {
				this.openRequests.set(key, { state: RequestStateKind.reschedule, document: currentRequestState.document });
			}
		}
	}

	public cleanupPull(document: TextDocument | Uri): void {
		const uri = document instanceof Uri ? document : document.uri;
		const key = uri.toString();
		const request = this.openRequests.get(key);
		if (this.options.workspaceDiagnostics || this.options.interFileDependencies) {
			if (request !== undefined) {
				this.openRequests.set(key, { state: RequestStateKind.reschedule, document: document });
			} else {
				this.pull(document);
			}
		} else {
			if (request !== undefined) {
				if (request.state === RequestStateKind.active) {
					request.tokenSource.cancel();
				}
				this.openRequests.set(key, { state: RequestStateKind.outDated, document: document });
			}
			this.diagnostics.delete(uri);
		}
	}

	public pullWorkspace(): void {
		this.pullWorkspaceAsync().then(() => {
			this.workspaceTimeout = RAL().timer.setTimeout(() => {
				this.pullWorkspace();
			}, 2000);
		}, (error) => {
			if (!(error instanceof LSPCancellationError) && !DiagnosticServerCancellationData.is(error.data)) {
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
					if (!this.documentStates.tracks(PullState.document, item.uri)) {
						this.diagnostics.set(item.uri, item.items);
					}
				}
				this.documentStates.update(PullState.workspace, item.uri, item.version ?? undefined, item.resultId);
			}
		});
	}

	private createProvider(): vsdiag.DiagnosticProvider {
		const result: vsdiag.DiagnosticProvider = {
			onDidChangeDiagnostics: this.onDidChangeDiagnosticsEmitter.event,
			provideDiagnostics: (document, previousResultId, token) => {
				const provideDiagnostics: ProvideDiagnosticSignature = (document, previousResultId, token) => {
					const params: DocumentDiagnosticParams = {
						identifier: this.options.identifier,
						textDocument: { uri: this.client.code2ProtocolConverter.asUri(document instanceof Uri ? document : document.uri) },
						previousResultId: previousResultId
					};
					return this.client.sendRequest(DocumentDiagnosticRequest.type, params, token).then(async (result) => {
						if (result === undefined || result === null || this.isDisposed || token.isCancellationRequested) {
							return { kind: vsdiag.DocumentDiagnosticReportKind.full, items: [] };
						}
						if (result.kind === DocumentDiagnosticReportKind.full) {
							return { kind: vsdiag.DocumentDiagnosticReportKind.full, resultId: result.resultId, items: await this.client.protocol2CodeConverter.asDiagnostics(result.items, token) };
						} else {
							return { kind: vsdiag.DocumentDiagnosticReportKind.unChanged, resultId: result.resultId };
						}
					}, (error) => {
						return this.client.handleFailedRequest(DocumentDiagnosticRequest.type, token, error, { kind: vsdiag.DocumentDiagnosticReportKind.full, items: [] });
					});
				};
				const middleware: DiagnosticProviderMiddleware = this.client.middleware;
				return middleware.provideDiagnostics
					? middleware.provideDiagnostics(document, previousResultId, token, provideDiagnostics)
					: provideDiagnostics(document, previousResultId, token);
			}
		};
		if (this.options.workspaceDiagnostics) {
			result.provideWorkspaceDiagnostics = (resultIds, token, resultReporter): ProviderResult<vsdiag.WorkspaceDiagnosticReport> => {
				const convertReport = async (report: WorkspaceDocumentDiagnosticReport): Promise<vsdiag.WorkspaceDocumentDiagnosticReport> => {
					if (report.kind === DocumentDiagnosticReportKind.full) {
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
				const convertPreviousResultIds = (resultIds: vsdiag.PreviousResultId[]): PreviousResultId[] => {
					const converted: PreviousResultId[] = [];
					for (const item of resultIds) {
						converted.push({ uri: this.client.code2ProtocolConverter.asUri(item.uri), value: item.value});
					}
					return converted;
				};
				const provideDiagnostics: ProvideWorkspaceDiagnosticSignature = (resultIds, token): ProviderResult<vsdiag.WorkspaceDiagnosticReport> => {
					const partialResultToken: string = generateUuid();
					const disposable = this.client.onProgress(WorkspaceDiagnosticRequest.partialResult, partialResultToken, async (partialResult) => {
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
					const params: WorkspaceDiagnosticParams = {
						identifier: this.options.identifier,
						previousResultIds: convertPreviousResultIds(resultIds),
						partialResultToken: partialResultToken
					};
					return this.client.sendRequest(WorkspaceDiagnosticRequest.type, params, token).then(async (result): Promise<vsdiag.WorkspaceDiagnosticReport> => {
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
						return this.client.handleFailedRequest(DocumentDiagnosticRequest.type, token, error, { items: [] });
					});
				};
				const middleware: DiagnosticProviderMiddleware = this.client.middleware;
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
			this.openRequests.set(key, { state: RequestStateKind.outDated, document: request.document });
		}
	}
}

export type DiagnosticProviderShape = {
	onDidChangeDiagnosticsEmitter: EventEmitter<void>;
	diagnostics: vsdiag.DiagnosticProvider;
};

class BackgroundScheduler implements Disposable {

	private readonly diagnosticRequestor: DiagnosticRequestor;
	private endDocument: TextDocument | Uri | undefined;
	private readonly documents: LinkedMap<string, TextDocument | Uri>;
	private intervalHandle: Disposable | undefined;

	public constructor(diagnosticRequestor: DiagnosticRequestor) {
		this.diagnosticRequestor = diagnosticRequestor;
		this.documents = new LinkedMap();
	}

	public add(document: TextDocument | Uri): void {
		const key = document instanceof Uri ? document.toString() : document.uri.toString();
		if (this.documents.has(key)) {
			return;
		}
		this.documents.set(key, document, Touch.Last);
		this.trigger();
	}

	public remove(document: TextDocument | Uri): void {
		const key = document instanceof Uri ? document.toString() : document.uri.toString();
		if (this.documents.has(key)) {
			this.documents.delete(key);
			// Do a last pull
			this.diagnosticRequestor.pull(document);
		}
		// No more documents. Stop background activity.
		if (this.documents.size === 0) {
			this.stop();
		} else if (document === this.endDocument) {
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
				const key = document instanceof Uri ? document.toString() : document.uri.toString();
				this.diagnosticRequestor.pull(document);
				this.documents.set(key, document, Touch.Last);
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

class DiagnosticFeatureProviderImpl implements DiagnosticProviderShape {

	public readonly disposable: Disposable;
	private readonly diagnosticRequestor: DiagnosticRequestor;
	private activeTextDocument: TextDocument | undefined;
	private readonly backgroundScheduler: BackgroundScheduler;

	constructor(client: FeatureClient<DiagnosticProviderMiddleware, DiagnosticPullOptions>, tabs: Tabs, options: DiagnosticRegistrationOptions) {
		const diagnosticPullOptions = client.clientOptions.diagnosticPullOptions ?? { onChange: true, onSave: false };
		const documentSelector = client.protocol2CodeConverter.asDocumentSelector(options.documentSelector!);
		const disposables: Disposable[] = [];

		const matchResource = (resource: Uri) => {
			const selector = options.documentSelector!;
			if (diagnosticPullOptions.match !== undefined) {
				return diagnosticPullOptions.match(selector!, resource);
			}
			for (const filter of selector) {
				if (!TextDocumentFilter.is(filter)) {
					continue;
				}
				// The filter is a language id. We can't determine if it matches
				// so we return false.
				if (typeof filter === 'string') {
					return false;
				}
				if (filter.language !== undefined && filter.language !== '*') {
					return false;
				}
				if (filter.scheme !== undefined && filter.scheme !== '*' && filter.scheme !== resource.scheme) {
					return false;
				}
				if (filter.pattern !== undefined) {
					const matcher = new minimatch.Minimatch(filter.pattern, { noext: true });
					if (!matcher.makeRe()) {
						return false;
					}
					if (!matcher.match(resource.fsPath)) {
						return false;
					}
				}
			}
			return true;
		};

		const matches = (document: TextDocument | Uri): boolean => {
			return document instanceof Uri
				? matchResource(document)
				: Languages.match(documentSelector, document) > 0 && tabs.isVisible(document);
		};

		const isActiveDocument = (document: TextDocument | Uri): boolean => {
			return document instanceof Uri
				? this.activeTextDocument?.uri.toString() === document.toString()
				: this.activeTextDocument === document;
		};

		this.diagnosticRequestor = new DiagnosticRequestor(client, tabs, options);
		this.backgroundScheduler = new BackgroundScheduler(this.diagnosticRequestor);

		const addToBackgroundIfNeeded = (document: TextDocument | Uri): void => {
			if (!matches(document) || !options.interFileDependencies || isActiveDocument(document)) {
				return;
			}
			this.backgroundScheduler.add(document);
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
		const pullTextDocuments: Set<string> = new Set();
		for (const textDocument of Workspace.textDocuments) {
			if (matches(textDocument)) {
				this.diagnosticRequestor.pull(textDocument, () => { addToBackgroundIfNeeded(textDocument); });
				pullTextDocuments.add(textDocument.uri.toString());
			}
		}

		// Pull all tabs if not already pull as text document
		if (diagnosticPullOptions.onTabs === true) {
			for (const resource of tabs.getTabResources()) {
				if (!pullTextDocuments.has(resource.toString()) && matches(resource)) {
					this.diagnosticRequestor.pull(resource, () => { addToBackgroundIfNeeded(resource); });
				}
			}
		}

		if (diagnosticPullOptions.onChange === true) {
			const changeFeature = client.getFeature(DidChangeTextDocumentNotification.method);
			disposables.push(changeFeature.onNotificationSent(async (event) => {
				const textDocument = event.original.document;
				if ((diagnosticPullOptions.filter === undefined || !diagnosticPullOptions.filter(textDocument, DiagnosticPullMode.onType)) && this.diagnosticRequestor.knows(PullState.document, textDocument) && event.original.contentChanges.length > 0) {
					this.diagnosticRequestor.pull(textDocument, () => { this.backgroundScheduler.trigger(); });
				}
			}));
		}

		if (diagnosticPullOptions.onSave === true) {
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

export class DiagnosticFeature extends TextDocumentLanguageFeature<DiagnosticOptions, DiagnosticRegistrationOptions, DiagnosticProviderShape, DiagnosticProviderMiddleware, DiagnosticPullOptions> {

	private readonly tabs: Tabs;

	constructor(client: FeatureClient<DiagnosticProviderMiddleware, DiagnosticPullOptions>) {
		super(client, DocumentDiagnosticRequest.type);
		this.tabs = new Tabs();
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let capability = ensure(ensure(capabilities, 'textDocument')!, 'diagnostic')!;
		capability.dynamicRegistration = true;
		// We first need to decide how a UI will look with related documents.
		// An easy implementation would be to only show related diagnostics for
		// the active editor.
		capability.relatedDocumentSupport = false;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const client = this._client;
		client.onRequest(DiagnosticRefreshRequest.type, async () => {
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
		this.tabs.dispose();
		super.dispose();
	}

	protected registerLanguageProvider(options: DiagnosticRegistrationOptions): [Disposable, DiagnosticProviderShape] {
		const provider = new DiagnosticFeatureProviderImpl(this._client, this.tabs, options);
		return [provider.disposable, provider];
	}
}