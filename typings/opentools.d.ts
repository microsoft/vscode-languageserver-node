/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
declare module 'OpenTools-node' {
	export function runSingleFileValidator(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, handler: SingleFileValidator) : void;

	interface ContentsByURI {
		[uri:string]: string;
	}

	interface DiagnosticsByURI {
		[uri:string]: Diagnostic[];
	}

	interface SingleFileValidator {
		startValidation(root: string,  settings: any) : { filePathPatterns: string[], configFilePathPatterns: string[] };
		stopValidation(): void;
		configurationChanged(addedURIs: string[], removedURIs: string[], changedURIs: string[]);
		validate(contents: ContentsByURI): DiagnosticsByURI | Thenable<DiagnosticsByURI>;
		shutdown();
	}

	/**
	* Location in document expressed as (one-based) line and character offset.
	*/
	interface Location {
		/**
		* Line location in a document (one-based)
		*/
		line: number;

		/**
		* Character offset on a line in a document (one-based)
		*/
		offset: number;
	}


	declare var Severity: {
		Error: number;
		Warning: number;
		Info: number;
	}

	/**
	* Item of diagnostic information found in a DiagnosticEvent message.
	*/
	interface Diagnostic {
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
}