# Reviewer Evidence Governance

Status: active policy synthesis
Owner: Pairflow core
Scope: reviewer evidence trust, reviewer test execution, docs-only evidence handling, and implementer handoff evidence expectations.

## Purpose

This document is the current source of truth for review/evidence policy that is
not already covered by [reviewer-severity-ontology.md](./reviewer-severity-ontology.md).
The severity ontology remains canonical for finding severity, evidence required
per severity, and post-gate routing thresholds. This document governs whether
validation evidence can be trusted and how that trust should affect reviewer
execution and lifecycle decisions.

## Policy Map

1. Severity classification and finding-level blocker evidence:
   [reviewer-severity-ontology.md](./reviewer-severity-ontology.md).
2. Evidence trust and freshness:
   this document.
3. Reviewer skip/run test execution decision:
   this document.
4. Docs-only evidence handling:
   this document.
5. Future structural enforcement ideas:
   this document's backlog section only; not current protocol authority.

## Evidence Trust States

Evidence should be treated as one of these states:

| State | Meaning | Reviewer effect |
|---|---|---|
| `trusted` | Required command evidence is present, parseable, successful, and fresh for the handoff. | Reviewer may skip redundant full reruns unless a run trigger applies. |
| `missing` | Required command evidence is absent from the handoff or refs. | Reviewer should run required checks for code scope, or report incomplete validation packaging. |
| `unverifiable` | Evidence exists but command identity, completion, or exit status cannot be proven. | Reviewer should run direct checks before relying on the claim. |
| `stale` | Evidence predates relevant changes or is not bound to the current handoff/worktree state. | Reviewer should rerun impacted checks. |
| `untrusted` | Aggregate state for missing, unverifiable, stale, corrupted, or contradictory evidence. | Reviewer must not present the validation surface as clean. |

Implementation note: docs-only bubbles currently emit a synthetic
`trusted` / `skip_full_rerun` reviewer directive with reason
`docs-only scope, runtime checks not required`. That means runtime validation is
not required for the document scope; it is not proof that runtime commands ran.

## Evidence Verification Requirements

For code-scope command evidence, evidence may be marked `trusted` only when all
applicable conditions hold:

1. Command provenance is explicit. Evidence maps to concrete commands such as
   `pnpm typecheck`, `pnpm lint`, `pnpm test`, or a task-defined targeted test.
2. Exit status integrity is explicit. Successful output text without a reliable
   exit marker is not sufficient for trust.
3. Output has basic sanity markers. Truncated, partial, or corrupted output
   invalidates trust.
4. Freshness is bound to the handoff. Evidence must match the commit/worktree
   state that the handoff claims.
5. Required checks are covered. Task-defined targeted checks are not replaced by
   unrelated broad-suite claims unless the task explicitly allows that.
6. Verification status is machine-readable enough to audit later. Free-text
   validation claims alone are soft evidence.

Current implementation has two evidence paths:

1. Configured PASS validation for code bubbles (`commands.validation_required`)
   runs required commands during PASS, writes `pass-validation-evidence.json`,
   writes `.pairflow/evidence/pass-validation-*.log`, and emits a reviewer
   compatibility directive.
2. Reviewer test evidence verification consumes implementer summary and
   whitelisted `.pairflow/evidence/*.log` refs. Summary-only command matches are
   downgraded to unverifiable; trusted command evidence must come from refs.

## Summary And Artifact Consistency

Human-facing summaries must not contradict machine evidence status:

1. A summary must not claim "tests pass", "typecheck clean", or equivalent clean
   validation when the verifier state is `untrusted`, `missing`, `unverifiable`,
   or `stale`.
2. If evidence is not trusted, the summary should say which part is untrusted and
   why.
3. A clean reviewer/convergence statement is valid only for the reviewed scope;
   validation gaps must remain explicit.

This rule applies to docs-only and code scopes. Docs-only scope relaxes which
runtime checks are required; it does not allow summary/artifact contradiction.

Current hard enforcement is narrower than the policy principle: the implemented
summary/verifier consistency gate runs for docs-only convergence validation and
blocks runtime-clean claims such as test/typecheck/lint success when the
reviewer test directive is untrusted. Earlier handoff text should follow the
same rule, but not every intermediate summary is hard-gated today.

## Reviewer Test Execution Decision

Default reviewer behavior:

