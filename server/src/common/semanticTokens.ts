/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	SemanticTokens, SemanticTokensPartialResult, SemanticTokensDelta, SemanticTokensDeltaPartialResult, SemanticTokensParams,
	SemanticTokensRequest, SemanticTokensDeltaParams, SemanticTokensDeltaRequest, SemanticTokensRangeParams, SemanticTokensRangeRequest
} from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the semantic token feature
 *
 * @since 3.16.0 - proposed state
 */
export interface SemanticTokensFeatureShape {
	semanticTokens: {
		on(handler: ServerRequestHandler<SemanticTokensParams, SemanticTokens, SemanticTokensPartialResult, void>): void;
		onDelta(handler: ServerRequestHandler<SemanticTokensDeltaParams, SemanticTokensDelta | SemanticTokens, SemanticTokensDeltaPartialResult | SemanticTokensDeltaPartialResult, void>): void;
		onRange(handler: ServerRequestHandler<SemanticTokensRangeParams, SemanticTokens, SemanticTokensPartialResult, void>): void;
	}
}

export const SemanticTokensFeature: Feature<_Languages, SemanticTokensFeatureShape> = (Base) => {
	return class extends Base {
		public get semanticTokens() {
			return {
				on: (handler: ServerRequestHandler<SemanticTokensParams, SemanticTokens, SemanticTokensPartialResult, void>): void => {
					const type = SemanticTokensRequest.type;
					this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				},
				onDelta: (handler: ServerRequestHandler<SemanticTokensDeltaParams, SemanticTokensDelta | SemanticTokens, SemanticTokensDeltaPartialResult | SemanticTokensDeltaPartialResult, void>): void => {
					const type = SemanticTokensDeltaRequest.type;
					this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				},
				onRange: (handler: ServerRequestHandler<SemanticTokensRangeParams, SemanticTokens, SemanticTokensPartialResult, void>): void => {
					const type = SemanticTokensRangeRequest.type;
					this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				}
			};
		}
	};
};

export class SemanticTokensBuilder {

	private _id!: number;

	private _prevLine!: number;
	private _prevChar!: number;
	private _data!: number[];
	private _dataLen!: number;

	private _prevData: number[] | undefined;

	constructor() {
		this._prevData = undefined;
		this.initialize();
	}

	private initialize() {
		this._id = Date.now();
		this._prevLine = 0;
		this._prevChar = 0;
		this._data = [];
		this._dataLen = 0;
	}

	public push(line: number, char: number, length: number, tokenType: number, tokenModifiers: number): void {
		let pushLine = line;
		let pushChar = char;
		if (this._dataLen > 0) {
			pushLine -= this._prevLine;
			if (pushLine === 0) {
				pushChar -= this._prevChar;
			}
		}

		this._data[this._dataLen++] = pushLine;
		this._data[this._dataLen++] = pushChar;
		this._data[this._dataLen++] = length;
		this._data[this._dataLen++] = tokenType;
		this._data[this._dataLen++] = tokenModifiers;

		this._prevLine = line;
		this._prevChar = char;
	}

	public get id(): string {
		return this._id.toString();
	}

	public previousResult(id: string) {
		if (this.id === id) {
			this._prevData = this._data;
		}
		this.initialize();
	}

	public build(): SemanticTokens {
		this._prevData = undefined;
		return {
			resultId: this.id,
			data: this._data
		};
	}

	public canBuildEdits(): boolean {
		return this._prevData !== undefined;
	}

	public buildEdits(): SemanticTokens | SemanticTokensDelta {
		if (this._prevData !== undefined) {
			const prevDataLength = this._prevData.length;
			const dataLength = this._data.length;
			let startIndex = 0;
			while(startIndex < dataLength && startIndex < prevDataLength && this._prevData[startIndex] === this._data[startIndex]) {
				startIndex++;
			}
			if (startIndex < dataLength && startIndex < prevDataLength) {
				// Find end index
				let endIndex = 0;
				while (endIndex < dataLength && endIndex < prevDataLength && this._prevData[prevDataLength - 1 - endIndex] === this._data[dataLength - 1 - endIndex]) {
					endIndex++;
				}
				const newData = this._data.slice(startIndex, dataLength - endIndex);
				const result: SemanticTokensDelta = {
					resultId: this.id,
					edits: [
						{ start: startIndex, deleteCount: prevDataLength - endIndex - startIndex, data: newData }
					]
				};
				return result;
			} else if (startIndex < dataLength) {
				return { resultId: this.id, edits: [
					{ start: startIndex, deleteCount: 0, data: this._data.slice(startIndex) }
				]};
			} else if (startIndex < prevDataLength) {
				return { resultId: this.id, edits: [
					{ start: startIndex, deleteCount: prevDataLength - startIndex }
				]};
			} else {
				return { resultId: this.id, edits: [] };
			}
		} else {
			return this.build();
		}
	}
}