/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	Disposable, languages as Languages, window as Window, CancellationToken, ProviderResult,
	Diagnostic as VDiagnostic, CancellationTokenSource, TextDocument, CancellationError
} from 'vscode';

import {
	Proposed, ClientCapabilities, ServerCapabilities, DocumentSelector, DidOpenTextDocumentNotification, DidChangeTextDocumentNotification,
	DidSaveTextDocumentNotification, DidCloseTextDocumentNotification
} from 'vscode-languageserver-protocol';

import {
	TextDocumentFeature, BaseLanguageClient, Middleware, DidOpenTextDocumentFeatureShape, DidChangeTextDocumentFeatureShape, DidSaveTextDocumentFeatureShape,
	DidCloseTextDocumentFeatureShape, LSPCancellationError
} from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

interface VDiagnosticList {
	items: VDiagnostic[];
}

interface DiagnosticProvider {
	provideDiagnostics (textDocument: TextDocument, context: Proposed.DiagnosticContext, token: CancellationToken): ProviderResult<VDiagnosticList>;
}

export interface ProvideDiagnosticSignature {
	(this: void, textDocument: TextDocument, context: Proposed.DiagnosticContext, token: CancellationToken): ProviderResult<VDiagnosticList>;
}

export interface DiagnosticProviderMiddleware {
	provideDiagnostics?: (this: void, document: TextDocument, context: Proposed.DiagnosticContext, token: CancellationToken, next: ProvideDiagnosticSignature) => ProviderResult<VDiagnosticList>;
}


enum RequestStateKind {
	active = 'open',
	reschedule = 'reschedule',
	outDated = 'drop'
}

type RequestState = {
	state: RequestStateKind.active;
	textDocument: TextDocument;
	trigger: Proposed.DiagnosticTriggerKind;
	tokenSource: CancellationTokenSource;
} | {
	state: RequestStateKind.reschedule;
	textDocument: TextDocument;
	trigger: Proposed.DiagnosticTriggerKind;
} | {
	state: RequestStateKind.outDated;
	textDocument: TextDocument;
};

export class DiagnosticFeature extends TextDocumentFeature<boolean | Proposed.DiagnosticOptions, Proposed.DiagnosticRegistrationOptions, DiagnosticProvider> {

	private readonly openFeature: DidOpenTextDocumentFeatureShape;
	private readonly changeFeature: DidChangeTextDocumentFeatureShape;
	private readonly saveFeature: DidSaveTextDocumentFeatureShape;
	private readonly closeFeature: DidCloseTextDocumentFeatureShape;

