/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as code from 'vscode';

export default class ProtocolTypeHierarchyItem extends code.TypeHierarchyItem {

	public data?: unknown;

	constructor(kind: code.SymbolKind, name: string, detail: string, uri: code.Uri, range: code.Range, selectionRange: code.Range, data?: unknown) {
		super(kind, name, detail, uri, range, selectionRange);
		if (data !== undefined) { this.data = data; }
	}
}