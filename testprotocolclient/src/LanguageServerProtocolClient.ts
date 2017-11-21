/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import fs = require('fs');
import cp = require('child_process');
import ChildProcess = cp.ChildProcess;
import assert = require('assert');
import net = require('net');

import {
		Message,
		RequestHandler, NotificationHandler, MessageConnection, ClientMessageConnection, Logger, createClientMessageConnection,
		ErrorCodes, ResponseError, RequestType, NotificationType,
		MessageReader, IPCMessageReader, MessageWriter, IPCMessageWriter, Trace, Tracer, Event, Emitter
} from 'vscode-jsonrpc';

import {
		TextDocument, TextDocumentChangeEvent, TextDocumentContentChangeEvent,
		Range, Position, Location, Diagnostic, DiagnosticSeverity, Command,
		TextEdit, WorkspaceEdit, WorkspaceChange, TextEditChange,
		TextDocumentIdentifier, VersionedTextDocumentIdentifier, TextDocumentItem,
		CompletionItemKind, CompletionItem, CompletionList,
		Hover, MarkedString,
		SignatureHelp, SignatureInformation, ParameterInformation,
		Definition, ReferenceContext,
		DocumentHighlight, DocumentHighlightKind,
		SymbolInformation, SymbolKind,
		CodeLens, CodeActionContext,
		FormattingOptions,
	} from 'vscode-languageserver-types';

import {
		InitializeRequest, InitializeParams, InitializeResult, InitializeError, ClientCapabilities, ServerCapabilities, TextDocumentSyncKind,
		ShutdownRequest,
		ExitNotification,
		LogMessageNotification, LogMessageParams, MessageType,
		ShowMessageNotification, ShowMessageParams, ShowMessageRequest, ShowMessageRequestParams,
		TelemetryEventNotification,
		DidChangeConfigurationNotification, DidChangeConfigurationParams,
		TextDocumentPositionParams, 
		DidOpenTextDocumentNotification, DidOpenTextDocumentParams, DidChangeTextDocumentNotification, DidChangeTextDocumentParams,
		DidCloseTextDocumentNotification, DidCloseTextDocumentParams, DidSaveTextDocumentNotification, DidSaveTextDocumentParams,
		DidChangeWatchedFilesNotification, DidChangeWatchedFilesParams, FileEvent, FileChangeType,
		PublishDiagnosticsNotification, PublishDiagnosticsParams, 
		CompletionRequest, CompletionResolveRequest, 
		HoverRequest, 
		SignatureHelpRequest, DefinitionRequest, ReferencesRequest, DocumentHighlightRequest, 
		DocumentSymbolRequest, WorkspaceSymbolRequest, WorkspaceSymbolParams,
		CodeActionRequest, CodeActionParams,
		CodeLensRequest, CodeLensResolveRequest, 
		DocumentFormattingRequest, DocumentFormattingParams, DocumentRangeFormattingRequest, DocumentRangeFormattingParams,
		DocumentOnTypeFormattingRequest, DocumentOnTypeFormattingParams,
		RenameRequest, RenameParams
} from './protocol';

import * as is from './utils/is';
import * as electron from './utils/electron';
import { terminate } from './utils/processes';
import { Delayer } from './utils/async'

declare var v8debug;

export interface IConnection {

	listen(): void;

