# Task Packet: ch12-p2 — the L0c run profile

Plan step: plan.md §12.4 P2 row. Realizes §12.1 item 2 (the L0c run
profile): `AgentConfig` (the value class), the cascade
`resolve_agent_config`, the packet's `effective_agent_config` computed
at dispatch, the transcript's `issued_agent_config` recomputed-at-commit
provenance, `run_overrides` consumed at resolution, and the l0c golden
trace. Draft anchors (= the manifest's C-row ref union):
`contract:ch12-runtime-core` rows C6/C7/C8/C9/C10/C12/C24/C25 (C11's
instances-table bump and C21's floor read are P1a/P4 surfaces this
packet CONSUMES, not anchors — no `packet_rows` row cites them: the
`issued_agent_config` COLUMN is C10/C12-governed, P1a-schema-staged,
and the floor exposure is inherited passthrough).
The l0c section trace (`model-src/sections/03-l0c.html`,
`code/l0c-template-config.new.txt`), the l0c unit texts, ledger §2 l0c
(3 invariants) and ledger §4 l0c (6 domain entities) are the model
sources. ADR-014 (module home — the config resolver IS the kernel;
`accepted` at the draft ratification) is background authority,
deliberately outside the manifest union: no module moves here.

Plan alignment (R-ALIGNED-UP): NONE. The P2 row already carries the
`l0d-pseudocode/HANDLE` both-ends obligation (pre-declared at
ch12-p1a); this packet discharges it — no ratified plan text is
contradicted, so no aligned-up edit rides this commit. The reciprocal
share entry into ch12-p1a's slice (below) is the P1a-declared
sibling-slice edit, not a plan change.

Autonomy stage: measurement — inherited from the ch12 chapter header
(flag-free panel approves proceed to build autonomously THROUGH the two
transitional external-arm gates; flags/STOPs/first-of-a-kind route to
the human). Not first-of-a-kind: the kernel-semantic projection class
(a pure resolver + a derived packet field + a committed provenance
line) has broad precedent (ch4-P3 HANDLE/ingress, ch11-P2a admission
semantics); the transcript-provenance-column-writer class has precedent
(ch11-P1's authority snapshot, ch12-P1a/P1b's staged-column writers);
the template value-level admission lane class is the ch11-P2a/P3a
admitTemplate culture (the round + runtimeContext value lanes) extended
to `agentConfig`.

Classification: **projection** — manifest tally: 17 anchored /
4 derived / 0 new-decision (machine-counted from the `packet_rows`
block). Every row anchors to the ratified ch12 draft, the l0c unit
texts, ledger §2/§4 l0c, ratified plan text, or the invariant
disposition map, or derives from those with an in-row note. Zero
new-decision rows: the cascade shape, the merge grain, the provenance
recomputation, and the value-level narrowing are all fixed by
C7/C8/C9/C10/C24/C25 verbatim.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l0c-pseudocode/resolve_agent_config", "disposition": "implement" },
      { "id": "l0c-pseudocode/dispatch_intent", "disposition": "alias/inherited" },
      { "id": "l0c-pseudocode/HANDLE", "disposition": "alias/inherited" },
      { "id": "l0c-pseudocode/START_INSTANCE", "disposition": "alias/inherited" },
      { "id": "l0d-pseudocode/dispatch_intent", "disposition": "implement" },
      { "id": "l0d-pseudocode/HANDLE", "disposition": "implement" }
    ],
    "rejections": [],
    "invariants": [
      { "id": "l0c/config-sources-immutable-per-dispatched-step", "disposition": "type/schema" },
      { "id": "l0c/deterministic-provenance", "disposition": "test" },
      { "id": "l0c/issued-proven-runtime", "disposition": "review" }
    ],
    "traces": ["l0c-pseudocode"],
    "shared_ownership": [
      { "item": "l0d-pseudocode/HANDLE", "co_owner": "ch12-p1a-lifecycle-axis.md" }
    ]
  }
}
```

The EMPTY rejections axis is a declaration, not an omission: L0c adds
NO rejection to ledger §3 (the run profile is a pure resolution over
admitted sources — its only fail-closed surface, the `agentConfig`
value-level narrowing, rides ch8-C21's `{path, message}` admission
channel, not a registry-named `Rejected(...)`; C7/C25). The FOUR l0c
units are all P2's per plan §12.2 (the "4 l0c" ownership): only
`resolve_agent_config` is `implement` — the new pure resolver; the
other three l0c units are `alias/inherited`, their live semantics
carried by the l0d version-chain successors (the l0a-HANDLE
fold-culture precedent: an earlier version whose semantics live in a
successor maps `alias/inherited` into the successor's home).
`l0c-pseudocode/dispatch_intent` folds into
`l0d-pseudocode/dispatch_intent` (the live `deriveDispatchIntent`, this
packet's config-projection face — P1b assigned it to P2);
`l0c-pseudocode/HANDLE` into the P1a-realized `l0d-pseudocode/HANDLE`;
`l0c-pseudocode/START_INSTANCE` into the l0d CREATE/START/`activate`
split (retired at P1b under C24). `l0d-pseudocode/dispatch_intent`
(implement) and the co-owned `l0d-pseudocode/HANDLE` (implement, shared
with P1a — below) are the two l0d units in this slice; dispatch_intent
is the eleventh l0d unit realized (`RUNTIME_CONTEXT_READY`, the twelfth,
is P3's). The coverage tool requires a `shared_ownership`
item to appear in the OWNING packet's own `units` axis — hence HANDLE
carries P2's `implement` disposition here beside P1a's (the co-owned
unit's disposition agrees on both ends).

`l0d-pseudocode/HANDLE` is SHARED with ch12-p1a (the OWNER): P1a
realized and drove HANDLE's lifecycle face (the admission expect, the
terminal branch, the axis writes) and declared this
`issued_agent_config` recomputation face as P2's (C10). The MACHINE
share is SEQUENCED by the coverage tool's two rules — a co_owner must
be an EXISTING packet (P1a is committed, so this packet references it)
and every owner declares the share RECIPROCALLY — therefore THIS
packet's commit BOTH declares `{l0d-pseudocode/HANDLE, co_owner:
ch12-p1a-lifecycle-axis.md}` in its own slice AND adds the reciprocal
`{l0d-pseudocode/HANDLE, co_owner: ch12-p2-run-profile.md}` entry to
ch12-p1a's slice (a sanctioned sibling-slice edit riding P2's commit
inside P2's boundary — the P1a-declared obligation, plan §12.4 P2 row;
the `co_owner` VALUE is the packet FILENAME, the coverage tool's name
key, never the short id this prose abbreviates with). The chapter union
closes across the sibling packets (plan §12.2).

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §12.4, recorded at the ch12 ratification for the
P2 row): **projection** (basis: l0c-pseudocode + ledger §2/§4 + the
ratified chapter draft). Discovered at authoring: **projection** —
prediction and discovery agree (zero new-decision rows).

**This packet's own six axes:**

- **authority movement:** WEAK — the packet INTRODUCES a canonical
  pure derivation (the `resolve_agent_config` cascade rule + the
  `issued_agent_config` provenance record), but MOVES no stored source
  of truth: the effective config is NEVER stored as instance state
  (the l0c invariant), and the two `unknown` config slots
  (`Step.agentConfig`, `ContextPacket.agentConfig`) were raw
  pass-through carrying no prior authority. A clarification that adds a
  derivation, not one that relocates truth.
- **new runtime behavior turned on:** YES — the config cascade now
  resolves at dispatch (the packet carries `effective_agent_config`
  where it carried a raw pass-through) and is recomputed and recorded
  at every actor commit (`issued_agent_config` on transition entries,
  previously written NULL). New observable behavior on the live
  HANDLE/dispatch path, plus a new fail-closed admission lane (the C7
  `agentConfig` map narrowing).
- **surface spread:** TRIPPED — one concept (the run profile) touches
  domain (the `AgentConfig` type + the `Role`/`Step`/`ContextPacket`/
  `TranscriptEntry` type flips), kernel (the resolver + the dispatch
  projection + the HANDLE commit recomputation), store (the
  `commitTransition` input + INSERT gains the issued column write; NO
  DDL — the column exists since P1a's fenced bump), admission (the C7
  value-level lanes in `admitTemplate`), and the testkit CONTRACT (the
  l0c golden trace fixture + the templateFixture agent-config shape).
  Five surfaces for one concept.
- **identity/join fragility:** NO — no cross-seam identity matching;
  the resolver is local to a single `(template, step, instance)` triad
  and the provenance rides the existing `(instance_id, op_id)`
  transition key.
- **foundation + activation coupling:** NO — the foundation is BUILT:
  the `run_overrides` column + snapshot (P1a S8 / P1b G2), the
  `issued_agent_config` column (P1a S11), the transcript entry-class
  mapper (P1b F2/F3) all landed before this packet; P2 only turns the
  resolver and its writer on over them.
- **prerequisite coupling:** NO — P1a and P1b are committed and green
  (`39170b88` tip at authoring); P3/P4 depend on THIS packet
  (P3's `RUNTIME_CONTEXT_READY`, P4's format walk), not the reverse.
- **acceptance multiplicity:** resolver purity + dispatch projection +
  commit provenance + the admission narrowing + the golden trace —
  bounded by ONE proof surface (`pnpm v3:test` + the v3 bridges; full
  `ci:local` at close).

**Hard stop 2 (letter-tripped, closure-proven; single-packet allowed:
yes).** One concept across 3+ surfaces. The closure proof: ONE bounded
change closes all five surfaces in one commit. The type tightening —
`AgentConfig = Readonly<Record<string, unknown>>`, the two `unknown`
slots re-typed, the `TransitionEntry` gains `issuedAgentConfig`, the
`ContextPacket` gains `effectiveAgentConfig` — makes every typed
consumer a compile error in the same commit (the P1a/P1b brand-cutover
precedent); the resolver is a single pure function with exactly two
call sites (dispatch and commit), both in the boundary; the admission
lane is one addition to the ONE semantic point (`admitTemplate`) both
channels already traverse; the store write is one column value change
(NULL → canonical JSON) with the column already present; and the l0c
golden trace plus the re-based suites are one proof surface validating
domain, kernel, store, admission, and testkit together. No per-family
sequencing or review loop exists — the same in-repo consumers own the
fallout, typed by the compiler where type-bound, driven by the trace +
admit lanes where not. The escalation combo (4+ surfaces × 3+ success
classes) trips on the same cause and closes with the same proof.

**Stops 1, 3, 4, 5, 6, 7, 8, 9, 10, 11: not tripped.** Stop 1
(authority movement + new behavior): the "authority" is a pure
derivation, not a moved truth (axis above), and no stored authority
relocates. Stop 3: the prerequisite is built. Stop 4: the cascade is
the SINGLE resolution path (three immutable layers, deterministic
merge) — no competing authority. Stop 5: no contract cutover with a
fragile join — the type tightening's join is the compiler. Stop 6: the
consume-family scan below counts THREE changed beside the producer
(fewer than the 3+-families producer-split trigger's spirit; and the
families close under one compile-forced cutover, not a per-family
loop). Stop 7: producer + one shared shape (`TranscriptEntry`), not
"+ any two fallout families" needing separate closure. Stop 8: NO
persisted schema change — the `issued_agent_config` column EXISTS since
P1a's one fenced bump; this packet lands its writer. Stop 9: no
rollback/retry/idempotency/serialization/ordering semantics change —
the resolver is stateless and pure, the commit pipeline (REV-A1-TXN)
is byte-unchanged but for the one added column value, and precondition
failure is unaffected (the resolver runs only on the committing path,
after every guard). Stop 10: the completion/success proof source is
UNCHANGED — terminality is still the committed transcript +
reconstruction (P1a T2); this packet adds a provenance FIELD to
transition entries, not a new completion truth. Stop 11: no proof
contract is reused without parity — the trace harness is EXTENDED
(a new l0c fixture + supplemental asserts), the existing traces
re-base only where the packet field renames (the V9/ContextPacket
sweep), asserted lane-by-lane.

**Consume-family scan** (run because stop 2 tripped; measured from the
tree at authoring — receipts in Embedding gates): producer = kernel
(changed: the new `resolveAgentConfig` + its two call sites in
`dispatchIntent.ts` and `kernel.ts`); validator/gate = admission
(changed: `admitTemplate` gains the C7 `agentConfig`/`defaultAgentConfig`
value-level lanes — the value-level rung, the source-form roles-key
walk staying P4's); persistence/replay = store (changed: the
`commitTransition` input + INSERT write the issued column, the
transcript mapper decodes it on transition rows; NO DDL — P1a's
column); execution consumer = absent (the runner is ch 9's;
`effective_agent_config` is declared run INTENT, not consumed here —
the ActorAdapter/ContextAssembly resolution is later); read/presentation
= floor (present, NO change: `getTimeline`/`getInstanceDetail` return
transcript entries through the existing passthrough, so
`issued_agent_config` surfaces on transition entries with zero verb or
handler change — C21's read face is inherited, not rebuilt);
recovery/cleanup = absent (teardown/retry are named Absents);
external/integration = absent (no CLI/ingress surface changes — the
`runOverrides` ingress input landed at P1b; the `--run-overrides`/
lifecycle verbs are P4's); testkit = changed (CONTRACT: the trace
harness gains the l0c golden fixture, `templateFixture` gains an
agent-config shape). No `unknown` cells. THREE families changed beside
the producer (admission, store, testkit) — all closed under the one
compile-forced type cutover + the trace's driven lanes.

**Closure-budget triage** (annex — buckets in scope): TWO buckets are
touched — the runtime-behavior bucket (the cascade + provenance, this
packet's own substance) and the shared-contract bucket (the
`ContextPacket` field rename `agentConfig` → `effectiveAgentConfig`,
the `TranscriptEntry` `issuedAgentConfig` addition, the
`CommitTransitionInput` field). The shared-contract closure is
COLLAPSED into the compile-enforced cutover deliberately, and the
collapse is safe: the type flips' inhabitants arrive WITH their writers
in the same commit (no window where a type promises what no writer
produces — the resolver is the writer of both new fields), every
consumer is in-repo, and the trace + the existing suites' re-base prove
the actor path's committed behavior unmoved but for the new fields. The
read-projection closure (dedicated floor lanes for the config views)
is NOT needed — the config surfaces through the inherited transcript
passthrough; the provider bucket stays P3's, the format/CLI bucket
stays P4's.

**Proof-boundary triage** (annex — provenance writer joins): the
completion truth's canonical proof source is UNCHANGED (the committed
transcript + template reconstruction; P1a T2). What grows is the
transition entry's FIELD SET (`issuedAgentConfig` joins
`envelope`/`payloadDigest`/`gateDecisions`) and the
`deterministic-provenance` invariant's test face WITH it (the
recomputation matches the dispatch-time value byte-identically). Both
the dispatch projection and the commit record derive from the SAME pure
resolver over the SAME immutable sources, so no surface is mixed-truth:
the packet and the transcript agree by construction. No reused proof
contract needs parity work — the trace harness extends in place.

**Mutable-flow record** (annex — hard-stop-9 material near, though not
tripped): NO coordination primitive enters and no rollback/retry
semantics change. The resolver is pure (no I/O, no clock, no state) and
runs ONLY on the committing path — after every admission guard, inside
the atomic commit's input assembly. A rejected envelope never resolves
config (the l0d HANDLE unit: "resolved only now — not for a rejected
envelope"), so no config work precedes any guard. The CAS conflict path
is the HANDLE culture UNCHANGED: restart from load, re-resolve on fresh
state, never a commit computed from stale state.

## Claim

The kernel resolves and records WHICH agent configuration it issued for
every dispatched step, deterministically and from immutable sources, as
a portable run INTENT that is never stored as instance state. Concretely:
`resolve_agent_config(template, step, instance)` is a PURE, TOTAL
function that cascades three immutable layers left-to-right —
`role.defaultAgentConfig ⊕ step.agentConfig ⊕ instance.runOverrides[step.id]`,
each layer defaulting to the empty map — merging SHALLOW and
right-biased at TOP-LEVEL-KEY grain (for every key present in the
overriding layer its value REPLACES the base value wholesale; scalars
overwrite, arrays and maps replace and never deep-merge, an authored
`null` is a value that overwrites, no deletion semantics exist); a
`runOverrides` key not in `keys(steps)` is inert (contributes the empty
map). The resolved value is an `AgentConfig` — a MAP, raw and
format-OPEN, no field kernel-interpreted. It is computed at dispatch
into the packet's `effective_agent_config` (replacing the L0b raw
pass-through) and RECOMPUTED at commit into the committed actor
transition's `issued_agent_config`, stored canonical JSON — never
persisted as instance state, so the two computations agree
byte-identically by construction (deterministic provenance) rather than
by a stored dispatch record (config sources immutable per dispatched
step). Lifecycle FACT entries carry NO `issued_agent_config` (absent by
entry class). `issued_agent_config` records what the kernel ISSUED, not
that the actor ran exactly so — the latter is a later attestation
concern (issued ≠ proven runtime). At admission the
`steps.<s>.agentConfig` position is NARROWED to the map +
canonical-JSON-safe domain on EVERY channel (file included — a non-map
or non-finite value fails admission LOUD via the ch8-C21
`{path, message}` channel), the `roles.<r>.defaultAgentConfig`
position on the direct-construction channel now (its file source-form
walk is P4's), and the `runOverrides` position's equivalent check
having landed at ingress (P1b); the narrowing breaks no live file (the
migration-reality re-measurement finds zero `agentConfig` authors). The actor path's
committed behavior is otherwise preserved: every existing transition
row's envelope/digest/gate bytes and relative order, every outcome kind
and rejection name, identical over the full existing suite — transitions
gain exactly the `issued_agent_config` field, nothing else.

Dimensions (enumerated before test rows — R-DIMENSIONS):

1. **The cascade** (R family) — the three-layer left-to-right merge,
   each layer defaulting to `{}`; the shallow top-level-key
   right-biased grain; scalar-overwrite vs array/map-replace vs
   authored-`null`-overwrite; the inert out-of-`keys(steps)` override.
2. **Purity + determinism** (R3, C-family recompute) — no I/O / clock /
   state; identical output for identical `(template, step, instance)`;
   the dispatch value and the commit value byte-identical.
3. **The packet projection** (E family) — `effective_agent_config`
   replaces the raw `agentConfig` pass-through, always present (a map,
   possibly `{}`), opaque.
4. **The commit provenance** (C family) — `issued_agent_config`
   RECORDED iff a transition COMMITS (resolved on the optimistic path
   after the synchronous guards; a doomed attempt — a `cas_conflict`
   restart or a commit-time `duplicate_op`/`op_id_collision` — records
   nothing), stored canonical JSON; fact entries carry none (absent by
   class); byte-testable.
5. **The value-level admission narrowing** (A family) — the two
   template `agentConfig` positions map-only + canonical-JSON-safe at
   `admitTemplate` on every channel; the container-precondition
   `{path, message}` finding; the migration-reality re-measurement.
6. **Types** (T family) — `AgentConfig`; the `Role.defaultAgentConfig`,
   `Step.agentConfig`, `ContextPacket.effectiveAgentConfig`,
   `TranscriptEntry.issuedAgentConfig`, `CommitTransitionInput`
   flips; the `unknown`-slot consumer sweep.
7. **The golden trace** (TR family) — the two-role/two-step cascade
   trace: per-dispatch `effective_agent_config` and per-commit
   `issued_agent_config`, matching the l0c section's worked values.
8. **Drift/coverage** (D family) — the unit-map flips (one implement +
   one implement + three alias/inherited), the six l0c
   domain-registry flips, the invariant witnesses, ledger
   byte-identical.

There is NO new numeric-domain validator in this packet (R-NUMERIC-LADDER
does not fire): the only new value check is a MAP + canonical-JSON-safe
shape lane, whose numeric sub-case (non-finite doubles rejected) is
inherited verbatim from the ingress `isCanonicalizable` culture (P1b),
not a new ordered-domain validator.

## Operative material (full text — projection, not invention)

### `l0c-pseudocode/resolve_agent_config` (verbatim)

```text
resolve_agent_config(template, step, instance) → AgentConfig
  base      ← template.role(step.role).default_agent_config            # role default
  with_step ← merge(base, step.agent_config)                           # step override (scalars overwrite; arrays/maps replace)
  override  ← instance.run_overrides.get(step.id, empty_config)         # start/run override (optional per step)
  # portable run intent; not actor-adapted, provisioned, or attested at L0c
  RETURN      merge(with_step, override)
