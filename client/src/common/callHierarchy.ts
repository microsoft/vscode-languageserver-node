/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, Disposable, TextDocument, ProviderResult, Position as VPosition,
	CallHierarchyItem as VCallHierarchyItem, CallHierarchyIncomingCall as VCallHierarchyIncomingCall,
	CallHierarchyOutgoingCall as VCallHierarchyOutgoingCall, CancellationToken, CallHierarchyProvider as VCallHierarchyProvider
} from 'vscode';

import { ClientCapabilities, ServerCapabilities, DocumentSelector, CallHierarchyOptions, CallHierarchyRegistrationOptions, CallHierarchyClientCapabilities,
	CallHierarchyIncomingCallsParams, CallHierarchyIncomingCallsRequest, CallHierarchyOutgoingCallsParams, CallHierarchyOutgoingCallsRequest,
	CallHierarchyPrepareRequest
} from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient, Middleware } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface PrepareCallHierarchySignature {
	(this: void, document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VCallHierarchyItem | VCallHierarchyItem[]>;
}

export interface CallHierarchyIncomingCallsSignature {
	(this: void, item: VCallHierarchyItem, token: CancellationToken): ProviderResult<VCallHierarchyIncomingCall[]>;
}

export interface CallHierarchyOutgoingCallsSignature {
	(this: void, item: VCallHierarchyItem, token: CancellationToken): ProviderResult<VCallHierarchyOutgoingCall[]>;
}

/**
 * Call hierarchy middleware
 *
 * @since 3.16.0
 */
export interface CallHierarchyMiddleware {
	prepareCallHierarchy?: (this: void, document: TextDocument, positions: VPosition, token: CancellationToken, next: PrepareCallHierarchySignature) => ProviderResult<VCallHierarchyItem | VCallHierarchyItem[]>;
	provideCallHierarchyIncomingCalls?: (this: void, item: VCallHierarchyItem, token: CancellationToken, next: CallHierarchyIncomingCallsSignature) => ProviderResult<VCallHierarchyIncomingCall[]>;
	provideCallHierarchyOutgoingCalls?: (this: void, item: VCallHierarchyItem, token: CancellationToken, next: CallHierarchyOutgoingCallsSignature) => ProviderResult<VCallHierarchyOutgoingCall[]>;
}

class CallHierarchyProvider implements VCallHierarchyProvider {

	private middleware: Middleware & CallHierarchyMiddleware;

	constructor(private client: BaseLanguageClient) {
		this.middleware = client.clientOptions.middleware!;
	}

	public prepareCallHierarchy(document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VCallHierarchyItem | VCallHierarchyItem[]> {
		const client = this.client;
		const middleware = this.middleware;
		const prepareCallHierarchy: PrepareCallHierarchySignature = (document, position, token) => {
			const params = client.code2ProtocolConverter.asTextDocumentPositionParams(document, position);
			return client.sendRequest(CallHierarchyPrepareRequest.type, params, token).then(
				(result) => {
					return client.protocol2CodeConverter.asCallHierarchyItems(result);
				},
				(error) => {
					return client.handleFailedRequest(CallHierarchyPrepareRequest.type, token, error, null);
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
				item:  client.code2ProtocolConverter.asCallHierarchyItem(item)
			};
			return client.sendRequest(CallHierarchyIncomingCallsRequest.type, params, token).then(
				(result) => {
					return client.protocol2CodeConverter.asCallHierarchyIncomingCalls(result);
				},
				(error) => {
					return client.handleFailedRequest(CallHierarchyIncomingCallsRequest.type, token, error, null);
				}
			);
		};
		return middleware.provideCallHierarchyIncomingCalls
			? middleware.provideCallHierarchyIncomingCalls(item, token, provideCallHierarchyIncomingCalls)
			: provideCallHierarchyIncomingCalls(item, token);
	}

	public provideCallHierarchyOutgoingCalls(item: VCallHierarchyItem, token: CancellationToken): ProviderResult<VCallHierarchyOutgoingCall[]> {
		const client = this.client;
		const middleware = this.middleware;
		const provideCallHierarchyOutgoingCalls: CallHierarchyOutgoingCallsSignature = (item, token) => {
			const params: CallHierarchyOutgoingCallsParams = {
				item: client.code2ProtocolConverter.asCallHierarchyItem(item)
			};
			return client.sendRequest(CallHierarchyOutgoingCallsRequest.type, params, token).then(
				(result) => {
					return client.protocol2CodeConverter.asCallHierarchyOutgoingCalls(result);
				},
				(error) => {
					return client.handleFailedRequest(CallHierarchyOutgoingCallsRequest.type, token, error, null);
				}
			);
		};
		return middleware.provideCallHierarchyOutgoingCalls
			? middleware.provideCallHierarchyOutgoingCalls(item, token, provideCallHierarchyOutgoingCalls)
			: provideCallHierarchyOutgoingCalls(item, token);
	}
}

export class CallHierarchyFeature extends TextDocumentFeature<boolean | CallHierarchyOptions, CallHierarchyRegistrationOptions, CallHierarchyProvider> {
	constructor(client: BaseLanguageClient) {
		super(client, CallHierarchyPrepareRequest.type);
	}

	public fillClientCapabilities(cap: ClientCapabilities): void {
		const capabilities: ClientCapabilities & CallHierarchyClientCapabilities = cap as ClientCapabilities & CallHierarchyClientCapabilities;
		const capability = ensure(ensure(capabilities, 'textDocument')!, 'callHierarchy')!;
		capability.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const [id, options] = this.getRegistration(documentSelector, capabilities.callHierarchyProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: CallHierarchyRegistrationOptions): [Disposable, CallHierarchyProvider] {
		const client = this._client;
		const provider = new CallHierarchyProvider(client);
		return [Languages.registerCallHierarchyProvider(options.documentSelector!, provider), provider];
	}
}