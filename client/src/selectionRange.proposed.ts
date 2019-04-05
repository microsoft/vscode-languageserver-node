/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as UUID from './utils/uuid';
import * as Is from './utils/is';

import { languages as Languages, Disposable, TextDocument, ProviderResult, Position as VPosition, SelectionRange as VSelectionRange } from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, TextDocumentRegistrationOptions, DocumentSelector, StaticRegistrationOptions, Proposed
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
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
		super(client, Proposed.SelectionRangeRequest.type);
	}

	public fillClientCapabilities(cap: ClientCapabilities): void {
		let capabilites: ClientCapabilities & Proposed.SelectionRangeClientCapabilities = cap as ClientCapabilities & Proposed.SelectionRangeClientCapabilities;
		let capability = ensure(ensure(capabilites, 'textDocument')!, 'selectionRange')!;
		capability.dynamicRegistration = true;
	}

	public initialize(cap: ServerCapabilities, documentSelector: DocumentSelector): void {
		let capabilities: ServerCapabilities & Proposed.SelectionRangeServerCapabilities = cap;
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
			const requestParams: Proposed.SelectionRangeParams = {
				textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
				positions: client.code2ProtocolConverter.asPositions(positions)
			};
			return client.sendRequest(Proposed.SelectionRangeRequest.type, requestParams, token).then(
				(ranges) => this.asSelectionRanges(ranges),
				(error: any) => {
					client.logFailedRequest(Proposed.SelectionRangeRequest.type, error);
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

	private asSelectionRanges(selectionRanges: Proposed.SelectionRange[] | null): VSelectionRange[] {
		if (!Array.isArray(selectionRanges)) {
			return [];
		}
		return selectionRanges.map(this.asSelectionRange);
	}

	private asSelectionRange(selectionRange: Proposed.SelectionRange): VSelectionRange {
		return new VSelectionRange(this._client.protocol2CodeConverter.asRange(selectionRange.range),
			selectionRange.parent ? this.asSelectionRange(selectionRange.parent) : undefined
		);
	}
}