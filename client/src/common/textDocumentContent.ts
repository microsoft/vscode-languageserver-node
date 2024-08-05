/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { StaticRegistrationOptions, TextDocumentContentRequest, type ClientCapabilities, type ServerCapabilities, type TextDocumentContentParams, type TextDocumentContentRegistrationOptions } from 'vscode-languageserver-protocol';

import { WorkspaceFeature, ensure, type FeatureClient } from './features';
import * as UUID from './utils/uuid';


export interface ProvideTextDocumentContentSignature {
	(this: void, uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<string>;
}

export interface TextDocumentContentMiddleware {
	provideTextDocumentContent?: (this: void, uri: vscode.Uri, token: vscode.CancellationToken, next: ProvideTextDocumentContentSignature) => vscode.ProviderResult<string>;
}

export class TextDocumentContentFeature extends WorkspaceFeature<TextDocumentContentRegistrationOptions, vscode.TextDocumentContentProvider, TextDocumentContentMiddleware> {

	constructor(client: FeatureClient<TextDocumentContentMiddleware>) {
		super(client, TextDocumentContentRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const textDocumentContent = ensure(ensure(capabilities, 'workspace')!, 'textDocumentContent')!;
		textDocumentContent.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities): void {
		if (!capabilities?.workspace?.textDocumentContent) {
			return;
		}
		const capability = capabilities.workspace.textDocumentContent;
		const id = StaticRegistrationOptions.hasId(capability) ? capability.id : UUID.generateUuid();
		this.register({
			id: id,
			registerOptions: capability
		});
	}

	protected registerLanguageProvider(options: TextDocumentContentRegistrationOptions): [vscode.Disposable, vscode.TextDocumentContentProvider] {
		const provider: vscode.TextDocumentContentProvider = {
			provideTextDocumentContent: (uri, token) => {
				const client = this._client;
				const provideTextDocumentContent: ProvideTextDocumentContentSignature = (uri, token) => {
					const params: TextDocumentContentParams = {
						uri: client.code2ProtocolConverter.asUri(uri)
					};
					return client.sendRequest(TextDocumentContentRequest.type, params, token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return result;
					}, (error) => {
						return client.handleFailedRequest(TextDocumentContentRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideTextDocumentContent
					? middleware.provideTextDocumentContent(uri, token, provideTextDocumentContent)
					: provideTextDocumentContent(uri, token);
			}
		};
		return [vscode.workspace.registerTextDocumentContentProvider(options.scheme, provider), provider];
	}
}