```

### `l0c-pseudocode/dispatch_intent` — config face (verbatim; realized at `l0d-pseudocode/dispatch_intent`)

```text
dispatch_intent(instance, template, step_id) → DispatchIntent
  step  ← template.step(step_id)
  actor ← instance.binding[step.role]                  # guaranteed present by the start invariant
  packet ← ContextPacket {
    instance_id, expected_version: instance.version, task: instance.task,
    instruction:   step.instruction,
    handoff:       payload_of_transition_into(instance, step_id),  # the envelope that brought us here; absent at start
    available_ops: event_types_of(step.transitions),              # PASS / CONVERGED — not on_pass; navigation, not L1
    effective_agent_config: resolve_agent_config(template, step, instance) }  # resolved portable run intent (was raw agent_config at L0b)
  RETURN DispatchIntent { actor, packet }            # a local/manual driver delivers; durable channel is L8
```

Realization note (intent, not restatement): the live
`deriveDispatchIntent` (`kernel/dispatchIntent.ts`) already carries
`instance_id`/`expected_version`/`task`/`role`/`instruction`/`handoff`/
`available_ops` (built through l0b–l0d). THIS packet REPLACES its
conditional raw `agentConfig` spread with an unconditional
`effectiveAgentConfig: resolveAgentConfig(template, step, instance)` —
the L0c "was raw agent_config at L0b" transition (C8).

### `l0c-pseudocode/HANDLE` — config-recompute face (verbatim; realized at `l0d-pseudocode/HANDLE`)

```text
  step   ← template.step(instance.current_step)
  issued_config ← resolve_agent_config(template, step, instance)   # what the kernel issued; deterministic, no stored state
  ...
  COMMIT atomically at expected_version = instance.version:
    instance.transcript.append(envelope, issued_agent_config: issued_config)   # provenance: issued, not proven runtime
