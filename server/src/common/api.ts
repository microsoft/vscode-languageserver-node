/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { _, Features, _Connection, _LanguagesImpl } from './server';
import { SemanticTokensBuilder } from './semanticTokens';
import type { WorkDoneProgressReporter, WorkDoneProgressServerReporter, ResultProgressReporter } from './progress';

import * as ic from './inlineCompletion.proposed';
import * as tdc from './textDocumentContent';

export * from 'vscode-languageserver-protocol';
export { WorkDoneProgressReporter, WorkDoneProgressServerReporter, ResultProgressReporter };
export { SemanticTokensBuilder };
import { TextDocuments, TextDocumentsConfiguration, TextDocumentChangeEvent, TextDocumentWillSaveEvent } from './textDocuments';
export { TextDocuments, TextDocumentsConfiguration, TextDocumentChangeEvent, TextDocumentWillSaveEvent };
import { NotebookDocuments } from './notebook';
export { NotebookDocuments };
export * from './server';

export namespace ProposedFeatures {
	export const all: Features<_, _, _, _, _, tdc.TextDocumentContentFeatureShape, ic.InlineCompletionFeatureShape, _> = {
		__brand: 'features',
		workspace: tdc.TextDocumentContentFeature,
		languages: ic.InlineCompletionFeature
	};

	export type Connection = _Connection<_, _, _, _, _, tdc.TextDocumentContentFeatureShape, ic.InlineCompletionFeatureShape, _>;
}