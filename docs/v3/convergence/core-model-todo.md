# Core Model TODO

Follow-up clarifications for `core-model.html` based on the kernel-spectrum synthesis.

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

The current model uses `instance.transcript.has(envelope.op_id)` to express duplicate
detection. Keep the semantics, but clarify the implementation contract:

- `(instance_id, op_id)` is a kernel-level unique operation record.
- For L0a, default to **transcript-as-ledger** for accepted/committed operations:
  presence in the append-only transcript means the operation has already applied.
- The source of truth must be a store-backed uniqueness guarantee such as
  `UNIQUE(instance_id, op_id)`, enforced in the same atomic commit as the instance CAS.
- Version CAS and the `op_id` ledger are distinct guards. Per-instance
  `expected_version`/CAS prevents lost updates from a stale view; `(instance_id, op_id)`
  uniqueness prevents a re-delivered logical operation from applying twice. Versioned
  history by itself is not idempotency: a transcript only serves as the ledger if it
  enforces stable operation identity and uniqueness.
- `instance.transcript.has(op_id)` may remain as a pseudocode fast path, but it is not
  the correctness mechanism. If only the pre-check exists, concurrent delivery can race.
- The correct write boundary is: insert/append the operation record and update the
  materialized instance state under one transaction/CAS boundary.
- The ledger stores a canonical operation `payload_digest` alongside each entry; the
  uniqueness key stays `(instance_id, op_id)`, not `(instance_id, op_id, payload_digest)`
  (a 3-column key would let a re-used `op_id` under a new payload slip in as a fresh row).
  On lookup: same `op_id` + same digest → Duplicate; same `op_id` + different digest →
  `Rejected(op_id_collision)`, so idempotency-key misuse is visible instead of silently
  dropping the second payload. The digest is a stable, versioned canonicalization of the
  operation payload (the same canonical operation canonicalization that content-addressed
  `op_id` derivation would use when that strategy is selected, A3), never the raw CLI/wire
  string. The digest must include the emit-contract identity:
  the operation kind, the template/op payload-schema identity (E2), and any referenced
  vocabulary/catalog versions (E3), so idempotency is pinned to the full contract under which
  the payload was accepted.
- A separate `IdempotencyLedger` is an escape hatch for later cases where an operation
  needs dedupe but has no committed transcript entry, such as a remote relay boundary.
- Do not let rejected/non-committed events accidentally consume the apply-idempotency
  key. If rejected attempts need audit, model that as audit, not as the committed
  operation ledger.

### A2. Clarify derived output vs durable pending-effect boundaries

The model already uses `DispatchIntent`, `ActionIntent`, `SpawnIntent`, and durable
markers such as `action_running` / `spawning`. Clarify when these are merely derived
post-commit outputs versus durable, retryable side-effect work.

- Use this test: **after a crash, can the output be safely re-derived from committed
  kernel state alone?**
- If yes, it can remain a derived output. Actor `DispatchIntent` can stay derived until
  durable delivery arrives at L8.
- Derived dispatch is safe only because actor/event apply is idempotent via A1:
  at-least-once dispatch + idempotent apply = effectively-once state transition.
- External or crash-sensitive side effects need a committed marker/outbox/pending-effect
  record before the side effect runs.
- `action_running`, runtime provisioning requests, and child `spawning` links should be
  described as concrete instances of this pattern.
- The pending-effect marker/request id should be passed to the external system as an
  idempotency key where the external system supports it. Marker-before-effect alone
  still gives at-least-once effect execution after a crash between effect and result.
- For non-idempotent external effects, the egress contract must carry the operation
  identity across the boundary; otherwise recovery can duplicate the outside effect.
- Reconciler/outbox is for real external effects, not for repairing the kernel's own
  state consistency.

### A3. Define the `op_id` generation contract

The model should state what makes an `op_id` stable enough for retries:

- `op_id` stability is an edge/actor/relay contract. The kernel can enforce the
  identity it receives, but it cannot infer that two fresh IDs were intended to be the
  same logical operation.
- The same logical operation retry must reuse the same `op_id`.
- A new `op_id` means a new attempted operation, not "retry the same one."
- Distinguish retransmission from re-attempt. If the actor resends the same envelope
  because it did not receive an acknowledgement, it must reuse the same `op_id`. If the
  kernel returns `Stale` and the actor refreshes to a newer context packet, the next
  emit is a new logical operation with a new `op_id`, because the packet/input changed.
- Use content-addressed IDs when the operation is naturally identified by its content,
  such as "submit this exact decision payload."
- Use request-scoped nonces when two identical-looking payloads may be two legitimate
  operations, such as "increment twice." Pure content-addressing would incorrectly
  collapse those operations into one.
- Later relay/channel levels must preserve this identity across process, host, or
  network retries.

## Part B — Commit-based actor output and leaderless concurrency

