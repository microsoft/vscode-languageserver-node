/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { BaseLanguageClient, LanguageClientOptions, MessageTransports } from '../common/api';

import { JshostMessageReader, JshostMessageWriter } from 'vscode-languageserver-protocol/jshost';
import { MessageChannel } from 'vscode-languageserver-protocol/jshost';

export * from 'vscode-languageserver-protocol/jshost';
export * from '../common/api';

export class LanguageClient extends BaseLanguageClient {
	private readonly messageChannel: MessageChannel;

	constructor(id: string, name: string, clientOptions: LanguageClientOptions, messageChannel: MessageChannel) {
		super(id, name, clientOptions);
		this.messageChannel = messageChannel;
	}

	protected createMessageTransports(_encoding: string): Promise<MessageTransports> {
		const reader = new JshostMessageReader(this.messageChannel.port1);
		const writer = new JshostMessageWriter(this.messageChannel.port2);
		return Promise.resolve({ reader, writer });
	}

	protected getLocale(): string {
		// ToDo: need to find a way to let the locale
		// travel to the worker extension host.
		return 'en';
	}
}