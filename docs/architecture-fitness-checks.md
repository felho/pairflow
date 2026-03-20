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

## Exception Format (Machine-Readable)

`tools/fitness/policy.json` uses structured exception objects:

```json
{
  "id": "dep-allow-edge-001",
  "kind": "allow-edge",
  "owner": "architecture",
  "reason": "temporary migration bridge",
  "expires_milestone": "M2",
  "from": "src/v11/domain/legacy-bridge.ts",
  "to": "src/v11/application/migration-bridge.ts"
}
```

Rules:

- `id`, `kind`, `owner`, `reason`, `expires_milestone` are mandatory.
- `dependency` check supports:
  - `allow-edge` with `from` + `to`.
  - `allow-cycle` with `paths` (array of cycle member files).
- Lifecycle context is provided via `defaults.current_milestone` in policy.
  - Expiry trigger: `current_milestone > expires_milestone`.
  - Example: current `M2`, exception expiry `M1` => expired.
- `dependency` check lifecycle gate mode is policy-driven via `exception_lifecycle_mode`:
  - `report-only`: expired lifecycle stays `warn`.
  - `soft-fail`: expired lifecycle is `warn` and surfaced in CI soft-fail summary.
  - `hard-fail`: expired lifecycle is promoted to `fail` and blocks CI.
- Exceptions must stay temporary and milestone-bound.

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

## Cross-Cutting Overlay: Critical Side-Effect Invariants

- metric: command-level semantic invariants for critical runtime side effects.
- scope: migralt command flow-k a `src/v11/application/**` retegen.
- pass-fail:
  - success pathon az elvart side-effect adapter hivas megtortenik (pl. delivery),
  - vagy explicit delivery-failure status jelenik meg az eredmenyben (nincs csendes kieses).
- exceptions: ideiglenes milestone-bound exception engedett (`owner`, `reason`, `expires_milestone` kotelezo).
- report: commandonkenti invariant status (`covered|missing|failing`) + hivatkozott tesztartifact.
- owner: architecture/runtime.
- rollout mode:
  - M0-M1: report-only.
  - M2+: soft-fail.
  - M3+: hard-fail a `v11` allapotu commandokra.

Seed invariants:

- `kickoff`: sikeres kickoff utan implementer delivery path verifikalt legyen (adapter call vagy explicit failure status).
- `pass` es `converged`: delivery status mezok folyamatosan asserted coverage alatt maradjanak.

## Notes

1. M0 delivers executable skeleton only; thresholds and hard-fail promotion are milestone-gated.
2. Machine-readable policy is tracked in `tools/fitness/policy.json`.
