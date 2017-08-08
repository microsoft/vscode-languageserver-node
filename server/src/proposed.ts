/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { MessageConnection } from 'vscode-jsonrpc';
import { _, RemoteFactories } from './main';
import { WorkspaceFolder, GetWorkspaceFolders } from './protocol.proposed';

export interface RemoteWorkspaceProposed {
	getWorkspaceFolders(): Thenable<WorkspaceFolder[]>;
}

export const factories: RemoteFactories<_, _, _, _, _, RemoteWorkspaceProposed> = {
	workspace: (Base) => {
		return class extends Base {
			constructor(connection: MessageConnection) {
				super(connection);
			}
			public getWorkspaceFolders(): Thenable<WorkspaceFolder[]> {
				return this.connection.sendRequest(GetWorkspaceFolders.type);
			}
		}
	}
}