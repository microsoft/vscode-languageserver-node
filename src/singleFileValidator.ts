/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import {Diagnostic, DocumentIdentifier, Capabilities, ValidationEventBody, getValidationHostConnection, Contents, Diagnostics, Subscriptions, SingleFileValidator} from './index';

export function runSingleFileValidator(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, handler: SingleFileValidator) : void {
	var connection = getValidationHostConnection(inputStream, outputStream);
	var rootFolder: string;

	var validationSupportEnabled = false;
	var validationTrigger: NodeJS.Timer = null;
	
	var trackedDocuments : { [uri: string]:DocumentIdentifier} = {};
	var changedDocuments : { [uri: string]:DocumentIdentifier} = {};
	
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
	
	connection.onConfigureValidator(configArgs => {
		var subscriptions : Subscriptions = {};
		var documentSubscriptions = [];		
		if (validationSupportEnabled) {
			handler.stopValidation();
			validationSupportEnabled = false;
		}
		changedDocuments = trackedDocuments;
		trackedDocuments = {};
		if (configArgs.enable) {
			subscriptions = handler.startValidation(rootFolder, configArgs.settings);
			validationSupportEnabled = true;
		}

		var subscribePromises : Thenable<any>[] = [];

		// subscribe to document change events
		var documentSubscribeArgs = {
			filePathPatterns: subscriptions.filePathPatterns || [],
			mimeTypes: subscriptions.mimeTypes || [],
		};
		subscribePromises.push(connection.requestDocumentEvents(documentSubscribeArgs).then(response => {
			if (response.success) {
				if (response.body.buffersOpen) {
					response.body.buffersOpen.forEach(b => {
						trackedDocuments[b.uri] = b;
						changedDocuments[b.uri] = b;
					});
				}
			} else {
				return Promise.reject('Unable to register to document events: ' + response.message);
			}
		}));
		
		// subscribe to file change events
		subscribePromises.push(connection.requestFileEvents({ filePathPatterns: subscriptions.configFilePathPatterns }));
		
		return Promise.all(subscribePromises).then(success => {
			triggerValidation();
			return { success: true };
		}, error => {
			return { success: false, message: "Unable to configure the validation support: " + error };
		});
	});
	
	connection.onDocumentEvent(event => {
		if (event.documentsClosed) {
			event.documentsClosed.forEach(b => {
				delete trackedDocuments[b.uri];
				changedDocuments[b.uri] = b;
			})
		}		
		if (event.documentsChanged) {
			event.documentsChanged.forEach(b => {
				changedDocuments[b.uri] = b;
			})
		}
		if (event.documentsOpened) {
			event.documentsOpened.forEach(b => {
				changedDocuments[b.uri] = b;
				trackedDocuments[b.uri] = b;
			})
		}
		triggerValidation();
	});
	
	connection.onFileEvent(event => {
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
		
		var documentsToValidate : DocumentIdentifier[] = [];
		for (var p in changedDocuments) {
			if (trackedDocuments[p]) {
				documentsToValidate.push(changedDocuments[p]);
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
		
		if (documentsToValidate.length === 0) {
			// only untracked documents
			connection.sendValidationEvent(validationResult);
			return;
		}
		connection.requestDocuments({ documents: documentsToValidate }).then(documents => {
			if (!documents.success) {
				handleError(documents.message);
				return;
			}
			
			var contents : {[uri:string]: string } = {};
			for (var b in documents.body) {
				contents[b] = documents.body[b].content;
			}
			try {
				var valResult = handler.validate(contents);
				var promise = <Thenable<Diagnostics>> valResult;
				if (!promise.then) {
					promise = Promise.resolve(<Diagnostics> valResult);
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