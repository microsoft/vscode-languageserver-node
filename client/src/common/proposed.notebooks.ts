/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="../../typings/vscode.proposed.notebookEditor.d.ts" />

import * as vscode from 'vscode';
import * as minimatch from 'minimatch';

import * as proto from 'vscode-languageserver-protocol';
import {
	StaticRegistrationOptions, NotebookDocumentFilter, LSPObject, LSPArray, TextDocumentItem, DidOpenTextDocumentNotification,
	DidChangeTextDocumentNotification, DidCloseTextDocumentNotification, NotebookCellTextDocumentFilter, TextDocumentSyncKind
} from 'vscode-languageserver-protocol';

import { DynamicFeature, BaseLanguageClient, RegistrationData, $DocumentSelector } from './client';
import * as UUID from './utils/uuid';
import * as _c2p from './codeConverter';
import * as _p2c from './protocolConverter';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

namespace Converter {
	export namespace c2p {
		export function asVersionedNotebookDocumentIdentifier(notebookDocument: vscode.NotebookDocument, base: _c2p.Converter): proto.Proposed.VersionedNotebookDocumentIdentifier {
			return {
				version: notebookDocument.version,
				uri: base.asUri(notebookDocument.uri)
			};
		}
		export function asNotebookDocument(notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[], base: _c2p.Converter): proto.Proposed.NotebookDocument {
			const result = proto.Proposed.NotebookDocument.create(base.asUri(notebookDocument.uri), notebookDocument.notebookType, notebookDocument.version, asNotebookCells(cells, base));
			if (Object.keys(notebookDocument.metadata).length > 0) {
				result.metadata = asMetadata(notebookDocument.metadata);
			}
			return result;
		}
		export function asNotebookCells(cells: vscode.NotebookCell[], base: _c2p.Converter): proto.Proposed.NotebookCell[] {
			return cells.map(cell => asNotebookCell(cell, base));
		}
		export function asMetadata(metadata: { [key: string]: any}): LSPObject {
			const seen: Set<any> = new Set();
			return deepCopy(seen, metadata);
		}
		export function asNotebookCell(cell: vscode.NotebookCell, base: _c2p.Converter): proto.Proposed.NotebookCell {
			const result = proto.Proposed.NotebookCell.create(asNotebookCellKind(cell.kind), base.asUri(cell.document.uri));
			if (Object.keys(cell.metadata).length > 0) {
				result.metadata = asMetadata(cell.metadata);
			}
			return result;
		}
		function asNotebookCellKind(kind: vscode.NotebookCellKind): proto.Proposed.NotebookCellKind {
			switch (kind) {
				case vscode.NotebookCellKind.Markup:
					return proto.Proposed.NotebookCellKind.Markup;
				case vscode.NotebookCellKind.Code:
					return proto.Proposed.NotebookCellKind.Code;
			}
		}
		function deepCopy(seen: Set<any>, value: {[key: string]: any}): LSPObject;
		function deepCopy(seen: Set<any>, value: any[]): LSPArray;
		function deepCopy(seen: Set<any>, value: {[key: string]: any} | any[]): LSPArray | LSPObject {
			if (seen.has(value)) {
				throw new Error(`Can't deep copy cyclic structures.`);
			}
			if (Array.isArray(value)) {
				const result: LSPArray = [];
				for (const elem of value) {
					if (elem !== null && typeof elem === 'object' || Array.isArray(elem)) {
						result.push(deepCopy(seen, elem));
					} else {
						if (elem instanceof RegExp) {
							throw new Error(`Can't transfer regular expressions to the server`);
						}
						result.push(elem);
					}
				}
				return result;
			} else {
				const props = Object.keys(value);
				const result: LSPObject = Object.create(null);
				for (const prop of props) {
					const elem = value[prop];
					if (elem !== null && typeof elem === 'object' || Array.isArray(elem)) {
						result[prop] = deepCopy(seen, elem);
					} else {
						if (elem instanceof RegExp) {
							throw new Error(`Can't transfer regular expressions to the server`);
						}
						result[prop] = elem;
					}
				}
				return result;
			}
		}
	}
}

