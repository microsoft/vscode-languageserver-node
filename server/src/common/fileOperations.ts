/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Position, TextEdit, WorkspaceEdit } from 'vscode-languageserver-protocol';
import { CreateFilesParams } from 'vscode-languageserver-protocol/lib/common/protocol.window.fileOperations';
import type { Feature, _RemoteWindow } from './server';

export interface FileOperationsFeatureShape {
	onWillCreateFiles(params: CreateFilesParams): Promise<WorkspaceEdit>;
}

export const FileOperationsFeature: Feature<_RemoteWindow, FileOperationsFeatureShape> = (Base) => {
	// TODO(dantup): This isn't right.. This is shared server code, and this is the test servers implementation!
	return class extends Base {

		async onWillCreateFiles(params: CreateFilesParams): Promise<WorkspaceEdit> {
			const createdFilenames = params.files.map((f) => `${f.uri}`).join('\n');
			return {
				documentChanges: [{
					textDocument: { uri: '/dummy-edit', version: null },
					edits: [
						TextEdit.insert(Position.create(0, 0), `WILL CREATE:\n${createdFilenames}`),
					]
				}],
			} as WorkspaceEdit;
		}
	};
};

