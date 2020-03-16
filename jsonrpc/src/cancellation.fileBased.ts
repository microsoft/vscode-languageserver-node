/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as fs from 'fs';
import { MutableToken, AbstractCancellationTokenSource, CancellationTokenSource } from './cancellation';
import { CancellationToken } from './cancellation';

class FileBasedToken extends MutableToken {

	constructor(private _cancellationName: string) {
		super();
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

	public dispose(): void {
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

class FileBasedCancellationTokenSource extends AbstractCancellationTokenSource {
	constructor(private _cancellationName: string) { super(); }

	protected createToken(): CancellationToken {
		return new FileBasedToken(this._cancellationName);
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

export function createCancellationTokenSource(cancellationFilename?: string): AbstractCancellationTokenSource {
	return cancellationFilename ? new FileBasedCancellationTokenSource(cancellationFilename) : new CancellationTokenSource();
}