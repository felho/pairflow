# Task Packet: ch12-p1a — the lifecycle axis (foundation)

Plan step: plan.md §12.4 P1 row's FOUNDATION share under the ch12-P1
in-chapter sizing split (executed at this packet's authoring — sizing,
not scope; parts: P1a/P1b on the row's declared seam, the
`## Sizing/risk` record below). Realizes §12.1 item 1's stored-axis
half: THE chapter schema bump (C11), the l0d domain values, the
admission state-rung re-base, the terminal machinery, and the
`status` named-replacement sweep (C24). Draft anchors (= the
manifest's C-row ref union): `contract:ch12-runtime-core` rows
C10/C11/C12/C14/C15/C18/C21/C23/C24/C25 + ADR-003 (the fenced-wipe
stance — S1's ref). ADR-014 (module home — no new module: the
lifecycle IS the kernel; `accepted` at the draft ratification) is
background authority, deliberately outside the manifest union: no
module moves here.
Plan alignment (R-ALIGNED-UP, propagation-class): the §12.4
Packets-and-flow-mode table's P1 row is REPARTITIONED into the
P1a/P1b rows; the §12.4 process note gains the split-executed record;
the Order line becomes `P0 → P1a → P1b → P2 → P3 → P4`; §12.2's
journey sentence re-anchors to P1b — all marked "aligned at ch12-p1a
pre-approval"; the prepared plan edit lands in the SAME commit as
this packet (the boundary carries `plan.md`).
Autonomy stage: measurement — inherited from the ch12-P1 row through
the split (parts inherit mode, predicted class, watchpoints; fresh
watchdog per part). Not first-of-a-kind: the foundation-half-of-a-split
class has precedent (ch11-P2a), the fenced-schema-bump class has
precedent (ch11-P2b's `gate_decisions` bump, ch11-P3b's column), and
the axis-re-base class is the kernel-alignment family (ch12-P0,
ch11-P2c).
Classification: **projection** — manifest tally: 21 anchored /
9 derived / 0 new-decision (machine-counted from the `packet_rows`
block). Every row anchors to the ratified ch12 draft, the l0d unit
texts, ledger §2/§3/§4 + the 04-l0d section field lists, ADR-003/014,
or ratified plan text, or derives from those with an in-row note.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l0d-pseudocode/admit_loaded", "disposition": "implement" },
      { "id": "l0d-pseudocode/COMPLETE", "disposition": "implement" },
      { "id": "l0d-pseudocode/HANDLE", "disposition": "implement" }
    ],
    "rejections": [],
    "invariants": [
      { "id": "l0d/two-axis-state", "disposition": "type/schema" },
      { "id": "l0d/typed-waiting", "disposition": "type/schema" },
      { "id": "l0d/terminal-is-a-sink", "disposition": "checker" },
      { "id": "l0d/actor-routable-execution", "disposition": "test" }
    ],
    "traces": [],
    "shared_ownership": [
      { "item": "l0d/actor-routable-execution", "co_owner": "ch12-p1b-activation-machinery.md" },
      { "item": "l0d-pseudocode/HANDLE", "co_owner": "ch12-p2-run-profile.md" }
    ]
  }
}
```

The EMPTY rejections axis is a declaration, not an omission:
`not_active` stays ch11-p1-owned (its slice declared it; the name is
behavioral since ch11-P1) — this packet lands its l0d OWNING UNITS
(`admit_loaded`, `HANDLE`) under the unchanged name, per plan §12.2.
`task_required` is P1b's (born with CREATE). The l0d HANDLE unit is
SHARED with ch12-p2: this packet realizes its lifecycle face (the
admission expect, the terminal branch, the axis writes); P2 completes
its `issued_agent_config` recomputation face (C10). The MACHINE
share declarations are SEQUENCED by the coverage tool's two rules —
a co_owner must be an EXISTING packet (so this packet cannot
pre-declare) and every owner declares the share RECIPROCALLY (the
both-ends rule) — therefore ch12-p2's commit BOTH declares
`{l0d-pseudocode/HANDLE, co_owner: ch12-p1a}` in its own slice AND
adds the reciprocal `{l0d-pseudocode/HANDLE, co_owner: ch12-p2}`
entry to THIS packet's slice (a sanctioned sibling-slice edit riding
P2's commit inside P2's boundary; the plan's P2 row carries the
obligation). In every share entry — P1b's and P2's alike — the
`co_owner` VALUE is the packet FILENAME (e.g.
`ch12-p1a-lifecycle-axis.md`, the coverage tool's name key), never
the short packet id this prose abbreviates with.
`l0d/actor-routable-execution` (test) is owned HERE: this packet
realizes and drives the guard's REACHABLE half (the E5 admission
family — ACTIVE admits, TERMINAL rejects `not_active`); P1b's
CREATED/WAITING probes complete the state coverage and ride P1b's
own acceptance, the share landing BOTH-ENDS at P1b's commit (its own
`{l0d/actor-routable-execution, co_owner: ch12-p1a}` entry plus the
reciprocal entry added to THIS slice — the HANDLE pattern; the
plan's P1b row carries the obligation). The remaining l0d
units are P1b's (RECEIVE, CREATE_INSTANCE, START, KICKOFF, CANCEL,
FAIL, activate), P2's (dispatch_intent — the config-projection face),
and P3's (RUNTIME_CONTEXT_READY); the chapter union closes across the
sibling packets (plan §12.2). No chapter golden trace lands here (the
l0d trace is P3's — C25 staging); the acceptance families below are
the proof surface.

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §12.4, recorded at the ch12 ratification for
the parent P1 row, inherited by the split parts): **projection**
(basis: l0d-pseudocode + ledger §2/§3/§4 + the ratified chapter
draft). Discovered at authoring: **projection** — prediction and
discovery agree (zero new-decision rows).

**The parent ch12-P1 assessment (the split's justification).** The
ratified P1 row bundles: THE fenced schema bump + the domain axis
(foundation), the source-routed entry + the operator-intent ingress
family + the lifecycle fact entries (new write surfaces), the
CREATE/START split with the one-shot's retirement + the C25 CLI
bridge (a shipped-entrypoint rewire), the deferred-hold/kickoff/
cancel machinery (new reachable states), and a journey trace.
Six-axis outcome: **authority movement** YES (the lifecycle truth
moves from the ch-4 `status` column to the two-axis
`kernel_status` + `terminal_disposition`; the one-shot start
authority splits into CREATE/START/activate); **surface spread** —
one concept across domain / store schema / kernel / ingress / CLI /
testkit contract / floor; **foundation + activation coupling** YES
(the axis foundation and the entry-family turn-on in one packet);
**acceptance multiplicity** — schema / kernel write path / ingress
validation / journey / checker. HARD STOPS 1, 2, AND 8 TRIP (8: a
persisted authority/schema change + the transcript shared-contract
migration + CLI fallout in one packet), plus the 4+-surfaces ×
3+-success-classes escalation combo. Single-packet closure proof
FAILS: the axis foundation and the entry-family activation are
separately sequenceable buckets with distinct proof surfaces (the
foundation proves as behavior-preserving equivalence over the
existing suite; the activation proves with new lanes and a journey),
and the plan's own row pre-declared exactly this seam. **Split
verdict (autonomous, in-chapter, depth 1, coverage union preserved —
README §5.5):** `foundation → activation`:

- **ch12-P1a (this packet)** — the lifecycle axis: THE schema bump,
  the domain values, the admission basis, the terminal machinery,
  the `status` sweep; zero new reachable states, zero new
  entrypoints, zero committed-row changes.
- **ch12-P1b** — the activation machinery: the source-routed entry,
  the operator-intent family (CREATE/START/KICKOFF/CANCEL — C13),
  the fact entries (C12), activate + the activate_or_hold fork,
  FAIL, `task_required` behavioral, the one-shot's retirement (C24)
  + the C25 in-handler CLI bridge, the context-free deferred-hold
  journey.

Parts inherit mode (measurement), predicted class (projection), and
watchpoints; each part gets a fresh watchdog budget. The plan
repartition edit is prepared (header) and rides this packet's commit.

**This packet's own six axes:**

- **authority movement:** YES — the axis flip happens HERE: the
  `status` column and the `LifecycleStatus` type retire (C24 named
  replacement), `kernel_status` + `terminal_disposition` become the
  stored lifecycle truth. This is the split's deliberate foundation
  half.
- **new runtime behavior turned on:** NO in substance — hard stop 1
  assessed NOT tripped (the ch11-P2a pattern): no new reachable
  state (the E5/E2 confinement: every instance is created ACTIVE and
  ends TERMINAL(done)), no new rejection lane (`not_active` behaves
  exactly as the ch11-P1 `status !== "RUNNING"` rung on the
  reachable states), no new entrypoint, byte-identical committed-row
  sequences (E1). The behavior half of the parent's stop-1 trip is
  exactly what P1b carries.
- **surface spread:** TRIPPED — hard stop 2 by letter. One concept
  (the axis) touches domain, store schema, kernel/admission, the
  floor completion predicate, and the testkit CONTRACT (the
  `traceHarness` finalState shape and the storeCheckers extension —
  kit contract changes that count under the surface rule; the dev
  CLI `replay` fixture-schema validator (`cli/dev/main.ts`) re-bases
  WITH that contract — the one production consumer outside
  kernel/store/floor/domain, the consume-family scan's
  external/integration cell).
- **identity/join fragility:** NO — no cross-seam identity; the
  transcript keeps its one `(instance_id, op_id)` key; no
  correlation surface exists until P3.
- **foundation + activation coupling:** NO — the activation is P1b's
  by the split; nothing turns on here.
- **prerequisite coupling:** NO — P0 built (2026-07-19), the draft
  ratified 2026-07-19 (`d57a437f` block); P1b/P2/P3/P4 depend on
  THIS packet, not the reverse.
- **acceptance multiplicity:** bounded — schema round-trip +
  behavior equivalence + checker sensitivity, all validated by ONE
  proof surface (`pnpm v3:test` + the v3 bridges; full `ci:local`
  at close). No new read-projection or CLI-behavior class (the
  read-doc shape change is the C24 sweep's structural consequence,
  proven by the same suite).

**Hard stops 2, 6, 7, and 8 (letter-tripped, closure-proven;
single-packet allowed: yes).** All four trips share ONE cause — the
axis replacement: the authority move touches 3+ changed consume
families (stop 6: kernel producer, the admission ladder, the store,
the floor predicate, the dev-CLI fixture validator, the testkit
contract), together with the shared contract shapes (stop 7: the
`WorkflowInstance` aggregate + the `CommitTransitionInput` port
field beside the producer and its fallout families) and the
persisted schema change with shared-contract and read-surface
fallout (stop 8: THE bump + the structural passthrough read-doc
change). ONE bounded cutover closes all of it: dropping the
`status` field and the `LifecycleStatus` export makes every TYPED
consumer a compile error in the same commit (the type system proves
THAT leg's completeness — the ch11-P2a brand-cutover precedent; the
two non-type-bound surfaces close via the mixed proof below), and
the behavior-equivalence family (E1: unchanged
committed-row sequences and outcomes across the whole existing
suite) is one proof surface validating domain, store, kernel, floor,
and testkit together. The stop-6/7/8 material adds no separate
closure — the proof is MIXED, matching W1's own two legs: every
TYPED consumer of the cutover is compile-forced into the same
commit, while the two non-type-bound surfaces — the dev-CLI replay
validator's hand-rolled keyset and the zero-projection read
documents — close through the W1 MEASURED sweep plus their explicit
driven lanes (W2's named validator re-base, W3's re-based read
asserts, the E1 equivalence family). No per-family sequencing or
review loop exists either way, and the prescribed producer-first +
consumer-family split shape is VACUOUS for a behavior-preserving
replacement whose consumers cannot lag the producer (the typed ones
by the compiler, the measured two by their same-commit driven
lanes). The S11 transcript
face sits INSIDE the same closure: its columns are ADDITIVE and
write-inert at P1a (`entry_kind` constant `transition`,
`issued_agent_config` NULL, the three class-iff columns non-null on
every written row), NO reader of the new columns exists until
P1b/P2 (the type-staging clauses hold the TS faces), and NO data
migrates under the ADR-003 fenced wipe — "migration" is vacuous by
stance: the bump recreates, never converts. No separate sequencing
exists anywhere (the schema without the type flip would leave two
lifecycle truths — exactly what C24 forbids); the same in-repo
consumers own the fallout. Stops 1, 3, 4, 5, 9, 10, 11: not
tripped — no new runtime behavior turned on (stop 1, argued above),
no unfinished prerequisite, no competing authority path (the single
two-axis truth is the point), no fragile-join cutover (the join is
the compiler), no rollback/lock/ordering semantics change (the
Mutable-flow record), no proof-source move (T-family below: the
transcript + reconstruction stay the canonical proof), no reused
proof contract without parity (the existing suites re-base under the
E1 equivalence discipline, asserted lane-by-lane).

**Consume-family scan** (run because stop 2 tripped; measured from
the tree at authoring — receipts in Embedding gates): producer =
kernel (changed: the axis writes, the terminal branch, the admission
basis); validator/gate = the envelope-admission ladder
(changed: the state rung's basis) and definition admission (absent —
no template or format surface moves at P1a; C25 confines the
format walk to P4); persistence/replay = store (changed: THE bump +
the entry-kind schema face); execution consumer = absent (the runner
is ch 9's); read/presentation = floor (changed: the `tail` completion
predicate re-bases; list/detail surface the axis fields STRUCTURALLY
through the zero-projection passthrough — the dedicated floor
extension lanes stay P4's, C21) and the CLI read documents (present,
changed by passthrough only — no verb, flag, or handler change);
recovery/cleanup = absent; external/integration = present (dispatch
and egress untouched; the OPERATOR CLI code is untouched; the DEV
CLI's `replay` fixture-schema validator changes as a W2
harness-contract consumer — a keyset re-base, no verb/flag/handler
semantics change); testkit = changed (contract: `traceHarness`
finalState + the storeCheckers extension). No `unknown` cells.

**Closure-budget triage** (annex — buckets in scope): THREE buckets
are touched — the persisted authority/schema bucket (THE bump), the
shared-contract bucket (the `WorkflowInstance` shape + the
`CommitTransitionInput` port field), and read/presentation (the
structural passthrough + the tail predicate). The two non-schema
closures are COLLAPSED into the one compile-enforced cutover
deliberately, and the collapse is safe: zero behavior change is the
packet's own claim (the E1 family proves it), no persisted data
migrates (fenced wipe), and every consumer is in-repo — the typed
ones compile-forced, the two non-type-bound surfaces (the dev-CLI
hand-rolled keyset, the zero-projection read documents) closed by
the W1 measured sweep plus their W2/W3/E1 driven lanes. The DEDICATED read-projection closure (compact list
discriminant, wait/runtime-context read docs, the read-doc sweep) is
explicitly deferred to P4 BY the plan's packet cut (C21); the entry
machinery bucket is P1b's by the split.

**Proof-boundary triage** (annex — terminal truth moves surface):
the completion truth's stored form moves from `status = "DONE"` to
`kernel_status = TERMINAL` + `terminal_disposition = "done"`. The
CANONICAL proof source is unchanged: the committed transcript + the
template reconstruction (the storeCheckers walk) decide terminality;
the stored axis remains derived-verifiable against it (T2). Both
write points move in the SAME atomic commit (E3/E4), so no surface
is mixed-truth at any commit boundary; the `tail` completion
predicate re-bases in the same cutover. No reused proof contract
needs parity work — the checker family extends in place.

**Mutable-flow record** (annex — hard-stop-9 material near): N/A —
no coordination primitive enters, no rollback/retry semantics
change, and the precondition ordering is PRESERVED (the admission
rung order — idempotency → state → version-presence → staleness →
role — is byte-order identical; E5). Precondition failure still
produces ZERO side effects (guard rejections precede every write).

## Claim

The instance's macro-lifecycle is a stored TWO-AXIS truth:
`kernel_status` beside the step position, with AT MOST ONE terminal
disposition written exactly once — landed as THE ch12 schema (the
full C11 column set in ONE fenced bump), the l0d domain value
objects, the `kernel_status` admission basis, and the terminal
machinery — while EVERY committed behavior of the shipped surface is
preserved: identical committed-row sequences (E1's scoped reading —
the `[seq, op_id]` rows + payload bytes; the transcript's PHYSICAL
schema changes per S11), identical outcome kinds and rejection
names, identical throw surfaces (the E1 equivalence discipline over
the full existing suite), and NO state
outside ACTIVE / TERMINAL(done) is reachable until P1b lands the
entry machinery (a PARAMETERIZED claim over the write-site inventory
in E2/E4, closed by the W-family measured sweep).

Dimensions (enumerated before test rows — R-DIMENSIONS):

1. **Schema shape** (S family) — columns, types, nullability, token
   domains, the one-bump rule, the transcript entry-kind face.
2. **Axis equivalence** (E1) — the status→axis map; byte-identical
   committed-row sequences; outcome identity.
3. **Write-point discipline** (E2/E3/E4) — which code path writes
   each new column and when; creation defaults; the terminal write.
4. **Admission basis** (E5) — the state rung reads `kernel_status`;
   rung ORDER unchanged; `not_active` behavior identical on every
   reachable state; duplicate-before-state preserved on TERMINAL.
5. **Reachability confinement** (negative) — CREATED / WAITING /
   `cancelled` / `failed` / `requested` have NO write site at P1a
   (measured sweep, re-run at build).
6. **The wait iff** (S5) — `wait` non-null IFF WAITING, vacuously
   driven at P1a (always NULL) + type-level.
7. **Transitional encodings** (X family) — `ready(∅)` /
   `ready(worktree-ref)` stored values; the backstop re-read
   equivalence; the seam pieces' staging disposition.
8. **Consumer closure** (W family) — the compiler-forced sweep;
   measured membership; scoped exclusions for unrelated `status`
   keys.
9. **Checker sensitivity** (T2) — the extended checkers red on
   axis violations (probes derived per family at build,
   R-DERIVED-PROBES).
10. **Drift/coverage surface** (D family) — registry flips, the
    supersession row, unit-map flips; the ledger byte-identical;
    drift lanes green before AND after.

No new validator over a numeric domain enters (round/version
arithmetic untouched) — the R-NUMERIC-LADDER ladder is N/A by
evidence: every new column is TEXT/token or canonical-JSON valued.

## Operative material (full text — projection, not invention)

### `l0d-pseudocode/admit_loaded` (verbatim)

```text
# ─── ADMISSION (P3) — the one ordered guard ladder every entering input climbs; steps are RUNGS ───
# Born at L0d: this is where the entry paths multiply (actor envelope + operator intent + kernel event),
# so the ladder stops being HANDLE-private and becomes the kernel's admission protocol.
# Rung 0 (pre-load, kind-agnostic): basic valid_shape — it stays at the caller, before any store access.
# Canonical rung order after load (load-bearing; later levels ADD rungs at declared positions, never
# reorder): load → idempotency → lifecycle/state → correlation → staleness → authority (rung arrives at
# L1/L3) → payload contract (arrives at L3 / todo Part E2). A duplicate is never reported as stale; a
# state rejection never masks a duplicate (idempotency first after load, todo A1).
# NOT rungs: the template/definition load (callers load it where they always did — no semantic move
# intended in this pass) and the L2 gate pipeline (gates are runtime policy, not admission — rungs are
# not gates, and vice versa).
# expect.* parameterizes the rungs per entry path; an absent expectation skips its rung. A rung's reject
# name rides the expectation (the ladder knows no vocabulary); an expectation without a named reject
# keeps bare-REQUIRE precondition semantics (a guard rejection, not a named reason). The load-first
# companion (admit_input: load → unknown_instance → admit_loaded) arrives with the L3-born operator
# ops — no handler boundary changes in this pass (who receives a loaded instance is unchanged).
admit_loaded(instance, expect, input?) → Accepted | Duplicate | Stale | Rejected
  IF expect.op_id     is present AND instance.transcript.has(expect.op_id)  THEN RETURN Duplicate               # idempotency rung — key scope (instance_id, op_id)
  IF expect.state     is present AND NOT expect.state.holds(instance)       THEN RETURN expect.state.reject     # lifecycle/state rung; an unnamed reject ⇒ bare-REQUIRE semantics
  IF expect.correlate is present AND NOT expect.correlate.holds(instance)   THEN RETURN expect.correlate.reject # correlation rung (request_id here; request_ref / link_id arrive with their errands)
  # version-presence is the staleness rung's ENTRY GUARD (an input carrying no version cannot be judged
  # stale) — it is not a separate rung and not a payload check
  IF expect.version   is expected AND expect.version is missing             THEN RETURN Rejected(missing_version)
  IF expect.version   is expected AND expect.version ≠ instance.version     THEN RETURN Stale(instance.version)
  RETURN Accepted
