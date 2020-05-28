/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { languages as Languages, Disposable, TextDocument, ProviderResult, Position as VPosition, SelectionRange as VSelectionRange, SelectionRangeProvider } from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector,
	SelectionRangeParams, SelectionRangeRequest, SelectionRangeOptions, SelectionRangeRegistrationOptions
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient  } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = Object.create(null) as any;
	}
	return target[key];
}

export interface ProvideSelectionRangeSignature {
	(this: void, document: TextDocument, positions: VPosition[], token: CancellationToken): ProviderResult<VSelectionRange[]>;
}

export interface SelectionRangeProviderMiddleware {
	provideSelectionRanges?: (this: void, document: TextDocument, positions: VPosition[], token: CancellationToken, next: ProvideSelectionRangeSignature) => ProviderResult<VSelectionRange[]>;
}

export class SelectionRangeFeature extends TextDocumentFeature<boolean | SelectionRangeOptions, SelectionRangeRegistrationOptions, SelectionRangeProvider> {
	constructor(client: BaseLanguageClient) {
		super(client, SelectionRangeRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		let capability = ensure(ensure(capabilites, 'textDocument')!, 'selectionRange')!;
		capability.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let [id, options] = this.getRegistration(documentSelector, capabilities.selectionRangeProvider);
		if (!id || !options) {
			return;
		}
		this.register(this.messages, { id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: SelectionRangeRegistrationOptions): [Disposable, SelectionRangeProvider] {
		const provider: SelectionRangeProvider = {
			provideSelectionRanges: (document, positions, token) => {
				const client = this._client;
				const provideSelectionRanges: ProvideSelectionRangeSignature = (document, positions, token) => {
					const requestParams: SelectionRangeParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						positions: client.code2ProtocolConverter.asPositions(positions)
					};
					return client.sendRequest(SelectionRangeRequest.type, requestParams, token).then(
						(ranges) => client.protocol2CodeConverter.asSelectionRanges(ranges),
						(error: any) => {
							return client.handleFailedRequest(SelectionRangeRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideSelectionRanges
					? middleware.provideSelectionRanges(document, positions, token, provideSelectionRanges)
					: provideSelectionRanges(document, positions, token);

			}
		};
		return [Languages.registerSelectionRangeProvider(options.documentSelector!, provider), provider];
	}
}