namespace NotebookCell {
	export function computeDiff(originalCells: proto.Proposed.NotebookCell[], modifiedCells: proto.Proposed.NotebookCell[], compareMetadata: boolean = false): proto.Proposed.NotebookCellArrayChange | undefined {
		const originalLength = originalCells.length;
		const modifiedLength = modifiedCells.length;
		let startIndex = 0;
		while(startIndex < modifiedLength && startIndex < originalLength && proto.Proposed.NotebookCell.equals(originalCells[startIndex], modifiedCells[startIndex], compareMetadata)) {
			startIndex++;
		}
		if (startIndex < modifiedLength && startIndex < originalLength) {
			let originalEndIndex = originalLength - 1;
			let modifiedEndIndex = modifiedLength - 1;
			while (originalEndIndex >= 0 && modifiedEndIndex >= 0 && proto.Proposed.NotebookCell.equals(originalCells[originalEndIndex], modifiedCells[modifiedEndIndex], compareMetadata)) {
				originalEndIndex--;
				modifiedEndIndex--;
			}

			const deleteCount = (originalEndIndex + 1) - startIndex;
			const newCells = startIndex === modifiedEndIndex + 1 ? undefined : modifiedCells.slice(startIndex, modifiedEndIndex + 1);
			return newCells !== undefined ? { start: startIndex, deleteCount, cells: newCells } : { start: startIndex, deleteCount };
		} else if (startIndex < modifiedLength) {
			return { start: startIndex, deleteCount: 0, cells: modifiedCells.slice(startIndex) } ;
		} else if (startIndex < originalLength) {
			return { start: startIndex, deleteCount: originalLength - startIndex };
		} else {
			// The two arrays are the same.
			return undefined;
		}
	}
}

namespace $NotebookDocumentFilter {
	export function matchNotebook(filter: NotebookDocumentFilter, notebookDocument: vscode.NotebookDocument): boolean {
		if (filter.notebookType !== undefined && notebookDocument.notebookType !== filter.notebookType) {
			return false;
		}
		const uri = notebookDocument.uri;
		if (filter.scheme !== undefined && uri.scheme !== filter.scheme) {
			return false;
		}
		if (filter.pattern !== undefined) {
			const matcher = new minimatch.Minimatch(filter.pattern, { noext: true });
			if (!matcher.makeRe()) {
				return false;
			}
			if (!matcher.match(uri.fsPath)) {
				return false;
			}
		}
		return true;
	}
}

namespace $NotebookDocumentSyncOptions {
	export function match(options: proto.Proposed.NotebookDocumentSyncOptions & { cellDocumentSelector: (NotebookCellTextDocumentFilter[] | $NotebookCellTextDocumentFilter[]) }, cell: vscode.NotebookCell, mode: 'cellContent' | 'notebook'): boolean {
		if (mode === 'cellContent' && !$DocumentSelector.matchForDocumentSync(options.cellDocumentSelector, cell.document)) {
			return false;
		}
		if (mode === 'notebook' && !$DocumentSelector.matchForProvider(options.cellDocumentSelector, cell.document)) {
			return false;
		}
		const notebook = cell.notebook;
		for (const filter of options.notebookDocumentSelector) {
			if (filter.notebookDocumentFilter !== undefined && $NotebookDocumentFilter.matchNotebook(filter.notebookDocumentFilter, notebook)) {
				return true;
			}
		}
		return false;
	}
}

type SyncInfo = {
	/**
	 * The synced LSP notebook cells.
	 */
	cells: proto.Proposed.NotebookCell[];

	/**
	 * A set of VS Code URI of the synced
	 * VS Code notebook cells.
	 */
	uris: Set<string>;
};

namespace SyncInfo {
	export function create(proto: proto.Proposed.NotebookCell[], code: vscode.NotebookCell[]): SyncInfo {
		return {
			cells: proto,
			uris: new Set(code.map(cell => cell.document.uri.toString()))
		};
	}
}


export interface NotebookDocumentChangeData {
	/**
	 * The changed meta data if any.
	 */
	metadata?: { [key: string]: any };

	/**
	 * Changes to the cell structure to add or
	 * remove cells.
	 */
	cellStructure?: {
		/**
		 * The change to the cell array.
		 */
		array: { start: number; deleteCount: number; cells?: vscode.NotebookCell[] };
		/**
		 * Additional opened cell text documents.
		 */
		didOpen?: vscode.NotebookCell[];
		/**
		 * Additional closed cell text documents.
		 */
		didClose?: vscode.NotebookCell[];
	};

	/**
	 * Changes to notebook cells properties like its
	 * kind or metadata.
	 */
	cellData?: vscode.NotebookCell[];

	/**
     * Changes to the text content of notebook cells.
     */
	cellTextContent?: vscode.TextDocumentChangeEvent[];
}

