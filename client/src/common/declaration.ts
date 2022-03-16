/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { languages as Languages, Disposable, TextDocument, ProviderResult, Position as VPosition, Declaration as VDeclaration, DeclarationProvider } from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector, DeclarationRequest, DeclarationRegistrationOptions, DeclarationOptions
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface ProvideDeclarationSignature {
	(this: void, document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VDeclaration>;
}

export interface DeclarationMiddleware {
	provideDeclaration?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideDeclarationSignature) => ProviderResult<VDeclaration>;
}

export class DeclarationFeature extends TextDocumentFeature<boolean | DeclarationOptions, DeclarationRegistrationOptions, DeclarationProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, DeclarationRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const declarationSupport = ensure(ensure(capabilities, 'textDocument')!, 'declaration')!;
		declarationSupport.dynamicRegistration = true;
		declarationSupport.linkSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const [id, options] = this.getRegistration(documentSelector, capabilities.declarationProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: DeclarationRegistrationOptions): [Disposable, DeclarationProvider] {
		const selector = options.documentSelector!;
		const provider: DeclarationProvider = {
			provideDeclaration: (document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VDeclaration> => {
				const client = this._client;
				const provideDeclaration: ProvideDeclarationSignature = (document, position, token) => {
					return client.sendRequest(DeclarationRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asDeclarationResult(result, token);
					}, (error) => {
						return client.handleFailedRequest(DeclarationRequest.type, token, error, null);
					});
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideDeclaration
					? middleware.provideDeclaration(document, position, token, provideDeclaration)
					: provideDeclaration(document, position, token);
			}
		};
		return [Languages.registerDeclarationProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider), provider];
	}
}