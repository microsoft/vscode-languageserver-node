/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as vscode from 'vscode';
import { Middleware, BaseLanguageClient, TextDocumentFeature } from './client';
import { ClientCapabilities, ServerCapabilities, DocumentSelector, Proposed } from 'vscode-languageserver-protocol';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

declare module 'vscode' {
	//#region Semantic tokens: https://github.com/microsoft/vscode/issues/86415

	export class SemanticTokensLegend {
		public readonly tokenTypes: string[];
		public readonly tokenModifiers: string[];

		constructor(tokenTypes: string[], tokenModifiers: string[]);
	}

	export class SemanticTokensBuilder {
		constructor();
		push(line: number, char: number, length: number, tokenType: number, tokenModifiers: number): void;
		build(): Uint32Array;
	}

	export class SemanticTokens {
		/**
		 * The result id of the tokens.
		 *
		 * This is the id that will be passed to `DocumentSemanticTokensProvider.provideDocumentSemanticTokensEdits` (if implemented).
		 */
		readonly resultId?: string;
		readonly data: Uint32Array;

		constructor(data: Uint32Array, resultId?: string);
	}

	export class SemanticTokensEdits {
		/**
		 * The result id of the tokens.
		 *
		 * This is the id that will be passed to `DocumentSemanticTokensProvider.provideDocumentSemanticTokensEdits` (if implemented).
		 */
		readonly resultId?: string;
		readonly edits: SemanticTokensEdit[];

		constructor(edits: SemanticTokensEdit[], resultId?: string);
	}

	export class SemanticTokensEdit {
		readonly start: number;
		readonly deleteCount: number;
		readonly data?: Uint32Array;

		constructor(start: number, deleteCount: number, data?: Uint32Array);
	}

	/**
	 * The document semantic tokens provider interface defines the contract between extensions and
	 * semantic tokens.
	 */
	export interface DocumentSemanticTokensProvider {
		/**
		 * A file can contain many tokens, perhaps even hundreds of thousands of tokens. Therefore, to improve
		 * the memory consumption around describing semantic tokens, we have decided to avoid allocating an object
		 * for each token and we represent tokens from a file as an array of integers. Furthermore, the position
		 * of each token is expressed relative to the token before it because most tokens remain stable relative to
		 * each other when edits are made in a file.
		 *
		 * ---
		 * In short, each token takes 5 integers to represent, so a specific token `i` in the file consists of the following array indices:
		 *  - at index `5*i`   - `deltaLine`: token line number, relative to the previous token
		 *  - at index `5*i+1` - `deltaStart`: token start character, relative to the previous token (relative to 0 or the previous token's start if they are on the same line)
		 *  - at index `5*i+2` - `length`: the length of the token. A token cannot be multiline.
		 *  - at index `5*i+3` - `tokenType`: will be looked up in `SemanticTokensLegend.tokenTypes`
		 *  - at index `5*i+4` - `tokenModifiers`: each set bit will be looked up in `SemanticTokensLegend.tokenModifiers`
		 *
		 * ---
		 * ### How to encode tokens
		 *
		 * Here is an example for encoding a file with 3 tokens in a uint32 array:
		 * ```
		 *    { line: 2, startChar:  5, length: 3, tokenType: "properties", tokenModifiers: ["private", "static"] },
		 *    { line: 2, startChar: 10, length: 4, tokenType: "types",      tokenModifiers: [] },
		 *    { line: 5, startChar:  2, length: 7, tokenType: "classes",    tokenModifiers: [] }
		 * ```
		 *
		 * 1. First of all, a legend must be devised. This legend must be provided up-front and capture all possible token types.
		 * For this example, we will choose the following legend which must be passed in when registering the provider:
		 * ```
		 *    tokenTypes: ['properties', 'types', 'classes'],
		 *    tokenModifiers: ['private', 'static']
		 * ```
		 *
		 * 2. The first transformation step is to encode `tokenType` and `tokenModifiers` as integers using the legend. Token types are looked
		 * up by index, so a `tokenType` value of `1` means `tokenTypes[1]`. Multiple token modifiers can be set by using bit flags,
		 * so a `tokenModifier` value of `3` is first viewed as binary `0b00000011`, which means `[tokenModifiers[0], tokenModifiers[1]]` because
		 * bits 0 and 1 are set. Using this legend, the tokens now are:
		 * ```
		 *    { line: 2, startChar:  5, length: 3, tokenType: 0, tokenModifiers: 3 },
		 *    { line: 2, startChar: 10, length: 4, tokenType: 1, tokenModifiers: 0 },
		 *    { line: 5, startChar:  2, length: 7, tokenType: 2, tokenModifiers: 0 }
		 * ```
		 *
		 * 3. The next steps is to encode each token relative to the previous token in the file. In this case, the second token
		 * is on the same line as the first token, so the `startChar` of the second token is made relative to the `startChar`
		 * of the first token, so it will be `10 - 5`. The third token is on a different line than the second token, so the
		 * `startChar` of the third token will not be altered:
		 * ```
		 *    { deltaLine: 2, deltaStartChar: 5, length: 3, tokenType: 0, tokenModifiers: 3 },
		 *    { deltaLine: 0, deltaStartChar: 5, length: 4, tokenType: 1, tokenModifiers: 0 },
		 *    { deltaLine: 3, deltaStartChar: 2, length: 7, tokenType: 2, tokenModifiers: 0 }
		 * ```
		 *
		 * 4. Finally, the last step is to inline each of the 5 fields for a token in a single array, which is a memory friendly representation:
		 * ```
		 *    // 1st token,  2nd token,  3rd token
		 *    [  2,5,3,0,3,  0,5,4,1,0,  3,2,7,2,0 ]
		 * ```
		 */
		provideDocumentSemanticTokens(document: TextDocument, token: CancellationToken): ProviderResult<SemanticTokens>;

