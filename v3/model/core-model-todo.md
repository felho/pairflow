# Core Model TODO

Follow-up clarifications for `core-model.html` based on the kernel-spectrum synthesis.

> **Status (reviewed 2026-07-06, against the post-rebaseline corpus):** this file now
> holds only what binds the Block A MODEL, with a status line per part. What binds the
> implementation (not the model) moved to
> [`../design/implementation-contract.md`](../design/implementation-contract.md) (`IC-*` items — the
> implementation plan's mandatory first chapter); what binds future levels lives in
> [`core-model-future-topic.md`](core-model-future-topic.md).

## Part A — Source-closed idempotency kernel

These three TODOs are one logical part, not independent cleanups. They form the
positive version of the synthesis warning: close idempotency at the source.

```text
stable op_id  ->  transactional ledger  ->  derived/effect boundary
 identity          enforcement              safe post-commit behavior
```

The dependency matters. A ledger is only useful if retries reuse a stable operation
identity. Derived dispatch is only safe because the return path is idempotent. External
effects need their own pending-effect marker and egress idempotency key, because kernel
dedupe does not automatically make the outside world idempotent.

### A1. Make the idempotency ledger explicit

> STATUS: REALIZED — the identity side by the admission ladder's op_id rung (rebaseline
> wave 1) + the ingress touch (lifecycle intents, fact entries, "a rejected attempt never
> consumes the op_id"); the digest/collision refinement by the EC slice (2026-07-07:
> `payload_digest` + the idempotency rung's digest branch, `op_id_collision` — actor-emit
> path; the operator/lifecycle paths are a named Absent). The store-backed enforcement
> mechanics live in `../design/implementation-contract.md` IC-A1.

- `(instance_id, op_id)` is a kernel-level unique operation record.
- For L0a, default to **transcript-as-ledger** for accepted/committed operations:
  presence in the append-only transcript means the operation has already applied.
- REALIZED at the EC slice — payload digest + `op_id_collision`: the ledger stores a canonical operation
  `payload_digest` alongside each entry; the uniqueness key stays `(instance_id, op_id)`,
  not `(instance_id, op_id, payload_digest)` (a 3-column key would let a re-used `op_id`
  under a new payload slip in as a fresh row). On lookup: same `op_id` + same digest →
  Duplicate; same `op_id` + different digest → `Rejected(op_id_collision)`, so
  idempotency-key misuse is visible instead of silently dropping the second payload. The
  digest is a stable, versioned canonicalization of the operation payload (the same
  canonicalization content-addressed `op_id` derivation would use, IC-A3), never the raw
  CLI/wire string, and it must include the emit-contract identity (the operation kind,
  the template/op payload-schema identity (E2), and any referenced vocabulary/catalog
  versions (E3)) — idempotency pinned to the full contract under which the payload was
  accepted. This lands in the model as the idempotency rung's refinement, together with
  Part E2.

### A2. Clarify derived output vs durable pending-effect boundaries

