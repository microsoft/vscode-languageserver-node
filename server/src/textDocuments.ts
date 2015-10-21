/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

export interface ISimpleTextDocument {
	uri: string;
	getText(): string;
}

export class SimpleTextDocument implements ISimpleTextDocument {

	private _uri: string;
	private _content: string;

	constructor(uri: string, content: string) {
		this._uri = uri;
		this._content = content;
	}

	public get uri(): string {
		return this._uri;
	}

	public getText(): string {
		return this._content;
	}

	public setText(content: string): void {
		this._content = content;
	}
}


interface ITextDocument {
	uri: string;
	getText(): string;
}