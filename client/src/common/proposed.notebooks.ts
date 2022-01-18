/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="../../typings/vscode.proposed.notebookEditor.d.ts" />

import * as vscode from 'vscode';
import * as minimatch from 'minimatch';

import * as proto from 'vscode-languageserver-protocol';
import { StaticRegistrationOptions, NotebookDocumentFilter } from 'vscode-languageserver-protocol';

import { DynamicFeature, BaseLanguageClient, RegistrationData,  } from './client';
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
		export function asNotebookDocument(notebookDocument: vscode.NotebookDocument, cells: vscode.NotebookCell[], base: _c2p.Converter): proto.Proposed.NotebookDocument {
			return proto.Proposed.NotebookDocument.create(base.asUri(notebookDocument.uri), notebookDocument.notebookType, notebookDocument.version, asNotebookCells(cells, base));
		}
		export function asNotebookCells(cells: vscode.NotebookCell[], base: _c2p.Converter): proto.Proposed.NotebookCell[] {
			return cells.map(cell => asNotebookCell(cell, base));
		}
		function asNotebookCell(cell: vscode.NotebookCell, base: _c2p.Converter): proto.Proposed.NotebookCell {
			return proto.Proposed.NotebookCell.create(asNotebookCellKind(cell.kind), base.asUri(cell.document.uri));
		}
		function asNotebookCellKind(kind: vscode.NotebookCellKind): proto.Proposed.NotebookCellKind {
			switch (kind) {
				case vscode.NotebookCellKind.Markup:
					return proto.Proposed.NotebookCellKind.Markup;
				case vscode.NotebookCellKind.Code:
					return proto.Proposed.NotebookCellKind.Code;
			}
		}
	}
}

