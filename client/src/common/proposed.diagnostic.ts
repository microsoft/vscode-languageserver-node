/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	Disposable, languages as Languages, workspace as Workspace, window as Window, TextDocumentChangeEvent, CancellationToken, ProviderResult,
	Diagnostic as VDiagnostic,
	CancellationTokenSource,
	Uri
} from 'vscode';

import {
	Proposed, ClientCapabilities, ServerCapabilities, DocumentSelector
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

interface DiagnosticProvider {
	provideDiagnostics (resource: Uri, token: CancellationToken): ProviderResult<VDiagnostic[]>;
}

export interface ProvideDiagnosticsSignature {
	(this: void, resource: Uri, token: CancellationToken): ProviderResult<VDiagnostic[]>;
}

enum RequestStateKind {
	active = 'open',
	reschedule = 'reschedule',
	outDated = 'drop'
}

type RequestState = {
	state: RequestStateKind.active;
	uri: Uri;
	tokenSource: CancellationTokenSource;
} | {
	state: RequestStateKind.reschedule;
	uri: Uri;
} | {
	state: RequestStateKind.outDated;
	uri: Uri;
};

export class DiagnosticFeature extends TextDocumentFeature<boolean | Proposed.DiagnosticOptions, Proposed.DiagnosticRegistrationOptions, DiagnosticProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, Proposed.DiagnosticRequest.type);
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
		const collection = Languages.createDiagnosticCollection(options.identifier);
		const openDocuments: Map<string, Uri> = new Map();

		const provider: DiagnosticProvider = {
			provideDiagnostics: (resource, token) => {
				const client = this._client;
				const provideDiagnostics: ProvideDiagnosticsSignature = (resource, token) => {
					const params: Proposed.DiagnosticParams = {
						textDocument: { uri: client.code2ProtocolConverter.asUri(resource) }
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
				return provideDiagnostics(resource, token);
			}
		};

		const requestStates: Map<string, RequestState> = new Map();
		const pullDiagnostics = async (resource: Uri): Promise<void> => {
			const key = resource.toString();
			const currentState = requestStates.get(key);
			if (currentState !== undefined) {
				if (currentState.state === RequestStateKind.active) {
					currentState.tokenSource.cancel();
					requestStates.set(key, { state: RequestStateKind.reschedule, uri: resource });
				}
				// We have a state. Wait until the request returns.
				return;
			}
			const tokenSource = new CancellationTokenSource();
			requestStates.set(key, { state: RequestStateKind.active, uri: resource, tokenSource });
			const diagnostics = await provider.provideDiagnostics(resource, tokenSource.token) ?? [];
			const afterState = requestStates.get(key);
			if (afterState === undefined) {
				// This shouldn't happen. Log it
				this._client.error(`Lost request state in diagnostic pull model. Clearing diagnostics for ${key}`);
				collection.delete(resource);
				return;
			}
			requestStates.delete(key);
			if (afterState.state === RequestStateKind.outDated) {
				return;
			}
			collection.set(resource, diagnostics);
			if (afterState.state === RequestStateKind.reschedule) {
				pullDiagnostics(resource);
			}
		};

		const openDocumentHandler = () => {
			const added: Set<Uri> = new Set();
			const current: Map<string, Uri> = new Map(openDocuments);
			openDocuments.clear();
			for (const info of Window.openEditors) {
				const key = info.resource.toString();
				openDocuments.set(key, info.resource);
				if (!current.has(key)) {
					added.add(info.resource);
				} else {
					current.delete(key);
				}
			}
			// The once that are still in current are the once that
			// are not valid anymore. So clear the diagnostics
			for (const entry of current.entries()) {
				const key = entry[0];
				const uri = entry[1];
				collection.delete(uri);
				const requestState = requestStates.get(key);
				if (requestState === undefined) {
					continue;
				}
				// We have a running request. If it is active, cancel it.
				if (requestState.state === RequestStateKind.active) {
					requestState.tokenSource.cancel();
				}
				// Mark the result as out dated.
				requestStates.set(key, { state: RequestStateKind.outDated, uri: entry[1]});
			}
			for (const item of added) {
				pullDiagnostics(item);
			}
		};
		openDocumentHandler();
		const openEditorsListener = Window.onDidChangeOpenEditors(openDocumentHandler);
		const documentChangeListener = Workspace.onDidChangeTextDocument((event: TextDocumentChangeEvent): void => {
			if (event.contentChanges.length === 0) {
				return;
			}
			const document = event.document;
			if (!Languages.match(documentSelector, document)) {
				return;
			}
			if (!openDocuments.has(document.uri.toString())) {
				return;
			}
			pullDiagnostics(document.uri);
		});

		const disposable: Disposable = new Disposable(() => {
			openEditorsListener.dispose();
			documentChangeListener.dispose();
			collection.dispose();
		});
		return [disposable, provider];
	}
}