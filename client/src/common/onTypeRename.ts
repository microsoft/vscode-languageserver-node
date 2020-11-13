/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as code from 'vscode';
import * as proto from 'vscode-languageserver-protocol';

import { TextDocumentFeature, BaseLanguageClient } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface ProvideOnTypeRenameSignature {
	(this: void, document: code.TextDocument, position: code.Position, token: code.CancellationToken): code.ProviderResult<code.OnTypeRenameRanges>;
}

export interface OnTypeRenameMiddleware {
	provideOnTypeRename?: (this: void, document: code.TextDocument, position: code.Position, token: code.CancellationToken, next: ProvideOnTypeRenameSignature) => code.ProviderResult<code.OnTypeRenameRanges>;
}

export class OnTypeRenameFeature extends TextDocumentFeature<boolean | proto.OnTypeRenameOptions, proto.OnTypeRenameRegistrationOptions, code.OnTypeRenameProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, proto.OnTypeRenameRequest.type);
	}

	public fillClientCapabilities(capabilites: proto.ClientCapabilities): void {
		const onTypeRenameSupport = ensure(ensure(capabilites, 'textDocument')!, 'onTypeRename')!;
		onTypeRenameSupport.dynamicRegistration = true;
	}

	public initialize(capabilities: proto.ServerCapabilities, documentSelector: proto.DocumentSelector): void {
		let [id, options] = this.getRegistration(documentSelector, capabilities.onTypeRenameProvider);
		if (!id || !options) {
			return;
		}
		this.register({ id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: proto.OnTypeRenameRegistrationOptions): [code.Disposable, code.OnTypeRenameProvider] {
		const provider: code.OnTypeRenameProvider = {
			provideOnTypeRenameRanges: (document, position, token) => {
				const client = this._client;
				const provideOnTypeRename: ProvideOnTypeRenameSignature = (document, position, token) => {
					return client.sendRequest(proto.OnTypeRenameRequest.type, client.code2ProtocolConverter.asTextDocumentPositionParams(document, position), token).then(
						client.protocol2CodeConverter.asOnTypeRenameRanges,
						(error) => {
							return client.handleFailedRequest(proto.OnTypeRenameRequest.type, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware!;
				return middleware.provideOnTypeRename
					? middleware.provideOnTypeRename(document, position, token, provideOnTypeRename)
					: provideOnTypeRename(document, position, token);
			}
		};
		return [code.languages.registerOnTypeRenameProvider(options.documentSelector!, provider), provider];
	}
}