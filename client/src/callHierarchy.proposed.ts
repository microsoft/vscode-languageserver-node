/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	languages as Languages, Disposable, TextDocument, ProviderResult, Position as VPosition,
	CallHierarchyItem as VCallHierarchyItem, CallHierarchyIncomingCall as VCallHierarchyIncomingCall,
	CallHierarchyOutgoingCall as VCallHierarchyOutgoingCall, Location as VLocation, CancellationToken
} from 'vscode';

import {
	ClientCapabilities, ServerCapabilities, DocumentSelector, Proposed
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient, Middleware } from './client';
import { CallHierarchyRegistrationOptions, CallHierarchyOptions } from 'vscode-languageserver-protocol/lib/protocol.callHierarchy.proposed';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface PrepareCallHierachySignature {
	(document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VCallHierarchyItem>;
}

export interface CallHierarchyIncomingCallsSignature {
	(item: VCallHierarchyItem, token: CancellationToken): ProviderResult<VCallHierarchyIncomingCall[]>;
}

export interface CallHierarchyOutgoingCallsSignature {
	(item: VCallHierarchyItem, token: CancellationToken): ProviderResult<VCallHierarchyOutgoingCall[]>;
}

export interface CallHierarchyMiddleware {
	prepareCallHierarchy?: (this: void, document: TextDocument, positions: VPosition, token: CancellationToken, next: PrepareCallHierachySignature) => ProviderResult<VCallHierarchyItem>;
	callHierarchyIncomingCalls?: (this: void, item: VCallHierarchyItem, token: CancellationToken, next: CallHierarchyIncomingCallsSignature) => ProviderResult<VCallHierarchyIncomingCall[]>;
	callHierarchyOutgingCalls?: (this: void, item: VCallHierarchyItem, token: CancellationToken, next: CallHierarchyOutgoingCallsSignature) => ProviderResult<VCallHierarchyOutgoingCall[]>;
}

class CallHierarchyProvider implements CallHierarchyProvider {

	private _middleware: Middleware & CallHierarchyMiddleware;

	constructor(private client: BaseLanguageClient) {
		this._middleware = client.clientOptions.middleware!;
	}

	public prepareCallHierarchy(document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VCallHierarchyItem> {
		return undefined;
	}

	public provideCallHierarchyIncomingCalls(item: VCallHierarchyItem, token: CancellationToken): ProviderResult<VCallHierarchyIncomingCall[]> {
		return undefined;
	}

	public provideCallHierarchyOutgoingCalls(item: VCallHierarchyItem, token: CancellationToken): ProviderResult<VCallHierarchyOutgoingCall[]> {
		return undefined;
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