/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { RequestType } from 'vscode-jsonrpc';
import { Range, SymbolKind } from 'vscode-languageserver-types';
import { TextDocumentRegistrationOptions, StaticRegistrationOptions, TextDocumentPositionParams } from './protocol';

/**
 * Client capabilities specific to the type hierarchy feature.
 */
export interface TypeHierarchyCapabilities {

	/**
	 * The text document client capabilities.
	 */
	textDocument?: {

		/**
		 * Capabilities specific to the `textDocument/typeHierarchy`.
		 */
		typeHierarchy?: {

			/**
			 * Whether implementation supports dynamic registration. If this is set to `true`
			 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
			 * return value for the corresponding server capability as well.
			 */
			dynamicRegistration?: boolean;

		}

	}

}

/**
 * Type hierarchy language server capability.
 */
export interface TypeHierarchyServerCapabilities {

	/**
	 * Server capability for calculating super- and subtype hierarchies.
	 */
	typeHierarchyProvider?: boolean | (TextDocumentRegistrationOptions & StaticRegistrationOptions);

}

/**
 * The type hierarchy params is an extension of the `TextDocumentPositionParams` with optional properties
 * which can be used to eagerly resolve the item when requesting from the server.
 */
export interface TypeHierarchyParams extends TextDocumentPositionParams {

	/**
	 * The hierarchy levels to resolve. `0` indicates no level. When not defined, it is treated as `0`.
	 */
	resolve?: number;

	/**
	 * The direction of the hierarchy levels to resolve.
	 */
	direction?: TypeHierarchyDirection

}

export namespace TypeHierarchyDirection {

	/**
	 * Flag for retrieving/resolving the subtypes.
	 */
	export const Children = 0;

	/**
	 * Flag to use when retrieving/resolving the supertypes.
	 */
	export const Parents = 1;

	/**
	 * Flag for resolving both the super- and subtypes.
	 */
	export const Both = 2;

}
export type TypeHierarchyDirection = 0 | 1 | 2;

/**
 * The `textDocument/typeHierarchy` request is sent from the client to the server to retrieve the type hierarchy
 * items from a given position of a text document. Can resolve the parentage information on demand.
 * If no item can be retrieved for a given text document position, returns with `null`.
 */
export namespace TypeHierarchyRequest {
	export const type = new RequestType<TypeHierarchyParams, TypeHierarchyItem | null, void, void>('textDocument/typeHierarchy');
}

/**
 * Parameters for the `typeHierarchy/resolve` request.
 */
export interface ResolveTypeHierarchyItemParams {

	/**
	 * The item to resolve.
	 */
	item: TypeHierarchyItem;

	/**
	 * The hierarchy levels to resolve. `0` indicates no level.
	 */
	resolve: number;

	/**
	 * The direction of the hierarchy levels to resolve.
	 */
	direction: TypeHierarchyDirection;
}

/**
 * The `typeHierarchy/resolve` request is sent from the client to the server to resolve a type hierarchy
 * item by resolving sub- and supertype information.
 */
export namespace ResolveTypeHierarchyRequest {
	export const type = new RequestType<ResolveTypeHierarchyItemParams, TypeHierarchyItem | null, void, void>('typeHierarchy/resolve');
}

export interface TypeHierarchyItem {

	/**
	 * The human readable name of the hierarchy item.
	 */
	name: string;

	/**
	 * Optional detail for the hierarchy item. It can be, for instance, the signature of a function or method.
	 */
	detail?: string;

	/**
	 * The kind of the hierarchy item. For instance, class or interface.
	 */
	kind: SymbolKind;

	/**
	 * `true` if the hierarchy item is deprecated. Otherwise, `false`. It is `false` by default.
	 */
	deprecated?: boolean;

	/**
	 * The URI of the text document where this type hierarchy item belongs to.
	 */
	uri: string;

	/**
	 * The range enclosing this type hierarchy item not including leading/trailing whitespace but everything else
	 * like comments. This information is typically used to determine if the clients cursor is inside the type
	 * hierarchy item to reveal in the symbol in the UI.
	 */
	range: Range;

	/**
	 * The range that should be selected and revealed when this type hierarchy item is being picked, e.g the name
	 * of a function. Must be contained by the `range`.
	 */
	selectionRange: Range;

	/**
	 * If this type hierarchy item is resolved, it contains the direct parents. Could be empty if the item does
	 * not have any direct parents. If not defined, the parents have not been resolved yet.
	 */
	parents?: TypeHierarchyItem[];

	/**
	 * If this type hierarchy item is resolved, it contains the direct children of the current item. Could be
	 * empty if the item does not have any descendants. If not defined, the children have not been resolved.
	 */
	children?: TypeHierarchyItem[];

	/**
	 * An optional data field can be used to identify a type hierarchy item in a resolve request.
	 */
	data?: any;
}