export interface NotebookDocumentMiddleware {
	notebooks?: {
		didOpen?: (this: void, notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[], next: (this: void, notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[]) => Promise<void>) => Promise<void>;
		didSave?: (this: void, notebookDocument: vscode.NotebookDocument, next: (this: void, notebookDocument: vscode.NotebookDocument) => Promise<void>) => Promise<void>;
		didChange?: (this: void, notebookDocument: vscode.NotebookDocument, event: proto.Proposed.NotebookDocumentChangeEvent, next: (this: void, notebookDocument: vscode.NotebookDocument, event: proto.Proposed.NotebookDocumentChangeEvent) => Promise<void>) => Promise<void>;
		didClose?: (this: void, notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[], next: (this: void, notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[]) => Promise<void>) => Promise<void>;
	};
}

export interface NotebookDocumentSyncFeatureShape {
	mode: 'notebook';
	sendOpen(notebookDocument: vscode.NotebookDocument): Promise<void>;
	sendSave(notebookDocument: vscode.NotebookDocument): Promise<void>;
	sendChange(notebookDocument: vscode.NotebookDocument, changeData: NotebookDocumentChangeData): Promise<void>;
	sendClose(notebookDocument: vscode.NotebookDocument): Promise<void>;
}

class NotebookDocumentSyncFeatureProvider implements NotebookDocumentSyncFeatureShape {

	private readonly client: BaseLanguageClient;
	private readonly options: proto.Proposed.NotebookDocumentSyncOptions & { cellDocumentSelector: NotebookCellTextDocumentFilter[] };
	private readonly notebookSyncInfo: Map<string, SyncInfo>;
	private readonly notebookDidOpen: Set<string>;
	private readonly disposables: vscode.Disposable[];

	constructor(client: BaseLanguageClient, options: proto.Proposed.NotebookDocumentSyncOptions & { cellDocumentSelector: NotebookCellTextDocumentFilter[] }) {
		this.client = client;
		this.options = options;
		this.notebookSyncInfo = new Map();
		this.notebookDidOpen = new Set();
		this.disposables = [];

		// open
		vscode.workspace.onDidOpenNotebookDocument((notebookDocument) => {
			this.notebookDidOpen.add(notebookDocument.uri.toString());
			this.didOpen(notebookDocument);
		}, undefined, this.disposables);
		for (const notebookDocument of vscode.workspace.notebookDocuments) {
			this.notebookDidOpen.add(notebookDocument.uri.toString());
			this.didOpen(notebookDocument);
		}

		// notebook document meta data changed
		vscode.notebooks.onDidChangeNotebookDocumentMetadata(event => this.notebookDocumentMetadataChanged(event.document), undefined, this.disposables);

		// cell add, remove, reorder
		vscode.notebooks.onDidChangeNotebookCells(event => this.cellStructureChanged(event.document), undefined, this.disposables);

		// The metadata of the cell has changed.
		vscode.notebooks.onDidChangeCellMetadata(event => this.cellMetaDataChanged(event.cell.notebook, event.cell), undefined, this.disposables);

		//save
		if (this.options.save === true) {
			vscode.notebooks.onDidSaveNotebookDocument(notebookDocument => this.didSave(notebookDocument), undefined, this.disposables);
		}

		// close
		vscode.workspace.onDidCloseNotebookDocument((notebookDocument) => {
			this.didClose(notebookDocument);
			this.notebookDidOpen.delete(notebookDocument.uri.toString());
		}, undefined, this.disposables);
	}

	public get mode(): 'notebook' {
		return 'notebook';
	}

	public handles(notebookCell: vscode.NotebookCell): boolean {
		return $NotebookDocumentSyncOptions.match(this.options, notebookCell, this.mode);
	}

	public didOpenNotebookCellDocument(notebookDocument: vscode.NotebookDocument, cell: vscode.NotebookCell): void {
		if (!this.notebookDidOpen.has(notebookDocument.uri.toString())) {
			// We have never received an open notification for the notebook document.
			// VS Code guarantees that we first get cell document open and then
			// notebook open. So simply wait for the notebook open.
			return;
		}
		const syncInfo = this.notebookSyncInfo.get(notebookDocument.uri.toString());
		// In VS Code we receive a notebook open before a cell document open.
		// The document and the cell is synced.
		const cells = this.getMatchingCells(notebookDocument, [cell]);
		const cellMatches = cells !== undefined && cells[0] === cell;
		if (syncInfo !== undefined) {
			const cellIsSynced = syncInfo.uris.has(cell.document.uri.toString());
			// The notebook document is synced
			if (cellMatches && cellIsSynced) {
				// Cell matches and is synced.
				return;
			}
			this.cellStructureChanged(notebookDocument, syncInfo);
		} else {
			// No sync info
			if (!cellMatches) {
				// Cell doesn't match. Everything OK
				return;
			}
			this.cellStructureChanged(notebookDocument, syncInfo);
		}
	}

