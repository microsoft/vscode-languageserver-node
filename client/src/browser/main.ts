/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { BaseLanguageClient, LanguageClientOptions, MessageTransports } from '../common/api';

import { BrowserMessageReader, BrowserMessageWriter } from 'vscode-languageserver-protocol/browser';

export * from 'vscode-languageserver-protocol/browser';
export * from '../common/api';

export type ServerOptions = Worker | (() => Promise<Worker | MessageTransports>);

export class LanguageClient extends BaseLanguageClient {

	private readonly serverOptions: ServerOptions;

	constructor(id: string, name: string, serverOptions: ServerOptions, clientOptions: LanguageClientOptions) {
		super(id, name, clientOptions);
		this.serverOptions = serverOptions;
	}

	protected async createMessageTransports(_encoding: string): Promise<MessageTransports> {
		if (typeof this.serverOptions === 'function') {
			const result = await this.serverOptions();
			if (result instanceof Worker) {
				return this.createMessageTransportsFromWorker(result);
			} else {
				return result;
			}
		} else {
			return this.createMessageTransportsFromWorker(this.serverOptions);
		}
	}

	private createMessageTransportsFromWorker(worker: Worker): Promise<MessageTransports> {
		const reader = new BrowserMessageReader(worker);
		const writer = new BrowserMessageWriter(worker);
		return Promise.resolve({ reader, writer });
	}
}