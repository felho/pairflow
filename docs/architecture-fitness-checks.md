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
  - Policy wiring: `tools/fitness/policy.json` `critical_side_effect.mode_by_milestone` map.
  - CI override: `PAIRFLOW_FITNESS_CURRENT_MILESTONE` env vagy `--current-milestone` flag (flag elsobbseggel).

Seed invariants:

- `kickoff`: sikeres kickoff utan implementer delivery path verifikalt legyen (adapter call vagy explicit failure status).
- `pass` es `converged`: delivery status mezok folyamatosan asserted coverage alatt maradjanak.

## Evolution History (M0 -> M3 Hardening Story)

The current fitness system was built incrementally, not as a one-shot "perfect checker" rollout.

1. **M0 bootstrap (executable skeleton):**
   - We introduced a machine-readable policy (`tools/fitness/policy.json`) and executable check runners.
   - Initial implementations were intentionally simple (mostly regex / line-window heuristics).
   - Goal was fast visibility and low setup cost, not perfect semantic precision.
2. **Safety rollout modes from day one:**
   - `report-only` for signal collection and baseline discovery.
   - `soft-fail` for enforcement rehearsal without blocking delivery.
   - `hard-fail` only after noise level is acceptable.
3. **Refactor-driven learning loop:**
   - Running checks against real migration work surfaced both true issues and false positives.
   - We used those findings to harden both code and checkers (never checker-only gaming).
4. **Checker hardening path:**
   - `transition` and `mutation` moved from naive regex assumptions toward AST-assisted analysis.
   - Metadata-only state persists were separated from lifecycle transitions.
   - Name-based marker loopholes were removed.
5. **Semantic gap discovery:**
   - Parity alone did not protect critical side effects (example class: kickoff delivery path).
   - This led to a new cross-cutting fitness overlay: **critical side-effect invariants**.
6. **Current maturity posture:**
   - Some checks are now low-noise enough for stronger enforcement on migrated scope.
   - Remaining high-noise areas are explicitly tracked with warn/fail split and phased hardening.

## Triage Decision Matrix (Policy vs Refactor vs Exception)

Every fitness finding must be triaged explicitly before action.

1. **Refactor (preferred)**
   - Choose when the finding maps to a real architecture/runtime risk.
   - Typical signals: unstable behavior risk, boundary leakage, high-maintenance hotspot.
   - Requirement: small-slice change + regression proof (contract/integration tests).
2. **Policy / Checker refinement**
   - Choose when findings are systematic false positives and code is architecture-aligned.
   - Typical signals: rule over-matches by syntax, misses semantic distinction, penalizes accepted pattern.
   - Requirement: add/update checker tests that demonstrate old false positive and new expected behavior.
3. **Exception (last resort, temporary)**
   - Use only when immediate refactor/policy change is unsafe or blocked by milestone timing.
   - Mandatory fields: owner, reason, expiry milestone, explicit allow scope.
   - Exception lifecycle must be visible in CI (`report-only`/`soft-fail`/`hard-fail` behavior by mode).

Decision guardrails:

- No silent downgrade from `fail` to `warn` without rationale and tests.
- No permanent exceptions; expiry is required.
- Each triage decision must leave audit evidence:
  - commit,
  - checker/test artifact,
  - short note in decision log when rule semantics change.

## Operational Workflow For New/Red Findings

1. Capture baseline report (`fitness:check:ci`) and cluster findings by check + pattern.
2. For each cluster decide: `real issue` vs `checker/policy noise`.
3. Apply one small batch:
   - either code refactor,
   - or checker/policy refinement,
   - or temporary exception (with expiry).
4. Re-run targeted tests + lint/typecheck + fitness report.
5. Keep rollout mode conservative (`report-only` -> `soft-fail` -> `hard-fail`) until noise is controlled.
6. Promote enforcement only on migrated scope that is proven stable.

## Contract Case "Good Enough" Baseline (Stop Rule)

Goal: avoid both under-testing and endless case expansion.

### Minimum per critical command

For each migrated, release-relevant command (`pass`, `kickoff`, `converged`, `approval`, `merge`, `commit`, `reply`, `askHuman`, `start`, `resume`, `stop`, `reconcile`):

1. `1` happy-path triad (`legacy` + `v11` + `parity`).
2. At least `2` high-value guard/error triads (state/eligibility/routing errors).
3. At least `1` invariant triad (critical side effect, cleanup semantics, or mutation no-op/removal behavior).

### Risk-tier coverage target

1. `P0` (state integrity, transcript/state divergence, silent side-effect loss): `100%` contract coverage for identified classes.
2. `P1` (incorrect gate decision, merge/commit safety, routing eligibility): target `>=80%` coverage of known classes.
3. `P2` (message wording / low-impact UX variants): optional for release gate; keep as backlog unless incident-driven.

### "Foundation complete" stop condition

The baseline is considered **good enough** when all are true:

1. Minimum-per-command rule above is satisfied for all currently migrated commands.
2. Local CI gates are stable for the migrated scope (`check` + contract suites + fitness lanes) across repeated runs.
3. Last hardening cycles do not reveal a new risk class, only low-impact variants of known patterns.

After this point, new case expansion is **incident-driven**, not open-ended.

## Contract Case Admission Policy (Post-Baseline)

Add a new contract case only if at least one condition is true:

1. It covers a previously uncovered reason code.
2. It covers a genuinely new risk class (not a naming/input variant).
3. It reproduces a real regression/incident and prevents recurrence.

If none of the above are true, defer as backlog variant and do not block migration progress.

## When To Add A New Fitness Check

Add a new check when all of the following are true:

1. Existing checks cannot express a recurring risk class.
2. The risk has meaningful architectural/business impact (not cosmetic style preference).
3. There is a deterministic detection strategy (or a clear report-only path with hardening plan).
4. We can define:
   - metric,
   - scope,
   - pass/fail semantics,
   - owner,
   - rollout mode and promotion criteria.

Example already applied in this project:

- `critical_side_effect` overlay was added after parity-only protection proved insufficient for delivery-path regressions.

## Notes

1. M0 delivers executable skeleton only; thresholds and hard-fail promotion are milestone-gated.
2. Machine-readable policy is tracked in `tools/fitness/policy.json`.
3. CI entrypoint: `pnpm fitness:check:ci` (`scripts/fitness-check-ci.sh`), which always forwards an explicit `--current-milestone` value.
