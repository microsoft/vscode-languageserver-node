/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as code from 'vscode';

export default class ProtocolDiagnostic extends code.Diagnostic {

	public data: any;

	constructor(range: code.Range, message: string, severity?: code.DiagnosticSeverity) {
		super(range, message, severity);
	}
}