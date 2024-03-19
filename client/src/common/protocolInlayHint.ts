/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as code from 'vscode';

export default class ProtocolInlayHint extends code.InlayHint {

	public data: any;

	constructor(position: code.Position, label: string | code.InlayHintLabelPart[], kind?: code.InlayHintKind) {
		super(position, label, kind);
	}
}
