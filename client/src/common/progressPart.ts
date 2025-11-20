/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	window as Window, Progress, ProgressLocation, CancellationToken, Disposable
} from 'vscode';

import {
	ProgressToken, ProgressType, NotificationHandler, ProtocolNotificationType, WorkDoneProgress, WorkDoneProgressBegin, WorkDoneProgressCancelNotification, WorkDoneProgressReport
} from 'vscode-languageserver-protocol';

import * as Is from './utils/is';

export interface ProgressContext {
	onProgress<P>(type: ProgressType<P>, token: string | number, handler: NoInfer<NotificationHandler<P>>): Disposable;
	sendNotification<P, RO>(type: ProtocolNotificationType<P, RO>, params?: NoInfer<P>): void;
}

export class ProgressPart {

	private _infinite: boolean;
	private _reported: number;

	// listener for LSP progress messages. Set in constructor.
	private _lspProgressDisposable: Disposable | undefined;

	// VS Code progress state. Set in Window.withProgress callback.
	private _progress: Progress<{ message?: string; increment?: number}> | undefined;
	private _cancellationToken: CancellationToken | undefined;
	private _tokenDisposable: Disposable | undefined;
	private _resolve: (() => void) | undefined;
	private _reject: ((reason?: any) => void) | undefined;

	public constructor(private _client: ProgressContext, private _token: ProgressToken, done?: (part: ProgressPart) => void) {
		this._reported = 0;
		this._infinite = false;
		this._lspProgressDisposable = this._client.onProgress(WorkDoneProgress.type, this._token, (value) => {
			switch (value.kind) {
				case 'begin':
					this.begin(value);
					break;
				case 'report':
					this.report(value);
					break;
				case 'end':
					this.done();
					done && done(this);
					break;
			}
		});
	}

	private begin(params: WorkDoneProgressBegin): void {
		this._infinite = params.percentage === undefined;

		// the progress as already been marked as done / canceled. Ignore begin call
		if (this._lspProgressDisposable === undefined) {
			return;
		}
		// Since we don't use commands this will be a silent window progress with a hidden notification.
		void Window.withProgress<void>({ location: ProgressLocation.Window, cancellable: params.cancellable, title: params.title}, async (progress, cancellationToken) => {
			// the progress as already been marked as done / canceled. Ignore begin call
			if (this._lspProgressDisposable === undefined) {
				return;
			}
			this._progress = progress;
			this._cancellationToken = cancellationToken;
			this._tokenDisposable = this._cancellationToken.onCancellationRequested(() => {
				this._client.sendNotification(WorkDoneProgressCancelNotification.type, { token: this._token });
			});
			this.report(params);
			return new Promise<void>((resolve, reject) => {
				this._resolve = resolve;
				this._reject = reject;
			});
		});
	}

	private report(params: WorkDoneProgressReport | WorkDoneProgressBegin): void {
		if (this._infinite && Is.string(params.message)) {
			this._progress !== undefined && this._progress.report({ message: params.message });
		} else if (Is.number(params.percentage)) {
			const percentage =  Math.max(0, Math.min(params.percentage, 100));
			const delta = Math.max(0, percentage - this._reported);
			this._reported+= delta;
			this._progress !== undefined && this._progress.report({ message: params.message, increment: delta });
		}
	}

	public cancel(): void {
		this.cleanup();
		if (this._reject !== undefined) {
			this._reject();
			this._resolve = undefined;
			this._reject = undefined;
		}
	}

	public done(): void {
		this.cleanup();
		if (this._resolve !== undefined) {
			this._resolve();
			this._resolve = undefined;
			this._reject = undefined;
		}
	}

	private cleanup(): void {
		if (this._lspProgressDisposable !== undefined) {
			this._lspProgressDisposable.dispose();
			this._lspProgressDisposable = undefined;
		}
		if (this._tokenDisposable !== undefined) {
			this._tokenDisposable.dispose();
			this._tokenDisposable = undefined;
		}
		this._progress = undefined;
		this._cancellationToken = undefined;
	}
}