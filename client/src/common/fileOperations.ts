/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as code from 'vscode';
import * as minimatch from 'minimatch';
import * as proto from 'vscode-languageserver-protocol';

import { DynamicFeature, BaseLanguageClient, RegistrationData, NextSignature } from './client';
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

export interface FileOperationsMiddleware {
	didCreateFiles?: NextSignature<code.FileCreateEvent, void>;
	willCreateFiles?: NextSignature<code.FileCreateEvent, Thenable<code.WorkspaceEdit | null | undefined>>;
	didRenameFiles?: NextSignature<code.FileRenameEvent, void>;
	willRenameFiles?: NextSignature<code.FileRenameEvent, Thenable<code.WorkspaceEdit | null | undefined>>;
	didDeleteFiles?: NextSignature<code.FileDeleteEvent, void>;
	willDeleteFiles?: NextSignature<code.FileDeleteEvent, Thenable<code.WorkspaceEdit | null | undefined>>;
}

interface Event<I> {
	readonly files: ReadonlyArray<I>;
}

abstract class FileOperationFeature<I, E extends Event<I>> implements DynamicFeature<proto.FileOperationRegistrationOptions> {

	protected _client: BaseLanguageClient;
	private _event: code.Event<E>;
	private _registrationType: proto.RegistrationType<proto.FileOperationRegistrationOptions>;
	private _clientCapability: keyof proto.FileOperationClientCapabilities;
	private _serverCapability: keyof proto.FileOperationOptions;
	private _listener: code.Disposable | undefined;
	private _globPatterns = new Map<string, Array<{ matcher: minimatch.IMinimatch, matchFiles: boolean, matchFolders: boolean }>>();

	constructor(client: BaseLanguageClient, event: code.Event<E>,
		registrationType: proto.RegistrationType<proto.FileOperationRegistrationOptions>,
		clientCapability: keyof proto.FileOperationClientCapabilities,
		serverCapability: keyof proto.FileOperationOptions) {
		this._client = client;
		this._event = event;
		this._registrationType = registrationType;
		this._clientCapability = clientCapability;
		this._serverCapability = serverCapability;
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
		if (capability?.patterns !== undefined) {
			try {
				this.register({
					id: UUID.generateUuid(),
					registerOptions: { patterns: capability.patterns }
				});
			} catch (e) {
				this._client.warn(`Ignoring invalid glob pattern for ${this._serverCapability} registration: ${e}`);
			}
		}
	}

