/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestType } from 'vscode-jsonrpc';
import { Range } from 'vscode-languageserver-types';
import { TextDocumentRegistrationOptions, StaticRegistrationOptions, TextDocumentPositionParams } from './protocol';

// ---- capabilities

export interface SelectionRangeClientCapabilities {
	/**
	 * The text document client capabilities
	 */
	textDocument?: {
		/**
		 * Capabilities specific to `textDocument/selectionRange` requests
		 */
		selectionRange?: {
			/**
			 * Whether implementation supports dynamic registration for selection range providers. If this is set to `true`
			 * the client supports the new `(SelectionRangeProviderOptions & TextDocumentRegistrationOptions & StaticRegistrationOptions)`
			 * return value for the corresponding server capability as well.
			 */
			dynamicRegistration?: boolean;
		};
	};
}

export interface SelectionRangeProviderOptions {
}

export interface SelectionRangeServerCapabilities {
	/**
	 * The server provides selection range support.
	 */
	selectionRangeProvider?: boolean | SelectionRangeProviderOptions | (SelectionRangeProviderOptions & TextDocumentRegistrationOptions & StaticRegistrationOptions);
}

/**
 * Enum of known selection range kinds
 */
export enum SelectionRangeKind {
	/**
	 * Empty Kind.
	 */
	Empty = '',
	/**
	 * The statment kind, its value is `statement`, possible extensions can be
	 * `statement.if` etc
	 */
	Statement = 'statement',
	/**
	 * The declaration kind, its value is `declaration`, possible extensions can be
	 * `declaration.function`, `declaration.class` etc.
	 */
	Declaration = 'declaration',
}

/**
 * Represents a selection range
 */
export interface SelectionRange {
	/**
	 * Range of the selection.
	 */
	range: Range;
	/**
	 * Describes the kind of the selection range such as `statemet' or 'declaration'. See
	 * [SelectionRangeKind](#SelectionRangeKind) for an enumeration of standardized kinds.
	 */
	kind: string;
}

/**
 * A request to provide selection ranges in a document. The request's
 * parameter is of type [TextDocumentPositionParams](#TextDocumentPositionParams), the
 * response is of type [SelectionRange[]](#SelectionRange[]) or a Thenable
 * that resolves to such.
 */
export namespace SelectionRangeRequest {
	export const type: RequestType<TextDocumentPositionParams, SelectionRange[] | null, any, any> = new RequestType('textDocument/selectionRange');
}
