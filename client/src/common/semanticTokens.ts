/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { Middleware, BaseLanguageClient, TextDocumentFeature } from './client';
import { ClientCapabilities, ServerCapabilities, DocumentSelector, SemanticTokenTypes, SemanticTokenModifiers, SemanticTokens,
	TokenFormat, SemanticTokensOptions, SemanticTokensRegistrationOptions, SemanticTokensParams,
	SemanticTokensRequest, SemanticTokensDeltaParams, SemanticTokensDeltaRequest, SemanticTokensRangeParams, SemanticTokensRangeRequest, SemanticTokensRefreshRequest
} from 'vscode-languageserver-protocol';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface DocumentSemanticsTokensSignature {
	(this: void, document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SemanticTokens>
}

export interface DocumentSemanticsTokensEditsSignature {
	(this: void, document: vscode.TextDocument, previousResultId: string, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SemanticTokensEdits | vscode.SemanticTokens>
}

export interface DocumentRangeSemanticTokensSignature {
	(this: void, document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SemanticTokens>;
}

export interface SemanticTokensMiddleware {
	provideDocumentSemanticTokens?: (this: void, document: vscode.TextDocument, token: vscode.CancellationToken, next: DocumentSemanticsTokensSignature) => vscode.ProviderResult<vscode.SemanticTokens>;
	provideDocumentSemanticTokensEdits?: (this: void, document: vscode.TextDocument, previousResultId: string, token: vscode.CancellationToken, next: DocumentSemanticsTokensEditsSignature) => vscode.ProviderResult<vscode.SemanticTokensEdits | vscode.SemanticTokens>;
	provideDocumentRangeSemanticTokens?: (this: void, document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken, next: DocumentRangeSemanticTokensSignature) => vscode.ProviderResult<vscode.SemanticTokens>;
}

export interface SemanticTokensProviders {
	range?: vscode.DocumentRangeSemanticTokensProvider;
	full: vscode.DocumentSemanticTokensProvider;
	onDidChangeSemanticTokensEmitter: vscode.EventEmitter<void>;
}


export class SemanticTokensFeature extends TextDocumentFeature<boolean | SemanticTokensOptions, SemanticTokensRegistrationOptions, SemanticTokensProviders> {

	constructor(client: BaseLanguageClient) {
		super(client, SemanticTokensRequest.type);
	}

	public fillClientCapabilities(capabilites: ClientCapabilities): void {
		const capability = ensure(ensure(capabilites, 'textDocument')!, 'semanticTokens')!;
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
    		SemanticTokenTypes.member,
    		SemanticTokenTypes.macro,
    		SemanticTokenTypes.keyword,
    		SemanticTokenTypes.modifier,
    		SemanticTokenTypes.comment,
    		SemanticTokenTypes.string,
    		SemanticTokenTypes.number,
    		SemanticTokenTypes.regexp,
    		SemanticTokenTypes.operator
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
		ensure(ensure(capabilites, 'workspace')!, 'semanticTokens')!.refreshSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		let client = this._client;
		client.onRequest(SemanticTokensRefreshRequest.type, async () => {
			for (const provider of this.getAllProviders()) {
				provider.onDidChangeSemanticTokensEmitter.fire();
			}
		});
		const [id, options] = this.getRegistration(documentSelector, capabilities.semanticTokensProvider);
		if (!id || !options) {
			return;
		}
		this.register(this.messages, { id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: SemanticTokensRegistrationOptions): [vscode.Disposable, SemanticTokensProviders] {
		const hasEditProvider = options.full !== undefined && typeof options.full !== 'boolean' && options.full.delta === true;
		const eventEmitter: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
		const documentProvider: vscode.DocumentSemanticTokensProvider = {
			onDidChangeSemanticTokens: eventEmitter.event,
			provideDocumentSemanticTokens: (document, token) => {
				const client = this._client;
				const middleware = client.clientOptions.middleware! as Middleware & SemanticTokensMiddleware;
				const provideDocumentSemanticTokens: DocumentSemanticsTokensSignature = (document, token) => {
					const params: SemanticTokensParams =  {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document)
					};
					return client.sendRequest(SemanticTokensRequest.type, params, token).then((result) => {
						return client.protocol2CodeConverter.asSemanticTokens(result);
					}, (error: any) => {
						return client.handleFailedRequest(SemanticTokensRequest.type, error, null);
					});
				};
				return middleware.provideDocumentSemanticTokens
					? middleware.provideDocumentSemanticTokens(document, token, provideDocumentSemanticTokens)
					: provideDocumentSemanticTokens(document, token);
			},
			provideDocumentSemanticTokensEdits: hasEditProvider
				? (document, previousResultId, token) => {
					const client = this._client;
					const middleware = client.clientOptions.middleware! as Middleware & SemanticTokensMiddleware;
					const provideDocumentSemanticTokensEdits: DocumentSemanticsTokensEditsSignature = (document, previousResultId, token) => {
						const params: SemanticTokensDeltaParams =  {
							textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
							previousResultId
						};
						return client.sendRequest(SemanticTokensDeltaRequest.type, params, token).then((result) => {
							if (SemanticTokens.is(result)) {
								return client.protocol2CodeConverter.asSemanticTokens(result);
							} else {
								return client.protocol2CodeConverter.asSemanticTokensEdits(result);
							}
						}, (error: any) => {
							return client.handleFailedRequest(SemanticTokensDeltaRequest.type, error, null);
						});
					};
					return middleware.provideDocumentSemanticTokensEdits
						? middleware.provideDocumentSemanticTokensEdits(document, previousResultId, token, provideDocumentSemanticTokensEdits)
						: provideDocumentSemanticTokensEdits(document, previousResultId, token);
				}
				: undefined
		};
		const hasRangeProvider: boolean = options.range === true;
		const rangeProvider: vscode.DocumentRangeSemanticTokensProvider | undefined = hasRangeProvider
			? {
				provideDocumentRangeSemanticTokens: (document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken) => {
					const client = this._client;
					const middleware = client.clientOptions.middleware! as Middleware & SemanticTokensMiddleware;
					const provideDocumentRangeSemanticTokens: DocumentRangeSemanticTokensSignature = (document, range, token) => {
						const params: SemanticTokensRangeParams = {
							textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
							range: client.code2ProtocolConverter.asRange(range)
						};
						return client.sendRequest(SemanticTokensRangeRequest.type, params, token).then((result) => {
							return client.protocol2CodeConverter.asSemanticTokens(result);
						}, (error: any) => {
							return client.handleFailedRequest(SemanticTokensRangeRequest.type, error, null);
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
		disposables.push(vscode.languages.registerDocumentSemanticTokensProvider(options.documentSelector!, documentProvider, legend));
		if (rangeProvider !== undefined) {
			disposables.push(vscode.languages.registerDocumentRangeSemanticTokensProvider(options.documentSelector!, rangeProvider, legend));
		}

		return [new vscode.Disposable(() => disposables.forEach(item => item.dispose())), { range: rangeProvider, full: documentProvider, onDidChangeSemanticTokensEmitter: eventEmitter }];
	}
}