```

Realization note (intent, not restatement): the built ch11-P1
`admitLoaded` IS this ladder's live form (idempotency digest-aware
per ports/store.ts's IC-A1 precedence; the role rungs are the L1
additions at their declared position). This packet re-bases the
STATE rung's basis onto `kernel_status` (E5) and changes NOTHING
else about the ladder; the correlation rung arrives at P3 with
RUNTIME_CONTEXT_READY.

### `l0d-pseudocode/COMPLETE` (verbatim)

```text
COMPLETE(instance)                                                   # internal helper — done originates only from a terminal step (HANDLE), never routed
  REQUIRE instance.kernel_status = ACTIVE
  instance.kernel_status ← TERMINAL ; instance.terminal_disposition ← done
```

### `l0d-pseudocode/HANDLE` (verbatim)

```text
HANDLE envelope → Outcome
  IF not valid_shape(envelope)            THEN RETURN Rejected(invalid_shape)

  instance ← instanceStore.load(envelope.instance_id)
  IF instance is none                     THEN RETURN Rejected(unknown_instance)
  template ← definitionStore.load(instance.template_ref)   # separate store; pinned immutable version

  # ADMISSION (born at L0d) — the actor-envelope rungs: idempotency → lifecycle/state → staleness
  outcome ← admit_loaded(instance, expect: {
    op_id:   envelope.op_id,                                    # a duplicate is a no-op, no 2nd entry
    state:   kernel_status = ACTIVE → Rejected(not_active),     # L0d lifecycle guard: actor emits only in actor-routable ACTIVE execution
    version: envelope.expected_version },                       # actor-supplied stale-intent — mandatory at L0b
    envelope)
  IF outcome ≠ Accepted THEN RETURN outcome                     # Duplicate | Stale(v) | Rejected(…) pass through unchanged

  step   ← template.step(instance.current_step)

  target ← step.transitions[envelope.type]   # navigation (L0b): does this action exist here?
  IF target is none                       THEN RETURN Rejected(no_transition)

  issued_config ← resolve_agent_config(template, step, instance)   # resolved only now — not for a rejected envelope

  # one atomic commit, CAS on instance.version
  COMMIT atomically at expected_version = instance.version:
    instance.transcript.append(envelope, issued_agent_config: issued_config)   # provenance: issued, not proven runtime
    instance.current_step ← target
    IF target is terminal THEN COMPLETE(instance)                  # kernel-internal completion path → TERMINAL(done)
    instance.version ← instance.version + 1
  # on CAS conflict: restart HANDLE from load —
  #   re-check idempotency and re-resolve the transition;
  #   never re-commit a target computed from stale state

  intent ← (instance.kernel_status = TERMINAL) ? none : dispatch_intent(instance, template, instance.current_step)  # derive after commit
  RETURN Committed(instance.version, intent)
