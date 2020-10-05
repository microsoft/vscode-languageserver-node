/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';

export default class ProtocolDiagnostic extends vscode.Diagnostic {

	public readonly data: unknown | undefined;

	constructor(range: vscode.Range, message: string, severity: vscode.DiagnosticSeverity, data: unknown | undefined) {
		super(range, message, severity);
		this.data = data;
	}
}