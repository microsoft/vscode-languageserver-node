/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { LSPAny } from 'vscode-languageserver-protocol';
import * as Is from './utils/is';

/**
 * We keep this for a while to not break servers which adopted
 * proposed API.
 */
export interface DiagnosticCode {
	value: string | number;
	target: string;
}

export namespace DiagnosticCode {
	export function is(value: string | number | DiagnosticCode | undefined | null): value is DiagnosticCode {
		const candidate: DiagnosticCode = value as DiagnosticCode;
		return candidate !== undefined && candidate !== null && (Is.number(candidate.value) || Is.string(candidate.value)) && Is.string(candidate.target);
	}
}

export class ProtocolDiagnostic extends vscode.Diagnostic {

	public readonly data: LSPAny | undefined;
	public hasDiagnosticCode: boolean;

	constructor(range: vscode.Range, message: string, severity: vscode.DiagnosticSeverity, data: LSPAny | undefined) {
		super(range, message, severity);
		this.data = data;
		this.hasDiagnosticCode = false;
	}
}