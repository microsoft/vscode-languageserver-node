/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */


export * from 'vscode-languageserver-protocol';

export { Converter as Code2ProtocolConverter, FileFormattingOptions } from './codeConverter.js';
export { Converter as Protocol2CodeConverter } from './protocolConverter.js';

export * from './features.js';

export { PrepareCallHierarchySignature, CallHierarchyIncomingCallsSignature, CallHierarchyOutgoingCallsSignature, CallHierarchyMiddleware } from './callHierarchy.js';
export { ProvideCodeActionsSignature, ResolveCodeActionSignature, CodeActionMiddleware } from './codeAction.js';
export { ProvideCodeLensesSignature, ResolveCodeLensSignature, CodeLensMiddleware, CodeLensProviderShape } from './codeLens.js';
export { ProvideDocumentColorsSignature, ProvideColorPresentationSignature, ColorProviderMiddleware } from './colorProvider.js';
export { ProvideCompletionItemsSignature, ResolveCompletionItemSignature, CompletionMiddleware } from './completion.js';
export { ConfigurationMiddleware, DidChangeConfigurationSignature, DidChangeConfigurationMiddleware, SynchronizeOptions  } from './configuration.js';
export { ProvideDeclarationSignature, DeclarationMiddleware } from './declaration.js';
export { ProvideDefinitionSignature, DefinitionMiddleware } from './definition.js';
export { vsdiag, ProvideDiagnosticSignature, ProvideWorkspaceDiagnosticSignature, DiagnosticProviderMiddleware, DiagnosticPullMode, DiagnosticPullOptions, DiagnosticProviderShape } from './diagnostic.js';
export { ProvideDocumentHighlightsSignature, DocumentHighlightMiddleware } from './documentHighlight.js';
export { ProvideDocumentLinksSignature, ResolveDocumentLinkSignature, DocumentLinkMiddleware } from './documentLink.js';
export { ProvideDocumentSymbolsSignature, DocumentSymbolMiddleware } from './documentSymbol.js';
export { ExecuteCommandSignature, ExecuteCommandMiddleware } from './executeCommand.js';
export { FileOperationsMiddleware } from './fileOperations.js';
export { ProvideFoldingRangeSignature, FoldingRangeProviderMiddleware } from './foldingRange.js';
export { ProvideDocumentFormattingEditsSignature, ProvideDocumentRangeFormattingEditsSignature, ProvideOnTypeFormattingEditsSignature, FormattingMiddleware } from './formatting.js';
export { ProvideHoverSignature, HoverMiddleware } from './hover.js';
export { ProvideImplementationSignature, ImplementationMiddleware } from './implementation.js';
export { ProvideInlayHintsSignature, ResolveInlayHintSignature, InlayHintsMiddleware, InlayHintsProviderShape } from './inlayHint.js';
export { ProvideInlineValuesSignature, InlineValueMiddleware, InlineValueProviderShape } from './inlineValue.js';
export { ProvideLinkedEditingRangeSignature, LinkedEditingRangeMiddleware } from './linkedEditingRange.js';
export { NotebookDocumentOptions, NotebookDocumentMiddleware, NotebookDocumentSyncFeatureShape, VNotebookDocumentChangeEvent } from './notebook.js';
export { ProvideReferencesSignature, ReferencesMiddleware } from './reference.js';
export { ProvideRenameEditsSignature, PrepareRenameSignature, RenameMiddleware } from './rename.js';
export { ProvideSelectionRangeSignature, SelectionRangeProviderMiddleware } from './selectionRange.js';
export { DocumentSemanticsTokensSignature, DocumentSemanticsTokensEditsSignature, DocumentRangeSemanticTokensSignature, SemanticTokensMiddleware, SemanticTokensProviderShape } from './semanticTokens.js';
export { ProvideSignatureHelpSignature, SignatureHelpMiddleware } from './signatureHelp.js';
export { TextDocumentSynchronizationMiddleware, DidOpenTextDocumentFeatureShape, DidCloseTextDocumentFeatureShape, DidChangeTextDocumentFeatureShape, DidSaveTextDocumentFeatureShape } from './textSynchronization.js';
export { ProvideTypeDefinitionSignature, TypeDefinitionMiddleware } from './typeDefinition.js';
export { WorkspaceFolderMiddleware } from './workspaceFolder.js';
export { ProvideWorkspaceSymbolsSignature, ResolveWorkspaceSymbolSignature, WorkspaceSymbolMiddleware } from './workspaceSymbol.js';
export { PrepareTypeHierarchySignature, TypeHierarchySupertypesSignature, TypeHierarchySubtypesSignature, TypeHierarchyMiddleware } from './typeHierarchy.js';

export * from './client.js';
