/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox, Microsoft and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { LogTraceParams, SetTraceParams } from 'vscode-jsonrpc';

import { ProtocolNotificationType } from './messages';

// This file is used to define the $ notification partly specified in JSON-RPC
// so that we generate proper data for them in the meta model.

export namespace SetTraceNotification {
	export const type = new ProtocolNotificationType<SetTraceParams, void>('$/setTrace');
}

export namespace LogTraceNotification {
	export const type = new ProtocolNotificationType<LogTraceParams, void>('$/logTrace');
}