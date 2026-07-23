# Task Packet: ch9-p1-fail-channel — the provisioning-failure → FAIL channel

Plan step: plan.md §9.4 ch9-P1 row (realizes §9.1 item 2 — the
provisioning-failure → `FAIL` channel: the port's failure completion,
the ordered-after-commit hold/release, the correlation & terminal-sink
rungs, the reason domain, the kernel `FAIL` routing, the testkit
failure script; the ch12-C15 D5 production-provider gate's REALIZATION
half — this packet MUST land before ch9-P2's registration).
Draft anchors (= the manifest's C-row ref union):
`contract:ch9-runner` rows C1/C2/C3/C4/C5/C6/C11/C22/C26 +
`contract:ch12-runtime-core` rows C15/C18. ADR-018 (the `sys:` reason
namespace) is governing authority for the reason-token form.

Autonomy stage: measurement — inherited from the ch9 chapter header
(flag-free panel approves proceed to build autonomously THROUGH the
two transitional external-arm gates; flags/STOPs/first-of-a-kind
route to the human). Not first-of-a-kind: the completion-channel
kernel class (an in-process kernel event with admission rungs, a
transport gate, and the composition seam) is exactly ch12-P3's built
class (READY — the sibling completion); the terminal FAIL commit is
ch12-P1b's built `fail` culture; the scripted-player extension is the
ch12-P3 PR3 culture.

Plan alignment (R-ALIGNED-UP): NONE. The packet realizes the §9.4 P1
row as ratified; no ratified plan text is contradicted, so no
aligned-up edit rides this commit.

Classification: **projection** — manifest tally: 13 anchored /
6 derived / 0 new-decision (machine-counted from the `packet_rows`
block). Every row anchors to the ratified ch9-runner draft, the
ratified ch12-runtime-core rows it cites, or ADR-018, or derives from
those with an in-row note. Zero new-decision rows: the wire shape,
the rung order, the atomic FAIL commit, the reason domain, the
detail confinement, the hold/release discipline, and the gate
ordering are all fixed by C1–C6/C11/C22 verbatim plus the cited
ch12-C15/C18 mechanics.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [],
    "rejections": [],
    "invariants": [],
    "traces": [],
    "shared_ownership": []
  }
}
```

The EMPTY slice is a declaration, not an omission (plan §9.2: the
chapter's slice is near-empty; the FAIL-channel rows are draft-owned
decisions ch12-C15 explicitly deferred to this chapter). No unit
changes owner: the model's failure→`FAIL` routing exists as PROSE,
not as a unit — C1 realizes that prose as seam contract (K0 answered
at the draft: no model wave; a discovered need for FAILED-side model
units routes through the standing model↔code divergence stop, never
assumed away). The kernel `FAIL` machinery (`l0d-pseudocode/FAIL`)
stays owned-and-realized by ch12-P1b — this packet adds a NEW
correlated caller-shaped handler beside it, not a change to `fail`.
The candidate id `l0d-pseudocode/RUNTIME_CONTEXT_READY` resolves in
ch9-P2's slice (plan §9.4 P2 row), not here. Rejections: no registry
change — failure reasons are `FAIL` REASON PAYLOAD, never registry
rejection names (C3; the 54-name registry is byte-untouched, drift
lanes green before and after). Invariants: none newly owned. Traces:
none (§9.2: no new ledger section trace).

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §9.4, recorded at the ch9 ratification for the
P1 row): **projection + derived** (basis: the ratified ch9 draft rows
+ the ch12-C15/C18 mechanics). Discovered at authoring: **projection**
(13 anchored / 6 derived / 0 new-decision) — prediction and discovery
agree.

Six axes: **authority movement** — NO (no stored source of truth
moves; the FAIL disposition write, `failure_reason` column, and the
completion seam all exist — this packet adds a second completion KIND
over built machinery). **Surface spread** — counted per the ch12-P3
precedent (domain/ports count as surfaces): THREE for one concept —
kernel logic (the FAILED handler + the seam's second kind + the
transport gate), the ports/domain SHARED-CONTRACT type face (the
sink union + the new domain types — a port-signature change every
sink consumer sees), and the testkit CONTRACT (the failure script +
the sink call shape); store schema / ingress / read projection /
CLI-human payload untouched (the dev-root sink call is a mechanical
call-shape ripple, not a CLI payload change). HARD STOP 2
LETTER-TRIPPED (one concept across 3+ surfaces) — closure proof
below. **Identity/join fragility** — NO (correlation is the single
`requested(request_id)` rung on ONE instance's state; no cross-store
join). **Foundation + activation coupling** — NO, by design: this
packet IS the foundation half; the activation (a real provider
ROUTING failures onto the channel, production registration) is
ch9-P2's — the split is the D5 gate's ordering itself. **Prerequisite
coupling** — NO (ch9-P0 committed; the ch12-P3 seam machinery built
and green). **Acceptance multiplicity** — one proof surface
(`pnpm v3:test` families + the v3 bridges; full `ci:local` at close).

**Hard stop 2 — letter-tripped, closure-proven; single-packet
allowed: yes.** The three surfaces are ONE compile-linked bounded
change: the union type, the handler, and the script land together —
the port/domain type face has zero consumers outside the enumerated
T2 set (compiler-forced at the typed sites, name-swept at the rest),
the testkit change is the same union's script face, and ONE proof
surface (`pnpm v3:test` + the v3 bridges) validates all three. No
per-consumer-family sequencing or review loop exists; no separate
compatibility/diagnostics/read-projection/recovery/ordering risk is
introduced (production dormant at P1 — X1); the same in-repo
consumers own the fallout. Shared invariant coherence is NOT the
proof — the proof is that one build closes all three surfaces
without separate sequencing. No OTHER hard stop trips and no
escalation combo fires (one success class, one proof surface).
Mutable-flow note (hard-stop-9 material near, not tripped): the FAILED commit introduces no
rollback/retry/lock primitive — it is ONE `commitLifecycle` CAS write
(the built `fail` shape); a rung-rejected or gate-rejected completion
produces ZERO side effects; the hold/release seam stays a
delivery-ordering rule, never a store coordination primitive.

## Operative material (full text — projection, not invention)

The semantic source is the ratified `ch9-runner` contract (2026-07-23,
commit `5c68f206`). The channel rows — verbatim NORMATIVE bodies
(the ratified rows' trailing `DECIDED HERE …` provenance clauses are
elided where present; decision provenance lives in the draft, never
re-decided here):

> **C1** | The `RuntimeContextProvider` port gains a SECOND completion
> — `RUNTIME_CONTEXT_FAILED(instance_id, request_id, reason, detail?)`
> — fired through the SAME in-process event seam as READY (ch12-C13);
> READY and FAILED are mutually exclusive PER REQUEST: a provider
> fires at most ONE completion per `request_id`, and any second
> completion (either kind) is rejected by WHICHEVER admission rung the
> first admission left standing — after a READY-first admission the
> CORRELATION rung (the marker moved to `ready(ref)`, so
> `requested(request_id)` no longer holds); after a FAILED-first
> admission the TERMINAL-SINK rung (the run is TERMINAL and C2 keeps
> the marker `requested`, so correlation alone would still pass) —
> either way inert, bare-REQUIRE, no state change (ch12-C15's safety,
> both rungs jointly).
>
> **C2** | FAILED admission runs the SAME ordered rungs as READY
> (ch12-C18's order: terminal-sink state rung first —
> `kernel_status ≠ TERMINAL` — then correlation), and an ADMITTED
> completion commits the EXISTING kernel `FAIL` disposition atomically
> (single-write `terminal_disposition = failed`,
> `kernel_status → TERMINAL`, the run's `failure_reason` ← the
> completion's `reason`); the `runtime_context` marker keeps its last
> committed value (`requested(request_id)`) as diagnostic state — the
> terminal disposition IS the record. A rung-rejected FAILED
> completion mutates NOTHING.
>
> **C3** | The provisioning-failure `reason` domain is a CLOSED,
> kernel-owned enum — at ch9 exactly two members:
> `sys:provision_rejected` (the provider determined the spec/config
> cannot be honored — e.g. missing or non-git `repo`) and
> `sys:provision_failed` (the provisioning mechanics failed — e.g. a
> git command's nonzero exit, P1b/P1c). Members grow ONLY by contract
> successor rows; the domain is validated at the completion's own
> transport gate (C5).
>
> **C4** | `detail` on a FAILED completion is OPTIONAL untrusted
> diagnostic free text (e.g. a stderr tail): it is confined to the
> diagnostic/audit surface (kernel log + floor detail), is NEVER
> parsed, NEVER matched against any token domain, and NEVER enters
> `failure_reason` — the reason token (C3) is the only classified
> value.
>
> **C5** | The FAILED completion rides the READY completion's
> transport rules — unchanged in MECHANISM, PLUS one additional check
> at the same gate point: the reason-domain membership gate (C3)
> (ch12-C15's rules cited, not restated): canonical-JSON-safe by port
> contract, violations = kernel/config integrity throw at the value's
> own gate; ordered-after-commit hold/release applies IDENTICALLY (a
> provider that DETACHES and then fires its FAILED completion
> synchronously — never a throwing/rejecting `provision()`, which
> stays ch12-C18's port-breach lane — is HELD and delivered only after
> the initiating START attempt concludes; a held completion is never
> dropped and never delivered mid-attempt); an unknown `reason` token
> (outside C3's domain) is a transport-gate integrity throw —
> fail-closed, never stored.

The channel-half ownership row (verbatim normative body, the same
elision rule) and the gate row's ordering CLAUSE (an explicitly
PARTIAL, ellipsis-marked EXCERPT of C6's single semicolon-joined
row — only the clause this packet discharges; the registration half
is ch9-P2's and the full row stays the draft's):

> **C11** | The worktree provider's detach acknowledgment is
> UNCONDITIONAL: `provision()` accepts and detaches for every
> shape-valid call; EVERY provisioning failure — config rejection
> included — travels the FAILED channel (C1–C5). The ch12-C18
> pre-commit port-breach lane remains reserved for genuine programming
> errors, never used for business/config failure. Packet ownership
> splits at the seam: the CHANNEL half (the unconditional-detach
> obligation as port contract) is ch9-P1's, the worktree provider's
> own failure ROUTING onto it is ch9-P2's.
>
> **C6** (the ordering clause this packet discharges — a partial
> excerpt): "the join is
> LEGAL because the failure→FAIL channel (C1–C5) is ratified with this
> draft and REALIZED by the packet ORDERED BEFORE the registration
> packet (plan §9.4: P1 before P2) — the ch12-C15 D5
> production-provider gate discharges by packet ordering; …"

### Delegated sources expanded (R-DELEGATION-CLOSURE)

C2/C5 delegate their mechanics to ch12-C15/C18. The load-bearing
fragments, pulled in full:

- **The rung order (ch12-C18):** "the admission rungs FIRST (the
  terminal-sink state rung, then correlation — C15; a rung-rejected
  event mutates NOTHING and the later checks never run …), then the
  … TRANSPORT gate". For FAILED there is no ref and no kind boundary
  — the post-rung checks are exactly the C5 gate (reason-domain
  membership + the payload's port-contract value safety).
- **The hold/release rule (ch12-C15):** "the composition delivers a
  … completion into RECEIVE only AFTER the provisioning START's
  atomic commit has landed … a held completion releases when the
  initiating START attempt CONCLUDES — either its commit landed
  (delivery proceeds, correlation matches) or the attempt failed or
  was superseded (delivery still proceeds and the correlation rung
  rejects it, inert); a held completion is never dropped silently and
  never delivered mid-attempt; the seam's HOLD/enqueue returns to the
  provider IMMEDIATELY".
- **The port-breach boundary (ch12-C18):** "`provision` MUST detach
  without throwing — a SYNCHRONOUS throw, or the AWAITED detach
  acknowledgment settling REJECTED before the commit, is a PORT
  BREACH, aborting the START attempt PRE-COMMIT as a kernel/config
  integrity throw" — the FAILED channel begins where the breach lane
  ends: AFTER a clean detach.
- **The event-anomaly rule (ch12-C15, via the built L8 culture):** an
  in-process event answered with an inert rejection is droppable
  without a crash — a FAILED completion for a vanished instance is
  the inert `unknown_instance` rejection, never a throw.

The built READY machinery this packet extends (current tree,
verified): the completion seam — `completionBuffer` / `concluded` /
`pendingDeliveries` / `concludeAttempt` / `deliverCompletion` /
`settleRuntimeContextDeliveries` (`kernel/kernel.ts#202-371`); the
READY handler's rung structure (`kernel/lifecycle.ts#469-532`); the
terminal FAIL commit shape (`kernel/lifecycle.ts#660-703` — fact-less
`commitLifecycle` with `newTerminalDisposition: "failed"` +
`newFailureReason`); the scripted player
(`testkit/scriptedRuntimeContextProvider.ts`).

