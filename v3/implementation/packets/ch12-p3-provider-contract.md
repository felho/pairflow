# Task Packet: ch12-p3 — the L0e provider contract

Plan step: plan.md §12.4 P3 row. Realizes §12.1 item 3 (the L0e
provider contract): the requirement on the template (the C18/C19
successor value domain), the provider port + `ProviderRegistry` + the
deterministic testkit provider, the kind-boundary readiness check, the
packet projection, `runtime_context_provider_unavailable` behavioral,
the ch11-P3b start-input seam reconciled (C14), and the l0e + l0d
golden traces. Draft anchors (= the manifest's C-row ref union):
`contract:ch12-runtime-core` rows C2/C3/C4/C5/C13/C14/C15/C16/C17/C18/C19/C22/C24/C25.
The l0e section trace (`model-src/sections/05-l0e.html`,
`code/l0e-template-config.new.txt`) + the l0d section trace
(`code/l0d-template-config.new.txt`), the l0e unit texts, ledger §2 l0e
(6 invariants), ledger §3 (`runtime_context_provider_unavailable`), and
ledger §4 l0e (8 domain entities) are the model sources. ADR-014
(module home — the provider seam is a kernel-only injected port in
`ports/`, the projection/ref value shapes in `domain/`, the scripted
player in the testkit; `accepted` at the draft ratification) is
governing authority for the module placement, but no module MOVES here
(the seam is BORN in `ports/`), so it stays outside the manifest union.

Plan alignment (R-ALIGNED-UP): NONE. The P3 row already carries the
`l0d-pseudocode/START` + `l0d-pseudocode/RECEIVE` both-ends completion
obligation (pre-declared "aligned at ch12-p1b pre-approval"); this
packet discharges it — no ratified plan text is contradicted, so no
aligned-up edit rides this commit. The reciprocal share entries into
ch12-p1b's slice (below) are the P1b-declared sibling-slice edits, not
plan changes. The plan §12.4 prediction-basis qualifiers were already
refreshed by the ratifying commit (C26), so no §12.4 edit rides here.

Autonomy stage: measurement — inherited from the ch12 chapter header
(flag-free panel approves proceed to build autonomously THROUGH the two
transitional external-arm gates; flags/STOPs/first-of-a-kind route to
the human). Not first-of-a-kind: the kernel-semantic projection class
(ledger units + contract rows realized in the kernel + admission +
store) has broad precedent (ch12-P1b/P2, ch11-P2a); the injected-port
class has precedent (`StorePort`, `GatePort`, the process runner — every
kernel dependency arrives as an injected interface, REV-E-NO-ADAPTER-BRANCH);
the scripted-testkit-player class has precedent (`scriptedProcessGateRunner`,
`scriptedActor`); the value-level admission-narrowing class is the
ch11-P2a/P3a + ch12-P2 `admitTemplate` culture; the named-replacement
seam retirement is the ch12-P1b/W1 + ch8-C29 culture.

Classification: **projection** — manifest tally: 28 anchored /
6 derived / 0 new-decision (machine-counted from the `packet_rows`
block). Every row anchors to the ratified ch12 draft, the l0e unit
texts, ledger §2/§3/§4 l0e, ratified plan text, or the
invariant-disposition map, or derives from those with an in-row note.
Zero new-decision rows: the provider port shape, the requirement value
domain, the ordered-after-commit completion seam, the kind boundary,
the projection, the empty production registry, and the seam retirement
are all fixed by C2/C3/C4/C5/C13/C14/C15/C16/C17/C18/C19/C22/C24/C25 verbatim
plus the l0e unit texts — the READY terminal-sink gap the draft panel
found is already model-fixed (`76e34413`), so projection exposes no
model bug.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [
      { "id": "l0e-pseudocode/RuntimeContextProvider", "disposition": "implement" },
      { "id": "l0e-pseudocode/RUNTIME_CONTEXT_READY", "disposition": "implement" },
      { "id": "l0e-pseudocode/activate_or_hold", "disposition": "implement" },
      { "id": "l0e-pseudocode/START", "disposition": "alias/inherited" },
      { "id": "l0e-pseudocode/dispatch_intent", "disposition": "alias/inherited" },
      { "id": "l0d-pseudocode/START", "disposition": "implement" },
      { "id": "l0d-pseudocode/RECEIVE", "disposition": "implement" }
    ],
    "rejections": ["runtime_context_provider_unavailable"],
    "invariants": [
      { "id": "l0e/context-is-optional", "disposition": "type/schema" },
      { "id": "l0e/requirement-is-template-owned", "disposition": "type/schema" },
      { "id": "l0e/provider-resolved-at-start", "disposition": "test" },
      { "id": "l0e/kind-boundary-only", "disposition": "type/schema" },
      { "id": "l0e/projection-never-the-ref", "disposition": "type/schema" },
      { "id": "l0e/registry-stable-for-the-run", "disposition": "test" }
    ],
    "traces": ["l0e-pseudocode", "l0d-pseudocode"],
    "shared_ownership": [
      { "item": "l0d-pseudocode/START", "co_owner": "ch12-p1b-activation-machinery.md" },
      { "item": "l0d-pseudocode/RECEIVE", "co_owner": "ch12-p1b-activation-machinery.md" }
    ]
  }
}
```

The FIVE l0e units are all P3's per plan §12.2 (the "5 l0e"
ownership). Three are `implement` — the genuinely-new dedicated homes:
`RuntimeContextProvider` (the `ports/` port + registry + the testkit
scripted player), `RUNTIME_CONTEXT_READY` (the new kernel event
handler), and `activate_or_hold` (the shared post-readiness helper
EXTRACTED from ch12-P1b's inline START fork so RUNTIME_CONTEXT_READY
reuses it — the model's shared function realized as a shared symbol).
Two are `alias/inherited`: `l0e-pseudocode/START`'s provider-completed
semantics live in the co-owned `kernel/lifecycle.ts#start` home (the
provider legs LAND there, completing the l0d-START realization —
below), and `l0e-pseudocode/dispatch_intent`'s provider-projection leg
lands in the shared `kernel/dispatchIntent.ts#deriveDispatchIntent`
home whose `implement` claimant is `l0d-pseudocode/dispatch_intent`
(the l0c-into-l0d fold-culture precedent: a version whose semantics are
carried by a shared realized symbol maps `alias/inherited` into it —
the codeRef symbol carries no semantics on an alias row).

