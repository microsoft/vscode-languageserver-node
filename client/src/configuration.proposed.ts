/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { workspace, Uri } from 'vscode';

import { StaticFeature, BaseLanguageClient } from './client';
import {
	ClientCapabilities, ConfigurationRequest, ProposedConfigurationClientCapabilities
} from 'vscode-languageserver-protocol';

export interface ConfigurationMiddleware {
	configuration?: ConfigurationRequest.MiddlewareSignature
}

export class ConfigurationFeature implements StaticFeature {

	constructor(private _client: BaseLanguageClient) {
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		capabilities.workspace = capabilities.workspace || {};
		let configCapabilities = capabilities as ProposedConfigurationClientCapabilities;
		configCapabilities.workspace.configuration = true;
	}

	public initialize(): void {
		let client = this._client;
		client.onRequest(ConfigurationRequest.type, (params, token) => {
			let configuration: ConfigurationRequest.HandlerSignature = (params) => {
				let result: any[] = [];
				for (let item of params.items) {
					let resource = item.scopeUri !== void 0 && item.scopeUri !== null ? this._client.protocol2CodeConverter.asUri(item.scopeUri) : undefined;
					result.push(this.getConfiguration(resource, item.section !== null ? item.section : undefined));
				}
				return result;
			}
			let middleware = this.getConfigurationMiddleware();
			return middleware.configuration
				? middleware.configuration(params, token, configuration)
				: configuration(params, token);
		});
	}

	private getConfiguration(resource: Uri | undefined, section: string | undefined): any {
		let result: any = null;
		if (section) {
			let index = section.lastIndexOf('.');
			if (index === -1) {
				result = workspace.getConfiguration(undefined, resource).get(section);
			} else {
				let config = workspace.getConfiguration(section.substr(0, index));
				if (config) {
					result = config.get(section.substr(index + 1))
				}
			}
		} else {
			let config = workspace.getConfiguration(undefined, resource);
			result = {};
			for (let key of Object.keys(config)) {
				if (config.has(key)) {
					result[key] = config.get(key);
				}
			}
		}
		if (!result) {
			return null;
		}
		return result;
	}

	private getConfigurationMiddleware(): ConfigurationMiddleware {
		let middleware = this._client.clientOptions.middleware;
		return middleware && middleware.workspace
			? middleware.workspace as ConfigurationMiddleware
			: {};
	}
}

