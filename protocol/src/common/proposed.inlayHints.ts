/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestHandler, RequestHandler0 } from 'vscode-jsonrpc';
import { Command, Location, MarkupContent, Position, Range, TextDocumentIdentifier } from 'vscode-languageserver-types';
import { ProtocolRequestType, ProtocolRequestType0 } from './messages';

import type { StaticRegistrationOptions, TextDocumentRegistrationOptions, WorkDoneProgressOptions, WorkDoneProgressParams } from './protocol';
import * as Is from './utils/is';

/**
 * Inlay hint client capabilities
 *
 * @since 3.17.0 - proposed state
 */
export type InlayHintClientCapabilities = {

	/**
	 * Whether inlay hints support dynamic registration.
	 */
	dynamicRegistration?: boolean;

	/**
	 * The client supports the following `InlayHint` specific
	 * capabilities.
	 */
	inlayHint?: {

		/**
		 * Indicates which properties a client can resolve lazily on a inlay
		 * hint.
		 */
		resolveSupport?: {

			/**
			 * The properties that a client can resolve lazily.
			 */
			properties: string[];
		};
	};
};

/**
 * Client workspace capabilities specific to inlay hints.
 *
 * @since 3.17.0 - proposed state
 */
export type InlayHintWorkspaceClientCapabilities = {
	/**
	 * Whether the client implementation supports a refresh request sent from
	 * the server to the client.
	 *
	 * Note that this event is global and will force the client to refresh all
	 * inlay hints currently shown. It should be used with absolute care and
	 * is useful for situation where a server for example detects a project wide
	 * change that requires such a calculation.
	 */
	refreshSupport?: boolean;
};

/**
 * Inlay hint kinds.
 *
 * @since 3.17.0 - proposed state
 */
export namespace InlayHintKind {

	/**
	 * An inlay hint that for a type annotation.
	 */
	export const Type = 1;

	/**
	 * An inlay hint that is for a parameter.
	 */
	export const Parameter = 2;

	export function is(value: number): value is InlayHintKind {
		return value === 1 || value === 2;
	}
}

export type InlayHintKind = 1 | 2;

/**
 * An inlay hint label part allows for interactive and composite labels
 * of inlay hints.
 *
 * @since 3.17.0 - proposed state
 */
export type InlayHintLabelPart = {

	/**
	 * The value of this label part.
	 */
	value: string;

	/**
	 * The tooltip text when you hover over this label part. Depending on
	 * the client capability `inlayHint.resolveSupport` clients might resolve
	 * this property late using the resolve request.
	 */
	tooltip?: string | MarkupContent;

	/**
	 * An optional source code location that represents this
	 * label part.
	 *
	 * The editor will use this location for the hover and for code navigation
	 * features: This part will become a clickable link that resolves to the
	 * definition of the symbol at the given location (not necessarily the
	 * location itself), it shows the hover that shows at the given location,
	 * and it shows a context menu with further code navigation commands.
	 *
	 * Depending on the client capability `inlayHint.resolveSupport` clients
	 * might resolve this property late using the resolve request.
	 */
	location?: Location;

	/**
	 * An optional command for this label part.
	 *
	 * Depending on the client capability `inlayHint.resolveSupport` clients
	 * might resolve this property late using the resolve request.
	 */
	command?: Command;
};

export namespace InlayHintLabelPart {

	export function create(value: string): InlayHintLabelPart {
		return { value };
	}

	export function is(value: any): value is InlayHintLabelPart {
		const candidate: InlayHintLabelPart = value;
		return Is.objectLiteral(candidate)
			&& (candidate.tooltip === undefined || Is.string(candidate.tooltip) || MarkupContent.is(candidate.tooltip))
			&& (candidate.location === undefined || Location.is(candidate.location))
			&& (candidate.command === undefined || Command.is(candidate.command));
	}
}

/**
 * Inlay hint information.
 *
 * @since 3.17.0 - proposed state
 */
