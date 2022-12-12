/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { NotificationHandler, RequestHandler, ProgressType, ProgressToken } from 'vscode-jsonrpc';
import { uinteger } from 'vscode-languageserver-types';

import { MessageDirection, ProtocolRequestType, ProtocolNotificationType } from './messages';

export interface WorkDoneProgressBegin {

	kind: 'begin';

	/**
	 * Mandatory title of the progress operation. Used to briefly inform about
	 * the kind of operation being performed.
	 *
	 * Examples: "Indexing" or "Linking dependencies".
	 */
	title: string;

	/**
	 * Controls if a cancel button should show to allow the user to cancel the
	 * long running operation. Clients that don't support cancellation are allowed
	 * to ignore the setting.
	 */
	cancellable?: boolean;

	/**
	 * Optional, more detailed associated progress message. Contains
	 * complementary information to the `title`.
	 *
	 * Examples: "3/25 files", "project/src/module2", "node_modules/some_dep".
	 * If unset, the previous progress message (if any) is still valid.
	 */
	message?: string;

	/**
	 * Optional progress percentage to display (value 100 is considered 100%).
	 * If not provided infinite progress is assumed and clients are allowed
	 * to ignore the `percentage` value in subsequent in report notifications.
	 *
	 * The value should be steadily rising. Clients are free to ignore values
	 * that are not following this rule. The value range is [0, 100].
	 */
	percentage?: uinteger;
}

export interface WorkDoneProgressReport {

	kind: 'report';

	/**
	 * Controls enablement state of a cancel button.
	 *
	 * Clients that don't support cancellation or don't support controlling the button's
	 * enablement state are allowed to ignore the property.
	 */
	cancellable?: boolean;

	/**
	 * Optional, more detailed associated progress message. Contains
	 * complementary information to the `title`.
	 *
	 * Examples: "3/25 files", "project/src/module2", "node_modules/some_dep".
	 * If unset, the previous progress message (if any) is still valid.
	 */
	message?: string;

	/**
	 * Optional progress percentage to display (value 100 is considered 100%).
	 * If not provided infinite progress is assumed and clients are allowed
	 * to ignore the `percentage` value in subsequent in report notifications.
	 *
	 * The value should be steadily rising. Clients are free to ignore values
	 * that are not following this rule. The value range is [0, 100]
	 */
	percentage?: uinteger;
}

export interface WorkDoneProgressEnd {

	kind: 'end';

	/**
	 * Optional, a final message indicating to for example indicate the outcome
	 * of the operation.
	 */
	message?: string;
}

export namespace WorkDoneProgress {
	export const type = new ProgressType<WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd>();

	export function is(value: ProgressType<any>): value is typeof type {
		return value === type;
	}
}

export interface WorkDoneProgressCreateParams  {
	/**
	 * The token to be used to report progress.
	 */
	token: ProgressToken;
}

/**
 * The `window/workDoneProgress/create` request is sent from the server to the client to initiate progress
 * reporting from the server.
 */
export namespace WorkDoneProgressCreateRequest {
	export const method: 'window/workDoneProgress/create' = 'window/workDoneProgress/create';
	export const messageDirection: MessageDirection = MessageDirection.serverToClient;
	export const type = new ProtocolRequestType<WorkDoneProgressCreateParams, void, never, void, void>(method);
	export type HandlerSignature = RequestHandler<WorkDoneProgressCreateParams, void, void>;
}

export interface WorkDoneProgressCancelParams {
	/**
	 * The token to be used to report progress.
	 */
	token: ProgressToken;
}

/**
 * The `window/workDoneProgress/cancel` notification is sent from  the client to the server to cancel a progress
 * initiated on the server side.
 */
export namespace WorkDoneProgressCancelNotification {
	export const method: 'window/workDoneProgress/cancel' = 'window/workDoneProgress/cancel';
	export const messageDirection: MessageDirection = MessageDirection.clientToServer;
	export const type = new ProtocolNotificationType<WorkDoneProgressCancelParams, void>(method);
	export type HandlerSignature = NotificationHandler<WorkDoneProgressCancelParams>;
}
