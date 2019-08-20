/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	RequestType, RequestHandler, HandlerResult, CancellationToken
} from 'vscode-jsonrpc';
import { PartialResultParams } from './protocol';

//---- Get Configuration request ----

export interface ConfigurationClientCapabilities {
	/**
	 * The workspace client capabilities
	 */
	workspace?: {
		/**
		* The client supports `workspace/configuration` requests.
		*/
		configuration?: boolean;
	}
}

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
	export const type = new RequestType<ConfigurationParams & PartialResultParams, any[], void, void>('workspace/configuration');
	export type HandlerSignature = RequestHandler<ConfigurationParams, any[], void>;
	export type MiddlewareSignature = (params: ConfigurationParams, token: CancellationToken, next: HandlerSignature) => HandlerResult<any[], void>;
}


export interface ConfigurationItem {
	/**
	 * The scope to get the configuration section for.
	 */
	scopeUri?: string;

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