> STATUS: REALIZED by the Errand contract (rebaseline wave 3) — the claim-marker-first
> discipline, produce-not-perform, and the derived post-commit outputs ARE this pattern,
> named corpus-wide; the derived-vs-durable test sentence now lives in the errand
> declaration itself (2026-07-06). The egress/confirmed-effect mechanics moved to
> `../design/implementation-contract.md` IC-A2 (with the nanoclaw negative-proof design rules;
> the delivery-ledger state machine itself stays future-topic L8 #4).

- The test, as stated in the model: **after a crash, can the output be safely re-derived
  from committed kernel state alone?** If yes it may stay derived (actor `DispatchIntent`,
  until L8 durable delivery); if no, a committed marker precedes the effect — the errand's
  claim phase (`action_running`, provisioning requests, `spawning` links are the named
  instances).
- Derived dispatch is safe only because actor/event apply is idempotent via A1:
  at-least-once dispatch + idempotent apply = effectively-once state transition.

### A3. Define the `op_id` generation contract

> STATUS: MOVED — this is an edge/actor/relay contract, not model content; it lives in
> `../design/implementation-contract.md` IC-A3 (retransmission vs re-attempt, content-addressed vs
> request-scoped nonce, identity preserved across relays).

## Part B — Commit-based actor output and leaderless concurrency

> STATUS: REALIZED — both bets are now NAMED kernel contracts in the model (the L0a
> "Two kernel contracts, named" note, 2026-07-06): record-not-replay (the transcript
> fact + provenance + never re-run the actor) and leaderless-by-construction (op_id
> ledger + CAS as the two authorities; in-band `request_id` correlation as the fencing).
> The mechanics — SKIP LOCKED as scheduling, caches never authority, content-addressed
> output refs, the fencing-token watch rule — moved to `../design/implementation-contract.md` IC-B.

### B1. Make record-not-replay an actor-output invariant

Stated in the model (L0a note). The distinction worth keeping here: this is related to,
but distinct from, A1 idempotency — A1 prevents applying the same operation twice;
record-not-replay prevents treating non-deterministic actor work as something the
kernel can regenerate.

### B2. Name the leaderless/CAS/fencing boundary

Stated in the model (L0a note). The in-band-correlation observation stands as the model
fact: every external effect in the current model commits a `request_id` marker and
returns through the kernel as a CAS-guarded event, and the result handler requires the
committed marker to still match — that is what fences a zombie, not a separate token.
Nothing in Block A needs a true external fencing token (a single CAS claim has no
timeout-driven successor); the introduce-only-if rule is `../design/implementation-contract.md`
IC-B's watch item.

## Part C — Audited human decisions as kernel records

> STATUS: C2 is REALIZED (the wave-4 `admit_input` fold; enumeration reworded to the
> normative order per F-W1-1). C1's field list is largely modeled at L3; the
> timestamp-source rule and C3's analytics/audit-floor rules are implementation-side —
> moved to `../design/implementation-contract.md` IC-C.

This section captures the synthesis point that most studied systems treated human
decisions as ephemeral UI/config/analytics facts. The current L3 model already makes
`DECISION_REQUEST` and `DECISION_MADE` durable transcript entries; the remaining work is
to keep that contract explicit and prevent telemetry from masquerading as audit.

### C1. Make the decision record completeness explicit

The L3 model should state the minimal durable audit fields for a human decision record.

- `DECISION_REQUEST` is the durable ask: request identity, recipient/role, declared
  decision keys, recommendation, recommendation source, and decision context.
- `DECISION_MADE` is the durable answer: request identity, operator identity, decision
  key, validated payload, override marker when applicable, operation identity, and
  commit timestamp or transcript commit metadata.
- The timestamp source (kernel commit/append boundary, never UI/analytics time) is
  enforced implementation-side → `../design/implementation-contract.md` IC-C.
- A decision record is generic and decision-agnostic. `approve`, `request_rework`,
  `accept_risk`, or `choose_strategy` are template decision keys, not kernel verbs.

### C2. Preserve validate-before-mutate for decisions

The L3 `SUBMIT_DECISION` path should keep all validation before the decision mutates
workflow state.

- Validate — in the admission ladder's canonical order — idempotency (`op_id`
  Duplicate) FIRST after load, then lifecycle/wait kind, request correlation, stale
  version, and operator authority; then the declared decision key, required payload
  fields, and override applicability — all before appending `DECISION_MADE`.
  (Reworded to the normative code order per the kernel-primitives memo F-W1-1;
  realized in the model by the wave-4 `admit_input` fold.)
- A rejected decision must not route the workflow and must not consume the committed
  decision audit slot. If rejected attempts need audit, model them as rejected-attempt
  audit, not as `DECISION_MADE`.
- The validated payload is the payload that gets recorded and handed off to the target
  actor when the decision routes back to work.

### C3. Keep analytics derived from audit, never the audit itself

MOVED to `../design/implementation-contract.md` IC-C — analytics/telemetry derive from the
decision records and never stand in for them; purge preserves the declared audit floor
(the LC4 model already carries the surviving-audit contract; IC-C keeps the
implementation from weakening it).

## Part D — Child fan-in correlation and durable join state

> STATUS: D1 HOLDS — the single-child model meets it (verified in the L4 build); it is
> the Block A contract and stays. D2–D5 + the fan-in guardrails moved to
> `core-model-future-topic.md` L4 #7–#10 (2026-07-06).

This section is the synthesis fan-in point. The current L4 model already builds the
correct single-child primitive: a parent-owned durable `ChildWorkflowLink` (`child_key`,
`request_id`, `child_id`, `status`), `CHILD_SPAWNED` with request-id correlation + CAS,
and `CHILD_LIFECYCLE` correlated by `parent_ref`/`link_id`/`child_id` with fail-closed
wait conditions — and it explicitly defers fan-out (sequential, one child link per parent
step). D1 states the invariant the single-child slot already meets — that is the Block A
contract, and it stays here. The N-child extensions that used to follow it (D2–D5: the
fan-in barrier predicate, identity-preserving fan-in, the internal-delivery durability
contract, and partition-then-verify) bind a Block B-era extension, so they moved to
`core-model-future-topic.md` L4 #7–#10 together with their guardrails (2026-07-06).

