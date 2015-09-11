/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import * as url from 'url';
import * as path from 'path';

// commands

// initializeCommand: Host to client
// Sent once, right after startup

export var initializeCommand: string = 'initialize';

export interface InitializeRequestArguments {
	rootFolder: string;
	defaultEncoding: string;
	capabilities: string[];
}

export interface InitializeResponseBody {
	capabilities: string[];
}

export var configureEvent: string = 'configureEvent';

export interface ConfigureEventArguments {
	defaultEncoding?: string;
}



// configureValidation: Host to client
// Configures the validation with user or workspace settings

export let configureValidation: string = 'configureValidation';

export interface ConfigureValidationArguments {
	enable: boolean;
	settings?: any;
}

export interface ConfigureValidationResponseBody {
}

// subscribeFileEventsCommand: Client to host
// Used by the client to ask the host to send file events for the given file path patterns
// When called multiple times, the filePathsPatterns of the latest call are used

export var subscribeFileEventsCommand: string = 'subscribeFileEvents';

export interface SubscribeFileEventsArguments {
	filePathPatterns: string[];
}

export interface SubscribeFileEventBody {
}

// subscribeBufferEventsCommand: Client to host
// Used by the client to ask the host to send buffer events for the given file path patterns
// The host replies with the currently open buffers
// When called multiple times, the filePaths of the latest call are used

export var subscribeBufferEventsCommand: string = 'subscribeBufferEvents';

export interface SubscribeBufferEventsArguments {
	filePathPatterns: string[];
}

export interface SubscribeBufferEventBody {
	buffersOpen: TextBufferInfo[]
}

// filesChangedEvent: Host to client
// Used by the host to signal that files have been added, deleted or that files have changed
export var filesChangedEvent: string = 'filesChangedEvent';
export interface FilesChangedEventBody {
	filesAdded: string[];
	filesRemoved: string[];
	filesChanged: string[];
}

// buffersChangedEvent: Host to client
// Used by the host to signal that buffers have been opened, changed or closed
export var buffersChangedEvent: string = 'buffersChangedEvent';
export interface BufferChangedEventBody {
	buffersOpened: TextBufferInfo[];
	buffersChanged: TextBufferInfo[];
	buffersClosed: TextBufferInfo[];
}


// getDocumentCommand: Client to host
// Used by the client to ask the host for the latest content of a buffer or file. 

export var getTextBuffersCommand: string = 'textBuffer/content';

export interface GetTextBufferArguments {
	textBuffers: TextBufferInfo[];
}

export interface GetTextBuffersBody {
	[uri:string]: {
		content: string
	}
}

// validationEvent: Client to host
// Used by the client to notify validation marker changes in the open buffers
export var validationEvent: string = 'validationEvent';
export interface ValidationEventBody {
	[uri:string]: {
		m: Diagnostic[]
	}
}


// shutdownCommand: Host to client
// Used by the host to signal to close.

export var shutdownCommand: string = 'shutdown';

export interface ShutdownRequestArguments {
}

export interface ShutdownResponseBody {
}

export interface TextBufferInfo {
	uri: string;
}

/**
 * Location in document expressed as (one-based) line and character offset.
 */
export interface Location {
	/**
	 * Line location in a document (one-based)
	 */
	line: number;

	/**
	 * Character offset on a line in a document (one-based)
	 */
	offset: number;
}


export namespace Severity {
	export let Error: number = 1;
	export let Warning: number = 2;
	export let Info: number = 3;	
}

/**
 * Item of diagnostic information found in a DiagnosticEvent message.
 */
export interface Diagnostic {
	/**
	 * Starting file location at which text appies.
	 */
	start: Location;

	/**
	 * The last file location at which the text applies. Can be omitted.
	 */
	end?: Location;

	/**
	 * The diagnostic's severity. Can be omitted. If omitted it is up to the
	 * client to interpret diagnostics as error, warning or info. 
	 */
	severity?: number;
	
	/**
	 * The diagnostic code. Can be omitted.
	 */
	code?: string;

	/**
	 * The diagnostic message.
	 */
	message: string;
}

export function toFilePath(uri: string): string {
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