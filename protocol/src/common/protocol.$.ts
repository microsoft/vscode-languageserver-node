/* --------------------------------------------------------------------------------------------
 * Copyright (c) TypeFox, Microsoft and others. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { LogTraceParams, SetTraceParams, ProgressToken, ErrorCodes } from 'vscode-jsonrpc';
import { SemanticTokenTypes, SemanticTokenModifiers, LSPAny } from 'vscode-languageserver-types';

import { MessageDirection, ProtocolNotificationType } from './messages';
import { LSPErrorCodes } from './api';
import { WorkDoneProgressBegin, WorkDoneProgressEnd, WorkDoneProgressReport } from './protocol.progress';
import { DocumentDiagnosticReportKind } from './protocol.diagnostic';

// This file is used to define the $ notification partly specified in JSON-RPC
// so that we generate proper data for them in the meta model.

// @ts-ignore 6196
namespace SetTraceNotification {
	export const method: '$/setTrace' = '$/setTrace';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolNotificationType<SetTraceParams, void>(method);
}

// @ts-ignore 6196
namespace LogTraceNotification {
	export const method: '$/logTrace' = '$/logTrace';
	export const messageDirection: MessageDirection = MessageDirection.serverToClient;
	export const type = new ProtocolNotificationType<LogTraceParams, void>(method);
}

// @ts-ignore 6196
type $SemanticTokenTypes = SemanticTokenTypes;

// @ts-ignore 6196
type $SemanticTokenModifiers = SemanticTokenModifiers;

// @ts-ignore 6196
type $DocumentDiagnosticReportKind = DocumentDiagnosticReportKind;

// @ts-ignore 6196
const $ErrorCodes = ErrorCodes;

// @ts-ignore 6196
const $LSPErrorCodes = LSPErrorCodes;

interface CancelParams {
	/**
	 * The request id to cancel.
	 */
	id: number | string;
}

// @ts-ignore 6196
namespace CancelNotification {
	export const method: '$/cancelRequest' = '$/cancelRequest';
	export const messageDirection: MessageDirection = MessageDirection.both;
	export const type = new ProtocolNotificationType<CancelParams, void>(method);
}

interface ProgressParams {
	/**
	 * The progress token provided by the client or server.
	 */
	token: ProgressToken;

	/**
	 * The progress data.
	 */
	value: LSPAny;
}

// @ts-ignore 6196
namespace ProgressNotification {
	export const method: '$/progress' = '$/progress';
	export const messageDirection: MessageDirection = MessageDirection.both;
	export const type = new ProtocolNotificationType<ProgressParams, void>(method);
}

// @ts-ignore 6196
type $WorkDoneProgressBegin = WorkDoneProgressBegin;

// @ts-ignore 6196
type $WorkDoneProgressReport = WorkDoneProgressReport;

// @ts-ignore 6196
type $WorkDoneProgressEnd = WorkDoneProgressEnd;
