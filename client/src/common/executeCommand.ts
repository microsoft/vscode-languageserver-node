/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	commands as Commands, Disposable, ProviderResult
} from 'vscode';

import {
	ClientCapabilities, ServerCapabilities, ExecuteCommandRegistrationOptions, RegistrationType, ExecuteCommandRequest, ExecuteCommandParams
} from 'vscode-languageserver-protocol';

import * as UUID from './utils/uuid';

import { FeatureClient, ensure, DynamicFeature, FeatureState, RegistrationData } from './features';


export interface ExecuteCommandSignature {
	(this: void, command: string, args: any[]): ProviderResult<any>;
}

export interface ExecuteCommandMiddleware {
	executeCommand?: (this: void, command: string, args: any[], next: ExecuteCommandSignature) => ProviderResult<any>;
}

export class ExecuteCommandFeature implements DynamicFeature<ExecuteCommandRegistrationOptions> {

	private readonly _client: FeatureClient<ExecuteCommandMiddleware>;
	private readonly _commands: Map<string, Disposable[]>;

	constructor(client: FeatureClient<ExecuteCommandMiddleware>) {
		this._client = client;
		this._commands = new Map();
	}

	public getState(): FeatureState {
		return { kind: 'workspace', id: this.registrationType.method, registrations: this._commands.size > 0 };
	}

	public get registrationType(): RegistrationType<ExecuteCommandRegistrationOptions> {
		return ExecuteCommandRequest.type;
	}

	public fillClientCapabilities(capabilities: ClientCapabilities): void {
		ensure(ensure(capabilities, 'workspace')!, 'executeCommand')!.dynamicRegistration = true;
	}

	public initialize(capabilities: ServerCapabilities): void {
		if (!capabilities.executeCommandProvider) {
			return;
		}
		this.register({
			id: UUID.generateUuid(),
			registerOptions: Object.assign({}, capabilities.executeCommandProvider)
		});
	}

	public register(data: RegistrationData<ExecuteCommandRegistrationOptions>): void {
		const client = this._client;
		const middleware = client.middleware;
		const executeCommand: ExecuteCommandSignature = (command: string, args: any[]): any => {
			let params: ExecuteCommandParams = {
				command,
				arguments: args
			};
			return client.sendRequest(ExecuteCommandRequest.type, params).then(
				undefined,
				(error) => {
					return client.handleFailedRequest(ExecuteCommandRequest.type, undefined, error, undefined);
				}
			);
		};

		if (data.registerOptions.commands) {
			const disposables: Disposable[] = [];
			for (const command of data.registerOptions.commands) {
				disposables.push(Commands.registerCommand(command, (...args: any[]) => {
					return middleware.executeCommand
						? middleware.executeCommand(command, args, executeCommand)
						: executeCommand(command, args);
				}));
			}
			this._commands.set(data.id, disposables);
		}
	}

	public unregister(id: string): void {
		let disposables = this._commands.get(id);
		if (disposables) {
			disposables.forEach(disposable => disposable.dispose());
		}
	}

	public dispose(): void {
		this._commands.forEach((value) => {
			value.forEach(disposable => disposable.dispose());
		});
		this._commands.clear();
	}
}