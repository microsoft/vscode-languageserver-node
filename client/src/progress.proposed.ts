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
	private _token: CancellationToken;

	private _resolve: () => void;
	private _reject: (reason?: any) => void;

	public constructor(params: Proposed.ProgressStartParams) {
		let location: ProgressLocation = params.cancellable ? ProgressLocation.Notification : ProgressLocation.Window;
		this._reported = 0;
		window.withProgress<void>({ location, cancellable: params.cancellable, title: params.title}, async (progress, token) => {
			this._progress = progress;
			this._infinite = params.percentage === undefined;
			this._token == token;
			this.report(params);
			return new Promise<void>((resolve, reject) => {
				this._resolve = resolve;
				this._reject = reject;
			});
		});
	}

	public report(params: Proposed.ProgressReportParams): void {
		if (this._infinite && Is.string(params.message)) {
			this._progress.report({ message: params.message });
		} else if (Is.number(params.percentage)) {
			let percentage = Math.max(params.percentage, 100);
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

export class WindowProgressFeature implements StaticFeature {
	private _progresses: Map<string, ProgressPart> = new Map<string, ProgressPart>();

	constructor(private _client: BaseLanguageClient) {}

	public fillClientCapabilities(cap: ClientCapabilities): void {
		let capabilities: ClientCapabilities & Proposed.WindowProgressClientCapabilities = cap as ClientCapabilities & Proposed.WindowProgressClientCapabilities;
		ensure(capabilities, 'window')!.progress = true;
	}

	public initialize(): void {
		let client = this._client;
		let progresses = this._progresses;

		let startHandler = (params: Proposed.ProgressStartParams) => {
			if (Is.string(params.id)) {
				let progress = new ProgressPart(params);
				this._progresses.set(params.id, progress);
			}
		}
		client.onNotification(Proposed.ProgressStartNotification.type, startHandler);

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