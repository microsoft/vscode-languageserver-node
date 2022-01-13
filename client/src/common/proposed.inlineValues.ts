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

export interface ProvideInlineValuesSignature {
	(this: void, document: TextDocument, viewPort: VRange, context: VInlineValueContext, token: CancellationToken): ProviderResult<VInlineValue[]>;
}

export interface InlineValuesProviderMiddleware {
	provideInlineValues?: (this: void, document: TextDocument, viewPort: VRange, context: VInlineValueContext, token: CancellationToken, next: ProvideInlineValuesSignature) => ProviderResult<VInlineValue[]>;
}

export interface InlineValuesProviderData {
	provider: InlineValuesProvider;
	onDidChangeInlineValues: EventEmitter<void>;
}

export class InlineValueFeature extends TextDocumentFeature<boolean | Proposed.InlineValuesOptions, Proposed.InlineValuesRegistrationOptions, InlineValuesProviderData> {
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
		const eventEmitter: EventEmitter<void> = new EventEmitter<void>();
		const provider: InlineValuesProvider = {
			onDidChangeInlineValues: eventEmitter.event,
			provideInlineValues: (document, viewPort, context, token) => {
				const client = this._client;
				const provideInlineValues: ProvideInlineValuesSignature = (document, viewPort, context, token) => {
					const requestParams: Proposed.InlineValuesParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						viewPort: client.code2ProtocolConverter.asRange(viewPort),
						context: client.code2ProtocolConverter.asInlineValuesContext(context)
					};
					return client.sendRequest(Proposed.InlineValuesRequest.type, requestParams, token).then(
						(values) => client.protocol2CodeConverter.asInlineValues(values),
						(error: any) => {
							return client.handleFailedRequest(Proposed.InlineValuesRequest.type, token, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideInlineValues
					? middleware.provideInlineValues(document, viewPort, context, token, provideInlineValues)
					: provideInlineValues(document, viewPort, context, token);

			}
		};
		const [textDocumentSelectors] = $DocumentSelector.split(options.documentSelector!);
		return [Languages.registerInlineValuesProvider(textDocumentSelectors, provider), { provider: provider, onDidChangeInlineValues: eventEmitter }];
	}
}