/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { _, Features, _Connection, _LanguagesImpl, combineLanguagesFeatures } from './server';
import { SemanticTokensBuilder } from './semanticTokens';
import type { WorkDoneProgressReporter, WorkDoneProgressServerReporter, ResultProgressReporter } from './progress';

export * from 'vscode-languageserver-protocol/';
export { WorkDoneProgressReporter, WorkDoneProgressServerReporter, ResultProgressReporter };
export { SemanticTokensBuilder };
import { TextDocuments, TextDocumentsConfiguration, TextDocumentChangeEvent, TextDocumentWillSaveEvent } from './textDocuments';
export { TextDocuments, TextDocumentsConfiguration, TextDocumentChangeEvent, TextDocumentWillSaveEvent };
export * from './server';

import { DiagnosticsFeatureShape, DiagnosticFeature } from './proposed.diagnostic';
import { TypeHierarchyFeatureShape, TypeHierarchyFeature } from './proposed.typeHierarchy';
import { InlineValuesFeatureShape, InlineValuesFeature } from './proposed.inlineValues';
import { NotebooksFeatureShape, NotebooksFeature, NotebookDocuments as _NotebookDocuments } from './proposed.notebooks';

export namespace ProposedFeatures {
	export const all: Features<_, _, _, _, _, _, DiagnosticsFeatureShape & TypeHierarchyFeatureShape & InlineValuesFeatureShape, NotebooksFeatureShape> = {
		__brand: 'features',
		languages: combineLanguagesFeatures(InlineValuesFeature, combineLanguagesFeatures(TypeHierarchyFeature, DiagnosticFeature)),
		notebooks: NotebooksFeature
	};

	export type Connection = _Connection<_, _, _, _, _, _, DiagnosticsFeatureShape & TypeHierarchyFeatureShape & InlineValuesFeatureShape, NotebooksFeatureShape>;

	export const NotebookDocuments = _NotebookDocuments;
}