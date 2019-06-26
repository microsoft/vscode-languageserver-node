/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { RequestType } from 'vscode-jsonrpc';
import { TextDocumentIdentifier, TextDocumentShowOptions } from "vscode-languageserver-types";

export interface ShowTextDocumentClientCapabilities {
    /**
     * The window client capabilities
     */
    window?: {
        /**
        * The client supports `window/showTextDocument` requests.
        */
	   showTextDocument?: boolean;
    };
}

export interface ShowTextDocumentRequestParams {
	/**
	 * A Text Document Identifier.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * Editor options to configure the behavior of showing the editor.
	 */
	options?: TextDocumentShowOptions;
}

/**
 * Show the given document in a text editor. Options can be provided
 * to control options of the editor is being shown. Might change the active editor.
 */
export namespace ShowTextDocumentRequest {
	export const type = new RequestType<ShowTextDocumentRequestParams, void, void, void>('window/showTextDocumentRequest');
}
