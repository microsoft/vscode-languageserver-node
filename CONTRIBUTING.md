# Contributing

## Setup

Use Node.js and npm. To match the current [CI configuration](./.github/workflows/build.yml), use Node.js 22.17.0; this is the CI baseline, not a statement of every published package's minimum runtime.

From the repository root:

```sh
npm install
npm run compile
```

This repository uses npm workspaces and a single root lockfile. Install dependencies from the root so npm links the development packages and testbed to each other. The root install hook downloads Playwright browsers and requires network access. Client integration tests run their test-specific linking script automatically.

Browser tests need Playwright's Chromium. Client integration tests launch a separate VS Code instance using the `insiders` version selected by the [test launcher](./client-node-tests/src/runTests.ts), which may require a download. On Linux, editor integration tests need a display; CI supplies Xvfb and native dependencies. See the workflow for the current dependency list and `xvfb-run` invocation.

## Repository map

| Directory | Responsibility |
| --- | --- |
| [textDocument](./textDocument) | Standalone text document implementation. |
| [types](./types) | Shared LSP data types, helpers, and type guards. |
| [jsonrpc](./jsonrpc) | JSON-RPC transport, messages, connections, and cancellation. |
| [protocol](./protocol) | LSP requests, notifications, capabilities, and protocol APIs. Depends on types and JSON-RPC. |
| [server](./server) | Server connection APIs and feature implementations built on the protocol. |
| [client](./client) | VS Code language client, feature registration, middleware, and VS Code/LSP conversions. |
| [client-node-tests](./client-node-tests) | Client converter and integration tests running inside VS Code, with test servers. |
| [testbed](./testbed) | Manual client/server experimentation and debugging. |
| [tools](./tools) | Protocol metamodel generation and package-version validation. |
| [tsconfig-gen](./tsconfig-gen) | TypeScript project configuration generator. |
| [build](./build) | Package orchestration, linking, browser test runner, and release infrastructure. |

Packages with platform-specific implementations use `src/common`, `src/node`, and `src/browser`. Keep common code portable and preserve the package's default, `/node`, and `/browser` exports. Packages use ESM output. Package manifests define the public entry points; adding an implementation file alone does not expose an API.

## Making a change

Use neighboring implementations and the shared [ESLint configuration](./eslint.config.base.js) as the style reference. The TypeScript projects enforce strict typing. Prefer existing helpers and feature abstractions.

For an LSP feature or public API change, check each applicable surface:

1. Shared types and type guards in `types`.
2. Protocol request/notification types, parameters, results, capabilities, and exports in `protocol`.
3. Server handlers and public exports in `server`.
4. Client capability negotiation, static/dynamic registration, middleware, and exports in `client`.
5. Both VS Code-to-protocol and protocol-to-VS Code conversions in [codeConverter.ts](./client/src/common/codeConverter.ts) and [protocolConverter.ts](./client/src/common/protocolConverter.ts).
6. Relevant type guard, transport, server, converter, and integration tests. Cover unsupported capabilities and cancellation where applicable.

Not every change touches every layer. Follow a comparable feature, such as the [inline-completion protocol declaration](./protocol/src/common/protocol.inlineCompletion.ts) and [client implementation](./client/src/common/inlineCompletion.ts), to determine what is needed.

Preserve existing method names, wire formats, optional-field behavior, public exports, and proposed-feature gates unless the requested change explicitly alters them. Check the LSP specification linked from the [protocol documentation](./protocol/README.md) when changing protocol behavior. Package versions and dependency pins are coordinated; do not update them incidentally. The root `npm run validate:version` command checks dependency-version consistency after the tools have been compiled.

## Verification

### Choose the affected scope

Root scripts include `compile:types`, `compile:textDocument`, `compile:jsonrpc`, `compile:protocol`, `compile:server`, `compile:client`, and `compile:client-node-tests`. They use TypeScript build mode and project references. Compile before testing so tests do not exercise stale JavaScript.

For example, from the root, to build and check a server change:

```sh
npm run compile:server
npm --prefix server run lint
npm --prefix server test
```

