/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, Disposable, TextDocument, ProviderResult, Position as VPosition, Definition as VDefinition, DefinitionLink as VDefinitionLink, TypeDefinitionProvider
} from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector, TypeDefinitionRequest, TypeDefinitionRegistrationOptions, TypeDefinitionOptions
} from 'vscode-languageserver-protocol';

import { TextDocumentLanguageFeature, FeatureClient, ensure } from './features';

export interface ProvideTypeDefinitionSignature {
	(this: void, document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VDefinition | VDefinitionLink[]>;
}

export interface TypeDefinitionMiddleware {
	provideTypeDefinition?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideTypeDefinitionSignature) => ProviderResult<VDefinition | VDefinitionLink[]>;
}

export class TypeDefinitionFeature extends TextDocumentLanguageFeature<boolean | TypeDefinitionOptions, TypeDefinitionRegistrationOptions, TypeDefinitionProvider, TypeDefinitionMiddleware> {

	constructor(client: FeatureClient<TypeDefinitionMiddleware>) {
		super(client, TypeDefinitionRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'typeDefinition')!.dynamicRegistration = true;
		let typeDefinitionSupport = ensure(ensure(capabilities, 'textDocument')!, 'typeDefinition')!;
		typeDefinitionSupport.dynamicRegistration = true;
		typeDefinitionSupport.linkSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let [id, options] = this.getRegistration(documentSelector, capabilities.typeDefinitionProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: TypeDefinitionRegistrationOptions): [Disposable, TypeDefinitionProvider] {
		const selector = options.documentSelector!;
		const provider: TypeDefinitionProvider = {
			provideTypeDefinition: (document, position, token) => {
				const client = this._client;
				const provideTypeDefinition: ProvideTypeDefinitionSignature = (document, position, token) => {
					return client.sendRequest(TypeDefinitionRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asDefinitionResult(result, token);
					}, (error) => {
						return client.handleFailedRequest(TypeDefinitionRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideTypeDefinition
					? middleware.provideTypeDefinition(document, position, token, provideTypeDefinition)
					: provideTypeDefinition(document, position, token);
			}
		};
		return [this.registerProvider(selector, provider), provider];
	}

	private registerProvider(selector: DocumentSelector, provider: TypeDefinitionProvider): Disposable {
		return Languages.registerTypeDefinitionProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider);
	}
}