/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { BaseLanguageClient, LanguageClientOptions, MessageTransports } from '../common/api';

import { BrowserMessageReader, BrowserMessageWriter } from 'vscode-languageserver-protocol/browser';

export * from 'vscode-languageserver-protocol/browser';
export * from '../common/api';

export class LanguageClient extends BaseLanguageClient {
	private readonly worker: Worker;

	constructor(id: string, name: string, clientOptions: LanguageClientOptions, worker: Worker) {
		super(id, name, clientOptions);
		this.worker = worker;
	}

	protected createMessageTransports(_encoding: string): Promise<MessageTransports> {
		const reader = new BrowserMessageReader(this.worker);
		const writer = new BrowserMessageWriter(this.worker);
		return Promise.resolve({ reader, writer });
	}
}