/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CancellationReceiverStrategy, CancellationId, CancellationSenderStrategy, MessageConnection, Event, CancellationToken, AbstractCancellationTokenSource } from '../main';
import { randomBytes } from 'crypto';

class CustomCancellationToken implements CancellationToken {
	private _isCancelled: boolean = false;

	constructor(private _cancellationName: string) { }

	public cancel() {
		if (!this._isCancelled) {
			this._isCancelled = true;
		}
	}

	get isCancellationRequested(): boolean {
		if (this._isCancelled) {
			return true;
		}

		if (this.pipeExists()) {
			this.cancel();
		}

		return this._isCancelled;
	}

	get onCancellationRequested(): Event<any> {
		return Event.None;
	}

	public dispose(): void { }

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

class CustomCancellationTokenSource implements AbstractCancellationTokenSource {
	private _token: CustomCancellationToken;

	constructor(private _cancellationName: string) {
		this._token = new CustomCancellationToken(this._cancellationName);
	}

	get token(): CancellationToken {
		return this._token;
	}

	cancel(): void {
		this._token.cancel();
	}

	dispose(): void {
		this._token.dispose();
	}
}

function getCancellationFilename(folder: string, id: CancellationId) {
	return path.join(folder, `cancellation-${String(id)}.tmp`);
}

function getReceiverStrategy(folder: string): CancellationReceiverStrategy {
	return {
		createCancellationTokenSource(id: CancellationId): AbstractCancellationTokenSource {
			return new CustomCancellationTokenSource(getCancellationFilename(folder, id));
		}
	};
}

function getSenderStrategy(folder: string): CancellationSenderStrategy {
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

export function getCustomCancellationStrategy() {
	const cancellationFolder = path.join(os.tmpdir(), `jsonrpc-connection-tests`, randomBytes(21).toString('hex'));
	fs.mkdirSync(cancellationFolder, { recursive: true });

	return {
		receiver: getReceiverStrategy(cancellationFolder),
		sender: getSenderStrategy(cancellationFolder),
		dispose: (): void => {
			try {
				rimraf(cancellationFolder);
			} catch (e) { }
		}
	};

	function rimraf(location: string) {
		const stat = fs.lstatSync(location);
		if (stat) {
			if (stat.isDirectory() && !stat.isSymbolicLink()) {
				for (const dir of fs.readdirSync(location)) {
					rimraf(path.join(location, dir));
				}

				fs.rmdirSync(location);
			}
			else {
				fs.unlinkSync(location);
			}
		}
	}
}