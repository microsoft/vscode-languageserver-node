/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as code from 'vscode';

export default class ProtocolDocumentLink extends code.DocumentLink {
    public data: any;

    constructor(range: code.Range, target?: code.Uri | undefined) {
        super(range, target);
    }
}
