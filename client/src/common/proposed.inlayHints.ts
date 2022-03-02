/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, Disposable, TextDocument, ProviderResult, Range as VRange, InlayHint as VInlayHint,
	InlayHintsProvider, EventEmitter
} from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector, Proposed
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient, $DocumentSelector } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = Object.create(null) as any;
	}
	return target[key];
}

export type ProvideInlayHintsSignature = (this: void, document: TextDocument, viewPort: VRange, token: CancellationToken) => ProviderResult<VInlayHint[]>;

export type InlineValuesProviderMiddleware = {
	provideInlayHints?: (this: void, document: TextDocument, viewPort: VRange, token: CancellationToken, next: ProvideInlayHintsSignature) => ProviderResult<VInlayHint[]>;
};

export type InlayHintsProviderData = {
	provider: InlayHintsProvider;
	onDidChangeInlineValues: EventEmitter<void>;
};

export class InlayHintsFeature extends TextDocumentFeature<boolean | Proposed.InlayHintsOptions, Proposed.InlayHintsRegistrationOptions, InlayHintsProviderData> {
	constructor(client: BaseLanguageClient) {
		super(client, Proposed.InlineValuesRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'inlineValues')!.dynamicRegistration = true;
		ensure(ensure(capabilities, 'workspace')!, 'codeLens')!.refreshSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		this._client.onRequest(Proposed.InlineValuesRefreshRequest.type, async () => {
			for (const provider of this.getAllProviders()) {
				provider.onDidChangeInlineValues.fire();
			}
		});

		const [id, options] = this.getRegistration(documentSelector, capabilities.inlineValuesProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: Proposed.InlineValuesRegistrationOptions): [Disposable, InlineValuesProviderData] {
		const selector = options.documentSelector!;
		const eventEmitter: EventEmitter<void> = new EventEmitter<void>();
		const provider: InlayHintsProvider = {
			onDidChangeInlayHints: eventEmitter.event,
			provideInlineValues: (document, viewPort, context, token) => {
				if ($DocumentSelector.skipCellTextDocument(selector, document)) {
					return undefined;
				}
				const client = this._client;
				const provideInlineValues: ProvideInlineValuesSignature = (document, viewPort, context, token) => {
					const requestParams: Proposed.InlineValuesParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						viewPort: client.code2ProtocolConverter.asRange(viewPort),
						context: client.code2ProtocolConverter.asInlineValuesContext(context)
					};
					return client.sendRequest(Proposed.InlineValuesRequest.type, requestParams, token).then((values) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asInlineValues(values, token);
					}, (error: any) => {
						return client.handleFailedRequest(Proposed.InlineValuesRequest.type, token, error, null);
					});
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideInlineValues
					? middleware.provideInlineValues(document, viewPort, context, token, provideInlineValues)
					: provideInlineValues(document, viewPort, context, token);

			}
		};
		return [Languages.registerInlineValuesProvider($DocumentSelector.asTextDocumentFilters(selector), provider), { provider: provider, onDidChangeInlineValues: eventEmitter }];
	}
}