	sendRequest<P, R, E>(type: RequestType<P, R, E>, params: P): Thenable<R>;
	sendNotification<P>(type: NotificationType<P>, params: P): void;
	onNotification<P>(type: NotificationType<P>, handler: NotificationHandler<P>): void;
	onRequest<P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): void;
	trace(value: Trace, tracer: Tracer): void;

	initialize(params: InitializeParams): Thenable<InitializeResult>;
	shutdown(): Thenable<void>;
	exit(): void;

	onLogMessage(handle: NotificationHandler<LogMessageParams>): void;
	onShowMessage(handler: NotificationHandler<ShowMessageParams>): void;
	onTelemetry(handler: NotificationHandler<any>): void;

	didChangeConfiguration(params: DidChangeConfigurationParams): void;
	didChangeWatchedFiles(params: DidChangeWatchedFilesParams): void;

	didOpenTextDocument(params: DidOpenTextDocumentParams): void;
	didChangeTextDocument(params: DidChangeTextDocumentParams): void;
	didCloseTextDocument(params: DidCloseTextDocumentParams): void;
	didSaveTextDocument(params: DidSaveTextDocumentParams): void;
	onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>): void;

	dispose(): void;
}

class ConsoleLogger implements Logger {
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

export interface ConnectionErrorHandler {
	(error: Error, message: Message, count: number): void;
}

export interface ConnectionCloseHandler {
	(): void;
}

export function createConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, errorHandler: ConnectionErrorHandler, closeHandler: ConnectionCloseHandler): IConnection;
export function createConnection(reader: MessageReader, writer: MessageWriter, errorHandler: ConnectionErrorHandler, closeHandler: ConnectionCloseHandler): IConnection;

export function createConnection(input: any, output: any, errorHandler: ConnectionErrorHandler, closeHandler: ConnectionCloseHandler): IConnection {
	let logger = new ConsoleLogger();
	let connection = createClientMessageConnection(input, output, logger);
	connection.onError((data) => { console.log("connection error"); errorHandler(data[0], data[1], data[2])});
	connection.onClose(closeHandler);
	let result: IConnection = {

		listen: (): void => connection.listen(),

		sendRequest: <P, R, E>(type: RequestType<P, R, E>, params: P): Thenable<R> => connection.sendRequest(type, params),
		sendNotification: <P>(type: NotificationType<P>, params: P): void => connection.sendNotification(type, params),
		onNotification: <P>(type: NotificationType<P>, handler: NotificationHandler<P>): void => connection.onNotification(type, handler),
		onRequest: <P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): void => connection.onRequest(type, handler),

		trace: (value: Trace, tracer: Tracer): void => connection.trace(value, tracer),

		initialize: (params: InitializeParams) => connection.sendRequest(InitializeRequest.type, params),
		shutdown: () => connection.sendRequest(ShutdownRequest.type, undefined),
		exit: () => connection.sendNotification(ExitNotification.type),

		onLogMessage: (handler: NotificationHandler<LogMessageParams>) => connection.onNotification(LogMessageNotification.type, handler),
		onShowMessage: (handler: NotificationHandler<ShowMessageParams>) => connection.onNotification(ShowMessageNotification.type, handler),
		onTelemetry: (handler: NotificationHandler<any>) => connection.onNotification(TelemetryEventNotification.type, handler),

		didChangeConfiguration: (params: DidChangeConfigurationParams) => connection.sendNotification(DidChangeConfigurationNotification.type, params),
		didChangeWatchedFiles: (params: DidChangeWatchedFilesParams) => connection.sendNotification(DidChangeWatchedFilesNotification.type, params),

		didOpenTextDocument: (params: DidOpenTextDocumentParams) => connection.sendNotification(DidOpenTextDocumentNotification.type, params),
		didChangeTextDocument: (params: DidChangeTextDocumentParams  | DidChangeTextDocumentParams[]) => connection.sendNotification(DidChangeTextDocumentNotification.type, params),
		didCloseTextDocument: (params: DidCloseTextDocumentParams) => connection.sendNotification(DidCloseTextDocumentNotification.type, params),
		didSaveTextDocument: (params: DidSaveTextDocumentParams) => connection.sendNotification(DidSaveTextDocumentNotification.type, params),
		onDiagnostics: (handler: NotificationHandler<PublishDiagnosticsParams>) => connection.onNotification(PublishDiagnosticsNotification.type, handler),

		dispose: () => connection.dispose()
	}

	return result;
}

