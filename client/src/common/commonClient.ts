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
import { OnTypeRenameFeature } from './onTypeRename';
import { WillCreateFilesFeature, WillDeleteFilesFeature, WillRenameFilesFeature } from './fileOperations';

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
		this.registerFeature(new WorkspaceFoldersFeature(this));
		this.registerFeature(new FoldingRangeFeature(this));
		this.registerFeature(new DeclarationFeature(this));
		this.registerFeature(new SelectionRangeFeature(this));
		this.registerFeature(new ProgressFeature(this));
		this.registerFeature(new CallHierarchyFeature(this));
		this.registerFeature(new SemanticTokensFeature(this));
		this.registerFeature(new OnTypeRenameFeature(this));
		this.registerFeature(new WillCreateFilesFeature(this));
		this.registerFeature(new WillRenameFilesFeature(this));
		this.registerFeature(new WillDeleteFilesFeature(this));
	}
}

// Exporting proposed protocol.

export namespace ProposedFeatures {
	export function createAll(_client: BaseLanguageClient): (StaticFeature | DynamicFeature<any>)[] {
		let result: (StaticFeature | DynamicFeature<any>)[] = [
		];
		return result;
	}
}