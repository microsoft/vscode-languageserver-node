/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

declare module 'vscode' {
	/**
     * Inlay hint information.
     */
	export interface InlayHint {
		/**
		 * Optional {@link TextEdit text edits} that are performed when accepting this inlay hint. The default
		 * gesture for accepting an inlay hint is the double click.
		 *
		 * *Note* that edits are expected to change the document so that the inlay hint (or its nearest variant) is
		 * now part of the document and the inlay hint itself is now obsolete.
		 */
		textEdits?: TextEdit[];
	}
}