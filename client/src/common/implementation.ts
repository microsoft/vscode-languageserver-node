/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { languages as Languages, Disposable, TextDocument, ProviderResult, Position as VPosition, Definition as VDefinition, DefinitionLink as VDefinitionLink, ImplementationProvider } from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector, ImplementationRequest, ImplementationRegistrationOptions, ImplementationOptions
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface ProvideImplementationSignature {
	(this: void, document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VDefinition | VDefinitionLink[]>;
}

export interface ImplementationMiddleware {
	provideImplementation?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideImplementationSignature) => ProviderResult<VDefinition | VDefinitionLink[]>;
}

export class ImplementationFeature extends TextDocumentFeature<boolean | ImplementationOptions, ImplementationRegistrationOptions, ImplementationProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, ImplementationRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let implementationSupport = ensure(ensure(capabilities, 'textDocument')!, 'implementation')!;
		implementationSupport.dynamicRegistration = true;
		implementationSupport.linkSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let [id, options] = this.getRegistration(documentSelector, capabilities.implementationProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: ImplementationRegistrationOptions): [Disposable, ImplementationProvider] {
		const selector = options.documentSelector!;
		const provider: ImplementationProvider = {
			provideImplementation: (document, position, token) => {
				const client = this._client;
				const provideImplementation: ProvideImplementationSignature = (document, position, token) => {
					return client.sendRequest(ImplementationRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asDefinitionResult(result, token);
					}, (error) => {
						return client.handleFailedRequest(ImplementationRequest.type, token, error, null);
					});
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideImplementation
					? middleware.provideImplementation(document, position, token, provideImplementation)
					: provideImplementation(document, position, token);
			}
		};
		return [Languages.registerImplementationProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider), provider];
	}
}