/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as UUID from './utils/uuid';
import * as Is from './utils/is';

import {
	languages as Languages, Disposable, TextDocument, ProviderResult, Position as VPosition, CancellationToken as VCancellationToken,
	CallHierarchyDirection as VCallHierarchyDirection, CallHierarchyItem as VCallHierarchyItem, CallHierarchyItemProvider, Location as VLocation
 } from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, TextDocumentRegistrationOptions, DocumentSelector, StaticRegistrationOptions, Proposed,
	Range
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient, Middleware } from './client';
import { CallHierarchyItem } from 'vscode-languageserver-protocol/lib/protocol.callHierarchy.proposed';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface ProvideCallHierachySignature {
	(document: TextDocument, positions: VPosition, token: CancellationToken): ProviderResult<VCallHierarchyItem>;
}

export interface ResolveCallHierarchySignature {
	(item: VCallHierarchyItem, direction: VCallHierarchyDirection, token: CancellationToken): ProviderResult<[VCallHierarchyItem, VLocation[]][]>;
}

export interface CallHierarchyMiddleware {
	provideCallHierarchy?: (this: void, document: TextDocument, positions: VPosition, token: CancellationToken, next: ProvideCallHierachySignature) => ProviderResult<VCallHierarchyItem>;
	resolveCallHierarchy?: (this: void,item: VCallHierarchyItem, direction: VCallHierarchyDirection, token: CancellationToken, next: ResolveCallHierarchySignature) => ProviderResult<[VCallHierarchyItem, VLocation[]][]>;
}

class CallHierarchyProvider implements CallHierarchyItemProvider{

	private middleware: Middleware & CallHierarchyMiddleware;

	constructor(private client: BaseLanguageClient) {
		this.middleware = client.clientOptions.middleware!;
	}

	public provideCallHierarchyItem(document: TextDocument, postion: VPosition, token: VCancellationToken): ProviderResult<VCallHierarchyItem> {
		return this.middleware.provideCallHierarchy
			? this.middleware.provideCallHierarchy(document, postion, token, (document, position, token) => this.doProvideCallHierarchyItem(document, position, token))
			: this.doProvideCallHierarchyItem(document, postion, token);
	}

	public resolveCallHierarchyItem(item: VCallHierarchyItem, direction: VCallHierarchyDirection, token: VCancellationToken): ProviderResult<[VCallHierarchyItem, VLocation[]][]> {
		return this.middleware.resolveCallHierarchy
			? this.middleware.resolveCallHierarchy(item, direction, token, (item, direction, token) => this.doResolveCallHierarchyItem(item, direction, token))
			: this.doResolveCallHierarchyItem(item, direction, token);
	}

	private doProvideCallHierarchyItem(document: TextDocument, position: VPosition, token: VCancellationToken): ProviderResult<VCallHierarchyItem> {
		const client = this.client;
		return client.sendRequest(Proposed.CallHierarchyRequest.type, this.asCallHierarchyParams(document, position), token).then((values) => {
			if (!Array.isArray(values) || values.length === 0) {
				return undefined;
			}
			return this.asCallHierarchyItem(values[0].from);
		});
	}

	private doResolveCallHierarchyItem(item: VCallHierarchyItem, direction: VCallHierarchyDirection, token: VCancellationToken): ProviderResult<[VCallHierarchyItem, VLocation[]][]> {
		const client = this.client;
		const converter = client.code2ProtocolConverter;
		const params: Proposed.CallHierarchyParams = {
			textDocument: {
				uri: converter.asUri(item.uri)
			},
			position: converter.asPosition(item.selectionRange.start),
			direction: direction
		};

		const makeKey = (item: CallHierarchyItem): string => {
			let key: { uri: string; range: Range } = {
				uri: item.uri,
				range: {
					start: {
						line: item.selectionRange.start.line,
						character: item.selectionRange.start.character
					},
					end: {
						line: item.selectionRange.end.line,
						character: item.selectionRange.end.character
					}
				}
			}
			return JSON.stringify(key);
		};

		return client.sendRequest(Proposed.CallHierarchyRequest.type, params, token).then(values => {
			if (!Array.isArray(values) || values.length === 0) {
				return undefined;
			}

			const result: Map<string, [VCallHierarchyItem, VLocation[]]> = new Map();

			for (let relation of values) {
				let key = makeKey(relation.from);
				let resultItem: [VCallHierarchyItem, VLocation[]] | undefined = result.get(key);
				if (resultItem === undefined) {
					const callItem = this.asCallHierarchyItem(relation.from);
					resultItem = [callItem, []];
					result.set(key, resultItem);
				}
				resultItem[1].push(this.asLocation(relation.to));
			}

			return Array.from(result.values());
		});
	}

