/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as fs from 'fs';

import { Event, Emitter } from './events';
import * as Is from './is';

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
		let candidate = value as CancellationToken;
		return candidate && (candidate === CancellationToken.None
			|| candidate === CancellationToken.Cancelled
			|| (Is.boolean(candidate.isCancellationRequested) && !!candidate.onCancellationRequested));
	}
}

const shortcutEvent: Event<any> = Object.freeze(function (callback: Function, context?: any): any {
	let handle = setTimeout(callback.bind(context), 0);
	return { dispose() { clearTimeout(handle); } };
});

class MutableToken implements CancellationToken {

	private _isCancelled: boolean = false;
	private _emitter: Emitter<any> | undefined;

	public cancel() {
		if (!this._isCancelled) {
			this._isCancelled = true;
			if (this._emitter) {
				this._emitter.fire(undefined);
				this.disposeEvent();
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
		this.disposeEvent();
	}

	private disposeEvent() : void {
		if (this._emitter) {
			this._emitter.dispose();
			this._emitter = undefined;
		}
	}
}

class FileBasedToken extends MutableToken {

	constructor(private _cancellationName: string) {
		super();
	}

	public cancel() {
		if (!super.isCancellationRequested && createCancellationFile(this._cancellationName)) {
			// change state only when writing cancellation file succeeded
			// otherwise, ignore cancellation request
			super.cancel();
		}
	}

	get isCancellationRequested(): boolean {
		if (super.isCancellationRequested) {
			return super.isCancellationRequested;
		}

		if (this.pipeExists()) {
			// the first time it encounters cancellation file, it will
			// cancel itself and raise cancellation event.
			// in this mode, cancel() might not be called explicitly by jsonrpc layer
			this.cancel();
		}

		return super.isCancellationRequested;
	}

	public dispose() : void {
		super.dispose();

		if (!super.isCancellationRequested) {
			// this could be micro optimization we don't want to keep
			return;
		}

		try {
			// attempt to delete cancellation file.
			// if it fails, that's fine, owner of this connection is supposed to take care of
			// files left at the end of the session
			fs.unlinkSync(this._cancellationName);
		}
		catch (e) {
			// noop
		}
	}

	private pipeExists(): boolean {
		try {
			fs.statSync(this._cancellationName);
			return true;
		}
		catch (e) {
			return false;
		}
	}
}

// internal usage only
export class CancellationTokenSourceImpl {

	private _token: CancellationToken;

	constructor(private _cancellationName?: string) { }

	get token(): CancellationToken {
		if (!this._token) {
			// be lazy and create the token only when
			// actually needed
			this._token = this._cancellationName ? new FileBasedToken(this._cancellationName) : new MutableToken();
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

export class CancellationTokenSource extends CancellationTokenSourceImpl {
	constructor() {
		// this hides cancellation name from external people
		super();
	}
}

// internal usage only
export function createCancellationFile(cancellationFilename: string) {
	try {
		if (!fs.existsSync(cancellationFilename)) {
			// this file won't be deleted individually since there is no good way
			// to know whether this file is no longer needed. instead, it is up to the
			// owner of the connection this cancellation belong to to decide when to
			// delete these files (such as connection is closed)
			fs.writeFileSync(cancellationFilename, '', { flag: 'w' });
		}
		return true;
	} catch (e) {
		return false;
	}
}