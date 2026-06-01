# Commit Message Guidance

This file is the operator-facing guide for preparing Pairflow commit messages.
The taxonomy source of truth is
`docs/commit-and-release-history-authority.md`; if this guidance and the
authority ever disagree, use the authority document and refine this file.

## First-Line Rule

Classify commits by the first line only. Do not use commit body text, footers,
branch names, pull request titles, or release-tool defaults to infer release
meaning.

If the first line is invalid, a valid-looking conventional line later in the
body does not rescue the commit. Body text, footer text, duplicate-looking body
lines, and later conventional-looking candidates are ignored for
classification. This guidance does not require successor implementations to
rewrite, drop, retain, or normalize commit body/footer content.

Use one deterministic first line:

```text
<type>(optional-scope): concise subject
```

Breaking changes may use the conventional breaking marker:

```text
<type>(optional-scope)!: concise subject
```

Accepted conventional content types are:

| Type | Use For |
|---|---|
| `feat` | New user-visible or operator-visible capability. |
| `fix` | Incorrect behavior, defects, or fail-closed corrections. |
| `perf` | Runtime performance improvement without a new feature contract. |
| `refactor` | Internal structure change without intended behavior change. |
| `docs` | Documentation-only changes. |
| `test` | Test-only changes. |
| `build` | Build/package/toolchain changes. |
| `ci` | CI workflow/configuration changes. |
| `chore` | Maintenance that does not fit another accepted type. |

Examples:

```text
docs(release): document commit policy authority
feat(cli): add commit message validator
fix(commit): reject empty conventional subjects
refactor(runtime): isolate status scan planning
```

## Merge And Revert Messages

Merge commits are tolerated only as integration artifacts when their first line
begins with one of these exact forms:

```text
Merge branch ...
Merge remote-tracking branch ...
```

Those merge commits are not semver or changelog authority. Release automation
must later use full reachable conventional history so release-relevant bubble
branch commits remain visible.

Reverts are a separate accepted recovery class, not conventional content
commits. Use standard Git revert headers beginning `Revert "..."` or
conventional revert headers beginning `revert` under conventional syntax:

```text
Revert "feat(cli): add commit message validator"
revert(cli): remove validator change
```

Do not use arbitrary prose such as `undo changes` as a revert substitute.

## Disallowed Messages

Do not create new lifecycle finalize messages such as:

```text
bubble(<id>): finalize
```

Existing historical finalize commits are treated as non-release history noise.
They are not examples for new commits, and new validation must reject them.

Also avoid ambiguous prose such as:

```text
update stuff
fix things
misc changes
```

If a commit does not fit the documented classes, treat it as policy refinement
work instead of inventing a local exception.

## Scope Boundaries

This guidance does not implement hooks, validators, release automation, or
Pairflow runtime behavior. Successor work owns those surfaces:

| Successor | Owns |
|---|---|
| `2b-commit-policy` | Validators, commit hooks, safe-range checks, and tests. |
| `2c-commit-policy` | Pairflow commit producers, merge/revert lifecycle compatibility, and adjacent producers such as `bubble extract --commit`. |
| `3-release-automation` | Semver, changelog, tags, GitHub Releases, npm publish, and exact release-range mechanics. |
