/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { NotificationType, NotificationHandler } from 'vscode-jsonrpc';

export interface WindowProgressClientCapabilities {
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

export interface ProgressParams {
    /**
     * A unique identifier to associate multiple progress notifications with the same progress.
     */
    id: string;

    /**
     * Mandatory title of the progress operation. Used to briefly inform about
     * the kind of operation being performed.
     * Examples: "Indexing" or "Linking dependencies".
     */
    title: string;

    /**
     * Optional, more detailed associated progress message. Contains
     * complementary information to the `title`.
     * Examples: "3/25 files", "project/src/module2", "node_modules/some_dep".
     * If unset, the previous progress message (if any) is still valid.
     */
    message?: string;

    /**
     * Optional progress percentage to display (value 100 is considered 100%).
     * If unset, the previous progress percentage (if any) is still valid.
     */
    percentage?: number;

    /**
     * Set to true on the final progress update.
     * No more progress notifications with the same ID should be sent.
     */
    done?: boolean;
}

/**
 * The `window/progress` notification is sent from the server to the client
 * to inform the client about ongoing progress.
 */
export namespace WindowProgressNotification {
	export const type = new NotificationType<ProgressParams, void>('window/progress');
	export type HandlerSignature = NotificationHandler<ProgressParams>;
}