## Claim

The kernel-side provisioning-failure channel EXISTS and is total —
total as a PORT OBLIGATION over provisioning failures (W2) and
DECISION-total over DELIVERED completions: every delivered
completion either yields an F4 outcome or raises a fail-closed
transport-gate integrity throw (G2/G3 — unknown reason or
non-string `detail`, zero state change), nothing else; awaited-port
infra throws (a rejecting store call) are OUTSIDE this total by
F1's named rule-out, riding the built internal-failure culture: a
provider that accepted and detached (C11's unconditional-detach
obligation) reports EVERY provisioning failure as a
`RUNTIME_CONTEXT_FAILED(instanceId, requestId, reason, detail?)`
completion through the SAME in-process seam as READY, and the kernel
routes an admitted failure to the run's EXISTING `FAIL` disposition —
correlated, terminal, visible — so that once a real provider exists
(ch9-P2, legal only after this packet) a declared runtime-context
requirement can never silently hang. Concretely: (1) the completion
rides the READY seam's transport rules — held pre-conclusion,
released at the initiating START attempt's conclusion, delivered
directly post-conclusion, never dropped, never mid-attempt, the
enqueue returning immediately; (2) admission runs the ch12-C18 rung
order — terminal-sink first, then correlation — and a rung-rejected
completion of EITHER kind is inert (bare-REQUIRE, no state change);
READY and FAILED are mutually exclusive per request, the second
completion rejected by whichever rung the first admission left
standing; (3) an admitted FAILED commits ONE atomic move:
`kernel_status → TERMINAL`, `terminal_disposition = failed`,
`failure_reason ← reason`, wait cleared, NO fact row — and the
`runtime_context` marker keeps `requested(request_id)` as diagnostic
state; (4) the `reason` domain is the CLOSED kernel-owned enum
{`sys:provision_rejected`, `sys:provision_failed`} (ADR-018's `sys:`
convention, C22), validated at the completion's own transport gate
AFTER the rungs — an unknown token is a kernel/config integrity
throw, fail-closed, never stored; (5) `detail` is optional untrusted
free text: string-gated at the same point, never parsed, never
matched, never in `failure_reason`; (6) the testkit scripted provider
can script the failure completion (including hostile reasons and
both-kinds-one-request sequences), so every lane above is drivable
deterministically. In production the channel is DORMANT at P1 (the
registry is empty; nothing fires it) — that dormancy is the D5 gate's
ordering, not a gap.

Dimensions (enumerated before test rows — R-DIMENSIONS):

1. **The wire + port contract** (W family) — the FAILED completion's
   shape, the same-seam rule, the unconditional-detach channel half,
   the completion-union representation.
2. **The FAILED handler** (F family) — rung order, inert families,
   mutual exclusion per request, the atomic FAIL commit + marker
   retention, outcome vocabulary, CAS restart.
3. **The transport gate** (G family) — the closed reason domain, the
   gate point, the unknown-token integrity throw, `detail`'s
   string-gate + confinement, the diag/audit landing's ownership.
4. **The seam** (SM family) — hold/release identity with READY,
   post-conclusion direct delivery, the drain's union outcomes, the
   deliver-all-then-throw discipline carrying FAILED.
5. **The testkit** (K family) — the failure script, the wide reason
   type, combination sequences.
6. **Types + ripple** (T family) — type homes, exports, the measured
   sink-signature consumer sweep.
