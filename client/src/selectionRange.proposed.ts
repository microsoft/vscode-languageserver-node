/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as UUID from './utils/uuid';
import * as Is from './utils/is';

import { languages as Languages, Disposable, TextDocument, ProviderResult, Position as VPosition, SelectionRange as VSelectionRange, SelectionRangeKind as VSelectionRangeKind } from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, TextDocumentRegistrationOptions, DocumentSelector, StaticRegistrationOptions,
	TextDocumentPositionParams,
	SelectionRangeRequest, SelectionRangeProviderOptions, SelectionRangeKind, SelectionRange
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface ProvideSelectionRangeSignature {
	(document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VSelectionRange[] | null>;
}


export interface SelectionRangeProviderMiddleware {
	provideSelectionRanges?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideSelectionRangeSignature) => ProviderResult<VSelectionRange[]>;
}

export class SelectionRangeFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {
	constructor(client: BaseLanguageClient) {
		super(client, SelectionRangeRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		let capability = ensure(ensure(capabilites, 'textDocument')!, 'selectionRange')!;
		capability.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		if (!capabilities.selectionRangeProvider) {
			return;
		}

		const implCapabilities = capabilities.selectionRangeProvider as TextDocumentRegistrationOptions & StaticRegistrationOptions & SelectionRangeProviderOptions;
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
		let provideSelectionRanges: ProvideSelectionRangeSignature = (document, position, token) => {
			const requestParams: TextDocumentPositionParams = {
				textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
				position: client.code2ProtocolConverter.asPosition(position),
			};
			return client.sendRequest(SelectionRangeRequest.type, requestParams, token).then(
				(ranges) => this.asSelectionRanges(ranges),
				(error: any) => {
					client.logFailedRequest(SelectionRangeRequest.type, error);
					return Promise.resolve(null);
				}
			);
		};
		let middleware = client.clientOptions.middleware!;
		return Languages.registerSelectionRangeProvider(options.documentSelector!, {
			provideSelectionRanges(document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VSelectionRange[]> {
				return middleware.provideSelectionRanges
					? middleware.provideSelectionRanges(document, position, token, provideSelectionRanges)
					: provideSelectionRanges(document, position, token);

			}
		});
	}

	private asSelectionRanges(selectionRanges: SelectionRange[] | null): VSelectionRange[] {
		if (!Array.isArray(selectionRanges)) return [];
		return selectionRanges.map(r => {
			return new VSelectionRange(
				this._client.protocol2CodeConverter.asRange(r.range),
				this.asSelectionRangeKind(r.kind),
			);
		});
	}

	private asSelectionRangeKind(kind?: string): VSelectionRangeKind {
		switch (kind) {
			case SelectionRangeKind.Empty:
				return VSelectionRangeKind.Empty;
			case SelectionRangeKind.Statement:
				return VSelectionRangeKind.Statement;
			case SelectionRangeKind.Declaration:
				return VSelectionRangeKind.Declaration;
			default:
				return VSelectionRangeKind.Empty
		}
	}
}

declare module 'vscode' {

	export class SelectionRangeKind {

		/**
		 * Empty Kind.
		 */
		static readonly Empty: SelectionRangeKind;

		/**
		 * The statment kind, its value is `statement`, possible extensions can be
		 * `statement.if` etc
		 */
		static readonly Statement: SelectionRangeKind;

		/**
		 * The declaration kind, its value is `declaration`, possible extensions can be
		 * `declaration.function`, `declaration.class` etc.
		 */
		static readonly Declaration: SelectionRangeKind;

		readonly value: string;

		private constructor(value: string);

		append(value: string): SelectionRangeKind;
	}

	export class SelectionRange {
		kind: SelectionRangeKind;
		range: Range;
		constructor(range: Range, kind: SelectionRangeKind);
	}

	export interface SelectionRangeProvider {
		/**
		 * Provide selection ranges starting at a given position. The first range must [contain](#Range.contains)
		 * position and subsequent ranges must contain the previous range.
		 */
		provideSelectionRanges(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<SelectionRange[]>;
	}

	export namespace languages {
		export function registerSelectionRangeProvider(selector: DocumentSelector, provider: SelectionRangeProvider): Disposable;
}}
