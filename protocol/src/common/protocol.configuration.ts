/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler, HandlerResult, CancellationToken } from 'vscode-jsonrpc';
import { LSPAny, URI } from 'vscode-languageserver-types';

import { CM, MessageDirection, ProtocolRequestType } from './messages';

//---- Get Configuration request ----

/**
 * The 'workspace/configuration' request is sent from the server to the client to fetch a certain
 * configuration setting.
 *
 * This pull model replaces the old push model were the client signaled configuration change via an
 * event. If the server still needs to react to configuration changes (since the server caches the
 * result of `workspace/configuration` requests) the server should register for an empty configuration
 * change event and empty the cache if such an event is received.
 */
export namespace ConfigurationRequest {
	export const method: 'workspace/configuration' = 'workspace/configuration';
	export const messageDirection: MessageDirection = MessageDirection.serverToClient;
	export const type = new ProtocolRequestType<ConfigurationParams, LSPAny[], never, void, void>(method);
	export type HandlerSignature = RequestHandler<ConfigurationParams, LSPAny[], void>;
	export type MiddlewareSignature = (params: ConfigurationParams, token: CancellationToken, next: HandlerSignature) => HandlerResult<LSPAny[], void>;
	export const capabilities = CM.create('workspace.configuration', undefined);
}


export interface ConfigurationItem {
	/**
	 * The scope to get the configuration section for.
	 */
	scopeUri?: URI;

	/**
	 * The configuration section asked for.
	 */
	section?: string;
}

/**
 * The parameters of a configuration request.
 */
export interface ConfigurationParams {
	items: ConfigurationItem[];
}
