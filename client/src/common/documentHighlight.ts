/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, TextDocument, Disposable, Position as VPosition, CancellationToken, ProviderResult, DocumentHighlightProvider, DocumentHighlight as VDocumentHighlight
} from 'vscode';

import {
	ClientCapabilities, DocumentHighlightOptions, DocumentHighlightRegistrationOptions, DocumentHighlightRequest, DocumentSelector, ServerCapabilities, TextDocumentRegistrationOptions
} from 'vscode-languageserver-protocol';

import {
	FeatureClient, ensure, TextDocumentFeature
} from './features';

import * as UUID from './utils/uuid';

export interface ProvideDocumentHighlightsSignature {
	(this: void, document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VDocumentHighlight[]>;
}

export interface DocumentHighlightMiddleware {
	provideDocumentHighlights?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideDocumentHighlightsSignature) => ProviderResult<VDocumentHighlight[]>;
}

export class DocumentHighlightFeature extends TextDocumentFeature<boolean | DocumentHighlightOptions, DocumentHighlightRegistrationOptions, DocumentHighlightProvider, DocumentHighlightMiddleware> {

	constructor(client: FeatureClient<DocumentHighlightMiddleware>) {
		super(client, DocumentHighlightRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'documentHighlight')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.documentHighlightProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): [Disposable, DocumentHighlightProvider] {
		const selector = options.documentSelector!;
		const provider: DocumentHighlightProvider = {
			provideDocumentHighlights: (document, position, token) => {
				const client = this._client;
				const _provideDocumentHighlights: ProvideDocumentHighlightsSignature = (document, position, token) => {
					return client.sendRequest(DocumentHighlightRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asDocumentHighlights(result, token);
					}, (error) => {
						return client.handleFailedRequest(DocumentHighlightRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideDocumentHighlights
					? middleware.provideDocumentHighlights(document, position, token, _provideDocumentHighlights)
					: _provideDocumentHighlights(document, position, token);
			}
		};
		return [Languages.registerDocumentHighlightProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider), provider];
	}
}