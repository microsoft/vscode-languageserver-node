/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { _, Features, _Connection, _LanguagesImpl } from './server.js';
import { SemanticTokensBuilder } from './semanticTokens.js';
import type { WorkDoneProgressReporter, WorkDoneProgressServerReporter, ResultProgressReporter } from './progress.js';

export * from 'vscode-languageserver-protocol';
export { WorkDoneProgressReporter, WorkDoneProgressServerReporter, ResultProgressReporter };
export { SemanticTokensBuilder };
import { TextDocuments, TextDocumentsConfiguration, TextDocumentChangeEvent, TextDocumentWillSaveEvent } from './textDocuments.js';
export { TextDocuments, TextDocumentsConfiguration, TextDocumentChangeEvent, TextDocumentWillSaveEvent };
import { NotebookDocuments } from './notebook.js';
export { NotebookDocuments };
export * from './server.js';

export namespace ProposedFeatures {
	export const all: Features<_, _, _, _, _, _, _, _> = {
		__brand: 'features',
	};

	export type Connection = _Connection<_, _, _, _, _, _, _, _>;
}