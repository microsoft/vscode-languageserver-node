/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox, Microsoft and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestHandler } from 'vscode-jsonrpc';
import { TypeHierarchyItem } from 'vscode-languageserver-types';

import { ProtocolRequestType } from './messages';
import type {
	TextDocumentRegistrationOptions, StaticRegistrationOptions, TextDocumentPositionParams, PartialResultParams,
	WorkDoneProgressParams, WorkDoneProgressOptions
} from './protocol';

/**
 * @since 3.17.0
 * @proposed
 */
export type TypeHierarchyClientCapabilities = {
	/**
	 * Whether implementation supports dynamic registration. If this is set to `true`
	 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
	 * return value for the corresponding server capability as well.
	 */
	dynamicRegistration?: boolean;
};

/**
 * Type hierarchy options used during static registration.
 *
 * @since 3.17.0
 * @proposed
 */
export type TypeHierarchyOptions = WorkDoneProgressOptions;

/**
 * Type hierarchy options used during static or dynamic registration.
 *
 * @since 3.17.0
 * @proposed
 */
export type TypeHierarchyRegistrationOptions = TextDocumentRegistrationOptions & TypeHierarchyOptions & StaticRegistrationOptions;

/**
 * The parameter of a `textDocument/prepareTypeHierarchy` request.
 *
 * @since 3.17.0
 * @proposed
 */
export type TypeHierarchyPrepareParams = TextDocumentPositionParams & WorkDoneProgressParams;

/**
 * A request to result a `TypeHierarchyItem` in a document at a given position.
 * Can be used as an input to a subtypes or supertypes type hierarchy.
 *
 * @since 3.17.0
 * @proposed
 */
export namespace TypeHierarchyPrepareRequest {
	export const method: 'textDocument/prepareTypeHierarchy' = 'textDocument/prepareTypeHierarchy';
	export const type = new ProtocolRequestType<TypeHierarchyPrepareParams, TypeHierarchyItem[] | null, never, void, TypeHierarchyRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<TypeHierarchyPrepareParams, TypeHierarchyItem[] | null, void>;
}

/**
 * The parameter of a `typeHierarchy/supertypes` request.
 *
 * @since 3.17.0
 * @proposed
 */
export type TypeHierarchySupertypesParams = WorkDoneProgressParams & PartialResultParams & {
	item: TypeHierarchyItem;
};

/**
 * A request to resolve the supertypes for a given `TypeHierarchyItem`.
 *
 * @since 3.17.0
 * @proposed
 */
export namespace TypeHierarchySupertypesRequest {
	export const method: 'typeHierarchy/supertypes' = 'typeHierarchy/supertypes';
	export const type = new ProtocolRequestType<TypeHierarchySupertypesParams, TypeHierarchyItem[] | null, TypeHierarchyItem[], void, void>(method);
	export type HandlerSignature = RequestHandler<TypeHierarchySupertypesParams, TypeHierarchyItem[] | null, void>;
}

/**
 * The parameter of a `typeHierarchy/subtypes` request.
 *
 * @since 3.17.0
 * @proposed
 */
export type TypeHierarchySubtypesParams = WorkDoneProgressParams & PartialResultParams & {
	item: TypeHierarchyItem;
};

/**
 * A request to resolve the subtypes for a given `TypeHierarchyItem`.
 *
 * @since 3.17.0
 * @proposed
 */
export namespace TypeHierarchySubtypesRequest {
	export const method: 'typeHierarchy/subtypes' = 'typeHierarchy/subtypes';
	export const type = new ProtocolRequestType<TypeHierarchySubtypesParams, TypeHierarchyItem[] | null, TypeHierarchyItem[], void, void>(method);
	export type HandlerSignature = RequestHandler<TypeHierarchySubtypesParams, TypeHierarchyItem[] | null, void>;
}