	public didChangeCellTextDocument(notebookDocument: vscode.NotebookDocument, event: vscode.TextDocumentChangeEvent): void {
		if (!$DocumentSelector.matchForProvider(this.options.cellDocumentSelector, event.document)) {
			return;
		}
		this.doSendChange(notebookDocument, {
			cellTextDocuments:[this.client.code2ProtocolConverter.asChangeTextDocumentParams(event)]
		}).catch(() => { /* error handled in doSendChange */ });
	}

	public dispose(): void {
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
	}

	private didOpen(notebookDocument: vscode.NotebookDocument, optionalCells: vscode.NotebookCell[] | null = null, syncInfo: SyncInfo | undefined = this.notebookSyncInfo.get(notebookDocument.uri.toString())): void {
		if (syncInfo !== undefined) {
			// The notebook document got synced because a cell document got opened.
			this.cellStructureChanged(notebookDocument, syncInfo);
		} else {
			// Check if we need to sync the notebook document.
			const cells = optionalCells ?? this.getMatchingCells(notebookDocument);
			if (cells === undefined) {
				return;
			}

			this.doSendOpen(notebookDocument, cells, (nb) => {
				this.notebookSyncInfo.set(notebookDocument.uri.toString(), SyncInfo.create(nb.cells, cells) );
			}).catch(() => { /** Failure is handled in doSend */});
		}
	}

	private notebookDocumentMetadataChanged(notebookDocument: vscode.NotebookDocument): void {
		const syncInfo = this.notebookSyncInfo.get(notebookDocument.uri.toString());
		if (syncInfo === undefined) {
			return;
		}
		this.doSendChange(notebookDocument, {
			metadata: Converter.c2p.asMetadata(notebookDocument.metadata)
		}).catch(() => { /* error handled in doSendChange */ });
	}

	private cellStructureChanged(notebookDocument: vscode.NotebookDocument, syncInfo: SyncInfo | undefined = this.notebookSyncInfo.get(notebookDocument.uri.toString())): void {
		if (syncInfo === undefined) {
			// The notebook has not been synced. Could be it never matched or some
			// cells didn't match. So check if it would match now.
			const cells = this.getMatchingCells(notebookDocument);
			if (cells === undefined) {
				return;
			}
			this.didOpen(notebookDocument, cells, syncInfo);
		} else {
			// It is synced. Could be no cells match anymore. If this is the
			// case we close the notebook document. Otherwise we send a change event.
			const cells = this.getMatchingCells(notebookDocument);
			if (cells === undefined) {
				this.didClose(notebookDocument, syncInfo);
				return;
			}
			const oldCells = syncInfo.cells;
			const newCells = Converter.c2p.asNotebookCells(cells, this.client.code2ProtocolConverter);
			// meta data changes are reported using a different event. So we can ignore comparing the meta data which
			// has a positive impact on performance.
			const diff = NotebookCell.computeDiff(syncInfo.cells, newCells, false);
			if (diff === undefined) {
				return;
			}

			const deletedCells: Set<string> = diff.deleteCount === 0
				? new Set()
				: new Set(oldCells.slice(diff.start, diff.start + diff.deleteCount).map(cell => cell.document));
			const insertedCells: Set<string> = diff.cells === undefined
				? new Set()
				: new Set(diff.cells.map(cell => cell.document));

			// Remove the onces that got deleted and inserted again.
			for (const key of Array.from(deletedCells.values())) {
				if (insertedCells.has(key)) {
					deletedCells.delete(key);
					insertedCells.delete(key);
				}
			}

			const didOpen: Required<proto.Proposed.NotebookDocumentChangeEvent>['cellStructure']['didOpen'] = [];
			const didClose: Required<proto.Proposed.NotebookDocumentChangeEvent>['cellStructure']['didClose'] = [];
			if (deletedCells.size > 0 || insertedCells.size > 0) {
				const codeCells: Map<string, vscode.NotebookCell> = new Map(cells.map(cell => [this.client.code2ProtocolConverter.asUri(cell.document.uri), cell]));
				for (const document of insertedCells.values()) {
					const cell = codeCells.get(document);
					if (cell !== undefined) {
						didOpen.push(this.client.code2ProtocolConverter.asTextDocumentItem(cell.document));
					}
				}
				for (const document of deletedCells.values()) {
					didClose.push({ uri: document });
				}
			}
			this.doSendChange(notebookDocument, {
				cellStructure: {
					array: diff,
					didClose: didClose.length > 0 ? didClose : undefined,
					didOpen: didOpen.length > 0 ? didOpen : undefined
				}
			}).catch(() => { /* error handled in doSendChange */ });
			this.notebookSyncInfo.set(notebookDocument.uri.toString(), SyncInfo.create(newCells, cells));
		}
	}

