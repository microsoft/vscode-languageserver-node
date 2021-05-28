/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { ProtocolRequestType } from './messages';
import { Position, Range, TextDocumentIdentifier } from 'vscode-languageserver-types';
import {
	WorkDoneProgressOptions, WorkDoneProgressParams, PartialResultParams, TextDocumentRegistrationOptions, TextDocumentClientCapabilities
} from './protocol';

/**
 * Well-known kinds of information conveyed by InlayHints.
 * Clients may choose which categories to display according to user preferences.
 *
 * @since 3.17.0
 */
 export enum InlayHintCategory {
	/**
	 * The range is an expression passed as an argument to a function.
	 * The label is the name of the parameter.
	 */
	Parameter = 'parameter',
	/**
	 * The range is an entity whose type is unknown.
	 * The label is its inferred type.
	 */
	Type = 'type'
}

/**
 * An inlay hint is a short textual annotation for a range of source code.
 *
 * @since 3.17.0
 */
 export interface InlayHint {
	/**
	 * The text to be shown.
	 */
	label: string;

	/**
	 * The position within the code this hint is attached to.
	 */
	position: Position;

	/**
	 * The kind of information this hint conveys.
	 * May be an InlayHintCategory or any other value, clients should treat
	 * unrecognized values as if missing.
	 */
	category?: string;
}


/**
 * Client capabilities specific to the inlayHints request.
 *
 * @since 3.17.0
 */
export interface InlayHintsClientCapabilities {
	/**
	 * Whether implementation supports dynamic registration. If this is set to
	 * `true` the client supports the new `(TextDocumentRegistrationOptions &
	 * StaticRegistrationOptions)` return value for the corresponding server
	 * capability as well.
	 */
	dynamicRegistration?: boolean;
}

export interface $InlayHintsClientCapabilities {
	textDocument?: TextDocumentClientCapabilities & {
		inlayHints?: InlayHintsClientCapabilities;
	}
}

export interface InlayHintsServerCapabilities {
}

export interface InlayHintsOptions extends WorkDoneProgressOptions {
}

export interface InlayHintsRegistrationOptions extends TextDocumentRegistrationOptions, InlayHintsOptions {
}

export interface $InlayHintsServerCapabilities {
	inlayHintsProvider?: InlayHintsOptions;
}

export interface InlayHintsParams extends WorkDoneProgressParams, PartialResultParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The range the inlay hints are requested for.
	 * If unset, returns all hints for the document.
	 */
	range?: Range;

	/**
	 * The categories of inlay hints that are interesting to the client.
	 * The client should filter out hints of other categories, so the server may
	 * skip computing them.
	 */
	only?: string[];
}

/**
 * The `textDocument/inlayHints` request is sent from the client to the server to retrieve inlay hints for a document.
 */
export namespace InlayHintsRequest {
	export const method: 'textDocument/inlayHints' = 'textDocument/inlayHints';
	export const type = new ProtocolRequestType<InlayHintsParams, InlayHint[], InlayHint[], void, InlayHintsRegistrationOptions>(method);
}