/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="../../typings/vscode-proposed.d.ts" />

import * as code from 'vscode';
import * as proto from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface ProvideLinkedEditingRangeSignature {
	(this: void, document: code.TextDocument, position: code.Position, token: code.CancellationToken): code.ProviderResult<code.LinkedEditingRanges>;
}

/**
 * Linked editing middleware
 *
 * @since 3.16.0
 */
export interface LinkedEditingRangeMiddleware {
	provideLinkedEditingRange?: (this: void, document: code.TextDocument, position: code.Position, token: code.CancellationToken, next: ProvideLinkedEditingRangeSignature) => code.ProviderResult<code.LinkedEditingRanges>;
}

export class LinkedEditingFeature extends TextDocumentFeature<boolean | proto.LinkedEditingRangeOptions, proto.LinkedEditingRangeRegistrationOptions, code.LinkedEditingRangeProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, proto.LinkedEditingRangeRequest.type);
	}

	public fillClientCapabilities(capabilities: proto.ClientCapabilities): void {
		const linkedEditingSupport = ensure(ensure(capabilities, 'textDocument')!, 'linkedEditingRange')!;
		linkedEditingSupport.dynamicRegistration = true;
	}

	public initialize(capabilities: proto.ServerCapabilities, documentSelector: proto.DocumentSelector): void {
		let [id, options] = this.getRegistration(documentSelector, capabilities.linkedEditingRangeProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: proto.LinkedEditingRangeRegistrationOptions): [code.Disposable, code.LinkedEditingRangeProvider] {
		const provider: code.LinkedEditingRangeProvider = {
			provideLinkedEditingRanges: (document, position, token) => {
				const client = this._client;
				const provideLinkedEditing: ProvideLinkedEditingRangeSignature = (document, position, token) => {
					return client.sendRequest(proto.LinkedEditingRangeRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then(
						client.protocol2CodeConverter.asLinkedEditingRanges,
						(error) => {
							return client.handleFailedRequest(proto.LinkedEditingRangeRequest.type, token, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideLinkedEditingRange
					? middleware.provideLinkedEditingRange(document, position, token, provideLinkedEditing)
					: provideLinkedEditing(document, position, token);
			}
		};
		return [code.languages.registerLinkedEditingRangeProvider(options.documentSelector!, provider), provider];
	}
}