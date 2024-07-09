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
		refresh(): Promise<void>;
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
	private _dataIsSortedAndDeltaEncoded!: boolean;
	private _data!: number[];
	private _dataNonDelta!: number[];
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
		this._dataNonDelta = [];
		this._dataLen = 0;
		this._dataIsSortedAndDeltaEncoded = true;
	}

	public push(line: number, char: number, length: number, tokenType: number, tokenModifiers: number): void {
		if (this._dataIsSortedAndDeltaEncoded && (line < this._prevLine || (line === this._prevLine && char < this._prevChar))) {
			// push calls were ordered and are no longer ordered
			this._dataIsSortedAndDeltaEncoded = false;

			this._dataNonDelta = SemanticTokensBuilder._deltaDecode(this._data);
		}

		let pushLine = line;
		let pushChar = char;
		if (this._dataIsSortedAndDeltaEncoded && this._dataLen > 0) {
			pushLine -= this._prevLine;
			if (pushLine === 0) {
				pushChar -= this._prevChar;
			}
		}

		const dataSource = this._dataIsSortedAndDeltaEncoded ? this._data : this._dataNonDelta;

		dataSource[this._dataLen++] = pushLine;
		dataSource[this._dataLen++] = pushChar;
		dataSource[this._dataLen++] = length;
		dataSource[this._dataLen++] = tokenType;
		dataSource[this._dataLen++] = tokenModifiers;

		this._prevLine = line;
		this._prevChar = char;
	}

	public get id(): string {
		return this._id.toString();
	}

	private static _deltaDecode(data: number[]): number[] {
		// Remove delta encoding from data
		const tokenCount = (data.length / 5) | 0;
		let prevLine = 0;
		let prevChar = 0;
		const result: number[] = [];
		for (let i = 0; i < tokenCount; i++) {
			const dstOffset = 5 * i;
			let line = data[dstOffset];
			let char = data[dstOffset + 1];

			if (line === 0) {
				// on the same line as previous token
				line = prevLine;
				char += prevChar;
			} else {
				// on a different line than previous token
				line += prevLine;
			}

			const length = data[dstOffset + 2];
			const tokenType = data[dstOffset + 3];
			const tokenModifiers = data[dstOffset + 4];

			result[dstOffset + 0] = line;
			result[dstOffset + 1] = char;
			result[dstOffset + 2] = length;
			result[dstOffset + 3] = tokenType;
			result[dstOffset + 4] = tokenModifiers;

			prevLine = line;
			prevChar = char;
		}

		return result;
	}

	private static _sortAndDeltaEncode(data: number[]): number[] {
		const pos: number[] = [];
		const tokenCount = (data.length / 5) | 0;
		for (let i = 0; i < tokenCount; i++) {
			pos[i] = i;
		}
		pos.sort((a, b) => {
			const aLine = data[5 * a];
			const bLine = data[5 * b];
			if (aLine === bLine) {
				const aChar = data[5 * a + 1];
				const bChar = data[5 * b + 1];
				return aChar - bChar;
			}
			return aLine - bLine;
		});
		const result = [];
		let prevLine = 0;
		let prevChar = 0;
		for (let i = 0; i < tokenCount; i++) {
			const srcOffset = 5 * pos[i];
			const line = data[srcOffset + 0];
			const char = data[srcOffset + 1];
			const length = data[srcOffset + 2];
			const tokenType = data[srcOffset + 3];
			const tokenModifiers = data[srcOffset + 4];

			const pushLine = line - prevLine;
			const pushChar = (pushLine === 0 ? char - prevChar : char);

			const dstOffset = 5 * i;
			result[dstOffset + 0] = pushLine;
			result[dstOffset + 1] = pushChar;
			result[dstOffset + 2] = length;
			result[dstOffset + 3] = tokenType;
			result[dstOffset + 4] = tokenModifiers;

			prevLine = line;
			prevChar = char;
		}

		return result;
	}

	private getFinalDataDelta(): number[] {
		if (this._dataIsSortedAndDeltaEncoded) {
			return this._data;
		} else {
			return SemanticTokensBuilder._sortAndDeltaEncode(this._dataNonDelta);
		}
	}

	public previousResult(id: string) {
		if (this.id === id) {
			this._prevData = this.getFinalDataDelta();
		}
		this.initialize();
	}

	public build(): SemanticTokens {
		this._prevData = undefined;

		return {
			resultId: this.id,
			data: this.getFinalDataDelta()
		};
	}

	public canBuildEdits(): boolean {
		return this._prevData !== undefined;
	}

	public buildEdits(): SemanticTokens | SemanticTokensDelta {
		if (this._prevData !== undefined) {
			return {
				resultId: this.id,
				edits: (new SemanticTokensDiff(this._prevData, this.getFinalDataDelta())).computeDiff()
			};
		} else {
			return this.build();
		}
	}
}