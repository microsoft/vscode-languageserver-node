/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	RequestType, RequestHandler, HandlerResult, CancellationToken
} from 'vscode-jsonrpc';

//---- Get Configuration request ----

export interface ProposedConfigurationClientCapabilities {
	/**
	 * The client supports `workspace/configuration` requests.
	 */
	configuration?: boolean;
}

/**
 * The 'workspace/configuration' request is sent from the server to the client to fetch a certain
 * configuration setting.
 */
export namespace ConfigurationRequest {
	export const type = new RequestType<ConfigurationParams, any[], void, void>('workspace/configuration');
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