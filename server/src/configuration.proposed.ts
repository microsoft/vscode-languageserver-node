/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	Proposed
} from 'vscode-languageserver-protocol';

import { WorkspaceFeature } from './main';

import * as Is from './utils/is';

export interface ConfigurationProposed {
	getConfiguration(): Thenable<any>;
	getConfiguration(section: string): Thenable<any>;
	getConfiguration(item: Proposed.ConfigurationItem): Thenable<any>;
	getConfiguration(items: Proposed.ConfigurationItem[]): Thenable<any[]>;
}

export const ConfigurationFeature: WorkspaceFeature<ConfigurationProposed> = (Base) => {
	return class extends Base {

		getConfiguration(arg?: string | Proposed.ConfigurationItem | Proposed.ConfigurationItem[]): Thenable<any> {
			if (!arg) {
				return this._getConfiguration({});
			} else if (Is.string(arg)) {
				return this._getConfiguration({ section: arg })
			} else {
				return this._getConfiguration(arg);
			}
		}

		private _getConfiguration(arg: Proposed.ConfigurationItem | Proposed.ConfigurationItem[]): Thenable<any> {
			let params: Proposed.ConfigurationParams = {
				items: Array.isArray(arg) ? arg : [arg]
			};
			return this.connection.sendRequest(Proposed.ConfigurationRequest.type, params).then((result) => {
				return Array.isArray(arg) ? result : result[0];
			});
		}
	}
}
