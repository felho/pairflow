# Open Topic — The Emit-Contract Slice (todo Parts E/F + the A1 digest)

Date: 2026-07-06
Status: **Paper test EXECUTED (PASS, §2); review round 1 FOLDED (2026-07-07) —
Q1–Q4 decided (§3), the behavior-delta ratify list opened (§2 verdict), finding
F-EC-1 logged (§4).** Next: the build small-spec (exact rejection names +
inventory deltas + the delta ratify list), then the section build. Landing
place: section `20-emit-contract.html`, block `emit-contract-pseudocode`
(baseline `l5-pseudocode`) — the ladder re-print lives in the NEW block, so the
mirror check stays clean on every earlier block.

The last open model backlog of Block A: the actor-emit contract (todo Part E),
the policy-vs-verify gate families (Part F), and the idempotency digest
refinement (A1). One slice, because they are one story: the producer declares
(E), the checker verifies (F), and idempotency pins to the full contract under
which the payload was accepted (A1 digest → E2/E3 identity). Needed for v1
parity: v1 machine-validates emit payloads (`pass.ts`, `converged.ts`) and runs
a verify gate (`converged_validation`).

Relation: [`../convergence/core-model-todo.md`](../convergence/core-model-todo.md)
Parts E/F + A1 (the source items, with per-part status);
[`_open-kernel-primitives.md`](_open-kernel-primitives.md) §8 (the paper-test
method this section reuses).

## 1. Scope

IN: E2 (per-op payload schema + `validate_emit_contract`), E3 (versioned
vocabulary catalog), E4 (cross-field rules + explicit assertions), E5 (summary
is a headline), E7 (claim-scoped evidence obligations, producer side), E8
(packet contract projection), F1–F6 (gate families + evidence currency +
verifier independence), A1's digest/`op_id_collision`.

OUT (deliberate): E6 (the structured claim model — the todo's own words: a
named open sub-area, not to be finalized from v1); E1's extended warrant
fields (`execution_id` needs issued-context kernel state — its own
mini-decision later); deferred-gate mechanics (`gate_pending` + `GATE_RESULT`
— a later lifecycle slice, unchanged).

## 2. The paper test (the §8 method): does the slice reduce to declarations over existing contracts?

| # | Declaration | Existing contract it lands on | Notes |
|---|---|---|---|
| 1 | per-op payload schema on actor transitions (opt-in per key) | the per-key payload pattern's 4th instance — decisions (L3), action triggers (LC3a), help (L5) already declare `payload: { field: { required } }` | generalization, not new machinery; the kernel stays de-vocabularized |
| 2 | `validate_emit_contract(envelope, template, step)` in HANDLE — after capability, before the gates | the announced payload rung, in its admit-declared HOME: key-scoped at the call site, AFTER the ChoicePoint selection (the `admit_input` doc-comment already states this) | same position as `required_fields` in SUBMIT_DECISION / trigger-validation in RUN_ACTION |
| 3 | versioned vocabulary catalog (`vocabularies:`, template-referenced) + generic enum/subset constraints | a config surface + the L2 declarative-DSL precedent (constraint structure, never meaning); a `validate_emit_contracts(template)` create-validator (the house fail-at-create family) | versioning pins transcript meaning: v1 rules forever, incompatible ⇒ v2 |
| 4 | cross-field rules + explicit assertions (assert-clean, never silent) | schema features evaluated by the same generic validator | the declarative-threshold gate is the precedent for declared-rule evaluation |
| 5 | summary-is-a-headline | an invariant (E5/F2/F5): never parsed, counted, or authority; consistency checks are negative guardrails | |
| 6 | claim-scoped evidence obligations (conditional on value) — producer side | schema declares; `validate_emit_contract` checks STRUCTURE (the ref exists, claim-scoped — an envelope-level ref does not satisfy it); TRUST is the verify gate's job | the E7/F split: define vs check |
| 7 | per-op contract projection in the packet — for the OFFERABLE ops only: `offerable_ops = (transition_ops(step) ∪ declared_op_family_ops(step)) ∩ capability(template, step.role, step.id)`, with `capability` called as THE function (same-function, not same-condition — the strongest offer↔gate form; the authored-profile filter comes free) | the E8 extension of `decision_requirements` / the help projection; the intersect precedent already lives in the corpus (`assemble_context_blocks`: `capability ∩ event_types_of(transitions)` — "L1 authority ∩ transition existence") | definition sites enumerated per the F-L5-3 class lesson: template schema + `validate_emit_contract` + the packet projection — `capability` is UNTOUCHED (ops are already transition keys; the L5 op-family entry already lives in it). Closing Q4 means `available_ops` itself adopts this expression — resolving the L5-named "profile-filtered affordances" seam (which lives ONLY in the two L5 unit comments, NOT in an Absent record — verified; the deferral ledger stays additions-only) |
| 8 | gate `family: policy | verify` | a semantic dimension on the EXISTING gate declaration — orthogonal to the implementation axis (declarative/packaged/process) | F1; no mechanism change |
| 9 | verify-gate evidence currency (no stale-green) | a verify-family contract: evidence carries a currency binding (head_sha / artifact digest / command identity / exit / log ref / invocation id) matching the state it certifies; inline process gates are current BY CONSTRUCTION; committed-state-reading gates must record + re-check | a currency failure is a verify-gate BLOCK (`gate_blocked(...)` with a stale-evidence reason) — NOT a new top-level rejection |
| 10 | verifier independence is structural where required | gate binding/config enforces verifier ≠ implementer; the kernel-run process gate is the strongest form | F6; config + invariant, no mechanism |
| 11 | idempotency digest: the ledger stores `payload_digest`; same `op_id` + different digest → `Rejected(op_id_collision)` | the idempotency RUNG's refinement — the ladder's third re-print (the L1 authority-rung precedent); the digest is the versioned canonicalization pinned to the emit-contract identity (op kind + schema identity + vocabulary versions) | uniqueness key stays `(instance_id, op_id)` |

