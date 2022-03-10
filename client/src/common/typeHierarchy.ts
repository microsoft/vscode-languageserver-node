/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, Disposable, TextDocument, ProviderResult, Position as VPosition, CancellationToken,
	TypeHierarchyProvider as VTypeHierarchyProvider, TypeHierarchyItem as VTypeHierarchyItem
} from 'vscode';

import { ClientCapabilities, DocumentSelector, ServerCapabilities, TypeHierarchyRegistrationOptions, TypeHierarchyPrepareRequest, TypeHierarchySupertypesParams, TypeHierarchySupertypesRequest, TypeHierarchySubtypesParams, TypeHierarchySubtypesRequest, TypeHierarchyOptions } from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient, Middleware, $DocumentSelector } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export type PrepareTypeHierarchySignature = (this: void, document: TextDocument, position: VPosition, token: CancellationToken) => ProviderResult<VTypeHierarchyItem[]>;

export type TypeHierarchySupertypesSignature = (this: void, item: VTypeHierarchyItem, token: CancellationToken) => ProviderResult<VTypeHierarchyItem[]>;

export type TypeHierarchySubtypesSignature = (this: void, item: VTypeHierarchyItem, token: CancellationToken) => ProviderResult<VTypeHierarchyItem[]>;

/**
 * Type hierarchy middleware
 *
 * @since 3.17.0 - proposed state
 */
export type TypeHierarchyMiddleware = {
	prepareTypeHierarchy?: (this: void, document: TextDocument, positions: VPosition, token: CancellationToken, next: PrepareTypeHierarchySignature) => ProviderResult<VTypeHierarchyItem[]>;
	provideTypeHierarchySupertypes?: (this: void, item: VTypeHierarchyItem, token: CancellationToken, next: TypeHierarchySupertypesSignature) => ProviderResult<VTypeHierarchyItem[]>;
	provideTypeHierarchySubtypes?: (this: void, item: VTypeHierarchyItem, token: CancellationToken, next: TypeHierarchySubtypesSignature) => ProviderResult<VTypeHierarchyItem[]>;
};

class TypeHierarchyProvider implements VTypeHierarchyProvider {

	private middleware: Middleware & TypeHierarchyMiddleware;

	constructor(private client: BaseLanguageClient, private options: TypeHierarchyRegistrationOptions) {
		this.middleware = client.clientOptions.middleware!;
	}

	public prepareTypeHierarchy(document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VTypeHierarchyItem[]> {
		if ($DocumentSelector.skipCellTextDocument(this.options.documentSelector!, document)) {
			return undefined;
		}
		const client = this.client;
		const middleware = this.middleware;
		const prepareTypeHierarchy: PrepareTypeHierarchySignature = (document, position, token) => {
			const params = client.code2ProtocolConverter.asTextDocumentPositionParams(document, position);
			return client.sendRequest(TypeHierarchyPrepareRequest.type, params, token).then((result) => {
				if (token.isCancellationRequested) {
					return null;
				}
				return client.protocol2CodeConverter.asTypeHierarchyItems(result, token);
			}, (error) => {
				return client.handleFailedRequest(TypeHierarchyPrepareRequest.type, token, error, null);
			});
		};
		return middleware.prepareTypeHierarchy
			? middleware.prepareTypeHierarchy(document, position, token, prepareTypeHierarchy)
			: prepareTypeHierarchy(document, position, token);
	}

	public provideTypeHierarchySupertypes(item: VTypeHierarchyItem, token: CancellationToken): ProviderResult<VTypeHierarchyItem[]> {
		const client = this.client;
		const middleware = this.middleware;
		const provideTypeHierarchySupertypes: TypeHierarchySupertypesSignature = (item, token) => {
			const params: TypeHierarchySupertypesParams = {
				item:  client.code2ProtocolConverter.asTypeHierarchyItem(item)
			};
			return client.sendRequest(TypeHierarchySupertypesRequest.type, params, token).then((result) => {
				if (token.isCancellationRequested) {
					return null;
				}
				return client.protocol2CodeConverter.asTypeHierarchyItems(result, token);
			}, (error) => {
				return client.handleFailedRequest(TypeHierarchySupertypesRequest.type, token, error, null);
			});
		};
		return middleware.provideTypeHierarchySupertypes
			? middleware.provideTypeHierarchySupertypes(item, token, provideTypeHierarchySupertypes)
			: provideTypeHierarchySupertypes(item, token);
	}

	public provideTypeHierarchySubtypes(item: VTypeHierarchyItem, token: CancellationToken): ProviderResult<VTypeHierarchyItem[]> {
		const client = this.client;
		const middleware = this.middleware;
		const provideTypeHierarchySubtypes: TypeHierarchySubtypesSignature = (item, token) => {
			const params: TypeHierarchySubtypesParams = {
				item:  client.code2ProtocolConverter.asTypeHierarchyItem(item)
			};
			return client.sendRequest(TypeHierarchySubtypesRequest.type, params, token).then((result) => {
				if (token.isCancellationRequested) {
					return null;
				}
				return client.protocol2CodeConverter.asTypeHierarchyItems(result, token);
			}, (error) => {
				return client.handleFailedRequest(TypeHierarchySubtypesRequest.type, token, error, null);
			});
		};
		return middleware.provideTypeHierarchySubtypes
			? middleware.provideTypeHierarchySubtypes(item, token, provideTypeHierarchySubtypes)
			: provideTypeHierarchySubtypes(item, token);
	}
}

export class TypeHierarchyFeature extends TextDocumentFeature<boolean | TypeHierarchyOptions, TypeHierarchyRegistrationOptions, TypeHierarchyProvider> {
	constructor(client: BaseLanguageClient) {
		super(client, TypeHierarchyPrepareRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const capability = ensure(ensure(capabilities, 'textDocument')!, 'typeHierarchy')!;
		capability.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const [id, options] = this.getRegistration(documentSelector, capabilities.typeHierarchyProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: TypeHierarchyRegistrationOptions): [Disposable, TypeHierarchyProvider] {
		const client = this._client;
		const provider = new TypeHierarchyProvider(client, options);
		return [Languages.registerTypeHierarchyProvider($DocumentSelector.asTextDocumentFilters(options.documentSelector!), provider), provider];
	}
}
