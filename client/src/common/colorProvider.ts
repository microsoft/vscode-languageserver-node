/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { languages as Languages, Disposable, TextDocument, ProviderResult, Range as VRange, Color as VColor, ColorPresentation as VColorPresentation, ColorInformation as VColorInformation, DocumentColorProvider} from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector, DocumentColorRequest, ColorPresentationRequest,
	DocumentColorRegistrationOptions, DocumentColorOptions
} from 'vscode-languageserver-protocol';

import { TextDocumentLanguageFeature, FeatureClient, ensure } from './features';

export interface ProvideDocumentColorsSignature {
	(document: TextDocument, token: CancellationToken): ProviderResult<VColorInformation[]>;
}

export interface ProvideColorPresentationSignature {
	(color: VColor, context: { document: TextDocument; range: VRange }, token: CancellationToken): ProviderResult<VColorPresentation[]>;
}

export interface ColorProviderMiddleware {
	provideDocumentColors?: (this: void, document: TextDocument, token: CancellationToken, next: ProvideDocumentColorsSignature) => ProviderResult<VColorInformation[]>;
	provideColorPresentations?: (this: void, color: VColor, context: { document: TextDocument; range: VRange }, token: CancellationToken, next: ProvideColorPresentationSignature) => ProviderResult<VColorPresentation[]>;
}

export class ColorProviderFeature extends TextDocumentLanguageFeature<boolean | DocumentColorOptions, DocumentColorRegistrationOptions, DocumentColorProvider, ColorProviderMiddleware> {

	constructor(client: FeatureClient<ColorProviderMiddleware>) {
		super(client, DocumentColorRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'colorProvider')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let [id, options] = this.getRegistration(documentSelector, capabilities.colorProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: DocumentColorRegistrationOptions): [Disposable, DocumentColorProvider] {
		const selector = options.documentSelector!;
		const provider: DocumentColorProvider = {
			provideColorPresentations: (color, context, token) => {
				const client = this._client;
				const provideColorPresentations: ProvideColorPresentationSignature = (color, context, token) => {
					const requestParams = {
						color,
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(context.document),
						range: client.code2ProtocolConverter.asRange(context.range)
					};
					return client.sendRequest(ColorPresentationRequest.type, requestParams, token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return this._client.protocol2CodeConverter.asColorPresentations(result, token);
					}, (error: any) => {
						return client.handleFailedRequest(ColorPresentationRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideColorPresentations
					? middleware.provideColorPresentations(color, context, token, provideColorPresentations)
					: provideColorPresentations(color, context, token);
			},
			provideDocumentColors: (document, token) => {
				const client = this._client;
				const provideDocumentColors: ProvideDocumentColorsSignature = (document, token) => {
					const requestParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document)
					};
					return client.sendRequest(DocumentColorRequest.type, requestParams, token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return this._client.protocol2CodeConverter.asColorInformations(result, token);
					}, (error: any) => {
						return client.handleFailedRequest(DocumentColorRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideDocumentColors
					? middleware.provideDocumentColors(document, token, provideDocumentColors)
					: provideDocumentColors(document, token);
			}
		};
		return [Languages.registerColorProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider), provider];
	}
}