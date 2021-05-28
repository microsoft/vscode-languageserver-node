/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { languages as Languages, Disposable, TextDocument, Range, ProviderResult, InlayHintKind, InlayHint as VInlayHint, InlayHintsProvider } from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector, Proposed
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient, Middleware } from './client';
import * as p2c from './protocolConverter';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface ProvideInlayHintsSignature {
	(this: void, document: TextDocument, range: Range, token: CancellationToken): ProviderResult<VInlayHint[]>;
}

export interface InlayHintsMiddleware {
	provideInlayHints?: (this: void, document: TextDocument, range: Range, token: CancellationToken, next: ProvideInlayHintsSignature) => ProviderResult<VInlayHint[]>;
}

namespace protocol2code {
	function asInlayHintKind(_: p2c.Converter, value: string | null | undefined) : InlayHintKind | undefined {
		switch (value) {
			case Proposed.InlayHintCategory.Parameter:
				return InlayHintKind.Parameter;
			case Proposed.InlayHintCategory.Type:
				return InlayHintKind.Type;
			default:
				return InlayHintKind.Other;
		}
	}
	export function asInlayHint(converter: p2c.Converter, item: Proposed.InlayHint) : VInlayHint {
		const result = new VInlayHint(item.label.trim(), converter.asPosition(item.position), asInlayHintKind(converter, item.category));
		result.whitespaceBefore = item.label.startsWith(' ');
		result.whitespaceAfter = item.label.endsWith(' ');
		return result;
	}
}

export class InlayHintsFeature extends TextDocumentFeature<boolean | Proposed.InlayHintsOptions, Proposed.InlayHintsRegistrationOptions, InlayHintsProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, Proposed.InlayHintsRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities & Proposed.$InlayHintsClientCapabilities): void {
		let capability = ensure(ensure(capabilities, 'textDocument')!, 'inlayHints')!;
		capability.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities & Proposed.$InlayHintsServerCapabilities, documentSelector: DocumentSelector): void {
		let [id, options] = this.getRegistration(documentSelector, capabilities.inlayHintsProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: Proposed.InlayHintsRegistrationOptions): [Disposable, InlayHintsProvider] {
		const provider: InlayHintsProvider = {
			provideInlayHints: (document, range, token) => {
				const client = this._client;
				const provideInlayHints: ProvideInlayHintsSignature = (document, range, token) => {
					const requestParams: Proposed.InlayHintsParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						range: client.code2ProtocolConverter.asRange(range)
					};
					return client.sendRequest(Proposed.InlayHintsRequest.type, requestParams, token).then(
						(m: Proposed.InlayHint[]) => m.map(h => protocol2code.asInlayHint(client.protocol2CodeConverter, h)),
						(error: any) => {
							return client.handleFailedRequest(Proposed.InlayHintsRequest.type, token, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware as (Middleware & InlayHintsMiddleware) | undefined;
				return middleware?.provideInlayHints
					? middleware.provideInlayHints(document, range, token, provideInlayHints)
					: provideInlayHints(document, range, token);
			}
		};
		return [Languages.registerInlayHintsProvider(options.documentSelector!, provider), provider];
	}
}