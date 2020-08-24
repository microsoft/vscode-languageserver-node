/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

export * from 'vscode-jsonrpc';
export * from 'vscode-languageserver-types';

export * from './messages';
export * from './protocol';

export { ProtocolConnection, createProtocolConnection } from './connection';

export namespace Proposed {
}