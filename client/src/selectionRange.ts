/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as UUID from './utils/uuid';
import * as Is from './utils/is';

import { languages as Languages, Disposable, TextDocument, ProviderResult, Position as VPosition, SelectionRange as VSelectionRange } from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, TextDocumentRegistrationOptions, DocumentSelector, StaticRegistrationOptions,
	SelectionRangeParams, SelectionRangeRequest, SelectionRangeClientCapabilities, SelectionRangeServerCapabilities
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient  } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = Object.create(null) as any;
	}
	return target[key];
}

export interface ProvideSelectionRangeSignature {
	(document: TextDocument, positions: VPosition[], token: CancellationToken): ProviderResult<VSelectionRange[]>;
}

export interface SelectionRangeProviderMiddleware {
	provideSelectionRanges?: (this: void, document: TextDocument, positions: VPosition[], token: CancellationToken, next: ProvideSelectionRangeSignature) => ProviderResult<VSelectionRange[]>;
}

export class SelectionRangeFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {
	constructor(client: BaseLanguageClient) {
		super(client, SelectionRangeRequest.type);
	}

	public fillClientCapabilities(cap: ClientCapabilities): void {
		let capabilites: ClientCapabilities & SelectionRangeClientCapabilities = cap as ClientCapabilities & SelectionRangeClientCapabilities;
		let capability = ensure(ensure(capabilites, 'textDocument')!, 'selectionRange')!;
		capability.dynamicRegistration = true;
	}

	public initialize(cap: ServerCapabilities, documentSelector: DocumentSelector): void {
		let capabilities: ServerCapabilities & SelectionRangeServerCapabilities = cap;
		if (!capabilities.selectionRangeProvider) {
			return;
		}

		const implCapabilities = capabilities.selectionRangeProvider as TextDocumentRegistrationOptions & StaticRegistrationOptions;
		const id = Is.string(implCapabilities.id) && implCapabilities.id.length > 0 ? implCapabilities.id : UUID.generateUuid();
		const selector = implCapabilities.documentSelector || documentSelector;
		if (selector) {
			this.register(this.messages, {
				id,
				registerOptions: Object.assign({}, { documentSelector: selector })
			});
		}
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): Disposable {
		let client = this._client;
		let provideSelectionRanges: ProvideSelectionRangeSignature = (document, positions, token) => {
			const requestParams: SelectionRangeParams = {
				textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
				positions: client.code2ProtocolConverter.asPositions(positions)
			};
			return client.sendRequest(SelectionRangeRequest.type, requestParams, token).then(
				(ranges) => client.protocol2CodeConverter.asSelectionRanges(ranges),
				(error: any) => {
					client.logFailedRequest(SelectionRangeRequest.type, error);
					return Promise.resolve(null);
				}
			);
		};
		let middleware = client.clientOptions.middleware!;
		return Languages.registerSelectionRangeProvider(options.documentSelector!, {
			provideSelectionRanges(document: TextDocument, positions: VPosition[], token: CancellationToken): ProviderResult<VSelectionRange[]> {
				return middleware.provideSelectionRanges
					? middleware.provideSelectionRanges(document, positions, token, provideSelectionRanges)
					: provideSelectionRanges(document, positions, token);

			}
		});
	}


}