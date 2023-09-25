/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as code from 'vscode';
import { LSPAny } from 'vscode-languageserver-protocol';

export default class WorkspaceSymbol extends code.SymbolInformation {

	public data?: LSPAny;
	public readonly hasRange: boolean;

	constructor(name: string, kind: code.SymbolKind, containerName: string, locationOrUri: code.Location | code.Uri, data: LSPAny | undefined) {
		const hasRange = !(locationOrUri instanceof code.Uri);
		super(name, kind, containerName, hasRange ? locationOrUri : new code.Location(locationOrUri, new code.Range(0,0,0,0)));
		this.hasRange = hasRange;
		if (data !== undefined) {
			this.data = data;
		}
	}
}
