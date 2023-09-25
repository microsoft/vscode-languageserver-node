/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, TextDocument, Disposable, CancellationToken, ProviderResult, DocumentSymbolProvider, DocumentSymbolProviderMetadata,
	SymbolInformation as VSymbolInformation, DocumentSymbol as VDocumentSymbol
} from 'vscode';

import {
	ClientCapabilities, DocumentSelector, DocumentSymbol, DocumentSymbolOptions, DocumentSymbolRegistrationOptions, DocumentSymbolRequest, ServerCapabilities, SymbolInformation,
	SymbolKind,
	SymbolTag
} from 'vscode-languageserver-protocol';

import {
	FeatureClient, ensure, TextDocumentLanguageFeature
} from './features';

import * as UUID from './utils/uuid';

export const SupportedSymbolKinds: SymbolKind[] = [
	SymbolKind.File,
	SymbolKind.Module,
	SymbolKind.Namespace,
	SymbolKind.Package,
	SymbolKind.Class,
	SymbolKind.Method,
	SymbolKind.Property,
	SymbolKind.Field,
	SymbolKind.Constructor,
	SymbolKind.Enum,
	SymbolKind.Interface,
	SymbolKind.Function,
	SymbolKind.Variable,
	SymbolKind.Constant,
	SymbolKind.String,
	SymbolKind.Number,
	SymbolKind.Boolean,
	SymbolKind.Array,
	SymbolKind.Object,
	SymbolKind.Key,
	SymbolKind.Null,
	SymbolKind.EnumMember,
	SymbolKind.Struct,
	SymbolKind.Event,
	SymbolKind.Operator,
	SymbolKind.TypeParameter
];

export const SupportedSymbolTags: SymbolTag[] = [
	SymbolTag.Deprecated
];

export interface ProvideDocumentSymbolsSignature {
	(this: void, document: TextDocument, token: CancellationToken): ProviderResult<VSymbolInformation[] | VDocumentSymbol[]>;
}

export interface DocumentSymbolMiddleware {
	provideDocumentSymbols?: (this: void, document: TextDocument, token: CancellationToken, next: ProvideDocumentSymbolsSignature) => ProviderResult<VSymbolInformation[] | VDocumentSymbol[]>;
}

export class DocumentSymbolFeature extends TextDocumentLanguageFeature<boolean | DocumentSymbolOptions, DocumentSymbolRegistrationOptions, DocumentSymbolProvider, DocumentSymbolMiddleware> {

	constructor(client: FeatureClient<DocumentSymbolMiddleware>) {
		super(client, DocumentSymbolRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let symbolCapabilities = ensure(ensure(capabilities, 'textDocument')!, 'documentSymbol')!;
		symbolCapabilities.dynamicRegistration = true;
		symbolCapabilities.symbolKind = {
			valueSet: SupportedSymbolKinds
		};
		symbolCapabilities.hierarchicalDocumentSymbolSupport = true;
		symbolCapabilities.tagSupport = {
			valueSet: SupportedSymbolTags
		};
		symbolCapabilities.labelSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.documentSymbolProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: DocumentSymbolRegistrationOptions): [Disposable, DocumentSymbolProvider] {
		const selector = options.documentSelector!;
		const provider: DocumentSymbolProvider = {
			provideDocumentSymbols: (document, token) => {
				const client = this._client;
				const _provideDocumentSymbols: ProvideDocumentSymbolsSignature = async (document, token) => {
					try {
						const data = await client.sendRequest(DocumentSymbolRequest.type, client.code2ProtocolConverter.asDocumentSymbolParams(document), token);
						if (token.isCancellationRequested || data === undefined || data === null) {
							return null;
						}
						if (data.length === 0) {
							return [];
						} else {
							const first = data[0];
							if (DocumentSymbol.is(first)) {
								return await client.protocol2CodeConverter.asDocumentSymbols(data as DocumentSymbol[], token);
							} else {
								return await client.protocol2CodeConverter.asSymbolInformations(data as SymbolInformation[], token);
							}
						}
					} catch (error) {
						return client.handleFailedRequest(DocumentSymbolRequest.type, token, error, null);
					}
				};
				const middleware = client.middleware;
				return middleware.provideDocumentSymbols
					? middleware.provideDocumentSymbols(document, token, _provideDocumentSymbols)
					: _provideDocumentSymbols(document, token);
			}
		};
		const metaData: DocumentSymbolProviderMetadata | undefined = options.label !== undefined ? { label: options.label } : undefined;
		return [Languages.registerDocumentSymbolProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider, metaData), provider];
	}
}
