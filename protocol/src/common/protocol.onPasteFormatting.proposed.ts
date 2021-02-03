/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { FormattingOptions, Range, TextDocumentIdentifier, TextEdit } from "./api";
import { ProtocolRequestType } from "./messages";
import { TextDocumentRegistrationOptions } from "./protocol";

export interface DocumentOnPasteFormattingClientCapabilities {
	/**
	 * Whether on paste formatting supports dynamic registration
	 */
	dynamicRegistration?: boolean;
}

export interface DocumentOnPasteFormattingOptions {
}

export interface DocumentOnPasteFormattingRegistrationOptions extends TextDocumentRegistrationOptions, DocumentOnPasteFormattingOptions {
}

export namespace DocumentOnPasteFormattingRequest {
	export const method: 'textDocument/onPasteFormatting' = 'textDocument/onPasteFormatting';
	export const type = new ProtocolRequestType<DocumentOnPasteFormattingParams, TextEdit[] | null, never, void, DocumentOnPasteFormattingRegistrationOptions>(method);
}

export interface DocumentOnPasteFormattingParams {
	/**
	 * The document to format.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The range of the text that has been pasted into the document.
	 */
	range: Range;

	/**
	 * The formatting options.
	 */
	options: FormattingOptions;
}