### D1. The slot is the authorization, not just provenance

The issued per-attempt slot — not the spawn selector key — is what authorizes a completion.

- The issued attempt slot is `link_id` (stable from spawn): `request_id` authorizes the
  spawn write-back, and `child_id` correlates the lifecycle once bound. `child_key` only
  selects/reuses the active link (≤ 1 active per `(instance, step, child_key)`); it is not
  sufficient authorization across attempts, because a terminal link lets a fresh attempt
  reuse the same `child_key` under a new `link_id`.
- Acceptance differs by whether the completion routes the parent. The spawn bind
  (`CHILD_SPAWNED`) binds `child_id` to an issued `spawning` link and does not route — the
  parent stays parked for the lifecycle. A completion that routes the parent
  (`CHILD_LIFECYCLE`, and the failed-spawn `CHILD_SPAWN_FAILED`) additionally requires the
  parent to still be parked on that link (`WAITING(child_event)`, matching `link_id`).
- This already holds for the single-child case. Preserve it under fan-out (N slots), and
  never regress to a `parent_workspace_id`-style provenance-only back-ref that is recorded
  but never awaited.

### D2–D5 — moved to `core-model-future-topic.md` L4 #7–#10

The N-child fan-in contract (the barrier predicate, identity-preserving fan-in,
the internal-delivery durability contract, and partition-then-verify) lives with
the fan-out future topics it binds, together with its guardrails (2026-07-06).

## Part E — Actor emit contract (ingress)

> STATUS: REALIZED at the EC slice (2026-07-07, section EC in `core-model.html`) —
> E2 (`validate_emit_contract` + `emit_contract_of`, the announced payload rung at its
> call-site home), E3 (the versioned `vocabularies:` catalog + `validate_emit_contracts`
> at create), E4 (cross-field rules + explicit assertions), E5 (summary-is-a-headline
> invariant), E7 (claim-scoped evidence obligations), E8 (`op_contracts` projection from
> the same lookup; `available_ops ← offerable_ops`). E1 was realized in concept by the
> Warrant (wave 2); its extended field family and E6 (the claim model) stay open as the
> EC section's named Absents. The E2 check-order line carries the F-W2-1 parenthetical.

An actor emit (`PASS`, `CONVERGED`, …) is not just an event name; it is a machine-validated
contract. The v1 reality check is the pressure-test that shows which capabilities the
contract machine must have — it is not the v3 spec. The kernel stays de-vocabularized:
generic capabilities validated against a template-declared schema and a referenced
vocabulary catalog; v1's code-review vocabulary (severity grades, summary, findings,
timing/layer) is declared data, not kernel-baked meaning. De-bias test: a non-review op
(e.g. `PROCESSED { row_count, checksum_ref }`) must fit the same machine with only different
declared data.

Two concerns must not be merged:
- **Kernel actor authority** — who may emit, against which issued context, with which
  `op_id`. Kernel-owned protocol, not template config (E1).
- **Template payload contract** — the shape of this op's payload (E2–E7).

### E1. Kernel-owned authority binding is not template config

- Authority binding is kernel-owned and issued with the context packet; the kernel checks it
  at emit. The template cannot decide whether a correctness/security guard (e.g.
  `expected_version`) applies. Its field set is derived from the active kernel/workflow shape,
  not from the per-op payload schema.
- Universal: `instance_id`, `op_id`, `expected_version`, `execution_id` (an issued-context
  token) — every run needs these. Shape-derived: `expected_role` (role-bound workflow),
  `expected_round` (round-aware loop), `handoff_id` (handoff/dispatch artifact),
  `state_fingerprint` (snapshot guard issued) — present only if the shape has them.
- This generalizes the existing `expected_version` CAS (Part A/B): CAS and the authority
  snapshot are two members of one family. It is the emit's provenance binding (which context
  the actor acted FROM), distinct from the evidence's currency binding (Part F).

### E2. Template-declared per-op payload contract, generically validated

- Each op kind declares its payload schema (required/optional fields, types, value domains).
  The kernel validates generically against the template-declared schema; it does not hardcode
  op meaning.
