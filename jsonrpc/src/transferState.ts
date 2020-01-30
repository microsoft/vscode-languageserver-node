/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { Message, isResponseMessage, isRequestMessage } from './messages';

export class TransferState {

	private state: Map<string | number, string>;

	constructor(private supportedEncodings: Set<string>) {
		this.state = new Map();
	}

	public capture(msg: Message, header: { [key: string]: string; }): void {
		if (!isRequestMessage(msg)) {
			return;
		}
		
	}

	public getEncoding(msg: Message): string | undefined {
		if (isResponseMessage(msg)) {
			if (msg.id === null) {
				return undefined;
			}
			return this.state.get(msg.id);
		}
		return undefined;
	}
}