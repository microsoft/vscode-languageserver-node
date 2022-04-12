/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, TextDocument, Disposable, Position as VPosition, CancellationToken, ProviderResult, ReferenceProvider, Location as VLocation
} from 'vscode';

import {
	ClientCapabilities, DocumentSelector, ReferenceOptions, ReferenceRegistrationOptions, ReferencesRequest, ServerCapabilities, TextDocumentRegistrationOptions
} from 'vscode-languageserver-protocol';

import {
	FeatureClient, ensure, TextDocumentLanguageFeature, DocumentSelectorOptions, SuspensibleLanguageFeature
} from './features';

import * as UUID from './utils/uuid';

export interface ProvideReferencesSignature {
	(this: void, document: TextDocument, position: VPosition, options: { includeDeclaration: boolean }, token: CancellationToken): ProviderResult<VLocation[]>;
}

export interface ReferencesMiddleware {
	provideReferences?: (this: void, document: TextDocument, position: VPosition, options: { includeDeclaration: boolean }, token: CancellationToken, next: ProvideReferencesSignature) => ProviderResult<VLocation[]>;
}

export class ReferencesFeature extends TextDocumentLanguageFeature<boolean | ReferenceOptions, ReferenceRegistrationOptions, ReferenceProvider, ReferencesMiddleware>
	implements SuspensibleLanguageFeature<ReferenceOptions> {

	constructor(client: FeatureClient<ReferencesMiddleware>) {
		super(client, ReferencesRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'references')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.referencesProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): [Disposable, ReferenceProvider] {
		const selector = options.documentSelector!;
		const provider: ReferenceProvider = {
			provideReferences: (document, position, options, token) => {
				const client = this._client;
				const _providerReferences: ProvideReferencesSignature = (document, position, options, token) => {
					return client.sendRequest(ReferencesRequest.type, client.code2ProtocolConverter.asReferenceParams(document, position, options), token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asReferences(result, token);
					}, (error) => {
						return client.handleFailedRequest(ReferencesRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideReferences
					? middleware.provideReferences(document, position, options, token, _providerReferences)
					: _providerReferences(document, position, options, token);
			}
		};
		return [this.registerProvider(selector, provider), provider];
	}

	public registerActivation(options: DocumentSelectorOptions & ReferenceOptions): void {
		this.doRegisterActivation(() => {
			return this.registerProvider(options.documentSelector, {
				provideReferences: async (document, position, options, token) => {
					return this.handleActivation(document, (provider) => provider.provideReferences(document, position, options, token));
				}
			});
		});
	}

	private registerProvider(selector: DocumentSelector, provider: ReferenceProvider): Disposable {
		return Languages.registerReferenceProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider);
	}
}