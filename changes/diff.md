# LSP 3.18 spec vs. protocol/types source — verification report

I compared the spec under _specifications/lsp/3.18/ with common and main.ts. Below are the actionable findings. Trivial differences (interface vs. type alias, member order in unions, prose wording) are omitted.

> ## A. Outright shape conflict (should be fixed)
>
> - **`markupMessageSupport` is on the wrong side.** general/initialize.md puts `textDocument.diagnostic.markupMessageSupport` on `ServerCapabilities` ("Whether the server supports MarkupContent…"). In source it is a **client** capability on `DiagnosticClientCapabilities` (protocol.diagnostic.ts), consistent with language/pullDiagnostics.md. Server capabilities have no `textDocument.diagnostic.*` member in source at all.

## B. Names referenced in the spec but never defined there

> - **`ClientDiagnosticsTagOptions`** (used by `DiagnosticClientCapabilities.tagSupport` in language/pullDiagnostics.md). Defined in source at protocol.ts with `@since 3.18.0`. Inlined in language/publishDiagnostics.md.
> - **`StringValue`** (`{ kind: 'snippet'; value: string }`) is referenced from `InlineCompletionItem.insertText` in language/inlineCompletion.md and from `SnippetTextEdit.snippet` in types/textEdit.md. It exists as a standalone page types/stringValue.md, but neither referencing page links/anchors it — easy to miss. Source: main.ts.

## C. Source features missing from the spec entirely

- **`RegularExpressionEngineKind`** (open-set namespace + `ES2020`, `@since 3.18.0 @proposed`, used by `RegularExpressionsClientCapabilities.engine`) — protocol.ts. types/regexp.md still types `engine: string`.
- **`LanguageKind`** open enum (`@since 3.18.0`) and the proposed values `D`, `Delphi`, `Pascal` — main.ts. types/textDocumentItem.md still types `languageId: string` and the language table lacks `d` and `pascal`. Also: the spec table lists `git-rebase` but source defines `LanguageKind.GitRebase = 'rebase'` (different value), and the spec lists `plaintext` which has no constant in source.
- **`LocationUriOnly`** (`@since 3.18.0`, used by `WorkspaceSymbol.location`) — main.ts. Not in types/location.md; inlined as `{ uri: DocumentUri }` in workspace/symbol.md.
- **`WorkspaceClientCapabilities.foldingRange?: FoldingRangeWorkspaceClientCapabilities`** (`@since 3.18.0 @proposed`) — protocol.ts. Not wired into the `ClientCapabilities.workspace` literal in general/initialize.md.
- **`WorkspaceClientCapabilities.textDocumentContent?: TextDocumentContentClientCapabilities`** and **`WorkspaceOptions.textDocumentContent?: TextDocumentContentOptions | TextDocumentContentRegistrationOptions`** (`@since 3.18.0 @proposed`) — protocol.ts, protocol.ts. Not wired into `ClientCapabilities.workspace` / `ServerCapabilities.workspace` in general/initialize.md. The types themselves are documented in workspace/textDocumentContent.md.

## D. `@since` / `@proposed` tag mismatches

Spec drops `@proposed` for items source still marks proposed:

| Item | Spec tag | Source tag | Where in source |
|---|---|---|---|
| `Command.tooltip` | (no tag) | `@since 3.18.0 @proposed` | main.ts |
| `SnippetTextEdit` | `@since 3.18.0` | `@since 3.18.0 @proposed` | main.ts |
| `StringValue` | `@since 3.18.0` | `@since 3.18.0 @proposed` | main.ts |
| `MessageType.Debug` | `@since 3.18.0` | `@since 3.18.0 @proposed` | protocol.ts |
| `ServerCapabilities.inlineCompletionProvider` | `@since 3.18.0` | `@since 3.18.0 @proposed` | protocol.ts |
| `TextDocumentClientCapabilities.inlineCompletion` | `@since 3.18.0` | `@since 3.18.0 @proposed` | protocol.ts |
| All `InlineCompletion*` types & `InlineCompletionRequest` | `@since 3.18.0` | `@since 3.18.0 @proposed` | protocol.inlineCompletion.ts |
| All `TextDocumentContent*` types except `TextDocumentContentResult` | `@since 3.18.0` | `@since 3.18.0 @proposed` | protocol.textDocumentContent.ts |

Spec adds `@proposed` source does not have:

| Item | Spec tag | Source tag | Where |
|---|---|---|---|
| `FoldingRange.collapsedText` | `@since 3.17.0 - proposed` | `@since 3.17.0` | main.ts |
| `WorkspaceSymbolClientCapabilities.resolveSupport` | `@since 3.17.0 - proposedState` | `@since 3.17.0` | protocol.ts |

