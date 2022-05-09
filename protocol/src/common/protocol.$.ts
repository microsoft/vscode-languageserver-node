/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox, Microsoft and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { LogTraceParams, SetTraceParams } from 'vscode-jsonrpc';
import { SemanticTokenTypes, SemanticTokenModifiers } from 'vscode-languageserver-types';

import { ProtocolNotificationType } from './messages';
import { LSPErrorCodes } from './api';

// This file is used to define the $ notification partly specified in JSON-RPC
// so that we generate proper data for them in the meta model.

// @ts-ignore 6196
namespace SetTraceNotification {
	export const type = new ProtocolNotificationType<SetTraceParams, void>('$/setTrace');
}

// @ts-ignore 6196
namespace LogTraceNotification {
	export const type = new ProtocolNotificationType<LogTraceParams, void>('$/logTrace');
}

// @ts-ignore 6196
type $SemanticTokenTypes = SemanticTokenTypes;

// @ts-ignore 6196
type $SemanticTokenModifiers = SemanticTokenModifiers;

// @ts-ignore 6196
const $LSPErrorCodes = LSPErrorCodes;