# Task Packet: ch7-P4 — the diag CLI surface (tail --diag · dev diag dump · bundle pass-through · derived config)

Plan step: plan.md §7.5. Autonomy stage: calibration — **pre-approve**
(the ch7 pilot's last packet, human-approved per README §5.5;
first-of-a-kind per §7.7: matrix extensions on both entrypoints).
Classification: **projection with ONE new-decision row** — manifest
tally: 18 anchored / 9 derived / 1 new-decision (machine-counted from
the `packet_rows` block; the ninth derived row is the aftermath-born
V8 close contract, its entailment stated in-row). The new-decision row: F2 — the `tail --diag`
cursor surface (the P3 flag-5(b) forward obligation: §7.5 names no
cursor flag; expose-vs-pin-0 closes by judgment, not anchor). It rides
as flag 1 to this pilot's human approve. The §7.7 pre-registered
prediction (projection: the six-precedent CLI class + §7.5) holds for
the packet's substance — the one decision is flagged, never absorbed.

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

Operability packet (§7.6): the diagnostic channel is memo-born (PI-4 /
Addendum 2 B1); the CLI adds ZERO kernel semantics. Coverage axes
unchanged — an assertion the close verifies, not an omission.

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §7.7, pre-registered 2026-07-09 at the Phase-1
flip): projection (sources: the six-precedent CLI class + §7.5).
Discovered at authoring: projection with ONE new-decision row (F2 —
the decision P3's flag 5(b) pre-named as P4's to make); the mismatch
is the single flagged decision, recorded for the pilot's prediction
data.

Six axes:

- **authority movement:** NO — wiring and rendering only; every
  authority this packet consumes is built and committed (P1 emission
  matrix, P2 store + availability, P3 consumers). No source of truth
  moves.
