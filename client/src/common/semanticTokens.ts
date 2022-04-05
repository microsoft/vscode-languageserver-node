/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { ClientCapabilities, ServerCapabilities, DocumentSelector, SemanticTokenTypes, SemanticTokenModifiers, SemanticTokens,
	TokenFormat, SemanticTokensOptions, SemanticTokensRegistrationOptions, SemanticTokensParams,
	SemanticTokensRequest, SemanticTokensDeltaParams, SemanticTokensDeltaRequest, SemanticTokensRangeParams, SemanticTokensRangeRequest, SemanticTokensRefreshRequest,
	SemanticTokensRegistrationType
} from 'vscode-languageserver-protocol';

import { FeatureClient, TextDocumentFeature, ensure } from './features';
import * as Is from './utils/is';

export interface DocumentSemanticsTokensSignature {
	(this: void, document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SemanticTokens>;
}

export interface DocumentSemanticsTokensEditsSignature {
	(this: void, document: vscode.TextDocument, previousResultId: string, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SemanticTokensEdits | vscode.SemanticTokens>;
}

export interface DocumentRangeSemanticTokensSignature {
	(this: void, document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SemanticTokens>;
}

/**
 * The semantic token middleware
 *
 * @since 3.16.0
 */
export interface SemanticTokensMiddleware {
	provideDocumentSemanticTokens?: (this: void, document: vscode.TextDocument, token: vscode.CancellationToken, next: DocumentSemanticsTokensSignature) => vscode.ProviderResult<vscode.SemanticTokens>;
	provideDocumentSemanticTokensEdits?: (this: void, document: vscode.TextDocument, previousResultId: string, token: vscode.CancellationToken, next: DocumentSemanticsTokensEditsSignature) => vscode.ProviderResult<vscode.SemanticTokensEdits | vscode.SemanticTokens>;
	provideDocumentRangeSemanticTokens?: (this: void, document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken, next: DocumentRangeSemanticTokensSignature) => vscode.ProviderResult<vscode.SemanticTokens>;
}

export interface SemanticTokensProviders {
	range?: vscode.DocumentRangeSemanticTokensProvider;
	full?: vscode.DocumentSemanticTokensProvider;
	onDidChangeSemanticTokensEmitter: vscode.EventEmitter<void>;
}

export class SemanticTokensFeature extends TextDocumentFeature<boolean | SemanticTokensOptions, SemanticTokensRegistrationOptions, SemanticTokensProviders, SemanticTokensMiddleware> {