7. **The gate ordering** (X family) — the D5 realization half; P2's
   registration legal only after this packet.
8. **Drift/coverage** (D family) — empty slice, ledger byte-identical,
   registry untouched.

R-NUMERIC-LADDER does not fire: no new validator over a numeric
domain (the reason gate is closed-set string membership; `detail` is
a string-type gate). R-ACTIVATION-JOURNEY does not fire: no shipped
entrypoint gains a live path — the production registry is empty and
no production code fires the channel at P1 (the first production
caller is ch9-P2's provider); the journey obligation lands with P2/P4
per the plan rows.

## Canonical matrices

### W — the wire + port contract

| Id | Rule | Class |
|---|---|---|
| W1 | The port's completion channel gains the SECOND completion kind: `RUNTIME_CONTEXT_FAILED(instanceId, requestId, reason, detail?)` — an IN-PROCESS kernel event (no external ingress endpoint; the ch12-C13 event class cited), fired by a provider through the SAME composition-injected completion seam as READY. `reason` is a C3-domain token; `detail` is optional free text (G3). The `Kernel` interface gains the `runtimeContextFailed(instanceId, requestId, reason, detail?)` handler, wired via `lifecycleOp` exactly as `runtimeContextReady`/`fail` are (anchored: contract:ch9-runner#C1, #C5) |
| W2 | The unconditional-detach obligation becomes PORT CONTRACT (the C11 CHANNEL half — this packet's ownership): `provision()` accepts and detaches for every shape-valid call, and EVERY provisioning failure — config rejection included — travels the FAILED channel; the ch12-C18 pre-commit port-breach lane (a synchronous throw / a pre-commit-rejecting detach ack) stays RESERVED for genuine programming errors, never business/config failure. The worktree provider's own failure ROUTING onto the channel is ch9-P2's — at P1 the obligation is stated on the port and drivable via the scripted player only (anchored: contract:ch9-runner#C11 + contract:ch12-runtime-core#C18) |
| W3 | The seam's REPRESENTATION — the BINDING property is C1's "same seam" + C5's "unchanged in MECHANISM": ONE buffer, ONE hold/release discipline, hold/release/direct-delivery/drain serving BOTH kinds with zero per-kind seam logic. The REFERENCE realization: a discriminated completion union — `{ kind: "ready", ref }` \| `{ kind: "failed", reason, detail? }` — carried by ONE sink type (`RuntimeContextCompletionSink`) and ONE delivery endpoint (`Kernel.deliverCompletion(instanceId, requestId, completion)`). An equivalent realization (e.g. a parallel typed endpoint over the SAME buffer and conclusion signal) is admissible PROVIDED the property holds — what is FORECLOSED is a second buffer or a second ordering discipline; the single-buffer/single-discipline property is CODE-REVIEW-ASSERTED (outcome-indistinguishable from a behavior-preserving second buffer — the ch12-P3 K-rung-order precedent; the arm's product review is its named verification surface). READING RULE (packet-wide): every mention of the union, the broadened sink, or a both-kinds `deliverCompletion` elsewhere in this packet READS AS the W3 reference realization and carries T1's representation-independence — an admissible equivalent substitutes its corresponding surface throughout, with no per-mention re-qualification (derived: contract:ch9-runner#C1, #C5 + prose:built SM seam (kernel.ts#202-371) — DERIVATION: C1 fixes the event and the same-seam rule, C5 fixes mechanism-identity; the union-typed single sink is the minimal representation in which mechanism-identity is true BY CONSTRUCTION rather than by duplicated code; the D1-grain representation choice stays the build's within the stated property) |

### F — the FAILED handler (`runtimeContextFailed`)

