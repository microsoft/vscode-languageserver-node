/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as code from 'vscode';
import * as proto from 'vscode-languageserver-protocol';

import { TextDocumentLanguageFeature, FeatureClient, ensure, DocumentSelectorOptions } from './features';

export interface ProvideLinkedEditingRangeSignature {
	(this: void, document: code.TextDocument, position: code.Position, token: code.CancellationToken): code.ProviderResult<code.LinkedEditingRanges>;
}

/**
 * Linked editing middleware
 *
 * @since 3.16.0
 */
export interface LinkedEditingRangeMiddleware {
	provideLinkedEditingRange?: (this: void, document: code.TextDocument, position: code.Position, token: code.CancellationToken, next: ProvideLinkedEditingRangeSignature) => code.ProviderResult<code.LinkedEditingRanges>;
}

export class LinkedEditingFeature extends TextDocumentLanguageFeature<boolean | proto.LinkedEditingRangeOptions, proto.LinkedEditingRangeRegistrationOptions, code.LinkedEditingRangeProvider, LinkedEditingRangeMiddleware> {

	constructor(client: FeatureClient<LinkedEditingRangeMiddleware>) {
		super(client, proto.LinkedEditingRangeRequest.type);
	}

	public fillClientCapabilities(capabilities: proto.ClientCapabilities): void {
		const linkedEditingSupport = ensure(ensure(capabilities, 'textDocument')!, 'linkedEditingRange')!;
		linkedEditingSupport.dynamicRegistration = true;
	}

	public initialize(capabilities: proto.ServerCapabilities, documentSelector: proto.DocumentSelector): void {
		let [id, options] = this.getRegistration(documentSelector, capabilities.linkedEditingRangeProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: proto.LinkedEditingRangeRegistrationOptions): [code.Disposable, code.LinkedEditingRangeProvider] {
		const selector = options.documentSelector!;
		const provider: code.LinkedEditingRangeProvider = {
			provideLinkedEditingRanges: (document, position, token) => {
				const client = this._client;
				const provideLinkedEditing: ProvideLinkedEditingRangeSignature = (document, position, token) => {
					return client.sendRequest(proto.LinkedEditingRangeRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asLinkedEditingRanges(result, token);
					}, (error) => {
						return client.handleFailedRequest(proto.LinkedEditingRangeRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideLinkedEditingRange
					? middleware.provideLinkedEditingRange(document, position, token, provideLinkedEditing)
					: provideLinkedEditing(document, position, token);
			}
		};
		return [code.languages.registerLinkedEditingRangeProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider), provider];
	}

	public registerActivation(options: DocumentSelectorOptions & proto.LinkedEditingRangeOptions): void {
		this.doRegisterActivation(() => {
			return this.registerProvider(options.documentSelector, {
				provideLinkedEditingRanges: async (document, position, token) => {
					return this.handleActivation(document, (provider) => provider.provideLinkedEditingRanges(document, position, token));
				}
			});
		});
	}

	private registerProvider(selector: proto.DocumentSelector, provider: code.LinkedEditingRangeProvider): code.Disposable {
		return code.languages.registerLinkedEditingRangeProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider);
	}
}