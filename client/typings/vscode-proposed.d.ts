/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

declare module 'vscode' {
	export class LinkedEditingRanges {
		constructor(ranges: Range[], wordPattern?: RegExp);
		readonly ranges: Range[];
		readonly wordPattern?: RegExp;
	}

	export interface LinkedEditingRangeProvider  {
		provideLinkedEditingRanges(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<LinkedEditingRanges>;
	}
	export namespace languages {
		export function registerLinkedEditingRangeProvider(selector: DocumentSelector, provider: LinkedEditingRangeProvider): Disposable;
	}
}