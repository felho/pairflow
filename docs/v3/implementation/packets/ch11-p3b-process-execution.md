# Task Packet: ch11-P3b — the process-execution activation (HANDLE process branch · runtime-context representation · classification + wire forms · evidence propagation · l2a golden trace)

Plan step: plan.md §11.4 P3b row — the P3 slot's ACTIVATION share under
the ratified ch11-P3 split (foundation → activation). Realizes §11.1
item 3's execution-side half plus item 4's instance-side grain: the
instance runtime-context representation (the instance field + the
start-input seam + the nullable store column — the chapter's second
store-schema change, riding the same ADR-003 fence) with the
testkit-injected ready ref; the HANDLE process branch (the C36 runtime
backstop behavioral; the process-implementation reject lane retires
with the model's reject→run flip); `run_process_gate` /
`classify_process_result` / `runner_outcome` with the C23/C24/C25 wire
forms, C31's `gate_blocked(reason)` rejection surface, C33 evidence
propagation, and C32 confinement; the `l2a/evidence-on-every-run`
storeChecker (its store-visible half); the C26-compliant durable
fail-closed composition slot; the l2a golden trace. Draft anchors
(= the manifest's ANCHORED-row C-ref union; the derived rows
additionally cite C1/C18 as derivation inputs):
`contract:ch11-gate-format` rows
C9/C13–C17/C23–C27/C31/C32/C33/C36 — execution-side shares; the
admission-side shares of C13–C17 are ch11-P3a's; C37–C41 are P2c/P4's;
the YAML gate/process/runtimeContext keys and their source-form lanes
are P4's; the real spawn and the workspace-fact measurement are ch9's.
Plan alignment: ONE prepared edit — §11.1 item 2's schema-bump
accounting sentence acknowledges the second (P3b) column, marked
"aligned at ch11-p3b pre-approval" (the P3b plan row pre-authorizes
it) — in the working tree, landing in the SAME commit as this packet
(R-ALIGNED-UP); beyond it, no decision here contradicts ratified plan
text.
Autonomy stage: measurement — inherited from the P3 slot through the
split (parts inherit mode, predicted class, watchpoints; fresh
watchdog per part). Not first-of-a-kind: the activation class has
precedent (ch11-P2b activated the gate rung; ch8-P2 activated the
migration), the schema-bump class has precedent (ch11-P2b's
`gate_decisions` column), and the composition-dep class has precedent
(ch7-P1's `diag`, ch11-P2b's `gates`).
Classification: **projection** — manifest tally: 14 anchored /
7 derived / 1 new-decision (machine-counted from the `packet_rows`
block). The one new-decision row (S3's surplus-ref start lane) is
below the Case-B threshold and touches no
authority/separation/availability-class semantics; it rides as flag
F1 to the approve — the approve is therefore FLAG-BEARING (STOP
`4:flagged-approve`): the human's act, which ratifies it.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l2a-pseudocode/HANDLE", "disposition": "implement" },
      { "id": "l2a-pseudocode/run_process_gate", "disposition": "implement" },
      { "id": "l2a-pseudocode/classify_process_result", "disposition": "implement" },
      { "id": "l2a-pseudocode/runner_outcome", "disposition": "implement" }
    ],
    "rejections": ["runtime_context_required_for_process_gate"],
    "invariants": [
      { "id": "l2a/evidence-on-every-run", "disposition": "checker" },
      { "id": "l2a/runner-error-business-block", "disposition": "test" },
      { "id": "l2a/runs-in-the-workspace", "disposition": "test" }
    ],
    "traces": ["l2a-pseudocode"],
    "shared_ownership": []
  }
}
```

Slice notes. The one rejection is the C36 HANDLE runtime backstop —
the REJECTION half of the registry's dual name (its definition-issue
half is admission-owned at ch11-P3a); the registry stays 54 names,
untouched. The three invariants are the l2a share's remainder (4
P3a-owned + these 3 = the §11.2 seven): `evidence-on-every-run` lands
as the storeChecker's store-visible half (row T2 — the run-level half
is the kit's own driven contract, ch11-P3a T1);
`runner-error-business-block` and `runs-in-the-workspace` are
test-disposition (rows M1/M4 and X2). The four units complete the l2a
unit set (P3a owns the other four). The trace is the l2a golden trace
(row T3). Deferral homes, stated once (the mirrored map's deferral
row): the real spawn + measured workspace facts + provisioning
(L0e) — ch9; the YAML gate/process/runtimeContext/round source
surface + the journey through the shipped file channel — P4;
deferred execution (`gate_pending`) — a later lifecycle slice.

## Sizing/risk (template §2 step 0 — materialized)

Axes:

- **authority movement: none.** Admission (C20), the registry (C8),
  and the store's commit authority are untouched; the kernel consumes
  existing authorities (the admitted template's effective configs,
  the injected catalog, the instance row) and adds no new source of
  truth — the evidence records are audit artifacts, never decision
  inputs (REV-B).
- **surface spread:** one concept (process-gate execution) across the
  kernel logic (the branch + the classification units), the store
  schema (the nullable column + version bump), the domain grain (the
  instance field + the effective-config type home), the ports
  surface (the `GateInvocation` + wire-projection value types), the
  testkit CONTRACT (call recording on the kit runner, the
  evidence-checker seam, the harness start-ref passthrough — counts
  under the surface rule), and the CLI composition (the required
  runner dep + the fail-closed slot). Trips hard stop 2 by letter —
  closure proof below.
- **identity/join fragility: none** — `logRef` resolution stays a
  single-port contract (P3a's shape); no cross-seam identity joins.
- **foundation + activation coupling: none by construction** — the
  ratified P3 split severed it; P3a's foundation is built and this IS
  the activation share. The instance-side representation is the
  activation's own operand state, not independent foundation: its
  only reader is the branch shipping here (see the closure proof).
- **prerequisite coupling: none** — P3a is built; ch9's spawn is
  explicitly out (the port is scripted in the kit and filled
  fail-closed in the composition).
- **acceptance multiplicity:** kernel-contract tests + the schema
  round-trip/fence + the golden trace + kit self-tests + the checker
  — 3+ success classes; with 4+ surfaces the below-hard-stop
  escalation combination fires — closure proof below.

Consume-family scan (from the tree):

| Family | State | Evidence |
|---|---|---|
| producer / validator-gate | absent — unchanged | `v3/src/definition/admit.ts` byte-untouched; no new admission lane (all P3a's) |
| persistence / replay | present — extended | `v3/src/store/sqliteStore.ts` (the nullable column, SCHEMA_VERSION bump) |
| execution consumer | present — extended | `v3/src/kernel/kernel.ts` (the process branch), the new `kernel/processGate.ts` units |
| read / presentation (floor + CLI) | present — reached through UNCHANGED readers | the instance field rides the instance-carrying payloads additively (the CLI `detail`/`list` verbs + the debug bundle — S4's surface set; the timeline carries transcript rows only); no floor/CLI reader code changes (C28: no new verbs or flags) |
| recovery / cleanup | absent | no such surface on this slice; a blocked run leaves zero kernel state (the mutable-flow annex) |
| external / integration | declared, filled fail-closed | the `ProcessGateRunner` port is consumed by the kernel; the composition slot is the fail-closed runner (W2); the real spawn is ch9's |
| testkit | present — contract change | call recording on the kit runner, the checker + its seam, the harness start-ref passthrough (counts) |

**Hard stops:** hard stop 2 trips by letter (one concept across six
surfaces). Hard stops 1/3/4/5/6/7/8 do not trip: no authority moves
(1, 6, 7), no unfinished prerequisite (3), no competing authority
paths (4), no contract-cutover-with-consumer-cutover on a fragile
join (5), and the schema change carries no shared-contract migration
(8 — the column is additive, no data carry, the ADR-003 fenced wipe).
Hard stop 9 material is NEAR (a pre-commit side effect — the process
run and its evidence record precede the commit) — the mutable-flow
annex below records why it does not trip. The below-hard-stop
escalation combination (4+ surfaces AND 3+ success classes) fires.
`single-packet allowed: yes` — ONE implementation-closure proof
covers the trip and the escalation: the ratifier's own P3 split
pinned exactly this bundle as the activation share (the plan §11.4
P3b row); every interior candidate seam is ceremony — the column and
the instance field have NO consumer other than the branch shipping
here, the branch cannot ship without them, and the composition slot
is the branch's own required dep — so one bounded code change closes
every touched surface in the same build; ONE proof surface (the l2a
trace + the per-seam contract tests, all validating the ONE flow)
covers all success classes; the same consumers own the fallout; no
per-consumer-family review loop; no separate
compatibility/diagnostics/read-projection/recovery/ordering risk is
introduced.

Conditional annexes. **Closure-budget — the RUNTIME and PERSISTENCE
buckets are touched; one adjacent collapse, two deferrals** (compact
record): the read-projection bucket's fallout (the additive instance
field on the read payloads) is deliberately collapsed into this
packet — safe because no reader code changes and the growth is
additive (deep-equal on all pre-existing keys; the behavior-change
honesty bullet proves it); the shared-contract bucket's new wire
forms (X3/X4, M2) have two consumers — the kernel (closed HERE) and
the ch9 real runner (deferred by the chapter boundary; C23/C25/C34
pin the shape it must meet); the P4 format walk is the other named
deferral (the source-form lanes + the journey). **Proof-boundary
N/A with one declared retirement** — no existing proof contract is
reused or moved (the new tests are the new surfaces' own); the ONE
existing proof lane that changes is the process-implementation
reject lane (P2b-built), which RETIRES with the reject→run flip —
a declared golden edit (X1), not a proof relocation.
**Mutable-flow record (hard-stop-9 material near):** precondition
failure produces zero runner calls, zero evidence records, and zero
commits — the C35 resolve backstop and the C36 context backstop
both reject BEFORE any runner call (S5's precise bound governs the
projection-read and diag-event scope); the process
run's evidence side effect is contract-DESIGNED to precede the
commit and exist independently of it (C26's letter — not a leak);
no rollback/retry/preservation semantics change; no
lock/lease/idempotency/serialization primitive is introduced (the
commit transaction and the CAS restart are byte-untouched;
REV-A1-TXN stands).

## Claim + dimensions (enumerated BEFORE deriving test obligations)

The Claim, stated wide; every completeness clause carries its closed
form (R-CLAIM-GRAMMAR):

1. **Execution (PARAMETERIZED).** Every member of the six-outcome
   family (membership owner: packet ch11-p3a row T1's parameterized
   mapping) drives END-TO-END through HANDLE: a process-implementation
   binding reached with a ready workspace ref runs via the injected
   `ProcessGateRunner` (one call per binding per attempt), classifies
   per the M matrix, and either blocks — rejecting
   `gate_blocked(reason)` BEFORE any commit, round not burned,
   reason + evidence refs surfaced verbatim on the Rejected outcome
   (C31/C33) — or retains its allow/warn decision on the committed
   transcript entry (C27, the P2b-built surface).
2. **State (PARAMETERIZED + SCOPED).** Every instance carries the
   Block A runtime-context state — `null` (the model's `ready(∅)`) or
   a nonempty ready ref (the model's `ready(ref)`) — through the
   start seam's declared lane table (S2/S3), the store column's
   round-trip identity on every read surface (S4), and the C36
   backstop: a process gate reached with `null` rejects
   `runtime_context_required_for_process_gate` before any runner
   call (S5's precise side-effect bound governs the read/diag
   scope); with a ready ref it runs (both directions).
   Named exclusions with homes: provisioning, providers, and the
   actor-facing projection — ch9 (L0e); the YAML `runtimeContext`
   key's source forms — P4.
3. **Evidence (PARAMETERIZED).** Every process-gate RUN yields a
   durably persisted evidence record whose ref resolves (owner: C26
   — the kit runner and the fail-closed composition runner each
   drive their own substrate); a gate that never runs (a preceding
   block, a backstop rejection) yields NO record; committed
   decisions' refs resolve through the checker seam (T2, the
   store-visible half); a block's refs return on the Rejected
   surface (C33).
4. **Wire (PARAMETERIZED).** The C23/C24/C25 wire forms carry their
   exact keysets and grammars (owners: X3/X4/M2 — every presence
   rule in both directions): the invocation is ONE UTF-8 JSON
   document on stdin whose `config` is the effective form VERBATIM
   (wire ≡ effective — the one-downstream-form rule), the projection
   is C24's compact snake_case shape derived from the SAME snapshot
   in-process evaluators read, and stdout in gateDecisionJson mode
   parses under M2's strict ladder — every violation a runner
   outcome, never a business block.
5. **Non-change (SCOPED).** Outside the declared mutation boundary,
   shipped behavior is unchanged: the FULL existing suite stays green
   with exactly ONE declared golden edit — the P2b-built
   process-implementation reject lane flips to the run path (the
   model's reject→run flip; X1) — and zero other golden-expectation
   edits: the l0a/l0b/l1/l2 trace tables byte-identical,
   `fixtureTemplate()` and the shipped YAML untouched and deep-equal
   (the P2c equality pin stands), the P2a admission surface
   byte-untouched. Named exclusion + deferral home: the additive
   instance field on read payloads is a DECLARED delta (dimension
   12), proven additive.

Dimensions:

1. start-seam lanes (S2/S3's table): required + ref → ready;
   required + absent → throw; context-free + absent → null;
   context-free + present → throw; empty-string ref → throw;
2. store round-trip identity: null and ref states × every instance
   read surface (loadInstance, listInstances, getInstanceDetail),
   plus the
   ADR-003 fence at the new version (v3-marker wipe, non-prototype
   refuse);
3. the backstop plane (both directions): process binding × `null` →
   C36 reject with ZERO runner calls and zero records — including
   the process-FIRST form's zero-reads member AND the mixed-pipeline
   form (an earlier inline allow already read the shared snapshot;
   the reject still fires pre-run); process binding
   × ready ref → runs; inline-only pipeline × `null` → evaluates
   normally (the backstop is process-scoped);
4. wire content: invocation keyset exactness; `config` verbatim
   identity with the admitted effective config (deep equality); C24
   projection field list + snake_case; single-document stdin;
   `expected_version` = the instance's CAS version;
5. the classification grid: kind × mode × bucket — ok/exit 0,
   ok/exit nonzero (each × allow/warn/block bucket verdicts),
   ok/JSON (allow/warn/block), ok/JSON-malformed (the M2 ladder),
   timeout, runner_error; the bucket boundary's numeric members
   (0, nonzero incl. negative; `-0` lands in the ZERO bucket per
   M1's `-0 === 0` rule — the `Object.is`-grade distinction
   belongs to the ASSERTS that prove which bucket fired, never to
   the bucket comparison itself, which a literal `Object.is` would
   invert);
6. reason assignment: authored vs default bucket tokens (V1's
   completeness — allow carries its zero-bucket token too); the
   fixed runner tokens `timeout` / `runner_error` /
   `malformed_gate_decision_json` distinct from each other and from
   authored tokens on otherwise-identical fixtures (the
   audited-distinctly combination; the runner-error-business-block
   invariant's test);
7. evidence propagation lanes (E1): exit-bucket → `[logRef]`;
   JSON with refs → verbatim + logRef appended LAST iff absent
   (both the append direction and the already-present dedup
   direction); JSON with absent refs → `[logRef]`; JSON with empty
   list → `[logRef]` appended to the empty list; runner outcome →
   `[logRef]`; block refs on the Rejected surface; allow/warn refs
   retained on the committed entry;
8. ordering/combination: an inline block BEFORE a process gate →
   the runner is NEVER called and no record exists; a process block
   first → later gates not evaluated; a mixed pipeline shares ONE
   projection snapshot (the wire's projection ≡ the inline
   evaluator's input);
9. persistence guarantees: the fail-closed slot's record durable
   across a substrate re-open; the slot's persistence-failure THROW
   lane (W2 — never a returned-but-unresolvable ref); the kit's
   persist-before-return (P3a-driven, extended by the recorded-call
   contract);
10. checker sensitivity (T2): a non-resolving ref → violation; refs
    present with NO seam provided → violation (fail-closed, never a
    skip); a resolving trace → clean;
11. type-level foreclosures: the runner-outcome disposition is the
    `"blockTransition"` singleton (fail_instance foreclosed at
    admission); the instance field's `string | null` domain — each
    with its compile-negative probe where type-expressed;
12. read-surface honesty: the instance's `runtimeContext` rides the
    INSTANCE-carrying read payloads verbatim — S4's surface set
    (`loadInstance` / `listInstances` / `getInstanceDetail`), i.e.
    the CLI `detail`/`list` verbs and the debug bundle's instance
    (the timeline carries `TranscriptEntry` rows only — no instance
    payload, unaffected); additive, every pre-existing key
    deep-equal; its classification: a kernel-opaque locator consumed
    ONLY as the runner `cwd` (E2's confinement note);
13. retirement honesty: the P2b reject lane's flip is the ONE golden
    edit; the awaited-runner failure shape (a THROWING/rejecting
    runner — distinct from the in-band `runner_error` kind; the
    shipped slot's persistence-failure throw is the legitimate
    member, any other throwing runner a port-contract violation)
    maps to the kernel's internal-failure path (the grid's new
    cell), pre-commit, no state.

## Operative material (full text — projection, not invention)

Authority note: the unit texts are the model floor, reprinted
verbatim; the realized grain follows the ratified draft rows — the
word-key rename (`zero`/`nonzero` for the model's `"0"`/nonzero,
C15), the camelCase effective-config keys with the snake_case WIRE
keysets (C23/C24/C25 model-verbatim), and the single-admission form
(effective configs arrive materialized; the unit's inline defaulting
lines are ALREADY RESOLVED upstream — `classify_process_result`
reads the effective form's populated fields, it re-defaults nothing).

`l2a-pseudocode/HANDLE` (disposition: implement — the process branch
is this packet's delta; every other line is the P2b/P1-realized
kernel, byte-inherited):

```text
HANDLE envelope → Outcome
  IF not valid_shape(envelope)            THEN RETURN Rejected(invalid_shape)

  instance ← instanceStore.load(envelope.instance_id)
  IF instance is none                     THEN RETURN Rejected(unknown_instance)
  template ← definitionStore.load(instance.template_ref)   # separate store; a pinned immutable ADMITTED definition — effective configs, admission's output (L2)
  step     ← template.step(instance.current_step)           # positional read, NOT a rung — infallible over committed
                                                            # state (load-time validation: every reachable step id
                                                            # resolves in the pinned template), so hoisting it cannot
                                                            # reject or mask a rung; consumed by the authority rung

  # ADMISSION (born at L0d) — the actor-envelope rungs: idempotency → lifecycle/state → staleness → authority (born at L1)
  outcome ← admit_loaded(instance, expect: {
    op_id:     envelope.op_id,                                  # a duplicate is a no-op, no 2nd entry
    state:     kernel_status = ACTIVE → Rejected(not_active),   # L0d lifecycle guard: actor emits only in actor-routable ACTIVE execution
    version:   envelope.expected_version,                       # actor-supplied stale-intent — mandatory at L0b
    authority: { claim:   envelope.expected_role,               # L1 role authority — mandatory at L1 (shape-derived, todo E1)
                 granted: step.role,                            # this position's active role — read only at the authority rung
                 missing → Rejected(missing_role), mismatch → Rejected(role_not_authorized) } },
    envelope)
  IF outcome ≠ Accepted THEN RETURN outcome                     # Duplicate | Stale(v) | Rejected(…) pass through unchanged

  target ← step.transitions[envelope.type]   # navigation (L0b): does this action exist here?
  IF target is none                       THEN RETURN Rejected(no_transition)

  # L1: action authorization — exists as a transition, but may this role emit it here?
  IF envelope.type not in capability(template, step.role, instance.current_step)
                                          THEN RETURN Rejected(not_authorized)

  # L2: policy gate pipeline — the transition exists (L0b) and is authorized (L1); do the policies allow it now?
  gate_decisions ← []                                                                       # retained allow/warn verdicts + evidence refs, carried to the commit
  FOR gate IN template.gates_for(instance.current_step, envelope.type):   # ordered, authored; empty for ungated transitions
    registration ← gateRegistry.resolve(gate.uses)
    IF registration is none            THEN RETURN Rejected(gate_evaluator_unavailable)      # runtime availability backstop — admission resolved the name at load; this lane guards registry drift
    IF registration.execution ≠ inline THEN RETURN Rejected(gate_execution_not_supported)    # deferred ⇒ later lifecycle slice (gate_pending + GATE_RESULT)
    IF registration.implementation = process                                                 # L2a: inline process now runs (was rejected at L2 core)
      THEN IF instance.runtime_context = ready(∅) THEN RETURN Rejected(runtime_context_required_for_process_gate)   # ready(∅) = context-free: ADMISSION flags the declaration-level case (admit_definition); this lane is the runtime backstop
           decision ← run_process_gate(gate, instance, template, envelope)                # spawn in the workspace, bounded timeout
      ELSE decision ← registration.evaluate(gate.effective_config, gate_projection(instance, template, envelope))   # declarative / packaged, in-process
    IF decision.verdict = block     THEN RETURN Rejected(gate_blocked(decision.reason), decision.evidence_refs)   # no commit ⇒ round not burned; refs surfaced
    gate_decisions.append(decision)                                                       # allow or warn ⇒ retained (verdict + evidence_refs + diagnostics)
    # allow or warn ⇒ next gate in the pipeline

  issued_config ← resolve_agent_config(template, step, instance)   # resolved only now — not for a rejected envelope

  # one atomic commit, CAS on instance.version
  COMMIT atomically at expected_version = instance.version:
    instance.transcript.append(envelope, issued_agent_config: issued_config, gate_decisions: gate_decisions)   # provenance: issued config + gate verdicts / evidence refs
    instance.current_step ← target
    IF advances_round(step, target) THEN instance.round ← instance.round + 1    # advance predicate = transition semantics; transcript-reconstructable
    IF target is terminal THEN COMPLETE(instance)                  # kernel-internal completion path → TERMINAL(done)
    instance.version ← instance.version + 1
  # on CAS conflict: restart HANDLE from load —
  #   re-check idempotency and re-resolve the transition;
  #   never re-commit a target computed from stale state

  intent ← (instance.kernel_status = TERMINAL) ? none : dispatch_intent(instance, template, instance.current_step)  # derive after commit
  RETURN Committed(instance.version, intent)