		/**
		 * Instead of always returning all the tokens in a file, it is possible for a `DocumentSemanticTokensProvider` to implement
		 * this method (`updateSemanticTokens`) and then return incremental updates to the previously provided semantic tokens.
		 *
		 * ---
		 * ### How tokens change when the document changes
		 *
		 * Let's look at how tokens might change.
		 *
		 * Continuing with the above example, suppose a new line was inserted at the top of the file.
		 * That would make all the tokens move down by one line (notice how the line has changed for each one):
		 * ```
		 *    { line: 3, startChar:  5, length: 3, tokenType: "properties", tokenModifiers: ["private", "static"] },
		 *    { line: 3, startChar: 10, length: 4, tokenType: "types",      tokenModifiers: [] },
		 *    { line: 6, startChar:  2, length: 7, tokenType: "classes",    tokenModifiers: [] }
		 * ```
		 * The integer encoding of the tokens does not change substantially because of the delta-encoding of positions:
		 * ```
		 *    // 1st token,  2nd token,  3rd token
		 *    [  3,5,3,0,3,  0,5,4,1,0,  3,2,7,2,0 ]
		 * ```
		 * It is possible to express these new tokens in terms of an edit applied to the previous tokens:
		 * ```
		 *    [  2,5,3,0,3,  0,5,4,1,0,  3,2,7,2,0 ] // old tokens
		 *    [  3,5,3,0,3,  0,5,4,1,0,  3,2,7,2,0 ] // new tokens
		 *
		 *    edit: { start:  0, deleteCount: 1, data: [3] } // replace integer at offset 0 with 3
		 * ```
		 *
		 * Furthermore, let's assume that a new token has appeared on line 4:
		 * ```
		 *    { line: 3, startChar:  5, length: 3, tokenType: "properties", tokenModifiers: ["private", "static"] },
		 *    { line: 3, startChar: 10, length: 4, tokenType: "types",      tokenModifiers: [] },
		 *    { line: 4, startChar:  3, length: 5, tokenType: "properties", tokenModifiers: ["static"] },
		 *    { line: 6, startChar:  2, length: 7, tokenType: "classes",    tokenModifiers: [] }
		 * ```
		 * The integer encoding of the tokens is:
		 * ```
		 *    // 1st token,  2nd token,  3rd token,  4th token
		 *    [  3,5,3,0,3,  0,5,4,1,0,  1,3,5,0,2,  2,2,7,2,0, ]
		 * ```
		 * Again, it is possible to express these new tokens in terms of an edit applied to the previous tokens:
		 * ```
		 *    [  3,5,3,0,3,  0,5,4,1,0,  3,2,7,2,0 ]               // old tokens
		 *    [  3,5,3,0,3,  0,5,4,1,0,  1,3,5,0,2,  2,2,7,2,0, ]  // new tokens
		 *
		 *    edit: { start: 10, deleteCount: 1, data: [1,3,5,0,2,2] } // replace integer at offset 10 with [1,3,5,0,2,2]
		 * ```
		 *
		 * *NOTE*: When doing edits, it is possible that multiple edits occur until VS Code decides to invoke the semantic tokens provider.
		 * *NOTE*: If the provider cannot compute `SemanticTokensEdits`, it can "give up" and return all the tokens in the document again.
		 * *NOTE*: All edits in `SemanticTokensEdits` contain indices in the old integers array, so they all refer to the previous result state.
		 */
		provideDocumentSemanticTokensEdits?(document: TextDocument, previousResultId: string, token: CancellationToken): ProviderResult<SemanticTokens | SemanticTokensEdits>;
	}

