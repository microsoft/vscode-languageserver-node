/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { window, Progress, ProgressLocation } from 'vscode';

import { ClientCapabilities, Proposed, CancellationToken } from 'vscode-languageserver-protocol';

import { BaseLanguageClient, StaticFeature } from './client';
import * as Is from './utils/is';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = Object.create(null) as any;
	}
	return target[key];
}

class ProgressPart {

	private _infinite: boolean;
	private _reported: number;
	private _progress: Progress<{ message?: string, increment?: number}>;
	private _cancellationToken: CancellationToken;

	private _resolve: () => void;
	private _reject: (reason?: any) => void;

	public constructor(private _client: BaseLanguageClient, private _token: number | string) {
		this._reported = 0;
	}

	public start(params: Proposed.WorkDoneProgressStart): void {
		let location: ProgressLocation = params.cancellable ? ProgressLocation.Notification : ProgressLocation.Window;
		window.withProgress<void>({ location, cancellable: params.cancellable, title: params.title}, async (progress, cancellationToken) => {
			this._progress = progress;
			this._infinite = params.percentage === undefined;
			this._cancellationToken = cancellationToken;
			this._cancellationToken.onCancellationRequested(() => {
				this._client.sendNotification(Proposed.WorkDoneProgressCancelNotification.type, { token: this._token });
			});
			this.report(params);
			return new Promise<void>((resolve, reject) => {
				this._resolve = resolve;
				this._reject = reject;
			});
		});

	}

	public report(params: Proposed.WorkDoneProgressReport | Proposed.WorkDoneProgressStart): void {
		if (this._infinite && Is.string(params.message)) {
			this._progress.report({ message: params.message });
		} else if (Is.number(params.percentage)) {
			let percentage =  Math.max(0, Math.min(params.percentage, 100));
			let delta = Math.max(0, percentage - this._reported);
			this._progress.report({ message: params.message, increment: delta });
			this._reported+= delta;
		}
	}

	public cancel(): void {
		this._reject();
	}

	public done(): void {
		this._resolve();
	}
}

export class ProgressFeature implements StaticFeature {

	private _progresses: Map<string | number, ProgressPart> = new Map<string, ProgressPart>();

	constructor(private _client: BaseLanguageClient) {}

	public fillClientCapabilities(cap: ClientCapabilities): void {
		let capabilities: ClientCapabilities & Proposed.WorkDoneProgressClientCapabilities = cap as ClientCapabilities & Proposed.WorkDoneProgressClientCapabilities;
		ensure(capabilities, 'window')!.workDoneProgress = true;
	}

	public initialize(): void {
		let client = this._client;
		let progresses = this._progresses;

		let createHandler = (params: Proposed.WorkDoneProgressCreateParams) => {
			let progress = new ProgressPart(this._client, params.token);
			this._progresses.set(params.token, progress);
		}
		client.onRequest(Proposed.WorkDoneProgressCreateRequest.type, createHandler);

		let reportHandler = (params: Proposed.ProgressReportParams) => {
			let progress = this._progresses.get(params.id);
			if (progress !== undefined) {
				progress.report(params);
			}
		}
		client.onNotification(Proposed.ProgressReportNotification.type, reportHandler);

		let doneHandler = (params: Proposed.ProgressDoneParams) => {
			let progress = progresses.get(params.id);
			if (progress !== undefined) {
				progress.done();
				progresses.delete(params.id);
			}
		}
		client.onNotification(Proposed.ProgressDoneNotification.type, doneHandler);
	}
}