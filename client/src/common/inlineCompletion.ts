/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, TextDocument, Disposable, Position as VPosition, InlineCompletionContext as VInlineCompletionContext,
	CancellationToken, ProviderResult, InlineCompletionItem as VInlineCompletionItem, InlineCompletionList as VInlineCompletionList, InlineCompletionItemProvider
} from 'vscode';

import {
	ClientCapabilities, InlineCompletionOptions, InlineCompletionRegistrationOptions, InlineCompletionRequest,
	DocumentSelector, ServerCapabilities
} from 'vscode-languageserver-protocol';

import {
	FeatureClient, ensure, TextDocumentLanguageFeature
} from './features';

import * as UUID from './utils/uuid';

export interface ProvideInlineCompletionItemsSignature {
	(this: void, document: TextDocument, position: VPosition, context: VInlineCompletionContext, token: CancellationToken): ProviderResult<VInlineCompletionItem[] | VInlineCompletionList>;
}

export interface InlineCompletionMiddleware {
	provideInlineCompletionItems?: (this: void, document: TextDocument, position: VPosition, context: VInlineCompletionContext, token: CancellationToken, next: ProvideInlineCompletionItemsSignature) => ProviderResult<VInlineCompletionItem[] | VInlineCompletionList>;
}

export type InlineCompletionProviderShape = {
	provider: InlineCompletionItemProvider;
};

export class InlineCompletionItemFeature extends TextDocumentLanguageFeature<boolean | InlineCompletionOptions, InlineCompletionRegistrationOptions, InlineCompletionItemProvider, InlineCompletionMiddleware> {

	constructor(client: FeatureClient<InlineCompletionMiddleware>) {
		super(client, InlineCompletionRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let inlineCompletion = ensure(ensure(capabilities, 'textDocument')!, 'inlineCompletion')!;
		inlineCompletion.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.inlineCompletionProvider);
		if (!options) {
			return;
		}

		this.register({
			id: UUID.generateUuid(),
			registerOptions: options
		});
	}

	protected registerLanguageProvider(options: InlineCompletionRegistrationOptions): [Disposable, InlineCompletionItemProvider] {
		const selector = options.documentSelector!;
		const provider: InlineCompletionItemProvider = {
			provideInlineCompletionItems: (document: TextDocument, position: VPosition, context: VInlineCompletionContext, token: CancellationToken): ProviderResult<VInlineCompletionList | VInlineCompletionItem[]> => {
				const client = this._client;
				const middleware = this._client.middleware;
				const provideInlineCompletionItems: ProvideInlineCompletionItemsSignature = (document, position, context, token) => {
					return client.sendRequest(InlineCompletionRequest.type, client.code2ProtocolConverter.asInlineCompletionParams(document, position, context), token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asInlineCompletionResult(result, token);
					}, (error) => {
						return client.handleFailedRequest(InlineCompletionRequest.type, token, error, null);
					});
				};
				return middleware.provideInlineCompletionItems
					? middleware.provideInlineCompletionItems(document, position, context, token, provideInlineCompletionItems)
					: provideInlineCompletionItems(document, position, context, token);
			}
		};
		return [Languages.registerInlineCompletionItemProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider), provider];
	}
}
