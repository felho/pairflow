# Architecture Fitness Checks

Status: active  
Owner: architecture/runtime  
Scope: `tools/fitness/policy.json`, `tools/fitness/checks/**`, and fitness-governed `src/v11/**` / `tests/contracts/v11/**` scope

## Purpose

Single source of truth for architecture fitness checks.

This document defines:

- what each check is trying to protect,
- which checks are authoritative versus heuristic,
- how rollout modes work,
- and how the dependency fitness model must evolve to avoid superficial compliance.

The fitness system is a guardrail, not the architecture itself.

## Canonical Sources

- machine-readable policy: `tools/fitness/policy.json`
- executable checks: `tools/fitness/checks/**`
- placement policy: [v11-placement-and-extraction-governance.md](/Users/felho/dev/pairflow/docs/architecture/v11-placement-and-extraction-governance.md)
- ports policy: [v11-ports-governance.md](/Users/felho/dev/pairflow/docs/architecture/v11-ports-governance.md)

## Rollout Modes

1. `report-only`: always produce report, never block
2. `soft-fail`: warning in CI and PR summary, merge still allowed
3. `hard-fail`: CI failure before merge

## Current Effective Policy

Current milestone is `M6` in `tools/fitness/policy.json`.

At this milestone the effective posture is:

- `boundary`: hard-fail via `mode_by_milestone`
- `mutation`: hard-fail via `mode_by_milestone`
- `transition`: hard-fail via `mode_by_milestone`
- `error`: hard-fail via `mode_by_milestone`
- `complexity`: hard-fail directly
- `contract_timeout_policy`: hard-fail via `mode_by_milestone`
- `dependency`: hard-fail via `mode_by_milestone`
- `critical_side_effect`: hard-fail via `mode_by_milestone`

This means the system is already operating as an enforcement gate, not only as advisory reporting.

## Exception Format

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

- `id`, `kind`, `owner`, `reason`, `expires_milestone` are mandatory
- `dependency` check supports:
  - `allow-edge` with `from` + `to`
  - `allow-cycle` with `paths`
- exceptions must remain temporary and milestone-bound
- exception lifecycle behavior is controlled by policy, not by ad hoc CI decisions

## Check Definitions

### 1) Boundary Fitness

- metric: forbidden direct state/transcript writes on orchestrator paths
- scope: `src/v11/application/**`, `src/v11/domain/**`
- intent: orchestration code must not bypass the approved mutation/transcript boundary
- owner: architecture

### 2) Mutation Fitness

- metric: transcript-first mutation boundary usage
- scope: `src/v11/application/**`, `src/v11/infrastructure/**`
- intent: state-changing flow must preserve transcript-first mutation ordering
- owner: architecture/runtime

### 3) Transition Fitness

- metric: transition validation before persist
- scope: `src/v11/application/**`, `src/v11/domain/**`
- intent: no persistable next-state should be produced without transition validation
- owner: architecture/runtime

### 4) Error Fitness

- metric: stable error code and required context completeness
- scope: `src/v11/**`
- intent: typed/runtime boundaries must expose actionable failure semantics, not ambiguous throw sites
- owner: architecture/observability

### 5) Complexity Fitness

- metric: file size and function complexity budget
- scope: `src/v11/**`
- intent: prevent monolithic ownership hotspots and unreviewable control flow growth
- owner: architecture

### 6) Contract Timeout Policy

- metric: raw timeout literals in contract tests
- scope: `tests/contracts/v11/*.contract.test.ts`
- intent: contract-time budgets must stay explicit, centralized, and reviewable
- owner: architecture/runtime

### 7) Dependency Fitness

- metric: forbidden layer import directions and cycles
- scope: `src/v11/**`
- intent: preserve declared architecture boundaries and block accidental layer leakage
- owner: architecture

### 8) Critical Side-Effect Invariants

- metric: command-level semantic invariant coverage for critical side effects
- scope: `src/v11/application/**`
- intent: parity is not enough; critical runtime effects must have explicit regression coverage
- owner: architecture/runtime

## Current Implementation Status

All policy-declared checks are currently wired to executable runners in
`tools/fitness/checks/**`.

The fallback `not_implemented` report path exists in the runtime, but no current
policy check ID uses it.

Implementation maturity by check:

- `boundary`: lightweight line-pattern heuristic; detects direct
  `writeStateSnapshot(...)` and `appendProtocolEnvelope(...)` calls by regex
- `mutation`: TypeScript AST-assisted heuristic with metadata-only persist carveout
- `transition`: TypeScript AST-assisted heuristic with validation-marker detection
- `error`: TypeScript AST-assisted heuristic around throw sites, structured wrappers,
  code/context evidence, and warn/fail split
- `complexity`: AST-derived file/function metrics; thresholds are currently
  hard-coded in the checker, not policy-configurable
- `contract_timeout_policy`: TypeScript AST-based check for raw timeout literals and
  non-standard timeout references in contract tests
- `dependency`: AST-based import graph and cycle detection, but still limited to the
  currently implemented layer model and relative import resolution
- `critical_side_effect`: AST-based evidence scan, currently implemented for the
  seed command set `kickoff`, `pass`, `converged`, `approval`, `reply`,
  `askHuman`

This means the current system is fully executable, but several checks still rely
on heuristics rather than complete semantic proof.

## Dependency Fitness: Current Problem Statement

The current dependency fitness rule is useful but incomplete.

It correctly catches:

- direct `application -> infrastructure` imports
- cycles inside `src/v11/**`
- relative import edges inside the scanned `src/v11/**` graph

But by itself it does **not** prove that the replacement architecture is correct.

Current implementation limits to keep in mind:

- it resolves only relative intra-scope imports, not arbitrary alias/module
  boundaries
