/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, Disposable, TextDocument, ProviderResult, Range as VRange, Command as VCommand, CodeAction as VCodeAction,
	CodeActionContext as VCodeActionContext, CodeActionProvider
} from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector, CodeActionRequest, CodeActionOptions, CodeActionRegistrationOptions, CodeActionParams, CodeActionResolveRequest, CodeActionKind
} from 'vscode-languageserver-protocol';

import * as UUID from './utils/uuid';

import { TextDocumentLanguageFeature, FeatureClient, ensure } from './features';

export interface ProvideCodeActionsSignature {
	(this: void, document: TextDocument, range: VRange, context: VCodeActionContext, token: CancellationToken): ProviderResult<(VCommand | VCodeAction)[]>;
}

export interface ResolveCodeActionSignature {
	(this: void, item: VCodeAction, token: CancellationToken): ProviderResult<VCodeAction>;
}

export interface CodeActionMiddleware {
	provideCodeActions?: (this: void, document: TextDocument, range: VRange, context: VCodeActionContext, token: CancellationToken, next: ProvideCodeActionsSignature) => ProviderResult<(VCommand | VCodeAction)[]>;
	resolveCodeAction?: (this: void, item:  VCodeAction, token: CancellationToken, next: ResolveCodeActionSignature) => ProviderResult<VCodeAction>;
}

export class CodeActionFeature extends TextDocumentLanguageFeature<boolean | CodeActionOptions, CodeActionRegistrationOptions, CodeActionProvider, CodeActionMiddleware> {

	constructor(client: FeatureClient<CodeActionMiddleware>) {
		super(client, CodeActionRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const cap = ensure(ensure(capabilities, 'textDocument')!, 'codeAction')!;
		cap.dynamicRegistration = true;
		cap.isPreferredSupport = true;
		cap.disabledSupport = true;
		cap.dataSupport = true;
		// We can only resolve the edit property.
		cap.resolveSupport = {
			properties: ['edit']
		};
		cap.codeActionLiteralSupport = {
			codeActionKind: {
				valueSet: [
					CodeActionKind.Empty,
					CodeActionKind.QuickFix,
					CodeActionKind.Refactor,
					CodeActionKind.RefactorExtract,
					CodeActionKind.RefactorInline,
					CodeActionKind.RefactorRewrite,
					CodeActionKind.Source,
					CodeActionKind.SourceOrganizeImports
				]
			}
		};
		cap.honorsChangeAnnotations = false;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.codeActionProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: CodeActionRegistrationOptions): [Disposable, CodeActionProvider] {
		const selector = options.documentSelector!;
		const provider: CodeActionProvider = {
			provideCodeActions: (document, range, context, token) => {
				const client = this._client;
				const _provideCodeActions: ProvideCodeActionsSignature = async (document, range, context, token) => {
					const params: CodeActionParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						range: client.code2ProtocolConverter.asRange(range),
						context: client.code2ProtocolConverter.asCodeActionContextSync(context)
					};
					return client.sendRequest(CodeActionRequest.type, params, token).then((values) => {
						if (token.isCancellationRequested || values === null || values === undefined) {
							return null;
						}
						return client.protocol2CodeConverter.asCodeActionResult(values, token);
					}, (error) => {
						return client.handleFailedRequest(CodeActionRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideCodeActions
					? middleware.provideCodeActions(document, range, context, token, _provideCodeActions)
					: _provideCodeActions(document, range, context, token);
			},
			resolveCodeAction: options.resolveProvider
				? (item: VCodeAction, token: CancellationToken) => {
					const client = this._client;
					const middleware = this._client.middleware;
					const resolveCodeAction: ResolveCodeActionSignature = async (item, token) => {
						return client.sendRequest(CodeActionResolveRequest.type, client.code2ProtocolConverter.asCodeActionSync(item), token).then((result) => {
							if (token.isCancellationRequested) {
								return item;
							}
							return client.protocol2CodeConverter.asCodeAction(result, token);
						}, (error) => {
							return client.handleFailedRequest(CodeActionResolveRequest.type, token, error, item);
						});
					};
					return middleware.resolveCodeAction
						? middleware.resolveCodeAction(item, token, resolveCodeAction)
						: resolveCodeAction(item, token);
				}
				: undefined
		};
		return [Languages.registerCodeActionsProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider,
			(options.codeActionKinds
				? { providedCodeActionKinds: this._client.protocol2CodeConverter.asCodeActionKinds(options.codeActionKinds) }
				: undefined)), provider];
	}
}