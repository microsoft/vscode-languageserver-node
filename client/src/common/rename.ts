/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, Disposable, TextDocument, ProviderResult, Range as VRange, Position as VPosition, WorkspaceEdit as VWorkspaceEdit, RenameProvider
} from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector, RenameOptions, RenameRegistrationOptions, RenameRequest, PrepareSupportDefaultBehavior, RenameParams, ResponseError, TextDocumentPositionParams, PrepareRenameRequest, Range} from 'vscode-languageserver-protocol';

import * as UUID from './utils/uuid';
import * as Is from './utils/is';

import { TextDocumentFeature, FeatureClient, ensure } from './features';

export interface ProvideRenameEditsSignature {
	(this: void, document: TextDocument, position: VPosition, newName: string, token: CancellationToken): ProviderResult<VWorkspaceEdit>;
}

export interface PrepareRenameSignature {
	(this: void, document: TextDocument, position: VPosition, token: CancellationToken): ProviderResult<VRange | { range: VRange; placeholder: string }>;
}

export interface RenameMiddleware {
	provideRenameEdits?: (this: void, document: TextDocument, position: VPosition, newName: string, token: CancellationToken, next: ProvideRenameEditsSignature) => ProviderResult<VWorkspaceEdit>;
	prepareRename?: (this: void, document: TextDocument, position: VPosition, token: CancellationToken, next: PrepareRenameSignature) => ProviderResult<VRange | { range: VRange; placeholder: string }>;
}

type DefaultBehavior = {
	defaultBehavior: boolean;
};

export class RenameFeature extends TextDocumentFeature<boolean | RenameOptions, RenameRegistrationOptions, RenameProvider, RenameMiddleware> {

	constructor(client: FeatureClient<RenameMiddleware>) {
		super(client, RenameRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		let rename = ensure(ensure(capabilities, 'textDocument')!, 'rename')!;
		rename.dynamicRegistration = true;
		rename.prepareSupport = true;
		rename.prepareSupportDefaultBehavior = PrepareSupportDefaultBehavior.Identifier;
		rename.honorsChangeAnnotations = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.renameProvider);
		if (!options) {
			return;
		}
		if (Is.boolean(capabilities.renameProvider)) {
			options.prepareProvider = false;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: RenameRegistrationOptions): [Disposable, RenameProvider] {
		const selector = options.documentSelector!;
		const provider: RenameProvider = {
			provideRenameEdits: (document, position, newName, token) => {
				const client = this._client;
				const provideRenameEdits: ProvideRenameEditsSignature = (document, position, newName, token) => {
					let params: RenameParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						position: client.code2ProtocolConverter.asPosition(position),
						newName: newName
					};
					return client.sendRequest(RenameRequest.type, params, token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asWorkspaceEdit(result, token);
					}, (error: ResponseError<void>) => {
						return client.handleFailedRequest(RenameRequest.type, token, error, null, false);
					});
				};
				const middleware = client.middleware;
				return middleware.provideRenameEdits
					? middleware.provideRenameEdits(document, position, newName, token, provideRenameEdits)
					: provideRenameEdits(document, position, newName, token);
			},
			prepareRename: options.prepareProvider
				? (document, position, token) => {
					const client = this._client;
					const prepareRename: PrepareRenameSignature = (document, position, token) => {
						let params: TextDocumentPositionParams = {
							textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
							position: client.code2ProtocolConverter.asPosition(position),
						};
						return client.sendRequest(PrepareRenameRequest.type, params, token).then((result) => {
							if (token.isCancellationRequested) {
								return null;
							}
							if (Range.is(result)) {
								return client.protocol2CodeConverter.asRange(result);
							} else if (this.isDefaultBehavior(result)) {
								return result.defaultBehavior === true
									? null
									: Promise.reject(new Error(`The element can't be renamed.`));
							} else if (result && Range.is(result.range)) {
								return {
									range: client.protocol2CodeConverter.asRange(result.range),
									placeholder: result.placeholder
								};
							}
							// To cancel the rename vscode API expects a rejected promise.
							return Promise.reject(new Error(`The element can't be renamed.`));
						}, (error: ResponseError<void>) => {
							if (typeof error.message === 'string') {
								throw new Error(error.message);
							} else {
								throw new Error(`The element can't be renamed.`);
							}
						});
					};
					const middleware = client.middleware;
					return middleware.prepareRename
						? middleware.prepareRename(document, position, token, prepareRename)
						: prepareRename(document, position, token);
				}
				: undefined
		};
		return [Languages.registerRenameProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider), provider];
	}

	private isDefaultBehavior(value: any): value is DefaultBehavior {
		const candidate: DefaultBehavior = value;
		return candidate && Is.boolean(candidate.defaultBehavior);
	}
}