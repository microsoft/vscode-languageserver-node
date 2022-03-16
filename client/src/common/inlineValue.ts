/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, Disposable, TextDocument, ProviderResult, Range as VRange, InlineValueContext as VInlineValueContext, InlineValue as VInlineValue,
	InlineValuesProvider, EventEmitter
} from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector, InlineValueOptions, InlineValueRegistrationOptions,
	InlineValueRefreshRequest, InlineValueParams, InlineValueRequest,
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient } from './client';

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

export class InlineValueFeature extends TextDocumentFeature<boolean | InlineValueOptions, InlineValueRegistrationOptions, InlineValueProviderShape> {
	constructor(client: BaseLanguageClient) {
		super(client, InlineValueRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'inlineValue')!.dynamicRegistration = true;
		ensure(ensure(capabilities, 'workspace')!, 'inlineValue')!.refreshSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		this._client.onRequest(InlineValueRefreshRequest.type, async () => {
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

	protected registerLanguageProvider(options: InlineValueRegistrationOptions): [Disposable, InlineValueProviderShape] {
		const selector = options.documentSelector!;
		const eventEmitter: EventEmitter<void> = new EventEmitter<void>();
		const provider: InlineValuesProvider = {
			onDidChangeInlineValues: eventEmitter.event,
			provideInlineValues: (document, viewPort, context, token) => {
				const client = this._client;
				const provideInlineValues: ProvideInlineValuesSignature = (document, viewPort, context, token) => {
					const requestParams: InlineValueParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						range: client.code2ProtocolConverter.asRange(viewPort),
						context: client.code2ProtocolConverter.asInlineValueContext(context)
					};
					return client.sendRequest(InlineValueRequest.type, requestParams, token).then((values) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asInlineValues(values, token);
					}, (error: any) => {
						return client.handleFailedRequest(InlineValueRequest.type, token, error, null);
					});
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideInlineValues
					? middleware.provideInlineValues(document, viewPort, context, token, provideInlineValues)
					: provideInlineValues(document, viewPort, context, token);

			}
		};
		return [Languages.registerInlineValuesProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider), { provider: provider, onDidChangeInlineValues: eventEmitter }];
	}
}