/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as code from 'vscode';
import * as proto from 'vscode-languageserver-protocol';

export default class ProtocolCompletionItem extends code.CompletionItem {

	public data: any;
	public fromEdit: boolean | undefined;
	public documentationFormat: string | undefined;
	public originalItemKind: proto.CompletionItemKind | undefined;
	public deprecated: boolean | undefined;
	public insertTextMode: proto.InsertTextMode | undefined;

	constructor(label: string | code.CompletionItemLabel) {
		super(label);
	}
}
