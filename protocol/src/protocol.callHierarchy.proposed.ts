/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { RequestType, RequestHandler } from 'vscode-jsonrpc';
import { SymbolKind, Range } from 'vscode-languageserver-types';
import { TextDocumentRegistrationOptions, StaticRegistrationOptions, TextDocumentPositionParams } from './protocol';

export interface CallHierarchyClientCapabilities {
    /**
     * The text document client capabilities
     */
    textDocument?: {
        /**
         * Capabilities specific to the `textDocument/callHierarchy`
         */
        callHierarchy?: {
            /**
             * Whether implementation supports dynamic registration. If this is set to `true`
             * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
             * return value for the corresponding server capability as well.
             */
            dynamicRegistration?: boolean;
        };
    }
}

export interface CallHierarchyServerCapabilities {
    /**
     * The server provides Call Hierarchy support.
     */
    callHierarchyProvider?: boolean | (TextDocumentRegistrationOptions & StaticRegistrationOptions);
}

/**
 * Request to provide the call hierarchy at a given text document position.
 *
 * The request's parameter is of type [CallHierarchyParams](#CallHierarchyParams). The response
 * is of type [CallHierarchyCall[]](#CallHierarchyCall) or a Thenable that resolves to such.
 *
 * Evaluates the symbol defined (or referenced) at the given position, and returns all incoming or outgoing calls to the symbol(s).
 */
export namespace CallHierarchyRequest {
    export const type = new RequestType<CallHierarchyParams, CallHierarchyCall[], void, TextDocumentRegistrationOptions>('textDocument/callHierarchy');
    export type HandlerSignature = RequestHandler<CallHierarchyParams, CallHierarchyCall[] | null, void>;
}

/**
 * The parameter of a `textDocument/callHierarchy` request extends the `TextDocumentPositionParams` with the direction of calls to resolve.
 */
export interface CallHierarchyParams extends TextDocumentPositionParams {
    /**
     * The direction of calls to provide.
     */
    direction: CallHierarchyDirection;
}

/**
 * The direction of a call hierarchy request.
 */
export namespace CallHierarchyDirection {
    /**
     * The callers of a symbol.
     */
    export const Incoming: 1 = 1;

    /**
     * The callees of a symbol.
     */
    export const Outgoing: 2 = 2;
}

export type CallHierarchyDirection = 1 | 2;

/**
 * The result of a `textDocument/callHierarchy` request.
 */
export interface CallHierarchyCall {

    /**
     * The source range of the reference. The range is a sub range of the `from` symbol range.
     */
    range: Range;

	/**
	 * The symbol that contains the reference.
	 */
	from: CallHierarchySymbol;

	/**
	 * The symbol that is referenced.
	 */
	to: CallHierarchySymbol;
}

export interface CallHierarchySymbol {

    /**
     * The name of the symbol targeted by the call hierarchy request.
     */
    name: string;

    /**
     * More detail for this symbol, e.g the signature of a function.
     */
    detail?: string;

    /**
     * The kind of this symbol.
     */
    kind: SymbolKind;

    /**
     * URI of the document containing the symbol.
     */
    uri: string;

    /**
     * The range enclosing this symbol not including leading/trailing whitespace but everything else
     * like comments. This information is typically used to determine if the the clients cursor is
     * inside the symbol to reveal in the symbol in the UI.
     */
    range: Range;

    /**
     * The range that should be selected and revealed when this symbol is being picked, e.g the name of a function.
     * Must be contained by the the `range`.
     */
    selectionRange: Range;
}
