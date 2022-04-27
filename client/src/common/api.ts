/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */


export * from 'vscode-languageserver-protocol';

export { Converter as Code2ProtocolConverter, FileFormattingOptions } from './codeConverter';
export { Converter as Protocol2CodeConverter } from './protocolConverter';

export * from './features';

export { PrepareCallHierarchySignature, CallHierarchyIncomingCallsSignature, CallHierarchyOutgoingCallsSignature, CallHierarchyMiddleware } from './callHierarchy';
export { ProvideCodeActionsSignature, ResolveCodeActionSignature, CodeActionMiddleware } from './codeAction';
export { ProvideCodeLensesSignature, ResolveCodeLensSignature, CodeLensMiddleware, CodeLensProviderShape } from './codeLens';
export { ProvideDocumentColorsSignature, ProvideColorPresentationSignature, ColorProviderMiddleware } from './colorProvider';
export { ProvideCompletionItemsSignature, ResolveCompletionItemSignature, CompletionMiddleware } from './completion';
export { ConfigurationMiddleware, DidChangeConfigurationSignature, DidChangeConfigurationMiddleware, SynchronizeOptions  } from './configuration';
export { ProvideDeclarationSignature, DeclarationMiddleware } from './declaration';
export { ProvideDefinitionSignature, DefinitionMiddleware } from './definition';
export { vsdiag, ProvideDiagnosticSignature, ProvideWorkspaceDiagnosticSignature, DiagnosticProviderMiddleware, DiagnosticPullMode, DiagnosticPullOptions, DiagnosticProviderShape } from './diagnostic';
export { ProvideDocumentHighlightsSignature, DocumentHighlightMiddleware } from './documentHighlight';
export { ProvideDocumentLinksSignature, ResolveDocumentLinkSignature, DocumentLinkMiddleware } from './documentLink';
export { ProvideDocumentSymbolsSignature, DocumentSymbolMiddleware } from './documentSymbol';
export { ExecuteCommandSignature, ExecuteCommandMiddleware } from './executeCommand';
export { FileOperationsMiddleware } from './fileOperations';
export { ProvideFoldingRangeSignature, FoldingRangeProviderMiddleware } from './foldingRange';
export { ProvideDocumentFormattingEditsSignature, ProvideDocumentRangeFormattingEditsSignature, ProvideOnTypeFormattingEditsSignature, FormattingMiddleware } from './formatting';
export { ProvideHoverSignature, HoverMiddleware } from './hover';
export { ProvideImplementationSignature, ImplementationMiddleware } from './implementation';
export { ProvideInlayHintsSignature, ResolveInlayHintSignature, InlayHintsMiddleware, InlayHintsProviderShape } from './inlayHint';
export { ProvideInlineValuesSignature, InlineValueMiddleware, InlineValueProviderShape } from './inlineValue';
export { ProvideLinkedEditingRangeSignature, LinkedEditingRangeMiddleware } from './linkedEditingRange';
export { NotebookDocumentOptions, NotebookDocumentMiddleware, NotebookDocumentSyncFeatureShape, NotebookDocumentChangeEvent } from './notebook';
export { ProvideReferencesSignature, ReferencesMiddleware } from './reference';
export { ProvideRenameEditsSignature, PrepareRenameSignature, RenameMiddleware } from './rename';
export { ProvideSelectionRangeSignature, SelectionRangeProviderMiddleware } from './selectionRange';
export { DocumentSemanticsTokensSignature, DocumentSemanticsTokensEditsSignature, DocumentRangeSemanticTokensSignature, SemanticTokensMiddleware, SemanticTokensProviderShape } from './semanticTokens';
export { ProvideSignatureHelpSignature, SignatureHelpMiddleware } from './signatureHelp';
export { TextDocumentSynchronizationMiddleware, DidOpenTextDocumentFeatureShape, DidCloseTextDocumentFeatureShape, DidChangeTextDocumentFeatureShape, DidSaveTextDocumentFeatureShape } from './textSynchronization';
export { ProvideTypeDefinitionSignature, TypeDefinitionMiddleware } from './typeDefinition';
export { WorkspaceFolderMiddleware } from './workspaceFolder';
export { ProvideWorkspaceSymbolsSignature, ResolveWorkspaceSymbolSignature, WorkspaceSymbolMiddleware } from './workspaceSymbol';

export * from './client';