```

`l2a-pseudocode/run_process_gate` (disposition: implement):

```text
run_process_gate(gate, instance, template, envelope) → GateDecision   # L2a — inline external.process, in the workspace, bounded timeout
  invocation ← GateInvocation {
    instance_id: instance.id, template_ref: instance.template_ref,
    step_id: instance.current_step, event_type: envelope.type, expected_version: instance.version,
    config:     gate.effective_config,                                # the admission-materialized EFFECTIVE config — the one downstream form, on the wire too
    projection: compact(gate_projection(instance, template, envelope)) }   # MVP: small inline payload (NOT projection_ref + SDK)
  result ← processRunner.run(gate.effective_config.command, {
    cwd: runtime_context_workspace(instance),                         # runs in the provisioned workspace (v1: the worktree)
    stdin: json(invocation), timeout_ms: gate.effective_config.timeout_ms })    # bounded timeout — a v3 addition (v1 had none)
  # evidence (log + exit_code + duration + head_sha + git_status_hash) is persisted on EVERY run (v1-faithful)
  RETURN classify_process_result(result, gate.effective_config)
```

`l2a-pseudocode/classify_process_result` (disposition: implement):

```text
classify_process_result(result, config) → GateDecision
  output_mode     ← config.output.mode      ?? exit_code             # contract defaults (absent ⇒ these) — resolved once
  on_runner_error ← config.on_runner_error  ?? block_transition
  on_timeout      ← config.on_timeout       ?? block_transition
  IF result.kind = timeout      THEN RETURN runner_outcome(on_timeout,      timeout,      result.log_ref)
  IF result.kind = runner_error THEN RETURN runner_outcome(on_runner_error, runner_error, result.log_ref)   # spawn / workspace-missing (malformed JSON has its own branch below)
  MATCH output_mode:                                                 # never guess "JSON wins"
    exit_code          → RETURN { verdict: config.on_exit[bucket(result.exit_code)],   # buckets: "0" | nonzero → allow | warn | block (values allowlisted at definition load)
                                  reason: exit_reason(result.exit_code), evidence_refs: [result.log_ref] }
    gate_decision_json → parsed ← try_parse_gate_decision(result.stdout)               # opt-in; schema allowlists verdict ∈ { allow, warn, block } — route is invalid until the routing slice
                         IF parsed is none THEN RETURN runner_outcome(on_runner_error, malformed_gate_decision_json, result.log_ref)   # unparseable / schema-invalid (incl. a disallowed verdict) ⇒ runner outcome, NOT a business block
                         RETURN with_evidence(parsed, result.log_ref)
