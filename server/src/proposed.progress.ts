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


export interface WorkDoneProgress {

	readonly token: CancellationToken;

	report(percentage: number): void;
	report(message: string): void;
	report(percentage: number, message: string): void;

	done(): void;
}

export interface WindowProgress {
	createWorkDoneProgress(title: string, percentage?: number, message?: string, cancellable?: boolean): Thenable<WorkDoneProgress>;
}

class WorkDoneProgressImpl implements WorkDoneProgress {

	public static Instances: Map<string | number, WorkDoneProgressImpl> = new Map();

	private _source: CancellationTokenSource;

	constructor(private _connection: IConnection, private _token: number | string) {
		WorkDoneProgressImpl.Instances.set(this._token, this);
		this._source = new CancellationTokenSource();
	}

	get token(): CancellationToken {
		return this._source.token;
	}

	public start(title: string, percentage?: number, message?: string, cancellable?: boolean): void {
		let param: Proposed.WorkDoneProgressStart = {
			kind: 'start',
			title,
			percentage,
			message,
			cancellable
		};
		this._connection.sendProgress(Proposed.WorkDoneProgress.type, this._token, param);
	}

	report(arg0: number | string, arg1?: string): void {
		let param: Proposed.WorkDoneProgressReport = {
			kind: 'report'
		};
		if (typeof arg0 === 'number') {
			param.percentage = arg0;
			if (arg1 !== undefined) {
				param.message = arg1;
			}
		} else {
			param.message = arg0;
		}
		this._connection.sendProgress(Proposed.WorkDoneProgress.type, this._token, param);
	}

	done(): void {
		WorkDoneProgressImpl.Instances.delete(this._token);
		this._source.dispose();
		this._connection.sendProgress(Proposed.WorkDoneProgress.type, this._token, { kind: 'done' } );
	}

	cancel(): void {
		this._source.cancel();
	}
}

class NullProgress implements WorkDoneProgress {

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
			const capabilities: ClientCapabilities & Proposed.WorkDoneProgressClientCapabilities = cap;
			if (capabilities.window && capabilities.window.workDoneProgress) {
				this._progressSupported = true;
				this.connection.onNotification(Proposed.WorkDoneProgressCancelNotification.type, (params) => {
					let progress = WorkDoneProgressImpl.Instances.get(params.token);
					if (progress !== undefined) {
						progress.cancel();
					}
				});
			}
		}
		createWorkDoneProgress(title: string, percentage?: number, message?: string, cancellable?: boolean): Thenable<WorkDoneProgress> {
			if (this._progressSupported) {
				const token: string = generateUuid();
				return this.connection.sendRequest(Proposed.WorkDoneProgressCreateRequest.type, { token }).then(() => {
					const result: WorkDoneProgressImpl = new WorkDoneProgressImpl(this.connection, token);
					result.start(title, percentage, message, cancellable);
					return result;
				});
			} else {
				return Promise.resolve(new NullProgress());
			}
		}
	}
};