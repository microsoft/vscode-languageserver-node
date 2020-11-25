/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

declare module 'vscode' {
	export class OnTypeRenameRanges {
		constructor(ranges: Range[], wordPattern?: RegExp);
		readonly ranges: Range[];
		readonly wordPattern?: RegExp;
	}

	export interface OnTypeRenameProvider {
		provideOnTypeRenameRanges(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<OnTypeRenameRanges>;
	}
	export namespace languages {
		export function registerOnTypeRenameProvider(selector: DocumentSelector, provider: OnTypeRenameProvider): Disposable;
	}
}