Spec lags a real `@since` qualifier:

- `SignatureHelpClientCapabilities.signatureInformation.noActiveParameterSupport` — source has `@since 3.18.0 @proposed`, spec only `@since 3.18.0`. Source: protocol.ts.
- `SignatureInformation.activeParameter` / `SignatureHelp.activeParameter` null behavior — spec says "only valid since 3.18.0…"; source omits the version note in main.ts.

## E. Named types in source that the spec still inlines (no shape difference, but the names are not anchored)

Folder rows below correspond to spec files. Each entry is a type defined in source (`@since 3.18.0` unless noted) that the spec keeps as an anonymous object literal.

- types/documentFilter.md: `TextDocumentFilterLanguage`, `TextDocumentFilterScheme`, `TextDocumentFilterPattern` (and the resulting discriminated‑union shape of `TextDocumentFilter`). Source: protocol.ts. The page also still types `DocumentSelector = DocumentFilter[]` while source is `(string | DocumentFilter)[]` with a "deprecated since 3.16" note, and source's `DocumentFilter` is `TextDocumentFilter | NotebookCellTextDocumentFilter` (the second arm is only mentioned over in notebook.md).
- language/codeAction.md: `CodeActionTagOptions`, `ClientCodeActionKindOptions`, `ClientCodeActionLiteralOptions`, `ClientCodeActionResolveOptions`, `CodeActionDisabled`.
- language/completion.md: `CompletionListCapabilities`, `CompletionItemTagOptions`, `ClientCompletionItemResolveOptions`, `ClientCompletionItemInsertTextModeOptions`, `ClientCompletionItemOptions`, `ClientCompletionItemOptionsKind`, `ServerCompletionItemOptions`, `EditRangeWithInsertReplace`.
- language/rename.md: `PrepareRenamePlaceholder`, `PrepareRenameDefaultBehavior`, `PrepareRenameResult` (as a named union).
- language/signatureHelp.md: `ClientSignatureInformationOptions`, `ClientSignatureParameterInformationOptions`.
- language/foldingRange.md: `ClientFoldingRangeKindOptions`, `ClientFoldingRangeOptions`.
- language/semanticTokens.md: `ClientSemanticTokensRequestFullDelta`, `ClientSemanticTokensRequestOptions`, `SemanticTokensFullDelta`.
- language/inlayHint.md: `ClientInlayHintResolveOptions`.
- language/documentSymbol.md & workspace/symbol.md: `ClientSymbolKindOptions`, `ClientSymbolTagOptions`, `ClientSymbolResolveOptions`.
- general/initialize.md: `ClientInfo`, `ServerInfo`, `StaleRequestSupportOptions`, `WorkspaceOptions`, `GeneralClientCapabilities`, `WindowClientCapabilities`.
- _includes/messages/.../showMessageRequest.md: `ClientShowMessageActionItemOptions`. Spec also documents `MessageActionItem` with only `title`, while source declares it with an open index signature `[key: string]: string | boolean | integer | object` (carrier for the `additionalPropertiesSupport` capability).
- notebookDocument/notebook.md: `NotebookCellLanguage`, `NotebookDocumentFilterWithNotebook`, `NotebookDocumentFilterWithCells`, `NotebookDocumentCellChangeStructure`, `NotebookDocumentCellContentChanges`, `NotebookDocumentCellChanges`. The page also never names the `NotebookDocumentSyncRegistrationType` registration method (`'notebookDocument/sync'`).
- textDocument/didChange.md: `TextDocumentContentChangePartial`, `TextDocumentContentChangeWholeDocument`.

## F. Sections that match source

These spec files are fully aligned with source: window/showDocument.md, types/diagnostic.md, types/location.md, types/locationLink.md, types/patterns.md, types/textDocuments.md, types/workspaceEdit.md (incl. `metadataSupport`/`snippetEditSupport`), workspace/applyEdit.md (incl. `WorkspaceEditMetadata`), workspace/textDocumentContent.md (modulo the `@proposed` row in §D), language/inlineCompletion.md (modulo `@proposed` row and the missing `StringValue` link), language/codeLens.md, language/rangeFormatting.md (one cosmetic typo: heading reads `DocumentFormattingRegistrationOptions` but the code block defines `DocumentRangeFormattingRegistrationOptions`), textDocument/didOpen.md, textDocument/didClose.md, textDocument/didSave.md, textDocument/willSave.md.

---

The single item that looks like a real bug rather than a documentation gap is the `markupMessageSupport` placement in §A. Sections §B, §C and §D are the most worthwhile follow-ups (missing definitions, missing wiring into the capability blocks, `@proposed` drift). §E is style consistency — desirable but doesn't break the spec.