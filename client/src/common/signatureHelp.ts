/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, TextDocument, Disposable, Position as VPosition, CancellationToken, ProviderResult, SignatureHelpProvider,
	SignatureHelpContext as VSignatureHelpContext, SignatureHelp as VSignatureHelp, SignatureHelpProviderMetadata as VSignatureHelpProviderMetadata
} from 'vscode';

import {
	ClientCapabilities, DocumentSelector, MarkupKind, ServerCapabilities, SignatureHelpOptions, SignatureHelpRegistrationOptions, SignatureHelpRequest
} from 'vscode-languageserver-protocol';

import {
	FeatureClient, ensure, TextDocumentLanguageFeature, DocumentSelectorOptions
} from './features';

import * as UUID from './utils/uuid';

export interface ProvideSignatureHelpSignature {
	(this: void, document: TextDocument, position: VPosition, context: VSignatureHelpContext, token: CancellationToken): ProviderResult<VSignatureHelp>;
}

export interface SignatureHelpMiddleware {
	provideSignatureHelp?: (this: void, document: TextDocument, position: VPosition, context: VSignatureHelpContext, token: CancellationToken, next: ProvideSignatureHelpSignature) => ProviderResult<VSignatureHelp>;
}

export class SignatureHelpFeature extends TextDocumentLanguageFeature<SignatureHelpOptions, SignatureHelpRegistrationOptions, SignatureHelpProvider, SignatureHelpMiddleware> {

	constructor(client: FeatureClient<SignatureHelpMiddleware>) {
		super(client, SignatureHelpRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let config = ensure(ensure(capabilities, 'textDocument')!, 'signatureHelp')!;
		config.dynamicRegistration = true;
		config.signatureInformation = { documentationFormat: [MarkupKind.Markdown, MarkupKind.PlainText] };
		config.signatureInformation.parameterInformation = { labelOffsetSupport: true };
		config.signatureInformation.activeParameterSupport = true;
		config.contextSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.signatureHelpProvider);
		if (!options) {
			return;
		}
		this.register({
			id: UUID.generateUuid(),
			registerOptions: options
		});
	}

	protected registerLanguageProvider(options: SignatureHelpRegistrationOptions & DocumentSelectorOptions): [Disposable, SignatureHelpProvider] {
		const provider: SignatureHelpProvider = {
			provideSignatureHelp: (document, position, token, context) => {
				const client = this._client;
				const providerSignatureHelp: ProvideSignatureHelpSignature = (document, position, context, token) => {
					return client.sendRequest(SignatureHelpRequest.type, client.code2ProtocolConverter.asSignatureHelpParams(document, position, context), token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asSignatureHelp(result, token);
					}, (error) => {
						return client.handleFailedRequest(SignatureHelpRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideSignatureHelp
					? middleware.provideSignatureHelp(document, position, context, token, providerSignatureHelp)
					: providerSignatureHelp(document, position, context, token);
			}
		};
		return [this.registerProvider(options, provider), provider];
	}

	private registerProvider(options: DocumentSelectorOptions & SignatureHelpOptions, provider: SignatureHelpProvider): Disposable {
		const selector = this._client.protocol2CodeConverter.asDocumentSelector(options.documentSelector);
		if (options.retriggerCharacters === undefined) {
			const triggerCharacters = options.triggerCharacters || [];
			return Languages.registerSignatureHelpProvider(selector, provider, ...triggerCharacters);
		} else {
			const metaData: VSignatureHelpProviderMetadata = {
				triggerCharacters: options.triggerCharacters || [],
				retriggerCharacters: options.retriggerCharacters || []
			};
			return Languages.registerSignatureHelpProvider(selector, provider, metaData);
		}
	}
}
