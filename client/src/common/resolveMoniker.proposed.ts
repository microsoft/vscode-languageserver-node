/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Disposable, TextDocument, ProviderResult, Position as VPosition } from 'vscode';

import {
	ClientCapabilities, CancellationToken, InitializedParams, Moniker, ResolveMonikerRegistrationOptions, ResolveMonikerRequest, MessageSignature
} from 'vscode-languageserver-protocol';

import { DynamicFeature, BaseLanguageClient } from './client';

export interface ProvideResolveMonikerSignature {
	(this: void, document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<Moniker[]>;
}

export interface ResolveMonikerMiddleware {
	provideSymbolMoniker?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: ProvideResolveMonikerSignature) => ProviderResult<Moniker[]>;
}

export class ResolveMonikerFeature implements DynamicFeature<undefined> {
	constructor(private _client: BaseLanguageClient) {
	}

	public get messages(): MessageSignature {
		return ResolveMonikerRequest.type;
	}

	public fillInitializeParams(_: InitializedParams): void {
	}

	public fillClientCapabilities(_: ClientCapabilities): void {
	}

	public initialize(): void {
		let client = this._client;
		client.onRequest(ResolveMonikerRequest.type, (document: TextDocument, position: VPosition, token: CancellationToken) => {
			let resolveRequest: ProvideResolveMonikerSignature = (document: TextDocument, position: VPosition, token: CancellationToken) => {
				return client.sendRequest(
					ResolveMonikerRequest.type,
					client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then(
					ResolveMonikerFeature.asMoniker,
					(error) => {
						return client.handleFailedRequest(ResolveMonikerRequest.type, error, null);
					}
				);
			};

			let middleware = this.getResolveMonikerMiddleware();
			return middleware.provideSymbolMoniker
				? middleware.provideSymbolMoniker(document, position, token, resolveRequest)
				: resolveRequest(document, position, token);
		});
	}

	public register(_message: MessageSignature, _: any): void {
	}

	public unregister(_: string): void {
	}

	public dispose(): void {
	}

	private getResolveMonikerMiddleware(): ResolveMonikerMiddleware {
		let middleware = this._client.clientOptions.middleware;
		return middleware && middleware.provideSymbolMoniker
			? middleware.provideSymbolMoniker as ResolveMonikerMiddleware
			: {};
	}

	private static asMoniker(monikers: Moniker[]): Moniker[] {
		return monikers;
	}
}