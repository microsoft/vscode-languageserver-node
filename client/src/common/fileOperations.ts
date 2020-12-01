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

function access<T, K extends keyof T>(target: T, key: K): T[K] {
	return target[key];
}

function assign<T, K extends keyof T>(target: T, key: K, value: T[K]): void {
	target[key] = value;
}

/**
 * Adds trailing slashes to URIs that represent directories if they
 * do not already have them.
 */
async function addSlashesToDirectories(uri: code.Uri) {
	if (uri.path.endsWith('/')) {
		return uri;
	}
	try {
		const stat = await code.workspace.fs.stat(uri);
		return stat.type == code.FileType.Directory ? code.Uri.parse(`${uri}/`) : uri;
	} catch (e) {
		// Assume non-existent paths are already correct.
		return uri;
	}
}

export interface FileOperationsMiddleware {
	didCreateFiles?: NextSignature<code.FileCreateEvent, void>;
	willCreateFiles?: NextSignature<code.FileWillCreateEvent, Thenable<code.WorkspaceEdit | null | undefined>>;
	didRenameFiles?: NextSignature<code.FileRenameEvent, void>;
	willRenameFiles?: NextSignature<code.FileWillRenameEvent, Thenable<code.WorkspaceEdit | null | undefined>>;
	didDeleteFiles?: NextSignature<code.FileDeleteEvent, void>;
	willDeleteFiles?: NextSignature<code.FileWillDeleteEvent, Thenable<code.WorkspaceEdit | null | undefined>>;
}

abstract class FileOperationFeature<I, E extends { readonly files: ReadonlyArray<I>; }> implements DynamicFeature<proto.FileOperationRegistrationOptions> {

	protected _client: BaseLanguageClient;
	private _event: code.Event<E>;
	private _registrationType: proto.RegistrationType<proto.FileOperationRegistrationOptions>;
	private _clientCapability: keyof proto.FileOperationClientCapabilities;
	private _serverCapability: keyof proto.FileOperationOptions;
	private _listener: code.Disposable | undefined;
	private _globPatterns: Map<string, RegExp> = new Map<string, RegExp>();
	protected fixSlashes: (e: E) => Promise<E>;

	constructor(client: BaseLanguageClient, event: code.Event<E>,
		registrationType: proto.RegistrationType<proto.FileOperationRegistrationOptions>,
		clientCapability: keyof proto.FileOperationClientCapabilities,
		serverCapability: keyof proto.FileOperationOptions,
		fixSlashes: (e: E) => Promise<E>)
	{
		this._client = client;
		this._event = event;
		this._registrationType = registrationType;
		this._clientCapability = clientCapability;
		this._serverCapability = serverCapability;
		this.fixSlashes = fixSlashes;
	}

	public get registrationType(): proto.RegistrationType<proto.FileOperationRegistrationOptions> {
		return this._registrationType;
	}

	public fillClientCapabilities(capabilities: proto.ClientCapabilities): void {
		const value = ensure(ensure(capabilities, 'workspace')!, 'fileOperations')!;
		// this happens n times but it is the same value so we tolerate this.
		assign(value, 'dynamicRegistration', true);
		assign(value, this._clientCapability, true);
	}


	public initialize(capabilities: proto.ServerCapabilities): void {
		const options = capabilities.workspace?.fileOperations;
		const capability = options !== undefined ? access(options, this._serverCapability) : undefined;
		if (capability?.globPattern !== undefined) {
			try {
				this.register({
					id: UUID.generateUuid(),
					registerOptions: { globPattern: capability.globPattern }
				});
			} catch (e) {
				this._client.warn(`Ignoring invalid glob pattern for ${this._serverCapability} registration: ${capability.globPattern}`);
			}
		}
	}

	public register(data: RegistrationData<proto.FileOperationRegistrationOptions>): void {
		if (!this._listener) {
			this._listener = this._event(this.send, this);
		}
		const regex = convert2RegExp(data.registerOptions.globPattern);
		if (!regex) {
			throw new Error(`Invalid pattern ${data.registerOptions.globPattern}!`);
		}
		this._globPatterns.set(data.id, regex);
	}

	public abstract send(data: E): Promise<void>;

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

	protected filter(event: E, prop: (i: I) => code.Uri): E {
		return {
			...event,
			files: event.files.filter((item) => {
				for (const pattern of this._globPatterns.values()) {
					if (pattern.test(prop(item).path)) {
						return true;
					}
				}
				return false;
			})
		};
	}
}

abstract class NotificationFileOperationFeature<I, E extends { readonly files: ReadonlyArray<I>; }, P> extends FileOperationFeature<I, E> {

