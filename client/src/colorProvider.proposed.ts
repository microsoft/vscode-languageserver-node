/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as UUID from './utils/uuid';
import * as Is from './utils/is';

import { languages as Languages, Disposable, TextDocument, ProviderResult, Range as VRange, Color, ColorPresentation, ColorInformation } from 'vscode';

import {
	ClientCapabilities, Proposed, CancellationToken, ServerCapabilities, TextDocumentRegistrationOptions, DocumentSelector, StaticRegistrationOptions
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface ProvideDocumentColorsSignature {
	(document: TextDocument, token: CancellationToken): ProviderResult<ColorInformation[]>;
}

export interface ProvideColorPresentationSignature {
	(color: Color, context: { document: TextDocument, range: VRange }, token: CancellationToken): ProviderResult<ColorPresentation[]>;
}

export interface ColorProviderMiddleware {
	provideDocumentColors?: (this: void, document: TextDocument, token: CancellationToken, next: ProvideDocumentColorsSignature) => ProviderResult<ColorInformation[]>;
	provideColorPresentations?: (this: void, color: Color, context: { document: TextDocument, range: VRange }, token: CancellationToken, next: ProvideColorPresentationSignature) => ProviderResult<ColorPresentation[]>;
}

export class ColorProviderFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {

	constructor(client: BaseLanguageClient) {
		super(client, Proposed.DocumentColorRequest.type);
	}

	public fillClientCapabilities(cap: ClientCapabilities): void {
		let capabilites = cap as ClientCapabilities & Proposed.ColorClientCapabilities;
		ensure(ensure(capabilites, 'textDocument')!, 'colorProvider')!.dynamicRegistration = true;
	}

	public initialize(cap: ServerCapabilities, documentSelector: DocumentSelector): void {
		let capabilities = cap as ServerCapabilities & Proposed.ColorServerCapabilities;
		if (!capabilities.colorProvider) {
			return;
		}

		const implCapabilities = capabilities.colorProvider as TextDocumentRegistrationOptions & StaticRegistrationOptions;
		const id = Is.string(implCapabilities.id) && implCapabilities.id.length > 0 ? implCapabilities.id : UUID.generateUuid();
		const selector = implCapabilities.documentSelector || documentSelector;
		if (selector) {
			this.register(this.messages, {
				id,
				registerOptions: Object.assign({}, { documentSelector: selector })
			});
		}
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): Disposable {
		let client = this._client;
		let provideColorPresentations: ProvideColorPresentationSignature = (color, context, token) => {
			const requestParams = {
				color,
				textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(context.document),
				range: client.code2ProtocolConverter.asRange(context.range)
			};
			return client.sendRequest(Proposed.ColorPresentationRequest.type, requestParams, token).then(
				this.asColorPresentations.bind(this),
				(error: any) => {
					client.logFailedRequest(Proposed.ColorPresentationRequest.type, error);
					return Promise.resolve(null);
				}
			);
		};
		let provideDocumentColors: ProvideDocumentColorsSignature = (document, token) => {
			const requestParams = {
				textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document)
			};
			return client.sendRequest(Proposed.DocumentColorRequest.type, requestParams, token).then(
				this.asColorInformations.bind(this),
				(error: any) => {
					client.logFailedRequest(Proposed.ColorPresentationRequest.type, error);
					return Promise.resolve(null);
				}
			);
		};
		let middleware = <ColorProviderMiddleware>client.clientOptions.middleware!;
		return Languages.registerColorProvider(options.documentSelector!, {
			provideColorPresentations: (color: Color, context: { document: TextDocument, range: VRange }, token: CancellationToken) => {
				return middleware.provideColorPresentations
					? middleware.provideColorPresentations(color, context, token, provideColorPresentations)
					: provideColorPresentations(color, context, token);
			},
			provideDocumentColors: (document: TextDocument, token: CancellationToken) => {
				return middleware.provideDocumentColors
					? middleware.provideDocumentColors(document, token, provideDocumentColors)
					: provideDocumentColors(document, token);
			}
		});
	}

	private asColor(color: Proposed.Color): Color {
		return new Color(color.red, color.green, color.blue, color.alpha);
	}

	private asColorInformations(colorInformation: Proposed.ColorInformation[]): ColorInformation[] {
		if (Array.isArray(colorInformation)) {
			return colorInformation.map(ci => {
				return new ColorInformation(this._client.protocol2CodeConverter.asRange(ci.range), this.asColor(ci.color));
			});
		}
		return [];
	}

	private asColorPresentations(colorPresentations: Proposed.ColorPresentation[]): ColorPresentation[] {
		if (Array.isArray(colorPresentations)) {
			return colorPresentations.map(cp => {
				let presentation = new ColorPresentation(cp.label);
				presentation.additionalTextEdits = this._client.protocol2CodeConverter.asTextEdits(cp.additionalTextEdits);
				presentation.textEdit = this._client.protocol2CodeConverter.asTextEdit(cp.textEdit);
				return presentation;
			});
		}
		return [];
	}
}