1. If implementer evidence is verified, fresh, and complete for the task scope,
   the reviewer should skip redundant full test reruns and focus on code/doc
   review, risk analysis, and test-gap detection.
2. The reviewer should still run targeted or full checks when any trigger below
   applies.
3. The reviewer should record the reason for skip or run in the handoff.

Run triggers:

| Trigger | Required action |
|---|---|
| Evidence missing | Run required baseline checks before final judgment for code scope. |
| Evidence unverifiable | Run the checks directly and report the verification failure. |
| Evidence stale | Rerun impacted checks. |
| Reviewer-requested scope changed | Run targeted checks for the changed scope. |
| High-risk domain touched | Run targeted high-risk tests; broaden if gaps remain. |
| Flaky or infrastructure uncertainty | Rerun a minimal confirmation set before relying on prior output. |
| Task requires targeted evidence | Verify that exact targeted evidence exists or run it. |

When no trigger applies, skip full reruns and proceed with review.

## Docs-Only Scope

For `review_artifact_type = "document"` or equivalent docs-only work:

1. Runtime checks are not required solely because a review loop exists.
2. Runtime checks that happen to run may be attached as optional evidence.
3. If the document or handoff makes an explicit command-success claim, that
   claim must be backed by trustworthy evidence or softened to an untrusted /
   not-run statement.
4. Docs-only review should prioritize document consistency, cross-document drift,
   contract clarity, acceptance criteria, and implementation readiness.
5. Parser-sensitive runtime evidence failures should not block docs-only work
   unless they create a summary/artifact contradiction or invalidate an explicit
   claim.

## Code Scope

For code or runtime-affecting work:

1. Missing, unverifiable, or stale required validation evidence is a real review
   concern.
2. The reviewer may use implementer evidence to avoid duplicate execution only
   after trust verification succeeds.
3. Partial validation must be explicit: what ran, what did not run, and why.
4. The default local validation order remains governed by repository instructions
   and task-specific acceptance criteria.

## Implementer Handoff Expectations

Implementer handoffs should include hard evidence refs whenever validation was
run:

1. For code bubbles with configured PASS validation, let PASS run the required
   commands and attach the generated `pass-validation-*.log` refs.
2. When validation is run manually, attach available `.pairflow/evidence/*.log`
   artifacts with `--ref`.
3. Prefer evidence-producing project scripts (`pnpm lint`, `pnpm typecheck`,
   `pnpm test`) because they include command metadata and exit markers.
4. If only a subset ran, state the subset and the reason for omitted checks.
5. Do not replace evidence refs with summary-only claims when the handoff relies
   on validation status.

## Convergence Relationship

Evidence trust does not replace severity policy, but it affects confidence:

1. Severity and post-gate reviewer routing are controlled by
   [reviewer-severity-ontology.md](./reviewer-severity-ontology.md) and
   `review_policy.reviewer_blocking_min_severity`.
2. Low-trust validation evidence can justify additional checks before
   convergence, especially for code scope.
3. Low-trust evidence should be surfaced as a validation-confidence issue, not
   silently converted into unrelated severity findings.
4. Below-threshold findings may still converge according to severity policy, but
   summary text must preserve validation caveats.

## Backlog / Non-Authority Ideas

These are future hardening ideas, not current protocol requirements:

1. Implementer PASS preflight validator with `warn` and `strict` modes.
2. Structured validation payload in PASS (`validation_run`, `validation_refs`,
   `validation_scope`).
3. Explicit structured partial-run contract (`skipped_checks`, `skip_reason`).
4. Configurable evidence enforcement modes at global, repo, or bubble scope.
5. Deeper convergence-policy coupling for low-trust evidence scenarios.

## Removed Historical Sources

The current policy content from the following historical notes, drafts, and
trackers was consolidated here and then removed from the working tree to reduce
LLM context ambiguity:

- `docs/review-loop-optimization.md`
- `docs/pairflow-evidence-governance-context-2026-03-03.md`
- `docs/pairflow-docs-only-evidence-gating-context-2026-03-03.md`
- `docs/reviewer-test-execution-skip-spec.md`
- `docs/reviewer-evidence-autolog-task.md`
- `docs/structural-enforcement-ideas.md`

Use git history only for historical incident detail, for example:

```bash
git log --diff-filter=D -- docs/review-loop-optimization.md
git show <deletion-commit>^:docs/review-loop-optimization.md
```

Do not use removed historical files as current policy authority.
