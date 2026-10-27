/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	RAL, ClientCapabilities, CancellationToken, CancellationTokenSource, ProgressToken, ProgressType, WorkDoneProgressParams, PartialResultParams,
	WorkDoneProgressBegin, WorkDoneProgress, WorkDoneProgressReport, WorkDoneProgressCancelNotification, WorkDoneProgressCreateRequest,
	RequestParam
} from 'vscode-languageserver-protocol';

import type { Feature, _RemoteWindow } from './server';
import * as Is from './utils/is';

export interface ProgressContext {
	sendProgress<P>(type: ProgressType<P>, token: ProgressToken, value: NoInfer<RequestParam<P>>): void;
}

/**
 * Progress is best-effort: reporters return `void`, so callers can't observe a
 * failed send. Swallow both the synchronous throw of a closed connection and the
 * rejection of a failed write (already logged by the connection) so neither
 * escapes as an exception or an unhandled rejection.
 */
function sendProgress<P>(connection: ProgressContext, type: ProgressType<P>, token: ProgressToken, value: NoInfer<RequestParam<P>>): void {
	try {
		// The connection's implementation returns a promise even though the context types it as void.
		const result: unknown = connection.sendProgress(type, token, value);
		if (Is.thenable(result)) {
			result.then(undefined, () => {});
		}
	} catch {
		// The connection is closed or disposed.
	}
}

export interface WorkDoneProgressReporter {

	begin(title: string, percentage?: number, message?: string, cancellable?: boolean): void;

	report(percentage: number): void;
	report(message: string): void;
	report(percentage: number, message: string): void;

	done(): void;
}

export namespace WorkDoneProgressReporter {
	/**
	 * Tests whether the given work done progress reporter discards progress.
	 */
	export function isNullInstance(reporter: WorkDoneProgressReporter): boolean {
		return reporter instanceof NullProgressReporter;
	}
}

export interface WorkDoneProgressServerReporter extends WorkDoneProgressReporter {
	readonly token: CancellationToken;
}

export interface WindowProgress {
	attachWorkDoneProgress(token: ProgressToken | undefined): WorkDoneProgressReporter;
	createWorkDoneProgress(): Promise<WorkDoneProgressServerReporter>;
}

class WorkDoneProgressReporterImpl implements WorkDoneProgressReporter {

	constructor(private _connection: ProgressContext, protected readonly _token: ProgressToken) {
	}

	public begin(title: string, percentage?: number, message?: string, cancellable?: boolean): void {
		const param: WorkDoneProgressBegin = {
			kind: 'begin',
			title,
			message,
			cancellable
		};
		if (typeof percentage === 'number') {
			// Round to the nearest integer, because the percentage
			// is a uinteger according to the specification
			param.percentage = Math.round(percentage);
		}
		sendProgress(this._connection, WorkDoneProgress.type, this._token, param);
	}

	report(arg0: number | string, arg1?: string): void {
		const param: WorkDoneProgressReport = {
			kind: 'report'
		};
		if (typeof arg0 === 'number') {
			// Round to the nearest integer, because the percentage
			// is a uinteger according to the specification
			param.percentage = Math.round(arg0);
			if (arg1 !== undefined) {
				param.message = arg1;
			}
		} else {
			param.message = arg0;
		}
		sendProgress(this._connection, WorkDoneProgress.type, this._token, param);
	}

	done(): void {
		sendProgress(this._connection, WorkDoneProgress.type, this._token, { kind: 'end' } );
	}

}

class WorkDoneProgressServerReporterImpl extends WorkDoneProgressReporterImpl implements WorkDoneProgressServerReporter {

	/**
	 * Server-created reporters, keyed by token. Only these can be cancelled via
	 * `window/workDoneProgress/cancel`, so reporters attached to client-provided
	 * tokens are never tracked here.
	 */
	public static Instances: Map<string | number, WorkDoneProgressServerReporterImpl> = new Map();

	private _source: CancellationTokenSource;

	constructor(connection: ProgressContext, token: ProgressToken) {
		super(connection, token);
		this._source = new CancellationTokenSource();
		WorkDoneProgressServerReporterImpl.Instances.set(token, this);
	}

	get token(): CancellationToken {
		return this._source.token;
	}

	done(): void {
		WorkDoneProgressServerReporterImpl.Instances.delete(this._token);
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
		public constructor() {
			super();
			this._progressSupported = false;
		}
		public initialize(capabilities: ClientCapabilities): void {
			super.initialize(capabilities);
			if (capabilities?.window?.workDoneProgress === true) {
				this._progressSupported = true;
				this.connection.onNotification(WorkDoneProgressCancelNotification.type, (params) => {
					WorkDoneProgressServerReporterImpl.Instances.get(params.token)?.cancel();
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
				const token: string = RAL().crypto.randomUUID();
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
		sendProgress(this._connection, ResultProgress.type, this._token, data);
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