```

`l2a-pseudocode/runner_outcome` (disposition: implement):

```text
runner_outcome(disposition, reason, log_ref) → GateDecision          # MVP realizes ONLY block_transition
  # fail_instance is rejected at definition load (gate_config_not_supported), so block_transition is the only value that reaches here — fail-closed
  RETURN { verdict: block, reason, evidence_refs: [log_ref] }        # audited distinctly: runner_error / timeout / malformed, not test_failed
```

The l2a golden trace as an executable expectation (the 09-l2a Runtime
trace — "an implementer PASS gated by the repo's test command: a clean
run, a failing test, and a runner error audited distinctly from a
test failure"; the committed-row sequence the trace test reproduces):

```text
1 · codex emits PASS on implement { expected_role: implementer } (version=1, round=1)
    authorized ✓ → gate external.process: run("pnpm test", cwd=worktree, timeout_ms) → exit 0
    → on_exit["0"] = allow → commit implement → review; evidence log ref recorded on the entry
2 · (a later round) codex emits PASS on implement
    pnpm test → exit 1 (a test failed) → on_exit[nonzero] = block
    → Rejected(gate_blocked(reason=test_failed)); no commit, round not burned, still on
    implement, evidence ref returned in the outcome
3 · codex emits PASS with a mis-configured command path
    processRunner.run → kind=runner_error (spawn failed) → on_runner_error = block_transition
    → Rejected(gate_blocked(reason=runner_error)) — audited DISTINCTLY from test_failed; the
    transition is held back because the gate did not run reliably, not because the work is wrong