- New check `validate_emit_contract(envelope, template, step)` runs AFTER
  instance/template/authority resolution and BEFORE the gates. `valid_shape(envelope)` stays a
  basic, kind-agnostic envelope check at the front — it runs before template load, so it
  cannot carry the per-op schema; the per-op schema is a separate step, not a `valid_shape`
  widening.
- Check order: `basic valid_shape → load instance/template/step → op_id ledger lookup
  (Duplicate / op_id_collision, A1) → kernel authority checks (E1) → transition/capability →
  validate_emit_contract → policy/verify gates → commit`. ("Kernel authority checks (E1)" is
  a compressed item: it stands for the admission ladder's lifecycle/state → correlation →
  staleness → authority rungs, in that canonical order — the parenthetical the
  kernel-primitives memo's F-W2-1 asked for; no code or rung-order change.)
- Worked example: `PASS` and `CONVERGED` both require a `summary` but carry different payloads
  — the per-op schema is what distinguishes them (`pass.ts`, `converged.ts`).

### E3. Value-domain constraints reference a versioned vocabulary catalog

- A field can be constrained to a subset of a declared value domain, differing per op. The
  kernel knows "enum/subset constraint", not the domain's meaning.
- The vocabulary is a versioned catalog (e.g. `pairflow.findings.v1`): template-referenced,
  packaged-module-interpreted, never kernel-baked. The catalog may carry arbitrary typed
  dimensions (the v1 finding has `severity`, `priority`, `title`, `timing`, `layer`, `refs`);
  the kernel validates structure, not their semantics. Versioning pins a transcript's meaning:
  a payload referencing `pairflow.findings.v1` is read under v1 rules forever; an incompatible
  change is a new version (`v2`), never a silent rewrite.
- Worked example: `CONVERGED` permits `{P2,P3}` (the type forbids P0/P1), `PASS` permits
  `{P0..P3}` (`converged.ts`, `pass.ts`).

### E4. Cross-field invariants and explicit assertions

- The schema can declare cross-field consistency rules and forbid silent/ambiguous states by
  requiring an explicit assertion rather than a silent default.
- Worked example: `PASS` `--no-findings` is an explicit clean assertion — assert clean, do
  not silently omit (`pass.ts`).

### E5. Summary is a human headline; structured fields are the authority

- A `summary` (or any free text) is a required human-readable headline only: not evidence,
  not the findings source of truth, not policy authority, not counted, not parsed for
  structured truth.
- The load-bearing claims live in structured fields (findings, claim state/source, refs,
  counts where needed). The v1 summary↔findings consistency regex is a negative guardrail
  (catch a contradiction), never a truth source — see F5.

### E6. The structured claim model is a named open sub-area

- Define the structured claim model separately; v1's `findings_claim_state` /
  `findings_claim_source` is a worked example, not necessarily the final generic claim
  abstraction. Open: per-emit vs per-finding claims; lifecycle/state machine
  (open → resolved → verified); claim-source as catalog vs template vocabulary; what claims
  non-review workflows need. The verify gate (Part F) builds on this.

### E7. Evidence obligations are scoped and producer-side

- The schema can require a typed backing REFERENCE for a claim, conditional on its value,
  scoped to the specific claim (an envelope-level ref does not satisfy a claim-level
  obligation). The schema DECLARES the obligation (e.g. `claim: runtime_clean → ref_kind:
  command_log, command_family: test`); the verify gate (Part F) CHECKS that the evidence is
  trusted and current.
- Worked example: a `P0/P1` finding requires a finding-level ref; an envelope `--ref` "does
  not satisfy P0/P1 finding evidence binding by itself" (`pass.ts`); summary text is never a
  valid evidence source (v1 `reviewer-evidence-governance`).

### E8. The actor packet projects the contract (guidance only)

- The context packet carries, per available op, the authority values to echo and the
  payload-contract projection (required fields, allowed domains, evidence obligations), so the
  actor can emit correctly. This is L2b guidance; the source of truth is the kernel protocol +
  template schema + gates, never the prompt.

## Part F — Gate semantics: policy vs verify

> STATUS: REALIZED at the EC slice (2026-07-07) — the `family: policy | verify`
> dimension on the gate declaration (default policy, zero migration; verify opt-in with
> a MANDATORY `currency_binding`, `invalid_gate_config` at create otherwise), the
> no-stale-green and self-report-never-evidence invariants, and F6's structural
> independence note. Deferred verify-gate currency mechanics → L9 (Absent).

§3.5's lesson: durable state is the authority, an actor's self-report is not evidence. The
gate MECHANISM already exists (L2 declarative/packaged, L2a process, `evidence_refs`). What is
missing is the SEMANTIC distinction between two gate families and the verify discipline.
(Naming note: v1's `converged_validation` gate is a verify / evidence-consistency gate, not an
ingress schema check — the schema is Part E. Avoid calling both "validation".)

### F1. Policy and verify are distinct gate families

- Policy gate: run-state authorization — is the transition allowed now given the run's state
  (round threshold, prior verdict, severity-by-round routing)? Configurable.
- Verify gate: independent-evidence check — reads an artifact or runs a command, never the
  actor's claim. Non-negotiable for load-bearing transitions that depend on an evidence-backed
  or externally checkable claim.
- The implementation axis (declarative / packaged / process) is orthogonal: the same
  implementation can serve either family. The semantic family is what this part names.
- Worked example: v1 runs `converged_policy` (policy) AND `converged_validation` (a verify
  gate); and the `severity_gate_round` rule — `PASS --no-findings` validity depends on the
  round — is policy, not schema (so the same "findings" concept splits across E3 schema and F1
  policy).

### F2. Policy and verify read structured fields, never the summary

- Policy reads workflow state and structured claims (e.g. `findings[].severity`); verify reads
  the structured obligation it is checking plus independent evidence — it does not treat the
  claim as evidence. Neither uses the summary / free text as authority (the gate-side of E5).

### F3. Self-report is never evidence

- An actor's success emit (`PASS` / `CONVERGED`) is a claim, not evidence; a bare LLM reviewer
  verdict ("looks fine") is also self-report. A verify gate reads an independent,
  machine-checkable artifact (test exit code, VCS diff, build result), not the claim, and not
  the summary text.
- A "prior actor verdict exists" check (e.g. `previous_reviewer_verdict`) provides separation
  (verifier ≠ implementer), not artifact verification — a robust completion gate wants both.

### F4. Evidence currency: bound to the state it certifies (no stale-green)

- A verify gate's evidence is trusted only if bound to the state it certifies. This is distinct
  from the emit's authority binding (E1):
  - emit authority binding (E1): `handoff / execution / role / round / expected_version /
    fingerprint` — the snapshot the actor acted FROM.
  - evidence currency binding (here): `head_sha / diff-fingerprint / artifact-digest /
    command-identity / exit-code / log-ref / gate-invocation-id` — the state the evidence
    CERTIFIES.
- A green result from version N cannot satisfy a version-M transition. An emit can be current
  while its evidence is stale (the attached test log ran on an old commit). Inline process gates
  get currency by construction (they run now, against the current state); deferred VERIFY gates
  must record and re-check the certified state, or stale-green slips through.
- Two distinct concepts, not to be mixed (the emit-contract memo's F-EC-1, clarified here as
  Part F folded into the EC build): **evidence currency** is the VERIFY family's contract —
  which code/state the independent evidence certifies; **committed-policy-input freshness** is
  a POLICY-family concern — a policy gate reads committed state (e.g.
  `previous_reviewer_verdict`, which provides separation, not artifact verification), and that
  input can age. The currency-binding obligation applies to the verify family; a
  committed-input policy gate's staleness question is a policy-design concern, not an evidence
  contract.

### F5. Free-text consistency is a negative guardrail, not authority

- A summary↔structured-fields consistency check may catch a contradiction (a negative
  guardrail), but it is never a truth source. The structured fields and verified evidence are
  the authority (E5).

### F6. Verifier independence is structural; L2b is guidance only

- Where verifier ≠ implementer is required, the binding/gate config must enforce it, not prompt
  discipline. The kernel-run process gate gives the strongest form: the verifier is a
  deterministic process, not an actor.
- Empirical anchor: even Superpowers — the §3.5 source — leaves verification to procedural skill
  discipline ("Do Not Trust the Report"), with test evidence often in the implementer's report;
  v3 makes the same a runtime-enforced verify contract.
- Cross-reference: Part E's emit contract DEFINES the evidence obligation (producer side); Part
  F's verify gate VALIDATES it (checker side). L2b may project the requirements but is never the
  source of truth.

## Non-goals

Keep the guardrails collected here, but grouped by the logical part they protect.

### Part A guardrails

- MOVED to `../design/implementation-contract.md` IC-A2/IC-N (no reconciler/outbox for the
  kernel's own internal state consistency).

### Part B guardrails

- MOVED to `../design/implementation-contract.md` IC-B/IC-N (no deterministic replay for
  actor/LLM work; no leader-per-shard; local locks/caches/version maps are never
  correctness authority).

### Part C guardrails

- The analytics/audit-trail guardrail MOVED to `../design/implementation-contract.md` IC-C.
- The validate-before-mutate order guardrail is REALIZED in the model: the wave-4
  `admit_input` fold enforces the canonical rung order (idempotency first after load,
  before stale) structurally — see C2.

### Part D guardrails

- Moved with D2–D5 to `core-model-future-topic.md` L4 (the "Fan-in guardrails"
  block after #10); D1's own guardrail ("never regress to a provenance-only
  back-ref") lives inside D1 itself.

### Part E guardrails

- Do not put kernel authority binding (`expected_version`, `execution_id`, `expected_role`, …)
  into template config; it is kernel-owned and issued with the context packet.
- Do not treat the actor payload as opaque past `valid_shape`; the per-op payload schema is
  enforced (`validate_emit_contract`), not advisory.
- Do not hardcode the findings/decision vocabulary into the kernel; it is a versioned,
  template-referenced catalog interpreted by packaged modules.
- Do not treat the summary / free text as evidence, a findings source, counted, or policy
  authority; the structured fields are the authority.
- Do not let an envelope-level reference satisfy a claim-scoped evidence obligation.
- Do not specify the structured claim model as final from v1; it is a named open sub-area.
- Do not let the actor-packet contract projection (L2b) be the source of truth; enforcement is
  the template-declared schema plus kernel/gate checks.

### Part F guardrails

- Do not let an actor's self-report (an emitted `PASS` / `CONVERGED`, or a bare LLM "looks
  fine") satisfy a verify gate.
- Do not let a policy or verify gate read the summary / free text as authority; read the
  structured fields and independent evidence.
- Do not treat "a prior actor verdict exists" as independent-artifact verification.
- Do not accept verify evidence without a currency binding to the state it certifies (no
  stale-green).
- Do not rely on prompt/skill discipline for load-bearing verification; enforcement is runtime
  (schema + gates).

### Shared kernel-shape guardrails

- MOVED to `../design/implementation-contract.md` IC-N (no full event-sourcing as the source of
  truth; keep the materialized `WorkflowInstance` + transcript/audit + per-instance
  version/CAS shape) — ADR-gated there.

## Tooling backlog (model-src / ledger generator)

### T1. Domain-registry lift — §4 aggregate/entity/relation inventory

> STATUS: REALIZED (2026-07-07) — `report_ledger.py` now derives a §4 domain
> registry (51 aggregate blocks · 121 entities across the 20 sections, with
> root/kind markers and relationship prose), scoped to each section's
> Domain-lens slice; guarded by `check.sh` freshness like the other three
> registries. The inline HTML stays the single authority (derived, not
> record-ified).

Extend the ledger generator with a **§4 domain registry**: an aggregate / entity /
relation inventory per level, derived from the Domain-lens blocks (already
semi-structured — every section carries exactly one, with marked-up aggregates and
entities). This makes the domain vocabulary a semantic checksum on model edits, and
the source for the implementation's type-layer drift test. Requirement recorded and
motivated in `../design/topics/_closed-v1-operability.md` Q4.4 (v1-operability round,
2026-07-07); the lift itself is this thread's work.

### T2. Render-plane scalability — lazy diff-render + multi-page split

> STATUS: OPEN (captured 2026-07-23 at the ch9 opening; decide at the
> Block B opening). Not a model-truth issue — the semantics plane
> (units/deltas/records + generated registries + check.sh) already
> scales; this is the HUMAN VIEW's limit.

`core-model.html` is a 1.3 MB single-page render whose load cost
(~5–10 s in-browser) is dominated by the diff-viewer JS folding every
unit-delta chain at load time; it grows linearly with each modeled
section, so the Block B waves (L6 / L8 / L9) would roughly double it
exactly when the intensive design reading happens. Two steps, ordered
by cost:

1. **Lazy diff-render (cheap, pull-anytime):** fold/diff a section's
   code blocks on first EXPAND instead of at load — a pure
   `_postlude.html` JS change; file layout untouched, the check.sh
   golden test unaffected. Expected to bring load under a second.
2. **Multi-page split (the real scalability step; decide at the
   Block B opening):** `build.py` gains a split mode (per-section
   pages + index); the golden test extends per page. Requires an
   explicit ANCHOR RE-PIN act (the ADR-015 pattern): ratified text
   cites model locations, so every existing anchor must survive or
   be mapped in one visible relocation act — never a silent
   restructure.
