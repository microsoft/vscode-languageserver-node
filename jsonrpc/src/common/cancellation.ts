/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import RAL from './ral';

import * as Is from './is';
import { Event, Emitter } from './events';
import { Disposable } from './disposable';

/**
 * Defines a CancellationToken. This interface is not
 * intended to be implemented. A CancellationToken must
 * be created via a CancellationTokenSource.
 */
export interface CancellationToken {
	/**
	 * Is `true` when the token has been cancelled, `false` otherwise.
	 */
	readonly isCancellationRequested: boolean;

	/**
	 * An [event](#Event) which fires upon cancellation.
	 */
	readonly onCancellationRequested: Event<any>;
}

export namespace CancellationToken {

	export const None: CancellationToken = Object.freeze({
		isCancellationRequested: false,
		onCancellationRequested: Event.None
	});

	export const Cancelled: CancellationToken = Object.freeze({
		isCancellationRequested: true,
		onCancellationRequested: Event.None
	});

	export function is(value: any): value is CancellationToken {
		const candidate = value as CancellationToken;
		return candidate && (candidate === CancellationToken.None
			|| candidate === CancellationToken.Cancelled
			|| (Is.boolean(candidate.isCancellationRequested) && !!candidate.onCancellationRequested));
	}
}

const shortcutEvent: Event<any> = Object.freeze(function (callback: Function, context?: any): any {
	const handle = RAL().timer.setTimeout(callback.bind(context), 0);
	return { dispose() { handle.dispose(); } };
});

class MutableToken implements CancellationToken {

	private _isCancelled: boolean = false;
	private _emitter: Emitter<any> | undefined;

	public cancel() {
		if (!this._isCancelled) {
			this._isCancelled = true;
			if (this._emitter) {
				this._emitter.fire(undefined);
				this.dispose();
			}
		}
	}

	get isCancellationRequested(): boolean {
		return this._isCancelled;
	}

	get onCancellationRequested(): Event<any> {
		if (this._isCancelled) {
			return shortcutEvent;
		}
		if (!this._emitter) {
			this._emitter = new Emitter<any>();
		}
		return this._emitter.event;
	}

	public dispose(): void {
		if (this._emitter) {
			this._emitter.dispose();
			this._emitter = undefined;
		}
	}
}

export interface AbstractCancellationTokenSource extends Disposable {
	token: CancellationToken;
	cancel(): void;
}

export class CancellationTokenSource implements AbstractCancellationTokenSource {

	private _token: CancellationToken | undefined;

	get token(): CancellationToken {
		if (!this._token) {
			// be lazy and create the token only when
			// actually needed
			this._token = new MutableToken();
		}
		return this._token;
	}

	cancel(): void {
		if (!this._token) {
			// save an object by returning the default
			// cancelled token when cancellation happens
			// before someone asks for the token
			this._token = CancellationToken.Cancelled;
		} else {
			(<MutableToken>this._token).cancel();
		}
	}

	dispose(): void {
		if (!this._token) {
			// ensure to initialize with an empty token if we had none
			this._token = CancellationToken.None;
		} else if (this._token instanceof MutableToken) {
			// actually dispose
			this._token.dispose();
		}
	}
}