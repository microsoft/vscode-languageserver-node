/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import RIL from './ril';

// Install the browser runtime abstract.
RIL.install();

import {
	AbstractMessageReader, DataCallback, AbstractMessageWriter, Message, Disposable, Emitter
} from '../common/api';

export * from '../common/api';

export class BrowserMessageReader extends AbstractMessageReader {

	private _onData: Emitter<Message>;
	private _messageListener: (event: MessageEvent) => void;

	public constructor(worker: Worker | DedicatedWorkerGlobalScope) {
		super();
		this._onData = new Emitter<Message>();
		this._messageListener = (event: MessageEvent) => {
			this._onData.fire(event.data);
		};
		worker.addEventListener('error', (event) => this.fireError(event));
		if (worker instanceof Worker) {
			worker.addEventListener('message', this._messageListener);
		} else {
			worker.addEventListener('message', this._messageListener);
		}
	}

	public listen(callback: DataCallback): Disposable {
		return this._onData.event(callback);
	}
}

export class BrowserMessageWriter extends AbstractMessageWriter {

	private errorCount: number;

	public constructor(private worker: Worker | DedicatedWorkerGlobalScope) {
		super();
		this.errorCount = 0;
		worker.addEventListener('error', (event) => this.fireError(event));
	}

	public write(msg: Message): Promise<void> {
		try {
			this.worker.postMessage(msg);
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