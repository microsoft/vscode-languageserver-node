/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Uri, workspace, window } from 'vscode';
import { ClientCapabilities } from 'vscode-languageserver-protocol';
import { StaticFeature, BaseLanguageClient, ShowTextDocumentRequest } from './client';

export class ShowTextDocumentFeature implements StaticFeature {

	constructor(private _client: BaseLanguageClient) {
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		capabilities.window = capabilities.window || {};
		capabilities.window!.showTextDocument = true;
	}

	public initialize(): void {
		this._client.onRequest(ShowTextDocumentRequest.type, async (params) => {
			const { textDocument: { uri }, options } = params;
			const document = await workspace.openTextDocument(Uri.parse(uri));
			await window.showTextDocument(document, this._client.protocol2CodeConverter.asTextDocumentShowOptions(options));
		});
	}
}