	private _notificationType: proto.ProtocolNotificationType<P, proto.FileOperationRegistrationOptions>;
	private _accessUri: (i: I) => code.Uri;
	private _createParams: (e: E) => P;

	constructor(client: BaseLanguageClient, event: code.Event<E>,
		notificationType: proto.ProtocolNotificationType<P, proto.FileOperationRegistrationOptions>,
		clientCapability: keyof proto.FileOperationClientCapabilities,
		serverCapability: keyof proto.FileOperationOptions,
		accessUri: (i: I) => code.Uri,
		createParams: (e: E) => P,
		fixSlashes: (e: E) => Promise<E>)
	{
		super(client, event, notificationType, clientCapability, serverCapability, fixSlashes);
		this._notificationType = notificationType;
		this._accessUri = accessUri;
		this._createParams = createParams;
	}

	public async send(originalEvent: E): Promise<void> {
		const fixedEvent = await this.fixSlashes(originalEvent);
		// Create a copy of the event that has the files filtered to match what the
		// server wants.
		const filteredEvent = this.filter(fixedEvent, this._accessUri);
		if (filteredEvent.files.length) {
			const next = async (event: E): Promise<void> => {
				this._client.sendNotification(this._notificationType, this._createParams(event));
			};
			this.doSend(filteredEvent, next);
		}
	}

	protected abstract doSend(event: E, next: (event: E) => void): void;
}

export class DidCreateFilesFeature extends NotificationFileOperationFeature<code.Uri, code.FileCreateEvent, proto.CreateFilesParams> {

	constructor(client: BaseLanguageClient) {
		super(
			client, code.workspace.onDidCreateFiles, proto.DidCreateFilesNotification.type, 'didCreate', 'didCreate',
			(i: code.Uri) => i,
			client.code2ProtocolConverter.asDidCreateFilesParams,
			async (params) => ({ files: await Promise.all(params.files.map(addSlashesToDirectories)) })
		);
	}

	protected doSend(event: code.FileCreateEvent, next: (event: code.FileCreateEvent) => void): void {
		const middleware = this._client.clientOptions.middleware?.workspace;
		return middleware?.didCreateFiles
			? middleware.didCreateFiles(event, next)
			: next(event);
	}
}

export class DidRenameFilesFeature extends NotificationFileOperationFeature<{ oldUri: code.Uri, newUri: code.Uri }, code.FileRenameEvent, proto.RenameFilesParams> {

	constructor(client: BaseLanguageClient) {
		super(
			client, code.workspace.onDidRenameFiles, proto.DidRenameFilesNotification.type, 'didRename', 'didRename',
			(i: { oldUri: code.Uri, newUri: code.Uri }) => i.oldUri,
			client.code2ProtocolConverter.asDidRenameFilesParams,
			async (params) => ({ files: await Promise.all(params.files.map(async (i) => ({ oldUri: await addSlashesToDirectories(i.oldUri), newUri: await addSlashesToDirectories(i.newUri) }))) })
		);
	}

	protected doSend(event: code.FileRenameEvent, next: (event: code.FileRenameEvent) => void): void {
		const middleware = this._client.clientOptions.middleware?.workspace;
		return middleware?.didRenameFiles
			? middleware.didRenameFiles(event, next)
			: next(event);
	}
}

export class DidDeleteFilesFeature extends NotificationFileOperationFeature<code.Uri, code.FileDeleteEvent, proto.DeleteFilesParams> {

	constructor(client: BaseLanguageClient) {
		super(
			client, code.workspace.onDidDeleteFiles, proto.DidDeleteFilesNotification.type, 'didDelete', 'didDelete',
			(i: code.Uri) => i,
			client.code2ProtocolConverter.asDidDeleteFilesParams,
			async (params) => ({ files: await Promise.all(params.files.map(addSlashesToDirectories)) }),
		);
	}

	protected doSend(event: code.FileCreateEvent, next: (event: code.FileCreateEvent) => void): void {
		const middleware = this._client.clientOptions.middleware?.workspace;
		return middleware?.didDeleteFiles
			? middleware.didDeleteFiles(event, next)
			: next(event);
	}
}

interface RequestEvent<I> {
	readonly files: ReadonlyArray<I>;
	waitUntil(thenable: Thenable<code.WorkspaceEdit>): void;
	waitUntil(thenable: Thenable<any>): void;
}

abstract class RequestFileOperationFeature<I, E extends RequestEvent<I>, P> extends FileOperationFeature<I, E> {

	private _requestType: proto.ProtocolRequestType<P, proto.WorkspaceEdit | null, never, void, proto.FileOperationRegistrationOptions>;
	private _accessUri: (i: I) => code.Uri;
	private _createParams: (e: E) => P;

