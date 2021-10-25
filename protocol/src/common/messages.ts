/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { RequestType, RequestType0, NotificationType, NotificationType0, ProgressType, _EM, ParameterStructures } from 'vscode-jsonrpc';

export class RegistrationType<RO> {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	public readonly ____: [RO, _EM] | undefined;

	public readonly method: string;
	public constructor(method: string) {
		this.method = method;
	}
}

export class ProtocolRequestType0<R, PR, E, RO> extends RequestType0<R, E> implements ProgressType<PR>, RegistrationType<RO> {
	/**
	 * Clients must not use these properties. They are here to ensure correct typing.
	 * in TypeScript
	 */
	public readonly ___: [PR, RO, _EM] | undefined;
	public readonly ____: [RO, _EM] | undefined;
	public readonly _pr: PR | undefined;

	public constructor(method: string) {
		super(method);
	}
}

export class ProtocolRequestType<P, R, PR, E, RO> extends RequestType<P, R, E> implements ProgressType<PR>, RegistrationType<RO> {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	public readonly ___: [PR, RO, _EM] | undefined;
	public readonly ____: [RO, _EM] | undefined;
	public readonly _pr: PR | undefined;

	public constructor(method: string) {
		super(method, ParameterStructures.byName);
	}
}


export class ProtocolNotificationType0<RO> extends NotificationType0 implements RegistrationType<RO> {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	public readonly ___: [RO, _EM] | undefined;
	public readonly ____: [RO, _EM] | undefined;

	public constructor(method: string) {
		super(method);
	}
}

export class ProtocolNotificationType<P, RO> extends NotificationType<P> implements RegistrationType<RO> {
	/**
	 * Clients must not use this property. It is here to ensure correct typing.
	 */
	public readonly ___: [RO, _EM] | undefined;
	public readonly ____: [RO, _EM] | undefined;

	public constructor(method: string) {
		super(method, ParameterStructures.byName);
	}
}