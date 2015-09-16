/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import {Diagnostic, TextBufferIdentifier, Capabilities, ValidationEventBody, getValidationHostConnection} from './validationConnection';

export interface ContentsByURI { 
	[uri:string]: string;
}

export interface DiagnosticsByURI { 
	[uri:string]: Diagnostic[];
}

export interface SingleFileValidator {
	startValidation(root: string,  settings: any) : { filePathPatterns: string[], configFilePathPatterns: string[] };
	stopValidation(): void;
	configurationChanged(addedURIs: string[], removedURIs: string[], changedURIs: string[]) : boolean | Thenable<boolean>;
	validate(contents: ContentsByURI): DiagnosticsByURI | Thenable<DiagnosticsByURI>;
	shutdown();
}

export function runSingleFileValidator(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, handler: SingleFileValidator) : void {
	var connection = getValidationHostConnection(inputStream, outputStream);
	var rootFolder: string;

	var validationSupportEnabled = false;
	var validationTrigger: NodeJS.Timer = null;
	
	var trackedDocuments : { [uri: string]:TextBufferIdentifier} = {};
	var changedDocuments : { [uri: string]:TextBufferIdentifier} = {};
	
	connection.onInitializeRequest(initArgs => {
		rootFolder = initArgs.rootFolder;
		
		var resultCapabilities : Capabilities = {};
		if (initArgs.capabilities.validation) {
			resultCapabilities.validation = true;
		}
		return { success: true, body: { capabilities: resultCapabilities }};
	});
	
	connection.onShutdownRequest(shutdownArgs => {
		handler.shutdown();
		return { success: true };
	});
	
	connection.onConfigureValidationRequest(configArgs => {
		var configSubscriptions = [];
		var bufferSubscriptions = [];		
		if (validationSupportEnabled) {
			handler.stopValidation();
			validationSupportEnabled = false;
		}
		changedDocuments = trackedDocuments;
		trackedDocuments = {};
		if (configArgs.enable) {
			var startResult = handler.startValidation(rootFolder, configArgs.settings);
			configSubscriptions = startResult.configFilePathPatterns || [];
			bufferSubscriptions = configSubscriptions.concat(startResult.filePathPatterns || []);
			validationSupportEnabled = true;
		}

		// subscribe to buffer change events 
		var subscribeBufferEventsPromise = connection.requestBufferEvents({ filePathPatterns: bufferSubscriptions }).then(subscribeBufferResponse => {
			if (subscribeBufferResponse.success) {
				if (subscribeBufferResponse.body.buffersOpen) {
					subscribeBufferResponse.body.buffersOpen.forEach(b => {
						trackedDocuments[b.uri] = b;
						changedDocuments[b.uri] = b;
					});
				}
			} else {
				return Promise.reject('Unable to register to buffer changed events: ' + subscribeBufferResponse.message);
			}
		});
		
		// subscribe to file change events 
		var subscribeFileEventsPromise = connection.requestFileEvents({ filePathPatterns: configSubscriptions });		
		
		return Promise.all([subscribeBufferEventsPromise, subscribeFileEventsPromise]).then(success => {
			triggerValidation();
			return { success: true };
		}, error => {
			return { success: false, message: "Unable to configure the validation support: " + error };
		});
	});
	
	connection.onBuffersChangedEvent(event => {
		if (event.buffersClosed) {
			event.buffersClosed.forEach(b => {
				delete trackedDocuments[b.uri];
				changedDocuments[b.uri] = b;
			})
		}		
		if (event.buffersChanged) {
			event.buffersChanged.forEach(b => {
				changedDocuments[b.uri] = b;
			})
		}
		if (event.buffersOpened) {
			event.buffersOpened.forEach(b => {
				changedDocuments[b.uri] = b;
				trackedDocuments[b.uri] = b;
			})
		}
		triggerValidation();
	});
	
	connection.onFilesChangedEvent(event => {
		function validateAll() {
			// config file has changed, revalidate all tracked documents
			for (var p in trackedDocuments) {
				changedDocuments[p] = trackedDocuments[p];
			}
			triggerValidation();			
		}	
		
		var confChangedResult = handler.configurationChanged(event.filesAdded, event.filesRemoved, event.filesChanged);
		var confChangedPromise = <Thenable<boolean>> confChangedResult;
		if (confChangedPromise.then) {
			confChangedPromise.then(result => {
				if (result) {
					validateAll();
				}
			})
		} else if (<boolean> confChangedResult) {
			validateAll();
		}
	});
	
	function triggerValidation() {
		if (validationTrigger) {
			clearTimeout(validationTrigger);
		}
		validationTrigger = <any> setTimeout(onValidation, 1000);
	}
	
	function onValidation() {
		var validationResult : ValidationEventBody = {};
		var needsValidation = false;
		
		var buffersToValidate : TextBufferIdentifier[] = [];
		for (var p in changedDocuments) {
			if (trackedDocuments[p]) {
				buffersToValidate.push(changedDocuments[p]);
			} else {
				validationResult[p] = { m: [] };
			}
			needsValidation = true;
		}
		if (!needsValidation) {
			return;
		}
		
		// reset the list of changed events
		var oldChangedDocuments = changedDocuments;
		changedDocuments = {};		
		
		if (buffersToValidate.length === 0) {
			// only untracked documents
			connection.sendValidationEvent(validationResult);
			return;
		}
		connection.requestTextBuffers({ textBuffers: buffersToValidate }).then(buffers => {
			if (!buffers.success) {
				handleError(buffers.message);
				return;
			}
			
			var contents : {[uri:string]: string } = {};
			for (var b in buffers.body) {
				contents[b] = buffers.body[b].content;
			}
			try {
				var valResult = handler.validate(contents);
				var promise = <Thenable<DiagnosticsByURI>> valResult;
				if (!promise.then) {
					promise = Promise.resolve(<DiagnosticsByURI> valResult);
				}
				promise.then(d => {
					for (var p in d) {
						validationResult[p] = { m : d[p] };
					}
					connection.sendValidationEvent(validationResult);
				}, error => {
					handleError(error.message);
				});
			} catch (e) {
				handleError(e.message);
			}
		});
		
		function handleError(message: string) {
			console.log('Errors while collecting validation results: ' + message);
			
			// put the documents back in the list of changed documents
			for (var p in oldChangedDocuments) {
				changedDocuments[p] = oldChangedDocuments[p];
			}
		}
	}
}