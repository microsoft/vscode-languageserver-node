---
name: prepare-release
description: 'Prepare a release of vscode-languageserver-node: inspect changes since the last release, propose package versions, obtain approval, update package.json dependency pins, run validate:version, and assign merged PRs and fixed issues to the protocol-version milestone. Use when preparing a release, assessing version bumps, or updating release milestones.'
---

# Prepare a release

Prepare release metadata for this repository. Do not publish packages, create
release tags, push branches, or commit changes unless separately requested.

## 1. Establish the release scope

- Read `CONTRIBUTING.md` and inspect the worktree. Preserve existing user changes.
- Identify the repository and current HEAD rather than assuming a branch name.
- Use the release commit supplied by the user. Otherwise inspect release tags,
  their target commits, and package manifests to identify the last release.
  Ask the user if packages have different release baselines or the target is unclear.
- Record the baseline commit, target HEAD, release tags, and commit timestamps.
  Git timestamps establish a release boundary, not the exact npm publication time.
- Inspect commits and source diffs between the baseline and target. Examine public
  declarations, exports, runtime requirements, proposed-feature gates, dependency
  changes, and tests. Do not classify changes from commit titles alone.
- Derive released versions from manifests at the baseline. Compare current
  manifests too, so rerunning this skill does not bump already-prepared versions
  a second time.

## 2. Propose versions and obtain approval

Present a table containing each affected npm package, released version, current
version, proposed version, bump category, and evidence-based justification.
Include unchanged packages when that helps explain the release.

Apply these repository-specific rules:

- Version `@vscode/languageserver-protocol` by wire-protocol changes, not changes
  to JSON-RPC's TypeScript API or its re-exported APIs:
  - Incompatible request, notification, or response changes require a major.
  - New requests or notifications normally require a minor.
  - Otherwise use a patch, including releases updating dependency pins.
- `@vscode/jsonrpc`'s `RAL` is implemented by the npm module. External
  implementations are unsupported; changes to that implementation interface do
  not independently require a major.
- For other supported public APIs, distinguish compatible additions from
  incompatible changes, including required interface members, removed members,
  changed signatures, and narrower runtime support.
- A dependency major does not automatically require a downstream major.
  Inspect supported re-exported APIs and actual consumer compatibility.
- Bug fixes without public compatibility changes normally require patches.
- Inspect text document and types packages independently. Do not force all
  packages to share one version or bump category.
- Do not change proposal status, runtime requirements, or unrelated dependency
  versions as part of release preparation.

Use the question tool to ask whether the proposed versions are acceptable and
allow corrections. Explain any unresolved policy choices before asking.
**Wait for explicit approval before editing manifests or mutating GitHub.**
If the user revises the proposal, use the approved numbers, not the original ones.

## 3. Update manifests consistently

- Update approved versions in package `package.json` files.
- Find every reference to affected local npm packages in all manifests, including
  dependencies, devDependencies, optionalDependencies, peerDependencies, test
  packages, and testbeds. Update relevant pins consistently while preserving
  intentionally supported ranges.
- Include the client's text document dependency and test packages' server
  dependency; do not rely solely on the validator's dependency coverage.
- Leave private package versions and unaffected packages unchanged.
- Follow the documented lockfile workflow if lockfile changes are requested.
  Otherwise report that lockfiles were not regenerated.
- Do not use `npm version`, `update:lock`, `all:publish`, `npm pack`, or publishing
  commands as shortcuts: lifecycle hooks can clean files or run release actions.
- If requested, update the root README release history in its existing style,
  including compatibility notes and milestone query links.

## 4. Validate before updating GitHub

Run from the repository root:

```powershell
npm run validate:version
```

If the compiled validator is missing or stale, compile the tools package using its
existing compile script, then rerun validation. Do not edit compiled output.
Fix release metadata inconsistencies and rerun until validation succeeds.
Independently check manifest references that the validator does not cover.

If validation is blocked by permissions, sandbox policy, missing prerequisites,
or another environment issue, report the exact failure. Do not bypass sandbox
restrictions or claim success. Stop before milestone mutations until resolved.

## 5. Assign release PRs and fixed issues to the protocol milestone

- Use the approved protocol version as the milestone title, for example `3.18.5`.
  Do not use the JSON-RPC, client, or server version as the milestone.
- Prefer `gh` for GitHub operations. Discover the milestone by exact title,
  including closed milestones. Create it if absent; do not reopen an existing
  closed milestone without approval.
- Find merged PRs using a sufficiently broad date range around the baseline.
  Paginate all results. Establish inclusion using merge-commit ancestry:
  included in the target release, but not already in the baseline. Do not rely
  solely on merge timestamps, which can differ from commit timestamps.
- Exclude unmerged PRs, baseline-release PRs, and work merged only into unrelated
  branches. Investigate missing local merge commits before excluding a PR.
- Find fixed issues through included PRs' closing references and completed issues
  closed since the release boundary. Verify the fix belongs to this release.
  Do not treat duplicate, not-planned, or otherwise unfixed closures as fixes.
- If the user explicitly requests all closed issues, include other closure
  reasons but distinguish them from fixed issues in the report.
- Show the candidate counts and explain exclusions. Ask before moving items from
  an existing different milestone unless the user already authorized reassignment.
- Assign both the included PRs and their fixed issues to the milestone.
  Skip items already assigned correctly, making reruns idempotent.
- Check every mutation for failure. Report partial updates explicitly.
- Retrieve the resulting assignments again to verify they persisted.

## Completion report

Report the approved versions, manifest changes, actual validation result, and
milestone link with counts of assigned PRs and fixed issues. Mention exclusions,
preserved milestones, lockfile status, and any blockers. Do not describe packages
as published or tests as passed when those actions were not performed.
