/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	languages as Languages, Disposable, TextDocument, ProviderResult, Range as VRange, Position as VPosition, TextEdit as VTextEdit, FormattingOptions as VFormattingOptions,
	DocumentFormattingEditProvider, DocumentRangeFormattingEditProvider, workspace as Workspace, OnTypeFormattingEditProvider
} from 'vscode';

import {
	ClientCapabilities, CancellationToken, ServerCapabilities, DocumentSelector, DocumentHighlightRegistrationOptions, DocumentFormattingOptions, DocumentFormattingRequest, TextDocumentRegistrationOptions, DocumentFormattingParams, DocumentRangeFormattingRegistrationOptions, DocumentRangeFormattingOptions, DocumentRangeFormattingRequest, DocumentRangeFormattingParams, DocumentRangesFormattingRequest, DocumentRangesFormattingParams, DocumentOnTypeFormattingOptions, DocumentOnTypeFormattingRegistrationOptions, DocumentOnTypeFormattingRequest, DocumentOnTypeFormattingParams} from 'vscode-languageserver-protocol';

import * as UUID from './utils/uuid';

import type * as c2p from './codeConverter';
import { TextDocumentLanguageFeature, FeatureClient, ensure } from './features';


namespace FileFormattingOptions {
	export function fromConfiguration(document: TextDocument): c2p.FileFormattingOptions {
		const filesConfig = Workspace.getConfiguration('files', document);
		return {
			trimTrailingWhitespace: filesConfig.get('trimTrailingWhitespace'),
			trimFinalNewlines: filesConfig.get('trimFinalNewlines'),
			insertFinalNewline: filesConfig.get('insertFinalNewline'),
		};
	}
}

export interface ProvideDocumentFormattingEditsSignature {
	(this: void, document: TextDocument, options: VFormattingOptions, token: CancellationToken): ProviderResult<VTextEdit[]>;
}

export interface ProvideDocumentRangeFormattingEditsSignature {
	(this: void, document: TextDocument, range: VRange, options: VFormattingOptions, token: CancellationToken): ProviderResult<VTextEdit[]>;
}

export interface ProvideDocumentRangesFormattingEditsSignature {
	(this: void, document: TextDocument, ranges: VRange[], options: VFormattingOptions, token: CancellationToken): ProviderResult<VTextEdit[]>;
}

export interface ProvideOnTypeFormattingEditsSignature {
	(this: void, document: TextDocument, position: VPosition, ch: string, options: VFormattingOptions, token: CancellationToken): ProviderResult<VTextEdit[]>;
}


export interface FormattingMiddleware {
	provideDocumentFormattingEdits?: (this: void, document: TextDocument, options: VFormattingOptions, token: CancellationToken, next: ProvideDocumentFormattingEditsSignature) => ProviderResult<VTextEdit[]>;
	provideDocumentRangeFormattingEdits?: (this: void, document: TextDocument, range: VRange, options: VFormattingOptions, token: CancellationToken, next: ProvideDocumentRangeFormattingEditsSignature) => ProviderResult<VTextEdit[]>;
	provideDocumentRangesFormattingEdits?: (this: void, document: TextDocument, range: VRange[], options: VFormattingOptions, token: CancellationToken, next: ProvideDocumentRangesFormattingEditsSignature) => ProviderResult<VTextEdit[]>;
	provideOnTypeFormattingEdits?: (this: void, document: TextDocument, position: VPosition, ch: string, options: VFormattingOptions, token: CancellationToken, next: ProvideOnTypeFormattingEditsSignature) => ProviderResult<VTextEdit[]>;
}


export class DocumentFormattingFeature extends TextDocumentLanguageFeature<boolean | DocumentFormattingOptions, DocumentHighlightRegistrationOptions, DocumentFormattingEditProvider, FormattingMiddleware> {

	constructor(client: FeatureClient<FormattingMiddleware>) {
		super(client, DocumentFormattingRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'formatting')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.documentFormattingProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: TextDocumentRegistrationOptions): [Disposable, DocumentFormattingEditProvider] {
		const selector = options.documentSelector!;
		const provider: DocumentFormattingEditProvider = {
			provideDocumentFormattingEdits: (document, options, token) => {
				const client = this._client;
				const provideDocumentFormattingEdits: ProvideDocumentFormattingEditsSignature = (document, options, token) => {
					const params: DocumentFormattingParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						options: client.code2ProtocolConverter.asFormattingOptions(options, FileFormattingOptions.fromConfiguration(document))
					};
					return client.sendRequest(DocumentFormattingRequest.type, params, token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asTextEdits(result, token);
					}, (error) => {
						return client.handleFailedRequest(DocumentFormattingRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideDocumentFormattingEdits
					? middleware.provideDocumentFormattingEdits(document, options, token, provideDocumentFormattingEdits)
					: provideDocumentFormattingEdits(document, options, token);
			}
		};
		return [Languages.registerDocumentFormattingEditProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider), provider];
	}
}

export class DocumentRangeFormattingFeature extends TextDocumentLanguageFeature<boolean | DocumentRangeFormattingOptions, DocumentRangeFormattingRegistrationOptions, DocumentRangeFormattingEditProvider, FormattingMiddleware> {

