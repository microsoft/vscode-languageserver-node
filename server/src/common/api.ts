/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { _, Features, _Connection } from './server';
import { SemanticTokensBuilder } from './semanticTokens';
import type { WorkDoneProgressReporter, WorkDoneProgressServerReporter, ResultProgressReporter } from './progress';
import * as mk from './moniker.proposed';

export * from 'vscode-languageserver-protocol/';
export { WorkDoneProgressReporter, WorkDoneProgressServerReporter, ResultProgressReporter };
export { SemanticTokensBuilder };
export * from './server';

export namespace ProposedFeatures {
	export const all: Features<_, _, _, _, _, _, mk.MonikerFeatureShape> = {
		__brand: 'features',
		languages: mk.MonikerFeature
	};

	export type Connection = _Connection<_, _, _, _, _, _, _>;
}