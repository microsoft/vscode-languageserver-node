/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as minimatch from 'minimatch';

import * as proto from 'vscode-languageserver-protocol';
import {
	StaticRegistrationOptions, NotebookDocumentFilter, TextDocumentItem, NotebookCellTextDocumentFilter, LSPAny
} from 'vscode-languageserver-protocol';

import * as UUID from './utils/uuid';
import * as Is from './utils/is';

import * as _c2p from './codeConverter';
import * as _p2c from './protocolConverter';
import { DynamicFeature, FeatureClient, RegistrationData, FeatureState } from './features';


function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

type $LSPObject = { [key: string]: LSPAny };
type $LSPArray = LSPAny[];

namespace Converter {
	export namespace c2p {
		export function asVersionedNotebookDocumentIdentifier(notebookDocument: vscode.NotebookDocument, base: _c2p.Converter): proto.VersionedNotebookDocumentIdentifier {
			return {
				version: notebookDocument.version,
				uri: base.asUri(notebookDocument.uri)
			};
		}
		export function asNotebookDocument(notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[], base: _c2p.Converter): proto.NotebookDocument {
			const result = proto.NotebookDocument.create(base.asUri(notebookDocument.uri), notebookDocument.notebookType, notebookDocument.version, asNotebookCells(cells, base));
			if (Object.keys(notebookDocument.metadata).length > 0) {
				result.metadata = asMetadata(notebookDocument.metadata);
			}
			return result;
		}
		export function asNotebookCells(cells: vscode.NotebookCell[], base: _c2p.Converter): proto.NotebookCell[] {
			return cells.map(cell => asNotebookCell(cell, base));
		}
		export function asMetadata(metadata: { [key: string]: any}): $LSPObject {
			const seen: Set<any> = new Set();
			return deepCopy(seen, metadata);
		}
		export function asNotebookCell(cell: vscode.NotebookCell, base: _c2p.Converter): proto.NotebookCell {
			const result = proto.NotebookCell.create(asNotebookCellKind(cell.kind), base.asUri(cell.document.uri));
			if (Object.keys(cell.metadata).length > 0) {
				result.metadata = asMetadata(cell.metadata);
			}
			if (cell.executionSummary !== undefined && (Is.number(cell.executionSummary.executionOrder) && Is.boolean(cell.executionSummary.success))) {
				result.executionSummary = {
					executionOrder: cell.executionSummary.executionOrder,
					success: cell.executionSummary.success
				};
			}
			return result;
		}
		function asNotebookCellKind(kind: vscode.NotebookCellKind): proto.NotebookCellKind {
			switch (kind) {
				case vscode.NotebookCellKind.Markup:
					return proto.NotebookCellKind.Markup;
				case vscode.NotebookCellKind.Code:
					return proto.NotebookCellKind.Code;
			}
		}
		function deepCopy(seen: Set<any>, value: {[key: string]: any}): $LSPObject;
		function deepCopy(seen: Set<any>, value: any[]): $LSPArray;
		function deepCopy(seen: Set<any>, value: {[key: string]: any} | any[]): $LSPArray | $LSPObject {
			if (seen.has(value)) {
				throw new Error(`Can't deep copy cyclic structures.`);
			}
			if (Array.isArray(value)) {
				const result: $LSPArray = [];
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
				const result: $LSPObject = Object.create(null);
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
		type TextContent = Required<Required<Required<proto.NotebookDocumentChangeEvent>['cells']>['textContent']>[0];
		export function asTextContentChange(event: vscode.TextDocumentChangeEvent, base: _c2p.Converter): TextContent {
			const params = base.asChangeTextDocumentParams(event);
			return { document: params.textDocument, changes: params.contentChanges };
		}
		export function asNotebookDocumentChangeEvent(event: VNotebookDocumentChangeEvent, base: _c2p.Converter): proto.NotebookDocumentChangeEvent {
			const result: proto.NotebookDocumentChangeEvent = Object.create(null);
			if (event.metadata) {
				result.metadata = Converter.c2p.asMetadata(event.metadata);
			}
			if (event.cells !== undefined) {
				const cells: Required<proto.NotebookDocumentChangeEvent>['cells'] =  Object.create(null);
				const changedCells = event.cells;
				if (changedCells.structure) {
					cells.structure = {
						array: {
							start: changedCells.structure.array.start,
							deleteCount: changedCells.structure.array.deleteCount,
							cells: changedCells.structure.array.cells !== undefined ? changedCells.structure.array.cells.map(cell => Converter.c2p.asNotebookCell(cell, base)) : undefined
						},
						didOpen: changedCells.structure.didOpen !== undefined
							? changedCells.structure.didOpen.map(cell => base.asOpenTextDocumentParams(cell.document).textDocument)
							: undefined,
						didClose: changedCells.structure.didClose !== undefined
							? changedCells.structure.didClose.map(cell => base.asCloseTextDocumentParams(cell.document).textDocument)
							: undefined
					};
				}
				if (changedCells.data !== undefined) {
					cells.data = changedCells.data.map(cell => Converter.c2p.asNotebookCell(cell, base));
				}
				if (changedCells.textContent !== undefined) {
					cells.textContent = changedCells.textContent.map(event => Converter.c2p.asTextContentChange(event, base));
				}
				if (Object.keys(cells).length > 0) {
					result.cells = cells;
				}
			}
			return result;
		}
	}
}

namespace $NotebookCell {
	type ComputeDiffReturnType = { start: number; deleteCount: number; cells?: vscode.NotebookCell[] };
	export function computeDiff(originalCells: vscode.NotebookCell[], modifiedCells: vscode.NotebookCell[], compareMetadata: boolean): ComputeDiffReturnType | undefined {
		const originalLength = originalCells.length;
		const modifiedLength = modifiedCells.length;
		let startIndex = 0;
		while(startIndex < modifiedLength && startIndex < originalLength && equals(originalCells[startIndex], modifiedCells[startIndex], compareMetadata)) {
			startIndex++;
		}
		if (startIndex < modifiedLength && startIndex < originalLength) {
			let originalEndIndex = originalLength - 1;
			let modifiedEndIndex = modifiedLength - 1;
			while (originalEndIndex >= 0 && modifiedEndIndex >= 0 && equals(originalCells[originalEndIndex], modifiedCells[modifiedEndIndex], compareMetadata)) {
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

	/**
	 * We only sync kind, document, execution and metadata to the server. So we only need to compare those.
	 */
	function equals(one: vscode.NotebookCell, other: vscode.NotebookCell, compareMetaData: boolean = true): boolean {
		if (one.kind !== other.kind || one.document.uri.toString() !== other.document.uri.toString() || one.document.languageId !== other.document.languageId ||
			!equalsExecution(one.executionSummary, other.executionSummary))
		{
			return false;
		}
		return !compareMetaData || (compareMetaData && equalsMetadata(one.metadata, other.metadata));
	}

	function equalsExecution(one: vscode.NotebookCellExecutionSummary | undefined, other: vscode.NotebookCellExecutionSummary | undefined): boolean {
		if (one === other) {
			return true;
		}
		if (one === undefined || other === undefined) {
			return false;
		}
		return one.executionOrder === other.executionOrder && one.success === other.success && equalsTiming(one.timing, other.timing);
	}

	function equalsTiming(one: { startTime: number; endTime: number } | undefined, other: { startTime: number; endTime: number } | undefined): boolean {
		if (one === other) {
			return true;
		}
		if (one === undefined || other === undefined) {
			return false;
		}
		return one.startTime === other.startTime && one.endTime === other.endTime;
	}

	function equalsMetadata(one: any, other: any | undefined): boolean {
		if (one === other) {
			return true;
		}
		if (one === null || one === undefined || other === null || other === undefined) {
			return false;
		}
		if (typeof one !== typeof other) {
			return false;
		}
		if (typeof one !== 'object') {
			return false;
		}
		const oneArray = Array.isArray(one);
		const otherArray = Array.isArray(other);
		if (oneArray !== otherArray) {
			return false;
		}

		if (oneArray && otherArray) {
			if (one.length !== other.length) {
				return false;
			}
			for (let i = 0; i < one.length; i++) {
				if (!equalsMetadata(one[i], other[i])) {
					return false;
				}
			}
		}
		if (isObjectLiteral(one) && isObjectLiteral(other)) {
			const oneKeys = Object.keys(one);
			const otherKeys = Object.keys(other);

			if (oneKeys.length !== otherKeys.length) {
				return false;
			}

			oneKeys.sort();
			otherKeys.sort();
			if (!equalsMetadata(oneKeys, otherKeys)) {
				return false;
			}
			for (let i = 0; i < oneKeys.length; i++) {
				const prop = oneKeys[i];
				if (!equalsMetadata((one as $LSPObject)[prop], (other as $LSPObject)[prop])) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	export function isObjectLiteral(value: any): value is object {
		return value !== null && typeof value === 'object';
	}
}

namespace $NotebookDocumentFilter {
	export function matchNotebook(filter: string | NotebookDocumentFilter, notebookDocument: vscode.NotebookDocument): boolean {
		if (typeof filter === 'string') {
			return filter === '*' || notebookDocument.notebookType === filter;
		}
		if (filter.notebookType !== undefined && filter.notebookType !== '*' && notebookDocument.notebookType !== filter.notebookType) {
			return false;
		}
		const uri = notebookDocument.uri;
		if (filter.scheme !== undefined && filter.scheme !== '*' && uri.scheme !== filter.scheme) {
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
	export function asDocumentSelector(options: proto.NotebookDocumentSyncOptions): proto.DocumentSelector {
		const selector = options.notebookSelector;
		const result: proto.DocumentSelector = [];
		for (const element of selector) {
			const notebookType = (typeof element.notebook === 'string' ? element.notebook : element.notebook?.notebookType) ?? '*';
			const scheme = (typeof element.notebook === 'string') ? undefined : element.notebook?.scheme;
			const pattern = (typeof element.notebook === 'string') ? undefined : element.notebook?.pattern;
			if (element.cells !== undefined) {
				for (const cell of element.cells) {
					result.push(asDocumentFilter(notebookType, scheme, pattern, cell.language));
				}
			} else {
				result.push(asDocumentFilter(notebookType, scheme, pattern, undefined));
			}
		}
		return result;
	}

	function asDocumentFilter(notebookType: string, scheme: string | undefined, pattern: string | undefined, language: string | undefined): proto.NotebookCellTextDocumentFilter {
		return scheme === undefined && pattern === undefined
			? { notebook: notebookType, language }
			: { notebook: { notebookType, scheme, pattern }, language };
	}
}

type SyncInfo = {
	/**
	 * The synced VS Code notebook cells.
	 */
	cells: vscode.NotebookCell[];

	/**
	 * A set of VS Code URIs of the synced
	 * VS Code notebook cell text documents.
	 */
	uris: Set<string>;
};

namespace SyncInfo {
	export function create(cells: vscode.NotebookCell[]): SyncInfo {
		return {
			cells,
			uris: new Set(cells.map(cell => cell.document.uri.toString()))
		};
	}
}

export type VNotebookDocumentChangeEvent = {

	/**
	 * The notebook document
	 */
	notebook: vscode.NotebookDocument;

	/**
	 * The changed meta data if any.
	 */
	metadata?: { [key: string]: any };

	/**
	 * Changes to cells.
	 */
	cells?: {

		/**
		* Changes to the cell structure to add or
		* remove cells.
		*/
		structure?: {
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
		data?: vscode.NotebookCell[];

		/**
		 * Changes to the text content of notebook cells.
		 */
		textContent?: vscode.TextDocumentChangeEvent[];
	};
};

export type NotebookDocumentOptions = {
	filterCells?(notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[]): vscode.NotebookCell[];
};

export type $NotebookDocumentOptions = {
	notebookDocumentOptions?: NotebookDocumentOptions;
};

export type NotebookDocumentMiddleware = {
	notebooks?: {
		didOpen?: (this: void, notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[], next: (this: void, notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[]) => Promise<void>) => Promise<void>;
		didSave?: (this: void, notebookDocument: vscode.NotebookDocument, next: (this: void, notebookDocument: vscode.NotebookDocument) => Promise<void>) => Promise<void>;
		didChange?: (this: void, event: VNotebookDocumentChangeEvent, next: (this: void, event: VNotebookDocumentChangeEvent) => Promise<void>) => Promise<void>;
		didClose?: (this: void, notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[], next: (this: void, notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[]) => Promise<void>) => Promise<void>;
	};
};

export interface NotebookDocumentSyncFeatureShape {
	sendDidOpenNotebookDocument(notebookDocument: vscode.NotebookDocument): Promise<void>;
	sendDidSaveNotebookDocument(notebookDocument: vscode.NotebookDocument): Promise<void>;
	sendDidChangeNotebookDocument(event: VNotebookDocumentChangeEvent): Promise<void>;
	sendDidCloseNotebookDocument(notebookDocument: vscode.NotebookDocument): Promise<void>;
}

class NotebookDocumentSyncFeatureProvider implements NotebookDocumentSyncFeatureShape {

	private readonly client: FeatureClient<NotebookDocumentMiddleware, $NotebookDocumentOptions>;
	private readonly options: proto.NotebookDocumentSyncOptions;
	private readonly notebookSyncInfo: Map<string, SyncInfo>;
	private readonly notebookDidOpen: Set<string>;
	private readonly disposables: vscode.Disposable[];
	private readonly selector: vscode.DocumentSelector;

	constructor(client: FeatureClient<NotebookDocumentMiddleware, $NotebookDocumentOptions>, options: proto.NotebookDocumentSyncOptions) {
		this.client = client;
		this.options = options;
		this.notebookSyncInfo = new Map();
		this.notebookDidOpen = new Set();
		this.disposables = [];
		this.selector = client.protocol2CodeConverter.asDocumentSelector($NotebookDocumentSyncOptions.asDocumentSelector(options));

		// open
		vscode.workspace.onDidOpenNotebookDocument((notebookDocument) => {
			this.notebookDidOpen.add(notebookDocument.uri.toString());
			this.didOpen(notebookDocument);
		}, undefined, this.disposables);
		for (const notebookDocument of vscode.workspace.notebookDocuments) {
			this.notebookDidOpen.add(notebookDocument.uri.toString());
			this.didOpen(notebookDocument);
		}

		// Notebook document changed.
		vscode.workspace.onDidChangeNotebookDocument(event => this.didChangeNotebookDocument(event), undefined, this.disposables);

		//save
		if (this.options.save === true) {
			vscode.workspace.onDidSaveNotebookDocument(notebookDocument => this.didSave(notebookDocument), undefined, this.disposables);
		}

		// close
		vscode.workspace.onDidCloseNotebookDocument((notebookDocument) => {
			this.didClose(notebookDocument);
			this.notebookDidOpen.delete(notebookDocument.uri.toString());
		}, undefined, this.disposables);
	}

	public getState(): FeatureState {
		for (const notebook of vscode.workspace.notebookDocuments) {
			const matchingCells = this.getMatchingCells(notebook);
			if (matchingCells !== undefined) {
				return { kind: 'document', id: '$internal', registrations: true, matches: true };
			}
		}
		return { kind: 'document', id: '$internal', registrations: true, matches: false };
	}

	public get mode(): 'notebook' {
		return 'notebook';
	}

	public handles(textDocument: vscode.TextDocument): boolean {
		return vscode.languages.match(this.selector, textDocument) > 0;
	}

	public didOpenNotebookCellTextDocument(notebookDocument: vscode.NotebookDocument, cell: vscode.NotebookCell): void {
		if (vscode.languages.match(this.selector, cell.document) === 0) {
			return;
		}
		if (!this.notebookDidOpen.has(notebookDocument.uri.toString())) {
			// We have never received an open notification for the notebook document.
			// VS Code guarantees that we first get cell document open and then
			// notebook open. So simply wait for the notebook open.
			return;
		}
		const syncInfo = this.notebookSyncInfo.get(notebookDocument.uri.toString());
		// In VS Code we receive a notebook open before a cell document open.
		// The document and the cell is synced.
		const cellMatches = this.cellMatches(notebookDocument, cell);
		if (syncInfo !== undefined) {
			const cellIsSynced = syncInfo.uris.has(cell.document.uri.toString());
			if ((cellMatches && cellIsSynced) || (!cellMatches && !cellIsSynced)) {
				// The cell doesn't match and was not synced or it matches and is synced.
				// In both cases nothing to do.
				//
				// Note that if the language mode of a document changes we remove the
				// cell and add it back to update the language mode on the server side.
				return;
			}
			if (cellMatches) {
				// don't use cells from above since there might be more matching cells in the notebook
				// Since we had a matching cell above we will have matching cells now.
				const matchingCells = this.getMatchingCells(notebookDocument);
				if (matchingCells !== undefined) {
					const event = this.asNotebookDocumentChangeEvent(notebookDocument, undefined, syncInfo, matchingCells);
					if (event !== undefined) {
						this.doSendChange(event, matchingCells).catch(() => { /* handled in send change */ });
					}
				}
			}
		} else {
			// No sync info. But we have a open event for the notebook document
			// itself. If the cell matches then we need to send an open with
			// exactly that cell.
			if (cellMatches) {
				this.doSendOpen(notebookDocument, [cell]).catch(() => { /* handled in open */ });
			}
		}
	}

	public didChangeNotebookCellTextDocument(notebookDocument: vscode.NotebookDocument, event: vscode.TextDocumentChangeEvent): void {
		// No match with the selector
		if (vscode.languages.match(this.selector, event.document) === 0) {
			return;
		}
		this.doSendChange({
			notebook: notebookDocument,
			cells: { textContent: [event] }
		}, undefined).catch(() => { /* error handled in doSendChange */ });
	}

	public didCloseNotebookCellTextDocument(notebookDocument: vscode.NotebookDocument, cell: vscode.NotebookCell): void {
		const syncInfo = this.notebookSyncInfo.get(notebookDocument.uri.toString());
		if (syncInfo === undefined) {
			// The notebook document got never synced. So it doesn't matter if a cell
			// document closes.
			return;
		}
		const cellUri = cell.document.uri;
		const index = syncInfo.cells.findIndex((item) => item.document.uri.toString() === cellUri.toString());
		if (index === -1) {
			// The cell never got synced or it got deleted and we now received the document
			// close event.
			return;
		}
		if (index === 0 && syncInfo.cells.length === 1) {
			// The last cell. Close the notebook document in the server.
			this.doSendClose(notebookDocument, syncInfo.cells).catch(() => { /* error handled in doSendClose */ });
		} else {
			const newCells = syncInfo.cells.slice();
			const deleted = newCells.splice(index, 1);
			this.doSendChange({
				notebook: notebookDocument,
				cells: {
					structure: {
						array: { start: index, deleteCount: 1 },
						didClose: deleted
					}
				}
			}, newCells).catch(() => { /* error handled in doSendChange */ });
		}
	}

	public dispose(): void {
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
	}

	private didOpen(notebookDocument: vscode.NotebookDocument, matchingCells: vscode.NotebookCell[] | undefined = this.getMatchingCells(notebookDocument), syncInfo: SyncInfo | undefined = this.notebookSyncInfo.get(notebookDocument.uri.toString())): void {
		if (syncInfo !== undefined) {
			if (matchingCells !== undefined) {
				const event = this.asNotebookDocumentChangeEvent(notebookDocument, undefined, syncInfo, matchingCells);
				if (event !== undefined) {
					this.doSendChange(event, matchingCells).catch(() => { /* handled in send change */ });
				}
			} else {
				this.doSendClose(notebookDocument, []).catch(() => { /* handled in send close */} );
			}
		} else {
			// Check if we need to sync the notebook document.
			if (matchingCells === undefined) {
				return;
			}

			this.doSendOpen(notebookDocument, matchingCells).catch(() => { /* error handled in doSendOpen */ });
		}
	}

	private didChangeNotebookDocument(event: vscode.NotebookDocumentChangeEvent): void {
		const notebookDocument = event.notebook;
		const syncInfo = this.notebookSyncInfo.get(notebookDocument.uri.toString());
		if (syncInfo === undefined) {
			// We have no changes to the cells. Since the notebook wasn't synced
			// it will not be synced now.
			if (event.contentChanges.length === 0) {
				return;
			}

			// Check if we have new matching cells.
			const cells = this.getMatchingCells(notebookDocument);

			// No matching cells and the notebook never synced. So still no need
			// to sync it.
			if (cells === undefined) {
				return;
			}

			// Open the notebook document and ignore the rest of the changes
			// this the notebooks will be synced with the correct settings.
			this.didOpen(notebookDocument, cells, syncInfo);
		} else {
			// The notebook is synced. First check if we have no matching
			// cells anymore and if so close the notebook
			const cells = this.getMatchingCells(notebookDocument);
			if (cells === undefined) {
				this.didClose(notebookDocument, syncInfo);
				return;
			}
			const newEvent = this.asNotebookDocumentChangeEvent(event.notebook, event, syncInfo, cells);
			if (newEvent !== undefined) {
				this.doSendChange(newEvent, cells).catch(() => { /* error handled in doSendChange */ });
			}
		}
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
	}

	public async sendDidOpenNotebookDocument(notebookDocument: vscode.NotebookDocument): Promise<void> {
		const cells = this.getMatchingCells(notebookDocument);
		if (cells === undefined) {
			return;
		}
		return this.doSendOpen(notebookDocument, cells);
	}

	private async doSendOpen(notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[]): Promise<void> {
		const send = async (notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[]): Promise<void> => {
			const nb = Converter.c2p.asNotebookDocument(notebookDocument, cells, this.client.code2ProtocolConverter);
			const cellDocuments: TextDocumentItem[] = cells.map(cell => this.client.code2ProtocolConverter.asTextDocumentItem(cell.document));
			try {
				await this.client.sendNotification(proto.DidOpenNotebookDocumentNotification.type, {
					notebookDocument: nb,
					cellTextDocuments: cellDocuments
				});
			} catch (error) {
				this.client.error('Sending DidOpenNotebookDocumentNotification failed', error);
				throw error;
			}
		};
		const middleware = this.client.middleware?.notebooks;
		this.notebookSyncInfo.set(notebookDocument.uri.toString(), SyncInfo.create(cells));
		return middleware?.didOpen !== undefined ? middleware.didOpen(notebookDocument, cells, send) : send(notebookDocument, cells);
	}

	public async sendDidChangeNotebookDocument(event: VNotebookDocumentChangeEvent): Promise<void> {
		return this.doSendChange(event, undefined);
	}

	private async doSendChange(event: VNotebookDocumentChangeEvent, cells: vscode.NotebookCell[] | undefined = this.getMatchingCells(event.notebook)): Promise<void> {
		const send = async (event: VNotebookDocumentChangeEvent): Promise<void> => {
			try {
				await this.client.sendNotification(proto.DidChangeNotebookDocumentNotification.type, {
					notebookDocument: Converter.c2p.asVersionedNotebookDocumentIdentifier(event.notebook, this.client.code2ProtocolConverter),
					change: Converter.c2p.asNotebookDocumentChangeEvent(event, this.client.code2ProtocolConverter)
				});
			} catch (error) {
				this.client.error('Sending DidChangeNotebookDocumentNotification failed', error);
				throw error;
			}
		};
		const middleware = this.client.middleware?.notebooks;
		if (event.cells?.structure !== undefined) {
			this.notebookSyncInfo.set(event.notebook.uri.toString(), SyncInfo.create(cells ?? []));
		}
		return middleware?.didChange !== undefined ? middleware?.didChange(event, send) : send(event);
	}

	public async sendDidSaveNotebookDocument(notebookDocument: vscode.NotebookDocument): Promise<void> {
		return this.doSendSave(notebookDocument);
	}

	private async doSendSave(notebookDocument: vscode.NotebookDocument): Promise<void> {
		const send = async (notebookDocument: vscode.NotebookDocument): Promise<void> => {
			try {
				await this.client.sendNotification(proto.DidSaveNotebookDocumentNotification.type, {
					notebookDocument: { uri: this.client.code2ProtocolConverter.asUri(notebookDocument.uri) }
				});
			} catch (error) {
				this.client.error('Sending DidSaveNotebookDocumentNotification failed', error);
				throw error;
			}
		};
		const middleware = this.client.middleware?.notebooks;
		return middleware?.didSave !== undefined ? middleware.didSave(notebookDocument, send) : send(notebookDocument);
	}

	public async sendDidCloseNotebookDocument(notebookDocument: vscode.NotebookDocument): Promise<void> {
		return this.doSendClose(notebookDocument, this.getMatchingCells(notebookDocument) ?? []);
	}

	private async doSendClose(notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[]): Promise<void> {
		const send = async (notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[]): Promise<void> => {
			try {
				await this.client.sendNotification(proto.DidCloseNotebookDocumentNotification.type,  {
					notebookDocument: { uri: this.client.code2ProtocolConverter.asUri(notebookDocument.uri) },
					cellTextDocuments: cells.map(cell => this.client.code2ProtocolConverter.asTextDocumentIdentifier(cell.document))
				});
			} catch (error) {
				this.client.error('Sending DidCloseNotebookDocumentNotification failed', error);
				throw error;
			}
		};
		const middleware = this.client.middleware?.notebooks;
		this.notebookSyncInfo.delete(notebookDocument.uri.toString());
		return middleware?.didClose !== undefined ? middleware.didClose(notebookDocument, cells, send) : send(notebookDocument, cells);
	}

	private asNotebookDocumentChangeEvent(notebook: vscode.NotebookDocument, event: vscode.NotebookDocumentChangeEvent | undefined, syncInfo: SyncInfo, matchingCells: vscode.NotebookCell[]): VNotebookDocumentChangeEvent | undefined {
		if (event !== undefined && event.notebook !== notebook) {
			throw new Error('Notebook must be identical');
		}
		const result: VNotebookDocumentChangeEvent = {
			notebook: notebook
		};

		if (event?.metadata !== undefined) {
			result.metadata = Converter.c2p.asMetadata(event.metadata);
		}

		let matchingCellsSet: Set<string> | undefined;
		if (event?.cellChanges !== undefined && event.cellChanges.length > 0) {
			const data: vscode.NotebookCell[] = [];
			// Only consider the new matching cells.
			matchingCellsSet = new Set(matchingCells.map(cell => cell.document.uri.toString()));
			for (const cellChange of event.cellChanges) {
				if (matchingCellsSet.has(cellChange.cell.document.uri.toString()) && (cellChange.executionSummary !== undefined || cellChange.metadata !== undefined)) {
					data.push(cellChange.cell);
				}
			}
			if (data.length > 0) {
				result.cells = result.cells ?? {};
				result.cells.data = data;
			}
		}

		if (((event?.contentChanges !== undefined && event.contentChanges.length > 0) || event === undefined) && syncInfo !== undefined && matchingCells !== undefined) {
			// We still have matching cells. Check if the cell changes
			// affect the notebook on the server side.
			const oldCells = syncInfo.cells;
			const newCells = matchingCells;

			// meta data changes are reported using on the cell itself. So we can ignore comparing
			// it which has a positive effect on performance.
			const diff = $NotebookCell.computeDiff(oldCells, newCells, false);
			let addedCells: Map<string, vscode.NotebookCell> | undefined;
			let removedCells: Map<string, vscode.NotebookCell> | undefined;
			if (diff !== undefined) {
				addedCells = diff.cells === undefined
					? new Map()
					: new Map(diff.cells.map(cell => [cell.document.uri.toString(), cell]));
				removedCells = diff.deleteCount === 0
					? new Map()
					: new Map(oldCells.slice(diff.start, diff.start + diff.deleteCount).map(cell => [cell.document.uri.toString(), cell]));

				// Remove the onces that got deleted and inserted again.
				for (const key of Array.from(removedCells.keys())) {
					if (addedCells.has(key)) {
						removedCells.delete(key);
						addedCells.delete(key);
					}
				}
				result.cells = result.cells ?? {};
				type structure = Required<Required<Required<VNotebookDocumentChangeEvent>['cells']>['structure']>;
				const didOpen: structure['didOpen'] = [];
				const didClose: structure['didClose'] = [];
				if (addedCells.size > 0 || removedCells.size > 0) {
					for (const cell of addedCells.values()) {
						didOpen.push(cell);
					}
					for (const cell of removedCells.values()) {
						didClose.push(cell);
					}
				}
				result.cells.structure = {
					array: diff,
					didOpen,
					didClose
				};
			}
		}
		// The notebook is a property as well.
		return Object.keys(result).length > 1 ? result : undefined;
	}

	private getMatchingCells(notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[] = notebookDocument.getCells()): vscode.NotebookCell[] | undefined {
		if (this.options.notebookSelector === undefined) {
			return undefined;
		}
		for (const item of this.options.notebookSelector) {
			if (item.notebook === undefined || $NotebookDocumentFilter.matchNotebook(item.notebook, notebookDocument)) {
				const filtered = this.filterCells(notebookDocument, cells, item.cells);
				return filtered.length === 0 ? undefined : filtered;
			}
		}
		return undefined;
	}

	private cellMatches(notebookDocument: vscode.NotebookDocument, cell: vscode.NotebookCell) {
		const cells = this.getMatchingCells(notebookDocument, [cell]);
		return cells !== undefined && cells[0] === cell;
	}

	private filterCells(notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[], cellSelector: undefined | { language: string }[]): vscode.NotebookCell[] {
		const filtered = cellSelector !== undefined ? cells.filter((cell) => {
			const cellLanguage = cell.document.languageId;
			return cellSelector.some((filter => (filter.language === '*' || cellLanguage === filter.language)));
		}) : cells;
		return typeof this.client.clientOptions.notebookDocumentOptions?.filterCells === 'function'
			? this.client.clientOptions.notebookDocumentOptions.filterCells(notebookDocument, filtered)
			: filtered;

	}
}

export type $NotebookCellTextDocumentFilter = NotebookCellTextDocumentFilter & { sync: true };

export type NotebookDocumentProviderShape = {
	getProvider(notebookCell: vscode.NotebookCell): NotebookDocumentSyncFeatureShape |undefined;
};

export class NotebookDocumentSyncFeature implements DynamicFeature<proto.NotebookDocumentSyncRegistrationOptions>, NotebookDocumentProviderShape {

	public static readonly CellScheme: string = 'vscode-notebook-cell';

	private readonly client: FeatureClient<NotebookDocumentMiddleware, $NotebookDocumentOptions>;
	private readonly registrations: Map<string, NotebookDocumentSyncFeatureProvider>;
	private dedicatedChannel: vscode.DocumentSelector | undefined;

	constructor(client: FeatureClient<NotebookDocumentMiddleware, $NotebookDocumentOptions>) {
		this.client = client;
		this.registrations = new Map();
		this.registrationType = proto.NotebookDocumentSyncRegistrationType.type;
		// We don't receive an event for cells where the document changes its language mode
		// Since we allow servers to filter on the language mode we fire such an event ourselves.
		vscode.workspace.onDidOpenTextDocument((textDocument) => {
			if (textDocument.uri.scheme !== NotebookDocumentSyncFeature.CellScheme) {
				return;
			}
			const [notebookDocument, notebookCell] = this.findNotebookDocumentAndCell(textDocument);
			if (notebookDocument === undefined || notebookCell === undefined) {
				return;
			}
			for (const provider of this.registrations.values()) {
				if (provider instanceof NotebookDocumentSyncFeatureProvider) {
					provider.didOpenNotebookCellTextDocument(notebookDocument, notebookCell);
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
			const [notebookDocument, ] = this.findNotebookDocumentAndCell(textDocument);
			if (notebookDocument === undefined) {
				return;
			}
			for (const provider of this.registrations.values()) {
				if (provider instanceof NotebookDocumentSyncFeatureProvider) {
					provider.didChangeNotebookCellTextDocument(notebookDocument, event);
				}
			}
		});
		vscode.workspace.onDidCloseTextDocument((textDocument) => {
			if (textDocument.uri.scheme !== NotebookDocumentSyncFeature.CellScheme) {
				return;
			}
			// There are two cases when we receive a close for a text document
			// 1: the cell got removed. This is handled in `onDidChangeNotebookCells`
			// 2: the language mode of a cell changed. This keeps the URI stable so
			//    we will still find the cell and the notebook document.
			const [notebookDocument, notebookCell] = this.findNotebookDocumentAndCell(textDocument);
			if (notebookDocument === undefined || notebookCell === undefined) {
				return;
			}
			for (const provider of this.registrations.values()) {
				if (provider instanceof NotebookDocumentSyncFeatureProvider) {
					provider.didCloseNotebookCellTextDocument(notebookDocument, notebookCell);
				}
			}

		});
	}

	getState(): FeatureState {
		if (this.registrations.size === 0) {
			return { kind: 'document', id: this.registrationType.method, registrations: false, matches: false };
		}
		for (const provider of this.registrations.values()) {
			const state = provider.getState();
			if (state.kind === 'document' && state.registrations === true && state.matches === true) {
				return { kind: 'document', id: this.registrationType.method, registrations: true, matches: true };
			}
		}
		return { kind: 'document', id: this.registrationType.method, registrations: true, matches: false };
	}

	public readonly registrationType: proto.RegistrationType<proto.NotebookDocumentSyncRegistrationOptions>;

	public fillClientCapabilities(capabilities: proto.ClientCapabilities): void {
		const synchronization = ensure(ensure(capabilities, 'notebookDocument')!, 'synchronization')!;
		synchronization.dynamicRegistration = true;
		synchronization.executionSummarySupport = true;
	}

	public preInitialize(capabilities: proto.ServerCapabilities<any>): void {
		const options = capabilities.notebookDocumentSync;
		if (options === undefined) {
			return;
		}
		this.dedicatedChannel = this.client.protocol2CodeConverter.asDocumentSelector($NotebookDocumentSyncOptions.asDocumentSelector(options));
	}

	public initialize(capabilities: proto.ServerCapabilities<any>): void {
		const options = capabilities.notebookDocumentSync;
		if (options === undefined) {
			return;
		}
		const id = (options as StaticRegistrationOptions).id ?? UUID.generateUuid();
		this.register({ id, registerOptions: options });
	}

	public register(data: RegistrationData<proto.NotebookDocumentSyncRegistrationOptions>): void {
		const provider = new NotebookDocumentSyncFeatureProvider(this.client, data.registerOptions);
		this.registrations.set(data.id, provider);
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

	public handles(textDocument: vscode.TextDocument): boolean {
		if (textDocument.uri.scheme !== NotebookDocumentSyncFeature.CellScheme) {
			return false;
		}
		if (this.dedicatedChannel !== undefined && vscode.languages.match(this.dedicatedChannel, textDocument) > 0) {
			return true;
		}
		for (const provider of this.registrations.values()) {
			if (provider.handles(textDocument)) {
				return true;
			}
		}
		return false;
	}

	public getProvider(notebookCell: vscode.NotebookCell): NotebookDocumentSyncFeatureShape | undefined {
		for (const provider of this.registrations.values()) {
			if (provider.handles(notebookCell.document)) {
				return provider;
			}
		}
		return undefined;
	}

	private findNotebookDocumentAndCell(textDocument: vscode.TextDocument): [vscode.NotebookDocument | undefined, vscode.NotebookCell | undefined] {
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
}