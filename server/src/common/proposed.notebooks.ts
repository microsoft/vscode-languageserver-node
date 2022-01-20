/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Proposed, NotificationHandler1, Emitter, Event, LSPObject } from 'vscode-languageserver-protocol';

import { Feature, _Notebooks, _Connection, _, } from './server';

/**
 * Shape of the type hierarchy feature
 *
 * @since 3.17.0 - proposed state
 */
export interface NotebooksFeatureShape {
	synchronization: {
		onDidOpenNotebookDocument(handler: NotificationHandler1<Proposed.DidOpenNotebookDocumentParams>): void;
		onDidChangeNotebookDocument(handler: NotificationHandler1<Proposed.DidChangeNotebookDocumentParams>): void;
		onDidSaveNotebookDocument(handler: NotificationHandler1<Proposed.DidSaveNotebookDocumentParams>): void;
		onDidCloseNotebookDocument(handler: NotificationHandler1<Proposed.DidCloseNotebookDocumentParams>): void;
	};
}

export const NotebooksFeature: Feature<_Notebooks, NotebooksFeatureShape> = (Base) => {
	return class extends Base {
		public get synchronization() {
			return {
				onDidOpenNotebookDocument: (handler: NotificationHandler1<Proposed.DidOpenNotebookDocumentParams>): void => {
					this.connection.onNotification(Proposed.DidOpenNotebookDocumentNotification.type, (params) => {
						handler(params);
					});
				},
				onDidChangeNotebookDocument: (handler: NotificationHandler1<Proposed.DidChangeNotebookDocumentParams>): void => {
					this.connection.onNotification(Proposed.DidChangeNotebookDocumentNotification.type, (params) => {
						handler(params);
					});
				},
				onDidSaveNotebookDocument: (handler: NotificationHandler1<Proposed.DidSaveNotebookDocumentParams>) => {
					this.connection.onNotification(Proposed.DidSaveNotebookDocumentNotification.type, (params) => {
						handler(params);
					});
				},
				onDidCloseNotebookDocument: (handler: NotificationHandler1<Proposed.DidCloseNotebookDocumentParams>): void => {
					this.connection.onNotification(Proposed.DidCloseNotebookDocumentNotification.type, (params) => {
						handler(params);
					});
				}
			};
		}
	};
};

export type NotebookDocumentChangeEvent = {
	/**
	 * The notebook document that changed.
	 */
	notebookDocument: Proposed.NotebookDocument;

	/**
	 * The meta data change if any.
	 */
	metadata?: { old: LSPObject | undefined; new: LSPObject | undefined };

	/**
	 * The cell changes if any.
	 */
	cells?: { added: Proposed.NotebookCell[]; removed: Proposed.NotebookCell[]; changed: { old: Proposed.NotebookCell; new: Proposed.NotebookCell }[] };
};

export class Notebooks {

	private readonly notebookDocuments: Map<string, Proposed.NotebookDocument>;

	private readonly _onDidOpen: Emitter<Proposed.NotebookDocument>;
	private readonly _onDidSave: Emitter<Proposed.NotebookDocument>;
	private readonly _onDidChange: Emitter<NotebookDocumentChangeEvent>;
	private readonly _onDidClose: Emitter<Proposed.NotebookDocument>;

	constructor() {
		this.notebookDocuments= new Map();
		this._onDidOpen = new Emitter();
		this._onDidChange = new Emitter();
		this._onDidSave = new Emitter();
		this._onDidClose = new Emitter();
	}

	public get onDidOpen(): Event<Proposed.NotebookDocument> {
		return this._onDidOpen.event;
	}

	public get onDidSave(): Event<Proposed.NotebookDocument> {
		return this._onDidSave.event;
	}

	public get onDidChange(): Event<NotebookDocumentChangeEvent> {
		return this._onDidChange.event;
	}

	public get onDidClose(): Event<Proposed.NotebookDocument> {
		return this._onDidClose.event;
	}

