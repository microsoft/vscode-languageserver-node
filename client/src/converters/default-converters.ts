/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as ls from 'vscode-languageserver-types';
import * as is from '../utils/is';
import ProtocolCompletionItem from '../protocolCompletionItem';
import ProtocolCodeLens from '../protocolCodeLens';

import { DefaultCodeConverter } from './default-code-converter';
export { DefaultCodeConverter } from './default-code-converter';
import { DefaultProtocolConverter } from './default-protocol-converter';
export { DefaultProtocolConverter } from './default-protocol-converter';

export const code2ProtocolConverter = new DefaultCodeConverter();
export const protocol2CodeConverter = new DefaultProtocolConverter();