export interface StreamInfo {
	writer: NodeJS.WritableStream;
	reader: NodeJS.ReadableStream;
}

export interface ExecutableOptions {
	cwd?: string;
	stdio?: string | string[];
	env?: any;
	detached?: boolean;
}

export interface Executable {
	command: string;
	args?: string[];
	options?: ExecutableOptions;
}

export interface ForkOptions {
	cwd?: string;
	env?: any;
	encoding?: string;
	execArgv?: string[];
}

export enum TransportKind {
	stdio,
	ipc
}

export interface NodeModule {
	module: string;
	transport?: TransportKind;
	args?: string[];
	runtime?: string;
	options?: ForkOptions;
}

export type ServerOptions = Executable | { run: Executable; debug: Executable; } |  { run: NodeModule; debug: NodeModule } | NodeModule | (() => Thenable<ChildProcess | StreamInfo>);

/**
 * An action to be performed when the connection is producing errors.
 */
export enum ErrorAction {
	/**
	 * Continue running the server.
	 */
	Continue = 1,
	/**
	 * Shutdown the server.
	 */
	Shutdown = 2
}

/**
 * An action to be performed when the connection to a server got closed.
 */
export enum CloseAction {
	/**
	 * Don't restart the server. The connection stays closed.
	 */
	DoNotRestart = 1,
	/**
	 * Restart the server.
	 */
	Restart = 2,
}

enum ClientState {
	Initial,
	Starting,
	Running,
	Stopping,
	Stopped
}

export class LanguageServerProtocolClient {

    private _name: string;
	private _serverOptions: ServerOptions;
	private _forceDebug: boolean;

	private _state: ClientState;
	private _onReady: Promise<void>;
	private _onReadyCallbacks: { resolve: () => void; reject: () => void; };
	private _connection: Thenable<IConnection>;
	private _childProcess: ChildProcess;
	private _capabilites: ServerCapabilities;

	private _fileEvents: FileEvent[];
	private _fileEventDelayer: Delayer<void>;

	private _telemetryEmitter: Emitter<any>;

	private _trace: Trace;
	private _tracer: Tracer;

    private static CASE_INSENSITIVE_FILESYSTEM : boolean;
	private _runtime: string;
	private _langServerExecutable: string;
	private _langServerProcess: cp.ChildProcess;
	private _enableStderr: boolean;
	//private _debugType: string;
    private _rootFolder : string;
	private _socket: net.Socket;

	private _supportsConfigurationDoneRequest: boolean;

	public defaultTimeout = 5000;

   /**
	 * Creates a LanguageServerProtocolClient object that provides a promise-based API to write
	 * language server tests.
	 */

    // serverOptions, clientOptions as input -> extensibility mechanism
	constructor(name: string, langserverexecutable: string, serverOptions: ServerOptions, rootFolder: string, forceDebug: boolean = false) {
        this._serverOptions = serverOptions;
		this._langServerExecutable = langserverexecutable;
		this._enableStderr = false;
		this._rootFolder = rootFolder;
		this._supportsConfigurationDoneRequest = false;

		if (LanguageServerProtocolClient.CASE_INSENSITIVE_FILESYSTEM === undefined) {
			try {
				fs.accessSync(process.execPath.toLowerCase(), fs.F_OK);
				fs.accessSync(process.execPath.toUpperCase(), fs.F_OK);
				LanguageServerProtocolClient.CASE_INSENSITIVE_FILESYSTEM = true;
			} catch (err) {
				LanguageServerProtocolClient.CASE_INSENSITIVE_FILESYSTEM = false;
			}
		}

        this._name = name;
		this._state = ClientState.Initial;
		this._connection = null;
		this._childProcess = null;
        this._forceDebug = forceDebug;

		this._fileEvents = [];
		this._fileEventDelayer = new Delayer<void>(250);
		this._onReady = new Promise<void>((resolve, reject) => {
			this._onReadyCallbacks = { resolve, reject };
		});
		this._onReady.then(() => {
            }, () => {
			// Do nothing for now. We shut down after the initialize.
			// However to make the promise reject handler happy we register
			// an empty callback.
		});
		this._telemetryEmitter = new Emitter<any>();
		this._tracer = {
			log: (message: string) => {
                console.log(message);
			}
		};
	}

