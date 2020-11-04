/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import type { integer } from 'vscode-languageserver-types';
import * as mk from './protocol.moniker.proposed';

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

export namespace Proposed {
	export const UniquenessLevel = mk.UniquenessLevel;
	export const MonikerKind = mk.MonikerKind;
	export type Moniker = mk.Moniker;
	export type MonikerClientCapabilities = mk.MonikerClientCapabilities;
	export type MonikerServerCapabilities = mk.MonikerServerCapabilities;
	export type MonikerOptions = mk.MonikerOptions;
	export type MonikerParams = mk.MonikerParams;
	export type MonikerRegistrationOptions = mk.MonikerRegistrationOptions;

	export namespace MonikerRequest {
		export const method = mk.MonikerRequest.method;
		export const type = mk.MonikerRequest.type;
	}
}