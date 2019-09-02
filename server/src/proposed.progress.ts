/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	ClientCapabilities, CancellationToken, CancellationTokenSource, Proposed, ProgressToken, ProgressType, WorkDoneProgressParams, PartialResultParams
} from 'vscode-languageserver-protocol';

import { Feature, RemoteWindow } from './main';
import { generateUuid } from './utils/uuid';

export interface ProgressContext {
	sendProgress<P>(type: ProgressType<P>, token: ProgressToken, value: P): void;
}

export interface WorkDoneProgress {

	readonly token: CancellationToken;

	begin(title: string, percentage?: number, message?: string, cancellable?: boolean): void;

	report(percentage: number): void;
	report(message: string): void;
	report(percentage: number, message: string): void;

	done(): void;
}

export interface WindowProgress {
	attachWorkDoneProgress(token: ProgressToken | undefined): WorkDoneProgress;
	createWorkDoneProgress(): Thenable<WorkDoneProgress>;
}

class WorkDoneProgressImpl implements WorkDoneProgress {

	public static Instances: Map<string | number, WorkDoneProgressImpl> = new Map();

	private _source: CancellationTokenSource;

	constructor(private _connection: ProgressContext, private _token: ProgressToken) {
		WorkDoneProgressImpl.Instances.set(this._token, this);
		this._source = new CancellationTokenSource();
	}

	get token(): CancellationToken {
		return this._source.token;
	}

	public begin(title: string, percentage?: number, message?: string, cancellable?: boolean): void {
		let param: Proposed.WorkDoneProgressBegin = {
			kind: 'begin',
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
		this._connection.sendProgress(Proposed.WorkDoneProgress.type, this._token, { kind: 'end' } );
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

	begin(): void {
	}

	report(): void {
	}

	done(): void {
	}
}

export function attachWorkDone(connection: ProgressContext, params: WorkDoneProgressParams): WorkDoneProgress {
	if (params === undefined || params.workDoneToken === undefined) {
		return new NullProgress();
	}

	const token = params.workDoneToken;
	delete params.workDoneToken;
	return new WorkDoneProgressImpl(connection, token);
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
		public attachWorkDoneProgress(token: ProgressToken | undefined): WorkDoneProgress {
			if (token === undefined) {
				return new NullProgress();
			} else {
				return new WorkDoneProgressImpl(this.connection, token);
			}
		}
		public createWorkDoneProgress(): Thenable<WorkDoneProgress> {
			if (this._progressSupported) {
				const token: string = generateUuid();
				return this.connection.sendRequest(Proposed.WorkDoneProgressCreateRequest.type, { token }).then(() => {
					const result: WorkDoneProgressImpl = new WorkDoneProgressImpl(this.connection, token);
					return result;
				});
			} else {
				return Promise.resolve(new NullProgress());
			}
		}
	};
};

export interface ResultProgress<R> {
	report(data: R): void;
}

namespace ResultProgress {
	export const type = new ProgressType<any>();
}

class ResultProgressImpl<R> implements ResultProgress<R> {
	constructor(private _connection: ProgressContext, private _token: ProgressToken) {
	}

	public report(data: R): void {
		this._connection.sendProgress(ResultProgress.type, this._token, data);
	}
}

export function attachPartialResult<R>(connection: ProgressContext, params: PartialResultParams): ResultProgress<R> | undefined {
	if (params === undefined || params.partialResultToken === undefined) {
		return undefined;
	}

	const token = params.partialResultToken;
	delete params.partialResultToken;
	return new ResultProgressImpl<R>(connection, token);
}