	private cellMetaDataChanged(notebookDocument: vscode.NotebookDocument, cell: vscode.NotebookCell): void {
		const syncInfo = this.notebookSyncInfo.get(notebookDocument.uri.toString());
		if (syncInfo === undefined) {
			// No sync info. Since the cells meta data change it can have no impact on the
			// sync in general (not filter on metadata). So nothing to do
			return;
		}
		if (!syncInfo.uris.has(cell.document.uri.toString())) {
			// The cell is not sync. So ignore as well.
			return;
		}
		const pc = Converter.c2p.asNotebookCell(cell, this.client.code2ProtocolConverter);
		this.doSendChange(notebookDocument, { cellData: [pc] }).catch(() => { /* error handled in doSendChange */ });
	}

	private didSave(notebookDocument: vscode.NotebookDocument): void {
		const syncInfo = this.notebookSyncInfo.get(notebookDocument.uri.toString());
		if (syncInfo === undefined) {
			return;
		}
		this.doSendSave(notebookDocument).catch(() => {/* error handled in doSendSave */});
	}

	private didClose(notebookDocument: vscode.NotebookDocument, syncInfo: SyncInfo | undefined = this.notebookSyncInfo.get(notebookDocument.uri.toString())): void {
		if (syncInfo === undefined) {
			return;
		}
		const syncedCells = notebookDocument.getCells().filter(cell => syncInfo.uris.has(cell.document.uri.toString()));
		this.doSendClose(notebookDocument, syncedCells).catch(() => {/* error handled in doSendClose */ });
		this.notebookSyncInfo.delete(notebookDocument.uri.toString());
	}

	private getMatchingCells(notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[] = notebookDocument.getCells()): vscode.NotebookCell[] | undefined {
		if (this.options.notebookDocumentSelector === undefined) {
			return undefined;
		}
		for (const item of this.options.notebookDocumentSelector) {
			if (item.notebookDocumentFilter === undefined) {
				if (item.cellSelector === undefined) {
					return undefined;
				}
				const filtered = this.filterCells(cells, item.cellSelector);
				return filtered.length === 0 ? undefined : filtered;
			} else if ($NotebookDocumentFilter.matchNotebook(item.notebookDocumentFilter, notebookDocument)){
				return item.cellSelector === undefined ? cells : this.filterCells(cells, item.cellSelector);
			}
		}
		return undefined;
	}


	private filterCells(cells: vscode.NotebookCell[], cellSelector: { language: string }[]): vscode.NotebookCell[] {
		return cells.filter((cell) => {
			const cellLanguage = cell.document.languageId;
			return cellSelector.some((filter => cellLanguage === filter.language));
		});
	}

	public async sendOpen(notebookDocument: vscode.NotebookDocument): Promise<void> {
		const cells = this.getMatchingCells(notebookDocument);
		if (cells === undefined) {
			return;
		}
		return this.doSendOpen(notebookDocument, cells);
	}

	private async doSendOpen(notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[], cb?: (notebook: proto.Proposed.NotebookDocument) => void ): Promise<void> {
		const send = (notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[]): Promise<void> => {
			const nb = Converter.c2p.asNotebookDocument(notebookDocument, cells, this.client.code2ProtocolConverter);
			const cellDocuments: TextDocumentItem[] = cells.map(cell => this.client.code2ProtocolConverter.asTextDocumentItem(cell.document));
			const result = this.client.sendNotification(proto.Proposed.DidOpenNotebookDocumentNotification.type, {
				notebookDocument: nb,
				cellTextDocuments: cellDocuments
			}).catch((error) => {
				this.client.error('Sending DidOpenNotebookDocumentNotification failed', error);
				throw error;
			});
			cb && cb(nb);
			return result;
		};
		const middleware = this.client.clientOptions.middleware?.notebooks;
		return middleware?.didOpen !== undefined ? middleware.didOpen(notebookDocument, cells, send) : send(notebookDocument, cells);
	}

