# v11 Boundary Decisions

Status: active  
Owner: architecture/runtime  
Scope: retained architecture decisions from the completed v1.1 boundary simplification rollout

## Purpose

This document keeps the forward-looking decisions from the completed v1.1
boundary simplification work. The old rollout roadmap, component one-pagers,
and task inventory were implementation-era material and are no longer current
architecture authority.

Use this document together with:

- [architecture-fitness-checks.md](/Users/felho/dev/pairflow/docs/architecture/architecture-fitness-checks.md)
- [v11-placement-and-extraction-governance.md](/Users/felho/dev/pairflow/docs/architecture/v11-placement-and-extraction-governance.md)
- [v11-ports-governance.md](/Users/felho/dev/pairflow/docs/architecture/v11-ports-governance.md)

## Decisions

### 1) State Writes Need Explicit Authority

State writes must be owned by explicit, reviewable boundaries. Normal command
flow must not grow ad hoc state persistence paths inside orchestration code.

Current enforcement lives in the mutation, transition, and boundary fitness
checks. Recovery/reconcile paths may have different semantics than forward
command mutation, but they still need an explicit owner and deterministic
evidence basis.

### 2) Errors Need Stable Code And Context

Runtime and architecture boundaries must expose actionable failure semantics.
Message-only wrapping is not enough: thrown or surfaced boundary errors need a
stable code and enough context for retry, recovery, or operator diagnosis.

Current enforcement lives in the `error` fitness check and the local typed error
boundaries under `src/v11/**`.

### 3) Parity Is Not Enough For Critical Side Effects

Legacy/v11 parity can still miss user-visible failures when both paths mutate
state but a runtime side effect silently fails. Critical commands therefore need
explicit semantic side-effect invariant coverage.

Current enforcement lives in the `critical_side_effect` fitness check.

### 4) Fitness Findings Use Refactor-First Triage

Fitness findings should be triaged in this order:

1. refactor when the finding points to a real ownership or runtime risk,
2. checker/policy refinement when the finding is a reproducible false positive,
3. temporary exception only when the first two are unsafe or blocked.

No check should be silently downgraded from fail to warn. Exceptions must remain
explicit and temporary.

### 5) Contract Coverage Has A Stop Rule

Contract case growth should protect known risk without turning into endless
variant collection. The active baseline is:

1. one happy-path triad per critical command,
2. at least two high-value guard/error triads,
3. at least one invariant triad,
4. new cases after baseline only for a new reason code, a new risk class, or a
   real regression/incident.

Current policy lives in the contract coverage baseline section of
[architecture-fitness-checks.md](/Users/felho/dev/pairflow/docs/architecture/architecture-fitness-checks.md).

### 6) Ports Are A Top-Level v11 Boundary

Port contracts live under `src/v11/ports/**`, not under
`src/v11/shared/ports/**`.

The earlier `shared/ports` placement correctly treated ports as shared
contracts, but it made the most important application/infrastructure seam look
like one ordinary shared helper directory among many. That weakened discovery
and mixed abstraction levels inside `shared/**`.

The current decision is to promote ports to a first-class v11 layer:

1. `application/**` and `shared/**` may depend on `ports/**` contracts.
2. `infrastructure/**` implements those contracts.
3. `ports/**` stays type/contract-only and must not import infrastructure.
4. `shared/**` remains for policy-neutral helpers, meanings, and pattern
   contracts, not IO capability seams.

## Historical Source

These decisions were consolidated from the removed
`docs/v1.1-boundary-simplification/decision-log.md`. Use git history for the
full rollout-era rationale if needed; do not use the removed v1.1 roadmap or
component one-pagers as current authority.
