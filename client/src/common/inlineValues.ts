/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { languages as Languages, Disposable, TextDocument, ProviderResult, Range as VRange, InlineValueContext as VInlineValueContext, InlineValue as VInlineValue, InlineValuesProvider } from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector,
	InlineValuesParams, InlineValuesRequest, InlineValuesOptions, InlineValuesRegistrationOptions
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient } from './client';

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

export class InlineValueFeature extends TextDocumentFeature<boolean | InlineValuesOptions, InlineValuesRegistrationOptions, InlineValuesProvider> {
	constructor(client: BaseLanguageClient) {
		super(client, InlineValuesRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let capability = ensure(ensure(capabilities, 'textDocument')!, 'inlineValues')!;
		capability.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let [id, options] = this.getRegistration(documentSelector, capabilities.inlineValuesProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: InlineValuesRegistrationOptions): [Disposable, InlineValuesProvider] {
		const provider: InlineValuesProvider = {
			provideInlineValues: (document, viewPort, context, token) => {
				const client = this._client;
				const provideInlineValues: ProvideInlineValuesSignature = (document, viewPort, context, token) => {
					const requestParams: InlineValuesParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						viewPort: client.code2ProtocolConverter.asRange(viewPort),
						context: client.code2ProtocolConverter.asInlineValuesContext(context)
					};
					return client.sendRequest(InlineValuesRequest.type, requestParams, token).then(
						(values) => client.protocol2CodeConverter.asInlineValues(values),
						(error: any) => {
							return client.handleFailedRequest(InlineValuesRequest.type, token, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideInlineValues
					? middleware.provideInlineValues(document, viewPort, context, token, provideInlineValues)
					: provideInlineValues(document, viewPort, context, token);

			}
		};
		return [Languages.registerInlineValuesProvider(options.documentSelector!, provider), provider];
	}
}
