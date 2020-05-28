/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import RIL from './ril';

// Install the browser runtime abstract.
RIL.install();

import {
	AbstractMessageReader, DataCallback, AbstractMessageWriter, Message, Disposable, Emitter, NullLogger, ConnectionStrategy, ConnectionOptions,
	createMessageConnection as _createMessageConnection, MessageReader, MessageWriter, Logger, MessageConnection
} from '../common/api';

export * from '../common/api';

export class BrowserMessageReader extends AbstractMessageReader {

	private _onData: Emitter<Message>;
	private _messageListener: (event: MessageEvent) => void;

	public constructor(context: Worker | DedicatedWorkerGlobalScope) {
		super();
		this._onData = new Emitter<Message>();
		this._messageListener = (event: MessageEvent) => {
			this._onData.fire(event.data);
		};
		context.addEventListener('error', (event) => this.fireError(event));
		if (context instanceof Worker) {
			context.addEventListener('message', this._messageListener);
		} else {
			context.addEventListener('message', this._messageListener);
		}
	}

	public listen(callback: DataCallback): Disposable {
		return this._onData.event(callback);
	}
}

export class BrowserMessageWriter extends AbstractMessageWriter {

	private errorCount: number;

	public constructor(private context: Worker | DedicatedWorkerGlobalScope) {
		super();
		this.errorCount = 0;
		context.addEventListener('error', (event) => this.fireError(event));
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