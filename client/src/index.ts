/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { workspace, window, languages, extensions, TextDocumentChangeEvent, TextDocument, Disposable } from 'vscode';

import { Response, IRequestHandler, INotificationHandler, MessageConnection, ServerMessageConnection, ILogger, createClientMessageConnection, ErrorCodes, ErrorInfo } from 'vscode-jsonrpc';
import {
		InitializeRequest, InitializeParams, InitializeResult, InitializeError, HostCapabilities, ServerCapabilities,
		ShutdownRequest, ShutdownParams,
		ExitNotification, ExitParams,
		LogMessageNotification, LogMessageParams, MessageType,
		ShowMessageNotification, ShowMessageParams,
		DidChangeConfigurationNotification, DidChangeConfigurationParams,
		DidOpenTextDocumentNotification, DidOpenTextDocumentParams, DidChangeTextDocumentNotification, DidChangeTextDocumentParams, DidCloseTextDocumentNotification, DidCloseTextDocumentParams,
		DidChangeFilesNotification, DidChangeFilesParams, FileEvent, FileChangeType,
		PublishDiagnosticsNotification, PublishDiagnosticsParams, Diagnostic, Severity, Position
	} from './protocol';

import { asOpenTextDocumentParams, asChangeTextDocumentParams, asCloseTextDocumentParams, asDiagnostics } from './converters';

export interface IConnection {

	initialize(params: InitializeParams): Thenable<InitializeResult>;
	shutdown(params: ShutdownParams): Thenable<void>;
	exit(params: ExitParams): void;

	onLogMessage(handle: INotificationHandler<LogMessageParams>): void;
	onShowMessage(handler: INotificationHandler<ShowMessageParams>): void;

	didChangeConfiguration(params: DidChangeConfigurationParams): void;
	didChangeFiles(params: DidChangeFilesParams): void;

	didOpenTextDocument(params: DidOpenTextDocumentParams): void;
	didChangeTextDocument(params: DidChangeTextDocumentParams): void;
	didCloseTextDocument(params: DidCloseTextDocumentParams): void;
	onDiagnostics(handler: INotificationHandler<PublishDiagnosticsParams>): void;

	dispose(): void;
}

class Logger implements ILogger {
	public error(message: string): void {
		console.error(message);
	}
	public warn(message: string): void {
		console.warn(message);
	}
	public info(message: string): void {
		console.info(message);
	}
	public log(message: string): void {
		console.log(message);
	}
}

export function createConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream): IConnection {
	let logger = new Logger();
	let connection = createClientMessageConnection(inputStream, outputStream, logger);
	let result: IConnection = {
		initialize: (params: InitializeParams) => connection.sendRequest(InitializeRequest.type, params),
		shutdown: (params: ShutdownParams) => connection.sendRequest(ShutdownRequest.type, params),
		exit: (params: ExitParams) => connection.sendNotification(ExitNotification.type, params),

		onLogMessage: (handler: INotificationHandler<LogMessageParams>) => connection.onNotification(LogMessageNotification.type, handler),
		onShowMessage: (handler: INotificationHandler<ShowMessageParams>) => connection.onNotification(ShowMessageNotification.type, handler),

		didChangeConfiguration: (params: DidChangeConfigurationParams) => connection.sendNotification(DidChangeConfigurationNotification.type, params),
		didChangeFiles: (params: DidChangeFilesParams) => connection.sendNotification(DidChangeFilesNotification.type, params),

		didOpenTextDocument: (params: DidOpenTextDocumentParams) => connection.sendNotification(DidOpenTextDocumentNotification.type, params),
		didChangeTextDocument: (params: DidChangeTextDocumentParams) => connection.sendNotification(DidChangeTextDocumentNotification.type, params),
		didCloseTextDocument: (params: DidCloseTextDocumentParams) => connection.sendNotification(DidCloseTextDocumentNotification.type, params),
		onDiagnostics: (handler: INotificationHandler<PublishDiagnosticsParams>) => connection.onNotification(PublishDiagnosticsNotification.type, handler),

		dispose: () => connection.dispose()
	}

	return result;
}

export interface ValidationCustomization {
	syncTextDocument(textDocument: TextDocument): boolean;
}

export class ValidationClient {

	private customization: ValidationCustomization;

	private connection: IConnection;
	private capabilites: ServerCapabilities;

	private disposables: Disposable[];
	private diagnostics: { [uri: string]: Disposable };

	public constructor(customization: ValidationCustomization) {
		this.customization = customization;
		this.disposables = [];
		this.diagnostics = Object.create(null);
	}

	private start(): void {
		this.connection.onDiagnostics(params => this.handleDiagnostics(params));
		this.initialize().then(() => {
			extensions.onDidChangeConfiguration(this.onDidChangeConfiguration, this, this.disposables);
			workspace.onDidOpenTextDocument(this.onDidOpenTextDoument, this, this.disposables);
			workspace.onDidChangeTextDocument(this.onDidChangeTextDocument, this, this.disposables);
			workspace.onDidCloseTextDocument(this.onDidCloseTextDoument, this, this.disposables);
		}, (error: ErrorInfo<InitializeError>) => {
			window.showErrorMessage(error.message).then(() => {
				// REtry initialize
			});
		});
	}

	private initialize(): Thenable<InitializeResult> {
		let initParams: InitializeParams = { rootFolder: workspace.getPath(), capabilities: { } };
		return this.connection.initialize(initParams).then((result) => {
			this.capabilites = result.capabilities;
			return result;
		});
	}

	private onDidChangeConfiguration(event): void {
	}

	private onDidOpenTextDoument(textDocument: TextDocument): void {
		if (!this.customization.syncTextDocument(textDocument)) {
			return;
		}

		this.connection.didOpenTextDocument(asOpenTextDocumentParams(textDocument));
	}

	private onDidChangeTextDocument(event: TextDocumentChangeEvent): void {
		if (!this.customization.syncTextDocument(event.document)) {
			return;
		}
		let uri: string = event.document.getUri().toString();
		if (this.capabilites.incrementalTextDocumentSync) {
			asChangeTextDocumentParams(event).forEach(param => this.connection.didChangeTextDocument(param));
		} else {
			this.connection.didChangeTextDocument(asChangeTextDocumentParams(event.document));
		}
	}

	private onDidCloseTextDoument(textDocument: TextDocument): void {
		if (!this.customization.syncTextDocument(textDocument)) {
			return;
		}
		this.connection.didCloseTextDocument(asCloseTextDocumentParams(textDocument));
	}

	private handleDiagnostics(params: PublishDiagnosticsParams) {
		let diagnostics = asDiagnostics(params);
		languages.addDiagnostics(diagnostics);
	}
}