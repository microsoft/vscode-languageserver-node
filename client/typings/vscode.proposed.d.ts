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

	export interface DocumentFilter {

		/**
		 * The {@link NotebookDocument.notebookType type} of a notebook, like `jupyter-notebook`. This allows
		 * to narrow down on the type of a notebook that a {@link NotebookCell.document cell document} belongs to.
		 *
		 * *Note* that setting the `notebookType`-property changes how `scheme` and `pattern` are interpreted. When set
		 * they are evaluated against the {@link NotebookDocument.uri notebook uri}, not the document uri.
		 *
		 * @example <caption>Match python document inside jupyter notebook that aren't stored yet</caption>
		 * { language: 'python', notebookType: 'jupyter-notebook', scheme: 'untitled' }
		 */
		readonly notebookType?: string;

	}
}