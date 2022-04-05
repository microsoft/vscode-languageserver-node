/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, TextDocument, Disposable, Position as VPosition, CancellationToken, ProviderResult, DefinitionProvider,
	Definition as VDefinition, DefinitionLink as VDefinitionLink
} from 'vscode';

import {
	ClientCapabilities, DefinitionOptions, DefinitionRegistrationOptions, DefinitionRequest, DocumentSelector, ServerCapabilities} from 'vscode-languageserver-protocol';

import {
	FeatureClient, ensure, TextDocumentFeature
} from './features';

import * as UUID from './utils/uuid';

export interface ProvideDefinitionSignature {
	(this: void, document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VDefinition | VDefinitionLink[]>;
}

export interface DefinitionMiddleware {
	provideDefinition?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideDefinitionSignature) => ProviderResult<VDefinition | VDefinitionLink[]>;
}

export class DefinitionFeature extends TextDocumentFeature<boolean | DefinitionOptions, DefinitionRegistrationOptions, DefinitionProvider, DefinitionMiddleware> {

	constructor(client: FeatureClient<DefinitionMiddleware>) {
		super(client, DefinitionRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let definitionSupport = ensure(ensure(capabilities, 'textDocument')!, 'definition')!;
		definitionSupport.dynamicRegistration = true;
		definitionSupport.linkSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.definitionProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: DefinitionRegistrationOptions): [Disposable, DefinitionProvider] {
		const selector = options.documentSelector!;
		const provider: DefinitionProvider = {
			provideDefinition:  (document, position, token) => {
				const client = this._client;
				const provideDefinition: ProvideDefinitionSignature = (document, position, token) => {
					return client.sendRequest(DefinitionRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asDefinitionResult(result, token);
					}, (error) => {
						return client.handleFailedRequest(DefinitionRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideDefinition
					? middleware.provideDefinition(document, position, token, provideDefinition)
					: provideDefinition(document, position, token);
			}
		};
		return [Languages.registerDefinitionProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider), provider];
	}
}