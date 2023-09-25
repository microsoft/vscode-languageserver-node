/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, Disposable, CancellationToken, ProviderResult, SymbolInformation as VSymbolInformation, WorkspaceSymbolProvider
} from 'vscode';

import {
	ClientCapabilities, ServerCapabilities, WorkspaceSymbolRegistrationOptions, WorkspaceSymbolRequest, WorkspaceSymbolResolveRequest
} from 'vscode-languageserver-protocol';

import {
	FeatureClient, ensure, WorkspaceFeature
} from './features';

import { SupportedSymbolKinds, SupportedSymbolTags } from './documentSymbol';
import * as UUID from './utils/uuid';

export interface ProvideWorkspaceSymbolsSignature {
	(this: void, query: string, token: CancellationToken): ProviderResult<VSymbolInformation[]>;
}

export interface ResolveWorkspaceSymbolSignature {
	(this: void, item: VSymbolInformation, token: CancellationToken): ProviderResult<VSymbolInformation>;
}

export interface WorkspaceSymbolMiddleware {
	provideWorkspaceSymbols?: (this: void, query: string, token: CancellationToken, next: ProvideWorkspaceSymbolsSignature) => ProviderResult<VSymbolInformation[]>;
	resolveWorkspaceSymbol?: (this: void, item: VSymbolInformation, token: CancellationToken, next: ResolveWorkspaceSymbolSignature) => ProviderResult<VSymbolInformation>;
}

export class WorkspaceSymbolFeature extends WorkspaceFeature<WorkspaceSymbolRegistrationOptions, WorkspaceSymbolProvider, WorkspaceSymbolMiddleware> {

	constructor(client: FeatureClient<WorkspaceSymbolMiddleware>) {
		super(client, WorkspaceSymbolRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let symbolCapabilities = ensure(ensure(capabilities, 'workspace')!, 'symbol')!;
		symbolCapabilities.dynamicRegistration = true;
		symbolCapabilities.symbolKind = {
			valueSet: SupportedSymbolKinds
		};
		symbolCapabilities.tagSupport = {
			valueSet: SupportedSymbolTags
		};
		symbolCapabilities.resolveSupport = { properties: ['location.range'] };
	}

	public initialize(capabilities: ServerCapabilities): void {
		if (!capabilities.workspaceSymbolProvider) {
			return;
		}
		this.register({
			id: UUID.generateUuid(),
			registerOptions: capabilities.workspaceSymbolProvider === true ? { workDoneProgress: false } : capabilities.workspaceSymbolProvider
		});
	}

	protected registerLanguageProvider(options: WorkspaceSymbolRegistrationOptions): [Disposable, WorkspaceSymbolProvider] {
		const provider: WorkspaceSymbolProvider = {
			provideWorkspaceSymbols: (query, token) => {
				const client = this._client;
				const provideWorkspaceSymbols: ProvideWorkspaceSymbolsSignature = (query, token) => {
					return client.sendRequest(WorkspaceSymbolRequest.type, { query }, token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asSymbolInformations(result, token);
					}, (error) => {
						return client.handleFailedRequest(WorkspaceSymbolRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideWorkspaceSymbols
					? middleware.provideWorkspaceSymbols(query, token, provideWorkspaceSymbols)
					: provideWorkspaceSymbols(query, token);
			},
			resolveWorkspaceSymbol: options.resolveProvider === true
				? (item, token) => {
					const client = this._client;
					const resolveWorkspaceSymbol: ResolveWorkspaceSymbolSignature = (item, token) => {
						return client.sendRequest(WorkspaceSymbolResolveRequest.type, client.code2ProtocolConverter.asWorkspaceSymbol(item), token).then((result) => {
							if (token.isCancellationRequested) {
								return null;
							}
							return client.protocol2CodeConverter.asSymbolInformation(result);
						}, (error) => {
							return client.handleFailedRequest(WorkspaceSymbolResolveRequest.type, token, error, null);
						});
					};
					const middleware = client.middleware;
					return middleware.resolveWorkspaceSymbol
						? middleware.resolveWorkspaceSymbol(item, token, resolveWorkspaceSymbol)
						: resolveWorkspaceSymbol(item, token);
				}
				: undefined
		};
		return [Languages.registerWorkspaceSymbolProvider(provider), provider];
	}
}
