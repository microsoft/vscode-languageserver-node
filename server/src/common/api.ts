/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { _, Features, _Connection, _LanguagesImpl } from './server';
import { SemanticTokensBuilder } from './semanticTokens';
import type { WorkDoneProgressReporter, WorkDoneProgressServerReporter, ResultProgressReporter } from './progress';

export * from 'vscode-languageserver-protocol/';
export { WorkDoneProgressReporter, WorkDoneProgressServerReporter, ResultProgressReporter };
export { SemanticTokensBuilder };
import { TextDocuments, TextDocumentsConfiguration, TextDocumentChangeEvent, TextDocumentWillSaveEvent } from './textDocuments';
export { TextDocuments, TextDocumentsConfiguration, TextDocumentChangeEvent, TextDocumentWillSaveEvent };
export * from './server';

import { DiagnosticsFeatureShape, DiagnosticFeature } from './proposed.diagnostic';
import { NotebooksFeatureShape, NotebooksFeature, NotebookDocuments as _NotebookDocuments } from './proposed.notebook';

export namespace ProposedFeatures {
	export const all: Features<_, _, _, _, _, _, DiagnosticsFeatureShape, NotebooksFeatureShape> = {
		__brand: 'features',
		languages: DiagnosticFeature,
		notebooks: NotebooksFeature
	};

	export type Connection = _Connection<_, _, _, _, _, _, DiagnosticsFeatureShape, NotebooksFeatureShape>;

	export const NotebookDocuments = _NotebookDocuments;
}