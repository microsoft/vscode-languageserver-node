/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

export enum MessageKind {
	Log,
	Show
}

export class LanguageServerError extends Error {

	private _messageKind: MessageKind;
	public message: string;

	constructor(message: string, messageKind: MessageKind) {
		super(message);
		this.message = message;
		this._messageKind = messageKind;
	}

	public get messageKind(): MessageKind {
		return this._messageKind;
	}
}