```

The reason-token data (never prose): authored tokens ride C17's
`reason` map (the trace's `test_failed` is the authored `nonzero`
entry — the C17-sanctioned realization of the model trace's token);
the fixed tokens are `exit_zero` · `exit_nonzero` (the C17 bucket
defaults) · `round_below_min` · `no_previous_verdict` (the inline
evaluators') · `timeout` · `runner_error` ·
`malformed_gate_decision_json` (the runner outcomes'). All are
`gate_blocked` REASON PAYLOAD — disjoint from the 54 registry names
by C31's standing rule. The one driven registry rejection:
`runtime_context_required_for_process_gate`.

## Canonical state/seam matrix (S)

| ID | Rule |
|---|---|
| S1 | `WorkflowInstance` gains the REQUIRED `readonly runtimeContext: string \| null` field — the Block A compression of the model's runtime-context state set: `null` IS the model's `ready(∅)` (a context-free run) and a nonempty string IS `ready(ref)` (the ready workspace ref); the `none`/`requested` states are UNREPRESENTABLE (no provisioning exists and activation is immediate — `startInstance` is the sole creator and only ever commits a ready state; DERIVATION NOTE: the l0e START/RUNTIME_CONTEXT_READY compression — a Block A instance is always post-activation, and the model activates only from a ready state). The ref is KERNEL-OPAQUE (the model's provider-defined-locator rule: the kernel guards presence only, never validates the locator) and is consumed at exactly ONE point: the runner call's `cwd` (X2). It is set at start and never changes over the instance's lifetime (no write path exists post-create). |
| S2 | The start seam: `StartInstanceInput` gains the OPTIONAL `runtimeContextRef` field (a nonempty string — the testkit-injected ready ref; plan §11.1 item 4). The lane table, decided by `template.runtimeContext` (C18's declaration): declared `"required"` + ref present → the instance starts with `runtimeContext = ref`; declared `"required"` + ref ABSENT → START-SIDE THROW (the binding-coverage culture: fail at start, not mid-run; DERIVATION NOTE: entailed by the model's activation precondition — activation happens only AFTER ready, and `ready(∅)` MEANS context-free, so starting a required-context run without a ref could only manufacture a lying state); undeclared + ref absent → `runtimeContext = null` (the model's `ready(∅)`); an EMPTY-STRING ref → throw on every lane (the value grammar; `""` is not a ref and not `null`). Start-side throws carry NO invented rejection name (the plan §4.1 rule). The shipped CLI passes no ref (C28: no new flags); the required-template throw lane is unreachable through the FILE channel until P4 (the C18 YAML key does not load) — its CLI error classification is P4's, named deferral. |
| S3 | Undeclared template + ref PRESENT → START-SIDE THROW (surplus input, fail-closed). DECISION NOTE (new-decision): the model has no start seam, and both conforming end-states — throw, or ignore-and-null (either keeps the stored state model-conform) — are available, so the choice is this packet's own. THROW is selected: a ready ref supplied for a context-free workflow is caller confusion (a test believing it staged a workspace it did not), and silently dropping it hides the wiring bug — the unconsumed-input culture (C15's gateDecisionJson-mode `onExit` hardening is the config-grain precedent) applied at the seam grain; unlike `startOverrides` (a role-KEYED map whose partial application is the feature), a surplus ready ref has zero consuming paths. Flag F1 is this decision's record; the approve ratifies it. |
| S4 | The store: `instances` gains the NULLABLE `runtime_context TEXT` column; `SCHEMA_VERSION` bumps `"3"` → `"4"` — the chapter's second schema change, riding the SAME ADR-003 fence (a known PROTOTYPE marker at any other version wipes on open; anything else refuses; no migration path, no data carry). Round-trip identity on BOTH states (`null` ↔ NULL, ref ↔ its exact string) across EVERY instance read surface — `loadInstance`, `listInstances`, `getInstanceDetail` (one row mapper, the ch6 shared-mapper culture). `createInstance` writes the field verbatim; NO write API changes otherwise (`CommitTransitionInput` untouched — the field is create-time-only, S1). |
| S5 | The C36 HANDLE runtime backstop: a PROCESS-implementation binding reached with `instance.runtimeContext = null` is `Rejected(runtime_context_required_for_process_gate)` — positioned INSIDE the process arm, after the C35 resolve backstop, BEFORE any runner call. Side-effect bound, stated precisely: ZERO runner calls, ZERO evidence records, ZERO commits — always; ZERO projection reads only when the backstop precedes the pipeline's FIRST projection need (in a mixed pipeline an EARLIER inline gate's evaluate has already read the one shared snapshot — X2's lazy-read rule; the process-first form is dimension 3's zero-reads member); the rejection emits the standard ch7 classified `rejected` diag event like every rejection (non-authoritative, outside this bound by REV-DIAG-FAILOPEN's own contract). Its compile twin is admission's C19 lane (P3a-built); this runtime lane guards DRIFT states (a store-constructed or cross-generation instance) — through the shipped start seam a process-gated template always carries a ref (S2's required lane + C19's admission guarantee), so the lane is driven at the store grain (the C35 drift-idiom precedent). Inline-only pipelines never consult the field (the backstop is process-scoped). |

## Canonical execution matrix (X)

| ID | Rule |
|---|---|
| X1 | The HANDLE process branch: `registration.implementation === "process"` routes to the backstop (S5) then `run_process_gate` (X2); the inline arm (`evaluate`) is byte-unchanged. The former process-implementation REJECT lane (`gate_execution_not_supported` at the process arm) RETIRES — the model's reject→run flip; its test lane is the ONE declared golden edit (Claim 5). The rejection NAME stays in the 54-registry (its deferred-execution meaning is a later lifecycle slice; `execution` remains the type-level `"inline"` singleton, so no behavioral lane for it exists after the flip). The decision's block/retain consumption is the P2b-built shared path — first-block-wins, refs surfaced verbatim on the Rejected outcome, allow/warn retained in pipeline order — byte-inherited, re-driven here with process decisions. |
| X2 | `run_process_gate` (kernel-side, the model unit at the TS grain): builds the C23 invocation (X3), then `processRunner.run(effective.command, { cwd: instance.runtimeContext, stdin: <the serialized invocation>, timeoutMs: effective.timeoutMs })`, then classifies (M1). The `cwd` IS the instance's ready ref — the model's `runtime_context_workspace(instance)` realized as the ref itself (the worktree kind's workspace root; the runs-in-the-workspace invariant's test asserts the runner received exactly the injected ref). EXACTLY ONE runner call per process binding per HANDLE attempt (no retry, no re-run on classification); a CAS restart is a NEW attempt (a fresh run — the restart re-evaluates the whole rung on fresh state, the P2b rule). The projection feeding the invocation is the SAME lazily-derived snapshot inline evaluators receive (X4); the lazy-read rule extends: the read fires at the FIRST need — an inline `evaluate` OR a process invocation build — and a backstop rejection (C35/S5) preceding the first need reads NOTHING. |
| X3 | The `GateInvocation` wire form (C23; a new `ports/gate.ts` value type): stdin carries ONE UTF-8-encoded JSON document with the EXACT snake_case top-level keyset `{instance_id, template_ref: {id, version}, step_id, event_type, expected_version, config, projection}` — `step_id` = the instance's current step, `event_type` = the envelope's type, `expected_version` = the instance's CAS version at evaluation. `config` is the admitted EFFECTIVE config VERBATIM — the value rides with ITS OWN (camelCase) keys, deep-equal to the admitted binding's config (wire ≡ effective, C23's one-downstream-form rule; the envelope keyset is snake_case model-verbatim, the config payload is the effective form's — the asymmetry is C23's letter, stated once here). `projection` is X4's compact form. The runner passes NOTHING else (no argv payload; C13's one-command-line + stdin contract). |
| X4 | The projection wire form (C24): `{round, current_step, event_type, history}` — `history` the ordered `{step_id, event_type, role}` list for every committed actor transition, an entry's `step_id` the step it was emitted FROM. The SAME derived snapshot serves in-process evaluators and the wire (field-list identity; casing per surface: the domain `GateProjection` camelCase, the wire form snake_case — a pure key-rename projection, no field added or dropped). No payloads, no raw transcript, no store access (REV-C; the P2b derivation is byte-untouched — this row adds only the wire RENDERING). |

## Canonical classification matrix (M)

| ID | Rule |
|---|---|
| M1 | `classify_process_result(result, effective)` — the kind × mode grid over the EFFECTIVE config (defaults are admission-materialized; the unit's `??` lines are resolved upstream — the function re-defaults nothing): kind=`"timeout"` → `runner_outcome(effective.onTimeout, "timeout", logRef)`; kind=`"runner_error"` → `runner_outcome(effective.onRunnerError, "runner_error", logRef)`; kind=`"ok"` + mode=`"exitCode"` → `{ verdict: onExit[bucket(exitCode)], reason: effective.reason[bucket], evidenceRefs: [logRef] }` — `bucket(0) = zero`, every other integer `nonzero` (`-0` lands in `zero`: `-0 === 0` at the bucket grain, driven as a ladder member), the `reason` read is total (V1: exitCode-mode reason is always present and complete); kind=`"ok"` + mode=`"gateDecisionJson"` → M2's strict parse — a parse/schema failure is `runner_outcome(effective.onRunnerError, "malformed_gate_decision_json", logRef)`, a parsed decision is E1's `with_evidence` merge. The runner-error-business-block invariant's test rides this row: a `runner_error` block and an exit-nonzero block are DISTINCT auditable outcomes on otherwise-identical fixtures. |
| M2 | The `GateDecision` stdout parse (C25, strict single-value): the UTF-8-decoded stdout is ONE JSON document (leading/trailing whitespace legal; ANY other surrounding or trailing content is unparseable); the root is an object with the EXACT keyset `{verdict (required), reason?, message?, evidence_refs?}` — `verdict` ∈ {`allow`, `warn`, `block`} (`route` invalid until the routing slice); `reason`/`message` NONEMPTY strings; `evidence_refs` a list of NONEMPTY strings (an empty LIST is legal, an empty ELEMENT is not). The malformed inventory (a LIST, each member ⇒ `malformed_gate_decision_json`, membership owner: THIS row projecting C25's letter): unparseable text; trailing content; a non-object root (scalar, list, null); missing `verdict`; a non-allowlisted `verdict` (`route` included, non-string included); ANY unknown top-level key; a wrong-typed field; an empty `reason` or `message` string; an empty `evidence_refs` ELEMENT; a non-list `evidence_refs`. All reads are own-property (the G8 discipline — an inherited/`__proto__` member is never decision data). |
| M3 | `runner_outcome(disposition, reason, logRef)` → `{ verdict: "block", reason, evidenceRefs: [logRef] }` — the disposition parameter is TYPED as the `"blockTransition"` singleton (`fail_instance` is admission-foreclosed at P3a's lane o, so the type states what the model's comment states: block is the only reachable disposition; its compile-negative probe rides the probes discipline). A runner outcome is NEVER a retained decision (verdict is always block) and never a business block (M1's distinct-token rule). |
| M4 | Reason-namespace disjointness (C31): every token the classification can emit — authored (C17-grammar) and fixed (the operative material's data list) — is `gate_blocked` REASON PAYLOAD carried in the Outcome's `gateReason` field (the P2b-built O1 pass-through arm), never a registry rejection name; the two namespaces stay disjoint (the drift suite's 54-name lock is the standing guard). The l2a trace drives the audited-distinctly duty end-to-end: `test_failed` (authored) vs `runner_error` (fixed) on the same gate. |

## Canonical evidence matrix (E)

| ID | Rule |
|---|---|
| E1 | Evidence propagation (C33): an exit-bucket decision carries `evidenceRefs = [logRef]`; a gateDecisionJson decision carries the PROCESS-returned `evidence_refs` VERBATIM (order preserved) with the runner's `logRef` APPENDED AS THE LAST ELEMENT iff not already present (string equality — the dedup direction: an already-present ref is NOT duplicated); an ABSENT `evidence_refs` on a parsed decision yields `[logRef]`; an empty authored list yields `[logRef]` (the append rule on the empty list); a runner outcome carries `[logRef]` (M3). Downstream: allow/warn decisions retain their refs on the committed transcript entry (C27's P2b-built surface, byte-unchanged); a block's refs RETURN on the Rejected outcome (C31's `evidenceRefs` arm) — blocked/timeout/runner_error runs are evidenced (their records exist per C26) even though nothing commits. |
| E2 | Confinement (C32): process-returned `reason`, `message`, and `evidence_refs` elements are UNTRUSTED opaque values — never re-parsed, never policy or path input, never interpolated into commands; retained VERBATIM on the read surfaces under the ch6/ch7 untrusted-free-text culture (the debug bundle's redaction boundary applies to them as to every payload-adjacent string; no reader code changes here). The authored reason (C17) is grammar-bound at admission; the process-returned reason is not — the asymmetry is deliberate and confined by this row. Free-text field classification (the packet's roster): `stdout`/`log` — untrusted-confined (P3a R2/R3, unchanged); the parsed decision's `reason`/`message`/`evidence_refs` — untrusted-confined (this row); the instance's `runtimeContext` ref — kernel-opaque caller input, consumed ONLY as the runner `cwd` by contract (S1; the model's provider-defined-locator rule — deliberately NOT validated, so it is never parsed or interpolated either), riding the instance read surfaces verbatim in `task`'s class. |

## Canonical wiring matrix (W)

| ID | Rule |
|---|---|
| W1 | `KernelDeps` gains `readonly processRunner: ProcessGateRunner` — REQUIRED (the `diag`/`gates` explicit-wiring culture: an optional runner would turn a wiring omission into a silent runtime surprise). Every composition site wires it: the kit/tests inject the scripted runner; the shipped CLI roots (operator main ×2 verbs, dev main) inject the fail-closed runner (W2). DERIVATION NOTE: the P2b `gates` dep's decision pattern applied to the P3 port. |
| W2 | The fail-closed composition slot (the C26 anchored requirements): the shipped roots wire a runner that NEVER spawns and NEVER allows — on its normal path every `run()` durably persists a COMPLETE C26 evidence record BEFORE resolving (kind=`"runner_error"`, `durationMs` 0, the runner's declared workspace-fact sentinels, a `log` naming the unavailability), returns `{ kind: "runner_error", logRef, durationMs: 0 }`, and classification then blocks (`gate_blocked(runner_error)`). PERSISTENCE-FAILURE lane (its own family): when the record CANNOT be durably persisted, `run()` THROWS instead of returning — a returned-but-unresolvable `logRef` would violate C26's resolve guarantee, so the throw IS the C26-conform refusal (it propagates to the kernel's internal-failure path: pre-commit, no state — still fail-closed). Durability grain, entailed for THIS slot: its refs must survive the emitting CLI invocation (records are resolvable across a re-open), so the substrate is durable BEYOND the process — an in-process substrate cannot honor that; the kit runner's in-process records stay C26-conform because its resolution happens in the same test process (P3a T1). Realization guidance (build freedom within the row's constraints — the C29 placement culture, not canonical content): the recommended shape is a derived-path sibling beside the store DB (the ch7-P4 C1 textual-derivation precedent) with the slot living in `cli/` (composition-owned, the `withStoreAndDiag` placement culture — `gates/` stays evaluators+registry per ADR-013, `kernel/` stays port-consuming); the concrete files are the boundary's. The real spawn REPLACES this slot at ch9 (the port and C26 pin what it must meet). |
| W3 | Reachability honesty + the journey rule: through the SHIPPED channels no gate is authorable until P4 (the C1/C18 YAML keys do not load — the ch8 unknown-key rejection stands), so no shipped entrypoint reaches the process path and R-ACTIVATION-JOURNEY does NOT fire — the journey through the file channel is P4's, named deferral (P4's row already carries the format walk; the existing `journey.test.ts` stays green unedited except type ripple). The activation is driven end-to-end at the deepest shipped seam a gated template can reach: the ingress-replay trace over a direct-constructed admitted template (the l2 trace's T3 precedent). |

## Canonical testkit/drift matrix (T)

| ID | Rule |
|---|---|
| T1 | `ScriptedProcessGateRunner` EXTENDS with faithful call recording: `calls` — the ordered `{command, cwd, stdin, timeoutMs}` received per `run()` invocation, exposed for assertion (the records surface's sibling). Playback, validation, persistence, exhaustion: byte-unchanged (P3a T1's contract stands). The recorded calls are the drive surface for X2/X3 (the wire-content and runs-in-the-workspace assertions: full-document stdin equality, cwd ≡ the injected ref, timeoutMs ≡ the effective value, command ≡ the effective command). REV-B: calls and records are testkit surface, never authority. |
| T2 | `checkEvidenceResolution` (storeCheckers — the evidence-on-every-run invariant's STORE-VISIBLE half; the run-level half is the kit's driven contract, P3a T1): over the floor-read detail, EVERY `evidenceRefs` element on EVERY committed retained decision resolves through the provided evidence seam; a non-resolving ref is a violation naming the ref; refs PRESENT with NO seam provided is a violation (fail-closed — a checker that skips is the blind-lane class; DERIVATION NOTE: the panel's unknown-is-not-a-pass rule + R-LANE-SENSITIVITY applied at checker grain), and a ref-free detail with no seam is clean (every pre-l2a trace passes unchanged). Seam plumbing: `runAllCheckers` and `TraceSeams` gain the OPTIONAL evidence-resolve seam (`(ref) => record \| undefined` — structurally the kit runner's `resolve`); the harness threads it. |
| T3 | The l2a golden trace (`l2aTrace.test.ts`, the trace-harness idiom): the three model rows reproduced as a committed-row sequence over a DIRECT-CONSTRUCTED admitted template — `runtimeContext: "required"`, a process gate at (implement, PASS) with `command: "pnpm test"`, `timeoutMs: 600000`, defaulted exitCode mode, `onExit: { zero: "allow", nonzero: "block" }`, authored `reason: { nonzero: "test_failed" }` (the C17-sanctioned realization of the trace's token; the zero bucket defaults to `exit_zero`), the round declaration `{ advanceOnArrivalAt: ["implement"] }` (the l2-trace wrapper idiom) — started with the kit-injected ready ref, replayed through the ingress seam, the kit runner scripted `[ok/exit 0, ok/exit 1, runner_error]`; the model's "(a later round)" realized by the review→implement pass-back (round 2 on arrival). AT-LEVEL (explicit roles + versions). Asserts: the golden outcome/state/transcript tables; the DISTINCT block reasons + resolving refs on the returned outcomes (the `ReplayResult.outcomes` surface, the l2 precedent); the retained allow decision's `{uses, verdict, reason: "exit_zero", evidenceRefs}` on the committed entry; `runAllCheckers` with the evidence seam CLEAN. The six-outcome family's remaining members (warn lanes, JSON lanes, timeout, malformed) drive at the kernel grain (Claim 1's owner mapping) — the trace carries the model's exhibited three. |
| T4 | Drift flips at build: `unitMap.json` — the four owned unit ids flip pending → realized with their `codeRef` witnesses (`HANDLE` → the kernel's process branch site; the three classification units → `kernel/processGate.ts`); `domainRegistry.ts` — `l2a/GateInvocation` flips with its type witness (the new `ports/gate.ts` wire value). The rejection registry is untouched (54 names — the C36 name pre-exists; only its behavioral drive is new). DERIVATION NOTE: plan §11.2's ownership arithmetic applied to the drift files' current pending markers. |

## Site × shape × phase grid

The gate rung's phase structure is P2b-built and unchanged (all gate
work is PRE-COMMIT; the commit transaction and CAS restart are
byte-untouched). The packet's NEW awaited site and its cells — every
cell a driven lane or an explicit rule-out:

| Site | Shape | Phase | Disposition |
|---|---|---|---|
| `processRunner.run` | in-band result (`ok` / `timeout` / `runner_error`) | pre-commit | driven — the M1 grid (the six-outcome family) |
| `processRunner.run` | REJECTION / synchronous throw (distinct from the in-band `runner_error` kind, which is the runner's own DUTY to return) | pre-commit | driven — dimension 13: propagates to the kernel's internal-failure path (the ch7-P1 catch: one `internal_failure` diag event, the error rethrown, no commit, no state); never mapped to a gate verdict. Two throw sources, one kernel behavior: the shipped fail-closed runner's LEGITIMATE persistence-failure throw (W2's lane — C26's refusal to mint a dead ref) and any OTHER throwing runner (a port-contract violation; inventing an in-band classification for it would mask the port bug) |
| `store.getTimeline` (the lazy projection read) | null / rejection | pre-commit | inherited unchanged (P2b's integrity-throw cells); the NEW cells are the ORDER rule-outs: the C35/S5 backstops precede any read the PROCESS ARM would trigger (driven — dimension 3's zero-reads member; in a mixed pipeline an earlier inline gate may already have read the shared snapshot, S5's precise bound) |
| every other awaited site (`loadInstance`, `definitions.load`, `findOp`, `commitTransition`) | all | all | inherited unchanged — byte-untouched code, P1/P2b-owned cells; no new failure shape is introduced at them |

Event-keyset note: the branch adds NO diag emission of its own — a
process-gate rejection rides the existing `rejected` classified event
(reason `gate_blocked` or the C36 name), a runner-port throw rides
`internal_failure`; the observer path performs no new fallible work
(field provenance unchanged from ch7-P1).

## Mirrored surface map (one canonical statement per rule)

| Rule | Canonical home | Named mirrors (summarize/defer only) |
|---|---|---|
| the null = `ready(∅)` state compression | S1 | S2/S5's readings; Claim 2; dimensions 1/3; the store column's NULL (S4) |
| the start-seam lane table | S2 (+S3's lane) | Claim 2; dimension 1; flag F1 (S3's record) |
| wire ≡ effective (config verbatim) | X3 | Claim 4; the operative authority note's casing sentence |
| the six-outcome family membership | packet ch11-p3a row T1 (cross-packet owner) | Claim 1; M1's grid; T3's scripted subset; the acceptance end-to-end bullet |
| evidence-on-every-run, two halves | E1 + T2 (store-visible) · packet ch11-p3a T1/R3 (run-level) | Claim 3; the slice notes; dimension 9 |
| the reject→run flip (the ONE golden edit) | X1 | Claim 5; the sizing proof-boundary annex; dimension 13; the acceptance honesty bullet |
| the required runner dep | W1 | the embedding gates; the sizing surface axis |
| the durable fail-closed slot | W2 | the sizing external-family row; Claim 3's owner note |
| the P4/ch9 deferral set | the slice notes | the header anchors sentence; S2's CLI note; W3; Claims 2/4/5 exclusions; T4 |
| the reason-token data | the operative-material data line | M1/M3/M4's per-lane assignments; T3's authored token |
| the ref's kernel-opaque/cwd-only class | S1 (confinement half: E2's roster) | dimension 12; X2's cwd sentence |
| the one-snapshot projection rule | X2 (lazy-read extension) | X4; dimension 8; the grid's order rule-outs |
| the backstop's side-effect bound (zero runner calls/records always; reads/diag per the precise scope) | S5 | Claim 2; dimension 3; X2's reads-nothing sentence; the grid's order rule-outs; the mutable-flow annex |
| the second schema change + the ADR-003 fence (version 4) | S4 | the header; dimension 2; the sizing hard-stop-8 note + closure-budget annex; the acceptance schema + adr-check bullets |
| exactly one runner call per binding per attempt | X2 | Claim 1; the acceptance wire-content arity member |
| C28: no new CLI verbs or flags | S2 (the CLI sentence) | the consume-family read row; the in-context CLI note |
| exitCode-mode reason always-present-and-complete | packet ch11-p3a row V1 (cross-packet owner) | M1's total-read sentence; dimension 6 |

Fold policy: a change to a canonical row updates every named mirror
before handing back; a mirror discovered in review is added here.

## In-context notes (the scarce budget)

- Extend, don't fork: the process branch replaces the reject lines at
  the P2b rung's process check IN PLACE (`kernel.ts`); the three
  classification units land as the NEW `kernel/processGate.ts`
  (imports domain + ports only — REV-E holds: the branch discriminates
  on the CONTRACT's own `implementation` field, never a concrete
  adapter type). The module-local `EffectiveProcessConfig` type MOVES
  from `gates/process.ts` to `domain/gate.ts` (exported) so the kernel
  and the validator share ONE shape — never two homes; the kernel
  reads the admitted binding's config through it (a typed read, no
  re-validation — C20/C22's by-construction rule, the inline
  evaluators' cast culture).
- The C25 parse follows the G8 own-property discipline
  (`threshold.ts`'s `ownGet` is the pattern) and `JSON.parse`'s
  native strictness for the single-document rule (surrounding
  whitespace legal, trailing content a parse error) — no second
  parser.
- The kit runner's recorded `stdin` is asserted by FULL-document
  equality (parse the recorded string, deep-equal the whole
  invocation — the JSON full-row equality culture), never per-key
  spot checks.
- Hostile fixtures ride the direct channel as object literals /
  scripted values (no stringify staging; the R-RAW-FIXTURES
  watchpoint does not fire) — the malformed-stdout fixtures are raw
  STRINGS by nature (the channel preserves them exactly).
- The trace-harness `start` step gains the optional ref passthrough
  (the harness mirrors the kernel's input structurally — extend the
  mirror, not a parallel seam).
- The dev CLI's `inject` and the operator verbs gain NOTHING (C28);
  their composition edits are wiring-only (W1/W2).

## Embedding gates (v1-inherited)

- Target files (verified against the live tree): NEW —
  `v3/src/kernel/processGate.ts` + test, `v3/src/l2aTrace.test.ts`,
  `v3/src/cli/failClosedProcessGateRunner.ts` + test. EDITED —
  `v3/src/kernel/kernel.ts` (the branch + the dep) + `kernel.test.ts`
  (the branch lanes; the ONE declared flip), `v3/src/kernel/start.ts`
  (the seam) + `start.test.ts`, `v3/src/kernel/index.ts`,
  `v3/src/domain/instance.ts` (the field), `v3/src/domain/gate.ts`
  (the effective-config type home) + `v3/src/domain/index.ts`,
  `v3/src/ports/gate.ts` (the `GateInvocation` + wire-projection
  values) + `v3/src/ports/index.ts`, `v3/src/gates/process.ts` (the
  type-home import swap), `v3/src/store/sqliteStore.ts` (the column +
  version) + `sqliteStore.test.ts`, `v3/src/cli/main.ts` +
  `v3/src/cli/dev/main.ts` (wiring), `v3/src/testkit/`
  `scriptedProcessGateRunner.ts`/`.test.ts` (call recording),
  `storeCheckers.ts`/`.test.ts` (the checker), `traceHarness.ts`/
  `.test.ts` (the seams), `index.ts`, the drift files (T4), and the
  type-ripple test files of the REQUIRED dep + instance field (the
  P2b ripple set: kernel/diagEmission, cli/cli + journey, floor ×4,
  diag/sqliteDiagStore, emitLoop, twoWorker, the four trace tests —
  PLUS the two instance-literal fixture files the REQUIRED S1 field
  breaks: kernel/admission.test.ts and kernel/gateProjection.test.ts,
  each building a full `WorkflowInstance` literal).
- Entrypoints: `kernel.handle` (the branch), `kernel.startInstance`
  (the seam), `openStore` (the schema), `createScriptedProcessGateRunner`
  (the extended kit), `runAllCheckers` (the checker seam), the CLI
  mains (the wiring).
- Mutation boundary: the files below; extend-don't-fork. `admit.ts`,
  `gates/registry.ts`, `templateFixture.ts`, and the shipped YAML are
  NOT in the boundary — the P2a admission surface and the P2c
  equality pin stand byte-untouched (Claim 5's machine face).

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/kernel/kernel.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/kernel/processGate.ts",
      "v3/src/kernel/processGate.test.ts",
      "v3/src/kernel/start.ts",
      "v3/src/kernel/start.test.ts",
      "v3/src/kernel/index.ts",
      "v3/src/kernel/diagEmission.test.ts",
      "v3/src/kernel/admission.test.ts",
      "v3/src/kernel/gateProjection.test.ts",
      "v3/src/domain/instance.ts",
      "v3/src/domain/gate.ts",
      "v3/src/domain/index.ts",
      "v3/src/ports/gate.ts",
      "v3/src/ports/index.ts",
      "v3/src/gates/process.ts",
      "v3/src/store/sqliteStore.ts",
      "v3/src/store/sqliteStore.test.ts",
      "v3/src/cli/main.ts",
      "v3/src/cli/dev/main.ts",
      "v3/src/cli/failClosedProcessGateRunner.ts",
      "v3/src/cli/failClosedProcessGateRunner.test.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/src/testkit/scriptedProcessGateRunner.ts",
      "v3/src/testkit/scriptedProcessGateRunner.test.ts",
      "v3/src/testkit/storeCheckers.ts",
      "v3/src/testkit/storeCheckers.test.ts",
      "v3/src/testkit/traceHarness.ts",
      "v3/src/testkit/traceHarness.test.ts",
      "v3/src/testkit/index.ts",
      "v3/src/floor/floor.test.ts",
      "v3/src/floor/tail.test.ts",
      "v3/src/floor/diagTail.test.ts",
      "v3/src/floor/debugBundle.test.ts",
      "v3/src/diag/sqliteDiagStore.test.ts",
      "v3/src/emitLoop.test.ts",
      "v3/src/twoWorker.test.ts",
      "v3/src/l0aTrace.test.ts",
      "v3/src/l0bTrace.test.ts",
      "v3/src/l1Trace.test.ts",
      "v3/src/l2Trace.test.ts",
      "v3/src/l2aTrace.test.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/domainRegistry.ts",
      "docs/v3/implementation/plan.md"
    ]
  }
}
```

