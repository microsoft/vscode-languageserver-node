# Repro: Diagnostics requested after saving an unsaved-but-named buffer

Reproduces [microsoft/vscode-languageserver-node#1797](https://github.com/microsoft/vscode-languageserver-node/issues/1797)
(a manifestation of [#1771](https://github.com/microsoft/vscode-languageserver-node/issues/1771)).

## What the testbed sets up

* The client registers a fake programming language `testbed` (files ending in
  `.testbed`) in `../package.json` and adds it to both the `documentSelector` and
  the `diagnosticPullOptions.match` filter in `../client/src/extension.ts`.
* The server (`../server/src/server.ts`) registers for the text document
  notifications (`didOpen`, `didChange`, `didSave`, `didClose`) and the
  `textDocument/diagnostic` pull request, logging each so the problematic
  sequence is visible in the `Testbed` output channel.
* When a diagnostic pull arrives for a document that is **not open** and whose
  scheme is **not** `file` (i.e. a closed `untitled:` buffer), the server fails
  the request with `no project found for URI <uri>`, mirroring how a real
  language server (e.g. tsserver) reacts.

## Steps to reproduce

1. Build the repo and the testbed:
   ```sh
   npm install
   npm run compile:testbed
   ```
2. Open this `testbed` folder in VS Code and run the `Launch Client` debug
   configuration so the extension loads with the `workspace` folder.
3. In the Extension Development Host, open an **unsaved but named** buffer for the
   fake language, e.g. from a terminal:
   ```sh
   code-insiders ./newFile.testbed   # or: code ./newFile.testbed
   ```
   (or create a new file, set its language to `Testbed`, and keep it unsaved).
4. Type some content, for example:
   ```
   const x = new Map();
   x.
   ```
5. Save the file.

## Expected problematic behavior

On save, VS Code sends `didSave` for the `file:` URI, then `didChange` and
`didClose` for the original `untitled:` URI, and finally a
`textDocument/diagnostic` request for the now closed `untitled:` document. The
`Testbed` output channel shows:

```
error handling method 'textDocument/diagnostic': no project found for URI untitled:/.../newFile.testbed
```
