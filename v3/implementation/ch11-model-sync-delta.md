# ch11 model-sync — the ratified delta evidence (the one-off bridge's exact referent)

Purpose: the IMMUTABLE enumeration of the three drift-lane deltas produced
by the ch11 gate-admission model fix, referenced by the one-off
approve-precondition exception and consumed by the ch11-P0
model-registry-sync packet. The ratified model state: branch
`model-sync/ch11-gate-admission`, tip `453d3be9` (commits `3b3283a2` +
`453d3be9`). Derivation is mechanical over PINNED refs — never a moving
`main`/`HEAD` (a later main move must not change what "re-runnable" means):

```
base:  cd52433bf4b3ede159b0ea86c2790d398828bfc3   (the main tip the branch forked from)
model: 453d3be9b1d31ad2aaf2c61b6bb5d3599eb6abd0   (the ratified model state)
```

Re-running the recorded commands over these two refs MUST reproduce the
sets below exactly; ANY divergence beyond them BLOCKS the P0 approve.

## Lane 1 — `v3/src/drift/rejectionNames.test.ts` (2 tests red)

Registry: **85 → 54**. Derivation: the `- \`<name>\` — first appears` set of
`docs/v3/convergence/model-src/ledger.md` §3 at base `cd52433b` MINUS the
same set at model `453d3be9`. The 31-name removal set (all moved to the
definition-issue channel; zero additions):

```
action_outcome_ambiguous_route, action_outcome_no_route,
action_outcome_target_unresolved, action_outcomes_empty,
action_retry_requires_auto, auto_action_payload_unsupported,
child_key_missing, child_template_ref_missing,
child_template_ref_unresolved, child_wait_for_empty,
child_wait_for_incomplete, child_wait_target_unresolved,
decision_gate_empty, decision_target_unresolved,
gate_config_not_supported, invalid_action_outcome_schema,
invalid_action_step, invalid_decision_gate_config,
invalid_decision_payload_schema, invalid_gate_config,
invalid_process_gate_config, invalid_release_policy,
invalid_retry_budget, recommends_on_non_gate,
recommends_unknown_decision, release_boundaries_empty,
release_boundaries_not_allowed, release_policy_undeclared,
retry_escalation_target_unresolved, unresolved_context_block_ref,
unsupported_action_trigger
```

Dual name STAYING in the registry with a compile twin:
`runtime_context_required_for_process_gate` (the HANDLE `ready(∅)` runtime
lane). Runtime backstop STAYING: `gate_evaluator_unavailable` (registry
drift), with its compile twin in `admit_definition`.

## Lane 2 — `v3/src/drift/unitMap.test.ts` (1 test red)

The units-tree key delta (`git diff --name-status cd52433b 453d3be9 --
docs/v3/convergence/model-src/units/`):

```
− l2-pseudocode/GateEvaluator            (renamed)
+ l2-pseudocode/GateRegistration
− l2a-pseudocode/GateEvaluator           (renamed)
+ l2a-pseudocode/GateRegistration
+ l2-pseudocode/admit_definition         (new — the admission contract)
+ emit-contract-pseudocode/admit_definition   (new — the EC family delta)
− emit-contract-pseudocode/validate_gate_config   (folded into l2a inheritance)
```

## Lane 3 — `v3/src/drift/domainRegistry.test.ts` (1 test red)

The ledger §4 delta (51 blocks; entities **121 → 122**):

1. `l2` block relabel: `Evaluation — one shared interface, two value types`
   → `Evaluation & admission — one registration contract, two value types`;
   entity `GateEvaluator` → `GateRegistration`; entity ADDED:
   `AdmittedDefinition (value)`.
2. `l4-child` block `New values + rejections`: entity
   `Rejected(child_template_ref_unresolved / child_key_missing /
   child_wait_for_empty / child_wait_for_incomplete /
   child_wait_target_unresolved)` → `Definition issues
   (child_template_ref_unresolved / child_key_missing /
   child_wait_for_empty / child_wait_for_incomplete /
   child_wait_target_unresolved)` (the channel move's §4 face).

## Lane 4 — `check_coverage.py --fold-time` (ADDENDUM — RATIFIED 2026-07-12)

Discovered by RUNNING the approve-time gate at P0 authoring (2026-07-12):
the coverage validation is a FOURTH approve-time surface red by the same
ratified delta — under-scoped by the original exception (and by every
review round: the discovery came from executing the gate, not reading it).
Its 9 divergences, enumerated:

1. SEVEN unit-map key-set items == EXACTLY Lane 2's seven-key delta
   (3 `unknown` = the removed keys still in `unitMap.json`; 4 `missing` =
   the new tree keys absent from it) — no new content beyond Lane 2.
2. TWO inventory-count items from the script's OWN hardcoded expected
   dict (`tools/v3-plan/check_coverage.py` line ~441: units 158, rejections
   85) — a mechanical count mirror in acceptance infrastructure, the same
   class as Lane 1's test-side count pins; re-pins to 159/54 (docstring
   count mentions ride along). A sweep of every approve-gate script
   (`check_packet.py`, `check_coverage.py`, `v3/adr/check.sh`) found NO
   other executable hardcoded inventory count — this closes the class.

Exception extension (RATIFIED 2026-07-12 by the user's explicit dual act,
naming commit `30fe3479` — the same act approved the ch11-P0 packet): at ch11-P0's
approve the `check_coverage.py --fold-time` gate may be red by EXACTLY
the 9 items above (any deviation beyond BLOCKS); P0's closed mutation
boundary EXTENDS with `tools/v3-plan/check_coverage.py` (the expected-dict
re-pin + its docstring counts); build-close adds this gate to the
must-be-green set. Everything else in the ratified exception stands.

## The one-off approve-precondition exception (ratified with the model act)

> One-off authorization (user-ratified 2026-07-11; EXPIRES at ch11-P0
> build-close or P0 abandonment): for the ratified model state `453d3be9`,
> the THREE named drift lanes above may be red at ch11-P0's approve, each
> lane's divergence EXACTLY the enumerated delta of this file — any
> deviation beyond BLOCKS the approve; every other approve-time tier-0 gate
> green; P0's mutation boundary = EXACTLY these files: the mechanical mirrors
> (`v3/src/domain/rejections.ts`, `v3/src/drift/unitMap.json`,
> `v3/src/drift/domainRegistry.ts`), the count-pinning lock test
> `v3/src/drift/rejectionNames.test.ts` (it hardcodes the 85 count at three
> sites — comment, describe, expect — all re-pinned to 54; `unitMap.test.ts`
> and `domainRegistry.test.ts` are NOT boundary members — measured: they
> carry no pinned counts, pure set-equality against their manifests), and
> the packet file — nothing else; the re-derived locks stay TWO-WAY
> exact-set (probe mutations red in both directions, executed);
> NO runtime/compiler behavior; human approve MANDATORY;
> build-close = all three lanes green + `tools/v3-model/check.sh` + full
> `pnpm ci:local` green, else STOP.

Status: **RATIFIED 2026-07-11 by the user's explicit act** ("go") — the act
covers the model bytes at `453d3be9` AND this exception text at
`de33d245`. Neither may be amended or rebased; a byte change requires a new
ratification. The ch11 boundary review evaluates whether the bridge pattern
is promoted to a standing rule or this record stays a one-off.