	constructor(client: BaseLanguageClient, event: code.Event<E>,
		requestType: proto.ProtocolRequestType<P, proto.WorkspaceEdit | null, never, void, proto.FileOperationRegistrationOptions>,
		clientCapability: keyof proto.FileOperationClientCapabilities,
		serverCapability: keyof proto.FileOperationOptions,
		accessUri: (i: I) => code.Uri,
		createParams: (e: E) => P,
		fixSlashes: (e: E) => Promise<E>)
	{
		super(client, event, requestType, clientCapability, serverCapability, fixSlashes);
		this._requestType = requestType;
		this._accessUri = accessUri;
		this._createParams = createParams;
	}

	public async send(originalEvent: E): Promise<void> {
		const fixedEvent = await this.fixSlashes(originalEvent);
		// Create a copy of the event that has the files filtered to match what the
		// server wants.
		const filteredEvent = this.filter(fixedEvent, this._accessUri);
		if (filteredEvent.files.length) {
			const next = async (event: E): Promise<code.WorkspaceEdit | any> => {
				return this._client.sendRequest(this._requestType, this._createParams(event)).then(this._client.protocol2CodeConverter.asWorkspaceEdit);
			};
			// TODO(dantup): This doesn't work - we cannot call waitUntil asynchronously...
			originalEvent.waitUntil(this.doSend(filteredEvent, next));
		}
	}

	protected abstract doSend(event: E, next: (event: E) => Thenable<code.WorkspaceEdit> | Thenable<any>): Thenable<code.WorkspaceEdit> | Thenable<any>;
}

export class WillCreateFilesFeature extends RequestFileOperationFeature<code.Uri, code.FileWillCreateEvent, proto.CreateFilesParams> {
	constructor(client: BaseLanguageClient) {
		super(
			client, code.workspace.onWillCreateFiles, proto.WillCreateFilesRequest.type, 'willCreate', 'willCreate',
			(i: code.Uri) => i,
			client.code2ProtocolConverter.asWillCreateFilesParams,
			async (params) => ({ files: await Promise.all(params.files.map(addSlashesToDirectories)), waitUntil: params.waitUntil }),
		);
	}

	protected doSend(event: code.FileWillCreateEvent, next: (event: code.FileWillCreateEvent) => Thenable<code.WorkspaceEdit> | Thenable<any>): Thenable<code.WorkspaceEdit> | Thenable<any> {
		const middleware = this._client.clientOptions.middleware?.workspace;
		return middleware?.willCreateFiles
			? middleware.willCreateFiles(event, next)
			: next(event);
	}
}

export class WillRenameFilesFeature extends RequestFileOperationFeature<{ oldUri: code.Uri, newUri: code.Uri }, code.FileWillRenameEvent, proto.RenameFilesParams> {
	constructor(client: BaseLanguageClient) {
		super(
			client, code.workspace.onWillRenameFiles, proto.WillRenameFilesRequest.type, 'willRename', 'willRename',
			(i: { oldUri: code.Uri, newUri: code.Uri }) => i.oldUri,
			client.code2ProtocolConverter.asWillRenameFilesParams,
			async (params) => {
				const files = await Promise.all(params.files.map(async (i) => ({ oldUri: await addSlashesToDirectories(i.oldUri), newUri: await addSlashesToDirectories(i.newUri) })))
				return { files, waitUntil: params.waitUntil }
			},
		);
	}

	protected doSend(event: code.FileWillRenameEvent, next: (event: code.FileWillRenameEvent) => Thenable<code.WorkspaceEdit> | Thenable<any>): Thenable<code.WorkspaceEdit> | Thenable<any> {
		const middleware = this._client.clientOptions.middleware?.workspace;
		return middleware?.willRenameFiles
			? middleware.willRenameFiles(event, next)
			: next(event);
	}
}

export class WillDeleteFilesFeature extends RequestFileOperationFeature<code.Uri, code.FileWillDeleteEvent, proto.DeleteFilesParams> {
	constructor(client: BaseLanguageClient) {
		super(
			client, code.workspace.onWillDeleteFiles, proto.WillDeleteFilesRequest.type, 'willDelete', 'willDelete',
			(i: code.Uri) => i,
			client.code2ProtocolConverter.asWillDeleteFilesParams,
			async (params) => ({ files: await Promise.all(params.files.map(addSlashesToDirectories)), waitUntil: params.waitUntil }),
		);
	}

	protected doSend(event: code.FileWillDeleteEvent, next: (event: code.FileWillDeleteEvent) => Thenable<code.WorkspaceEdit> | Thenable<any>): Thenable<code.WorkspaceEdit> | Thenable<any> {
		const middleware = this._client.clientOptions.middleware?.workspace;
		return middleware?.willDeleteFiles
			? middleware.willDeleteFiles(event, next)
			: next(event);
	}
}