```

Realization note: P1a realized HANDLE's lifecycle face (the admission
expect, the axis writes, the terminal branch) and staged
`issued_agent_config` as NULL on every transition row (its writer
declared P2's, C10). THIS packet resolves `issued_config` for the
committing envelope (never a rejected one) BEFORE the atomic commit and
passes it into `commitTransition`, whose INSERT writes the canonical
JSON in place of NULL. The commit pipeline (REV-A1-TXN, CAS on version)
is otherwise byte-unchanged.

### `l0c-pseudocode/START_INSTANCE` — retired (alias/inherited)

The ch-4 one-shot's L0c face carried `run_overrides:
snapshot(run_overrides)` at create — subsumed by the l0d
CREATE/START/`activate` split (retired at P1b under C24; the snapshot
now lands at `lifecycle.ts#createInstance`). This packet consumes the
snapshotted `instance.run_overrides` as the cascade's third layer; it
declares no new create behavior.

### The three l0c invariants (bodies verbatim — `model/records/invariants/l0c.json`; ledger §2 carries their one-line names)

```text
deterministic-provenance: issued config is recomputed at commit from
  the same sources the packet used — not a dispatch-stored value, not
  an actor echo
config-sources-immutable-per-dispatched-step: role defaults, step
  config, and instance run_overrides cannot change for the dispatched
  step — else provenance would need a persisted dispatch record
issued ≠ proven runtime: L0c records what the kernel issued; that the
  actor ran exactly so is later attestation
```

### The l0c golden trace (executable expectation — `code/l0c-template-config.new.txt` + §03-l0c worked values)

Template (direct-constructed, admitted): roles `implementer` (default
`{ mode: builder, model_ref: codex-default-engineer, prompt_profile_refs:
[engineer-defaults] }`) and `reviewer` (default `{ mode: critic }`);
steps `implement` (role implementer, `agent_config: { approach:
systematic }`, `on_pass: review`) and `review` (role reviewer,
`agent_config: { approach: thorough, prompt_concern_refs:
[reviewer-severity-ontology], skill_refs: [test-runner] }`, `on_pass:
implement`, `on_converged: done`).

Committed-row expectation (the sequence the trace must reproduce):

```text
create (immediate, context-free) → start → activation: version 2, current_step = implement
dispatch(implement): packet.effective_agent_config
    = resolve(implement)
    = { mode: builder, model_ref: codex-default-engineer, prompt_profile_refs: [engineer-defaults] }
      ⊕ { approach: systematic }
    = { mode: builder, model_ref: codex-default-engineer, prompt_profile_refs: [engineer-defaults], approach: systematic }
emit PASS at expectedVersion=2 → commit implement→review (version → 3):
    transcript records issued_agent_config = resolve(implement) [byte-identical to the dispatch value]
dispatch(review): packet.effective_agent_config
    = resolve(review)
    = { mode: critic } ⊕ { approach: thorough, prompt_concern_refs: [reviewer-severity-ontology], skill_refs: [test-runner] }
    = { mode: critic, approach: thorough, prompt_concern_refs: [reviewer-severity-ontology], skill_refs: [test-runner] }
emit CONVERGED at expectedVersion=3 → commit review→done (version → 4, terminal):
    transcript records issued_agent_config = resolve(review); terminal — no dispatch
```
(The version numbers are the ch12 CREATE→START lifecycle — genesis v1,
activation → v2 — NOT the retired one-shot's v1 start; the l0c section's
worked config VALUES are unchanged, only the version axis re-bases.)

The trace ALSO drives: a step with NO override (its
`effective_agent_config` = the role default verbatim), and a
`runOverrides` layer supplied at create (the third cascade layer
winning at top-level-key grain over the step override) — the R-family
cascade dimensions exercised end-to-end through the shipped
CREATE→START→emit path.