    public start() : Promise<void> {
        return new Promise<void>((resolve, reject) => {
		    this._state = ClientState.Starting;
		    this.resolveConnection().then((connection) => {
			    connection.onLogMessage((message) => {
				    switch(message.type) {
					    case MessageType.Error:
						    console.error(message.message);
						    break;
					    case MessageType.Warning:
						    console.warn(message.message);
						    break;
					    case MessageType.Info:
						    console.info(message.message);
						    break;
					    default:
						    console.log(message.message);
				    }
			    });
			    connection.onShowMessage((message) => {
				    switch(message.type) {
					    case MessageType.Error:
                            console.error(message.message);
						    break;
					    case MessageType.Warning:
                            console.warn(message.message);
						    break;
					    case MessageType.Info:
                            console.info(message.message);
						    break;
					    default:
                            console.log(message.message);
				    }
			    });
                /*
			    connection.onRequest(ShowMessageRequest.type, (params) => {
				    let messageFunc: <T extends MessageItem>(message: string, ...items: T[]) => Thenable<T> = null;
				    switch(params.type) {
					    case MessageType.Error:
						    messageFunc = Window.showErrorMessage;
						    break;
					    case MessageType.Warning:
						    messageFunc = Window.showWarningMessage;
						    break;
					    case MessageType.Info:
						    messageFunc = Window.showInformationMessage;
						    break;
					    default:
						    messageFunc = Window.showInformationMessage;
				    }
				    return messageFunc(params.message, ...params.actions);
			    });*/


			    connection.listen();
                let initParams: InitializeParams = { processId: process.pid, rootPath: this._rootFolder, capabilities: { }, initializationOptions: {"clang_format_path":null}};                
			    this.initialize(connection, initParams);
                resolve();
		    }, (error) => {
			    this._onReadyCallbacks.reject();
			    console.error(`Couldn't start client ${this._name}`);
                reject();
		    });
        });
	}


    private resolveConnection(): Thenable<IConnection> {
		if (!this._connection) {
			this._connection = this.createConnection();
		}
		return this._connection;
	}

