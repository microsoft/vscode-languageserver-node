/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	SemanticTokens, SemanticTokensPartialResult, SemanticTokensDelta, SemanticTokensDeltaPartialResult, SemanticTokensParams,
	SemanticTokensRequest, SemanticTokensDeltaParams, SemanticTokensDeltaRequest, SemanticTokensRangeParams, SemanticTokensRangeRequest,
	SemanticTokensRefreshRequest, SemanticTokensEdit, Disposable
} from 'vscode-languageserver-protocol';

import type { Feature, _Languages, ServerRequestHandler } from './server';

/**
 * Shape of the semantic token feature
 *
 * @since 3.16.0
 */
export interface SemanticTokensFeatureShape {
	semanticTokens: {
		refresh(): void;
		on(handler: ServerRequestHandler<SemanticTokensParams, SemanticTokens, SemanticTokensPartialResult, void>): Disposable;
		onDelta(handler: ServerRequestHandler<SemanticTokensDeltaParams, SemanticTokensDelta | SemanticTokens, SemanticTokensDeltaPartialResult | SemanticTokensPartialResult, void>): Disposable;
		onRange(handler: ServerRequestHandler<SemanticTokensRangeParams, SemanticTokens, SemanticTokensPartialResult, void>): Disposable;
	};
}

export const SemanticTokensFeature: Feature<_Languages, SemanticTokensFeatureShape> = (Base) => {
	return class extends Base {
		public get semanticTokens() {
			return {
				refresh: (): Promise<void> => {
					return this.connection.sendRequest(SemanticTokensRefreshRequest.type);
				},
				on: (handler: ServerRequestHandler<SemanticTokensParams, SemanticTokens, SemanticTokensPartialResult, void>): Disposable => {
					const type = SemanticTokensRequest.type;
					return this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				},
				onDelta: (handler: ServerRequestHandler<SemanticTokensDeltaParams, SemanticTokensDelta | SemanticTokens, SemanticTokensDeltaPartialResult | SemanticTokensDeltaPartialResult, void>): Disposable => {
					const type = SemanticTokensDeltaRequest.type;
					return this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				},
				onRange: (handler: ServerRequestHandler<SemanticTokensRangeParams, SemanticTokens, SemanticTokensPartialResult, void>): Disposable => {
					const type = SemanticTokensRangeRequest.type;
					return this.connection.onRequest(type, (params, cancel) => {
						return handler(params, cancel, this.attachWorkDoneProgress(params), this.attachPartialResultProgress(type, params));
					});
				}
			};
		}
	};
};

export class SemanticTokensDiff {
	private readonly originalSequence: number[];
	private readonly modifiedSequence: number[];

	constructor (originalSequence: number[], modifiedSequence: number[]) {
		this.originalSequence = originalSequence;
		this.modifiedSequence = modifiedSequence;
	}

	public computeDiff(): SemanticTokensEdit[] {
		const originalLength = this.originalSequence.length;
		const modifiedLength = this.modifiedSequence.length;
		let startIndex = 0;
		while(startIndex < modifiedLength && startIndex < originalLength && this.originalSequence[startIndex] === this.modifiedSequence[startIndex]) {
			startIndex++;
		}
		if (startIndex < modifiedLength && startIndex < originalLength) {
			let originalEndIndex = originalLength - 1;
			let modifiedEndIndex = modifiedLength - 1;
			while (originalEndIndex >= startIndex && modifiedEndIndex >= startIndex && this.originalSequence[originalEndIndex] === this.modifiedSequence[modifiedEndIndex]) {
				originalEndIndex--;
				modifiedEndIndex--;
			}
			// if one moved behind the start index move them forward again
			if (originalEndIndex < startIndex || modifiedEndIndex < startIndex) {
				originalEndIndex++;
				modifiedEndIndex++;
			}

			const deleteCount = originalEndIndex - startIndex + 1;
			const newData = this.modifiedSequence.slice(startIndex, modifiedEndIndex + 1);
			// If we moved behind the start index we could have missed a simple delete.
			if (newData.length === 1 && newData[0] === this.originalSequence[originalEndIndex]) {
				return [
					{ start: startIndex, deleteCount: deleteCount - 1 }
				];
			} else {
				return [
					{ start: startIndex, deleteCount, data: newData }
				];
			}
		} else if (startIndex < modifiedLength) {
			return [
				{ start: startIndex, deleteCount: 0, data: this.modifiedSequence.slice(startIndex) }
			];
		} else if (startIndex < originalLength) {
			return [
				{ start: startIndex, deleteCount: originalLength - startIndex }
			];
		} else {
			// The two arrays are the same.
			return [];
		}
	}
}

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
			return {
				resultId: this.id,
				edits: (new SemanticTokensDiff(this._prevData, this._data)).computeDiff()
			};
		} else {
			return this.build();
		}
	}
}