## Canonical matrices

### R — the cascade resolver (`resolve_agent_config`)

| Id | Rule | Driven by |
|---|---|---|
| R1 | `resolveAgentConfig(template, step, instance)` cascades `role.defaultAgentConfig ⊕ step.agentConfig ⊕ instance.runOverrides[step.id]`, LEFT-to-RIGHT, each layer defaulting to the empty map `{}` (a role with no default, a step with no `agentConfig`, an instance with no override for the step each contribute `{}`) (anchored: contract:ch12-runtime-core#C8 + prose:l0c-pseudocode/resolve_agent_config) |
| R2 | The merge is SHALLOW and RIGHT-BIASED at TOP-LEVEL-KEY grain: for every key present in the overriding layer, the overriding VALUE replaces the base value WHOLESALE — a scalar overwrites, an array or map REPLACES (never deep-merged), an authored `null` is a VALUE that overwrites (no deletion semantics exist); a key present only in the base survives unchanged (anchored: contract:ch12-runtime-core#C8) |
| R3 | The resolver is PURE, TOTAL, and DETERMINISTIC over immutable sources — no I/O, no clock, no stored state, no mutation of its inputs; identical `(template, step, instance)` ⇒ byte-identical `AgentConfig` (the two invariants: config-sources-immutable-per-dispatched-step + deterministic-provenance) (anchored: contract:ch12-runtime-core#C8 + prose:ledger §2 l0c/deterministic-provenance + prose:ledger §2 l0c/config-sources-immutable-per-dispatched-step) |
| R4 | A `runOverrides` key ∉ `keys(steps)` is INERT: `runOverrides.get(step.id, empty_config)` contributes `{}` for a step with no matching override entry; the kernel treats each override entry OPAQUELY (no field interpreted) (anchored: contract:ch12-runtime-core#C9) |

### E — the dispatch projection (`effective_agent_config`)

| Id | Rule | Driven by |
|---|---|---|
| E1 | `deriveDispatchIntent` sets `packet.effectiveAgentConfig = resolveAgentConfig(template, step, instance)` UNCONDITIONALLY (always present — a map, possibly `{}`), REPLACING the L0b conditional raw `agentConfig` pass-through spread (anchored: contract:ch12-runtime-core#C8 + prose:l0c-pseudocode/dispatch_intent) |
| E2 | `effective_agent_config` is an `AgentConfig` — opaque run INTENT; no kernel component reads a field of it (resolution of refs is the ch-9 ActorAdapter / L2b ContextAssembly, later) (anchored: contract:ch12-runtime-core#C7) |

### C — the commit provenance (`issued_agent_config`)

| Id | Rule | Driven by |
|---|---|---|
| C1 | HANDLE resolves `issuedConfig = resolveAgentConfig(template, step, instance)` for the current step on the OPTIMISTIC commit path — downstream of every SYNCHRONOUS admission guard (a synchronously idempotent/`not_active`/stale/`no_transition` envelope returns BEFORE the resolve point and never resolves), just before the atomic commit. `issued_agent_config` is RECORDED IFF `commitTransition` returns `committed` — the RECORDING claim, not a resolver-invocation claim: the resolver runs ONCE per optimistic attempt and a DOOMED attempt records nothing, by TWO distinct kernel paths — a `cas_conflict` (version moved between load and commit) RESTARTS HANDLE from load and re-resolves on a fresh attempt, while a commit-time `duplicate_op` / `op_id_collision` (a concurrent op landed the same key) returns Duplicate / rejected DIRECTLY (kernel.ts's version-independent short-circuit — NO restart, NO re-resolve). The resolver is PURE, so a wasted resolution has NO committed effect; the provenance surface carries a config iff a transition committed (anchored: contract:ch12-runtime-core#C10 + prose:l0d-pseudocode/HANDLE — the resolve point + kernel.ts's commit-result switch (`duplicate_op`/`op_id_collision` direct, `cas_conflict` restart) + REV-A1-TXN: the transcript pre-check is the fast path, the CAS/uniqueness the correctness mechanism) |
| C2 | The committed ACTOR transition entry carries `issued_agent_config = issuedConfig`, stored CANONICAL JSON (sorted keys, strict) via the store's `canonicalJson` serializer — byte-testable provenance; `CommitTransitionInput` gains the field and the store INSERT writes it in place of the P1a-staged NULL. The READ path completes with it: `TranscriptRow` gains the column, the two transcript-read SELECTs project it, and the mapper's `transition` arm decodes `issued_agent_config` → `issuedAgentConfig` (the `issued_agent_config` COLUMN is the transcript field C10/C12 govern — P1a-schema-staged, NOT C11's instances-table bump) (anchored: contract:ch12-runtime-core#C10 + contract:ch12-runtime-core#C12) |
| C3 | LIFECYCLE FACT entries (`STARTED`/`CANCELLED`/`TASK_SUPPLIED`) carry `issued_agent_config` NULL — absent by entry class (C10/C12); the P1a/P1b-staged class iff now DRIVES on the issued column too: a `transition` row's `issued_agent_config` is NON-NULL (a canonical-JSON map, possibly `{}`), a fact row's is NULL (anchored: contract:ch12-runtime-core#C10 + contract:ch12-runtime-core#C12) |
| C4 | The commit-time recomputation equals the dispatch-time `effective_agent_config` BYTE-IDENTICALLY — the same pure resolver over the same sources. PROOF BOUNDARY (a PROJECTION of a ratified premise, not a guarantee this packet enforces): the identity holds GIVEN the RATIFIED template-immutability premise — C8's "immutable sources (pinned template)", ledger §4's "the definition (immutable at runtime)" / "pinned to an immutable definition", l0f's `template-pinned-at-resolution` — under which a pinned `id@version` is content-immutable across the two separate loads (dispatch(N-1) and commit(N)); the create-snapshotted runOverrides are frozen by the store. The resolver does NOT re-verify source immutability, and the production `fileDefinitionStore` does not PHYSICALLY enforce it (it re-reads the file per load — pinned-version immutability is a publish-convention, not content-addressing); this is a STANDING SYSTEM-WIDE premise (every template load since ch4/ch8 rests on it), NOT introduced by L0c, and the model consciously chose it ("else provenance would need a persisted dispatch record"). The residual challenge — physical enforcement of pinned-version immutability — is raised in the `## Pre-approval flags` section (anchored: prose:ledger §2 l0c/deterministic-provenance + prose:ledger §2 l0c/config-sources-immutable-per-dispatched-step + contract:ch12-runtime-core#C8 + contract:ch12-runtime-core#C10) |
| C5 | `issued_agent_config` records what the kernel ISSUED, not proven runtime — the issued ≠ proven-runtime invariant is a REVIEW-disposition truth (no code asserts the actor ran exactly so; attestation is a later executor concern) (anchored: prose:ledger §2 l0c/issued-proven-runtime) |

### A — the value-level admission narrowing (C7 at `admitTemplate`)

| Id | Rule | Driven by |
|---|---|---|
| A1 | `admitTemplate` gains the `steps.<s>.agentConfig` VALUE-LEVEL lane: a PRESENT value that is not a plain map is a container-precondition finding at path `steps.<s>.agentConfig` (ch8-C21's `{path, message}` channel — ONE finding, dependent lanes suppressed); a map whose RESOLVED values are not canonical-JSON-safe (the `isCanonicalizable` predicate — finite numbers, plain maps/lists/scalars; `.nan`/`.inf` doubles rejected) is a finding at the same path. Fires on EVERY admission channel (file included, via the validate stage's admit rung; direct-construction, via the same function) (anchored: contract:ch12-runtime-core#C7 + contract:ch12-runtime-core#C25) |
| A2 | `admitTemplate` gains the `roles.<r>.defaultAgentConfig` VALUE-LEVEL lane (same map + canonical-JSON-safe check, finding at path `roles.<r>.defaultAgentConfig`) — reachable via the DIRECT-construction channel now (the roles-entry SOURCE-FORM walk — the `defaultAgentConfig` keyset + path grammar in `validate.ts` — stays P4's, so a file cannot yet author the key; the ch8 unknown-key rejection stands for it in the window) (anchored: contract:ch12-runtime-core#C7 + contract:ch12-runtime-core#C25) |
| A3 | The NARROWING record: the EXISTING `steps.<s>.agentConfig` any-value domain (realized ch8-C14) is narrowed to map-only here; `validate.ts`'s V9 raw pass-through (materialization) is UNCHANGED — the VALUE-LEVEL check lives at the admit rung, the SOURCE-FORM walk stays `validate.ts`'s (the round + runtimeContext lanes' established split). C25 stages this landing to P2 EXPLICITLY ("C7's map + canonical-JSON-safe lanes … land at P2 on EVERY admission channel (file included) … from P2 on a non-map or non-finite `agentConfig` file fails admission LOUD"), so the P2 admit lane is C25-ratified, NOT a front-run of §12.1 item 5's P4 validator lanes (those are the SOURCE-FORM walk + CLI validate). The migration-reality duty (R-UNTRUNCATED-SWEEP): an UNTRUNCATED tree sweep re-confirms ZERO files author `agentConfig`, so the narrowing breaks no live file. `steps.<s>.agentConfig` is the NARROWED existing position; `roles.<r>.defaultAgentConfig` is the one genuinely NEW template position, born map-only (C7's other new position, `runOverrides`, is a CREATE-INPUT channel, not a template position — its check landed at ingress, P1b) (anchored: contract:ch12-runtime-core#C7 + contract:ch12-runtime-core#C24 + contract:ch12-runtime-core#C25) |

### T — the types

| Id | Rule | Driven by |
|---|---|---|
| T1 | `AgentConfig = Readonly<Record<string, unknown>>` lands in `domain/template.ts` (exported through `domain/index.ts`); the two `unknown` config slots are re-typed: `Step.agentConfig?: AgentConfig` and `ContextPacket` REPLACES `agentConfig?: unknown` with `effectiveAgentConfig: AgentConfig` (non-optional — the resolver always yields a map) (derived: contract:ch12-runtime-core#C7 + prose:l0c-pseudocode/dispatch_intent — DERIVATION: `Record<string,unknown>` is the minimal faithful image of C7's "a MAP, raw and format-OPEN, no field kernel-interpreted"; the D1-grain representation class — every alternative map encoding carries identical semantics) |
| T2 | The `Role` entry type gains `defaultAgentConfig?: AgentConfig` beside `defaultActor?` (anchored: contract:ch12-runtime-core#C6 + contract:ch12-runtime-core#C7) |
| T3 | The `TranscriptEntry` `TransitionEntry` variant gains `issuedAgentConfig: AgentConfig` (the P1a S11 / P1b F3 staged writer lands — non-optional on the transition variant); the `LifecycleFactEntry` variant does NOT gain it (absent by class, C10); `CommitTransitionInput` gains `issuedAgentConfig: AgentConfig` (derived: contract:ch12-runtime-core#C10 + contract:ch12-runtime-core#C12 + prose:ch12-p1b F3/F2 staging — DERIVATION: the field spelling is the established camelCase mapper culture; the transition-only placement is C12's class iff) |
| T4 | The `unknown`-slot consumer sweep: every reader of `ContextPacket.agentConfig` (renamed) and every reader/writer expecting a `TranscriptEntry` without `issuedAgentConfig` re-bases with the compiler; the untruncated `packet.agentConfig` / transcript-entry reader sweep re-runs at build. FULL-EQUALITY `packet: {…}` CONSUMERS re-base their expected literals to carry `effectiveAgentConfig` (a VALUE-ripple the compiler does NOT catch — `toEqual` on a runtime object): the measured set is `cli/cli.test.ts`, `cli/journey.test.ts` (the C25-bridge `activated` docs), `kernel.test.ts`, `processGate.test.ts` (`l1Trace.test.ts` / `traceHarness.test.ts` use `toMatchObject`, additive-safe); every one is in the mutation boundary (derived: prose:R-ABSENCE-CONSUMERS — the rename's consumers are searched by the OLD field name, and the ADDED-field value-ripple is searched by the `packet: {` literal, not only the type) |

### D — drift + coverage

| Id | Rule | Driven by |
|---|---|---|
| D1 | Unit-map flips at build: `l0c-pseudocode/resolve_agent_config` → `v3/src/kernel/agentConfig.ts#resolveAgentConfig` (implement); `l0d-pseudocode/dispatch_intent` → `v3/src/kernel/dispatchIntent.ts#deriveDispatchIntent` (implement); `l0c-pseudocode/dispatch_intent` → `#deriveDispatchIntent`, `l0c-pseudocode/HANDLE` → `v3/src/kernel/kernel.ts#createKernel`, `l0c-pseudocode/START_INSTANCE` → `v3/src/kernel/lifecycle.ts#createInstance` — all three `alias/inherited` into their successor homes (the l0a-HANDLE fold-chain culture: an earlier version whose semantics live in a successor maps alias/inherited; the codeRef symbol carries no semantics on an alias row). The ledger is BYTE-IDENTICAL; drift lanes green before AND after — any drift-lane movement is a STOP (anchored: plan §12.2 + prose:unitMap fold-chain culture (l0a HANDLE alias/inherited)) |
| D2 | domainRegistry `l0c/*` (6) flip pending → realized: `l0c/Role` → `RoleName`, `l0c/Step` → `Step`, `l0c/AgentConfig` → `AgentConfig`, `l0c/WorkflowInstance` → `WorkflowInstance`, `l0c/TranscriptEntry` → `TranscriptEntry`, `l0c/effective_agent_config` → `AgentConfig` (the derived kernel output witnessed by the config value type it carries) — each realized `import type` WITNESS added to the `RealizedTypeTable` region (typecheck owns EXISTENCE), the four name-reuse rows (`Role`/`Step`/`WorkflowInstance`/`TranscriptEntry`) following the `l0d/*`-already-realized precedent (this packet implements the l0c level over them), and the now-stale registry header comment (which still cites `l0c/WorkflowInstance` as `pending`) refreshed in the SAME edit (derived: prose:ledger §4 l0c (6 entities) + contract:ch12-runtime-core#C7 — DERIVATION: the registry witnesses TYPES; `effective_agent_config` is a derived-not-stored entity whose faithful type witness is `AgentConfig`, the value it is; the name-reuse rows follow the established `l0a`/`l0b`/`l0d` witness convention) |
| D3 | Invariant witnesses realized per the ch-5 disposition map: `deterministic-provenance` (test — C4's byte-identical recompute lane), `config-sources-immutable-per-dispatched-step` (type/schema — the pinned template + the `readonly` `runOverrides` snapshot render the sources immutable at the type), `issued-proven-runtime` (review — C5's disposition note; no code asserts proven runtime) (anchored: prose:invariant-disposition-map + prose:ledger §2 l0c) |

## In-context notes (the scarce budget)

- `AgentConfig` is DOMAIN vocabulary, not format grammar: the model's
  field names (`mode`, `approach`, `model_ref`, `prompt_profile_refs`,
  `skill_refs`, `tool_policy_ref`, …) are run-intent hints no kernel
  component reads or type-enforces (C7). Typing a field now would
  enforce grammar nothing consumes — the no-speculative-keys rule.
- `effective_agent_config` is ALWAYS present in the packet (the
  resolver is total — an all-empty cascade yields `{}`), so the field
  is non-optional; this REPLACES the L0b conditional-spread idiom
  where `agentConfig` was present only when the step declared one. The
  D1-grain representation choice (always-present map vs
  optional-present) is fixed by the unit's unconditional
  `effective_agent_config:` — not a decision.
- The resolver lives in its OWN module (`kernel/agentConfig.ts`)
  because BOTH call sites need it (dispatch and commit) — a shared pure
  unit, not a private helper of either. Its codeRef is the unit's home.
- `run_overrides` is consumed here but its INGRESS input surface
  (`invalid_run_overrides`, `parseRunOverridesWire`) and its instance
  SNAPSHOT (`createInstance`, the `run_overrides` column) landed at
  P1b/P1a — this packet adds NO ingress or create behavior; it reads
  the frozen snapshot as the cascade's third layer.
- The shipped `local-pair-v0@1.yaml` gains NO `agentConfig` (its
  behavior IS the defaults': every step resolves to `{}`, so every
  transition records `issued_agent_config: {}`). The ch8-P2 equality
  pin is on the admitted TEMPLATE bytes (the file gains no key, so the
  pin holds); the transition rows' `issued_agent_config` NULL→`{}`
  flip at P2 is a sanctioned provenance re-base on any golden that
  covers transcript rows, not a template-pin violation.
- The admission narrowing serializes through emit-lib
  `isCanonicalizable`; the store writes `issued_agent_config` with its
  OWN `canonicalJson`. They cannot disagree in a way that breaks a
  commit: admission is the STRICTER gate (emit-accepts ⊆
  store-accepts), and the shallow merge SYNTHESIZES no new values —
  every resolved layer value already passed admission (the template
  positions) or ingress (`runOverrides`), so a committed config never
  meets a store serialization it fails. The byte-identity test applies
  ONE serializer to both the dispatch and the commit value.
- The byte-identity pairs the dispatch that ENTERED a step with the
  commit that LEAVES it (both resolve the SAME step); a commit's
  `issued_agent_config` is NOT the following dispatch's
  `effective_agent_config` (a different step, generally unequal) — the
  golden trace pairs them per-step.

## Embedding gates

- **Target files (production):**
  - `v3/src/kernel/agentConfig.ts` — NEW: `resolveAgentConfig` (the
    pure cascade) + the shallow top-level-key merge helper.
  - `v3/src/kernel/dispatchIntent.ts` — `deriveDispatchIntent`
    (`#16-51`): replace the conditional `agentConfig` spread (`#49`)
    with `effectiveAgentConfig: resolveAgentConfig(...)`.
  - `v3/src/kernel/kernel.ts` — `handleOnce`: resolve `issuedConfig`
    for the current step pre-commit, pass into
    `store.commitTransition({...})` (`#337-347`).
  - `v3/src/domain/template.ts` — `AgentConfig` type; `Role` entry
    (`#66`) gains `defaultAgentConfig?`; `Step.agentConfig`
    (`#22-23`) `unknown` → `AgentConfig`.
  - `v3/src/domain/dispatch.ts` — `ContextPacket` (`#7-19`):
    `agentConfig?: unknown` → `effectiveAgentConfig: AgentConfig`.
  - `v3/src/domain/instance.ts` — `TransitionEntry` gains
    `issuedAgentConfig: AgentConfig` (`#138-150` variant region);
    `LifecycleFactEntry` unchanged.
  - `v3/src/domain/index.ts` — export `AgentConfig`.
  - `v3/src/ports/store.ts` — `CommitTransitionInput` (`#24`) gains
    `issuedAgentConfig: AgentConfig`.
  - `v3/src/store/sqliteStore.ts` — `commitTransition` INSERT
    (`#596-606`): write `canonicalJson(input.issuedAgentConfig)` in
    place of the P1a NULL; the READ path completes with it — the
    `TranscriptRow` type (`#325-333`) gains the column, the two
    transcript-read SELECTs (`#722`, `#763`) project
    `issued_agent_config`, and the mapper's `transition` arm
    (`#349-362`, in `toTranscriptEntry` `#344-388`) decodes
    `issued_agent_config` → `issuedAgentConfig` (the fact arm keeps it
    absent by class).
  - `v3/src/definition/admit.ts` — `admitTemplate` (`#94`): the C7
    `agentConfig` (steps) + `defaultAgentConfig` (roles) value-level
    lanes, beside the existing round/runtimeContext value lanes
    (`#243-288`); reuse `isCanonicalizable` (`emit/opId.ts#189`).
  - `v3/src/definition/validate.ts` — the T4 compile-forced ripple (added
    at build): the `Step.agentConfig` flip (`unknown` → `AgentConfig`)
    makes the V9 materialization assignment a type error; the
    materialized raw value casts `as AgentConfig` (the `gates`
    pass-through precedent) — the V9 pass-through BEHAVIOR is unchanged
    (A3), the value-level check stays at the admit rung.
  - `v3/src/drift/unitMap.json` — the D1 flips (`#144-155`, `#209`).
  - `v3/src/drift/domainRegistry.ts` — the D2 l0c flips (`#172-177`),
    the six realized `import type` witnesses in the `RealizedTypeTable`
    region (`#69-111` — typecheck owns EXISTENCE), and the now-stale
    header comment (`#48-52`, still citing `l0c/WorkflowInstance` as
    `pending`) refreshed.
  - `v3/src/kernel/index.ts` — re-export `resolveAgentConfig`
    (and `AgentConfig` if the kernel barrel re-exports domain types).
  - `v3/src/testkit/index.ts`, `v3/src/testkit/storeCheckers.ts` —
    testkit-contract surfaces if the trace/config fixtures or a
    checker touch the renamed packet field / the new transition field.
  - `v3/implementation/packets/ch12-p1a-lifecycle-axis.md` — the
    reciprocal `{l0d-pseudocode/HANDLE, co_owner:
    ch12-p2-run-profile.md}` share entry into P1a's slice (the ONLY
    change to that file; sanctioned sibling-slice edit).
- **Entrypoints:** `deriveDispatchIntent` (dispatch), `handleOnce`
  (commit), `admitTemplate` (admission), `resolveAgentConfig` (the new
  pure unit). No CLI/ingress entrypoint changes.
- **Mutation boundary:** the production files above + the test files
  below. Extend-don't-fork: the resolver is additive; the two type
  renames (`ContextPacket`, transition entry) cut over via the
  compiler.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/kernel/agentConfig.ts",
      "v3/src/kernel/dispatchIntent.ts",
      "v3/src/kernel/kernel.ts",
      "v3/src/kernel/index.ts",
      "v3/src/domain/template.ts",
      "v3/src/domain/dispatch.ts",
      "v3/src/domain/instance.ts",
      "v3/src/domain/index.ts",
      "v3/src/ports/store.ts",
      "v3/src/store/sqliteStore.ts",
      "v3/src/definition/admit.ts",
      "v3/src/definition/validate.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/domainRegistry.ts",
      "v3/src/testkit/templateFixture.ts",
      "v3/src/testkit/traceHarness.ts",
      "v3/src/testkit/storeCheckers.ts",
      "v3/src/testkit/index.ts",
      "v3/src/l0cTrace.test.ts",
      "v3/src/l0aTrace.test.ts",
      "v3/src/l0bTrace.test.ts",
      "v3/src/l1Trace.test.ts",
      "v3/src/l2Trace.test.ts",
      "v3/src/l2aTrace.test.ts",
      "v3/src/l0dJourney.test.ts",
      "v3/src/kernel/agentConfig.test.ts",
      "v3/src/kernel/dispatchIntent.test.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/kernel/admission.test.ts",
      "v3/src/kernel/processGate.test.ts",
      "v3/src/kernel/gateProjection.test.ts",
      "v3/src/kernel/lifecycle.test.ts",
      "v3/src/kernel/diagEmission.test.ts",
      "v3/src/definition/admit.test.ts",
      "v3/src/definition/validate.test.ts",
      "v3/src/definition/load.test.ts",
      "v3/src/store/sqliteStore.test.ts",
      "v3/src/testkit/storeCheckers.test.ts",
      "v3/src/testkit/traceHarness.test.ts",
      "v3/src/floor/debugBundle.test.ts",
      "v3/src/floor/tail.test.ts",
      "v3/src/floor/diagTail.test.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/implementation/packets/ch12-p1a-lifecycle-axis.md",
      "v3/implementation/packets/ch12-p2-run-profile.md",
      "v3/implementation/future-hardening.md"
    ]
  }
}
```
- **Test targets (type-ripple + new):**
  - `v3/src/l0cTrace.test.ts` — NEW golden trace (the `l0bTrace.test.ts`
    pattern: real store + admit + kernel + the supplemental block
    asserting `effectiveAgentConfig` per dispatch and `issuedAgentConfig`
    per commit).
  - `v3/src/kernel/agentConfig.test.ts` — NEW: the R-family cascade
    unit tests (all merge dimensions).
  - `v3/src/kernel/dispatchIntent.test.ts` — the E-family projection.
  - `v3/src/definition/admit.test.ts` — the A-family value-level lanes
    (map/non-map, canonical/non-canonical, path assertions).
  - `v3/src/definition/validate.test.ts` — the V9 raw-pass-through
    tests re-checked (validate-stage materialization unchanged; a
    validate→admit integration fixture with a non-map `agentConfig`
    re-bases if present).
  - `v3/src/testkit/templateFixture.ts` — an agent-config shape for the
    trace + admit fixtures; `v3/src/testkit/traceHarness.ts` — the
    harness carries `effectiveAgentConfig`/`issuedAgentConfig` through
    its config-view asserts if the l0c trace drives them there.
  - `v3/src/store/sqliteStore.test.ts`, `v3/src/kernel/processGate.test.ts`
    (the `@ts-expect-error … no issuedAgentConfig` P1a fence `#452-460`
    re-bases — the writer now exists), and the transcript/floor readers
    exercising transition entries.
  - `v3/src/cli/cli.test.ts`, `v3/src/cli/journey.test.ts` — the
    C25-bridge `activated`-doc `toEqual` asserts whose `intent.packet`
    literal gains `effectiveAgentConfig` (the T4 value-ripple — a
    runtime-object equality the compiler does not catch).

**Substrate probe:** none required — no matrix/lane cell rests on
driver/OS/filesystem behavior. The only substrate-adjacent premise (the
canonical-JSON serialization of the config map) is the emit-lib culture
already proven since ch5-P4 and reused verbatim at P1b's
`invalid_run_overrides`; this packet stands on no NEW substrate claim.

## Acceptance

- Contract tests: the C6/C7/C8/C9/C10/C12/C24/C25 obligations this
  packet realizes, driven by claim-derived negatives (the A-family
  narrowing lanes derive from the map + canonical-JSON-safe CLAIM, never
  from the implemented predicate's shape — R-CLAIM-NEGATIVES).
- Checks: the drift suite (unit-map + domainRegistry locks extend with
  the D1/D2 flips; ledger byte-identical), the coverage validation (the
  slice union closes across the ch12 siblings), `v3:packet-lint`.
- Test disciplines + family inventories (DISCIPLINE + FAMILY INVENTORY,
  R-ALTITUDE-LINE — membership parameterized, fixture-level enumeration
  is build work):
  - **R (cascade):** every merge dimension in the declared set
    {three-layer precedence, each-layer-`{}`-default, scalar-overwrite,
    array-replace, map-replace, authored-`null`-overwrite,
    base-key-survives, inert-out-of-`keys(steps)`-override} driven by a
    test that can FAIL on a reordered/deep-merging/deletion
    implementation (the combination-lane heuristic: precedence proven by
    a lane staging a key present in TWO layers, not isolated layers).
    PLUS the PURITY sub-family {inputs-not-mutated (each source layer —
    role default, step config, the instance run_overrides entry —
    byte-unchanged after the call), no-template/instance-side-effect,
    a-fresh-map-returned} — a driven lane that FAILS a resolver
    returning a correct map while mutating an input or a source
    (R3's purity dimension, undriven by the merge lanes alone).
  - **E (dispatch projection):** the declared set {unconditional
    projection (`effectiveAgentConfig` ALWAYS present), empty-cascade
    projects `{}` at dispatch, opaque map} each driven — the
    empty-cascade lane must FAIL an implementation that keeps the L0b
    conditional spread (present only when the step declares a config),
    a case the golden trace's non-empty configs cannot catch.
  - **C (provenance):** the declared set {recorded-iff-committed (an
    `issued_agent_config` row exists exactly for a `committed`
    transition — NO row on a rejected / `duplicate_op` /
    `op_id_collision` / stale / `cas_conflict`-restart-loser outcome;
    the RECORDING claim, not a resolver-invocation claim),
    transition-non-null, fact-null-by-class, canonical-JSON byte-form,
    both-read-surfaces (`getInstanceDetail` AND `getTimeline` each
    project `issued_agent_config` on transition entries — each
    separately driven, so dropping one SELECT reddens its own lane),
    dispatch==commit byte-identity} each driven; the dispatch==commit
    lane is R-LANE-SENSITIVITY-grade (a projected-field equality that
    would pass full-row divergence is insufficient — assert the whole
    map).
  - **A (narrowing):** the declared set {steps-non-map-rejects,
    steps-non-canonical-rejects, roles-non-map-rejects (direct channel),
    roles-non-canonical-rejects (direct channel — a map role default
    with a non-finite/`Infinity` value fails admission, NOT at
    commit-time serialization), map-admits, path-addressed finding,
    dependent-lane suppression, file-channel parity} each driven; the
    migration-reality
    re-measurement rides its UNTRUNCATED sweep receipt
    (R-UNTRUNCATED-SWEEP / R-INSTRUMENT-PROBE — site list, not a count).
  - **T (types):** the out-of-shape probes (a non-`AgentConfig` slot, a
    fact entry with `issuedAgentConfig`) are compile errors; the
    `@ts-expect-error` fences re-base per variant.
  - **TR (trace):** the l0c golden trace green — the R-DERIVED-PROBES
    build-report table (family → what breaks → expected red → observed)
    carries ≥1 red-proven probe per R/E/C/A family.
- Drift tests green (standing, unconditional — PI-3).
- Standing review rules in force: REV-A1-TXN (the commit adds one
  column value inside the SAME transaction — the transcript/instance
  commit boundary unchanged); REV-C-PROJECTIONS-READONLY (the floor
  surfaces `issued_agent_config` read-only through the inherited
  passthrough — no reader writes it).

## Pre-approval flags

**FLAG-1 — provenance-determinism vs unenforced template immutability
(external arm gate-1, raised P1 twice; `plan_contract_challenge`).**
C4's `issued_agent_config` byte-identity (dispatch(N-1) == commit(N))
rests on the template being content-immutable across two separate
`fileDefinitionStore.load` calls. The store re-reads a MUTABLE file per
load and does not physically enforce pinned-version immutability
(pinned `id@version` is a publish-convention, not content-addressing),
so an in-place edit of `x@1.yaml` between dispatch and commit would
record an `issued_agent_config` that never matched what was dispatched
— falsifying the determinism the invariant asserts.
- **Character:** this is a RATIFIED, SYSTEM-WIDE premise, not a
  P2-introduced defect: C8 ("immutable sources (pinned template)"),
  ledger §4 ("the definition — immutable at runtime"), l0f
  (`template-pinned-at-resolution`), and the `deterministic-provenance`
  invariant's own rationale ("else provenance would need a persisted
  dispatch record" — the model consciously chose reliance on
  immutability over a stored dispatch record). Every template load
  since ch4/ch8 rests on it; ch12-P2 faithfully PROJECTS it.
- **Route (HUMAN-RATIFIED 2026-07-22): `approve-ratified` (accept-now)
  + `later-chapter` (hardening).** The user ratified the flag-bearing
  approve: the ratified C8/ledger-§4/l0f template-immutability premise
  is accepted for ch12-P2 (a pinned version does not change DURING a
  run; a file under authoring changes only BEFORE it is pinned — the
  accepted-low residual is an edit between dispatch and commit of the
  same pinned version), and physical enforcement is DEFERRED, not
  dropped: recorded as `future-hardening.md` FH-1 (fingerprint the
  admitted template bytes at CREATE, verify on re-load, fail-closed on
  drift). ch12-P2 proceeds to build on this ratification; FH-1's
  landing (a later definition-store/runtime chapter) is unratified and
  unscheduled by design.

Two further items a reviewer might probe are pre-answered in the
packet, NOT flags (`considered_not_finding`):

- The `steps.<s>.agentConfig` NARROWING (any-value → map-only) is a
  RATIFIED decision (C7/C24, the ratifier's explicit act) with a
  migration-reality duty (A3, zero live authors) — not a
  packet-minted decision.
- The `defaultAgentConfig` value-level lane reaching only the DIRECT
  channel at P2 (its file source-form walk staged to P4) is C25's
  explicit staging, stated at A2 — a declared boundary, not a gap.

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "R1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C8", "prose:l0c-pseudocode/resolve_agent_config"] },
      { "id": "R2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C8"] },
      { "id": "R3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C8", "prose:ledger §2 l0c/deterministic-provenance", "prose:ledger §2 l0c/config-sources-immutable-per-dispatched-step"] },
      { "id": "R4", "class": "anchored", "refs": ["contract:ch12-runtime-core#C9"] },
      { "id": "E1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C8", "prose:l0c-pseudocode/dispatch_intent"] },
      { "id": "E2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C7"] },
      { "id": "C1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C10", "prose:l0d-pseudocode/HANDLE"] },
      { "id": "C2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C10", "contract:ch12-runtime-core#C12"] },
      { "id": "C3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C10", "contract:ch12-runtime-core#C12"] },
      { "id": "C4", "class": "anchored", "refs": ["prose:ledger §2 l0c/deterministic-provenance", "prose:ledger §2 l0c/config-sources-immutable-per-dispatched-step", "contract:ch12-runtime-core#C8", "contract:ch12-runtime-core#C10"] },
      { "id": "C5", "class": "anchored", "refs": ["prose:ledger §2 l0c/issued-proven-runtime"] },
      { "id": "A1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C7", "contract:ch12-runtime-core#C25"] },
      { "id": "A2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C7", "contract:ch12-runtime-core#C25"] },
      { "id": "A3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C7", "contract:ch12-runtime-core#C24", "contract:ch12-runtime-core#C25"] },
      { "id": "T1", "class": "derived", "refs": ["contract:ch12-runtime-core#C7", "prose:l0c-pseudocode/dispatch_intent"] },
      { "id": "T2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C6", "contract:ch12-runtime-core#C7"] },
      { "id": "T3", "class": "derived", "refs": ["contract:ch12-runtime-core#C10", "contract:ch12-runtime-core#C12", "prose:ch12-p1b F3 staging"] },
      { "id": "T4", "class": "derived", "refs": ["prose:R-ABSENCE-CONSUMERS"] },
      { "id": "D1", "class": "anchored", "refs": ["prose:plan §12.2", "prose:unitMap fold-chain culture (l0a HANDLE alias/inherited)"] },
      { "id": "D2", "class": "derived", "refs": ["prose:ledger §4 l0c", "contract:ch12-runtime-core#C7"] },
      { "id": "D3", "class": "anchored", "refs": ["prose:invariant-disposition-map", "prose:ledger §2 l0c"] }
    ]
  }
}
```

## Build record

Built TDD as a compile-forced type cutover. The pure resolver
(`kernel/agentConfig.ts#resolveAgentConfig`) landed first with its
R-family unit tests, then the two call sites (dispatch projection
`effectiveAgentConfig`, commit provenance `issuedAgentConfig`), the
`CommitTransitionInput`/store write + read path (canonical JSON in place
of the P1a NULL, `TranscriptRow`/SELECT/mapper class-iff both ways), the
C7 `admitTemplate` value-level lanes (a `isPlainMap` container lane +
`isCanonicalizable` value lane, dependent-lane suppression), and the
drift flips (unitMap 5, domainRegistry l0c ×6 + witnesses + stale-header
refresh). The `AgentConfig` type flip (`Step.agentConfig`,
`ContextPacket.effectiveAgentConfig`, `TransitionEntry.issuedAgentConfig`,
`Role.defaultAgentConfig`, `CommitTransitionInput`) compile-forced the
consumer sweep; the value-ripple (`toEqual` packet literals the compiler
does NOT catch) surfaced only at the suite run.

