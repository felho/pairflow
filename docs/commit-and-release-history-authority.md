# Commit and Release History Authority

## Purpose

This document is the repository authority for how Pairflow commit history becomes
release authority. It defines which commits may drive future semver and
changelog automation, which commits are history or lifecycle noise, and how
Pairflow bubble lifecycle commands should behave so release semantics stay
explicit.

This document does not configure release automation, publish packages, create
tags, or define npm credentials. The release automation task consumes this
contract later.

## Core Decision

Release authority belongs to content commits, not Pairflow lifecycle events.

1. A commit that changes product behavior, runtime behavior, public CLI
   behavior, docs, tests, build policy, or release-relevant configuration must
   use a conventional commit message.
2. Pairflow lifecycle events such as finalization and merge are not semver or
   changelog authority.
3. New policy must move toward explicit conventional commit messages rather
   than preserving `bubble(<id>): finalize` for compatibility.
4. Historical `bubble(<id>): finalize` commits before the cutoff are historical
   noise only; new validation and new Pairflow behavior should not support them
   as an accepted message class.

## Release Authority Classes

| History Shape | Example | Accepted In History | Release Authority Input | Default Semver Effect | Rule |
|---|---|---:|---:|---|---|
| Feature content commit | `feat(cli): add commit message validator` | yes | yes | minor | New user-visible or operator-visible capability. |
| Bug or defect fix commit | `fix(cli): reject empty conventional subjects` | yes | yes | patch | Correction for incorrect behavior, including bugs, defects, and fail-closed validation fixes. |
| Performance commit | `perf(runtime): reduce status scan cost` | yes | yes | patch unless release automation says otherwise | Runtime performance improvement without a new feature contract. |
| Breaking conventional content commit | `feat(cli)!: change command contract` | yes | yes | breaking / major policy input | Breaking marker is explicit release input, regardless of conventional type. |
| Internal refactor commit | `refactor(commit): isolate message parser` | yes | yes | successor-owned, often none | Internal structure change without intended behavior change; release automation decides changelog/version effect. |
| Conventional docs/test/build/ci/chore commit | `docs(release): document commit policy` | yes | yes | successor-owned, often none | Accepted as conventional history; successor release automation decides changelog/version effect. |
| Standard merge commit (tolerated integration artifact) | `Merge branch 'bubble/2-commit-policy-impl'` | yes | no | none | Accepted so existing or manual integration history does not break validation; it is not the ideal release-authority path and must never be semver/changelog input. |
| Standard or conventional revert commit | `Revert "feat(cli): add validator"` / `revert(cli): remove validator change` | yes | recovery input | successor-owned | Recovery history remains valid; release automation decides whether and how the revert affects changelog/versioning. |
| Pairflow lifecycle finalize | `bubble(2-commit-policy-impl): finalize` | no | no | none | Historical noise only; new policy must not accept or generate this message class. |
| Ambiguous prose | `update stuff` | no | no | none | Reject with guidance. |

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
3. If fast-forward is not possible, it may create a normal Git merge commit as a
   tolerated integration artifact.
4. The merge commit is not release authority.
5. Release automation must not infer semver or changelog meaning from the merge
   commit first line.

## Release Automation Inheritance

The release automation task must choose a history-selection strategy that can
see release-relevant conventional bubble branch commits while ignoring
historical lifecycle-finalize noise and merge integration artifacts.

Allowed strategies include:

1. Full-history conventional commit selection with explicit ignore rules for
   merge commits and historical lifecycle-finalize noise.
2. Pairflow-aware selection that follows merged bubble branch commits recorded
   by Pairflow metadata.

Forbidden strategy:

1. First-parent-only semantic interpretation when release-relevant changes live
   in bubble branch content commits. That would see merge commits but miss the
   conventional content commits.

## Historical Finalize Commits

This repository may already contain `bubble(<id>): finalize` commits. They are
historical artifacts of the previous lifecycle default, not an accepted policy
class.

Future policy:

1. Treat existing finalize commits as historical non-release noise.
2. Do not use them as examples for new release-relevant work.
3. Do not preserve the default solely for compatibility.
4. Do not add a legacy validation mode for new commit-policy checks.

## Validation Implications

Commit-message validation should:

1. Accept conventional commit headers as the normal content path.
2. Accept standard merge commits as non-release history.
3. Accept standard Git revert commits and conventional `revert:` commits as
   recovery history.
4. Reject new ambiguous prose.
5. Reject `bubble(<id>): finalize` instead of accepting it as a normal future
   path.
6. Print actionable guidance that points to the commit policy documentation.

## Successor Task Boundaries

`2-commit-policy` owns:

1. local guidance,
2. validation entrypoints,
3. hook/check wiring,
4. bubble commit message compatibility changes,
5. tests for the classification contract.

`3-release-automation` owns:

1. semver bump behavior,
2. changelog generation,
3. release-history selection,
4. GitHub release/tag workflows,
5. npm publish workflow integration.