```

SHARED-OWNERSHIP boundary (the slice's co_owner declaration): the
`issued_config ← resolve_agent_config(...)` line and its transcript
provenance are ch12-p2's face (C10 — the cascade does not exist yet;
the built HANDLE keeps its current gate/commit pipeline). THIS packet
realizes: the admission expect (E5), the terminal branch as the
COMPLETE call site (E3/E4), the axis writes in the atomic commit, and
the post-commit intent guard reading `kernel_status = TERMINAL`.

### The domain field lists (ledger §4 l0d + the 04-l0d section, verbatim domains)

- `WorkflowInstance` … + `kernel_status`, `terminal_disposition?`,
  `activation_mode`, `wait?` (when WAITING), `runtime_context`,
  `failure_reason?`; `task` becomes optional (absent until kickoff in
  deferred mode)
- `KernelStatus` (value): `CREATED | ACTIVE | WAITING | TERMINAL`
- `TerminalDisposition` (value): `done | failed | cancelled` —
  written exactly once
- `WaitReason` (value): `{ kind, requested_by, resume_events }`; only
  `kickoff_pending` at L0d
- `RuntimeContext` (value): `none | requested(request_id) |
  ready(runtime_context_ref)`
- `RuntimeContextRef` (value): opaque `{ kind, locator }`;
  provider-defined per kind — v1 `worktree` `{ path, branch, repo }`,
  later `mailbox` / `browser_session`; its actor-facing projection
  into the packet is added at L0e (raw ref stays kernel-side)
- `ActivationMode` (value): `immediate | deferred_kickoff`

### Exact rejection strings (ledger §3 — the slice's surface)

- `not_active` — first appears in `l0d-pseudocode` (ch11-p1-owned;
  the owning units land here, the name and its behavior unchanged)

## Canonical schema matrix (S — C11's P1a realization)

| ID | Rule |
|---|---|
| S1 | `SCHEMA_VERSION` `"4"` → `"5"`, under the ADR-003 fenced wipe (known prototype + different schema version → drop + reinit; no migration path exists by stance). ONE bump for the chapter: every column of the C11 set lands HERE; sibling packets consume columns already present and no ch12 packet issues a second DDL change (anchored: contract:ch12-runtime-core#C11, ADR-003) |
| S2 | `instances` gains `kernel_status` TEXT NOT NULL, token ∈ `CREATED\|ACTIVE\|WAITING\|TERMINAL` — the STORED tokens are the MODEL's, like every stored token in this matrix (anchored: contract:ch12-runtime-core#C11) |
| S3 | `instances` gains `terminal_disposition` TEXT nullable, token ∈ `done\|failed\|cancelled`, written EXACTLY ONCE (the single-write rule; T1/T2 own the discipline and the checker) (anchored: contract:ch12-runtime-core#C11) |
| S4 | `instances` gains `activation_mode` TEXT NOT NULL, token ∈ `immediate\|deferred_kickoff` (anchored: contract:ch12-runtime-core#C11) |
| S5 | `instances` gains `wait` TEXT nullable — canonical JSON `{kind, requested_by, resume_events}`; only `kickoff_pending` exists at ch12. NORMATIVE iff: `wait` is non-null IFF `kernel_status = WAITING`, and every transition leaving WAITING clears it in the SAME atomic move. At P1a NO code path enters WAITING: the column is written NULL at creation and never mutated — the iff holds vacuously and is driven as the always-NULL lane plus the type; behavioral entry is P1b's (anchored: contract:ch12-runtime-core#C11) |
| S6 | `instances` gains `failure_reason` TEXT nullable — written only by FAIL (P1b); at P1a always NULL (anchored: contract:ch12-runtime-core#C11) |
| S7 | `instances.runtime_context` becomes TEXT NOT NULL — canonical JSON of the discriminated state `none \| requested{request_id} \| ready{ref}`; the context-free `ready(∅)` stores `ready` with `ref: null` (the ∅ encoding). The P1a-reachable VALUES are the X rows' (anchored: contract:ch12-runtime-core#C11) |
| S8 | `instances` gains `run_overrides` TEXT NOT NULL — canonical JSON map of step-id → agent-config map; the P1a write is always `{}` (the one-shot has no runOverrides input; the CREATE input surface is P1b's C20 face, the cascade P2's C8/C9) (anchored: contract:ch12-runtime-core#C11; staging: #C25) |
| S9 | `instances.task` becomes NULLABLE and `instances.current_step` becomes NULLABLE (position is meaningless until ACTIVE). At P1a NEITHER is ever written NULL — the one-shot requires the task and activates immediately; the nullable schema is the C11 face of P1b's genesis/deferred shapes, SQLite-column-side at P1a (the TS-type flip and its reader narrowing are staged to P1b — T3's type-staging clause is canonical for the reader set) (anchored: contract:ch12-runtime-core#C11) |
| S10 | The ch-4 `status` column is RETIRED — dropped from the schema; `kernel_status` + `terminal_disposition` are the named replacement (DONE ≡ TERMINAL(done)); the W rows own the consumer sweep (anchored: contract:ch12-runtime-core#C11, #C24) |
| S11 | `transcript` gains the ENTRY-KIND discriminator (C12's schema face): `entry_kind` TEXT NOT NULL, token ∈ `transition \| STARTED \| CANCELLED \| TASK_SUPPLIED` — the three fact tokens are the model's fact-entry names VERBATIM and the fact name IS the discriminator value; `envelope`, `payload_digest`, and `gate_decisions` become NULLABLE with the CLASS iff: a `transition` row carries all three NON-NULL, a fact row carries all three NULL (absent by entry class — C10/C12); the transcript ALSO gains `issued_agent_config` TEXT NULLABLE in the SAME bump — C10's P2-written provenance column, schema-supported HERE so no ch12 packet issues a second DDL change (the S12 staging pattern: at P1a it is NULL on every row — its writer is P2's C10 face — and fact rows keep it NULL by entry class forever); `seq`, `op_id`, `committed_at`, and the `(instance_id, op_id)` uniqueness are SHARED by both classes. At P1a only `transition` rows are ever written (fact writes are P1b's); the class iff is mapper/type-enforced and driven on the transition side. TYPE-STAGING at P1a: the TS `TranscriptEntry` keeps `envelope`/`payloadDigest`/`gateDecisions` NON-NULL and gains NO `issuedAgentConfig` field — the new nullability is SQLite-column-side only; the DISCRIMINATED TS entry variant (the fact-entry object LACKING the transition-only fields — C10's "absent by entry class, not known-empty" realized at the TYPE, never a stored known-empty field on the object) and its production readers (`floor/debugBundle.ts`, `kernel/gateProjection.ts` — both read `entry.envelope` unconditionally today) enter WITH P1b's fact entries, inside P1b's boundary (DERIVATION: C12 names the two classes and the discriminator field; the fact name doubling as the discriminator is the minimal encoding that stores WHICH fact without a second column — the spelling `transition` marks the only other class, its lowercase a stored-value convention beside the model-verbatim uppercase fact names, which carry the model's spelling; every alternative encoding — e.g. a two-token class column plus a fact-name column — carries IDENTICAL semantics, so the pin is representation, never a semantic decision: the D1 grain binds functionality/behavior choices) (derived: contract:ch12-runtime-core#C12, #C10) |
| S12 | The C11 GENESIS initialization (`version: 1`, `round: 0`, `current_step: NULL`, `kernel_status: CREATED`) is SCHEMA-supported at P1a and first WRITTEN at P1b (the CREATE handler); the P1a creation write is the composed post-activation shape (E2). The C11 activation clause (`current_step ← template.start`, `round ← 1`) is realized at P1a INSIDE the one-shot's single write (derived: contract:ch12-runtime-core#C11 + the C25 window staging — the one-shot composes CREATE+START+activate until P1b retires it) |

## Canonical equivalence/mapping matrix (E)

| ID | Rule |
|---|---|
| E1 | Status→axis equivalence: `RUNNING` → `ACTIVE`; `DONE` → `TERMINAL` + `terminal_disposition = "done"`; ch-4 `CREATED` (representable, never committed — the measured ch-4 kernel only ever commits RUNNING/DONE) → the genesis shape, unreachable at P1a. EVERY committed-row sequence (the transcript `[seq, op_id]` rows and their payload bytes) is UNCHANGED by this packet, and every Outcome kind/reason surface is identical — the equivalence family drives this over the FULL existing suite (derived: contract:ch12-runtime-core#C11, #C24 + the measured ch-4 commit behavior — kernel.ts's newStatus derivation; the map is the unique behavior-preserving image) |
| E2 | The one-shot `kernel.startInstance` INTERIM mapping (its RETIREMENT stays P1b's — C24 unbent, the seam named): its single `createInstance` write produces the composed create+activate end state — `kernel_status: ACTIVE`, `current_step: template.start`, `round: 1`, `version: 1`, `activation_mode: "immediate"`, `wait: NULL`, `terminal_disposition: NULL`, `failure_reason: NULL`, `run_overrides: {}`, `task` (required input, unchanged), `runtime_context` per X1. Its `Started` return shape and its throw-based failure surface (template-not-found, binding coverage, the runtime-context lane table) are BYTE-UNCHANGED (derived: contract:ch12-runtime-core#C25 — the window rule: a file-loaded run is context-free-or-unstartable and immediate; #C24 — the named-replacement seam; the mapping is the axis image of the composed ch-4 semantics) |
| E3 | HANDLE's atomic commit re-bases: the commit input's `newStatus: LifecycleStatus` field is REPLACED by the axis fields — `newKernelStatus: KernelStatus` + `newTerminalDisposition: TerminalDisposition \| null` (non-null EXACTLY when the commit enters TERMINAL — the type face of the single-write rule); a terminal arrival writes `TERMINAL` + `"done"` (the COMPLETE branch, E4), a non-terminal commit writes `ACTIVE` + null. The store writes both fields in the SAME transaction it always used (REV-A1-TXN unchanged) (anchored: contract:ch12-runtime-core#C11 + the l0d HANDLE unit's commit block) |
| E4 | COMPLETE realized as the kernel-internal terminal branch (never routed, never exported as a handler): REQUIRE `kernel_status = ACTIVE` (bare-REQUIRE guard semantics — an integrity precondition, not a rejection lane; at P1a the branch is reached only from an admitted ACTIVE commit, so the guard is structurally satisfied and stated as the invariant it protects), then `kernel_status ← TERMINAL`, `terminal_disposition ← "done"` inside the SAME atomic commit (anchored: the l0d COMPLETE unit verbatim) |
| E5 | The admission STATE rung re-bases onto the axis: actor envelopes admit ONLY at `kernel_status = ACTIVE`, rejecting `not_active` otherwise — the l0d unit basis under the ch11-P1-behavioral name. The rung ORDER is preserved byte-for-byte: idempotency (digest-aware, IC-A1 precedence) → state → version-presence → staleness → role rungs; the correlation rung position stays EMPTY until P3. Observable equivalence: at P1a the reachable states are exactly {ACTIVE, TERMINAL(done)}, so the rung's behavior is EXACTLY the ch11 `status !== "RUNNING"` behavior — including Duplicate-before-not_active on a replayed op against a TERMINAL instance (anchored: the l0d admit_loaded + HANDLE units verbatim; contract:ch12-runtime-core#C24) |

## Canonical terminal/invariant matrix (T)

| ID | Rule |
|---|---|
| T1 | Single-write discipline: `terminal_disposition` transitions NULL → token exactly once, in the same atomic move as `kernel_status ← TERMINAL`; NO write path may overwrite a non-null disposition or leave TERMINAL. At P1a the ONLY writer is the terminal-commit branch (E3/E4), and no commit path can reach a TERMINAL instance (the E5 rung rejects fresh ops; a replayed op returns Duplicate without a write) — the discipline is structural AND checker-verified (anchored: contract:ch12-runtime-core#C11; ledger §2 l0d/terminal-is-a-sink) |
| T2 | The `l0d/terminal-is-a-sink` storeChecker lands by RE-BASING AND EXTENDING the existing `checkTerminalSink` (and re-basing `checkEndStateConsistency`) in `storeCheckers.ts` (the ch-5 disposition map's `checker` row), pure over floor reads like every checker: (a) `kernel_status = TERMINAL` ⇔ `terminal_disposition` non-null; (b) the disposition is consistent with the reconstruction — at P1a `done` ⇔ the replayed position is terminal (the `cancelled`/`failed` shapes join WITH their writers at P1b, the family inventory growing then); (c) NO committed transition row follows the terminal arrival (the sink half over the transcript); (d) `wait` is NULL at TERMINAL (S5's iff at the terminal cell). `checkEndStateConsistency` re-bases from `status === "DONE"` to the axis; `runAllCheckers` carries the extension (anchored: ledger §2 l0d/terminal-is-a-sink + the invariant-disposition map; contract:ch12-runtime-core#C11) |
| T3 | The l0d value objects land type/schema-exact (the two-axis-state + typed-waiting dispositions): `KernelStatus`, `TerminalDisposition`, `WaitReason` (`{kind, requested_by, resume_events}` — kind ∈ {`kickoff_pending`} at ch12), `RuntimeContext` (the discriminated state), `RuntimeContextRef` (`{kind, locator}`, opaque), `ActivationMode` — exact unions, `readonly` fields; `WorkflowInstance` gains `kernelStatus`, `terminalDisposition` (nullable), `activationMode`, `wait` (nullable), `runtimeContext` (the state), `failureReason` (nullable); `task` and `currentStep` go NULLABLE at the STORE COLUMNS (S9) while at P1a the TS type keeps `task: string` and `currentStep: StepId` NON-NULL — the S11 type-staging pattern at the instance aggregate: no P1a writer produces NULL (S9), so the non-null type is the faithful image of the P1a inhabitant set, and the TS nullable flip + the narrowing of its measured production readers (`kernel/dispatchIntent.ts`, `kernel/processGate.ts`, `kernel/gateProjection.ts`, plus `kernel/kernel.ts`'s own two HANDLE-body `instance.currentStep` reads — in THIS packet's boundary already, narrowed at P1b with the flip; the untruncated `instance.task`/`instance.currentStep` reader sweep) enter WITH P1b's genesis/deferred shapes, the out-of-boundary three inside P1b's boundary; `status` and the `LifecycleStatus` export are REMOVED (W1/D2). Type probes drive the unions (out-of-union tokens are compile errors); the composite value objects' EXACT TS shapes are T4's (derived: ledger §4 l0d + the 04-l0d field lists; contract:ch12-runtime-core#C11 — the value-object core is anchor-grade, the P1a type-staging step rides the S9 inhabitant argument + the split seam) |
| T4 | The composite value objects' EXACT TS shapes (the type-face pins T3's dispositions need; STORED canonical JSON carries the MODEL's snake keys, TS fields camelCase — the built rowToInstance mapper culture, stated so neither side forks): `RuntimeContext` is a discriminated union on the `state` key — `{state: "none"}` \| `{state: "requested", requestId: string}` \| `{state: "ready", ref: RuntimeContextRef \| null}` (`state` as the discriminator name never collides with the ref's own `kind`; the stored form's key is `request_id`, C11's `requested{request_id}` spelling); `RuntimeContextRef` = `{kind: string, locator: unknown}` — `locator` is OPAQUE and kernel-uninterpreted (C15's canonical-JSON-safe port contract binds providers at P3; at P1a the sole writer is X1's seam mapping, which stores a string), and X2's backstop NARROWS it to `string` at its single read site (a non-string locator reaching the process-gate backstop is a kernel/config integrity throw — structurally unreachable at P1a, the E4 REQUIRE pattern); `WaitReason` = `{kind: "kickoff_pending", requestedBy: string, resumeEvents: readonly string[]}` (the kind union is the ch12 wait-kind set, grown only additively per C23; the model exhibit: `requested_by: "activation"`, `resume_events: [KICKOFF]` — event-name strings); every field `readonly` (derived: contract:ch12-runtime-core#C11, #C15, #C23 + the 04-l0d field lists — the shapes are the minimal faithful TS image of the stored forms; the discriminator/casing spellings are the packet's semantics-free pins) |

## Canonical transitional-encoding matrix (X)

| ID | Rule |
|---|---|
| X1 | The P1a-reachable `runtime_context` VALUES: a context-free start stores `ready` with `ref: null` — `ready(∅)`, the context-free run's trivially-ready state (the one-shot composes CREATE+START, and the none-requirement START leg's post-state is ready(∅) per C18; C14 names it); a ch11-P3b seam start (`runtimeContextRef` supplied against a `required` template) stores `ready` with `ref: {kind: "worktree", locator: <the seam ref>}` — the TRANSITIONAL bridge encoding. `requested` has NO writer until P3. DERIVATION: the seam's ref IS the v1 workspace ref the model's RuntimeContextRef names `worktree` as its v1 kind for; no kernel code reads `.kind` until P3's kind-boundary rung, so the transitional kind is inert data; the alternative (a kindless ref) would violate the C11 ref shape `{kind, locator}` (derived: contract:ch12-runtime-core#C11, #C14, #C18 + the 04-l0d RuntimeContextRef field list; a transitional kind DISTINCT from `worktree` would contradict the model's own naming of the v1 workspace kind — the pin follows the exhibit, not preference) |
| X2 | The C36/C14 backstop re-read: the kernel process-gate backstop reads the REAL field — a process gate reached with `runtime_context = ready(∅)` (ref null) rejects `runtime_context_required_for_process_gate`; `ready(ref)` supplies `workspace = ref.locator` to the runner. Behavior-preserving: today's `null` → reject and `string` → workspace lanes map one-to-one; the l2a golden trace drives the ready(ref) lane unchanged (anchored: contract:ch12-runtime-core#C14; the ch11-C36 backstop rule) |
| X3 | The ch11-P3b seam pieces' STAGING disposition: `StartInstanceInput.runtimeContextRef`, `resolveRuntimeContext`'s lane table, and the CLI `runtimeContext: "required"` unstartable guard all STAY at P1a (the C25 window — their retirement is P3's, C24's inventory; SEAM-grain: the observable pieces — the wire-key input, the CLI guard, the lane BEHAVIOR — retire at P3, while the `start.ts` SYMBOL carriers ride ch12-p1b's W1 with the one-shot's deletion, the lane table re-homed byte-for-byte onto START — aligned at ch12-p1b pre-approval); ONLY the instance-field/store ENCODING flips, at the single write site (`resolveRuntimeContext`'s result maps onto X1 where the instance is constructed). No parallel encoding survives: the string\|null form has zero remaining readers — the COMPILER closes it (the T3 type flip breaks every reader of the old form: the kernel backstop, the store mapper; the W1 compiler leg is the same mechanism) (anchored: contract:ch12-runtime-core#C25, #C24, #C14) |

## Canonical drift/coverage matrix (D)

| ID | Rule |
|---|---|
| D1 | Unit-map flips at build: `l0d-pseudocode/admit_loaded` → `v3/src/kernel/admission.ts#admitLoaded` (implement), `l0d-pseudocode/COMPLETE` → the kernel terminal branch (implement), `l0d-pseudocode/HANDLE` → `v3/src/kernel/kernel.ts#createKernel` (implement) — realized with the SHARED-ownership note carried by the slice (ch12-p2 completes the config face; the ch11 partial-realization precedent: the map binds code, the packets carry the completion claim). The ledger is BYTE-IDENTICAL; the drift lanes are green before AND after — any drift-lane movement is a STOP, never a packet-local fix (anchored: plan §12.2; the unit-map schema as built — drift/unitMap.json) |
| D2 | The `l0a/LifecycleStatus` registry row: the TS type retires (C24), so the manifest row moves from the realized-witness binding (RealizedTypeTable) to a SUPERSEDED classification naming its successors (`l0d/KernelStatus` + `l0d/TerminalDisposition`) — an ADDITIVE manifest-kind extension of the registry's own level-axis semantics; the drift TEST's contract is untouched (it owns the KEY SET, parsed from the byte-identical ledger; the typecheck owns witnesses). PROPORTIONALITY: BOTH alternatives are foreclosed by their own anchors — a dead `LifecycleStatus` type alias kept only as a witness is exactly the surviving parallel path C24 forbids, and reclassifying to the EXISTING `contract-row` kind is foreclosed by that kind's own definition ("§4 prose/contract surfaces that NEVER become a TS type by design" — false for a row realized as a TS type since ch4); the supersession classification is the entailed remainder — its NAME and shape are semantics-free spellings within the packet-owned drift module; only the NEED for a supersession class carries meaning, and that need is entailed above (derived: contract:ch12-runtime-core#C24 + the registry's classification-semantics doc — the manifest tracks the ladder, and its kind definitions bind) |
| D3 | Registry rows flipping `realized` at P1a: `l0d/KernelStatus`, `l0d/TerminalDisposition`, `l0d/WaitReason`, `l0d/ActivationMode`, `l0d/RuntimeContext`, `l0d/RuntimeContextRef`, `l0d/WorkflowInstance` (the axis fields land on the instance aggregate). STAYING pending: `l0d/Template` (the `activation` key — P1b's admission-default face + P4's format face), `l0d/OperatorIntent`, `l0d/KernelEvent`, `l0d/ActorEnvelope` (the entry classes — P1b's) (anchored: ledger §4 l0d + the domainRegistry level-axis semantics) |

## Canonical consumer-sweep matrix (W — C24's `status` replacement)

| ID | Rule |
|---|---|
| W1 | Sweep discipline (R-ABSENCE-CONSUMERS): consumers are enumerated by the RETIRED value's names — `status` (instance-lifecycle positions), `LifecycleStatus`, and the token strings `"RUNNING"`/`"DONE"`/`"CREATED"` in lifecycle positions — never only the new tokens. The closure proof is the COMPILER for every TYPED consumer (dropping the field + the type export makes each a compile error in the same commit) PLUS the measured grep receipts, whose leg OWNS the non-type-bound surfaces — the dev-CLI hand-rolled keyset and the zero-projection read documents, each closed by a driven lane (W2/W3/E1) (authoring receipt in Embedding gates; RE-RUN UNTRUNCATED at build — R-UNTRUNCATED-SWEEP). SCOPED exclusions (named, not swept): the non-instance `status` keys — the egress ack status (`ports/egress.ts`), the debug-bundle section statuses, and diag payload keys — carry DIFFERENT values and are out of this sweep's scope by name (anchored: contract:ch12-runtime-core#C24; R-ABSENCE-CONSUMERS) |
| W2 | The traceHarness CONTRACT re-bases: `TraceFixture.finalState` `{currentStep, round, status, version}` → `{currentStep, round, kernelStatus, terminalDisposition, version}`; every trace fixture re-bases MECHANICALLY under E1's map (RUNNING → ACTIVE + null; DONE → TERMINAL + "done"); the `[seq, op_id]` transcript expectations are BYTE-UNCHANGED (E1 drives through the harness). NAMED contract consumers re-base WITH the shape: the five trace tests, `testkit/traceHarness.test.ts`, and the dev CLI `replay` fixture-schema validator (`cli/dev/main.ts` — the finalState exact-keyset check, a PRODUCTION code change site, in-boundary; its keyset follows the fixture shape, no verb/flag/handler semantics change). This is a testkit CONTRACT change and counts in the sizing scan; the harness's checker leg carries T2's extension (derived: E1 + contract:ch12-runtime-core#C24 — the fixture shape is the harness's mirror of the instance shape) |
| W3 | Read-surface re-base, CONFINED: the shipped `list`/`detail`/`timeline` documents change shape STRUCTURALLY (the floor's zero-projection passthrough surfaces the axis fields and drops `status` with its column — C21's "disappears with its column" sentence realized HERE); the `tail` completion predicate re-bases (`status === "DONE"` → `kernel_status = TERMINAL`); journey/CLI test asserts re-base under E1's map. The DEDICATED floor-extension lanes — the compact list discriminant, the wait/runtime-context read docs, the read-doc sweep — stay P4's (C21); NO CLI verb, flag, or handler changes at P1a (anchored: contract:ch12-runtime-core#C21, #C24; staging: the plan §12.4 P4 row) |

## Site × shape × phase grid

N/A with evidence: this packet declares NO new failure lane over a
phased seam — no async/awaited port joins (the provider seam is
P3's), the store commit keeps its existing phases and lanes
byte-unchanged (E3 moves field names inside the SAME transaction),
and the only new failure surfaces are type-level (compile errors)
and the read-side pure checker (T2). The existing seams' grids are
their owning packets' (ch11-P2b's gate rung, ch7-P2's diag store)
and no cell of theirs moves.

## Mirrored surface map (one canonical statement per rule)

- The axis COLUMN set is canonical in S2–S10; mirrors: T3 (the type
  face), E2 (the creation write), the store mapper doc comment
  (build-time, present-tense). A change to a column row updates all
  three.
- The status→axis MAP is canonical in E1; mirrors: W2 (fixture
  re-base), W3 (read-surface re-base), the plan §12.4 P1a row's
  summary.
- The single-write terminal rule is canonical in T1; mirrors: S3's
  "written EXACTLY ONCE" clause, T2(a)–(c) (the checker lanes), E3's
  "non-null EXACTLY when" type clause.
- The wait iff is canonical in S5; mirrors: T2(d), T3's nullable
  `wait` field.
- The seam-staging disposition is canonical in X3; mirrors: E2's
  "throw surface unchanged" clause, the Pre-approval-flags NONE
  statement.
- The one-bump rule is canonical in S1; mirrors: the plan §12.4 P1a
  row ("the full C11 instances set PLUS the C12/C10 transcript face
  … in ONE bump"), S11's no-second-DDL clause.
- The admission rung ORDER is canonical in E5; mirrors: the
  Mutable-flow record's byte-order-identical clause, the
  admit_loaded realization note.
- The TYPE-STAGING rule (SQLite-nullable at P1a, the discriminated/
  nullable TS face with its readers at P1b) is canonical in S11 for
  the transcript and in T3 for the instance aggregate; mirrors: S9's
  column-side clause, the Acceptance schema family's fact-side and
  nullability language.
- The composite value-object TS shapes are canonical in T4; mirrors:
  S5/S7's stored forms, X1's stored values, X2's locator narrowing,
  T3's pointer.

## In-context notes (the scarce budget)

- The store writes MODEL tokens verbatim (`deferred_kickoff`, the
  fact names); any AUTHORED-CONFIG camelCase mapping is C1/C13
  business and stays OUT of the store layer (P1b/P4) — the internal
  value-object JSON keys (T4's snake forms) are the store mapper's,
  per the rowToInstance culture.
- COMPLETE stays an internal branch of the kernel's commit path —
  never an exported handler, never routed (the model: done originates
  only from a terminal step).
- Extend-don't-fork: NO new production module (ADR-014 — the
  lifecycle handlers ARE the kernel); the checker extension lives in
  the existing `storeCheckers.ts`.
- The canonical-JSON encodings (wait, runtime_context, run_overrides)
  use the emit-lib canonical serialization culture (sorted keys,
  strict) so stored bytes are deterministic and byte-testable.

## Embedding gates (v1-inherited)

- Target files: the mutation boundary below, nothing else.
- Entrypoints: UNCHANGED — no new entrypoint, no verb/flag change;
  `kernel.startInstance`'s signature and the `Ingress.submit` surface
  stay as built (E2/X3).
- Mutation boundary: the production files + the fixture-bearing test
  files + `plan.md` (the repartition edit) + this packet. The two
  drift TEST files are an AFTERMATH-scoped extension (README §4):
  the build-close arm gate's D-family content locks land there,
  riding the aftermath commit.
- Sweep receipts (authoring-time; re-run UNTRUNCATED at build —
  R-UNTRUNCATED-SWEEP): the `status`-consumer inventory (W1) was
  measured from the tree 2026-07-21 — source consumers:
  `kernel/kernel.ts` (newStatus derivation + terminal guard),
  `kernel/admission.ts` (the state rung), `kernel/start.ts` (the
  one-shot create write's `status: "RUNNING"` — E2's re-base site),
  `store/sqliteStore.ts` (schema + mappers + create write),
  `ports/store.ts` (CommitTransitionInput.newStatus), `floor/tail.ts`
  (BOTH completion predicates — `tailLoop` and `diagTailLoop` branch
  on `status === "DONE"`), `testkit/storeCheckers.ts`
  (checkEndStateConsistency + checkTerminalSink),
  `testkit/traceHarness.ts` (finalState + the lift),
  `domain/instance.ts` (the type + field),
  `drift/domainRegistry.ts` (the realized witness); test-side
  consumers: the instance-literal fixture files (the
  `runtimeContext: null` grep set PLUS `kernel/processGate.test.ts`,
  whose base instance const constructs the retired field) + the five
  trace tests + `twoWorker` (asserts `status: "DONE"` via
  toMatchObject) + the TWO
  CLI test files asserting `instance.status` (`cli.test.ts`,
  `journey.test.ts`); `dev.test.ts`'s `status` touches are finalState
  fixtures re-basing under W2 plus a scoped-exclusion
  `rejectedInputs.status` key, and `emitLoop.test.ts` is an E1
  full-suite member with no `status` literal — both stay in the
  boundary. The `LifecycleStatus` import set: 7 files
  (domain/index, domain/instance, drift/domainRegistry, kernel/kernel,
  ports/store, store/sqliteStore, testkit/traceHarness).
- Type-ripple targets (lens-5 sweep class): every `WorkflowInstance`
  literal construction site — the instance-fixture test files named
  in the boundary — breaks structurally on the axis fields and
  re-bases under E1's map.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/domain/instance.ts",
      "v3/src/domain/index.ts",
      "v3/src/kernel/kernel.ts",
      "v3/src/kernel/admission.ts",
      "v3/src/kernel/start.ts",
      "v3/src/ports/store.ts",
      "v3/src/store/sqliteStore.ts",
      "v3/src/floor/tail.ts",
      "v3/src/testkit/storeCheckers.ts",
      "v3/src/testkit/traceHarness.ts",
      "v3/src/testkit/index.ts",
      "v3/src/drift/domainRegistry.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/domainRegistry.test.ts",
      "v3/src/drift/unitMap.test.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/kernel/admission.test.ts",
      "v3/src/kernel/processGate.test.ts",
      "v3/src/kernel/start.test.ts",
      "v3/src/kernel/diagEmission.test.ts",
      "v3/src/kernel/gateProjection.test.ts",
      "v3/src/store/sqliteStore.test.ts",
      "v3/src/floor/floor.test.ts",
      "v3/src/floor/tail.test.ts",
      "v3/src/floor/debugBundle.test.ts",
      "v3/src/floor/diagTail.test.ts",
      "v3/src/testkit/storeCheckers.test.ts",
      "v3/src/testkit/traceHarness.test.ts",
      "v3/src/l0aTrace.test.ts",
      "v3/src/l0bTrace.test.ts",
      "v3/src/l1Trace.test.ts",
      "v3/src/l2Trace.test.ts",
      "v3/src/l2aTrace.test.ts",
      "v3/src/emitLoop.test.ts",
      "v3/src/twoWorker.test.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/src/cli/dev/main.ts",
      "v3/src/cli/dev/dev.test.ts",
      "v3/implementation/plan.md",
      "v3/implementation/packets/ch12-p1a-lifecycle-axis.md"
    ]
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "S1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11", "ADR-003"] },
      { "id": "S2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11"] },
      { "id": "S3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11"] },
      { "id": "S4", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11"] },
      { "id": "S5", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11"] },
      { "id": "S6", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11"] },
      { "id": "S7", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11"] },
      { "id": "S8", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11", "contract:ch12-runtime-core#C25"] },
      { "id": "S9", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11"] },
      { "id": "S10", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11", "contract:ch12-runtime-core#C24"] },
      { "id": "S11", "class": "derived", "refs": ["contract:ch12-runtime-core#C12", "contract:ch12-runtime-core#C10"] },
      { "id": "S12", "class": "derived", "refs": ["contract:ch12-runtime-core#C11", "contract:ch12-runtime-core#C25"] },
      { "id": "E1", "class": "derived", "refs": ["contract:ch12-runtime-core#C11", "contract:ch12-runtime-core#C24", "prose:kernel.ts newStatus derivation (measured)"] },
      { "id": "E2", "class": "derived", "refs": ["contract:ch12-runtime-core#C25", "contract:ch12-runtime-core#C24"] },
      { "id": "E3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11", "prose:l0d-pseudocode/HANDLE"] },
      { "id": "E4", "class": "anchored", "refs": ["prose:l0d-pseudocode/COMPLETE"] },
      { "id": "E5", "class": "anchored", "refs": ["prose:l0d-pseudocode/admit_loaded", "prose:l0d-pseudocode/HANDLE", "contract:ch12-runtime-core#C24"] },
      { "id": "T1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C11", "prose:ledger §2 l0d/terminal-is-a-sink"] },
      { "id": "T2", "class": "anchored", "refs": ["prose:ledger §2 l0d/terminal-is-a-sink", "prose:invariant-disposition-map l0d rows", "contract:ch12-runtime-core#C11"] },
      { "id": "T3", "class": "derived", "refs": ["prose:ledger §4 l0d + 04-l0d field lists", "contract:ch12-runtime-core#C11"] },
      { "id": "T4", "class": "derived", "refs": ["contract:ch12-runtime-core#C11", "contract:ch12-runtime-core#C15", "contract:ch12-runtime-core#C23", "prose:ledger §4 l0d + 04-l0d field lists"] },
      { "id": "X1", "class": "derived", "refs": ["contract:ch12-runtime-core#C11", "contract:ch12-runtime-core#C14", "contract:ch12-runtime-core#C18"] },
      { "id": "X2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C14", "prose:ch11-C36 backstop (measured — kernel.ts)"] },
      { "id": "X3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C25", "contract:ch12-runtime-core#C24", "contract:ch12-runtime-core#C14"] },
      { "id": "D1", "class": "anchored", "refs": ["prose:plan §12.2", "prose:drift/unitMap.json schema as built"] },
      { "id": "D2", "class": "derived", "refs": ["contract:ch12-runtime-core#C24", "prose:domainRegistry classification-semantics doc"] },
      { "id": "D3", "class": "anchored", "refs": ["prose:ledger §4 l0d", "prose:domainRegistry level-axis semantics"] },
      { "id": "W1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C24"] },
      { "id": "W2", "class": "derived", "refs": ["contract:ch12-runtime-core#C24", "prose:testkit/traceHarness.ts finalState shape (measured)"] },
      { "id": "W3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C21", "contract:ch12-runtime-core#C24", "prose:plan §12.4 P4 row"] }
    ]
  }
}
```

## Pre-approval flags

None. Zero new-decision manifest rows (tally: 21 anchored / 9
derived / 0 new-decision); no narrowing, no contract-reality issue
open, no route awaiting an approve-time decision. The transitional
encodings (X1), the registry supersession (D2), and the type-staging
rows (S11/T3) are DERIVED rows whose alternatives are foreclosed by
ratified text and the split seam (C11's ref shape; C24's
no-parallel-path rule; the fact/NULL writers being P1b's) — their
derivation notes are in-row.

## Acceptance

- Contract tests: no new CT-* ids — the packet's proof surface is
  the family set below; the standing CT suites re-base under E1.
- Test disciplines + family inventories (R-ALTITUDE-LINE form):
  - **The equivalence family (E1)** — discipline: every
    pre-existing lane stays green with BYTE-IDENTICAL committed-row
    expectations (`[seq, op_id]` + payload bytes) and identical
    outcome kinds/reasons; fixtures re-base ONLY in axis-named
    fields (finalState, instance literals). Membership: the FULL
    existing suite (owner: the build-time `pnpm v3:test` run — the
    five golden traces, the journey, emitLoop/twoWorker, and every
    unit suite are members by construction).
  - **The schema family (S)** — discipline: every S row driven at
    the store boundary — per-column round-trip, the 4→5 fenced-wipe
    lane, the S11 class iff (transition rows non-null; the fact
    side's writers are P1b's — its P1a drive is the mapper/type
    refusal), token-domain refusal at the mapper. Membership: the S
    rows (owner: this packet; driven in `store/sqliteStore.test.ts`).
  - **The admission family (E5)** — discipline: the state rung's
    axis basis driven ABLE-TO-FAIL: a fresh op against TERMINAL →
    `not_active`; a REPLAYED op against TERMINAL → `duplicate`
    (rung order); ACTIVE admits. Membership: E5 (owner: this
    packet; driven in `kernel/admission.test.ts` +
    `kernel/kernel.test.ts`).
  - **The terminal family (T)** — discipline: T rows driven with
    red-on-break probes derived per family at build
    (R-DERIVED-PROBES): the checker reds on a fabricated
    TERMINAL-without-disposition detail, a post-terminal transition
    row, a non-null wait at TERMINAL, a disposition/reconstruction
    mismatch. Membership: T1–T2 — T3/T4's home is the type family
    (owner: this packet; driven in
    `testkit/storeCheckers.test.ts` + the harness leg).
  - **The axis-write family (E2–E4)** — discipline: each write-point
    row driven ABLE TO FAIL — E2's interim mapping by a
    creation-state equality lane (a wrong column default reds);
    E3's commit-input axis fields by the store/kernel commit lanes
    (a non-terminal commit writing a disposition, or a terminal
    commit omitting one, reds); E4's terminal branch by the
    terminal-family probes (a COMPLETE outside ACTIVE is
    structurally unreachable and stated, its written shape asserted
    exactly). Membership: E2–E4 (owner: this packet; driven in
    `kernel/start.test.ts`, `store/sqliteStore.test.ts`,
    `kernel/kernel.test.ts`).
  - **The drift/registry family (D1–D3)** — discipline: the
    unit-map flips are asserted by the drift unit-map lanes (a
    missing flip reds the build-close owned==realized lock); D2's
    superseded row carries a red-on-break REFERENTIAL-INTEGRITY
    obligation — a registry-side assert that the superseded row's
    named successors EXIST as registry keys (a renamed or vanished
    successor reds), beside the standing ledger key-set drift lane;
    D3's realized flips are witnessed by the typecheck (a missing
    realized witness is a compile error). Membership: D1–D3
    (owner: this packet).
  - **The transitional family (X)** — discipline: the ready(∅)
    backstop-rejection lane and the ready(ref) workspace lane driven
    (the l2a trace is the ready(ref) member); the stored encoding
    round-trips byte-deterministically; X3's no-parallel-encoding
    confinement is COMPILER-driven (the T3 type flip) with the E1
    equivalence family as its behavioral proof. Membership: X1–X3
    (owner: this packet).
  - **The sweep family (W)** — discipline: the untruncated build
    re-run of the W1 greps finds ZERO instance-lifecycle consumers
    of `status`/`LifecycleStatus`/the retired tokens (the scoped
    exclusions named in W1 exempt by name); a type probe proves the
    `LifecycleStatus` import is a compile error. Membership: W1–W3
    (owner: this packet).
  - **The type family (T3/T4)** — discipline: exact-union probes
    (`@ts-expect-error` on out-of-union tokens, readonly probes)
    per value object, plus T4's composite-shape probes (a wrong
    discriminator key, a missing variant field, or a widened
    `locator` reds). Membership: T3's six value objects + T4's
    three composite shapes (owner: this packet).
- Build-close sensitivity (R-DERIVED-PROBES): the probe table
  derives from the families above — ≥1 red-on-break probe per
  family, materialized in the Build record.
- Checks: `pnpm v3:test` + the v3 bridges during build; FULL
  `pnpm ci:local` at build close; `tools/v3-model/check.sh`
  untouched (no model-plane edit rides this packet).
- Drift tests green (standing, unconditional — PI-3): the ledger is
  byte-identical; the unit-map flips (D1) and the registry edits
  (D2/D3) keep every drift lane green before AND after — any
  drift-lane movement is a STOP, never a packet-local fix.
- Standing review rules in force: REV-A1-TXN (the axis fields ride
  the SAME transaction — E3); REV-B-LOCAL-NOT-AUTHORITY (no
  process-local lifecycle cache; the store row is the only truth);
  REV-C-PROJECTIONS-READONLY (the floor stays read-only passthrough);
  REV-E-NO-ADAPTER-BRANCH (no adapter branching enters);
  REV-DIAG-FAILOPEN (the diag surface is untouched — its keysets
  carry no axis field, and no diag change rides this packet).

## Build record

**Rounds.** One production cutover pass (the compile-forced shape: the
domain value objects and the port/store/kernel/floor/testkit/registry
edits landed together, then `tsc` enumerated every consumer), one
test-re-base wave to first-green (the E1 fixture map applied
mechanically; per-family driven lanes added as each family's home file
was touched), then one small fix round (the store mapper's sync-throw
assertion form; the eslint `consistent-type-imports` same-line disable
on the W1 retired-import probe). `rounds.implementation: 2`.

**Test delta.** 46 files / 1016 tests before → 46 files / **1031**
tests after (+15): the S-family lanes in `store/sqliteStore.test.ts`
(instances/transcript metadata incl. the S10 no-`status`-column assert,
the S11 write shape + class-iff refusals, token-domain refusals, the S9
type-staging guard, the E3 axis round-trip, the canonical-bytes lane
with the S5/S6/S8 always-NULL/constant cells, the '4'→'5' fenced-wipe
re-base), the E5 axis lanes in `kernel/admission.test.ts` (CREATED /
WAITING / TERMINAL rungs, rung-order combinations re-based), the T2
extension lanes in `testkit/storeCheckers.test.ts` ((a)/(b)/(d) each
red-proven on a fabricated violation + the aggregator carry), the E2
creation-state EQUALITY lane in `kernel/start.test.ts`, the W2 keyset
refusal lanes in `cli/dev/dev.test.ts` (the retired `status` key and a
missing `terminalDisposition` both usage-2), and the ch12-p1a
compile-probe block in `kernel/processGate.test.ts` (the type family:
exact-union, composite-shape, readonly, locator-opacity, and the W1
retired-`LifecycleStatus`-import probes). Every check green at close:
`pnpm v3:test` 1031/1031, `pnpm v3:typecheck` clean, `pnpm v3:lint`
clean, `pnpm v3:packet-lint` 0 errors, `pnpm v3:coverage` OK
(validation), `python3 tools/v3-plan/check_coverage.py --fold-time` OK,
full `pnpm ci:local` passed.

**Sensitivity probes (R-DERIVED-PROBES) — applied → RED → restored →
GREEN (final: 1031/1031 + clean typecheck/lint; restores byte-verified
against pre-probe copies):**

| Family | Mutation | Expected red | Observed |
|---|---|---|---|
| equivalence (E1) | store commit writes `newRound + 1` | committed-state divergence reds the golden traces | RED — l0aTrace 1/6 failed |
| schema (S) | `SCHEMA_VERSION` reverted `"5"` → `"4"` | the fenced-bump lane ('4' wipes → re-marks '5') reds | RED — sqliteStore.test 1/37 failed |
| admission (E5) | state rung hoisted ABOVE idempotency | Duplicate/collision-before-`not_active` on TERMINAL reds | RED — admission.test 2/18 failed |
| axis-write (E3/E4) | `complete()` returns `ACTIVE` + `"done"` | terminal-commit lanes + checker red | RED — kernel.test 17/78 failed |
| axis-write (E2) | one-shot writes `activation_mode "deferred_kickoff"` | the creation-state equality lane reds | RED — start.test 1/11 failed |
| terminal (T2) | checker lane (a) neutered (`false &&`) | the fabricated TERMINAL-without-disposition probes red | RED — storeCheckers.test 2/27 failed |
| transitional (X2) | backstop drops the `ready(∅)` ref-null rejection | the C36 reject lanes red | RED — kernel.test 3/78 failed |
| drift (D1) | unitMap `COMPLETE` flipped back to `pending` | the owned==realized unit-map lock reds | RED — plain `check_coverage.py` FAILs (note: `--fold-time` DEFERS this lock by design; the plain validation run carries it) |
| registry (D2) | superseded successor renamed to `l0d/TerminalDispositionX` | the referential-integrity compile assert reds | RED — typecheck 1 error (TS2322 on the successors satisfies) |
| sweep (W2) | dev replay finalState keyset reverted to the ch-4 shape | the keyset refusal + green-fixture lanes red | RED — dev.test 5/38 failed |
| type (T3/T4/W1) | `KernelStatus` union widened with `"PAUSED"` | the exact-union probe's `@ts-expect-error` goes unused | RED — typecheck TS2578 |

**Untruncated sweep receipts (R-UNTRUNCATED-SWEEP, re-run at close).**
(1) `LifecycleStatus` over `v3/src/`: 6 hits, ZERO consumers — the D2
superseded registry ROW KEY + its comment (`drift/domainRegistry.ts`,
the ledger key the key-set drift test requires), the retirement doc
comment (`domain/instance.ts`), and the W1 retired-import probe itself
(`kernel/processGate.test.ts`). (2) `"RUNNING"`/`"DONE"` tokens: 3
hits, ZERO consumers — the W2 negative fixture (`cli/dev/dev.test.ts`,
a retired-key fixture that must be REJECTED), the out-of-union
`@ts-expect-error` probe (`processGate.test.ts`), and the E5
realization comment citing the ch11 behavior it preserves
(`kernel/admission.ts`). (3) `.status` reads / `status:` keys: every
hit is a NAMED scoped exclusion — the egress ack status
(`ports/egress.ts`, `testkit/fakeEgress*`), the debug-bundle section
statuses (`floor/debugBundle*`), the diag `rejectedInputs.status` keys
(`cli/cli.test.ts`, `cli/dev/dev.test.ts`, `floor/debugBundle.test.ts`),
the unit-map manifest `status` field (`drift/unitMap.test.ts`), and the
`kernel_status:` row-type field (`store/sqliteStore.ts`). (4)
`"CREATED"`: axis-union positions only. ZERO instance-lifecycle
consumers of the retired value's names remain.

**Surprises.**
- The store mapper's integrity refusals (token-domain, S9 NULL guard)
  surface as SYNCHRONOUS throws from `loadInstance` — the pre-existing
  `rowToInstance` culture (the v4 binding-parse path was identical);
  the refusal lanes assert the sync form.
- `check_coverage.py --fold-time` does NOT carry the owned==realized
  unit-map lock (fold-time defers it by design); the D1 probe reds
  under the plain validation run — recorded in the probe table so the
  lock's proof source is explicit.
- The `debugBundle` instance-keyset matrix test is a real W3 consumer:
  the zero-projection passthrough surfaces ALL the axis fields
  (incl. the P1a-constant `activationMode`/`wait`/`failureReason`), so
  the K-matrix `INSTANCE_KEYS` re-based to the full C11 face — the
  "disappears with its column" sentence observed end-to-end.
- One build-process incident, fully recovered: the first probe's
  restore step briefly used `git checkout` on `store/sqliteStore.ts`,
  which reverted it to the pre-packet v4 file; it was re-written from
  the build's own exact v5 content, re-verified by full typecheck +
  1031-green suite, and all later probes used scratchpad file copies
  (never git). No other file was touched by the incident; final
  restores are byte-verified.
- The W1 retired-import probe needs the inline `import()` type form (a
  top-level import cannot carry a per-name `@ts-expect-error`), which
  trips `@typescript-eslint/consistent-type-imports` — resolved with a
  same-line eslint-disable; the probe stays typecheck-armed (TS2578 on
  revival).

```json
{
  "packet_metrics": {
    "class": "kernel-semantic (schema-bump + axis foundation, split part)",
    "prediction": { "predicted": "projection", "reasoning": "the P1 row's inherited prediction: l0d-pseudocode + ledger + the ratified chapter draft resolve every decision; the split inherits it", "discovered": "projection" },
    "provenance": { "anchored": 21, "derived": 9, "new_decision": 0 },
    "rounds": { "review": 7, "doc_refinement": 0, "implementation": 2 },
    "stops": [ { "type": "3:plateau", "what": "rounds 2+3 each yielded ≤2 accepted content findings with zero blockers — the plateau counter hit 2/2 during authoring", "resolution": "the user resolved 'continue' (2026-07-21); the pending T3/S9 type-staging fold applied, the loop ran to a clean close" } ],
    "detector_misses": [],
    "learned": "the gate-1 arm out-caught a 7-round-clean internal panel on RECORD-level claims (a slice invariant, the type-shape pins, sizing letter-trips, closure-proof universals) — record-precision is an arm-shaped catch class; the first live 3:plateau fired mid-authoring and was resolved continue"
  }
}
```

### Aftermath (build-close arm gate 2, 2026-07-21)

The build-close external review found seven items — six green-but-blind
test gaps, one product fix, one whitespace nit — all folded in one
aftermath pass on the built packet (commit `abaef93c`):

1. **PRODUCT — replay finalState token domains.** The W2 validator
   accepted ANY nonempty string for `kernelStatus`/`terminalDisposition`
   (`PAUSED`/`abandoned` slipped through to the harness as MISMATCH,
   internal 1). Fix: `cli/dev/main.ts` validates against the EXACT l0d
   token sets (arrays typed against the domain unions) as usage 2;
   `dev.test.ts` gains the negative lanes (PAUSED / RUNNING / abandoned
   → `InvalidFixture` usage 2) and the boundary control from the other
   side (every in-union token clears the gate → `TraceMismatchError`
   internal 1).
2. **TEST — atomicity able to fail.** The commit-atomicity lanes never
   forced a fault BETWEEN the instances UPDATE and the transcript
   INSERT. Fold: a persistent SQLite trigger aborts the INSERT mid-
   transaction; the lane asserts BOTH halves rolled back (version/step
   unmoved, zero transcript rows) and that the same handle commits
   cleanly after the fault is dropped (`sqliteStore.test.ts`).
3. **TEST — S9 guard parameterized.** The nullable-load guard was only
   driven with `task = NULL`. Fold: `task` and `current_step` as
   SEPARATE cases, each nulled alone → the loud mapper refusal.
4. **TEST — S11 class-iff per conjunct.** The refusal was driven with
   an all-three-NULL fixture (a single-field check would have stayed
   green). Fold: three probes, each nulling exactly ONE of
   `envelope`/`payload_digest`/`gate_decisions` on a real committed
   transition row → each alone refuses.
5. **TEST — per-field readonly + the S11 type boundary.** The T4
   composite shapes had only a spot-check readonly probe. Fold
   (`processGate.test.ts`): per-field `@ts-expect-error` assignment
   probes over `RuntimeContextRef.kind`/`.locator`, `WaitReason.kind`/
   `.requestedBy`, and the narrowed `RuntimeContext` variants —
   EVERY union arm's own `state` plus its payload field
   (`none.state`; `requested.state`/`requestId`; `ready.state`/
   `ref`) — the arm's re-check caught the two variant-`state`
   probes missing (a per-arm readonly is separately weakenable) —
   plus an excess-property probe proving `TranscriptEntry` does NOT
   accept `issuedAgentConfig` (the S11 type-staging boundary is now
   typecheck-armed, not just documented).
6. **TEST — drift content locks.** The D1/D2 lanes proved key-set +
   resolution, not CONTENT: a wrong-but-resolving codeRef or a
   wrong-but-existing successor stayed green. Fold: `unitMap.test.ts`
   pins the three packet-owned rows verbatim (`admit_loaded` →
   `v3/src/kernel/admission.ts#admitLoaded`, `COMPLETE` →
   `v3/src/kernel/kernel.ts#complete`, `HANDLE` →
   `v3/src/kernel/kernel.ts#createKernel`; implement/realized);
   `domainRegistry.test.ts` pins `l0a/LifecycleStatus` superseded by
   EXACTLY `[l0d/KernelStatus, l0d/TerminalDisposition]` (successor
   rows + typeNames included) and adds a type-equality witness binding
   the successor unions to their exact token sets.