New tests: `l0cTrace.test.ts` (the TR golden trace — the two-step
cascade, effective-at-dispatch + issued-at-commit + C4 byte-identity, a
create-`runOverrides` third-layer variant, a no-override role-default
variant); `kernel/agentConfig.test.ts` (R + purity); new
`kernel/dispatchIntent.test.ts` (E family — the always-present
projection, the empty-cascade lane that fails the L0b conditional
spread); admit A-family lanes (steps/roles × non-map/non-canonical,
map-admits, path-addressed, dependent-lane suppression). Suite: 1151
green (was 1136).

Re-bases (sanctioned by the C7 narrowing, A3): the two ch8-C14 V9
"lossless numeric/typed-distinct/`__proto__` agentConfig" tests →
admission REJECTION (a non-string-keyed agentConfig materializes as a JS
Map = not a plain map); the V15 cyclic-agentConfig accumulation test
3→4 findings (the cycle is also non-canonical, so the admit lane fires
too); the store S11 "P1a NULL write shape" test → the P2 canonical-JSON
write shape.

Boundary correction (build-time): `v3/src/definition/validate.ts` was
NOT in the authored mutation_boundary, but the `Step.agentConfig` flip
compile-forced a `as AgentConfig` cast on its V9 materialization (the
`gates` pass-through precedent; behavior unchanged). Added to the
boundary — a detector_miss (the T4 unknown-slot consumer sweep
under-enumerated a typed Step CONSTRUCTOR site, not just readers).