    private createConnection(): Thenable<IConnection> {
		function getEnvironment(env: any): any {
			if (!env) {
				return process.env;
			}
			let result: any = Object.create(null);
			Object.keys(process.env).forEach(key => result[key] = process.env[key]);
			Object.keys(env).forEach(key => result[key] = env[key]);
		}

		let errorHandler = (error: Error, message: Message, count: number) => {
			this.handleConnectionError(error, message, count);
		}

		let closeHandler = () => {
			this.handleConnectionClosed();
		}

		let server = this._serverOptions;
		// We got a function.
		if (is.func(server)) {
			return server().then((result) => {
				let info = result as StreamInfo;
				if (info.writer && info.reader) {
					return createConnection(info.reader, info.writer, errorHandler, closeHandler);
				} else {
					let cp = result as ChildProcess;
					return createConnection(cp.stdout, cp.stdin, errorHandler, closeHandler);
				}
			});
		}
		let json: { command?: string; module?: string } = null;
		let runDebug= <{ run: any; debug: any;}>server;
		if (is.defined(runDebug.run) || is.defined(runDebug.debug)) {
			// We are under debugging. So use debug as well.
			if (typeof v8debug === 'object' || this._forceDebug) {
				json = runDebug.debug;
			} else {
				json = runDebug.run;
			}
		} else {
			json = server;
		}
		if (is.defined(json.module)) {
			let node: NodeModule = <NodeModule>json;
			if (node.runtime) {
				let args: string[] = [];
				let options: ForkOptions = node.options || Object.create(null);
				if (options.execArgv) {
					options.execArgv.forEach(element => args.push(element));
				}
				args.push(node.module);
				if (node.args) {
					node.args.forEach(element => args.push(element));
				}
				let execOptions: ExecutableOptions = Object.create(null);
				execOptions.cwd = options.cwd || this._rootFolder;
				execOptions.env = getEnvironment(options.env);
				if (node.transport === TransportKind.ipc) {
					execOptions.stdio = [null, null, null, 'ipc'];
				}
				let process = cp.spawn(node.runtime, args, execOptions);
				if (!process || !process.pid) {
					return Promise.reject<IConnection>(`Launching server using runtime ${node.runtime} failed.`);
				}
				this._childProcess = process;
				// A spawned process doesn't have ipc transport even if we spawn node. For now always use stdio communication.
				if (node.transport === TransportKind.ipc) {
					process.stdout.on('data', data => console.log(data.toString()));
					process.stderr.on('data', data => console.log(data.toString()));
					return Promise.resolve(createConnection(new IPCMessageReader(process), new IPCMessageWriter(process), errorHandler, closeHandler));
				} else {
					return Promise.resolve(createConnection(process.stdout, process.stdin, errorHandler, closeHandler));
				}
			} else {
				return new Promise<IConnection>((resolve, reject) => {
					let options: ForkOptions = node.options || Object.create(null);
					options.execArgv = options.execArgv || [];
					options.cwd = options.cwd || this._rootFolder;
					electron.fork(node.module, node.args || [], options, (error, cp) => {
						if (error) {
							reject(error);
						} else {
							this._childProcess = cp;
							if (node.transport === TransportKind.ipc) {
								cp.stdout.on('data', (data) => {
									console.log(data.toString());
								});
								resolve(createConnection(new IPCMessageReader(this._childProcess), new IPCMessageWriter(this._childProcess), errorHandler, closeHandler));
							} else {
								resolve(createConnection(cp.stdout, cp.stdin, errorHandler, closeHandler));
							}
						}
					});
				});
			}
		} else if (is.defined(json.command)) {
			let command: Executable = <Executable>json;
			let options = command.options || {};
			options.cwd = options.cwd || this._rootFolder;
			let process = cp.spawn(command.command, command.args, command.options);
			this._childProcess = process;
			return Promise.resolve(createConnection(process.stdout, process.stdin, errorHandler, closeHandler));
		}
		return Promise.reject<IConnection>(new Error(`Unsupported server configuartion ` + JSON.stringify(server, null, 4)));
	}

    private handleConnectionClosed() {
		// Check whether this is a normal shutdown in progress or the client stopped normally.
		if (this._state === ClientState.Stopping || this._state === ClientState.Stopped) {
			return;
		}
		this._connection = null;
		this._childProcess = null;

        this._state = ClientState.Stopped;
        this.cleanUp();
	}

	private handleConnectionError(error: Error, message: Message, count: number) {

		this.logTrace('Connection to server is erroring. Shutting down server.')
		this.stop();

	}

    public stop() {
		if (!this._connection) {
			this._state = ClientState.Stopped;
			return;
		}
		this._state = ClientState.Stopping;
		this.cleanUp();
		// unkook listeners
		this.resolveConnection().then(connection => {
			connection.shutdown().then(() => {
				connection.exit();
				connection.dispose();
				this._state = ClientState.Stopped;
				this._connection = null;
				let toCheck = this._childProcess;
				this._childProcess = null;
				// Remove all markers
				this.checkProcessDied(toCheck);
			})
		});
	}

    public sendRequest<P, R, E>(type: RequestType<P, R, E>, params: P): Thenable<R> {
		return this.onReady().then(() => {
			return this.resolveConnection().then((connection) => {
				return this.doSendRequest(connection, type, params);
			});
		});
	}

