import { CancellationToken, Disposable, ProviderResult, Range as VRange, TextDocument, TextEdit as VTextEdit, workspace as Workspace, FormattingOptions as VFormattingOptions } from "vscode";
import { DocumentSelector, ServerCapabilities, TextEdit } from "vscode-languageserver-protocol";
import { DocumentOnPasteFormattingParams, DocumentOnPasteFormattingRegistrationOptions, DocumentOnPasteFormattingRequest } from "vscode-languageserver-protocol/src/common/protocol.onPasteFormatting.proposed";
import { ClientCapabilities, Proposed } from "./api";
import { BaseLanguageClient, TextDocumentFeature } from "./client";
import * as UUID from './utils/uuid';
import * as c2p from './codeConverter';

namespace vscode {
	export interface OnPasteFormattingEditProvider {
		provideOnPasteFormattingEdits(document: TextDocument, range: VRange, options: VFormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>;
	}

	export namespace languages {
        export function registerOnPasteFormattingEditProvider(selector: DocumentSelector, provider: OnPasteFormattingEditProvider): Disposable;
	}
}

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === undefined) {
		target[key] = {} as any;
	}
	return target[key];
}

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

export interface ProvideOnPasteFormattingEditsSignature {
	(this: void, document: TextDocument, position: VRange, options: VFormattingOptions, token: CancellationToken): ProviderResult<VTextEdit[]>;
}

export interface OnPasteFormattingMiddleware {
	provideOnPasteFormattingEdits?: (this: void, document: TextDocument, range: VRange, options: VFormattingOptions, token: CancellationToken, next: ProvideOnPasteFormattingEditsSignature) => ProviderResult<VTextEdit[]>;
}

export class DocumentOnPasteFormattingFeature extends TextDocumentFeature<Proposed.DocumentOnPasteFormattingOptions, Proposed.DocumentOnPasteFormattingRegistrationOptions, vscode.OnPasteFormattingEditProvider> {

	constructor(client: BaseLanguageClient) {
		super(client, Proposed.DocumentOnPasteFormattingRequest.type);
	}

	public fillClientCapabilities(cap: ClientCapabilities): void {
		const capabilities: ClientCapabilities & { textDocument: { onPasteFormatting: Proposed.DocumentOnPasteFormattingClientCapabilities } } = cap as any;
		ensure(ensure(capabilities, 'textDocument')!, 'onPasteFormatting')!.dynamicRegistration = true;
	}

	public initialize(cap: ServerCapabilities, documentSelector: DocumentSelector): void {
		const capabilities: ServerCapabilities & { documentOnPasteFormattingProvider: Proposed.DocumentOnPasteFormattingOptions } = cap as any;
		const options = this.getRegistrationOptions(documentSelector, capabilities.documentOnPasteFormattingProvider);
		if (!options) {
			return;
		}
		this.register({ id: UUID.generateUuid(), registerOptions: options });
	}

	protected registerLanguageProvider(options: DocumentOnPasteFormattingRegistrationOptions): [Disposable, vscode.OnPasteFormattingEditProvider] {
		const provider: vscode.OnPasteFormattingEditProvider = {
			provideOnPasteFormattingEdits: (document, range, options, token) => {
				const client = this._client;
				const provideOnPasteFormattingEdits: ProvideOnPasteFormattingEditsSignature = (document, range, options, token) => {
					const params: DocumentOnPasteFormattingParams = {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
						range: client.code2ProtocolConverter.asRange(range),
						options: client.code2ProtocolConverter.asFormattingOptions(options, FileFormattingOptions.fromConfiguration(document)),
					};
					return client.sendRequest(DocumentOnPasteFormattingRequest.type, params, token).then(
						client.protocol2CodeConverter.asTextEdits,
						(error) => {
							return client.handleFailedRequest(DocumentOnPasteFormattingRequest.type, token, error, null);
						}
					);
				};
				const middleware = client.clientOptions.middleware! as OnPasteFormattingMiddleware;
				return middleware.provideOnPasteFormattingEdits
					? middleware.provideOnPasteFormattingEdits(document, range, options, token, provideOnPasteFormattingEdits)
					: provideOnPasteFormattingEdits(document, range, options, token);
			}
		}

		return [vscode.languages.registerOnPasteFormattingEditProvider(options.documentSelector!, provider), provider];
	}
}
