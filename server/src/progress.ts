/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	ClientCapabilities, CancellationToken, CancellationTokenSource, ProgressToken, ProgressType, WorkDoneProgressParams, PartialResultParams,
	WorkDoneProgressBegin, WorkDoneProgress, WorkDoneProgressReport, WorkDoneProgressCancelNotification, WorkDoneProgressCreateRequest
} from 'vscode-languageserver-protocol';

import { Feature, _RemoteWindow } from './main';
import { generateUuid } from './utils/uuid';

export interface ProgressContext {
	sendProgress<P>(type: ProgressType<P>, token: ProgressToken, value: P): void;
}

export interface WorkDoneProgressReporter {

	begin(title: string, percentage?: number, message?: string, cancellable?: boolean): void;

	report(percentage: number): void;
	report(message: string): void;
	report(percentage: number, message: string): void;

	done(): void;
}

export interface WorkDoneProgressServerReporter extends WorkDoneProgressReporter {
	readonly token: CancellationToken;
}

export interface WindowProgress {
	attachWorkDoneProgress(token: ProgressToken | undefined): WorkDoneProgressReporter;
	createWorkDoneProgress(): Promise<WorkDoneProgressServerReporter>;
}

class WorkDoneProgressReporterImpl implements WorkDoneProgressReporter {

	public static Instances: Map<string | number, WorkDoneProgressReporterImpl> = new Map();

	constructor(private _connection: ProgressContext, private _token: ProgressToken) {
		WorkDoneProgressReporterImpl.Instances.set(this._token, this);
	}

	public begin(title: string, percentage?: number, message?: string, cancellable?: boolean): void {
		let param: WorkDoneProgressBegin = {
			kind: 'begin',
			title,
			percentage,
			message,
			cancellable
		};
		this._connection.sendProgress(WorkDoneProgress.type, this._token, param);
	}

	report(arg0: number | string, arg1?: string): void {
		let param: WorkDoneProgressReport = {
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
		this._connection.sendProgress(WorkDoneProgress.type, this._token, param);
	}

	done(): void {
		WorkDoneProgressReporterImpl.Instances.delete(this._token);
		this._connection.sendProgress(WorkDoneProgress.type, this._token, { kind: 'end' } );
	}

}

class WorkDoneProgressServerReporterImpl extends WorkDoneProgressReporterImpl implements WorkDoneProgressServerReporter {

	private _source: CancellationTokenSource;

	constructor(connection: ProgressContext, token: ProgressToken) {
		super(connection, token);
	}

	get token(): CancellationToken {
		return this._source.token;
	}

	done(): void {
		this._source.dispose();
		super.done();
	}

	cancel(): void {
		this._source.cancel();
	}
}

class NullProgressReporter implements WorkDoneProgressReporter {

	constructor() {
	}

	begin(): void {
	}

	report(): void {
	}

	done(): void {
	}
}

class NullProgressServerReporter extends NullProgressReporter implements WorkDoneProgressServerReporter {

	private _source: CancellationTokenSource;

	constructor() {
		super();
		this._source = new CancellationTokenSource();
	}

	get token(): CancellationToken {
		return this._source.token;
	}

	done(): void {
		this._source.dispose();
	}

	cancel(): void {
		this._source.cancel();
	}
}

export function attachWorkDone(connection: ProgressContext, params: WorkDoneProgressParams | undefined): WorkDoneProgressReporter {
	if (params === undefined || params.workDoneToken === undefined) {
		return new NullProgressReporter();
	}

	const token = params.workDoneToken;
	delete params.workDoneToken;
	return new WorkDoneProgressReporterImpl(connection, token);
}

export const ProgressFeature: Feature<_RemoteWindow, WindowProgress> = (Base) => {
	return class extends Base {
		private _progressSupported: boolean;
		public initialize(capabilities: ClientCapabilities): void {
			if (capabilities?.window?.workDoneProgress === true) {
				this._progressSupported = true;
				this.connection.onNotification(WorkDoneProgressCancelNotification.type, (params) => {
					let progress = WorkDoneProgressReporterImpl.Instances.get(params.token);
					if (progress instanceof WorkDoneProgressServerReporterImpl || progress instanceof NullProgressServerReporter) {
						progress.cancel();
					}
				});
			}
		}
		public attachWorkDoneProgress(token: ProgressToken | undefined): WorkDoneProgressReporter {
			if (token === undefined) {
				return new NullProgressReporter();
			} else {
				return new WorkDoneProgressReporterImpl(this.connection, token);
			}
		}
		public createWorkDoneProgress(): Promise<WorkDoneProgressServerReporter> {
			if (this._progressSupported) {
				const token: string = generateUuid();
				return this.connection.sendRequest(WorkDoneProgressCreateRequest.type, { token }).then(() => {
					const result: WorkDoneProgressServerReporterImpl = new WorkDoneProgressServerReporterImpl(this.connection, token);
					return result;
				});
			} else {
				return Promise.resolve(new NullProgressServerReporter());
			}
		}
	};
};

export interface ResultProgressReporter<R> {
	report(data: R): void;
}

namespace ResultProgress {
	export const type = new ProgressType<any>();
}

class ResultProgressReporterImpl<R> implements ResultProgressReporter<R> {
	constructor(private _connection: ProgressContext, private _token: ProgressToken) {
	}

	public report(data: R): void {
		this._connection.sendProgress(ResultProgress.type, this._token, data);
	}
}

export function attachPartialResult<R>(connection: ProgressContext, params: PartialResultParams): ResultProgressReporter<R> | undefined {
	if (params === undefined || params.partialResultToken === undefined) {
		return undefined;
	}

	const token = params.partialResultToken;
	delete params.partialResultToken;
	return new ResultProgressReporterImpl<R>(connection, token);
}