	/**
	 * The document range semantic tokens provider interface defines the contract between extensions and
	 * semantic tokens.
	 */
	export interface DocumentRangeSemanticTokensProvider {
		/**
		 * See [provideDocumentSemanticTokens](#DocumentSemanticTokensProvider.provideDocumentSemanticTokens).
		 */
		provideDocumentRangeSemanticTokens(document: TextDocument, range: Range, token: CancellationToken): ProviderResult<SemanticTokens>;
	}

	export namespace languages {
		/**
		 * Register a semantic tokens provider for a whole document.
		 *
		 * Multiple providers can be registered for a language. In that case providers are sorted
		 * by their [score](#languages.match) and the best-matching provider is used. Failure
		 * of the selected provider will cause a failure of the whole operation.
		 *
		 * @param selector A selector that defines the documents this provider is applicable to.
		 * @param provider A document semantic tokens provider.
		 * @return A [disposable](#Disposable) that unregisters this provider when being disposed.
		 */
		export function registerDocumentSemanticTokensProvider(selector: DocumentSelector, provider: DocumentSemanticTokensProvider, legend: SemanticTokensLegend): Disposable;

		/**
		 * Register a semantic tokens provider for a document range.
		 *
		 * Multiple providers can be registered for a language. In that case providers are sorted
		 * by their [score](#languages.match) and the best-matching provider is used. Failure
		 * of the selected provider will cause a failure of the whole operation.
		 *
		 * @param selector A selector that defines the documents this provider is applicable to.
		 * @param provider A document range semantic tokens provider.
		 * @return A [disposable](#Disposable) that unregisters this provider when being disposed.
		 */
		export function registerDocumentRangeSemanticTokensProvider(selector: DocumentSelector, provider: DocumentRangeSemanticTokensProvider, legend: SemanticTokensLegend): Disposable;
	}

	//#endregion
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

namespace protocol2code {
	export function asSemanticTokens(value: Proposed.SemanticTokens): vscode.SemanticTokens;
	export function asSemanticTokens(value: undefined | null): undefined;
	export function asSemanticTokens(value: Proposed.SemanticTokens | undefined | null): vscode.SemanticTokens | undefined;
	export function asSemanticTokens(value: Proposed.SemanticTokens | undefined | null): vscode.SemanticTokens | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		return new vscode.SemanticTokens(new Uint32Array(value.data), value.resultId);
	}

	export function asSemanticTokensEdit(value: Proposed.SemanticTokensEdit): vscode.SemanticTokensEdit {
		return new vscode.SemanticTokensEdit(value.start, value.deleteCount, value.data !== undefined ? new Uint32Array(value.data) : undefined);
	}

	export function asSemanticTokensEdits(value: Proposed.SemanticTokensEdits): vscode.SemanticTokensEdits;
	export function asSemanticTokensEdits(value: undefined | null): undefined;
	export function asSemanticTokensEdits(value: Proposed.SemanticTokensEdits | undefined | null): vscode.SemanticTokensEdits | undefined;
	export function asSemanticTokensEdits(value: Proposed.SemanticTokensEdits | undefined | null): vscode.SemanticTokensEdits | undefined {
		if (value === undefined || value === null) {
			return undefined;
		}
		return new vscode.SemanticTokensEdits(value.edits.map(asSemanticTokensEdit), value.resultId);
	}

	export function asLedgend(value: Proposed.SemanticTokensLegend): vscode.SemanticTokensLegend {
		return value;
	}
}

export interface SemanticTokensProviders {
	document: vscode.DocumentSemanticTokensProvider;
	range?: vscode.DocumentRangeSemanticTokensProvider;
}

export class SemanticTokensFeature extends TextDocumentFeature<boolean | Proposed.SemanticTokensOptions, Proposed.SemanticTokensRegistrationOptions, SemanticTokensProviders> {

	constructor(client: BaseLanguageClient) {
		super(client, Proposed.SemanticTokensRequest.type);
	}

	public fillClientCapabilities(cap: ClientCapabilities): void {
		const capabilites: ClientCapabilities & Proposed.SemanticTokensClientCapabilities = cap as any;
		let capability = ensure(ensure(capabilites, 'textDocument')!, 'semanticTokens')!;
		capability.dynamicRegistration = true;
		capability.tokenTypes = [
			Proposed.SemanticTokenTypes.comment,
			Proposed.SemanticTokenTypes.comment,
			Proposed.SemanticTokenTypes.keyword,
			Proposed.SemanticTokenTypes.number,
			Proposed.SemanticTokenTypes.regexp,
			Proposed.SemanticTokenTypes.operator,
			Proposed.SemanticTokenTypes.namespace,
			Proposed.SemanticTokenTypes.type,
			Proposed.SemanticTokenTypes.struct,
			Proposed.SemanticTokenTypes.class,
			Proposed.SemanticTokenTypes.interface,
			Proposed.SemanticTokenTypes.enum,
			Proposed.SemanticTokenTypes.typeParameter,
			Proposed.SemanticTokenTypes.function,
			Proposed.SemanticTokenTypes.member,
			Proposed.SemanticTokenTypes.macro,
			Proposed.SemanticTokenTypes.variable,
			Proposed.SemanticTokenTypes.parameter,
			Proposed.SemanticTokenTypes.property,
			Proposed.SemanticTokenTypes.label
		];
		capability.tokenModifiers = [
			Proposed.SemanticTokenModifiers.declaration,
			Proposed.SemanticTokenModifiers.documentation,
			Proposed.SemanticTokenModifiers.static,
			Proposed.SemanticTokenModifiers.abstract,
			Proposed.SemanticTokenModifiers.deprecated,
			Proposed.SemanticTokenModifiers.async,
			Proposed.SemanticTokenModifiers.readonly
		];
	}

