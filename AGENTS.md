# Working in this repository

Read [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, the package map, focused verification, generated files, and maintenance hazards.

- This is an npm workspaces project. Install dependencies from the repository root and use the documented scripts for test-specific linking.
- Keep platform-independent code in `src/common`; do not introduce Node.js or VS Code runtime dependencies into shared protocol/types code. Preserve the separate common, node, and browser entry points.
- For protocol features, check the shared types, protocol declarations, capability negotiation, client/server implementations, converters, exports, and relevant tests. Follow a neighboring feature rather than inventing a new registration pattern.
- Preserve public API compatibility and existing proposed-feature gates. Do not change package versions, dependency pins, or proposal status unless the task calls for it.
- Edit sources, not compiled `lib`/`dist` output. For generated configuration and metamodel changes, follow the [generation instructions](./CONTRIBUTING.md#generated-files).
- Compile affected packages before running tests: most suites execute compiled JavaScript, not TypeScript source. Start with focused tests and package lint; include browser or VS Code integration tests when those surfaces change.
- Root `npm run all` does not include lint. Report the checks actually run and any missing browser, display, network, or editor prerequisites; do not describe unrun checks as passing.
- Do not use `update:lock`, `all:publish`, `npm pack`, publishing, or release/version commands as routine verification. Some invoke `git clean -xfd .` or mutate package metadata. Obtain explicit approval before destructive or release operations.
