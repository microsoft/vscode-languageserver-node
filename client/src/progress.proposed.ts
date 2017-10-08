/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { window, Progress, ProgressLocation } from 'vscode';

import { BaseLanguageClient, StaticFeature } from './client';
import { ClientCapabilities, Proposed } from 'vscode-languageserver-protocol';

export class WindowProgressFeature implements StaticFeature {
    private _progresses: Map<string, WindowProgress> = new Map<string, WindowProgress>();

    constructor(private _client: BaseLanguageClient) {}

    public fillClientCapabilities(capabilities: ClientCapabilities): void {
        capabilities.experimental = capabilities.experimental || {};
        let windowProgressCapabilities = capabilities as Proposed.WindowProgressClientCapabilities;
        windowProgressCapabilities.experimental.progress = true;
    }

    public initialize(): void {
        let client = this._client;
        let progresses = this._progresses;

        let handler = function (params: Proposed.ProgressParams) {
            let progress = progresses.get(params.id);
            if (progress !== undefined) {
                progress.updateProgress(params);
            } else {
                window.withProgress({ location: ProgressLocation.Window, title: params.title || ''}, p => {
                    progress = new WindowProgress(p);
                    progresses.set(params.id, progress);

                    progress.updateProgress(params);
                    return progress.promise;
                });
            }
            // In both cases progress shouldn't be undefined, but make the compiler happy.
            if (params.done && progress !== undefined) {
                progress.finish();
                progresses.delete(params.id);
            }
        };

        client.onNotification(Proposed.WindowProgressNotification.type, handler);
    }
}

class WindowProgress {
    public promise: Promise<{}>;
    private resolve: (value?: {} | PromiseLike<{}> | undefined) => void;
    private reject: (reason?: any) => void;

    private progress: Progress<{ message?: string; }>;

    private message: string | undefined;
    private percentage: number | undefined;

    constructor(progress: Progress<{ message?: string; }>) {
        this.progress = progress;

        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    public updateProgress(params: Proposed.ProgressParams) {
        const message = params.message || this.message;
        const percentage = params.percentage || this.percentage;

        const progressMessage = this.createProgressMessage(message, percentage);
        this.progress.report({message: progressMessage});
    }

    public finish() {
        this.resolve();
    }

    public cancel() {
        this.reject();
    }

    createProgressMessage(message: string | undefined, percentage: number | undefined): string {
        if (message !== undefined && percentage !== undefined) {
            return `${message} (${percentage}%)`;
        } else if (message !== undefined) {
            return message;
        } else if (percentage !== undefined) {
            return percentage.toString();
        } else {
            return "It's impossible.";
        }
    }
}