	constructor(client: FeatureClient<SemanticTokensMiddleware>) {
		super(client, SemanticTokensRegistrationType.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const capability = ensure(ensure(capabilities, 'textDocument')!, 'semanticTokens')!;
		capability.dynamicRegistration = true;
		capability.tokenTypes = [
    		SemanticTokenTypes.namespace,
    		SemanticTokenTypes.type,
    		SemanticTokenTypes.class,
    		SemanticTokenTypes.enum,
    		SemanticTokenTypes.interface,
    		SemanticTokenTypes.struct,
    		SemanticTokenTypes.typeParameter,
    		SemanticTokenTypes.parameter,
    		SemanticTokenTypes.variable,
    		SemanticTokenTypes.property,
    		SemanticTokenTypes.enumMember,
    		SemanticTokenTypes.event,
    		SemanticTokenTypes.function,
    		SemanticTokenTypes.method,
    		SemanticTokenTypes.macro,
    		SemanticTokenTypes.keyword,
    		SemanticTokenTypes.modifier,
    		SemanticTokenTypes.comment,
    		SemanticTokenTypes.string,
    		SemanticTokenTypes.number,
    		SemanticTokenTypes.regexp,
    		SemanticTokenTypes.operator,
			SemanticTokenTypes.decorator
		];
		capability.tokenModifiers = [
    		SemanticTokenModifiers.declaration,
    		SemanticTokenModifiers.definition,
    		SemanticTokenModifiers.readonly,
    		SemanticTokenModifiers.static,
    		SemanticTokenModifiers.deprecated,
    		SemanticTokenModifiers.abstract,
    		SemanticTokenModifiers.async,
    		SemanticTokenModifiers.modification,
    		SemanticTokenModifiers.documentation,
    		SemanticTokenModifiers.defaultLibrary
		];
		capability.formats = [TokenFormat.Relative];
		capability.requests = {
			range: true,
			full: {
				delta: true
			}
		};
		capability.multilineTokenSupport = false;
		capability.overlappingTokenSupport = false;
		capability.serverCancelSupport = true;
		capability.augmentsSyntaxTokens = true;
		ensure(ensure(capabilities, 'workspace')!, 'semanticTokens')!.refreshSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const client = this._client;
		client.onRequest(SemanticTokensRefreshRequest.type, async () => {
			for (const provider of this.getAllProviders()) {
				provider.onDidChangeSemanticTokensEmitter.fire();
			}
		});
		const [id, options] = this.getRegistration(documentSelector, capabilities.semanticTokensProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: SemanticTokensRegistrationOptions): [vscode.Disposable, SemanticTokensProviders] {
		const selector = options.documentSelector!;
		const fullProvider = Is.boolean(options.full) ? options.full : options.full !== undefined;
		const hasEditProvider = options.full !== undefined && typeof options.full !== 'boolean' && options.full.delta === true;
		const eventEmitter: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
		const documentProvider: vscode.DocumentSemanticTokensProvider | undefined = fullProvider
			? {
				onDidChangeSemanticTokens: eventEmitter.event,
				provideDocumentSemanticTokens: (document, token) => {
					const client = this._client;
					const middleware = client.middleware;
					const provideDocumentSemanticTokens: DocumentSemanticsTokensSignature = (document, token) => {
						const params: SemanticTokensParams =  {
							textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document)
						};
						return client.sendRequest(SemanticTokensRequest.type, params, token).then((result) => {
							if (token.isCancellationRequested) {
								return null;
							}
							return client.protocol2CodeConverter.asSemanticTokens(result, token);
						}, (error: any) => {
							return client.handleFailedRequest(SemanticTokensRequest.type, token, error, null);
						});
					};
					return middleware.provideDocumentSemanticTokens
						? middleware.provideDocumentSemanticTokens(document, token, provideDocumentSemanticTokens)
						: provideDocumentSemanticTokens(document, token);
				},
				provideDocumentSemanticTokensEdits: hasEditProvider
					? (document, previousResultId, token) => {
						const client = this._client;
						const middleware = client.middleware;
						const provideDocumentSemanticTokensEdits: DocumentSemanticsTokensEditsSignature = (document, previousResultId, token) => {
							const params: SemanticTokensDeltaParams =  {
								textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
								previousResultId
							};
							return client.sendRequest(SemanticTokensDeltaRequest.type, params, token).then(async (result) => {
								if (token.isCancellationRequested) {
									return null;
								}
								if (SemanticTokens.is(result)) {
									return await client.protocol2CodeConverter.asSemanticTokens(result, token);
								} else {
									return await client.protocol2CodeConverter.asSemanticTokensEdits(result, token);
								}
							}, (error: any) => {
								return client.handleFailedRequest(SemanticTokensDeltaRequest.type, token, error, null);
							});
						};
						return middleware.provideDocumentSemanticTokensEdits
							? middleware.provideDocumentSemanticTokensEdits(document, previousResultId, token, provideDocumentSemanticTokensEdits)
							: provideDocumentSemanticTokensEdits(document, previousResultId, token);
					}
					: undefined
			}
			: undefined;

		const hasRangeProvider: boolean = options.range === true;
		const rangeProvider: vscode.DocumentRangeSemanticTokensProvider | undefined = hasRangeProvider
			? {
				provideDocumentRangeSemanticTokens: (document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken) => {
					const client = this._client;
					const middleware = client.middleware;
					const provideDocumentRangeSemanticTokens: DocumentRangeSemanticTokensSignature = (document, range, token) => {
						const params: SemanticTokensRangeParams = {
							textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
							range: client.code2ProtocolConverter.asRange(range)
						};
						return client.sendRequest(SemanticTokensRangeRequest.type, params, token).then((result) => {
							if (token.isCancellationRequested) {
								return null;
							}
							return client.protocol2CodeConverter.asSemanticTokens(result, token);
						}, (error: any) => {
							return client.handleFailedRequest(SemanticTokensRangeRequest.type, token, error, null);
						});
					};
					return middleware.provideDocumentRangeSemanticTokens
						? middleware.provideDocumentRangeSemanticTokens(document, range, token, provideDocumentRangeSemanticTokens)
						: provideDocumentRangeSemanticTokens(document, range, token);
				}
			}
			: undefined;

		const disposables: vscode.Disposable[] = [];
		const client = this._client;
		const legend: vscode.SemanticTokensLegend = client.protocol2CodeConverter.asSemanticTokensLegend(options.legend);
		const documentSelector = client.protocol2CodeConverter.asDocumentSelector(selector);
		if (documentProvider !== undefined) {
			disposables.push(vscode.languages.registerDocumentSemanticTokensProvider(documentSelector, documentProvider, legend));
		}
		if (rangeProvider !== undefined) {
			disposables.push(vscode.languages.registerDocumentRangeSemanticTokensProvider(documentSelector, rangeProvider, legend));
		}

		return [new vscode.Disposable(() => disposables.forEach(item => item.dispose())), { range: rangeProvider, full: documentProvider, onDidChangeSemanticTokensEmitter: eventEmitter }];
	}
}