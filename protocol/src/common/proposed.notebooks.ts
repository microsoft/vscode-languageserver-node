/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { URI, integer, DocumentUri } from 'vscode-languageserver-types';

import * as Is from './utils/is';
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

	export function is(value: any): value is NotebookCellKind {
		return value === 1 || value === 2;
	}
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

export namespace NotebookCell {
	export function create(kind: NotebookCellKind, document: DocumentUri): NotebookCell {
		return { kind, document };
	}

	export function is(value: any): value is NotebookCell {
		const candidate: NotebookCell = value;
		return Is.objectLiteral(candidate) && NotebookCellKind.is(candidate.kind) && DocumentUri.is(candidate.document);
	}
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
	 * The type of the notebook.
	 */
	notebookType: string;

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

export namespace NotebookDocument {
	export function create(uri: URI, notebookType: string, version: integer, cells: NotebookCell[]): NotebookDocument {
		return { uri, notebookType, version, cells };
	}
	export function is(value: any): value is NotebookDocument {
		const candidate: NotebookDocument = value;
		return Is.objectLiteral(candidate) && Is.string(candidate.uri) && Is.number(candidate.version) && Is.typedArray(candidate.cells, NotebookCell.is);
	}
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
 * A notebook document filter denotes a notebook by different properties like
 * the [type](#NotebookDocument.notebookType), the [scheme](#Uri.scheme) of
 * its resource, or a glob-pattern that is applied to the [path](#notebookType.uri.path).
 *
 * Glob patterns can have the following syntax:
 * - `*` to match one or more characters in a path segment
 * - `?` to match on one character in a path segment
 * - `**` to match any number of path segments, including none
 * - `{}` to group sub patterns into an OR expression. (e.g. `**​/*.{ts,js}` matches all TypeScript and JavaScript files)
 * - `[]` to declare a range of characters to match in a path segment (e.g., `example.[0-9]` to match on `example.0`, `example.1`, …)
 * - `[!...]` to negate a range of characters to match in a path segment (e.g., `example.[!0-9]` to match on `example.a`, `example.b`, but not `example.0`)
 *
 * @since 3.17.0 - proposed state
 */
export type NotebookDocumentFilter = {
	/** A notebook type. */
	notebookType: string;
	/** A Uri [scheme](#Uri.scheme), like `file` or `untitled`. */
	scheme?: string;
	/** A glob pattern, like `*.{ts,js}`. */
	pattern?: string;
} | {
	/** A notebook type. */
	notebookType?: string;
	/** A Uri [scheme](#Uri.scheme), like `file` or `untitled`. */
	scheme: string;
	/** A glob pattern, like `*.{ts,js}`. */
	pattern?: string;
} | {
	/** A notebook type. */
	notebookType?: string;
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
export type NotebookDocumentOptions = {
	/**
	 * The notebook document is synced to the server
	 * if it matches the notebook selector. If no
	 * `cellSelector` is provided all notebook cells
	 * are synced.
	 */
	notebookSelector: NotebookDocumentFilter[];

	/**
	 * Only the cells that match a document filter
	 * are synced to the server. If no cell matches
	 * then the notebook is not synced to the server
	 * if the notebookSelector is set to `onlyIfCellsMatch`
	 */
	cellSelector?: DocumentFilter[];
} | {
	/**
	 * The notebook document is synced to the server
	 * if it matches the notebook selector. if no
	 * `notebookSelector` is provided a `cellSelector` is
	 * mandatory.  If no `cellSelector` is provided all
	 * notebook cells are synced.
	 */
	notebookSelector?: NotebookDocumentFilter[];

	/**
	 * Only the cells that match a document filter
	 * are synced to the server. If no cell matches
	 * then the notebook is not synced to the server
	 * if no notebookSelector is set.
	 */
	cellSelector: DocumentFilter[];
};

/**
 * Registration options specific to a notebook.
 *
 * @since 3.17.0 - proposed state
 */
export type NotebookDocumentRegistrationOptions = NotebookDocumentOptions & StaticRegistrationOptions;

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