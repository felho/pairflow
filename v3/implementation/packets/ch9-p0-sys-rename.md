# Task Packet: ch9-p0-sys-rename — the ch11-C31 `sys:` rename realization

Plan step: plan.md §9.4 ch9-P0 row (realizes §9.1 item 1 — the code
half of opening disposition 4; the rename's ratified basis is the
re-ratified ch11-gate-format rows + ADR-018, both landed by the
2026-07-23 ch9 draft-ratification act).
Autonomy stage: measurement — inherited from the chapter header
(plan §9). Not first-of-a-kind: the kernel-alignment class (a
delegated code catch-up on built, packet-owned units, realizing a
ratified upstream decision) has precedent — ch12-P0 realized the
gate field this way; ch11-P2c and ch11-P0 are earlier members.
Classification: **projection** — manifest tally: 7 anchored /
2 derived / 0 new-decision (machine-counted from the `packet_rows`
block). Every row anchors to a re-ratified ch11-gate-format row, a
ratified ch9-runner row, or ADR-018, or derives from those with an
in-row note; every decision this packet needs was taken at the ch9
draft-ratification act.

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

The EMPTY slice is a declaration, not an omission: no unit changes
owner and no coverage axis moves. The rename touches `gate_blocked`
REASON PAYLOAD spellings only — the 54-name rejection registry is
byte-untouched and the drift lanes are green before and after (plan
§9.1 item 1). The realizing units (`l2a-pseudocode/classify_process_result`,
`runner_outcome`, the gate evaluators) stay owned-and-realized by
their ch11 packets; this packet ALIGNS their realizations' token
spellings to the re-ratified contract rows. The l2/l2a golden-trace
tests are ch11-owned; this packet EDITS their outcome expectations
under the sanctioned expectation-alignment class (the ch12-P0
precedent), never re-owns them.

## Operative material (full text — projection, not invention)

The semantic source is the re-ratified `ch11-gate-format` contract
(reopen closed 2026-07-23, commit `45fcac96`) + ADR-018. The
ch11-C31 successor text, verbatim:

> A runner-outcome block REJECTS at HANDLE as
> `gate_blocked(reason=<fixed token>)` — the SAME rejection name as a
> business block, audited distinctly BY the reason (the l2a trace:
> `gate_blocked(reason=sys:runner_error)`). Reason tokens — authored
> (C17, grammar `^[a-z][a-z0-9_]*$`) and fixed (`sys:round_below_min`,
> `sys:no_previous_verdict`, `sys:exit_zero`, `sys:exit_nonzero`,
> `sys:runner_error`, `sys:timeout`,
> `sys:malformed_gate_decision_json`) — are `gate_blocked` REASON
> PAYLOAD, never registry rejection names: a reason token never
> occupies a rejection-name position (the POSITIONAL boundary).
> System-vs-authored disjointness holds BY CONSTRUCTION (the authored
> grammar cannot express `:` — ADR-018), and no `sys:`-prefixed token
> can equal a registry name (no registry name contains `:`); an
> authored token that SPELLS a registry name remains payload-only and
> positionally harmless — the earlier set-disjointness promise is
> NARROWED to this positional rule (re-ratified at the ch9 draft act,
> 2026-07-23).

The trace rows as executable expectations (committed-row sequences
unchanged — the rename moves REASON SPELLINGS only; every other
field of every expectation document stays byte-identical):

- l2 trace blocked outcome (`l2Trace.test.ts`, `outcomes[2]`):
  `{ kind: "rejected", reason: "gate_blocked", gate: "declarative.threshold", gateReason: "sys:round_below_min" }`
- l2a retained allow decision (`l2aTrace.test.ts`, the op-1 committed
  row's `gateDecisions`): `reason: "sys:exit_zero"` (the materialized
  DEFAULT zero-bucket token; `uses`/`verdict`/`evidenceRefs`
  unchanged)
- l2a blocked outcome op-3: `gateReason: "test_failed"` — UNCHANGED
  (an authored token, never renamed)
