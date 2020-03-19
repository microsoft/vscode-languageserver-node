/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CancellationId, CancellationSenderStrategy, MessageConnection } from 'vscode-jsonrpc';

function getCancellationFilename(folder: string, id: CancellationId) {
	return path.join(getFolderForCancellation(folder), `cancellation-${String(id)}.tmp`);
}

export function getSenderStrategy(cancellationFolder: string): CancellationSenderStrategy {
	return {
		sendCancellation(_: MessageConnection, id: CancellationId): void {
			const file = getCancellationFilename(cancellationFolder, id);
			try {
				if (!fs.existsSync(file)) {
					fs.writeFileSync(file, '', { flag: 'w' });
				}
			} catch (e) {
				// noop
			}
		},
		cleanup(id: CancellationId): void {
			try {
				fs.unlinkSync(getCancellationFilename(cancellationFolder, id));
			}
			catch (e) {
				// noop
			}
		}
	};
}

export function getFolderForCancellation(folder: string) {
	return path.join(os.tmpdir(), 'vscode-languageserver-cancellation', folder);
}

export function getSenderStrategyArgument(folder?: string) {
	if (folder) {
		return `--cancellationSend=file:${folder}`;
	}

	return `--cancellationSend=message`;
}

export function getReceiverStrategyArgument(folder?: string) {
	if (folder) {
		return `--cancellationReceive=file:${folder}`;
	}

	return `--cancellationReceive=message`;
}
