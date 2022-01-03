/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as vscode from 'vscode';

import * as proto from 'vscode-languageserver-protocol';
import { StaticRegistrationOptions } from 'vscode-languageserver-protocol';
import { NotebookDocumentRegistrationOptions } from 'vscode-languageserver-protocol/src/common/proposed.notebooks';

import * as UUID from './utils/uuid';
import { DynamicFeature, BaseLanguageClient, RegistrationData } from './client';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

class NotebookDocumentSyncFeatureProvider {

	private readonly options: proto.Proposed.NotebookDocumentOptions;
	private readonly synced: Set<string>;
	private readonly disposables: vscode.Disposable[];


	constructor(options: proto.Proposed.NotebookDocumentOptions) {
		this.options = options;
		this.synced = new Set();
		this.disposables = [];
		vscode.workspace.onDidOpenNotebookDocument(this.didOpen, this, this.disposables);
		vscode.workspace.onDidCloseNotebookDocument(this.didClose, this, this.disposables);
	}

	private didOpen(notebookDocument: vscode.NotebookDocument): void {

	}

	private didClose(notebookDocument: vscode.NotebookDocument): void {
		if (!this.synced.has(notebookDocument.uri.toString())) {
			return;
		}
		this.synced.delete(notebookDocument.uri.toString());
	}

	private matches(notebookDocument: vscode.NotebookDocument): boolean {
		if (this.options.notebookSelector === 'onlyIfCellsMatch') {

		}
	}

	private getMatchingCells(notebookDocument: vscode.NotebookDocument): vscode.NotebookCell[] {
		if (this.options.cellSelector === undefined) {
			return [];
		}
		const selector = this.options.cellSelector;
		return notebookDocument.getCells().filter((cell) => {
			return vscode.languages.match(selector, cell.document);
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