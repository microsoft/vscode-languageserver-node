/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import * as url from 'url';
import * as path from 'path';

import { Message, Request, Response, Event,
		 InitializeRequest, InitializeReponse,
		 ShutdownRequest, ShutdownResponse,
		 ConfigureRequestArgs, ConfigureRequest, ConfigureResponse, 
		 ValidateRequestArgs, ValidateRequest, ValidateResponse, 
		 Diagnostic, DiagnosticEvent, DiagnosticEventBody } from './protocol';
import { ProtocolReader } from './protocolReader';
import { ProtocolWriter } from './protocolWriter';

export class RequestException {
	
	private _message: string;
	
	constructor(message: string) {
		this._message = message;
	}
	
	public get message(): string {
		return this._message;
	}
}

export class RequestHandler {
	private protocolWriter: ProtocolWriter;
	private sequenceNumber: number;
	private shutdownReceived: boolean;
	
	constructor() {
		this.protocolWriter = new ProtocolWriter(process.stdout);
		this.sequenceNumber = 0;
	}
	
	public run(): void {
		process.stdin.on('end', () => {
			process.exit(this.shutdownReceived ? 0 : 1);
		});
		process.stdin.on('close', () => {
			process.exit(this.shutdownReceived ? 0 : 1);
		});
		new ProtocolReader(process.stdin, (request) => {
			this.dispatch(request);
		});
	}
	
	private dispatch(request: Request) {
		let response: Response = null;
		let message: string = null;
		try {
			if (request.command === ValidateRequest.command) {
				response = this.doValidate(<ValidateRequest>request);
			} else if (request.command === InitializeRequest.command) {
				response = this.doInitialize(<InitializeRequest>request);
			} else if (request.command === ConfigureRequest.command) {
				response = this.doConfigure(<ConfigureRequest>request);
			} else if (request.command === ShutdownRequest.command) {
				response = this.doShutdown(<ShutdownRequest>request);
				this.shutdownReceived = true;
			}
		} catch (err) {
			if (err instanceof RequestException) {
				message = (<RequestException>err).message;
			} else if (typeof err.message === 'string' || err.message instanceof String) {
				message = err.message;
			}
			// do nothing right now. Need to log later or send
			// a log event to the VSCode. Need to think about.
		}
		if (!response) {
			response = this.makeReponse(request, message ? message : "Request failed unexpected");
		}
		this.protocolWriter.write(response);
	}
	
	protected makeReponse(request: Request, message: string = null, code: number = null, retry: boolean = null): Response {
		let result: Response = {
			type: Message.Response,
			seq: this.sequenceNumber++,
			request_seq: request.seq,
			command: request.command,
			success: true
		}
		if (message) {
			result.success = false;
			result.message = message;
		}
		if (code) {
			result.code = code;
		}
		if (retry) {
			result.retry = retry;
		}
		return result;
	}
	
	protected sendDiagnosticEvent(body: DiagnosticEventBody): void {
		let event: DiagnosticEvent = {
			type: Message.Event,
			seq: this.sequenceNumber++,
			event: DiagnosticEvent.id,
			body: body
		}
		this.protocolWriter.write(event);
	}
	
	protected toFilePath(uri: string): string {
		let parsed = url.parse(uri);
		if (parsed.protocol !== 'file:' || !parsed.path) {
			return null;
		}
		let segments = parsed.path.split('/');
		for (var i = 0, len = segments.length; i < len; i++) {
			segments[i] = decodeURIComponent(segments[i]);
		}
		if (process.platform === 'win32' && segments.length > 1) {
			let first = segments[0];
			let second = segments[1];
			// Do we have a drive letter and we started with a / which is the
			// case if the first segement is empty (see split above)
			if (first.length === 0 && second.length > 1 && second[1] === ':') {
				// Remove first slash
				segments.shift();
			}
		}
		return path.normalize(segments.join('/'));
	}
	
	protected doInitialize(request: InitializeRequest): InitializeReponse {
		throw new Error('Needs to be implemented in subclass');
	}
	
	protected doShutdown(request: ShutdownRequest): ShutdownResponse {
		throw new Error('Needs to be implemented in subclass');
	}
	
	protected doConfigure(request: ConfigureRequest): ConfigureResponse {
		throw new Error('Needs to be implemented in subclass');
	}
	
	protected doValidate(request: ValidateRequest): ValidateResponse {
		throw new Error('Needs to be implemented in subclass');
	}
}