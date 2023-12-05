/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { languages as Languages, Disposable, TextDocument, ProviderResult, Position as VPosition, SelectionRange as VSelectionRange, SelectionRangeProvider } from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector,
	SelectionRangeParams, SelectionRangeRequest, SelectionRangeOptions, SelectionRangeRegistrationOptions
} from 'vscode-languageserver-protocol';

import { TextDocumentLanguageFeature, FeatureClient, ensure } from './features';

export interface ProvideSelectionRangeSignature {
	(this: void, document: TextDocument, positions: readonly VPosition[], token: CancellationToken): ProviderResult<VSelectionRange[]>;
}

export interface SelectionRangeProviderMiddleware {
	provideSelectionRanges?: (this: void, document: TextDocument, positions: readonly VPosition[], token: CancellationToken, next: ProvideSelectionRangeSignature) => ProviderResult<VSelectionRange[]>;
}

export class SelectionRangeFeature extends TextDocumentLanguageFeature<boolean | SelectionRangeOptions, SelectionRangeRegistrationOptions, SelectionRangeProvider, SelectionRangeProviderMiddleware> {

	constructor(client: FeatureClient<SelectionRangeProviderMiddleware>) {
		super(client, SelectionRangeRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const capability = ensure(ensure(capabilities, 'textDocument')!, 'selectionRange')!;
		capability.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const [id, options] = this.getRegistration(documentSelector, capabilities.selectionRangeProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: SelectionRangeRegistrationOptions): [Disposable, SelectionRangeProvider] {
		const selector = options.documentSelector!;
		const provider: SelectionRangeProvider = {
			provideSelectionRanges: (document, positions, token) => {
				const client = this._client;
				const provideSelectionRanges: ProvideSelectionRangeSignature = async (document, positions, token) => {
					const requestParams: SelectionRangeParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						positions: client.code2ProtocolConverter.asPositionsSync(positions, token)
					};
					return client.sendRequest(SelectionRangeRequest.type, requestParams, token).then((ranges) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asSelectionRanges(ranges, token);
					}, (error: any) => {
						return client.handleFailedRequest(SelectionRangeRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideSelectionRanges
					? middleware.provideSelectionRanges(document, positions, token, provideSelectionRanges)
					: provideSelectionRanges(document, positions, token);

			}
		};
		return [this.registerProvider(selector, provider), provider];
	}

	private registerProvider(selector: DocumentSelector, provider: SelectionRangeProvider): Disposable {
		return Languages.registerSelectionRangeProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider);
	}
}