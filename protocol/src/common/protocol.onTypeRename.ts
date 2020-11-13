/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestHandler } from 'vscode-jsonrpc';
import { Range } from 'vscode-languageserver-types';

import { ProtocolRequestType } from './messages';
import { StaticRegistrationOptions, TextDocumentPositionParams, TextDocumentRegistrationOptions, WorkDoneProgressOptions, WorkDoneProgressParams } from './protocol';

/**
 * Client capabilities for the on type rename request.
 *
 * @since 3.16.0
 */
export interface OnTypeRenameClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration. If this is set to `true`
	 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
	 * return value for the corresponding server capability as well.
	 */
	dynamicRegistration?: boolean;
}

export interface OnTypeRenameParams extends TextDocumentPositionParams, WorkDoneProgressParams {
}

export interface OnTypeRenameOptions extends WorkDoneProgressOptions {
}

export interface OnTypeRenameRegistrationOptions extends TextDocumentRegistrationOptions, OnTypeRenameOptions, StaticRegistrationOptions {
}

/**
 * The result of a on type rename request.
 *
 * @since 3.16.0 - proposed state
 */
export interface OnTypeRenameRanges {
	/**
	 * A list of ranges that can be renamed together. The ranges must have
	 * identical length and contain identical text content. The ranges cannot overlap.
	 */
	ranges: Range[];

	/**
	 * An optional word pattern (regular expression) that describes valid contents for
	 * the given ranges. If no pattern is provided, the client configuration's word
	 * pattern will be used.
	 */
	wordPattern?: string;
}

/**
 * A request to provide ranges that can be renamed together.
 */
export namespace OnTypeRenameRequest {
	export const method: 'textDocument/onTypeRename' = 'textDocument/onTypeRename';
	export const type = new ProtocolRequestType<OnTypeRenameParams, OnTypeRenameRanges | null, never, any, OnTypeRenameRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<OnTypeRenameParams, OnTypeRenameRanges | null, void>;
}