	constructor(client: FeatureClient<FormattingMiddleware>) {
		super(client, DocumentRangeFormattingRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		const capability = ensure(ensure(capabilities, 'textDocument')!, 'rangeFormatting')!;
		capability.dynamicRegistration = true;
		capability.rangesSupport = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.documentRangeFormattingProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: DocumentRangeFormattingRegistrationOptions): [Disposable, DocumentRangeFormattingEditProvider] {
		const selector = options.documentSelector!;
		const provider: DocumentRangeFormattingEditProvider = {
			provideDocumentRangeFormattingEdits: (document, range, options, token) => {
				const client = this._client;
				const provideDocumentRangeFormattingEdits: ProvideDocumentRangeFormattingEditsSignature = (document, range, options, token) => {
					const params: DocumentRangeFormattingParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						range: client.code2ProtocolConverter.asRange(range),
						options: client.code2ProtocolConverter.asFormattingOptions(options, FileFormattingOptions.fromConfiguration(document))
					};
					return client.sendRequest(DocumentRangeFormattingRequest.type, params, token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asTextEdits(result, token);
					}, (error) => {
						return client.handleFailedRequest(DocumentRangeFormattingRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideDocumentRangeFormattingEdits
					? middleware.provideDocumentRangeFormattingEdits(document, range, options, token, provideDocumentRangeFormattingEdits)
					: provideDocumentRangeFormattingEdits(document, range, options, token);
			}
		};

		if (options.rangesSupport) {
			provider.provideDocumentRangesFormattingEdits = (document, ranges, options, token) => {
				const client = this._client;
				const provideDocumentRangesFormattingEdits: ProvideDocumentRangesFormattingEditsSignature = (document, ranges, options, token) => {
					const params: DocumentRangesFormattingParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						ranges: client.code2ProtocolConverter.asRanges(ranges),
						options: client.code2ProtocolConverter.asFormattingOptions(options, FileFormattingOptions.fromConfiguration(document))
					};
					return client.sendRequest(DocumentRangesFormattingRequest.type, params, token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asTextEdits(result, token);
					}, (error) => {
						return client.handleFailedRequest(DocumentRangesFormattingRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideDocumentRangesFormattingEdits
					? middleware.provideDocumentRangesFormattingEdits(document, ranges, options, token, provideDocumentRangesFormattingEdits)
					: provideDocumentRangesFormattingEdits(document, ranges, options, token);
			};
		}
		return [Languages.registerDocumentRangeFormattingEditProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider), provider];
	}
}

export class DocumentOnTypeFormattingFeature extends TextDocumentLanguageFeature<DocumentOnTypeFormattingOptions, DocumentOnTypeFormattingRegistrationOptions, OnTypeFormattingEditProvider, FormattingMiddleware> {

	constructor(client: FeatureClient<FormattingMiddleware>) {
		super(client, DocumentOnTypeFormattingRequest.type);
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'textDocument')!, 'onTypeFormatting')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities, documentSelector: DocumentSelector): void {
		const options = this.getRegistrationOptions(documentSelector, capabilities.documentOnTypeFormattingProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: DocumentOnTypeFormattingRegistrationOptions): [Disposable, OnTypeFormattingEditProvider] {
		const selector = options.documentSelector!;
		const provider: OnTypeFormattingEditProvider = {
			provideOnTypeFormattingEdits: (document, position, ch, options, token) => {
				const client = this._client;
				const provideOnTypeFormattingEdits: ProvideOnTypeFormattingEditsSignature = (document, position, ch, options, token) => {
					let params: DocumentOnTypeFormattingParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						position: client.code2ProtocolConverter.asPosition(position),
						ch: ch,
						options: client.code2ProtocolConverter.asFormattingOptions(options, FileFormattingOptions.fromConfiguration(document))
					};
					return client.sendRequest(DocumentOnTypeFormattingRequest.type, params, token).then((result) => {
						if (token.isCancellationRequested) {
							return null;
						}
						return client.protocol2CodeConverter.asTextEdits(result, token);
					}, (error) => {
						return client.handleFailedRequest(DocumentOnTypeFormattingRequest.type, token, error, null);
					});
				};
				const middleware = client.middleware;
				return middleware.provideOnTypeFormattingEdits
					? middleware.provideOnTypeFormattingEdits(document, position, ch, options, token, provideOnTypeFormattingEdits)
					: provideOnTypeFormattingEdits(document, position, ch, options, token);
			}
		};

		const moreTriggerCharacter = options.moreTriggerCharacter || [];
		return [Languages.registerOnTypeFormattingEditProvider(this._client.protocol2CodeConverter.asDocumentSelector(selector), provider, options.firstTriggerCharacter, ...moreTriggerCharacter), provider];
	}
}
