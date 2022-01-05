/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
/// <reference path="../../typings/vscode.proposed.notebookEditor.d.ts" />

import * as vscode from 'vscode';
import * as minimatch from 'minimatch';

import * as proto from 'vscode-languageserver-protocol';
import { StaticRegistrationOptions } from 'vscode-languageserver-protocol';

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
		function asNotebookCells(cells: vscode.NotebookCell[], base: _c2p.Converter): proto.Proposed.NotebookCell[] {
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

class NotebookDocumentSyncFeatureProvider {

	private readonly client: BaseLanguageClient;
	private readonly options: proto.Proposed.NotebookDocumentOptions;
	private readonly synced: Map<string, proto.Proposed.NotebookDocument>;
	private readonly disposables: vscode.Disposable[];


	constructor(client: BaseLanguageClient, options: proto.Proposed.NotebookDocumentOptions) {
		this.client = client;
		this.options = options;
		this.synced = new Map();
		this.disposables = [];
		vscode.workspace.onDidOpenNotebookDocument(this.didOpen, this, this.disposables);
		vscode.workspace.onDidCloseNotebookDocument(this.didClose, this, this.disposables);
		vscode.notebooks.onDidChangeNotebookCells(this.cellsChanged, this, this.disposables);
	}

	private didOpen(notebookDocument: vscode.NotebookDocument, optionalCells: vscode.NotebookCell[] | null = null): void {
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
		this.synced.set(notebookDocument.uri.toString(), nb);
	}

	private cellsChanged(event: vscode.NotebookCellsChangeEvent): void {
		const notebookDocument = event.document;
		const syncedNotebookDocument = this.synced.get(notebookDocument.uri.toString());
		if (syncedNotebookDocument === undefined) {
			// The notebook has not been synced. Could be it never matched or some
			// cells didn't match. So check if it would match now.
			const cells = this.getMatchingCells(notebookDocument);
			if (cells === undefined) {
				return;
			}
			this.didOpen(notebookDocument, cells);
		} else {
			// It is synced. Could be no cells match anymore. If this is the
			// case we close the notebook document. Otherwise we send a change event.
			const cells = this.getMatchingCells(notebookDocument);
			if (cells === undefined) {
				this.didClose(notebookDocument);
			}
			
		}
	}

	private didClose(notebookDocument: vscode.NotebookDocument): void {
		if (!this.synced.has(notebookDocument.uri.toString())) {
			return;
		}
		this.client.sendNotification(proto.Proposed.DidCloseNotebookDocumentNotification.type,  {
			notebookDocument: { uri: this.client.code2ProtocolConverter.asUri(notebookDocument.uri) }
		}).catch((error) => {
			this.client.error('Sending DidCloseNotebookDocumentNotification failed', error);
		});
		this.synced.delete(notebookDocument.uri.toString());
	}

	private getMatchingCells(notebookDocument: vscode.NotebookDocument): vscode.NotebookCell[] | undefined {
		if (this.options.notebookSelector === undefined) {
			if (this.options.cellSelector === undefined) {
				return undefined;
			}
			const cells = this.filterCells(notebookDocument, this.options.cellSelector);
			return cells.length === 0 ? undefined : cells;
		} else if (this.matchNotebook(notebookDocument, this.options.notebookSelector)) {
			return this.options.cellSelector === undefined ? notebookDocument.getCells() : this.filterCells(notebookDocument, this.options.cellSelector);
		} else {
			return undefined;
		}
	}

	private matchNotebook(notebookDocument: vscode.NotebookDocument, selector: proto.Proposed.NotebookDocumentFilter[]): boolean {
		for (const filter of selector) {
			if (filter.notebookType !== undefined && notebookDocument.notebookType !== filter.notebookType) {
				continue;
			}
			const uri = notebookDocument.uri;
			if (filter.scheme !== undefined && uri.scheme !== filter.scheme) {
				continue;
			}
			if (filter.pattern !== undefined) {
				const matcher = new minimatch.Minimatch(filter.pattern, { noext: true });
				if (!matcher.makeRe()) {
					continue;
				}
				if (matcher.match(uri.fsPath)) {
					return true;
				}
			}
		}
		return false;
	}

	private filterCells(notebookDocument: vscode.NotebookDocument, cellSelector: vscode.DocumentFilter[]): vscode.NotebookCell[] {
		return notebookDocument.getCells().filter((cell) => {
			return vscode.languages.match(cellSelector, cell.document);
		});
	}
}

export class NotebookDocumentSyncFeature implements DynamicFeature<proto.Proposed.NotebookDocumentRegistrationOptions> {
	constructor() {
		this.registrationType = proto.Proposed.NotebookDocumentSyncRegistrationType.type;
	}

	readonly registrationType: proto.RegistrationType<NotebookDocumentRegistrationOptions>;

	fillClientCapabilities(capabilities: proto.ClientCapabilities & proto.Proposed.$NotebookDocumentClientCapabilities): void {
		const synchronization = ensure(ensure(capabilities, 'notebookDocument')!, 'synchronization')!;
		synchronization.dynamicRegistration = true;

	}

	initialize(capabilities: proto.ServerCapabilities<any> & proto.Proposed.$NotebookDocumentServerCapabilities): void {
		const options = capabilities.notebookDocumentSync;
		if (options === undefined) {
			return;
		}
		const id = (options as StaticRegistrationOptions).id ?? UUID.generateUuid();
		this.register({ id, registerOptions: options});
	}

	register(data: RegistrationData<NotebookDocumentRegistrationOptions>): void {
		throw new Error('Method not implemented.');
	}

	unregister(id: string): void {
		throw new Error('Method not implemented.');
	}

	dispose(): void {
		throw new Error('Method not implemented.');
	}
}