`l0d-pseudocode/START` and `l0d-pseudocode/RECEIVE` are SHARED with
ch12-p1b (the owner): P1b realized START's none-path + activate_or_hold
fork and RECEIVE's actor/intent/`fail` routing, and declared the
provider legs (`request_runtime_context`, the `requested(request_id)`
marker, C18's spec-form lanes) and the `kernel_event →
RUNTIME_CONTEXT_READY` dispatch as P3's partial-realization completions.
THIS packet completes them; the MACHINE shares land BOTH-ENDS at this
commit (the coverage tool's two rules — a co_owner must be an EXISTING
packet, P1b is committed; and every owner declares the share
RECIPROCALLY): P3's slice declares
`{l0d-pseudocode/START, co_owner: ch12-p1b-activation-machinery.md}` +
`{l0d-pseudocode/RECEIVE, co_owner: ch12-p1b-activation-machinery.md}`
AND lists both units in its own `units` axis with `implement` (the
disposition agrees with P1b's on both ends), while this commit ADDS the
reciprocal `{…, co_owner: ch12-p3-provider-contract.md}` entries to
ch12-p1b's slice (a sanctioned sibling-slice edit riding P3's commit
inside P3's boundary — the P1b-declared obligation, plan §12.4 P3 row;
the `co_owner` VALUE is the packet FILENAME, the coverage tool's name
key). The chapter union closes across the sibling packets (plan §12.2:
21 unit ids = 4 l0c + 12 l0d + 5 l0e).

## Sizing/risk (template §2 step 0 — materialized; the draft watchpoint's re-check)

Predicted class (plan §12.4, recorded at the ch12 ratification for the
P3 row): **projection** (basis: l0e-pseudocode + ledger §2/§3/§4 + the
ratified chapter draft). Discovered at authoring: **projection** —
prediction and discovery agree (zero new-decision rows).

**The draft's P3 sizing watchpoint (Context §"Packet-time watchpoints"):**
"the trace realignment concentrates BOTH golden traces (l0d + l0e) at
P3 on top of the full provider machinery — the P3 build's template-§2
step-0 sizing measurement re-checks the packet's load (the plan flags
only P1 as the declared split candidate)." This section IS that
re-check; its outcome is single-packet, closure-proven (below).

**This packet's own six axes:**

- **authority movement:** WEAK — the packet INTRODUCES the
  provider-resolution authority (the kernel now resolves a `spec.provider`
  against an injected registry and owns the provisioning CONTRACT), but
  MOVES no STORED source of truth: the requirement value-domain
  ownership already moved to ch12 at the RATIFICATION act (a paper
  reopen of ch11-C18/C19; C2/C26), the `runtime_context` state column
  already exists (P1a's fenced bump), and the `requested`/`ready(ref)`
  encodings already live in the store (P1a). A new derivation +
  injected port, not a relocated truth.
- **new runtime behavior turned on:** YES — the provisioning path
  becomes live (START resolves a provider, calls `provision`, marks
  `requested`), the RUNTIME_CONTEXT_READY handler becomes reachable
  (kind boundary + `ready(ref)` + activation), the packet carries the
  actor-facing projection, and `runtime_context_provider_unavailable`
  becomes a behavioral rejection. New observable behavior on the START
  and READY paths.
- **surface spread:** TRIPPED — one concept (the provider contract)
  touches domain (the requirement + projection value types + the
  `ContextPacket.runtimeContext` field), ports (the NEW
  `RuntimeContextProvider` + `ProviderRegistry`), kernel (START's
  provider legs + the READY handler + the shared `activateOrHold` +
  the dispatch projection + the composition completion seam),
  admission (the requirement materialization + the C2 migration
  refusal + the C5 process-gate cross-rule re-grammar), the CLI (the
  eager-guard retirement + the empty-registry injection + the dev
  scripted-provider registry), ingress (the `runtimeContextRef` wire
  key retirement), and the testkit CONTRACT (the scripted provider +
  the two golden trace fixtures + the harness seam re-base). Seven
  surfaces for one concept.
- **identity/join fragility:** NO cross-STORE identity match — the
  correlation is the single `runtime_context = requested(request_id)`
  rung on ONE instance's state (the kernel guards kind + correlation;
  no diag/instance cross-store join). The `request_id` is minted and
  consumed within the same instance's lifecycle, not correlated across
  stores.
- **foundation + activation coupling:** NO — the foundation is BUILT:
  the lifecycle spine (P1a/P1b), the `runtime_context` state column +
  encode/decode (P1a), the `commitLifecycle` port + `newRuntimeContext`
  write (P1b F1), the cascade (P2) all landed before this packet; P3
  turns the provider path on over them.
- **prerequisite coupling:** NO — P1a/P1b/P2 are committed and green
  (`e3b38064` tip at authoring); P4 (the format walk + floor + verbs)
  depends on THIS packet, not the reverse.
- **acceptance multiplicity:** the provider port + START provisioning
  + the READY handler + the kind boundary + the requirement admission
  + the seam retirement + the two golden traces — bounded by ONE proof
  surface (`pnpm v3:test` + the v3 bridges; full `ci:local` at close).

**Hard stops 2 and 6 (letter-tripped, closure-proven; single-packet
allowed: yes).** Both trips share ONE cause — realizing the provider
CONTRACT (the port, the resolution, the completion) is a single
semantic surface the model splits across three units
(`RuntimeContextProvider`, the `START` provider legs, `RUNTIME_CONTEXT_READY`)
plus the requirement it consumes. The closure proof:

- **Additive port, no consumer migration.** `RuntimeContextProvider` +
  `ProviderRegistry` are BORN in `ports/` with zero existing
  consumers; the composition roots gain ONE injected dependency (the
  registry), EMPTY in production (C16) and the scripted player in the
  dev/test roots. No authority relocates — the port is a new leaf.
- **One bounded kernel path.** The provider legs (`kernel/lifecycle.ts#start`),
  the READY handler (`kernel/lifecycle.ts#runtimeContextReady`), the
  shared `activateOrHold`, and the dispatch projection
  (`kernel/dispatchIntent.ts`) are the kernel's provisioning path —
  all in two files, driven by the two golden traces + the provider
  unit tests. The completion seam is a bounded composition wrapper
  (C15) fixed by contract.
- **Compile-forced + measured seam retirement.** The `ContextPacket`
  gains a non-optional `runtimeContext` field — every CONSTRUCTION-site
  packet literal becomes a compile error, while the `toEqual({packet:{…}})`
  EXPECTED-value literals (compared as data, not type-checked) are the
  MEASURED value-ripple T4 owns (the P2 `effectiveAgentConfig` precedent,
  itself non-compiler-caught); the `runtimeContextRef` interim wire key + the
  `resolveWindowContext` helper + the `runtimeContext: "required"`
  literal + the CLI eager guard retire as a compile-forced + measured
  sweep (C14/C24; R-ABSENCE-CONSUMERS).
- **One admission addition.** The requirement materialization + the C2
  LOUD migration refusal + the C5 re-grammar are additions to the ONE
  semantic point (`admitTemplate`) both channels already traverse.

No per-consumer-family sequencing or review loop exists — the same
in-repo consumers own the fallout, typed by the compiler where
type-bound, driven by the two traces + admit lanes where not. The
escalation combo (4+ surfaces × 3+ success classes) trips on the same
cause and closes with the same proof. **Shared invariant coherence is
NOT the proof** — the proof is that ONE build closes the provider
contract without separate sequencing: the port is a leaf, the kernel
path is two files, the seam is contract-fixed, the retirement is
compile-forced, and the two golden traces are one proof surface. The
two golden traces are ACCEPTANCE vehicles for the SAME machinery
(provisioned-immediate + deferred-hold), not two behaviors needing
separate closure.

**Stops 1, 3, 4, 5, 7, 8, 9, 10, 11: not tripped.** Stop 1 (authority
movement + new behavior): the "authority" is the new provider-resolution
derivation + injected port, not a moved STORED truth (axis above) — the
requirement ownership moved at ratification, the state column at P1a.
Stop 3: the prerequisite is built. Stop 4: the provider is resolved by
the SINGLE `providerRegistry.resolve(spec.provider)` path (START and
`dispatch_intent` re-resolve the SAME pinned spec — `registry-stable-for-the-run`,
a kernel/config invariant, not a competing authority). Stop 5: no
contract cutover with a fragile join — the `runtimeContextRef` retirement's
join is the compiler; correlation is a single-instance rung. Stop 7:
producer + one shared shape (`ContextPacket`), not "+ any two fallout
families" needing separate closure. Stop 8: NO persisted schema change —
the `runtime_context` column + `requested`/`ready` encodings EXIST since
P1a; this packet lands the `requested`/`ready(ref)` WRITERS. Stop 9: no
rollback/retry/idempotency/serialization/ordering semantics change to the
COMMIT — the provision call is an external async OUTSIDE any transaction
(C18 model order), the atomic commit (requested marker + STARTED fact)
is REV-A1-TXN unchanged, and the ordered-after-commit completion seam
(C15) is a DELIVERY-ordering rule, not a store coordination primitive;
precondition failure produces ZERO side effects (the Mutable-flow
record below). Stop 10: the completion/success proof source is UNCHANGED
(terminality is still the committed transcript + reconstruction; P1a T2)
— this packet adds a provisioning PHASE before ACTIVE, not a new
completion truth. Stop 11: no proof contract is reused without parity —
the trace harness is EXTENDED (two new golden fixtures), the existing
traces re-base only where the `ContextPacket` field is added, asserted
lane-by-lane (W-family).

**Consume-family scan** (run because stops 2/6 tripped; measured from
the tree at authoring — receipts in Embedding gates): producer =
kernel (changed: START's provider legs, the READY handler, the shared
`activateOrHold`, the dispatch projection, the composition seam);
validator/gate = admission (changed: `admitTemplate` materializes the
requirement value domain + the C2 migration refusal + the C5 re-grammar);
persistence/replay = store (present, NO production change — the
`requested`/`ready(ref)` encodings EXIST since P1a; this packet's kernel
WRITES them via the existing `commitLifecycle` `newRuntimeContext`
member, and the store TEST gains the round-trip lanes); execution
consumer = the provider seam itself (new: the injected port + registry
+ the scripted player — the provisioning mechanics, the ch-9 real
provider deferred); read/presentation = floor (present, NO change: the
`detail` ref exposure + the compact discriminant are C21's P4 surface;
the packet projection is a kernel-output field, not a floor read);
recovery/cleanup = absent (teardown/health/provisioning-failure are
named Absents, C15/C23); external/integration = the provider seam +
the composition roots (changed: the registry injection — EMPTY in
production, scripted in dev/test) and the CLI (changed: the eager-guard
retirement, the ingress `runtimeContextRef` key retirement); testkit =
changed (CONTRACT: the scripted provider, the two golden trace
fixtures, the harness `runtimeContextRef` seam re-base). Four families
changed beside the producer (admission, provider-seam, CLI/composition,
testkit) — all closed under the one additive port + the compile-forced
`ContextPacket` cutover + the two traces' driven lanes. No `unknown`
cells.

**Closure-budget triage** (annex — buckets in scope): TWO buckets are
touched — the runtime-behavior bucket (the provisioning path + the
READY handler + the requirement machinery, this packet's own substance)
and the shared-contract bucket (the `ContextPacket.runtimeContext`
field addition + the `template.runtimeContext` raw-field BROADENING
`"required" | undefined` → `RuntimeContextSpec | "none" | "required" | undefined`,
the requirement materialized AT ADMISSION and read as a view — T1). The
shared-contract closure is COLLAPSED into the compile-enforced cutover
deliberately, and the collapse is safe: the `ContextPacket` field's
inhabitants arrive WITH its writer (the dispatch projection is the sole
producer of both the `none` and the projection value) in the same
commit; the raw `template.runtimeContext` broadening compile-forces only
its cast producer (validate.ts) while `admitTemplate` normalizes the
requirement at admission and START/dispatch read the materialized view;
every consumer is in-repo; the two golden traces + the
re-based suites prove the actor path's committed behavior unmoved but
for the added field. The read-projection closure (the `detail` ref
exposure, the compact discriminant) is NOT needed here — it is C21's P4
floor surface. The format/CLI-verb bucket stays P4's.

**Proof-boundary triage** (annex — the provisioning phase joins): the
completion truth's canonical proof source is UNCHANGED (the committed
transcript + template reconstruction decide terminality; P1a T2). What
grows is the START outcome's PHASE structure — the spec path now returns
`Accepted` with a `requested(request_id)` marker and defers activation
to READY, where the none path returned synchronously. No surface goes
mixed-truth: the `requested` state is a legitimate stored lifecycle
state (floor-visible, C15/C21), the `ready(ref)` commit is the same
`commitLifecycle` atomic move as any lifecycle transition, and READY's
activation rides `activate` exactly as the none path does. No reused
proof contract needs parity work — the trace harness extends with two
new golden fixtures.

**Mutable-flow record** (annex — hard-stop-9 material near, not
tripped): NO store coordination primitive enters. The `provision` call
is an external async OUTSIDE any transaction (C18's model order: the
external call necessarily precedes the atomic commit); its failure
surface splits at the commit boundary (C18 must-detach obligation): a
synchronous throw or an awaited-detach-ack rejecting PRE-commit is a
PORT BREACH (fail-loud, NO state change, the `op_id` unconsumed), a
failure AFTER detach is the post-commit no-channel Absent (the run
stays `CREATED` + `requested`, floor-visible + cancellable). A
CAS-conflicted commit restarts from load (the single-shot guard
re-admits only if the marker never committed — a re-run provisions
AGAIN under a FRESH request_id, the superseded READY failing
correlation inert; C18's deliberate provider-side cost). The
ordered-after-commit completion seam (C15) is a DELIVERY-ordering rule
(a held synchronous completion releases when the START attempt
concludes), never a store lock — the seam's hold returns to the
provider IMMEDIATELY, so no circular wait exists with C18's
detach-acknowledgment await. Precondition failure produces ZERO side
effects on every path.

## Operative material (full text — projection, not invention)

### `l0e-pseudocode/RuntimeContextProvider` (verbatim)

```text
# RuntimeContextProvider — a named, core-adjacent fulfiller; the kernel owns this CONTRACT, the provider owns the mechanics
INTERFACE RuntimeContextProvider:
  provision(instance_id, request_id, spec)            # async → later fires RUNTIME_CONTEXT_READY(request_id, ref)
  project_for_actor(runtime_context_ref) → RuntimeContextProjection   # kind-specific actor-facing view; kernel-internal fields stay out
```

### `l0e-pseudocode/START` (verbatim; the provider-completed version — realized at `l0d-pseudocode/START`'s home)

```text
START(instance, intent) → Outcome                                     # operator_intent — guarded, single-shot; intent = { op_id } (operation identity: F-W1-2 resolved, ingress touch)
  admitted ← admit_loaded(instance, expect: {
    op_id: intent.op_id,                                              # a replay of the same intent ⇒ Duplicate; a FRESH retry still hits the single-shot state guard
    state: kernel_status = CREATED AND runtime_context = none })      # state rung stays unnamed — bare-REQUIRE semantics
  IF admitted ≠ Accepted THEN RETURN admitted
  template ← definitionStore.load(instance.template_ref)
  requirement ← template.runtime_context                              # RuntimeContextRequirement: none | required(spec) — single source of truth
  IF requirement = none THEN                                          # the workflow declares no runtime context
    instance.runtime_context ← ready(∅)                               # trivially ready — nothing to provision
    instance.transcript.append(STARTED { op_id: intent.op_id })       # the op_id fact — SAME atomic move as the state change
    RETURN activate_or_hold(instance)
  provider ← providerRegistry.resolve(requirement.spec.provider)
  IF provider is none THEN RETURN Rejected(runtime_context_provider_unavailable)   # name-resolution failure = base contract error — a PRE-COMMIT reject: the op_id is NOT consumed, a corrected retry may reuse it
  request_id ← new_request_id()
  provider.provision(instance.id, request_id, requirement.spec)  # provider internals run git branch/worktree/clone mechanics; later fires RUNTIME_CONTEXT_READY
  instance.runtime_context ← requested(request_id)          # the L0d single-shot marker; status stays CREATED (= v1 PREPARING_WORKSPACE)
  instance.transcript.append(STARTED { op_id: intent.op_id })   # the op_id fact rides the SAME atomic move as the marker
  RETURN Accepted
```

Realization note (intent, not restatement): ch12-P1b realized START's
single-shot admission, the NONE-requirement path (`ready(∅)`), the
`activate_or_hold` fork, the STARTED fact, and the interim L3 window
context lanes (the `resolveWindowContext` helper reading the ch11
`runtimeContext: "required"` string). THIS packet REPLACES the interim
`resolveWindowContext` seam with the model's real requirement branch:
`requirement ← resolveRuntimeContextRequirement(template.runtimeContext)`
(the materialized `RuntimeContextRequirement` read over the
admission-normalized field — T1/R1), the none path unchanged, and the
spec path — `providerRegistry.resolve`, the `runtime_context_provider_unavailable`
pre-commit reject, `new_request_id()`, `provision(...)`, the
`requested(request_id)` marker + the STARTED fact in ONE atomic move,
`RETURN Accepted`. The seam's interim carrier (`StartInput.runtimeContextRef`)
and its four `resolveWindowContext` lanes retire HERE (W-family, C14).

### `l0e-pseudocode/RUNTIME_CONTEXT_READY` (verbatim; the post-fix terminal-sink form — model fix `76e34413`)

```text
RUNTIME_CONTEXT_READY(instance, request_id, runtime_context_ref) → Outcome   # kernel_event (v1: workspace/worktree ready)
  REQUIRE admit_loaded(instance, expect: {
    state:     kernel_status ≠ TERMINAL,                       # ADMISSION state rung (L0d) — terminal is a sink (a late READY after CANCEL/FAIL must not resurrect the run)
    correlate: runtime_context = requested(request_id) })      # correlation rung — the readiness for the request WE issued
  template ← definitionStore.load(instance.template_ref)
  requirement ← template.runtime_context
  REQUIRE requirement = required(spec)                       # a request was issued ⇒ a context is required (made explicit)
  REQUIRE runtime_context_ref.kind = spec.kind              # L0e kind-boundary — a provider may only return a ref of the requested kind
  instance.runtime_context ← ready(runtime_context_ref)    # kernel guards kind + correlation only; the locator stays provider-defined, unvalidated
  RETURN activate_or_hold(instance)
```

### `l0e-pseudocode/activate_or_hold` (verbatim; the shared post-readiness decision)

```text
activate_or_hold(instance) → Outcome                                 # shared post-readiness decision (provisioned or context-free)
  IF instance.activation_mode = immediate THEN RETURN activate(instance)
  instance.kernel_status ← WAITING                             # deferred_kickoff: hold for an operator kickoff
  instance.wait ← { kind: kickoff_pending, requested_by: "activation", resume_events: [KICKOFF] }
  RETURN Accepted
```

Realization note: ch12-P1b realized this fork INLINE inside `start`
(the none path). THIS packet EXTRACTS it as the shared
`kernel/lifecycle.ts#activateOrHold(committed, template)` helper so
RUNTIME_CONTEXT_READY reuses it — the model's `activate_or_hold` shared
function realized as a shared symbol. The immediate branch composes the
activation write-set (L7 — ACTIVE + `template.start` + round 1 + the
dispatch intent) into the SAME atomic commit as the `ready(ref)`/`ready(∅)`
write; the deferred branch composes the WAITING hold (the typed
`kickoff_pending` wait). START's none path and READY both enter it; the
version arithmetic and the STARTED-fact placement stay P1b's.

### `l0e-pseudocode/dispatch_intent` — provider-projection face (verbatim; realized at `l0d-pseudocode/dispatch_intent`)

```text
dispatch_intent(instance, template, step_id) → DispatchIntent
  ...
  IF instance.runtime_context = ready(∅) THEN                                       # the workflow declared no runtime context
    runtime_view ← none                                                            # explicit: the actor assumes no workspace
  ELSE
    REQUIRE requirement = required(spec)                                            # provisioned path ⇒ a context is required (made explicit)
    provider ← providerRegistry.resolve(spec.provider)                             # the same pinned-template provider that issued the request
    REQUIRE provider is not none                       # kernel/config invariant (not a business rejection): registry stable for an active run
    runtime_view ← provider.project_for_actor(instance.runtime_context.ready_ref)  # actor-facing projection (L0e); raw ref stays kernel-side
  packet ← ContextPacket { ..., runtime_context: runtime_view }                    # the projection, or none for a context-free workflow
  RETURN DispatchIntent { actor, packet }
```

Realization note: ch12-P2 realized `deriveDispatchIntent`'s
`effective_agent_config` leg. THIS packet adds the `runtime_context`
leg: `ready(∅)` → the packet field `none`; a provisioned `ready(ref)`
→ `providerRegistry.resolve(spec.provider)` (the SAME pinned-template
provider) re-resolved as a kernel/config INVARIANT throw when it fails
(`registry-stable-for-the-run`), then `project_for_actor(ref)` — the
kind-specific projection carried OPAQUELY into the packet; the raw ref
stays kernel-side (`projection-never-the-ref`).

### The six l0e invariants (bodies verbatim — `v3/model/records/invariants/l0e.json`; ledger §2 carries their one-line names)

```text
context-is-optional: a workflow may declare runtime_context = none — then START needs no
  provider, sets ready(∅), and the packet carries runtime_context: none; readiness still
  gates dispatch only when a context is required
requirement-is-template-owned: the RuntimeContextRequirement lives on the pinned template
  (single source of truth), not snapshotted into instance state — a run-override cascade is
  possible later, same shape as AgentConfig (L0c)
provider-resolved-at-start: when a context is required, an unknown spec.provider →
  Rejected(runtime_context_provider_unavailable) before any provisioning; deeper
  health/availability is deferred
kind-boundary-only: a provider may only return a ref whose kind = the requested spec kind;
  the kernel guards kind + correlation and treats the locator as opaque (provider-defined,
  not validated)
projection-never-the-ref: the packet carries either runtime_context: none or only
  project_for_actor(ref), resolved through the same pinned-template provider that issued the
  request — the raw ref stays kernel-side
registry-stable-for-the-run: a provider used by an active instance stays resolvable for the
  life of the run (pinned spec); dispatch REQUIREs it as a kernel/config invariant, not a
  business rejection
```

### Exact rejection strings (ledger §3 — the slice's surface)

- `runtime_context_provider_unavailable` — first appears in
  `l0e-pseudocode` (born here BEHAVIORAL: START's spec-form
  unresolved-provider lane, PRE-commit — already a registry member,
  `domain/rejections.ts`). Pass-through names this packet's paths
  surface without owning: `runtime_context_required_for_process_gate`
  (ch11-C36/l2a — the workspace-emptiness backstop, unchanged in
  mechanism, re-reads the REAL lifecycle field — C14), `not_active`
  (ch11-p1 — the actor-path guard on a `CREATED`/`requested` instance),
  `unknown_instance` (ch-4 — the load step of every instance-addressed
  op, incl. the READY event path per P1b L8).

### The two golden traces (executable expectations)

**The l0e trace** (`code/l0e-template-config.new.txt` + §05-l0e worked
values — the provisioned immediate run + the unknown-provider variant):

Template (direct-constructed, admitted): the two-role/two-step
`local-pair-v0@1` template of the l0c/l0d traces PLUS
`runtimeContext: { kind: worktree, provider: pairflow.worktree,
config: { repo: current, base_branch: main, branch_pattern:
"bubble/{instance_id}", work_mode: worktree } }` and `activation: {
mode: immediate }`. The TEST registry registers the scripted provider
under the name `pairflow.worktree` (registry names are test-chosen data,
C16 — the builder reconciles this deliberately, never by renaming the
trace).

Committed-row expectation (the sequence the trace must reproduce):

```text
create (immediate, task present) → Created(v1); genesis floor-read: CREATED, runtime_context none
start:
    admit (CREATED ∧ none) → resolve(pairflow.worktree) → the scripted provider
    → provision(instanceId, r1, spec) [the scripted player RECORDS the call, detaches]
    → commit: runtime_context ← requested(r1), STARTED{op1} fact, version → 2 (CAS from v1);
      RETURN Accepted; floor-read: CREATED, runtime_context requested(r1)
runtime_context_ready(instanceId, r1, ref{kind: worktree, locator: <opaque>}):
    admit: kernel_status ≠ TERMINAL ✓, runtime_context = requested(r1) ✓
    → transport gate: ref canonical-JSON-safe ✓ → kind boundary: ref.kind = worktree = spec.kind ✓
    → commit: runtime_context ← ready(ref); activate_or_hold(immediate) → activate:
      kernel_status ACTIVE, current_step implement, round 1, version → 3
    → RETURN Activated(dispatch_intent)
dispatch(implement): packet.runtime_context
    = project_for_actor(ref) [the scripted provider's kind-specific view — opaque to the kernel]
emit PASS → ... (the actor path continues as the l0c/l0d traces, each packet carrying the projection)
```

The l0e trace ALSO drives the UNKNOWN-PROVIDER variant: a template
whose `provider` name is NOT registered → `start` returns
`Rejected(runtime_context_provider_unavailable)` PRE-commit (no
`requested` marker, the STARTED fact NOT written, the `op_id`
unconsumed — a corrected retry may reuse it); and the HOSTILE-KIND
variant: the scripted provider fires a READY whose `ref.kind ≠ worktree`
→ the kind-boundary REQUIRE rejects, `runtime_context` stays
`requested(r1)`, NO state change.

**The l0d trace** (`code/l0d-template-config.new.txt` + §04-l0d — the
deferred-kickoff hold + cancel, requested/READY legs realized with the
scripted provider):

Template: the same two-role/two-step template with
`runtimeContext: required(spec)` (the worktree spec) and `activation: {
mode: deferred_kickoff }`.

```text
create (deferred_kickoff, NO task — legal: deferred over the mode default) → Created(v1)
start:
    admit (CREATED ∧ none) → resolve → provision(r1) → commit: requested(r1), STARTED{op1}, v→2
    → RETURN Accepted
runtime_context_ready(r1, ref):
    admit ✓ → kind boundary ✓ → commit: ready(ref); activate_or_hold(deferred_kickoff):
      kernel_status ← WAITING, wait ← {kind: kickoff_pending, requested_by: "activation", resume_events: [KICKOFF]}, v→3
    → RETURN Accepted
kickoff(task): admit (WAITING ∧ kickoff_pending) → task set, wait NULL, activate: ACTIVE, round 1, TASK_SUPPLIED{op2}, v→4 → Activated
cancel: admit (≠ TERMINAL) → TERMINAL, cancelled, CANCELLED{op3}, v→5 → Terminated(cancelled)
```

(The version numbers are the ch12 CREATE→START→READY→KICKOFF→CANCEL
lifecycle; the trace's operator `mode: deferred_kickoff` input realizes
as the CREATE-level choice — C13, model-faithful. This is the trace
whose `requested(r1)`/READY legs P1b deferred to P3 — C25's trace
staging.)

## Claim

The kernel owns the runtime-context CONTRACT and a named provider owns
the mechanics: a workflow's pinned template declares its
`RuntimeContextRequirement` (`none` or `required(spec)`), START
resolves the spec's provider against a STATIC injected registry and
provisions before committing, a correlated kind-guarded READY event
makes the context `ready`, and the actor sees the provider's projection
or an explicit `none` — never the raw ref. Concretely: (1) the
requirement is TEMPLATE-OWNED and materialized ONCE AT ADMISSION
(C4 — `admitTemplate` normalizes so the admitted template carries the
non-absent requirement, no absent state downstream; the read-time
`resolveRuntimeContextRequirement` is a total view over that normalized
value, not the materialization): an absent `runtimeContext` key ≡ the
authored string `none` ≡ `none`; a spec map ≡ `required(spec)`; the
retired bare `required` string fails admission LOUD with its migration
text — C2/C4/C25); (2) START's spec path resolves
`providerRegistry.resolve(spec.provider)` (an unknown provider →
`Rejected(runtime_context_provider_unavailable)` PRE-commit, the
`op_id` unconsumed), calls `provision(instanceId, request_id, spec)`
FIRST (an external async OUTSIDE any transaction; the awaited fulfillment
is the DETACH ACKNOWLEDGMENT, never the completion — a synchronous throw
or a pre-commit-rejecting detach ack is a PORT BREACH, fail-loud, no
state change), then commits `runtime_context ← requested(request_id)` +
the STARTED fact in ONE atomic move and returns `Accepted`; (3)
RUNTIME_CONTEXT_READY runs the admission rungs FIRST (terminal-sink
state, then `runtime_context = requested(request_id)` correlation — a
rung-rejected event mutates NOTHING), then the ref's canonical-JSON
transport gate, then the `required(spec)` bind (binding `spec` before
its `kind` is read), then the ONLY business validation — the kind
boundary (`ref.kind = spec.kind`; a mismatch rejects, no state change), then
commits `runtime_context ← ready(ref)` and continues into the SHARED
`activate_or_hold` fork (immediate → `activate` + the first dispatch;
deferred_kickoff → `WAITING(kickoff_pending)`); (4) the completion seam
is ORDERED-AFTER-COMMIT (C15) with two temporal paths — a provider
completing synchronously inside `provision()` (or before the attempt
concludes) is HELD until the START commit lands and released when the
attempt concludes; a provider completing AFTER the attempt concludes (the
normal async path) is delivered DIRECTLY — never lost to the pre-commit
correlation window and never delivered mid-attempt, never dropped; (5) `dispatch_intent` sets the packet's
`runtime_context` to `project_for_actor(ready_ref)` for the provisioned
path (the SAME pinned-template provider re-resolved as a kernel/config
INVARIANT throw when it fails — `registry-stable-for-the-run`) or to the
explicit value `none` for a context-free run, never the raw ref
(`projection-never-the-ref`); (6) the ch11-P3b interim start-input seam
(`runtimeContextRef`, `resolveWindowContext`, the CLI eager guard) is
RETIRED as a named replacement (C14), the ch11-C36 workspace-emptiness
backstop re-reading the REAL lifecycle field; and (7) the PRODUCTION
registry is EMPTY (C16) — a spec-declaring template is honestly
unstartable, and its unstartable PATH depends on the channel: a
FILE/CLI-authored spec map is refused AT ADMISSION as a P4-deferred
source form (the finding-6 guard, C25 — the YAML spec-map source-form
walk lands at P4, so a shipped-CLI spec map never reaches START), while a
DIRECT-constructed spec map (test-only at ch12; not shipped-CLI-authorable)
reaches START and is `Rejected(runtime_context_provider_unavailable)`
against the empty registry (S2, the unknown-provider trace variant);
either way the eager guard is replaced by the real machinery. The
testkit's scripted provider drives the provisioned path in the two golden
traces and dev `replay`. The
kernel guards kind + correlation ONLY; the locator and the projection
are provider-defined and never interpreted.

Dimensions (enumerated before test rows — R-DIMENSIONS):

1. **The provider port + registry** (PR family) — the `provision`/
   `project_for_actor` interface members; the static injected
   `ProviderRegistry.resolve`; the EMPTY production registry; the
   testkit scripted player.
2. **START's provider legs** (S family) — spec resolution, the
   pre-commit unresolved-provider reject, `provision` FIRST, the
   must-detach obligation (synchronous throw / pre-commit-rejecting
   ack = port breach), the `requested(request_id)` marker + STARTED
   fact atomic move, the CAS-restart fresh-request_id path.
3. **RUNTIME_CONTEXT_READY** (K family) — the rung ORDER (terminal-sink
   → correlation → transport gate → kind boundary), the `ready(ref)`
   commit, `activate_or_hold`, the inert rung-rejected events
   (duplicate / unsolicited / already-resolved / post-terminal).
4. **The ordered-after-commit completion seam** (SM family) — a
   synchronously-completing provider's READY held until the START
   commit; released when the attempt concludes; never lost, never
   delivered mid-attempt; the superseded-request inert path.
5. **The dispatch projection** (E family) — `project_for_actor` for
   the provisioned path (the re-resolve invariant throw), the explicit
   `none` for context-free, the raw ref never in the packet.
6. **The requirement value domain at admission** (R family) — the
   materialization (absent → `none`; spec map → `required(spec)`); the
   C2 LOUD migration refusal of the bare `required` string; the C5
   process-gate-without-context re-grammar.
7. **The C14 seam retirement** (W family) — the `runtimeContextRef`
   wire key, `resolveWindowContext`, the `runtimeContext: "required"`
   literal, the CLI eager guard; the backstop re-read of the real
   field; the measured consumer sweep.
8. **Types** (T family) — `RuntimeContextRequirement`,
   `RuntimeContextSpec`, `RuntimeContextProjection`, the
   `RuntimeContextProvider`/`ProviderRegistry` port types, the
   `ContextPacket.runtimeContext` field (non-optional); the packet
   value-ripple.
9. **The golden traces** (TR family) — the l0e provisioned-immediate
   trace + the unknown-provider + hostile-kind variants; the l0d
   deferred-hold + cancel trace with the scripted provider.
10. **Drift/coverage** (D family) — the five l0e unit flips, the seven
    l0e domain-registry flips, the co-owned l0d completions + the
    reciprocal shares, the invariant witnesses, ledger byte-identical.

There is NO new numeric-domain validator in this packet
(R-NUMERIC-LADDER does not fire): the requirement grammar (`kind`,
`provider` string shapes) is the C3 SOURCE-FORM walk staged to P4
(C25); at P3 the requirement is materialized on the direct-construction
channel where the spec is a constructed object, and the only new value
check — the ref's canonical-JSON transport gate — reuses the emit-lib
`isCanonicalizable` culture (P1b/P2), not a new ordered-domain
validator. The `kind`/`provider` string grammars are declared as a
PARAMETERIZED family (C3, owner: the ratified draft) whose SOURCE-FORM
lanes land at P4 — R-CLAIM-GRAMMAR PARAMETERIZED, not measured here.

## Canonical matrices

### P — the provider port + registry (`RuntimeContextProvider`, `ProviderRegistry`)

| Id | Rule | Class |
|---|---|---|
| PR1 | `RuntimeContextProvider` is a PORT interface (model-verbatim members): `provision(instanceId, requestId, spec): Promise<void>` — async, fire-and-forget from the kernel's view (the fulfillment is the DETACH ACKNOWLEDGMENT — the provider accepted and detached its async work — NEVER the completion; C18's pre-commit await targets exactly this), whose completion fires `RUNTIME_CONTEXT_READY(instanceId, requestId, ref)` through the in-process event seam; and `projectForActor(ref): RuntimeContextProjection`. It lives in `ports/` (ADR-014 — a kernel-only injected port; the kernel never branches on a concrete provider type, REV-E-NO-ADAPTER-BRANCH) (anchored: contract:ch12-runtime-core#C15, #C22 + prose:l0e-pseudocode/RuntimeContextProvider) |
| PR2 | `ProviderRegistry` is STATIC, INJECTED at the composition root, and PER-CHAPTER; `resolve(providerName): RuntimeContextProvider \| none` is a pure lookup. The PRODUCTION registry is EMPTY at ch12 (a DIRECT-constructed spec-declaring template — test-only at ch12 — is honestly unstartable at START: `Rejected(runtime_context_provider_unavailable)`, S2; a FILE/CLI-authored spec map never reaches START — its YAML source form is admission-refused as P4-deferred, the finding-6 guard/C25); `pairflow.worktree` joins at ch9 (bound by C15's production-provider gate — the failure→FAIL channel first). The registry is added to `KernelDeps` as ONE new REQUIRED injected dependency (the explicit-wiring culture) (anchored: contract:ch12-runtime-core#C16, #C22) |
| PR3 | The testkit ships `scriptedRuntimeContextProvider` (C22): it RECORDS `provision` calls, plays configured READY events (incl. the hostile kind-mismatch and the never-ready hold), and returns a configured `projectForActor` view; its registry name is test-chosen data under C3's provider grammar (`pairflow.worktree` in the l0e/l0d traces). It follows the `scriptedProcessGateRunner` player culture; the testkit imports ports/domain/emit at most (ADR-005 unchanged) (anchored: contract:ch12-runtime-core#C22, #C16) |
| PR4 | The ref and the projection are CANONICAL-JSON-SAFE VALUES BY PORT CONTRACT (finite, acyclic, plain data — C15): a violating provider return is a kernel/config INTEGRITY throw, fail-closed, RAISED at the value's OWN gate — the READY ref at the transport gate (K family), the projection at the `projectForActor` RETURN (E family). The kernel never stores or projects a lossy value (anchored: contract:ch12-runtime-core#C15, #C17) |

### S — START's provider legs (the spec path — completing `l0d-pseudocode/START`)

| Id | Rule | Class |
|---|---|---|
| S1 | START, after the single-shot admission (P1b L2: op_id rung + the bare-REQUIRE `kernelStatus = CREATED ∧ runtimeContext.state = "none"` state rung), loads the pinned template and reads the MATERIALIZED `requirement` from the admission-normalized field (`resolveRuntimeContextRequirement(template.runtimeContext)` — a total view over the non-absent admitted domain, T1/R1; NOT a re-derivation), replacing the interim `resolveWindowContext` read of the ch11 string (W1); the `none` branch is P1b's unchanged (`ready(∅)` + STARTED + `activate_or_hold`) (anchored: prose:l0e-pseudocode/START + contract:ch12-runtime-core#C18 none-lane, #C14) |
| S2 | The spec branch: `provider ← providerRegistry.resolve(requirement.spec.provider)`; an UNRESOLVED name → `Rejected(runtime_context_provider_unavailable)` PRE-COMMIT — NO `requested` marker, NO STARTED fact, the `op_id` NOT consumed (a corrected retry may reuse it); this is the behavioral birth of the rejection (`provider-resolved-at-start`) (anchored: contract:ch12-runtime-core#C18 spec-lane, #C16 + prose:l0e-pseudocode/START + prose:ledger §2 l0e/provider-resolved-at-start + prose:ledger §3 runtime_context_provider_unavailable) |
| S3 | A resolved provider → `provision(instance.id, request_id, requirement.spec)` FIRST (an external async call, necessarily OUTSIDE any store transaction — the model's order), then `runtime_context ← requested(request_id)` (`request_id ← new_request_id()`) + the `STARTED { op_id }` fact committed in ONE atomic move via `commitLifecycle` (`newRuntimeContext: requested(request_id)`, the P1b F1 member), returning `Accepted` (the dispatch arrives later on the async readiness path) (anchored: contract:ch12-runtime-core#C18 + prose:l0e-pseudocode/START + contract:ch12-runtime-core#C15) |
| S4 | The `provision` call's failure surface splits at the commit boundary (C18 must-detach obligation): `provision` MUST detach without throwing — a SYNCHRONOUS throw, OR the AWAITED detach acknowledgment settling REJECTED before the commit, is a PORT BREACH — aborting START PRE-COMMIT as a kernel/config integrity throw (fail-loud, NO state change, the `op_id` unconsumed, a corrected composition may retry). A failure AFTER detach is the post-commit no-channel Absent (C15: the run stays `CREATED` + `requested`, floor-visible + cancellable via CANCEL); nothing at ch12 fires `FAIL` for a provider (anchored: contract:ch12-runtime-core#C18, #C15) |
| S5 | The CAS-conflicted commit RESTARTS from load (P1b L9); the single-shot state guard re-admits only if the marker never committed — a re-run then provisions AGAIN under a FRESH `request_id`, the superseded request's READY failing correlation (inert, K3). Duplicate provisioning across that crash/retry window is the DELIBERATE provider-side cost (teardown the named Absent), never a kernel-state hazard (anchored: contract:ch12-runtime-core#C18) |

### K — RUNTIME_CONTEXT_READY (the new kernel event handler)

| Id | Rule | Class |
|---|---|---|
| K1 | RUNTIME_CONTEXT_READY is a KERNEL EVENT — no external ingress endpoint (C13); it fires in-process through the completion seam (SM family) and tests drive it directly through the kernel entry. It is wired into RECEIVE beside `fail` (the P1b `kernel_event` class): the `Kernel` interface gains `runtimeContextReady(instanceId, requestId, ref)` and the dispatch table wraps it via `lifecycleOp` exactly as `fail` is wired — the `l0d-pseudocode/RECEIVE` `kernel_event → RUNTIME_CONTEXT_READY` dispatch leg P1b deferred (anchored: prose:l0d-pseudocode/RECEIVE + contract:ch12-runtime-core#C13 + prose:l0e-pseudocode/RUNTIME_CONTEXT_READY) |
| K2 | The checks run in ONE ORDER (C18): the ADMISSION rungs FIRST — the terminal-sink STATE rung (`kernel_status ≠ TERMINAL` — the ratified model fix `76e34413`, mirroring FAIL: a late READY after CANCEL/FAIL must not resurrect the run), then the CORRELATION rung (`runtime_context = requested(request_id)` — the readiness for the request WE issued); a rung-rejected event mutates NOTHING and the later checks never run (a bare-REQUIRE guard rejection). THEN the ref's TRANSPORT gate (canonical-JSON-safety, PR4 — breach = integrity throw), THEN the `requirement = required(spec)` BIND (the verbatim unit's `REQUIRE requirement = required(spec)` — a made-explicit integrity guard that ALSO binds `spec` before `spec.kind` is read; the K2/K4 split is a matrix decomposition, so a build binds `spec` via the `required(spec)` destructure at THIS point, not after the kind check), THEN the ONLY business validation: the kind boundary `ref.kind = spec.kind` — a MISMATCH is a bare-REQUIRE guard rejection, NO state change, the ref NOT accepted; the LOCATOR is provider-defined and NEVER validated (`kind-boundary-only`) (anchored: contract:ch12-runtime-core#C18, #C15 + prose:l0e-pseudocode/RUNTIME_CONTEXT_READY + prose:ledger §2 l0e/kind-boundary-only) |
| K3 | A DUPLICATE, UNSOLICITED, or ALREADY-RESOLVED READY event fails the correlation rung (`runtime_context = requested(request_id)` no longer holds — the state is `none`, `ready`, or `requested` of a different id) and mutates NOTHING; a READY reaching a TERMINAL instance fails the terminal-sink rung. Correlation is the SAFETY, not provider discipline (C15) — each drives a K-family lane (anchored: contract:ch12-runtime-core#C15, #C18 + prose:l0e-pseudocode/RUNTIME_CONTEXT_READY) |
| K4 | An ACCEPTED readiness: `REQUIRE requirement = required(spec)` (a request was issued ⇒ a context is required — made explicit, a bare-REQUIRE integrity guard), then commits `runtime_context ← ready(ref)` and continues into `activate_or_hold` (the SAME shared fork as the none path): `required + immediate` → `activate` (the first dispatch leaves the READY commit); `required + deferred_kickoff` → `WAITING(kickoff_pending)` + `Accepted`. All four requirement × mode cells are thereby stated (none × {immediate, deferred} at S1/P1b L2; spec × {immediate, deferred} here) (anchored: contract:ch12-runtime-core#C18 + prose:l0e-pseudocode/RUNTIME_CONTEXT_READY + prose:l0e-pseudocode/activate_or_hold) |

### SM — the ordered-after-commit completion seam (C15)

| Id | Rule | Class |
|---|---|---|
| SM1 | The completion seam is ORDERED-AFTER-COMMIT (C15, DECIDED HERE in the draft — the model's "async → later fires" strengthened into a binding composition-seam rule): the composition delivers a READY completion into RUNTIME_CONTEXT_READY only AFTER the provisioning START's atomic commit has landed. The seam has TWO temporal paths (both ordered-after-commit; SM2's never-dropped covers both): (a) a completion RACING the pre-conclusion window — a provider completing SYNCHRONOUSLY inside `provision()` (the scripted player may), or asynchronously BEFORE the START attempt concludes — is HELD by the seam, never lost to the pre-commit correlation window (`runtime_context` still `none` would reject it), and released at conclusion (SM2); (b) a completion arriving AFTER the START attempt has CONCLUDED — the NORMAL async path, the commit ALREADY landed — is delivered DIRECTLY into RUNTIME_CONTEXT_READY, not held (correlation matches on the committed marker, or inert-rejects for a superseded id). The hold exists ONLY for path (a); path (b) is the common case (a real provider provisions asynchronously and fires READY long after START returns) (anchored: contract:ch12-runtime-core#C15) |
| SM2 | The hold's RELEASE rule: a held completion releases when the initiating START attempt CONCLUDES — either its commit landed (delivery proceeds, correlation matches) or the attempt failed/was superseded (delivery still proceeds and the correlation rung rejects it, inert); a held completion is NEVER dropped silently and NEVER delivered mid-attempt. The seam's HOLD/enqueue returns to the provider IMMEDIATELY (holding never blocks the completion call), so no circular wait exists with C18's detach-acknowledgment await (anchored: contract:ch12-runtime-core#C15) |
| SM3 | The seam's BINDING property (entailed by SM1/SM2) is CONCLUSION-SIGNALLED DELIVERY: a held completion is delivered ONLY when the initiating START attempt CONCLUDES (commit-landed, or failed/superseded) — NOT on any event-loop scheduling primitive. The EXCLUDED anti-pattern is a `queueMicrotask`/`setTimeout` delivery, because a provider completing synchronously inside `provision()` posts its READY while START's own post-`await` continuation (which runs `commitLifecycle`) is still queued behind it — a microtask FIFO would deliver READY BEFORE the `requested(request_id)` marker commits, and the correlation rung (still `none`) would reject it, LOSING the completion (the exact hazard SM1 forbids). The REFERENCE realization is an explicit per-`request_id` in-memory buffer flushed at the attempt's conclusion; any conclusion-gated EQUIVALENT (e.g. a per-`request_id` latch/promise resolved at `concludeAttempt`) is admissible PROVIDED delivery is triggered ONLY by attempt-conclusion — the constraint is the property, not the data structure. What is FORECLOSED is only the scheduling-based delivery: it satisfies neither SM1 nor SM2 and would rest on event-loop ORDERING substrate this packet deliberately does not stand on (reconciling the "no substrate probe required" line — a conclusion-signalled delivery is deterministic in-memory, the microtask variant is the excluded substrate dependency). The buffer/delivery is a COMPOSITION-INJECTED seam (C15's "the composition delivers"; ADR-014's port-injection culture — injected into the kernel like the registry, the store uninvolved — Mutable-flow record); only the CONCLUSION SIGNAL is kernel-originated: the `request_id` is minted inside `start` and NOT surfaced on `StartOutcome`, so `start` signals `concludeAttempt` at EACH provisioning attempt's conclusion. The TWO-PATH realization (SM1): the seam carries a `concluded` SET, marked at `concludeAttempt` BEFORE the buffer flush — a completion arriving while the id is UN-concluded is BUFFERED (path a, flushed at `concludeAttempt`); a completion arriving after the id is CONCLUDED is delivered DIRECTLY (path b — `deliverCompletion` invokes the RUNTIME_CONTEXT_READY handler, DETACHED so it returns to the provider IMMEDIATELY per SM2, the commit already landed so correlation matches or inert-rejects). The detached direct deliveries are tracked for a DRAIN (`Kernel.settleRuntimeContextDeliveries()` awaits every in-flight direct delivery and RETURNS their outcomes — a delivered-inert completion yields `{ignored}`, a dropped one yields nothing: the fail-able distinction SM2 needs; a real shutdown drains before teardown). The release TRIGGER is PER-ATTEMPT (C15/C18: a held completion releases when ITS initiating attempt concludes — commit-landed, failed, or SUPERSEDED), not per-`start`-call: on the CAS-restart (S5) a superseded `request_id`'s attempt CONCLUDES at the restart, and its buffered completion is released (inert by correlation, K3) THERE — at supersession, as the per-attempt trigger requires, BEFORE the next attempt provisions. The call-end `try/finally` over the restart loop is ONLY the leak-proof BACKSTOP — it flushes any minted id NOT already released at its own attempt's conclusion (the terminal committed/failed attempt, and a defensive net against an early throw), never the primary release for a superseded id. The post-provision exits `concludeAttempt` covers (the `try/finally` over the restart loop flushes EVERY minted id on each): `committed`, `duplicate_op`, `op_id_collision`, a THROWING `commitLifecycle` (a store-port rejection — the `finally` covers it), and the S4 `provision` port-breach throw; one `start` call may mint MULTIPLE `request_id`s (the S5 CAS-restart re-provisions under a fresh id), each buffered and each released at its own attempt's conclusion (the superseded id delivers-and-fails-correlation, inert — K3) (derived: contract:ch12-runtime-core#C15, #C18 + prose:ADR-014 composition-injected seam — DERIVATION: C15's FIVE observable rules (held, released-on-conclude, never-lost, never-mid-attempt, immediate-return) FORECLOSE the scheduling realization — a microtask post loses the pre-commit completion, so CONCLUSION-SIGNALLED DELIVERY is entailed (the property, not a specific data structure — an explicit buffer is the reference representation, a conclusion-gated latch an equivalent; the D1-grain representation choice is the build's); the request_id conclusion signal and the multi-id CAS-restart flush are S5/C18's own arithmetic) |

### E — the dispatch projection (`project_for_actor` — completing `l0e-pseudocode/dispatch_intent`)

| Id | Rule | Class |
|---|---|---|
| E1 | `deriveDispatchIntent` sets `packet.runtimeContext`: `runtime_context = ready(∅)` → the explicit value `none`; a provisioned `runtime_context = ready(ref)` → `providerRegistry.resolve(spec.provider).projectForActor(ref)`. The function gains a `providerRegistry` parameter, THREADED from BOTH its call sites (`kernel/lifecycle.ts#activate` — a `LifecycleDeps`-scoped function reached from `start`/`kickoff`/`runtimeContextReady` — and `kernel/kernel.ts#handleOnce`; so `LifecycleDeps` gains `providerRegistry` beside `KernelDeps`'s (T3), both in the boundary; `projectForActor` is synchronous per PR1, so `deriveDispatchIntent` stays sync). The field is NON-OPTIONAL and ALWAYS present — the actor sees the projection OR an explicit `none`, NEVER the raw ref and never an absent field (`projection-never-the-ref`) (anchored: contract:ch12-runtime-core#C17 + prose:l0e-pseudocode/dispatch_intent + prose:ledger §2 l0e/projection-never-the-ref) |
| E2 | The provisioned path re-resolves the SAME pinned-template provider; a failed re-resolve is a kernel/config INVARIANT throw (`registry-stable-for-the-run`), NOT a business rejection — a provider used by an active instance stays resolvable for the life of the run (the dispatch `REQUIRE`). The projection is carried OPAQUELY (kind-specific, provider-owned shape — the model's worktree example `{workspace: {path, branch, repo}}` is the ch-9 provider's business); its canonical-JSON-safety is gated at the `projectForActor` RETURN (PR4) (anchored: contract:ch12-runtime-core#C16, #C17 + prose:ledger §2 l0e/registry-stable-for-the-run) |

### R — the requirement value domain at admission (C2/C3/C4/C5 — the direct-construction channel, C25)

| Id | Rule | Class |
|---|---|---|
| R1 | The requirement is MATERIALIZED ONCE AT ADMISSION (C4's binding order — the ch11-C14/C17 no-absent-state-downstream culture): `admitTemplate` REFUSES the illegal bare `required` form LOUD (R2) AND normalizes the authored value so the ADMITTED template CARRIES the requirement — an ABSENT `runtimeContext` key OR the authored string `none` → the `none` requirement, a spec map → `required(spec)` — with NO absent requirement state downstream (C4: "the admitted template carries `none` or the normalized spec"). The mechanism is the ratified activation/agentConfig precedent — `admit.ts`'s `activation: template.activation ?? { mode: "immediate" }` NORMALIZES a value at admission WITHOUT transforming the field's shape; the identical move applies here (`absent → none`), so admission stays in its "normalize value, keep shape" role (T1). START and `deriveDispatchIntent` READ the materialized requirement (`resolveRuntimeContextRequirement` is a TOTAL map over the already-normalized admitted domain — the type-level belt, structurally non-absent on admitted values, the G3 culture), never re-deriving it from an absent field. The VALUE-LEVEL semantics land on the DIRECT-construction channel now (the golden traces direct-construct THROUGH admission); the YAML SOURCE-FORM walk (the key grammar, path-addressed findings, CLI validate) stays P4 (C25's staging) (anchored: contract:ch12-runtime-core#C2, #C4, #C25) |
| R2 | The bare STRING `runtimeContext: "required"` (the retired ch11 form) fails admission LOUD with the migration text "author the spec map `{kind, provider, config?}`" (the §8.2 rule 3 MECHANIC; the AUTHORITY is the ratification act on the reopened rows — C2/C26). This VALUE-LEVEL refusal lands at P3 WITH the requirement machinery (C25's staging), CO-LANDING with the C14 CLI eager-guard retirement (W3): a `required`-declaring template is thereby UNSTARTABLE at every window point — the ch11 guard through P2, the migration refusal from P3 (anchored: contract:ch12-runtime-core#C2, #C25, #C24) |
| R3 | The spec map is FIXED-KEYSET (C3): `kind` (required), `provider` (required), `config` (OPTIONAL map, raw pass-through provider-owned — it survives the document-wide ch8 C1–C6 gates + C5 acyclicity and is otherwise uninterpreted). At P3 the spec arrives as a CONSTRUCTED object on the direct-construction channel; the `kind`/`provider` STRING GRAMMARS (`^[a-z][a-z0-9_]*$` / the ch11-C6 dotted evaluator-id) are a PARAMETERIZED family (owner: the ratified draft C3) whose SOURCE-FORM lanes land at P4 — R-CLAIM-GRAMMAR PARAMETERIZED, not measured here (anchored: contract:ch12-runtime-core#C3, #C25) |
| R4 | The C5 process↔workspace cross-rule re-grammar: a template declaring ANY `external.process` gate whose requirement RESOLVES to `none` (authored `none` or absent) yields `runtime_context_required_for_process_gate` — the trigger now reads the REAL requirement (a process gate needs a provisionable workspace; only a spec map provisions). This lane is a DEPENDENT of a LEGAL requirement: an ILLEGAL `runtimeContext` value fires ONLY its own container finding (this lane suppressed, ch8-C21). ORDER is load-bearing: the illegal-value detection (R2's refusal) precedes any belt-based C5 resolution — a process-gated illegal value emits the R2 container finding, never a belt throw (the belt's residual `"required"` arm is a structurally-dead integrity throw, the G3 dead-belt precedent, unreached because R2 refuses it first). The existing `admit_definition` `requiresRuntimeContext` mechanism re-reads the resolved requirement (anchored: contract:ch12-runtime-core#C5 + prose:ledger §3 runtime_context_required_for_process_gate) |
| R5 | The ch11-C36 workspace-emptiness backstop (`kernel.ts` — a process gate reached at RUNTIME with a non-ready or null-ref context → `Rejected(runtime_context_required_for_process_gate)`) re-reads the REAL lifecycle field UNCHANGED in mechanism: `ready(∅)` = `{state:"ready", ref:null}` = the context-free run's trivially-ready state, and a process gate reached THERE still rejects (ref null). The mechanism is byte-unchanged; only the field it reads is now the real `RuntimeContext` (C14) (anchored: contract:ch12-runtime-core#C14, #C5) |

### W — the C14 seam retirement (the ch11-P3b start-input reconciliation)

| Id | Rule | Class |
|---|---|---|
| W1 | The interim `resolveWindowContext(template, ref)` helper + the `StartInput.runtimeContextRef` field (P1b's L3 window carrier) RETIRE: the four `resolveWindowContext` lanes are REPLACED by the real requirement branch (S1–S4). `template.runtimeContext: "required"` (the ch11 literal, `domain/template.ts`) → the real `RuntimeContextRequirement` type (T1). The retired value's CONSUMERS are enumerated by name (R-ABSENCE-CONSUMERS): `runtimeContextRef`, `resolveWindowContext`, the `runtimeContext: "required"` literal — the sweep re-runs UNTRUNCATED at build with a required end state of ZERO consumers outside this packet's own probes/comments (anchored: contract:ch12-runtime-core#C14, #C24 + prose:R-ABSENCE-CONSUMERS) |
| W2 | The `runtimeContextRef` WIRE KEY retires from the ingress `start` intent keyset (P1b I2's interim carrier): `ingress/ingress.ts` drops the key from the allowed set, the destructure, the `invalid_runtime_context_ref` empty-string lane, and the passthrough; the `IngressDetailToken` `invalid_runtime_context_ref` member retires WITH it (its only producer). A `start` intent carrying `runtimeContextRef` is now an UNKNOWN-KEY rejection (the fail-closed ingress culture) (anchored: contract:ch12-runtime-core#C14, #C24 + prose:P1b I2 interim carrier) |
| W3 | The CLI `runtimeContext: "required"` EAGER unstartable guard (`cli/main.ts` — the Y6 pre-check throwing `usage("StartFailed", …)`) RETIRES; a spec-or-`required`-declaring template is now refused by the KERNEL's own lanes — a residual `required` string by the R2 admission migration refusal, and a FILE-authored spec map (the only shipped-CLI form) by the admission P4-DEFERRED source-form refusal (the finding-6 guard, C25 — its YAML source form is not yet handled, so it never reaches START); a DIRECT-constructed spec map (not shipped-CLI-authorable at ch12) would reach START's `runtime_context_provider_unavailable` against the EMPTY production registry (C16, S2) — replacing the eager guard with the real machinery (C24: no retired surface survives as a parallel path) (anchored: contract:ch12-runtime-core#C24, #C16, #C2) |
| W4 | The trace-harness CONTRACT re-bases (testkit): the `HarnessStartOpInput.runtimeContextRef` passthrough + the `TraceStep` start-step key + the `seams.start` forwarding RETIRE (W1's mirror); the dev CLI replay fixture-schema validator drops the `runtimeContextRef` start-step key WITH the contract (the P1b W3 precedent — the keyset shrinks, usage-2 refusals updated; no verb/flag semantics change). The dev `replay` root gains the SCRIPTED provider registry (C19: dev `replay` is where the provisioned path is drivable pre-ch9) (derived: contract:ch12-runtime-core#C14, #C19 + prose:built traceHarness contract — DERIVATION: the seam retirement is the mechanical mirror of W1's symbol removals; the dev scripted registry is C19's "the provisioned path is drivable pre-ch9, via the scripted provider" made concrete at the dev composition root) |

### T — the types

| Id | Rule | Class |
|---|---|---|
| T1 | `RuntimeContextRequirement = { state: "none" } \| { state: "required"; spec: RuntimeContextSpec }` and `RuntimeContextSpec = { kind: string; provider: string; config?: Readonly<Record<string, unknown>> }` land in `domain/template.ts`, exported through `domain/index.ts`. THE ADMISSION-NORMALIZE SEAM (the activation `?`-belt precedent, ch12-P1b G3 / ch11 — normalize value, keep shape): the RAW `WorkflowTemplate.runtimeContext` broadens from `"required" \| undefined` to `RuntimeContextSpec \| "none" \| "required" \| undefined` (the window's AUTHORED domain: a directly-constructed spec map, the authored string `none` (C2), the retired ch11 `required` string (to be REFUSED), or absent). `admitTemplate` MATERIALIZES the requirement ONCE AT ADMISSION (C4): it REFUSES the bare `"required"` string LOUD (R2) and NORMALIZES the survivors so the ADMITTED field carries a NON-ABSENT value — `absent → "none"` (absent ≡ authored `none`, C4), a spec map kept — exactly the activation move (`activation: template.activation ?? { mode: "immediate" }`) applied to a value, NOT a shape transform (so admission stays in its "normalize value, keep shape" role; the shared-brand `AdmittedTemplate = WorkflowTemplate & brand` keeps ONE field, no per-stage type, and validate.ts's SOURCE-FORM walk stays P4, C25/R3, untouched — the authored form it emits is normalized AT admission, not before). A SUCCESSFULLY-ADMITTED template's field is therefore ∈ { `"none"`, `RuntimeContextSpec` } — NO absent state downstream. START and `deriveDispatchIntent` READ the materialized value through `resolveRuntimeContextRequirement` (`"none" → {state:"none"}`, a spec → `{state:"required", spec}`) — a TOTAL map over the already-normalized admitted domain returning the discriminated-union VIEW; its residual `undefined` arm is the structurally-dead type-level belt (the G3 `activation ?? immediate` culture, "kept as the type-level belt"), never the first materialization point (derived: contract:ch12-runtime-core#C2, #C3, #C4, #C25 + prose:l0e-pseudocode/START + prose:ch12-P1b G3 activation-belt — DERIVATION: the discriminated union is the minimal faithful image of C2's `none \| required(spec)`; the MATERIALIZATION POINT is FIXED to admission by C4 ("materialized once at admission; the admitted template carries `none` or the normalized spec — no absent state downstream") and realized via the ratified activation/agentConfig ADMISSION-NORMALIZE precedent (`admit.ts` fills the default value at admission while the shared type + a structurally-dead read belt carry the type-level residue) — the value-normalize move keeps `admitTemplate` in its ratified "normalize value, keep shape" role, so it neither transforms shape nor drags the P4 source-form walk forward; the `resolveRuntimeContextRequirement` view over the non-absent admitted domain is the read-time convenience, not the materialization) |
| T2 | `RuntimeContextProjection` is a BRANDED OPAQUE type (the codebase `AdmittedTemplate` idiom, `domain/template.ts:140` — `declare const projectionBrand: unique symbol; export type RuntimeContextProjection = { readonly [projectionBrand]: true }`): a NOMINAL type produced ONLY by `projectForActor` (its impl casts its return), carrying NO value-domain constraint at runtime — the unique-symbol brand is a compile-time TYPE EXPRESSION, ERASED at runtime (the `AdmittedTemplate` "not a runtime mechanism" precedent), so any canonical-JSON-safe value the provider returns is admissible (NON-narrowing; C15's value-safety is the RUNTIME `isCanonicalizable` gate at the `projectForActor` RETURN, PR4/E2, never the static type). The brand makes the type DISTINCT from `RuntimeContextRef` (`{kind, locator}`, UNBRANDED), which is exactly what GENUINELY type-enforces `projection-never-the-ref` (D3, the disposition-map `type/schema`): a raw ref is NOT assignable to `RuntimeContextProjection`, so `packet.runtimeContext ← ref` is a COMPILE ERROR — a STRUCTURAL type (`Record<string, unknown>` OR `unknown`) does NOT catch this (a `{kind, locator}` ref is assignable to both), so the brand is what makes the ratified `type/schema` disposition real. The type lands in `domain/` and is exported; `RuntimeContextRef` (`domain/instance.ts`, `{kind, locator}`) is witnessed. `ContextPacket` gains `runtimeContext: RuntimeContextProjection \| "none"` (non-optional — E1): the value is the branded projection OR the literal `"none"`, NEVER the raw ref (compile-enforced) and never absent (derived: contract:ch12-runtime-core#C17, #C15 + prose:l0e-pseudocode/dispatch_intent + prose:invariant-disposition-map l0e/projection-never-the-ref (type/schema) + prose:AdmittedTemplate brand idiom (`domain/template.ts`) — DERIVATION: the disposition map RATIFIES `projection-never-the-ref` as `type/schema`, which a structural projection type CANNOT deliver (a `{kind, locator}` ref is assignable to both `Record<string, unknown>` and `unknown`), so the FAITHFUL realization is the codebase's declared-unique-symbol brand — a nominal opaque type, NON-narrowing on the value domain (brand erased at runtime, value-safety at the PR4 `isCanonicalizable` gate) yet compile-time DISTINCT from `RuntimeContextRef`; the `"none"` literal is the model's explicit context-free value) |
| T3 | The `RuntimeContextProvider` + `ProviderRegistry` port types land in `ports/runtimeContextProvider.ts` (exported through `ports/index.ts`); `KernelDeps` (`kernel/kernel.ts`) gains `providerRegistry: ProviderRegistry` as ONE new REQUIRED injected member (P2), and `LifecycleDeps` gains it too (the `activate`/`start` scope reaches `projectForActor` via `deriveDispatchIntent` — E1). The kernel never branches on a concrete provider type (REV-E-NO-ADAPTER-BRANCH) (anchored: contract:ch12-runtime-core#C15, #C16, #C22) |
| T4 | The `ContextPacket.runtimeContext` VALUE-RIPPLE (the P2 `effectiveAgentConfig` precedent): every FULL-EQUALITY `packet: {…}` consumer re-bases its expected literal to carry `runtimeContext: "none"` (the context-free default — a VALUE-ripple the compiler does NOT catch on `toEqual`); the measured set (searched by the `packet: {` literal, not only the type — R-ABSENCE-CONSUMERS) re-runs UNTRUNCATED at build. Every existing trace/journey/CLI packet literal is context-free, so each gains `runtimeContext: "none"` (derived: prose:R-ABSENCE-CONSUMERS + contract:ch12-runtime-core#C17 — DERIVATION: the added-field value-ripple is searched by the `packet: {` literal exactly as P2's `effectiveAgentConfig` ripple was; the `toMatchObject` readers are additive-safe) |

### D — drift + coverage

| Id | Rule | Class |
|---|---|---|
| D1 | Unit-map flips at build (the five l0e units + the two co-owned l0d completions): `l0e-pseudocode/RuntimeContextProvider` → `v3/src/ports/runtimeContextProvider.ts#createStaticProviderRegistry` (implement — the port interface + the registry factory + the testkit player realize the unit; the codeRef anchors the registry, the port interface being a type-witness in domainRegistry); `l0e-pseudocode/RUNTIME_CONTEXT_READY` → `v3/src/kernel/lifecycle.ts#runtimeContextReady` (implement); `l0e-pseudocode/activate_or_hold` → `v3/src/kernel/lifecycle.ts#activateOrHold` (implement — the extracted shared helper); `l0e-pseudocode/START` → `v3/src/kernel/lifecycle.ts#start` (alias/inherited — the provider legs complete the co-owned l0d-START realization); `l0e-pseudocode/dispatch_intent` → `v3/src/kernel/dispatchIntent.ts#deriveDispatchIntent` (alias/inherited — the projection leg in the shared home whose implement claimant is l0d-dispatch_intent); the co-owned `l0d-pseudocode/START` (`#start`) and `l0d-pseudocode/RECEIVE` (`#createKernel`) stay `implement`, their codeRefs UNCHANGED (P1b's), the READY dispatch leg completing RECEIVE. The ledger is BYTE-IDENTICAL; drift lanes green before AND after — any movement is a STOP (derived: plan §12.2 + prose:unitMap fold-chain culture (l0c-into-l0d alias) + ADR-014 — DERIVATION: the three implement homes are genuinely-new symbols; the two alias rows follow the established fold encoding for a version whose semantics live in a shared realized symbol; the `#createStaticProviderRegistry` pick is a defended semantics-free spelling for a bundled port+registry+player unit, the D1-grain representation class) |
| D2 | domainRegistry `l0e/*` flips pending → realized (7): `l0e/RuntimeContextProvider` → the port interface, `l0e/ProviderRegistry` → the registry type, `l0e/RuntimeContextProjection` → the projection type, `l0e/RuntimeContextRef` → the existing `RuntimeContextRef` (witnessed — the l0d ref reused at l0e per ledger §4 "RuntimeContextRef (value, from L0d)"), `l0e/RuntimeContextRequirement` → the requirement type (the kernel-read view, T1), `l0e/Template` → the `runtimeContext` raw field (typed `RuntimeContextSpec \| "none" \| "required" \| undefined`, T1), `l0e/ContextPacket` → the `runtimeContext` projection field — each a realized `import type` WITNESS added to the `RealizedTypeTable` region (typecheck owns EXISTENCE), the name-reuse rows (`Template`/`ContextPacket`/`RuntimeContextRef`) following the established multi-level witness convention. Ledger §4 l0e names 8 entities: these 7 TYPE witnesses + `Rejected(runtime_context_provider_unavailable)` — the 8th is the REJECTION, already realized in domainRegistry as a `domain/rejections.ts` registry member (this packet makes it BEHAVIORAL — the S2 lane, the rejections-axis flip — not a `RealizedTypeTable` type witness); `RuntimeContextSpec` (T1) is a sub-shape of `RuntimeContextRequirement`, not a separate ledger §4 entity, so it takes no standalone witness row (anchored: prose:ledger §4 l0e (8 entities) + contract:ch12-runtime-core#C15, #C17) |
| D3 | Invariant witnesses realized per the ch-5 disposition map: `context-is-optional` / `requirement-is-template-owned` / `kind-boundary-only` / `projection-never-the-ref` (type/schema — the `RuntimeContextRequirement` union renders `context-is-optional`/`requirement-is-template-owned` at the type; the BRANDED `RuntimeContextProjection` (T2, distinct from the unbranded `RuntimeContextRef`) makes `packet.runtimeContext ← ref` a COMPILE ERROR, genuinely rendering `projection-never-the-ref` at the type; the kind-guard type renders `kind-boundary-only`), `provider-resolved-at-start` (test — S2's pre-commit reject lane), `registry-stable-for-the-run` (test — E2's re-resolve invariant throw lane) (anchored: prose:invariant-disposition-map l0e rows + prose:ledger §2 l0e) |

## Mirrored surface map (one canonical statement per rule)

- The MUST-DETACH obligation is canonical in S4; mirrors: Claim §2,
  S3's provision-first clause, PR1's detach-acknowledgment definition,
  the In-context notes, the Sizing Mutable-flow record.
- The ORDERED-AFTER-COMMIT completion seam is canonical in SM1/SM2 (the
  FIVE observable rules — held, released-on-conclude, never-lost,
  never-mid-attempt, immediate-return) with its TWO temporal paths
  (held pre-conclusion / delivered-direct post-conclusion — SM1) and SM3
  the realization constraint (the `concluded` set + the direct-delivery
  drain); mirrors: Claim §4, the In-context notes, the Sizing
  Mutable-flow record.
- The RUNG ORDER (terminal-sink → correlation → transport →
  required(spec) bind → kind boundary) is canonical in K2; mirrors:
  Claim §3, K3's correlation-reject family, K4's accepted-readiness.
  PARTIAL/FROZEN mirrors (not kept fully in sync by design): the
  RUNTIME_CONTEXT_READY operative unit is VERBATIM (no transport-gate
  step — that gate is a packet-added PR4/C15 guard, not a model rung),
  and the golden traces are ABBREVIATED (the l0e trace shows the
  transport gate, the l0d trace omits it).
- The EMPTY production registry (C16) is canonical in PR2; mirrors:
  Claim §7, W3's eager-guard-retirement clause, the In-context notes.
- The `ContextPacket.runtimeContext` FIELD (projection-or-explicit-none,
  non-optional, never the raw ref) is canonical in E1; mirrors: Claim
  §5, T2, T4's value-ripple.
- The REQUIREMENT materialization + the C2 migration refusal are
  canonical in R1/R2; mirrors: Claim §1, T1, the R5 backstop clause.
- The ADMISSION-NORMALIZE template seam (raw authored field on
  `WorkflowTemplate`; `admitTemplate` normalizes so the admitted template
  carries the non-absent requirement — materialized ONCE AT ADMISSION per
  C4; `resolveRuntimeContextRequirement` is the read-time total view over
  that normalized value) is canonical in T1; mirrors: R1's materialization
  rule, S1's requirement read, E1's dispatch read.
- The `ready(∅)` vs `ready(ref)` ∅-encoding (`ref: null` = context-free)
  is canonical in the In-context notes (C11); mirrors: S1's none path,
  E1's projection fork, K4's ready(ref) commit.

Fold policy: a change to a canonical row updates EVERY named mirror
before handing back; a mirror discovered in review is ADDED here, never
re-discovered next round.

## In-context notes (the scarce budget)

- The provider is a NAMED, core-adjacent fulfiller: the kernel owns
  the CONTRACT (resolve → provision → correlated kind-guarded READY →
  projection), the provider owns the MECHANICS (git branch/worktree/
  clone — ch9's real provider). The kernel never reads inside the
  locator or the projection; kind + correlation are the ONLY guards.
- `provision` returns a promise whose FULFILLMENT is the DETACH
  ACKNOWLEDGMENT — the provider accepted and detached its async work —
  NEVER the completion. The kernel awaits the detach ack pre-commit
  (C18); the completion (READY) arrives LATER through the seam. Two
  timing cases (SM1): a scripted player completing synchronously inside
  `provision()` is HELD by the seam until the START commit lands, while
  the normal case — a completion firing AFTER START concludes — is
  delivered DIRECTLY (the commit already landed); the test provider
  exercises BOTH (the synchronous timing hazard AND the post-conclusion
  async delivery, finding 1's regression lane).
- The PRODUCTION registry is EMPTY at ch12 (C16) — this is the honest
  chapter boundary, not a gap: wiring the testkit player into
  production would breach ADR-005 and fake a capability ch12 does not
  ship. A FILE/CLI-authored spec map is unstartable via the admission
  P4-deferred refusal (finding-6/C25 — its YAML source form is P4's); a
  DIRECT-constructed spec map (test-only) hits START's
  `runtime_context_provider_unavailable` against the empty registry (S2);
  `pairflow.worktree` joins at ch9 under C15's production-provider gate
  (the failure→FAIL channel first).
- The l0e golden-trace Config view authors `provider: pairflow.worktree`
  while the production registry is empty: the trace's TEST registry
  registers the scripted provider under that name (registry names are
  test-chosen data, C16). The builder reconciles this deliberately,
  never by renaming the trace.
- The `requested`/`ready(ref)` encodings ALREADY live in the store
  (`encodeRuntimeContext`/`decodeRuntimeContext`, P1a) — this packet
  writes them via the existing `commitLifecycle` `newRuntimeContext`
  member; NO store production change, the store TEST gains the
  round-trip lanes.
- `ready(∅)` (the context-free trivially-ready state) stores `ready`
  with `ref: null`; the packet projection is `none`. A provisioned
  `ready(ref)` stores the opaque `{kind, locator}`; the packet
  projection is `projectForActor(ref)`. The two `ready` shapes are the
  ∅-encoding (P1a C11) — distinguished by `ref === null`.
- Provisioning FAILURE has NO port channel at ch12 (C15): READY is the
  ONLY completion; a failed provision never fires it, the run stays
  `CREATED` + `requested` (floor-visible + cancellable). The model
  prose's failure→`FAIL` routing arrives WITH the provisioning-failure
  Absent (a later chapter's rows); nothing at ch12 fires `FAIL` for a
  provider.
- The FILE-channel runtime-context SPEC-MAP source form is P4-deferred
  (C25/R3): the YAML walk lands a `mapAsMap` JS `Map`, and `admitTemplate`
  REFUSES it cleanly at P3 with a P4-deferred finding (never a degenerate
  unstartable). The window's file domain is `none`/absent (context-free)
  or the ch11 `required` string (R2-refused); the DIRECT-construction
  plain-object spec is the P3 value-level channel the golden traces
  provision through (build-close finding 6, human-ratified option 1).

## Embedding gates

- **Target files (production):**
  - `v3/src/ports/runtimeContextProvider.ts` — NEW: `RuntimeContextProvider`
    interface, `ProviderRegistry` type, `createStaticProviderRegistry`
    (the injected static lookup; the EMPTY production registry is a
    call with no members).
  - `v3/src/ports/index.ts` — export the new port + registry types.
  - `v3/src/domain/template.ts` — `RuntimeContextRequirement` +
    `RuntimeContextSpec` types; the raw `runtimeContext` field BROADENS
    (`"required" | undefined` → `RuntimeContextSpec | "none" | "required" | undefined`,
    `#117`); `resolveRuntimeContextRequirement` is the read-time TOTAL
    view over the admission-normalized field (materialization happens in
    `admitTemplate`, not here — T1/R1).
  - `v3/src/domain/dispatch.ts` — `ContextPacket` gains
    `runtimeContext: RuntimeContextProjection \| "none"` (`#7-27`);
    the `RuntimeContextProjection` type lands HERE (in `domain/dispatch.ts`,
    beside `ContextPacket` — the mutation boundary lists no separate
    `domain/runtimeContext.ts`), a declared-unique-symbol BRAND (the
    `domain/template.ts:140` `admittedBrand` idiom), so a raw
    `RuntimeContextRef` is not assignable (T2).
  - `v3/src/domain/index.ts` — export the new types.
  - `v3/src/kernel/lifecycle.ts` — `start` (`#242-330`): replace
    `resolveWindowContext` (`#117-143`, DELETED) with the real
    requirement branch (S1–S4); `runtimeContextReady` (NEW handler,
    K family); `activateOrHold` (NEW — extracted from the `#270-328`
    inline fork); `StartInput.runtimeContextRef` (`#58`) retired.
  - `v3/src/kernel/kernel.ts` — the `Kernel` interface (`#87-94`) +
    the dispatch table (`#420-473`) gain `runtimeContextReady` wired
    via `lifecycleOp` (mirror `fail` at `#471-472`); `KernelDeps`
    (`#55-77`) gains `providerRegistry`; the completion seam
    (SM family — composition wiring); the R5 backstop
    (`#267-289`) re-reads the real field (mechanism unchanged).
  - `v3/src/kernel/dispatchIntent.ts` — `deriveDispatchIntent`
    (`#17-56`): the `runtimeContext` projection leg (E1/E2) added to
    the `ContextPacket` construction (`#41-54`).
  - `v3/src/kernel/index.ts` — re-export the new kernel/type surfaces.
  - `v3/src/definition/admit.ts` — `admitTemplate`: MATERIALIZES the
    requirement AT ADMISSION (R1/T1 — the illegal bare `required` form
    REFUSED LOUD (R2), `absent → "none"` normalized, a spec map kept, so
    the admitted template carries a non-absent value; the activation
    precedent at `#409` `activation: template.activation ?? { mode:
    "immediate" }` is the shape-preserving normalize move) + the C5
    re-grammar reading the resolved requirement (R4, `#306-312`).
  - `v3/src/definition/validate.ts` — the T1 raw-field broadening
    compile-forces the `runtimeContext: runtimeContextRaw as "required"`
    build (`#742`): a minimal cast update to the broadened raw domain
    (`RuntimeContextSpec | "none" | "required"`); the YAML SOURCE-FORM
    walk (the key grammar, path-addressed findings) stays P4 (C25/R3), so
    this is a cast-only touch, NOT the source-form landing.
  - `v3/src/ingress/ingress.ts` — retire the `runtimeContextRef` key
    (`#189, #366, #416-417, #422`) + the `invalid_runtime_context_ref`
    token (W2).
  - `v3/src/ingress/index.ts` — the `IngressDetailToken` union if
    exported there.
  - `v3/src/cli/main.ts` — retire the Y6 eager guard (`#272-292`);
    inject the EMPTY production `providerRegistry` into `createKernel`
    (`#302, #427`).
  - `v3/src/cli/dev/main.ts` — inject the SCRIPTED provider registry
    (`#253, #578`); retire the `runtimeContextRef` dev fixture
    validator key (`#383-386, #401-402`).
  - `v3/src/testkit/scriptedRuntimeContextProvider.ts` — NEW: the
    scripted player (records `provision`, plays configured READY incl.
    hostile-kind + never-ready hold, a configured `projectForActor`).
  - `v3/src/testkit/traceHarness.ts` — retire the `runtimeContextRef`
    seam (`#42, #85, #252-253`); the golden traces drive the kernel
    directly (the l0cTrace/l0dJourney shape) — the harness seam
    re-base only removes the retired carrier.
  - `v3/src/testkit/index.ts` — export the scripted provider; retire
    `HarnessStartOpInput.runtimeContextRef` (`#42`).
  - `v3/src/drift/unitMap.json` — the D1 flips (l0e `#222-236` pending
    → realized + the two l0d completions' codeRefs unchanged).
  - `v3/src/drift/domainRegistry.ts` — the D2 l0e flips (`#224-236`),
    the seven realized `import type` witnesses, the stale l0e header
    comment refreshed.
  - `v3/implementation/packets/ch12-p1b-activation-machinery.md` — the
    reciprocal `{l0d-pseudocode/START, co_owner: ch12-p3-…}` +
    `{l0d-pseudocode/RECEIVE, co_owner: ch12-p3-…}` share entries into
    P1b's slice (the ONLY change to that file; sanctioned
    sibling-slice edit).
- **Entrypoints:** `start`, `runtimeContextReady` (the new kernel
  event handler), `activateOrHold` (the shared fork), `deriveDispatchIntent`
  (the projection), `admitTemplate` (the requirement), the injected
  `providerRegistry`. No SHIPPED CLI verb changes (the eager guard
  retires; the four-verb surface is P4's); dev `replay` gains the
  scripted registry.
- **Mutation boundary:** the production files above + the test files
  below. Extend-don't-fork: the provider port is a new leaf; the
  `ContextPacket`/`Template` type flips cut over via the compiler; the
  seam retirement is compile-forced + measured-swept.
- **Build-revealed boundary additions (reconciled at build):** two
  production files the embedding gates undercounted — `domain/outcome.ts`
  (the `StartOutcome` gains `runtime_context_provider_unavailable` (S2)
  and the K-family `RuntimeContextReadyOutcome` return type) and
  `ports/diagnostics.ts` (the `IngressDetailToken` union HOME, where the
  `invalid_runtime_context_ref` token actually lives — W2 assumed
  `ingress/index.ts`) — plus six test files mechanically forced to inject
  the now-REQUIRED `KernelDeps.providerRegistry` (T3) at their
  `createKernel` call sites (`kernel/diagEmission.test.ts`,
  `diag/sqliteDiagStore.test.ts`, `floor/{debugBundle,diagTail,floor,tail}.test.ts`).
  All eight are in the `mutation_boundary` JSON; none carries new
  behavior beyond the named S2/W2/T3 obligations.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/ports/runtimeContextProvider.ts",
      "v3/src/ports/index.ts",
      "v3/src/domain/template.ts",
      "v3/src/domain/dispatch.ts",
      "v3/src/domain/index.ts",
      "v3/src/kernel/kernel.ts",
      "v3/src/kernel/lifecycle.ts",
      "v3/src/kernel/dispatchIntent.ts",
      "v3/src/kernel/index.ts",
      "v3/src/definition/admit.ts",
      "v3/src/definition/validate.ts",
      "v3/src/ingress/ingress.ts",
      "v3/src/ingress/index.ts",
      "v3/src/cli/main.ts",
      "v3/src/cli/dev/main.ts",
      "v3/src/testkit/scriptedRuntimeContextProvider.ts",
      "v3/src/testkit/traceHarness.ts",
      "v3/src/testkit/index.ts",
      "v3/src/drift/unitMap.json",
      "v3/src/drift/domainRegistry.ts",
      "v3/src/drift/unitMap.test.ts",
      "v3/src/drift/domainRegistry.test.ts",
      "v3/src/l0eTrace.test.ts",
      "v3/src/l0dTrace.test.ts",
      "v3/src/l0dJourney.test.ts",
      "v3/src/l0aTrace.test.ts",
      "v3/src/l0bTrace.test.ts",
      "v3/src/l0cTrace.test.ts",
      "v3/src/l1Trace.test.ts",
      "v3/src/l2Trace.test.ts",
      "v3/src/l2aTrace.test.ts",
      "v3/src/kernel/lifecycle.test.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/kernel/dispatchIntent.test.ts",
      "v3/src/kernel/processGate.test.ts",
      "v3/src/kernel/admission.test.ts",
      "v3/src/kernel/gateProjection.test.ts",
      "v3/src/definition/admit.test.ts",
      "v3/src/definition/validate.test.ts",
      "v3/src/definition/load.test.ts",
      "v3/src/ingress/ingress.test.ts",
      "v3/src/store/sqliteStore.test.ts",
      "v3/src/testkit/traceHarness.test.ts",
      "v3/src/testkit/scriptedRuntimeContextProvider.test.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/src/cli/dev/dev.test.ts",
      "v3/src/emitLoop.test.ts",
      "v3/src/twoWorker.test.ts",
      "v3/src/domain/outcome.ts",
      "v3/src/ports/diagnostics.ts",
      "v3/src/kernel/diagEmission.test.ts",
      "v3/src/diag/sqliteDiagStore.test.ts",
      "v3/src/floor/debugBundle.test.ts",
      "v3/src/floor/diagTail.test.ts",
      "v3/src/floor/floor.test.ts",
      "v3/src/floor/tail.test.ts",
      "v3/implementation/packets/ch12-p1b-activation-machinery.md",
      "v3/implementation/packets/ch12-p3-provider-contract.md"
    ]
  }
}
```
- **Test targets (type-ripple + new):**
  - `v3/src/l0eTrace.test.ts` — NEW golden trace (real store + admit +
    kernel + the scripted provider registry: the provisioned immediate
    run, the unknown-provider variant, the hostile-kind variant).
  - `v3/src/l0dTrace.test.ts` — NEW golden trace (the deferred-hold +
    cancel run with the scripted provider — requested/READY legs).
  - `v3/src/kernel/lifecycle.test.ts` — the S/K/SM families (START
    provider legs, the READY handler rung order + inert events, the
    seam hold/release, `activateOrHold`).
  - `v3/src/kernel/dispatchIntent.test.ts` — the E family (projection
    vs none, the re-resolve invariant throw).
  - `v3/src/definition/admit.test.ts` — the R family (materialization,
    the C2 migration refusal, the C5 re-grammar).
  - `v3/src/definition/load.test.ts` — the `maximalDirect`/`maximalYaml`
    fixtures' bare `runtimeContext: "required"` (cast, compiler-blind)
    migrate to the spec-map form under R2's migration refusal (else the
    `ok === true` assertion runtime-breaks — the R2 value-ripple).
  - `v3/src/ingress/ingress.test.ts` — the W2 `runtimeContextRef`
    key-retirement lanes (now an unknown-key rejection).
  - `v3/src/cli/cli.test.ts`, `v3/src/cli/journey.test.ts` — the W3
    eager-guard retirement (the `required` migration-refusal + the FILE
    spec-map P4-deferred admission refusal, finding-6/C25); the T4 packet
    value-ripple.
  - `v3/src/cli/dev/dev.test.ts` — the dev scripted-provider provisioned
    `replay` path; the `runtimeContextRef` validator retirement.
  - `v3/src/store/sqliteStore.test.ts` — the `requested`/`ready(ref)`
    round-trip lanes (the P1a encode/decode driven by real writes).
  - `v3/src/testkit/scriptedRuntimeContextProvider.test.ts` — the
    player's own contract (records provision, plays READY/hostile-kind/
    hold).
  - the existing trace/journey/emitLoop/twoWorker suites — the T4
    `runtimeContext: "none"` value-ripple re-base.

**Substrate probe:** none required — no matrix/lane cell rests on
driver/OS/filesystem behavior. The provider MECHANICS (git/worktree)
are the ch-9 real provider's; ch12's scripted player is pure in-memory
deterministic data. The only substrate-adjacent premise (the
canonical-JSON serialization of the ref/projection) is the emit-lib
culture proven since ch5-P4 and reused at P1b/P2; this packet stands on
no NEW substrate claim. The `provider: pairflow.worktree` YAML probes
(RP1–RP6) were run at the draft (Context substrate-probe record) and
are the draft's, not re-run here.

## Acceptance

- Contract tests: the C2/C3/C4/C5/C13/C14/C15/C16/C17/C18/C19/C22/C24/C25
  obligations this packet realizes, driven by claim-derived negatives
  (the K-family inert-event lanes and the R2 migration refusal derive
  from the CLAIM/matrix, never from the implemented predicate's shape —
  R-CLAIM-NEGATIVES).
- Checks: the drift suite (unit-map + domainRegistry locks extend with
  the D1/D2 flips; the coverage union closes across the ch12 siblings;
  ledger byte-identical), `v3:packet-lint`, `v3:adr-check`.
- Test disciplines + family inventories (DISCIPLINE + FAMILY INVENTORY,
  R-ALTITUDE-LINE — membership parameterized, fixture-level enumeration
  is build work):
  - **PR (port/registry):** the declared set {`resolve` returns the
    registered provider / `none` for an unregistered name, the EMPTY
    production registry resolves nothing, the injected-dependency
    wiring, the scripted player's `provision`-record + configured-READY
    + `projectForActor` contract} each driven; the scripted player's
    own contract in its test file. Membership: PR1–PR4 (owner: this
    packet).
  - **S (START provider legs):** the declared set {spec-resolve →
    provision → `requested` marker + STARTED fact atomic move →
    `Accepted`; the unresolved-provider PRE-commit reject (no marker,
    no fact, op_id unconsumed); the must-detach port breach (a
    synchronous throw AND a pre-commit-rejecting detach ack — both
    fail-loud with zero state change); the CAS-restart fresh-request_id
    path (a pass-through store forcing one `cas_conflict`, observable
    as ≥2 provision calls under fresh request_ids)} each driven — the
    port-breach and unresolved lanes must FAIL an implementation that
    commits before detaching or consumes the op_id. Membership: S1–S5
    (owner: this packet; driven in `kernel/lifecycle.test.ts`).
  - **K (READY handler):** the declared set {the rungs PER-RUNG (the two
    inert rejections are outcome-INDISTINGUISHABLE — both `{ignored}`, no
    state change — so no test can prove their relative ORDER by outcome;
    the ORDER (terminal-sink before correlation) is CODE-REVIEW-asserted,
    stated in the test): the terminal-sink rung EXISTS and fires — a
    post-terminal event whose correlation WOULD match is still rejected
    (no resurrection; red-proven by disabling the rung → the run
    activates); the correlation-reject family (duplicate / unsolicited /
    already-`ready` / `requested`-of-a-different-id) each mutating
    NOTHING; the kind boundary (match → accept, mismatch → reject
    no-state-change); the
    transport-gate integrity throw (a non-canonical ref); the
    accepted-readiness `ready(ref)` commit → `activate_or_hold` fork
    (immediate → Activated + first dispatch; deferred → WAITING)} each
    driven; the inert-event lanes assert BOTH the outcome AND the
    unchanged `runtime_context`. Membership: K1–K4 (owner: this packet;
    driven in `kernel/lifecycle.test.ts`).
  - **SM (completion ordering):** the declared set
    {synchronous-completion HELD until the START commit (a scripted
    provider firing READY inside `provision()` — the run reaches
    `ready`/ACTIVE, never lost to the pre-commit window); POST-CONCLUSION
    DIRECT delivery (SM1 path b — a completion firing AFTER START concludes
    is delivered directly, the run reaches `ready`/ACTIVE; the fail-able
    distinction is the drain — `settleRuntimeContextDeliveries()` returns
    `[activated]` when delivered vs `[]` when the pre-fix code dropped it,
    finding 1's regression lane; a delivered-INERT completion returns
    `[{ignored}]` vs `[]` for a drop); released on a SUPERSEDED attempt
    delivers-but-correlation-rejects (inert, observable via the drain
    `[{ignored}]`);
    released on a FAILED / NON-COMMIT conclusion — the S4 port-breach
    throw, a THROWING `commitLifecycle` (store-port rejection), AND the
    non-commit exits (`duplicate_op`, `op_id_collision`) each flush the
    held completion at `concludeAttempt` (SM3): the completion is
    DELIVERED (correlation rejects it inert, no state change) and NEVER
    DROPPED — the lane must FAIL an implementation that flushes only on
    the commit path (a held completion silently lost when START
    breaches/duplicates/store-rejects); the PER-ATTEMPT release on the
    S5 CAS-restart — a superseded `request_id`'s held completion released
    (inert) at ITS attempt's conclusion, ≥2 provision calls each
    concluded; the never-mid-attempt guarantee} each driven — the held-completion lane must FAIL an
    implementation delivering READY before the START commit (the
    correlation would reject it, the run stuck `requested`).
    Membership: SM1–SM3 (owner: this packet; driven in
    `kernel/lifecycle.test.ts` + `l0eTrace.test.ts`).
  - **E (dispatch projection):** the declared set {provisioned →
    `projectForActor(ref)` in the packet; context-free → explicit
    `none`; the raw ref NEVER in the packet; the re-resolve invariant
    throw on a vanished provider} each driven — the projection lane
    must FAIL an implementation leaking the raw ref, and the
    context-free lane a missing/absent field. Membership: E1–E2
    (owner: this packet; driven in `kernel/dispatchIntent.test.ts` +
    the traces).
  - **R (requirement admission):** the declared set {absent →
    materialized `none`; spec map → `required(spec)`; the bare
    `required` string → the LOUD migration refusal (R2); the C5
    process-gate-resolving-to-none finding; the illegal-value container
    finding suppressing C5 as its dependent; the R5 backstop re-read}
    each driven; the C3 `kind`/`provider` SOURCE-FORM grammar lanes are
    a PARAMETERIZED family whose membership owner is the ratified draft,
    deferred to P4 (R-CLAIM-GRAMMAR PARAMETERIZED). Membership: R1–R5
    (owner: this packet; driven in `definition/admit.test.ts`).
  - **W (seam retirement):** the untruncated build re-run of the W1
    sweep (`runtimeContextRef`, `resolveWindowContext`,
    `runtimeContext: "required"`) finds ZERO consumers outside this
    packet's probes/comments; the ingress unknown-key lane for
    `runtimeContextRef`; the CLI eager-guard-retirement lanes (a
    `required` file → migration refusal; a FILE spec map → the
    P4-deferred admission refusal, finding-6/C25 — never the shipped-CLI
    START path); the dev validator's re-based keyset. Membership: W1–W4 (owner: this packet; driven in
    `ingress/ingress.test.ts`, `cli/cli.test.ts`, `cli/dev/dev.test.ts`).
  - **T (types):** the out-of-shape probes (a raw ref in the packet, a
    non-`RuntimeContextRequirement` template field) are compile errors;
    the T4 packet value-ripple re-bases every `packet: {` construction
    AND `toEqual` expected literal to carry `runtimeContext: "none"`
    (the construction sites compile-forced, the expected literals
    searched by literal — not type). Membership: T1–T4 (owner: this
    packet; the compile probes driven in `kernel/processGate.test.ts`,
    the literal sweep untruncated at build).
  - **TR (traces):** the l0e golden trace green (provisioned immediate
    + unknown-provider + hostile-kind); the l0d golden trace green
    (deferred hold + cancel with the scripted provider) — the
    R-DERIVED-PROBES build-report table (family → what breaks →
    expected red → observed) carries ≥1 red-proven probe per
    PR/S/K/SM/E/R/W family. Membership: the two named golden traces
    (owner: this packet; driven in `l0eTrace.test.ts` +
    `l0dTrace.test.ts`).
- Drift tests green (standing, unconditional — PI-3).
- Standing review rules in force: REV-A1-TXN (the `requested` marker +
  STARTED fact, and the `ready(ref)` + activation, each ride ONE
  `commitLifecycle` transaction — the commit boundary unchanged);
  REV-B-LOCAL-NOT-AUTHORITY (the seam's held completions are a
  DELIVERY buffer, never authority — the store row is the only truth
  the correlation rung reads); REV-C-PROJECTIONS-READONLY (the packet
  projection is a kernel-output read of provider state, never a write);
  REV-E-NO-ADAPTER-BRANCH (the kernel never branches on a concrete
  provider type — the registry returns an injected interface);
  REV-DIAG-FAILOPEN (every new `diag.emit` site BARE — the START/READY
  diag classification).

## Pre-approval flags

None. Zero new-decision manifest rows (tally: 28 anchored / 6 derived /
0 new-decision); no narrowing, no contract-reality issue open, no route
awaiting an approve-time decision. The draft's P3 sizing watchpoint is
DISCHARGED in the `## Sizing/risk` section (single-packet,
closure-proven — stops 2/6 letter-tripped and closed, mirroring
P1b/P2). The `provider: pairflow.worktree` trace/empty-registry
reconciliation (C16) is an in-context note, deliberately NOT a contract
row (the draft's own classification). The ordered-after-commit seam
(SM3), the two alias/inherited unit dispositions (D1), and the T4
value-ripple are DERIVED rows whose alternatives are foreclosed by
ratified C15 text, the shared-symbol fold culture, and the established
value-ripple sweep — their derivation notes are in-row.

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "PR1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C15", "contract:ch12-runtime-core#C22", "prose:l0e-pseudocode/RuntimeContextProvider"] },
      { "id": "PR2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C16", "contract:ch12-runtime-core#C22"] },
      { "id": "PR3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C22", "contract:ch12-runtime-core#C16"] },
      { "id": "PR4", "class": "anchored", "refs": ["contract:ch12-runtime-core#C15", "contract:ch12-runtime-core#C17"] },
      { "id": "S1", "class": "anchored", "refs": ["prose:l0e-pseudocode/START", "contract:ch12-runtime-core#C18", "contract:ch12-runtime-core#C14"] },
      { "id": "S2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C18", "contract:ch12-runtime-core#C16", "prose:l0e-pseudocode/START", "prose:ledger §2 l0e/provider-resolved-at-start", "prose:ledger §3 runtime_context_provider_unavailable"] },
      { "id": "S3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C18", "prose:l0e-pseudocode/START", "contract:ch12-runtime-core#C15"] },
      { "id": "S4", "class": "anchored", "refs": ["contract:ch12-runtime-core#C18", "contract:ch12-runtime-core#C15"] },
      { "id": "S5", "class": "anchored", "refs": ["contract:ch12-runtime-core#C18"] },
      { "id": "K1", "class": "anchored", "refs": ["prose:l0d-pseudocode/RECEIVE", "contract:ch12-runtime-core#C13", "prose:l0e-pseudocode/RUNTIME_CONTEXT_READY"] },
      { "id": "K2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C18", "contract:ch12-runtime-core#C15", "prose:l0e-pseudocode/RUNTIME_CONTEXT_READY", "prose:ledger §2 l0e/kind-boundary-only"] },
      { "id": "K3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C15", "contract:ch12-runtime-core#C18", "prose:l0e-pseudocode/RUNTIME_CONTEXT_READY"] },
      { "id": "K4", "class": "anchored", "refs": ["contract:ch12-runtime-core#C18", "prose:l0e-pseudocode/RUNTIME_CONTEXT_READY", "prose:l0e-pseudocode/activate_or_hold"] },
      { "id": "SM1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C15"] },
      { "id": "SM2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C15"] },
      { "id": "SM3", "class": "derived", "refs": ["contract:ch12-runtime-core#C15", "contract:ch12-runtime-core#C18", "prose:ADR-014 composition-injected seam"] },
      { "id": "E1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C17", "prose:l0e-pseudocode/dispatch_intent", "prose:ledger §2 l0e/projection-never-the-ref"] },
      { "id": "E2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C16", "contract:ch12-runtime-core#C17", "prose:ledger §2 l0e/registry-stable-for-the-run"] },
      { "id": "R1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C2", "contract:ch12-runtime-core#C4", "contract:ch12-runtime-core#C25"] },
      { "id": "R2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C2", "contract:ch12-runtime-core#C25", "contract:ch12-runtime-core#C24"] },
      { "id": "R3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C3", "contract:ch12-runtime-core#C25"] },
      { "id": "R4", "class": "anchored", "refs": ["contract:ch12-runtime-core#C5", "prose:ledger §3 runtime_context_required_for_process_gate"] },
      { "id": "R5", "class": "anchored", "refs": ["contract:ch12-runtime-core#C14", "contract:ch12-runtime-core#C5"] },
      { "id": "W1", "class": "anchored", "refs": ["contract:ch12-runtime-core#C14", "contract:ch12-runtime-core#C24", "prose:R-ABSENCE-CONSUMERS"] },
      { "id": "W2", "class": "anchored", "refs": ["contract:ch12-runtime-core#C14", "contract:ch12-runtime-core#C24", "prose:ch12-p1b I2 interim carrier"] },
      { "id": "W3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C24", "contract:ch12-runtime-core#C16", "contract:ch12-runtime-core#C2"] },
      { "id": "W4", "class": "derived", "refs": ["contract:ch12-runtime-core#C14", "contract:ch12-runtime-core#C19", "prose:built traceHarness contract"] },
      { "id": "T1", "class": "derived", "refs": ["contract:ch12-runtime-core#C2", "contract:ch12-runtime-core#C3", "contract:ch12-runtime-core#C4", "contract:ch12-runtime-core#C25", "prose:l0e-pseudocode/START", "prose:ch12-P1b G3 activation-belt"] },
      { "id": "T2", "class": "derived", "refs": ["contract:ch12-runtime-core#C17", "contract:ch12-runtime-core#C15", "prose:l0e-pseudocode/dispatch_intent", "prose:invariant-disposition-map l0e/projection-never-the-ref", "prose:AdmittedTemplate brand idiom"] },
      { "id": "T3", "class": "anchored", "refs": ["contract:ch12-runtime-core#C15", "contract:ch12-runtime-core#C16", "contract:ch12-runtime-core#C22"] },
      { "id": "T4", "class": "derived", "refs": ["prose:R-ABSENCE-CONSUMERS", "contract:ch12-runtime-core#C17"] },
      { "id": "D1", "class": "derived", "refs": ["prose:plan §12.2", "prose:unitMap fold-chain culture (l0c-into-l0d alias)", "ADR-014"] },
      { "id": "D2", "class": "anchored", "refs": ["prose:ledger §4 l0e", "contract:ch12-runtime-core#C15", "contract:ch12-runtime-core#C17"] },
      { "id": "D3", "class": "anchored", "refs": ["prose:invariant-disposition-map l0e rows", "prose:ledger §2 l0e"] }
    ]
  }
}
```

## Build record

Built at `cfabfe46`; six build-close aftermath findings folded (uncommitted at
report time). Two P1 product fixes: (F1) the completion seam lost a provider's
ASYNC post-conclusion READY (buffered but never re-flushed) — fixed with a
`concluded` set + a DIRECT post-conclusion delivery (`deliverCompletion`) and a
`settleRuntimeContextDeliveries` drain that returns the delivery outcomes; (F6)
the file-channel runtime-context spec-map source form (a `mapAsMap` JS `Map`)
was degenerately accepted — `admitTemplate` now refuses it CLEANLY as
P4-deferred (C25), the direct-construction plain-object spec unaffected.

**R-DERIVED-PROBES (family → what breaks → expected red → observed).** Every
row's cited test goes RED when its rule is violated (each fail-first-verified by
disabling the rule):

| Family | What breaks | Red-proven probe |
|---|---|---|
| PR | provider returns a lossy projection ungated | `testkit/scriptedRuntimeContextProvider.test.ts` — "projectForActor GATES its return canonical-JSON-safe (PR4)". OBSERVED (mutation: disable the provider's `isCanonicalizable` gate): `AssertionError: expected [Function] to throw an error` |
| S | an unresolved provider consumes the op_id / commits pre-detach | `kernel/lifecycle.test.ts` — "S2: an UNRESOLVED provider → Rejected(...) PRE-commit; op_id NOT consumed" + "S4: a synchronous provision throw is a PORT BREACH". OBSERVED (mutation: disable S2's `provider === null` pre-commit reject): `TypeError: Cannot read properties of null (reading 'provision')` |
| K | the terminal-sink rung is absent (resurrection) / the correlation rung is absent | PER-RUNG (the two inert rejections are outcome-INDISTINGUISHABLE — both `{ignored}` — so the rung ORDER itself is CODE-REVIEW-asserted, NOT outcome-provable, stated in the test): `kernel/lifecycle.test.ts` — "K2 terminal-sink (per-rung): a post-terminal READY whose correlation WOULD match is still rejected — no resurrection" (red-proven: disabling the rung → the run ACTIVATES) + the correlation inventory ("K3 correlation (unsolicited / already-ready-duplicate)", "K2 kind boundary") + "K2 required(spec) bind" (integrity throw, runtime_context UNCHANGED). OBSERVED (mutation: disable the terminal-sink rung): `AssertionError: expected { kind: 'activated', …(3) } to deeply equal { kind: 'ignored' }` (the post-terminal correct-req READY resurrects the run) |
| SM | a completion delivered before commit / dropped post-conclusion / a HELD completion not flushed at a superseded/failed/duplicate/collision conclusion | `kernel/lifecycle.test.ts` — "SM1" (held until commit), "SM2 (finding 1)" (async post-conclusion delivered, not dropped), "SM2 (finding 2b)" (superseded post-conclusion delivered-inert), "SM (finding 2 held-a)" (CAS-superseded HELD completion released inert), "SM (finding 2 held-b/held-c)" (duplicate_op / op_id_collision exits flush the held completion), "SM3"/"SM (finding 2c)" (port-breach / throwing-commit exits flush) — red-proven per lane by the lane-appropriate mutation: the POST-CONCLUSION DIRECT lanes ("SM2 finding 1", "finding 2b") red by disabling the `deliverCompletion` DIRECT-delivery branch (drain returns `[]` not `[activated]`/`[{ignored}]`); the HELD lanes (held-a/b/c, port-breach, throwing-commit) red by disabling `concludeAttempt`'s buffer-flush (load-count observable); and "SM drain (concurrent arrival)" — `settle` DRAINS FULLY then throws, so an integrity-erroring delivery does not leave a concurrently-arriving delivery undrained (red-proven by restoring the mid-loop throw: the leftover second-drain returns `[{ignored}]` instead of `[]`); and "SM (pre-conclusion buffer)" — `concludeAttempt` delivers EVERY held completion (deliver-all-then-throw), so a transport-gate throw on an EARLIER held completion does not drop a LATER one (two held completions for one request_id: first non-canonical → integrity throw, second valid → still delivered to ready/ACTIVE; red-proven by restoring the abort-on-throw form: the run stays `CREATED` instead of `ACTIVE`). OBSERVED transcripts: held-a (mutation: disable `concludeAttempt`'s buffer-flush) `AssertionError: expected 2 to be greater than 2` (the CAS-superseded held completion dropped, load delta 2 vs 3); drain-concurrent (mutation: restore the mid-loop throw in `settle`) `AssertionError: expected [ { kind: 'ignored' } ] to deeply equal []` (the concurrently-arrived delivery left undrained); pre-conclusion-buffer (mutation: restore `concludeAttempt`'s abort-on-throw) `AssertionError: expected 'CREATED' to be 'ACTIVE'` (the later held completion dropped) |
| E | the raw ref leaks into the packet / a vanished provider silently ignored | `kernel/dispatchIntent.test.ts` — "E1: ... the RAW ref never enters the packet", "E2: a vanished provider ... INVARIANT throw". OBSERVED (mutation: `projectRuntimeContext` returns `rc.ref` instead of `projectForActor(ref)`): `AssertionError: expected { kind: 'worktree', …(1) } to deeply equal { workspace: '/w/inst-1', branch: 'b' }` |
| R | the retired `required` string / a file-channel spec map is accepted | `definition/admit.test.ts` — "R2 ... LOUD migration refusal", "R4 ... C5 SUPPRESSED"; `definition/load.test.ts` — "a YAML SPEC MAP → admission REJECTS with the P4-deferred finding" (C25). OBSERVED (mutation: disable R2's `runtimeContext === "required"` refusal): `AssertionError: expected 'runtimeContext must be "none" or a sp…' to contain 'retired'` (the bare `required` falls through to the generic illegal-value finding, losing the migration text) |
| W | a retired seam key survives as a live path | `ingress/ingress.test.ts` — "W2 ... UNKNOWN-KEY rejection"; `cli/cli.test.ts` — "W3 ... a FILE-authored spec-map template → the C25 P4-deferred admission refusal" + "a residual `required` template → the R2 migration refusal"; `cli/dev/dev.test.ts` — "W4 ... UNKNOWN FIELD". OBSERVED (mutation: re-add `runtimeContextRef` to the ingress `start` keyset): `AssertionError: expected { kind: 'accepted' } to deeply equal { kind: 'rejected', …(1) }` (the surviving key passes through instead of the unknown-key rejection) |
| T | a raw ref assigned to the packet field / a missing field compiles | `kernel/dispatchIntent.test.ts` — the `@ts-expect-error` T2 probes (branded projection rejects the raw ref; the field is non-optional) — enforced by `v3:typecheck` (TS2578). OBSERVED (mutation: make the raw-ref probe's assignment valid, so its `@ts-expect-error` is unused): `src/kernel/dispatchIntent.test.ts(20,1): error TS2578: Unused '@ts-expect-error' directive.` |

C25 note (F6): the FILE-channel runtime-context spec-map SOURCE FORM stays
P4-deferred (R3); admission refuses a `mapAsMap` JS `Map` cleanly at P3 (the
window's file domain is `none`/absent; the ch11 `required` string is R2-refused).
The DIRECT-construction plain-object spec is the P3 value-level channel (the
golden traces provision through it).

**Round + yield history (arm-gate legs; measurement stage — the two
transitional external-arm gates ran agent-invoked).** GATE 1 (approve, on
the packet bytes): 1 infra timeout + 6 verdict rounds, yield 4→2→2→1→1→0
findings, CLEAN at basis `58a0cca8`. GATE 2 (build-close, on the
implementation, sensitivity pass): round 1 → 6 findings incl. a P1 PRODUCT
bug; re-checks yield 6→2→1→1→2→(this record's fill), converging to product-
and test-clean (the arm confirmed both buffer-consumers hardened, no third
instance, no product-side contract divergence). All folds landed as this
uncommitted aftermath; the internal Opus panel's prior clean close is the
baseline the two arm gates measured against. **Test delta:** the v3 suite
grew from 1155 (pre-build) to 1194 (+39): the build's l0e/l0d golden traces +
the scripted-provider contract + the S/K/SM/E/R/W/T family lanes + the
value-ripple re-base, then the build-close aftermath's fail-able SM held/direct
lanes, the drain concurrent-arrival regression, and the `concludeAttempt`
never-dropped regression. **Leg close (diminishing-returns cutoff, README §6):**
the gate-2 arm's round-6 re-check confirmed the implementation product- and
test-clean and the `packet_metrics` complete, yielding only a P3
bookkeeping-class format item (the observed-red transcript on the K/SM rows,
2/8), now folded — so the build-close arm leg CLOSES on a bookkeeping-only round
rather than a further churning re-check.

**Detector-misses (the measurement-stage yield — what the internal panel
cleared that the cross-model arm caught; each feeds the boundary review):**
(DM1, gate 1) the requirement was materialized at the kernel READ, not AT
ADMISSION per ratified C4 — a type-level faithfulness gap the projection
lens read past (captured in the process-log gate-1 retro). (DM2, gate 1) the
`projection-never-the-ref` invariant is ratified `type/schema`, but a
structural `Record`/`unknown` projection type NEVER excludes a `{kind,locator}`
ref — only a declared-unique-symbol BRAND does; the panel accepted the type
without checking realizability. (DM3, gate 2) the completion seam LOST a
provider READY firing async AFTER START concluded (the normal path) —
buffered, never re-flushed; a real product bug the panel + gate 1 both missed
(the SM review never walked the post-conclusion timeline). (DM4/DM5, gate 2)
the abort-on-throw-drop class in the two sequential-await buffer consumers
(`settle`, `concludeAttempt`) — an earlier held completion's transport throw
dropped the rest, violating SM2's unconditional never-dropped.

```json
{
  "packet_metrics": {
    "class": "kernel-semantic",
    "prediction": { "predicted": "projection", "reasoning": "plan §12.4 P3 row: l0e-pseudocode + ledger §2/§3/§4 + the ratified chapter draft", "discovered": "projection" },
    "provenance": { "anchored": 28, "derived": 6, "new_decision": 0 },
    "rounds": { "review": 12, "doc_refinement": 0, "implementation": 6 },
    "stops": [
      { "type": "2:contested-ratified-vs-reality", "what": "gate-2 finding 6 — the C25 file-channel spec-map staging (accepted-degenerate vs cleanly P4-deferred); the gate-1 T1/C4 materialization point was a recommendation-first surfacing, folded to conform, not a registry STOP", "resolution": "human-ratified fold — the clean P4-deferred admission guard (option 1); gate-1 yields 4→2→2→1→1→0, gate-2 yields 6→6→2→1→1→2→0 (arm-round history, prose above)" }
    ],
    "detector_misses": [
      { "found_at": "arm-approve", "what": "the requirement was materialized at kernel-read, not at admission per ratified C4", "why_missed": "the projection lens read past a type-level materialization-point faithfulness gap" },
      { "found_at": "arm-approve", "what": "projection-never-the-ref is ratified type/schema but a structural Record/unknown never excludes a {kind,locator} ref — only a declared-unique-symbol brand does", "why_missed": "the panel accepted the declared type without a type/schema realizability check" },
      { "found_at": "arm-build-close", "what": "the completion seam lost an async post-conclusion READY — a real product bug (buffered, never re-flushed)", "why_missed": "the SM review never operationally-walked the post-conclusion delivery timeline" },
      { "found_at": "arm-build-close", "what": "abort-on-throw dropped later held completions in settle + concludeAttempt, violating SM2 never-dropped", "why_missed": "sequential-await-in-a-loop drop-on-throw was not probed against the never-dropped contract" }
    ],
    "learned": "Three boundary-review candidates: (1) a type/schema-DISPOSITION REALIZABILITY check — for every invariant a packet declares type/schema, confirm the named type NOMINALLY excludes the invariant's negative (a brand), not merely structurally coincides (the DM2 class). (2) operational-simulation of ASYNC seams — walk the post-conclusion delivery timeline, not just the pre-commit hold (the DM3 class). (3) the abort-on-throw-drop class in sequential-await buffer consumers — deliver-all-then-throw (the DM4 class). Also: the fresh-context-delegated build worked (§5.3 self-containment held), but the agent's folds needed orchestrator correction on subtle async correctness (the void-finally, the two twins) — the build-execution-context boundary-review item (docs b8ceeb69) should weigh whether such fixes are the orchestrator's by default."
  }
}
```