	private asCallHierarchyParams(document: TextDocument, postion: VPosition): Proposed.CallHierarchyParams {
		const converter = this.client.code2ProtocolConverter;
		return {
			textDocument: converter.asTextDocumentIdentifier(document),
			position: converter.asPosition(postion),
			direction: Proposed.CallHierarchyDirection.CallsFrom
		};
	}

	private asCallHierarchyItem(value: Proposed.CallHierarchyItem): VCallHierarchyItem {
		const converter = this.client.protocol2CodeConverter;
		return new VCallHierarchyItem(
			converter.asSymbolKind(value.kind),
			value.name,
			value.detail || '',
			converter.asUri(value.uri),
			converter.asRange(value.range),
			converter.asRange(value.selectionRange)
		);
	}

	private asLocation(value: Proposed.CallHierarchyItem): VLocation {
		const converter = this.client.protocol2CodeConverter;
		return new VLocation(converter.asUri(value.uri), converter.asRange(value.selectionRange));
	}
}

export class CallHierarchyFeature extends TextDocumentFeature<TextDocumentRegistrationOptions> {
	constructor(client: BaseLanguageClient) {
		super(client, Proposed.CallHierarchyRequest.type);
	}

	public fillClientCapabilities(cap: ClientCapabilities): void {
		let capabilites: ClientCapabilities & Proposed.CallHierarchyClientCapabilities = cap as ClientCapabilities & Proposed.CallHierarchyClientCapabilities;
		let capability = ensure(ensure(capabilites, 'textDocument')!, 'callHierarchy')!;
		capability.dynamicRegistration = true;
	}

	public initialize(cap: ServerCapabilities, documentSelector: DocumentSelector): void {
		let capabilities: ServerCapabilities & Proposed.CallHierarchyServerCapabilities = cap;
		if (!capabilities.callHierarchyProvider) {
			return;
		}

		const implCapabilities = capabilities.callHierarchyProvider as TextDocumentRegistrationOptions & StaticRegistrationOptions;
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
		let provider = new CallHierarchyProvider(client);
		return Languages.registerCallHierarchyProvider(options.documentSelector!, provider);
	}
}

declare module 'vscode' {
	export enum CallHierarchyDirection {
		CallsFrom = 1,
		CallsTo = 2,
	}

	export class CallHierarchyItem {
		kind: SymbolKind;
		name: string;
		detail?: string;
		uri: Uri;
		range: Range;
		selectionRange: Range;

		constructor(kind: SymbolKind, name: string, detail: string, uri: Uri, range: Range, selectionRange: Range);
	}

	export interface CallHierarchyItemProvider {

		/**
		 * Given a document and position compute a call hierarchy item. This is justed as
		 * anchor for call hierarchy and then `resolveCallHierarchyItem` is being called.
		 */
		provideCallHierarchyItem(
			document: TextDocument,
			postion: Position,
			token: CancellationToken
		): ProviderResult<CallHierarchyItem>;

		/**
		 * Resolve a call hierarchy item, e.g. compute all calls from or to a function.
		 * The result is an array of item/location-tuples. The location in the returned tuples
		 * is always relative to the "caller" with the caller either being the provided item or
		 * the returned item.
		 *
		 * @param item A call hierarchy item previously returned from `provideCallHierarchyItem` or `resolveCallHierarchyItem`
		 * @param direction Resolve calls from a function or calls to a function
		 * @param token A cancellation token
		 */
		resolveCallHierarchyItem(
			item: CallHierarchyItem,
			direction: CallHierarchyDirection,
			token: CancellationToken
		): ProviderResult<[CallHierarchyItem, Location[]][]>;
	}

	export namespace languages {
		export function registerCallHierarchyProvider(selector: DocumentSelector, provider: CallHierarchyItemProvider): Disposable;
	}
}