7. **WHITESPACE.** One trailing space (Mirrored surface map, the E1
   mirror bullet); swept — `git diff --check` clean.

**Checks after the fold.** `pnpm v3:test` 46 files / **1041**/1041
(+10 over the close's 1031: dev +2, store +5, drift +3; the type folds
are compile-probes), `pnpm v3:typecheck` clean, `pnpm v3:lint` clean,
`pnpm v3:packet-lint` 0 errors, `git diff --check` clean.

**Aftermath sensitivity probes — applied → RED → restored → GREEN
(restores byte-verified against pre-probe scratchpad copies; final
re-run 1041/1041 + clean typecheck):**

| # | Mutation | Expected red | Observed |
|---|---|---|---|
| 1 | both finalState token checks neutered (`false &&`) | the token-domain usage lane reds | RED — dev.test 1/40 failed |
| 2 | commit split (`COMMIT; BEGIN` between UPDATE and INSERT) | the trigger-fault lane sees the surviving instances half | RED — sqliteStore.test 1/42 failed |
| 3 | S9 guard's `current_step` disjunct dropped | the `current_step`-alone lane reds, `task`-alone stays green | RED — sqliteStore.test 1/42 failed |
| 4 | S11 guard's `gate_decisions` conjunct dropped | exactly its single-conjunct lane reds (the old all-three fixture stays green) | RED — sqliteStore.test 1/42 failed |
| 5 | `readonly` dropped from `RuntimeContextRef.kind` + `WaitReason.requestedBy` | the two per-field probes' suppressions go unused | RED — typecheck 2× TS2578 |
| 6 | `issuedAgentConfig?: string \| null` added to `TranscriptEntry` | the excess-property probe's suppression goes unused | RED — typecheck 1× TS2578 |
| 7 | `COMPLETE` codeRef → `kernel.ts#createKernel` (resolves!) | the verbatim pin reds where the resolution lane stays green | RED — unitMap.test 1/4 failed |
| 8 | successor swapped to `l0d/WaitReason` (exists — compiles) | the content lane reds while typecheck stays CLEAN | RED — domainRegistry.test 1/5 failed; typecheck 0 errors |