	private doSendRequest<P, R, E>(connection: IConnection, type: RequestType<P, R, E>, params: P): Thenable<R> {
		if (this.isConnectionActive()) {
			return connection.sendRequest(type, params);
		} else {
            console.log("connection.sendRequest failed");
			return Promise.reject<R>(new ResponseError(ErrorCodes.InternalError, 'Connection is closed.'));
		}
	}

	public sendNotification<P>(type: NotificationType<P>, params?: P): void {
		this.onReady().then(() => {
			this.resolveConnection().then((connection) => {
				if (this.isConnectionActive()) {
					connection.sendNotification(type, params);
				}
			});
		});
	}

    public sendNotificationAsync<P>(type: NotificationType<P>, params?: P): Promise<void> {
        return new Promise<void>((resolve, reject) => {
		    this.onReady().then(() => {
			    this.resolveConnection().then((connection) => {
				    if (this.isConnectionActive()) {
					    connection.sendNotification(type, params);
                        resolve();
				    }
			    }, (error) => {
				    console.error(`Send Notification failed with error ${JSON.stringify(error, null, 4)}`);
                    reject();
			    });
		    });
        });
	}

	public onNotification<P>(type: NotificationType<P>, handler: NotificationHandler<P>): void {
		this.onReady().then(() => {
			this.resolveConnection().then((connection) => {
				connection.onNotification(type, handler);
			})
		});
	}

	public onRequest<P, R, E>(type: RequestType<P, R, E>, handler: RequestHandler<P, R, E>): void {
		this.onReady().then(() => {
			this.resolveConnection().then((connection) => {
				connection.onRequest(type, handler);
			})
		});
	}

    public set trace(value: Trace) {
		this._trace = value;
		this.onReady().then(() => {
			this.resolveConnection().then((connection) => {
				connection.trace(value, this._tracer);
			})
		});
	}

	private logTrace(message: string): void {
		if (this._trace === Trace.Off) {
			return;
		}
		console.log(message);
	}

	public needsStart(): boolean {
		return this._state === ClientState.Initial || this._state === ClientState.Stopping || this._state === ClientState.Stopped;
	}

	public needsStop(): boolean {
		return this._state === ClientState.Starting || this._state === ClientState.Running;
	}

	public onReady(): Promise<void> {
		//return this._onReady;
        return Promise.resolve();
	}

	private isConnectionActive(): boolean {
		return this._state === ClientState.Running;
	}

    private cleanUp(): void {
	}

	private checkProcessDied(childProcess: ChildProcess): void {
		setTimeout(() => {
			// Test if the process is still alive. Throws an exception if not
			try {
				process.kill(childProcess.pid, <any>0);
				terminate(childProcess);
			} catch (error) {
				// All is fine.
			}
		}, 2000);
	}

    // ---- protocol requests -------------------------------------------------------------------------------------------------

    private initialize(connection: IConnection, initParams: InitializeParams): Thenable<InitializeResult> {
	
		return connection.initialize(initParams).then((result) => {
			this._state = ClientState.Running;
			this._capabilites = result.capabilities;
			this._onReadyCallbacks.resolve();

            //this.hookFileEvents(connection);
			//this.hookConfigurationChanged(connection);
			//this.hookCapabilities(connection);
			//Workspace.textDocuments.forEach(t => this.onDidOpenTextDoument(connection, t));
			return result;
		}, (error: ResponseError<InitializeError>) => {
			if (error.data.retry) {
                this.initialize(connection, initParams);
			} else {
				if (error.message) {
					console.error(error.message);
				}
				this.stop();
				this._onReadyCallbacks.reject();
			}
		});
	}

	public initializeRequest(args?: InitializeParams): Promise<InitializeResult> {
		if (!args) {
			args = {
				processId: this._langServerProcess.pid,
				rootPath: this._rootFolder,
				capabilities: {},
				initializationOptions: {}
			};
		}

        return this.onReady().then(() => {
			return this.resolveConnection().then((connection) => {
				return this.initialize(connection, args);
			});
		});
	}