(`plan.md` is the R-ALIGNED-UP carrier — the prepared §11.1 item 2
schema-accounting alignment lands in the build commit, so the
boundary lists it; the P3a/P1/ch8-P2 precedent.)

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "S1", "class": "derived", "refs": ["prose:l0e-pseudocode/START", "prose:l0e-pseudocode/RUNTIME_CONTEXT_READY", "contract:ch11-gate-format#C36"] },
      { "id": "S2", "class": "derived", "refs": ["prose:l0e-pseudocode/START", "prose:plan §11.1 item 4", "contract:ch11-gate-format#C18"] },
      { "id": "S3", "class": "new-decision", "refs": [] },
      { "id": "S4", "class": "derived", "refs": ["ADR-003", "prose:plan §11.4 P3b row"] },
      { "id": "S5", "class": "anchored", "refs": ["contract:ch11-gate-format#C36"] },
      { "id": "X1", "class": "anchored", "refs": ["prose:l2a-pseudocode/HANDLE", "contract:ch11-gate-format#C9", "contract:ch11-gate-format#C31"] },
      { "id": "X2", "class": "anchored", "refs": ["prose:l2a-pseudocode/run_process_gate", "contract:ch11-gate-format#C13"] },
      { "id": "X3", "class": "anchored", "refs": ["contract:ch11-gate-format#C23"] },
      { "id": "X4", "class": "anchored", "refs": ["contract:ch11-gate-format#C24"] },
      { "id": "M1", "class": "anchored", "refs": ["prose:l2a-pseudocode/classify_process_result", "contract:ch11-gate-format#C14", "contract:ch11-gate-format#C15", "contract:ch11-gate-format#C17"] },
      { "id": "M2", "class": "anchored", "refs": ["contract:ch11-gate-format#C25"] },
      { "id": "M3", "class": "anchored", "refs": ["prose:l2a-pseudocode/runner_outcome", "contract:ch11-gate-format#C16"] },
      { "id": "M4", "class": "anchored", "refs": ["contract:ch11-gate-format#C31"] },
      { "id": "E1", "class": "anchored", "refs": ["contract:ch11-gate-format#C33", "contract:ch11-gate-format#C27"] },
      { "id": "E2", "class": "anchored", "refs": ["contract:ch11-gate-format#C32"] },
      { "id": "W1", "class": "derived", "refs": ["prose:packet ch11-p2b (the required-dep culture)"] },
      { "id": "W2", "class": "anchored", "refs": ["contract:ch11-gate-format#C26"] },
      { "id": "W3", "class": "derived", "refs": ["prose:template §2 write-time disciplines", "contract:ch11-gate-format#C1", "contract:ch11-gate-format#C18"] },
      { "id": "T1", "class": "derived", "refs": ["prose:packet ch11-p3a row T1", "contract:ch11-gate-format#C23"] },
      { "id": "T2", "class": "anchored", "refs": ["contract:ch11-gate-format#C26"] },
      { "id": "T3", "class": "anchored", "refs": ["prose:model-src/sections/09-l2a.html (the Runtime trace)", "contract:ch11-gate-format#C17"] },
      { "id": "T4", "class": "derived", "refs": ["prose:plan §11.2", "prose:v3/src/drift/unitMap.json"] }
    ]
  }
}
```

## Pre-approval flags

- **F1 — the surplus-ref start lane: context-free template + a
  supplied ready ref THROWS (S3's new-decision).** The model has no
  start seam (provisioning is L0e's, out of Block A), so the seam's
  surplus-input semantics are undecided by any ratified row: both
  conforming end-states — a start-side throw, or silently ignoring
  the ref and storing `null` — keep the persisted state model-conform
  (`ready(∅)` for a context-free run). The choice is therefore this
  packet's own (the genuine-selection class). THROW is selected: a
  ready ref supplied for a context-free workflow is caller confusion
  — a test or future composition believing it staged a workspace
  that nothing will ever read — and silently dropping it hides that
  wiring bug; the fail-closed unconsumed-input culture (C15's
  gateDecisionJson-mode `onExit` admission hardening is the
  config-grain precedent) is applied at the seam grain. The
  `startOverrides` contrast is stated in S2/S3's letter: overrides
  are a role-keyed map whose partial application is the designed
  feature, while a surplus ready ref has zero consuming paths — the
  ignore precedent does not transfer. Tally 14/7/1, below the Case-B
  threshold; no authority/separation/availability-class semantics
  touched. `Route: approve-ratified` — this packet's human approve
  is the ratification act of the throw semantics.

## Acceptance

Test obligations are stated as DISCIPLINE + FAMILY INVENTORY (the
spec-vs-build altitude line, README §5.5): the discipline names the
rule, the inventory declares the membership with its owner;
fixture-level enumeration is BUILD work, verified member-by-member by
the build-close arm gate's mandatory sensitivity pass against the
BUILT test bodies (R-LANE-SENSITIVITY binds twice).

- **Lane coverage:** every declared lane of the S/X/M/E/W/T matrices
  (owners: the rows themselves) is driven by a named test and ABLE TO
  FAIL on its row's meaning.
- **Six-outcome end-to-end:** every member of the six-outcome family
  (owner: packet ch11-p3a row T1's mapping) drives THROUGH
  classification and HANDLE at the kernel grain — verdict, reason,
  evidence refs, and commit/reject each asserted per member (the
  full-decision equality culture, never verdict-only spot checks).
- **Iff symmetry:** every declared presence-iff/conditional driven in
  BOTH directions. Inventory (owners named): S2's lane table
  (dimension 1 — every lane incl. both throw lanes and both silent
  lanes); S5's backstop (dimension 3 — null rejects / ref runs /
  inline-only ignores); E1's append-iff-absent (both the append and
  the dedup directions); M2's keyset (a legal minimal document and a
  legal maximal document admit; each malformed member rejects).
- **The malformed inventory:** every M2 member (owner: M2) driven —
  each yielding `malformed_gate_decision_json` under the authored
  `onRunnerError` disposition, never a business verdict.
- **Combination lanes:** the audited-distinctly members (owner: M4 —
  authored vs `runner_error` vs `timeout` vs `malformed` on
  otherwise-identical fixtures); the ordering members (owner:
  dimension 8 — inline-block-first ⇒ ZERO runner calls and ZERO
  records; process-block-first ⇒ later gates unevaluated); the
  one-snapshot member (the wire projection deep-equals the inline
  evaluator's input in a mixed pipeline).
- **Wire content:** X3/X4 driven by FULL-document equality on the
  recorded stdin (owner: X3 — keyset exactness, config verbatim
  identity, projection field list, `expected_version`); the
  single-call arity member (exactly one `run()` per binding per
  attempt).
- **Numeric ladder:** the bucket boundary (owner: M1/dimension 5) —
  0, a positive, a negative, and `-0` (the ZERO bucket per M1's
  `-0 === 0` rule; the `Object.is`-grade distinction lives in the
  asserts proving which bucket fired, never in the bucket
  comparison); no other new numeric validator exists (timeoutMs
  values are admission-bounded upstream, P3a).
- **Schema:** S4 driven — round-trip identity for BOTH states on
  every instance read surface; the fence lanes at version 4 (v3
  prototype marker wipes, non-prototype refuses, incomplete marker
  refuses — the existing fence tests extended to the new version).
- **Evidence guarantees:** the fail-closed slot's durable-resolve
  member (owner: W2 — resolution across a substrate re-open); the
  slot's persistence-failure member (owner: W2 — a substrate write
  failure yields a THROW, never a returned-but-unresolvable ref;
  able to fail on a runner returning a dead ref); the
  kit's persist-before-return and record-per-run (P3a-driven,
  re-asserted through the trace's records/calls counts); the
  no-run-no-record member (dimension 8's zero-records half).
- **Checker sensitivity:** T2's three lanes (owner: T2) — each red
  case red on its own meaning, the clean case green; the harness
  threads the seam (every pre-l2a trace stays green with no seam).
- **Compile probes:** every type-level foreclosure (owner: dimension
  11 — the disposition singleton, the field's `string \| null`
  domain, the wire types' exact keysets) carries a compile-negative
  probe where type-expressed (the established probe idiom).
- **Behavior-change honesty (SCOPED):** the claimed deltas are
  exactly — the process branch (with the ONE declared golden edit:
  the P2b process-implementation reject lane flips to the run path),
  the instance/store/read-payload additive field, the start-seam
  lanes, the new port/kit/checker/composition surfaces; everything
  else is proven unchanged by the FULL existing suite green with
  zero other golden-expectation edits (the l0a/l0b/l1/l2 trace
  tables byte-identical; `fixtureTemplate()` + the shipped YAML
  untouched — the P2c equality pin).
- Coverage validation green at close: units 25/159 (+4), invariants
  23/116 (+3), traces 5/20 (+1).
- Drift tests green (standing, unconditional — PI-3): the rejection
  registry untouched (54); the T4 flips with witnesses.
- Bridges green at close: `v3:typecheck`, `v3:lint`, `v3:test`,
  `v3:coverage`, `v3:packet-lint` (`--forbid-reopened`: 0 reopened),
  `v3:adr-check` (no new ADR — ADR-003's fence is exercised, not
  amended; ADR-013's scope untouched by W2's `cli/` placement).
- Standing review rules in force: **REV-A1-TXN** (the commit
  boundary byte-untouched); **REV-B-LOCAL-NOT-AUTHORITY** (kit
  calls/records and the fail-closed substrate are never decision
  inputs); **REV-C-PROJECTIONS-READONLY** (the wire projection is
  the same read-only derivation); **REV-E-NO-ADAPTER-BRANCH** (the
  branch discriminates on the contract's own field);
  **REV-DIAG-FAILOPEN** (no new diag emission; the sink stays bare
  at the existing sites).

## Build record

Approved 2026-07-17 at STOP `4:flagged-approve` — the ratifier's act
ratified F1 (the surplus-ref start-lane THROW: the template
declaration stays the single truth source, a dropped ref hides a
wiring bug, the failure lands pre-state and retries clean; the
startOverrides contrast holds — zero consuming paths) and the 66 KB
size advisory accept-with-note. The hash chronicle: R1 FULL bound
`4639e3aa…` (zero content findings; 10 P3 bookkeeping watchpoints
batch-folded) → reconciled `af8b4fea…`, close CLEAN →
fresh-implementer lens (second run of the §7 experiment:
restatement divergence-free, ambiguity list triaged — all
blindness-rule artifacts or declared build freedom; zero folds) →
the APPROVE → the flagged-path agent-invoked arm on the approved
bytes (pin-conform gpt-5.6-sol/high/never, byte guards clean
before+after): REFINE, five findings folded — the two
instance-literal ripple files (admission.test / gateProjection.test
joined the boundary), the S5 side-effect bound narrowed to its
precise mixed-pipeline form, the W2 persistence-failure THROW lane
minted, the W2 provenance narrowed to the C26 anchored core
(placement demoted to realization guidance), the read-surface set
corrected to S4's instance-carrying trio → reconciliation CLEAN,
close CLEAN @ `858c922c…` → arm re-check REFINE (two residual
mirror items: the map row's dimension pointer, the dimension-2
surface name) → folded → reconciliation CLEAN → arm re-check CLEAN
citing `4821271d…` — the build basis. 1 counted panel round of the
8-round watchdog; reconciliations, closes, the comprehension lens,
and the arm passes uncounted; every internal pass Opus-class.

Built the same day (delegated build round, the packet as the
binding contract @ `4821271d…`). **831 → 907 tests** (+76; zero
golden-expectation edits beyond the ONE declared flip — the P2b
process-implementation reject lane to the run path; the l0a/l0b/
l1/l2 trace tables byte-identical; admit.ts / gates/registry.ts /
templateFixture.ts / the shipped YAML byte-untouched). Bridges at
close (orchestrator-rerun, not builder-claimed): `v3:typecheck`
clean · `v3:lint` clean · the v3 suite 907/907 · the root suite
3856/3856 · `v3:coverage` OK (25/159 · 23/116 · 5/20) ·
`v3:packet-lint --forbid-reopened` 0 reopened / 0 errors ·
`v3:adr-check` 14 consistent. Boundary containment
orchestrator-verified: 44 changed files, zero outside the declared
boundary (three declared files needed no edit — permission, not
obligation). Builder-run mutation probes at build: the neutralized
C36 backstop turned three backstop-plane tests red; the forced
unconditional append turned the dedup-direction member red; the
swallowed persistence throw turned the W2 lane red — all restored
green (the write-time sensitivity half; arm gate 2 owns the
built-body pass). In-packet-freedom choices recorded: the
fail-closed runner mints `logRef` via `crypto.randomUUID()`; its
substrate is a `.process-evidence.sqlite` sibling beside the store
DB (the ch7-P4 derivation precedent; the dev in-memory path stays
hermetic); the kernel's exitCode-mode read guards the effective
shape with integrity throws (the cast-forged belt), never a silent
default. One build incident: an early probe-revert via
`git checkout` wiped the uncommitted kernel edits (recovered;
later probes switched to copy-backup reverts) — a candidate
process-log line for the boundary review. No deviations from the
packet.

Arm gate 2 (the build-close implementation review, pin-conform
gpt-5.6-sol/high/never, byte guards clean, index-clean tree): REFINE
citing `f5f7cee1` with EIGHT findings — ALL test-evidence class,
zero product gaps (the mandatory sensitivity pass finding the
green-but-blind classes in the BUILT bodies under correct packet
lane texts, the P3a pattern repeated): the X3/X4 wire evidence made
FULL-document deep-equality over a multi-entry ordered history; the
compile-negative family completed (the REQUIRED `runtimeContext`
field's widening probes + the wire types' exact-keyset probes); S4
full-instance equality on all three reads; the W2 record's
whole-record equality at run AND across the re-open; the M1
bucket × verdict grid's three missing members (zero→warn,
zero→block, nonzero→allow); a REAL prototype-pollution G8 fixture
(the JSON-key `__proto__` form was own-key-blind; the schema helper
exported for direct drive); the T2 checker's violation-content
assert + the every-decision-every-ref multi-fixture; hostile
whitespace/path-like confinement fixtures end-to-end. All eight
folded in one aftermath round: **907 → 917 tests** (+10; two
export-only production touches, each demanded by its finding; the
aftermath commit carries packet + code + tests per the §4
choreography; boundary unchanged — every touched file already
declared). Bridges re-verified green (orchestrator-rerun):
typecheck 0 · lint 0 · the v3 suite 917/917 · packet-lint 0/0.

```json
{
  "packet_metrics": {
    "class": "kernel-semantic",
    "prediction": { "predicted": "projection", "reasoning": "inherited from the P3 row through the ratified findings-round split; the draft (ratified 2026-07-12) decided every open point of the execution contract — the packet projects C9/C13–C17/C23–C27/C31–C33/C36's execution-side shares plus the four activation units", "discovered": "projection" },
    "provenance": { "anchored": 14, "derived": 7, "new_decision": 1 },
    "rounds": { "review": 1, "doc_refinement": 0, "implementation": 2 },
    "stops": [
      { "type": "4:flagged-approve", "what": "one new-decision row rode as flag F1 — S3, the surplus-ref start lane (context-free template + supplied ready ref)", "resolution": "the ratifier approved 2026-07-17: THROW ratified (the declaration is the single truth source; a dropped ref hides a wiring bug; pre-state failure, clean retry; the startOverrides ignore-precedent does not transfer), with the 66 KB size advisory accepted-with-note in the same act" }
    ],
    "detector_misses": [],
    "learned": "second packet under the 2026-07-17 revision: zero internal content findings (yield 0 at R1) while arm gate 1 still folded five on close-clean bytes (the mixed-pipeline S5 bound and the W2 persistence-failure lane both arm catches) — the external decorrelation keeps earning its transitional keep"
  }
}
```
