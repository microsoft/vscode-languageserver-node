/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { StaticRegistrationOptions, TextDocumentContentRefreshRequest, TextDocumentContentRequest, type ClientCapabilities, type RegistrationType, type ServerCapabilities, type TextDocumentContentParams, type TextDocumentContentRegistrationOptions } from 'vscode-languageserver-protocol';

import { ensure, type DynamicFeature, type FeatureClient, type FeatureState, type RegistrationData } from './features';
import * as UUID from './utils/uuid';


export interface ProvideTextDocumentContentSignature {
	(this: void, uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string>;
}

export interface TextDocumentContentMiddleware {
	provideTextDocumentContent?: (this: void, uri: vscode.Uri, token: vscode.CancellationToken, next: ProvideTextDocumentContentSignature) => vscode.ProviderResult<string>;
}

export interface TextDocumentContentProviderShape {
	scheme: string;
	onDidChangeEmitter: vscode.EventEmitter<vscode.Uri>;
	provider: vscode.TextDocumentContentProvider;
}

export class TextDocumentContentFeature implements DynamicFeature<TextDocumentContentRegistrationOptions> {

	private readonly _client: FeatureClient<TextDocumentContentMiddleware>;
	private readonly _registrations: Map<string, { disposable: vscode.Disposable; providers: TextDocumentContentProviderShape[] }> = new Map();

	constructor(client: FeatureClient<TextDocumentContentMiddleware>) {
		this._client = client;
	}

	public getState(): FeatureState {
		const registrations = this._registrations.size > 0;
		return { kind: 'workspace', id: TextDocumentContentRequest.method, registrations };
	}

	public get registrationType(): RegistrationType<TextDocumentContentRegistrationOptions> {
		return TextDocumentContentRequest.type;
	}

	public getProviders(): TextDocumentContentProviderShape[] {
		const result: TextDocumentContentProviderShape[] = [];
		for (const registration of this._registrations.values()) {
			result.push(...registration.providers);
		}
		return result;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const textDocumentContent = ensure(ensure(capabilities, 'workspace')!, 'textDocumentContent')!;
		textDocumentContent.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities): void {
		const client = this._client;
		client.onRequest(TextDocumentContentRefreshRequest.type, async (params) => {
			const uri = client.protocol2CodeConverter.asUri(params.uri);
			for (const registrations of this._registrations.values()) {
				for (const provider of registrations.providers) {
					if (provider.scheme !== uri.scheme) {
						provider.onDidChangeEmitter.fire(uri);
					}
				}
			}
		});

		if (!capabilities?.workspace?.textDocumentContent) {
			return;
		}
		const capability = capabilities.workspace.textDocumentContent;
		const id = StaticRegistrationOptions.hasId(capability) ? capability.id : UUID.generateUuid();
		this.register({
			id: id,
			registerOptions: capability
		});
	}

	public register(data: RegistrationData<TextDocumentContentRegistrationOptions>): void {
		const registrations: TextDocumentContentProviderShape[] = [];
		const disposables: vscode.Disposable[] = [];
		for (const scheme of data.registerOptions.schemes) {
			const [disposable, registration] = this.registerTextDocumentContentProvider(scheme);
			registrations.push(registration);
			disposables.push(disposable);
		}
		this._registrations.set(data.id, { disposable: vscode.Disposable.from(...disposables), providers: registrations });
	}

	private registerTextDocumentContentProvider(scheme: string): [vscode.Disposable, TextDocumentContentProviderShape] {
		const eventEmitter: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();
		const provider: vscode.TextDocumentContentProvider = {
			onDidChange: eventEmitter.event,
			provideTextDocumentContent: (uri, token) => {
				const client = this._client;
				const provideTextDocumentContent: ProvideTextDocumentContentSignature = (uri, token) => {
					const params: TextDocumentContentParams = {
						uri: client.code2ProtocolConverter.asUri(uri)
					};
					return client.sendRequest(TextDocumentContentRequest.type, params, token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return result.text;
					}, (error) => {
						return client.handleFailedRequest(TextDocumentContentRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideTextDocumentContent
					? middleware.provideTextDocumentContent(uri, token, provideTextDocumentContent)
					: provideTextDocumentContent(uri, token);
			}
		};
		return [vscode.workspace.registerTextDocumentContentProvider(scheme, provider), { scheme, onDidChangeEmitter: eventEmitter, provider }];
	}

	public unregister(id: string): void {
		const registration = this._registrations.get(id);
		if (registration !== undefined) {
			this._registrations.delete(id);
			registration.disposable.dispose();
		}
	}

	public clear(): void {
		this._registrations.forEach((registration) => {
			registration.disposable.dispose();
		});
		this._registrations.clear();
	}
}