- l2a blocked outcome op-4: `gateReason: "sys:runner_error"` (the
  C31 successor text's own exhibited form)

## Claim

Every SYSTEM-minted reason token this plane produces spells its
`sys:`-prefixed form — at every production mint site, in every
admission-materialized default, and in every driven assert — and
every bare spelling that remains in the tree sits in a declared
NON-reason position (the `ProcessResult.kind` domain, the testkit's
six-outcome drive labels and deterministic log-text strings) or is an
externally-authored token (whose
grammar cannot express `:`); registry rejection names, the drift
surface, and the diag event keysets are untouched.

Dimensions (enumerated before test rows — R-DIMENSIONS):

1. **Mint-site totality** — all seven fixed tokens' production mint
   sites spell the `sys:` forms (the S2 inventory; no eighth mint
   site exists — the sweep receipt is the proof).
2. **Position discipline** — the `ProcessResult.kind` domain
   (`ok | timeout | runner_error`) stays BARE; the kind→reason
   mapping mints the `sys:` forms; the six-outcome drive labels and
   the testkit log-text strings stay bare; kind-position code is not
   edited.
3. **Default materialization** — admission's effective config carries
   `sys:exit_zero` / `sys:exit_nonzero` as the per-bucket defaults.
4. **Authored invariance + the grammar boundary** — authored tokens
   ride unchanged; the authored grammar still rejects `:`, driven by
   a colon-bearing negative member and a COLLIDING member (an
   authored bare fixed name stays bare, never renamed).
5. **Surface reach** — the renamed values flow kernel → transcript
   retained decisions → the operator CLI stdout document with zero
   CLI/store/floor code change (verbatim pass-through), driven
   end-to-end by the journey blocked document and the trace tests.
6. **Confinement** — registry names unchanged (drift lanes green
   before and after); the diag rejected-event keyset and values are
   untouched (diag carries the rejection NAME, never a reason token).
7. **Mirror prose** — every comment/title mirror of a renamed token
   is updated per the Mirrored Surface Map (bookkeeping, not driven).

## Canonical contract matrix

| ID | Rule |
|---|---|
| S1 | The fixed reason-token set spells EXACTLY (a LIST, never a count): `sys:round_below_min`, `sys:no_previous_verdict`, `sys:exit_zero`, `sys:exit_nonzero`, `sys:runner_error`, `sys:timeout`, `sys:malformed_gate_decision_json`. No other fixed reason token exists on this surface, and no unprefixed spelling of these seven remains in any reason position (anchored: contract:ch11-gate-format#C31, ADR-018) |
| S2 | Production mint-site inventory (MEASURED from the tree — TWO membership owners, both re-run untruncated at build close: the three NAME sweeps AND the names-independent position-based mint DISCOVERY sweep in Embedding gates, which is the falsifiability owner of the no-eighth-site claim — a name sweep cannot see a differently-named mint): `gates/threshold.ts` block reason → `sys:round_below_min` (contract:ch11-gate-format#C10); `gates/previousReviewerVerdict.ts` block reason → `sys:no_previous_verdict` (#C11); `gates/process.ts` `DEFAULT_REASON_ZERO`/`DEFAULT_REASON_NONZERO` → `sys:exit_zero`/`sys:exit_nonzero` (#C17); `kernel/processGate.ts` the three `runnerOutcome` reason arguments → `sys:timeout`, `sys:runner_error`, `sys:malformed_gate_decision_json` (#C17/#C25). Each site is a driven lane; no mint site outside this list produces a fixed reason token (anchored: contract:ch11-gate-format#C10, contract:ch11-gate-format#C11, contract:ch11-gate-format#C17, contract:ch11-gate-format#C25) |
| S3 | Position discipline: the `ProcessResult.kind` domain stays BARE (`ok | timeout | runner_error` — ch11-C26/C34's domain, ch9-C27's explicit kind-stays-bare clause); the kind→`sys:`-reason mapping is realized WITHOUT touching the kind domain; the testkit six-outcome drive labels and its deterministic log-text strings (`"scripted runner_error run"`) stay bare; the `sys:` tokens appear in the KERNEL's classification output, never minted runner-side (ch9-C21). Consequently `ports/gate.ts`, `testkit/scriptedProcessGateRunner.*`, and the kind literals/comparisons in `failClosedProcessGateRunner.ts` and `processGate.ts` are NOT token-edited — the post-build residual sweep (Acceptance family 2) proves the bare spellings sit ONLY at these declared positions (anchored: contract:ch9-runner#C27, contract:ch9-runner#C21, contract:ch11-gate-format#C26, contract:ch11-gate-format#C34) |
| S4 | Default materialization: an absent authored `reason` entry materializes that bucket's fixed default `sys:exit_zero` / `sys:exit_nonzero` into the effective config at admission (ch11-C17's re-ratified letter). The default-token respelling IS the ratified act — §8.2 rule 5's default stability is satisfied by the reopen's re-ratification, not violated by this packet (anchored: contract:ch11-gate-format#C17) |
| S5 | Authored invariance + the grammar boundary: the authored token grammar `^[a-z][a-z0-9_]*$` is UNCHANGED and cannot express `:`; every authored token in the tree (`test_failed`, `flaky`, `custom_nz` fixtures) rides unchanged; TWO NEW driven members — (a) the colon member: an authored reason entry spelling a `sys:`-prefixed form (colon-bearing) is a grammar finding at `reason.<bucket>` in the built lane-q shape, an UNCODED `{path, message}` finding with the token-regex message; (b) the COLLIDING member: an authored entry spelling a bare FIXED name (e.g. `nonzero: "runner_error"`) is LEGAL (colon-free grammar) and rides unchanged end-to-end — the retained decision/`gateReason` spells the bare authored token, never its `sys:` sibling (the positional boundary's driven half: a blanket bare→`sys:` rewrite of reason positions reds here). The process-returned collision (a stdout `reason: "runner_error"`) is subsumed by the built C32 verbatim-retention lane (both derived from the claim, not from the validator's implemented branch list — R-CLAIM-NEGATIVES) (anchored: contract:ch11-gate-format#C17, ADR-018) |
| S6 | Confinement: ZERO registry rejection-name changes (the 54-name registry byte-untouched; reason tokens are payload, never registry names — the positional boundary); the drift lanes are green BEFORE and AFTER, consumed as built and unedited — any drift-lane movement is a STOP, never a packet-local fix. The diag rejected-event keyset and values are untouched: the diag event carries the rejection NAME (`gate_blocked`), never a reason token — the built exact-keyset diag lane stays green and unedited (anchored: contract:ch11-gate-format#C31, prose:plan §9.1 item 1) |
| S7 | Golden-trace realization: the l2/l2a outcome expectations move to the forms in Operative material — `sys:round_below_min` (l2 blocked), `sys:exit_zero` (l2a retained allow), `sys:runner_error` (l2a op-4), `test_failed` unchanged (l2a op-3, authored). Committed-row sequences, versions, and every non-reason field stay byte-identical (anchored: contract:ch11-gate-format#C31, prose:core-model 09-l2a trace rows — the successor text's exhibited trace form) |
| S8 | Surface reach: the transcript's retained `gateDecisions` and the operator CLI `submit` stdout outcome document carry the renamed values by VERBATIM PASS-THROUGH — zero CLI, store, or floor code change (the thin client serializes the kernel outcome; the store retains decision values as opaque strings). The end-to-end drive is the journey blocked stdout document (`gateReason: "sys:round_below_min"` through subprocess + production bindings). DERIVATION: the pass-through is verified AT SOURCE — `submit` and the dev renderers serialize the kernel outcome verbatim (`JSON.stringify(outcome)`), zero `gateReason`-transforming renderer exists under `cli/`, and no gated dev fixture exists in the tree (the ch12-P0 G6 renderer inventory names the three sites; each re-verified by the authoring sweep) (derived: prose:ch12-p0 G6 renderer inventory, prose:cli/main.ts submit pass-through) |
| S9 | Model relation (the rename culture): the model units (`l2a-pseudocode/classify_process_result`, `runner_outcome`) and the model trace prose spell the BARE tokens; this surface realizes them with the `sys:` prefix per the re-ratified contract successor — the ch11-C15 `zero`/`nonzero` rename-culture form, stated HERE so neither side silently forks. No model-plane edit rides this packet; a model BUG discovered at build routes to the standing model↔code divergence stop, never a packet-local patch (derived: contract:ch11-gate-format#C15 — the stated-rename precedent, contract:ch11-gate-format#C31) |

Mirrored surfaces (stated once, mirrors named): S1's token list is
canonical HERE (its upstream authority is ch11-C31 + ADR-018, never
edited from code). Its comment/title mirrors, all updated in this
build to the `sys:` spellings: `kernel/processGate.ts` doc comments
(the M1 grid note's malformed mention, the M2 inventory note),
`cli/failClosedProcessGateRunner.ts` module doc
(`gate_blocked(runner_error)` → `sys:runner_error`), test titles and
inline comments in the ten test files of the mutation boundary
(`l2Trace.test.ts` header + blocked-outcome comment,
`l2aTrace.test.ts` op-4 comment, `threshold.test.ts` /
`previousReviewerVerdict.test.ts` / `processGate.test.ts` /
`kernel.test.ts` lane titles, the
`failClosedProcessGateRunner.test.ts` classification-lane title —
`gate_blocked(runner_error)` beside its value assert). Kind-context comments
(`processGate.ts` M1 "timeout/runner_error KINDS", `ports/gate.ts`,
testkit) are NOT mirrors — they name kinds, which stay bare. S3's
position discipline is canonical HERE; its mirror is ch9-C27's
kind-stays-bare clause (upstream, not edited). Every other row has
no mirror.

## In-context notes (the scarce budget)

- Transcript rows COMMITTED BEFORE this rename carry the old bare
  spellings; ADR-018 ratifies this as accepted (prototype-store
  stance; the fenced-wipe path exists). No migration, no read-path
  normalization — consumers treat reason tokens as opaque strings.
- The ch11 contract file is NOT edited by this packet: its
  realized-map C31 entry already records the delegation ("code
  realization DELEGATED to ch9-P0") in a form that survives the
  landing — the ch12-P0 boundary precedent (a catch-up packet edits
  no upstream contract file).
- The site × shape × phase coverage grid: N/A — no new failure lane
  over a phased seam joins (token spellings move on EXISTING lanes;
  the gate rung's grid is ch11's, unchanged).
- Combination-lane heuristic: N/A — no new precedence or ordering
  claim (first-block-wins and lane order are untouched).
- Activation-journey rule: no new shipped entrypoint — the existing
  journey blocked-document lane is the end-to-end drive (its expected
  value moves; the lane itself is built).

## Embedding gates

- Target files: the mutation boundary below, nothing else.
- Entrypoints: unchanged — no new entrypoint, verb, or flag.
- Authoring-time sweep receipts (MEASURED, untruncated — the
  build-close membership owner is the re-run of the same three
  commands; R-UNTRUNCATED-SWEEP / R-INSTRUMENT-PROBE: site lists,
  never bare counts):
  - five-token sweep `grep -rn "round_below_min\|no_previous_verdict\|exit_zero\|exit_nonzero\|malformed_gate_decision_json" v3/src --include='*.ts'`
    — 40 hits across 14 files (all reason-position or prose-mirror;
    the full per-line classification drove the boundary list);
  - `grep -rn "runner_error" v3/src --include='*.ts'` — 39 hits
    across 8 files: reason positions in `processGate.ts:110`,
    `processGate.test.ts` (the classification lane's reason
    expectation — its `kind` input line stays bare),
    `kernel.test.ts:1705` (`gateReason`; the :1697 `kind` input
    stays bare), `l2aTrace.test.ts:161/194`,
    `failClosedProcessGateRunner.test.ts:59/73` (title + value),
    the `failClosedProcessGateRunner.ts:12` comment mirror; two lane
    TITLES are MIXED hits (`processGate.test.ts:61`,
    `kernel.test.ts:1695`) — each carries a bare KIND mention (stays)
    AND a reason mirror (renamed): the per-occurrence classification
    governs, never the line; every other hit is a kind position, a
    drive label, or a testkit LOG-TEXT string
    (`"scripted runner_error run"`) —
    (`ports/gate.ts`, `testkit/scriptedProcessGateRunner.test.ts`,
    `failClosedProcessGateRunner.ts` kind literals,
    `processGate.ts:106/109` kind comparisons) — S3-declared, not
    edited;
  - `grep -rn '"timeout"' v3/src --include='*.ts'` — 17 hits across
    5 files: reason positions in `processGate.ts:107`,
    `processGate.test.ts:56/271–273` (the :54 `kind: "timeout"`
    input stays bare), `kernel.test.ts:1690`; every other hit is a
    kind position — S3-declared, not edited;
  - position-based mint DISCOVERY sweep (names-independent — S2's
    falsifiability owner for the no-eighth-site claim):
    `grep -rn 'reason: "' v3/src --include='*.ts' | grep -v '\.test\.ts'`
    plus `grep -rn 'DEFAULT_REASON\|runnerOutcome(' v3/src
    --include='*.ts' | grep -v '\.test\.ts'` — every hit classified:
    the GATE-reason mints are exactly (a) the two `GateDecision`
    block returns (`gates/threshold.ts:81`,
    `gates/previousReviewerVerdict.ts:69`), (b) the three
    `runnerOutcome` reason args (`processGate.ts:107/110/135`),
    (c) the two `DEFAULT_REASON_*` constants (`process.ts:39–40`) —
    the S2 list; every other hit is a registry rejection-NAME
    position (`Outcome.reason` — a different slot, untouched by this
    packet), another domain's reason field (the diag store's
    availability reason), or a HELPER/REFERENCE hit (the default
    constants' use sites `process.ts:249/251/252`, the
    `runnerOutcome` helper declaration `processGate.ts:146` — they
    consume the S2 mints, they mint nothing). Re-run at build close;
    a gate-reason mint outside the S2 list is a red.
- Post-build residual expectation (Acceptance family 2): re-running
  the three sweeps finds the pre-rename bare spellings ONLY at the
  S3-declared kind/drive-label/log-text positions and authored-token
  fixtures; zero bare hits remain in reason positions.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/gates/threshold.ts",
      "v3/src/gates/previousReviewerVerdict.ts",
      "v3/src/gates/process.ts",
      "v3/src/kernel/processGate.ts",
      "v3/src/cli/failClosedProcessGateRunner.ts",
      "v3/src/gates/threshold.test.ts",
      "v3/src/gates/previousReviewerVerdict.test.ts",
      "v3/src/gates/process.test.ts",
      "v3/src/kernel/processGate.test.ts",
      "v3/src/kernel/kernel.test.ts",
      "v3/src/definition/admit.test.ts",
      "v3/src/cli/failClosedProcessGateRunner.test.ts",
      "v3/src/cli/journey.test.ts",
      "v3/src/l2Trace.test.ts",
      "v3/src/l2aTrace.test.ts",
      "v3/implementation/packets/ch9-p0-sys-rename.md"
    ]
  }
}
```

`cli/failClosedProcessGateRunner.ts` is in the boundary for its
COMMENT MIRROR only — no code line moves (its `runner_error` literals
are kind positions, S3).

## Row manifest

```json
{
  "packet_rows": {
    "rows": [
      { "id": "S1", "class": "anchored", "refs": ["contract:ch11-gate-format#C31", "ADR-018"] },
      { "id": "S2", "class": "anchored", "refs": ["contract:ch11-gate-format#C10", "contract:ch11-gate-format#C11", "contract:ch11-gate-format#C17", "contract:ch11-gate-format#C25"] },
      { "id": "S3", "class": "anchored", "refs": ["contract:ch9-runner#C27", "contract:ch9-runner#C21", "contract:ch11-gate-format#C26", "contract:ch11-gate-format#C34"] },
      { "id": "S4", "class": "anchored", "refs": ["contract:ch11-gate-format#C17"] },
      { "id": "S5", "class": "anchored", "refs": ["contract:ch11-gate-format#C17", "ADR-018"] },
      { "id": "S6", "class": "anchored", "refs": ["contract:ch11-gate-format#C31", "prose:plan §9.1 item 1"] },
      { "id": "S7", "class": "anchored", "refs": ["contract:ch11-gate-format#C31", "prose:core-model 09-l2a trace rows"] },
      { "id": "S8", "class": "derived", "refs": ["prose:ch12-p0 G6 renderer inventory", "prose:cli/main.ts submit pass-through"] },
      { "id": "S9", "class": "derived", "refs": ["contract:ch11-gate-format#C15", "contract:ch11-gate-format#C31"] }
    ]
  }
}
```

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §9.4 P0 row): **projection** (basis: the
re-ratified C31 row — unconditional since the 2026-07-23
ratification). Discovered at authoring: **projection** — prediction
and discovery agree (zero new-decision rows; every decision was
taken at the draft act: the token forms, the positional narrowing,
the kind-stays-bare clause, ADR-018).

Six axes: **authority movement** — NO (the authority moved at the
draft-ratification act; this packet realizes ratified spellings,
moves nothing). **Surface spread** — TWO surfaces for one concept,
below the 3+ trip: the kernel/gates production spelling (one bounded
respelling across four production files — one logical surface: the
classification/evaluator plane) and the CLI-HUMAN PAYLOAD (the
`submit` stdout document's `gateReason` value observably changes, by
pass-through with zero CLI code — counted per the ch12-P0 letter).
The store/floor carry the values as opaque strings with zero code
change and no schema movement — no surface. The testkit contract is
untouched (kind domain and drive labels unchanged — tests merely
exercising the rename never count). **Identity/join fragility** — NO.
**Foundation + activation coupling** — NO (existing live lanes;
spelling only). **Prerequisite coupling** — NO (the draft is
ratified; P0 is the chapter's ordering HEAD — nothing depends on
unfinished siblings). **Acceptance multiplicity** — one proof surface
(`pnpm v3:test` + bridges; full `ci:local` at close). No hard stop
and no escalation combination trips; **single-packet allowed: yes**
(evidence: the axis reads above; the one persisted-state consequence
— pre-rename transcript rows keep old spellings — is ADR-018-ratified
with no migration bucket, so no closure-budget annex triggers).

## Pre-approval flags

None. Zero new-decision manifest rows (tally: 7 anchored / 2 derived
/ 0 new-decision); no narrowing, no contract-reality issue, no
approve-time decision point. The pre-rename-transcript consequence is
ADR-018's ratified content (in-context notes), not a flag.

## Acceptance

- Contract tests: no new CT-* ids — the packet respells BUILT lanes'
  expected values and adds two lane members (S5: the negative colon
  member + the legal colliding member).
- Test disciplines + family inventories (R-ALTITUDE-LINE form):
  - **The token-map value family** — discipline: every FIXED-token
    reason-position assert spells the `sys:` form with its EXACT
    expected value (never presence, never a prefix-match); the
    authored members of a MIXED reason map stay bare (the
    authored-invariance family owns them). Membership: MEASURED —
    every reason-position hit of the three Embedding-gates sweeps
    (the sweeps search the seven fixed spellings only, so authored
    tokens are never members), re-run untruncated at build close
    (owner: the build-close sweep; the authoring-time inventory is
    in Embedding gates).
  - **The residual-negative family** (S3/S6) — discipline: after the
    build, the three sweeps find bare pre-rename spellings ONLY at
    the S3-declared kind/drive-label/log-text positions and
    authored-token fixtures — zero bare reason-position hits. The
    residual read DISCRIMINATES bare from `sys:`-prefixed hits
    per-OCCURRENCE, never per-line: for each token, the bare count =
    occurrence matches of the bare spelling (`grep -o`) MINUS
    occurrence matches of its `sys:`-prefixed form, and each
    truly-bare occurrence must resolve to a declared bare position
    (a per-LINE subtract — e.g. `grep -v "sys:"` — would mask a bare
    token sharing a line with a renamed neighbor, the multi-token
    default-map lines). Membership: the build-close residual sweep
    (owner: S3).
  - **The default-materialization family** (S4) — discipline: the
    materialized-default asserts spell `sys:exit_zero` /
    `sys:exit_nonzero` exactly (the whole-row `toEqual` culture
    stands). Membership: the defaults lanes in `process.test.ts`
    (full map, partial map, inherited-ignored) and the
    `admit.test.ts` effective-config assert (owner: S4).
  - **The authored-invariance family** (S5) — discipline: authored
    tokens ride unchanged end-to-end (`test_failed` distinct-lane,
    `flaky` warn-lane, `custom_nz` partial-default lane), and the
    TWO new members drive the boundary from both sides: the colon
    member (an authored `sys:`-spelled reason entry yields the
    lane-q grammar finding) and the COLLIDING member (an authored
    entry spelling the bare fixed name `runner_error` stays bare
    through admission → classify → retained decision — a blanket
    bare→`sys:` rewrite reds here; the process-returned collision
    rides the built C32 verbatim-retention lane). Membership: the
    named built lanes + the two new members (owner: S5).
  - **The trace family** (S7) — discipline: the l2/l2a expectation
    documents equal the Operative-material forms EXACTLY (whole-
    document `toEqual`; non-reason fields byte-identical).
    Membership: the l2 blocked outcome, the l2a retained-allow row,
    the l2a op-3/op-4 blocked outcomes (owner: S7).
  - **The end-to-end family** (S8) — discipline: the journey blocked
    stdout document asserts `gateReason: "sys:round_below_min"`
    (exact value through subprocess + production bindings).
    Membership: the journey blocked lane (owner: S8).
  - **The confinement family** (S6) — discipline: the drift lanes
    and the diag exact-keyset lane stay GREEN and UNEDITED — their
    continued pass IS the proof; the packet may not touch them.
    Both guard lanes CO-RESIDE inside an edited boundary file
    (`kernel.test.ts`: the registry-drift lane and the diag
    exact-keyset lane), so the edit discipline is LINE-GRANULAR —
    the reason asserts move, these lanes stay byte-untouched.
    Membership: the standing drift suite + the kernel diag
    exact-keyset lane (owner: ch5/ch11, consumed as built).
- Build-close sensitivity (R-DERIVED-PROBES): the probe table derives
  from the families above — ≥1 red-on-break probe per family (revert
  the threshold mint to bare → token-map + trace + end-to-end
  families red AND the residual-negative sweep red (the bare token
  reappears in a reason position); revert one `processGate.ts` mint
  → its classification lanes red; revert the default constants →
  default-materialization family red; weaken the token grammar to
  admit `:` → the S5 colon member red; respell an authored fixture
  token → authored-invariance lane red; leak the reason token into
  the diag rejected emit → the diag exact-keyset lane red — the
  confinement family's probe, mutate-run-restore only, never a
  committed edit), executed through the probe runner with receipts,
  materialized in the Build record. Arm gate-2
  additionally DUAL-RUNS `pnpm v3:mutation` scoped to the
  `mutation_boundary` (the chapter's mutation-pilot flow note,
  plan §9.4) — catches labeled code-mutation vs input-domain,
  recorded with the packet metrics.
- Checks: `pnpm v3:test` + the v3 bridges during build
  (`v3:packet-lint` included); FULL `pnpm ci:local` at build close;
  `tools/v3-model/check.sh` untouched (no model-plane edit rides
  this packet — S9).
- Drift tests green (standing, unconditional — PI-3): green BEFORE
  and AFTER (S6); any drift-lane movement is a STOP.
- Standing review rules in force: REV-DIAG-FAILOPEN (S6's diag
  confinement — the sink stays bare and untouched); REV-A1-TXN /
  REV-B / REV-C / REV-E: n/a (no transaction, locking, projection,
  or adapter-branch surface moves).

## Build record

BUILD EXECUTION CONTEXT: fresh-context-delegated build agent (the
packet as sole spec; approved-sha handoff). One implementation round,
no rework: every edit landed inside the 16-file mutation boundary,
tests-first per implementation/test pair. `cli/failClosedProcessGateRunner.ts`
moved by its comment mirror only (diff-verified). Test delta:
1262 → 1265 (+3: the S5 colon member in the lane-q family, the
colliding member at the validator grain in `process.test.ts`, and a
cheap kernel-grain colliding drive in `processGate.test.ts` reusing
the existing `classifyProcessResult` pattern). `v3:typecheck` and
`v3:lint` clean; full `ci:local` green at close.

Build-close sweeps: the three name sweeps re-run untruncated — zero
truly-bare reason-position hits; every residual bare occurrence
classifies as an S3-declared kind/drive-label/log-text position or an
authored-token fixture (incl. the two new colliding-member authored
positions in `process.test.ts`/`processGate.test.ts`, S5-declared).
The position-based mint discovery sweep re-run: the gate-reason mints
are exactly the seven `sys:` forms at the S2 sites; every other
`reason: "` hit is a registry rejection-NAME position, the diag
store's availability reason, or a helper/reference site — no eighth
mint.

SURPRISE (one, method-level): the residual family's per-occurrence
subtraction (bare `grep -o` count MINUS `sys:`-prefixed count) is a
silent no-op for the QUOTED `"timeout"` sweep — `"sys:timeout"` does
not contain `"timeout"` as a substring (the quote splits it), so the
subtraction under-reports truly-bare hits (7 computed vs 12 actual).
The authoritative classifier used instead: a lookbehind occurrence
listing (`grep -rnoP '(?<!sys:)…'`), then per-occurrence position
classification. All 12 quoted-`"timeout"` residuals are kind
positions; the finding is about the FORMULA, not the tree.

Probe table (R-DERIVED-PROBES, all via `tools/v3-plan/probe_runner.py`,
receipts under the session scratchpad `ch9p0-probes/`; every probe
RED with byte-verified restore):

| probe | mutation | expected red | observed | receipt id |
|---|---|---|---|---|
| ch9p0-P1-threshold-bare | `threshold.ts` mint reverted to bare `round_below_min` | token-map + trace + end-to-end families | RED — 3 failed: `threshold.test.ts` value lane, `l2Trace` golden, `journey.test.ts` gated blocked document | ch9p0-P1-threshold-bare |
| ch9p0-P2-timeout-bare | `processGate.ts` onTimeout mint `sys:timeout` → `timeout` | its classification lanes | RED — 2 failed: `processGate.test.ts` M1 timeout lane, `kernel.test.ts` six-outcome timeout lane | ch9p0-P2-timeout-bare |
| ch9p0-P3-defaults-bare | `process.ts` DEFAULT_REASON constants reverted to bare | default-materialization family | RED — 7 failed: `process.test.ts` defaults ×4 (colliding member's zero default incl.), `admit.test.ts` effective config, `l2aTrace` golden, own-property defaults lane | ch9p0-P3-defaults-bare |
| ch9p0-P4-tokenre-colon | TOKEN_RE weakened to `/^[a-z][a-z0-9_:]*$/` | the S5 colon member | RED — 1 failed: the lane-q COLON member | ch9p0-P4-tokenre-colon |
| ch9p0-P5-authored-rename | production `reasonToken` renames authored bare `runner_error` → `sys:runner_error` (the blanket-rewrite simulation) | authored-invariance lane | RED — 1 failed: the COLLIDING member (verbatim-carry assert) | ch9p0-P5-authored-rename |
| ch9p0-P6-diag-leak | `kernel.ts` diag rejected emit leaks `gateReason` (mutate-run-restore only; `kernel.ts` byte-identical after, git-diff-clean) | diag exact-keyset confinement lane | RED — 1 failed: the dimension-10 exact-keyset lane | ch9p0-P6-diag-leak |

Mutation-pilot dual-run (the chapter flow note, plan §9.4 — recorded
at arm gate-2; aftermath append, orchestrator-authored): `stryker run
--mutate` scoped to the boundary's four production files — score
91.48% (655 killed / 54 survived / 7 no-coverage / 0 errors, 15 s).
Survivor read: equality-invisible spread/optionality mutants
(INPUT-DOMAIN class — e.g. `x !== undefined ? {x} : {}` → `true`,
invisible to `toEqual`), zero code-mutation catches against this
packet's rename semantics; pilot data for the boundary review, no
fix owed at the pilot stage. Gate verdicts: arm gate-1 CLEAN @
packet-basis d4b238e8; arm gate-2 CLEAN @ commit 2ca2f8f8 (receipts
audited); post-build boundary audit 0 errors.

```json
{
  "packet_metrics": {
    "class": "kernel-alignment (token-spelling realization)",
    "prediction": { "predicted": "projection", "reasoning": "the re-ratified C31 row + ADR-018 resolve every decision; the plan's P0 row predicts projection on that basis", "discovered": "projection" },
    "provenance": { "anchored": 7, "derived": 2, "new_decision": 0 },
    "rounds": { "review": 6, "doc_refinement": 4, "implementation": 1 },
    "stops": [],
    "detector_misses": [],
    "learned": "a count-subtraction residual check silently no-ops when the sweep pattern is QUOTED (the quote splits the sys:-prefixed substring) — classify residuals by lookbehind occurrence LISTING, never by count arithmetic",
    "main_thread_model": "claude-fable-5"
  }
}
```
