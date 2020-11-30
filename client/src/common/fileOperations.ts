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

export class DidCreateFilesFeature implements DynamicFeature<proto.FileOperationRegistrationOptions> {
	private _listener: code.Disposable | undefined;
	private _globPatterns: Map<string, RegExp> = new Map<string, RegExp>();

	constructor(private _client: BaseLanguageClient) {
	}

	public get registrationType(): proto.RegistrationType<proto.FileOperationRegistrationOptions> {
		return proto.DidCreateFilesNotification.type;
	}

	public fillClientCapabilities(capabilities: proto.ClientCapabilities): void {
		let value = ensure(ensure(capabilities, 'window')!, 'fileOperations')!;
		value.didCreate = true;
	}

	public initialize(capabilities: proto.ServerCapabilities): void {
		let syncOptions = capabilities.window?.fileOperations;
		if (syncOptions?.didCreate?.globPattern !== undefined) {
			try {
				this.register({
					id: UUID.generateUuid(),
					registerOptions: { globPattern: syncOptions.didCreate.globPattern }
				});
			} catch (e) {
				this._client.warn(`Ignoring invalid glob pattern for didCreate registration: ${syncOptions.didCreate.globPattern}`);
			}
		}
	}

	public register(data: RegistrationData<proto.FileOperationRegistrationOptions>): void {
		if (!this._listener) {
			this._listener = code.workspace.onDidCreateFiles(this.send, this);
		}
		const regex = convert2RegExp(data.registerOptions.globPattern);
		if (!regex) {
			throw new Error(`Invalid pattern ${data.registerOptions.globPattern}!`);
		}
		this._globPatterns.set(data.id, regex);
	}

