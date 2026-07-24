# Task Packet: ch9-p3b-actor-adapter — the real actor adapter

Plan step: plan.md §9.4 ch9-P3b row (the P3 sizing split's ACTIVATION
share; the split record lives in §9.4's process note). Realizes the
adapter half of §9.1 item 4: the real `AttemptExecutor` behind the
ch9-P3a seam — the C19 shared spawn discipline (born here, with the
ch9-P2 provider's `DEFERRED(ch9-p3)` fold-in discharged), the C17
attempt-scoped handoff, the C18 argv mapping, the C20 emit capture +
ingress submission, and C23's exit-result seam on the DIRECT-SPAWN
path — plus the `CT-B-TWOWORKER` re-run under the real runner. The
tmux wrap, the attach channel, the process-gate real spawn, and the
CLI/floor surface are ch9-P4's.
Draft anchors (= the manifest's C-row ref union PLUS C10 — H1's
projection-value witness, carried as new-decision derivation prose,
never a manifest ref): `contract:ch9-runner`
rows C4/C10/C13/C14/C15/C16/C17/C18/C19/C20/C21/C23/C26.
ADR-017 (spawn confinement) is governing authority — this packet is
its primary realization; ADR-016 binds THROUGH the P3a seam (the
adapter changes no errand semantics); ADR-004 binds at C20's op-id
derivation; ADR-018 binds NEGATIVELY only (no `sys:` token ever
rides the delivery path — the consumed C16/C21 halves).

Autonomy stage: measurement — inherited from the ch9 chapter header.
**First-of-a-kind: YES** — the first real actor adapter (real child
processes doing host work on the delivery path): the HUMAN approve is
inherited from the P3 row's declared mode and stands on R-FIRST-STOP
regardless of flags (the packet carries flags besides — STOP
`4:flagged-approve` coincides).

Plan alignment (R-ALIGNED-UP): none — no ratified plan text is
contradicted (the §9.4 P3a/P3b repartition landed with ch9-P3a; this
packet realizes its own row as written).

Classification: **projection** — manifest tally: 6 anchored /
14 derived / 6 new-decision (machine-counted from the `packet_rows`
block). Every anchored row cites a ratified ch9-runner draft row;
derived rows narrow inside explicitly delegated claim surfaces (C23's
result seam realized at direct-spawn grain, C20's "readable/parseable"
realized at schema grain, C19's env/timeout knobs instantiated) with
in-row derivation notes. The SIX new-decision rows (SD1 the
spawn-seam shape; T1 the module homes + `enc` relocation; AV2 the
`PAIRFLOW_*` variable names; H1 the provider-contract cwd
capability; H5 the attempt-start guard mechanism; T2 the
delivery-timeout default + composition pairing rule) are flagged, dated
decision records riding this packet's HUMAN approve as
`approve-ratified` (flags F1/F4/F5/F8/F10) — none touching
authority/separation/availability-class semantics (the delivery
authority SHAPE is P3a's ratified ledger; the confinement boundary is
ADR-017's); the Case-B recommendation is NOT-B: the five rows
besides H5 are host-convention/representation grain under ratified
semantic rows, and H5's guard mechanism realizes P3a's own CF3
letter and C13's identity (the mechanism's SHAPE is the decision) —
presented for the ratifier's own verdict at the approve.

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

The EMPTY slice is a declaration, not an omission (R-EMPTY-SLICE;
plan §9.2: the runner surfaces are adapter/runtime-side, outside the
unit tree — the sole ch9 candidate unit resolved at ch9-P2). This
packet's claim surface is its canonical contract matrices. No
rejection-name registry change (the 54-name registry stays
byte-identical — drift lanes green before and after). Invariants:
none newly owned. Traces: none (the executable expectations are the
matrix families plus the CT-B re-run, this packet's acceptance).

## Sizing/risk (template §2 step 0 — materialized)

The P3 bundled-row gate ran at ch9-p3a authoring (its record lives in
that packet); this is the gate re-run on P3b ALONE. Axes: authority
movement — NO (the errand ledger, claims, budget, and confirmation
semantics are P3a's committed foundation; this packet adds an
EXECUTOR behind the ratified seam and moves no source of truth).
Surface spread — the SPAWN-DISCIPLINE concept touches the new
`runner/spawn.ts` seam + the adapter consumer + the ch9-P2 provider
fold-in = THREE production surfaces, hard stop 2 LETTER-TRIPPED;
closure proof: the seam and both consumers are ONE compile-linked
change with ONE proof surface (`pnpm v3:test` — the new seam/adapter
families plus the UNCHANGED provider suite re-proving the fold-in);
the third declared consumer (the process-gate real spawn) is staged
OUT by the plan's own packet cut (ch9-P4), not by this packet's
sequencing choice. The diag face growth (ports/diagnostics.ts + the
store read gate) repeats the ch9-P2/P3a closure-proven compile-linked
pattern. Identity/join fragility — present but PINNED by ratified
rules: the result file joins on the ECHOED `attempt_id` (C23, driven
negative), the emit join re-derives `context_packet_id` from the
packet's own fields (C13/ADR-004 — equal to the errand key by
construction). Foundation + activation coupling — this packet IS the
activation share of an EXECUTED split; its foundation (P3a) is
committed and green, so hard stop 3 (unfinished prerequisite) does
not trip. Acceptance multiplicity — adapter matrix lanes + the CT-B
re-run + the fold-in regression: one proof surface, no
per-consumer-family review loop. Hard-stop-9 material: NOT near — no
lock/lease/idempotency semantics change (they are P3a's, untouched);
the wrapper kill-ordering rules are per-attempt observation detail
under C19/C23, not coordination-primitive introduction.
**Single-packet allowed: yes.**

Consume-family scan (from the tree): producer = the delivery loop
(P3a, untouched); execution consumer = the real adapter (HERE);
external/integration = the ingress submission path (HERE — through
the EXISTING `ingress.submit`, no ingress change);
persistence/replay = ABSENT (no store change on either store);
validator/gate = ABSENT (no kernel/gate change); read/presentation =
ABSENT (floor/CLI are ch9-P4's; the diag read gate grows
type-synced); recovery/cleanup = ABSENT (lease/reclaim are P3a's;
teardown is a named Absent); testkit = ABSENT as a CONTRACT (the
scripted executor is unchanged; the CT-B stub actor is a test-local
temp-file asset staged through the shipped argv-mapping surface,
not a new testkit member).

Conditional annexes:

- **Closure-budget triage:** buckets in scope — the shared spawn
  seam (new), the adapter, the provider fold-in, the diag contract
  face. Intentionally collapsed: seam + both consumers as one
  compile-linked change (safe — one module family, one proof
  surface; the provider's observable behavior is pinned UNCHANGED by
  its existing suite); diag type face + read gate as one change (the
  established pattern). Explicitly deferred: the process-gate spawn
  consumer + the tmux wrap + attach + CLI/floor surfacing (ch9-P4),
  teardown/health/retry-on-FAILED (named Absents).
- **Proof-boundary triage:** delivery-truth proof semantics are
  UNCHANGED — the committed transcript row remains the sole proof of
  delivery (CF1, P3a's) before and after; the result seam this
  packet adds is an ATTEMPT-OBSERVATION surface (which K1 member an
  attempt produced), never a confirmation source — a result file
  can only make an attempt conclude, never make an errand
  `confirmed` (evidence stays kernel-side). No surface goes
  mixed-truth.
- **Mutable-flow record:** `N/A — no axis triggered`: no producer
  behavior changes, no rollback/retry/lease/idempotency semantics
  move (all P3a's, byte-untouched), and the one precondition
  ordering this packet adds (handoff written BEFORE spawn; result
  read AFTER wrapper conclusion) is per-attempt file sequencing with
  zero durable-state effect outside the attempt directory.

## Operative material (full text — projection, not invention)

The semantic source is the ratified `ch9-runner` contract
(2026-07-23, content commit `5c68f206`, amended `09825f78`,
re-ratified `4db149b1`). The adapter rows — verbatim NORMATIVE bodies
(the `DECIDED HERE …` provenance clauses and markers are elided;
decision provenance lives in the draft, never re-decided here):

> **C17** | The actor adapter's delivery effect: materialize the
> dispatched ContextPacket as canonical JSON at
> `<cwd>/.pairflow/<enc(attempt_id)>/packet.json` (the handoff
> directory is ATTEMPT-SCOPED — C16's minted `attempt_id` — so a
> stale or parallel attempt's files can never be read as another
> attempt's) and spawn the actor process there — where `<cwd>` is
> the projected worktree path when the run has a runtime context,
> and — on the `requirement: none` lane — a PER-RUN SUBDIRECTORY of
> the composition-configured `default_cwd`
> (`<default_cwd>/<enc(instance_id)>--<enc(context_packet_id)>`,
> C8's encoding: the per-RUN outer layer separates concurrent
> DIFFERENT-run deliveries in the shared `default_cwd` — retries
> within one run are already separated by C16's attempt-scoped inner
> directory); ONE path variable covers both lanes, mirroring C20's
> read side, and the same confinement rules (C19) apply to both.
>
> **C18** | The adapter maps `effective_agent_config` to a spawnable
> argv through an ADAPTER-OWNED, composition-injected mapping
> (config → command template); the mapping is host configuration,
> NEVER kernel semantics — the kernel's contract ends at issuing
> `effective_agent_config` in the packet (ch12-C7/C10 cited;
> `issued ≠ proven runtime` stands). An unresolvable mapping (no
> template for the config) is a spawn-infra failure lane (C16),
> never a kernel rejection. Scope: this realizes the ARGV-MAPPING
> half of ch12-C7's named consumer expectation; the declared-ref
> value classes (`*_refs`) stay UNINTERPRETED at ch9 — their
> interpreting consumer is the later ContextAssembly surface (L2b,
> the named §1.3 candidate).
>
> **C19** | ONE spawn discipline serves both consumers (actor
> adapter + process-gate runner): explicit `cwd` (C17/C21), an ENV
> ALLOWLIST (the child receives ONLY the composition-declared
> allowlist + adapter-injected pairflow variables — never the full
> host environment), a composition-configured timeout delivered as
> SIGTERM with a BOUNDED-GRACE SIGKILL ESCALATION
> (composition-configured grace, default 10 s — a SIGTERM-ignoring
> child is killed, so no spawn is unbounded SHORT OF an
> uninterruptible-I/O wedge, which even SIGKILL cannot clear — that
> residual is the mount-loss class C12's substrate rules own; P3a:
> `code null, signal SIGTERM` is the timeout's normal observable),
> stdout/stderr captured (P3b: output and exit code are both
> observable), env replacement full by substrate (P3d: the child
> sees ONLY the passed object). Spawn of a missing binary is a
> DISTINCT infra lane (P3c: the `error` event fires with `ENOENT`;
> no exit code is produced).
>
> **C20** | Actor-emit capture: after actor exit 0, the adapter
> reads the actor's emitted envelope from
> `<cwd>/.pairflow/<enc(attempt_id)>/emit.json` (the mirror of
> C17's packet handoff — the adapter reads ONLY its OWN attempt's
> directory), derives the content-addressed `op_id` VIA emit-lib on
> the actor's behalf (ADR-004's actor-emit scheme — the adapter is
> the emit-lib caller; a real LLM actor cannot be), and submits
> through NORMAL ingress — every ingress admission rule binds
> unchanged (IC-E cited: ingress never assumes a particular
> adapter). Exit 0 with no readable/parseable `emit.json` is the
> C15 `unconfirmed` lane.

The C23 clauses this packet realizes (the EXIT-RESULT SEAM on the
direct-spawn path — the session/tmux clauses are ch9-P4's; C23's
attempt-start transaction membership landed at P3a):

> **C23 (the exit-result seam)** | THE EXIT-RESULT SEAM (the
> session's death swallows the child's exit status — `tmux
> new-session -d` returns immediately, and P2e proves only liveness
> survives): the wrapped actor command runs under a thin RESULT
> WRAPPER whose last act ATOMICALLY writes
> `<cwd>/.pairflow/<enc(attempt_id)>/result.json` (exit code or
> signal, PLUS the echoed `attempt_id` — the adapter VERIFIES the
> echo, and a missing or foreign `attempt_id` routes to the same
> fail-closed failed-attempt lane as a malformed file); the adapter
> derives the C15/C16 lane — and C20's "actor exit 0" trigger —
> from the result file AFTER session death; a dead session with NO
> result file is the spawn-infra failed-attempt lane (attempt
> consumed), and a PRESENT-but-unparseable result file routes to
> the SAME failed-attempt lane, fail-closed (a wrapper-integrity
> case, never silently treated as an actor outcome); a result file
> recording the runner's OWN timeout kill (the C19 SIGTERM/SIGKILL)
> is the own-timeout attempt-consuming lane (C16), never the
> foreign-kill class. Ownership: ch9-P3 ratifies and drives the
> result seam on the direct-spawn path; ch9-P4's tmux wrap MUST
> preserve it (the wrapper runs inside the session).
> Session/dir/branch NAME COMPONENTS never embed raw ids (C8's
> encoding rule).

The consumed halves of sibling rows (cited boundaries, not
re-realized here): **C15** — "exit 0 with no readable/parseable
emitted output" is the `no_output` member's definition, and
"submit-time kernel-integrity throws are not outcomes — they fall to
C16's crash path" fixes EM3's propagation rule; classification of
the returned members is the P3a core's (CF2), never the adapter's.
**C16** — the infra classes this packet PRODUCES (`spawn/infra
errors, nonzero exits, the runner's OWN delivery-timeout kill
(C19's SIGTERM/SIGKILL on the actor spawn), AND foreign `code:
null` kills`), all BARE — no `sys:` token ever appears on the
delivery path. **C21** — the foreign-kill definition boundary ("a
signal-terminated child NOT attributable to the runner's own
timeout (foreign kill — `code: null` with no pending runner
timer)") and the never-classifies stance the spawn seam mirrors; C21's own real
spawn (kind production, measurement half) is ch9-P4's. **C26** —
"every spawn outcome emits a structured diagnostic event" on the
existing best-effort channel (the DG family's basis). **C14** — the
CT-B basis clause: "correctness NEVER depends on claim exclusivity —
duplicate delivery is collapsed by the kernel's content-addressed
`op_id` (`Duplicate`), the CT-B two-worker re-run's basis."

### Delegated sources expanded (R-DELEGATION-CLOSURE)

- **The P3a executor seam this packet implements**
  (`ports/delivery.ts`, read at source): `AttemptExecutor.execute(
  input): Promise<AttemptResult>` with `input = { intent:
  DispatchIntent, attemptId: string, sessionName: string }` and the
  CLOSED union `AttemptResult = { kind: "submitted", outcome:
  Outcome } | { kind: "no_output" } | { kind: "name_collision" } |
  { kind: "infra_failure", class: "spawn_infra" | "nonzero_exit" |
  "own_timeout" | "foreign_kill" }`. The loop consumes classes only
  (REV-E); a REJECTING `execute()` is the loop's K2 lane
  (CAS-applied `spawn_infra`-equivalent attempt failure).
  THIS PACKET EXTENDS the input with the OPTIONAL `cwd` field
  (present iff the run has a runtime context — H1's loop-resolved
  value): ratified under flag F5 (the ratifier's STOP decision), in
  the SPIRIT of P3a-F2's rule that cross-packet seam changes get
  their own review, never silent (F2's letter anticipated OUTPUT
  union growth; this is the input triple's reviewed sibling); the
  scripted executor's recorded-input type widens compile-only.
- **The dispatch payload** (`domain/dispatch.ts`, read at source):
  `DispatchIntent = { actor: ActorId, packet: ContextPacket }`;
  `ContextPacket = { instanceId, expectedVersion, task, role,
  instruction, handoff?, availableOps, effectiveAgentConfig,
  runtimeContext }` — `effectiveAgentConfig: AgentConfig =
  Readonly<Record<string, unknown>>` (opaque, ch12-C7);
  `runtimeContext: RuntimeContextProjection | "none"` — the branded
  projection is a compile-time nominal type ERASED at runtime; the
  worktree provider's projection VALUE is `{ kind: "worktree",
  path, branch }` (C10), and PR4's `isCanonicalizable` gate bounds
  every provider's projection to canonical-JSON-safe values.
  `handoff` is an ingress-admitted committed envelope payload —
  canonicalizable by admission (the ch4 ingress gate).
- **The op-id identity C20 rides** (`emit/opId.ts`, ADR-004):
  `deriveActorEmitOpId({ instanceId, contextPacketId, opType,
  payload })` — domain-separated, JSON-array-bound over the
  CANONICAL serialization; it THROWS on a non-canonicalizable
  payload (the emit-lib contract — EM1's pre-check exists exactly
  so this throw is unreachable on the adapter path);
  `contextPacketId` is C13's ratified string
  `"<instance_id>@v<expected_version>"`, so re-delivery re-derives
  the same `op_id` by construction. `isCanonicalizable` is the
  shared admissibility predicate (ingress uses the same one).
- **The ingress face** (`ingress/ingress.ts`, IC-E): `submit(raw:
  unknown): Promise<Outcome>` — strict fail-closed envelope
  validation (plain object, known keys only, canonicalizable
  payload), the kernel outcome returned VERBATIM. The envelope
  keyset: `instanceId, opId, type, actorId, expectedVersion,
  expectedRole, eventId, payload`. `Outcome` (read at source,
  `domain/outcome.ts`): `committed | duplicate | stale | rejected
  (reason: RejectionName …)` — the adapter passes it through
  UNINTERPRETED inside `{ kind: "submitted", outcome }`.
- **The fold-in source** (`providers/worktreeProvider.ts` M4, ch9-P2
  packet): the provider's private git runner carries the ADR-017
  discipline (explicit cwd, `{PATH}` default allowlist, 30 s/10 s
  defaults, captured stdio, SIGTERM→grace→SIGKILL, ENOENT infra
  lane, timeout-as-infra mapping for the provider's S3 rule) and the
  machine-counted marker `DEFERRED(ch9-p3): fold into the shared
  C19 spawn seam`. The fold-in preserves every observable: the
  provider suite is the pin.
- **The C8 encoding** (`providers/worktreeProvider.ts` `enc`, read
  at source — relocated by T1): UTF-16 code-unit grain; `[a-z0-9]`
  pass-through, every other unit `_` + four lowercase hex digits;
  injective, all-lowercase, `-`/`/`/`.` unexpressible so the
  composite `--` and `/` delimiters cannot alias; nonempty in →
  nonempty out.
- **The diag channel's own contract** (`ports/diagnostics.ts`):
  `emit(body): void` NEVER throws (fail-open lives ON the port);
  call sites call it BARE (REV-DIAG-FAILOPEN); `source: "runner"`
  kinds at HEAD: `provision_ready`, `provision_failed` (`requestId`
  present iff one of these two — the P3a re-scope), and
  `errand_transition` (P3a's DG1 field iffs keyed on `errandEdge`).
  DG2 grows this per-kind branching by one kind.
- **ADR-017's decision items** (governing): explicit cwd; fail-closed
  env allowlist; bounded timeout with SIGTERM→grace→SIGKILL;
  captured stdio — scoped to EVERY runner-plane spawn, one
  enforcement point intended (the seam this packet births);
  trusted-local-host stance (confinement is against accident and
  clutter, not a hostile-actor sandbox).

### Substrate probes (2026-07-24, in-session; scripts + outputs in
the session scratchpad `ch9p3b-probes/` — node 24.18, darwin/APFS)

Contract-cited cells (P3a–P3d: spawn timeout observable, stdout +
exit both observable, ENOENT error event, full env replacement) and
P4b (git under `{PATH}`-only env) stand from the draft/P2 probes;
the in-tree provider tests DRIVE the SIGTERM→grace→SIGKILL
escalation. NEW cells probed now:

| Probe | Question | Observed |
|---|---|---|
| P6a | node child under `env = {PATH}` only | exit 0, runs (v24.18.0) — the allowlist default is viable for node-based actors/wrappers |
| P6b | wrapper round trip, natural exit 3 | wrapper exit 0; `result.json` present after the wrapper's conclusion: `{attemptId echoed, exitCode: 3, signal: null}` (atomic tmp+rename write) |
| P6c | SIGTERM to the WRAPPER | forwarded to the child; result records `{exitCode: null, signal: "SIGTERM", termForwarded: true}`; wrapper still exits 0 with the file present |
| P6d | foreign SIGTERM to the CHILD only | wrapper survives and records `{signal: "SIGTERM", termForwarded: false}` |
| P6e | SIGKILL to the WRAPPER | wrapper dies (`signal: SIGKILL`), NO result file, and the actor child is ORPHANED ALIVE — the wrapper cannot forward what it never receives; with inherited stdio the parent's `close` defers until the orphan exits (the `exit` event is the process-death observation) |
| P6f | TERM-ignoring actor under the wrapper's OWN grace escalation | the wrapper forwards TERM, arms its own grace SIGKILL; result records `{signal: "SIGKILL", termForwarded: true}` |
| P6g | `result.json` visibility at the wrapper's `exit` event | PRESENT already at `exit` (the write precedes the wrapper's own `process.exit`) |
| P6h | delayed-exit-event race (arm-run probe, 2026-07-24) | five repeated runs: after an event-loop stall the TIMER callback ran BEFORE a naturally-exited child's `exit` event was delivered — `kill("SIGTERM")` returned `true` on the already-dead process, then `exit(0, null)` arrived — SD1's attribution rule's basis |
| P6i | Node timer-delay collapse (arm-run probe, 2026-07-24) | `setTimeout(NaN)`, `setTimeout(Infinity)`, and `setTimeout(2147483648)` each fired at ~1 ms — T2's knob-validation basis (an unvalidated margin silently defeats SD3's two-tier arithmetic) |

P6e is design-consequential: the child's grace escalation must live
IN the wrapper (P6f — TERM forwarded, wrapper-armed grace KILL); the
seam's own KILL on its direct child (the wrapper) is a last-resort
backstop that orphans the actor ONLY when a wedged wrapper lets it
fire — SD3's two-tier margin keeps the normal path orphan-free
(flag F2's narrowed residual). P6e also fixes the settle trigger:
the `exit` event is the process-death observation; `close` waits on
the orphan's pipes (SD1's exit-not-close rule).

## Claim

The real actor adapter delivers a committed dispatch to a REAL actor
process and feeds the actor's emitted op back through NORMAL ingress
— attempt-scoped, spawn-confined, fail-closed at every conclusion
read, with zero kernel- or errand-truth authority: (1) every
delivery effect is ATTEMPT-SCOPED — the handoff, emit, and result
files live under the attempt's own `enc(attempt_id)` directory, and
the adapter reads ONLY its own attempt's directory, so a stale or
parallel attempt's files can never be read as another attempt's;
(2) the actor sees exactly the materialized ContextPacket (canonical
JSON — the actor-facing projection or explicit `"none"`, never the
kernel-side ref fields), located through adapter-injected
`PAIRFLOW_*` variables; (3) every spawn the adapter or the provider ISSUES rides the ONE
shared discipline seam — explicit cwd, full env replacement to the
composition-declared allowlist + the adapter-injected pairflow
variables, bounded SIGTERM→grace→SIGKILL, captured stdio — and the
wrapper→actor hop is WRAPPER-DISCIPLINED (the actor inherits the
wrapper's already-confined environment with ZERO additions — RS1's
pinned pass-through — under SD3's escalation), so the full host
environment is never inherited by any child in the packet's spawn
inventory (parameterized: the seam's spawns + the wrapper's one
actor spawn); (4) every attempt execution that RETURNS
concludes to exactly one member of the closed P3a result vocabulary
through a fail-closed precedence over the durable result seam (a
REJECTING execution is the loop's K2 lane — EM3) — an absent,
unparseable, or foreign-`attempt_id` result file is NEVER read as an
actor outcome, and on the ATTRIBUTED paths the runner's own timeout
is never misclassified as a foreign kill nor the reverse — with the
ONE named exception CL1 carries: a foreign kill landing inside a
fired-timer window resolves `own_timeout`, a bounded same-cost
ambiguity between two attempt-consuming classes; (5) the emitted
op is submitted through NORMAL ingress with the ADR-004
content-addressed op id derived on the actor's behalf — re-delivery
re-derives the SAME op id by construction, and the adapter adds no
admission shortcut (every ingress rule binds unchanged, IC-E);
(6) the adapter's production code writes NO kernel state outside
`ingress.submit` and NO errand state at all — its only effects are
files inside the attempt/run directories, child processes, and
best-effort diagnostic events that change no outcome, no authority
state, and no attempt-directory artifact (the diag store's own file
is their normal write surface — DG1); (7) under two
concurrent REAL workers racing one dispatch, correctness rests
solely on the kernel's content-addressed op-id collapse — the CT-B
contract re-proven under real processes.

Dimensions (enumerated before test rows — R-DIMENSIONS):

1. **The shared spawn seam** (SD) — the one discipline, faithful
   conclusions, the provider fold-in, escalation ownership.
2. **Handoff** (H) — cwd derivation on both lanes, the attempt
   directory, canonical packet materialization, id re-derivation.
3. **Argv mapping** (AV) — the composition-injected mapper, its
   failure lane, the actor's file-location variables.
4. **The result seam** (RS) — the wrapper asset, atomic write, echo
   verification, the direct-spawn scope boundary.
5. **Conclusion classification** (CL) — the total fail-closed
   precedence from wrapper conclusion × own-timer × result file ×
   emit read to the K1 member.
6. **Emit capture** (EM) — the emit schema, envelope composition,
   op-id identity, verbatim outcome passthrough, throw propagation.
7. **Observability** (DG) — the spawn-outcome event, read-gate
   growth, fail-open.
8. **Types/ripple** (T) — module homes, `enc` relocation, exports,
   lint/config ripple.
9. **Coverage/drift** (U) — the empty slice, the DEFERRED marker
   discharge.
10. **The CT-B re-run** (CB) — two real workers, one dispatch,
    kernel collapse.

## Canonical matrices

### SD — the shared spawn discipline seam

| ID | Rule |
|---|---|
| SD1 | The seam (`runner/spawn.ts`, NEW): ONE disciplined spawn function — `disciplinedSpawn({ cmd, args, cwd, env, timeoutMs, graceMs }): Promise<SpawnConclusion>` with the CLOSED conclusion union `{ kind: "exit", code: number \| null, signal: string \| null, timedOut: boolean, stdout, stderr } \| { kind: "infra", message }` — the seam's own timer is carried as the `timedOut` ATTRIBUTION FLAG on the exit conclusion, never a separate kind (the timer fires → SIGTERM → the bounded-grace SIGKILL, and the eventual exit arrives FLAGGED; a natural exit whose event was merely outrun by the timer callback ALSO arrives flagged — the delayed-exit-event race, P6h — and the DOWNSTREAM record decides attribution, CL1: completed work is never reclassified). Realizing C19's four decision items in one place (explicit cwd; env FULL REPLACEMENT to exactly the passed object, P3d; the seam-owned timer with the escalation, P3a/P6f; stdout/stderr captured, P3b); the seam SETTLES ONCE, on the child's EXIT (process death — NEVER the stdio `close` event: with pass-through stdio a live orphan holds the pipes open past the wrapper's death, P6e, and a close-triggered settle would stall the pass unboundedly); the promise RESOLUTION then awaits stream close bounded by a short drain deadline (2 000 ms) — captured output is COMPLETE on every normal path (streams close with the process), and on the orphan path the tail's truncation at the deadline is EXPLICIT, diagnostic-only loss (C23: the load-bearing handoff is file-based), a driven lane. The seam NEVER classifies business outcomes (C21's spawn-side stance mirrored): `exit` reports the child's conclusion FAITHFULLY (code or signal verbatim, plus the timer flag), `infra` is the spawn-setup/ENOENT class (P3c — a distinct lane, no exit code); the seam also exports the SHARED timer-knob validator (T2's rules — every consumer factory calls it at construction). Consumers: the actor adapter (HERE), the worktree provider's git runner (SD2), the process-gate real spawn (ch9-P4, plan-named). The seam SHAPE (one function, this union, these knobs) is this packet's decision — NEW-DECISION, flag F1. |
| SD2 | The provider fold-in: the ch9-P2 git runner is re-expressed OVER the seam — the M4 discipline properties preserved EXACTLY (explicit cwd = `repo`, `{PATH}` default allowlist, 30 s/10 s defaults, captured stdio feeding PB3's detail tail, timeout and infra conclusions both mapping to the provider's existing `sys:provision_failed` lanes); the provider's git-specific timeout MESSAGE construction relocates INTO the provider's own conclusion mapping (the seam's `timedOut`-flagged exit carries no git text), the retired `code ?? -1` coercion yields to the seam's faithful `code: null` (the provider's `code !== 0` checks are shape-robust; the internal exit-shape type widens `code` to `number \| null` in the same change), and the settle trigger SHIFTS from the child's `close` to SD1's exit+bounded-drain (a strictly SAFER bound — the old `close` would hang on a pipe-holding grandchild, a state the provider's local no-remote git operations never produce; the suite pins everything reachable); the provider's OBSERVABLE behavior is unchanged — its existing suite is the pin (green, assertions untouched except where a message's exact wording is asserted, updated in the same change) — and the `DEFERRED(ch9-p3)` marker is REMOVED in this change (`pnpm v3:deferred` clean; ADR-017's one-enforcement-point intent closed). DERIVATION: ADR-017's decision clause + the P2 M4 row's own fold-in mandate; the fold changes WHERE the discipline lives, never what it does. |
| SD3 | Escalation ownership on the WRAPPED lane: the ACTOR child's SIGTERM→grace→SIGKILL escalation lives IN the wrapper (RS1 — TERM forwarded on receipt, wrapper-armed grace KILL; P6c/P6f), because a KILL delivered to the wrapper can never be forwarded (P6e). The seam's own backstop on the wrapper is scheduled PROVABLY LATER: the adapter passes the seam `graceMs + backstopMarginMs` (T2's margin knob, default 5 000 ms) as the wrapper-spawn grace while the wrapper's own actor-grace is `graceMs` — so on the NORMAL TERM-ignoring-actor path the inner KILL and the result write complete BEFORE the outer backstop fires (C19's "a SIGTERM-ignoring child is killed" holds through the wrapper, no orphan). The backstop ORPHANS the actor ONLY on a genuinely WEDGED wrapper — the narrowed residual, the C19 uninterruptible-I/O class's two-process analog (flag F2; the wrapper is repo-shipped, trivially small, own-tested; teardown/process-health is the named Absent; ADR-017's trusted-local-host stance). DERIVATION: C19's escalation contract composed over the two-process spawn shape the result seam requires; probes P6c/P6e/P6f are the basis; the two-tier deadline is timer arithmetic, no new substrate. |

### H — handoff

| ID | Rule |
|---|---|
| H1 | (NEW-DECISION — flag F5) ONE cwd value covers both lanes (C17), resolved at the CONTRACT surface, never read out of the actor's view: a SEPARATE optional capability interface is exported beside the base provider port (`LocalExecutionCapability`: `resolveLocalWorkingDirectory(ref): string`, an absolute path) — the ch12-C15 model-verbatim base member set stays BYTE-UNTOUCHED, the tree's own concrete-extension pattern (`WorktreeProvider extends RuntimeContextProvider` already adds `bindCompletionSink`); a provider whose contexts execute on this host ADDITIONALLY implements it (the worktree provider: from its own minted `locator.path`) — and the LOOP resolves it at intent-derivation time for a `ready(ref)` run, handing the executor an EXPLICIT `cwd` input field (present iff the run has a runtime context); the adapter never inspects the projection (the projection stays purely actor-facing). On the `"none"` lane the field is ABSENT and the ADAPTER derives `cwd = <default_cwd>/<enc(instance_id)>--<enc(context_packet_id)>` (C17's per-run subdirectory; C8's `enc`; created recursively when absent — adapter-owned scratch). A pinned provider WITHOUT the capability on a ready-ref run, or a throwing resolution, is D6's config-integrity lane — fail-closed LOUD at derivation, errand unmutated, never budget-burned (a misbound composition is a config fault, not an attempt cost). C17-letter alignment: the resolved VALUE is byte-identical to "the projected worktree path" (the provider mints both from one source — `locator.path` == the projection's `path`); only the resolution MECHANISM moves below contract grain, from the actor's view to the provider's own obligation ("you cannot be a local provider without answering where" — the capability-not-provider-name lesson). DERIVATION: C17 fixes both lane values; the capability facet, the loop-side resolution, and the input-field carriage are this packet's decision — flag F5, decided by the ratifier at the pre-approval STOP. |
| H2 | The attempt handoff: the adapter creates `<cwd>/.pairflow/<enc(attempt_id)>/` and writes `packet.json` = the dispatched `ContextPacket` in the emit-lib CANONICAL serialization (sorted keys — ONE canonicalization authority in the tree: the emit-lib's `canonicalize` serializer becomes a PUBLIC export in this change — a new name on the existing implementation, internals untouched, selftest riding `emit/opId.test.ts`), via the same tmp+rename atomic write discipline as the result file; the packet value is canonicalizable BY CONSTRUCTION (ingress-admitted `handoff`, template strings, the admission-bound `effectiveAgentConfig`, the PR4-gated projection or the `"none"` literal; construction discipline: optional fields are OMITTED, never set to `undefined` — `canonicalize` rejects a present-but-undefined key) — a canonicalization throw is therefore UNREACHABLE and undriven; defensively, an uncaught throw is consumed by the loop's K2 catch as a bounded `spawn_infra` attempt failure (EM3's principle — never a loop crash; grid row). DERIVATION: C17 fixes the path and "canonical JSON"; the serializer choice (emit-lib) and the atomic write are representation under it. |
| H3 | `context_packet_id` is re-derived from the packet's own fields — `"<instanceId>@v<expectedVersion>"` — and is BY CONSTRUCTION equal to the errand key the loop discovered under (C13's ratified string over the same committed values; ADR-004's op-id input at EM2 and the `none`-lane path component at H1 both use this one derivation). The start-time guard ENFORCING this equality on the live paths is H5's. |
| H4 | Attempt scoping is ABSOLUTE: all three exchange files (`packet.json`, `emit.json`, `result.json`) live under the attempt's own `enc(attempt_id)` directory; the adapter writes and reads ONLY that directory for the attempt (C17/C20/C23) — a stale or parallel attempt's files are unreachable by construction (distinct `attempt_id` → distinct directory, `enc` injective). |
| H5 | (NEW-DECISION — flag F10) The attempt-start guard binds BOTH start kinds — the budgeted claim-hold AND the re-spawn hold (B5 defines re-spawn as a B1-shaped start): before ANY attempt start the loop runs the CF1 committed-row check UNCONDITIONALLY, in a FIXED ORDER at both holds — (1) evidence → `confirmed`; (2) run TERMINAL → `mooted` (C14's sink, the existing terminal-hold behavior, unchanged in position); (3) run ACTIVE with a version mismatch → the fail-closed SKIP; (4) else start — so the SKIP can never shadow the terminal moot. Evidence found → `confirmed` with ZERO mint/spawn/decrement (the budgeted hold — the budget≥1 branch AFTER the zero-budget exhaust-at-claim resolution, which keeps its own edge — emits the SUCCESSOR errand edge `evidence-at-claim`: claimed→confirmed, `attemptId` ABSENT — pre-mint, the exhaust-at-claim bucket; the re-spawn hold emits the SYMMETRIC SUCCESSOR edge `evidence-at-respawn`: unconfirmed→confirmed, `attemptId` ABSENT — the loop-side trigger-context labeling rule holds and the reader facade's evidence-promotion reservation stays intact) — and gates `instance.version === errand.expected_version` (the C13-entailed belt): a mismatch WITHOUT evidence — unreachable on an ACTIVE run by the evidence⇔version coupling — is a fail-closed SKIP (no spawn, no decrement, no state write; the next tick re-derives — the version-gate negative's assertable target). This closes the reclaim × sibling-commit race where a stale errand would spawn the NEXT dispatch's packet under the OLD errand row (the arm-minted product finding on the built P3a loop: `attemptClaimed` and `respawn()` each consult evidence only at their TERMINAL/zero-budget holds — NEITHER runs the check, nor a version gate, before the ACTIVE attempt start). The loop fix + race tests for BOTH kinds land in this packet's boundary (`runner/deliveryLoop.ts` + its test — flag F10); the front check shifts evidence-timing in the EXISTING B4-rescue lane (evidence lands mid-execute so the exhaust-point double-check stays driven; the refresh rides the same files). |

### AV — argv mapping

| ID | Rule |
|---|---|
| AV1 | The mapper is composition-injected and adapter-owned host configuration (C18): `argvMapper(effectiveAgentConfig: AgentConfig) => { cmd: string, args: readonly string[] } \| null`. `null` (no template for the config) AND a throwing mapper both conclude `infra_failure(spawn_infra)` — C18's unresolvable-mapping lane, budget-bounded, never a kernel rejection; the adapter never interprets the config beyond handing it to the mapper (`*_refs` classes stay uninterpreted — C18's scope boundary). |
| AV2 | (NEW-DECISION — flag F4) The actor locates its exchange files through ADAPTER-INJECTED environment variables — `PAIRFLOW_PACKET` and `PAIRFLOW_EMIT` (absolute paths of the attempt's `packet.json` / `emit.json`) — added to the composition-declared allowlist in the child's env (C19's own "allowlist + adapter-injected pairflow variables" clause instantiated); the mapped argv is spawned VERBATIM otherwise (no template substitution exists at ch9). The two NAMES live as ONE exported constant pair on the adapter module (`runner/index.ts` re-exports them) — every in-repo producer, fixture, and test references the constants, never a raw string literal, so an in-repo rename stays a one-line change (the constant removes repo-side friction; the OUT-of-repo hardening — actor prompts, launch templates — is the real bake-in the F4 flag records). DERIVATION: C19 names the pairflow-variable class; these two members and their names are the packet's instantiation (flag F4). |

### RS — the result seam (direct-spawn path)

| ID | Rule |
|---|---|
| RS1 | The wrapper asset (`runner/attemptWrapper.mjs`, NEW — a plain `.mjs` spawned as `process.execPath <wrapperPath> …`, path resolved from the adapter module via `import.meta.url`; no TS loader dependency): spawns the mapped actor argv as its child WITH ITS OWN already-confined environment — ZERO additions, zero widening (the transitive-confinement pin: the seam replaced the wrapper's env, the wrapper passes exactly that through) — its OWN cwd (the seam set the wrapper's cwd to C17's value; the actor inherits exactly it) and pass-through stdio; forwards SIGTERM on receipt and arms its OWN bounded-grace SIGKILL on the child (SD3; P6c/P6f — the grace value arrives through the wrapper's own argv, beside the result path and the echoed attempt id); and on the child's conclusion ATOMICALLY writes `result.json` into the attempt directory (tmp + rename, same directory — P6b/P6g) with the CLOSED keyset `{ attemptId (echoed from its argv), exitCode: number \| null, signal: string \| null, termForwarded: boolean }`, then exits 0. The actor's stdout/stderr pass through the wrapper into the seam's capture — diagnostic-only for actors (C23: the load-bearing handoff is file-based; DG1's detail tail). DERIVATION: C23 fixes the seam (atomic write, echoed attempt id, record exit-or-signal); the asset form, keyset spelling, and stdio pass-through are representation under it (flag F1's module-home element covers the asset). |
| RS2 | The adapter parses `result.json` FAIL-CLOSED: strict JSON, the closed keyset with per-field grain (`exitCode` an INTEGER or null — a non-integer, non-finite, or `-0` value is a keyset violation, `Object.is` discriminating `-0` per R-NUMERIC-LADDER; `signal` a string or null; EXACTLY ONE of `exitCode`/`signal` non-null — a both-null or both-non-null record is a keyset violation, keeping CL1 row 4 total by parse; `termForwarded` a boolean), `attemptId` STRICTLY EQUAL to the spawned attempt's — a missing file, an unparseable file, a keyset violation, or a foreign `attemptId` all conclude on C23's failed-attempt lane — `infra_failure(spawn_infra)`, or `infra_failure(own_timeout)` when the seam's timer fired (CL1 row 4's flag branch) — a wrapper-integrity case, NEVER silently treated as an actor outcome; the attempt is consumed, bounded. |
| RS3 | The adapter reads the result file AFTER the wrapper's conclusion — the seam's `exit`-grain observation (P6g: the file is visible at the wrapper's `exit` event; the write is the wrapper's last act before its own exit). A wrapper that EXITED CLEANLY (code 0) yet left NO result file is C23's dead-session/no-result lane at direct-spawn grain → CL1 row 4's head (`spawn_infra`, or `own_timeout` under a fired timer). A SIGNAL-concluded wrapper never reaches this read — its landing is CL1 row 2 (P6e: a killed wrapper writes nothing; the file's absence is subsumed by the signal classification). |
| RS4 | Scope boundary: this packet drives the result seam on the DIRECT-SPAWN path (C23's ownership clause); the tmux session wrap MUST preserve it at ch9-P4 (the wrapper runs inside the session — and P4's conclusion derivation becomes session-liveness + the result file: CL1's seam-grain rows observe the DIRECT child, which under tmux is the client, so the transferable core is RS1–RS3, not the upper precedence rows). Consequences at this packet's grain: (a) `name_collision` is UNREACHABLE from the real adapter — the direct-spawn path has no host session namespace to collide in (C16's collision domain: the store half is P3a's mint-retry; the tmux half activates at P4) — the real adapter NEVER returns that member here (SCOPED exclusion, deferral home ch9-P4 — flag F6; the member's consumption stays proven by P3a's scripted-executor lanes); (b) the C23 SESSION-NAME DERIVATION binds NOW as an exported pure function — `defaultSessionNamer(instanceId, attemptId) = "pairflow-" + enc(instanceId) + "--" + enc(attemptId)` — composition-bound as the loop's `sessionNamer` (replacing nothing: P3a injected the seam, this packet supplies the real value); its tmux CONSUMER arrives at P4 (flag F9 — the P3a F4 staging completed). DERIVATION: C23's ownership + naming clauses at the split's grain. |

### CL — conclusion classification (the K1-member production)

| ID | Rule |
|---|---|
| CL1 | The TOTAL fail-closed precedence — every attempt execution that RETURNS concludes to EXACTLY ONE K1 member (a rejecting execution is EM3's K2 lane), decided in this ORDER (each row fires only when no earlier row did; `timedOut` is SD1's seam-carried own-timer flag): (1) the seam reports `infra` (wrapper spawn setup/ENOENT) → `infra_failure(spawn_infra)`; (2) the wrapper concluded by SIGNAL (`exit` with `code: null`) → `timedOut` ? `infra_failure(own_timeout)` (our escalation killed it; the result file — normally absent, P6e — is not consulted) : `infra_failure(foreign_kill)` (C21's class; the orphan residual is SD3/F2's); (3) the wrapper exited NONZERO → `timedOut` ? `infra_failure(own_timeout)` (a wrapper misbehaving inside our kill window is our timeout's fallout — fail-closed) : `infra_failure(spawn_infra)` (wrapper-integrity — the wrapper's contract is exit 0 after the write); (4) the wrapper exited 0 → read `result.json` under RS2/RS3: invalid/missing/foreign → `timedOut` ? `infra_failure(own_timeout)` : `infra_failure(spawn_infra)`; else the RECORDED ACTOR conclusion decides — actor `signal` present → (`timedOut` AND `termForwarded`) ? `infra_failure(own_timeout)` (C23's letter: the result records the runner's OWN forwarded kill — the NORMAL own-timeout path, P6c's shape) : `infra_failure(foreign_kill)` (C21's class — a foreign hand killed the work, directly (P6d) or via a forwarded foreign TERM; `termForwarded` discriminates ONLY under a fired own timer, and the residual grey case — a foreign kill landing inside our fired-timer window — resolves own_timeout, a bounded same-cost ambiguity between two attempt-consuming classes); actor `exitCode` nonzero → `infra_failure(nonzero_exit)` (a nonzero exit is the actor's own conclusion, never a kill record — even under a fired timer); actor `exitCode` 0 → the EM lanes (`submitted` or `no_output`) — COMPLETED WORK IS NEVER RECLASSIFIED by a late timer (the P6h delayed-exit race). DERIVATION: C15/C16/C21/C23 composed over the two-process observation surface with SD1's `timedOut` attribution flag (probes P6c/P6d/P6e/P6h); the order is forced — wrapper integrity before actor record (an untrustworthy wrapper cannot vouch for its record), attribution before class (C21's "attributable" letter). |
| CL2 | The kill lanes are driven at PROCESS GRAIN — real children, real signals (the P3a F6 flag's deferred half arrives here): the own-timeout lane with a TERM-ignoring real actor (the wrapper's grace KILL observed, P6f's shape), the foreign-kill lane with a real out-of-band kill of the actor (P6d's shape), the foreign-KILL-of-the-wrapper lane (P6e's shape — `foreign_kill` via precedence row 2, result absent), and the seam's own backstop KILL of a TERM-wedged wrapper (`own_timeout` via row 2 — the backstop fires only downstream of the seam's own timer, so the timer flag already decided the member). Durable-prefix crash simulation remains the errand-ledger windows' vehicle (P3a's CT-A2-CRASH, untouched). |

### EM — emit capture + submission

| ID | Rule |
|---|---|
| EM1 | The emit schema is CLOSED and fail-closed (C20's "readable/parseable" realized at schema grain): `emit.json` must be strict JSON, a plain object with EXACTLY the keys `{ type: nonempty string, payload: any canonicalizable value }` — both REQUIRED (the ADR-004 identity digests the payload; the dev CLI's derived path is the ratified convention's witness: payload REQUIRED and canonicalizable). A missing file, unreadable file, invalid JSON, non-object, unknown key, missing/empty `type`, missing `payload`, or a `payload` failing `isCanonicalizable` ALL conclude `no_output` — the C15 `unconfirmed` lane — never a throw, never a partial submit (the `isCanonicalizable` PRE-CHECK makes EM2's derive-throw unreachable on this path). DERIVATION: C20 fixes the file and the no-output trigger; the closed keyset and the payload-required rule instantiate it at the grain the op-id identity demands (flag F3). |
| EM2 | Envelope composition ON the actor's behalf (C20 + ADR-004 + IC-E): `opId = deriveActorEmitOpId({ instanceId: packet.instanceId, contextPacketId: H3's derivation, opType: emit.type, payload: emit.payload }).opId`; the submitted envelope = `{ instanceId, opId, type: emit.type, actorId: intent.actor, expectedVersion: packet.expectedVersion, expectedRole: packet.role, payload: emit.payload }` — submitted through `deps.ingress.submit` (NORMAL ingress: every admission rule binds unchanged; the adapter adds no shortcut and no reshaping), and the returned `Outcome` goes back VERBATIM as `{ kind: "submitted", outcome }` — classification is the P3a core's (CF2), never the adapter's. Re-delivery of the same dispatch re-derives the SAME `opId` by construction (H3 + ADR-004 — the kernel-collapse basis CTB1 proves). |
| EM3 | An `ingress.submit` rejection or throw PROPAGATES out of `execute()` un-caught (the adapter's promise rejects): C15 fixes that submit-time kernel-integrity throws are NOT outcomes — they fall to the crash path — and the P3a seam's K2 lane is exactly that landing (a rejecting executor = CAS-applied `spawn_infra`-equivalent attempt failure). The adapter deliberately does NOT convert submit throws into `no_output` (that would launder an integrity class into a business state — the D6 principle at the adapter's grain). |

### DG — observability (the C26 spawn-outcome share)

| ID | Rule |
|---|---|
| DG1 | Every attempt execution emits exactly ONE best-effort diagnostic event — on every RETURNING path before the return, and on the EM3 rejecting path before the rejection propagates (`spawnOutcome: "spawn_infra"`, the K2 landing's class — C26's every-spawn-outcome obligation holds on the submit-throw path too): `source: "runner"`, `kind: "spawn_outcome"`, body fields `instanceId`, `contextPacketId`, `attemptId` (all always present on this kind), `spawnOutcome` (always present — the CLOSED token domain naming the produced member at class grain: `submitted \| no_output \| spawn_infra \| nonzero_exit \| own_timeout \| foreign_kill`; `name_collision` is RS4's scoped exclusion and joins the domain when P4 activates the lane), and `spawnDetail` (OPTIONAL untrusted diagnostic free text — a captured-stderr tail, bounded by the PB3 2000-code-unit cap precedent; a DISTINCT kind-scoped field per the `providerDetail` precedent, NEVER the ingress-scoped closed-token `detail` — that field's iff (`present iff source = ingress`) and token-membership gate stay untouched; confined to the diagnostic surface, never parsed, never matched — the C4 boundary's mirror). Emitted BARE (REV-DIAG-FAILOPEN); a sink failure changes no conclusion, no errand or kernel authority state, and no ATTEMPT-DIRECTORY artifact (the diag store's own file is the sink's normal write surface; non-blocking is NOT promised — the port's own letter: a slow synchronous sink may stretch attempt timing, it can never change an outcome; the sibling P3a acceptance line's broader "no timing" phrasing is a kit-grain statement on its own closed surface — a doc-sync there is a boundary-review item, never this packet's edit). DERIVATION: C26 fixes one-event-per-spawn-outcome on the existing channel; the single-kind token-carrying shape follows P3a's DG1 minimal-union-growth precedent. |
| DG2 | The diag read gate grows type-synced (the established per-kind branching): the store allowlist gains `spawn_outcome` with BOTH-direction presence enforcement for its field iffs (`spawnOutcome` required on this kind and absent on every other; `spawnDetail` legal ONLY on this kind, optional; `contextPacketId` RE-SCOPED from `errand_transition`-only to kind ∈ {`errand_transition`, `spawn_outcome`} — split OUT of the store's shared errand-field iff loop, required on both; `requestId` stays scoped to the two provisioning kinds; `errandEdge`/`errandFrom`/`errandTo` stay scoped to `errand_transition`; `attemptId` legal on `errand_transition` per its edge iffs AND on `spawn_outcome` always — the store's runner-source branch RESTRUCTURES so this passes: its current "a provisioning kind carries no attemptId" arm narrows to the provisioning kinds, the general attemptId-requires-`errand_transition` gate and the `isRunnerKind` membership update in the same change, or a silently-swallowed reject would eat every `spawn_outcome` event behind the fail-open fence; the `errandEdge` closed domain gains H5's TWO successor members in the same growth — `evidence-at-claim` (claimed→confirmed) and `evidence-at-respawn` (unconfirmed→confirmed), BOTH with `attemptId` ABSENT: each fires at its attempt-start HOLD, before any attempt id is minted, the exhaust-at-claim precedent's bucket); the ports/diagnostics.ts iff table updates in the same change; the debug-bundle exclusion set is unchanged. |

### T — types/ripple

| ID | Rule |
|---|---|
| T1 | Module homes + the encoding's relocation (NEW-DECISION — flag F1): the seam at `v3/src/runner/spawn.ts`, the adapter at `v3/src/runner/actorAdapter.ts`, the wrapper asset at `v3/src/runner/attemptWrapper.mjs`, and `enc` RELOCATED to `v3/src/runner/enc.ts` as the ONE authority (the naming family C8/C17/C23 shares it; a generic adapter must not value-import a concrete provider module — REV-E's spirit at the module graph): `providers/worktreeProvider.ts` imports it from there WITHOUT re-exporting it, `providers/index.ts` KEEPS re-exporting `enc` (now from the new home — extend-don't-fork; zero consumer breakage — the tree's only production `enc` consumer is the provider itself, measured), and `providers/worktreeProvider.test.ts`'s `enc` import flips to `runner/enc.js`. `runner/index.ts` exports `disciplinedSpawn`, `createActorAdapter`, `enc`, `defaultSessionNamer`, and AV2's `PAIRFLOW_PACKET`/`PAIRFLOW_EMIT` constant pair. |
| T2 | (NEW-DECISION — flag F8) The adapter's deps contract: `createActorAdapter(deps, options)` — `deps = { ingress: Pick<Ingress, "submit">, argvMapper (AV1), diag }`; `options = { defaultCwd: string (REQUIRED — C17's composition-configured value, no default), envAllowlist (default `{ PATH: <host PATH> }` — P6a-viable; composition widens it for real actor CLIs), timeoutMs (default 1 800 000 — 30 min, sized to real LLM-actor runs, ratifier-decided; the PAIRING RULE binds the COMPOSITION: any composition binding the real adapter sets the loop's `leaseMs` a margin ABOVE its effective timeout — C14's RATIFIED 15-min loop default stands untouched (the lease is a composition-configured knob by C14's own words; the CB1 test composition sets 2 700 000, and the operator-facing `runner run` composition carries and VALIDATES the pair as a NAMED P4 obligation); flag F8), graceMs (default 10 000 — C19's ratified default; the wrapper's actor-grace), backstopMarginMs (default 5 000 — SD3's two-tier rule: the seam's wrapper-spawn grace = graceMs + this margin, provably later than the inner escalation; EVERY consumer factory of the seam VALIDATES its timer knobs FAIL-CLOSED at construction through the seam's SHARED validator (SD1's export; R-NUMERIC-LADDER at the config boundary): `timeoutMs`, `graceMs`, and `backstopMarginMs` each a FINITE SAFE INTEGER at or above its NAMED floor (`timeoutMs` ≥ 1 000, `graceMs` ≥ 1 000, `backstopMarginMs` ≥ 1 000), and EVERY derived timer value — `graceMs + backstopMarginMs` included — below Node's 2³¹ timer bound (a NaN, Infinity, or overflowing delay silently COLLAPSES to 1 ms on the substrate, P6i — the probed hazard that would let the outer backstop outrun the inner escalation); any violation is a construction-time config-integrity throw at BOTH current consumers (`createActorAdapter` AND the worktree provider factory — SD2's unchanged-pin is thereby SCOPED to valid configurations), so SD3's orphan-freedom guarantee rests on validated arithmetic, never on trusted luck) }`. All knobs composition-configured per C19; the injected-seam culture (CliDeps/K4 precedent). |
| T3 | Ripple is additive-only: `runner/index.ts` exports (T1); the delivery port's INPUT gains the optional `cwd` field (H1/F5 — ratified at the STOP, reviewed here per P3a-F2's never-silent spirit; the `AttemptResult` union itself is byte-untouched), the provider-port FILE gains the separate `LocalExecutionCapability` interface (H1 — the ch12-C15 base member set byte-untouched), re-exported through the canonical `ports/index.ts` barrel (the ch12-P3 convention), `ports/diagnostics.ts` grows per DG2, and `runner/deliveryLoop.ts` gains H5's attempt-start gate per F10 plus H1's cwd resolution; NO testkit change (the recorded-input type widens compile-only); the kernel, store, ingress, domain, definition, floor, and shipped CLI surfaces are byte-untouched. Config ripple, named: `vitest.stryker.config.ts` — the real-spawn test files join the subprocess exclude list (the logged ch9-P2 subprocess blind class: Stryker's sandbox copy cannot exec repo-external bins; mutation coverage for this packet is therefore PARTIAL by that profile's own declared mechanism — telemetry per the pilot rules); `v3/eslint.config.mjs` — the `.mjs` asset REQUIRES a typed-lint carve-out (the `src/runner/**` typed-lint blocks match it while the TS program includes only TS sources — a typed rule on a file outside the project is a parser error; an ignore entry or a dedicated non-typed block lands with the build); an additive emit-lib export (`canonicalize` — H2's serializer name on the existing implementation). The source-hygiene drift gate's walk set excludes `.mjs` — a one-line extension of that gate's extension list rides this packet (`.mjs` joins the walk — cheap, closes the blind spot instead of documenting it). |

### U — coverage/drift

| ID | Rule |
|---|---|
| U1 | The EMPTY slice is declared (all five axes `[]` — R-EMPTY-SLICE); the 54-name rejection registry, the unit map, and the ledger are byte-untouched; the standing drift suite and `v3:coverage` run green before AND after; `pnpm v3:deferred` is clean for `ch9-p3` (the P2-minted marker discharged by SD2 — this packet's named obligation). |

### CB — the CT-B re-run under the real runner

| ID | Rule |
|---|---|
| CB1 | `CT-B-TWOWORKER` re-runs under the REAL runner (plan §9.1 item 4; C14's basis clause): TWO delivery-loop workers (P3a's loop, distinct `worker_id`s), EACH composed with a REAL actor adapter over ONE kernel store file and ONE errand-ledger file; the actor is a DETERMINISTIC stub command bound through the SHIPPED argv-mapping surface (the composition's own config seam — configuration, not test machinery: a temp-file node script reading `PAIRFLOW_PACKET` and writing a fixed emit to `PAIRFLOW_EMIT`); both workers race the same committed dispatch through real child processes, the race STAGED (a controlled lease/reclaim interleaving forces TWO genuinely in-flight real-adapter attempts of ONE dispatch; the stub's determinism includes a BARRIER affordance — it blocks on a release-file path handed through the shipped mapping/env surface until both attempts exist — so co-in-flight is proven, never timing-lucked). Proven: TWO same-op-id ingress submissions with one `committed` and one `duplicate` observed, exactly ONE committed transition row (the kernel's content-addressed collapse — a run where the loser merely loses the claim race does NOT satisfy the lane), the errand converges `confirmed` under L2's precedence, budget/attempt bookkeeping stays consistent, and no kernel write occurs outside the two ingress submissions. The ch-5 kit-driven CT-B result is thereby re-proven with the process-level contention the ch-5 packet explicitly deferred to ch-9 (the ES6 bounded-busy discipline rides it). The intake row's ch-9 re-run annotation flips at the chapter DoD, not here. |

## Site × shape × phase coverage grid

The adapter's fallible sites × failure shapes × execution phases;
every cell a driven lane or an explicit rule-out. Phases: setup
(cwd/handoff/mapping, pre-spawn) / spawn / conclude (result read) /
capture (emit read) / submit. (The loop-side consumption of every
returned member is P3a's grid; the wrapper's internals are driven
through the CL lanes.)

| Site (source) | Shape | Phase | Disposition |
|---|---|---|---|
| provider cwd-capability resolution (H1 — a LOOP-side site, pre-B1, listed here for the H family's completeness) | missing capability on a ready-ref run / throwing resolution | setup (intent derivation) | driven (H family): D6's config-integrity lane — fail-closed loud, errand unmutated, never budget-burned |
| `argvMapper` (injected, sync) | `null` return / throw | setup | driven (AV1): both → `infra_failure(spawn_infra)` |
| fs: mkdir + `packet.json` write (own effect) | IO throw | setup | driven: `infra_failure(spawn_infra)` — the adapter's own pre-spawn fs faults are the same per-attempt class (a full disk is not a loop-crash) |
| emit-lib canonical serialization of the packet (H2) | canonicalization throw | setup | ruled out BY CONSTRUCTION upstream (ingress-admitted handoff, PR4-gated projection, template strings, omit-don't-set-undefined — H2); defensively, an uncaught throw is consumed by the loop's K2 catch as a bounded `spawn_infra` attempt failure — never a loop crash |
| `disciplinedSpawn` (the seam) | `infra` / flagged (`timedOut`) and unflagged exit shapes (signal / nonzero / clean) | spawn→conclude | driven (CL1 rows 1–4): the precedence's upper lanes, the flag composed per row |
| `result.json` read (RS2/RS3) | missing / unparseable / keyset / foreign attemptId | conclude | driven (CL1 row 4 head): `spawn_infra`, or `own_timeout` under a fired timer — fail-closed both ways |
| `emit.json` read (EM1) | missing / unreadable / invalid JSON / schema violation / non-canonicalizable payload | capture | driven (EM1): every shape → `no_output`, member-by-member |
| `deriveActorEmitOpId` (EM2) | throw | capture | ruled out by EM1's `isCanonicalizable` pre-check (the same predicate the lib digests under); no reachable input remains |
| `ingress.submit` (awaited port) | rejection / sync throw | submit | driven (EM3): PROPAGATES — the loop's K2 lane consumes it (attempt-bounded), never converted to an outcome |
| `diag.emit` (sync port) | port contract: never throws | every phase | ruled out BY PORT CONTRACT (fail-open on the port, called BARE); the swallowing-sink negative rides DG1's lane (no conclusion, no authority state, no attempt-directory artifact — the diag store's own file is the sink's normal write; non-blocking not promised, DG1's letter) |

Process death of the WORKER mid-attempt is not an adapter lane — the
durable errand row alone decides after restart (P3a's CT-A2-CRASH
windows, whose durable-prefix simulation this packet does not
touch). Process death of the WRAPPER/ACTOR is CL1/CL2's driven
surface.

## Mirrored surface map (one canonical statement per rule)

| Rule | Canonical home | Mirrors (summarize/defer only) |
|---|---|---|
| The conclusion precedence | CL1 | the C23 quote (operative), RS2/RS3's lane landings, CL2's kill drives, the grid's spawn/conclude rows, Claim (4), flag F7 |
| The spawn discipline items | SD1 | the C19 quote (operative), SD2's property list, RS1's stdio + env pass-through notes, AV2's allowlist clause, T2's knob defaults, Claim (3), flag F1 |
| Escalation ownership + orphan residual | SD3 | RS1's forward-and-grace clause, T2's two-tier margin clause, CL1 row 2's parenthetical, flag F2, probe P6e's note |
| Attempt scoping | H4 | C17/C20/C23 quotes (operative), H2's directory, RS2's echo rule, Claim (1) |
| The cwd rule (both lanes) | H1 | the C17 quote (operative), the delivery-port input note (delegated sources), the grid's capability-resolution row, the deliveryLoop test bullet, T2's `defaultCwd` knob (the none lane), Claim (2), flag F5 |
| The emit schema + no-output widening | EM1 | the C20 quote (operative), CL1's exit-0 tail, the grid's capture row, Claim (4)'s fail-closed clause, flag F3 |
| The op-id identity | EM2 | H3's derivation, the ADR-004 expansion, CB1's collapse basis, Claim (5) |
| The `name_collision` scope exclusion | RS4(a) | K1's member note in the seam expansion, DG1's token-domain note, flag F6 |
| The session-name derivation | RS4(b) | flag F9, T1's export list |
| Fail-open diag / zero authority | DG1 | C26's consumed half, the grid's diag row, Claim (6)–(7) |
| The `canonicalize` public export | H2 | T3's ripple line, the emit target/test bullets, the mutation-boundary entries |
| The attempt-start evidence/version gate | H5 | flag F10, H3's pointer, the H acceptance race lanes, the deliveryLoop target/test bullets + boundary entries, T3's ripple line, DG2's evidence-edge growth clause (both new edges) |

Fold policy: a change to a canonical row updates every named mirror
before handing back.

## In-context notes (the scarce budget)

- Commit ≠ deliver stays the plane boundary: the adapter's ONLY
  kernel-facing act is `ingress.submit` with the actor's own op. Do
  not read kernel state here, do not classify outcomes here — the
  loop owns discovery and classification (P3a).
- Fail-closed means CONSUMED, not crashed: every malformed exchange
  file lands in a budget-bounded infra/no-output lane. Resist both
  temptations — throwing (crashes the loop pass for a per-attempt
  fault) and repairing (a guessed conclusion is worse than a
  consumed attempt).
- The wrapper is deliberately TRIVIAL: spawn, forward TERM, grace
  KILL, write one file, exit 0. Every feature added to it enlarges
  the wrapper-integrity failure surface that RS2 must fail-closed
  against. Do not add logic there.
- The stub actor in tests is CONFIGURATION (bound through the argv
  mapping), never an injected seam — the determinism clause's legal
  form. Real-LLM actors are the dogfooding tier (ch9-P4's journey),
  never CI.
- `envAllowlist` default `{PATH}` is a floor for tests, not a
  production recommendation — real actor CLIs will need HOME/keys;
  that is the composition's declared choice per C19, never an
  adapter default silently widened.

## Embedding gates

- **Target files (production):**
  - `v3/src/runner/spawn.ts` — NEW: SD1's seam.
  - `v3/src/runner/attemptWrapper.mjs` — NEW: RS1's wrapper asset.
  - `v3/src/runner/actorAdapter.ts` — NEW: H/AV/RS/CL/EM/DG1 — the
    real `AttemptExecutor` factory.
  - `v3/src/runner/enc.ts` — NEW: the relocated C8 encoding +
    `defaultSessionNamer` (RS4(b)).
  - `v3/src/runner/index.ts` — exports (T1).
  - `v3/src/runner/deliveryLoop.ts` — H5/F10: the attempt-start
    evidence-first check + version gate on both start kinds (the
    arm-minted P3a-surface product fix).
  - `v3/src/providers/worktreeProvider.ts` — SD2's fold-in + the
    `enc` import flip + the `DEFERRED(ch9-p3)` marker removal.
  - `v3/src/providers/index.ts` — the `enc` re-export's source flip.
  - `v3/src/ports/delivery.ts` — H1/F5: the optional `cwd` input
    field (the reviewed seam extension).
  - `v3/src/ports/runtimeContextProvider.ts` — H1: the separate
    `LocalExecutionCapability` interface (the C15 base member set
    byte-untouched).
  - `v3/src/ports/index.ts` — H1: the `LocalExecutionCapability`
    type re-export (the ch12-P3 barrel convention: every
    runtime-context port type rides the canonical entrypoint).
  - `v3/src/ports/diagnostics.ts` — DG2: the `spawn_outcome` kind +
    `spawnOutcome`/`spawnDetail` fields + the iff-table update.
  - `v3/src/diag/sqliteDiagStore.ts` — DG2: allowlist/kind growth +
    both-direction iffs (the `contextPacketId` loop split included).
  - `v3/src/emit/opId.ts` + `v3/src/emit/index.ts` — H2: the
    `canonicalize` serializer becomes a public export (a new name on
    the existing implementation, internals untouched).
  - `v3/vitest.stryker.config.ts` — T3: the real-spawn test files
    join the subprocess exclude list.
  - `v3/eslint.config.mjs` — T3: the `.mjs` asset's REQUIRED
    typed-lint carve-out (an ignore entry or a dedicated non-typed
    block).
- **Test targets:**
  - `v3/src/runner/spawn.test.ts` — NEW: SD1 lanes (faithful exit, the
    `timedOut` flag's fidelity, infra distinct, env replacement,
    grace escalation — real children).
  - `v3/src/runner/actorAdapter.test.ts` — NEW: H/AV/RS/CL/EM/DG
    lanes (real wrapper spawns; scripted ingress for submit lanes).
  - `v3/src/runner/actorAdapterClassify.test.ts` — NEW (gate-2
    aftermath): the PURE `classifyConclusion` CL1 matrix + the RS2/EM1
    parsers, NO subprocess — so Stryker covers the pure logic (the
    split OUT of the subprocess-excluded real-spawn file).
  - `v3/src/runner/deliveryLoop.test.ts` — H5/F10: the
    reclaim × sibling-commit race lanes on both start kinds (stale
    errand + advanced instance → confirmed-by-evidence, no spawn;
    the version-gate SKIP negative); AND H1's loop-side lanes (the
    cwd present-iff carriage, the value-identity assert vs
    `locator.path`/`projection.path`, the missing-capability and
    throwing-resolution D6 negatives with errand-unmutated /
    no-budget-burn asserts).
  - `v3/src/runner/enc.test.ts` — NEW: the encoding suite RELOCATES
    with the function (injectivity/reserved-delimiter/nonempty
    lanes move; the provider suite keeps its composed-identity
    lanes).
  - `v3/src/providers/worktreeProvider.test.ts` — SD2's pin (suite
    green over the seam; message-wording asserts synced if needed).
  - `v3/src/diag/sqliteDiagStore.test.ts` — DG2 lanes
    (both-direction iff reds for the new kind; bundle exclusion
    unchanged).
  - `v3/src/emit/opId.test.ts` — H2: the exported serializer's
    selftest (sorted keys, equality with the digest path's bytes).
  - `v3/src/drift/sourceHygiene.test.ts` — T3: `.mjs` joins the
    gate's walk-extension set.
  - `v3/src/ctBRealRunner.test.ts` — NEW: CB1 (the src-root
    contract-test culture: `twoWorker.test.ts`, `ctA2.test.ts`).
- **Entrypoints:** `disciplinedSpawn`, `createActorAdapter`, `enc`,
  `defaultSessionNamer` + AV2's env-name constant pair
  (module-public via `runner/index.ts`); the
  wrapper asset is spawned, never imported. NO shipped CLI change,
  NO ingress change, NO kernel change; the delivery port's input
  gains `cwd` and the provider-port file gains the separate
  `LocalExecutionCapability` interface (H1; the C15 base member set
  byte-untouched), `ports/diagnostics.ts` grows per DG2 — the shipped
  entrypoint surface is untouched (R-ACTIVATION-JOURNEY does not
  fire: `runner run` — the shipped entrypoint that will reach this
  code — is ch9-P4's, where the chapter's journey rides).
- **Substrate:** nine NEW cells probed in-session (P6a–P6i; P6h/P6i
  ran through the arm's leg-3 session, receipts in its transcript — the
  probe table in Operative material); the spawn/kill/env cells
  P3a–P3d and P4b stand from the draft/P2 probe tables; the
  SIGTERM→grace→SIGKILL escalation is in-tree-driven (the provider
  suite). The packet claims nothing tmux-grain (P4's probes stand
  ready in the draft table but no row here rests on them).
- **Mutation boundary** (machine face below): the files above plus
  this packet file.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/runner/spawn.ts",
      "v3/src/runner/spawn.test.ts",
      "v3/src/runner/attemptWrapper.mjs",
      "v3/src/runner/actorAdapter.ts",
      "v3/src/runner/actorAdapter.test.ts",
      "v3/src/runner/actorAdapterClassify.test.ts",
      "v3/src/runner/enc.ts",
      "v3/src/runner/enc.test.ts",
      "v3/src/runner/index.ts",
      "v3/src/runner/deliveryLoop.ts",
      "v3/src/runner/deliveryLoop.test.ts",
      "v3/src/providers/worktreeProvider.ts",
      "v3/src/providers/worktreeProvider.test.ts",
      "v3/src/providers/index.ts",
      "v3/src/ports/delivery.ts",
      "v3/src/ports/runtimeContextProvider.ts",
      "v3/src/ports/index.ts",
      "v3/src/ports/diagnostics.ts",
      "v3/src/diag/sqliteDiagStore.ts",
      "v3/src/diag/sqliteDiagStore.test.ts",
      "v3/src/emit/opId.ts",
      "v3/src/emit/opId.test.ts",
      "v3/src/emit/index.ts",
      "v3/src/drift/sourceHygiene.test.ts",
      "v3/src/ctBRealRunner.test.ts",
      "v3/vitest.stryker.config.ts",
      "v3/eslint.config.mjs",
      "v3/implementation/packets/ch9-p3b-actor-adapter.md"
    ]
  }
}
```

## Pre-approval flags

- **F1 — the seam shape + module homes (SD1/T1).** The
  `disciplinedSpawn` function shape and its closed
  `SpawnConclusion` union, the `runner/spawn.ts` + `actorAdapter.ts`
  + `attemptWrapper.mjs` homes, and the `enc` relocation to
  `runner/enc.ts` (with the providers re-export kept) — the C19
  discipline's ITEMS are ratified, the seam's SHAPE and homes are
  this packet's decision (the P3a K1/T2 precedent one packet later).
  Risk if wrong: a later re-home/re-shape is mechanical behind
  stable exports; ch9-P4's gate-runner consumption is the shape's
  first external test. Route: `approve-ratified` — the human approve
  ratifies shape and homes (dated decision record; revisit: none).
- **F2 — the wrapper-KILL orphan residual (SD3/CL1 row 2).** A
  KILL landing on the WRAPPER — the seam's backstop on a genuinely
  WEDGED wrapper (the SD3 two-tier deadline keeps the normal
  TERM-ignoring-actor path orphan-free) or a foreign KILL — both
  landing in CL1 row 2 —
  orphans the actor process (P6e — a KILL cannot be forwarded); the
  orphan keeps running until it exits on its own. Accepted at ch9: the wrapper is repo-shipped
  trivial code with its own tests (wedging it requires the
  uninterruptible-I/O class C19 already names as residual), the
  host is trusted-local (ADR-017), and process
  teardown/health is the named Absent with its own future chapter.
  Route: `approve-ratified`.
- **F3 — the emit schema (EM1).** Closed keyset
  `{ type, payload }`, BOTH required, `payload` canonicalizable —
  schema violations land `no_output`, never a throw. The
  payload-required rule follows the dev CLI's derived-path
  convention (the op-id identity digests the payload). Risk if
  wrong: an actor legitimately needing a payload-less op would land
  `unconfirmed` — surfaced loud, fixable by a contract successor
  row, never silent. Route: `approve-ratified`.
- **F4 — the `PAIRFLOW_PACKET` / `PAIRFLOW_EMIT` variables (AV2).**
  C19's "adapter-injected pairflow variables" instantiated as two
  absolute-path variables — the actor-facing file-location
  convention this chapter's dogfooding and P4's journey will bake
  in. In-repo the names live as AV2's single exported constant
  pair (a rename stays one line until out-of-repo actors harden the
  strings). Route: `approve-ratified`.
- **F5 — cwd from the provider contract (H1; ratifier-decided at
  the pre-approval STOP).** The working directory is a CONTRACT
  obligation of the provider, never a value read out of the actor's
  view: a separate optional capability interface beside the base port
  carries it (`LocalExecutionCapability.resolveLocalWorkingDirectory
  (ref)` — the ch12-C15 model-verbatim base member set untouched),
  the loop resolves it at
  derivation, and the executor input carries an explicit `cwd`
  (present iff the run has a context). A provider that cannot answer
  is not a LOCAL provider (a future cloud provider simply does not
  claim the facet — its own adapter pairs with it, the P3a
  multi-site note's pairing). The earlier duck-typed
  projection-`path` reading was REJECTED by the ratifier on layering
  (the projection is the actor's view) — the capability-not-name
  lesson. C17's letter fixes the VALUE (byte-identical either way);
  the mechanism is below contract grain. Route: `approve-ratified`.
- **F6 — `name_collision` unreachable at this packet (RS4(a)).**
  The direct-spawn path has no session namespace; the real adapter
  never returns the member here — a SCOPED exclusion with deferral
  home ch9-P4 (the tmux wrap), where the lane activates and gets
  driven. The member stays consumption-proven (P3a's scripted
  lanes). Route: `approve-ratified`.
- **F7 — the conclusion-precedence harmonization (CL1).** The
  own-timer flag composes with the OBSERVED RECORD to decide
  attribution (SD1's `timedOut` × CL1's per-row composition): a
  flagged KILL-record — a signal/nonzero/resultless wrapper
  conclusion, or a valid result recording the actor signal-killed
  with `termForwarded` — lands `own_timeout` (C23's letter); an
  UNFLAGGED signal-record lands `foreign_kill` (C21's class;
  `termForwarded` discriminates only under a fired timer); a
  flagged NATURAL completion (actor exit 0 or the actor's own
  nonzero) keeps its normal lane — a late timer never reclassifies
  completed work (P6h). Wrapper integrity stays ahead of the actor
  record. C23's sentences are composed, not contradicted. Route:
  `approve-ratified`.
- **F8 — the delivery-timeout default + the composition pairing
  rule (T2; ratifier-decided at the pre-approval STOP).** The
  delivery timeout default is 1 800 000 ms (30 min — sized to the
  ratifier's real LLM-actor run lengths). The LEASE is untouched:
  C14's ratified 15-min loop default STANDS (no reopen — the lease
  is composition-configured by C14's own words), and the PAIRING
  (lease a margin above the effective timeout, else a sibling
  worker routinely reclaims a still-live attempt) is the
  COMPOSITION'S obligation: the CB1 test composition sets 2 700 000
  explicitly, and the operator-facing `runner run` composition
  (ch9-P4, C25) carries AND validates the pair — a named P4
  watchpoint. The real successor is the parked platform-derived
  lease design (lease computed from the effective timeout, never
  user-visible — the process-log boundary note). CONFIGURABILITY:
  the timeout is a composition-API knob today, and its
  TEMPLATE-declared per-actor form rides the same parked design;
  the operator-facing exposure is P4's C25 CLI surface. Route:
  `approve-ratified`.
- **F10 — the P3a attempt-start evidence/version gate (H5; the
  arm-minted product finding, gate 1).** The built delivery loop's
  LIVE-path attempt start runs neither the CF1 committed-row check
  nor a version gate (`deliveryLoop.ts`: `attemptClaimed` AND
  `respawn()` each consult evidence only at their TERMINAL/
  zero-budget holds — B1 and B5's B1-shaped start both unguarded) — a
  reclaimed stale errand racing a sibling attempt's commit could
  spawn the NEXT dispatch's packet under the OLD errand row
  (C13/H3 breach at the ledger grain; kernel truth stays op-id-safe).
  The fix — the unconditional evidence-first check + the
  `instance.version === errand.expected_version` gate, with race
  tests — lands INSIDE this packet's boundary on the P3a loop
  surface (`runner/deliveryLoop.ts` + its test): the activation
  packet hardens the seam it activates. P3a's CF3 letter names B1 a
  committed-row-check decision point — this packet realizes the
  UNCONDITIONAL active-path reading of that letter, and adds the
  version gate as a C13-ENTAILED belt (the belt is not
  letter-anchored; both halves ride this flag). Route:
  `approve-ratified`.

## Acceptance

- Contract tests: **`CT-B-TWOWORKER` (the ch-9 real-runner
  re-run)** executed green here (CB1; the intake row's re-run
  annotation flips at the chapter DoD); the IC-A2 family stays
  P3a's (green, untouched). All matrix lanes driven by
  claim-derived negatives (R-CLAIM-NEGATIVES; every declared lane
  DRIVEN — R-MATRIX-LANES).
- Checks: the drift suite (registries/ledger byte-identical — U1),
  `pnpm v3:packet-lint`, `pnpm v3:adr-check` (ADR-016/017 statuses
  untouched), `pnpm v3:coverage` (the union unchanged — empty
  slice), `pnpm v3:deferred` (the `ch9-p3` marker DISCHARGED — U1),
  `pnpm v3:lint` + `v3:typecheck` (T3's ripple green).
- Test disciplines + family inventories (R-ALTITUDE-LINE:
  membership parameterized, fixture enumeration is build work;
  R-LANE-SENSITIVITY binds twice — at these lane texts now, at the
  built bodies via the arm gate-2 sensitivity pass; the §9.4
  mutation-pilot dual-run rides gate-2 scoped to this boundary,
  with T3's declared subprocess-profile partiality recorded):
  - **SD (seam):** the declared set = {exit fidelity (a real child's
    exit code and a signal conclusion both reported verbatim);
    the `timedOut` flag's FIDELITY (set on every timer-fired
    conclusion regardless of the exit shape, never set otherwise —
    a TERM-compliant AND a TERM-ignoring child, the grace escalation
    observed, real processes); the NORMAL own-timeout path (our TERM
    → the wrapper forwards + kills + writes the signal-result +
    exits 0 → `own_timeout`, the P6c shape — RED without the
    flag×record composition); the `infra` lane's BOTH source sites (nonexistent
    binary — the ENOENT error event, no exit code — AND the
    synchronous spawn-setup throw, each landing `infra`); env FULL
    REPLACEMENT (the child observes ONLY the passed object — a
    canary var from the host env proven absent); explicit-cwd
    honored; the attribution rule (a child exiting naturally CLEAN
    yields the exit conclusion even when the timer callback ran
    before the exit event's delivery — the delayed-exit-event
    sensitivity lane — AND the seam resolves within the drain
    deadline while a live orphan still holds the stdio pipes, the
    truncation explicit — the exit-not-close negative); the
    timer-knob validation negatives (NaN / Infinity / non-integer /
    below-floor / ≥ 2³¹ per knob AND per derived sum — each a
    construction-time throw, the substrate's 1 ms-collapse hazard
    driven out; the SHARED validator driven at EVERY consumer
    factory: `actorAdapter.test.ts` AND the provider suite); the
    adapter's 1 800 000 ms timeout default ASSERTED (a changed
    default is RED), and the CB1 composition's explicit
    lease-above-timeout pairing exercised (the pairing rule's
    P3b-grain drive; its validation home is P4's composition); the
    fold-in pin (the ENTIRE provider suite
    green over the seam; the `DEFERRED(ch9-p3)` marker gone —
    grep-driven)}. Membership: SD1–SD3 (owner: this packet; driven
    in `runner/spawn.test.ts` + the provider suite).
  - **H (handoff):** the declared set = {cwd on the context lane = the CAPABILITY-resolved path (asserted byte-equal to BOTH the ref's minted `locator.path` and the projection's `path` — the C17 value-identity driven), carried as the executor input's `cwd` field present iff the run has a context; cwd on the `none` lane = the C17 per-run subdirectory (both path components `enc`-encoded, the directory created, the input field absent); the missing-capability and throwing-resolution negatives → D6's config-integrity lane (loud, errand unmutated, no budget burn); `packet.json` byte-asserted as the emit-lib
    canonical serialization of the dispatched packet; the attempt
    directory keyed by `enc(attempt_id)` — two attempts of one
    errand produce disjoint directories (H4's constructive
    negative); H3's id equality (the derived `context_packet_id`
    equals the errand key and ADR-004's input — asserted against
    `deriveDispatchIntent`'s `expectedVersion`); the mkdir /
    tmp-write / rename IO-failure members (each → `spawn_infra`, no
    side effect beyond the attempt directory); the attempt-start
    evidence/version gate on BOTH start kinds (H5/F10): a reclaimed
    stale errand whose instance advanced resolves `confirmed` by
    evidence with NO spawn — on the budgeted hold via the
    `evidence-at-claim` edge, on the re-spawn hold via the
    `evidence-at-respawn` edge — the race fixtures are RED without
    the gate; the H5 ORDER combination members at BOTH holds
    (TERMINAL + mismatch + no evidence → `mooted`, and evidence +
    TERMINAL + mismatch → `confirmed` — zero spawn/mint/decrement
    each way; a SKIP moved ahead of the terminal moot is RED);
    the version-gate SKIP negative (mismatch-no-evidence: no spawn,
    no decrement, row byte-unchanged)}. Membership: H1–H5
    (owner: this packet).
  - **AV (mapping):** the declared set = {a resolving mapper spawns
    exactly the mapped argv; the `null`-mapper negative →
    `spawn_infra`; the THROWING-mapper negative → `spawn_infra`;
    `PAIRFLOW_PACKET`/`PAIRFLOW_EMIT` present in the child env with
    the attempt's absolute paths, ON BOTH cwd lanes, alongside the
    allowlist and nothing else}. Membership: AV1–AV2 (owner: this
    packet).
  - **RS (result seam):** the declared set = {the happy write
    (atomic — driven by a PARTIAL-WRITE-SENSITIVITY member realized
    as a DETERMINISTIC INTERLEAVING fixture (the writer paused at a
    synchronization point mid-write, the reader reading between
    chunks — never a timing poll), where a direct final-path-write
    fixture is RED; the `.tmp` sibling never read; the final file
    present at wrapper exit); echo verification (a FOREIGN `attemptId` in an
    otherwise-valid file → CL1 row 4's flag branch: `spawn_infra`
    unflagged, `own_timeout` under a fired timer); the
    missing-file lane;
    the unparseable-file lane; the keyset-violation lanes (the
    `exitCode` grain members — a non-integer and a `-0` fixture —
    and the exactly-one-of-`exitCode`/`signal` members — a both-null
    and a both-non-null fixture — included); wrapper stdio
    pass-through captured; the
    wrapper→actor env pass-through pin (the actor's observed env
    equals the wrapper's in FULL keyset AND values — an added extra
    variable and a dropped allowlisted variable are BOTH red; RS1's
    transitive-confinement clause driven)}. Membership: RS1–RS4 (owner: this
    packet; RS4's exclusions asserted — the real adapter's returned
    members over the full lane walk never include `name_collision`,
    and `defaultSessionNamer` equals C23's derivation for hostile
    ids).
  - **CL (classification):** the declared set = the CL1 precedence
    walked MEMBER-BY-MEMBER with real processes, the `timedOut`
    flag composed PER ROW (both flag values driven wherever both
    are reachable) — seam-infra → `spawn_infra`; the NORMAL
    own-timeout path (our TERM, TERM-compliant AND TERM-ignoring
    actors — CL2: flagged + actor-signal-result + termForwarded) →
    `own_timeout`; UNFLAGGED wrapper signal-killed (P6e's shape) →
    `foreign_kill`, FLAGGED wrapper signal-killed → `own_timeout`;
    UNFLAGGED wrapper nonzero → `spawn_infra`, FLAGGED wrapper
    nonzero → `own_timeout`; UNFLAGGED result-invalid family →
    `spawn_infra`, FLAGGED result-invalid/missing → `own_timeout`;
    actor foreign-killed (P6d's shape, real kill — CL2, unflagged) →
    `foreign_kill`; FLAGGED actor-signal WITHOUT `termForwarded` →
    `foreign_kill` (a foreign kill our late timer merely overlapped
    — the record's forward-bit decides under the fired timer); the forwarded-but-not-ours TERM (unflagged) →
    `foreign_kill` (C21's class; `termForwarded` discriminates only
    under a fired timer); actor nonzero → `nonzero_exit` on BOTH
    flag values (a nonzero exit is never a kill record); actor 0 +
    valid emit → `submitted` and actor 0 + EM1's no-output family →
    `no_output`, each ALSO driven under a fired timer (the P6h
    completed-work-never-reclassified negative) — plus ORDER
    sensitivity (a fixture satisfying two rows lands on the EARLIER
    one). Membership: CL1–CL2 (owner: this packet).
  - **EM (emit/submit):** the declared set = {each EM1 rejection
    shape → `no_output`, member-by-member (missing, unreadable,
    invalid JSON, non-object, unknown key, missing/empty `type`,
    missing `payload`, non-canonicalizable `payload`); the
    composed envelope asserted FIELD-BY-FIELD against the packet
    (actorId, expectedVersion, expectedRole, instanceId) with the
    derived `opId`; op-id stability (two deliveries of one dispatch
    derive the SAME `opId`; a different attempt does not change
    it); the outcome passthrough VERBATIM (`committed`, `duplicate`,
    `stale`, and a rejection each returned unreshaped inside
    `submitted`); the submit-throw propagation on BOTH channels (a
    rejecting AND a synchronously throwing scripted ingress each
    reject `execute()` — EM3)}. Membership: EM1–EM3
    (owner: this packet).
  - **DG (diag):** the declared set = {one `spawn_outcome` event per
    concluded execute, its `spawnOutcome` token equal to the
    returned member's class, on EVERY CL lane (the CL walk
    parameterizes the family); the EM3 rejecting-path event (a
    rejecting submit still yields exactly one `spawn_outcome` event
    with the `spawn_infra` token — DG1's decoupled clause driven);
    the `evidence-at-claim` + `evidence-at-respawn` edge lanes
    (emission on each hold's evidence-hit with its declared
    from→to shape; `attemptId` ABSENT round-trips the store; a
    hostile `attemptId`-bearing row of EITHER new edge REJECTED by
    the read gate — both directions);
    the `spawnDetail` cap and absence
    rules (the ingress `detail` iff untouched — driven as a negative);
    a swallowing sink changes no conclusion, no authority state, and
    no attempt-directory artifact (DG1's exact boundary — the diag
    store's own file excluded as the sink's normal write); the
    read-gate iffs red in BOTH directions for the new kind against
    every sibling kind; bundle exclusion unchanged}. Membership:
    DG1–DG2 (owner: this packet).
  - **CB (the re-run):** the declared set = {two real workers, one
    dispatch, the barrier-staged interleaving: exactly TWO same-op-id
    ingress submissions with one `committed` AND one `duplicate`
    observed (the conjunction is mandatory — a single-submission run
    does not satisfy the lane), exactly ONE committed transition
    row; the errand converges `confirmed`; op-id equality across the
    racing attempts asserted; no kernel write outside the ingress
    submissions; the run completes under the subprocess-profile
    exclusion (T3) with the suite green}.
    Membership: CB1 (owner: this packet).
- Drift tests green (standing, unconditional — PI-3), the
  source-hygiene gate now covering `.mjs` (T3's extension).
- Standing review rules in force: REV-E-NO-ADAPTER-BRANCH (the loop
  stays type-blind to this adapter; the adapter itself never
  branches on a provider TYPE — H1's rule is a value-shape rule);
  REV-DIAG-FAILOPEN (DG1 — the sink called BARE);
  REV-B-LOCAL-NOT-AUTHORITY (no adapter-local state is authority —
  every conclusion derives from files, signals, and the injected
  seams); REV-C-PROJECTIONS-READONLY (the adapter reads no kernel
  projection at all — its kernel-facing surface is `ingress.submit`
  alone).

## Build record

Execution context: **fresh-context-delegated** — a fresh-context build agent
implemented the packet in one commit against the ratified spec (sha256
`701af719…0764` @ HEAD `4a76bc09`). All embedding gates green:
`pnpm v3:lint`, `v3:typecheck`, `v3:test` (1592 tests), `v3:coverage`
(empty slice — the union unchanged), `v3:adr-check`, `v3:packet-lint`,
`v3:deferred` (the `ch9-p3` fold-in marker DISCHARGED — SD2), and the
drift suite (now covering `.mjs`). The orchestrator records the
approve/STOP verdict entries in `stops`/`rounds`.

Test delta (before ≈ 1492 → after 1592, +100): FOUR new test files —
`spawn.test.ts` (15: exit fidelity, the `timedOut` flag both ways incl.
the grace SIGKILL, the two `infra` source sites, env replacement, cwd,
the exit-not-close + bounded-drain lane, the shared validator's
per-knob + per-derived-sum negatives), `enc.test.ts` (5: the relocated
encoding lanes + `defaultSessionNamer`), `actorAdapter.test.ts` (38:
AV/H/RS/CL/EM/DG lanes over real wrapper spawns + a scripted ingress;
the RS2 keyset/foreign + EM1 shape lanes unit-driven), `ctBRealRunner.test.ts`
(1: CB1). In-file growth: `opId.test.ts` +3 (the public `canonicalize`
selftest), `sqliteDiagStore.test.ts` +25 (DG2 round-trips + both-direction
iffs + the two new evidence edges), `deliveryLoop.test.ts` +10 (H5 both
holds + H1 carriage/value-identity/D6 negatives; the B4-rescue lane
refreshed to add evidence MID-EXECUTE so the exhaust-point double-check
stays driven under the new front gate), `worktreeProvider.test.ts` net +3
(the pure `enc` lanes RELOCATED out; SD2 validator + H1 capability lanes
added).

Build-grain decisions (audited):

1. **`parseResult`/`parseEmit` exported for unit lanes.** The RS2
   keyset/foreign-`attemptId` lanes and the EM1 shape lanes are
   UNREACHABLE through the trivial real wrapper (which only ever echoes
   the real attempt id and writes a well-formed result), so the two pure
   fail-closed parsers are module-exported and unit-driven; the reachable
   submitted / no_output / CL classification lanes drive end-to-end
   through real wrapper spawns.
2. **The provider suite's sub-floor timeouts bumped to 1000 ms.** T2's
   validator floors (`timeoutMs`/`graceMs` ≥ 1000) made the ch9-P2
   timeout lanes' 100/150 ms configs INVALID; they were raised to 1000 ms
   (the children sleep 30 s, so the timeout still fires) — SD2's
   unchanged-pin is thereby scoped to valid configurations, exactly per
   T2's "SCOPED to valid configurations" clause.
3. **The `.mjs` wrapper is fully eslint-ignored** (the "ignore entry"
   option T3 names) — it lives outside the TS program, so a typed rule is
   a parser error; its source hygiene is covered by the drift gate's new
   `.mjs` walk.
4. **CB1 uses `node:timers/promises` `setTimeout` (aliased `delay`)** for
   the I/O-yielding presence-file polls. The CHK-D-TESTCLOCK global ban
   targets the GLOBAL `setTimeout` identifier; an aliased named import is
   lint-clean, and the test is inherently real-time (it spawns real
   processes). The barrier is SELF-releasing (each stub blocks until the
   release file appears; the test writes it only after BOTH presence
   files exist), so co-in-flight is PROVEN, never timing-lucked.
5. **CL1 row 1 (seam `infra`) is driven via the reachable spawn_infra
   sites** (null/throwing mapper, a pre-spawn mkdir fault, a clean-exit
   wrapper with no result). A pure "the seam returns `infra`" for the
   node+wrapper spawn is not deterministically reachable (`process.execPath`
   always resolves) and is independently proven in `spawn.test.ts`; all
   sites conclude the same K1 member (`spawn_infra`).
6. **The env-replacement assertion filters `__CF*`** — macOS injects
   `__CF_USER_TEXT_ENCODING` into every child regardless of the passed
   env object; it is a substrate quirk present for wrapper and actor
   alike, not an adapter addition, so the "nothing else" keyset assert
   excludes it.

Derived mutation-probe table (R-DERIVED-PROBES; ≥1 per family, run
EXCLUSIVELY through `tools/v3-plan/probe_runner.py` — scratchpad
backup/restore/cmp/receipt per probe; git-restore never used):

| Family | Target | Mutation | Expected | Observed | Receipt |
|---|---|---|---|---|---|
| SD | `runner/spawn.ts` | `timedOut` → `false` on the exit conclusion | RED | RED (exit 1) | `sd-seam` |
| H  | `runner/actorAdapter.ts` | `canonicalize(packet)` → `JSON.stringify(packet)` | RED | RED | `h-handoff` |
| AV | `runner/actorAdapter.ts` | null-mapper concludes `no_output` (not `spawn_infra`) | RED | RED | `av-mapping` |
| RS | `runner/actorAdapter.ts` | drop the `attemptId` echo verification | RED | RED | `rs-result` |
| CL | `runner/actorAdapter.ts` | actor nonzero → `spawn_infra` (not `nonzero_exit`) | RED | RED | `cl-classify` |
| EM | `runner/actorAdapter.ts` | envelope `actorId` composed from `instanceId` | RED | RED | `em-emit` |
| DG | `diag/sqliteDiagStore.ts` | drop the `spawnOutcome` iff read-gate | RED | RED | `dg-diag` |
| T  | `runner/enc.ts` | break `defaultSessionNamer`'s `pairflow-` prefix | RED | RED | `t-types` |
| U  | `runner/attemptWrapper.mjs` | inject a raw NUL byte (the `.mjs`-walk target) | RED | RED | `u-drift` |
| CB | `runner/actorAdapter.ts` | `context_packet_id` made attempt-specific (defeats collapse) | RED | RED | `cb-rerun` |

All ten probes observed RED with byte-verified restores; receipts under
`scratchpad/ch9p3b-build-probes/`. The three real-spawn test files join
the Stryker subprocess exclude (T3) — mutation coverage for this packet is
PARTIAL by that profile's own declared mechanism, so this derived-probe
table is the primary red-on-break evidence.

Spec ambiguity: none required invention — every canonical row (SD/H/AV/
RS/CL/EM/DG/T/U/CB) was realized as written; the build-grain decisions
above are host-convention/representation choices under the ratified rows,
not semantic reinterpretations.

### Build-close aftermath (gate-2 folds)

Authorship: the code + test edits are a DELEGATED build leg executed on
the orchestrator's PER-FINDING instruction (the arm raised the 7
gate-2 findings on commit `18870eb5`; this leg folded them). No
canonical row was edited — every fold lands as a product/test-evidence
change under the ratified rows; no canonical-row-forcing case arose.

1. **PRODUCT (finding 1, P2) — `actorAdapter.ts` rejects a
   non-absolute `defaultCwd` at construction.** A RELATIVE `defaultCwd`
   produced relative none-lane `cwd`, hence relative
   `PAIRFLOW_PACKET`/`PAIRFLOW_EMIT` paths the child would resolve from
   its OWN (changed) cwd — an AV2 breach. Fixed with a config-integrity
   throw alongside the timer-knob validation (`isAbsolute` gate) + a
   negative test (relative / `./` / empty all throw; absolute passes).
2. **TEST (findings 2 + 4, P2) — the CL1 flag×record precedence is now
   able-to-fail ROW-BY-ROW, under Stryker.** The pure conclusion
   classifier is SPLIT out of `execute()` as an exported
   `classifyConclusion(conclusion, record)`; a new NON-subprocess file
   `actorAdapterClassify.test.ts` walks EVERY CL1 row × `timedOut` ×
   record shape to its exact K1 member — including the trivial-wrapper-
   unreachable combinations (a FLAGGED natural exit-0 → EM lanes, P6h;
   a flagged nonzero → `nonzero_exit`; a foreign kill overlapping a
   fired timer → `foreign_kill`; the `termForwarded` discrimination
   only-under-timer). Because the file spawns no subprocess it stays
   OUT of the Stryker subprocess-exclude, so the classifier + the
   RS2/EM1 parsers (moved here) now carry mutation coverage. The
   SD3/two-tier escalation, the 2 000 ms drain-deadline-with-live-orphan,
   and the real-process own-timeout lanes already stood in
   `spawn.test.ts`/`actorAdapter.test.ts` (real children) and are
   unchanged.
3. **TEST (finding 3, P2) — realized paths, exact argv, DG sibling-iff
   walk, sink-artifact invariance.** The env/argv lane now asserts the
   CREATED filesystem paths (`existsSync` on the attempt dir +
   `packet.json`) and the EXACT actor argv (`[execPath, stub, mode,
   dump]` — the mapped argv verbatim, in order). The DG iff walk is
   parameterized over EVERY sibling `DiagnosticKind` (a valid base of
   each kind reads clean; `+spawnOutcome`/`+spawnDetail` each →
   `read_failed`). The swallowing-sink lane now also asserts the attempt
   directory holds EXACTLY the three exchange files (no diag artifact).
4. **(rolled into 2)** — the split file is the Stryker-coverage home for
   `actorAdapter.ts`'s pure logic; the remaining real-spawn-only branches
   keep their derived mutation probes.
5. **PACKET-TEST (finding 5, P2) — `ctBRealRunner.test.ts`.** The
   test-side presence barrier is now EVENT-DRIVEN (`fs.watch`, no aliased
   real timer / polling sleep; the vitest per-test timeout is the sole
   backstop). Worker-1 carries the CB1/F8 PAIRING lease EXPLICITLY
   (`2 700 000` ms — a margin above the adapter's 1 800 000 ms timeout);
   worker-2's 100 ms lease stays the deliberate reclaimer. Budget/attempt
   bookkeeping is now asserted: BOTH real attempts durably recorded, the
   two budgeted starts decremented 3 → 1, the confirm cleared the active
   hold.
6. **TEST (finding 6, P2) — env full-map compare.** The env assertion no
   longer prefix-filters `__CF*` or skips values: it excludes ONLY the
   EXACT OS substrate key (`__CF_USER_TEXT_ENCODING`) and deep-equals the
   COMPLETE remaining key/value map on BOTH cwd lanes; a wider-allowlist
   lane proves a composition var flows through with its value while a
   forbidden host var stays absent.
7. **DOCS (finding 7, P3) — the inline stubs reference the exported
   `PAIRFLOW_*` constants** (interpolated into the generated stub
   scripts in both `actorAdapter.test.ts` and `ctBRealRunner.test.ts`),
   never a raw string literal.

Test delta (1592 → 1619, +27): `actorAdapterClassify.test.ts` NEW (21
— the CL1 matrix + the relocated parser lanes); `actorAdapter.test.ts`
net (the pure parser describe RELOCATED out; the finding-1 negative, the
wider-allowlist env lane added; the env/argv lane rewritten);
`sqliteDiagStore.test.ts` +9 (the sibling-kind iff walk);
`ctBRealRunner.test.ts` unchanged count (barrier/lease/bookkeeping
hardened in place).

Aftermath mutation-probe table (R-DERIVED-PROBES; run EXCLUSIVELY
through `tools/v3-plan/probe_runner.py` — byte backup/restore/receipt
per probe; git-restore never used; receipts under
`scratchpad/ch9p3b-aftermath-probes/`):

| Finding | Target | Mutation | Expected | Observed | Receipt |
|---|---|---|---|---|---|
| 1 | `runner/actorAdapter.ts` | disable the `isAbsolute(defaultCwd)` gate | RED | RED (exit 1) | `af-abs` |
| 2/4 | `runner/actorAdapter.ts` | classifier actor-nonzero → `spawn_infra` (not `nonzero_exit`) | RED | RED | `af-classify` |
| 3 (argv) | `runner/actorAdapter.ts` | drop `...mapped.args` from the wrapper spawn | RED | RED | `af-argv` |
| 6 | `runner/actorAdapter.ts` | inject an extra `EXTRA_LEAK` child-env var | RED | RED | `af-env` |
| 3 (DG) | `diag/sqliteDiagStore.ts` | disable the `spawnOutcome iff kind` read-gate | RED | RED | `dg-walk` |
| 5 | `runner/errandStore.ts` | budgeted start decrements by 0 (not 1) | RED | RED | `ctb-budget` |

All six probes observed RED with byte-verified restores — the arm's
"plausibly red" lanes are now OBSERVED red. The `af-classify` probe
runs against `actorAdapterClassify.test.ts` (the NON-excluded file),
confirming the split logic is Stryker-reachable.

Re-check fold (gate-2, tests-only + whitespace; a delegated leg on the orchestrator's instruction): the CL1 matrix gained EARLIER-ROW precedence members that drive rows 2-3 with a NON-NULL record (the record must stay inert), and the parser suites gained JSON-primitive fail-closed negatives (`null`/string/number/boolean) — three further residual mutants (row-3 condition forced false, row-3 block emptied, `isPlainObject → true`) OBSERVED RED via `probe_runner.py` (receipts `rc-row3-cond`, `rc-row3-block`, `rc-plain`).

**Gates + approve record:** gate-1 arm = 10 legs on the approve path (codex gpt-5.6-sol/high per arm-pin; yield 10-6-4-4-3-3-1-1-2-0, leg 10 CLEAN citing 701af719...); HUMAN approve 2026-07-25 on 701af719... (flags F1-F10 walked individually; Case-B = NOT-B). Build commit 18870eb5 (post-build boundary audit 0 errors); mutation dual-run (SS9.4 pilot): all-files 66.40 / covered-only 79.03 (enc 100, worktreeProvider 83.33, opId 82.46, sqliteDiagStore 74.71, spawn 72.63, deliveryLoop 70.43; actorAdapter 0.00 by the declared subprocess-profile partiality, closed by the aftermath's classifier split - 310 mutants stryker-reachable after). Gate-2 arm: full leg (7 findings) -> aftermath 9044e68d (+27 tests, 6 observed-red receipts) -> re-check (3 residuals) -> fold 09926ed4 (+9 tests, 3 observed-red receipts) -> FINAL CLEAN citing 09926ed4. Suite 1592 -> 1628 across the aftermath.

```json
{
  "packet_metrics": {
    "class": "operability",
    "prediction": {
      "predicted": "projection",
      "reasoning": "the ratified draft rows C17-C23 fix the adapter surface densely; the split's activation share inherits the P3 row's projection prediction",
      "discovered": "projection"
    },
    "provenance": {
      "anchored": 6,
      "derived": 14,
      "new_decision": 6
    },
    "rounds": {
      "review": 6,
      "doc_refinement": 12,
      "implementation": 3
    },
    "stops": [
      {
        "type": "4:flagged-approve",
        "what": "first-of-a-kind human approve with flags F1-F10 (six new-decision rows, all approve-ratified) + the Case-B verdict",
        "resolution": "the ratifier walked every flag individually across the STOP (EZX walkthroughs; two flags REDESIGNED at the STOP: F5 cwd-from-provider-contract on the ratifier's layering argument, F8 timeout-default raised to 30 min with the pairing made a composition duty after the arm's C14-letter catch); Case-B = NOT-B; approved on 701af719... (2026-07-25); arm gate-1 leg 10 CLEAN on the same basis"
      }
    ],
    "detector_misses": [
      {
        "found_at": "arm-approve",
        "what": "the substrate-probe classes behind the SD1/CL1 triple redesign: the Node timer-delay 1ms-collapse (NaN/Infinity/>=2^31), the delayed-exit-event race (timer callback outrunning a dead child's exit event), and the normal-own-timeout misclassification the attribution rewrite itself introduced",
        "why_missed": "the panel verified text-vs-contract; the arm ran live runtime probes (P6h/P6i were arm-minted) and re-attacked each fold's own consequences"
      },
      {
        "found_at": "arm-approve",
        "what": "the leg-9 C14-letter catch: raising the loop lease default would have contradicted the ratified C14 row's own 'default 15 min' text",
        "why_missed": "the fold treated the value as composition-grain; the arm re-read the ratified byte"
      },
      {
        "found_at": "approve",
        "what": "the cwd-source layering flaw (the adapter duck-typing the ACTOR-facing projection for its own operational parameter) — caught by the RATIFIER, not by five lenses or nine arm legs; became the LocalExecutionCapability design",
        "why_missed": "every mechanical reviewer accepted value-correctness; the layering judgment (whose view is the projection?) needed the owner's architectural instinct"
      }
    ],
    "learned": "gate-1 ran 10 arm legs (yield 10-6-4-4-3-3-1-1-2-0) with two ratifier-directed redesigns landing mid-loop; the human caught the one layering flaw all machine reviewers passed; gate-2 1+1+1 legs converged on 09926ed4; mutation dual-run 66.40/79.03 with the declared adapter subprocess blind spot closed by the classifier split (310 mutants stryker-reachable post-split)",
    "main_thread_model": "claude-fable-5"
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "SD1", "class": "new-decision", "refs": [] },
      { "id": "SD2", "class": "derived", "refs": ["ADR-017", "prose:ch9-p2 packet M4 row (fold-in mandate)"] },
      { "id": "SD3", "class": "derived", "refs": ["contract:ch9-runner#C19", "prose:probes P6c/P6e/P6f (in-session, ch9p3b-probes)"] },
      { "id": "H1", "class": "new-decision", "refs": [] },
      { "id": "H2", "class": "derived", "refs": ["contract:ch9-runner#C17", "prose:emit/serialize canonicalization authority"] },
      { "id": "H3", "class": "anchored", "refs": ["contract:ch9-runner#C13", "ADR-004"] },
      { "id": "H5", "class": "new-decision", "refs": [] },
      { "id": "H4", "class": "anchored", "refs": ["contract:ch9-runner#C17", "contract:ch9-runner#C20", "contract:ch9-runner#C23"] },
      { "id": "AV1", "class": "anchored", "refs": ["contract:ch9-runner#C18"] },
      { "id": "AV2", "class": "new-decision", "refs": [] },
      { "id": "RS1", "class": "derived", "refs": ["contract:ch9-runner#C23", "prose:probes P6b/P6c/P6f/P6g"] },
      { "id": "RS2", "class": "anchored", "refs": ["contract:ch9-runner#C23"] },
      { "id": "RS3", "class": "derived", "refs": ["contract:ch9-runner#C23", "prose:probes P6e/P6g"] },
      { "id": "RS4", "class": "derived", "refs": ["contract:ch9-runner#C23", "contract:ch9-runner#C16"] },
      { "id": "CL1", "class": "derived", "refs": ["contract:ch9-runner#C15", "contract:ch9-runner#C16", "contract:ch9-runner#C21", "contract:ch9-runner#C23"] },
      { "id": "CL2", "class": "derived", "refs": ["contract:ch9-runner#C16", "contract:ch9-runner#C21", "prose:ch9-p3a flag F6 (process-grain kills deferred here)"] },
      { "id": "EM1", "class": "derived", "refs": ["contract:ch9-runner#C20", "ADR-004", "prose:cli/dev derived-path payload convention"] },
      { "id": "EM2", "class": "anchored", "refs": ["contract:ch9-runner#C20", "ADR-004", "contract:ch9-runner#C13"] },
      { "id": "EM3", "class": "derived", "refs": ["contract:ch9-runner#C15", "prose:ports/delivery.ts K2 rejecting-executor lane"] },
      { "id": "DG1", "class": "derived", "refs": ["contract:ch9-runner#C26", "contract:ch9-runner#C4"] },
      { "id": "DG2", "class": "derived", "refs": ["contract:ch9-runner#C26", "prose:ch9-p3a DG3 per-kind read-gate pattern"] },
      { "id": "T1", "class": "new-decision", "refs": [] },
      { "id": "T2", "class": "new-decision", "refs": [] },
      { "id": "T3", "class": "derived", "refs": ["prose:vitest.stryker.config.ts subprocess exclude precedent", "prose:drift/sourceHygiene.test.ts extension set"] },
      { "id": "U1", "class": "derived", "refs": ["prose:plan §9.2", "prose:R-EMPTY-SLICE"] },
      { "id": "CB1", "class": "anchored", "refs": ["contract:ch9-runner#C14", "prose:plan §9.1 item 4"] }
    ]
  }
}
```
