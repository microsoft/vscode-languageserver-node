/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import { SingleFileValidator, getValidationWorkerConnection, IDocument, IValidationRequestor } from './index';
import { Capabilities, Diagnostic } from './protocol';

export function runSingleFileValidator(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, handler: SingleFileValidator) : void {
	let connection = getValidationWorkerConnection(inputStream, outputStream);
	
	let rootFolder: string;

	let validationSupportEnabled = false;
	let validationTrigger: NodeJS.Timer = null;
	
	class Document implements IDocument {
		
		private _uri: string;
		private _content: string;
		
		constructor(uri: string, content: string) {
			this._uri = uri;
			this._content = content;
		}
		
		public get uri(): string {
			return this._uri;
		}
		
		public getText(): string {
			return this._content;
		}
		
		public setText(content: string): void {
			this._content = content;
		}
	}
	
	let trackedDocuments : { [uri: string]: Document } = Object.create(null);
	let changedDocuments : { [uri: string]: Document } = Object.create(null);
	
	class ValidationRequestor implements IValidationRequestor {
		private _toValidate: { [uri: string]: Document };
		
		constructor() {
			this._toValidate = Object.create(null);
		}
		
		public get toValidate(): Document[] {
			return Object.keys(this._toValidate).map(key => this.toValidate[key]);
		}
		
		public all(): void {
			Object.keys(trackedDocuments).forEach(key => this._toValidate[key] = trackedDocuments[key]);
		}
		
		public single(uri: string): boolean {
			let document = trackedDocuments[uri];
			if (document) {
				this._toValidate[uri] = document;
			}
			return !!document;
		}
	}
	
	function isFunction(arg: any): arg is Function {
		return Object.prototype.toString.call(arg) === '[object Function]';
	}
		
	function validate(document: Document): void {
		let result = handler.validate(document);
		if (isFunction((result as Thenable<Diagnostic[]>).then)) {
			(result as Thenable<Diagnostic[]>).then((diagnostics => {
				connection.sendDiagnosticEvent({
					uri: document.uri,
					diagnostics: result as Diagnostic[]
				});
			}, (error) => {
				// We need a log event to tell the client that a diagnostic 
				// failed.
			}));
		} else {
			connection.sendDiagnosticEvent({
				uri: document.uri,
				diagnostics: result as Diagnostic[]
			});
		}
	}
	
	connection.onInitialize(initArgs => {
		rootFolder = initArgs.rootFolder;
		
		var resultCapabilities : Capabilities = {};
		if (initArgs.capabilities.validation) {
			resultCapabilities.validation = true;
		}
		return { success: true, body: { capabilities: resultCapabilities }};
	});
	
	connection.onShutdown(shutdownArgs => {
		handler.shutdown();
		return { success: true };
	});
	
	connection.onExit(() => {
		process.exit(0);
	});
	
	connection.onDocumentOpen(event => {
		let document = new Document(event.uri, event.content);
		trackedDocuments[event.uri] = document; 
		process.nextTick(() => { validate(document); });
	});
	
	connection.onDocumentChange(event => {
		let document = trackedDocuments[event.uri];
		if (document) {
			document.setText(event.content);
		}
		process.nextTick(() => { validate(document); });
	});
	
	connection.onDocumetClose(event => {
		delete trackedDocuments[event.uri];
	});
	
	connection.onConfigurationChange(eventBody => {
		let settings = eventBody.settings;
		let requestor = new ValidationRequestor();
		handler.onConfigurationChange(settings, requestor);
		process.nextTick(() => {
			requestor.toValidate.forEach(document => {
				validate(document);
			});
		});
	});
	
	connection.onFileEvent(fileEvent => {
		let requestor = new ValidationRequestor();
		handler.onFileEvent(fileEvent, requestor);
		process.nextTick(() => {
			requestor.toValidate.forEach(document => {
				validate(document);
			});
		});
	});
}