/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import RIL from './ril';

// Install the jshost runtime abstract.
RIL.install();

import {
	AbstractMessageReader, DataCallback, AbstractMessageWriter, Message, Disposable, Emitter, NullLogger, ConnectionStrategy, ConnectionOptions,
	createMessageConnection as _createMessageConnection, MessageReader, MessageWriter, Logger, MessageConnection
} from '../common/api';

import { MessagePort } from './messagePort';

export * from '../common/api';
export * from './messageChannel';
export * from './messagePort';

export class JshostMessageReader extends AbstractMessageReader implements MessageReader {

	private _onData: Emitter<Message>;
	private _messageListener: (event: any) => void;

	public constructor(context: MessagePort) {
		super();
		this._onData = new Emitter<Message>();
		this._messageListener = (event: any) => {
			this._onData.fire(event.data);
		};
		context.addEventListener('error', (event : any) => this.fireError(event));
		context.onmessage = this._messageListener;
	}

	public listen(callback: DataCallback): Disposable {
		return this._onData.event(callback);
	}
}

export class JshostMessageWriter extends AbstractMessageWriter implements MessageWriter {

	private errorCount: number;

	public constructor(private context: MessagePort) {
		super();
		this.errorCount = 0;
		context.addEventListener('error', (event : any) => this.fireError(event));
	}

	public write(msg: Message): Promise<void> {
		try {
			this.context.postMessage(msg);
			return Promise.resolve();
		} catch (error) {
			this.handleError(error, msg);
			return Promise.reject(error);
		}
	}

	private handleError(error: any, msg: Message): void {
		this.errorCount++;
		this.fireError(error, msg, this.errorCount);
	}

	public end(): void {
	}
}

export function createMessageConnection(reader: MessageReader, writer: MessageWriter, logger?: Logger, options?: ConnectionStrategy | ConnectionOptions): MessageConnection {
	if (logger === undefined) {
		logger = NullLogger;
	}

	if (ConnectionStrategy.is(options)) {
		options = { connectionStrategy: options } as ConnectionOptions;
	}

	return _createMessageConnection(reader, writer, logger, options);
}