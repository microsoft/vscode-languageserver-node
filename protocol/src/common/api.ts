/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import type { integer } from 'vscode-languageserver-types';

export * from 'vscode-jsonrpc';
export * from 'vscode-languageserver-types';

export * from './messages';
export * from './protocol';

export { ProtocolConnection, createProtocolConnection } from './connection';

export namespace LSPErrorCodes {
	/**
	* This is the start range of LSP reserved error codes.
	* It doesn't denote a real error code.
	*
	* @since 3.16.0
	*/
	export const lspReservedErrorRangeStart: integer = -32899;

	export const ContentModified: integer = -32801;
	export const RequestCancelled: integer = -32800;

	/**
	* This is the end range of LSP reserved error codes.
	* It doesn't denote a real error code.
	*
	* @since 3.16.0
	*/
	export const lspReservedErrorRangeEnd: integer = -32800;
}

import * as op from './protocol.onPasteFormatting.proposed';

export namespace Proposed {
	export type DocumentOnPasteFormattingClientCapabilities = op.DocumentOnPasteFormattingClientCapabilities;
	export type DocumentOnPasteFormattingOptions = op.DocumentOnPasteFormattingOptions;
	export type DocumentOnPasteFormattingRegistrationOptions = op.DocumentOnPasteFormattingRegistrationOptions;
	export type DocumentOnPasteFormattingParams = op.DocumentOnPasteFormattingParams;
	export const DocumentOnPasteFormattingRequest = op.DocumentOnPasteFormattingRequest;
}