	public register(data: RegistrationData<proto.FileOperationRegistrationOptions>): void {
		if (!this._listener) {
			this._listener = this._event(this.send, this);
		}
		const regexes = data.registerOptions.patterns.map((rule) => {
			const matcher = new minimatch.Minimatch(rule.glob);
			if (!matcher.makeRe()) {
				throw new Error(`Invalid pattern ${rule.glob}!`);
			}
			const matchFiles = !rule.matches || rule.matches === 'file';
			const matchFolders = !rule.matches || rule.matches === 'folder';
			return { matcher, matchFiles, matchFolders };
		});
		this._globPatterns.set(data.id, regexes);
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

	protected async filter(event: E, prop: (i: I) => code.Uri): Promise<E> {
		// (Asynchronously) map each file onto a boolean of whether it matches
		// any of the globs.
		const fileMatches = await Promise.all(event.files.map(async (item) => {
			const uri = prop(item);
			const fixedUri = await FileOperationFeature.addSlashesToFolderUris(uri);
			const path = fixedUri.path;
			const uriIsFolder = path.endsWith('/');
			for (const globs of this._globPatterns.values()) {
				for (const pattern of globs) {
					const shouldTest = (uriIsFolder && pattern.matchFolders) || (!uriIsFolder && pattern.matchFiles);
					if (shouldTest && pattern.matcher.match(path)) {
						return true;
					}
				}
			}
			return false;
		}));

		// Filter the files to those that matched.
		const files = event.files.filter((_, index) => fileMatches[index]);

		return { ...event, files };
	}

	/**
	* Adds trailing slashes to URIs that represent directories if they
	* do not already have them.
	*/
	private static async addSlashesToFolderUris(uri: code.Uri): Promise<code.Uri> {
		if (uri.path.endsWith('/')) {
			return uri;
		}
		try {
			const stat = await code.workspace.fs.stat(uri);
			return stat.type === code.FileType.Directory ? code.Uri.parse(`${uri}/`) : uri;
		} catch (e) {
			// Assume non-existent paths are already correct.
			return uri;
		}
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
		createParams: (e: E) => P)
	{
		super(client, event, notificationType, clientCapability, serverCapability);
		this._notificationType = notificationType;
		this._accessUri = accessUri;
		this._createParams = createParams;
	}

	public async send(originalEvent: E): Promise<void> {
		// Create a copy of the event that has the files filtered to match what the
		// server wants.
		const filteredEvent = await this.filter(originalEvent, this._accessUri);
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
	private _createParams: (e: Event<I>) => P;

	constructor(client: BaseLanguageClient, event: code.Event<E>,
		requestType: proto.ProtocolRequestType<P, proto.WorkspaceEdit | null, never, void, proto.FileOperationRegistrationOptions>,
		clientCapability: keyof proto.FileOperationClientCapabilities,
		serverCapability: keyof proto.FileOperationOptions,
		accessUri: (i: I) => code.Uri,
		createParams: (e: Event<I>) => P)
	{
		super(client, event, requestType, clientCapability, serverCapability);
		this._requestType = requestType;
		this._accessUri = accessUri;
		this._createParams = createParams;
	}

	public async send(originalEvent: E & RequestEvent<I>): Promise<void> {
		const waitUntil = this.waitUntil(originalEvent);
		originalEvent.waitUntil(waitUntil);
	}

	private async waitUntil(originalEvent: E): Promise<code.WorkspaceEdit | null | undefined> {
		// Create a copy of the event that has the files filtered to match what the
		// server wants.
		const filteredEvent = await this.filter(originalEvent, this._accessUri);

		if (filteredEvent.files.length) {
			const next = (event: Event<I>): Promise<code.WorkspaceEdit | any> => {
				return this._client.sendRequest(this._requestType, this._createParams(event))
					.then(this._client.protocol2CodeConverter.asWorkspaceEdit);
			};
			return this.doSend(filteredEvent, next);
		} else {
			return undefined;
		}
	}

	protected abstract doSend(event: E, next: (event: Event<I>) => Thenable<code.WorkspaceEdit> | Thenable<any>): Thenable<code.WorkspaceEdit> | Thenable<any>;
}

export class WillCreateFilesFeature extends RequestFileOperationFeature<code.Uri, code.FileWillCreateEvent, proto.CreateFilesParams> {
	constructor(client: BaseLanguageClient) {
		super(
			client, code.workspace.onWillCreateFiles, proto.WillCreateFilesRequest.type, 'willCreate', 'willCreate',
			(i: code.Uri) => i,
			client.code2ProtocolConverter.asWillCreateFilesParams,
		);
	}

	protected doSend(event: code.FileWillCreateEvent, next: (event: code.FileCreateEvent) => Thenable<code.WorkspaceEdit> | Thenable<any>): Thenable<code.WorkspaceEdit> | Thenable<any> {
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
		);
	}

	protected doSend(event: code.FileWillRenameEvent, next: (event: code.FileRenameEvent) => Thenable<code.WorkspaceEdit> | Thenable<any>): Thenable<code.WorkspaceEdit> | Thenable<any> {
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
		);
	}

	protected doSend(event: code.FileWillDeleteEvent, next: (event: code.FileDeleteEvent) => Thenable<code.WorkspaceEdit> | Thenable<any>): Thenable<code.WorkspaceEdit> | Thenable<any> {
		const middleware = this._client.clientOptions.middleware?.workspace;
		return middleware?.willDeleteFiles
			? middleware.willDeleteFiles(event, next)
			: next(event);
	}
}