| Id | Rule | Class |
|---|---|---|
| F1 | The checks run in the ch12-C18 ORDER: load the instance (a vanished instance → the inert `rejected(unknown_instance)` — the L8 droppable-event culture); ADMISSION rung 1 — terminal-sink (`kernel_status ≠ TERMINAL`); rung 2 — correlation (`runtime_context = requested(request_id)`); a rung-rejected completion returns `ignored`, mutates NOTHING, and its payload is NEVER inspected (the later checks never run — one outcome per event). No template load, no requirement bind, no kind boundary — FAILED carries no ref. The handler's TWO awaited port calls are NAMED throw sources with an explicit rule-out: a rejecting `store.loadInstance` / `store.commitLifecycle` propagates as the kernel's EXISTING internal-failure lane (`lifecycleOp` classifies `internal_failure` and rethrows — the built culture across every handler), never a business lane of this matrix (ruled_out_reason: infra-integrity propagation; the driven surface is the existing `lifecycleOp` classification, no new obligation) (anchored: contract:ch9-runner#C2 + contract:ch12-runtime-core#C18, #C15) |
| F2 | An ADMITTED completion commits ONE atomic `commitLifecycle` write (the built `fail` shape): `newKernelStatus: "TERMINAL"`, `newTerminalDisposition: "failed"`, `newFailureReason: reason`, `newWait: null`, `fact: null` (a kernel event carries no op fact) — and the `runtime_context` field is NOT written: the marker keeps its last committed value `requested(request_id)` as diagnostic state (the terminal disposition IS the record). Outcome: `{ kind: "terminated", disposition: "failed" }` (anchored: contract:ch9-runner#C2) |
| F3 | Mutual exclusion PER REQUEST — the second-completion inventory (a LIST, each lane inert bare-REQUIRE, no state change, the REJECTING RUNG named): (a) READY-first, then FAILED(same id) → FAILED's CORRELATION rung rejects (the marker moved to `ready(ref)`); (b) FAILED-first, then READY(same id) → READY's TERMINAL-SINK rung rejects — and this rung is LOAD-BEARING and outcome-observable: the marker is STILL `requested(request_id)` (F2), so correlation alone WOULD pass and a missing terminal-sink rung would resurrect a failed run; (c) FAILED-first, then FAILED(same id) → the TERMINAL-SINK rung; (d) a completion of either kind for a DIFFERENT/superseded `request_id` on a live run → the CORRELATION rung (the existing K3 family extended to FAILED) (anchored: contract:ch9-runner#C1) |
| F4 | Outcome vocabulary + loop shape: `RuntimeContextFailedOutcome = Terminated \| { kind: "ignored" } \| { kind: "rejected", reason: "unknown_instance" }`; a `cas_conflict` RESTARTS from load (re-running the rungs on the fresh state — a concurrently-terminal or concurrently-resolved run then rung-rejects inert); `duplicate_op`/`op_id_collision` are structurally unreachable on a fact-less commit and integrity-throw (the built `fail`/READY culture) (derived: contract:ch9-runner#C2 + prose:built fail/READY handler shapes (lifecycle.ts#469-532, #660-703) — DERIVATION: C2 fixes admission and the atomic commit; the outcome union mirrors READY's inert vocabulary plus `fail`'s `Terminated`, and the CAS-restart re-admission is the same-state-machine consequence of C2's "runs the SAME ordered rungs" on a reloaded instance) |

### G — the transport gate (reason + detail)

| Id | Rule | Class |
|---|---|---|
| G1 | The `reason` domain is a CLOSED, KERNEL-OWNED enum — at ch9 exactly two members: `sys:provision_rejected` (the provider determined the spec/config cannot be honored) and `sys:provision_failed` (the provisioning mechanics failed). The domain lands as an exported domain type (`ProvisioningFailureReason`); members grow ONLY by contract successor rows. Both members carry the `sys:` prefix (the ADR-018 uniform convention, C22): system-minted, disjoint from every authored token BY CONSTRUCTION (the authored grammar cannot express `:`), never a registry rejection name (anchored: contract:ch9-runner#C3, #C22 + ADR-018) |
| G2 | The gate runs at the SAME GATE POINT as READY's transport gate — AFTER the admission rungs, BEFORE the commit (a rung-rejected completion's payload is never inspected; one outcome per event): the reason-domain MEMBERSHIP check — an unknown `reason` token (outside G1's domain) is a kernel/config INTEGRITY THROW, fail-closed, NEVER stored (no partial write, no `failure_reason` pollution) (anchored: contract:ch9-runner#C5, #C3 + contract:ch12-runtime-core#C18) |
| G3 | `detail` is OPTIONAL UNTRUSTED diagnostic free text (e.g. a stderr tail), classified untrusted-confined: NEVER parsed, NEVER matched against any token domain, and NEVER enters `failure_reason` — the reason token is the only classified value. At the same gate point, a PRESENT `detail` that is not a plain string is the same fail-closed integrity throw (the port-contract value-safety made checkable; a string is trivially canonical-JSON-safe, so no digest gate is needed) (anchored: contract:ch9-runner#C4, #C5) |
| G4 | `detail`'s POSITIVE diagnostic/audit landing (C4's "kernel log + floor detail") is C26's runner-plane observability — "every provisioning completion (both kinds) emits a structured diagnostic event" — whose emission point arrives WITH the packets that realize runner-plane behavior — for provisioning completions, ch9-P2 (the C26-realizing owner of the completion event, both kinds); `detail`'s FLOOR landing then rides the EXISTING ch7 diag-tail floor surface carrying that event (C26 reuses the built channel — the landing owner is the C26 completion EVENT, never a new floor field: C25's P4 floor additions name no provisioning `detail`). At P1 the kernel emits NO new diagnostic event: the existing `lifecycleOp` classification (duplicate/rejected/internal_failure) covers the handler unchanged, matching READY's and `fail`'s culture (kernel diag emits classifications, not success events). `detail` is carried on the wire, gated (G3), confined (G3), and consumed at P1 by tests only (derived: contract:ch9-runner#C4, #C26 + prose:plan §9.4 P1 row — DERIVATION: the P1 row's content list names the channel, rungs, reason domain, FAIL routing, and testkit script and NOT a diag emission; C26 frames completion events as RUNNER-PLANE observability riding the existing channel; the kernel-side diag culture (ch7/ch12: classification-only, no success events) confirms the emission is not the kernel handler's — so the landing is deferred to the C26-realizing packets, never dropped) |

### SM — the seam (hold / release / drain, FAILED joining)

| Id | Rule | Class |
|---|---|---|
| SM1 | Ordered-after-commit hold/release applies IDENTICALLY to FAILED: a provider that DETACHES and then fires FAILED synchronously inside `provision()` (or before the attempt concludes) is HELD by the seam and delivered only after the initiating START attempt CONCLUDES (commit-landed → the rungs admit and the run FAILs; failed/superseded → a rung rejects it inert — correlation on a live run, the TERMINAL-SINK rung when a concurrent op took the run TERMINAL); a held completion is NEVER dropped and NEVER delivered mid-attempt; the HOLD/enqueue returns to the provider IMMEDIATELY (anchored: contract:ch9-runner#C5 + contract:ch12-runtime-core#C15) |
| SM2 | Post-conclusion DIRECT delivery + the drain carry FAILED: a FAILED completion arriving after its attempt concluded is delivered DETACHED (the normal async path), and `settleRuntimeContextDeliveries()` returns the union outcomes — a delivered FAILED yields `{terminated}` (admitted) or `{ignored}` (inert), a dropped one yields nothing (the fail-able distinction); the deliver-all-then-throw discipline binds for BOTH kinds at both buffer consumers (`concludeAttempt`, the drain) and the loop is KIND-BLIND: an integrity-throwing completion of EITHER kind must NOT drop a sibling, the errors collected and the first re-surfaced. When the FIRST held completion gate-violates, the marker is UNMOVED and a valid sibling completion (either kind) still ADMITS — the run lands on the sibling's disposition while the error surfaces; on the HELD path the collected error's SURFACING point is the initiating `start()` call (the conclusion backstop re-throws, replacing the `Accepted` return) (anchored: contract:ch9-runner#C5 + contract:ch12-runtime-core#C15 + prose:built SM seam deliver-all discipline (kernel.ts#315-371)) |

The FAILED delivery grid (site × shape × phase — every cell driven or
ruled out; the driving family named per cell):

| Phase \ outcome | admitted | rung-rejected | gate-violation | vanished instance |
|---|---|---|---|---|
| HELD (pre-conclusion, flushed at `concludeAttempt`) | run → TERMINAL failed (SM1; driven with F2's asserts) | inert `ignored` — the superseded id (SM1/F3d, correlation on a live run) AND the terminalized-supersession member: a held completion flushed at the cas_conflict conclusion against a run a concurrent CANCEL/FAIL took TERMINAL rejects on the TERMINAL-SINK rung (F4's concurrently-terminal clause — the DIRECT cell's CANCEL member's held twin) | integrity throw COLLECTED, siblings delivered, first re-thrown — and the re-throw SURFACES from the initiating `start()` call's conclusion backstop, REPLACING its `Accepted` return (the test asserts rejection). Drivers: a LONE held hostile-reason FAILED (the throw-surfaces lane), and sibling-survival via the held batch `[READY(non-canonical ref) throws at its transport gate, FAILED(valid) still delivered → TERMINAL failed]` — the deliver-all loop is KIND-BLIND, so a FAILED survivor proves the discipline; a held FAILED-as-thrower WITH a sibling is NOT scriptable (K2's declared order fires the failure last) — that shape is owned by the direct-path lane (SM2/G2) | inert `rejected(unknown_instance)` (F1; ruled-in via direct construction — a held completion for a deleted instance is not constructible through the trace path, driven at the handler level) |
| DIRECT (post-conclusion, detached) | run → TERMINAL failed; drain returns `[terminated]` (SM2) | drain returns `[ignored]` — proves delivered-not-dropped (SM2/F3); members: the superseded/correlation family AND the late FAILED at a CANCEL-terminated run — the marker still `requested(request_id)` (CANCEL never writes it), so the TERMINAL-SINK rung, not correlation, rejects it: the F3b observability's operator-path twin | captured `{ok:false}`, re-surfaced by the drain after full drain (SM2/G2) | drain returns `[rejected(unknown_instance)]` (F1) |

### K — the testkit failure script

| Id | Rule | Class |
|---|---|---|
| K1 | `ScriptedProvisionBehavior` gains the FAILURE script: `failOnProvision?: { reason: string; detail?: string }` — fired SYNCHRONOUSLY inside `provision()` through the bound completion sink (the SM1 hold hazard), AFTER the record (record-before-outcome unchanged). `reason` is deliberately typed WIDE (`string`, not the closed enum) so tests can drive the G2 unknown-token integrity lane; the kit imports ports/domain/emit at most (ADR-005 unchanged); the record array stays testkit surface, never authority (REV-B) (anchored: prose:plan §9.4 P1 row (testkit failure script) + contract:ch9-runner#C1) |
| K2 | Combination sequences are scriptable: one behavior may script MULTIPLE completions for the same request (the existing `fireOnProvision`/`fireManyOnProvision` plus `failOnProvision`), fired in the DECLARED field order (ready fire(s) first, then the failure) — the both-kinds-one-request driver for the F3 mutual-exclusion lanes through the REAL seam (both held, flushed in order at conclusion: the first admits, the second rung-rejects). The field order is TEST-FIXTURE DETERMINISM beneath the draft's contract grain — the draft's C-rows specify no script shape, and the built player's existing fire order (`fireOnProvision` before `fireManyOnProvision`) is the same never-ratified code-order class; it binds no kernel, port, or production surface. Post-conclusion sequences are driven directly through `Kernel.deliverCompletion` (no script needed) (derived: contract:ch9-runner#C1 + prose:scripted-player culture (fireManyOnProvision) — DERIVATION: C1's exclusion inventory needs a deterministic two-completions-one-request driver on the held path; the declared-field-order rule is the minimal deterministic extension of the existing multi-fire script shape) |

### T — types + ripple

| Id | Rule | Class |
|---|---|---|
| T1 | Type homes (the module-boundary culture, ADR-001/ADR-014) — stated for the W3 REFERENCE realization; an admissible W3-equivalent re-homes its corresponding type surfaces under the SAME culture (each type beside its established sibling), the T2 sweep and the mutation boundary being representation-independent: `ProvisioningFailureReason` (the G1 union) + `RuntimeContextCompletion` (the W3 reference union) land in `domain/instance.ts` beside `RuntimeContextRef`/`RuntimeContext`, exported through `domain/index.ts`; `RuntimeContextFailedOutcome` (F4) + the drain's union return (`RuntimeContextCompletionOutcome = RuntimeContextReadyOutcome \| RuntimeContextFailedOutcome`) land in `domain/outcome.ts` beside `RuntimeContextReadyOutcome`; the sink type stays in `ports/runtimeContextProvider.ts` (broadened to the union); the kernel exports no new symbol beyond the `Kernel` interface members (derived: prose:module-home culture (domain/instance.ts RuntimeContextRef, domain/outcome.ts READY outcome) + contract:ch9-runner#C1, #C3 — DERIVATION: each new type lands beside its established sibling; no new module is minted) |
| T2 | The sink-signature VALUE-RIPPLE is a MEASURED sweep (R-ABSENCE-CONSUMERS — searched by the NAMES `RuntimeContextCompletionSink`, `bindCompletionSink`, `deliverCompletion`, `settleRuntimeContextDeliveries`, never only the new type surface; the names and the sweep OBLIGATION are representation-independent — a W3-equivalent realization ADDS its own surface names to the key set, it never removes these): the consumers at authoring — `l0eTrace.test.ts#98`, `l0dTrace.test.ts#78`, `l2aTrace.test.ts#107`, `cli/dev/main.ts#594` (sink-binding call shape), `kernel/lifecycle.test.ts#82` + its direct `deliverCompletion` drivers, `testkit/scriptedRuntimeContextProvider.test.ts#29` (the player's own sink binding), `ingress/ingress.test.ts#29/#418` (fake-Kernel stubs — the interface addition compile-forces them) — each re-based — plus `ports/index.ts#28` (the sink TYPE's re-export, classified NO-EDIT: the sink surface changes behind the same exported name, name-stable under the W3 reference and any admissible equivalent); the sweep re-runs UNTRUNCATED at build with a required end state of zero unconverted consumers (derived: prose:R-ABSENCE-CONSUMERS + contract:ch9-runner#C1 — DERIVATION: the sink shape change is the P2-`effectiveAgentConfig`-class ripple, compile-forced at the typed sites and name-searched for the untyped rest) |

### X — the gate ordering (the D5 realization half)

| Id | Rule | Class |
|---|---|---|
| X1 | This packet is the ch12-C15 D5 production-provider gate's REALIZATION half: the failure→FAIL channel (C1–C5) becomes REALIZED here, BEFORE any production registry member exists — ch9-P2's `pairflow.worktree` registration is LEGAL only after this packet lands (C6's join; the gate discharges by packet ordering, plan §9.4 P1-before-P2). At P1 the channel is DORMANT in production: the production registry stays EMPTY, no production code fires either completion — the dormancy is the gate's ordering, not a gap (anchored: contract:ch9-runner#C6 + contract:ch12-runtime-core#C15) |

### D — drift + coverage

| Id | Rule | Class |
|---|---|---|
| D1 | The ledger is BYTE-IDENTICAL; NO unit-map flip, NO domainRegistry flip, NO new rejection registry name (the two `sys:` reasons are `FAIL` REASON PAYLOAD carried in `failure_reason`, never registry rejection names — the 54-name registry and the drift lanes are green before AND after); the coverage union is unchanged (the empty slice declares zero axis movement). Any discovered need for model-plane change routes through the standing model↔code divergence stop (anchored: prose:plan §9.2 + contract:ch9-runner#C3) |

## Mirrored surface map (one canonical statement per rule)

- The RUNG ORDER + inert semantics are canonical in F1; mirrors:
  Claim §2, F3's per-lane rung naming, F4's CAS-restart re-admission,
  the grid's rung-rejected column.
- The MUTUAL-EXCLUSION inventory is canonical in F3; mirrors: Claim
  §2, the C1 quote (operative material), K2's driver duty.
- The ATOMIC FAIL COMMIT + marker retention is canonical in F2;
  mirrors: Claim §3, the C2 quote, the In-context marker note, the
  grid's admitted column.
- The REASON DOMAIN + gate point are canonical in G1/G2; mirrors:
  Claim §4, the C3/C5 quotes, K1's wide-reason rationale, SM2's
  integrity-throw clause.
- The `detail` confinement is canonical in G3, its landing ownership
  in G4; mirrors: Claim §5, the C4 quote.
- The HOLD/RELEASE identity is canonical in SM1, the direct/drain
  discipline in SM2; mirrors: Claim §1, the C5 quote + the expanded
  ch12-C15 fragment, the delivery grid, W3's same-buffer property.
- The UNCONDITIONAL-DETACH channel half is canonical in W2; mirrors:
  Claim (opening sentence), the C11 quote, the port-breach fragment
  under Delegated sources.
- The D5 ordering is canonical in X1; mirrors: Claim §"dormant"
  sentence, the C6 quote, the In-context dormancy note.
- The ACCEPTANCE family texts are NAMED mirrors: Acceptance-F of
  F2's facet list + F1/F3's lane inventory; Acceptance-SM of the
  delivery grid; Acceptance-G of G1–G3's lane set — a facet, cell,
  or member change updates the acceptance text in the SAME fold.
- The payload-never-registry-name rule is canonical in G1; D1's
  registry-untouched justification is its named mirror (defers,
  never restates independently).
- The W3 READING RULE (representation-independence) is canonical in
  W3 (with T1); every reference-realization mention — the embedding
  gates, Entrypoints, the seam bullet, Acceptance-W/T — is its
  mirror: reads as the reference, never a foreclosure.
- PARTIAL/FROZEN mirrors (not kept fully in sync by design): the
  C-row quotes in Operative material are the ratified rows' verbatim
  NORMATIVE bodies (trailers elided; C6 an explicitly partial,
  ellipsis-marked clause excerpt — per the Operative-material
  headers); they are the source, never edited to track packet
  phrasing.

Fold policy: a change to a canonical row updates EVERY named mirror
before handing back; a mirror discovered in review is ADDED here,
never re-discovered next round.

## In-context notes (the scarce budget)

- The marker-retention intent (C2): after a FAILED admission the
  `runtime_context` stays `requested(request_id)` — a deliberate
  diagnostic trace ("which request failed") readable on the floor's
  existing instance surface; the terminal disposition +
  `failure_reason` are the record. Do NOT "clean up" the marker.
- The channel is DORMANT in production at P1: the registry is empty,
  nothing production-side fires completions; every lane is driven
  through the scripted player and the kernel's own endpoints. The
  first production caller is ch9-P2's provider. This dormancy is the
  D5 gate's ordering.
- `reason` tokens on this channel are KERNEL-classified values
  (stored in `failure_reason`); they never appear on the delivery
  path's errand rows (that is C16's separate `runner_error`-kind
  bare-token world, ch9-P3's) — the two `sys:` families share the
  convention (C22), not a store.
- The FAILED handler deliberately loads NO template: unlike READY it
  binds no `required(spec)` and checks no kind — a failure report
  needs only identity (the rungs) and classification (the gate).
- `new_request_id` mints kernel-locally (`req-N`); the scripted
  failure script keys per provision CALL, so the unknown-token lane
  is drivable without touching the id scheme.

## Embedding gates

- **Target files (production):**
  - `v3/src/ports/runtimeContextProvider.ts` — the sink type
    (`#53-57`) broadens to carry BOTH completion kinds (the W3
    reference: the completion union; an admissible W3-equivalent
    changes the corresponding sink surface — T1's
    representation-independence note applies); the port docs gain
    the W2 unconditional-detach channel half + the FAILED completion
    contract (W1).
  - `v3/src/domain/instance.ts` — `ProvisioningFailureReason` +
    `RuntimeContextCompletion` beside `RuntimeContextRef` (`#45`) /
    `RuntimeContext` (`#57`) (T1 — the W3 reference realization's
    homes).
  - `v3/src/domain/outcome.ts` — `RuntimeContextFailedOutcome` + the
    `RuntimeContextCompletionOutcome` union beside
    `RuntimeContextReadyOutcome` (`#94-98`) (F4/T1).
  - `v3/src/domain/index.ts` — export the new types.
  - `v3/src/kernel/lifecycle.ts` — the NEW `runtimeContextFailed`
    handler (F family; deps = `LifecycleDeps` — no template load, no
    canonicality injection needed: the G1 membership check and the G3
    string gate are pure) beside `runtimeContextReady` (`#469-532`)
    and the `fail` commit shape (`#660-703`).
  - `v3/src/kernel/kernel.ts` — the `Kernel` interface (`#106-142`)
    gains `runtimeContextFailed` + the FAILED-capable delivery
    endpoint (the W3 reference: the broadened `deliverCompletion`;
    W3's reading rule applies);
    the seam (`#202-371`) delivers BOTH completion kinds through the
    ONE buffer (the W3 reference: buffer value → the union, routed by
    kind; an admissible W3-equivalent reaches the same buffer through
    its parallel typed endpoint — the seam obligations are
    representation-independent); `concludeAttempt`/
    `deliverCompletion`/`settleRuntimeContextDeliveries` deliver both
    kinds; the
    dispatch wiring (`#689-693`) gains the `failedOp` `lifecycleOp`
    wrap.
  - `v3/src/kernel/index.ts` — in-boundary MAY-change: a new
    kernel-facing type re-export would land here; the boundary lists
    it defensively (the boundary is an upper bound on the change set,
    not a promise to change — a build leaving it untouched is
    conforming).
  - `v3/src/testkit/scriptedRuntimeContextProvider.ts` — the K1
    `failOnProvision` script + the K2 declared-field-order rule; the
    sink call sites carry the union.
  - `v3/src/cli/dev/main.ts` — the sink-binding call shape (`#594`)
    re-based to the union (T2; mechanical, no verb/flag change).
- **Entrypoints:** `Kernel.runtimeContextFailed` (the new in-process
  kernel event handler), `Kernel.deliverCompletion` (broadened — or
  carrying its W3-admissible parallel-endpoint equivalent beside it),
  `Kernel.settleRuntimeContextDeliveries` (union return),
  `createScriptedRuntimeContextProvider` (the failure script). NO
  shipped CLI verb changes; NO ingress endpoint (the event is
  in-process only, W1).
- **Mutation boundary:** the files below. Extend-don't-fork: the
  handler is a new sibling beside READY/`fail`; the seam broadens its
  value type, never forks a second buffer (W3's foreclosure); the
  scripted player extends its behavior record.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/ports/runtimeContextProvider.ts",
      "v3/src/domain/instance.ts",
      "v3/src/domain/outcome.ts",
      "v3/src/domain/index.ts",
      "v3/src/kernel/lifecycle.ts",
      "v3/src/kernel/kernel.ts",
      "v3/src/kernel/index.ts",
      "v3/src/testkit/scriptedRuntimeContextProvider.ts",
      "v3/src/cli/dev/main.ts",
      "v3/src/kernel/lifecycle.test.ts",
      "v3/src/testkit/scriptedRuntimeContextProvider.test.ts",
      "v3/src/ingress/ingress.test.ts",
      "v3/src/l0eTrace.test.ts",
      "v3/src/l0dTrace.test.ts",
      "v3/src/l2aTrace.test.ts",
      "v3/implementation/packets/ch9-p1-fail-channel.md"
    ]
  }
}
```

- **Test targets (type-ripple + new):**
  - `v3/src/kernel/lifecycle.test.ts` — the F/G/SM families (the
    handler's rungs, the exclusion inventory, the atomic commit +
    marker retention, the gate lanes, held/direct FAILED delivery,
    the drain union); the existing sink-binding shape re-base (T2).
  - `v3/src/testkit/scriptedRuntimeContextProvider.test.ts` — the K
    family (the failure script, record-before-outcome, the
    declared-field-order combination).
  - `v3/src/ingress/ingress.test.ts` — the fake-Kernel stubs gain the
    new interface members (T2; compile-forced, no behavior).
  - `v3/src/l0eTrace.test.ts` — the FAILED-variant lane on the
    provisioned trace (the scripted provider fails → the run lands
    TERMINAL `failed`, `failure_reason` = the token, the marker
    retained — the floor read asserts all three); the sink-shape
    re-base.
  - `v3/src/l0dTrace.test.ts`, `v3/src/l2aTrace.test.ts` — the
    sink-shape re-base only (T2; no semantic change).

**Substrate probe:** none required — no matrix/lane cell rests on
driver/OS/filesystem behavior: the channel is pure in-memory
deterministic kernel + seam logic over the built store write
(`newFailureReason`, existing since ch12-P1a/P1b). The draft's git/
tmux/spawn probes (P1a–P3d) back ch9-P2/P3/P4 rows, not this
packet's.

## Pre-approval flags

None. Zero new-decision manifest rows (tally: 13 anchored / 6 derived
/ 0 new-decision); no narrowing, no contract-reality issue open, no
route awaiting an approve-time decision. The two scoping edges are
DERIVED rows with in-row derivation notes, not flags: G4 (the
`detail` diag/audit landing deferred to the C26-realizing packets —
derived from the P1 row's content list + C26's runner-plane framing)
and W3 (the completion-union seam representation — the property fixed
by C1/C5, the representation class the build's within it).

## Acceptance

- Contract tests: the C1/C2/C3/C4/C5/C6/C11/C22 obligations this
  packet realizes, driven by claim-derived negatives (the F3
  exclusion inventory, the G2 unknown-token lane, and the SM
  never-dropped lanes derive from the CLAIM/matrix, never from the
  implemented predicate's shape — R-CLAIM-NEGATIVES; every declared
  matrix lane is DRIVEN — R-MATRIX-LANES).
- Checks: the drift suite (unit-map + domainRegistry + rejection
  registry LOCKED unchanged — D1; ledger byte-identical),
  `v3:packet-lint`, `v3:adr-check` (ADR-016/017/018 statuses
  untouched).
- Test disciplines + family inventories (DISCIPLINE + FAMILY
  INVENTORY, R-ALTITUDE-LINE — membership parameterized, fixture
  enumeration is build work; R-LANE-SENSITIVITY binds twice — at
  these lane texts now, at the built bodies via the arm gate-2
  sensitivity pass):
  - **W (wire/port):** the declared set {the FAILED completion
    reaches the kernel through the seam and only through it (no
    ingress route — an ingress envelope cannot address it); the
    FAILED-capable sink carries both kinds (the W3 reference: the
    broadened sink; W3's reading rule applies); the port-breach lane stays
    distinct from the FAILED channel (a scripted sync-throw is still
    the S4 port breach, never a FAILED admission)} each driven.
    Membership: W1–W3 (owner: this packet).
  - **F (handler):** the declared set {the rung order per-rung — the
    FAILED-first terminal-sink case is outcome-OBSERVABLE (F3b: a
    correlation-matching READY after FAILED must be `ignored`;
    red-proven by disabling the terminal-sink rung → the failed run
    resurrects) unlike ch12-P3's indistinguishable pair; the four F3
    exclusion lanes each asserting BOTH the inert outcome AND the
    unchanged instance row (status, disposition, `failure_reason`,
    marker); the F2 admitted commit asserting ALL FIVE written facets
    (TERMINAL, `failed`, `failure_reason` = token, wait null, NO
    fact/version-arithmetic beyond one commit) AND the marker
    retention (`requested(request_id)` survives); the late direct
    FAILED at a CANCEL-terminated run (terminal-sink rejects, the
    marker retained — the grid's operator-path member); the
    `unknown_instance` inert lane; the CAS-restart lane (a
    conflicting concurrent commit → reload → rung re-evaluation)}
    each driven. Membership: F1–F4 (owner: this packet; driven in
    `kernel/lifecycle.test.ts`).
  - **G (gate):** the declared set {both G1 members admit and land
    verbatim in `failure_reason`; an unknown token (incl. a bare
    un-prefixed `provision_failed`, an authored-grammar token, and a
    non-string) integrity-throws fail-closed with ZERO state change
    (asserted post-throw: status/marker/`failure_reason` unchanged);
    the gate point is AFTER the rungs (a rung-rejected completion
    with a HOSTILE reason is `ignored`, never a throw — one outcome
    per event, the combination lane); `detail` present-and-string
    admits and is NOWHERE in kernel state (`failure_reason` ≠
    detail); `detail` non-string integrity-throws} each driven.
    Membership: G1–G4 (owner: this packet; G4's no-new-diag-event
    claim is driven by the existing diag-emission suite staying
    green + a lane asserting the admitted FAILED emits no kernel
    diag event).
  - **SM (seam):** the declared set = the delivery grid's cells {held
    FAILED admitted at conclusion; held FAILED superseded → inert
    (correlation on a live run; incl. the terminalized-supersession
    member rejected on the TERMINAL-SINK rung when a concurrent
    CANCEL/FAIL took the run TERMINAL — the DIRECT lane's held twin);
    LONE held hostile-reason FAILED → the throw surfaces from the
    `start()` call (asserts rejection + zero state change); held
    sibling-survival `[READY(non-canonical) throws, FAILED(valid)
    delivered → TERMINAL failed, first error re-surfaced]` (the
    kind-blind deliver-all loop — a FAILED survivor proves it);
    direct FAILED admitted → drain `[terminated]`; direct FAILED
    inert → drain `[ignored]` (delivered-not-dropped, fail-able;
    incl. the CANCEL-terminated terminal-sink member); direct
    hostile-reason → captured, re-surfaced after full drain; the
    immediate-return property (the scripted sync fire returns before
    conclusion)}
    each driven — the held lane must FAIL an implementation
    delivering FAILED before the START commit (correlation would
    reject it, the run stuck `requested` instead of TERMINAL-failed).
    Membership: SM1–SM2 + the grid (owner: this packet; driven in
    `kernel/lifecycle.test.ts` + the l0e FAILED trace variant).
  - **K (testkit):** the declared set {`failOnProvision` fires
    through the sink synchronously after the record; the wide reason
    type passes hostile tokens through unaltered; the declared field
    order for combination scripts; sink-unbound failure script →
    loud error (the fireOnProvision culture)} each driven in the
    player's own test file. Membership: K1–K2 (owner: this packet).
  - **T (types/ripple):** the T2 sweep re-runs UNTRUNCATED at build
    (the four name keys — the W3 reference set; an equivalent ADDS
    its surface names per T2) with zero unconverted consumers; the
    interface additions compile-force the ingress fake-Kernel stubs;
    `RuntimeContextCompletionOutcome` is the drain's declared return.
    Membership: T1–T2 (owner: this packet).
  - **X (ordering):** the production-dormancy claim driven by the
    existing composition suites staying green with the EMPTY registry
    (no production fire site — a grep-backed build assertion with
    the PINNED `kind:`-keyed pattern (`kind:\s*"failed"`), asserted
    over production sources with testkit/dev excluded: post-build
    its ONLY legitimate production match is the T1 union
    DECLARATION's own arm in `domain/instance.ts` (a type
    declaration, excluded by name — any OTHER match is a
    construction site and fails the assertion); the looser
    `: "failed"` value pattern is NOT the assertion — under it the
    `disposition: "failed"` / `newTerminalDisposition: "failed"` /
    egress `status: "failed"` spellings would false-positive). The
    dormancy claim is TWO-pattern (the gate-2 single-form finding's
    fold): the construction-literal grep above PLUS an
    INVOCATION-SITE grep — zero production
    `runtimeContextFailed(`/`deliverCompletion(` call sites outside
    the kernel's own definition/wiring (tests/testkit/dev excluded)
    — each pattern receipt-backed at build close. Membership: X1 (owner: this packet; the P2-side join
    legality is ch9-P2's to prove).
  - **D (drift):** the standing drift suite green before AND after;
    the rejection-registry lock proves no name added. Membership: D1
    (owner: this packet).
- Drift tests green (standing, unconditional — PI-3).
- Standing review rules in force: REV-A1-TXN (the FAILED admission's
  five written facets ride ONE `commitLifecycle` transaction);
  REV-B-LOCAL-NOT-AUTHORITY (the seam buffer and the scripted
  player's record are delivery/test surface, never authority — the
  store row is the only truth the rungs read);
  REV-E-NO-ADAPTER-BRANCH (the kernel never branches on a concrete
  provider type — the channel is provider-anonymous);
  REV-DIAG-FAILOPEN (no new diag site is added — G4; the existing
  bare-call culture unchanged).

## Build record

**Execution context:** fresh-context-DELEGATED build (the README §4
default) — an Opus-class subagent fed the self-contained packet plus
the delegation prompt's verbatim-quoted discipline lines (the ten
stronger-than-suite lines: the five-facet F2 assert, the per-lane
inert+unchanged-row asserts, the zero-state-change post-throw store
reads, the fail-able drain distinctions, the sibling-survival and
lone-hostile held lanes, the FAILED trace variant, the no-new-diag
lane). The main context held orchestration, the verification chain,
both arm gates, and the commit boundary; the orchestrator authored
zero code.

**Review + gate history:** internal panel — 1 full + 2 targeted
rounds (yields 8 → 2 → 2, all folded) + 2 fresh-context closes + 3
lens-4 reconciliation passes; CLEAN close at `30ceb0eb`. Arm gate 1
(codex gpt-5.6-sol/high, agent-invoked): 1 full leg + 4 re-checks,
yield 8 → 3 → 2 → 1 → CLEAN citing the final basis `30ceb0eb`; one
600s infra timeout on the first leg (retry succeeded, §6 item-8
ladder); two findings REFUTED with evidence and
REFUTATION-ACCEPTED by the arm (W3's representation class via the
ch12-P3 SM3 precedent; K2's field order via the testkit-grain
argument — both stayed `derived`, zero flags minted).

**Build:** the W3 reference realization (the completion union, one
sink type, the broadened `deliverCompletion`, the kind-blind
`deliverOne` seam router; the `runtimeContextFailed` handler with
the pure G2/G3 gate helpers; the K1 `failOnProvision` script). Test
delta **1265 → 1292 (+27)** across the F/G/SM/K/TR families. Two
build-grain realization notes (within declared rows, no packet
contradiction): the failed arm's wire typing is `reason: string` +
`detail?: unknown` with the gate narrowing via `typeof` guards (the
READY ref-`kind`/locator analog — C3/C4's property, the exact
spelling build-grain under W3's reading rule); the SM
terminalized-supersession held member is driven via an
`interceptFailCommitStore` wrap injecting a concurrent CANCEL +
`cas_conflict` (the member is not deterministically constructible
through the scripted-player conclusion path — the same terminal-sink
rung is also proven by F3c and the DIRECT CANCEL member).

**R-DERIVED-PROBES (family → mutation → expected red → observed;
receipts under the session scratchpad `ch9p1-probes/`, probe-runner
protocol, restores byte-verified):**

| Family | Mutation | Expected red | Observed | Receipt |
|---|---|---|---|---|
| W | invert the seam kind-router (ready↔failed) | FAILED delivery breaks | RED (exit 1) | `W.receipt.json` |
| F | flip the admitted-FAILED disposition `failed`→`cancelled` | the F2 facet assert fails | RED (exit 1) | `F.receipt.json` |
| G | disable the reason-membership gate | the G2 unknown-token throw lost | RED (exit 1) | `G.receipt.json` |
| SM | abort deliver-all on the first throw | the sibling FAILED dropped, no TERMINAL failed | RED (exit 1) | `SM.receipt.json` |
| K | `failOnProvision` never fires through the sink | the K1 sink assert fails | RED (exit 1) | `K.receipt.json` |
| T | drop the `RuntimeContextCompletion` export | typecheck breaks | RED (exit 2) | `T.receipt.json` |
| X | (aftermath P7) inject a `kind: "failed"` construction literal into `cli/main.ts` | the X1 dormancy grep's match count leaves its baseline 1 | RED (exit 1 — 2 matches) | `aftermath/P7-X1-dormancy-grep.receipt.json` |
| D | (aftermath P8) rename one registry member in `domain/rejections.ts` | the drift ledger-set-equality test | RED | `aftermath/P8-D-drift-registry-rename.receipt.json` |

The aftermath SENSITIVITY probes P1–P6 (the gate-2 folds: W1 ingress
no-route, G1 exhaustiveness, G3 number-gate + whole-row confinement,
SM drain-drop, K1 record-before-fire, l0e seam-router) live in the
same receipt home (`ch9p1-probes/aftermath/`), each RED with a
byte-verified restore; the invocation-site dormancy sweep's receipt
is `aftermath/X-invocation-grep-receipt.txt` (zero production call
sites).

X1 dormancy grep executed (the pinned `kind:\s*"failed"`
construction-position pattern, production sources, testkit/dev
excluded): the ONLY match is the T1 union declaration arm
(`domain/instance.ts`), zero construction sites — the channel is
dormant as claimed (receipt `X1-grep-receipt.txt`).

**Aftermath (build close):** post-build boundary audit 0 errors @
`14be9b3f`; coverage validation green. Arm gate 2 (codex
gpt-5.6-sol/high, agent-invoked, 1200s mode): **9 findings, ALL
test-evidence class, ZERO product findings** — the sensitivity pass
caught six plausibly-blind lanes (W1 no-ingress-route, W3
single-buffer, G1 exact-two-members, G3 non-string/confinement, SM
direct-vanished-drain, K1 record-before-outcome) plus the l0e trace
bypassing the provider seam, the single-form X1 grep, and the
missing X/D probe rows. Dispositions: 8 FOLDED by a fresh-context
aftermath agent (new/raised tests, test delta 1292 → 1297; probes
P1–P8 through the probe runner, each RED with byte-verified restore,
receipts under the session scratchpad `ch9p1-probes/aftermath/`) — 
incl. the l0e FAILED variant re-routed through the DECLARED
`failOnProvision` seam and the exported
`PROVISIONING_FAILURE_REASONS` const making G1's closed set
exhaustiveness-assertable (the one production line class touched);
1 NARROWED — W3's single-buffer property is code-review-asserted
(recorded in-row; the ch12-P3 rung-order precedent). The X1 dormancy
claim gained its second (invocation-site) pattern, receipt-backed.
Aftermath authorship: tests + probes = the delegated aftermath
agent; packet-text folds = the orchestrator. Mutation-pilot
dual-run (the §9.4 flow note; scoped to the boundary's six semantic
production files, 19 s): **82.03%** — 705 killed / 16 timeout / 100
survived / 58 no-coverage / 0 errors. Survivor caveat for the
boundary read: the scoped files carry ALL prior chapters' kernel
code, so the survivor set is not per-delta; classification
(code-mutation vs input-domain) is the boundary review's, no fix
owed at the pilot stage. **Leg close** (the README §6
diminishing-returns cutoff; the ch12-P3 precedent): the gate-2
re-check at `aeae92d4` resolved 8/9, accepted the W3 narrowing,
audited every probe receipt RED, and yielded ONLY the probe-table
carrier item (the X/D rows absent from the canonical table) — folded
here, so the build-close arm leg CLOSES on this bookkeeping-only
round.

```json
{
  "packet_metrics": {
    "class": "kernel-semantic",
    "prediction": { "predicted": "projection", "reasoning": "plan §9.4 P1 row: the ratified ch9 draft rows C1-C6/C11/C22 + the ch12-C15/C18 mechanics", "discovered": "projection" },
    "provenance": { "anchored": 13, "derived": 6, "new_decision": 0 },
    "rounds": { "review": 8, "doc_refinement": 0, "implementation": 2 },
    "stops": [],
    "detector_misses": [
      { "found_at": "arm-approve", "what": "the sizing counted 2 surfaces where the ch12-P3 counting precedent yields 3 (ports/domain shared-contract face) — hard-stop-2 letter-trip + closure proof were owed", "why_missed": "the panel accepted the packet's own surface-class reading without re-deriving the count from the precedent packet" },
      { "found_at": "arm-approve", "what": "representation foreclosure: W3 left the seam representation open while T1/T2/embedding gates MANDATED the union — the openness was illusory packet-wide", "why_missed": "the derived-row entailment attack checked W3 in isolation, never the cross-row conjunction" },
      { "found_at": "arm-approve", "what": "the Claim's 'outcome-total over delivered completions' omitted the gate-throw exit (a delivered hostile completion yields no outcome) — decision-total wording owed", "why_missed": "totality was audited against the outcome union, not walked through the gate-violation path" },
      { "found_at": "arm-approve", "what": "quote-fidelity: partial C6 excerpt labeled verbatim; punctuation silently changed", "why_missed": "the panel verified quoted bytes but not the labeling of what was elided" },
      { "found_at": "arm-build-close", "what": "six green-but-blind lanes: the build realized lane PRESENCE at the declared strength but sensitivity gaps survived (no-route negatives, the single-buffer property, closed-set exhaustiveness, non-string sub-shapes, drain-path vanished case, fire-time ordering)", "why_missed": "the spec-time altitude rule correctly defers member-level sensitivity to build close — the gate worked as designed; the miss is the BUILD agent's lane-strength reading, caught by the mandatory sensitivity pass" }
    ],
    "learned": "the arm's approve leg again out-caught the panel on record-precision classes (sizing counts, cross-row foreclosure conjunctions, quote-fidelity labels) — the ch12-P0 churn class; and a 600s doc-review arm leg can time out on a five-surface prompt (infra retry converged at 440s)",
    "main_thread_model": "claude-fable-5"
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "W1", "class": "anchored", "refs": ["contract:ch9-runner#C1", "contract:ch9-runner#C5"] },
      { "id": "W2", "class": "anchored", "refs": ["contract:ch9-runner#C11", "contract:ch12-runtime-core#C18"] },
      { "id": "W3", "class": "derived", "refs": ["contract:ch9-runner#C1", "contract:ch9-runner#C5", "prose:built SM seam (kernel.ts#202-371)"] },
      { "id": "F1", "class": "anchored", "refs": ["contract:ch9-runner#C2", "contract:ch12-runtime-core#C18", "contract:ch12-runtime-core#C15"] },
      { "id": "F2", "class": "anchored", "refs": ["contract:ch9-runner#C2"] },
      { "id": "F3", "class": "anchored", "refs": ["contract:ch9-runner#C1"] },
      { "id": "F4", "class": "derived", "refs": ["contract:ch9-runner#C2", "prose:built fail/READY handler shapes (lifecycle.ts#469-532, #660-703)"] },
      { "id": "G1", "class": "anchored", "refs": ["contract:ch9-runner#C3", "contract:ch9-runner#C22", "ADR-018"] },
      { "id": "G2", "class": "anchored", "refs": ["contract:ch9-runner#C5", "contract:ch9-runner#C3", "contract:ch12-runtime-core#C18"] },
      { "id": "G3", "class": "anchored", "refs": ["contract:ch9-runner#C4", "contract:ch9-runner#C5"] },
      { "id": "G4", "class": "derived", "refs": ["contract:ch9-runner#C4", "contract:ch9-runner#C26", "prose:plan §9.4 P1 row"] },
      { "id": "SM1", "class": "anchored", "refs": ["contract:ch9-runner#C5", "contract:ch12-runtime-core#C15"] },
      { "id": "SM2", "class": "anchored", "refs": ["contract:ch9-runner#C5", "contract:ch12-runtime-core#C15", "prose:built SM seam deliver-all discipline (kernel.ts#315-371)"] },
      { "id": "K1", "class": "anchored", "refs": ["prose:plan §9.4 P1 row (testkit failure script)", "contract:ch9-runner#C1"] },
      { "id": "K2", "class": "derived", "refs": ["contract:ch9-runner#C1", "prose:scripted-player culture (fireManyOnProvision)"] },
      { "id": "T1", "class": "derived", "refs": ["prose:module-home culture (domain/instance.ts, domain/outcome.ts)", "contract:ch9-runner#C1", "contract:ch9-runner#C3"] },
      { "id": "T2", "class": "derived", "refs": ["prose:R-ABSENCE-CONSUMERS", "contract:ch9-runner#C1"] },
      { "id": "X1", "class": "anchored", "refs": ["contract:ch9-runner#C6", "contract:ch12-runtime-core#C15"] },
      { "id": "D1", "class": "anchored", "refs": ["prose:plan §9.2", "contract:ch9-runner#C3"] }
    ]
  }
}
```
