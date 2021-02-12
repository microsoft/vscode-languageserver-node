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

		const pendingRequests: Map<string, CancellationTokenSource> = new Map();
		const requestsToSchedule: Set<string> = new Set();
		const pullDiagnostics = async (resource: Uri): Promise<void> => {
			const key = resource.toString();
			const pending = pendingRequests.get(key);
			if (pending !== undefined) {
				pending.cancel();
				requestsToSchedule.add(key);
			} else {
				const tokenSource = new CancellationTokenSource();
				pendingRequests.set(key, tokenSource);
				const diagnostics = await provider.provideDiagnostics(resource, tokenSource.token) ?? [];
				pendingRequests.delete(key);
				collection.set(resource, diagnostics);
				if (requestsToSchedule.has(key)) {
					requestsToSchedule.delete(key);
					pullDiagnostics(resource);
				}
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
			for (const item of current.values()) {
				collection.delete(item);
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