	public initialize(cap: ServerCapabilities, documentSelector: DocumentSelector): void {
		const capabilities: ServerCapabilities & Proposed.SemanticTokensServerCapabilities = cap as any;
		let [id, options] = this.getRegistration(documentSelector, capabilities.semanticTokensProvider);
		if (!id || !options) {
			return;
		}
		this.register(this.messages, { id: id, registerOptions: options });
	}

	protected registerLanguageProvider(options: Proposed.SemanticTokensRegistrationOptions): [vscode.Disposable, SemanticTokensProviders] {
		const hasEditProvider = options.documentProvider !== undefined && typeof options.documentProvider !== 'boolean' && options.documentProvider.edits === true;
		const documentProvider: vscode.DocumentSemanticTokensProvider = {
			provideDocumentSemanticTokens: (document, token) => {
				const client = this._client;
				const middleware = client.clientOptions.middleware! as Middleware & SemanticTokensMiddleware;
				const provideDocumentSemanticTokens: DocumentSemanticsTokensSignature = (document, token) => {
					const params: Proposed.SemanticTokensParams =  {
						textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document)
					};
					return client.sendRequest(Proposed.SemanticTokensRequest.type, params, token).then((result) => {
						return protocol2code.asSemanticTokens(result);
					}, (error: any) => {
						client.logFailedRequest(Proposed.SemanticTokensRequest.type, error);
						return undefined;
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
						const params: Proposed.SemanticTokensEditsParams =  {
							textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
							previousResultId
						};
						return client.sendRequest(Proposed.SemanticTokensEditsRequest.type, params, token).then((result) => {
							if (Proposed.SemanticTokens.is(result)) {
								return protocol2code.asSemanticTokens(result);
							} else {
								return protocol2code.asSemanticTokensEdits(result);
							}
						}, (error: any) => {
							client.logFailedRequest(Proposed.SemanticTokensEditsRequest.type, error);
							return undefined;
						});
					};
					return middleware.provideDocumentSemanticTokensEdits
						? middleware.provideDocumentSemanticTokensEdits(document, previousResultId, token, provideDocumentSemanticTokensEdits)
						: provideDocumentSemanticTokensEdits(document, previousResultId, token);
				}
				: undefined
		};
		const hasRangeProvider: boolean = options.rangeProvider === true;
		const rangeProvider: vscode.DocumentRangeSemanticTokensProvider | undefined = hasRangeProvider
			? {
				provideDocumentRangeSemanticTokens: (document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken) => {
					const client = this._client;
					const middleware = client.clientOptions.middleware! as Middleware & SemanticTokensMiddleware;
					const provideDocumentRangeSemanticTokens: DocumentRangeSemanticTokensSignature = (document, range, token) => {
						const params: Proposed.SemanticTokensRangeParams = {
							textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
							range: client.code2ProtocolConverter.asRange(range)
						};
						return client.sendRequest(Proposed.SemanticTokensRangeRequest.type, params, token).then((result) => {
							return protocol2code.asSemanticTokens(result);
						}, (error: any) => {
							client.logFailedRequest(Proposed.SemanticTokensRangeRequest.type, error);
							return undefined;
						});
					};
					return middleware.provideDocumentRangeSemanticTokens
						? middleware.provideDocumentRangeSemanticTokens(document, range, token, provideDocumentRangeSemanticTokens)
						: provideDocumentRangeSemanticTokens(document, range, token);
				}
			}
			: undefined;

		const disposables: vscode.Disposable[] = [];
		const legend: vscode.SemanticTokensLegend = protocol2code.asLedgend(options.legend);
		disposables.push(vscode.languages.registerDocumentSemanticTokensProvider(options.documentSelector!, documentProvider, legend));
		if (rangeProvider !== undefined) {
			disposables.push(vscode.languages.registerDocumentRangeSemanticTokensProvider(options.documentSelector!, rangeProvider, legend));
		}

		return [new vscode.Disposable(() => disposables.forEach(item => item.dispose())), { document: documentProvider, range: rangeProvider }];
	}
}