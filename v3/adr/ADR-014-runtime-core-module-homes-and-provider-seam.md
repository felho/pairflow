# ADR-014: runtime-core module homes — lifecycle in the kernel, the provider seam as a port

Status: accepted
Date: 2026-07-18
Links: supersedes — · amends ADR-001 · depends-on ADR-005 · related ADR-013

Draft-lane ADR (README §4 step 5): rides the `ch12-runtime-core`
contract-draft (row C22) — `proposed` with the draft's content
commit; flipped `accepted` by the draft's human ratification act
(2026-07-19, the ratifying commit).

## Context

Plan chapter 12 realizes the L0d lifecycle/activation spine, the L0c
run-profile cascade, and the L0e runtime-context provider CONTRACT
(the real `pairflow.worktree` provider is ch 9's). The lifecycle
handlers (the source-routed RECEIVE entry, CREATE/START/KICKOFF/
CANCEL/FAIL, `activate`, the admission ladder) need a stated home,
and the provider seam needs a placement that keeps the
port-parametric kernel rule intact while the PRODUCTION registry is
empty at ch12 (draft C16) and the only shipped provider player is the
testkit's scripted one (draft C22).

## Decision

1. **NO new production module at ch12.** The lifecycle handlers live
   in `kernel/` — they ARE the kernel (the L0d units are kernel
   pseudocode; the admission ladder is the kernel's entry protocol).
   The ch-4 `startInstance` one-shot is retired in place (draft C24),
   never moved.
2. **The provider seam is a PORT.** `ports/` gains the
   `RuntimeContextProvider` contract and the `ProviderRegistry` type;
   `domain/` gains the ref/projection/requirement value shapes. The
   composition root injects the registry into the KERNEL only —
   admission validates the spec map's SHAPE and never resolves
   provider names (draft C16: `provider-resolved-at-start` is the
   model invariant; the definition compiler's catalog injection does
   NOT gain a provider leg — the deliberate asymmetry with ADR-013's
   gate catalog).
3. **The testkit ships the scripted provider player**
   (`scriptedRuntimeContextProvider`: records `provision` calls,
   plays configured READY events including hostile kind-mismatch,
   duplicate-READY, and never-ready holds). ADR-005's boundaries are
   untouched: testkit imports ports/domain/emit at most; production
   never imports testkit; the dev entrypoint may (ADR-009).
4. **`src/providers/` is born WITH the first real provider (ch 9)**,
   not speculatively — an empty production module would be dead
   weight; the registry composition at ch12 is the empty map at the
   composition root.

## Alternatives Considered

- **A `src/lifecycle/` module beside the kernel** — rejected: the L0d
  units ARE kernel pseudocode; a separate module would split the
  admission ladder from HANDLE and invent a boundary the model does
  not carry.
- **An empty `src/providers/` module now** — rejected: dead weight
  with zero members (the ch12 production registry is empty); the
  module is born with its first member (ch 9), the no-speculative
  rule.
- **Wiring the testkit scripted provider into the production
  registry** — rejected: breaches ADR-005 (production never imports
  testkit) and fakes a capability the chapter does not ship; dev
  replay (ADR-009) is the sanctioned pre-ch9 provisioned-path
  surface.
- **Admission-time provider-name resolution (the ADR-013 gate
  pattern)** — rejected: `provider-resolved-at-start` is a model
  invariant; the asymmetry with the gate catalog is the model's, not
  a convenience.

## IC-N Screen (mandatory)

`no` — module placement and an injected registry seam touch no banned
kernel shape (no deterministic replay, no leader-per-shard, no
event-sourcing-as-truth, no reconciler/outbox for kernel state). This
screen does not bypass the model↔code divergence stop: the lifecycle
realization projects the l0d/l0e units, and any unit change routes
through v3/model + check.sh (the ch12 draft's decision point 3 is
exactly such a model-plane act).

## Consequences

- The kernel stays port-parametric (ADR-001's lint rule unchanged —
  `kernel/` imports domain + ports only); no new lint boundary is
  needed at ch12.
- ch 9 adds `src/providers/` + the `pairflow.worktree` member behind
  the SAME port and registry seam — additive, no kernel change.
- A spec-declaring template is honestly unstartable through the
  shipped CLI until ch 9 (`Rejected(runtime_context_provider_unavailable)`
  at START — draft C16), replacing the retired ch11-P3b CLI guard.

## Verification

- The ADR-001 module-boundary lint stays green with the new
  `ports/`/`domain/` surfaces and no `src/providers/` directory.
- ch12-P3's tests drive the scripted player through the injected
  registry (kind-mismatch, duplicate-READY, never-ready) — the port
  contract exercised without any production provider.
- The IC-N screen above records the no-bypass stance; the ch12
  packets' drift lanes (unit map, rejection registry) stay green
  across the realization.

## Related

- Levels: L0c / L0d / L0e (model sections 03–05).
- Contract: `v3/implementation/contracts/ch12-runtime-core-contract.md`
  (rows C15/C16/C22/C25).
- Prior ADRs: ADR-001 (module boundaries), ADR-005 (testkit),
  ADR-009 (dev entrypoint), ADR-013 (the gate registry's contrasting
  admission-time resolution).
