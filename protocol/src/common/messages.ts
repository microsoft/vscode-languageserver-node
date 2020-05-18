/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestType, RequestType0, NotificationType, NotificationType0, ProgressType, _EM } from 'vscode-jsonrpc';

export class ProtocolRequestType0<R, PR, E, RO> extends RequestType0<R, E, RO> implements ProgressType<PR> {
	public readonly __?: [PR, _EM];
	public constructor(method: string) {
		super(method);
	}
}

export class ProtocolRequestType<P, R, PR, E, RO> extends RequestType<P, R, E, RO> implements ProgressType<PR> {
	public readonly __?: [PR, _EM];
	public constructor(method: string) {
		super(method);
	}
}

export class ProtocolNotificationType<P, RO> extends NotificationType<P, RO> {
	public constructor(method: string) {
		super(method);
	}
}

export class ProtocolNotificationType0<RO> extends NotificationType0<RO> {
	public constructor(method: string) {
		super(method);
	}
}