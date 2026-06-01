# Commit and Release History Authority

## Purpose

This document is the repository authority for how Pairflow commit history becomes
release authority. It defines which commits may drive future semver and
changelog automation, which commits are history or lifecycle noise, and how
Pairflow bubble lifecycle commands should behave so release semantics stay
explicit.

This document defines release-history authority. Release automation consumes
the contract through Release Please manifest configuration, a guarded npm
publish workflow, and repo-local validation checks. It does not define npm
credentials or open the first public publish guard.

## Core Decision

Release authority belongs to content commits, not Pairflow lifecycle events.

1. A commit that changes product behavior, runtime behavior, public CLI
   behavior, docs, tests, build policy, or release-relevant configuration must
   use a conventional commit message.
2. Pairflow lifecycle events such as finalization and merge are not semver or
   changelog authority.
3. New policy must move toward explicit conventional commit messages rather
   than preserving `bubble(<id>): finalize` for compatibility.
4. Existing `bubble(<id>): finalize` commits are historical noise only. New
   validation and new Pairflow behavior must not support them as an accepted
   message class.
5. Commit-message validation applies to newly created commits after the policy
   is implemented. Existing history is not rewritten, revalidated as a whole, or
   made acceptable through cutoff, legacy-range, or compatibility modes.
6. Classification uses only deterministic first-line commit headers. Commit
   bodies, footers, branch names, pull request titles, and release-tool defaults
   are not fallback release authority.

## Canonical Classification Rules

1. Classification is based on the deterministic first-line commit header only.
2. Accepted conventional content types are exactly `feat`, `fix`, `perf`,
   `refactor`, `docs`, `test`, `build`, `ci`, and `chore`, with optional
   conventional scope and optional conventional breaking marker.
3. Only first lines beginning `Merge branch ...` or
   `Merge remote-tracking branch ...` are tolerated as merge integration
   artifacts.
4. Only standard Git revert headers beginning `Revert "..."` and conventional
   revert headers beginning `revert` under conventional syntax are tolerated as
   recovery commits.
5. New finalize-style lifecycle commits, including `bubble(<id>): finalize`,
   are rejected. Historical finalize commits are excluded from release
   authority.
6. Release automation inherits full reachable conventional commit selection.
   First-parent-only semantic interpretation is forbidden when
   release-relevant changes live in bubble branch content commits.
7. Malformed, ambiguous, or unknown classes are rejected or marked
   refinement-owned instead of receiving invented implementation behavior.
8. This docs-only task does not introduce cutoff, safe-range,
   compatibility-mode, or traversal implementation behavior.
9. Body text, footer text, duplicate-looking body lines, and additional
   conventional-looking candidates after the first line do not reclassify the
   commit.
10. If the first line is invalid but the body contains a valid-looking
    conventional line, the commit remains invalid or ambiguous for validation.
11. This document defines classification only. It does not require successor
    implementations to rewrite, drop, retain, or normalize commit body/footer
    content.

## Release Authority Classes

| History Shape | Example | Existing History / New Validation | Release Authority Input | Default Semver Effect | Rule |
|---|---|---:|---:|---|---|
| Feature content commit | `feat(cli): add commit message validator` | accepted for new validation | yes | minor | New user-visible or operator-visible capability. |
| Bug or defect fix commit | `fix(cli): reject empty conventional subjects` | accepted for new validation | yes | patch | Correction for incorrect behavior, including bugs, defects, and fail-closed validation fixes. |
| Performance commit | `perf(runtime): reduce status scan cost` | accepted for new validation | yes | patch unless release automation says otherwise | Runtime performance improvement without a new feature contract. |
| Breaking conventional content commit | `feat(cli)!: change command contract` | accepted for new validation | yes | breaking / major policy input | Breaking marker is explicit release input, regardless of conventional type. |
| Internal refactor commit | `refactor(commit): isolate message parser` | accepted for new validation | yes | successor-owned, often none | Internal structure change without intended behavior change; release automation decides changelog/version effect. |
| Conventional docs/test/build/ci/chore commit | `docs(release): document commit policy` | accepted for new validation | yes | successor-owned, often none | Accepted as conventional history; successor release automation decides changelog/version effect. |
| Explicit merge header exception (tolerated integration artifact) | `Merge branch 'bubble/2a-commit-policy-doc'` | accepted for new validation only in the exact configured header forms | no | none | Accepted only for the configured merge header forms so Pairflow/manual integration can remain compatible without widening validation; it is not the ideal release-authority path and must never be semver/changelog input. |
| Standard or conventional revert commit | `Revert "feat(cli): add validator"` / `revert(cli): remove validator change` | accepted for new validation | recovery input | successor-owned | Recovery history remains valid; release automation decides whether and how the revert affects changelog/versioning. |
| Historical Pairflow lifecycle finalize | `bubble(2c-commit-policy): finalize` | tolerated only when already present before this policy; rejected for new validation | no | none | Historical noise only; new policy must not accept or generate this message class. |
| Ambiguous prose | `update stuff` | rejected for new validation | no | none | Reject with guidance or route to policy refinement when the taxonomy is incomplete. |

