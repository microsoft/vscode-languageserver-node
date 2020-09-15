/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as mk from './protocol.moniker.proposed';

export * from 'vscode-jsonrpc';
export * from 'vscode-languageserver-types';

export * from './messages';
export * from './protocol';

export { ProtocolConnection, createProtocolConnection } from './connection';

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