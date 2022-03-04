/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, Disposable, TextDocument, ProviderResult, Range as VRange, InlineValueContext as VInlineValueContext, InlineValue as VInlineValue,
	InlineValuesProvider, EventEmitter
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

export type ProvideInlineValuesSignature = (this: void, document: TextDocument, viewPort: VRange, context: VInlineValueContext, token: CancellationToken) => ProviderResult<VInlineValue[]>;

export type InlineValueMiddleware = {
	provideInlineValues?: (this: void, document: TextDocument, viewPort: VRange, context: VInlineValueContext, token: CancellationToken, next: ProvideInlineValuesSignature) => ProviderResult<VInlineValue[]>;
};

export type InlineValueProviderShape = {
	provider: InlineValuesProvider;
	onDidChangeInlineValues: EventEmitter<void>;
};

export class InlineValueFeature extends TextDocumentFeature<boolean | Proposed.InlineValueOptions, Proposed.InlineValueRegistrationOptions, InlineValueProviderShape> {
	constructor(client: BaseLanguageClient) {
		super(client, Proposed.InlineValueRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'inlineValue')!.dynamicRegistration = true;
		ensure(ensure(capabilities, 'workspace')!, 'inlineValue')!.refreshSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		this._client.onRequest(Proposed.InlineValueRefreshRequest.type, async () => {
			for (const provider of this.getAllProviders()) {
				provider.onDidChangeInlineValues.fire();
			}
		});

		const [id, options] = this.getRegistration(documentSelector, capabilities.inlineValueProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: Proposed.InlineValueRegistrationOptions): [Disposable, InlineValueProviderShape] {
		const selector = options.documentSelector!;
		const eventEmitter: EventEmitter<void> = new EventEmitter<void>();
		const provider: InlineValuesProvider = {
			onDidChangeInlineValues: eventEmitter.event,
			provideInlineValues: (document, viewPort, context, token) => {
				if ($DocumentSelector.skipCellTextDocument(selector, document)) {
					return undefined;
				}
				const client = this._client;
				const provideInlineValues: ProvideInlineValuesSignature = (document, viewPort, context, token) => {
					const requestParams: Proposed.InlineValueParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						viewPort: client.code2ProtocolConverter.asRange(viewPort),
						context: client.code2ProtocolConverter.asInlineValueContext(context)
					};
					return client.sendRequest(Proposed.InlineValueRequest.type, requestParams, token).then((values) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asInlineValues(values, token);
					}, (error: any) => {
						return client.handleFailedRequest(Proposed.InlineValueRequest.type, token, error, null);
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