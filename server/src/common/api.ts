/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { _, Features, _Connection, _LanguagesImpl } from './server';
import { SemanticTokensBuilder } from './semanticTokens';
import { WorkDoneProgressReporter, type WorkDoneProgressServerReporter, type ResultProgressReporter } from './progress';
import { FileSystemFeature, type FileSystemFeatureShape } from './fileSystem';

export * from 'vscode-languageserver-protocol';
export { WorkDoneProgressReporter, WorkDoneProgressServerReporter, ResultProgressReporter };
export { SemanticTokensBuilder };
import { TextDocuments, TextDocumentsConfiguration, TextDocumentChangeEvent, TextDocumentWillSaveEvent } from './textDocuments';
export { TextDocuments, TextDocumentsConfiguration, TextDocumentChangeEvent, TextDocumentWillSaveEvent };
import { NotebookDocuments } from './notebook';
export { NotebookDocuments };
export * from './server';
export { FileSystemFeatureShape };

export namespace ProposedFeatures {
	export const all: Features<_, _, _, _, _, FileSystemFeatureShape, _, _> = {
		__brand: 'features',
		workspace: FileSystemFeature
	};

	export type Connection = _Connection<_, _, _, _, _, FileSystemFeatureShape, _, _>;
}