	/**
	 * Listens for `low level` notification on the given connection to
	 * update the notebook documents managed by this instance.
     *
	 * Please note that the connection only provides handlers not an event model. Therefore
	 * listening on a connection will overwrite the following handlers on a connection:
	 * `onDidOpenNotebookDocument`, `onDidChangeNotebookDocument`, `onDidSaveNotebookDocument`,
	 *  and `onDidCloseNotebookDocument`.
	 *
	 * @param connection The connection to listen on.
	 */
	public listen(connection: _Connection<_, _, _, _, _, _, _, NotebooksFeatureShape>): void {
		connection.notebooks.synchronization.onDidOpenNotebookDocument((params) => {
			this.notebookDocuments.set(params.notebookDocument.uri, params.notebookDocument);
			this._onDidOpen.fire(params.notebookDocument);
		});
		connection.notebooks.synchronization.onDidChangeNotebookDocument((params) => {
			const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
			if (notebookDocument === undefined) {
				return;
			}
			notebookDocument.version = params.notebookDocument.version;
			const oldMetadata = notebookDocument.metadata;
			let metadataChanged: boolean = false;
			const oldCells = new Map(notebookDocument.cells.map(cell => [cell.document, cell]));
			const deletedCells: Map<string, Proposed.NotebookCell> = new Map();
			let cellsChanged = false;
			let allReplaced = true;
			for (const change of params.changes) {
				if (change.metadata !== undefined) {
					metadataChanged = true;
					notebookDocument.metadata = change.metadata;
				}
				if (change.cells !== undefined) {
					cellsChanged = true;
					const deleted = notebookDocument.cells.splice(change.cells.start, change.cells.deleteCount, ...(change.cells.cells !== undefined ? change.cells.cells : []));
					for (const cell of deleted) {
						deletedCells.set(cell.document, cell);
					}
					if (allReplaced && change.cells.cells !== undefined) {
						if (deleted.length === change.cells.cells.length) {
							for (let i = 0; i < deleted.length; i++) {
								allReplaced = allReplaced && deleted[i].document === change.cells.cells[i].document;
								if (!allReplaced) {
									break;
								}
							}
						}
					}
				}
			}
			let change: NotebookDocumentChangeEvent = { notebookDocument };
			if (metadataChanged) {
				change.metadata = { old: oldMetadata, new: notebookDocument.metadata };
			}
			if (cellsChanged) {
				const newCells: Map<string, Proposed.NotebookCell> = new Map(notebookDocument.cells.map(cell => [cell.document, cell]));
				const changed: Required<NotebookDocumentChangeEvent>['cells']['changed'] = [];
				for (const entry of deletedCells.entries()) {
					const oldCell = oldCells.get(entry[0]);
					const newCell = newCells.get(entry[0]);
					if (oldCell !== undefined && newCell !== undefined && (allReplaced || !Proposed.NotebookCell.equals(oldCell, newCell, true))) {
						changed.push({ old: oldCell, new: newCell });
					}
				}
				const removed: Proposed.NotebookCell[] = [];
				for (const key of oldCells.keys()) {
					if (newCells.has(key)) {
						newCells.delete(key);
					} else {
						removed.push(oldCells.get(key)!);
					}
				}
				change.cells = {
					added: Array.from(newCells.values()),
					removed,
					changed: changed
				};
			}
			if (change.metadata !== undefined || change.cells !== undefined) {
				this._onDidChange.fire(change);
			}
		});
		connection.notebooks.synchronization.onDidSaveNotebookDocument((params) => {
			const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
			if (notebookDocument === undefined) {
				return;
			}
			this._onDidSave.fire(notebookDocument);
		});
		connection.notebooks.synchronization.onDidCloseNotebookDocument((params) => {
			const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
			if (notebookDocument === undefined) {
				return;
			}
			this.notebookDocuments.delete(params.notebookDocument.uri);
			this._onDidClose.fire(notebookDocument);
		});
	}
}