This section is the second logical part from the synthesis. The core model already
leans this way through atomic commits, `expected_version`, and transcript entries, but
the two central bets should be named explicitly so implementation does not drift toward
replay or leaderful coordination.

### B1. Make record-not-replay an actor-output invariant

The model should state that actor/LLM work is never recovered by replaying the actor.
The deterministic orchestration skeleton may be re-derived from committed kernel state;
the actor's output is the durable fact once accepted.

- Every accepted actor emit commits the actor output as an immutable transcript fact,
  ideally by content-addressed artifact/evidence refs rather than ephemeral process
  output.
- Recovery may re-derive routing, dispatch, gates, and post-commit outputs from
  committed state, but it must not re-run an LLM/actor to reconstruct a previously
  accepted result.
- Record-not-replay is the default kernel contract, not an opt-in `@task`-style
  annotation on selected steps.
- The transcript should preserve enough provenance to audit the accepted actor output:
  issued context/config, actor identity/role, operation identity, and output refs.
- This is related to, but distinct from, A1 idempotency. A1 prevents applying the same
  operation twice; record-not-replay prevents treating non-deterministic actor work as
  something the kernel can regenerate.

### B2. Name the leaderless/CAS/fencing boundary

The model should state that v3 correctness does not depend on a leader-per-shard,
process-local single writer, or in-memory version map. It should also separate in-band
`request_id` correlation from true external fencing tokens.

- Any worker may handle an instance event; correctness comes from store-backed
  `(instance_id, op_id)` uniqueness plus per-instance `expected_version`/CAS.
- Worker claiming mechanisms such as `SELECT ... FOR UPDATE SKIP LOCKED` are scheduling
  tools, not semantic authority. They do not replace idempotency or CAS.
- Process-local state such as `versions_seen` may be a cache/optimization only; the
  store-backed instance version is authoritative.
- In-band correlation is the default, and it already covers every external effect in
  the current model. Action running, runtime provision/release, and child spawn
  write-back each commit a `request_id` marker and return their result through the
  kernel as a CAS-guarded event.
- Result handlers must require the current committed marker to still match the
  `request_id`, so a stale or zombie worker's late result is rejected against the newer
  state. This is what fences a zombie here, not a separate token.
- A true fencing token, monotonic and enforced by an external system, is not required by
  anything in the current model. Out-of-band writes do occur, such as the runner's
  `git commit` / `merge` in the worktree, but the model never takes over an in-flight
  claim while the original worker may still be live: a single CAS claim has no
  timeout-driven or forced successor, and re-park happens only on a returned failure
  classification. A superseded worker and a replacement therefore cannot write
  out-of-band concurrently.
- Introduce a fencing token only if a future level adds that shape: a worker holding a
  lease that writes directly to a shared external resource where a superseded worker
  could corrupt it out-of-band. Watch retry of partially completed external effects and
  L8 durable delivery. Such a scoped per-operation lease is not leader-per-shard.

## Part C — Audited human decisions as kernel records

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
- The timestamp must come from the kernel commit/append boundary, not from UI display
  time or an analytics event.
- A decision record is generic and decision-agnostic. `approve`, `request_rework`,
  `accept_risk`, or `choose_strategy` are template decision keys, not kernel verbs.

### C2. Preserve validate-before-mutate for decisions

The L3 `SUBMIT_DECISION` path should keep all validation before the decision mutates
workflow state.

- Validate wait kind, request correlation, idempotency (`op_id` Duplicate), stale
  version, operator authority, declared decision key, required payload fields, and
  override applicability before appending `DECISION_MADE`. Keep idempotency before
  stale, as in A1.
- A rejected decision must not route the workflow and must not consume the committed
  decision audit slot. If rejected attempts need audit, model them as rejected-attempt
  audit, not as `DECISION_MADE`.
- The validated payload is the payload that gets recorded and handed off to the target
  actor when the decision routes back to work.

### C3. Keep analytics derived from audit, never the audit itself

The model should explicitly distinguish authoritative decision audit from metrics or
telemetry streams.

- Metrics, analytics feeds, UI state, and activity streams may derive from
  `DECISION_REQUEST` / `DECISION_MADE`, but they are not the decision source of truth.
- A telemetry event cannot stand in for a missing decision record, even if it contains
  similar fields.
- Purge/archive/storage-lifecycle work must preserve whatever audit floor is declared
  for decisions, rather than relying on optional exports or UI history.

## Part D — Child fan-in correlation and durable join state

This section is the synthesis fan-in point. The current L4 model already builds the
correct single-child primitive: a parent-owned durable `ChildWorkflowLink` (`child_key`,
`request_id`, `child_id`, `status`), `CHILD_SPAWNED` with request-id correlation + CAS,
and `CHILD_LIFECYCLE` correlated by `parent_ref`/`link_id`/`child_id` with fail-closed
wait conditions — and it explicitly defers fan-out (sequential, one child link per parent
step). Part D is not a fix for that primitive; it is the contract the real N-child fan-in
must satisfy when fan-out lands. D1 states the invariant the single-child slot already
meets; D2–D5 are the N-child extensions.

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

