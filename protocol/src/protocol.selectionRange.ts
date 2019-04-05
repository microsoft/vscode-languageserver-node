/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestType } from 'vscode-jsonrpc';
import { TextDocumentIdentifier, Position, Range } from 'vscode-languageserver-types';
import { TextDocumentRegistrationOptions, StaticRegistrationOptions } from './protocol';

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
 * A parameter literal used in selection range requests.
 */
export interface SelectionRangeParams {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The positions inside the text document.
	 */
	positions: Position[];
}

/**
 * A selection range represents a part of a selection hierarchy. A selection range
 * may have a parent selection range that contains it.
 */
export interface SelectionRange {

	/**
	 * The [range](#Range) of this selection range.
	 */
	range: Range;

	/**
	 * The parent selection range containing this range. Therfore `parent.range` must contain `this.range`.
	 */
	parent?: SelectionRange;

}

/**
 * The SelectionRange namespace provides helper function to work with
 * SelectionRange literals.
 */
export namespace SelectionRange {
	/**
	 * Creates a new SelectionRange
	 * @param range the range.
	 * @param parent an optional parent.
	 */
	export function create(range: Range, parent?: SelectionRange): SelectionRange {
		return { range, parent };
	}

	export function is(value: any): value is SelectionRange {
		let candidate = value as SelectionRange;
		return candidate !== undefined && Range.is(candidate.range) && (candidate.parent === undefined || SelectionRange.is(candidate.parent));
	}
}

/**
 * A request to provide selection ranges in a document. The request's
 * parameter is of type [SelectionRangeParams](#SelectionRangeParams), the
 * response is of type [SelectionRange[]](#SelectionRange[]) or a Thenable
 * that resolves to such.
 */
export namespace SelectionRangeRequest {
	export const type: RequestType<SelectionRangeParams, SelectionRange[] | null, any, any> = new RequestType('textDocument/selectionRange');
}