# Task Packet: ch9-p4a-spawn-machinery — the real-spawn machinery

Plan step: plan.md §9.4 ch9-P4a row (the P4 sizing split's FOUNDATION
share; the split record lives in §9.4's second process note). Realizes
the machinery half of §9.1 items 5–6: the C21 real `ProcessGateRunner`
(C19-seam spawn, total kind production, workspace-fact measurement,
durable ch11-C26 evidence) WITHOUT the shipped-composition swap, plus
the process-gate cwd-resolution seam fix; and the C23 tmux session
channel on the actor adapter (the session wrap preserving the P3b
result seam, liveness-derived conclusion, session-level timeout
escalation, the `name_collision` lane activated). The composition
swaps, the attach verb, the CLI/floor surface, and the journey smokes
are ch9-P4b's.
Draft anchors (= the manifest's C-row ref union): `contract:ch9-runner`
rows C14/C16/C19/C21/C23/C26 and `contract:ch11-gate-format` rows
C13/C26 (the port/evidence contract C21 realizes the measurement half
of). ADR-017 (spawn confinement) is governing authority — every spawn
this packet adds rides the one seam; ADR-018 binds NEGATIVELY on the
delivery path (no `sys:` token — the consumed C16/C21 halves stand)
and POSITIVELY nowhere here (the kernel's `sys:` classification
output is ch9-P0's realized surface, byte-untouched).

Autonomy stage: measurement — inherited from the ch9 chapter header.
**First-of-a-kind: YES** — the first real process-gate spawn and the
first tmux machinery: the HUMAN approve is inherited from the P4
row's declared mode and stands on R-FIRST-STOP regardless of flags
(the packet carries flags besides — STOP `4:flagged-approve`
coincides).

Plan alignment (R-ALIGNED-UP): the §9.4 P4 repartition (the second
process note + the P4a/P4b rows + the order line), prepared at
authoring and marked "aligned at ch9-p4a pre-approval" — it rides
this packet's build commit; no other ratified plan text is
contradicted.

Classification: **projection** — manifest tally: 3 anchored /
9 derived / 7 new-decision (machine-counted from the `packet_rows`
block). Every anchored row cites a ratified draft row; derived rows
narrow inside explicitly delegated claim surfaces (C21's measurement
and kind mechanics at substrate grain, C23's session mechanics at
probe-backed grain) with in-row derivation notes. The SEVEN
new-decision rows (GR2 the seam stdin extension; GR3 the gate-grain
flagged-conclusion rule; GR4 the measurement mechanics + sentinel;
GR6 the kernel cwd-resolution mechanism; GR8 the per-call timer
clamp; TX1 the spawn-channel seam shape; T1 the module homes) are
flagged, dated decision records
riding this packet's HUMAN approve as `approve-ratified` (flags F1,
F2, F3, F4a, F5, F7 — TX1 and T1 share F1; F6 rides the approve
separately, and W1 routes `boundary-review`) — none touching authority / separation / availability-class
semantics (the gate-decision authority shape is ch11's ratified
surface; the errand/delivery authority is P3a's; the confinement
boundary is ADR-017's); the Case-B recommendation is NOT-B: all seven
are mechanism/representation grain under ratified semantic rows —
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
byte-identical — drift lanes green before and after; the kernel's
process-gate arm keeps its EXISTING rejection lanes untouched).
Invariants: none newly owned. Traces: none.

## Sizing/risk (template §2 step 0 — materialized)

**The P4-row gate (the split's basis — run at this authoring; the P4
row was the declared candidate).** Axes on the bundled row: authority
movement — NO (ports, the evidence contract, and the errand ledger
all pinned). Surface spread — the SESSION-LIVENESS concept spans the
adapter's tmux wrap (producer) + the attach verb + the floor's
availability read = 3+ surfaces for one concept, hard stop 2
LETTER-TRIPPED; the REAL-SPAWN-DISCIPLINE concept spans the gate
runner + the tmux channel + the `runner run` composition = 3 more.
Foundation + activation coupling — the row bundles new spawn
machinery WITH its shipped-entrypoint activation (composition swap,
three new CLI verbs, floor growth, journey) — the ch8/MD-1 shape.
Acceptance multiplicity — spawn-kind production, tmux/collision
lanes, attach/CLI schemas, floor reads, and journey = 4+ distinct
success classes. Single-packet closure proof FAILED: the machinery
bucket and the operator-surface bucket are separately sequenceable
(the machinery is provable by process-grain unit lanes with no CLI;
the operator surface has its own proof surface — CLI contract lanes
+ journey smokes), different consumer families own the fallout
(execution vs read/presentation vs external), and per-family review
loops are genuinely expected. **Verdict: split** (autonomous,
in-chapter, depth 1) — shape: foundation (machinery) → activation
(operator surface); the §9.4 repartition is the record.

**The gate re-run on P4a ALONE.** Authority movement — NO: the gate
runner realizes a pinned port + evidence contract; the kernel cwd
fix moves a READ MECHANISM (string-locator → capability resolution),
never a source of truth; the tmux channel changes delivery
OBSERVATION, not delivery truth (the committed row stays the sole
confirmation source — P3a's CF1, untouched). Surface spread — the
GATE-SPAWN concept touches the new `runner/processGateRunner.ts` +
the kernel's cwd-resolution arm + the seam's stdin extension = one
compile-linked change family with ONE proof surface (`pnpm v3:test`);
the TMUX-CHANNEL concept touches the new channel module + the
adapter's channel consumption + the DG token growth = the same
established compile-linked pattern (ch9-P2/P3a/P3b closure-proven).
Its consumers (attach, floor, `runner run`) are staged OUT by the
split itself, not by this packet's sequencing choice. Identity/join
fragility — present but PINNED by ratified rules: the session name
is the LEDGER-recorded value handed through the executor input
(P3a's B1 transaction; C23), the result-file join is the P3b echoed
`attempt_id` (byte-untouched). Foundation + activation coupling —
this packet activates NO shipped entrypoint (the fail-closed slot
stays; the channel default stays direct; R-ACTIVATION-JOURNEY does
not fire — the milestone-gated rule applied). Prerequisite coupling
— none (P3b is committed and green). Acceptance multiplicity — gate
kind/measurement/evidence lanes + tmux channel lanes: two matrix
families, one proof surface, no per-consumer-family review loop.
Hard-stop-9 material: the tmux channel MOVES the timeout-escalation
observation point (seam-timer → adapter-timer + pane signals) for
the tmux lane only — per-attempt observation detail under C19/C23's
ratified escalation letters, no lock/lease/idempotency semantics
change (all P3a's, byte-untouched). **Single-packet allowed: yes.**

Consume-family scan (from the tree): producer = the gate runner + the
tmux channel (HERE); validator/gate = the kernel's process-gate arm
(HERE — the cwd-resolution mechanism only; classification, rejection
lanes, and admission byte-untouched); execution consumer = the actor
adapter's channel consumption (HERE); persistence/replay = the
process-evidence sibling DB (HERE — the W2 substrate reused, schema
unchanged) — the kernel store and errand store are ABSENT (no
change); read/presentation = ABSENT (floor/CLI are P4b's);
external/integration = ABSENT (ingress untouched; no shipped
entrypoint reaches the new code); recovery/cleanup = ABSENT
(lease/reclaim are P3a's; teardown is a named Absent); testkit =
PRESENT as a CONTRACT (the scripted runtime-context provider gains
the `LocalExecutionCapability` facet so the kernel's capability-based
cwd resolution keeps the ch11/ch12 gate suites composable — a
fake-contract change, counted; closure: it is the same compile-linked
change as GR6, proven by the same suites).

Conditional annexes:

- **Closure-budget triage:** buckets in scope — the gate runner
  (new), the seam stdin extension, the kernel cwd arm, the tmux
  channel (new), the adapter's channel consumption, the DG token
  face. Intentionally collapsed: the gate runner + seam extension +
  kernel arm + testkit facet as one compile-linked change (safe —
  one proof surface; the kernel's other arms pinned by the existing
  suites); the channel + adapter consumption + DG growth as one
  change (the established pattern; the direct channel's observable
  behavior is pinned UNCHANGED by the entire P3b suite). Explicitly
  deferred: BOTH composition swaps + attach + CLI/floor + journeys
  (ch9-P4b), teardown/health/retry-on-FAILED (named Absents).
- **Proof-boundary triage:** gate-decision truth is UNCHANGED — the
  kernel classifies, the runner only produces the faithful
  `ProcessResult` + evidence (ch11-C26's contract realized, not
  moved); delivery truth is UNCHANGED — the committed transcript row
  stays the sole confirmation source; the tmux channel changes WHERE
  an attempt's conclusion is OBSERVED (session death + result file
  instead of the seam's direct exit), never where an errand's truth
  is proven. No surface goes mixed-truth: the channel is selected
  per-composition, and each channel's conclusion derivation is total
  on its own lane set.
- **Mutable-flow record:** hard-stop-9 material near — answered: a
  precondition failure (tmux create failure, collision) produces
  ZERO durable side effects beyond the attempt directory (C17's
  pre-spawn handoff write, attempt-scoped by construction; the
  ephemerality pin is POST-create and never a precondition — TX6);
  rollback/retry/preservation semantics are NOT in this slice (P3a's
  budget/CAS rules consume the channel's conclusions unchanged); the
  one coordination-adjacent addition — the session-level TERM→grace→
  KILL escalation — is the C19/SD3 escalation re-hosted at pane
  grain for the tmux lane, observation detail under ratified rules,
  not a new coordination primitive.

## Operative material (full text — projection, not invention)

The semantic source is the ratified `ch9-runner` contract
(2026-07-23, content commit `5c68f206`, amended `09825f78`) and the
realized `ch11-gate-format` contract (the port/evidence rows cited
through C21). The rows this packet realizes — verbatim NORMATIVE
bodies (`DECIDED HERE …` provenance clauses elided; decision
provenance lives in the drafts, never re-decided here):

> **C21** | The process-gate runner's real spawn realizes the ch11
> kernel contract's spawn half under C19's discipline, `cwd` = the
> run's worktree when `runtime_context = ready(ref)`, else the
> composition's `default_cwd`. THE SPAWN SIDE NEVER CLASSIFIES — it
> produces a faithful `ProcessResult` (the ch11-C26 kind domain,
> bare by C27): a completed child → kind `ok` with the exit code and
> captured stdout (BOTH observable, P3b — classification is then the
> KERNEL's, mode-dependently per ch11-C17/C25: `exitCode` mode reads
> the exit bucket, `gateDecisionJson` mode strict-parses stdout
> REGARDLESS of exit code); the runner's OWN timeout (SIGTERM then
> the C19 SIGKILL escalation) → kind `timeout`; a spawn-infra error
> (e.g. ENOENT, P3c) or a signal-terminated child NOT attributable
> to the runner's own timeout (foreign kill — `code: null` with no
> pending runner timer) → kind `runner_error`. The kind production
> is TOTAL over child terminations (every termination reaches
> exactly one kind); the RUNNER process's own crash mid-spawn is
> outside it by construction — no `ProcessResult` is produced, the
> gate attempt never concludes, and recovery is the kernel's
> existing no-commit surface. The `sys:` reason tokens appear in the
> KERNEL's classification output (the ch9-P0 rename), never minted
> runner-side; the verdict/reason/parse shapes are ch11's — C15
> (exit-bucket verdict), C17 (per-bucket reason), C25 (strict JSON)
> — cited, not restated. THE MEASUREMENT HALF (the ch11-C26 duty
> explicitly deferred to ch9): the real `ProcessGateRunner` MEASURES
> the workspace facts (`head_sha`, `git_status_hash`) and
> `duration_ms`, and DURABLY PERSISTS the complete ch11-C26 evidence
> record BEFORE `run()` returns (replacing the fail-closed slot
> runner) — the record's fields and persistence guarantee are
> ch11-C26's, only the measurement is realized here.

The C23 clauses this packet realizes (the SESSION/TMUX clauses — the
exit-result seam landed at P3b and is PRESERVED here per the
ownership clause):

> **C23 (the session clauses)** | The actor process runs INSIDE a
> tmux session named `pairflow-<enc(instance_id)>--<enc(attempt_id)>`
> (C8's encoding; the ATTEMPT id — C16's minted key — exists on BOTH
> lanes, so session naming, liveness, and attach are UNIFORM with no
> per-lane substitution; the errand row RECORDS the live attempt's
> session name IN the C16 attempt-start transaction, BEFORE the
> spawn — so a crash between the record and the spawn leaves a
> recorded-but-never-born session, landing on C24's already-defined
> "not running" lane; the runner ledger, not the opaque runtime ref,
> is attach's resolution source) (P2a/P2b mechanics; the `pairflow-`
> prefix keeps the one naming family — C7/C8/C17); sessions are
> PER-ACTIVATION and EPHEMERAL — the session dies with the actor
> process (no remain-on-exit), so attach availability equals process
> liveness, and the floor's liveness signal is the session's
> existence (`has-session`; P2b + P2e — auto-death on natural exit
> probed). Composition with C19: the tmux session WRAPS the
> C19-disciplined command (ADR-017's "tmux above the seam"); the
> actor's LOAD-BEARING handoff is file-based (C17/C20), so
> pane-vs-pipe capture is diagnostic-only for actors — while C21's
> process-gate spawns are NOT tmux-wrapped (their stdout parse is
> load-bearing, pipe-captured per C19). […the exit-result seam, P3b's
> realized surface…] Ownership: ch9-P3 ratifies and drives the
> result seam on the direct-spawn path; ch9-P4's tmux wrap MUST
> preserve it (the wrapper runs inside the session). Session/dir/
> branch NAME COMPONENTS never embed raw ids (C8's encoding rule).

The consumed halves of sibling rows (cited boundaries, not
re-realized here): **C19** — the four discipline items (explicit
cwd; env allowlist FULL REPLACEMENT; composition-configured timeout
as SIGTERM with bounded-grace SIGKILL; captured stdio) bind EVERY
spawn this packet adds; the gate runner rides the seam directly, the
tmux channel re-hosts the escalation at pane grain (TX5) with the
capture loss declared (TX7). **C16** — the collision half: "EVERY
attempt start mints a fresh durable `attempt_id` … the collision
domain = this runner store plus the host tmux namespace through the
encoded session name"; the host-namespace member activates here
(TX3). **C14** — the remint basis: `name_collision` is B6's
non-consuming in-place remint lane (the loop's consumption is P3a's,
byte-untouched). **C26** — "every spawn outcome emits a structured
diagnostic event" (the DG family's basis; the P3b DG1 shape
parameterized by channel). **ch11-C13** (cited through C21) — the
gate command is ONE POSIX shell line; the invocation document rides
stdin, no argv payload. **ch11-C26** — the `ProcessResult` +
`ProcessGateEvidence` field lists and the persistence guarantee (the
port file `ports/gate.ts` is their realized TS grain, read at
source below).

### Delegated sources expanded (R-DELEGATION-CLOSURE)

- **The port this packet implements** (`ports/gate.ts`, read at
  source): `ProcessGateRunner.run(command, { cwd, stdin, timeoutMs })
  : Promise<ProcessResult>` with the CLOSED result union
  `{ kind: "ok", exitCode: number, stdout: string, logRef, durationMs }
  | { kind: "timeout", logRef, durationMs }
  | { kind: "runner_error", logRef, durationMs }` — `exitCode`/`stdout`
  present IFF kind `ok` (type-level); `logRef` a nonempty string
  addressing the durably persisted evidence record; `durationMs` a
  non-negative integer. `ProcessGateEvidence` (same file): per-kind
  records `{ log, kind, exitCode? (iff ok), durationMs, headSha,
  gitStatusHash }` — `log` is captured output text,
  untrusted-confined, retained verbatim, never re-parsed nor
  policy/path input; `run()` has durably persisted the record BEFORE
  returning, timeout and runner_error runs evidenced equally.
- **The slot this runner replaces** (`cli/failClosedProcessGateRunner
  .ts`, read at source): the W2 persistence-failure lane — when the
  record CANNOT be durably persisted, `run()` THROWS instead of
  returning (a returned-but-unresolvable `logRef` would violate
  C26's resolve guarantee; the throw propagates to the kernel's
  internal-failure path: pre-commit, no state — still fail-closed);
  the substrate is the textual-derivation sibling DB
  (`deriveProcessEvidenceDbPath(dbPath) = dbPath +
  ".process-evidence.sqlite"`, table `process_evidence(log_ref TEXT
  PRIMARY KEY, record TEXT)`); the interface carries `resolve(logRef)`
  and `close()`. The slot itself is BYTE-UNTOUCHED here (GR7).
- **The kernel's process-gate arm** (`kernel/kernel.ts`, read at
  source): the C36 runtime backstop (non-ready or ref-null →
  `Rejected(runtime_context_required_for_process_gate)`) runs BEFORE
  any runner call and is BYTE-UNTOUCHED; the cwd read that follows
  it is the ch12-P1a X2 single read site — TODAY
  `typeof context.ref.locator !== "string"` → kernel-integrity
  throw, then `cwd = context.ref.locator`. The ch9-P2 worktree
  provider's ref locator is an OBJECT (`{ path, branch, repo,
  base_commit }` — C10), so on a worktree-context run TODAY'S read
  THROWS integrity instead of producing C21's letter ("cwd = the
  run's worktree") — the live seam defect GR6 fixes (flag F5).
- **The H1 capability precedent** (`ports/runtimeContextProvider.ts`
  + `runner/deliveryLoop.ts`, read at source):
  `LocalExecutionCapability.resolveLocalWorkingDirectory(ref):
  string` (absolute path); the delivery loop resolves it at
  intent-derivation time — requirement from the pinned template →
  `providerRegistry.resolve(requirement.spec.provider)` → a
  value-shape check for the capability (never a provider-TYPE
  branch, REV-E) → a missing capability or throwing resolution is a
  config-integrity throw (D6's lane: fail-closed loud, no state
  consumed). GR6 mirrors exactly this mechanism at the kernel's
  gate arm. The worktree provider implements the facet (from its
  own minted `locator.path`); the scripted testkit provider does
  NOT yet — TK1 adds it (returns its string locator verbatim).
- **The executor input the channel consumes** (`ports/delivery.ts`,
  read at source): `AttemptExecutorInput = { intent, attemptId,
  sessionName, cwd? }` — `sessionName` is the B1-transaction-recorded
  value (opaque to the loop; `defaultSessionNamer(instanceId,
  attemptId) = "pairflow-" + enc(instanceId) + "--" + enc(attemptId)`
  is the composition-bound namer, C23's derivation — P3b RS4(b));
  `AttemptResult`'s `name_collision` member: "the attempt's session
  name was already occupied in the host namespace, reported BEFORE
  any spawn side effect (C16's host-tmux collision half — B6's
  non-consuming in-place remint lane)". The loop's remint
  consumption (`deliveryLoop.ts` `conclude`) re-executes the fresh
  attempt immediately — byte-untouched here.
- **The seam** (`runner/spawn.ts`, read at source):
  `disciplinedSpawn({ cmd, args, cwd, env, timeoutMs, graceMs })` →
  `SpawnConclusion = { kind: "exit", code, signal, timedOut, stdout,
  stderr } | { kind: "infra", message }`; stdio `["ignore", "pipe",
  "pipe"]`; settle on EXIT with the 2000 ms drain; the `timedOut`
  attribution flag; the exported `validateTimerKnobs` (floors ≥
  1000 ms, every knob and derived sum a safe integer below
  `TIMER_MAX_MS` = 2³¹−1 — the P6i collapse hazard). GR2 extends
  the input with OPTIONAL `stdin` (below).
- **The wrapper asset** (`runner/attemptWrapper.mjs`, read at
  source, BYTE-UNTOUCHED here): spawned as `process.execPath
  <wrapperPath> <graceMs> <resultPath> <attemptId> <cmd> <args…>`;
  forwards SIGTERM, arms its own grace SIGKILL, atomically writes
  `result.json` `{ attemptId, exitCode, signal, termForwarded }`,
  exits 0; `error` event → no result file + clean exit. Under tmux
  the wrapper is the PANE PROCESS (TX2) and its stdio goes to the
  pane, not to us (TX7's declared capture loss).
- **The result/emit parse core** (`runner/actorAdapter.ts`, read at
  source, reused verbatim): `parseResult` (RS2 — closed keyset,
  integer-or-null `exitCode` with the `-0` ladder, exactly-one-of
  exitCode/signal, strict attemptId echo), `parseEmit` (EM1), the
  EM submit lanes, and the DG1 one-event-per-conclusion rule — the
  tmux channel plugs in BELOW these (TX7's precedence feeds the
  same lanes).
- **The gate admission's timeout rule** (`gates/process.ts`, read at
  source): `timeoutMs` is admitted as a safe integer ≥ 1 with NO
  upper bound — so an admitted config can exceed Node's 2³¹−1 timer
  bound, where a raw `setTimeout` silently collapses to ~1 ms
  (P6i). GR8's per-call clamp is the runner-side guard; the
  admission-side upper bound is a possible ch11 successor row
  (watchpoint W1, routed boundary-review).
- **ADR-017's decision items** (governing): explicit cwd;
  fail-closed env allowlist; bounded timeout with
  SIGTERM→grace→SIGKILL; captured stdio — scoped to EVERY
  runner-plane spawn, one enforcement point; "tmux above the seam";
  trusted-local-host stance (confinement is against accident and
  clutter, not a hostile-actor sandbox).

### Substrate probes (2026-07-25, in-session; scripts + outputs in
the session scratchpad `ch9p4-probes/` — tmux 3.7b, git 2.50.1,
node 24.18, darwin)

The draft's tmux cells (P2a presence, P2b create/has/kill, P2d
`attach -r`, P2e auto-death on natural exit) and the P3/P6 spawn
cells stand from the draft/P3b probe tables. NEW cells probed now:

| Probe | Question | Observed |
|---|---|---|
| P7a | `tmux new-session -d -s <n> -c <dir> -e K=V <argv…>`: env + cwd of the pane process | `-c` honored (cwd correct); `-e` ADDS the variable but the pane process inherits the FULL server environment (64 host keys observed leaking) — `-e` alone CANNOT realize C19's full replacement |
| P7b | `/usr/bin/env -i K=V… <argv…>` as the session command | the child sees ONLY the passed variables plus the darwin-injected `__CF_USER_TEXT_ENCODING` (count 3 with PATH + one probe var) — the full-replacement channel under tmux |
| P7c | `#{pane_pid}` identity + signal path (argv form, no shell) | `pane_pid` == the command's own pid; `kill -TERM <pane_pid>` delivered (handler observed); session auto-died on the process's exit |
| P7d | duplicate session name | exit 1, stderr `duplicate session: <name>`; the second command NEVER ran (no side effect) |
| P7e | `env -i` prefix preserves pane-pid identity | `pane_pid` == the wrapped command's own pid (env execs in place); TERM path + session death unchanged |
| P7f | pinning ephemerality against user config (re-run in the DECOUPLED form) | create (`tmux new-session -d …`) exit 0, THEN the SEPARATE `tmux set-option -t <n> remain-on-exit off` exit 0, option confirmed `off`, death-on-exit preserved; the pin against an already-dead session exits 1 BENIGNLY (`no server running` / `no such window` class stderr), no side effect |
| P8a | git measurement in a repo cwd (re-run in GR4's EXACT forms) | `git rev-parse HEAD` exit 0 (the sha); `git status --porcelain=v1 -z` exit 0 (NUL-delimited raw bytes observed) |
| P8b | git measurement in a non-repo cwd (the exact GR4 forms) | both commands exit 128 (`fatal: not a git repository`) — the GR4 sentinel's basis |

`has-session` on a never-created name exits 1 — same observable as
after death (liveness is existence, no birth/death distinction
needed at this grain).

## Claim

The real-spawn machinery completes the runner plane's process story
at machinery grain — fail-closed, seam-confined, zero new authority:
(1) the real `ProcessGateRunner` produces a FAITHFUL `ProcessResult`
whose kind production is TOTAL over child terminations — it NEVER
classifies gate semantics (verdict/reason/parse stay the kernel's),
and every `run()` return is preceded by the durable persistence of a
COMPLETE ch11-C26 evidence record whose workspace facts are MEASURED
(a measurement failure yields the declared sentinel, never a
fabricated fact and never a changed kind); (2) every spawn this
packet adds — the gate child and every tmux client invocation —
rides the ONE C19 seam (explicit cwd, full env replacement to the
composition allowlist, bounded SIGTERM→grace→SIGKILL, captured
stdio), and on the tmux lane the actor-side confinement holds
THROUGH the session: the pane process receives exactly the
composition allowlist + the adapter-injected `PAIRFLOW_*` pair and
nothing else SAVE the declared substrate residuals (F6: the
darwin-injected `__CF_USER_TEXT_ENCODING` on the tmux lane; the
`/bin/sh`-injected POSIX built-ins `PWD`/`SHLVL`/`_` on the gate
lane) — the P7a server-env leak is closed by the P7b
full-replacement embedding; (3) the tmux channel changes ONLY where
an attempt's conclusion is OBSERVED — session death + the P3b result
seam (preserved byte-for-byte: the wrapper runs inside the session)
— never what concludes it: every channel conclusion maps through the
same fail-closed precedence discipline onto the same closed K1
vocabulary, `name_collision` is reported BEFORE any spawn side
effect exactly on the host-namespace collision, and a session that
dies without a readable result is NEVER read as an actor outcome;
(4) session liveness is the C23 letter made real: sessions are
per-activation, ephemeral (remain-on-exit pinned off per-session),
named exactly by the ledger-recorded `sessionName`, so attach
availability (P4b's consumer) equals process liveness by
construction — SCOPED by two named, bounded exceptions: the
create→pin transient window (TX2/TX6) and the F6(d) substrate-fault
orphan residual, each concluding bounded through the TX5/TX7 paths; (5) the kernel's process-gate cwd is resolved through
the provider's OWN contract (the L0e `LocalExecutionCapability`,
H1's mechanism) — the run's worktree when `ready(ref)`, byte-equal
to the provider-minted path — and the kernel still never interprets
the opaque ref; (6) nothing this packet ships is reachable from a
shipped entrypoint: the fail-closed slot stays composed, the channel
default stays direct, and activation is P4b's — current runtime
behavior stays fail-closed (the milestone-gated rule).

Dimensions (enumerated before test rows — R-DIMENSIONS):

1. **The real gate runner** (GR) — spawn mechanics, the stdin seam
   extension, total kind production, measurement, durable evidence,
   the kernel cwd seam, activation deferral, timer clamp.
2. **The tmux channel** (TX) — the channel seam, session creation +
   confinement, collision, liveness-derived conclusion, session
   timeout escalation, ephemerality, result-seam preservation.
3. **Observability** (DG) — the `name_collision` token growth + the
   channel-parameterized spawn-outcome rule.
4. **Testkit ripple** (TK) — the scripted provider's capability
   facet.
5. **Types/ripple** (T) — homes, exports, config ripple.
6. **Coverage/drift** (U) — the empty slice, untouched registries.

## Canonical matrices

### GR — the real process-gate runner

| ID | Rule |
|---|---|
| GR1 | The factory: `createProcessGateRunner(evidenceDbPath, deps, options)` at `runner/processGateRunner.ts` (T1) — `deps = { time: TimeSource }` (IC-D: `duration_ms` and nothing else reads time, through the injected source); `options = { envAllowlist? (default `{ PATH: <host PATH> }` — the C19 composition-declared allowlist; a floor for tests, composition widens by PASSING a larger map — the option value REPLACES the default, one full map, never merged), graceMs? (default 10 000 — C19's ratified default; validated at construction via the seam's shared `validateTimerKnobs`) }`. Each `run(command, { cwd, stdin, timeoutMs })` spawns `/bin/sh -c <command>` through the C19 seam — ONE POSIX shell line (ch11-C13, cited through C21; the ABSOLUTE `/bin/sh` path is deliberate: the spawn must not depend on PATH resolution inside a replaced env), explicit `cwd` = the caller's value (the kernel resolves it — GR6), env = the allowlist (full replacement, P3d; the `/bin/sh` layer itself injects its POSIX built-ins `PWD`/`SHLVL`/`_` — the DECLARED gate-lane substrate residual, F6(c); the confinement discipline pins CANARY ABSENCE, never env set-equality), the invocation document written to the child's stdin (GR2's seam capability; ch11-C13's no-argv-payload rule), stdout/stderr captured, the seam timer at the CLAMPED effective timeout (GR8). The runner interface mirrors the slot's: `run` + `resolve(logRef)` + `close()` (the resolve affordance is the evidence contract's test surface). |
| GR2 | (NEW-DECISION — flag F2) The seam gains OPTIONAL stdin: `DisciplinedSpawnInput.stdin?: string` — when PRESENT, stdio[0] is `"pipe"` and the contents are written then ended at spawn; when ABSENT, stdio[0] stays `"ignore"` and the seam's behavior is BYTE-IDENTICAL to today (the entire P3b/P2 suite is the pin). A write error on the stdin pipe (EPIPE from a fast-exiting child) is NOT an infra conclusion — the child's own exit decides (the write is best-effort delivery of input, its failure observable only through the child's behavior). This is F1(P3b)'s anticipated first external test of the seam shape — reviewed here per the never-silent seam-change rule (the P3a-F2 lineage). |
| GR3 | (NEW-DECISION — flag F3) Kind production, TOTAL over seam conclusions: `infra` → `runner_error`; any `timedOut`-FLAGGED conclusion → `timeout` (signal AND code shapes alike — the deadline elapsing IS "the runner's own timeout" engaging, C21's letter; the P6h delayed-exit race therefore lands `timeout`, a bounded fail-CLOSED ambiguity: gate timeout classifies to `blockTransition` (ch11), so the race direction is allow→block, never the reverse); an UNFLAGGED signal conclusion (`code: null`, no pending timer) → `runner_error` (C21's foreign-kill class); an UNFLAGGED code conclusion → `ok(exitCode, stdout)` — nonzero exits INCLUDED (kind records process execution, classification is the kernel's, mode-dependently — C21). The DELIBERATE asymmetry with the delivery path's CL1 (completed work never reclassified) is a per-contract fail-safe direction: the gate's timeout is the config's letter (a run past deadline exceeded it), the delivery's confirmation is evidence-based (a completed actor's emit is better evidence than a timer) — both fail safe in their own direction. |
| GR4 | (NEW-DECISION — flag F4a) Measurement mechanics: `headSha` = the stdout of `git rev-parse HEAD` (trimmed), `gitStatusHash` = `sha256` hex over the RAW stdout BYTES of `git status --porcelain=v1 -z`, both run IN the gate's `cwd` through the C19 seam (allowlist env, own short timeout — the measurement spawns are seam spawns too; P8a: both commands exit 0 in a repo cwd); `durationMs` = the injected time delta around the gate child's execution (a non-negative integer; clamped at 0). SENTINEL: if EITHER measurement command concludes nonzero/infra (P8b: a non-repo `cwd` exits 128), BOTH facts take the single sentinel `"unavailable-measurement-failed"` — a DECLARED workspace fact (ch11-C26's letter: the facts are the runner's declarations), NEVER a fabricated value, and measurement failure NEVER changes the gate result's kind (the gate child's own conclusion stands). Measurement runs AFTER the gate child concludes (the facts describe the workspace the gate saw, at conclusion grain — one ordering, stated here). |
| GR5 | Durable evidence: every `run()` — ok, timeout, and runner_error alike — INSERTs the COMPLETE per-kind ch11-C26 record (`log` = captured stdout+stderr text, untrusted-confined verbatim; `exitCode` iff ok; `durationMs`; `headSha`/`gitStatusHash` per GR4) into the process-evidence store BEFORE resolving, keyed by a fresh `logRef`; the substrate is the W2 sibling DB (`deriveProcessEvidenceDbPath`; table byte-compatible with the slot's — the slot's `resolve` reads the same rows) — DERIVATION: the port pins the guarantee, the slot's substrate is its established realization; reuse keeps ONE evidence home per db path. PERSISTENCE-FAILURE lane (W2's, preserved): an insert failure THROWS out of `run()` — never a returned-but-unresolvable ref; the throw propagates to the kernel's pre-commit internal-failure path, fail-closed. |
| GR6 | (NEW-DECISION — flag F5) The kernel's process-gate cwd resolution: the X2 string-locator read (`typeof ref.locator !== "string"` → integrity throw; `cwd = ref.locator`) is RETIRED and replaced by the H1 mechanism at the gate arm — resolve the pinned template's requirement (the template is ALREADY IN SCOPE at the gate arm — the pipeline derives from its bindings; no new load), `providerRegistry.resolve(requirement.spec.provider)`, value-shape-check the `LocalExecutionCapability` facet (never a provider-TYPE branch, REV-E), `cwd = provider.resolveLocalWorkingDirectory(context.ref)`. A ready-ref run whose provider is unresolvable, lacks the facet, or throws → kernel/config integrity throw (the E4 REQUIRE pattern, D6's lane) — never a rejection. The C36 runtime backstop (non-ready → `Rejected(runtime_context_required_for_process_gate)`) is BYTE-UNTOUCHED ahead of it. CONTRACT-REALITY basis: today's read is a LIVE seam defect — the ch9-P2 worktree locator is an OBJECT (C10), so every worktree-run process gate currently lands on the integrity throw instead of C21's letter ("cwd = the run's worktree"); the fix restores the ratified letter through the ratified capability (the P3b-F10 precedent: the packet hardens the seam it realizes against). |
| GR7 | Activation deferral (the milestone-gated rule, template §2 step 0): the real runner is module-public (`runner/index.ts`) and fully driven by its own suite, but NO shipped composition binds it — `cli/failClosedProcessGateRunner.ts` and both CLI wiring sites stay BYTE-UNTOUCHED; the swap is ch9-P4b's named content (plan §9.4). Current runtime behavior stays fail-closed; R-ACTIVATION-JOURNEY does not fire on this packet (no shipped entrypoint reaches the new code — the journey rides P4b). |
| GR8 | (NEW-DECISION — flag F7) The per-call timer clamp: admission admits `timeoutMs` ≥ 1 with NO upper bound (`gates/process.ts` V3, read at source), and a raw `setTimeout` above 2³¹−1 silently collapses to ~1 ms (P6i) — the runner computes `effectiveTimeoutMs = min(timeoutMs, TIMER_MAX_MS − graceMs)` (the grace sum stays under the bound by construction) and NEVER rejects a call on timeout magnitude (admission owns config validity). The clamp is an ELECTED design among real alternatives (a segmented long timer honoring the full duration; a fail-loud run-time refusal; an admission-side bound) — elected for being the simplest BOUNDED form: the clamped ceiling (≈ 24.8 days) exceeds any practical gate run, the substrate hazard is closed, and a clamped run stays OBSERVABLE through the evidence record (`durationMs` and the `timeout` kind carry the bound actually applied). The factory's own knob (`graceMs`) is validated fail-closed at construction via the seam's SHARED validator (`validateTimerKnobs` — the P3b-T2 rule; GR1's construction clause). Watchpoint W1 (routed boundary-review): the admission-side upper bound is a candidate ch11 successor row. |

### TX — the tmux spawn channel

| ID | Rule |
|---|---|
| TX1 | (NEW-DECISION — flag F1) The channel seam: the adapter's spawn/observe stage goes behind a `SpawnChannel` seam — `launch({ wrapperArgv, cwd, env, sessionName, timeoutMs, graceMs, backstopMarginMs }): Promise<ChannelConclusion>` (the timer knobs carry the adapter's P3b-T2 ratified defaults — 1 800 000 / 10 000 / 5 000 ms — handed through by the adapter; the liveness poll interval is the tmux channel's OWN knob, default 250 ms) with the CLOSED union `ChannelConclusion = { kind: "direct-exit", conclusion: SpawnConclusion } | { kind: "session-concluded", timedOut: boolean } | { kind: "name_collision" } | { kind: "infra", message: string }` — `createDirectSpawnChannel()` (wrapping `disciplinedSpawn` — the P3b behavior byte-preserved, its conclusion passed through as `direct-exit`; `name_collision` unreachable on this channel, RS4(a)'s scoped exclusion CARRIED) and `createTmuxSpawnChannel(deps)` (TX2–TX6). `createActorAdapter` gains the composition-injected `channel` (deps; DEFAULT = the direct channel — the production tmux binding is P4b's `runner run` composition, flag F1's staging clause). Handoff (H), argv mapping (AV), result parse (RS2/RS3), emit (EM), and diag (DG) stages are byte-shared across channels. |
| TX2 | Session creation: the CREATE is ONE tmux client invocation through the C19 seam — `tmux new-session -d -s <sessionName> -c <cwd> /usr/bin/env -i <K=V…> <node> <wrapperPath> <graceMs> <resultPath> <attemptId> <cmd> <args…>` — argv grain throughout (no shell-string composition; the session command is tmux-exec'd directly); the ephemerality pin is a SEPARATE second client invocation (TX6) — NEVER chained into the create: a chained command's aggregate exit would fuse two failure domains, making a set-option fault after a successful create indistinguishable from a failed create (and a fast-exiting wrapper would turn a completed attempt into a spurious create failure). The `env -i` embedding is the full-replacement channel: the pane process sees ONLY the passed pairs — the composition allowlist + `PAIRFLOW_PACKET`/`PAIRFLOW_EMIT` (AV2's ADAPTER-injected pair, P3b — the adapter composes the child env and hands it to the channel unchanged) — plus the darwin-injected `__CF_USER_TEXT_ENCODING` (P7a proves `-e` leaks the full server env; P7b proves the embedding closes it; the one kernel-injected variable is the declared substrate residual). `-c` carries C17's cwd (P7a). The wrapper (BYTE-UNTOUCHED) is the pane process; `env` execs in place so `pane_pid` remains the wrapper's pid (P7e). DERIVATION: C23's wrap letter + C19's replacement letter over the probed substrate — the `-e` alternative FAILS the ratified discipline, so no equally-consistent alternative exists. |
| TX3 | Collision: the CREATE invocation (TX2's single new-session call — this rule binds to the create ALONE, never the TX6 pin invocation) concluding nonzero whose stderr begins `duplicate session` → `name_collision`, reported BEFORE any spawn side effect (P7d: the second command never runs — the colliding create starts nothing; the attempt's handoff directory, written pre-spawn per C17, is attempt-scoped and inert). Any OTHER create failure (tmux absent → the seam's ENOENT infra lane; other nonzero) → `infra` — fail-closed, never a guessed collision. DERIVATION: C16's host-namespace collision half + C14's remint basis over P7d's observable; the stderr-prefix detection is the atomic form (a pre-check `has-session` would be TOCTOU-racy against a concurrent worker). |
| TX4 | Liveness-derived conclusion: after create, the channel reads `pane_pid` (`tmux list-panes -t <s> -F '#{pane_pid}'` — P7c/P7e: the wrapper's pid); ANY `list-panes` non-success leaves `pane_pid` UNRESOLVED and is NEVER an infra conclusion — the has-session poll is the SOLE liveness authority (the fast-exit race: a wrapper whose session died before `list-panes` proceeds straight to conclusion, pane_pid unneeded). The channel POLLS `tmux has-session -t <s>` through the injected wait seam (the TailWait pattern — real timer in production, controllable in tests; poll interval a composition knob, default 250 ms) until exit 1 (session death — P2b/P2e), then concludes `session-concluded` with the channel's own `timedOut` flag. The result file then decides (TX7). Every tmux client invocation (create, set-option, list-panes, has-session, kill-session) rides the C19 seam with its own short timeout; `infra` during observation is RESERVED for the POLL's own anomalous client conclusion (a seam `infra`, or an exit outside has-session's 0/1 domain) — fail-closed. |
| TX5 | Session timeout: the channel owns the timer at tmux grain (the seam's timer only bounds the short-lived CLIENT invocations): on `timeoutMs` firing it sets `timedOut`, sends SIGTERM to `pane_pid` (the wrapper forwards to the actor and arms its own inner grace — P6c/P6f, RS1 unchanged), and arms the outer backstop SIGKILL to `pane_pid` at `graceMs + backstopMarginMs` (SD3's two-tier margin re-hosted: the inner escalation provably concludes first on the normal path; the orphan residual stays F2(P3b)'s ratified acceptance). If `pane_pid` was never obtained (the session died pre-observation) no signal is sent — death is already the observable. LAST RESORT: a session still alive after the backstop window + one poll interval (a signal-delivery fault) → `tmux kill-session -t <s>` (a seam invocation like every client call), and the conclusion then proceeds through TX7's SAME precedence over the result file: a valid record ALREADY WRITTEN governs (completed work is never reclassified — a completed-but-stuck-session attempt lands its recorded outcome after a bounded latency penalty), absence lands `own_timeout` via the flag — bounded, never an unbounded wait. THE LAST RESORT'S OWN FAILURE LANE (label-symmetric — it binds WHEREVER the kill-session backstop runs, the flagged timeout path AND TX6's unflagged abort path alike): a kill-session invocation concluding nonzero/infra while the poll STILL reports the session alive is retried ONCE with the next poll; a session still alive after that concludes BOUNDED under the path's own label — `own_timeout` via the flag on the timeout path, `spawn_infra` on the unflagged abort path — WITH the ORPHAN-SESSION RESIDUAL DECLARED on EITHER conclusion (flag F6(d) — the P3b-F2 orphan-acceptance precedent extended to session grain): a tmux server refusing signals AND kill-session is the trusted-local substrate-fault class; the attempt's conclusion stays bounded, the errand budget bounds retries, and the orphan stays findable by its session name — never an unbounded wait, never an undeclared orphan on ANY conclusion label. All channel timer knobs are validated at construction via the seam's SHARED validator (`validateTimerKnobs` — the P3b-T2 rule). DERIVATION: C19's escalation + C23's result-seam letter force pane-grain TERM (the wrapper must RECEIVE the TERM to write the result — kill-session-first would forfeit the record, P7c is the delivery proof); the kill-session backstop is the bounded residual. |
| TX6 | Ephemerality pinned: immediately after a successful create the channel issues the SEPARATE pin invocation `tmux set-option -t <sessionName> remain-on-exit off` (P7f proves the option lands and death-on-exit holds; the separate-invocation form keeps the create's and the pin's failure domains apart — TX2). The pin's failure branches on session state, and a LIVE session NEVER continues past a failed pin — C23's "attach availability equals process liveness" holds with NO PIN-FAILURE interim state (SCOPED: the create→pin transient window remains — TX2's separate-invocation design — bounded by the timeout→backstop path; F6(d)'s orphan residual is the declared exception at the substrate-fault edge): (a) a pin failing because the session ALREADY DIED (the fast-exit race) is BENIGN — observation proceeds and a present result is honored (TX7: completed work is never reclassified); (b) a pin failing on a LIVE session ABORTS the attempt — the channel resolves `pane_pid` first if not yet read (a `list-panes` non-success here → straight to the kill-session backstop), runs the TX5 pane escalation (TERM → grace → KILL) with the kill-session backstop, and the conclusion proceeds through TX7's precedence UNFLAGGED (the channel's timer did not fire): a result written before the abort is honored; absence lands `spawn_infra` — a pin-establishment fault is a spawn-infra class, budget-bounded, and re-delivery is kernel-safe (the C14/C16 duplicate-delivery letter). TX5's kill-session-failure lane binds on this path too (label-symmetric): an abort whose backstop also fails concludes `spawn_infra` with the F6(d) orphan residual declared. Session names come EXCLUSIVELY from `input.sessionName` (the ledger-recorded value — C23's resolution-source letter; the channel never derives names). |
| TX7 | Result-seam preservation + the tmux-grain precedence: the wrapper runs INSIDE the session (C23's ownership clause honored — RS1–RS3 byte-preserved), and on `session-concluded` the adapter's conclusion derivation is: parse `result.json` under RS2 (unchanged) — absent / unparseable / keyset-violating / foreign-attemptId → `timedOut ? own_timeout : spawn_infra` (C23's dead-session/no-result lane at session grain); a valid record with `signal` non-null → `timedOut && termForwarded ? own_timeout : foreign_kill` (CL1 row 4's flag branch, verbatim semantics); valid `exitCode` nonzero → `nonzero_exit` (never a kill record); valid `exitCode` 0 → the EM lanes — COMPLETED WORK IS NEVER RECLASSIFIED by a late timer (CL1's P6h rule carried: the DELIVERY contract keeps evidence-based faithfulness — GR3's gate-side asymmetry is deliberate and flagged). `direct-exit` conclusions flow through CL1 UNCHANGED; `name_collision` returns as the K1 member (the loop's remint lane consumes it — P3a, byte-untouched); channel `infra` → `spawn_infra`. STDIO under tmux goes to the PANE PTY — the C19/ADR-017 capture obligation is realized on this lane AT PANE GRAIN, per C23's own pane-vs-pipe clause: the pane pty holds the actor's stdio (it IS the C23 observe surface P4b's attach reads), NOTHING inherits the operator's stdio (ADR-017 item 4's captured-never-inherited letter honored), and C21's gate spawns stay seam-pipe-captured per C19 (the load-bearing parse lane). The seam's pipe capture covers the CLIENT invocations; the seam-pipe stderr tail (`spawnDetail`) is therefore ABSENT on tmux-channel conclusions — the NAMED diagnostic-only absence (C23: pane capture is no row's proof; the load-bearing handoff is file-based; flag F6(b)). |

### DG — observability (the token growth)

| ID | Rule |
|---|---|
| DG3 | `SPAWN_OUTCOMES` gains `name_collision` — the P3b-pre-authorized growth (DG1's letter: the token "joins the domain when ch9-P4 activates the tmux lane"): the adapter's one-event-per-conclusion rule (DG1, byte-unchanged otherwise) now emits `spawnOutcome: "name_collision"` on that conclusion; the diag read gate's token allowlist grows the same member (both-direction iffs unchanged in shape — `spawnOutcome` still required-iff-`spawn_outcome`); `spawnDetail` stays OPTIONAL and is naturally absent on tmux-channel events (TX7 — no capture; the field's iff is untouched). The `ports/diagnostics.ts` domain list + comment and the store validator update in the same change; the debug-bundle exclusion set is unchanged. |

### TK — testkit ripple

| ID | Rule |
|---|---|
| TK1 | The scripted runtime-context provider (`testkit/scriptedRuntimeContextProvider.ts`) gains the `LocalExecutionCapability` facet — `resolveLocalWorkingDirectory(ref)` returns the ref's STRING locator verbatim (its own minted shape; a non-string locator in the scripted world is a fixture-integrity throw). Required by GR6: the kernel's capability-based resolution must keep the ch11/ch12 process-gate suites (string-locator era) composable without a kernel-side fallback (ONE mechanism — REV-E). A testkit CONTRACT change, counted in the sizing scan; the facet is additive (no existing scripted-provider consumer changes). |

### T — types/ripple

| ID | Rule |
|---|---|
| T1 | (NEW-DECISION — flag F1) Module homes + exports: `runner/processGateRunner.ts` (GR — the runner factory), `runner/spawnChannel.ts` (TX1 — the `SpawnChannel`/`ChannelConclusion` types + the direct channel), `runner/tmuxChannel.ts` (TX2–TX6 — the tmux channel); `runner/index.ts` exports `createProcessGateRunner`, `createDirectSpawnChannel`, `createTmuxSpawnChannel`, and the channel types. Placement rationale: the runner PLANE owns spawns (ADR-013's boundary: `gates/` stays evaluators, `kernel/` stays port-consuming, `cli/` stays composition — the fail-closed slot stays where it is until P4b retires it from the wiring). Ripple, named: `runner/spawn.ts` gains GR2's optional `stdin` (+ its lanes in `spawn.test.ts`); `runner/actorAdapter.ts` consumes the injected channel (deps grow `channel`; the P3b suites pin the direct default); `kernel/kernel.ts` swaps the cwd read per GR6 (+ lanes in `kernel.test.ts`); `ports/diagnostics.ts` + `diag/sqliteDiagStore.ts` per DG3; `testkit/scriptedRuntimeContextProvider.ts` per TK1; `vitest.stryker.config.ts` — the new tmux/process test files join the subprocess exclude list (the declared partial-mutation-coverage mechanism, telemetry per the pilot rules). The kernel store, errand store, delivery loop, ingress, domain, definition, floor, providers, emit, and BOTH CLI entrypoints are byte-untouched. |

### U — coverage/drift

| ID | Rule |
|---|---|
| U1 | The EMPTY slice is declared (all five axes `[]` — R-EMPTY-SLICE); the 54-name rejection registry, the unit map, and the ledger are byte-untouched; the standing drift suite and `v3:coverage` run green before AND after; `pnpm v3:deferred` stays clean (no marker minted or discharged — the in-code free-text "ch9-P4" owner notes that THIS packet realizes update to name P4b or drop, in the same change). |

## Site × shape × phase coverage grid

The new machinery's fallible sites × failure shapes × phases; every
cell a driven lane or an explicit rule-out. Phases: setup (pre-spawn)
/ spawn / observe (liveness/conclusion) / measure / persist.
(The adapter's H/AV/EM/DG sites are P3b's grid, byte-carried; the
loop's consumption is P3a's.)

| Site (source) | Shape | Phase | Disposition |
|---|---|---|---|
| seam spawn of `/bin/sh` (GR1) | sync throw / ENOENT | spawn | driven (GR lanes): `runner_error` kind, evidenced |
| stdin pipe write (GR2) | EPIPE on a fast-exiting child | spawn | driven: NOT an infra conclusion — the child's own exit decides (GR2's rule; the negative asserts kind follows the exit) |
| the gate child (GR3) | exit 0 / nonzero / signal / timeout / flagged-natural-exit race | spawn→observe | driven (GR3 lanes): the total kind walk, both flag values where reachable |
| `git rev-parse` / `git status` measurement spawns (GR4) | nonzero (non-repo, P8b) / infra | measure | driven: BOTH facts → the sentinel, kind unchanged |
| evidence INSERT (GR5) | store throw (closed/unwritable substrate) | persist | driven: `run()` THROWS (the W2 lane) — never a returned-unresolvable ref |
| kernel cwd resolution (GR6) | unresolvable provider / missing facet / throwing resolution | setup (kernel arm) | driven (GR6 lanes): kernel/config integrity throw, pre-commit, no state |
| `tmux new-session` client (TX2/TX3 — the CREATE alone) | duplicate-session nonzero / other nonzero / ENOENT | spawn | driven (TX3): collision → `name_collision` (pre-side-effect); other → `infra` → `spawn_infra` |
| `set-option` ephemerality pin (TX6) | fails on a DEAD session (fast-exit race) / fails on a LIVE session | spawn (post-create) | driven (TX6): dead → benign, observation proceeds (a present result honored); live → ABORT — the TX5 pane escalation + kill-session backstop, conclusion through TX7 UNFLAGGED (a pre-abort result honored; absence → `spawn_infra`) — a live session never continues past a failed pin |
| `kill-session` last resort (TX5 — the timeout path AND TX6's abort path) | nonzero / infra while the poll still reports alive | observe | driven (TX5, label-symmetric): ONE poll-coupled retry, then the bounded conclusion under the path's own label (`own_timeout` flagged / `spawn_infra` on the abort) WITH the declared orphan-session residual (F6(d)) — never an unbounded wait |
| `list-panes` after create (TX4) | session already dead / any non-success | observe | driven (TX4): pane_pid stays unresolved, the has-session poll is the SOLE liveness authority — never `infra` from this site |
| `has-session` poll (TX4) | exit 0 / exit 1 / anomalous client conclusion | observe | driven: 0 → keep polling; 1 → concluded; seam infra or an exit outside the 0/1 domain → `infra`, fail-closed |
| pane signals TERM/KILL (TX5) | delivered / target already dead / undeliverable | observe | driven: normal escalation; already-dead → death observed next poll; undeliverable → the kill-session last resort, bounded |
| `result.json` read after session death (TX7) | absent / unparseable / keyset / foreign echo / valid record shapes | observe | driven (TX7): the RS2 core reused — the full flag-composed walk at session grain |
| `diag.emit` (DG3) | port contract: never throws | every phase | ruled out BY PORT CONTRACT (fail-open on the port, called BARE — P3b DG1's driven boundary carried) |

The RUNNER process's own crash mid-gate-spawn is outside the kind
production by construction (C21's letter: no `ProcessResult`, the
gate attempt never concludes, the kernel's no-commit surface owns
recovery) — not a lane. Worker crash mid-delivery stays P3a's
CT-A2-CRASH surface, untouched.

## Mirrored surface map (one canonical statement per rule)

| Rule | Canonical home | Mirrors (summarize/defer only) |
|---|---|---|
| The gate kind production + flag rule | GR3 | the C21 quote (operative), the grid's gate-child row, Claim (1), flag F3 |
| The measurement mechanics + sentinel | GR4 | the C21 measurement quote, the grid's measurement row, Claim (1), flag F4a |
| The evidence persistence + throw lane | GR5 | the port/slot expansions (delegated sources), the grid's persist row, Claim (1) |
| The kernel cwd resolution | GR6 | the kernel-arm + H1 expansions (delegated sources), the grid's kernel row, Claim (5), flag F5 |
| The seam stdin extension | GR2 | GR1's stdin clause, the grid's stdin row, T1's ripple line, flag F2 |
| The timer clamp | GR8 | the admission expansion (delegated sources), watchpoint W1, flag F7 |
| The channel seam + default | TX1 | Claim (3)/(6), T1's homes, flag F1, the adapter-consumption ripple line |
| Session creation + confinement | TX2 | Claim (2), the probe table (P7a/P7b/P7e/P7f), the grid's create row, flag F6(a)/(c) |
| The collision rule | TX3 | the C16/C14 consumed halves (operative), DG3's token clause, the grid's create row, Claim (3) |
| Liveness + session timeout | TX4/TX5 | Claim (4), the grid's observe rows (the kill-session row included), TX6's abort clause, flag F6(d) |
| Ephemerality pinning | TX6 | Claim (4), probe P7f's note, the grid's set-option row, TX2's separate-invocation clause |
| The tmux-grain precedence + capture loss | TX7 | Claim (3), the grid's result-read row, DG3's `spawnDetail` clause, flag F6(b), TX5's last-resort clause and TX6's abort clause (both defer to this precedence) |
| The `name_collision` token growth | DG3 | TX3's lane, the ports/store ripple line (T1) |
| Activation deferral | GR7 | Claim (6), the Sizing/risk staging clauses, flag F1's staging clause |

Fold policy: a change to a canonical row updates every named mirror
before handing back.

## In-context notes (the scarce budget)

- The runner NEVER classifies: resist mapping a nonzero gate exit to
  anything but kind `ok` — the kernel's mode-dependent
  classification (exit bucket vs strict JSON parse) is the ONLY
  consumer of the exit code and stdout. A runner-side "helpful"
  interpretation would duplicate ch11's authority.
- The tmux channel changes observation, never truth: the result file
  and the committed transcript row remain the only load-bearing
  records. Do not add pane capture, pipe-pane, or session
  introspection beyond `has-session`/`list-panes` — every addition
  enlarges the client-invocation failure surface.
- The wrapper is BYTE-UNTOUCHED by design: it already does exactly
  what the session needs (forward TERM, grace KILL, atomic result,
  exit 0). Any tmux-specific need belongs in the channel, not the
  wrapper.
- Fail-closed means CONSUMED, not crashed (the P3b note carried):
  every malformed observation lands in a budget-bounded infra lane;
  throwing crashes a loop pass for a per-attempt fault, repairing
  guesses a conclusion.
- The fail-closed slot stays composed until P4b — do not "helpfully"
  swap the CLI wiring in this packet; the swap is the activation
  share's reviewed content.

## Embedding gates

- **Target files (production):**
  - `v3/src/runner/processGateRunner.ts` — NEW: GR1/GR3/GR4/GR5/GR8.
  - `v3/src/runner/spawnChannel.ts` — NEW: TX1's types + the direct
    channel.
  - `v3/src/runner/tmuxChannel.ts` — NEW: TX2–TX6.
  - `v3/src/runner/spawn.ts` — GR2: the optional stdin capability.
  - `v3/src/runner/actorAdapter.ts` — TX1/TX7: channel consumption +
    the session-grain conclusion derivation (the RS2/CL1/EM cores
    reused).
  - `v3/src/runner/index.ts` — T1's exports.
  - `v3/src/kernel/kernel.ts` — GR6: the capability-based cwd
    resolution at the process-gate arm.
  - `v3/src/testkit/scriptedRuntimeContextProvider.ts` — TK1: the
    capability facet.
  - `v3/src/ports/diagnostics.ts` — DG3: the token-domain growth.
  - `v3/src/diag/sqliteDiagStore.ts` — DG3: the allowlist growth.
  - `v3/vitest.stryker.config.ts` — T1: subprocess excludes.
  - `v3/implementation/plan.md` — the §9.4 repartition
    (R-ALIGNED-UP, same commit).
- **Test targets:**
  - `v3/src/runner/processGateRunner.test.ts` — NEW: the GR lanes
    (real `/bin/sh` children; a temp git repo for measurement; the
    evidence resolve/throw lanes; the kind walk with both flag
    values).
  - `v3/src/runner/tmuxChannel.test.ts` — NEW: the TX lanes (real
    tmux sessions — tmux is a declared test-environment requirement
    beside git; collision, liveness, escalation, env confinement,
    ephemerality).
  - `v3/src/runner/spawnChannel.test.ts` — NEW: the direct channel's
    pass-through pin + the `name_collision`-unreachable carry.
  - `v3/src/runner/spawn.test.ts` — GR2's stdin lanes (present →
    delivered bytes; absent → byte-identical prior behavior; the
    EPIPE negative).
  - `v3/src/runner/actorAdapter.test.ts` +
    `v3/src/runner/actorAdapterClassify.test.ts` — TX7's
    session-grain derivation rows (the pure classifier grows the
    session-concluded arm — Stryker-covered, no subprocess).
  - `v3/src/kernel/kernel.test.ts` — GR6's lanes (worktree-shaped
    object locator resolved via the facet; the three integrity
    negatives; the C36 backstop untouched).
  - `v3/src/diag/sqliteDiagStore.test.ts` — DG3's token lanes.
  - `v3/src/testkit/scriptedRuntimeContextProvider.test.ts` — TK1's
    facet lanes.
- **Entrypoints:** `createProcessGateRunner`,
  `createDirectSpawnChannel`, `createTmuxSpawnChannel` + the channel
  types (module-public via `runner/index.ts`); NO shipped CLI
  change, NO ingress change, NO port-file change except
  `ports/diagnostics.ts` (DG3) — `ports/gate.ts` and
  `ports/delivery.ts` are byte-untouched (the runner implements the
  existing port; `name_collision` already exists in the K1 union).
  R-ACTIVATION-JOURNEY does not fire (GR7).
- **Substrate:** eight NEW cells probed in-session (P7a–P7f,
  P8a–P8b — the probe table in Operative material); the draft's
  P2a–P2e tmux cells and the P3/P6 spawn cells stand; no cell rests
  on an unprobed premise.
- **Mutation boundary** (machine face below): the files above plus
  this packet file.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/runner/processGateRunner.ts",
      "v3/src/runner/processGateRunner.test.ts",
      "v3/src/runner/spawnChannel.ts",
      "v3/src/runner/spawnChannel.test.ts",
      "v3/src/runner/tmuxChannel.ts",
      "v3/src/runner/tmuxChannel.test.ts",
      "v3/src/runner/spawn.ts",
      "v3/src/runner/spawn.test.ts",
      "v3/src/runner/actorAdapter.ts",
      "v3/src/runner/actorAdapter.test.ts",
      "v3/src/runner/actorAdapterClassify.test.ts",
      "v3/src/runner/index.ts",
      "v3/src/kernel/kernel.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/testkit/scriptedRuntimeContextProvider.ts",
      "v3/src/testkit/scriptedRuntimeContextProvider.test.ts",
      "v3/src/ports/diagnostics.ts",
      "v3/src/diag/sqliteDiagStore.ts",
      "v3/src/diag/sqliteDiagStore.test.ts",
      "v3/vitest.stryker.config.ts",
      "v3/implementation/plan.md",
      "v3/implementation/packets/ch9-p4a-spawn-machinery.md"
    ]
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "GR1", "class": "anchored", "refs": ["contract:ch9-runner#C21", "contract:ch9-runner#C19", "contract:ch11-gate-format#C13"] },
      { "id": "GR2", "class": "new-decision", "refs": [] },
      { "id": "GR3", "class": "new-decision", "refs": [] },
      { "id": "GR4", "class": "new-decision", "refs": [] },
      { "id": "GR5", "class": "derived", "refs": ["contract:ch11-gate-format#C26", "prose:packet ch11-p3b W2"] },
      { "id": "GR6", "class": "new-decision", "refs": [] },
      { "id": "GR7", "class": "derived", "refs": ["prose:plan §9.4 ch9-P4a row", "prose:template §2 step 0 milestone-gated rule"] },
      { "id": "GR8", "class": "new-decision", "refs": [] },
      { "id": "TX1", "class": "new-decision", "refs": [] },
      { "id": "TX2", "class": "derived", "refs": ["contract:ch9-runner#C23", "contract:ch9-runner#C19"] },
      { "id": "TX3", "class": "derived", "refs": ["contract:ch9-runner#C16", "contract:ch9-runner#C14"] },
      { "id": "TX4", "class": "derived", "refs": ["contract:ch9-runner#C23"] },
      { "id": "TX5", "class": "derived", "refs": ["contract:ch9-runner#C23", "contract:ch9-runner#C19", "ADR-017"] },
      { "id": "TX6", "class": "derived", "refs": ["contract:ch9-runner#C23"] },
      { "id": "TX7", "class": "anchored", "refs": ["contract:ch9-runner#C23", "prose:packet ch9-p3b CL1"] },
      { "id": "DG3", "class": "anchored", "refs": ["contract:ch9-runner#C26", "prose:packet ch9-p3b DG1"] },
      { "id": "TK1", "class": "derived", "refs": ["prose:packet ch9-p3b H1"] },
      { "id": "T1", "class": "new-decision", "refs": [] },
      { "id": "U1", "class": "derived", "refs": ["prose:plan §9.2"] }
    ]
  }
}
```

## Pre-approval flags

- **F1 — the channel seam shape + module homes + the direct default
  (TX1/T1).** The `SpawnChannel` seam, its closed `ChannelConclusion`
  union, the `processGateRunner.ts` / `spawnChannel.ts` /
  `tmuxChannel.ts` homes, and the DEFAULT-direct staging (the
  production tmux binding is P4b's `runner run` composition — C23's
  session letter binds the operator runner plane, which activates
  there; this packet ships and drives the machinery). Risk if wrong:
  a re-home/re-shape is mechanical behind stable exports; P4b's
  composition is the shape's first external test. Route:
  `approve-ratified` (dated decision record; revisit: none).
- **F2 — the seam stdin extension (GR2).** `DisciplinedSpawnInput`
  gains OPTIONAL `stdin`; absent → byte-identical behavior (the
  P3b/P2 suites are the pin); the EPIPE rule (input delivery is
  best-effort, the child's exit decides). The P3b-F1 flag named the
  gate-runner consumption the seam shape's first external test —
  this is that test, reviewed per the never-silent seam-change rule.
  Route: `approve-ratified`.
- **F3 — the gate-grain flagged-conclusion rule (GR3).** ANY
  `timedOut`-flagged conclusion → kind `timeout`, including the P6h
  delayed-exit race (a natural exit outrun by the timer callback) —
  fail-closed in the gate contract's direction (timeout →
  `blockTransition`), DELIBERATELY asymmetric with the delivery
  path's CL1 (completed work never reclassified — evidence-based).
  Risk if wrong: a spurious block under an event-loop stall at the
  deadline boundary — bounded, visible in evidence
  (`durationMs`/facts), operator-recoverable; the reverse direction
  (allow past deadline) would be the unsafe one. Route:
  `approve-ratified`.
- **F4a — measurement mechanics + the sentinel (GR4).** `headSha` =
  `git rev-parse HEAD`, `gitStatusHash` = sha256 over `git status
  --porcelain=v1 -z` raw bytes, both in the gate's cwd; on ANY
  measurement failure BOTH facts = `"unavailable-measurement-failed"`
  (one sentinel — P8b's non-repo case included), kind never changed.
  The sentinel spelling follows the slot's `unavailable-*` family.
  Route: `approve-ratified`.
- **F4 (W1 rides here) — the admission timeout-bound watchpoint.**
  Admission admits `timeoutMs` with no upper bound while the
  substrate collapses >2³¹−1 delays to ~1 ms (P6i); GR8's clamp is
  the runner-side guard. The admission-side upper bound is a
  candidate ch11 successor row. Route: `boundary-review`
  (process-log line at the chapter boundary).
- **F5 — the kernel cwd-resolution fix (GR6) — a contract-reality
  finding.** TODAY the kernel's process-gate arm reads `ref.locator`
  as a STRING (ch12-P1a X2, the testkit-provider era): with the
  ch9-P2 worktree provider's OBJECT locator, every worktree-run
  process gate lands on a kernel-integrity throw instead of C21's
  "cwd = the run's worktree". The fix replaces the read with the
  ratified L0e capability resolution (H1's mechanism, REV-E-shaped),
  keeps the C36 backstop byte-untouched, and adds TK1's testkit
  facet so the ch11/ch12 suites stay composable. The P3b-F10
  precedent (the packet hardens the seam it realizes against): the
  fix + its lanes land inside this packet's boundary. Route:
  `approve-ratified`.
- **F6 — spawn-lane confinement residuals (TX2/TX7/GR1).** Three
  declared residuals: (a) the darwin kernel injects
  `__CF_USER_TEXT_ENCODING` into the pane process's env (P7b) — one
  substrate-injected variable outside the allowlist, carried as a
  declared exception to Claim (2)'s "nothing else" (trusted-local
  host, ADR-017); (b) the wrapper/actor stdio goes to the pane, so
  the stderr `spawnDetail` tail is ABSENT on tmux conclusions — a
  diagnostic-only loss C23 itself declares (pane capture is no
  row's proof); (c) the gate child's `/bin/sh` layer injects its
  POSIX built-ins `PWD`/`SHLVL`/`_` (GR1) — the gate-lane sibling of
  (a); the confinement discipline therefore pins CANARY ABSENCE on
  both lanes, never env set-equality; (d) the ORPHAN-SESSION residual
  (TX5's last-resort failure lane, LABEL-SYMMETRIC): a tmux server
  refusing both signals and kill-session leaves the session orphaned
  after the bounded conclusion — `own_timeout` on the flagged
  timeout path, `spawn_infra` on TX6's unflagged abort path — the
  P3b-F2 orphan-acceptance precedent at session grain (trusted-local host, ADR-017; the
  orphan stays findable by its session name; teardown/health is the
  named Absent). Route: `approve-ratified`.
- **F7 — the per-call timer clamp (GR8; arm-reclassed at gate 1).**
  An admitted `timeoutMs` above Node's 2³¹−1 timer bound is CLAMPED
  to `TIMER_MAX_MS − graceMs` (≈ 24.8 days) instead of segmented
  timers, a run-time refusal, or an admission-side bound — the
  simplest form that closes the P6i 1 ms-collapse hazard; the
  composition-visible shortening is theoretical at this ceiling and
  stays observable in the evidence record. The admission-side bound
  remains W1's boundary-review candidate. Route: `approve-ratified`.

## Acceptance

- Contract tests: none newly owned (the IC-A2 family and the CT-B
  re-run stay P3a/P3b's, green and untouched — the tmux channel is
  NOT bound into their compositions at this packet). All matrix
  lanes driven by claim-derived negatives (R-CLAIM-NEGATIVES; every
  declared lane DRIVEN — R-MATRIX-LANES).
- Checks: the drift suite (registries/ledger byte-identical — U1),
  `pnpm v3:packet-lint`, `pnpm v3:adr-check` (ADR-016/017/018
  statuses untouched), `pnpm v3:coverage` (the union unchanged —
  empty slice), `pnpm v3:deferred` (clean — no markers touched),
  `pnpm v3:lint` + `v3:typecheck` (T1's ripple green).
- Test disciplines + family inventories (R-ALTITUDE-LINE: membership
  parameterized, fixture enumeration is build work;
  R-LANE-SENSITIVITY binds twice — at these lane texts now, at the
  built bodies via the arm gate-2 sensitivity pass; the §9.4
  mutation-pilot dual-run rides gate-2 scoped to this boundary, with
  T1's declared subprocess-profile partiality recorded):
  - **GR (gate runner):** the declared set = {the kind walk, total
    and flag-composed — exit 0 → `ok(0, stdout)`; exit nonzero →
    `ok(n, stdout)` (kind stays ok — the kernel classifies); a
    TERM-compliant and a TERM-ignoring child under the runner's own
    timeout → `timeout` (the escalation observed); a foreign kill
    (unflagged signal) → `runner_error`; ENOENT/spawn-throw →
    `runner_error`; the FLAGGED-natural-exit race member → `timeout`
    (GR3's rule — RED under a faithful-completion implementation);
    stdin delivery (the invocation document arrives on the child's
    stdin byte-exact); the stdin-absent pin (the seam's prior
    behavior byte-identical — the existing suites green unchanged);
    the EPIPE negative (a fast-exiting child: kind follows the
    exit, never infra); measurement — a temp-repo cwd yields the
    real HEAD sha + a porcelain hash that CHANGES when the tree
    dirties (sensitivity) and is STABLE across identical states; the
    non-repo sentinel member (both facts the sentinel, kind
    unchanged — P8b); duration from the INJECTED time source (a
    controlled clock drives a nonzero value); evidence — every kind
    resolves its `logRef` to the complete per-kind record BEFORE
    `run()` resolves (the resolve affordance), timeout and
    runner_error evidenced equally, `log` carrying the captured
    text verbatim; the persistence-failure throw (a closed/readonly
    evidence DB → `run()` rejects, no result returned); the clamp
    members (timeoutMs above the 2³¹ bound clamps — the child is
    NOT killed at ~1 ms, the P6i collapse driven out; graceMs knob
    validation at construction); allowlist confinement (the gate
    child sees ONLY the allowlist — a host canary proven ABSENT;
    the `/bin/sh` built-in residuals `PWD`/`SHLVL`/`_` declared
    (F6c), so the discipline is canary-absence — an env
    set-equality assert is itself a defect)}.
    Membership: GR1–GR5, GR8 (owner: this packet; driven in
    `runner/processGateRunner.test.ts` + `runner/spawn.test.ts`).
  - **KC (kernel cwd — GR6/TK1):** the declared set = {a
    worktree-shaped OBJECT-locator ready ref resolves cwd through
    the capability (the gate runner receives the provider-minted
    path — asserted byte-equal); the string-locator scripted world
    keeps working through TK1's facet (the existing ch11/ch12
    process-gate suites green unchanged); the three integrity
    negatives (unresolvable provider / facet-less provider /
    throwing resolution → kernel-integrity throw, pre-commit, no
    state); the C36 backstop pin (non-ready and ref-null →
    `Rejected(runtime_context_required_for_process_gate)`,
    byte-unchanged)}. Membership: GR6, TK1 (owner: this packet;
    driven in `kernel/kernel.test.ts` +
    `testkit/scriptedRuntimeContextProvider.test.ts`).
  - **TX (tmux channel):** the declared set = {the wrap round trip
    (a real actor argv inside a real session: handoff read, emit
    written, result read after session death — the RS1–RS3
    preservation driven end-to-end); env confinement THROUGH the
    session (the pane process observes ONLY allowlist +
    `PAIRFLOW_*` + the declared darwin residual — a host canary
    proven absent; RED without the env -i embedding, P7a's leak);
    cwd honored (`-c` — the pane process's cwd is C17's value); the
    collision member (a pre-created same-name session →
    `name_collision`, the wrapped command NEVER ran — the
    pre-side-effect negative); the other-create-failure member
    (tmux ENOENT / other nonzero → `spawn_infra`); liveness
    conclusion (natural exit → session death observed → the result
    decides); the session-timeout escalation walk (TERM-compliant
    and TERM-ignoring actors — the wrapper's inner grace observed,
    the result recording `termForwarded`, `own_timeout` landed);
    the kill-session last resort (a signal-undeliverable fixture →
    bounded conclusion through TX7's precedence — a result-absent
    run lands `own_timeout` via the flag, no hang); the
    kill-session-FAILURE member (a scripted client fault on the
    last resort while the session lives → ONE poll-coupled retry,
    then the bounded `own_timeout` conclusion with the F6(d)
    residual — RED if unbounded or misclassified); the
    abort-plus-backstop-failure member (the SAME kill-session fault
    staged on TX6's UNFLAGGED abort path → the bounded `spawn_infra`
    conclusion with the F6(d) residual declared — RED if unbounded
    or if the residual attaches only to the `own_timeout` label); the
    completed-but-stuck-session member (a lingering session with a
    WRITTEN result under a forced kill-session → the recorded
    outcome honored, never `own_timeout` — RED if the last resort
    bypassed TX7); the ephemerality pin (the SEPARATE set-option
    invocation driven — option confirmed off per-session, P7f; a
    DEAD-session pin failure benign: observation proceeds and a
    present result is honored — RED if the pin failure were treated
    as a conclusion); the LIVE-session pin-failure ABORT member
    (a scripted pin fault on a live session → the abort walk: kill
    observed, conclusion through TX7 unflagged, a pre-abort-written
    result honored, absence → `spawn_infra` — RED if the session
    survives a failed pin); the fast-death pre-observation member (a
    wrapper dying before `list-panes` → pane_pid unresolved,
    conclusion proceeds, never infra); the LIVE-session
    list-panes-fault member (a scripted client fault while the
    session lives → pane_pid unresolved, observation continues via
    the poll, the timeout path still bounds — RED if it lands
    `infra` or stalls); the poll-anomaly member (an
    anomalous `has-session` client conclusion — a seam `infra` or
    an exit outside the 0/1 domain → channel `infra` →
    `spawn_infra`, fail-closed); the session-grain result walk (absent /
    invalid / foreign-echo / signal-record / nonzero / zero — the
    flag-composed TX7 rows, including the completed-work-kept
    member under a fired timer); the direct-channel pin (the ENTIRE
    P3b adapter/classify/CT-B suite green unchanged over the
    default channel)}. Membership: TX1–TX7 (owner: this packet;
    driven in `runner/tmuxChannel.test.ts` +
    `runner/spawnChannel.test.ts` + the adapter suites; tmux is a
    declared test-environment requirement beside git).
  - **DG (token growth):** the declared set = {a `name_collision`
    conclusion emits its `spawn_outcome` event with the new token;
    the read gate admits the token and keeps both-direction iffs
    (the token on a non-`spawn_outcome` kind rejected; the domain's
    other members unchanged); `spawnDetail` absent on tmux-channel
    events (the optionality pin); bundle exclusion unchanged}.
    Membership: DG3 (owner: this packet; driven in
    `diag/sqliteDiagStore.test.ts` + the adapter suites).
- Drift tests green (standing, unconditional — PI-3).
- Standing review rules in force: REV-E-NO-ADAPTER-BRANCH (the
  kernel's capability check is value-shape, never provider-type; the
  adapter is channel-blind beyond the injected seam);
  REV-DIAG-FAILOPEN (DG events emitted BARE);
  REV-B-LOCAL-NOT-AUTHORITY (no channel-local or runner-local state
  is authority — conclusions derive from files, signals, sessions,
  and the injected seams); REV-C-PROJECTIONS-READONLY (the gate
  runner and channels read no kernel projection; the kernel arm's
  read surface is unchanged).

## Build record

Execution context: **fresh-context-delegated** (the README §4 default) —
a fresh-context build agent implemented the packet against the approved
spec (packet sha256 `543d5b48…ba34` @ HEAD `e956ed02`); the main
context retained orchestration, the full verification chain, both arm
gates, and the commit boundary. Build guidance handed over: the
packet's discipline lines quoted verbatim (GR3/GR4/GR5/GR8, TX2–TX7,
canary-absence confinement), the R-DERIVED-PROBES probe-runner
protocol, the tmux/git test-environment conventions
(`p4atest-`-prefixed sessions, temp git repos), and the
do-not-touch list (the GR7 activation deferral).

Result: 6 new files + 15 edits (the declared boundary exactly — the
orchestrator verified changed-set == `mutation_boundary`); tests
1628 → 1703 (+75), all green; `v3:typecheck` / `v3:lint` /
`v3:test` / `v3:coverage` / `v3:deferred` / `v3:packet-lint` /
`v3:adr-check` green, re-run by the orchestrator independently. The
direct-channel pin held: the entire P3b adapter/classify/CT-B suite
green unchanged. Mutation probes: 6 receipt-backed red-on-break
probes (≥1 per family — GR flag rule, KC cwd identity, TX collision /
escalation flag / TX7 flag rows, DG token), all through
`probe_runner.py`, restores byte-verified (receipts in the session
scratchpad `ch9p4a-probes/receipts/`).

Builder-reported notes (no silent deviations): (1) the plan §9.4
repartition rode the worktree as prepared (R-ALIGNED-UP — this
commit); (2) `deliveryLoop.ts:74` keeps a free-text "ch9-P4" owner
note — the file is outside this boundary and the referenced consumer
(the respawn verb) is P4b's; P4b renames it with its own edit;
(3) `tmuxChannel.test.ts` paces real-tmux polling with
`node:timers/promises` delay (a controlled clock cannot advance a
real tmux server; justified in-file — a gate-2 look item);
(4) RETIRED by the gate-2 aftermath — `gitStatusHash` now hashes the
RAW porcelain bytes (the seam's `stdoutBytes`), GR4's letter
realized exactly;
(5) RETIRED by the gate-2 aftermath — the channel's windows are now
wall-clock deltas on an injected `TimeSource` (IC-D-clean), TX5's
"on `timeoutMs` firing" realized at observation grain;
(6) a live-pin ABORT whose kill signals ARE deliverable concludes
through the shared TX7 precedence as `foreign_kill`
(`termForwarded`, unflagged) — a bounded same-cost ambiguity between
attempt-consuming classes (the CL1 grey-class precedent); the
declared absence lane lands `spawn_infra` as written.

Aftermath (the gate-2 folds — arm verdict on commit `e27f33ac`:
FINDINGS, 2×P1 product + 1×P2 test-evidence + 1×P2 packet-docs; all
folded; fix AUTHOR: a fresh-context aftermath agent, packaged
finding-context — the §4 default; orchestrator-verified):

1. **GR4 raw bytes (P1, product):** the seam's per-chunk UTF-8
   decode corrupted chunk-split multibyte sequences and the runner
   hashed a re-encoding. Fold: the seam accumulates Buffer chunks,
   decodes ONCE at conclusion, and the exit conclusion gains
   `stdoutBytes?: Buffer` (raw bytes — ALWAYS set by the real seam;
   OPTIONAL at the type so out-of-boundary synthetic-conclusion
   constructors stay untouched, a bytes-less conclusion landing the
   GR4 sentinel fail-closed, never a re-encode). `gitStatusHash` =
   sha256 over the raw bytes. This is a REVIEWED seam-shape
   extension (the P3b-F1 seam; recorded here per the never-silent
   seam-change rule, reviewed by the gate-2 re-check). RED-proven:
   the chunk-split lane fails against the pre-fix seam.
2. **TX5 wall-clock windows (P1, product):** poll-count accounting
   excluded client-invocation time, stretching the windows. Fold:
   `TmuxChannelDeps` gains a REQUIRED `time: TimeSource`; every
   window (timeout, grace, backstop, kill-session retry) is a
   `time.now()` delta from its anchor, firing at the first
   observation at/after the deadline. RED-proven: the
   slow-client sensitivity lane fails under poll-count accounting.
3. **Missing sensitivity members (P2, test-evidence):** added — GR4
   exact-sha + post-conclusion mutation proof; GR5 complete
   timeout/runner_error evidence keysets; GR8 exact clamp ceiling
   (seam-input spy); TX3 non-duplicate nonzero create → infra; KC
   non-ready C36 sibling; TX6 deliverable-signal live-abort
   (→ `foreign_kill`, the note-6 outcome driven) + the
   pre-abort-written-result branch (→ the recorded outcome, never
   `spawn_infra`); DG bundle-exclusion lane. Tests 1703 → 1714.
4. **Build-record accuracy (P2, packet-docs):** notes (4)/(5)
   rewritten above (both mechanisms now realize the letters); the
   arm judged notes (1)/(2)/(3)/(6) honest as written.

Receipt/probe status: the gate-2 receipt audit passed (6/6 valid);
the mutation-pilot dual-run (boundary-scoped Stryker) recorded:
covered-mutant score 83.04% overall — kernel 90.7 / testkit 97.4 /
spawn 88.6 / actorAdapter 87.7 / diag 76.5 covered; the
subprocess-tested files (processGateRunner / spawnChannel /
tmuxChannel) report no-coverage under the Stryker profile — the T1
DECLARED partiality (their proof lives in the subprocess suites +
the receipt-backed probes). Pilot labels: the six build probes are
code-mutation-grade catches; no input-domain catch this packet.

```json
{
  "packet_metrics": {
    "class": "operability",
    "prediction": { "predicted": "projection", "reasoning": "machinery realization of ratified C21/C23 rows over probed substrate; the P4 row carried no pre-registered class (human-mode row) — projection inferred from the draft's density", "discovered": "projection" },
    "provenance": { "anchored": 3, "derived": 9, "new_decision": 7 },
    "rounds": { "review": 5, "doc_refinement": 0, "implementation": 2 },
    "stops": [{ "type": "4:flagged-approve", "what": "first-of-a-kind + seven new-decision rows riding as approve-ratified flags; approve renewed after the arm gate-1 folds (content changed post-approve)", "resolution": "human approve on 82110c1d, re-approve on 543d5b48" }],
    "detector_misses": [
      {
        "found_at": "arm-approve",
        "what": "GR8 (the per-call timer clamp) authored as derived; the arm's entailment attack reclassified it new-decision (segmented-timer / run-time-refusal / admission-bound alternatives were live)",
        "why_missed": "the authoring-time and lens-2 round-1 entailment checks accepted the substrate-forced framing without enumerating the segmented-timer alternative"
      }
    ],
    "learned": "cross-packet seam defects (the kernel string-locator read vs the ch9-P2 object locator) surface only when two chapters' surfaces first COMPOSE — a composed-pair probe belongs in the consume-family scan when chapters first meet",
    "main_thread_model": "claude-fable-5"
  }
}
```
