/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Emitter, Event } from './events';
import { RequestMessage } from './messages';
import { AbstractCancellationTokenSource, CancellationToken, CancellationTokenSource } from './cancellation';
import { CancellationId,RequestCancellationReceiverStrategy, CancellationSenderStrategy, MessageConnection } from './connection';
import RAL from './ral';

interface RequestMessageWithCancelData extends RequestMessage {
	$cancellationToken: SharedArrayBuffer;
}

namespace CancellationState {
	export const Continue: number = 0;
	export const Cancelled: number = 1;
}

export class SharedArraySenderStrategy implements CancellationSenderStrategy {

	private readonly buffers: Map<CancellationId, SharedArrayBuffer>;

	constructor() {
		this.buffers = new Map();
	}

	enableCancellation(request: RequestMessage): void {
		if (request.id === null) {
			return;
		}
		const buffer = new SharedArrayBuffer(4);
		const data = new Int32Array(buffer, 0, 1);
		data[0] = CancellationState.Continue;
		this.buffers.set(request.id, buffer);
		(request as RequestMessageWithCancelData).$cancellationToken = buffer;
	}

	async sendCancellation(_conn: MessageConnection, id: CancellationId): Promise<void> {
		const buffer = this.buffers.get(id);
		if (buffer === undefined) {
			return;
		}
		const data = new Int32Array(buffer, 0, 1);
		Atomics.store(data, 0, CancellationState.Cancelled);
	}

	cleanup(id: CancellationId): void {
		this.buffers.delete(id);
	}

	dispose(): void {
		this.buffers.clear();
	}
}

class SharedArrayBufferCancellationToken implements CancellationToken {

	private readonly data: Int32Array;
	private isCanceled: boolean;
	private emitter: Emitter<void> | undefined;

	constructor(buffer: SharedArrayBuffer) {
		this.data = new Int32Array(buffer, 0, 1);
		this.isCanceled = false;
	}

	public get isCancellationRequested(): boolean {
		const result = Atomics.load(this.data, 0) === CancellationState.Cancelled;
		if (result && !this.isCanceled) {
			this.isCanceled = true;
			if (this.emitter !== undefined) {
				try {
					this.emitter.fire();
				} catch (error) {
					RAL().console.error(error);
				}
			}
		}
		return result;
	}

	public get onCancellationRequested(): Event<void> {
		if (!this.emitter) {
			this.emitter = new Emitter();
		}
		return this.emitter.event;
	}

	public cancel(): void {
		if (this.isCanceled) {
			return;
		}
		Atomics.store(this.data, 0, CancellationState.Cancelled);
		this.isCanceled = true;

		if (this.emitter !== undefined) {
			try {
				this.emitter.fire();
			} catch (error) {
				RAL().console.error(error);
			}
		}
	}
}

class SharedArrayBufferCancellationTokenSource implements AbstractCancellationTokenSource {

	public readonly token: SharedArrayBufferCancellationToken;

	constructor(buffer: SharedArrayBuffer) {
		this.token = new SharedArrayBufferCancellationToken(buffer);
	}

	cancel(): void {
		this.token.cancel();
	}

	dispose(): void {
	}
}

export class SharedArrayReceiverStrategy implements RequestCancellationReceiverStrategy {
	public readonly kind = 'request' as const;

	createCancellationTokenSource(request: RequestMessage): AbstractCancellationTokenSource {
		const buffer = (request as RequestMessageWithCancelData).$cancellationToken;
		if (buffer === undefined) {
			return new CancellationTokenSource();
		}
		return new SharedArrayBufferCancellationTokenSource(buffer);
	}
}