- it derives layer from the first path segment under `src/v11/`
- because of that, it does **not** yet implement the documented
  `src/v11/shared/ports/**` model semantically
- it does **not** yet implement anti-circumvention checks
- it does **not** yet implement ownership-type detection

This creates a real failure mode:

- a forbidden edge disappears
- but the code still violates the purpose of the rule through a thin wrapper or re-export camouflage

So the dependency check must remain, but it must become more semantic.

## Required Evolution Of Dependency Fitness

The dependency model should now be treated as four linked rules, not one isolated import check.

### 1) Keep The Current Layer Rule

This stays in place:

- `application -> infrastructure` remains forbidden
- `application -> application/domain/shared` remains allowed

This is still the first and most useful guardrail.

### 2) Add An Anti-Circumvention Check

The checker must detect obvious fake compliance patterns, especially:

- direct re-export of an infrastructure adapter from `shared/**`
- 1:1 forwarding wrapper with no boundary meaning
- `shared` module whose real purpose is only to mask infrastructure ownership
- future `shared/ports/**` modules that import and call infrastructure inline

The point is to reject “edge disappeared, ownership did not.”

### 3) Add Ownership-Type Checking

The checker must distinguish between:

- pure shared/helper/derivation code
- real infrastructure adapters
- explicit application-facing capability contracts

At minimum, the policy should treat the following as strong infrastructure signals:

- filesystem persistence
- child-process / git / tmux / process execution
- locks
- runtime session access
- state/transcript persistence
- storage-backed registries

If code has these characteristics, moving it into plain `shared/**` should require strong justification or be rejected.

### 4) Adopt An Explicit Ports Model

The codebase now treats `ports` as a real architectural concept, not a fitness-only trick.

Canonical policy:

- application may depend on `src/v11/shared/ports/**`
- infrastructure owns implementations
- ports must define typed capability contracts
- ports must not be pass-through wrappers

Details live in [v11-ports-governance.md](/Users/felho/dev/pairflow/docs/architecture/v11-ports-governance.md).

## Dependency Fitness: Target Rule Set

Once the ports model is wired into fitness, the dependency check should enforce all of the following:

1. `application -> infrastructure` is forbidden
2. `application -> shared/ports` is allowed
3. `shared/ports -> infrastructure` is forbidden
4. `shared/ports` must not be pass-through adapter camouflage
5. infrastructure implementations may depend on `shared/ports` contracts
6. plain `shared/**` must not absorb obvious infrastructure ownership just to satisfy layer rules

## Triage Matrix

Every dependency finding should be triaged into one of these categories before refactor:

### A) `move-out-of-infrastructure`

Use when:

- the code is not really infrastructure
- it is pure derivation, path math, ID generation, normalization, or boundary-neutral helper logic

Action:

- move to `domain` or `shared`

### B) `keep-infrastructure-needs-port`

Use when:

- the code is real IO/runtime/persistence/process adapter logic

Action:

- keep implementation in `infrastructure`
- introduce or use an explicit port boundary

### C) `legacy-bridge-for-now`

Use when:

- immediate cleanup is unsafe
- a temporary boundary is still needed

Action:

- document as explicit temporary bridge
- add expiry/removal trigger where appropriate

### D) `checker-noise`

Use when:

- code is already architecture-aligned
- the checker is over-matching syntactically

Action:

- refine checker semantics with regression tests

## Triage Decision Matrix

Every fitness finding must be triaged explicitly before action.

1. **Refactor (preferred)**
   - choose when the finding maps to a real architecture/runtime risk
   - requirement: small-slice change + regression proof
2. **Policy / Checker refinement**
   - choose when findings are systematic false positives and code is architecture-aligned
   - requirement: checker tests that prove the previous false positive and the new expected behavior
3. **Exception (last resort, temporary)**
   - use only when immediate refactor/policy change is unsafe or blocked
   - expiry is mandatory

Guardrails:

- no silent downgrade from `fail` to `warn`
- no permanent exceptions
- no “shared wrapper” fixes accepted without ownership review

## Operational Workflow For New/Red Findings

1. Capture baseline report (`fitness:check:ci`)
2. Cluster findings by check and pattern
3. For dependency findings, classify first:
   - `move-out-of-infrastructure`
   - `keep-infrastructure-needs-port`
   - `legacy-bridge-for-now`
   - `checker-noise`
4. Apply one small batch:
   - code refactor
   - checker refinement
   - or temporary exception
5. Re-run targeted tests + lint/typecheck + fitness report
6. Promote enforcement only where the rule is both useful and hard to game

## Contract Coverage Baseline

Goal: avoid both under-testing and endless case expansion.

### Minimum per critical command

For each migrated, release-relevant command (`pass`, `kickoff`, `converged`, `approval`, `merge`, `commit`, `reply`, `askHuman`, `start`, `resume`, `stop`, `reconcile`):

1. one happy-path triad (`legacy` + `v11` + `parity`)
2. at least two high-value guard/error triads
3. at least one invariant triad

### Stop Rule

The baseline is considered good enough when all are true:

1. minimum-per-command rule is satisfied for all currently migrated commands
2. local CI gates are stable for migrated scope
3. last hardening cycles reveal only low-impact variants, not new risk classes

After this point, new contract-case growth is incident-driven.

## When To Add A New Fitness Check

Add a new check only when all are true:

1. existing checks cannot express a recurring risk class
2. the risk has meaningful architectural or runtime impact
3. the detection strategy is deterministic enough, or has a clear hardening plan
4. we can define:
   - metric
   - scope
   - pass/fail semantics
   - owner
   - rollout mode

## Notes

1. The current dependency check is necessary but not sufficient.
2. The ports model is a codebase concept first, and a fitness-policy concept second.
3. Fitness should prevent superficial compliance, not reward it.