Client changes generally need `npm run compile:client-node-tests` and `npm --prefix client-node-tests test`. The client package delegates its tests to that extension; these are not ordinary standalone Node.js tests.

### Focused Node.js tests

Tests use Mocha's TDD interface (`suite`/`test`) and normally run compiled files:

| Package | Compiled Node.js test location | Package script |
| --- | --- | --- |
| `types`, `textDocument` | `lib/test` | `npm test` |
| `jsonrpc` | `lib/common/test`, `lib/node/test` | `npm run test:node` |
| `protocol` | `lib/node/test` | `npm run test:node` |
| `server` | `lib/node/test` | `npm test` |

Run these scripts from the package directory, or use `npm --prefix <package>` from the root. For scripts that invoke Mocha directly, append `-- --grep "<pattern>"` to select test names. For example, `npm --prefix jsonrpc run test:node -- --grep "<pattern>"`. Replace `<pattern>` with a matching test title and confirm that tests actually ran.

For exactly one test file, bypass the package's default Mocha `spec` list with `--no-config`; simply appending a file can also run configured suites. After compiling the server, this example runs from the `server` directory (Windows path syntax):

```powershell
node ..\node_modules\mocha\bin\_mocha --no-config --ui tdd lib\node\test\connection.test.js
```

Use `/` separators for the equivalent command in a POSIX shell. An optional `--grep "<pattern>"` narrows that file further.

### Browser, editor, and full checks

- For JSON-RPC or protocol browser changes, run the affected package's `npm run test:browser`. Its `npm test` runs both Node.js and browser tests; do not assume arguments to that composite script select a single Mocha suite.
- Client converter and integration coverage lives in [client-node-tests/src](./client-node-tests/src). The extension runner discovers its test files; its `npm test` does not expose a Mocha file/grep selector.
- For build-runner changes, `npm run test:build` runs the JavaScript regression tests without an editor or browser.
- For manual investigation, use the [VS Code launch configurations](./.vscode/launch.json) and testbed.

For full verification, run from the root after setup:

```sh
npm run compile
npm run lint
npm test
```

Root `npm test` runs build-runner tests and the package suites, including browsers and VS Code integration. The package runner continues through selected packages, retaining the first failing status; spawn errors and signal termination also produce failure. Root `npm run all` compiles and tests, but **does not lint**.

State which checks passed, failed, or were not run. Distinguish missing runtime/display/download prerequisites from test failures. Do not infer full-suite success from a focused test run.

## Generated files

- **TypeScript configurations:** [.tsconfigrc.mjs](./.tsconfigrc.mjs) describes the projects and variants managed by [tsconfig-gen](./tsconfig-gen). Change that source (or generator code for a generator bug), then run `npm run tsconfig-gen` from the root after setup. That command compiles the generator before regenerating configurations. Do not hand-edit generated variants as the only fix.
- **Protocol metamodel:** protocol TypeScript declarations supply `protocol/metaModel.json`; [tools/src/metaModel.ts](./tools/src/metaModel.ts) defines the schema model used for `protocol/metaModel.schema.json`. After protocol/type changes affecting the model, run these commands from the root:

  ```sh
  npm run compile
  npm run generate:metaModel
  npm run generate:metaModelSchema
  ```

  Compilation builds the generation tooling. Regeneration overwrites the output files; inspect the resulting changes rather than editing the JSON by hand.
- **Compiled outputs:** edit TypeScript sources rather than `lib` or `dist` files.

## Maintenance and release hazards

These are not routine verification commands:

- Root `npm run update:lock` and package `all:publish` scripts invoke `git clean -xfd .`, deleting untracked and ignored files within their scope, including dependencies and potentially local work.
- `npm pack` and `npm publish` can trigger `prepack`/`prepublishOnly` hooks that run those destructive publish-validation scripts.
- Version/release operations and lockfile updates can change coordinated package metadata or invoke lifecycle hooks. Review the relevant manifest and obtain explicit approval before using them.
- `npm run audit:all:fix` mutates dependencies. Use the non-fixing audit command for inspection unless dependency changes are requested.

Do not delete local work or run release infrastructure merely to verify a code change. Prefer the explicit build, lint, and test commands above.
