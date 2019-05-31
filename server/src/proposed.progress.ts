/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	ClientCapabilities, CancellationToken, CancellationTokenSource, Proposed
} from 'vscode-languageserver-protocol';

import { Feature, RemoteWindow, IConnection } from './main';
import { generateUuid } from './utils/uuid';


export interface Progress {

	readonly token: CancellationToken;

	report(percentage: number): void;
	report(message: string): void;
	report(percentage: number, message: string): void;

	done(): void;
}

export interface WindowProgress {
	createProgress(title: string, percentage?: number, message?: string, cancellable?: boolean): Progress;
}

class ProgressImpl implements Progress {

	public static Instances: Map<string, ProgressImpl> = new Map();

	private _id: string;
	private _source: CancellationTokenSource;

	constructor(private _connection: IConnection, title: string, percentage?: number, message?: string, cancellable?: boolean) {
		this._id = generateUuid();
		let params: Proposed.ProgressStartParams  = {
			id: this._id,
			title,
			cancellable
		}
		if (percentage !== undefined) {
			params.percentage = percentage;
		}
		if (message !== undefined) {
			params.message = message;
		}
		if (cancellable !== undefined) {
			params.cancellable = cancellable;
		}
		ProgressImpl.Instances.set(this._id, this);
		this._source = new CancellationTokenSource();
		this._connection.sendNotification(Proposed.ProgressStartNotification.type, params);
	}

	get token(): CancellationToken {
		return this._source.token;
	}

	report(arg0: number | string, arg1?: string): void {
		let percentage: number | undefined;
		let message: string | undefined;
		if (typeof arg0 === 'number') {
			percentage = arg0;
			if (arg1 !== undefined) {
				message = arg1;
			}
		} else {
			message = arg0;
		}
		this._connection.sendNotification(Proposed.ProgressReportNotification.type, { id: this._id, percentage, message });
	}

	done(): void {
		ProgressImpl.Instances.delete(this._id);
		this._source.dispose();
		this._connection.sendNotification(Proposed.ProgressDoneNotification.type, {id: this._id });
	}

	cancel(): void {
		this._source.cancel();
	}
}

class NullProgress implements Progress {

	private _source: CancellationTokenSource;

	constructor() {
		this._source = new CancellationTokenSource();
	}

	get token(): CancellationToken {
		return this._source.token;
	}

	report(): void {
	}

	done(): void {
	}
}

export const ProgressFeature: Feature<RemoteWindow, WindowProgress> = (Base) => {
	return class extends Base {
		private _progressSupported: boolean;
		public initialize(cap: ClientCapabilities): void {
			let capabilities: ClientCapabilities & Proposed.ProgressClientCapabilities = cap;
			if (capabilities.window && capabilities.window.progress) {
				this._progressSupported = true;
				this.connection.onNotification(Proposed.ProgressCancelNotification.type, (params) => {
					let progress = ProgressImpl.Instances.get(params.id);
					if (progress !== undefined) {
						progress.cancel();
					}
				});
			}
		}
		createProgress(title: string, percentage?: number, message?: string, cancellable?: boolean): Progress {
			if (this._progressSupported) {
				return new ProgressImpl(this.connection, title, percentage, message, cancellable)
			} else {
				return new NullProgress();
			}
		}
	}
};