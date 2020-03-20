/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
	CancellationToken, Emitter, Event, AbstractCancellationTokenSource, CancellationId,
	CancellationReceiverStrategy, CancellationSenderStrategy, MessageConnection, CancellationStrategy, Disposable
} from 'vscode-jsonrpc';
import * as UUID from './utils/uuid';

class FileBasedToken implements CancellationToken {

	private _isCancelled: boolean = false;
	private _emitter: Emitter<any> | undefined;

	constructor(private _cancellationFilePath: string) {
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
			fs.statSync(this._cancellationFilePath);
			return true;
		}
		catch (e) {
			return false;
		}
	}
}

class FileBasedCancellationTokenSource extends AbstractCancellationTokenSource {

	private _token: CancellationToken;
	constructor(private _cancellationFilePath: string) { super(); }

	get token(): CancellationToken {
		if (!this._token) {
			// be lazy and create the token only when
			// actually needed
			this._token = new FileBasedToken(this._cancellationFilePath);
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

class FileCancellationReceiverStrategy implements CancellationReceiverStrategy {
	constructor(readonly folderName: string) {
	}

	createCancellationTokenSource(id: CancellationId): AbstractCancellationTokenSource {
		return new FileBasedCancellationTokenSource(getCancellationFilePath(this.folderName, id));
	}
}

class FileCancellationSenderStrategy implements CancellationSenderStrategy {
	constructor(readonly folderName: string, private ownFolder?: boolean) {
		if (this.ownFolder) {
			const folder = getCancellationFolderPath(folderName)!;
			try {
				fs.mkdirSync(folder, { recursive: true });
			} catch (e) { }
		}
	}

	sendCancellation(_: MessageConnection, id: CancellationId): void {
		const file = getCancellationFilePath(this.folderName, id);
		try {
			fs.writeFileSync(file, '', { flag: 'w' });
		} catch (e) { }
	}

	cleanup(id: CancellationId): void {
		try {
			fs.unlinkSync(getCancellationFilePath(this.folderName, id));
		}
		catch (e) { }
	}

	dispose(): void {
		if (this.ownFolder) {
			const folder = getCancellationFolderPath(this.folderName);
			try {
				rimraf(folder);
			} catch (e) { }
		}

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
}

export function getCancellationFolderPath(folderName: string) {
	return path.join(os.tmpdir(), 'vscode-languageserver-cancellation', folderName);
}

export function getCancellationFilePath(folderName: string, id: CancellationId) {
	return path.join(getCancellationFolderPath(folderName), `cancellation-${String(id)}.tmp`);
}

export function extractCancellationFolderName(arg: string): string | undefined {
	const fileRegex = /^file\:(.+)$/;
	const folderName = arg.match(fileRegex);
	return folderName ? folderName[1] : undefined;
}

export class FileBasedCancellationStrategy implements CancellationStrategy, Disposable {

	private _receiver: CancellationReceiverStrategy;
	private _sender: CancellationSenderStrategy

	static fromArgv(
		argv: string[],
		defaultReceiver = CancellationReceiverStrategy.Message,
		defaultSender = CancellationSenderStrategy.Message): FileBasedCancellationStrategy | undefined {

		let receiver: CancellationReceiverStrategy | undefined;
		let sender: CancellationSenderStrategy | undefined;

		for (let i = 0; i < argv.length; i++) {
			let arg = argv[i];
			if (arg === '--cancellationSend') {
				sender = createSenderStrategyFromArgv(argv[i + 1]);
			}
			else if (arg === '--cancellationReceive') {
				receiver = createReceiverStrategyFromArgv(argv[i + 1]);
			}
			else {
				const args = arg.split('=');
				if (args[0] === '--cancellationSend') {
					sender = createSenderStrategyFromArgv(args[1]);
				}
				else if (args[0] === '--cancellationReceive') {
					receiver = createReceiverStrategyFromArgv(args[1]);
				}
			}
		}

		receiver = receiver ? receiver : defaultReceiver;
		sender = sender ? sender : defaultSender;

		return new FileBasedCancellationStrategy({ receiver, sender });

		function createReceiverStrategyFromArgv(arg: string): CancellationReceiverStrategy | undefined {
			const folderName = extractCancellationFolderName(arg);
			return folderName ? new FileCancellationReceiverStrategy(folderName) : undefined;
		}

		function createSenderStrategyFromArgv(arg: string): CancellationSenderStrategy | undefined {
			const folderName = extractCancellationFolderName(arg);
			return folderName ? new FileCancellationSenderStrategy(folderName) : undefined;
		}

	}

	constructor(input: { receiver?: CancellationReceiverStrategy, sender?: CancellationSenderStrategy } = {}) {
		const folderName = UUID.generateUuid();
		this._receiver = input.receiver ? input.receiver : new FileCancellationReceiverStrategy(folderName);
		this._sender = input.sender ? input.sender : new FileCancellationSenderStrategy(folderName, true);
	}

	get receiver(): CancellationReceiverStrategy {
		return this._receiver;
	}

	get sender(): CancellationSenderStrategy {
		return this._sender;
	}

	getCommandLineArguments(): string[] {
		const args: string[] = [];

		if (this._receiver instanceof FileCancellationReceiverStrategy) {
			args.push(`--cancellationSend=file:${this._receiver.folderName}`);
		}

		if (this._sender instanceof FileCancellationSenderStrategy) {
			args.push(`--cancellationReceive=file:${this._sender.folderName}`);
		}

		return args;
	}

	dispose(): void {
		if (this._receiver.dispose) {
			this._receiver.dispose();
		}

		if (this._sender.dispose) {
			this._sender.dispose();
		}
	}
}
