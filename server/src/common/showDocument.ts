/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { ShowDocumentParams, ShowDocumentRequest, ShowDocumentResult } from 'vscode-languageserver-protocol';
import type { Feature, _RemoteWindow } from './server';

export interface ShowDocumentFeatureShape {
	showDocument(params: ShowDocumentParams): Promise<ShowDocumentResult>;
}

export const ShowDocumentFeature: Feature<_RemoteWindow, ShowDocumentFeatureShape> = (Base) => {
	return class extends Base {

		showDocument(params: ShowDocumentParams): Promise<ShowDocumentResult> {
			return this.connection.sendRequest(ShowDocumentRequest.type, params);
		}
	};
};
