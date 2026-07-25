# Task Packet: ch9-p4b-operator-surface — the operator surface

Plan step: plan.md §9.4 ch9-P4b row (the P4 sizing split's ACTIVATION
share; the split record lives in §9.4's second process note). Realizes
the operator half of §9.1 items 5–6: the composition swaps (the C21
real `ProcessGateRunner` into the shipped operator-CLI kernel wiring;
the C23 tmux channel as the runner composition's delivery default),
the C25 CLI verbs (`runner run` with the lease-above-timeout pairing
validation — the P3b F8 obligation discharged here; `attach` per C24;
`runner respawn` — C14's exactly-one unconfirmed exit surfaced), the
C25 instance-detail growth (runtime-context projection summary, errand
state + remaining budget, attach availability), the
R-ACTIVATION-JOURNEY smokes through the shipped entrypoints, and the
chapter's dogfooding-checkpoint preparation (the DoD's hand-driven
run's runbook).
Draft anchors (the ratified rows this packet realizes or consumes —
the manifest's strict refs are the machine subset): `contract:ch9-runner`
rows C10/C13/C14/C16/C18/C19/C21/C23/C24/C25/C26. ADR-017 (spawn
confinement) governs every spawn this packet's compositions bind;
ADR-016 governs the errand ledger this packet reads (never writes
outside the ratified loop/reader mechanisms); ADR-018 binds NEGATIVELY
on the delivery path (no `sys:` token — unchanged) and POSITIVELY only
through the kernel's already-realized classification output (ch9-P0,
byte-untouched).

Autonomy stage: measurement — inherited from the ch9 chapter header.
**First-of-a-kind: YES** — the first operator runner surface and the
first attach channel: the HUMAN approve is inherited from the P4 row's
declared mode and stands on R-FIRST-STOP regardless of flags (the
packet carries flags besides — STOP `4:flagged-approve` coincides).

Plan alignment (R-ALIGNED-UP): none — no ratified plan text is
contradicted; the §9.4 P4a/P4b repartition landed with ch9-p4a's
commit and this packet realizes its P4b row as written.

Classification: **projection** — manifest tally: 3 anchored /
4 derived / 9 new-decision (machine-counted from the `packet_rows`
block). Every anchored row cites a ratified draft row; derived rows
narrow inside explicitly delegated claim surfaces (C25's own letter:
"the exact flag/output schemas are packet-time detail under these
lanes") with in-row derivation notes. The NINE new-decision rows
(CW2 the dev-plane slot retention; RR1 the verb topology + schemas;
RR2 the errand-DB derivation; RR3 the pairing-margin rule + derived
lease default; RR5 the run modes; AT2 the attach exec seam; RS1 the
respawn exit-classification schema (arm-reclassed at gate 1); DT2
the enrichment design — the selection rule, the projected field set,
the closed degrade domains, the degrade-vs-demand election, the
mechanisms; T1 the
module homes + CliDeps growth) are flagged, dated decision records riding this
packet's HUMAN approve as `approve-ratified` (flags F1–F8; W1 routes
`boundary-review`) — none touching authority / separation /
availability-class semantics (gate-decision authority is ch11's
ratified surface; errand/delivery authority is P3a's; confinement is
ADR-017's; the diag channel's availability class is ch7's, reused
unchanged); the Case-B recommendation is NOT-B: all nine are
composition/CLI-schema grain under ratified semantic rows — presented
for the ratifier's own verdict at the approve.

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
unit tree). This packet's claim surface is its canonical contract
matrices. No rejection-name registry change (the 54-name registry
stays byte-identical — drift lanes green before and after; the
kernel is byte-untouched by this packet). Invariants: none newly
owned. Traces: none.

## Sizing/risk (template §2 step 0 — materialized)

**The gate run on P4b alone (the P4-row gate's split verdict stands —
the §9.4 second process note is the record; this is the re-run on the
ACTIVATION share).** Authority movement — NO: every truth source is
pinned (gate-decision truth ch11's, delivery truth the committed row,
errand truth the P3a ledger; the swaps move COMPOSITION BINDINGS, not
authority; the detail growth is a read projection). Surface spread —
the OPERATOR-SURFACE concept lives in ONE change family: the CLI layer
(`main.ts` + the new `runnerVerbs.ts` + `runtime.ts` + the test
fixtures) plus two comment renames and one docs file; the floor MODULE is
byte-untouched (DT2's boundary decision), the kernel, stores, loop,
adapter, channels, and providers are byte-untouched (behavior; the
two comment renames are Claim (7)'s scoped exclusion). Identity/join
fragility — present but PINNED by ratified rules: attach resolves
session names from the LEDGER row (C23/C24's resolution-source
letter, never derived), the errand key is C13's ratified derivation
(the CLI never re-derives it — it reads rows). Foundation +
activation coupling — this packet IS the activation share BY the
split's design: the foundation (P4a) is committed and green; nothing
new is built-and-activated in one motion. Prerequisite coupling —
none (P4a, P3a/P3b, P2, P1, P0 all committed). Acceptance
multiplicity — CLI contract lanes + detail-read lanes + journey
smokes: the split's own record names exactly this as the activation
share's OWN proof surface; within the packet it is one consumer
family (the operator) and one review loop. Hard-stop scan: none trips
— (1) no authority movement; (2) the session-liveness concept's
producer landed at P4a, this packet holds its two consumers (attach +
the availability read); (9) no rollback/lease/idempotency SEMANTICS
change (the pairing rule is a config-boundary VALIDATION of ratified
knobs — C14's lease semantics byte-untouched); (11) the journey
smokes reuse the ch8-P2/ch9-P2 journey culture by explicit named
reuse (the J1 row cites it). **Single-packet allowed: yes** — one
bounded CLI-layer change closes every touched bucket, one proof
surface (the CLI suites + the journey smokes) validates it, the same
consumer owns the fallout.

Consume-family scan (from the tree): producer = the CLI compositions
(HERE — `runner run`'s loop/adapter/channel binding, the kernel
wiring's gate-runner binding); validator/gate = the kernel
(BYTE-UNTOUCHED — its process-gate arm now RECEIVES real
`ProcessResult`s on shipped paths, the activation, with zero kernel
change); execution consumer = the loop + adapter (byte-untouched,
newly REACHABLE from shipped entrypoints); persistence/replay = the
errand ledger + process-evidence DB (both REUSED, schemas unchanged;
the errands DB is newly minted at the CLI's derived path);
read/presentation = HERE (the detail runner section, the `--once`
errand doc); external/integration = HERE (the attach exec, real tmux
sessions and real gate spawns reachable from shipped entrypoints);
recovery/cleanup = HERE at surface grain only (`runner respawn`
surfaces C14's ratified exit; the semantics are P3a's,
byte-untouched); testkit = ABSENT (no fake/seam contract changes —
the CliDeps growth is the production composition seam, driven by the
CLI's own suites).

Conditional annexes:

- **Closure-budget triage:** buckets in scope — the operator kernel
  wiring (swap), the runner composition (new verb), the attach/respawn
  verbs, the detail enrichment, the journeys, the runbook.
  Intentionally collapsed: all CLI-layer buckets as one change family
  (safe — one proof surface, the CLI + journey suites; every consumed
  module is pinned by its own committed suite). Explicitly deferred:
  teardown/health/retry-on-FAILED (named Absents), the keyed
  actor-mapping form (F4), the platform-derived lease design (F3 —
  parked, boundary note), L2b context blocks (the named §1.3
  candidate).
- **Proof-boundary triage:** no proof source moves — gate-decision
  truth stays the kernel's classification over the runner's faithful
  `ProcessResult` (C21, realized at P4a, activated here); delivery
  truth stays the committed transcript row (CF1/C15); errand truth
  stays the ledger under the reader facade's re-check (CF3). No
  surface goes mixed-truth: the detail runner section is a labeled
  PRESENTATION of ledger + liveness + projection reads, each member
  carrying its own availability discriminant (DT1), never a second
  authority.
- **Mutable-flow record:** hard-stop-9 material near — answered: the
  pairing VALIDATION rejects at the config boundary (usage/2) BEFORE
  any store/kernel/ledger open on the `runner run` path — zero side
  effects on precondition failure; rollback/retry/preservation
  semantics are NOT in this slice (P3a's rules consumed unchanged
  through the loop's own API); no new coordination primitive — the
  respawn verb calls the loop's existing L5 edge, the attach verb
  only reads and execs. ONE topology change acknowledged: concurrent
  errand-DB writers become REAL here (a worker + operator verbs on
  one ledger) — the store's existing busy-timeout discipline bounds
  it, contention past the bound is ES5-fail-loud (DT2's
  member-vs-substrate line), no new primitive minted.

## Operative material (full text — projection, not invention)

The semantic source is the ratified `ch9-runner` contract
(2026-07-23, content commit `5c68f206`, amended `09825f78`). The rows
this packet realizes — verbatim NORMATIVE bodies (`DECIDED HERE …`
provenance clauses elided; decision provenance lives in the draft,
never re-decided here):

> **C24** | The attach channel is a PER-RUNTIME-CONTEXT verb (the
> settled pane-binding decision cited; pane-layout config stays
> none-in-v1): `observe` = read-only attach (`tmux attach -r`, P2d),
> `takeover` = writable attach; the CLI verb resolves
> `instance_id → the errand's LIVE attempt's recorded session name`
> (a runner-ledger read, C23 — never derived from the runtime ref)
> and EXECS tmux; attach NEVER writes kernel state and its
> availability window is C23's liveness. A missing session is a clean
> CLI error lane ("not running"), never a kernel read failure.
> `takeover` (writable access to a live actor terminal) is a
> K4-adjacent authority decision recorded under ADR-017's
> trusted-local-host stance; the CLI's DEFAULT is `observe`
> (read-only), takeover an explicit flag.

> **C25** | The chapter's CLI surface: `runner run` (foreground
> composition: delivery loop + provider registry + spawn seams — the
> operator's single entry to the runner plane), `attach <instance>
> [--takeover]` (DEFAULT = read-only observe, C24 — takeover only by
> the explicit flag), and `runner respawn <instance>` (the C14
> `unconfirmed` exit's surface — re-spawns the errand's delivery
> under the frozen-budget rules); all follow the ch6 CLI pattern
> (JSON output contract, exit-code lanes: 0 ok / 2 usage / 3 domain
> error) — the exact flag/output schemas are packet-time detail
> under these lanes. The floor's instance detail gains: the
> runtime-context projection summary (path/branch), the errand
> state + remaining budget, and attach availability (C23).

The consumed halves of sibling rows (cited boundaries, not
re-realized here): **C21** — "the real `ProcessGateRunner` …
replacing the fail-closed slot runner": the machinery landed at P4a
(GR1–GR8); THIS packet performs the replacement in the shipped
operator wiring (CW1) — the runner itself is byte-untouched. **C23**
— the session letter ("the actor process runs INSIDE a tmux
session…"; "the runner ledger, not the opaque runtime ref, is
attach's resolution source"; "attach availability equals process
liveness, and the floor's liveness signal is the session's existence
(`has-session`)"): the channel landed at P4a (TX1–TX7); THIS packet
binds it as the runner composition's delivery default (CW3) and
realizes the two consumers (AT1, DT1). **C14** — the `unconfirmed`
exit: "exactly one ERRAND-LEVEL exit — the operator re-spawn (C25's
verb), whose edge returns to `attempting` under the FROZEN budget …
and mints its own fresh `attempt_id` (C16) … a failed or silent
re-spawn returns to `unconfirmed`, never to `pending` or
`exhausted`" — realized by the loop's `respawn` (P3a/P3b, F10's
hardened form); THIS packet surfaces it (RS1). **C13** — discovery =
polling the committed transcript (interval composition-configured,
default 1000 ms); the errand key derivation
(`"<instance_id>@v<expected_version>"`) is the LEDGER's — the CLI
reads rows, never re-derives keys. **C16** — attempts-per-errand
default 3 (composition-configured); every attempt start mints a
fresh durable `attempt_id`. **C18** — "the adapter maps
`effective_agent_config` to a spawnable argv through an
ADAPTER-OWNED, composition-injected mapping (config → command
template); the mapping is host configuration, NEVER kernel
semantics" — the CLI's mapping surface is RR1's `--actor-cmd` (the
degenerate one-template form, F4). **C19** — the env ALLOWLIST
discipline (full replacement; the composition declares the
allowlist) — RR1's `--env-allow` is the composition's widening
surface. **C26** — runner-plane observability rides the existing
diag channel; the CLI compositions bind the derived-path diag store
(the ch7-P4 mechanism, unchanged). **P3b T2/F8 (the named P4
obligation, quoted):** "the PAIRING RULE binds the COMPOSITION: any
composition binding the real adapter sets the loop's `leaseMs` a
margin ABOVE its effective timeout … the operator-facing
`runner run` composition carries and VALIDATES the pair as a NAMED
P4 obligation."

### Delegated sources expanded (R-DELEGATION-CLOSURE)

- **The CLI contract this packet extends** (`cli/contract.ts` +
  `cli/common.ts`, read at source): exit classes 0 ok / 1
  integrity-internal / 2 usage-config / 3 kernel-negative-not-found;
  ONE JSON data document per verb on stdout (tail: NDJSON rows);
  every failure exactly ONE `CliErrorDoc` on stderr + the class exit
  code; `dispatch` resolves `argv[0]` against the verb table with
  strict `parseArgs`; config matrix `--db` > `PAIRFLOW_V3_DB` (missing
  = usage), `--templates-dir` > `PAIRFLOW_V3_TEMPLATES` (missing or
  unlistable = usage); store-open failure = internal (fail-closed
  loud); `deriveDiagDbPath(dbPath) = dbPath + ".diag.sqlite"` (the
  textual-derivation sibling family RR2 extends).
- **The CLI runtime seam** (`cli/runtime.ts`, read at source):
  `CliDeps = { openStore, openDiagStore, time, instanceIdSource,
  nonceSource, tailWait, env }`; `productionDeps()` is the ONE place
  the shipped entrypoint binds real resources. T1 grows it by three
  members (`attemptIdSource`, `workerIdSource`, `runInteractive`) —
  additive, every existing binding byte-preserved.
- **The kernel wiring this packet swaps** (`cli/main.ts` `withKernel`
  + `verbSubmit`, read at source): both operator sites construct
  `createFailClosedProcessGateRunner(deriveProcessEvidenceDbPath(db))`
  and inject it as the kernel's `processRunner`, closing it in
  `finally`. The dev entrypoint (`cli/dev/main.ts`) holds two more
  sites (inject; replay on `:memory:`) — CW2 keeps BOTH on the slot
  deliberately. `deriveProcessEvidenceDbPath(dbPath) = dbPath +
  ".process-evidence.sqlite"` stays the evidence-path derivation for
  the REAL runner too (GR5's one-evidence-home rule: the slot's
  `resolve` reads the same rows).
- **The runner this packet wires in** (`runner/processGateRunner.ts`,
  read at source): `createProcessGateRunner(evidenceDbPath, deps,
  options)` — `deps = { time: TimeSource }` (IC-D); `options =
  { envAllowlist? (default { PATH: <host PATH> } — the option value
  REPLACES the default, one full map, never merged), graceMs?
  (default 10 000, validated at construction via the seam's shared
  `validateTimerKnobs`) }`; the handle mirrors the slot's interface:
  `run` + `resolve(logRef)` + `close()`.
- **The loop this packet composes** (`runner/deliveryLoop.ts`, read
  at source): `createDeliveryLoop(deps, options)` — `deps =
  { errandStore, readSeam (StorePort satisfies structurally),
  definitions, providerRegistry, executor, time, wait, attemptIdSource,
  sessionNamer, diag, workerId }`; `options = { pollMs? (default
  1000), leaseMs? (default 900 000), attemptsPerErrand? (default
  3) }`; the API: `tick()` (one poll + work pass), `poll()`,
  `run()` (tick + wait until the injected wait rejects),
  `respawn(instanceId, contextPacketId)`. `respawn` is a SILENT
  no-op when the errand is absent or not `unconfirmed` (the L5
  exactly-one guard) — RS1's verb therefore runs its OWN
  precondition read first and reports from a post-call read.
- **The errand read path** (`runner/index.ts` +
  `runner/errandStore.ts`, read at source): `ErrandRow =
  { instanceId, contextPacketId, expectedVersion, actorId, state,
  remainingBudget, activeAttemptId, liveSessionName, workerId,
  claimedAt, recordedAdmitOutcome, discovery, createdAt, updatedAt }`;
  `createErrandReader(store, readSeam, diag)` is the sole SANCTIONED
  CLI read path (ES1/CF3 — every read of a resting
  non-confirmed disposition re-runs the evidence check and may flip
  `confirmed`, emitting the `evidence-promotion` diag event BARE);
  its own doc comment names it "ch9-P4b's floor basis" — and calls
  itself "the sole module-public read path", which is INTENT at P3a
  grain, not an export fact: the module ALSO exports the raw
  `openErrandStore`/`ErrandStore` surface (the composition/write
  seams RR2/RR4 legitimately use it), so the facade's
  unbypassability is a DISCIPLINE this packet's rule enforces at the
  CLI read layer, never a structural impossibility. The facade's
  read API is `getErrand(instanceId, contextPacketId)` and the
  whole-DB `listErrands()` — the instanceId-only verbs (attach /
  respawn / detail) resolve via `listErrands()` + a CLI-side
  instance filter (no per-instance facade query exists; the
  filter-then-select rules are AT1/RS1/DT1's own).
  `openErrandStore(path, time)` creates-or-opens the ledger file —
  which is WHY DT2's read path existence-checks before opening (a
  read verb must not mint a ledger).
- **The adapter this packet composes** (`runner/actorAdapter.ts`,
  read at source): `createActorAdapter(deps, options)` — `deps =
  { ingress: Pick<Ingress, "submit">, argvMapper, diag, channel?
  (DEFAULT = the direct channel; "the production tmux binding is
  ch9-P4b's `runner run` composition" — TX1's staging clause,
  discharged by CW3) }`; `options = { defaultCwd (REQUIRED),
  envAllowlist? (default { PATH }), timeoutMs? (default 1 800 000),
  graceMs? (default 10 000), backstopMarginMs? (default 5 000) }`;
  `ArgvMapper = (effectiveAgentConfig) => { cmd, args } | null` —
  `null` and a throwing mapper both conclude
  `infra_failure(spawn_infra)`, never a kernel rejection.
- **The channel this packet binds** (`runner/tmuxChannel.ts`, read at
  source): `createTmuxSpawnChannel(deps)` — `deps = { time
  (REQUIRED — wall-clock deltas on the injected source), clientSpawn?,
  wait?, kill?, tmuxBin? (default "tmux"), clientEnv? (default
  { PATH }), pollIntervalMs? (default 250), clientTimeoutMs? (default
  10 000), clientGraceMs? (default 1 000) }`. The production binding
  passes the wall clock and defaults.
- **The session namer** (`runner/enc.ts`, read at source):
  `defaultSessionNamer(instanceId, attemptId) = "pairflow-" +
  enc(instanceId) + "--" + enc(attemptId)` — C23's derivation, the
  composition-bound namer (the ledger records its output; attach and
  liveness read the RECORD, never re-derive).
- **The projection mechanism DT2 rides**
  (`ports/runtimeContextProvider.ts` + `domain`, read at source):
  `ProviderRegistry.resolve(name) → RuntimeContextProvider | null`;
  `projectForActor(ref) → RuntimeContextProjection` (C10's actor
  projection — for the worktree provider `{ kind: "worktree", path,
  branch }`, canonical-JSON-safe); the provider NAME comes from the
  pinned template's requirement
  (`resolveRuntimeContextRequirement` — the H1/GR6 mechanism,
  value-shape-only, REV-E). The registry is the shared production
  helper (`createProductionProviderRegistry`, sole member
  `pairflow.worktree` — ch9-P2 R1).
- **The journey culture J1 inherits** (`cli/worktreeJourney.test.ts`
  + `cli/journey.test.ts`, read at source): shipped-entrypoint
  subprocess drives (`tsx src/cli/main.ts <verb> …`), production
  bindings, a per-run swept temp root with the host repo as a NAMED
  SUBDIR (the beside-repo worktree lands inside the swept root),
  journey-authored templates embedding per-run fixture paths,
  post-exit floor reads as the assertion surface, derived-path diag
  readback as a pure READ.

### Substrate probes

No NEW substrate cell: every premise this packet stands on is probed
in the draft's table (P2a/P2b/P2d/P2e tmux presence, create/kill,
`attach -r` accepted, auto-death; P3a–P3d spawn/env cells) or P4a's
(P7a–P7f session env/cwd/collision/ephemerality/pane-pid; P8a/P8b
measurement) — cited per row. The ONE unprobed surface — a real
INTERACTIVE `tmux attach` on an operator tty — is deliberately
outside CI proof (F6): P2d proves the flag form is accepted and fails
only on a missing tty; the exec path is driven at unit grain through
the injected `runInteractive` seam, and its hand-driven proof is the
chapter's dogfooding checkpoint (plan §9.5 DoD).

## Claim

The operator surface activates the runner plane end-to-end while
minting ZERO new truth: (1) every SHIPPED OPERATOR kernel composition
spawns process gates for REAL — the two operator wiring sites bind
the C21 real `ProcessGateRunner` (evidence measured and durably
persisted, kinds faithful, classification the kernel's) and the
fail-closed slot is retired from operator wiring — while the dev
entrypoint's two sites KEEP the slot deliberately (SCOPED: the dev
plane never executes gate side effects — CW2); (2) `runner run` is
the operator's single foreground entry to the runner plane — the
ratified composition (delivery loop + production provider registry +
real adapter over the TMUX channel + the real gate runner) with EVERY
timer/pairing knob validated fail-closed at the config boundary
BEFORE any side effect, the F8 lease-above-timeout pairing rule
enforced as a named usage lane, and both run modes (`--once` bounded,
foreground unbounded) leaving only durable, crash-convergent state
behind on ANY exit; (3) `attach` realizes C24's letter exactly:
resolution is a runner-LEDGER read of the live attempt's recorded
session name (never derived from the runtime ref), observe is the
default and takeover an explicit flag, and every non-attachable state
is a clean, classified CLI lane — never a kernel read failure and
never a kernel write; (4) `runner respawn` surfaces C14's exactly-one
unconfirmed exit: the precondition is read fail-closed (a
non-`unconfirmed` instance is a domain error, exit 3), the edge runs
under the ratified frozen-budget rules through the loop's own API,
and the outcome is reported as data from a post-call ledger read;
(5) the instance detail's `runner` section presents runner-plane
state with EXPLICIT availability on every member (PARAMETERIZED: each
member of the declared section keyset carries a value or a named
unavailability discriminant — DT2's closed reason domains), degrades
loudly and never silently, and WRITES NOTHING (a read verb mints no
ledger file; the sole permitted write is the reader facade's ratified
CF3 evidence-promotion flip); (6) every shipped entrypoint this
packet activates carries a journey smoke (R-ACTIVATION-JOURNEY;
PARAMETERIZED over J1's declared journey family — deterministic
actors bound through the SHIPPED `--actor-cmd` surface, real tmux,
real worktrees, real gate spawns); (7) kernel truth is untouched: no
kernel write outside ingress, the kernel/floor/store/loop/adapter/
channel/provider modules are byte-untouched (SCOPED exclusion: the
two comment renames — `deliveryLoop.ts` and `enc.ts`, U1), and the
committed
transcript row remains the sole confirmation source.

Dimensions (enumerated before test rows — R-DIMENSIONS):

1. **Composition swaps** (CW) — the operator gate-runner swap, the
   dev-plane retention, the tmux delivery default.
2. **runner run** (RR) — verb topology, config knobs + pairing
   validation, the errand-DB derivation, the composition, run modes.
3. **attach** (AT) — resolution, exec mechanics, error lanes.
4. **runner respawn** (RS) — precondition, edge, reporting.
5. **Detail growth** (DT) — the runner section's shape, mechanisms,
   degrade discriminants.
6. **Journeys** (J) — the R-ACTIVATION-JOURNEY family.
7. **Types/ripple** (T) — CliDeps growth, module homes, the comment
   renames, the runbook.
8. **Coverage/drift** (U) — the empty slice, untouched registries.

## Canonical matrices

### CW — the composition swaps

| ID | Rule |
|---|---|
| CW1 | The OPERATOR gate-runner swap: both operator-CLI kernel wiring sites (`withKernel` and the submit verb's inline composition in `cli/main.ts`) construct `createProcessGateRunner(deriveProcessEvidenceDbPath(<resolved db>), { time: ctx.deps.time }, {})` in place of the fail-closed slot — options DEFAULTED (env allowlist `{ PATH }`, grace 10 000 ms; a gate command needing more env is a composition-widening decision recorded at W1), the handle closed in the same `finally` discipline, the evidence home unchanged (the derived sibling path — the slot's `resolve` reads the same rows, GR5's one-home rule). The slot module (`cli/failClosedProcessGateRunner.ts`) and its test stay BYTE-UNTOUCHED — it remains the W2 contract's reference realization, the dev plane's binding (CW2), and `deriveProcessEvidenceDbPath`'s home; only the operator wiring's import of the FACTORY retires. From this packet on, a shipped operator verb that reaches a process gate on a worktree-ready run SPAWNS the gate command for real and the kernel classifies the faithful result (C21's letter, activated). |
| CW2 | (NEW-DECISION — flag F8) The DEV plane KEEPS the fail-closed slot at BOTH its sites (`dev inject`; `dev replay` on `:memory:`) — deliberately: replay re-drives committed history and MUST NOT re-execute gate side effects (a real spawn in replay would be a semantic breach, not a feature), and dev injection stays conservative behind the ADR-009 entrypoint boundary. The dev entrypoint is byte-untouched; a future dev-plane real-gate need is a separate reviewed decision. |
| CW3 | The runner composition's delivery default is the TMUX channel: `runner run` composes `createActorAdapter` with `channel: createTmuxSpawnChannel({ time: <wall clock> })` (channel defaults otherwise — client env `{ PATH }`, poll 250 ms, client timeout 10 s / grace 1 s) — discharging TX1's staging clause ("the production tmux binding is P4b's `runner run` composition") and making C23's session letter real on the shipped path: every delivered attempt runs inside its ledger-recorded `pairflow-…` session, so attach availability equals process liveness by construction. The adapter-level DIRECT default is byte-untouched (non-composed/unit uses keep P3b behavior); the SHIPPED runner composition is the one place the tmux binding lives. |

### RR — `runner run`

| ID | Rule |
|---|---|
| RR1 | (NEW-DECISION — flag F1) Verb topology + schema: the operator CLI gains verb `runner` with subverb dispatch on `positionals[0]` (`run` \| `respawn`; anything else — missing included — is usage/2 naming the expected set), and top-level verb `attach` (AT1). THE UNION-OPTIONS RULE: `VERB_OPTIONS["runner"]` is the UNION of both subverbs' flag sets — the shared dispatch shell strict-parses ONCE per top-level verb (`common.ts` stays byte-untouched), so the shell admits every union flag syntactically and each SUBVERB HANDLER enforces its own partition: `runner respawn` rejects the cadence/budget/lease/once flags at handler grain (usage/2 naming the offending flag — RS1's list). `runner run` flags: `--db` / `--templates-dir` (the inherited config matrix — both resolve BEFORE composition; missing = usage/2), `--actor-cmd <json>` (REQUIRED — F4's mapping surface: a JSON object `{ "cmd": string, "args": string[] }`, strictly validated — non-JSON, wrong keyset, non-string members = usage/2), `--default-cwd <path>` (default: `<db>.runs` — the sibling-derivation family; flag-set or defaulted, the value is RESOLVED TO AN ABSOLUTE PATH at config time (`path.resolve` against the process cwd) because the adapter REQUIRES an absolute `defaultCwd` — its construction throw stays UNREACHABLE from this surface; the directory is created on demand by the adapter's own H mechanics), `--env-allow <NAME>` (repeatable; each named HOST env var is copied into the ACTOR allowlist ON TOP of `{ PATH }` — the GATE lane stays CW1's `{ PATH }`, its widening surface being W1's boundary item; a named-but-UNSET host var is usage/2, fail-closed, never a silent empty — a set-but-empty-string value is copied verbatim, it exists), `--poll-ms` (default 1000, C13), `--attempts` (default 3, C16), `--timeout-ms` (default 1 800 000), `--grace-ms` (default 10 000), `--backstop-margin-ms` (default 5 000), `--lease-ms` (default: DERIVED — RR3), `--worker-id` (default: `ctx.deps.workerIdSource()`), `--once` (boolean — RR5). Every numeric flag parses via the shared lexical-first nonnegative-safe-int rule. TIMER-KNOB VALIDATION IS CONFIG-TIME AND COMPOSITION-OWNED: the factories' own construction-time validation (P3b T2's shared-validator rule) covers only the knobs the factories receive, and the loop factory does NOT validate its `pollMs` at all (read at source — the wait path hands it to a raw timer, the P6i 1 ms-collapse hazard, reproduced), so `runner run` runs the seam's shared `validateTimerKnobs` over EVERY timer-bearing flag — `--timeout-ms`, `--grace-ms`, `--backstop-margin-ms`, `--lease-ms`, `--poll-ms` — at config time (finite safe integers below the 2³¹ bound at their named floors; violation = usage/2), BEFORE any factory construction or store open — the factories' own construction throws are thereby UNREACHABLE from this surface (the same shared validator has already passed). |
| RR2 | (NEW-DECISION — flag F2) The errand-ledger path is the THIRD textual-derivation sibling: `deriveErrandDbPath(dbPath) = dbPath + ".errands.sqlite"` (beside `.diag.sqlite` and `.process-evidence.sqlite`) — no new flag, no new env var; one runner plane per kernel DB path by construction. `runner run` and `runner respawn` open it via `openErrandStore` (create-or-open — the WRITE surfaces); the detail enrichment READS it only when the file exists (DT2's no-mint rule). |
| RR3 | (NEW-DECISION — flag F3) The pairing validation — the P3b F8 named P4 obligation, discharged: `runner run` VALIDATES `leaseMs ≥ timeoutMs + graceMs + backstopMarginMs + pollMs` at the config boundary (the lease must outlive one full attempt's escalation envelope plus a poll — else a sibling worker routinely reclaims a still-live attempt); violation = usage/2 with an error doc NAMING the rule and both operative values. The DEFAULT discharges it by construction FOR EVERY knob combination: `leaseMs = timeoutMs + graceMs + backstopMarginMs + pollMs + 900 000` (the bound's own terms plus C14's ratified 15-minute window as the margin — the CB1 pairing's margin shape; at all-default knobs: 2 716 000) — a formula carrying every term the bound carries can never violate the bound, whatever the flags set. C14's loop-level 15-minute default and lease SEMANTICS are byte-untouched (the lease stays composition-configured by C14's own words); the parked platform-derived lease design (lease computed, never user-visible — the process-log boundary note) is NOT implemented: the knob stays user-visible, the derivation is only its DEFAULT. |
| RR4 | The composition (DERIVATION: C25's named parts over the committed factories — loop + provider registry + spawn seams; every binding is a ratified default): ONE store handle + derived-path diag store (the ch7-P4 mechanism) → the production kernel exactly as the lifecycle verbs build it (real gate runner per CW1, production provider registry + DG4-wrapped completion sink, the SAME gate catalog feeding definitions and kernel) → `createIngress({ kernel, diag })` → `createActorAdapter({ ingress, argvMapper: <the --actor-cmd constant mapping>, diag, channel: <CW3's tmux channel> }, { defaultCwd, envAllowlist: <{ PATH } ∪ --env-allow>, timeoutMs, graceMs, backstopMarginMs })` → `createDeliveryLoop({ errandStore: <RR2's derived path>, readSeam: <the store handle's StorePort>, definitions, providerRegistry, executor: <the adapter>, time: ctx.deps.time, wait: <real timer>, attemptIdSource: ctx.deps.attemptIdSource, sessionNamer: defaultSessionNamer, diag, workerId }, { pollMs, leaseMs, attemptsPerErrand })`. Teardown closes errand store, gate runner, diag, and store in `finally`. The kernel's `settleRuntimeContextDeliveries()` drain runs before close (the R2 belt). No CLI handler writes kernel state outside ingress (the src/cli lint boundary stands). |
| RR5 | (NEW-DECISION — flag F7) Run modes: `--once` runs exactly ONE `tick()` (poll + work) and emits ONE data document — `{ "errands": [<every ledger row for this DB, through the reader facade — CF3 re-checked>] }` — exit 0 (the journey/scripting affordance: N invocations = N ticks over durable state, crash-convergence displayed by construction). WITHOUT `--once` the verb runs `loop.run()` in the FOREGROUND with a real timer wait — no stdout document. THE CHANNEL-CONTRACT POSITION (flag F7): the ch6 one-doc stdout discipline binds every DOCUMENT-EMITTING mode (`--once`, respawn, detail, attach's error lanes — C25's "follow the ch6 CLI pattern" realized: exit-code lanes bind everywhere, the one-doc rule binds where documents flow); the foreground mode emits ZERO documents (stdout stays clean of partial output; the observation surface is `tail --diag` / `detail` / attach — C26's channel, not a second stdout protocol) — a DECLARED, approve-ratified EXTENSION of the ch6 pattern, never a silent deviation; termination is process kill (SIGINT/SIGTERM): NO graceful drain in v1 — safe BY the ratified durable design (every in-flight attempt's state is durable; a killed worker's claims lease-expire and reclaim; kernel truth is untouched by construction), the operator recourse after a kill is simply running again. Every pre-composition failure (config, pairing, actor-cmd, store open) rides the standard error-doc lanes; a mid-run loop integrity throw (D6's config-integrity class) crashes the process loud through the dispatch internal lane (exit 1). |

### AT — `attach`

| ID | Rule |
|---|---|
| AT1 | `attach <instance> [--takeover] [--db]`: resolution is a runner-LEDGER read THROUGH the reader facade (C24's letter; the in-context facade rule holds UNIFORMLY — the CF3 recheck is inert on a live attempt's row, so the facade here is discipline, not semantics): existence-check the derived errand DB first (a read verb mints no ledger — DT2's no-mint rule) — no ledger file, or no errand row for the instance, or no row with a non-null `activeAttemptId` + `liveSessionName` → the clean "not running" domain error, exit 3, the doc naming the ACTUAL absence with a DISTINCT error name per lane (gate-2 fold — the build conflated the missing-errand case under the no-live-attempt name): `NoRunnerLedger` (no ledger file) \| `NoErrand` (ledger exists, no row for the instance) \| `NoLiveAttempt` (a row but no live attempt) — three distinct names, never collapsed; the session name is the ROW's recorded `liveSessionName` VERBATIM (never re-derived from ids, never read from the runtime ref). The verb then EXECS tmux through the injected interactive seam (AT2): default argv `["attach-session", "-r", "-t", <sessionName>]` (observe — read-only, C24/P2d); `--takeover` drops `-r` (the explicit writable flag). Attach never writes kernel state and never spawns anything but the tmux client; its sole possible ledger write is the reader facade's ratified CF3 evidence-promotion flip (a RESTING non-confirmed row with late evidence, read during resolution — the facade's own mechanism, benign and idempotent, never an attach-semantic write; the LIVE-attempt row the exec path rides is provably outside the flip's resting set). LIVENESS CLASSIFICATION PRECEDES THE EXEC (the substrate collapses the interactive client's failure modes onto ONE exit code — a real probe shows `tmux attach` exits 1 BOTH for a missing session and for a missing tty, so the interactive exit alone cannot discriminate AT1's lanes): after the ledger read, the verb runs ONE `has-session` probe through the C19 seam (DT2's liveness mechanism reused) — a CLEAN-DEAD session (`has-session` exit 1) → the "not running" domain lane (exit 3, `SessionDead`), NO exec invoked; a probe ANOMALY (neither alive nor clean-dead — tmux infra absent, an anomalous client conclusion) → INTERNAL (exit 1, `AttachProbeFailed`), fail-closed, NEVER conflated with the dead lane (gate-2 fold — at the exec boundary an undiscriminated probe cannot license an exec, so it fails loud; the DETAIL surface keeps its own `probe-failed` discriminant, DT2's letter, because a read verb degrades in-doc rather than fails); a live session → the interactive exec (AT2), whose clean exit maps to 0 and whose ANY nonzero exit is internal (exit 1) — the died-in-window race and the missing-tty case both land there, bounded and named (tmux's own message reaches the operator on the inherited stderr — AT2's declared channel extension). |
| AT2 | (NEW-DECISION — flag F6) The interactive exec seam: `CliDeps` gains `runInteractive(cmd: string, args: readonly string[]): Promise<number>` — production binds a `node:child_process` spawn with `stdio: "inherit"` awaiting exit (the operator's tty IS the pane view; nothing is captured — attach is C23's observe surface, diagnostic by contract, no row's proof rides pane bytes); tests bind a recording fake. THE PASSTHROUGH IS A DECLARED CHANNEL-CONTRACT EXTENSION (flag F6): during a live attach the tty passthrough is the surface — stdout/stderr carry pane bytes, not CLI documents; every NON-interactive lane of the verb (the not-running error, usage errors) keeps the ch6 one-doc channel rule. The seam deliberately does NOT ride `disciplinedSpawn` (whose captured-stdio discipline is the OPPOSITE of an interactive attach; ADR-017 item 4's capture rule governs runner-plane WORK spawns — an operator-initiated foreground attach inherits the operator's own tty by design, under the same trusted-local-host stance). CI proof boundary: the exec path is driven at unit grain through the seam (argv + flag composition + exit mapping); a REAL interactive attach needs a tty and is proven by the dogfooding checkpoint, not CI (the declared exclusion — Substrate probes). |

### RS — `runner respawn`

| ID | Rule |
|---|---|
| RS1 | (NEW-DECISION — flag F1; the verb LETTER is C25's and the edge semantics C14's, byte-consumed — the exit-classification schema and the flag partition are this packet's ELECTED design under C25's delegation, arm-reclassed at gate 1) `runner respawn <instance> [--db --templates-dir --actor-cmd --default-cwd --env-allow --timeout-ms --grace-ms --backstop-margin-ms --worker-id]` (the composition knobs are RR1's minus the loop-cadence/budget/lease flags — a respawn is ONE unbudgeted edge, not a cadence: `--poll-ms`/`--attempts`/`--lease-ms`/`--once` are rejected at HANDLER grain, usage/2 naming the offending flag — RR1's union-options rule: the shared dispatch shell strict-parses ONCE per top-level verb, so the shell admits them syntactically and the subverb handler enforces the partition): resolve THE instance's `unconfirmed` errand from the derived ledger (no ledger file, no errand for the instance, or none in state `unconfirmed` → domain error, exit 3, doc naming the actual state found; more than one `unconfirmed` errand for one instance → internal, exit 1 — a ledger-integrity surprise, fail-closed, never a pick); build the SAME composition as RR4 (kernel + ingress + adapter over the tmux channel + loop — the respawned attempt runs under the shipped delivery discipline, session recorded, C14's frozen-budget/unbudgeted-attempt rules enforced BY the loop/ledger, byte-untouched); await `loop.respawn(instanceId, contextPacketId)`; then emit the POST-CALL errand row (reader facade — CF3 re-checked) as the data document, exit 0 (the verb's effect — the edge ran — holds; the resulting STATE is data: `confirmed` on success, `unconfirmed` again on a failed/silent re-spawn per C14's narrowing, `mooted`/`confirmed` when the loop's own precondition path resolved the errand first — the loop's silent-no-op guard is why the verb's OWN precondition read runs first and why the report reads AFTER). EXIT ASYMMETRY, deliberate: a non-respawnable state SEEN at the precondition read is the domain lane (exit 3), while the SAME resolution landing inside `loop.respawn`'s own precondition path (the read→call window) reports as exit-0 DATA — the exit classifies the INVOCATION (rejected vs ran), the doc's `state` field carries the truth, and exit-code scripting judges on the doc. The respawn composition never runs the cadence (`run()`/`poll()` are not invoked), so the loop's lease/poll/budget cadence knobs are inert here BY CONSTRUCTION — wiring the cadence from this composition is out of contract. |

### DT — the instance-detail growth

| ID | Rule |
|---|---|
| DT1 | The `detail` verb's document gains ONE sibling key `runner` beside the byte-preserved kernel detail (every existing key/value unchanged — the kernel doc is the floor's, this section is the CLI's composition; DERIVATION: C25's three named members as the keyset, C10's projection as the success value — the discriminant/field DESIGN is DT2's): `runner = { errand, attach, runtimeContextSummary }` — a CLOSED keyset, every member ALWAYS present with a value or a named unavailability discriminant per DT2's design (never silently absent): `errand` = the instance's MOST RECENT errand row (reader-facade read — CF3 re-checked; WHICH row is "most recent" is DT2's elected selection rule), carrying AT LEAST C25's named `state` + `remainingBudget` (the full projected field set is DT2's elected design); `attach` = availability per C23's liveness letter (`{ available: true, sessionName }` iff a live attempt's recorded session EXISTS by the liveness probe, else `{ available: false, reason }` from DT2's closed reason domain); `runtimeContextSummary` = the provider's ACTOR PROJECTION VERBATIM (C10 — `projectForActor(ref)`; for the worktree provider `{ kind, path, branch }`) iff the run's runtime context is `ready`, else `{ unavailable: <reason> }` from DT2's closed reason domain. |
| DT2 | (NEW-DECISION — flag F5) The enrichment DESIGN + mechanisms + the read-verb discipline. SELECTION RULE (elected — the store's raw `listErrands()` order is rowid, read at source; no ratified order exists): the instance's errand rows sort by `createdAt` with `contextPacketId` as the deterministic tiebreak, and the MOST RECENT row is the projected one. FIELD SET: `errand`'s projected keyset is `{ state, remainingBudget, contextPacketId, activeAttemptId, liveSessionName, recordedAdmitOutcome }` (`recordedAdmitOutcome` is a store-validated closed-domain value — C15's classified-outcome letter — never free text), with `{ unavailable: "no-runner-ledger" }` (no ledger file) and `{ unavailable: "no-errand" }` (ledger exists, no row) as its absence forms. ATTACH REASON DOMAIN (closed): `"no-live-attempt"` (no active attempt/session recorded) \| `"session-dead"` (recorded but `has-session` reports gone — C23's record-to-liveness gap, C24's "not running" read) \| `"probe-failed"` (the probe's own infra — tmux absent, anomalous client conclusion; EXPLICIT, never silently mapped to dead). SUMMARY REASON DOMAIN (closed): `"no-runtime-context"` (state `none`/`requested`) \| `"templates-unavailable"` (no `--templates-dir`/env — the DEGRADE-VS-DEMAND election: detail degrades loud in-doc rather than demanding config the read otherwise never needs, the deliberate deviation from the write verbs' `resolveTemplatesDir` usage-lane precedent) \| `"template-unavailable"` (the configured dir does not hold, or cannot load, the pinned template — absent and malformed alike) \| `"provider-unresolvable"` (template loaded but the registry/projection path failed) — MEMBER-level failures land in discriminants, never a throw. MECHANISMS: the runner section is CLI-layer composition — the floor MODULE is byte-untouched (its ratified wide claim stands: committed kernel rows only). NO-MINT RULE: the errand ledger is opened ONLY after an existence check (`openErrandStore` create-or-opens; a detail read against a run that never saw a runner must leave ZERO new files). The liveness probe is ONE `tmux has-session -t <recorded name>` client invocation through the C19 seam (allowlist `{ PATH }`, the channel's client timeout discipline — P2b/P2e's observable: exit 0 alive, exit 1 dead, anything else = `probe-failed`), run IFF a live attempt's session is recorded — a plain kernel-only `detail` spawns NOTHING. The projection resolves through the H1/GR6 mechanism (pinned template → requirement → `registry.resolve(spec.provider)` → `projectForActor` — value-shape only, REV-E; the CLI NEVER interprets the locator — the projection is the sanctioned read). The reader facade's CF3 evidence-promotion flip is the section's ONE permitted write — the ratified mechanism, reused not reinvented. DIAG-SINK BINDING ON THE READ VERBS (gate-2 fold — the arm-adjudicated resolution of builder note (3)): on the two READ verbs (`detail`/`attach`) the facade binds the NOOP diagnostics sink, because the committed C3 invariant (committed-only verbs never create the diag file) DOMINATES; the flip's LEDGER write is the load-bearing half and stands, while the evidence-promotion diag EVENT is DROPPED on detail/attach (fail-open by the channel's own contract, REV-DIAG-FAILOPEN — the flip is observed via the errand-state change, not the event). The evidence-promotion EVENT rides only the surfaces that ALREADY open the diag store (`runner run`, `runner respawn`), where the composition's real diag sink is bound. MEMBER-vs-SUBSTRATE LINE: the discriminants classify MEMBER-level unavailability (a value legitimately not there); SUBSTRATE faults (a corrupt or unopenable EXISTING ledger, post-open IO failures, row-shape integrity drift, contention past the store's busy-timeout) stay ES5-fail-loud → the internal lane (exit 1) — a read verb degrades on absence, crashes loud on corruption. CONCURRENCY TOPOLOGY, acknowledged: this packet makes concurrent errand-DB writers REAL for the first time (a foreground `runner run` worker in one terminal, `detail`/`respawn` in another — the intended operating mode); the store's own `BEGIN IMMEDIATE` + busy-timeout discipline bounds every wait, contention past the bound surfaces on the loud lane above (bounded, idempotently re-invokable), and no new coordination primitive is minted. |

### J — the activation journeys

| ID | Rule |
|---|---|
| J1 | The R-ACTIVATION-JOURNEY family (DERIVATION: the template §2 activation-journey rule over C25's activated entrypoints; the ch8-P2/ch9-P2 journey culture reused by name — subprocess CLI drives, production bindings, swept temp roots, journey-authored templates, post-exit reads): the declared journey set = {**J-DELIVER** — create → start (worktree template) → `runner run --once` iterations with the tmux channel + a deterministic stub actor bound through the SHIPPED `--actor-cmd` surface (reads `PAIRFLOW_PACKET`, writes its emit to `PAIRFLOW_EMIT`) → the emitted op lands COMMITTED through normal ingress, the errand converges `confirmed`, the attempt ran INSIDE its ledger-recorded tmux session in the WORKTREE cwd, and `detail` shows the runner section (errand confirmed + projection summary); **J-GATE** — a gate-bearing worktree run driven through the SHIPPED operator entrypoints → the REAL gate spawn executes the gate command in the worktree cwd (CW1 activated: RED under the fail-closed slot, which cannot spawn), the kernel's mode-dependent classification commits, and the evidence record is durably resolvable on the derived sibling path; **J-ATTACH-LANE** — `attach` against a run with no live attempt → the clean "not running" doc, exit 3 (the shipped verb's resolution path driven end-to-end; the INTERACTIVE attach is the declared non-CI exclusion — AT2); **J-RESPAWN** — a silent stub (exit 0, no emit) drives the errand to `unconfirmed` → `runner respawn` with an emitting stub → the errand lands `confirmed`, the respawn attempt UNBUDGETED (remaining budget unchanged across the edge)}. Membership owner: this packet; deterministic actors only (the stub is configuration through the shipped mapping surface — R-ACTIVATION-JOURNEY's determinism clause; real-LLM runs are the dogfooding tier, non-CI). |

### T — types/ripple

| ID | Rule |
|---|---|
| T1 | (NEW-DECISION — flag F1) Module homes + ripple: the runner-plane CLI logic lands in `cli/runnerVerbs.ts` (NEW — the `runner` verb's subverb dispatch + `runner run`/`runner respawn` handlers + the `attach` handler + the DT enrichment helper + `deriveErrandDbPath`), wired into `cli/main.ts`'s verb tables; `cli/main.ts` additionally carries CW1's two swap edits, calls the DT enrichment from `verbDetail`, and grows `VERB_OPTIONS.detail` with `templates-dir` (DT2's `templates-unavailable` member resolves flag-first via `resolveTemplatesDir` — the strict shell must admit the flag). `cli/runtime.ts`: `CliDeps` grows `attemptIdSource: () => string` (production: crypto UUID — C16's collision-resistant mint), `workerIdSource: () => string` (production: `"cli-" + <crypto UUID>`), and `runInteractive` (AT2) — all additive; every test fixture supplying `CliDeps` grows the three members (compile-driven, the CLI suites). `cli/common.ts` is byte-untouched (`deriveErrandDbPath` lives beside its consumers in `runnerVerbs.ts`; `deriveDiagDbPath` precedent noted — one derivation, one home, no shared-module growth needed). `runner/deliveryLoop.ts`: the L5 doc comment's free-text "C25's verb rides this at ch9-P4" updates to the realized form ("`runner respawn` — packet ch9-p4b") — a comment-only edit, zero behavior (U1's marker hygiene); `runner/enc.ts`: the session-namer doc comment's "its tmux CONSUMER arrives at P4" forward note updates to the realized form (the consumer is CW3's composition — comment-only, same hygiene). The `CliDeps` fixture sites are BOTH in the boundary: `cli/cli.test.ts`'s `testDeps` AND `cli/dev/dev.test.ts`'s full-literal `testDeps` (the dev TEST fixture rides the compile ripple; the dev ENTRYPOINT `cli/dev/main.ts` stays byte-untouched — CW2). `vitest.stryker.config.ts`: the new subprocess-driven test files join the exclude list (the declared partial-mutation-coverage mechanism, telemetry per the pilot rules). The dogfooding runbook lands at `v3/implementation/dogfooding-ch9.md` (NEW — the DoD checkpoint's hand-driven command sequence: create → start → `runner run` → `attach` → emitted op lands → gate runs; a docs file, no code). The kernel, store, errand store, loop and session-namer modules (beyond the two comment renames), adapter, channels, gate runner, providers, floor, diag, definition, domain, emit, ingress, testkit, and the dev entrypoint are byte-untouched. |

### U — coverage/drift

| ID | Rule |
|---|---|
| U1 | The EMPTY slice is declared (all five axes `[]` — R-EMPTY-SLICE); the 54-name rejection registry, the unit map, and the ledger are byte-untouched; the standing drift suite and `v3:coverage` run green before AND after; `pnpm v3:deferred` stays clean (no `DEFERRED(…)` marker minted or discharged); the TWO in-code free-text forward notes naming this packet's content (`deliveryLoop.ts`'s "ch9-P4" owner note — named by the P4a build record — and `enc.ts`'s "arrives at P4" consumer note) update to their realized forms in T1's comment edits, leaving ZERO stale forward pointers to the unsplit "P4" in `src/` (grep-driven over BOTH spelling forms — `ch9-P4` and the ch9-scoped "at P4" consumer-note form; the KNOWN NON-MATCH: `cli/dev/dev.test.ts`'s "at P4" is a ch7-P4 HISTORICAL reference, left untouched — the untruncated-sweep + instrument-robust rules). |

## Site × shape × phase coverage grid

The new surface's fallible sites × failure shapes × phases; every
cell a driven lane or an explicit rule-out. Phases: config (parse +
validation, pre-composition) / compose (opens + construction) /
execute (tick / edge / exec / probe) / report (doc emit + exit).
(The loop/adapter/channel/gate-runner internals are P3a/P3b/P4a's
grids, byte-carried; the kernel's lanes are its own committed
suites'.)

| Site (source) | Shape | Phase | Disposition |
|---|---|---|---|
| verb/subverb resolution (RR1) | unknown verb / unknown or missing subverb / strict-parseArgs violation / a union flag outside the subverb's partition (shell-admitted, HANDLER-rejected — the union-options rule) | config | driven: usage/2, one error doc (the dispatch shell's inherited lanes + RR1's subverb and partition lanes) |
| `--actor-cmd` parse (RR1) | absent / non-JSON / wrong keyset / non-string members | config | driven: usage/2 naming the expected shape |
| `--env-allow` resolution (RR1) | named var absent from host env | config | driven: usage/2 (fail-closed — never a silent empty allowlist entry) |
| pairing validation (RR3) | leaseMs below the named bound (flag-set and flag-defaulted combinations) | config | driven: usage/2 naming the rule + both values; the DERIVED default satisfying by construction is its own lane |
| numeric flags (RR1) | lexical violations / unsafe integers | config | driven: the shared parse rule's usage lane |
| the composition's timer-flag validation (RR1) | any timer-bearing flag — `--poll-ms` included — below-floor / ≥2³¹ / domain-violating | config | driven: usage/2 via the shared `validateTimerKnobs` BEFORE any factory or store open; the factories' own construction throws are UNREACHABLE from this surface (the same validator already passed — row 512's treatment) |
| kernel-store / evidence-DB opens (RR4) | open failure | compose | driven: the inherited internal lane (exit 1, fail-closed loud) |
| diag-store open (RR4) | any open failure | compose | ruled out AS A THROW SITE by the ch7 availability contract — `openDiagStore` NEVER throws (fail-open: an unavailable handle; writes swallow, reads fail loud at their own consumption — C26's class, byte-unchanged) |
| errand-DB open (RR2) | unwritable path / integrity | compose | driven: `ErrandStoreError` → internal (exit 1) |
| `--default-cwd` resolution (RR1) | relative flag value / relative derived default | config | driven: RESOLVED to an absolute path at config time — the adapter's absolute-cwd construction throw is UNREACHABLE from this surface (the lane asserts the absolutized value reaches the adapter) |
| errand-store reads/facade at read/report time (RR5's doc, RS1's post-call read, AT1/DT1's reads) | post-open IO failure / row-shape integrity drift / contention past the busy-timeout under a concurrent worker / a corrupt EXISTING ledger opened by a read verb | execute→report | driven: the ES5 fail-loud `ErrandStoreError` → internal (exit 1), loud — DT2's member-vs-substrate line (never a discriminant); the contention wait bounded by the store's own busy-timeout |
| `tick()` / `run()` (RR5) | D6 config-integrity throw (missing template/step/binding, capability faults) | execute | driven: propagates loud → internal exit 1 (never swallowed; the loop's own fail-closed letter) |
| foreground kill (RR5) | SIGINT/SIGTERM mid-attempt | execute | ruled out AS A LANE by the durable-convergence design (C14/C16's crash windows, CT-A2-CRASH — P3a's committed proof); the journey family displays convergence across process boundaries (`--once` iterations) |
| attach resolution (AT1) | no ledger file / no errand / no live attempt | execute | driven: the "not running" domain lane, exit 3, with a DISTINCT error name per absence (`NoRunnerLedger` / `NoErrand` / `NoLiveAttempt` — gate-2 fold: never conflated) |
| attach: liveness probe + exec (AT1/AT2) | clean-dead session at the probe / probe ANOMALY (infra, anomalous exit) / live + clean detach / live + nonzero interactive exit (died-in-window race, missing tty) | execute | driven: clean-dead → not-running (3 — PROBE-classified, no exec, `SessionDead`) / a probe ANOMALY → internal (1, `AttachProbeFailed`, gate-2 fold — never folded into the dead lane) / ok (0) / internal (1) — the probe discriminates the exec's rc-1 collapse (missing session vs missing tty) |
| respawn resolution (RS1) | no ledger / no errand / not `unconfirmed` / duplicate `unconfirmed` | execute | driven: domain error (3) with the found state; duplicate → internal (1), fail-closed |
| `loop.respawn` silent no-op (RS1) | the errand resolved by the loop's own precondition path between read and call | execute | driven: the post-call read reports the ACTUAL resulting state as data — the verb never fabricates an outcome |
| detail: errand read (DT1/DT2) | ledger absent / errand absent | execute | driven: the named unavailability discriminants; the NO-MINT negative (no file created by the read) |
| detail: liveness probe (DT1/DT2) | alive / dead / probe infra (ENOENT, anomalous exit) | execute | driven: the closed attach reason domain — `probe-failed` EXPLICIT, never conflated with `session-dead` |
| detail: projection (DT1/DT2) | no context / templates dir unavailable / pinned template absent-or-malformed / provider unresolvable or throwing projection | execute | driven: the closed summary reason domain (four members) — a read verb degrades loud in-doc, never throws on these MEMBER failures |
| reader-facade CF3 flip (DT2/RR5/RS1/AT1) | evidence-promotion write + diag emit | execute | ruled out as a NEW lane BY RATIFIED MECHANISM — the facade's committed suite owns it (the one permitted write, reused verbatim); the diag sink is called BARE (port contract: never throws) |
| doc emit (RR5/RS1/DT1/AT1) | stdout data-doc / stderr error-doc channel discipline | report | driven: the inherited channel-rule lanes extended to the new verbs (one doc, keyset-tested per lane) |

The runner composition's mid-attempt process death is outside the
grid by construction (durable state + lease recovery — P3a's
CT-A2-CRASH surface, untouched); the kernel's gate lanes are its own
committed suites' (this packet changes WIRING, not kernel behavior —
the J-GATE journey proves the wiring).

## Mirrored surface map (one canonical statement per rule)

| Rule | Canonical home | Mirrors (summarize/defer only) |
|---|---|---|
| The operator gate-runner swap | CW1 | Claim (1), the Sizing/risk swap clauses, the delegated-source wiring expansion, J1's J-GATE member, flag F8's scope line |
| The dev-plane slot retention | CW2 | Claim (1)'s scoped clause, flag F8, the delegated-source kernel-wiring expansion |
| The tmux delivery default | CW3 | Claim (2), RR4's channel binding, J1's J-DELIVER member, the TX1 staging-clause citation (operative material) |
| Verb topology + schemas (incl. the union-options rule) | RR1 | Claim (2)/(3)/(4) verb clauses, the grid's config rows, flag F1, RS1's handler-grain deferral, the RR acceptance's partition lane |
| The errand-DB derivation | RR2 | AT1/RS1/DT2's ledger opens, flag F2 |
| The pairing rule + lease default | RR3 | Claim (2), the F8(P3b) quote (operative material), the grid's pairing row, flag F3 |
| The runner composition | RR4 | Claim (2), CW3's binding clause, RS1's composition reuse, the Sizing/risk producer scan line |
| Run modes + stop semantics | RR5 | Claim (2), the grid's foreground row, flag F7 |
| Attach resolution + lanes | AT1 | Claim (3), the grid's attach rows, J1's J-ATTACH-LANE member |
| The interactive exec seam | AT2 | Claim (3), T1's CliDeps clause, the Substrate probes exclusion, flag F6 |
| The respawn verb | RS1 | Claim (4), the grid's respawn rows, J1's J-RESPAWN member |
| The runner section's shape | DT1 | Claim (5), the grid's detail rows |
| Enrichment design + mechanisms + no-mint | DT2 | Claim (5), DT1's design deferrals, the grid's no-mint and substrate-loud cells, flag F5 |
| The journey family | J1 | Claim (6), the Acceptance J family, flag F4's stub clause |
| Homes + CliDeps growth + runbook | T1 | flag F1, U1's marker clause, the embedding gates, the delegated-source CLI-runtime-seam expansion |

Fold policy: a change to a canonical row updates every named mirror
before handing back.

## In-context notes (the scarce budget)

- The floor MODULE stays kernel-only: its wide claim ("no diagnostic
  or non-committed data can ever enter this surface") is load-bearing
  — the runner section is CLI-layer composition on top, never a floor
  change. Resist "cleaning this up" by moving the enrichment into
  `src/floor/`.
- The errand ledger is read ONLY through the reader facade — a raw
  `store.getErrand` in CLI code would bypass the CF3 re-check the
  facade exists to guarantee (the raw store export exists for the
  composition/write surfaces; the facade's guarantee is this
  DISCIPLINE, not an export-level impossibility).
- Session names are LEDGER VALUES everywhere on this surface: attach,
  liveness, and the detail section read the recorded string; nothing
  in `src/cli/` may call `defaultSessionNamer` except the RR4
  composition handing it to the loop.
- The slot stays composed in the dev entrypoint DELIBERATELY (CW2) —
  do not "finish the swap" there; replay must never spawn.
- Do not implement the platform-derived lease (parked design): the
  knob stays visible, RR3's derivation is only its DEFAULT, and the
  validation is the obligation — removing the flag would be the
  parked design's scope, not this packet's.
- Fail-closed means CLASSIFIED, not crashed, on the READ surfaces —
  for MEMBER-level absence only: every detail-member failure lands
  in its named discriminant, while SUBSTRATE faults (corruption,
  contention past the busy-timeout — DT2's member-vs-substrate
  line) and the WRITE/composition surfaces keep the loud lanes
  (usage/internal).

## Embedding gates

- **Target files (production):**
  - `v3/src/cli/runnerVerbs.ts` — NEW: RR1–RR5, AT1/AT2 handler,
    RS1, DT1/DT2 enrichment helper, `deriveErrandDbPath`.
  - `v3/src/cli/main.ts` — CW1 (both swap sites), the verb-table
    growth (`runner`, `attach`; `detail` gains the `templates-dir`
    option — T1), the `verbDetail` enrichment call.
  - `v3/src/cli/runtime.ts` — T1: the three CliDeps members + the
    production bindings.
  - `v3/src/runner/deliveryLoop.ts` — T1/U1: the L5 comment's
    realized form (comment-only).
  - `v3/src/runner/enc.ts` — T1/U1: the session-namer consumer
    note's realized form (comment-only).
  - `v3/vitest.stryker.config.ts` — T1: subprocess excludes.
  - `v3/implementation/dogfooding-ch9.md` — NEW: the runbook.
- **Test targets:**
  - `v3/src/cli/runnerCli.test.ts` — NEW: the RR/AT/RS/DT unit-grain
    lanes (scripted deps: recorded `runInteractive`, controlled
    clocks, scripted stores where the committed testkit allows; real
    child processes where the lane demands them).
  - `v3/src/cli/runnerJourney.test.ts` — NEW: J1's four members
    (subprocess, real tmux + git — the declared test-environment
    requirements carried from P4a/ch9-P2).
  - `v3/src/cli/cli.test.ts` — the detail-growth lanes + the CliDeps
    fixture growth + the swap pins (existing verbs green over the
    real runner's wiring).
  - `v3/src/cli/dev/dev.test.ts` — the CliDeps fixture growth ONLY
    (its `testDeps` builds a full `CliDeps` literal — the T1 compile
    ripple; zero behavioral change, the dev suite's assertions stay
    byte-identical).
  - `v3/src/cli/journey.test.ts` + `v3/src/cli/worktreeJourney.test.ts`
    — expected UNCHANGED in assertions (the detail growth is
    additive); listed in the boundary defensively for keyset-grain
    fixture updates only.
- **Entrypoints:** the SHIPPED operator CLI (`pnpm v3:cli -- runner
  run | runner respawn | attach | detail | …`) — the activation
  surface; NO new module-public export from `src/runner/` (the
  needed factories/facade are already exported — read at source);
  the dev entrypoint byte-untouched. R-ACTIVATION-JOURNEY FIRES
  (J1) — this is the activation share.
- **Substrate:** no new cell (the Substrate probes section's
  standing-cells statement + the declared interactive-attach
  exclusion).
- **Mutation boundary** (machine face below): the files above plus
  this packet file.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/cli/runnerVerbs.ts",
      "v3/src/cli/runnerCli.test.ts",
      "v3/src/cli/runnerJourney.test.ts",
      "v3/src/cli/main.ts",
      "v3/src/cli/runtime.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/dev/dev.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/src/cli/worktreeJourney.test.ts",
      "v3/src/runner/deliveryLoop.ts",
      "v3/src/runner/enc.ts",
      "v3/vitest.stryker.config.ts",
      "v3/implementation/dogfooding-ch9.md",
      "v3/implementation/packets/ch9-p4b-operator-surface.md"
    ]
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "CW1", "class": "anchored", "refs": ["contract:ch9-runner#C21", "prose:packet ch9-p4a GR7"] },
      { "id": "CW2", "class": "new-decision", "refs": [] },
      { "id": "CW3", "class": "anchored", "refs": ["contract:ch9-runner#C23", "prose:packet ch9-p4a TX1"] },
      { "id": "RR1", "class": "new-decision", "refs": [] },
      { "id": "RR2", "class": "new-decision", "refs": [] },
      { "id": "RR3", "class": "new-decision", "refs": [] },
      { "id": "RR4", "class": "derived", "refs": ["contract:ch9-runner#C25", "contract:ch9-runner#C13", "contract:ch9-runner#C16", "prose:packet ch9-p3a T2"] },
      { "id": "RR5", "class": "new-decision", "refs": [] },
      { "id": "AT1", "class": "anchored", "refs": ["contract:ch9-runner#C24"] },
      { "id": "AT2", "class": "new-decision", "refs": [] },
      { "id": "RS1", "class": "new-decision", "refs": [] },
      { "id": "DT1", "class": "derived", "refs": ["contract:ch9-runner#C25", "contract:ch9-runner#C10"] },
      { "id": "DT2", "class": "new-decision", "refs": [] },
      { "id": "J1", "class": "derived", "refs": ["prose:template §2 activation-journey rule", "contract:ch9-runner#C25"] },
      { "id": "T1", "class": "new-decision", "refs": [] },
      { "id": "U1", "class": "derived", "refs": ["prose:plan §9.2"] }
    ]
  }
}
```

## Pre-approval flags

- **F1 — verb topology + module homes + CliDeps growth + RS1's
  exit-classification schema (RR1/RS1/T1).**
  The `runner` verb with subverb dispatch + top-level `attach`; the
  `cli/runnerVerbs.ts` home; `CliDeps` grows `attemptIdSource` /
  `workerIdSource` / `runInteractive` (additive; production crypto
  bindings); and RS1's elected exit schema (the deliberate
  precondition-vs-ran asymmetry + the handler-grain flag partition —
  arm-reclassed new-decision at gate 1: C25 leaves the exact exit
  schema open, so the asymmetry is this packet's choice, not an
  entailment). Risk if wrong: a re-shape is mechanical behind the
  shipped verb names (which are C25's letter); the deps growth is
  compile-driven. Route: `approve-ratified` (dated decision record;
  revisit: none).
- **F2 — the errand-DB derivation (RR2).** `deriveErrandDbPath =
  dbPath + ".errands.sqlite"` — the third textual-derivation sibling;
  no flag, no env var; one runner plane per kernel DB path. Risk if
  wrong: a rename is a migration-grade decision later (teardown/
  health chapter's natural scope); the family precedent is strong.
  Route: `approve-ratified`.
- **F3 — the pairing rule's form + the derived lease default (RR3;
  the P3b F8 obligation discharged).** The named bound
  (`leaseMs ≥ timeoutMs + graceMs + backstopMarginMs + pollMs`,
  usage/2 on violation) and the envelope-complete default
  `leaseMs = timeoutMs + graceMs + backstopMarginMs + pollMs +
  900 000` (the bound's own terms plus the 15-minute margin — the
  default satisfies the rule for EVERY knob combination, not just
  the small-tail regime). C14's semantics and 15-minute
  loop default byte-untouched; the parked platform-derived lease
  design stays parked (the knob remains user-visible — implementing
  its removal is NOT this packet). Alternatives were live (strict
  `>` without the envelope; a timeout-plus-fixed-margin default that
  fails validation at large grace; knob removal) — the elected
  form is the one that makes the F8 failure mode (a sibling worker
  reclaiming a still-live attempt) impossible by arithmetic while
  keeping zero-config UX valid. Route: `approve-ratified`.
- **F4 — the actor-cmd mapping form (RR1's `--actor-cmd`; C18's MVP
  surface).** ONE JSON `{ cmd, args }` command template per
  `runner run`/`runner respawn` invocation — the DEGENERATE
  (config-independent) form of C18's config → template mapping; the
  actor still receives `effectiveAgentConfig` inside the handed-off
  packet, so per-config adaptation lives actor-side at MVP. A KEYED
  mapping (per-agent templates) is deliberately later work under the
  same C18 letter. Route: `approve-ratified`.
- **F5 — the detail enrichment's design (DT1/DT2).** Unconditional
  `runner` section with CLOSED per-member availability discriminants
  (the four-member summary and three-member attach reason
  domains); the errand member's SIX-field
  projected set (beyond C25's named state + budget floor — the
  operator's one-look surface); the DEGRADE-VS-DEMAND election
  (`templates-unavailable` degrades in-doc where every WRITE verb
  demands the dir — the deliberate read-verb deviation); the NO-MINT
  read rule (existence check before open); a read-verb
  tmux probe (bounded, seam-disciplined, only when a live session is
  recorded); the member-vs-substrate line (discriminants for absence,
  ES5-loud for corruption/contention). Risk if wrong:
  presentation-grain,
  revisable; the discriminants make every degrade visible, so a wrong
  choice surfaces in dogfooding rather than hiding. Route:
  `approve-ratified`.
- **F6 — the interactive exec seam + the CI proof boundary (AT2).**
  `runInteractive` with inherited stdio (deliberately NOT
  `disciplinedSpawn` — an interactive attach inherits the operator's
  tty by design under ADR-017's trusted-local-host stance); the REAL
  interactive attach is proven by the dogfooding checkpoint, not CI
  (P2d + the unit-grain seam drive are the CI surface; J-ATTACH-LANE
  journeys the resolution path). Route: `approve-ratified`.
- **F7 — foreground stop semantics (RR5).** No graceful drain in v1:
  a killed `runner run` leaves durable, crash-convergent state (the
  ratified C14/C16 design — CT-A2-CRASH is the committed proof);
  quiet stdout in foreground mode (observation rides the diag/floor
  surfaces, C26 — no second stdout protocol). A graceful-drain verb
  is possible later work under the same letters. Route:
  `approve-ratified`.
- **F8 — the swap's scope: operator-only; the slot retained (CW1/
  CW2).** The real gate runner binds at the two OPERATOR wiring
  sites; the dev entrypoint's two sites (inject; replay) KEEP the
  fail-closed slot — replay must never re-execute gate side effects,
  and dev injection stays conservative behind the ADR-009 boundary.
  The slot module + its test stay as the W2 reference realization
  and the evidence-path derivation home. Risk if wrong: widening the
  swap later is a one-site edit with its own review. Route:
  `approve-ratified`.
- **W1 — the composition env-allowlist ergonomics watchpoint.** The
  gate children's allowlist is `{ PATH }` at this packet (CW1's
  defaulted options; the actor lane has `--env-allow`). Real
  dogfooding gate commands / actor CLIs may need more (`HOME`,
  auth-bearing vars) — the `--env-allow` surface covers the actor
  lane, but the GATE lane's widening surface (a per-composition gate
  allowlist flag, or a shared one) is deliberately NOT designed here;
  the dogfooding checkpoint will price it. Route: `boundary-review`
  (process-log line at the chapter boundary).

## Acceptance

- Contract tests: none newly owned (the IC-A2 family and the CT-B
  re-run stay P3a/P3b's, green and untouched — their compositions
  are test-owned and unchanged by this packet). All matrix lanes
  driven by claim-derived negatives (R-CLAIM-NEGATIVES; every
  declared lane DRIVEN — R-MATRIX-LANES).
- Checks: the drift suite (registries/ledger byte-identical — U1),
  `pnpm v3:packet-lint`, `pnpm v3:adr-check` (ADR-016/017/018
  statuses untouched), `pnpm v3:coverage` (the union unchanged —
  empty slice), `pnpm v3:deferred` (clean — no markers touched),
  `pnpm v3:lint` + `v3:typecheck` (T1's ripple green; the src/cli
  boundary lint green over the new file).
- Test disciplines + family inventories (R-ALTITUDE-LINE: membership
  parameterized, fixture enumeration is build work;
  R-LANE-SENSITIVITY binds twice — at these lane texts now, at the
  built bodies via the arm gate-2 sensitivity pass; the §9.4
  mutation-pilot dual-run rides gate-2 scoped to this boundary, with
  the subprocess-profile partiality declared at T1):
  - **CW (swaps):** the declared set = {a shipped-wiring gate spawn
    executes for REAL and the kernel classifies its faithful result
    (RED under the slot, which cannot spawn — the J-GATE journey is
    the top-grain drive; a unit-grain wiring assert pins the factory
    swap); the evidence record durably lands on the derived sibling
    path and resolves post-run; the close discipline (handles closed
    in `finally` on success AND failure paths); the dev entrypoint
    pin (the ENTIRE dev suite green unchanged — the slot still
    composed at both dev sites); the slot module's own suite green
    unchanged (byte-untouched)}. Membership: CW1–CW3 (owner: this
    packet; driven in `cli/runnerCli.test.ts` + `cli/cli.test.ts` +
    the J-GATE journey).
  - **RR (runner run):** the declared set = {the config lanes (the
    grid's config rows — each a distinct usage/2 doc: subverb,
    actor-cmd shapes, env-allow absence, numeric lexical rule, the
    pairing violation NAMING both values, the respawn-forbidden-flag
    lane — PARAMETERIZED over RS1's full forbidden set
    {`--poll-ms`, `--attempts`, `--lease-ms`, `--once`}: each member
    → usage/2 naming the flag, RR1's union-options rule driven —
    RED under a partial-partition handler); the pairing default lane
    (flag-free defaults pass validation by the derived arithmetic —
    asserted exactly); the config-time timer-validation lane (a
    flag-carried domain violation → usage/2 from the composition's
    own `validateTimerKnobs` run, BEFORE any factory, store open,
    attempt, or ledger write — the factory construction throw
    proven unreachable); the errand-DB derivation
    (the sibling path minted beside the resolved `--db` on the WRITE
    surfaces); the composition lanes (a `--once` run against a
    committed dispatch delivers INSIDE a tmux session named by the
    LEDGER row — the session observed live during delivery, the cwd
    the worktree's on a ready run and the derived per-run subdir on
    the none lane; the actor-cmd mapping honored argv-exact; an
    `--env-allow`ed var visible to the actor and an unlisted host
    var proven ABSENT — the canary discipline carried); the `--once`
    doc lane (one data doc: the reader-facade errand list, exit 0);
    the crash-convergence display (state converges across separate
    `--once` invocations — process-boundary durability); the
    mid-run integrity lane (a staged config-integrity fault crashes
    loud, exit 1, never swallowed); the foreground-mode members
    (the quiet-stdout negative — a foreground run over a scripted
    wait emits ZERO stdout documents; run-until-wait-stop —
    `loop.run()` ticks until the injected wait signals stop); the
    default-cwd absolutize member (a relative `--db`/`--default-cwd`
    reaches the adapter ABSOLUTE — the construction throw driven
    unreachable); the `--poll-ms` bound member (a ≥2³¹ poll →
    usage/2 at config — the reproduced P6i collapse on the wait
    path driven out; the composition's own validator, RR1); the
    set-but-empty env-value member (an `--env-allow`ed var
    present-but-empty on the host → copied verbatim as the empty
    string — RED if treated as unset); the open-failure members (an
    unwritable evidence-DB path and an unwritable errand-DB path
    each → internal exit 1, fail-closed loud — the compose-phase
    grid rows driven)}. Membership: RR1–RR5, CW3
    (owner: this packet; driven in `cli/runnerCli.test.ts` + the
    J-DELIVER journey).
  - **AT (attach):** the declared set = {the resolution walk (no
    ledger / no errand / no live attempt → the "not running" doc,
    exit 3, reason named — each member distinct); the exec lane (a
    live recorded session → the seam invoked with
    `attach-session -r -t <ledger name>` VERBATIM — the
    ledger-not-derived negative: a name differing from
    `defaultSessionNamer`'s output is passed through unchanged);
    the takeover lane (`--takeover` drops `-r`; observe stays the
    default — RED if inverted); the exit mapping (dead-at-probe → 3
    with NO exec invoked — the probe-classification negative: the
    not-running lane derives from the has-session probe, never from
    the interactive exit code; live + clean detach → 0; live +
    nonzero interactive exit → 1; other
    failures → 1); the no-write pin (attach performs zero kernel
    writes and zero ledger writes BEYOND the ratified CF3 flip —
    the flip's absence on the live-attempt path driven, and the
    late-evidence resting-row flip observed as the facade's own
    ratified mechanism, never an attach-semantic write — RED if
    attach mutates anything else)}. Membership: AT1–AT2 (owner: this packet;
    driven in `cli/runnerCli.test.ts` with the recorded seam + the
    J-ATTACH-LANE journey).
  - **RS (respawn):** the declared set = {the precondition walk (no
    ledger / no errand / each non-`unconfirmed` state → exit 3
    naming the found state; a staged duplicate-`unconfirmed` ledger
    → exit 1, fail-closed); the edge lane (an `unconfirmed` errand →
    the loop's respawn runs a REAL re-delivery: fresh attempt id,
    session recorded, budget UNCHANGED across the edge — the
    unbudgeted assert; the post-call doc reflects the ACTUAL
    resulting state); the C14-narrowing lanes (a failed re-spawn
    lands `unconfirmed` again — never `pending`/`exhausted`; a
    confirmed re-spawn lands `confirmed`); the racing-resolution
    lane (an errand the loop's precondition path resolves between
    the verb's read and the call → the post-call read reports it,
    no fabricated outcome — the exit-asymmetry pin: exit 0 with the
    resolved state as data, vs exit 3 when the same state is SEEN
    at the precondition read, both driven)}. Membership: RS1
    (owner: this packet;
    driven in `cli/runnerCli.test.ts` + the J-RESPAWN journey).
  - **DT (detail growth):** the declared set = {the section-shape
    lane (the `runner` key's closed keyset; every kernel-detail key
    byte-preserved beside it); the errand member walk (present →
    the projected row; the two unavailability discriminants); the
    multi-errand selection member (two errand rows staged for one
    instance → the MOST RECENT projected — the createdAt order and
    the contextPacketId tiebreak each driven, RED under a
    wrong-order pick); the
    NO-MINT negative (a detail read against a ledgerless run leaves
    ZERO new files — asserted on the filesystem); the attach
    availability walk (live → `available: true` + the recorded
    name; recorded-but-dead → `session-dead`; no live attempt →
    `no-live-attempt`; a staged probe fault → `probe-failed` — the
    dead-vs-probe-failed distinction RED if conflated); the
    projection walk (ready + templates → C10's projection VERBATIM
    — asserted against the provider's own `projectForActor` output;
    the four degrade discriminants each driven — the
    template-absent-or-malformed member distinct from
    provider-unresolvable); the substrate-loud member (a corrupt
    existing ledger / a staged store fault on a read verb →
    internal exit 1, never a discriminant — DT2's
    member-vs-substrate line); the CF3 pin (a
    resting non-confirmed errand with late evidence flips
    `confirmed` through the facade on a detail read — the ratified
    mechanism observed at this surface)}. Membership: DT1–DT2
    (owner: this packet; driven in `cli/runnerCli.test.ts` +
    `cli/cli.test.ts`).
  - **J (journeys):** the declared set = J1's four members
    (J-DELIVER / J-GATE / J-ATTACH-LANE / J-RESPAWN — each through
    the SHIPPED entrypoints with production bindings and
    deterministic stub actors on the shipped config surface).
    Membership: J1 (owner: this packet; driven in
    `cli/runnerJourney.test.ts`; tmux + git are the declared
    test-environment requirements).
- Drift tests green (standing, unconditional — PI-3).
- Standing review rules in force: REV-E-NO-ADAPTER-BRANCH (the
  enrichment resolves providers by requirement + value-shape, never
  type; the composition injects seams); REV-DIAG-FAILOPEN (every
  diag emit BARE); REV-B-LOCAL-NOT-AUTHORITY (the ledger is
  bookkeeping read through the facade; claims stay scheduling-only —
  nothing CLI-side becomes authority); REV-C-PROJECTIONS-READONLY
  (the floor module byte-untouched; the detail enrichment is a
  read-projection composition whose one write is the ratified CF3
  flip; no telemetry event stands in for a decision record).

## Build record

Execution context: **fresh-context-delegated** (the README §4 default)
— a fresh-context build agent implemented the packet against the
re-approved spec (packet sha256 `762973ce…ec88` @ HEAD `76be99d8`);
the main context retained orchestration, the full verification chain
(independently re-run), both arm gates, and the commit boundary.
Build guidance handed over: the packet read COMPLETELY as the
contract, the mutation boundary as absolute, the discipline lines
named per row (union-options, absolutize, actor-only env-allow,
config-time `validateTimerKnobs`, probe-first attach, facade-only
reads, no-mint, channel position), the R-DERIVED-PROBES probe-runner
protocol, the test conventions (`p4btest-` sessions, temp git repos,
subprocess journeys on shipped surfaces), and the do-not-touch list.

Result: 5 new files + 7 edits — changed-set ⊆ the declared boundary
(the two defensively-listed journey files needed NO edit; the
orchestrator verified the set). Tests 1714 → 1745 (+31: 27
unit-grain + 4 journeys), all green; `v3:typecheck` / `v3:lint` /
`v3:test` / `v3:coverage` / `v3:deferred` / `v3:packet-lint` /
`v3:adr-check` green, re-run by the orchestrator independently.
Mutation probes: 6 receipt-backed red-on-break probes (≥1 per family
— CW gate-swap, RR pairing, AT takeover flag, RS duplicate guard, DT
dead-vs-probe-failed, J once-delivers), all through
`probe_runner.py`, restores byte-verified (receipts in the session
scratchpad `ch9p4b-probes/receipts/`).

Builder-reported notes (no silent deviations): (1) a deliberate,
ESM-safe circular import — `runnerVerbs.ts` reuses `main.ts`'s
exported production-registry/completion-sink helpers (RR4's
"exactly as the lifecycle verbs build it") instead of duplicating
the DG4 sink logic; (2) an injectable `RunnerSeams` parameter on the
runner handlers (production default = real timer + tmux channel +
`has-session` probe; unit tests inject fakes) — `CliDeps` stays at
T1's exact three additions, and the acceptance's staged
probe-fault/scripted-wait lanes become drivable; (3) the read verbs'
reader facade rides the noop diagnostics sink — the committed C3
invariant (committed-only verbs never create the diag file) is a
hard pin, so the CF3 flip's LEDGER write stands (the load-bearing
half) while the best-effort diag EVENT is dropped on detail/attach
(fail-open by the channel's own contract; the flip observed via the
errand-state change); (4) `validateTimerKnobs` binds all five run
timers at the shared 1 000 ms floor — `--poll-ms 250` is rejected
(restrictive but faithful; the P6i collapse is the target); (5) the
attach verb folds a probe ANOMALY into the not-running lane (exit 3,
no exec) — the `probe-failed` discriminant stays distinct on the
DETAIL surface (DT2's letter); (6) respawn treats no-ledger and
no-errand identically (exit 3 — RR2 declares respawn a WRITE
surface, so no-mint does not apply); (7) one transient full-suite
flake during the build's five runs, unreproduced in isolation.

Aftermath (orchestrator, before the commit): note (7)'s class
reproduced on the orchestrator's independent full runs — two
DIFFERENT `tmuxChannel.test.ts` real-tmux lanes (P4a's file, outside
this boundary) flaked under the grown parallel subprocess load.
Fix AUTHOR: the orchestrator, in a SEPARATE commit (the packet
commit stays boundary-exact): the TX5 TERM-ignoring lane's backstop
margin widened (2 000 → 8 000 ms — the outer backstop had killed a
CPU-starved wrapper before its result write) and the four real-tmux
describes carry a scoped `{ retry: 2 }` (vitest reports retries as
flaky — visible; a semantic break still fails all three attempts).
Process-log line filed; suite-level load robustness is a named
boundary candidate.

### Aftermath — gate-2 build-close review (fresh-context aftermath agent)

The build-close external arm returned **10 findings** (1 P3 comment;
9 P2 — one product/attach, one packet-docs, four test-evidence
plausibly-blind lanes, one test-evidence journey race, one
mutation-record gap, one runbook YAML defect); the orchestrator
elected the fold directions and a fresh-context aftermath agent
(the README §4 default) folded ALL ten. Fix AUTHOR: the fresh-context
aftermath agent (this section, the AT1/DT2/grid amendments, the code
+ test deltas below); the orchestrator retained the verdict elections
and the independent chain re-run.

Per-finding disposition:

1. **(P2 product, attach) probe anomaly conflated with dead; missing
   errand misnamed.** FOLDED (code + tests + AT1/grid): the attach
   verb now maps a probe ANOMALY → internal (exit 1,
   `AttachProbeFailed`), distinct from a CLEAN-DEAD session (exit 3,
   `SessionDead`); the three absences carry DISTINCT names
   (`NoRunnerLedger`/`NoErrand`/`NoLiveAttempt`). Builder note (5) is
   thereby reversed on the ATTACH surface (the DETAIL `probe-failed`
   discriminant stands — DT2). AT1 + the grid attach rows amended.
2. **(P2 packet-docs) CF3 evidence-promotion diag EVENT dropped on the
   read verbs.** FOLDED as a PACKET AMENDMENT (code unchanged — the
   committed C3 no-diag-file invariant dominates): DT2 gained the
   noop-diag-sink clause (the flip's LEDGER write is load-bearing; the
   EVENT rides only `runner run`/`respawn`). Resolves builder note (3).
3. **(P2 test-evidence) CW main.ts operator-site swap-back blind.**
   FOLDED: a source-grain CW1/CW2 wiring pin in `runnerCli.test.ts`
   (both operator sites construct the real runner, 0 fail-closed; the
   dev plane keeps the slot at both sites); the J-DELIVER
   ledger-recorded `pairflow-…` session assert added.
4. **(P2 test-evidence) RR config-validation + pairing + env-allow
   under-driven.** FOLDED: grace/backstop/lease timer members added;
   the pairing bound's exact four-term arithmetic driven (a
   custom-knob AT-bound/below-bound/derived-default triple); the
   env-allow canary driven through the ACTOR in J-DELIVER (allowed var
   PRESENT, unlisted host var ABSENT).
5. **(P2 test-evidence) RS lanes under-driven.** FOLDED: the no-ledger
   precondition member + a second non-unconfirmed state (attempting)
   added; the silent-respawn → unconfirmed-again narrowing + a FRESH
   recorded session (fresh attempt id) + unchanged budget driven in
   J-RESPAWN.
6. **(P2 test-evidence) DT lanes under-driven.** FOLDED: an
   equal-createdAt contextPacketId-tiebreak fixture; full six-field
   VALUE asserts; a ledgered no-live-attempt member; a malformed
   (loadable-but-invalid) template fixture; a throwing-provider
   fixture (distinct from the registry-miss).
7. **(P2 test-evidence) journey race — createAndStart staged before
   runtime-context READY.** FOLDED: `createAndStart` now polls the
   shipped `detail` until the runtime context is `ready` (bounded
   retries) before staging, in every journey.
8. **(P2 mutation record) the probe table was absent.** FOLDED: the
   table below (6 build + 12 aftermath probes).
9. **(P3→P2 runbook) the commented `gates:` block uncommented to
   invalid YAML (indented under `transitions:`).** FOLDED: the block
   is now a step-level SIBLING of `transitions:`; the uncommented form
   was parsed once in a scratch dir (no repo artifacts) — it admits,
   `gates` sits as a step sibling.
10. **(P3 comment) `main.ts:306` withKernel doc named the fail-closed
    runner.** FOLDED: updated to the real-runner wiring (CW1, ch9-p4b).

R-DERIVED-PROBES table (mutate → run → restore, all through
`probe_runner.py`, restores byte-verified; receipts in the session
scratchpad `ch9p4b-probes/receipts/`). The 6 build probes:

| Family | Mutation (family grain) | Expected red | Receipt |
|---|---|---|---|
| CW | the operator gate-runner swap reverted to the slot | the J-GATE terminalization RED | `CW-gate-swap` |
| RR | the pairing bound weakened | the lease-below-envelope lane RED | `RR-pairing` |
| AT | the takeover `-r`-drop inverted | the observe/takeover argv lane RED | `AT-takeover` |
| RS | the duplicate-unconfirmed guard removed | the exit-1 integrity lane RED | `RS-duplicate` |
| DT | dead folded into probe-failed | the dead-vs-probe-failed lane RED | `DT-attach-reason` |
| J | the once-delivers path broken | the J-DELIVER confirm RED | `J-deliver` |

The 12 aftermath probes (exact mutation → observed red test → receipt):

| Probe id | Exact mutation | Observed red test | Receipt |
|---|---|---|---|
| aftermath-at-probe-anomaly | `if (liveness === "dead")` → `if (liveness !== "alive")` (fold probe-anomaly into dead) | AT › the exit mapping: clean-dead → 3 … probe ANOMALY → internal 1 | `aftermath-at-probe-anomaly` |
| aftermath-at-distinct-names | attach `notFound("NoErrand", …)` → `"NoLiveAttempt"` | AT › the resolution walk … each named DISTINCTLY (AT1) | `aftermath-at-distinct-names` |
| aftermath-cw-main-swap | `main.ts` one `createProcessGateRunner(` → `createFailClosedProcessGateRunner(` | CW › CW1: BOTH operator wiring sites construct the REAL runner | `aftermath-cw-main-swap` |
| aftermath-rr-timer-grace | drop the `graceMs` entry from `validateTimers` | RR › config-time timer validation over EVERY timer flag | `aftermath-rr-timer-grace` |
| aftermath-rr-pairing-arith | pairing `bound` drops the `+ pollMs` term | RR › the pairing rule … the DERIVED default passes | `aftermath-rr-pairing-arith` |
| aftermath-rs-state-naming | respawn `'${found.state}'` → `'redacted'` in the not-unconfirmed doc | RS › the precondition walk … naming the found state | `aftermath-rs-state-naming` |
| aftermath-dt-tiebreak | `mostRecent` `[rows.length - 1]` → `[0]` (drop the tiebreak's high pick) | DT › the errand member … multi-errand … tiebreak | `aftermath-dt-tiebreak` |
| aftermath-dt-six-field | errand projection `remainingBudget: row.remainingBudget` → `999` | DT › the errand member: all SIX projected fields … VALUES exactly | `aftermath-dt-six-field` |
| aftermath-dt-throwing-provider | remove the try/catch around `projectForActor` | DT › the projection walk … the four degrade discriminants | `aftermath-dt-throwing-provider` |
| aftermath-dt-malformed-template | the template-load catch returns `provider-unresolvable` | DT › the projection walk … the four degrade discriminants | `aftermath-dt-malformed-template` |
| aftermath-j-session-namer | loop `sessionNamer: defaultSessionNamer` → `() => "not-pairflow"` | J-DELIVER (session) + J-RESPAWN (fresh session) | `aftermath-j-session-namer` |
| aftermath-j-env-canary | `resolveActorEnvAllowlist` `allow[name] = value` no-op'd | J-DELIVER (the env-allow canary) | `aftermath-j-env-canary` |

Each receipt carries the exact `test_command` + the captured full
output (the red test names) + the byte-verified restore. Test delta:
1714 → 1745 at the build, then +7 unit lanes (32 in
`runnerCli.test.ts`, was 27 — the CW pin describe (2), the RR
timer/pairing extensions, the RS precondition members, the DT
tiebreak/six-field/no-live-attempt lanes) plus the strengthened
J-DELIVER/J-RESPAWN journey bodies (membership unchanged at 4). Full
chain re-run green (`v3:typecheck` / `v3:lint` / `v3:test` /
`v3:coverage` / `v3:deferred` / `v3:packet-lint` / `v3:adr-check`);
the tmux real-substrate retries stay expected-visible.

```json
{
  "packet_metrics": {
    "class": "operability",
    "prediction": { "predicted": "projection", "reasoning": "activation of committed P4a machinery behind ratified C24/C25 letters that explicitly delegate flag/output schemas to packet time; the P4 row carried no pre-registered class (human-mode row)", "discovered": "projection" },
    "provenance": { "anchored": 3, "derived": 4, "new_decision": 9 },
    "rounds": { "review": 4, "doc_refinement": 0, "implementation": 1 },
    "stops": [{ "type": "4:flagged-approve", "what": "first-of-a-kind + nine new-decision rows riding as approve-ratified flags; approve renewed after the arm gate-1 folds (content changed post-approve — 7 arm findings + reconciliation)", "resolution": "human approve on 61e19087, re-approve on 762973ce" }],
    "detector_misses": [
      {
        "found_at": "arm-approve",
        "what": "RS1 authored derived (C25/C14 anchors) and DT1 carried the errand selection order; the arm's entailment attack reclassified RS1 new-decision (the exit-classification schema is an elected design C25 leaves open) and moved the selection rule to DT2 (the store's raw order is rowid — the createdAt+tiebreak order is a choice)",
        "why_missed": "three panel rounds' lens-2 entailment attacks accepted the loop-API-forced framing (respawn returns void; the facade has no ordered query) without asking whether the RESULTING schema choices were themselves decisions"
      }
    ],
    "learned": "a packet that grows the suite's subprocess population re-prices SIBLING real-substrate tests' fixed timing margins — load robustness is a suite-level property, priced at the packet that grows the load",
    "main_thread_model": "claude-fable-5"
  }
}
```
