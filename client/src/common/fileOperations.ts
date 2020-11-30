/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as code from 'vscode';
import * as proto from 'vscode-languageserver-protocol';

import { DynamicFeature, BaseLanguageClient, RegistrationData, NextSignature } from './client';
import { convert2RegExp } from './utils/patternParser';
import * as UUID from './utils/uuid';

function ensure<T, K extends keyof T>(target: T, key: K): T[K] {
	if (target[key] === void 0) {
		target[key] = {} as any;
	}
	return target[key];
}

export interface FileOperationsMiddleware {
	didCreateFiles?: NextSignature<code.FileCreateEvent, void>;
	willCreateFiles?: NextSignature<code.FileWillCreateEvent, Thenable<code.WorkspaceEdit | null | undefined>>;
	didRenameFiles?: NextSignature<code.FileRenameEvent, void>;
	willRenameFiles?: NextSignature<code.FileWillRenameEvent, Thenable<code.WorkspaceEdit | null | undefined>>;
	didDeleteFiles?: NextSignature<code.FileDeleteEvent, void>;
	willDeleteFiles?: NextSignature<code.FileWillDeleteEvent, Thenable<code.WorkspaceEdit | null | undefined>>;
}

export class WillCreateFilesFeature implements DynamicFeature<proto.FileOperationRegistrationOptions> {

	private _listener: code.Disposable | undefined;
	private _globPatterns: Map<string, RegExp> = new Map<string, RegExp>();

	constructor(private _client: BaseLanguageClient) {
	}

	public get registrationType(): proto.RegistrationType<proto.FileOperationRegistrationOptions> {
		return proto.WillCreateFilesRequest.type;
	}

	public fillClientCapabilities(capabilities: proto.ClientCapabilities): void {
		let value = ensure(ensure(capabilities, 'window')!, 'fileOperations')!;
		value.willCreate = true;
	}

	public initialize(capabilities: proto.ServerCapabilities): void {
		let syncOptions = capabilities.window?.fileOperations;
		if (syncOptions?.willCreate?.globPattern !== undefined) {
			try {
				this.register({
					id: UUID.generateUuid(),
					registerOptions: { globPattern: syncOptions.willCreate.globPattern }
				});
			} catch (e) {
				this._client.warn(`Ignoring invalid glob pattern for willCreate registration: ${syncOptions.willCreate.globPattern}`);
			}
		}
	}

	public register(data: RegistrationData<proto.FileOperationRegistrationOptions>): void {
		if (!this._listener) {
			this._listener = code.workspace.onWillCreateFiles(this.send, this);
		}
		const regex = convert2RegExp(data.registerOptions.globPattern);
		if (!regex) {
			throw new Error(`Invalid pattern ${data.registerOptions.globPattern}!`);
		}
		this._globPatterns.set(data.id, regex);
	}

	public send(originalEvent: code.FileWillCreateEvent): void {
		// Create a copy of the event that has the files filtered to match what the
		// server wants.
		const filteredEvent = {
			...originalEvent,
			files: originalEvent.files.filter((uri) => {
				for (const pattern of this._globPatterns.values()) {
					if (pattern.test(uri.path)) {
						return true;
					}
				}
				return false;
			}),
		};

		if (filteredEvent.files.length) {
			const windowMiddleware = this._client.clientOptions.middleware?.window;
			const willCreateFiles = (event: code.FileWillCreateEvent) => {
				return this._client.sendRequest(proto.WillCreateFilesRequest.type,
					this._client.code2ProtocolConverter.asWillCreateFilesParams(event))
					.then(this._client.protocol2CodeConverter.asWorkspaceEdit);
			};
			filteredEvent.waitUntil(
				windowMiddleware?.willCreateFiles
					? windowMiddleware.willCreateFiles(filteredEvent, willCreateFiles)
					: willCreateFiles(filteredEvent)
			);
		}
	}

	public unregister(id: string): void {
		this._globPatterns.delete(id);
		if (this._globPatterns.size === 0 && this._listener) {
			this._listener.dispose();
			this._listener = undefined;
		}
	}

	public dispose(): void {
		this._globPatterns.clear();
		if (this._listener) {
			this._listener.dispose();
			this._listener = undefined;
		}
	}
}