Accepted conventional content types are exactly `feat`, `fix`, `perf`,
`refactor`, `docs`, `test`, `build`, `ci`, and `chore`, with optional
conventional scope and optional conventional breaking marker.

## Bubble Branch Commit Flow

1. Bubble branches may contain one or more content commits.
2. Every content commit on a bubble branch should be conventional.
3. If a bubble branch already contains the content commits needed for release
   history, a lifecycle close step should not add an empty or generic finalize
   commit just to satisfy workflow ceremony.
4. In that case, `pairflow bubble commit` should record the current committed
   bubble branch head as the lifecycle commit result, provided the bubble
   worktree is clean and the branch contains the selected conventional content
   commits. It should not create an additional Git commit.
5. If uncommitted content remains at bubble close time, `pairflow bubble commit`
   should require an explicit conventional message or derive one only when task
   metadata makes the result deterministic.
6. If deterministic derivation is not possible, `pairflow bubble commit` should
   fail closed with guidance to provide `--message`.

## Pairflow Command Behavior

### `pairflow bubble commit`

Ideal behavior:

1. Preserve `--message <message>` as the explicit operator path.
2. Validate release-relevant implementation commit messages against the
   conventional commit policy.
3. Do not create new generic `bubble(<id>): finalize` commits for content
   changes.
4. If no staged changes remain and the bubble branch already has content
   commits, reuse the committed branch head rather than creating an empty
   lifecycle finalize commit.
5. For docs/admin-only lifecycle work, either require an explicit conventional
   message such as `docs(plan): approve commit policy task` or use a documented
   deterministic conventional default.

### `pairflow bubble merge`

Ideal behavior:

1. It integrates the already-committed bubble branch into `main`.
2. If `main` is still an ancestor of the bubble branch, the preferred result is
   a fast-forward merge: `main` moves to the bubble branch head and no new Git
   commit is created.
3. If fast-forward is not possible, it may create a merge commit whose first
   line matches one of the configured merge header exception forms:
   `Merge branch ...` or `Merge remote-tracking branch ...`.
4. The merge commit is not release authority.
5. Release automation must not infer semver or changelog meaning from the merge
   commit first line.

## Release Automation Inheritance

The release automation task must consume full-history conventional commit
selection. It must see release-relevant conventional bubble branch commits while
ignoring historical lifecycle-finalize noise and merge integration artifacts.
This is the initial release-history strategy selected by this authority
document.

Required strategy:

1. Select conventional commits from the full reachable release range, not only
   first-parent merge commits.
2. Ignore merge commits as integration artifacts.
3. Ignore historical lifecycle-finalize noise such as `bubble(<id>): finalize`.
4. Treat standard Git revert commits and conventional revert headers beginning
   `revert` under conventional syntax as recovery input whose changelog/version
   effect is successor-owned.

Optional future strategy:

1. Pairflow-aware selection may later follow merged bubble branch commits
   recorded by Pairflow metadata, but only as an explicit refinement of the same
   authority model.

Forbidden strategy:

1. First-parent-only semantic interpretation when release-relevant changes live
   in bubble branch content commits. That would see merge commits but miss the
   conventional content commits.

Implemented automation boundary:

1. `release-please-config.json` and `.release-please-manifest.json` configure
   Release Please manifest mode for the root npm package `@pairflow/cli`, with
   `package.json.version` and `CHANGELOG.md` as the version and changelog
   surfaces. The configuration includes a `bootstrap-sha` boundary so the first
   automation run starts from the initial `0.1.0` baseline instead of scanning
   unrelated repository history.
2. The initial automation baseline is `0.1.0`; subsequent Release Please
   changes advance `package.json` and `.release-please-manifest.json` together.
   Release tags use the standard `v<semver>` shape without component prefixes.
