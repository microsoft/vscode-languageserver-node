# LSP 3.18 spec vs. protocol/types source — verification report

Re-run on 2026-05-21 against `_specifications/lsp/3.18/` and `_includes/messages/3.18/`. Earlier findings that have since been addressed are recorded in §F under "Recently resolved" for the record. Open items are listed in §A–§E.

## A. Outright shape conflicts

_None._ The previous mismatch (`textDocument.diagnostic.markupMessageSupport` placed on `ServerCapabilities` in general/initialize.md) has been corrected — the capability is now only on `DiagnosticClientCapabilities` (language/pullDiagnostics.md), matching protocol.diagnostic.ts.

## B. Names referenced in the spec but never defined / linked there

- **`StringValue`** is referenced from `InlineCompletionItem.insertText` in language/inlineCompletion.md (L206) and from `SnippetTextEdit.snippet` in types/textEdit.md (L109). It is defined in types/stringValue.md, but neither reference renders as a hyperlink to that anchor — easy to miss when reading the request page.

## C. Source features missing from the spec entirely

- **`LanguageKind`** open enum (`@since 3.18.0`) with the `@proposed` members `D`, `Delphi`, `Pascal` — types/src/main.ts. Spec still types `TextDocumentItem.languageId` as `string` (types/textDocumentItem.md L15) and never declares `LanguageKind`. The language id table in that file does list `d`, `pascal` and the new entries with `@since 3.18.0`, but the `@proposed` flag from source is dropped (see §D).
- **`LocationUriOnly`** (`@since 3.18.0`, used by `WorkspaceSymbol.location`) — types/src/main.ts. Not declared in types/location.md; still inlined as `Location | { uri: DocumentUri }` in workspace/symbol.md L149.

## D. `@since` / `@proposed` tag mismatches

Spec drops `@proposed` while source still marks the item proposed:

| Item | Spec tag | Source tag | Source location |
|---|---|---|---|
| `Command.tooltip` | `@since 3.18.0` | `@since 3.18.0 @proposed` | types/src/main.ts |
| `SnippetTextEdit` | `@since 3.18.0` | `@since 3.18.0 @proposed` | types/src/main.ts |
| `StringValue` | `@since 3.18.0` | `@since 3.18.0 @proposed` | types/src/main.ts |
| `MessageType.Debug` | `@since 3.18.0` | `@since 3.18.0 @proposed` | protocol/src/common/protocol.ts |
| `ServerCapabilities.inlineCompletionProvider` | `@since 3.18.0` | `@since 3.18.0 @proposed` | protocol.ts |
| `TextDocumentClientCapabilities.inlineCompletion` | `@since 3.18.0` | `@since 3.18.0 @proposed` | protocol.ts |
| All `InlineCompletion*` types & `InlineCompletionRequest` | `@since 3.18.0` | `@since 3.18.0 @proposed` | protocol.inlineCompletion.ts |
| `TextDocumentContentClientCapabilities`, `TextDocumentContentOptions`, `TextDocumentContentRegistrationOptions`, `TextDocumentContentParams` | `@since 3.18.0` | `@since 3.18.0 @proposed` | protocol.textDocumentContent.ts |
| `SignatureHelpClientCapabilities.signatureInformation.noActiveParameterSupport` | `@since 3.18.0` | `@since 3.18.0 @proposed` | protocol.ts |
| `LanguageKind.D`, `LanguageKind.Delphi`, `LanguageKind.Pascal` (and the language id table rows) | `@since 3.18.0` | `@since 3.18.0 @proposed` | types/src/main.ts |

Spec note that has no counterpart in source:

- `SignatureInformation.activeParameter` / `SignatureHelp.activeParameter` `null` behaviour — language/signatureHelp.md says "only valid since 3.18.0…"; source main.ts omits the version note.

## E. Named types in source that the spec still inlines

- **types/documentFilter.md** — `DocumentSelector` is declared as `DocumentFilter[]`; source is `(string | DocumentFilter)[]` with `the use of a string as a document filter is deprecated @since 3.16.0` (protocol.ts L390).
- **_includes/messages/3.18/showMessageRequest.md** — `MessageActionItem` only declares `title: string`; source adds the open index signature `[key: string]: string | boolean | integer | object` that carries the data unlocked by `additionalPropertiesSupport` (protocol.ts).