- **surface spread:** ONE concept (diag CLI activation) on ONE
  production surface family — the CLI-human payload (both entrypoints
  are the family's two modules, the ch6-P4a/P4b precedent). The config
  change is CLI-internal (the resolver + the runtime seam). The
  `diag/index.ts` edit is a RETIREMENT (deleting the dead interim
  export) plus comment refresh, not a semantic surface. Testkit
  CONTRACT unchanged (tests compose `openDiagStore` + inline scripted
  handles — the P2/P3 precedent; tests merely exercising the change
  never count).
- **identity/join fragility:** shallow — the CLI passes `instanceId`
  strings through; the cross-store join is P2/P3's, already driven
  there.
- **foundation + activation coupling:** NO — this packet is the
  ACTIVATION half of a split-by-design (the ch6-P2/P3 scope-statement
  culture): the foundation (P1–P3) is committed, so the hard-stop-1
  shape (both in ONE packet) cannot arise.
- **prerequisite coupling:** NO — P1, P2, P3 are built and committed
  (verified in the live tree).
- **acceptance multiplicity:** ONE success class — CLI behavior
  (exit/parse/content matrices; config resolution is a CLI-matrix lane,
  the P4a precedent).

Hard stops: none trip. Stop 11 answered explicitly: the P4a exit/parse
matrices are REUSED via explicit EXTENSION rows (the M/F matrices
below) with the existing lanes regression-guarded — proof parity by
the untouched P4a/P4b suites staying green (the ch6-P4b
extraction-guard precedent). Escalation combos below hard-stop: none
(no authority change; one surface family; one success class).

Consume-family scan: N/A — no authority movement (the scan is
authority-heavy discovery; this packet moves none).

Conditional annexes: **closure-budget triage** N/A at authoring — no
authority/runtime-semantics/read-projection/shared-contract bucket in
scope (the `CliDeps` addition is an internal runtime seam whose only
consumers are the two entrypoints + their tests, all in-boundary).
AFTERMATH ANNOTATION (2026-07-10, external-review round 2): the
close-contract finding moved ONE item into the shared-contract bucket
after all — the `DiagStoreHandle.close()` disposition, a ch7-p2
surface EXTENSION (fail-open; V8 is the contract, class DERIVED with
its entailment stated in-row — not a second new-decision).
Collapse-is-safe grounds: one file, one guarded branch, driven by the
store suite's second-close stage, no consumer-visible shape change
(the contract tightens from UNSPECIFIED to fail-open — no caller
behaves differently on the success path); closed in the same
aftermath round, not deferred.
**Proof-boundary triage** N/A — no success/completion proof moves
(P1–P3 suites keep their proofs; the CLI adds mapping lanes only).
**Mutable-flow record** N/A — no hard-stop-9 material (no
ordering/rollback/lock semantics change; the sink's fail-open is the
P1/P2 contract, untouched).

**single-packet allowed: yes** — closure proof: one bounded build
wires both entrypoints; the same proof surface (the two CLI suites +
one shipped smoke; extended by the aftermath-born store-suite lane —
V8's close-guard drive) validates all of it; the same owner (this
packet's boundary, aftermath-extended) takes the fallout; the interim
X1 lanes are replaced in the
same commit and no external consumer pins the interim state (the X1
token was one-packet-lifetime by design, P3 flag 1).

## Claim + dimensions (chapter rule — enumerated BEFORE deriving)

**Claim (wide):**

1. **Thin-client fidelity:** every ch7-P4 CLI surface renders the
   P1–P3 contracts FAITHFULLY with the matrix exit codes and ZERO
   semantics — no diag data is transformed, filtered, reordered, or
   summarized beyond the declared forms (V1: the T1 union verbatim;
   V3: full read-face events; V4: the P3 bundle projection untouched).
   Wiring the channel changes NO `Outcome`, NO committed row, and NO
   committed read output — the ch-6 wide claim held from the CLI side.
2. **Channel rule, extended:** on every new or extended verb, stdout
   carries ONLY data documents; every failure is exactly ONE stderr
   error doc plus the class exit code; a mid-stream `tail --diag`
   failure leaves already-emitted NDJSON rows parseable.
3. **Config:** the diag DB path DERIVES textually from the resolved
   main DB path (`<db>.diag.sqlite`) — no new flag, no new env var,
   the P4a config matrix rows byte-untouched (C1); the diag store is
   opened ONLY by diag-consuming/emitting verbs (C3); `replay` remains
   hermetic with NO diag surface (C4).
4. **Local vs export:** `tail --diag` and the dev dump are LOCAL
   surfaces — the FULL event rides, `error.message` included (§7.4);
   the bundle remains the export boundary with the P3 projection and
   marker-scan guarantees untouched. Proof boundary: P4 proves wiring,
   rendering, and mapping; it never re-proves emission semantics (P1),
   availability semantics (P2), or engine/projection semantics (P3).
5. **Fail-open write / fail-loud read, at the CLI:** start/submit/
   inject outcomes and exit codes are UNCHANGED under any diag-store
   failure (the sink swallows — the §7.3 write row); the diag READ
   surfaces are LOUD (a typed doc, exit 1 — never a silent empty); the
   bundle alone succeeds-with-stated-gap (§7.3 — the ratified
   asymmetry, not to be unified).

Dimensions:

1. **tail --diag delivery:** both lanes rendered verbatim as NDJSON —
   staged committed history + a mid-tail rejected submit through the
   REAL kernel/ingress/sink appearing on the diag lane (the P3
   both-lanes-react shape at one CLI representative); the lane
   discriminator on every row; the FULL-event claim driven on the
   TAIL side too: an `internal_failure` staged via direct `sink.emit`
   into the real diag store (the P3 staging culture) yields a diag
   row with `error` intact — `error.message` included (the V1
   local-surface claim's tail-side lane; the dump-side twin is
   dimension 4's); completion at the committed terminal; exit 0;
   scripted wait at the `runCli` seam.
2. **tail --diag failure mapping:** M2 at-start (a REAL corrupt diag
   file — garbage bytes, the P2 fixture culture) and M3 mid-stream via
   the V7 seam (a scripted handle whose reader resolves once then
   rejects `DiagUnavailableError("read_failed")`) — prior rows
   parseable, ONE stderr doc, exit 1; M4's unknown-instance
   representative INCLUDING the combination staging (unknown id + a
   corrupt diag file in the same invocation → `not_found`/3 — the P3
   E3 precedence surfacing unchanged through the CLI); M6's non-typed
   representative (a scripted reader rejecting a plain `Error`).
3. **Cursor flags:** F2/F3 parse lanes (bad value → usage 2 via the
   shared lexical parse; default 0; one representative skip lane per
   cursor — `--from-ordinal` skips `ordinal ≤ n` events, `--after`
   skips dump rows); the RESUME COMBINATION lane (aftermath-born,
   external-review finding 2 — the template §2 combination-lane
   heuristic applied to flag 1's "both cursors" ground): `--from` AND
   `--from-ordinal` staged TOGETHER on one `tail --diag` invocation —
   committed rows only `seq > from` AND diag rows only
   `ordinal > fromOrdinal` in the same output (isolated cursor lanes
   cannot falsify a swapped or dropped wiring; this also DRIVES F2's
   "`--from` stays valid with `--diag`" clause); the M8 coupling
   lane; the delegation statement
   driven by absence: the CLI introduces NO numeric validator beyond
   the shared parse helper (M7 — the P3 dimension-13 delegation
   transposed; the library ladders are P2's/§6.2's).
4. **dev diag dump:** full read-face events rendered (an
   `internal_failure` staged via direct `sink.emit` carries its
   `error.message` into the dump — the local surface, §7.4);
   unattributed rows VISIBLE (the only surface, §7.5); ordinal order;
   `--after` mid-cursor skip; known-empty `[]` exit 0 (M9); corrupt
   diag file → M2 doc with `details.reason`; no main-store open (F4 —
   driven: the dump on a db path whose MAIN store file does not exist
   still answers from the diag file, and no main DB file appears).
5. **Bundle pass-through flip (both entrypoints):** healthy fresh
   derived path → `present` with `[]` (C5 known-empty — the X1 interim
   state retired); after a REAL rejected submit → `present` with the
   projected row (pass-through content — one representative; the J
   keyset is P3's proof); corrupt diag file → `unavailable(reason)`
   with exit 0 (M10); the two P3 X1 test lanes REPLACED; the
   retirement sweep executed (V6).
6. **Write-path wiring + the dump-face recourse:** a rejected submit
   through the CLI lands in the derived diag file and is visible in
   `dev diag` (the plan-literal §7.4 recourse at the DUMP face — the
   P3 flag-5(a) obligation discharged HERE); the post-close variant:
   an instance driven to its terminal, `tail --diag` completes, a
   post-close rejected submit is NOT in the closed stream's output but
   IS in the dump; M11: with a corrupt diag file staged,
   start/submit/inject outcome documents and exit codes are
   byte-identical to the healthy twin.
7. **Config derivation:** sibling placement driven (temp dir:
   `store.db` → `store.db.diag.sqlite` exists after a diag verb); the
   C3 negative (list/detail/timeline/plain-tail leave NO diag file);
   C4 (replay: ZERO `openDiagStore` calls — call-recorded via the V7
   seam — and no diag file); the missing-db usage lane in force for
   `dev diag` (F4).
8. **Separation at the CLI:** with a corrupt diag file present beside
   the main DB, `list` and plain `tail` outputs are byte-identical to
   the healthy-diag twin (representatives; structural for the rest by
   C3 — those verbs never construct a reader).
9. **Zero-semantics regression:** the FULL existing suite green (380
   baseline at the P3 close — re-verified in-session at build);
   kernel/ingress/store/floor/ports/testkit production files
   untouched; the P4a/P4b existing matrix lanes green unchanged; the
   eslint config untouched (the CLI's `diag/` value import is legal —
   a composition root; the floor ban scopes to `src/floor/**`,
   measured).
10. **Error-doc contract on the new lanes:** keyset-tested docs
    (`{class, name, message[, details]}`) on the M2/M6/M7/M8
    representatives (the P4a `assertErrorContract` discipline reused).

## Canonical config-derivation matrix (extends the P4a runtime config matrix — its rows untouched)

| Id | Rule |
|---|---|
| C1 | the diag DB path = the RESOLVED main DB path + `.diag.sqlite` — a textual append AFTER the P4a resolution row (`--db` > `PAIRFLOW_V3_DB`; missing/empty → usage 2, the inherited lane); NO new flag, NO new env var (anchored: plan §7.5 config row) |
| C2 | NO config-time failure lane exists for the diag path: `openDiagStore` NEVER throws (the P2 open contract) — diag unavailability surfaces at the CONSUMING verb per the M rows; the open needs no fail-closed wrapper, deliberately unlike `openStoreOrInternal` (anchored: packet ch7-p2 `openDiagStore` surface row + plan §7.3) |
| C3 | the diag store is opened ONLY by diag-consuming/emitting verbs — `tail` WITH `--diag`, `bundle` (both entrypoints), `start`, `submit`, `inject`, dev `diag`; `list`/`detail`/`timeline`/plain-`tail` NEVER open it (no `<db>.diag.sqlite` side effect from a committed-only verb — driven by file absence). DERIVATION: §7.5 enumerates the diag surfaces; opening on a non-diag verb would CREATE the diag file (the O1 contract) as a side effect of a committed-only read — side-effect minimality, the thin-client culture (derived) |
| C4 | `replay`: NO diag surface — zero `openDiagStore` calls (call-recorded via the V7 seam), `noopDiagnosticsSink` stays as its kernel/ingress binding, no diag file is created; `--db` remains rejected (the P4b row, unchanged) (anchored: plan §7.5 replay clause) |
| C5 | a fresh derived path INITIALIZES the diag file on the first diag-verb open (the P2 O1 lane): a WIRED channel's empty store is KNOWN-EMPTY — `present([])` at the bundle, `[]` at the dump — never `unavailable`. The X1 interim state (an unwired channel mapped to `unavailable(open_failed)`) ceases to exist in this commit (anchored: packet ch7-p2 O1 + plan §7.3 duality) |

Non-lane note (stated, with its reason — not an exemption): a literal
`--db :memory:` derives `:memory:.diag.sqlite` textually — a relative
file path, not a memory store. No special-casing: no operator verb
meaningfully targets `:memory:` (a fresh store per invocation answers
nothing), and `replay` — the one deliberate `:memory:` user — has no
diag surface (C4). Stated so the degenerate case is a decision, not an
oversight.

## Canonical verb surface matrix

| Id | Surface | Contract |
|---|---|---|
| V1 | operator `tail --diag` | streams the P3 `DiagTailRow` union VERBATIM as NDJSON — `{"lane":"committed","row":{…}}` \| `{"lane":"diag","event":{…}}` (the T1 exact keysets; the lane discriminator is plan §7.5's named requirement); the diag variant carries the FULL read-face event — `error.message` INCLUDED: the tail is a LOCAL surface (§7.4 classification: untrusted-confined, local stdout — it never enters the bundle); completion at the committed terminal (T5 — library-owned); exit 0 (anchored: plan §7.5 tail row + packet ch7-p3 T1/T5) |
| V2 | plain `tail` (no `--diag`) | byte-unchanged behavior: bare `TranscriptEntry` NDJSON via `createTail(store, wait)`; NO diag store open (C3). The P3 X3 row resolves here: the plain verb stays on the ch6-P2 engine (anchored: packet ch7-p3 X3 + packet ch6-p4a) |
| V3 | dev `diag` | the global cursor dump: ONE JSON array of FULL `DiagnosticEvent` rows — `getGlobalDiagnostics(after)`, ordinal-ascending; unattributed rows VISIBLE (the ONLY surface for them, §7.5); known-empty = `[]`; `error.message` rides (local surface — the same §7.4 classification as V1). DERIVATION of the output form: the P4a channel rule gives one JSON document per verb with NDJSON reserved for the unbounded stream; the dump is a bounded one-shot read → a single array, the `list`/`timeline` precedent (derived) |
| V4 | `bundle` (BOTH entrypoints) | the store-backed reader on the derived path replaces the interim reader; the section is the REAL three-state (the P3 S/K matrices — the projection untouched, byte-level P3's proof); NO new flag; REV-BUNDLE-DEFAULT-POLICY unchanged — the normal graph binds `redactPayloadsPolicy`, `--passthrough` exists only behind dev (re-verified: the sweep in the embedding gates) (anchored: plan §7.5 bundle row + packet ch7-p3 S/K) |
| V5 | `start` / `submit` (operator) + `inject` (dev) | kernel and ingress are constructed with the derived-path store-backed SINK (replacing `noopDiagnosticsSink` at exactly these call sites); outcome documents and exit codes UNCHANGED (zero semantics — emission is P1's, persistence P2's); call sites pass the sink BARE — no defensive wrapper (REV-DIAG-FAILOPEN) (anchored: plan §7.7 P4 row + packet ch7-p3 X1 "until P4 wires the store on the derived config") |
| V6 | `unavailableDiagnosticsReader` RETIRES | the export is DELETED from `diag/index.ts` (sweep, measured 2026-07-10: production references are exactly `cli/main.ts:3,170` and `cli/dev/main.ts:27,52`; zero test references outside the two X1 lanes); the two X1 test lanes are REPLACED by the real three-state lanes (dimension 5). The P3 packet is a historical record — not edited (flag 3) (anchored: packet ch7-p3 flag 1 — "P4 retires it"; the X1 cell's own text is "until P4 wires the store") |
| V7 | `CliDeps` gains `openDiagStore: (path, time) => DiagStoreHandle` | `productionDeps()` binds the real `openDiagStore`; verbs open the diag handle around the work, consume `handle.sink` (write verbs, V5) or `handle.reader` (read verbs, V1/V3/V4), and CLOSE it in `finally` (the `withStore` shape); the handle's `close()` is FAIL-OPEN (V8 — the aftermath-born contract). The seam is what makes C4's zero-call assert and dimension 2's scripted mid-stream handle drivable. DERIVATION: the `openStore` injection precedent — the P4a runtime-seam culture (one real-resource binding point) (derived) |
| V8 | `DiagStoreHandle.close()` — the release contract (AFTERMATH-BORN: external-review finding 1) | FAIL-OPEN: the handle swallows its OWN close failure — a diag-store failure must never flip a verb's outcome or channel contract. WHY DERIVED, not a second new-decision (the entailment, stated): the APPROVED Claim 5 ("outcomes and exit codes UNCHANGED under any diag-store failure") and M10 ("the bundle SUCCEEDS under ANY diag-side failure") already ENTAIL the swallow on the write and bundle paths — a loud close would falsify both under an OS-level close failure; the handle-owned uniform guard is the only shape satisfying them WITHOUT a per-verb defensive wrapper (the blurred-owner anti-pattern REV-DIAG-FAILOPEN names); and P2's own born-unavailable release catch ("best-effort release") is the in-repo precedent the healthy branch joins. Extends the ch7-p2 surface's close row cross-packet (the flag-3 supersession culture — P2's packet stays historical); driven at the store suite via the second-close stage (the known drivable throw instance — the W1 pattern: the same catch owns OS-level close failures); double-close stays UNCLAIMED as an affordance (failure containment, not an idempotency promise) (derived) |

## Canonical exit/error mapping matrix (extends the ch6-P4a exit matrix — its rows untouched, regression-guarded)

Header rule (inherited canonical: the P4a channel + error contract):
stdout = data ONLY; every failure = ONE stderr doc
(`{class, name, message[, details]}`, keyset-tested) + the class exit
code; error NAMES are type-discriminated, never message-matched (the
P4b rule). The CLI matches `DiagUnavailableError` by `instanceof` — a
composition root value-imports `diag/` legally (in-context note 2).

| Id | Lane | Class / exit | Doc |
|---|---|---|---|
| M1 | `tail --diag` completion | success / 0 | NDJSON data rows only; empty stderr (anchored: plan §7.5) |
| M2 | `DiagUnavailableError` — `tail --diag` at any point; dev `diag` | internal / 1 | `name = "DiagUnavailableError"` (the error's own name), `details.reason` = the enumerated token — `reason` ∈ `open_failed` \| `refused_marker` \| `read_failed` (the P2 three-token enum, copied verbatim from the error's `reason`; machine-readable — the P4b typed-details precedent), `message` = the error's own message (UNTRUSTED free text IN PRINCIPLE, confined to the local stderr — the §7.4 boundary; it never enters a bundle; today's live constructors always pass the token-derived default, so the classification is forward-safe rather than in-fact — measured, `sqliteDiagStore.ts:430,442`) (anchored: plan §7.3 availability matrix rows `tail --diag` + dev `diag`) |
| M3 | mid-stream diag failure on `tail --diag` | internal / 1 | already-emitted NDJSON rows STAY PARSEABLE; ONE stderr doc; stdout ends cleanly (the P4a channel rule extended to the two-lane stream) (anchored: packet ch6-p4a channel rule + plan §7.3) |
| M4 | `TailUnknownInstanceError` through `--diag` | not_found / 3 | the existing mapping, re-driven through the two-lane path — INCLUDING the combination staging: unknown id + corrupt diag file in ONE invocation → 3, never M2 (the P3 E3 precedence surfacing unchanged; the CLI cannot reorder — one iteration, one catch) (anchored: packet ch6-p4a exit matrix + packet ch7-p3 E3) |
| M5 | `TailIntegrityError` through `--diag` | internal / 1 | the P4a row unchanged and in force; the `--diag` path adds NO new integrity source (the committed-lane integrity lanes are the library's — P3 E4; the CLI mapping is type-based at one site). BUILD-GUARD: the tail verb keeps ONE shared catch wrapping BOTH the plain and the `--diag` branch — a separate diag-branch catch would mint an undriven mapping the P4a suite no longer covers structurally (anchored: packet ch6-p4a exit matrix) |
| M6 | non-typed reader/engine failure (the P3 E8 propagation reaching the CLI) | internal / 1 | the dispatch catch-all: the error's OWN name, type-discriminated — the CLI classifies nothing (loud is the tail's contract). DERIVATION: the P4b wiring-error rule ("the error's own name") applied to the diag seam (derived) |
| M7 | bad `--from-ordinal` / bad `--after` | usage / 2 | the CLI PARSE lane (`parseNonNegativeSafeInt` — the lexical rule); the CLI introduces NO numeric validator of its own — the cursor domain ladders live with their OWNERS (`getDiagnostics`/`getGlobalDiagnostics`: the P2 full-ladder validator; `getTimeline`: §6.2), unreachable from CLI argv because the lexical parse precedes every call (stated in the grid). DERIVATION: the P4a parse rule + the P3 dimension-13 delegation (derived) |
| M8 | `--from-ordinal` WITHOUT `--diag` | usage / 2 | a cursor for a lane not requested is a contract violation, rejected explicitly (flag-value presence checked, so `--from-ordinal 0` without `--diag` is red too). DERIVATION: the strict-parse culture — the P4b "replay rejects `--db`" precedent PLUS the P4a unknown-role typo-catch (the thin client rejects what would otherwise silently no-op); note the refinement the implementer honors: the precedents are parseArgs-mechanical, this lane is an explicit hand-coded presence check (derived) |
| M9 | dev `diag`, known-empty | success / 0 | `[]` on stdout — never an error, never `unavailable` (the §6.2 duality transposed; C5) (anchored: plan §7.3 duality + packet ch7-p2 known-empty row) |
| M10 | `bundle` under ANY diag-side failure | success / 0 | section = `unavailable(reason)` — pass-through content, no exit change; the committed half is authoritative (anchored: plan §7.3 bundle row + packet ch7-p3 S matrix) |
| M11 | `start`/`submit`/`inject` with the diag store corrupt or unavailable | per the outcome, UNCHANGED | outcome documents and exit codes byte-identical to the healthy twin — the sink swallows by contract (the §7.3 write row at the CLI; driven with a corrupt diag file staged) (anchored: plan §7.3 write row + packet ch7-p2 W1/emit fence) |

## Canonical flag/parse matrix (extends the P4a/P4b parse contracts)

| Id | Flag | Rule |
|---|---|---|
| F1 | `--diag` (operator `tail`) | boolean; absent = the plain tail (V2). The strict dispatch shell keeps rejecting it on every other verb (unknown flag → usage 2) — driven by a REPRESENTATIVE negative (aftermath-born, external-review finding 3): `--diag` on a non-tail verb (`list`) → usage 2, so the claim carries its own drive instead of leaning on the generic `--nope` regression (anchored: plan §7.5 "tail --diag") |
| F2 | `--from-ordinal <n>` (operator `tail`) | the diag lane's cursor: nonneg safe int string via the shared lexical parse, DEFAULT "0"; VALID ONLY with `--diag` (M8). `--from` stays the COMMITTED-lane cursor and remains valid with `--diag` — the diag path calls `tailWithDiagnostics(id, from, fromOrdinal)`; only the DIAG cursor is `--diag`-coupled. **NEW-DECISION (flag 1):** §7.5 names no cursor flag — expose vs pin-0 closes by judgment. The pick (EXPOSE, default 0): T4/dimension-6 resumability — rows carry their own cursors, so a terminated `tail --diag` resumes losslessly ONLY if the CLI accepts both cursors; the exposed-cursor precedents (`--from`, `--after`). Pin-0 (rejected) would force duplicate re-delivery on every CLI resume, weakening the carried-cursor affordance the library claims |
| F3 | `--after <n>` (dev `diag`) | the global cursor: nonneg safe int string, DEFAULT "0". DERIVATION: §7.5 names the verb "the global CURSOR dump"; the P2 global-read signature takes `afterOrdinal`; the `timeline --after` naming precedent (derived) |
| F4 | dev `diag` accepts `--db` and `--after` ONLY | config inherited (missing db → usage 2 — the P4a lane in force for this verb); the verb does NOT open the MAIN store — the derivation is textual (C1), so no main DB file side effect and no `StoreOpenFailed` lane exists for it (driven: the dump answers with the main store file ABSENT). DERIVATION: the dump consumes only the diag read surface; opening the main store would create the main DB file as a side effect of a diag-only read and mint a failure lane §7.5 never names — the C3 side-effect-minimality family (derived) |

## Site × shape × phase grid (template §2 write-time discipline — compact)

Trigger: the `tail --diag` stream has PHASES at the CLI channel level
(pre-first-row / mid-stream). The library's stop-path phase collapses
into mid-stream at CLI granularity: propagation is uniform by the P3
no-catch construction and the CLI has ONE typed catch per verb plus
the dispatch catch-all — the phase distinctions INSIDE the engine are
P3's driven lanes, not re-proven here (the proof boundary).

| Site × shape | pre-first-row | mid-stream |
|---|---|---|
| tail catch × `DiagUnavailableError` | DRIVEN (M2 — real corrupt file) | DRIVEN (M3 — scripted V7 handle; prior rows parseable) |
| tail catch × `TailUnknownInstanceError` | DRIVEN (M4, incl. the corrupt-diag combination) | ruled out: post-first-round vanish is `TailIntegrityError` by the P3 engine (E4) |
| tail catch × `TailIntegrityError` | ruled out: first-round null is the unknown-instance lane (P3 E4/T3) | in force (M5 — the P4a mapping; no new integrity source on the diag path) |
| tail catch × `RangeError` | ruled out at the CLI: the lexical parse (M7) precedes every library call, so the owners' validators are unreachable from argv; the catch branch stays as defense | same rule-out |
| dispatch catch-all × non-typed | DRIVEN (M6 — scripted non-typed rejection) | same catch site — covered by M6's staging (the reader rejects on the polled round) |
| dev `diag` × `DiagUnavailableError` | DRIVEN (M2 — dump face; one-shot: no mid-stream phase exists) | n/a (bounded one-shot read) |
| `bundle` × any diag-side failure | DRIVEN (M10 — the P3 S-matrix wrapper at the CLI) | n/a (one-shot) |
| `start`/`submit`/`inject` × sink-side failure | DRIVEN (M11 — corrupt file; the swallow fence is P2's) | n/a (emit is fire-and-forget by contract) |
| diag handle open × any state | ruled out as a THROW source: `openDiagStore` never throws (C2 — the P2 open fence); a bad state surfaces as M2/M10 at the read, or swallows at the write | — |
| diag handle `close()` | single-close by the owning verb's `finally`; the release CONTRACT is V8 (fail-open, aftermath-born — a throw escaping a `finally` would REPLACE a successful result, which V8's entailment base forbids), so NO exit-mapping lane exists and M11 + the channel rule hold by construction; driven at the store suite (V8's second-close stage) | — |

Render-primitive note (non-lane, stated): the one un-enumerated call
site on the new paths is the row/event serialization
(`JSON.stringify`). It renders either R3-validated diag projections
of JSON-parsed data (P2's shape gate) or committed rows the P4a verbs
already render un-enumerated — non-throwing for every value the gates
admit; a hypothetical type-lied violation would fail LOUD through the
dispatch catch-all (M6), honoring the fail-loud contract. Stated so
the site is a decision, not a gap.

## Mirrored surface map (one canonical statement per rule)

Convention (P3-inherited): acceptance-list and embedding-gates entries
that restate a rule count as mirrors and are listed.

| Rule | Canonical | Mirrors |
|---|---|---|
| derived diag path (textual, no flag/env) | C1 | Claim 3 · dimension 7 · the embedding-gates config line · plan §7.5 config row (cross-artifact) |
| diag-verbs-only open (no side-effect file) | C3 | Claim 3 · dimensions 7–8 · F4's main-store clause (the same family, named) · acceptance list |
| replay hermetic (no diag surface) | C4 | Claim 3 · dimension 7 · plan §7.5 replay clause (cross-artifact) |
| known-empty on the wired channel (X1 interim retired) | C5 | dimension 5 (`present([])` lane) · M9 · flag 3 (the decision record, not a live mirror) |
| thin-client / zero-semantics | Claim 1 | dimension 9 · V1/V3/V4 verbatim clauses · the Sizing/risk surface-spread bullet · acceptance list |
| local-vs-export (full event on local surfaces) | V1 + V3 (the classification lives in the rows) | Claim 4 · dimension 1's tail-side full-event lane · dimension 4 · plan §7.4 local-surfaces clause (cross-artifact) |
| channel rule (data stdout / ONE stderr doc / prior rows parseable) | the M-matrix header (inherited P4a canonical) | Claim 2 · M3 · dimension 10 |
| fail-open write / fail-loud read asymmetry | M2 + M10 + M11 (the row set) | Claim 5 · dimensions 2/5/6 · in-context note 1 · plan §7.3 matrix (cross-artifact) |
| cursor delegation (no new numeric validator) | M7 | dimension 3 · F2/F3 parse clauses · the grid's RangeError rule-out cells |
| the cursor-surface decision (expose, default 0, coupled) | F2 | flag 1 (the decision record) · M8 · dimension 3 |
| interim reader retirement | V6 | dimension 5 · the embedding-gates `diag/index.ts` entry · flag 3 · packet ch7-p3 X1 (cross-artifact, historical) |
| sink wiring scope (start/submit/inject; bare call sites) | V5 | Claim 5's write clause · dimension 6 · M11 · acceptance REV-DIAG-FAILOPEN line · the `diag/index.ts` comment refresh (code-side — the noop/retirement forecast update) |
| dump-face recourse (post-close events visible in the dump) | dimension 6 (the driving lane) | plan §7.4 recourse sentence (cross-artifact) · packet ch7-p3 flag 5(a) (cross-artifact, the obligation source) · acceptance list |
| composition root (the CLI value-imports `diag/`; `instanceof` match) | in-context note 2 | the M-matrix header's instanceof clause · dimension 9's eslint clause · the embedding-gates eslint line |
| REV-BUNDLE-DEFAULT-POLICY closure (default policy; passthrough dev-only) | V4 | the embedding-gates `devPassthroughRedactionPolicy` sweep · the acceptance REV-BUNDLE-DEFAULT-POLICY line |
| diag handle lifecycle (open never throws; close in `finally`, single-close, close FAIL-OPEN) | C2 (the open half) + V8 (the close half — aftermath-born) | in-context note 3 · the grid's open and close rows · V7's close clause · the acceptance store-suite bullet |

The Pre-approval flags ledger is deliberately NOT in the live mirror
set (the P1–P3 precedent): entries are dated decision snapshots;
history is never rewritten when a canonical row changes.

## In-context notes (the scarce budget)

- The §7.3 availability matrix's consumer rows point OPPOSITE
  directions BY RATIFIED DESIGN (inherited from P3, now at the CLI):
  `tail --diag` and the dump are fail-LOUD; the bundle is
  fail-open-to-stated-gap. Do not "unify" them during build.
- The CLI is a COMPOSITION ROOT: it value-imports `diag/` legally (the
  floor ban scopes to `src/floor/**` — the P3 in-context note names
  the CLI as the composition root). `DiagUnavailableError` is matched
  by `instanceof` (the ch-6 precedent; the P2 surface row left the
  pick to P4) — the cross-module `(name, reason)` contract remains
  what the DOC carries (M2's name + details.reason).
- Diag handle lifecycle: opened per verb around the work, closed in
  `finally` (the `withStore` shape); `openDiagStore` never throws
  (C2), so the open needs no wrapper — wrapping it would blur the P2
  fence ownership.
- Reuse, not invention: no new port types, no testkit surface — tests
  compose `openDiagStore` + direct `sink.emit` staging (the P3 shape
  culture) + the V7 seam for scripted handles (inline fakes, the
  P1/P3 per-call-fake precedent); corrupt states are REAL files
  (garbage bytes — the P2 fixture culture).
- Do not "stream" the dump: it is a bounded one-shot read (one JSON
  array). The unbounded live surface is the tail's; the full observe
  seam stays §6.3-deferred (§7.1).

## Embedding gates (v1-inherited)

- Edited: `v3/src/cli/main.ts` (tail `--diag` + `--from-ordinal` +
  the M2/M8 mappings; bundle → real reader; start/submit → real sink;
  `VERB_OPTIONS`; the ch7-P3 interim comments retire),
  `v3/src/cli/dev/main.ts` (the `diag` verb; bundle → real reader;
  inject → real sink; `VERB_OPTIONS`), `v3/src/cli/common.ts` (the
  derived-path + diag-handle helper — the `withStore` shape),
  `v3/src/cli/runtime.ts` (`CliDeps.openDiagStore` + the
  `productionDeps` binding), `v3/src/cli/cli.test.ts` (the new lanes;
  the X1 lane replaced; the `testDeps` builder ripple),
  `v3/src/cli/dev/dev.test.ts` (same + the `diag` verb lanes),
  `v3/src/diag/index.ts` (DELETE `unavailableDiagnosticsReader` AND
  BOTH now-dead imports — the `DiagnosticsReader` type import and
  the `DiagUnavailableError` VALUE import at `:10`, used only inside
  the deleted reader; the `:12` `export … from` re-export stays for
  external consumers and does not consume the local binding — the
  `no-unused-vars` lint would fire on a delete that left either;
  plus the noop-sink comment's "until ch7-P4" forecast and the
  module header's consumer note refresh — the P3 T7 comment-refresh
  precedent. The retirement ripple also drops `noopDiagnosticsSink`
  from `cli/main.ts`'s imports — V5 replaces all three of its uses —
  while `cli/dev/main.ts` KEEPS it for replay, C4).
- Edited, AFTERMATH-BORN (the post-build external-review rounds; these
  land in the `fix(v3)` aftermath commit, NOT the audited build
  commit — the build-commit audit read the boundary AT commit
  `3cec0969` and stays pinned to those bytes; the extension below
  binds the AFTERMATH commit's audit): `v3/src/diag/sqliteDiagStore.ts`
  (the close fail-open guard — the healthy branch's release gains the
  catch the born-unavailable branch already carries; the grid's close
  row is the contract), `v3/src/diag/sqliteDiagStore.test.ts` (the
  second-close drive), plus the aftermath lanes in
  `v3/src/cli/cli.test.ts` (the resume combination lane; the F1
  representative negative — both files already in-boundary).
- Untouched, explicitly: `kernel/`, `ingress/`, `store/`, `floor/`,
  `ports/`, `testkit/`, `emit/`, `domain/`, `v3/eslint.config.mjs`
  (the CLI's diag value import is already legal), `package.json`
  (both bridges exist — `v3:cli`, `v3:cli:dev`, measured), the
  P4a/P4b existing matrix lanes (regression-guarded).
- Sweeps (measured 2026-07-10, current tree):
  `grep -rn "unavailableDiagnosticsReader" v3/src --include="*.ts"` →
  `diag/index.ts` (definition), `cli/main.ts:3,170`,
  `cli/dev/main.ts:27,52` — the full retirement surface (V6);
  `grep -rn "devPassthroughRedactionPolicy" v3/src/cli` →
  `dev/main.ts:10,51` ONLY (REV-BUNDLE-DEFAULT-POLICY re-verified per
  the P3 forward pointer); `grep -rln "CliDeps" v3/src` → six of the
  nine boundary files ONLY (none of the three `diag/` boundary files
  carries a `CliDeps` reference — the V7 type ripple is closed
  in-boundary);
  `grep -n "rejectedInputs" v3/src/cli` → the two X1 test lanes
  (`cli.test.ts:316–326`, `dev/dev.test.ts:152–157`) — the exact
  replacement set (dimension 5).
- Type-ripple targets: NONE beyond the listed files (the `CliDeps`
  sweep above is the evidence).

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/cli/main.ts",
      "v3/src/cli/dev/main.ts",
      "v3/src/cli/common.ts",
      "v3/src/cli/runtime.ts",
      "v3/src/cli/cli.test.ts",
      "v3/src/cli/dev/dev.test.ts",
      "v3/src/diag/index.ts",
      "v3/src/diag/sqliteDiagStore.ts",
      "v3/src/diag/sqliteDiagStore.test.ts"
    ]
  }
}
```

## Row manifest (the D1 classification's machine face)

```json
{
  "packet_rows": {
    "rows": [
      { "id": "C1", "class": "anchored", "refs": ["prose:plan §7.5 (config row)"] },
      { "id": "C2", "class": "anchored", "refs": ["prose:packet ch7-p2 (openDiagStore never throws)", "prose:plan §7.3"] },
      { "id": "C3", "class": "derived", "refs": ["prose:plan §7.5 (the diag-surface enumeration)", "prose:packet ch6-p4a (thin-client culture)"] },
      { "id": "C4", "class": "anchored", "refs": ["prose:plan §7.5 (replay stays hermetic)"] },
      { "id": "C5", "class": "anchored", "refs": ["prose:packet ch7-p2 (O1 open lane)", "prose:plan §7.3 (unavailable ≠ known-empty)"] },
      { "id": "V1", "class": "anchored", "refs": ["prose:plan §7.5 (tail --diag row)", "prose:packet ch7-p3 (T1/T5)"] },
      { "id": "V2", "class": "anchored", "refs": ["prose:packet ch7-p3 (X3)", "prose:packet ch6-p4a (tail verb)"] },
      { "id": "V3", "class": "derived", "refs": ["prose:plan §7.5 (dev diag verb)", "prose:packet ch6-p4a (channel rule — one JSON doc per verb)"] },
      { "id": "V4", "class": "anchored", "refs": ["prose:plan §7.5 (bundle row)", "prose:packet ch7-p3 (S/K matrices)"] },
      { "id": "V5", "class": "anchored", "refs": ["prose:plan §7.7 (P4 packet row)", "prose:packet ch7-p3 (X1 — until P4 wires the store)"] },
      { "id": "V6", "class": "anchored", "refs": ["prose:packet ch7-p3 (X1/flag 1 — P4 retires the interim reader)"] },
      { "id": "V7", "class": "derived", "refs": ["prose:packet ch6-p4a (the runtime seam — openStore injection precedent)"] },
      { "id": "V8", "class": "derived", "refs": ["prose:plan §7.3 (the availability matrix the entailing claims transpose)", "prose:packet ch7-p1 (REV-DIAG-FAILOPEN — the channel swallows its own failures)", "prose:packet ch7-p2 (the born-unavailable release catch precedent)"] },
      { "id": "M1", "class": "anchored", "refs": ["prose:plan §7.5 (tail --diag row)"] },
      { "id": "M2", "class": "anchored", "refs": ["prose:plan §7.3 (availability matrix — tail --diag + dev diag rows)", "prose:packet ch7-p2 ((name, reason) contract)"] },
      { "id": "M3", "class": "anchored", "refs": ["prose:packet ch6-p4a (channel rule — parseable prior rows)", "prose:plan §7.3"] },
      { "id": "M4", "class": "anchored", "refs": ["prose:packet ch6-p4a (exit matrix)", "prose:packet ch7-p3 (E3 precedence)"] },
      { "id": "M5", "class": "anchored", "refs": ["prose:packet ch6-p4a (exit matrix)"] },
      { "id": "M6", "class": "derived", "refs": ["prose:packet ch6-p4b (type-discriminated wiring errors)"] },
      { "id": "M7", "class": "derived", "refs": ["prose:packet ch6-p4a (lexical parse rule)", "prose:packet ch7-p3 (dimension-13 delegation)"] },
      { "id": "M8", "class": "derived", "refs": ["prose:packet ch6-p4b (strict-parse culture — replay rejects --db)", "prose:packet ch6-p4a (unknown-role typo-catch)"] },
      { "id": "M9", "class": "anchored", "refs": ["prose:plan §7.3 (duality)", "prose:packet ch7-p2 (known-empty row)"] },
      { "id": "M10", "class": "anchored", "refs": ["prose:plan §7.3 (bundle row)", "prose:packet ch7-p3 (S matrix)"] },
      { "id": "M11", "class": "anchored", "refs": ["prose:plan §7.3 (write row)", "prose:packet ch7-p2 (emit fence / W1)"] },
      { "id": "F1", "class": "anchored", "refs": ["prose:plan §7.5 (tail --diag)"] },
      { "id": "F2", "class": "new-decision", "refs": [] },
      { "id": "F3", "class": "derived", "refs": ["prose:plan §7.5 (the global CURSOR dump)", "prose:packet ch6-p4a (--after precedent)"] },
      { "id": "F4", "class": "derived", "refs": ["prose:plan §7.5 (dev diag verb scope)", "prose:packet ch6-p4a (config matrix — the inherited usage lane)"] }
    ]
  }
}
```

## Pre-approval flags

1. **F2 is a NEW-DECISION row — the `tail --diag` cursor surface (the
   P3 flag-5(b) forward obligation, discharged as a recorded
   decision).** §7.5 names no cursor flag; `tailWithDiagnostics`
   forces `fromOrdinal` at the library seam, so the CLI must pick.
   The pick: EXPOSE `--from-ordinal` (default "0", valid only with
   `--diag` — M8). Grounds: T4/dimension-6 resumability — rows carry
   their own cursors, and a terminated tail resumes losslessly from
   the CLI ONLY if both cursors are accepted; the exposed-cursor
   precedents (`--from`, `--after`). The alternative (pin 0,
   rejected): every CLI-level resume would re-deliver the full diag
   history — duplicate delivery that hollows out the carried-cursor
   affordance the library claims. Below the Case-B triggers (one row;
   no authority/separation/availability-class semantics — a cursor
   flag). Route: approve-ratified — this pilot's human approve act
   ratifies the pick (no prior STOP: the fork is below Case B and not
   genuinely open once the resumability ground is stated; the
   alternative is recorded here). Route-token note (panel round 1,
   process-logged for the boundary review): the template mints
   `approve-ratified` for STOP-verdict decisions; applying it to a
   below-Case-B new-decision that rides straight to a human approve
   is a GENERALIZATION — in P3 every new-decision row also STOPped,
   so the two readings coincided; this approve act is the first to
   confirm the generalized form.
2. **Read verbs on a fresh derived path CREATE the diag file.**
   `bundle`, `tail --diag`, and dev `diag` on a path whose diag file
   does not exist yet INITIALIZE it (the P2 O1 open contract — there
   is deliberately no readonly-open affordance: O9 made the fence
   all-or-nothing). A read verb with a write side effect is stated so
   it is a decision, not a surprise; the alternative (pre-checking
   existence and reporting `unavailable`) would falsely mark a wired,
   legitimately-empty channel unavailable — dishonest under the §7.3
   duality (C5). Route: fold-now — stated in C5.
3. **The X1 interim lanes are replaced in this commit.** The P3
   packet's X1 rows (both entrypoints showing
   `unavailable(open_failed)` from the interim reader) were
   one-packet-lifetime by design; this packet deletes the reader (V6)
   and replaces the two test lanes with real three-state lanes
   (dimension 5). The P3 packet file is a historical record — not
   edited. Route: fold-now — stated in V6/C5.
4. **The P3 flag-5 forward obligations are discharged here, jointly.**
   (a) The dump-face recourse lane (plan §7.4's literal "a post-close
   rejected submit is visible in the dump") is dimension 6's driven
   lane; (b) the cursor decision is flag 1. Route: fold-now — this
   entry is the joint discharge record.

## Acceptance

- Dimensions 1–10 test-driven; every declared lane driven by name:
  - **operator CLI (`cli.test.ts`):** V1 delivery (lane-discriminated
    NDJSON, both lanes via the REAL kernel/ingress/sink, completion,
    exit 0) + the tail-side full-event lane (dimension 1's
    `sink.emit`-staged `internal_failure`: the yielded diag row
    carries `error.message` intact); M2 at-start (garbage-bytes diag
    file) + M3 mid-stream
    (scripted V7 handle; prior rows parseable) + M4 (unknown id, incl.
    the corrupt-diag combination) + M6 (non-typed scripted rejection);
    F2 lanes (bad value → 2; default 0; the skip representative; M8
    coupling; the RESUME COMBINATION lane — `--from` +
    `--from-ordinal` together, dimension 3); the F1 representative
    negative (`--diag` on `list` → 2); V2 regression (plain tail
    byte-unchanged, no diag
    file); bundle: C5 `present([])` fresh, `present(rows)` after a
    real rejected submit, M10 `unavailable` + exit 0; M11
    (start/submit outcome twins under corrupt diag); C1 sibling
    placement (`store.db` → `store.db.diag.sqlite` appears); C3
    file-absence
    negatives (list/detail/timeline/plain-tail); dimension 8 twins
    (list + plain tail byte-identical beside a corrupt diag file);
    dimension 6's recourse pair (rejected submit → dump; post-close
    variant with tail completion); M2/M6/M7/M8 docs keyset-tested.
  - **dev CLI (`dev.test.ts`):** V3 dump lanes (full events with
    `error.message`, unattributed visible, ordinal order, `--after`
    skip, `--after` bad value → 2 — the F3/M7 representative, M9
    `[]`, M2 corrupt with `details.reason`, F4 missing-db +
    main-store-absent); bundle lanes (the X1 replacement — three
    states); inject M11 twin; C4 replay call-recorded ZERO
    `openDiagStore` calls + no diag file; ONE shipped smoke: `diag`
    through the REAL `cli/dev/main.ts` process (tsx bridge) on a
    staged diag file → rows on stdout (the derived config proven
    end-to-end).
  - **diag store suite (`sqliteDiagStore.test.ts` — aftermath-born,
    V8):** the close fail-open guard driven via the second-close
    stage (a repeated `close()` never throws — failure containment,
    not a claimed idempotency affordance).
  Estimated ~28 new tests at `it` granularity.
- Dimension 9: the FULL existing suite green (380 baseline at the P3
  close — re-verified in-session at build); all v3 bridges green
  (`v3:typecheck`, `v3:lint`, `v3:test`, `v3:coverage` validation with
  the empty slice, `v3:packet-lint` on this packet, `v3:adr-check`).
- No ADR trigger fires: no new substrate/tooling/contract-class
  decision — the config derivation is plan-ratified (§7.5); the
  cursor flag is a flagged packet decision (flag 1, ratified at the
  approve); ADR-009 (CLI boundary) and ADR-010 (diag store) stand
  unchanged.
- Substrate probes: NONE new — every staged diag state is a
  P2-probed/driven lane (garbage bytes, corrupt row, closed handle);
  no new premise rests on driver/OS behavior.
- Standing review rules in force: **REV-C-PROJECTIONS-READONLY** (the
  new read surfaces are read-only OVER THE DIAG RECORDS — no row is
  written, updated, or deleted by dump/tail/bundle; they are NOT
  filesystem-side-effect free: the O1 open initializes a missing diag
  file — flag 2, a schema-init, never a data write); **REV-DIAG-FAILOPEN** (this packet adds NO sink
  implementation; the P2 sink is passed BARE at every new call site —
  no defensive wrapper, checked on the diff); **REV-B** (cursors are
  stream positions, never authority); **REV-E** (sink and reader
  arrive as injected ports through the runtime seam — no adapter
  branching); **REV-A1-TXN** — n/a (no kernel/store write-path
  change); **REV-BUNDLE-DEFAULT-POLICY** (re-verified per the P3
  forward pointer: the sweep shows `devPassthroughRedactionPolicy`
  only under `cli/dev/`).

## Build record

Approved 2026-07-10 — the user's explicit approve ("egyet értek az
expose-zal, mehet") on the reconciled basis sha256
`b18f4c4ee470f35daa027af812b5b8de17ee862502c7556f7b257d6f7b3185b5`
(two-hash model: the clean R2 FULL round bound content hash
`02ddc1988ca002da0357c1e5ebe07bcc565bc358a4b06d73b8b26d96e59c7549`).
The STOP-4 flagged-approve act ratified flag 1 (the F2 expose pick AND
the approve-ratified route-token generalization — its first
below-Case-B application) and flags 2–4. Built the same day, in the
SAME session (the P3 pilot's fresh-session self-containment test was
not repeated — a deliberate choice, not an omission).

380 → 398 tests (+18 net: 20 new `it` bodies — several declared lanes
share a body — with the two X1 interim lanes REPLACED; the authoring
estimate "~28 at `it` granularity" over-counted by assuming one body
per lane). Operator side (`cli.test.ts`): the wired bundle three-state
pair (C5/V4/C1 + M10), V1/M1 two-lane delivery with REAL live-sink
staging, the dimension-1 tail-side full-event lane, M2+M4 (the
corrupt-at-start doc + the E3 combination), M3 (prior rows parseable
on the scripted V7 handle), M6 (non-typed own-name), F2/M7/M8 (parse +
skip + coupling), M11 start/submit twins, C3 file-absence negatives,
dimension-8 byte-identical twins. Dev side (`dev.test.ts`): the wired
bundle three-state flow, V3 dump lanes (full events with
`error.message`, unattributed visible, ordinal order, F4
no-main-store), F3/M7 `--after` lanes, M9 known-empty (the flag-2 O1
creation asserted), M2 corrupt with `details.reason`, the dimension-6
DUMP-face recourse (post-close rejected submit: in the dump, NOT in
the closed stream — the P3 flag-5(a) obligation discharged), C4
replay call-recorded ZERO diag opens, M11 inject twins, and the
shipped `diag` smoke through the real `cli/dev/main.ts` process.

ONE mechanical in-build round, zero behavioral surprises (typecheck
green on the first run; every CLI test green on the first run): the
`withStore` import went dead in `dev/main.ts` when bundle/inject moved
to `withStoreAndDiag` — caught by `v3:lint`'s `no-unused-vars`,
exactly the dead-import class the embedding-gates note predicted for
`diag/index.ts` (where BOTH predicted dead imports were removed as
enumerated; the sweep at close: zero `unavailableDiagnosticsReader`
references remain in `v3/src`).

All bridges green at close: `v3:typecheck`, `v3:lint`, `v3:test`
(398), `v3:coverage` validation (ownership axes unchanged — units
5/158, invariants 8/116, traces 2/20: the empty slice held),
`v3:packet-lint` (0 errors), `v3:adr-check` (11 ADRs — no trigger
fired, per the acceptance's no-ADR statement). Node v26.3.0.

**Aftermath (2026-07-10, the user's EXTERNAL post-build review — three
rounds; fixed same day, 401 tests):** the pilot's flagged approve and
the build ran back-to-back in one turn, so the transitional
cross-model arm (README §5.5) got no pre-build window — the external
review ran POST-build (process-logged; boundary-review candidate: an
explicit "external arm ran / waived" checkpoint). Substance catches
(both in `detector_misses`): (1) the `DiagStoreHandle.close()`
contract gap — the healthy branch's close was unguarded while the
born-unavailable release already swallowed; folded as V8 (derived —
the Claim 5/M10 entailment stated in-row), the guard landed in
`sqliteDiagStore.ts` (the second-close drive in the store suite:
RED before the guard, green after), and the mutation boundary gained
the two diag-store files (aftermath-scoped — the build-commit audit
stays pinned to `3cec0969`'s bytes); (2) the resume COMBINATION lane
(`--from` + `--from-ordinal` on one invocation) — declared in
dimension 3 and driven. Plus: the F1 representative negative
(`list --diag` → usage 2) driven; REV-C reworded (read-only over the
diag RECORDS, not filesystem-side-effect free); record-coherence
folds (the closure-budget aftermath annotation; the Edited/boundary
extension; the metrics nuance + scope sentences) — the round-1
aftermath fold initially SKIPPED the reconciliation pass and the
external round 2 caught exactly the propagation class it would have
found (process-logged as the aftermath-reconciliation lesson); the
round-2/3 folds closed WITH reconciliation passes (one PROPAGATION
hit each, folded). All bridges re-verified green at the aftermath
close: 401 tests, typecheck, lint, coverage validation, packet-lint,
adr-check.

```json
{
  "packet_metrics": {
    "class": "operability",
    "prediction": {
      "predicted": "projection",
      "reasoning": "pre-registered at the Phase-1 flip (2026-07-09), before authoring: the six-precedent CLI class + plan §7.5 were expected to determine every row",
      "discovered": "projection"
    },
    "provenance": { "anchored": 18, "derived": 9, "new_decision": 1 },
    "rounds": { "review": 2, "doc_refinement": 0, "implementation": 2 },
    "stops": [
      {
        "type": "4:flagged-approve",
        "what": "F2 (the exposed --from-ordinal cursor surface, the decision ch7-P3 flag 5(b) pre-named as P4's) rode as flag 1 to the pilot's human approve, together with the approve-ratified route-token GENERALIZATION to a below-Case-B new-decision (its first application) and flags 2-4",
        "resolution": "the user's explicit approve (2026-07-10) on the reconciled basis b18f4c4e ratified the expose pick and the generalized token reading; the token-definition question is process-logged for the boundary review"
      }
    ],
    "detector_misses": [
      {
        "found_at": "code-review",
        "what": "the DiagStoreHandle.close() contract gap (V8): the healthy branch's unguarded close could flip a successful verb outcome from a finally block — against Claim 5/M10's entailment and REV-DIAG-FAILOPEN's character",
        "why_missed": "the R2 lens-1 code-path duty SAW the close site and cleared it as a watchpoint by MAIN-STORE parity (fail-loud is correct for the authoritative store) instead of judging it by the diag channel's own fail-open character — the wrong-frame class; ten same-family lenses shared the frame"
      },
      {
        "found_at": "code-review",
        "what": "the resume COMBINATION lane (--from + --from-ordinal together) was declared nowhere while flag 1's decision rested on the 'both cursors' ground",
        "why_missed": "the R2 lens-3 duty considered it and cleared it via an indirect structural argument (a swapped wiring would break the isolated skip lane) — accepting an inference where the template section-2 combination-lane heuristic demands a staged combination"
      }
    ],
    "learned": "the second v2 packet ran 2 FULL rounds + 1 bookkeeping reconciliation to approve (the panel-sustainability scoping's first post-pilot data point); review-ahead-of-build held again — one dead-import lint round, zero behavioral surprises",
    "baseline_note": "The ch7 pilot's LAST human-approved packet (calibration closes with it). prediction.discovered = projection per the D7 enum (deliberately binary); the header carries the honest nuance — projection WITH one flagged new-decision row (F2), exactly the mismatch class the pilot measures (the P3 baseline_note precedent). rounds.review = 2 FULL five-lens PRE-APPROVE panel rounds (R1 refine: 1 content + a bookkeeping batch; R2 clean), reconciliation passes not counted; all ten FULL-round lenses transcript-verified claude-opus-4-8, the reconciliations claude-sonnet-5. The POST-BUILD external-review rounds are chronicled in the Aftermath and feed detector_misses (its two entries are the external arm's substance catches; the aftermath rounds' record-coherence findings are PROCESS misses — the skipped aftermath reconciliation, process-logged — not detector misses). rounds.implementation = 2: the build round (one mechanical lint fix) + the same-day external-review aftermath round (the V8 guard + three driven lanes + record-coherence folds — the P3 aftermath-counting precedent). The +18 net vs the ~28 estimate is body-vs-lane counting, recorded honestly above; the aftermath adds +3 (401 at aftermath close)."
  }
}
```
