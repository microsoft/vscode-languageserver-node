/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as code from 'vscode';

export default class ProtocolCodeLens extends code.CodeLens {

	public data: any;

	constructor(range: code.Range) {
		super(range);
	}
}
