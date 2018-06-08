/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as code from 'vscode';
import * as proto from 'vscode-languageserver-protocol';

export default class ProtocolCompletionItem extends code.CompletionItem {
    public data: any;
    public fromEdit: boolean;
    public documentationFormat: string;
    public originalItemKind: proto.CompletionItemKind;
    public deprecated: boolean;

    constructor(label: string) {
        super(label);
    }
}