Tier-0 (approve + build-close pre-audit) all green: typecheck, lint,
`v3:test` (1151), `v3:adr-check`, `v3:packet-lint`, coverage (validation).
The `--post-build` audit ran CLEAN against build commit `0e094ccb`.

### Build-close arm gate (gate-2) + aftermath

The agent-invoked external arm (codex, pinned gpt-5.6-sol/high,
`approval_policy=never`; byte-guard clean before AND after; all commands
green incl. `v3:test` 1151 and the ledger byte-identical) returned a
basis-citing FINDINGS verdict on `fb26c4e2`: 8 × P2 — 1 product, 6
test-evidence (the sensitivity pass), 1 packet-docs. All folded (P2, no
blocker, no new-decision):

- **F1 (product)** — the resolver leaked `runOverrides[stepId]` for a
  NON-step id (unreachable — the resolver is only called for a valid
  current step — but a non-uniform R4). Folded: `resolveAgentConfig`
  returns `{}` when the step does not resolve (all layers vacuous).
- **F2** — the R4 inert lane did not drive the ghost-step combination.
  Folded: a `resolveAgentConfig(t, "ghost", {ghost:{x:1}}) → {}` test.
- **F3** — the purity lane checked only the three source layers. Folded:
  a whole-template + whole-instance byte-snapshot (catches a mutation of
  `instance.version` / `template.ref`).