	constructor(client: BaseLanguageClient) {
		super(client, Proposed.DiagnosticRequest.type);
		this.openFeature = client.getFeature(DidOpenTextDocumentNotification.method);
		this.changeFeature = client.getFeature(DidChangeTextDocumentNotification.method);
		this.saveFeature = client.getFeature(DidSaveTextDocumentNotification.method);
		this.closeFeature = client.getFeature(DidCloseTextDocumentNotification.method);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities & Proposed.$DiagnosticClientCapabilities): void {
		let capability = ensure(ensure(capabilities, 'textDocument')!, 'diagnostic')!;
		capability.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities & Proposed.$DiagnosticServerCapabilities, documentSelector: DocumentSelector): void {
		let [id, options] = this.getRegistration(documentSelector, capabilities.diagnosticProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: Proposed.DiagnosticRegistrationOptions): [Disposable, DiagnosticProvider] {
		const documentSelector = options.documentSelector!;
		const mode = Proposed.DiagnosticPullModeFlags.is(options.mode) ? options.mode : (Proposed.DiagnosticPullModeFlags.onOpen | Proposed.DiagnosticPullModeFlags.onType);
		const disposables: Disposable[] = [];
		const collection = Languages.createDiagnosticCollection(options.identifier);
		disposables.push(collection);
		const availableEditors: Set<string> = new Set();
		const managedDocuments: Set<string> = new Set();

		const matches = (textDocument: TextDocument): boolean => {
			return Languages.match(documentSelector, textDocument) > 0 && availableEditors.has(textDocument.uri.toString());
		};

		const manages = (textDocument: TextDocument): boolean => {
			return managedDocuments.has(textDocument.uri.toString());
		};

		const provider: DiagnosticProvider = {
			provideDiagnostics: (textDocument, context, token) => {
				const client = this._client;
				const provideDiagnostics: ProvideDiagnosticSignature = (textDocument, context, token) => {
					const params: Proposed.DiagnosticParams = {
						textDocument: { uri: client.code2ProtocolConverter.asUri(textDocument.uri) },
						context: context
					};
					return client.sendRequest(Proposed.DiagnosticRequest.type, params, token).then((result) => {
						if (result === null || !result.items) {
							return { items: [] };
						}
						return { items: client.protocol2CodeConverter.asDiagnostics(result.items) };
					}, (error) => {
						return client.handleFailedRequest(Proposed.DiagnosticRequest.type, token, error, { items: [] });
					});
				};
				const middleware: Middleware & DiagnosticProviderMiddleware = client.clientOptions.middleware!;
				return middleware.provideDiagnostics
					? middleware.provideDiagnostics(textDocument, context, token, provideDiagnostics)
					: provideDiagnostics(textDocument, context, token);
			}
		};

		const requestStates: Map<string, RequestState> = new Map();
		const pullDiagnostics = async (textDocument: TextDocument, trigger: Proposed.DiagnosticTriggerKind): Promise<void> => {
			const key = textDocument.uri.toString();
			const currentState = requestStates.get(key);
			if (currentState !== undefined) {
				if (currentState.state === RequestStateKind.active) {
					currentState.tokenSource.cancel();
				}
				requestStates.set(key, { state: RequestStateKind.reschedule, textDocument, trigger: trigger });
				// We have a state. Wait until the request returns.
				return;
			}
			const tokenSource = new CancellationTokenSource();
			requestStates.set(key, { state: RequestStateKind.active, textDocument, trigger, tokenSource });
			let diagnostics: VDiagnosticList | undefined;
			let afterState: RequestState | undefined;
			try {
				diagnostics = await provider.provideDiagnostics(textDocument, { triggerKind: trigger }, tokenSource.token) ?? { items: [] };
			} catch (error: unknown) {
				if (error instanceof LSPCancellationError && Proposed.DiagnosticServerCancellationData.is(error.data) && error.data.retriggerRequest === false) {
					afterState = { state: RequestStateKind.outDated, textDocument };
				}
				if (afterState === undefined && error instanceof CancellationError) {
					afterState = { state: RequestStateKind.reschedule, textDocument, trigger };
				} else {
					throw error;
				}
			}
			afterState = afterState ?? requestStates.get(key);
			if (afterState === undefined) {
				// This shouldn't happen. Log it
				this._client.error(`Lost request state in diagnostic pull model. Clearing diagnostics for ${key}`);
				collection.delete(textDocument.uri);
				return;
			}
			requestStates.delete(key);
			if (afterState.state === RequestStateKind.outDated || !manages(textDocument)) {
				return;
			}
			// diagnostics is only undefined if the request has thrown.
			if (diagnostics !== undefined) {
				collection.set(textDocument.uri, diagnostics.items);
			}
			if (afterState.state === RequestStateKind.reschedule) {
				pullDiagnostics(textDocument, afterState.trigger);
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

		if (Proposed.DiagnosticPullModeFlags.isOpen(mode)) {
			disposables.push(this.openFeature.onNotificationSent((event) => {
				const textDocument = event.original;
				if (matches(textDocument)) {
					managedDocuments.add(textDocument.uri.toString());
					pullDiagnostics(event.original, Proposed.DiagnosticTriggerKind.Opened);
				}
			}));
			// Pull all diagnostics for documents that are already open
			for (const textDocument of this.openFeature.openDocuments) {
				if (matches(textDocument)) {
					managedDocuments.add(textDocument.uri.toString());
					pullDiagnostics(textDocument, Proposed.DiagnosticTriggerKind.Opened);
				}
			}
		}
		if (Proposed.DiagnosticPullModeFlags.isType(mode)) {
			disposables.push(this.changeFeature.onNotificationSent((event) => {
				const textDocument = event.original.document;
				if (manages(textDocument) && event.original.contentChanges.length > 0) {
					pullDiagnostics(textDocument, Proposed.DiagnosticTriggerKind.Typed);
				}
			}));
		}
		if (Proposed.DiagnosticPullModeFlags.isSave(mode)) {
			disposables.push(this.saveFeature.onNotificationSent((event) => {
				const textDocument = event.original;
				if (manages(textDocument)) {
					pullDiagnostics(event.original, Proposed.DiagnosticTriggerKind.Saved);
				}
			}));
		}
		disposables.push(this.closeFeature.onNotificationSent((event) => {
			const textDocument = event.original;
			const requestState = requestStates.get(textDocument.uri.toString());
			if (requestState !== undefined) {
				requestStates.set(textDocument.uri.toString(),{ state: RequestStateKind.outDated, textDocument });
			}
			if (manages(textDocument)) {
				collection.delete(textDocument.uri);
				managedDocuments.delete(textDocument.uri.toString());
			}
		}));
		return [Disposable.from(...disposables), provider];
	}
}