	public send(originalEvent: code.FileCreateEvent): void {
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
			const didCreateFiles = (event: code.FileCreateEvent) => {
				return this._client.sendRequest(proto.DidCreateFilesNotification.type,
					this._client.code2ProtocolConverter.asDidCreateFilesParams(event));
			};
			windowMiddleware?.didCreateFiles
				? windowMiddleware.didCreateFiles(filteredEvent, didCreateFiles)
				: didCreateFiles(filteredEvent);
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

export class DidRenameFilesFeature implements DynamicFeature<proto.FileOperationRegistrationOptions> {
	private _listener: code.Disposable | undefined;
	private _globPatterns: Map<string, RegExp> = new Map<string, RegExp>();

	constructor(private _client: BaseLanguageClient) {
	}

	public get registrationType(): proto.RegistrationType<proto.FileOperationRegistrationOptions> {
		return proto.DidRenameFilesNotification.type;
	}

	public fillClientCapabilities(capabilities: proto.ClientCapabilities): void {
		let value = ensure(ensure(capabilities, 'window')!, 'fileOperations')!;
		value.didRename = true;
	}

	public initialize(capabilities: proto.ServerCapabilities): void {
		let syncOptions = capabilities.window?.fileOperations;
		if (syncOptions?.didRename?.globPattern !== undefined) {
			try {
				this.register({
					id: UUID.generateUuid(),
					registerOptions: { globPattern: syncOptions.didRename.globPattern }
				});
			} catch (e) {
				this._client.warn(`Ignoring invalid glob pattern for didRename registration: ${syncOptions.didRename.globPattern}`);
			}
		}
	}

	public register(data: RegistrationData<proto.FileOperationRegistrationOptions>): void {
		if (!this._listener) {
			this._listener = code.workspace.onDidRenameFiles(this.send, this);
		}
		const regex = convert2RegExp(data.registerOptions.globPattern);
		if (!regex) {
			throw new Error(`Invalid pattern ${data.registerOptions.globPattern}!`);
		}
		this._globPatterns.set(data.id, regex);
	}

	public send(originalEvent: code.FileRenameEvent): void {
		// Create a copy of the event that has the files filtered to match what the
		// server wants.
		const filteredEvent = {
			...originalEvent,
			files: originalEvent.files.filter((uri) => {
				for (const pattern of this._globPatterns.values()) {
					if (pattern.test(uri.oldUri.path)) {
						return true;
					}
				}
				return false;
			}),
		};

		if (filteredEvent.files.length) {
			const windowMiddleware = this._client.clientOptions.middleware?.window;
			const didRenameFiles = (event: code.FileRenameEvent) => {
				return this._client.sendRequest(proto.DidRenameFilesNotification.type,
					this._client.code2ProtocolConverter.asDidRenameFilesParams(event));
			};
			windowMiddleware?.didRenameFiles
				? windowMiddleware.didRenameFiles(filteredEvent, didRenameFiles)
				: didRenameFiles(filteredEvent);
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

export class DidDeleteFilesFeature implements DynamicFeature<proto.FileOperationRegistrationOptions> {
	private _listener: code.Disposable | undefined;
	private _globPatterns: Map<string, RegExp> = new Map<string, RegExp>();

	constructor(private _client: BaseLanguageClient) {
	}

	public get registrationType(): proto.RegistrationType<proto.FileOperationRegistrationOptions> {
		return proto.DidDeleteFilesNotification.type;
	}

	public fillClientCapabilities(capabilities: proto.ClientCapabilities): void {
		let value = ensure(ensure(capabilities, 'window')!, 'fileOperations')!;
		value.didDelete = true;
	}

	public initialize(capabilities: proto.ServerCapabilities): void {
		let syncOptions = capabilities.window?.fileOperations;
		if (syncOptions?.didDelete?.globPattern !== undefined) {
			try {
				this.register({
					id: UUID.generateUuid(),
					registerOptions: { globPattern: syncOptions.didDelete.globPattern }
				});
			} catch (e) {
				this._client.warn(`Ignoring invalid glob pattern for didDelete registration: ${syncOptions.didDelete.globPattern}`);
			}
		}
	}

	public register(data: RegistrationData<proto.FileOperationRegistrationOptions>): void {
		if (!this._listener) {
			this._listener = code.workspace.onDidDeleteFiles(this.send, this);
		}
		const regex = convert2RegExp(data.registerOptions.globPattern);
		if (!regex) {
			throw new Error(`Invalid pattern ${data.registerOptions.globPattern}!`);
		}
		this._globPatterns.set(data.id, regex);
	}

	public send(originalEvent: code.FileDeleteEvent): void {
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
			const didDeleteFiles = (event: code.FileDeleteEvent) => {
				return this._client.sendRequest(proto.DidDeleteFilesNotification.type,
					this._client.code2ProtocolConverter.asDidDeleteFilesParams(event));
			};
			windowMiddleware?.didDeleteFiles
				? windowMiddleware.didDeleteFiles(filteredEvent, didDeleteFiles)
				: didDeleteFiles(filteredEvent);
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

export class WillRenameFilesFeature implements DynamicFeature<proto.FileOperationRegistrationOptions> {
	private _listener: code.Disposable | undefined;
	private _globPatterns: Map<string, RegExp> = new Map<string, RegExp>();

	constructor(private _client: BaseLanguageClient) {
	}

	public get registrationType(): proto.RegistrationType<proto.FileOperationRegistrationOptions> {
		return proto.WillRenameFilesRequest.type;
	}

	public fillClientCapabilities(capabilities: proto.ClientCapabilities): void {
		let value = ensure(ensure(capabilities, 'window')!, 'fileOperations')!;
		value.willRename = true;
	}

	public initialize(capabilities: proto.ServerCapabilities): void {
		let syncOptions = capabilities.window?.fileOperations;
		if (syncOptions?.willRename?.globPattern !== undefined) {
			try {
				this.register({
					id: UUID.generateUuid(),
					registerOptions: { globPattern: syncOptions.willRename.globPattern }
				});
			} catch (e) {
				this._client.warn(`Ignoring invalid glob pattern for willRename registration: ${syncOptions.willRename.globPattern}`);
			}
		}
	}

	public register(data: RegistrationData<proto.FileOperationRegistrationOptions>): void {
		if (!this._listener) {
			this._listener = code.workspace.onWillRenameFiles(this.send, this);
		}
		const regex = convert2RegExp(data.registerOptions.globPattern);
		if (!regex) {
			throw new Error(`Invalid pattern ${data.registerOptions.globPattern}!`);
		}
		this._globPatterns.set(data.id, regex);
	}

	public send(originalEvent: code.FileWillRenameEvent): void {
		// Create a copy of the event that has the files filtered to match what the
		// server wants.
		const filteredEvent = {
			...originalEvent,
			files: originalEvent.files.filter((uri) => {
				for (const pattern of this._globPatterns.values()) {
					if (pattern.test(uri.oldUri.path)) {
						return true;
					}
				}
				return false;
			}),
		};

		if (filteredEvent.files.length) {
			const windowMiddleware = this._client.clientOptions.middleware?.window;
			const willRenameFiles = (event: code.FileWillRenameEvent) => {
				return this._client.sendRequest(proto.WillRenameFilesRequest.type,
					this._client.code2ProtocolConverter.asWillRenameFilesParams(event))
					.then(this._client.protocol2CodeConverter.asWorkspaceEdit);
			};
			filteredEvent.waitUntil(
				windowMiddleware?.willRenameFiles
					? windowMiddleware.willRenameFiles(filteredEvent, willRenameFiles)
					: willRenameFiles(filteredEvent)
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

export class WillDeleteFilesFeature implements DynamicFeature<proto.FileOperationRegistrationOptions> {
	private _listener: code.Disposable | undefined;
	private _globPatterns: Map<string, RegExp> = new Map<string, RegExp>();

	constructor(private _client: BaseLanguageClient) {
	}

	public get registrationType(): proto.RegistrationType<proto.FileOperationRegistrationOptions> {
		return proto.WillDeleteFilesRequest.type;
	}

	public fillClientCapabilities(capabilities: proto.ClientCapabilities): void {
		let value = ensure(ensure(capabilities, 'window')!, 'fileOperations')!;
		value.willDelete = true;
	}

	public initialize(capabilities: proto.ServerCapabilities): void {
		let syncOptions = capabilities.window?.fileOperations;
		if (syncOptions?.willDelete?.globPattern !== undefined) {
			try {
				this.register({
					id: UUID.generateUuid(),
					registerOptions: { globPattern: syncOptions.willDelete.globPattern }
				});
			} catch (e) {
				this._client.warn(`Ignoring invalid glob pattern for willDelete registration: ${syncOptions.willDelete.globPattern}`);
			}
		}
	}

	public register(data: RegistrationData<proto.FileOperationRegistrationOptions>): void {
		if (!this._listener) {
			this._listener = code.workspace.onWillDeleteFiles(this.send, this);
		}
		const regex = convert2RegExp(data.registerOptions.globPattern);
		if (!regex) {
			throw new Error(`Invalid pattern ${data.registerOptions.globPattern}!`);
		}
		this._globPatterns.set(data.id, regex);
	}

	public send(originalEvent: code.FileWillDeleteEvent): void {
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
			const willDeleteFiles = (event: code.FileWillDeleteEvent) => {
				return this._client.sendRequest(proto.WillDeleteFilesRequest.type,
					this._client.code2ProtocolConverter.asWillDeleteFilesParams(event))
					.then(this._client.protocol2CodeConverter.asWorkspaceEdit);
			};
			filteredEvent.waitUntil(
				windowMiddleware?.willDeleteFiles
					? windowMiddleware.willDeleteFiles(filteredEvent, willDeleteFiles)
					: willDeleteFiles(filteredEvent)
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