### D2. The fan-in barrier is a predicate over committed child-link rows

Fan-in is committed state, not an in-memory channel or a prompt injection.

- The parent wakes when a declared predicate over the committed child-link rows holds:
  wait-all, wait-any, quorum, terminal-set, etc. Because the join state is the committed
  rows themselves, it is crash-safe and resumable by construction.
- Scope the predicate to the current spawn generation/round, so a re-entered (looping)
  parent step re-arms the barrier and does not count a prior round's children. This is the
  LangGraph `consume()` reset expressed as round-scoped link selection (ties to A3
  identity-per-attempt).

### D3. Fan-in is identity-preserving where identity matters

The parent must know which child produced which result.

- Carry `child_key` / `link_id` → result/lifecycle identity through the join. On mixed
  outcomes the parent must see which child reached `done` versus `failed` / `cancelled`
  (a per-child terminal outcome, not a boolean "all done").
- Anonymous reduction (LangGraph `Send` → `operator.add` style) is acceptable only where
  it genuinely does not matter which child produced a result. Where it matters, identity
  must be preserved.

### D4. Internal lifecycle delivery needs an explicit durability contract

`CHILD_LIFECYCLE` is a real cross-instance delivery, not a re-derivable output.

- After a child reaches terminal it may be purged, so the event cannot be reconstructed
  from the child later. By the A2 test it is a durable side effect (a real delivery), not
  a re-derivable derived output.
- The model is already partway: consumption is idempotent and fail-closed (a repeated
  lifecycle after the parent has already routed is rejected as `not_awaiting_this_child`),
  and a lost `CHILD_SPAWNED` self-heals when the lifecycle binds `child_id`. The open edge
  is narrower — a lost terminal `CHILD_LIFECYCLE` after the child is purged.
- The constraint, whoever owns it: the child's terminal outcome must be durably recorded
  in a parent-correlated form before the child can wind down — otherwise "reconcile from
  the surviving link" has nothing to reconcile from.
- Leave the L4/L8 boundary open; Part D does not decide it. Either persist a
  parent-correlated transfer/outbox record at terminal commit, or explicitly leave delivery
  durability to the L8 (durable delivery) / L9 (reconciliation) contract — the model
  already points this way ("L8 generalizes the channel to external / durable"). Wherever it
  lands, pin down at-least-once delivery, retry, timeout, and a correlated transfer/timer
  record.
- Per the synthesis (§10.1), internal-delivery durability is still an open edge — confirm
  against that section when it is reviewed.

### D5. Partition-then-verify before relying on fan-in

Prevent overlapping child work at spawn time; verify is the backstop.

- Fan-out should declare non-overlapping work partitions / claims / fingerprints up front
  so child results cannot collide; fan-in then runs a conflict check. The partition/claim
  is the load-bearing prevention (no overlap at write time, the §3.1 lesson); the verify
  is the safety net. A work fingerprint is the claim key (ties to A3 content-addressed
  identity).
- This is mostly orchestration / template / gate responsibility, but the L4 contract must
  not permit the implicit "spawn a few children and let a reducer add them up" pattern.

## Part E — Actor emit contract (ingress)

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
  validate_emit_contract → policy/verify gates → commit`.
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
  get currency by construction (they run now, against the current state); deferred gates and
  committed-state-reading gates (e.g. `previous_reviewer_verdict`) must record and re-check the
  certified state, or stale-green slips through.

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

- Do not use a reconciler/outbox to repair the kernel's own internal state consistency.

### Part B guardrails

- Do not introduce Temporal-style deterministic replay for actor/LLM work.
- Do not introduce leader-per-shard coordination for the L0a kernel.
- Do not treat worker-local locks, caches, or in-memory version maps as correctness
  authority.

### Part C guardrails

- Do not treat analytics, telemetry, UI state, or optional archive/export artifacts as
  the authoritative audit trail for human decisions.
- Do not let a human decision mutate workflow state before request correlation,
  idempotency (`op_id` Duplicate), stale/CAS, operator authority, required payload, and
  override checks pass. Keep the L3 check order aligned with A1: idempotency before
  stale.

### Part D guardrails

- Do not treat context injection, anonymous reduction where child identity matters,
  in-memory subagent handles, or a bare provenance back-ref as a fan-in mechanism.
- Do not let a fan-in barrier live in process memory or a prompt; the join predicate must
  be evaluable over committed child-link state.
- Do not assume internal `CHILD_LIFECYCLE` delivery is reliable without an explicit
  durability contract (transfer record + retry/timeout, or a declared L8/L9 boundary).

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

- Do not move toward full event-sourcing as the source of truth.
- Keep the current materialized `WorkflowInstance` + transcript/audit + per-instance
  version/CAS shape.
