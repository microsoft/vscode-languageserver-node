/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	Disposable, languages as Languages, window as Window, CancellationToken, ProviderResult,
	Diagnostic as VDiagnostic, CancellationTokenSource, TextDocument
} from 'vscode';

import {
	Proposed, ClientCapabilities, ServerCapabilities, DocumentSelector, DidOpenTextDocumentNotification, DidChangeTextDocumentNotification,
	DidSaveTextDocumentNotification, DidCloseTextDocumentNotification
} from 'vscode-languageserver-protocol';

import {
	TextDocumentFeature, BaseLanguageClient, Middleware, DidOpenTextDocumentFeatureShape, DidChangeTextDocumentFeatureShape, DidSaveTextDocumentFeatureShape,
	DidCloseTextDocumentFeatureShape
} from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

interface DiagnosticProvider {
	provideDiagnostics (textDocument: TextDocument, token: CancellationToken): ProviderResult<VDiagnostic[]>;
}

export interface ProvideDiagnosticSignature {
	(this: void, textDocument: TextDocument, token: CancellationToken): ProviderResult<VDiagnostic[]>;
}

export interface DiagnosticProviderMiddleware {
	provideDiagnostics?: (this: void, document: TextDocument, token: CancellationToken, next: ProvideDiagnosticSignature) => ProviderResult<VDiagnostic[]>;
}


enum RequestStateKind {
	active = 'open',
	reschedule = 'reschedule',
	outDated = 'drop'
}

type RequestState = {
	state: RequestStateKind.active;
	textDocument: TextDocument;
	tokenSource: CancellationTokenSource;
} | {
	state: RequestStateKind.reschedule;
	textDocument: TextDocument;
} | {
	state: RequestStateKind.outDated;
	textDocument: TextDocument;
};

export class DiagnosticFeature extends TextDocumentFeature<Proposed.DiagnosticOptions, Proposed.DiagnosticRegistrationOptions, DiagnosticProvider> {

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
		const mode = Proposed.DiagnosticPullMode.is(options.mode) ? options.mode : Proposed.DiagnosticPullMode.onType;
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
			provideDiagnostics: (textDocument, token) => {
				const client = this._client;
				const provideDiagnostics: ProvideDiagnosticSignature = (textDocument, token) => {
					const params: Proposed.DiagnosticParams = {
						textDocument: { uri: client.code2ProtocolConverter.asUri(textDocument.uri) }
					};
					return client.sendRequest(Proposed.DiagnosticRequest.type, params, token).then((result) => {
						if (result === null) {
							return [];
						}
						return client.protocol2CodeConverter.asDiagnostics(result);
					}, (error) => {
						return client.handleFailedRequest(Proposed.DiagnosticRequest.type, token, error, []);
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
					requestStates.set(key, { state: RequestStateKind.reschedule, textDocument });
				}
				// We have a state. Wait until the request returns.
				return;
			}
			const tokenSource = new CancellationTokenSource();
			requestStates.set(key, { state: RequestStateKind.active, textDocument, tokenSource });
			const diagnostics = await provider.provideDiagnostics(textDocument, tokenSource.token) ?? [];
			const afterState = requestStates.get(key);
			if (afterState === undefined) {
				// This shouldn't happen. Log it
				this._client.error(`Lost request state in diagnostic pull model. Clearing diagnostics for ${key}`);
				collection.delete(textDocument.uri);
				return;
			}
			requestStates.delete(key);
			if (afterState.state === RequestStateKind.outDated) {
				return;
			}
			collection.set(textDocument.uri, diagnostics);
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

		disposables.push(this.openFeature.onNotificationSent((event) => {
			const textDocument = event.original;
			if (matches(textDocument)) {
				managedDocuments.add(textDocument.uri.toString());
				pullDiagnostics(event.original);
			}
		}));
		// Pull all diagnostics for documents that are already open
		for (const textDocument of this.openFeature.openDocuments) {
			if (matches(textDocument)) {
				managedDocuments.add(textDocument.uri.toString());
				pullDiagnostics(textDocument);
			}
		}
		if (mode === Proposed.DiagnosticPullMode.onType) {
			disposables.push(this.changeFeature.onNotificationSent((event) => {
				const textDocument = event.original.document;
				if (manages(textDocument) && event.original.contentChanges.length > 0) {
					pullDiagnostics(textDocument);
				}
			}));
		} else if (mode === Proposed.DiagnosticPullMode.onSave) {
			disposables.push(this.saveFeature.onNotificationSent((event) => {
				const textDocument = event.original;
				if (manages(textDocument)) {
					pullDiagnostics(event.original);
				}
			}));
		}
		disposables.push(this.closeFeature.onNotificationSent((event) => {
			const textDocument = event.original;
			if (manages(textDocument)) {
				collection.delete(textDocument.uri);
				managedDocuments.delete(textDocument.uri.toString());
			}
		}));
		return [Disposable.from(...disposables), provider];
	}
}