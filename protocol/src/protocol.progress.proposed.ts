/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { NotificationType, NotificationHandler, RequestType, RequestHandler, ProgressType, ProgressToken } from 'vscode-jsonrpc';

export interface WorkDoneProgressClientCapabilities {
	/**
	 * Window specific client capabilities.
	 */
	window?: {
		/**
		 * Whether client supports handling progress notifications.
		 */
		workDoneProgress?: boolean;
	}
}

// export interface ProgressServerCapabilities {
// 	/**
// 	 * Window specific server capabilities.
// 	 */
// 	window?: {
// 		/**
// 		 * The requests for which the server will report progress (e.g. `textDocument/references`).
// 		 * The client might not hook a progress monitor / UI for requests which will not provide
// 		 * progress.
// 		 */
// 		progress?: string[];
// 	}
// }

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
	 * that are not following this rule.
	 */
	percentage?: number;
}

export interface WorkDoneProgressReport {

	kind: 'report';

	/**
	 * Controls enablement state of a cancel button. This property is only valid if a cancel
	 * button got requested in the `WorkDoneProgressStart` payload.
	 *
	 * Clients that don't support cancellation or don't support control the button's
	 * enablement state are allowed to ignore the setting.
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
	 * that are not following this rule.
	 */
	percentage?: number;
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
	export const type = new RequestType<WorkDoneProgressCreateParams, void, void, void>('window/workDoneProgress/create');
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
	export const type = new NotificationType<WorkDoneProgressCancelParams, void>('window/workDoneProgress/cancel');
	export type HandlerSignature = NotificationHandler<WorkDoneProgressCancelParams>;
}