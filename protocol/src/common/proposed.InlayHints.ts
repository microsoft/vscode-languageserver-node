/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Command, Location, MarkupContent } from 'vscode-languageserver-types';

/**
 * Inlay hint client capabilities
 *
 * @since 3.17.0
 */
export type InlayHintClientCapabilities = {

	/**
	 * Whether inlay hints dynamic registration.
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
 * Inlay hint kinds.
 *
 * @since 3.17.0
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
}

export type InlayHintKind = 1 | 2;

/**
 * An inlay hint label part allows for interactive and composite labels
 * of inlay hints.
 *
 * @since 3.17.0
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
	tooltip?: string | MarkupContent | undefined;

	/**
	 * An optional {@link Location source code location} that represents this
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
	location?: Location | undefined;

	/**
	 * An optional command for this label part.
	 *
	 * Depending on the client capability `inlayHint.resolveSupport` clients
	 * might resolve this property late using the resolve request.
	 */
	command?: Command | undefined;
};