- **F4** — the C2 byte-form used a single-key map (blind to key ordering).
  Folded: a multi-key UNSORTED fixture `{zeta,alpha}` → `{"alpha":..,"zeta":..}`.
- **F5** — the both-read-surfaces lane ran only with `{}`. Folded: a
  non-empty `issued_agent_config` read on BOTH `getInstanceDetail` and
  `getTimeline`.
- **F6** — the C3 class iff omitted `issued_agent_config` both ways.
  Folded: `issued_agent_config` added to the per-conjunct transition-null
  loop + a fact-row-carrying-`issued_agent_config` refusal test.
- **F7** — the T3 "fact entry with `issuedAgentConfig` is a compile error"
  probe was missing (and the transition probe was P1a-stale). Folded:
  the fact-variant `@ts-expect-error` probe + the transition probe
  re-based to the non-null-AgentConfig type.
- **F8 (packet-docs)** — the R-DERIVED-PROBES build-report table was not
  materialized. Folded: the table below, each row PROVEN by a live
  mutation → observed-red → revert.

**R-DERIVED-PROBES build-report (≥1 red-proven probe per R/E/C/A family):**

| Family | Mutation applied | Expected red | Observed (reverted) |
|---|---|---|---|
| R (cascade) | `mergeAgentConfig` order swapped (base wins over `over`) | R2 precedence/overwrite lanes | 6 R2 tests red (`agentConfig.test.ts`) ✓ |
| E (dispatch projection) | `effectiveAgentConfig` made conditional (the L0b spread) | empty-cascade + unconditional-projection lanes | 2 tests red (`dispatchIntent.test.ts`) ✓ |
| C (commit provenance) | store `canonicalJson` → `JSON.stringify` | C2 sorted-key byte-form | 1 test red (`sqliteStore.test.ts`, multi-key) ✓ |
| A (admission narrowing) | the plain-map container lane skipped | steps/roles non-map rejects | 3 A tests red (`admit.test.ts`) ✓ |

