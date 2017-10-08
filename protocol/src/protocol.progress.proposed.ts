/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { NotificationType, NotificationHandler } from 'vscode-jsonrpc';

export interface WindowProgressClientCapabilities {
	/**
	 * Experimental client capabilities.
	 */
	experimental: {
		/**
		 * The client has support for reporting progress.
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
     * Optional title of the progress.
     * If unset, the previous title (if any) is still valid.
     */
    title?: string;

    /**
     * Optional progress message to display.
     * If unset, the previous progress message (if any) is still valid.
     */
    message?: string;

    /**
     * Optional progress percentage to display (value 1 is considered 1%).
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
 * to ask the client to indicate progress.
 */
export namespace WindowProgressNotification {
	export const type = new NotificationType<ProgressParams, void>('window/progress');
	export type HandlerSignature = NotificationHandler<ProgressParams>;
}