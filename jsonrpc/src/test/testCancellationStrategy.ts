/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as fs from 'fs';
import * as path from 'path';
import { CancellationReceiverStrategy, CancellationId, CancellationSenderStrategy, MessageConnection, Emitter, Event, CancellationToken, AbstractCancellationTokenSource } from '../main';

class FileBasedToken implements CancellationToken {
	private _isCancelled: boolean = false;
	private _emitter: Emitter<any> | undefined;

	constructor(private _cancellationName: string) {
	}

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
		if (this._isCancelled) {
			return true;
		}

		if (this.pipeExists()) {
			// the first time it encounters cancellation file, it will
			// cancel itself and raise cancellation event.
			// in this mode, cancel() might not be called explicitly by jsonrpc layer
			this.cancel();
		}

		return this._isCancelled;
	}

	get onCancellationRequested(): Event<any> {
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

	private _token: CancellationToken;

	constructor(private _cancellationName: string) { super(); }

	get token(): CancellationToken {
		if (!this._token) {
			// be lazy and create the token only when
			// actually needed
			this._token = new FileBasedToken(this._cancellationName);
		}
		return this._token;
	}

	cancel(): void {
		if (!this._token) {
			this._token = CancellationToken.Cancelled;
		} else {
			(<FileBasedToken>this._token).cancel();
		}
	}

	dispose(): void {
		if (!this._token) {
			// ensure to initialize with an empty token if we had none
			this._token = CancellationToken.None;
		} else if (this._token instanceof FileBasedToken) {
			// actually dispose
			this._token.dispose();
		}
	}
}

function getCancellationFilename(folder: string, id: CancellationId) {
	return path.join(folder, `cancellation-${String(id)}.tmp`);
}

export function getReceiverStrategy(folder: string): CancellationReceiverStrategy {
	return {
		createCancellationTokenSource(id: CancellationId): AbstractCancellationTokenSource {
			return new FileBasedCancellationTokenSource(getCancellationFilename(folder, id));
		}
	};
}

export function getSenderStrategy(folder: string): CancellationSenderStrategy {
	return {
		sendCancellation(_: MessageConnection, id: CancellationId): void {
			const file = getCancellationFilename(folder, id);
			try {
				if (!fs.existsSync(file)) {
					fs.writeFileSync(file, '', { flag: 'w' });
				}
			} catch (e) {
				// noop
			}
		},
		cleanup(id: CancellationId): void {
			try {
				fs.unlinkSync(getCancellationFilename(folder, id));
			}
			catch (e) {
				// noop
			}
		}
	};
}
