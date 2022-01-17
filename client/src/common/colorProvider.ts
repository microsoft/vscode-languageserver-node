/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { languages as Languages, Disposable, TextDocument, ProviderResult, Range as VRange, Color as VColor, ColorPresentation as VColorPresentation, ColorInformation as VColorInformation, DocumentColorProvider} from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector, DocumentColorRequest, ColorPresentationRequest, Color, ColorInformation, ColorPresentation,
	DocumentColorRegistrationOptions, DocumentColorOptions
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient, $DocumentSelector } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface ProvideDocumentColorsSignature {
	(document: TextDocument, token: CancellationToken): ProviderResult<VColorInformation[]>;
}

export interface ProvideColorPresentationSignature {
	(color: VColor, context: { document: TextDocument, range: VRange }, token: CancellationToken): ProviderResult<VColorPresentation[]>;
}

export interface ColorProviderMiddleware {
	provideDocumentColors?: (this: void, document: TextDocument, token: CancellationToken, next: ProvideDocumentColorsSignature) => ProviderResult<VColorInformation[]>;
	provideColorPresentations?: (this: void, color: VColor, context: { document: TextDocument, range: VRange }, token: CancellationToken, next: ProvideColorPresentationSignature) => ProviderResult<VColorPresentation[]>;
}

export class ColorProviderFeature extends TextDocumentFeature<boolean | DocumentColorOptions, DocumentColorRegistrationOptions, DocumentColorProvider> {

	constructor(client: BaseLanguageClient) {
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
					return client.sendRequest(ColorPresentationRequest.type, requestParams, token).then(
						this.asColorPresentations.bind(this),
						(error: any) => {
							return client.handleFailedRequest(ColorPresentationRequest.type, token, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideColorPresentations
					? middleware.provideColorPresentations(color, context, token, provideColorPresentations)
					: provideColorPresentations(color, context, token);
			},
			provideDocumentColors: (document, token) => {
				if ($DocumentSelector.skipCellTextDocument(selector, document)) {
					return undefined;
				}
				const client = this._client;
				const provideDocumentColors: ProvideDocumentColorsSignature = (document, token) => {
					const requestParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document)
					};
					return client.sendRequest(DocumentColorRequest.type, requestParams, token).then(
						this.asColorInformations.bind(this),
						(error: any) => {
							return client.handleFailedRequest(ColorPresentationRequest.type, token, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideDocumentColors
					? middleware.provideDocumentColors(document, token, provideDocumentColors)
					: provideDocumentColors(document, token);
			}
		};
		return [Languages.registerColorProvider($DocumentSelector.asTextDocumentFilters(selector), provider), provider];
	}

	private asColor(color: Color): VColor {
		return new VColor(color.red, color.green, color.blue, color.alpha);
	}

	private asColorInformations(colorInformation: ColorInformation[]): VColorInformation[] {
		if (Array.isArray(colorInformation)) {
			return colorInformation.map(ci => {
				return new VColorInformation(this._client.protocol2CodeConverter.asRange(ci.range), this.asColor(ci.color));
			});
		}
		return [];
	}

	private asColorPresentations(colorPresentations: ColorPresentation[]): VColorPresentation[] {
		if (Array.isArray(colorPresentations)) {
			return colorPresentations.map(cp => {
				let presentation = new VColorPresentation(cp.label);
				presentation.additionalTextEdits = this._client.protocol2CodeConverter.asTextEdits(cp.additionalTextEdits);
				presentation.textEdit = this._client.protocol2CodeConverter.asTextEdit(cp.textEdit);
				return presentation;
			});
		}
		return [];
	}
}