	public async sendChange(notebookDocument: vscode.NotebookDocument, changeData: NotebookDocumentChangeData): Promise<void> {
		const changeEvent: proto.Proposed.NotebookDocumentChangeEvent = Object.create(null);
		if (changeData.metadata) {
			changeEvent.metadata = Converter.c2p.asMetadata(notebookDocument.metadata);
		}
		if (changeData.cellStructure) {
			changeEvent.cellStructure = {
				array: {
					start: changeData.cellStructure.array.start,
					deleteCount: changeData.cellStructure.array.deleteCount,
					cells: changeData.cellStructure.array.cells !== undefined ? changeData.cellStructure.array.cells.map(cell => Converter.c2p.asNotebookCell(cell, this.client.code2ProtocolConverter)) : undefined
				},
				didOpen: changeData.cellStructure.didOpen !== undefined
					? changeData.cellStructure.didOpen.map(cell => this.client.code2ProtocolConverter.asOpenTextDocumentParams(cell.document).textDocument)
					: undefined,
				didClose: changeData.cellStructure.didClose !== undefined
					? changeData.cellStructure.didClose.map(cell => this.client.code2ProtocolConverter.asCloseTextDocumentParams(cell.document).textDocument)
					: undefined
			};
		}
		if (changeData.cellData !== undefined) {
			changeEvent.cellData = changeData.cellData.map(cell => Converter.c2p.asNotebookCell(cell, this.client.code2ProtocolConverter));
		}
		if (changeData.cellTextContent !== undefined) {
			changeEvent.cellTextDocuments = changeData.cellTextContent.map(event => this.client.code2ProtocolConverter.asChangeTextDocumentParams(event));
		}
		if (Object.keys(changeEvent).length > 0) {
			return this.doSendChange(notebookDocument, changeEvent);
		}
	}

	private async doSendChange(notebookDocument: vscode.NotebookDocument, change: proto.Proposed.NotebookDocumentChangeEvent): Promise<void> {
		const send = (notebookDocument: vscode.NotebookDocument, change: proto.Proposed.NotebookDocumentChangeEvent): Promise<void> => {
			return this.client.sendNotification(proto.Proposed.DidChangeNotebookDocumentNotification.type, {
				notebookDocument: Converter.c2p.asVersionedNotebookDocumentIdentifier(notebookDocument, this.client.code2ProtocolConverter),
				change: change
			}).catch((error) => {
				this.client.error('Sending DidChangeNotebookDocumentNotification failed', error);
			});
		};
		const middleware = this.client.clientOptions.middleware?.notebooks;
		return middleware?.didChange !== undefined ? middleware?.didChange(notebookDocument, change, send) : send(notebookDocument, change);
	}

	public async sendSave(notebookDocument: vscode.NotebookDocument): Promise<void> {
		return this.doSendSave(notebookDocument);
	}

	private async doSendSave(notebookDocument: vscode.NotebookDocument): Promise<void> {
		const send = (notebookDocument: vscode.NotebookDocument): Promise<void> => {
			return this.client.sendNotification(proto.Proposed.DidSaveNotebookDocumentNotification.type, {
				notebookDocument: { uri: this.client.code2ProtocolConverter.asUri(notebookDocument.uri) }
			}).catch((error) => {
				this.client.error('Sending DidSaveNotebookDocumentNotification failed', error);
				throw error;
			});
		};
		const middleware = this.client.clientOptions.middleware?.notebooks;
		return middleware?.didSave !== undefined ? middleware.didSave(notebookDocument, send) : send(notebookDocument);
	}

	public async sendClose(notebookDocument: vscode.NotebookDocument): Promise<void> {
		return this.doSendClose(notebookDocument, this.getMatchingCells(notebookDocument) ?? []);
	}

	private async doSendClose(notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[]): Promise<void> {
		const send = (notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[]): Promise<void> => {
			return this.client.sendNotification(proto.Proposed.DidCloseNotebookDocumentNotification.type,  {
				notebookDocument: { uri: this.client.code2ProtocolConverter.asUri(notebookDocument.uri) },
				cellTextDocuments: cells.map(cell => this.client.code2ProtocolConverter.asTextDocumentIdentifier(cell.document))
			}).catch((error) => {
				this.client.error('Sending DidCloseNotebookDocumentNotification failed', error);
				throw error;
			});
		};
		const middleware = this.client.clientOptions.middleware?.notebooks;
		return middleware?.didClose !== undefined ? middleware.didClose(notebookDocument, cells, send) : send(notebookDocument, cells);
	}
}

export type $NotebookCellTextDocumentFilter = NotebookCellTextDocumentFilter & { sync: true };

export interface NotebookCellTextDocumentSyncFeatureShape {
	mode: 'cellContent';
	sendOpen(textDocument: vscode.TextDocument): Promise<void>;
	sendChange(event: vscode.TextDocumentChangeEvent): Promise<void>;
	sendClose(textDocument: vscode.TextDocument): Promise<void>;
}

class NotebookCellTextDocumentSyncFeatureProvider implements NotebookCellTextDocumentSyncFeatureShape {