    public notifyConfigurationChangedAsync(settings: any): Promise<void> {
        return new Promise<void>( (resolve, reject) => {
            this.onReady().then(() => {
			    this.resolveConnection().then(connection => {
				    if (this.isConnectionActive()) {
					    connection.didChangeConfiguration({ settings });
                        resolve();
				    }
			    }, (error) => {
				    console.error(`Syncing settings failed with error ${JSON.stringify(error, null, 4)}`);
                    reject();
			    });
		    });
        });
	}

    public notifyConfigurationChanged(settings: any): void {
        this.onReady().then(() => {
			this.resolveConnection().then(connection => {
				if (this.isConnectionActive()) {
					connection.didChangeConfiguration({ settings });
				}
			}, (error) => {
				console.error(`Syncing settings failed with error ${JSON.stringify(error, null, 4)}`);
			});
		});
	}

    
    
    public notifyOpenTextDocumentAsync(args: DidOpenTextDocumentParams) : Promise<void>
    {
        return new Promise<void>( (resolve, reject) => {
            this.onReady().then(() => {
			    this.resolveConnection().then(connection => {
				    if (this.isConnectionActive()) {
					    connection.didOpenTextDocument(args);
                        resolve();
				    }
			    }, (error) => {
				    console.error(`Notification open text failed with error ${JSON.stringify(error, null, 4)}`);
                    reject();
			    });
		    });
      });
    }

    public notifyOpenTextDocument(args: DidOpenTextDocumentParams)
    {
		this.onReady().then(() => {
			this.resolveConnection().then(connection => {
				if (this.isConnectionActive()) {
					connection.didOpenTextDocument(args);
				}
			}, (error) => {
				console.error(`Notification open text failed with error ${JSON.stringify(error, null, 4)}`);
			});
		});
    }

	public notifyFileEvent(event: FileEvent): void {
		this._fileEvents.push(event);
		this._fileEventDelayer.trigger(() => {
			this.onReady().then(() => {
				this.resolveConnection().then(connection => {
					if (this.isConnectionActive()) {
						connection.didChangeWatchedFiles({ changes: this._fileEvents });
					}
					this._fileEvents = [];
				})
			});
		});
	}


    public notifyChangeTextDocument(args: DidChangeTextDocumentParams)
    {
        this.onReady().then(() => {
			this.resolveConnection().then(connection => {
				if (this.isConnectionActive()) {
					connection.didChangeTextDocument(args);
				}
			}, (error) => {
				console.error(`Notification change text  failed with error ${JSON.stringify(error, null, 4)}`);
			});
		});        
    }

    public notifyCloseTextDocument(args : DidCloseTextDocumentParams)
    {
         this.onReady().then(() => {
			this.resolveConnection().then(connection => {
				if (this.isConnectionActive()) {
					connection.didCloseTextDocument(args);
				}
			}, (error) => {
				console.error(`Notification close text  failed with error ${JSON.stringify(error, null, 4)}`);
			});
		});
    }

    public notifySaveTextDocument(args: DidSaveTextDocumentParams)
    {
        this.onReady().then(() => {
			this.resolveConnection().then(connection => {
				if (this.isConnectionActive()) {
					connection.didSaveTextDocument(args);
				}
			}, (error) => {
				console.error(`Notification save text  failed with error ${JSON.stringify(error, null, 4)}`);
			});
		});
    }

    public notifyChangeWatchedFiles(args: DidChangeWatchedFilesParams)
    {
        this.onReady().then(() => {
			this.resolveConnection().then(connection => {
				if (this.isConnectionActive()) {
					connection.didChangeWatchedFiles(args);
				}
			}, (error) => {
				console.error(`Notification change files failed with error ${JSON.stringify(error, null, 4)}`);
			});
		});
    }   
}