3. `.github/workflows/release.yml` checks out full history, runs the local
   validation/build gates, requires `RELEASE_PLEASE_TOKEN`, and then invokes
   Release Please. It does not publish to npm from ordinary `main` pushes.
   The token must be a least-privilege PAT or GitHub App token rather than the
   default `GITHUB_TOKEN`, so Release Please-created releases can trigger the
   downstream guarded publish workflow when the publish guard is deliberately
   opened.
4. Optional explicit release-range checks in the workflow call
   `pnpm commit-policy:validate-range` with shell-safe environment variables;
   workflow YAML must not duplicate the conventional-commit taxonomy. If a
   manual dispatch provides only one range endpoint, the workflow fails closed
   before release automation runs.
5. `.github/workflows/npm-publish.yml` is triggered by GitHub release events or
   manual dispatch. The closed guard path proves real publish is disabled and
   runs `npm publish --dry-run`; the real publish path is reachable only when
   the GitHub-controlled `PAIRFLOW_NPM_PUBLISH_ENABLED` variable is `true`, the
   `npm-publish` environment approves the job, and `NPM_TOKEN` is present. The
   real publish path reruns `pnpm release:validate` immediately before building
   and checks that the GitHub release tag equals `v<package.json.version>`.
   It then checks npm for an already-published `@pairflow/cli@<version>`;
   ambiguous npm lookup failures fail closed before invoking `npm publish`.
6. Release Please owns the Node package version/changelog update surfaces. The
   configuration does not list `pnpm-lock.yaml` as an arbitrary YAML extra-file,
   because this repository's lockfile has no root `version` field for Release
   Please to update by default.
7. Release automation serializes same-ref runs, and npm publish serializes all
   repository publish attempts with non-canceling GitHub Actions concurrency
   groups so package-version duplicate checks cannot race across release tags.
8. `pnpm release:validate` verifies release automation wiring, package publish
   metadata, the matching semver package/manifest versions, workflow
   concurrency, real-publish metadata validation, and duplicate-publish
   preflight guards.
9. Missing npm credentials, missing npm permissions, and a closed publish guard
   fail closed or remain in dry-run mode. Local operator machines are never a
   publication fallback.

## Historical Finalize Commits

This repository may already contain `bubble(<id>): finalize` commits. They are
historical artifacts of the previous lifecycle default, not an accepted policy
class. Commit-message validation defined by this policy applies to newly
created commits; it does not require rewriting or revalidating existing
history.

Future policy:

1. Treat existing finalize commits as historical non-release noise.
2. Do not use them as examples for new release-relevant work.
3. Do not preserve the default solely for compatibility.
4. Do not add a compatibility validation mode that accepts finalize messages
   for newly created commits.

## Validation Implications

Commit-message validation should:

1. Accept conventional commit headers as the normal content path.
2. Accept only the configured merge header exception forms as non-release
   history: `Merge branch ...` and `Merge remote-tracking branch ...`.
3. Accept standard Git revert commits and conventional revert headers beginning
   `revert` under conventional syntax as recovery history.
4. Reject new ambiguous prose.
5. Reject `bubble(<id>): finalize` instead of accepting it as a normal future
   path.
6. Print actionable guidance that points to the commit policy documentation.
7. Leave deterministic safe-range validation mechanics to
   `2b-commit-policy`. This authority classifies the commit-message inputs
   that those checks consume; it does not activate a range validator.

## Operator Guidance

Operators and agents preparing commits should read
`docs/commit-message-guidance.md`. That file mirrors this taxonomy for commit
preparation, but it is not a competing source of truth.

## Successor Task Boundaries

`2a-commit-policy` owns:

1. this authority document,
2. operator-facing commit-message guidance,
3. the lightweight `AGENTS.md` pointer,
4. the canonical taxonomy and handoff boundary for successor tasks.

`2b-commit-policy` owns:

1. validation entrypoints,
2. hook/check wiring,
3. deterministic safe-range validation behavior for newly created commits,
4. focused tests for the classification contract.

`2c-commit-policy` owns:

1. local and remote `pairflow bubble commit` producer alignment,
2. merge/revert compatibility for Pairflow lifecycle operations,
3. explicit classification, deferral, or alignment for adjacent producers such
   as `bubble extract --commit`,
4. lifecycle compatibility with the validation behavior from `2b`.

`3-release-automation` owns:

1. semver bump behavior,
2. changelog generation,
3. implementation of the selected full-history release strategy, including
   exact release-range selection,
4. GitHub release/tag workflows,
5. npm publish workflow integration.
