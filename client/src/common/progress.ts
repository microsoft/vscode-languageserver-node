/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { ClientCapabilities, WorkDoneProgressCreateParams, WorkDoneProgressCreateRequest } from 'vscode-languageserver-protocol';

import { FeatureClient, FeatureState, StaticFeature } from './features';
import { ProgressPart } from './progressPart';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = Object.create(null) as any;
	}
	return target[key];
}

export class ProgressFeature implements StaticFeature {

	private readonly activeParts: Set<ProgressPart>;

	constructor(private _client: FeatureClient<object>) {
		this.activeParts = new Set();
	}

	getState(): FeatureState {
		return { kind: 'window', id: WorkDoneProgressCreateRequest.method, registrations: this.activeParts.size > 0 };
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(capabilities, 'window')!.workDoneProgress = true;
	}

	public initialize(): void {
		const client = this._client;

		const deleteHandler = (part: ProgressPart) => {
			this.activeParts.delete(part);
		};

		const createHandler = (params: WorkDoneProgressCreateParams) => {
			this.activeParts.add(new ProgressPart(this._client, params.token, deleteHandler));
		};

		client.onRequest(WorkDoneProgressCreateRequest.type, createHandler);
	}

	public clear(): void {
		for (const part of this.activeParts) {
			part.done();
		}
		this.activeParts.clear();
	}
}
