/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Event } from './events';
import { RequestMessage } from './messages';
import { AbstractCancellationTokenSource, CancellationToken, CancellationTokenSource } from './cancellation';
import { CancellationId,RequestCancellationReceiverStrategy, CancellationSenderStrategy, MessageConnection } from './connection';

interface RequestMessageWithCancelData extends RequestMessage {
	$cancellation: SharedArrayBuffer;
}

namespace CancellationState {
	export const Running: number = 0;
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
		data[0] = CancellationState.Running;
		this.buffers.set(request.id, buffer);
		(request as RequestMessageWithCancelData).$cancellation = buffer;
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

	constructor(buffer: SharedArrayBuffer) {
		this.data = new Int32Array(buffer, 0, 1);
	}

	public get isCancellationRequested(): boolean {
		return Atomics.load(this.data, 0) === CancellationState.Cancelled;
	}

	public get onCancellationRequested(): Event<any> {
		throw new Error(`Cancellation tokens on shared array buffers don't support cancellation events`);
	}
}

class SharedArrayBufferCancellationTokenSource implements AbstractCancellationTokenSource {

	public readonly token: CancellationToken;

	constructor(buffer: SharedArrayBuffer) {
		this.token = new SharedArrayBufferCancellationToken(buffer);
	}

	cancel(): void {
	}

	dispose(): void {
	}
}

export class SharedArrayReceiverStrategy implements RequestCancellationReceiverStrategy {
	public readonly kind = 'request' as const;

	createCancellationTokenSource(request: RequestMessage): AbstractCancellationTokenSource {
		const buffer = (request as RequestMessageWithCancelData).$cancellation;
		if (buffer === undefined) {
			return new CancellationTokenSource();
		}
		return new SharedArrayBufferCancellationTokenSource(buffer);
	}
}