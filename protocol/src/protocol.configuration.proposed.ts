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
	configuration?: boolean;
}

/**
 * The 'workspace/getConfiguration' request is sent from the server to the client to fetch a certain
 * configuration setting.
 */
export namespace GetConfigurationRequest {
	export const type = new RequestType<GetConfigurationParams, any[], void, void>('workspace/configuration');
	export type HandlerSignature = RequestHandler<GetConfigurationParams, any[], void>;
	export type MiddlewareSignature = (params: GetConfigurationParams, token: CancellationToken, next: HandlerSignature) => HandlerResult<any[], void>;
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
 * The parameters of a get configuration request.
 */
export interface GetConfigurationParams {
	items: ConfigurationItem[];
}