**De-bias test (Part E's own):** a non-review op `PROCESSED { row_count,
checksum_ref }` fits declaration #1–#6 with only different declared data — no
kernel change. PASS.

**New rejection names** (decided in review round 1, Q1): `op_id_collision`
(#11), `invalid_field_value` (a PRESENT but forbidden/contradictory value —
type, domain, vocabulary subset, cross-field rule; diagnostics MANDATORILY
carry the field path + the violated rule/schema id), `missing_evidence_ref`
(an unmet claim-scoped obligation, #6); `missing_required_field` is REUSED
both for required fields AND for a MISSING mandatory assertion (it IS a
required field — the one-vocabulary rule). No third schema name; registry
growth: 81 → 84.

**Verdict: PASS.** The slice reduces to config surfaces, one call-site
validator (the announced payload rung at its declared home), one create-time
validator, a semantic tag on the existing gate declaration, three invariants,
a packet-projection extension, and one rung refinement. Zero new handlers,
zero new primitives, zero new wait kinds.

**Deliberate behavior deltas — the ratify list** (the hardening-touch
discipline: pre-declared, itemized, ratified at the build review):

1. **The digest delta (#11):** today a replayed `op_id` with a DIFFERENT
   payload is a silent `Duplicate` (a no-op over a client bug); after, it is
   a visible `Rejected(op_id_collision)`. Ordering pinned: the digest is
   computed after the per-op schema-identity resolution (the pinned template
   is loaded pre-admit) and checked AT the idempotency rung — first after
   load — so key misuse surfaces as a collision, never as
   `invalid_field_value` or a later stale/state reject.
2. **The offer delta (Q4):** `available_ops` adopts the `offerable_ops`
   expression — under an authored capability profile the packet's offer
   changes (the false offer disappears). Advisory surface, but visible:
   itemized, not silent.

## 3. Questions — all four DECIDED in review round 1 (2026-07-07)

1. `invalid_field_value` granularity — **DECIDED, the reviewer's split**: a
   MISSING mandatory assertion is `missing_required_field` (it is a required
   field — one vocabulary); a PRESENT but forbidden/contradictory value is
   `invalid_field_value`, with MANDATORY field-path + rule/schema-id
   diagnostics. No third name; the broader `invalid_payload_contract`
   alternative is not needed.
2. Currency binding for the verify family — **DECIDED: required from day
   one.** "Declared-but-optional" is exactly the two-regime contract class
   that produced F-W4-3; an optional binding has no teeth against the
   stale-green hole. The inline form satisfies it BY CONSTRUCTION — stated,
   not exempted (the hoist-justification pattern). Example gate for the
   committed-evidence case: a stored test/build evidence gate (NOT
   `previous_reviewer_verdict` — see F-EC-1).
3. Where the digest lives — **DECIDED: the ladder re-print's idempotency
   rung**, in the NEW block. Three arguments: the rung's behavior genuinely
   grows (a new reject branch — the L1 authority precedent); `op_id_collision`
   is the rung's own generic reject, and the only precedent for rung-owned
   vocabulary (`missing_version`) is printed in-ladder; hiding it in a
   doc-comment would break the §5 reveal-not-hide guardrail and leave the
   multiset check without a visible contract to count.
4. The offer↔gate seam (NEW in round 1) — **DECIDED: close it now, in the
   same-function form.** `available_ops ← offerable_ops` (see #7): the offer
   calls `capability` itself instead of mirroring its default expression, so
   the authored-profile filter comes free and agreement is identity, not
   convention. The behavior delta is itemized on the ratify list. The
   L5-named seam resolves by updating the two L5 unit comments (it was never
   an Absent item — verified, so the deferral ledger stays additions-only).

## 4. Findings log

- **F-EC-1 · todo F4 mixes evidence currency with committed-policy-input
  freshness.** Two distinct concepts travel under one example: *evidence
  currency* (a VERIFY gate's evidence certifies a specific code/state — the
  no-stale-green contract) and *committed-policy-input freshness* (a POLICY
  gate reads committed state, and that input can age). F4 cites
  `previous_reviewer_verdict` in the currency context, while F1/F3 and the
  template config classify it as policy/separation ("provides separation, not
  artifact verification"; "packaged pure pairflow policy") — not a strict
  contradiction (F4 can be read as the committed-state-READING class), but it
  blurs the verify-family boundary exactly where Q2 sharpens it. Disposition:
  this memo's examples use a stored test/build evidence gate for the verify
  case (applied, Q2); todo F4 gets the two-concept clarification when Part F
  folds into the section build.
