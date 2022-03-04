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
export type ResolveInlayHintSignature = (this: void, item: VInlayHint, token: CancellationToken) => ProviderResult<VInlayHint>;

export type InlayHintsMiddleware = {
	provideInlayHints?: (this: void, document: TextDocument, viewPort: VRange, token: CancellationToken, next: ProvideInlayHintsSignature) => ProviderResult<VInlayHint[]>;
	resolveInlayHint?: (this: void, item: VInlayHint, token: CancellationToken, next: ResolveInlayHintSignature) => ProviderResult<VInlayHint>;
};

export type InlayHintsProviderShape = {
	provider: InlayHintsProvider;
	onDidChangeInlayHints: EventEmitter<void>;
};

export class InlayHintsFeature extends TextDocumentFeature<boolean | Proposed.InlayHintsOptions, Proposed.InlayHintsRegistrationOptions, InlayHintsProviderShape> {
	constructor(client: BaseLanguageClient) {
		super(client, Proposed.InlayHintsRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const inlayHints = ensure(ensure(capabilities, 'textDocument')!, 'inlayHints')!;
		inlayHints.dynamicRegistration = true;
		inlayHints.inlayHint = {
			resolveSupport: {
				properties: ['label.tooltip', 'label.location', 'label.command']
			}
		};
		ensure(ensure(capabilities, 'workspace')!, 'inlayHints')!.refreshSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		this._client.onRequest(Proposed.InlayHintRefreshRequest.type, async () => {
			for (const provider of this.getAllProviders()) {
				provider.onDidChangeInlayHints.fire();
			}
		});

		const [id, options] = this.getRegistration(documentSelector, capabilities.inlayHintsProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: Proposed.InlayHintsRegistrationOptions): [Disposable, InlayHintsProviderShape] {
		const selector = options.documentSelector!;
		const eventEmitter: EventEmitter<void> = new EventEmitter<void>();
		const provider: InlayHintsProvider = {
			onDidChangeInlayHints: eventEmitter.event,
			provideInlayHints: (document, viewPort, token) => {
				if ($DocumentSelector.skipCellTextDocument(selector, document)) {
					return undefined;
				}
				const client = this._client;
				const provideInlayHints: ProvideInlayHintsSignature = async (document, viewPort, token) => {
					const requestParams: Proposed.InlayHintsParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						viewPort: client.code2ProtocolConverter.asRange(viewPort)
					};
					try {
						const values = await client.sendRequest(Proposed.InlayHintsRequest.type, requestParams, token);
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asInlayHints(values, token);
					} catch (error) {
						return client.handleFailedRequest(Proposed.InlayHintsRequest.type, token, error, null);
					}
				};
				const middleware = client.clientOptions.middleware!;
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
						const value = await client.sendRequest(Proposed.InlayHintResolveRequest.type, client.code2ProtocolConverter.asInlayHint(item), token);
						if (token.isCancellationRequested) {
							return null;
						}
						const result = client.protocol2CodeConverter.asInlayHint(value, token);
						return token.isCancellationRequested ? null : result;
					} catch (error) {
						return client.handleFailedRequest(Proposed.InlayHintResolveRequest.type, token, error, null);
					}
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.resolveInlayHint
					? middleware.resolveInlayHint(hint, token, resolveInlayHint)
					: resolveInlayHint(hint, token);

			}
			: undefined;
		return [Languages.registerInlayHintsProvider($DocumentSelector.asTextDocumentFilters(selector), provider), { provider: provider, onDidChangeInlayHints: eventEmitter }];
	}
}