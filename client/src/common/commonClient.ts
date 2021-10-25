/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { BaseLanguageClient, LanguageClientOptions, StaticFeature, DynamicFeature } from './client';

import { ColorProviderFeature } from './colorProvider';
import { ConfigurationFeature as PullConfigurationFeature } from './configuration';
import { ImplementationFeature } from './implementation';
import { TypeDefinitionFeature } from './typeDefinition';
import { WorkspaceFoldersFeature } from './workspaceFolders';
import { FoldingRangeFeature } from './foldingRange';
import { DeclarationFeature } from './declaration';
import { SelectionRangeFeature } from './selectionRange';
import { ProgressFeature } from './progress';
import { CallHierarchyFeature } from './callHierarchy';
import { SemanticTokensFeature } from './semanticTokens';
import { DidCreateFilesFeature, DidDeleteFilesFeature, DidRenameFilesFeature, WillCreateFilesFeature, WillDeleteFilesFeature, WillRenameFilesFeature } from './fileOperations';
import { LinkedEditingFeature } from './linkedEditingRange';

export abstract class CommonLanguageClient extends BaseLanguageClient {

	public constructor(id: string, name: string, clientOptions: LanguageClientOptions) {
		super(id, name, clientOptions);
	}

	public registerProposedFeatures() {
		this.registerFeatures(ProposedFeatures.createAll(this));
	}

	protected registerBuiltinFeatures() {
		super.registerBuiltinFeatures();
		this.registerFeature(new PullConfigurationFeature(this));
		this.registerFeature(new TypeDefinitionFeature(this));
		this.registerFeature(new ImplementationFeature(this));
		this.registerFeature(new ColorProviderFeature(this));
		// We only register the workspace folder feature if the client is not locked
		// to a specific workspace folder.
		if (this.clientOptions.workspaceFolder === undefined) {
			this.registerFeature(new WorkspaceFoldersFeature(this));
		}
		this.registerFeature(new FoldingRangeFeature(this));
		this.registerFeature(new DeclarationFeature(this));
		this.registerFeature(new SelectionRangeFeature(this));
		this.registerFeature(new ProgressFeature(this));
		this.registerFeature(new CallHierarchyFeature(this));
		this.registerFeature(new SemanticTokensFeature(this));
		this.registerFeature(new LinkedEditingFeature(this));
		this.registerFeature(new DidCreateFilesFeature(this));
		this.registerFeature(new DidRenameFilesFeature(this));
		this.registerFeature(new DidDeleteFilesFeature(this));
		this.registerFeature(new WillCreateFilesFeature(this));
		this.registerFeature(new WillRenameFilesFeature(this));
		this.registerFeature(new WillDeleteFilesFeature(this));
	}
}

// Exporting proposed protocol.
import * as pd from './proposed.diagnostic';
import * as pt from './proposed.typeHierarchy';
import * as iv from './proposed.inlineValues';

export namespace ProposedFeatures {
	export function createAll(_client: BaseLanguageClient): (StaticFeature | DynamicFeature<any>)[] {
		let result: (StaticFeature | DynamicFeature<any>)[] = [
			new pd.DiagnosticFeature(_client),
			new pt.TypeHierarchyFeature(_client),
			new iv.InlineValueFeature(_client)
		];
		return result;
	}
}