	private readonly client: BaseLanguageClient;
	private readonly options: proto.Proposed.NotebookDocumentSyncOptions & { cellDocumentSelector: $NotebookCellTextDocumentFilter[] };
	private readonly registrations: { open: string; change: string; close: string } | undefined;

	constructor(client: BaseLanguageClient, options: proto.Proposed.NotebookDocumentSyncOptions & { cellDocumentSelector: $NotebookCellTextDocumentFilter[] }) {
		this.client = client;
		this.options = options;

		if (options.cellDocumentSelector.length > 0) {
			const openId = UUID.generateUuid();
			this.client.getFeature(DidOpenTextDocumentNotification.method).register({
				id: openId, registerOptions: { documentSelector: options.cellDocumentSelector }
			});
			const changeId = UUID.generateUuid();
			this.client.getFeature(DidChangeTextDocumentNotification.method).register({
				id: changeId, registerOptions: { documentSelector: options.cellDocumentSelector , syncKind: TextDocumentSyncKind.Incremental }
			});
			const closeId = UUID.generateUuid();
			this.client.getFeature(DidCloseTextDocumentNotification.method).register({
				id: closeId, registerOptions: { documentSelector: options.cellDocumentSelector }
			});
			this.registrations = {open: openId, change: changeId, close: closeId};
		}
	}

	public get mode(): 'cellContent' {
		return 'cellContent';
	}

	public handles(notebookCell: vscode.NotebookCell): boolean {
		return $NotebookDocumentSyncOptions.match(this.options, notebookCell, this.mode);
	}

	public dispose(): void {
		if (this.registrations !== undefined) {
			this.client.getFeature(DidOpenTextDocumentNotification.method).unregister(this.registrations.open);
			this.client.getFeature(DidChangeTextDocumentNotification.method).unregister(this.registrations.change);
			this.client.getFeature(DidCloseTextDocumentNotification.method).unregister(this.registrations.close);
		}
	}

	public async sendOpen(textDocument: vscode.TextDocument): Promise<void> {
		const provider = this.client.getFeature(DidOpenTextDocumentNotification.method).getProvider(textDocument);
		return provider !== undefined ? provider.send(textDocument) : Promise.reject(new Error(`No open provider found for notebook cell document ${textDocument.uri.toString()}`));
	}

	public async sendChange(event: vscode.TextDocumentChangeEvent): Promise<void> {
		const provider = this.client.getFeature(DidChangeTextDocumentNotification.method).getProvider(event.document);
		return provider !== undefined ? provider.send(event) : Promise.reject(new Error(`No change provider found for notebook cell document ${event.document.uri.toString()}`));
	}

	public async sendClose(textDocument: vscode.TextDocument): Promise<void> {
		const provider = this.client.getFeature(DidCloseTextDocumentNotification.method).getProvider(textDocument);
		return provider !== undefined ? provider.send(textDocument) : Promise.reject(new Error(`No close provider found for notebook cell document ${textDocument.uri.toString()}`));
	}
}

export interface NotebookDocumentProviderFeature {
	getProvider(notebookCell: vscode.NotebookCell): NotebookCellTextDocumentSyncFeatureShape | NotebookDocumentSyncFeatureShape |undefined;
}

export class NotebookDocumentSyncFeature implements DynamicFeature<proto.Proposed.NotebookDocumentSyncRegistrationOptions>, NotebookDocumentProviderFeature {

	public static readonly CellScheme: string = 'vscode-notebook-cell';

	private readonly client: BaseLanguageClient;
	private readonly registrations: Map<string, NotebookCellTextDocumentSyncFeatureProvider | NotebookDocumentSyncFeatureProvider>;

	constructor(client: BaseLanguageClient) {
		this.client = client;
		this.registrations = new Map();
		this.registrationType = proto.Proposed.NotebookDocumentSyncRegistrationType.type;
		// We don't receive an event for cells where the document changes its language mode
		// Since we allow servers to filter on the language mode we fire such an event ourselves.
		vscode.workspace.onDidOpenTextDocument((textDocument) => {
			if (textDocument.uri.scheme !== NotebookDocumentSyncFeature.CellScheme) {
				return;
			}
			const [notebookDocument, notebookCell] = this.getNotebookDocument(textDocument);
			if (notebookDocument === undefined || notebookCell === undefined) {
				return;
			}
			for (const provider of this.registrations.values()) {
				if (provider instanceof NotebookDocumentSyncFeatureProvider) {
					provider.didOpenNotebookCellDocument(notebookDocument, notebookCell);
				}
			}
		});
		vscode.workspace.onDidChangeTextDocument((event) => {
			if (event.contentChanges.length === 0) {
				return;
			}
			const textDocument = event.document;
			if (textDocument.uri.scheme !== NotebookDocumentSyncFeature.CellScheme) {
				return;
			}
			const [notebookDocument, ] = this.getNotebookDocument(textDocument);
			if (notebookDocument === undefined) {
				return;
			}
			for (const provider of this.registrations.values()) {
				if (provider instanceof NotebookDocumentSyncFeatureProvider) {
					provider.didChangeCellTextDocument(notebookDocument, event);
				}
			}
		});
	}

