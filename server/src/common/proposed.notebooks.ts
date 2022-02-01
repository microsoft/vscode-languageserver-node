/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	Proposed, NotificationHandler1, Emitter, Event, LSPObject, DidChangeTextDocumentParams, DidCloseTextDocumentParams, DidOpenTextDocumentParams,
	NotificationHandler,
	DocumentUri
} from 'vscode-languageserver-protocol';

import type { Feature, _Notebooks, _Connection, _, } from './server';
import { TextDocuments, TextDocumentConnection, TextDocumentsConfiguration } from './textDocuments';


/**
 * Shape of the notebooks feature
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
	cells?: {
		/**
		 * The cells that got added.
		 */
		added: Proposed.NotebookCell[];

		/**
		 * The cells that got removed.
		 */
		removed: Proposed.NotebookCell[];

		/**
		 * The cells that changed.
		 */
		changed: {
			/**
			 * The cell data has changed, excluding its
			 * text content which is reported via
			 * `textContentChanged`.
			 */
			data: { old: Proposed.NotebookCell; new: Proposed.NotebookCell }[];

			/**
			 * The text content of a cell has changed.
			 * The actual text is available via the `Notebooks`
			 * text document manager.
			 */
			textContent: Proposed.NotebookCell[];
		};
	};
};

class Connection implements TextDocumentConnection {

	private openHandler: NotificationHandler<DidOpenTextDocumentParams> | undefined;
	private changeHandler: NotificationHandler<DidChangeTextDocumentParams> | undefined;
	private closeHandler: NotificationHandler<DidCloseTextDocumentParams> | undefined;

	public onDidOpenTextDocument(handler: NotificationHandler<DidOpenTextDocumentParams>): void {
		this.openHandler = handler;
	}

	public openTextDocument(params: DidOpenTextDocumentParams): void {
		this.openHandler && this.openHandler(params);
	}

	public onDidChangeTextDocument(handler: NotificationHandler<DidChangeTextDocumentParams>): void {
		this.changeHandler = handler;
	}

	public changeTextDocument(params: DidChangeTextDocumentParams): void {
		this.changeHandler && this.changeHandler(params);
	}

	public onDidCloseTextDocument(handler: NotificationHandler<DidCloseTextDocumentParams>): void {
		this.closeHandler = handler;
	}

	public closeTextDocument(params: DidCloseTextDocumentParams): void {
		this.closeHandler && this.closeHandler(params);
	}

	public onWillSaveTextDocument(): void {
	}

	public onWillSaveTextDocumentWaitUntil(): void {
	}

	public onDidSaveTextDocument(): void {
	}
}

export class Notebooks<T extends {  uri: DocumentUri }> {

	private readonly notebookDocuments: Map<string, Proposed.NotebookDocument>;
	private readonly notebookCellMap: Map<string, [Proposed.NotebookCell, Proposed.NotebookDocument]>;

	private readonly _onDidOpen: Emitter<Proposed.NotebookDocument>;
	private readonly _onDidSave: Emitter<Proposed.NotebookDocument>;
	private readonly _onDidChange: Emitter<NotebookDocumentChangeEvent>;
	private readonly _onDidClose: Emitter<Proposed.NotebookDocument>;

	private _cellTextDocuments: TextDocuments<T>;

	constructor(configuration: TextDocumentsConfiguration<T>) {
		this._cellTextDocuments = new TextDocuments<T>(configuration);
		this.notebookDocuments= new Map();
		this.notebookCellMap = new Map();
		this._onDidOpen = new Emitter();
		this._onDidChange = new Emitter();
		this._onDidSave = new Emitter();
		this._onDidClose = new Emitter();
	}

	public get cellTextDocuments(): TextDocuments<T> {
		return this._cellTextDocuments;
	}

	public getCellTextDocument(cell: Proposed.NotebookCell): T | undefined {
		return this._cellTextDocuments.get(cell.document);
	}

	public getNotebookDocument(uri: DocumentUri): Proposed.NotebookDocument | undefined {
		return this.notebookDocuments.get(uri);
	}

	public getNotebookCell(uri: DocumentUri): Proposed.NotebookCell | undefined {
		const value = this.notebookCellMap.get(uri);
		return value && value[0];
	}

	public findNotebookDocumentForCell(cell: DocumentUri | Proposed.NotebookCell): Proposed.NotebookDocument | undefined {
		const key = typeof cell === 'string' ? cell : cell.document;
		const value = this.notebookCellMap.get(key);
		return value && value[1];
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
		const cellTextDocumentConnection = new Connection();
		this.cellTextDocuments.listen(cellTextDocumentConnection);

		connection.notebooks.synchronization.onDidOpenNotebookDocument((params) => {
			this.notebookDocuments.set(params.notebookDocument.uri, params.notebookDocument);
			for (const cellTextDocument of params.cellTextDocuments) {
				cellTextDocumentConnection.openTextDocument({ textDocument: cellTextDocument });
			}
			this.updateCellMap(params.notebookDocument);
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
					const cellUpdates: Map<string, Proposed.NotebookCell> = new Map(changedCells.data.map(cell => [cell.document, cell]));
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

			const added: Proposed.NotebookCell[] = [];
			for (const open of opened) {
				added.push(this.getNotebookCell(open)!);
			}
			const removed: Proposed.NotebookCell[] = [];
			for (const close of closed) {
				removed.push(this.getNotebookCell(close)!);
			}
			const textContent: Proposed.NotebookCell[] = [];
			for (const change of text) {
				textContent.push(this.getNotebookCell(change)!);
			}
			if (added.length > 0 || removed.length > 0 || data.length > 0 || textContent.length > 0) {
				changeEvent.cells = { added, removed, changed: { data, textContent } };
			}
			if (changeEvent.metadata !== undefined || changeEvent.cells !== undefined) {
				this._onDidChange.fire(changeEvent);
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
			this._onDidClose.fire(notebookDocument);
			for (const cellTextDocument of params.cellTextDocuments) {
				cellTextDocumentConnection.closeTextDocument({ textDocument: cellTextDocument });
			}
			this.notebookDocuments.delete(params.notebookDocument.uri);
			for (const cell of notebookDocument.cells) {
				this.notebookCellMap.delete(cell.document);
			}
		});
	}

	private updateCellMap(notebookDocument: Proposed.NotebookDocument): void {
		for (const cell of notebookDocument.cells) {
			this.notebookCellMap.set(cell.document, [cell, notebookDocument]);
		}
	}
}