/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, TextDocument, Disposable, Position as VPosition, CancellationToken, ProviderResult, HoverProvider, Hover as VHover
} from 'vscode';

import {
	ClientCapabilities, DocumentSelector, HoverOptions, HoverRegistrationOptions, HoverRequest, MarkupKind, ServerCapabilities
} from 'vscode-languageserver-protocol';

import {
	FeatureClient, ensure, TextDocumentFeature
} from './features';

import * as UUID from './utils/uuid';

export interface ProvideHoverSignature {
	(this: void, document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VHover>;
}

export interface HoverMiddleware {
	provideHover?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideHoverSignature) => ProviderResult<VHover>;
}

export class HoverFeature extends TextDocumentFeature<boolean | HoverOptions, HoverRegistrationOptions, HoverProvider, HoverMiddleware> {

	constructor(client: FeatureClient<HoverMiddleware>) {
		super(client, HoverRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const hoverCapability = (ensure(ensure(capabilities, 'textDocument')!, 'hover')!);
		hoverCapability.dynamicRegistration = true;
		hoverCapability.contentFormat = [MarkupKind.Markdown, MarkupKind.PlainText];
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.hoverProvider);
		if (!options) {
			return;
		}
		this.register({
			id: UUID.generateUuid(),
			registerOptions: options
		});
	}

	protected registerLanguageProvider(options: HoverRegistrationOptions): [Disposable, HoverProvider] {
		const selector = options.documentSelector!;
		const provider: HoverProvider = {
			provideHover: (document, position, token) => {
				const client = this._client;
				const provideHover: ProvideHoverSignature = (document, position, token) => {
					return client.sendRequest(HoverRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asHover(result);
					}, (error) => {
						return client.handleFailedRequest(HoverRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideHover
					? middleware.provideHover(document, position, token, provideHover)
					: provideHover(document, position, token);
			}
		};
		return [Languages.registerHoverProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider), provider];
	}
}