(All other rows from the previous §E have been reified — see §F.)

## F. Sections that match source

Aligned spec files (no actionable diff): window/showDocument.md, types/diagnostic.md, types/location.md, types/locationLink.md, types/patterns.md, types/textDocuments.md, types/range.md, types/uri.md, types/regexp.md, types/textEdit.md (modulo `StringValue` link in §B and `SnippetTextEdit` tag in §D), types/workspaceEdit.md (incl. `metadataSupport` / `snippetEditSupport`, plus the new `ChangeAnnotationsSupportOptions`), types/command.md (modulo tag in §D), types/textDocumentEdit.md, types/workDoneProgress.md, types/partialResults.md, workspace/applyEdit.md (incl. `WorkspaceEditMetadata`), workspace/textDocumentContent.md (modulo tags in §D), workspace/symbol.md (modulo `LocationUriOnly` in §C), language/inlineCompletion.md (modulo tags in §D and `StringValue` link in §B), language/codeAction.md, language/completion.md, language/rename.md, language/signatureHelp.md (modulo `noActiveParameterSupport` tag in §D), language/foldingRange.md, language/semanticTokens.md, language/inlayHint.md, language/documentSymbol.md, language/codeLens.md, language/rangeFormatting.md, language/publishDiagnostics.md, language/pullDiagnostics.md, notebookDocument/notebook.md, general/initialize.md (modulo `@proposed`/wiring fixes already applied), textDocument/didOpen.md, textDocument/didClose.md, textDocument/didChange.md, textDocument/didSave.md, textDocument/willSave.md, textDocument/willSaveWaitUntil.md.

### Recently resolved

For the record, items from earlier reports that have since been addressed:

- §A: `markupMessageSupport` moved off `ServerCapabilities` and now correctly sits on `DiagnosticClientCapabilities`.
- §B: `ClientDiagnosticsTagOptions` now defined in language/publishDiagnostics.md and referenced by both `PublishDiagnosticsClientCapabilities` and `DiagnosticClientCapabilities`.
- §C: `RegularExpressionEngineKind` declared in types/regexp.md; `FoldingRangeWorkspaceClientCapabilities` wired into `ClientCapabilities.workspace`; `TextDocumentContentClientCapabilities` wired into `ClientCapabilities.workspace`; `WorkspaceOptions.textDocumentContent` wired into `ServerCapabilities.workspace`.
- §D: `FoldingRange.collapsedText` and `WorkspaceSymbolClientCapabilities.resolveSupport` no longer carry the stale `- proposed` qualifier in the spec.
- §E: reified everywhere except documentFilter and showMessageRequest (still listed in §E above). Includes `TextDocumentFilter{Language,Scheme,Pattern}` & union, `CodeActionDisabled`, `CodeActionTagOptions`, all `ClientCodeAction*`, all `Client/ServerCompletionItem*` and `CompletionListCapabilities`, `EditRangeWithInsertReplace`, `PrepareRename{Placeholder,DefaultBehavior}` (+ result union), `ClientSignature*Options`, `ClientFoldingRange*Options`, `ClientSemanticTokensRequest*` & `SemanticTokensFullDelta`, `ClientInlayHintResolveOptions`, `ClientSymbol{Kind,Tag,Resolve}Options`, `ClientInfo`, `ServerInfo`, `StaleRequestSupportOptions`, `WorkspaceOptions`, `GeneralClientCapabilities`, `WindowClientCapabilities`, `ClientShowMessageActionItemOptions`, all `NotebookDocument*` filter/cell-change types (and the registration method `notebookDocument/sync`), `TextDocumentContentChangePartial`, `TextDocumentContentChangeWholeDocument`, `ClientDiagnosticsTagOptions`, `ChangeAnnotationsSupportOptions`.

---

Open items, in rough priority order: §B (one link), §C (`LanguageKind`, `LocationUriOnly`), §D (`@proposed` drift on a handful of items), §E (`DocumentSelector` arm, `MessageActionItem` index signature). None of these are protocol shape conflicts; all are documentation completeness or tagging issues.
