/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { URI, integer, DocumentUri } from 'vscode-languageserver-types';
import { ProtocolNotificationType, RegistrationType } from './messages';
import { DocumentFilter, StaticRegistrationOptions } from './protocol';


/**
 * Notebook specific client capabilities.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookDocumentSyncClientCapabilities {

	/**
	 * Whether implementation supports dynamic registration. If this is set to `true`
	 * the client supports the new `(TextDocumentRegistrationOptions & StaticRegistrationOptions)`
	 * return value for the corresponding server capability as well.
	 */
	dynamicRegistration?: boolean;
}

export interface $NotebookDocumentClientCapabilities {
	notebookDocument?: {
		synchronization: NotebookDocumentSyncClientCapabilities;
	}
}

export interface $NotebookDocumentServerCapabilities {
	notebookDocumentSync?: NotebookDocumentOptions | NotebookDocumentRegistrationOptions;
}

/**
 * A notebook cell kind.
 *
 * @since 3.17.0 - proposed state
 */
export namespace NotebookCellKind {

	/**
     * A markup-cell is formatted source that is used for display.
     */
	export const Markup: 1 = 1;

	/**
     * A code-cell is source code.
     */
	export const Code: 2 = 2;
}
export type NotebookCellKind = 1 | 2;

/**
 * A notebook cell.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookCell {

	/**
	 * The cell's kind
	 */
	kind: NotebookCellKind;

	/**
	 * The cell's text represented as a text document.
	 * The document's content is synced using the
	 * existing text document sync notifications.
	 */
	document: DocumentUri;
}

/**
 * @since 3.17.0 - proposed state
 */
export interface NotebookDocument {

	/**
	 * The text document's uri.
	 */
	uri: URI;

	/**
	 * The version number of this document (it will increase after each
	 * change, including undo/redo).
	 */
	version: integer;

	/**
	 * The cells of a notebook.
	 */
	cells: NotebookCell[];
}

/**
 * A literal to identify a notebook document in the client.
 */
export interface NotebookDocumentIdentifier {
	/**
	 * The notebook document's uri.
	 */
	uri: URI;
}

/**
 * A notebook document selector denotes a notebook document by
 * different properties like the notebook document's scheme and
 * a pattern applied that is applied to the path segment of the
 * notebook document's URI.
 *
 * @since 3.17.0 - proposed state
 */
export type NotebookDocumentFilter = {
	/** A Uri [scheme](#Uri.scheme), like `file` or `untitled`. */
	scheme: string;
	/** A glob pattern, like `*.{ts,js}`. */
	pattern?: string;
} | {
	/** A Uri [scheme](#Uri.scheme), like `file` or `untitled`. */
	scheme?: string;
	/** A glob pattern, like `*.{ts,js}`. */
	pattern: string;
};

/**
 * Options specific to a notebook.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookDocumentOptions {
	/**
	 * The notebook document is synced to the server
	 * if it matches the notebook selector. If no
	 * `cellSelector` is provided all notebook cells
	 * are synced.
	 */
	notebookSelector: NotebookDocumentFilter[] | 'onlyIfCellsMatch';

	/**
	 * Only the cells that match a document filter
	 * are synced to the server. If no cell matches
	 * then the notebook is not synced to the server
	 * if the notebookSelector is set to `onlyIfCellsMatch`
	 */
	cellSelector?: DocumentFilter[];
}

/**
 * Registration options specific to a notebook.
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebookDocumentRegistrationOptions extends NotebookDocumentOptions, StaticRegistrationOptions {
}

export namespace NotebookDocumentSyncRegistrationType {
	export const method: 'notebookDocument/sync' = 'notebookDocument/sync';
	export const type = new RegistrationType<NotebookDocumentRegistrationOptions>(method);
}

/**
 * The params sent in a open notebook document notification.
 *
 * @since 3.17.0 - proposed state
 */
export interface DidOpenNotebookDocumentParams {

	/**
	 * The notebook document that got opened.
	 */
	notebookDocument: NotebookDocument;
}

/**
 * A notification sent when a notebook opens.
 *
 * @since 3.17.0 - proposed state
 */
export namespace DidOpenNotebookDocumentNotification {
	export const method: 'notebookDocument/didOpen' = 'notebookDocument/didOpen';
	export const type = new ProtocolNotificationType<DidOpenNotebookDocumentParams, void>(method);
}

export interface DidChangeNotebookDocumentParams {
}

export namespace DidChangeNotebookDocumentNotification {
	export const method: 'notebookDocument/didChange' = 'notebookDocument/didChange';
	export const type = new ProtocolNotificationType<DidChangeNotebookDocumentParams, void>(method);
}

/**
 * The params sent in a close notebook document notification.
 *
 * @since 3.17.0 - proposed state
 */
export interface DidCloseNotebookDocumentParams {

	/**
	 * The notebook document that got opened.
	 */
	notebookDocument: NotebookDocumentIdentifier;
}

/**
 * A notification sent when a notebook closes.
 *
 * @since 3.17.0 - proposed state
 */
export namespace DidCloseNotebookDocumentNotification {
	export const method: 'notebookDocument/didClose' = 'notebookDocument/didClose';
	export const type = new ProtocolNotificationType<DidCloseNotebookDocumentParams, void>(method);
}