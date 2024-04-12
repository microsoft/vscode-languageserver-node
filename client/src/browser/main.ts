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

	private readonly options: ServerOptions;

	constructor(id: string, name: string, clientOptions: LanguageClientOptions, options: ServerOptions) {
		super(id, name, clientOptions);
		this.options = options;
	}

	protected async createMessageTransports(_encoding: string): Promise<MessageTransports> {
		if (typeof this.options === 'function') {
			const result = await this.options();
			if (result instanceof Worker) {
				return this.createMessageTransportsFromWorker(result);
			} else {
				return result;
			}
		} else {
			return this.createMessageTransportsFromWorker(this.options);
		}
	}

	private createMessageTransportsFromWorker(worker: Worker): Promise<MessageTransports> {
		const reader = new BrowserMessageReader(worker);
		const writer = new BrowserMessageWriter(worker);
		return Promise.resolve({ reader, writer });
	}
}