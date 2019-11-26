/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	languages as Languages, Disposable, TextDocument, ProviderResult, Position as VPosition,
	CallHierarchyItem as VCallHierarchyItem, CallHierarchyIncomingCall as VCallHierarchyIncomingCall,
	CallHierarchyOutgoingCall as VCallHierarchyOutgoingCall, CancellationToken
} from 'vscode';

import {
	ClientCapabilities, ServerCapabilities, DocumentSelector, Proposed
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient, Middleware } from './client';
import * as c2p from './codeConverter';
import * as p2c from './protocolConverter';

import { CallHierarchyRegistrationOptions, CallHierarchyOptions, CallHierarchyPrepareRequest, CallHierarchyIncomingCallsRequest, CallHierarchyIncomingCallsParams, CallHierarchyOutgoingCallsParams, CallHierarchyOutgoingCallsRequest } from 'vscode-languageserver-protocol/lib/protocol.callHierarchy.proposed';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface PrepareCallHierachySignature {
	(this: void, document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VCallHierarchyItem>;
}

export interface CallHierarchyIncomingCallsSignature {
	(this: void, item: VCallHierarchyItem, token: CancellationToken): ProviderResult<VCallHierarchyIncomingCall[]>;
}

export interface CallHierarchyOutgoingCallsSignature {
	(this: void, item: VCallHierarchyItem, token: CancellationToken): ProviderResult<VCallHierarchyOutgoingCall[]>;
}

export interface CallHierarchyMiddleware {
	prepareCallHierarchy?: (this: void, document: TextDocument, positions: VPosition, token: CancellationToken, next: PrepareCallHierachySignature) => ProviderResult<VCallHierarchyItem>;
	callHierarchyIncomingCalls?: (this: void, item: VCallHierarchyItem, token: CancellationToken, next: CallHierarchyIncomingCallsSignature) => ProviderResult<VCallHierarchyIncomingCall[]>;
	callHierarchyOutgingCalls?: (this: void, item: VCallHierarchyItem, token: CancellationToken, next: CallHierarchyOutgoingCallsSignature) => ProviderResult<VCallHierarchyOutgoingCall[]>;
}

namespace protocol2code {

	export function asCallHierarchyItem(converter: p2c.Converter, item: null): undefined;
	export function asCallHierarchyItem(converter: p2c.Converter, item: Proposed.CallHierarchyItem): VCallHierarchyItem;
	export function asCallHierarchyItem(converter: p2c.Converter, item: Proposed.CallHierarchyItem | null): VCallHierarchyItem | undefined;
	export function asCallHierarchyItem(converter: p2c.Converter, item: Proposed.CallHierarchyItem | null): VCallHierarchyItem | undefined {
		if (item === null) {
			return undefined;
		}
		let result = new VCallHierarchyItem(
			converter.asSymbolKind(item.kind),
			item.name,
			item.detail || '',
			converter.asUri(item.uri),
			converter.asRange(item.range),
			converter.asRange(item.selectionRange)
		);
		if (item.tags !== undefined) { result.tags = converter.asSymbolTags(item.tags); }
		return result;
	}

	export function asCallHierarchyItems(converter: p2c.Converter, items: null): undefined;
	export function asCallHierarchyItems(converter: p2c.Converter, items: Proposed.CallHierarchyItem[]): VCallHierarchyItem;
	export function asCallHierarchyItems(converter: p2c.Converter, items: Proposed.CallHierarchyItem[] | null): VCallHierarchyItem | undefined;
	export function asCallHierarchyItems(converter: p2c.Converter, items: Proposed.CallHierarchyItem[] | null): VCallHierarchyItem | undefined {
		if (items === null) {
			return undefined;
		}
		let result = items.map(item => asCallHierarchyItem(converter, item));
		return result[0];
	}

	export function asCallHierarchyIncomingCall(converter: p2c.Converter, item: Proposed.CallHierarchyIncomingCall): VCallHierarchyIncomingCall {
		return new VCallHierarchyIncomingCall(
			asCallHierarchyItem(converter, item.from),
			converter.asRanges(item.fromRanges)
		);
	}
	export function asCallHierarchyIncomingCalls(converter: p2c.Converter, items: null): undefined;
	export function asCallHierarchyIncomingCalls(converter: p2c.Converter, items: ReadonlyArray<Proposed.CallHierarchyIncomingCall>): VCallHierarchyIncomingCall[];
	export function asCallHierarchyIncomingCalls(converter: p2c.Converter, items: ReadonlyArray<Proposed.CallHierarchyIncomingCall> | null): VCallHierarchyIncomingCall[] | undefined;
	export function asCallHierarchyIncomingCalls(converter: p2c.Converter, items: ReadonlyArray<Proposed.CallHierarchyIncomingCall> | null): VCallHierarchyIncomingCall[] | undefined {
		if (items === null) {
			return undefined;
		}
		return items.map(item => asCallHierarchyIncomingCall(converter, item));
	}

	export function asCallHierarchyOutgoingCall(converter: p2c.Converter, item: Proposed.CallHierarchyOutgoingCall): VCallHierarchyOutgoingCall {
		return new VCallHierarchyOutgoingCall(
			asCallHierarchyItem(converter, item.to),
			converter.asRanges(item.fromRanges)
		);
	}

	export function asCallHierarchyOutgoingCalls(converter: p2c.Converter, items: null): undefined;
	export function asCallHierarchyOutgoingCalls(converter: p2c.Converter, items: ReadonlyArray<Proposed.CallHierarchyOutgoingCall>): VCallHierarchyOutgoingCall[];
	export function asCallHierarchyOutgoingCalls(converter: p2c.Converter, items: ReadonlyArray<Proposed.CallHierarchyOutgoingCall> | null): VCallHierarchyOutgoingCall[] | undefined;
	export function asCallHierarchyOutgoingCalls(converter: p2c.Converter, items: ReadonlyArray<Proposed.CallHierarchyOutgoingCall> | null): VCallHierarchyOutgoingCall[] | undefined {
		if (items === null) {
			return undefined;
		}
		return items.map(item => asCallHierarchyOutgoingCall(converter, item));
	}
}

namespace code2protocol {
	export function asCallHierarchyItem(converter: c2p.Converter, value: VCallHierarchyItem): Proposed.CallHierarchyItem {
		const result: Proposed.CallHierarchyItem = {
			name: value.name,
			kind: converter.asSymbolKind(value.kind),
			uri: converter.asUri(value.uri),
			range: converter.asRange(value.range),
			selectionRange: converter.asRange(value.selectionRange)
		};
		if (value.detail !== undefined && value.detail.length > 0) { result.detail = value.detail; }
		if (value.tags !== undefined) { result.tags = converter.asSymbolTags(value.tags); }
		return result;
	}
}

class CallHierarchyProvider implements CallHierarchyProvider {

	private middleware: Middleware & CallHierarchyMiddleware;

	constructor(private client: BaseLanguageClient) {
		this.middleware = client.clientOptions.middleware!;
	}

	public prepareCallHierarchy(document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VCallHierarchyItem> {
		const client = this.client;
		const middleware = this.middleware;
		const prepareCallHierarchy: PrepareCallHierachySignature = (document, position, token) => {
			const params = client.code2ProtocolConverter.asTextDocumentPositionParams(document, position);
			return client.sendRequest(CallHierarchyPrepareRequest.type, params, token).then(
				(result) => {
					return protocol2code.asCallHierarchyItems(this.client.protocol2CodeConverter, result);
				},
				(error) => {
					client.logFailedRequest(CallHierarchyPrepareRequest.type, error);
					return Promise.resolve(null);
				}
			);
		};
		return middleware.prepareCallHierarchy
			? middleware.prepareCallHierarchy(document, position, token, prepareCallHierarchy)
			: prepareCallHierarchy(document, position, token);
	}

	public provideCallHierarchyIncomingCalls(item: VCallHierarchyItem, token: CancellationToken): ProviderResult<VCallHierarchyIncomingCall[]> {
		const client = this.client;
		const middleware = this.middleware;
		const provideCallHierarchyIncomingCalls: CallHierarchyIncomingCallsSignature = (item, token) => {
			const params: CallHierarchyIncomingCallsParams = {
				item:  code2protocol.asCallHierarchyItem(client.code2ProtocolConverter, item)
			};
			return client.sendRequest(CallHierarchyIncomingCallsRequest.type, params, token).then(
				(result) => {
					return protocol2code.asCallHierarchyIncomingCalls(client.protocol2CodeConverter, result);
				},
				(error) => {
					client.logFailedRequest(CallHierarchyIncomingCallsRequest.type, error);
					return Promise.resolve(null);
				}
			);
		};
		return middleware.callHierarchyIncomingCalls
			? middleware.callHierarchyIncomingCalls(item, token, provideCallHierarchyIncomingCalls)
			: provideCallHierarchyIncomingCalls(item, token);
	}

	public provideCallHierarchyOutgoingCalls(item: VCallHierarchyItem, token: CancellationToken): ProviderResult<VCallHierarchyOutgoingCall[]> {
		const client = this.client;
		const middleware = this.middleware;
		const provideCallHierarchyOutgoingCalls: CallHierarchyOutgoingCallsSignature = (item, token) => {
			const params: CallHierarchyOutgoingCallsParams = {
				item: code2protocol.asCallHierarchyItem(client.code2ProtocolConverter, item)
			};
			return client.sendRequest(CallHierarchyOutgoingCallsRequest.type, params, token).then(
				(result) => {
					return protocol2code.asCallHierarchyOutgoingCalls(client.protocol2CodeConverter, result);
				},
				(error) => {
					client.logFailedRequest(CallHierarchyOutgoingCallsRequest.type, error);
					return Promise.resolve(null);
				}
			);
		};
		return middleware.callHierarchyOutgingCalls
			? middleware.callHierarchyOutgingCalls(item, token, provideCallHierarchyOutgoingCalls)
			: provideCallHierarchyOutgoingCalls(item, token);
	}
}

export class CallHierarchyFeature extends TextDocumentFeature<boolean | CallHierarchyOptions, CallHierarchyRegistrationOptions> {
	constructor(client: BaseLanguageClient) {
		super(client, Proposed.CallHierarchyPrepareRequest.type);
	}

	public fillClientCapabilities(cap: ClientCapabilities): void {
		let capabilites: ClientCapabilities & Proposed.CallHierarchyClientCapabilities = cap as ClientCapabilities & Proposed.CallHierarchyClientCapabilities;
		let capability = ensure(ensure(capabilites, 'textDocument')!, 'callHierarchy')!;
		capability.dynamicRegistration = true;
	}

	public initialize(cap: ServerCapabilities, documentSelector: DocumentSelector): void {
		let capabilities: ServerCapabilities & Proposed.CallHierarchyServerCapabilities = cap;
		let [id, options] = this.getRegistration(documentSelector, capabilities.callHierarchyProvider);
		if (!id || !options) {
			return;
		}
		this.register(this.messages, { id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: CallHierarchyRegistrationOptions): Disposable {
		let client = this._client;
		let provider = new CallHierarchyProvider(client);
		return Languages.registerCallHierarchyProvider(options.documentSelector!, provider);
	}
}