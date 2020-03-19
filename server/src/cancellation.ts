/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CancellationToken, Emitter, Event, AbstractCancellationTokenSource, CancellationId, CancellationReceiverStrategy, CancellationSenderStrategy, MessageConnection, CancellationStrategy } from 'vscode-jsonrpc';

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
			// save an object by returning the default
			// cancelled token when cancellation happens
			// before someone asks for the token
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
	return path.join(getFolderForCancellation(folder), `cancellation-${String(id)}.tmp`);
}

function getCancellationFolderName(arg: string): string | undefined {
	const fileRegex = /^file\:(.+)$/;
	const folderName = arg.match(fileRegex);
	return folderName ? folderName[1] : undefined;
}

function getReceiverStrategy(arg: string): CancellationReceiverStrategy {
	const cancellationFolder = getCancellationFolderName(arg);
	if (cancellationFolder) {
		return {
			createCancellationTokenSource(id: CancellationId): AbstractCancellationTokenSource {
				return new FileBasedCancellationTokenSource(getCancellationFilename(cancellationFolder, id));
			}
		};
	}

	return CancellationReceiverStrategy.Message;
}

function getSenderStrategy(arg: string): CancellationSenderStrategy {
	const cancellationFolder = getCancellationFolderName(arg);
	if (cancellationFolder) {
		return {
			sendCancellation(_: MessageConnection, id: CancellationId): void {
				const file = getCancellationFilename(cancellationFolder, id);
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
					fs.unlinkSync(getCancellationFilename(cancellationFolder, id));
				}
				catch (e) {
					// noop
				}
			}
		};
	}

	return CancellationSenderStrategy.Message;
}

export function getFolderForCancellation(folder: string) {
	return path.join(os.tmpdir(), 'vscode-languageserver-cancellation', folder);
}

export function parseCancellationStrategy(argv: string[]): CancellationStrategy | undefined {
	if (argv.length > 0) {
		let receiver: CancellationReceiverStrategy | undefined = void 0;
		let sender: CancellationSenderStrategy | undefined = void 0;
		for (let i = 0; i < argv.length; i++) {
			let arg = argv[i];
			if (arg === '--cancellationSend') {
				sender = getSenderStrategy(argv[i + 1]);
			}
			else if (arg === '--cancellationReceive') {
				receiver = getReceiverStrategy(argv[i + 1]);
			}
			else {
				var args = arg.split('=');
				if (args[0] === '--cancellationSend') {
					sender = getSenderStrategy(args[1]);
				}
				else if (args[0] === '--cancellationReceive') {
					receiver = getReceiverStrategy(args[1]);
				}
			}
		}
		if (receiver || sender) {
			receiver = receiver ? receiver : CancellationReceiverStrategy.Message;
			sender = sender ? sender : CancellationSenderStrategy.Message;
			return { receiver, sender };
		}
	}
	return undefined;
}
