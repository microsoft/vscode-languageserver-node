/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	NotificationHandler1, Emitter, Event, DidChangeTextDocumentParams, DidCloseTextDocumentParams, DidOpenTextDocumentParams,
	NotificationHandler, DocumentUri, URI, Disposable, DidOpenNotebookDocumentParams, DidChangeNotebookDocumentParams, DidSaveNotebookDocumentParams,
	DidCloseNotebookDocumentParams, DidOpenNotebookDocumentNotification, DidChangeNotebookDocumentNotification, DidSaveNotebookDocumentNotification,
	DidCloseNotebookDocumentNotification, NotebookDocument, NotebookCell, LSPObject
} from 'vscode-languageserver-protocol';

import type { Feature, _Notebooks, Connection, } from './server';
import { TextDocuments, TextDocumentConnection, TextDocumentsConfiguration } from './textDocuments';


/**
 * Shape of the notebooks feature
 *
 * @since 3.17.0
 */
export interface NotebookSyncFeatureShape {
	synchronization: {
		onDidOpenNotebookDocument(handler: NotificationHandler1<DidOpenNotebookDocumentParams>): Disposable;
		onDidChangeNotebookDocument(handler: NotificationHandler1<DidChangeNotebookDocumentParams>): Disposable;
		onDidSaveNotebookDocument(handler: NotificationHandler1<DidSaveNotebookDocumentParams>): Disposable;
		onDidCloseNotebookDocument(handler: NotificationHandler1<DidCloseNotebookDocumentParams>): Disposable;
	};
}

