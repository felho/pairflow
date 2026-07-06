# Open Topic — The Emit-Contract Slice (todo Parts E/F + the A1 digest)

Date: 2026-07-06
Status: **Paper test EXECUTED (PASS, §2) — awaiting review.** Next: the build
small-spec (exact rejection names + inventory deltas), then the section build.

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
| 7 | per-op contract projection in the packet | the E8 extension of `decision_requirements` / `available_ops` / the help projection — the offer mirrors the gate (the L5 offer-vs-gate lesson applies: same source both sides) | definition sites enumerated per the F-L5-3 class lesson: template schema + `validate_emit_contract` + the packet projection — `capability` is UNTOUCHED (ops are already transition keys) |
| 8 | gate `family: policy | verify` | a semantic dimension on the EXISTING gate declaration — orthogonal to the implementation axis (declarative/packaged/process) | F1; no mechanism change |
| 9 | verify-gate evidence currency (no stale-green) | a verify-family contract: evidence carries a currency binding (head_sha / artifact digest / command identity / exit / log ref / invocation id) matching the state it certifies; inline process gates are current BY CONSTRUCTION; committed-state-reading gates must record + re-check | a currency failure is a verify-gate BLOCK (`gate_blocked(...)` with a stale-evidence reason) — NOT a new top-level rejection |
| 10 | verifier independence is structural where required | gate binding/config enforces verifier ≠ implementer; the kernel-run process gate is the strongest form | F6; config + invariant, no mechanism |
| 11 | idempotency digest: the ledger stores `payload_digest`; same `op_id` + different digest → `Rejected(op_id_collision)` | the idempotency RUNG's refinement — the ladder's third re-print (the L1 authority-rung precedent); the digest is the versioned canonicalization pinned to the emit-contract identity (op kind + schema identity + vocabulary versions) | uniqueness key stays `(instance_id, op_id)` |

**De-bias test (Part E's own):** a non-review op `PROCESSED { row_count,
checksum_ref }` fits declaration #1–#6 with only different declared data — no
kernel change. PASS.

**Candidate new rejection names** (finalized in the build small-spec):
`op_id_collision` (#11), `invalid_field_value` (type/domain/vocabulary subset
violations, #1/#3/#4), `missing_evidence_ref` (an unmet claim-scoped
obligation, #6); `missing_required_field` is REUSED for required fields (the
one-vocabulary rule from L5). Ambiguous-state violations (#4's explicit
assertion) fold under `invalid_field_value` unless review wants a distinct
name. Expected registry growth: 81 → 84.

**Verdict: PASS.** The slice reduces to config surfaces, one call-site
validator (the announced payload rung at its declared home), one create-time
validator, a semantic tag on the existing gate declaration, three invariants,
a packet-projection extension, and one rung refinement. Zero new handlers,
zero new primitives, zero new wait kinds.

## 3. Open questions for the review round

1. `invalid_field_value` granularity — one name for type/domain/subset/
   cross-field violations, or split (`invalid_field_value` +
   `assertion_required`)? Recommendation: one name; the violation detail rides
   the rejection's diagnostic payload, not the name (the vocabulary stays
   small).
2. Does the verify family need a REQUIRED currency binding from day one, or is
   it declared-but-optional at this slice (inline gates satisfy it by
   construction; the first committed-state verify gate,
   `previous_reviewer_verdict`, would need a recorded binding)?
   Recommendation: required for the verify family by contract; the inline
   form's by-construction satisfaction is stated, not exempted.
3. Where the digest lives in the pseudocode: the ladder re-print's idempotency
   rung (visible contract) vs a doc-comment on the existing line.
   Recommendation: the re-print — the rung's behavior genuinely grows (a new
   reject branch), and the L1 precedent says growth is shown at its level.

## 4. Findings log

(Empty — populated by the build waves' reviews, the §9 discipline.)
