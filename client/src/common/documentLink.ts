/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, TextDocument, Disposable, CancellationToken, ProviderResult, DocumentLinkProvider, DocumentLink as VDocumentLink
} from 'vscode';

import {
	ClientCapabilities, DocumentLinkOptions, DocumentLinkRegistrationOptions, DocumentLinkRequest, DocumentLinkResolveRequest, DocumentSelector, ResponseError, ServerCapabilities} from 'vscode-languageserver-protocol';

import {
	FeatureClient, ensure, TextDocumentLanguageFeature
} from './features';

import * as UUID from './utils/uuid';

export interface ProvideDocumentLinksSignature {
	(this: void, document: TextDocument, token: CancellationToken): ProviderResult<VDocumentLink[]>;
}

export interface ResolveDocumentLinkSignature {
	(this: void, link: VDocumentLink, token: CancellationToken): ProviderResult<VDocumentLink>;
}

export interface DocumentLinkMiddleware {
	provideDocumentLinks?: (this: void, document: TextDocument, token: CancellationToken, next: ProvideDocumentLinksSignature) => ProviderResult<VDocumentLink[]>;
	resolveDocumentLink?: (this: void, link: VDocumentLink, token: CancellationToken, next: ResolveDocumentLinkSignature) => ProviderResult<VDocumentLink>;
}

export class DocumentLinkFeature extends TextDocumentLanguageFeature<DocumentLinkOptions, DocumentLinkRegistrationOptions, DocumentLinkProvider, DocumentLinkMiddleware> {

	constructor(client: FeatureClient<DocumentLinkMiddleware>) {
		super(client, DocumentLinkRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const documentLinkCapabilities = ensure(ensure(capabilities, 'textDocument')!, 'documentLink')!;
		documentLinkCapabilities.dynamicRegistration = true;
		documentLinkCapabilities.tooltipSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.documentLinkProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: DocumentLinkRegistrationOptions): [Disposable, DocumentLinkProvider] {
		const selector = options.documentSelector!;
		const provider: DocumentLinkProvider = {
			provideDocumentLinks: (document: TextDocument, token: CancellationToken): ProviderResult<VDocumentLink[]> => {
				const client = this._client;
				const provideDocumentLinks: ProvideDocumentLinksSignature = (document, token) => {
					return client.sendRequest(DocumentLinkRequest.type, client.code2ProtocolConverter.asDocumentLinkParams(document), token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asDocumentLinks(result, token);
					}, (error: ResponseError<void>) => {
						return client.handleFailedRequest(DocumentLinkRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideDocumentLinks
					? middleware.provideDocumentLinks(document, token, provideDocumentLinks)
					: provideDocumentLinks(document, token);
			},
			resolveDocumentLink: options.resolveProvider
				? (link, token) => {
					const client = this._client;
					let resolveDocumentLink: ResolveDocumentLinkSignature = (link, token) => {
						return client.sendRequest(DocumentLinkResolveRequest.type, client.code2ProtocolConverter.asDocumentLink(link), token).then((result) => {
							if (token.isCancellationRequested) {
								return link;
							}
							return client.protocol2CodeConverter.asDocumentLink(result);
						}, (error: ResponseError<void>) => {
							return client.handleFailedRequest(DocumentLinkResolveRequest.type, token, error, link);
						});
					};
					const middleware = client.middleware;
					return middleware.resolveDocumentLink
						? middleware.resolveDocumentLink(link, token, resolveDocumentLink)
						: resolveDocumentLink(link, token);
				}
				: undefined
		};
		return [Languages.registerDocumentLinkProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider), provider];
	}
}
