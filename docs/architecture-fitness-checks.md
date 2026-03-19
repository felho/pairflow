# Architecture Fitness Checks (v1)

Status: draft  
Owner: architecture  
Scope: M0 skeleton

## Purpose

Single source of truth for v1.1 architecture fitness checks.
This document defines what is measured, where it applies, and how CI should treat failures.

## Rollout Modes

1. `report-only`: always produce report, never block.
2. `soft-fail`: warning in CI and PR summary, merge still allowed.
3. `hard-fail`: CI failure before merge.

## Check Definitions

## 1) Boundary Fitness

- metric: direct state/transcript writes on orchestrator paths.
- scope: `src/v11/application/**`, `src/v11/domain/**`.
- pass-fail: no direct state/transcript write in orchestrator command paths.
- exceptions: explicit migration allowlist with owner, reason, expiry milestone.
- report: command-level offender list + import/write trace.
- owner: architecture.
- rollout mode (current): report-only.

## 2) Mutation Fitness (Dual-Gate)

- metric: state-changing flow uses transcript-first mutation boundary.
- scope: `src/v11/application/**`, `src/v11/infrastructure/**`.
- pass-fail: mutation path does not bypass mutation boundary contracts.
- exceptions: none for `v11` command state; temporary allowlist only in parity.
- report: mutation path count + bypass candidates.
- owner: architecture/runtime.
- rollout mode (current): report-only.

## 3) Transition Fitness (Dual-Gate)

- metric: state transitions are validated before persist.
- scope: `src/v11/application/**`, `src/v11/domain/**`.
- pass-fail: no persistable next-state produced without transition validation.
- exceptions: operator force path with mandatory audit event.
- report: transition calls and potential bypass call-sites.
- owner: architecture/runtime.
- rollout mode (current): report-only.

## 4) Error Fitness

- metric: error code and context completeness on command boundaries.
- scope: `src/v11/**`.
- pass-fail: boundary errors include stable code and required context fields.
- exceptions: none.
- report: missing-code/missing-context histogram.
- owner: architecture/observability.
- rollout mode (current): report-only.

## 5) Complexity Fitness

- metric: file-size and function complexity budget.
- scope: `src/v11/**`.
- pass-fail: top offenders stay within configured thresholds.
- exceptions: temporary budget waiver with expiry milestone.
- report: top offender table with trend deltas.
- owner: architecture.
- rollout mode (current): report-only.

## 6) Dependency Fitness

- metric: dependency cycles and forbidden layer import directions.
- scope: `src/v11/**`.
- pass-fail: no forbidden cycle/import direction violations.
- exceptions: temporary migration allowlist with expiry milestone.
- report: cycle graph summary + violating edge list.
- owner: architecture.
- rollout mode (current): report-only.

## Notes

1. M0 delivers executable skeleton only; thresholds and hard-fail promotion are milestone-gated.
2. Machine-readable policy is tracked in `tools/fitness/policy.json`.
