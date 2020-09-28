/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';

export default class ProtocolCodeAction extends vscode.CodeAction {

	public readonly data: any;

	constructor(title: string, data: any | undefined) {
		super(title);
		this.data = data;
	}
}