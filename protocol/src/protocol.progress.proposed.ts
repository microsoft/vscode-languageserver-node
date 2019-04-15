/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { NotificationType, NotificationHandler } from 'vscode-jsonrpc';

export interface ProgressClientCapabilities {
	/**
	 * Window specific client capabilities.
	 */
	window?: {
		/**
		 * Whether client supports handling progress notifications.
		 */
		progress?: boolean;
	}
}

export interface ProgressServerCapabilities {
	/**
	 * Window specific server capabilities.
	 */
	window?: {
		/**
		 * The requests for which the server will report progress (e.g. `textDocument/references`).
		 * The client might not hook a progress monitor / UI for requests which will not provide
		 * progress.
		 */
		progress?: string[];
	}
}

export interface ProgressStartParams {

	/**
	 * A unique identifier to associate multiple progress notifications with
	 * the same progress.
	 */
	id: string;

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

/**
 * The `window/progress/start` notification is sent from the server to the client
 * to initiate a progress.
 */
export namespace ProgressStartNotification {
	export const type = new NotificationType<ProgressStartParams, void>('window/progress/start');
	export type HandlerSignature = NotificationHandler<ProgressStartParams>;
}

export interface ProgressReportParams {

	/**
	 * A unique identifier to associate multiple progress notifications with the same progress.
	 */
	id: string;

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

/**
 * The `window/progress/report` notification is sent from the server to the client
 * to initiate a progress.
 */
export namespace ProgressReportNotification {
	export const type = new NotificationType<ProgressReportParams, void>('window/progress/report');
	export type HandlerSignature = NotificationHandler<ProgressReportParams>;
}

export interface ProgressDoneParams {
	/**
	 * A unique identifier to associate multiple progress notifications with the same progress.
	 */
	id: string;
}

/**
 * The `window/progress/done` notification is sent from the server to the client
 * to initiate a progress.
 */
export namespace ProgressDoneNotification {
	export const type = new NotificationType<ProgressDoneParams, void>('window/progress/done');
	export type HandlerSignature = NotificationHandler<ProgressDoneParams>;
}

export interface ProgressCancelParams {
	/**
	 * A unique identifier to associate multiple progress notifications with the same progress.
	 */
	id: string;
}

/**
 * The `window/progress/cancel` notification is sent client to the server to cancel a progress
 * initiated on the server side.
 */
export namespace ProgressCancelNotification {
	export const type = new NotificationType<ProgressCancelParams, void>('window/progress/cancel');
	export type HandlerSignature = NotificationHandler<ProgressCancelParams>;
}