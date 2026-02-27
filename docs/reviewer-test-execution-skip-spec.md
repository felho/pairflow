# Reviewer Test Execution Skip Spec

**Date:** 2026-02-27  
**Status:** Draft task file  
**Scope:** Planning/spec only. No production code changes in this task.

## Problem Statement

The reviewer currently re-runs full test/typecheck commands in many rounds even when the implementer already provided passing evidence in a recent `pairflow pass`. This duplicates work, increases review-loop latency, and spends reviewer budget on execution instead of code analysis.

## Proposed Behavior

Default behavior should change to:

1. Orchestrator verifies implementer test evidence from the latest handoff.
2. If evidence is valid and fresh, reviewer is instructed to skip re-running full test suites.
3. Reviewer focuses on code review, risk analysis, and test-gap detection.
4. Reviewer can still require targeted or full test execution when objective triggers are present (decision matrix below).

Reviewer instruction text should explicitly include:
"Implementer test evidence has been orchestrator-verified. Do not re-run full tests unless a trigger from the decision matrix applies."

## Decision Matrix: When Reviewer Must Still Run Tests

| Condition | Evidence State | Reviewer Action |
|---|---|---|
| Implementer evidence missing | No test/typecheck record in latest handoff | Run required baseline checks before final judgment |
| Evidence unverifiable | Parsing failed, unknown command, missing exit status, corrupted artifact | Run checks directly; report verification failure |
| Evidence stale | New commit(s) after evidence timestamp | Re-run at least impacted checks |
| Scope changed by reviewer request | Reviewer asked for new tests or risky refactor | Run targeted checks for changed scope |
| High-risk domain touched | Concurrency, persistence, auth/security, destructive flows | Run targeted high-risk tests; escalate to broader suite if gaps remain |
| Flaky/infra uncertainty | Prior run indicates timeout/flaky infrastructure | Re-run minimal confirmation set, then decide on full run |
| No trigger applies | Verified, fresh, complete evidence | Skip reviewer re-run and proceed with code review only |

## Orchestrator Verification Requirements

The orchestrator verification layer should require all of the following before marking evidence as trusted:

1. **Command provenance**
   - Evidence maps to explicit commands (`pnpm typecheck`, `pnpm test`, targeted test command, etc.).
   - Commands are captured from implementer execution logs, not free-text claims alone.
2. **Exit status integrity**
   - Each required command has successful exit code.
   - No partial/suppressed failures in the same run segment.
3. **Output sanity checks**
   - Runner output includes recognizable completion markers (for example pass counts or final success line).
   - Invalid or truncated output invalidates trust.
4. **Freshness binding**
   - Evidence bound to commit SHA/worktree state used for handoff.
   - Any post-evidence diff invalidates prior verification.
5. **Coverage of required checks**
   - Task-defined mandatory checks are all present.
   - If task requires targeted tests, generic suite pass is not enough.
6. **Verification artifact**
   - Orchestrator emits structured verification summary (status, commands, timestamps, commit reference, invalidation reason if any).

## Acceptance Criteria

1. Spec defines default skip behavior with explicit preconditions.
2. Spec includes a concrete decision matrix for reviewer test execution.
3. Spec defines orchestrator verification rules detailed enough for implementation.
4. Spec includes rollout, risk, and metric framework.
5. Spec states this task is planning-only and makes no production code changes.

## Rollout Steps

1. **Phase 0: Spec alignment**
   - Approve this behavior contract and decision matrix.
2. **Phase 1: Verification plumbing**
   - Add structured verification artifact generation in orchestrator pass handling.
3. **Phase 2: Reviewer prompt integration**
   - Inject verification status and skip/run directive into reviewer kickoff/resume prompts.
4. **Phase 3: Guardrails**
   - Enforce mandatory re-run when matrix trigger applies.
   - Log reason codes for skip vs run decisions.
5. **Phase 4: Evaluate and tune**
   - Compare latency/quality metrics against baseline and adjust trigger thresholds.

## Risks and Mitigations

1. **False trust in invalid evidence**
   - Mitigation: strict parsing + exit-code binding + freshness checks.
2. **Missed regressions due to fewer reviewer reruns**
   - Mitigation: mandatory triggers for high-risk/stale/unverifiable conditions.
3. **Prompt ambiguity**
   - Mitigation: standardized reviewer template with explicit skip/run reason.
4. **Metric blind spots**
   - Mitigation: record structured reason codes and verification outcomes per round.

## Metrics to Track

1. Median reviewer round duration (before vs after rollout).
2. Percentage of reviewer rounds that skip full test reruns.
3. Time saved per round from avoided redundant test execution.
4. Post-review escape rate of P1 issues.
5. Reopen rate after convergence (quality guardrail).
6. Verification failure rate and top invalidation reasons.

## Open Questions

1. What is the default freshness window: strict commit match only, or bounded diff policy?
2. Should high-risk trigger categories be globally fixed or task-configurable?
3. Should reviewer be allowed to override skip without trigger, and how is that audited?
4. What minimum evidence schema should be persisted in bubble artifacts for forensic replay?