export type InlayHint = {

	/**
	 * The position of this hint.
	 */
	position: Position;

	/**
	 * The label of this hint. A human readable string or an array of
	 * InlayHintLabelPart label parts.
	 *
	 * *Note* that neither the string nor the label part can be empty.
	 */
	label: string | InlayHintLabelPart[];

	/**
	 * The kind of this hint. Can be omitted in which case the client
	 * should fall back to a reasonable default.
	 */
	kind?: InlayHintKind;

	/**
	 * The tooltip text when you hover over this item.
	 */
	tooltip?: string | MarkupContent;

	/**
	 * Render padding before the hint.
	 *
	 * Note: Padding should use the editor's background color, not the
	 * background color of the hint itself. That means padding can be used
	 * to visually align/separate an inlay hint.
	 */
	paddingLeft?: boolean;

	/**
	 * Render padding after the hint.
	 *
	 * Note: Padding should use the editor's background color, not the
	 * background color of the hint itself. That means padding can be used
	 * to visually align/separate an inlay hint.
	 */
	paddingRight?: boolean;
};

export namespace InlayHint {

	export function create(position: Position, label: string | InlayHintLabelPart[], kind?: InlayHintKind): InlayHint {
		const result: InlayHint = { position, label };
		if (kind !== undefined) {
			result.kind = kind;
		}
		return result;
	}

	export function is(value: any): value is InlayHint {
		const candidate: InlayHint = value;
		return Is.objectLiteral(candidate) && Position.is(candidate.position)
			&& (Is.string(candidate.label) || Is.typedArray(candidate.label, InlayHintLabelPart.is))
			&& (candidate.kind === undefined || InlayHintKind.is(candidate.kind))
			&& (candidate.tooltip === undefined || Is.string(candidate.tooltip) || MarkupContent.is(candidate.tooltip))
			&& (candidate.paddingLeft === undefined || Is.boolean(candidate.paddingLeft))
			&& (candidate.paddingRight === undefined || Is.boolean(candidate.paddingRight));
	}
}

/**
 * Inlay hint options used during static registration.
 *
 * @since 3.17.0 - proposed state
 */
export type InlayHintOptions = WorkDoneProgressOptions & {
	/**
	 * The server provides support to resolve additional
	 * information for an inlay hint item.
	 */
	resolveProvider?: boolean;
};

/**
 * Inlay hint options used during static or dynamic registration.
 *
 * @since 3.17.0 - proposed state
 */
export type InlayHintRegistrationOptions = InlayHintOptions & TextDocumentRegistrationOptions & StaticRegistrationOptions;

/**
 * A parameter literal used in inlay hints requests.
 *
 * @since 3.17.0 - proposed state
 */
export type InlayHintParams = WorkDoneProgressParams & {
	/**
	 * The text document.
	 */
	textDocument: TextDocumentIdentifier;

	/**
	 * The visible document range for which inlay hints should be computed.
	 */
	viewPort: Range;
};

/**
 * A request to provide inlay hints in a document. The request's parameter is of
 * type [InlayHintsParams](#InlayHintsParams), the response is of type
 * [InlayHint[]](#InlayHint[]) or a Thenable that resolves to such.
 *
 * @since 3.17.0 - proposed state
 */
export namespace InlayHintRequest {
	export const method: 'textDocument/inlayHints' = 'textDocument/inlayHints';
	export const type = new ProtocolRequestType<InlayHintParams, InlayHint[] | null, InlayHint[], any, InlayHintRegistrationOptions>(method);
	export type HandlerSignature = RequestHandler<InlayHintParams, InlayHint[] | null, void>;
}

/**
 * A request to resolve additional properties for a inlay hint.
 * The request's parameter is of type [InlayHint](#InlayHint), the response is
 * of type [InlayHint](#InlayHint) or a Thenable that resolves to such.
 *
 * @since 3.17.0 - proposed state
 */
export namespace InlayHintResolveRequest {
	export const method: 'inlayHint/resolve' = 'inlayHint/resolve';
	export const type = new ProtocolRequestType<InlayHint, InlayHint, never, void, void>(method);
	export type HandlerSignature = RequestHandler<InlayHint, InlayHint, void>;
}

/**
 * @since 3.17.0 - proposed state
 */
export namespace InlayHintRefreshRequest {
	export const method: `workspace/inlayHints/refresh` = `workspace/inlayHints/refresh`;
	export const type = new ProtocolRequestType0<void, void, void, void>(method);
	export type HandlerSignature = RequestHandler0<void, void>;
}