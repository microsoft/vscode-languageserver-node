/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, Disposable, TextDocument, ProviderResult, FoldingRange as VFoldingRange, FoldingContext, FoldingRangeProvider
} from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector, FoldingRangeRequest, FoldingRangeParams,
	FoldingRangeRegistrationOptions, FoldingRangeOptions, FoldingRangeKind
} from 'vscode-languageserver-protocol';

import { TextDocumentLanguageFeature, FeatureClient, ensure } from './features';

export interface ProvideFoldingRangeSignature {
	(this: void, document: TextDocument, context: FoldingContext, token: CancellationToken): ProviderResult<VFoldingRange[]>;
}

export interface FoldingRangeProviderMiddleware {
	provideFoldingRanges?: (this: void, document: TextDocument, context: FoldingContext, token: CancellationToken, next: ProvideFoldingRangeSignature) => ProviderResult<VFoldingRange[]>;
}

export class FoldingRangeFeature extends TextDocumentLanguageFeature<boolean | FoldingRangeOptions, FoldingRangeRegistrationOptions, FoldingRangeProvider, FoldingRangeProviderMiddleware> {

	constructor(client: FeatureClient<FoldingRangeProviderMiddleware>) {
		super(client, FoldingRangeRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let capability = ensure(ensure(capabilities, 'textDocument')!, 'foldingRange')!;
		capability.dynamicRegistration = true;
		capability.rangeLimit = 5000;
		capability.lineFoldingOnly = true;
		capability.foldingRangeKind = { valueSet: [ FoldingRangeKind.Comment, FoldingRangeKind.Imports, FoldingRangeKind.Region ] };
		capability.foldingRange = { collapsedText: false };
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let [id, options] = this.getRegistration(documentSelector, capabilities.foldingRangeProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: FoldingRangeRegistrationOptions): [Disposable, FoldingRangeProvider] {
		const selector = options.documentSelector!;
		const provider: FoldingRangeProvider = {
			provideFoldingRanges: (document, context, token) => {
				const client = this._client;
				const provideFoldingRanges: ProvideFoldingRangeSignature = (document, _, token) => {
					const requestParams: FoldingRangeParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document)
					};
					return client.sendRequest(FoldingRangeRequest.type, requestParams, token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asFoldingRanges(result, token);
					}, (error: any) => {
						return client.handleFailedRequest(FoldingRangeRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideFoldingRanges
					? middleware.provideFoldingRanges(document, context, token, provideFoldingRanges)
					: provideFoldingRanges(document, context, token);
			}
		};
		return [Languages.registerFoldingRangeProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider), provider];
	}
}