After the folds: suite 1155 green, typecheck/lint/tier-0 all green. The
aftermath touched only files ALREADY in the mutation_boundary
(`agentConfig.ts`, `agentConfig.test.ts`, `sqliteStore.test.ts`,
`processGate.test.ts`) — no boundary extension. Post-build boundary audit
CLEAN against the fold commit `2c09ef7f`.

**Gate-2 re-check (agent-invoked, codex gpt-5.6-sol/high, byte-guard clean
both sides): CLEAN** — verdict cites basis HEAD `2c09ef7f`, packet_sha256
`2da29272…`; all 8 folds RESOLVED-and-able-to-fail per finding, no
regression, all commands green (`v3:test` 1155, packet-lint, adr-check,
coverage), no evidence gaps. The find→fold→one-hash-citing-re-check leg
ends CLEAN — **the packet is DONE**. Arms (this packet): gate-1
approve-bytes (raised FLAG-1, human-ratified) + gate-2 build-close
(8 findings → folded → re-check CLEAN), both agent-invoked codex
gpt-5.6-sol/high.

```json
{
  "packet_metrics": {
    "class": "kernel-semantic",
    "prediction": { "predicted": "projection", "reasoning": "plan §12.4 P2 row: l0c-pseudocode + ledger §2/§4 + the ratified chapter draft", "discovered": "projection" },
    "provenance": { "anchored": 17, "derived": 4, "new_decision": 0 },
    "rounds": { "review": 0, "doc_refinement": 0, "implementation": 2 },
    "stops": [{ "type": "4:flagged-approve", "what": "FLAG-1 provenance-determinism vs unenforced template immutability (C4 byte-identity rests on pinned-template immutability the fileDefinitionStore does not physically enforce)", "resolution": "human-ratified 2026-07-22: approve-ratified (accept-now) + FH-1 deferred to future-hardening.md" }],
    "detector_misses": [{ "found_at": "implementation", "what": "validate.ts absent from mutation_boundary", "why_missed": "the T4 unknown-slot sweep enumerated READERS of the renamed fields but not a typed Step CONSTRUCTOR site (validate's V9 materialization), which the type flip compile-forces" }],
    "learned": "the T4 consumer sweep must include typed CONSTRUCTOR sites of a flipped type, not only field readers; the C7 narrowing re-bases ch8-C14 V9 any-value agentConfig fixtures to rejection; the build-close arm's sensitivity pass caught 6 green-but-blind test lanes (single-key byte fixture, {}-only read-surface, source-layer-only purity, missing per-conjunct/fact-side class-iff, missing fact compile probe) that the internal panel missed — the P1b lesson repeated, and the R-DERIVED-PROBES table is now mutation-proven not asserted.",
    "baseline_note": "pre-session panel + external-arm gate-1 rounds (which raised FLAG-1, ratified 2026-07-22) are recorded in the flag ratification, not counted here; rounds.implementation counts this build session."
  }
}
```