namespace NotebookCell {
	export function computeDiff(originalCells: proto.Proposed.NotebookCell[], modifiedCells: proto.Proposed.NotebookCell[]): proto.Proposed.NotebookCellChange | undefined {
		const originalLength = originalCells.length;
		const modifiedLength = modifiedCells.length;
		let startIndex = 0;
		while(startIndex < modifiedLength && startIndex < originalLength && proto.Proposed.NotebookCell.equal(originalCells[startIndex], modifiedCells[startIndex])) {
			startIndex++;
		}
		if (startIndex < modifiedLength && startIndex < originalLength) {
			let originalEndIndex = originalLength - 1;
			let modifiedEndIndex = modifiedLength - 1;
			while (originalEndIndex >= startIndex && modifiedEndIndex >= startIndex && proto.Proposed.NotebookCell.equal(originalCells[originalEndIndex], modifiedCells[modifiedEndIndex])) {
				originalEndIndex--;
				modifiedEndIndex--;
			}
			// if one moved behind the start index move them forward again
			if (originalEndIndex < startIndex || modifiedEndIndex < startIndex) {
				originalEndIndex++;
				modifiedEndIndex++;
			}

			const deleteCount = originalEndIndex - startIndex + 1;
			const newCells = modifiedCells.slice(startIndex, modifiedEndIndex + 1);
			// If we moved behind the start index we could have missed a simple delete.
			if (newCells.length === 1 && newCells[0] === originalCells[originalEndIndex]) {
				return { start: startIndex, deleteCount: deleteCount - 1 };
			} else {
				return { start: startIndex, deleteCount, cells: newCells };
			}
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

type SyncInfo = {
	cells: proto.Proposed.NotebookCell[];
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

class NotebookDocumentSyncFeatureProvider {

	private readonly client: BaseLanguageClient;
	private readonly options: proto.Proposed.NotebookDocumentSyncOptions;
	private readonly notebookSyncInfo: Map<string, SyncInfo>;
	private readonly notebookDidOpen: Set<string>;
	private readonly disposables: vscode.Disposable[];

	constructor(client: BaseLanguageClient, options: proto.Proposed.NotebookDocumentSyncOptions) {
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

		// change
		vscode.notebooks.onDidChangeNotebookCells(event => this.cellsChanged(event.document), undefined, this.disposables);

		//save
		vscode.notebooks.onDidSaveNotebookDocument(notebookDocument => this.didSave(notebookDocument), undefined, this.disposables);

		// close
		vscode.workspace.onDidCloseNotebookDocument((notebookDocument) => {
			this.didClose(notebookDocument);
			this.notebookDidOpen.delete(notebookDocument.uri.toString());
		}, undefined, this.disposables);
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
				// Cell matches and is syned.
				return;
			}
			this.cellsChanged(notebookDocument, syncInfo);
		} else {
			// No sync info
			if (!cellMatches) {
				// Cell doesn't match. Everything OK
				return;
			}
			this.cellsChanged(notebookDocument, syncInfo);
		}
	}

	public dispose(): void {
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
	}

	private didOpen(notebookDocument: vscode.NotebookDocument, optionalCells: vscode.NotebookCell[] | null = null, syncInfo: SyncInfo | undefined = this.notebookSyncInfo.get(notebookDocument.uri.toString())): void {
		if (syncInfo !== undefined) {
			// The notebook document got synced because a cell document got opened.
			this.cellsChanged(notebookDocument, syncInfo);
		} else {
			// Check if we need to sync the notebook document.
			const cells = optionalCells ?? this.getMatchingCells(notebookDocument);
			if (cells === undefined) {
				return;
			}
			const nb = Converter.c2p.asNotebookDocument(notebookDocument, cells, this.client.code2ProtocolConverter);
			this.client.sendNotification(proto.Proposed.DidOpenNotebookDocumentNotification.type, {
				notebookDocument:nb
			}).catch((error) => {
				this.client.error('Sending DidOpenNotebookDocumentNotification failed', error);
			});
			this.notebookSyncInfo.set(notebookDocument.uri.toString(), SyncInfo.create(nb.cells, cells) );
		}
	}

	private cellsChanged(notebookDocument: vscode.NotebookDocument, syncInfo: SyncInfo | undefined = this.notebookSyncInfo.get(notebookDocument.uri.toString())): void {
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
			const modifiedCells = Converter.c2p.asNotebookCells(cells, this.client.code2ProtocolConverter);
			const diff = NotebookCell.computeDiff(syncInfo.cells, modifiedCells);
			if (diff === undefined) {
				return;
			}
			this.client.sendNotification(proto.Proposed.DidChangeNotebookDocumentNotification.type, {
				notebookDocument: {
					version: notebookDocument.version,
					uri: this.client.code2ProtocolConverter.asUri(notebookDocument.uri)
				},
				changes: [
					{ cells: diff }
				]
			}).catch((error) => {
				this.client.error('Sending DidChangeNotebookDocumentNotification failed', error);
			});
			this.notebookSyncInfo.set(notebookDocument.uri.toString(), SyncInfo.create(modifiedCells, cells));
		}
	}

	private didSave(notebookDocument: vscode.NotebookDocument): void {
		const syncInfo = this.notebookSyncInfo.get(notebookDocument.uri.toString());
		if (syncInfo === undefined) {
			return;
		}
		this.client.sendNotification(proto.Proposed.DidSaveNotebookDocumentNotification.type, {
			notebookDocument: { uri: this.client.code2ProtocolConverter.asUri(notebookDocument.uri) }
		}).catch((error) => {
			this.client.error('Sending DidSaveNotebookDocumentNotification failed', error);
		});
	}

	private didClose(notebookDocument: vscode.NotebookDocument, syncInfo: SyncInfo | undefined = this.notebookSyncInfo.get(notebookDocument.uri.toString())): void {
		if (syncInfo === undefined) {
			return;
		}
		this.client.sendNotification(proto.Proposed.DidCloseNotebookDocumentNotification.type,  {
			notebookDocument: { uri: this.client.code2ProtocolConverter.asUri(notebookDocument.uri) }
		}).catch((error) => {
			this.client.error('Sending DidCloseNotebookDocumentNotification failed', error);
		});
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
			} else if (this.matchNotebook(notebookDocument, item.notebookDocumentFilter)){
				return item.cellSelector === undefined ? cells : this.filterCells(cells, item.cellSelector);
			}
		}
		return undefined;
	}

	private matchNotebook(notebookDocument: vscode.NotebookDocument, filter: NotebookDocumentFilter): boolean {
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

	private filterCells(cells: vscode.NotebookCell[], cellSelector: { language: string }[]): vscode.NotebookCell[] {
		return cells.filter((cell) => {
			const cellLanguage = cell.document.languageId;
			return cellSelector.some((filter => cellLanguage === filter.language));
		});
	}
}

export class NotebookDocumentSyncFeature implements DynamicFeature<proto.Proposed.NotebookDocumentSyncRegistrationOptions> {

	public static readonly CellScheme: string = 'vscode-notebook-cell';

	private readonly client: BaseLanguageClient;
	private readonly registrations: Map<string, NotebookDocumentSyncFeatureProvider>;

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
				provider.didOpenNotebookCellDocument(notebookDocument, notebookCell);
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
}