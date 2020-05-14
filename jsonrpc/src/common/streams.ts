/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { Disposable } from './events';

export interface ReadableStream {
	onData(listener: (data: Uint8Array) => void): Disposable;
	onClose(listener: () => void): Disposable;
	onError(listener: (error: any) => void): Disposable;
	onEnd(listener: () => void): Disposable;
}

export interface WriteableStream {
	onClose(listener: () => void): Disposable;
	onError(listener: (error: any) => void): Disposable;
	onEnd(listener: () => void): Disposable;
	write(data: Uint8Array): void;
	end(): void;
}

export interface DuplexStream extends ReadableStream, WriteableStream {

}