export const NotebookSyncFeature: Feature<_Notebooks, NotebookSyncFeatureShape> = (Base) => {
	return class extends Base {
		public get synchronization() {
			return {
				onDidOpenNotebookDocument: (handler: NotificationHandler1<DidOpenNotebookDocumentParams>): Disposable => {
					return this.connection.onNotification(DidOpenNotebookDocumentNotification.type, (params) => {
						handler(params);
					});
				},
				onDidChangeNotebookDocument: (handler: NotificationHandler1<DidChangeNotebookDocumentParams>): Disposable => {
					return this.connection.onNotification(DidChangeNotebookDocumentNotification.type, (params) => {
						handler(params);
					});
				},
				onDidSaveNotebookDocument: (handler: NotificationHandler1<DidSaveNotebookDocumentParams>): Disposable => {
					return this.connection.onNotification(DidSaveNotebookDocumentNotification.type, (params) => {
						handler(params);
					});
				},
				onDidCloseNotebookDocument: (handler: NotificationHandler1<DidCloseNotebookDocumentParams>): Disposable => {
					return this.connection.onNotification(DidCloseNotebookDocumentNotification.type, (params) => {
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
	notebookDocument: NotebookDocument;

	/**
	 * The meta data change if any.
	 *
	 * Note: old and new should always be an object literal (e.g. LSPObject)
	 */
	metadata?: { old: LSPObject | undefined; new: LSPObject | undefined };

	/**
	 * The cell changes if any.
	 */
	cells?: {
		/**
		 * The cells that got added.
		 */
		added: NotebookCell[];

		/**
		 * The cells that got removed.
		 */
		removed: NotebookCell[];

		/**
		 * The cells that changed.
		 */
		changed: {
			/**
			 * The cell data has changed, excluding its
			 * text content which is reported via
			 * `textContentChanged`.
			 */
			data: { old: NotebookCell; new: NotebookCell }[];

			/**
			 * The text content of a cell has changed.
			 * The actual text is available via the `Notebooks`
			 * text document manager.
			 */
			textContent: NotebookCell[];
		};
	};
};

class CellTextDocumentConnection implements TextDocumentConnection {

	private static readonly NULL_DISPOSE = Object.freeze({ dispose: () => { } });

	private openHandler: NotificationHandler<DidOpenTextDocumentParams> | undefined;
	private changeHandler: NotificationHandler<DidChangeTextDocumentParams> | undefined;
	private closeHandler: NotificationHandler<DidCloseTextDocumentParams> | undefined;

	public onDidOpenTextDocument(handler: NotificationHandler<DidOpenTextDocumentParams>): Disposable {
		this.openHandler = handler;
		return Disposable.create(() => { this.openHandler = undefined; });
	}

	public openTextDocument(params: DidOpenTextDocumentParams): void {
		this.openHandler && this.openHandler(params);
	}

	public onDidChangeTextDocument(handler: NotificationHandler<DidChangeTextDocumentParams>): Disposable {
		this.changeHandler = handler;
		return Disposable.create(() => { this.changeHandler = handler; });
	}

	public changeTextDocument(params: DidChangeTextDocumentParams): void {
		this.changeHandler && this.changeHandler(params);
	}

	public onDidCloseTextDocument(handler: NotificationHandler<DidCloseTextDocumentParams>): Disposable {
		this.closeHandler = handler;
		return Disposable.create(() => { this.closeHandler = undefined; });
	}

	public closeTextDocument(params: DidCloseTextDocumentParams): void {
		this.closeHandler && this.closeHandler(params);
	}

	public onWillSaveTextDocument(): Disposable {
		return CellTextDocumentConnection.NULL_DISPOSE;
	}

	public onWillSaveTextDocumentWaitUntil(): Disposable {
		return CellTextDocumentConnection.NULL_DISPOSE;
	}

	public onDidSaveTextDocument(): Disposable {
		return CellTextDocumentConnection.NULL_DISPOSE;
	}
}

export class NotebookDocuments<T extends { uri: DocumentUri }> {

	private readonly notebookDocuments: Map<URI, NotebookDocument>;
	private readonly notebookCellMap: Map<DocumentUri, [NotebookCell, NotebookDocument]>;

	private readonly _onDidOpen: Emitter<NotebookDocument>;
	private readonly _onDidSave: Emitter<NotebookDocument>;
	private readonly _onDidChange: Emitter<NotebookDocumentChangeEvent>;
	private readonly _onDidClose: Emitter<NotebookDocument>;

	private _cellTextDocuments: TextDocuments<T>;

	constructor(configurationOrTextDocuments: TextDocumentsConfiguration<T> | TextDocuments<T>) {
		if (configurationOrTextDocuments instanceof TextDocuments) {
			this._cellTextDocuments = configurationOrTextDocuments;
		} else {
			this._cellTextDocuments = new TextDocuments<T>(configurationOrTextDocuments);
		}
		this.notebookDocuments = new Map();
		this.notebookCellMap = new Map();
		this._onDidOpen = new Emitter();
		this._onDidChange = new Emitter();
		this._onDidSave = new Emitter();
		this._onDidClose = new Emitter();
	}

	public get cellTextDocuments(): TextDocuments<T> {
		return this._cellTextDocuments;
	}

	public getCellTextDocument(cell: NotebookCell): T | undefined {
		return this._cellTextDocuments.get(cell.document);
	}

	public getNotebookDocument(uri: URI): NotebookDocument | undefined {
		return this.notebookDocuments.get(uri);
	}

	public getNotebookCell(uri: DocumentUri): NotebookCell | undefined {
		const value = this.notebookCellMap.get(uri);
		return value && value[0];
	}

	public findNotebookDocumentForCell(cell: DocumentUri | NotebookCell): NotebookDocument | undefined {
		const key = typeof cell === 'string' ? cell : cell.document;
		const value = this.notebookCellMap.get(key);
		return value && value[1];
	}

	public get onDidOpen(): Event<NotebookDocument> {
		return this._onDidOpen.event;
	}

	public get onDidSave(): Event<NotebookDocument> {
		return this._onDidSave.event;
	}

	public get onDidChange(): Event<NotebookDocumentChangeEvent> {
		return this._onDidChange.event;
	}

	public get onDidClose(): Event<NotebookDocument> {
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
	public listen(connection: Connection): Disposable {
		const cellTextDocumentConnection = new CellTextDocumentConnection();
		const disposables: Disposable[] = [];

		disposables.push(this.cellTextDocuments.listen(cellTextDocumentConnection));
		disposables.push(connection.notebooks.synchronization.onDidOpenNotebookDocument((params) => {
			this.notebookDocuments.set(params.notebookDocument.uri, params.notebookDocument);
			for (const cellTextDocument of params.cellTextDocuments) {
				cellTextDocumentConnection.openTextDocument({ textDocument: cellTextDocument });
			}
			this.updateCellMap(params.notebookDocument);
			this._onDidOpen.fire(params.notebookDocument);
		}));
		disposables.push(connection.notebooks.synchronization.onDidChangeNotebookDocument((params) => {
			const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
			if (notebookDocument === undefined) {
				return;
			}
			notebookDocument.version = params.notebookDocument.version;
			const oldMetadata = notebookDocument.metadata;
			let metadataChanged: boolean = false;
			const change = params.change;
			if (change.metadata !== undefined) {
				metadataChanged = true;
				notebookDocument.metadata = change.metadata;
			}

			const opened: DocumentUri[] = [];
			const closed: DocumentUri[] = [];
			const data: Required<Required<Required<NotebookDocumentChangeEvent>['cells']>['changed']>['data'] = [];
			const text: DocumentUri[] = [];
			if (change.cells !== undefined) {
				const changedCells = change.cells;
				if (changedCells.structure !== undefined) {
					const array = changedCells.structure.array;
					notebookDocument.cells.splice(array.start, array.deleteCount, ...(array.cells !== undefined ? array.cells : []));
					// Additional open cell text documents.
					if (changedCells.structure.didOpen !== undefined) {
						for (const open of changedCells.structure.didOpen) {
							cellTextDocumentConnection.openTextDocument({ textDocument: open });
							opened.push(open.uri);
						}
					}
					// Additional closed cell test documents.
					if (changedCells.structure.didClose) {
						for (const close of changedCells.structure.didClose) {
							cellTextDocumentConnection.closeTextDocument({ textDocument: close });
							closed.push(close.uri);
						}
					}
				}
				if (changedCells.data !== undefined) {
					const cellUpdates: Map<string, NotebookCell> = new Map(changedCells.data.map(cell => [cell.document, cell]));
					for (let i = 0; i <= notebookDocument.cells.length; i++) {
						const change = cellUpdates.get(notebookDocument.cells[i].document);
						if (change !== undefined) {
							const old = notebookDocument.cells.splice(i, 1, change);
							data.push({ old: old[0], new: change });
							cellUpdates.delete(change.document);
							if (cellUpdates.size === 0) {
								break;
							}
						}
					}
				}
				if (changedCells.textContent !== undefined) {
					for (const cellTextDocument of changedCells.textContent) {
						cellTextDocumentConnection.changeTextDocument({ textDocument: cellTextDocument.document, contentChanges: cellTextDocument.changes });
						text.push(cellTextDocument.document.uri);
					}
				}
			}

			// Update internal data structure.
			this.updateCellMap(notebookDocument);

			const changeEvent: NotebookDocumentChangeEvent = { notebookDocument };
			if (metadataChanged) {
				changeEvent.metadata = { old: oldMetadata, new: notebookDocument.metadata };
			}

			const added: NotebookCell[] = [];
			for (const open of opened) {
				added.push(this.getNotebookCell(open)!);
			}
			const removed: NotebookCell[] = [];
			for (const close of closed) {
				removed.push(this.getNotebookCell(close)!);
			}
			const textContent: NotebookCell[] = [];
			for (const change of text) {
				textContent.push(this.getNotebookCell(change)!);
			}
			if (added.length > 0 || removed.length > 0 || data.length > 0 || textContent.length > 0) {
				changeEvent.cells = { added, removed, changed: { data, textContent } };
			}
			if (changeEvent.metadata !== undefined || changeEvent.cells !== undefined) {
				this._onDidChange.fire(changeEvent);
			}
		}));
		disposables.push(connection.notebooks.synchronization.onDidSaveNotebookDocument((params) => {
			const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
			if (notebookDocument === undefined) {
				return;
			}
			this._onDidSave.fire(notebookDocument);
		}));
		disposables.push(connection.notebooks.synchronization.onDidCloseNotebookDocument((params) => {
			const notebookDocument = this.notebookDocuments.get(params.notebookDocument.uri);
			if (notebookDocument === undefined) {
				return;
			}
			this._onDidClose.fire(notebookDocument);
			for (const cellTextDocument of params.cellTextDocuments) {
				cellTextDocumentConnection.closeTextDocument({ textDocument: cellTextDocument });
			}
			this.notebookDocuments.delete(params.notebookDocument.uri);
			for (const cell of notebookDocument.cells) {
				this.notebookCellMap.delete(cell.document);
			}
		}));
		return Disposable.create(() => { disposables.forEach(disposable => disposable.dispose()); });
	}

	private updateCellMap(notebookDocument: NotebookDocument): void {
		for (const cell of notebookDocument.cells) {
			this.notebookCellMap.set(cell.document, [cell, notebookDocument]);
		}
	}
}