	public readonly registrationType: proto.RegistrationType<proto.Proposed.NotebookDocumentSyncRegistrationOptions>;

	public fillClientCapabilities(capabilities: proto.ClientCapabilities & proto.Proposed.$NotebookDocumentClientCapabilities): void {
		const synchronization = ensure(ensure(capabilities, 'notebookDocument')!, 'synchronization')!;
		synchronization.dynamicRegistration = true;
	}

	public initialize(capabilities: proto.ServerCapabilities<any> & proto.Proposed.$NotebookDocumentSyncServerCapabilities): void {
		const options = capabilities.notebookDocumentSync;
		if (options === undefined) {
			return;
		}
		const id = (options as StaticRegistrationOptions).id ?? UUID.generateUuid();
		this.register({ id, registerOptions: options});
	}

	public register(data: RegistrationData<proto.Proposed.NotebookDocumentSyncRegistrationOptions>): void {
		if (data.registerOptions.mode === 'cellContent') {
			const options = Object.assign({},
				data.registerOptions,
				{ cellDocumentSelector: this.getNotebookCellTextDocumentFilter(data.registerOptions, true) }
			);
			const provider = new NotebookCellTextDocumentSyncFeatureProvider(this.client, options);
			this.registrations.set(data.id, provider);
		} else {
			const options = Object.assign({},
				data.registerOptions,
				{ cellDocumentSelector: this.getNotebookCellTextDocumentFilter(data.registerOptions) }
			);
			const provider = new NotebookDocumentSyncFeatureProvider(this.client, options);
			this.registrations.set(data.id, provider);
		}
	}

	public unregister(id: string): void {
		const provider = this.registrations.get(id);
		provider && provider.dispose();
	}

	public dispose(): void {
		for (const provider of this.registrations.values()) {
			provider.dispose();
		}
		this.registrations.clear();
	}

	public getProvider(notebookCell: vscode.NotebookCell): NotebookCellTextDocumentSyncFeatureShape | NotebookDocumentSyncFeatureShape | undefined {
		for (const provider of this.registrations.values()) {
			if (provider.handles(notebookCell)) {
				return provider;
			}
		}
		return undefined;
	}

	private getNotebookDocument(textDocument: vscode.TextDocument): [vscode.NotebookDocument | undefined, vscode.NotebookCell | undefined] {
		const uri = textDocument.uri.toString();
		for (const notebookDocument of vscode.workspace.notebookDocuments) {
			for (const cell of notebookDocument.getCells()) {
				if (cell.document.uri.toString() === uri) {
					return [notebookDocument, cell];
				}
			}
		}
		return [undefined, undefined];
	}

	private getNotebookCellTextDocumentFilter(options: proto.Proposed.NotebookDocumentSyncRegistrationOptions): NotebookCellTextDocumentFilter[];
	private getNotebookCellTextDocumentFilter(options: proto.Proposed.NotebookDocumentSyncRegistrationOptions, sync: true): $NotebookCellTextDocumentFilter[];
	private getNotebookCellTextDocumentFilter(options: proto.Proposed.NotebookDocumentSyncRegistrationOptions, sync?: true ): NotebookCellTextDocumentFilter[] {
		const documentSelector: NotebookCellTextDocumentFilter[] = [];
		for (const item of options.notebookDocumentSelector) {
			let nf: $NotebookCellTextDocumentFilter | NotebookCellTextDocumentFilter | undefined;
			if (item.notebookDocumentFilter !== undefined) {
				nf = sync === true ? { notebookDocument: Object.assign({}, item.notebookDocumentFilter, { sync: true }) } : { notebookDocument: Object.assign({}, item.notebookDocumentFilter) } ;
			}
			if (item.cellSelector !== undefined) {
				for (const cell of item.cellSelector) {
					if (nf === undefined) {
						documentSelector.push((sync === true ? { cellLanguage: cell.language, sync: true } : { cellLanguage: cell.language }) as NotebookCellTextDocumentFilter);
					} else {
						documentSelector.push(Object.assign({}, nf, { cellLanguage: cell.language }));
					}
				}
				nf = undefined;
			} else if (nf !== undefined) {
				documentSelector.push(nf);
			}
		}
		return documentSelector;
	}
}