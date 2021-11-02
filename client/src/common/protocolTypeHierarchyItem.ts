/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as code from 'vscode';
import { LSPAny } from 'vscode-languageserver-protocol';

export default class ProtocolTypeHierarchyItem extends code.TypeHierarchyItem {

	public data?: LSPAny;

	constructor(kind: code.SymbolKind, name: string, detail: string, uri: code.Uri, range: code.Range, selectionRange: code.Range, data?: LSPAny) {
		super(kind, name, detail, uri, range, selectionRange);
		if (data !== undefined) { this.data = data; }
	}
}