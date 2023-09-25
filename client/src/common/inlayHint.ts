/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, Disposable, TextDocument, ProviderResult, Range as VRange, InlayHint as VInlayHint,
	InlayHintsProvider, EventEmitter
} from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector, InlayHintRequest, InlayHintOptions, InlayHintRegistrationOptions,
	InlayHintRefreshRequest, InlayHintParams, InlayHintResolveRequest
} from 'vscode-languageserver-protocol';

import { TextDocumentLanguageFeature, FeatureClient, ensure } from './features';

export type ProvideInlayHintsSignature = (this: void, document: TextDocument, viewPort: VRange, token: CancellationToken) => ProviderResult<VInlayHint[]>;
export type ResolveInlayHintSignature = (this: void, item: VInlayHint, token: CancellationToken) => ProviderResult<VInlayHint>;

export type InlayHintsMiddleware = {
	provideInlayHints?: (this: void, document: TextDocument, viewPort: VRange, token: CancellationToken, next: ProvideInlayHintsSignature) => ProviderResult<VInlayHint[]>;
	resolveInlayHint?: (this: void, item: VInlayHint, token: CancellationToken, next: ResolveInlayHintSignature) => ProviderResult<VInlayHint>;
};

export type InlayHintsProviderShape = {
	provider: InlayHintsProvider;
	onDidChangeInlayHints: EventEmitter<void>;
};

export class InlayHintsFeature extends TextDocumentLanguageFeature<boolean | InlayHintOptions, InlayHintRegistrationOptions, InlayHintsProviderShape, InlayHintsMiddleware> {
	constructor(client: FeatureClient<InlayHintsMiddleware>) {
		super(client, InlayHintRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const inlayHint = ensure(ensure(capabilities, 'textDocument')!, 'inlayHint')!;
		inlayHint.dynamicRegistration = true;
		inlayHint.resolveSupport = {
			properties: ['tooltip', 'textEdits', 'label.tooltip', 'label.location', 'label.command']
		};
		ensure(ensure(capabilities, 'workspace')!, 'inlayHint')!.refreshSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		this._client.onRequest(InlayHintRefreshRequest.type, async () => {
			for (const provider of this.getAllProviders()) {
				provider.onDidChangeInlayHints.fire();
			}
		});

		const [id, options] = this.getRegistration(documentSelector, capabilities.inlayHintProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: InlayHintRegistrationOptions): [Disposable, InlayHintsProviderShape] {
		const selector = options.documentSelector!;
		const eventEmitter: EventEmitter<void> = new EventEmitter<void>();
		const provider: InlayHintsProvider = {
			onDidChangeInlayHints: eventEmitter.event,
			provideInlayHints: (document, viewPort, token) => {
				const client = this._client;
				const provideInlayHints: ProvideInlayHintsSignature = async (document, viewPort, token) => {
					const requestParams: InlayHintParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						range: client.code2ProtocolConverter.asRange(viewPort)
					};
					try {
						const values = await client.sendRequest(InlayHintRequest.type, requestParams, token);
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asInlayHints(values, token);
					} catch (error) {
						return client.handleFailedRequest(InlayHintRequest.type, token, error, null);
					}
				};
				const middleware = client.middleware;
				return middleware.provideInlayHints
					? middleware.provideInlayHints(document, viewPort, token, provideInlayHints)
					: provideInlayHints(document, viewPort, token);

			}
		};
		provider.resolveInlayHint = options.resolveProvider === true
			? (hint, token) => {
				const client = this._client;
				const resolveInlayHint: ResolveInlayHintSignature = async (item, token) => {
					try {
						const value = await client.sendRequest(InlayHintResolveRequest.type, client.code2ProtocolConverter.asInlayHint(item), token);
						if (token.isCancellationRequested) {
							return null;
						}
						const result = client.protocol2CodeConverter.asInlayHint(value, token);
						return token.isCancellationRequested ? null : result;
					} catch (error) {
						return client.handleFailedRequest(InlayHintResolveRequest.type, token, error, null);
					}
				};
				const middleware = client.middleware;
				return middleware.resolveInlayHint
					? middleware.resolveInlayHint(hint, token, resolveInlayHint)
					: resolveInlayHint(hint, token);

			}
			: undefined;
		return [this.registerProvider(selector, provider), { provider: provider, onDidChangeInlayHints: eventEmitter }];
	}

	private registerProvider(selector: DocumentSelector, provider: InlayHintsProvider): Disposable {
		return Languages.registerInlayHintsProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider);
	}
}
